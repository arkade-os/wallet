const Wn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Xf(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function $o(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function ce(t, ...e) {
  if (!Xf(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Qf(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  $o(t.outputLen), $o(t.blockLen);
}
function Mo(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Jf(t, e) {
  ce(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function tr(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function Ji(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function Fe(t, e) {
  return t << 32 - e | t >>> e;
}
function To(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function tl(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function qs(t) {
  return typeof t == "string" && (t = tl(t)), ce(t), t;
}
function el(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ce(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const a = t[r];
    n.set(a, i), i += a.length;
  }
  return n;
}
class ou {
}
function iu(t) {
  const e = (r) => t().update(qs(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function js(t = 32) {
  if (Wn && typeof Wn.getRandomValues == "function")
    return Wn.getRandomValues(new Uint8Array(t));
  if (Wn && typeof Wn.randomBytes == "function")
    return Uint8Array.from(Wn.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function nl(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), a = BigInt(4294967295), c = Number(n >> i & a), f = Number(n & a), d = r ? 4 : 0, p = r ? 0 : 4;
  t.setUint32(e + d, c, r), t.setUint32(e + p, f, r);
}
function rl(t, e, n) {
  return t & e ^ ~t & n;
}
function ol(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class su extends ou {
  constructor(e, n, r, i) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(e), this.view = Ji(this.buffer);
  }
  update(e) {
    Mo(this), e = qs(e), ce(e);
    const { view: n, buffer: r, blockLen: i } = this, a = e.length;
    for (let c = 0; c < a; ) {
      const f = Math.min(i - this.pos, a - c);
      if (f === i) {
        const d = Ji(e);
        for (; i <= a - c; c += i)
          this.process(d, c);
        continue;
      }
      r.set(e.subarray(c, c + f), this.pos), this.pos += f, c += f, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Mo(this), Jf(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: a } = this;
    let { pos: c } = this;
    n[c++] = 128, tr(this.buffer.subarray(c)), this.padOffset > i - c && (this.process(r, 0), c = 0);
    for (let g = c; g < i; g++)
      n[g] = 0;
    nl(r, i - 8, BigInt(this.length * 8), a), this.process(r, 0);
    const f = Ji(e), d = this.outputLen;
    if (d % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const p = d / 4, w = this.get();
    if (p > w.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let g = 0; g < p; g++)
      f.setUint32(4 * g, w[g], a);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: a, destroyed: c, pos: f } = this;
    return e.destroyed = c, e.finished = a, e.length = i, e.pos = f, i % n && e.buffer.set(r), e;
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
]), il = /* @__PURE__ */ Uint32Array.from([
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
]), hn = /* @__PURE__ */ new Uint32Array(64);
class sl extends su {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = dn[0] | 0, this.B = dn[1] | 0, this.C = dn[2] | 0, this.D = dn[3] | 0, this.E = dn[4] | 0, this.F = dn[5] | 0, this.G = dn[6] | 0, this.H = dn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: a, F: c, G: f, H: d } = this;
    return [e, n, r, i, a, c, f, d];
  }
  // prettier-ignore
  set(e, n, r, i, a, c, f, d) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = a | 0, this.F = c | 0, this.G = f | 0, this.H = d | 0;
  }
  process(e, n) {
    for (let g = 0; g < 16; g++, n += 4)
      hn[g] = e.getUint32(n, !1);
    for (let g = 16; g < 64; g++) {
      const b = hn[g - 15], _ = hn[g - 2], D = Fe(b, 7) ^ Fe(b, 18) ^ b >>> 3, A = Fe(_, 17) ^ Fe(_, 19) ^ _ >>> 10;
      hn[g] = A + hn[g - 7] + D + hn[g - 16] | 0;
    }
    let { A: r, B: i, C: a, D: c, E: f, F: d, G: p, H: w } = this;
    for (let g = 0; g < 64; g++) {
      const b = Fe(f, 6) ^ Fe(f, 11) ^ Fe(f, 25), _ = w + b + rl(f, d, p) + il[g] + hn[g] | 0, A = (Fe(r, 2) ^ Fe(r, 13) ^ Fe(r, 22)) + ol(r, i, a) | 0;
      w = p, p = d, d = f, f = c + _ | 0, c = a, a = i, i = r, r = _ + A | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, a = a + this.C | 0, c = c + this.D | 0, f = f + this.E | 0, d = d + this.F | 0, p = p + this.G | 0, w = w + this.H | 0, this.set(r, i, a, c, f, d, p, w);
  }
  roundClean() {
    tr(hn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), tr(this.buffer);
  }
}
const he = /* @__PURE__ */ iu(() => new sl());
class au extends ou {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Qf(e);
    const r = qs(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, a = new Uint8Array(i);
    a.set(r.length > i ? e.create().update(r).digest() : r);
    for (let c = 0; c < a.length; c++)
      a[c] ^= 54;
    this.iHash.update(a), this.oHash = e.create();
    for (let c = 0; c < a.length; c++)
      a[c] ^= 106;
    this.oHash.update(a), tr(a);
  }
  update(e) {
    return Mo(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Mo(this), ce(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: a, blockLen: c, outputLen: f } = this;
    return e = e, e.finished = i, e.destroyed = a, e.blockLen = c, e.outputLen = f, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const cu = (t, e, n) => new au(t, e).update(n).digest();
cu.create = (t, e) => new au(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Gs = /* @__PURE__ */ BigInt(0), ms = /* @__PURE__ */ BigInt(1);
function Gr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function zs(t) {
  if (!Gr(t))
    throw new Error("Uint8Array expected");
}
function Pr(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function Ao(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function uu(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Gs : BigInt("0x" + t);
}
const fu = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), al = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Lr(t) {
  if (zs(t), fu)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += al[t[n]];
  return e;
}
const We = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function oc(t) {
  if (t >= We._0 && t <= We._9)
    return t - We._0;
  if (t >= We.A && t <= We.F)
    return t - (We.A - 10);
  if (t >= We.a && t <= We.f)
    return t - (We.a - 10);
}
function Fo(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (fu)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, a = 0; i < n; i++, a += 2) {
    const c = oc(t.charCodeAt(a)), f = oc(t.charCodeAt(a + 1));
    if (c === void 0 || f === void 0) {
      const d = t[a] + t[a + 1];
      throw new Error('hex string expected, got non-hex character "' + d + '" at index ' + a);
    }
    r[i] = c * 16 + f;
  }
  return r;
}
function fe(t) {
  return uu(Lr(t));
}
function lu(t) {
  return zs(t), uu(Lr(Uint8Array.from(t).reverse()));
}
function Ve(t, e) {
  return Fo(t.toString(16).padStart(e * 2, "0"));
}
function du(t, e) {
  return Ve(t, e).reverse();
}
function Qt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Fo(e);
    } catch (a) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + a);
    }
  else if (Gr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function Mn(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    zs(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const a = t[r];
    n.set(a, i), i += a.length;
  }
  return n;
}
function Kr(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const ts = (t) => typeof t == "bigint" && Gs <= t;
function Dr(t, e, n) {
  return ts(t) && ts(e) && ts(n) && e <= t && t < n;
}
function Be(t, e, n, r) {
  if (!Dr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function cl(t) {
  let e;
  for (e = 0; t > Gs; t >>= ms, e += 1)
    ;
  return e;
}
const si = (t) => (ms << BigInt(t)) - ms, es = (t) => new Uint8Array(t), ic = (t) => Uint8Array.from(t);
function ul(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = es(t), i = es(t), a = 0;
  const c = () => {
    r.fill(1), i.fill(0), a = 0;
  }, f = (...g) => n(i, r, ...g), d = (g = es(0)) => {
    i = f(ic([0]), g), r = f(), g.length !== 0 && (i = f(ic([1]), g), r = f());
  }, p = () => {
    if (a++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let g = 0;
    const b = [];
    for (; g < e; ) {
      r = f();
      const _ = r.slice();
      b.push(_), g += r.length;
    }
    return Mn(...b);
  };
  return (g, b) => {
    c(), d(g);
    let _;
    for (; !(_ = b(p())); )
      d();
    return c(), _;
  };
}
const fl = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Gr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function ai(t, e, n = {}) {
  const r = (i, a, c) => {
    const f = fl[a];
    if (typeof f != "function")
      throw new Error("invalid validator function");
    const d = t[i];
    if (!(c && d === void 0) && !f(d, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + a + ", got " + d);
  };
  for (const [i, a] of Object.entries(e))
    r(i, a, !1);
  for (const [i, a] of Object.entries(n))
    r(i, a, !0);
  return t;
}
function sc(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const a = t(n, ...r);
    return e.set(n, a), a;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pe = BigInt(0), le = BigInt(1), Kn = /* @__PURE__ */ BigInt(2), ll = /* @__PURE__ */ BigInt(3), hu = /* @__PURE__ */ BigInt(4), pu = /* @__PURE__ */ BigInt(5), yu = /* @__PURE__ */ BigInt(8);
function Wt(t, e) {
  const n = t % e;
  return n >= pe ? n : e + n;
}
function Te(t, e, n) {
  let r = t;
  for (; e-- > pe; )
    r *= r, r %= n;
  return r;
}
function bs(t, e) {
  if (t === pe)
    throw new Error("invert: expected non-zero number");
  if (e <= pe)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = Wt(t, e), r = e, i = pe, a = le;
  for (; n !== pe; ) {
    const f = r / n, d = r % n, p = i - a * f;
    r = n, n = d, i = a, a = p;
  }
  if (r !== le)
    throw new Error("invert: does not exist");
  return Wt(i, e);
}
function gu(t, e) {
  const n = (t.ORDER + le) / hu, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function dl(t, e) {
  const n = (t.ORDER - pu) / yu, r = t.mul(e, Kn), i = t.pow(r, n), a = t.mul(e, i), c = t.mul(t.mul(a, Kn), i), f = t.mul(a, t.sub(c, t.ONE));
  if (!t.eql(t.sqr(f), e))
    throw new Error("Cannot find square root");
  return f;
}
function hl(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - le, n = 0;
  for (; e % Kn === pe; )
    e /= Kn, n++;
  let r = Kn;
  const i = Ws(t);
  for (; ac(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return gu;
  let a = i.pow(r, e);
  const c = (e + le) / Kn;
  return function(d, p) {
    if (d.is0(p))
      return p;
    if (ac(d, p) !== 1)
      throw new Error("Cannot find square root");
    let w = n, g = d.mul(d.ONE, a), b = d.pow(p, e), _ = d.pow(p, c);
    for (; !d.eql(b, d.ONE); ) {
      if (d.is0(b))
        return d.ZERO;
      let D = 1, A = d.sqr(b);
      for (; !d.eql(A, d.ONE); )
        if (D++, A = d.sqr(A), D === w)
          throw new Error("Cannot find square root");
      const P = le << BigInt(w - D - 1), H = d.pow(g, P);
      w = D, g = d.sqr(H), b = d.mul(b, g), _ = d.mul(_, H);
    }
    return _;
  };
}
function pl(t) {
  return t % hu === ll ? gu : t % yu === pu ? dl : hl(t);
}
const yl = [
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
function gl(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = yl.reduce((r, i) => (r[i] = "function", r), e);
  return ai(t, n);
}
function wl(t, e, n) {
  if (n < pe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === pe)
    return t.ONE;
  if (n === le)
    return e;
  let r = t.ONE, i = e;
  for (; n > pe; )
    n & le && (r = t.mul(r, i)), i = t.sqr(i), n >>= le;
  return r;
}
function wu(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), i = e.reduce((c, f, d) => t.is0(f) ? c : (r[d] = c, t.mul(c, f)), t.ONE), a = t.inv(i);
  return e.reduceRight((c, f, d) => t.is0(f) ? c : (r[d] = t.mul(c, r[d]), t.mul(c, f)), a), r;
}
function ac(t, e) {
  const n = (t.ORDER - le) / Kn, r = t.pow(e, n), i = t.eql(r, t.ONE), a = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!i && !a && !c)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : a ? 0 : -1;
}
function mu(t, e) {
  e !== void 0 && $o(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Ws(t, e, n = !1, r = {}) {
  if (t <= pe)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: a } = mu(t, e);
  if (a > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const f = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: a,
    MASK: si(i),
    ZERO: pe,
    ONE: le,
    create: (d) => Wt(d, t),
    isValid: (d) => {
      if (typeof d != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof d);
      return pe <= d && d < t;
    },
    is0: (d) => d === pe,
    isOdd: (d) => (d & le) === le,
    neg: (d) => Wt(-d, t),
    eql: (d, p) => d === p,
    sqr: (d) => Wt(d * d, t),
    add: (d, p) => Wt(d + p, t),
    sub: (d, p) => Wt(d - p, t),
    mul: (d, p) => Wt(d * p, t),
    pow: (d, p) => wl(f, d, p),
    div: (d, p) => Wt(d * bs(p, t), t),
    // Same as above, but doesn't normalize
    sqrN: (d) => d * d,
    addN: (d, p) => d + p,
    subN: (d, p) => d - p,
    mulN: (d, p) => d * p,
    inv: (d) => bs(d, t),
    sqrt: r.sqrt || ((d) => (c || (c = pl(t)), c(f, d))),
    toBytes: (d) => n ? du(d, a) : Ve(d, a),
    fromBytes: (d) => {
      if (d.length !== a)
        throw new Error("Field.fromBytes: expected " + a + " bytes, got " + d.length);
      return n ? lu(d) : fe(d);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (d) => wu(f, d),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (d, p, w) => w ? p : d
  });
  return Object.freeze(f);
}
function bu(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function vu(t) {
  const e = bu(t);
  return e + Math.ceil(e / 2);
}
function ml(t, e, n = !1) {
  const r = t.length, i = bu(e), a = vu(e);
  if (r < 16 || r < a || r > 1024)
    throw new Error("expected " + a + "-1024 bytes of input, got " + r);
  const c = n ? lu(t) : fe(t), f = Wt(c, e - le) + le;
  return n ? du(f, i) : Ve(f, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const cc = BigInt(0), vs = BigInt(1);
function ns(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Eu(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function rs(t, e) {
  Eu(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), i = 2 ** t, a = si(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: a, maxNumber: i, shiftBy: c };
}
function uc(t, e, n) {
  const { windowSize: r, mask: i, maxNumber: a, shiftBy: c } = n;
  let f = Number(t & i), d = t >> c;
  f > r && (f -= a, d += vs);
  const p = e * r, w = p + Math.abs(f) - 1, g = f === 0, b = f < 0, _ = e % 2 !== 0;
  return { nextN: d, offset: w, isZero: g, isNeg: b, isNegF: _, offsetF: p };
}
function bl(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function vl(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const os = /* @__PURE__ */ new WeakMap(), xu = /* @__PURE__ */ new WeakMap();
function is(t) {
  return xu.get(t) || 1;
}
function El(t, e) {
  return {
    constTimeNegate: ns,
    hasPrecomputes(n) {
      return is(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let a = n;
      for (; r > cc; )
        r & vs && (i = i.add(a)), a = a.double(), r >>= vs;
      return i;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(n, r) {
      const { windows: i, windowSize: a } = rs(r, e), c = [];
      let f = n, d = f;
      for (let p = 0; p < i; p++) {
        d = f, c.push(d);
        for (let w = 1; w < a; w++)
          d = d.add(f), c.push(d);
        f = d.double();
      }
      return c;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      let a = t.ZERO, c = t.BASE;
      const f = rs(n, e);
      for (let d = 0; d < f.windows; d++) {
        const { nextN: p, offset: w, isZero: g, isNeg: b, isNegF: _, offsetF: D } = uc(i, d, f);
        i = p, g ? c = c.add(ns(_, r[D])) : a = a.add(ns(b, r[w]));
      }
      return { p: a, f: c };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, i, a = t.ZERO) {
      const c = rs(n, e);
      for (let f = 0; f < c.windows && i !== cc; f++) {
        const { nextN: d, offset: p, isZero: w, isNeg: g } = uc(i, f, c);
        if (i = d, !w) {
          const b = r[p];
          a = a.add(g ? b.negate() : b);
        }
      }
      return a;
    },
    getPrecomputes(n, r, i) {
      let a = os.get(r);
      return a || (a = this.precomputeWindow(r, n), n !== 1 && os.set(r, i(a))), a;
    },
    wNAFCached(n, r, i) {
      const a = is(n);
      return this.wNAF(a, this.getPrecomputes(a, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, a) {
      const c = is(n);
      return c === 1 ? this.unsafeLadder(n, r, a) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, i), r, a);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Eu(r, e), xu.set(n, r), os.delete(n);
    }
  };
}
function xl(t, e, n, r) {
  bl(n, t), vl(r, e);
  const i = n.length, a = r.length;
  if (i !== a)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, f = cl(BigInt(i));
  let d = 1;
  f > 12 ? d = f - 3 : f > 4 ? d = f - 2 : f > 0 && (d = 2);
  const p = si(d), w = new Array(Number(p) + 1).fill(c), g = Math.floor((e.BITS - 1) / d) * d;
  let b = c;
  for (let _ = g; _ >= 0; _ -= d) {
    w.fill(c);
    for (let A = 0; A < a; A++) {
      const P = r[A], H = Number(P >> BigInt(_) & p);
      w[H] = w[H].add(n[A]);
    }
    let D = c;
    for (let A = w.length - 1, P = c; A > 0; A--)
      P = P.add(w[A]), D = D.add(P);
    if (b = b.add(D), _ !== 0)
      for (let A = 0; A < d; A++)
        b = b.double();
  }
  return b;
}
function Su(t) {
  return gl(t.Fp), ai(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...mu(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function fc(t) {
  t.lowS !== void 0 && Pr("lowS", t.lowS), t.prehash !== void 0 && Pr("prehash", t.prehash);
}
function Sl(t) {
  const e = Su(t);
  ai(e, {
    a: "field",
    b: "field"
  }, {
    allowInfinityPoint: "boolean",
    allowedPrivateKeyLengths: "array",
    clearCofactor: "function",
    fromBytes: "function",
    isTorsionFree: "function",
    toBytes: "function",
    wrapPrivateKey: "boolean"
  });
  const { endo: n, Fp: r, a: i } = e;
  if (n) {
    if (!r.eql(i, r.ZERO))
      throw new Error("invalid endo: CURVE.a must be 0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  }
  return Object.freeze({ ...e });
}
class kl extends Error {
  constructor(e = "") {
    super(e);
  }
}
const Ze = {
  // asn.1 DER encoding utils
  Err: kl,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = Ze;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = Ao(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const a = r > 127 ? Ao(i.length / 2 | 128) : "";
      return Ao(t) + a + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = Ze;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], a = !!(i & 128);
      let c = 0;
      if (!a)
        c = i;
      else {
        const d = i & 127;
        if (!d)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (d > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const p = e.subarray(r, r + d);
        if (p.length !== d)
          throw new n("tlv.decode: length bytes not complete");
        if (p[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const w of p)
          c = c << 8 | w;
        if (r += d, c < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const f = e.subarray(r, r + c);
      if (f.length !== c)
        throw new n("tlv.decode: wrong value length");
      return { v: f, l: e.subarray(r + c) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = Ze;
      if (t < Qe)
        throw new e("integer: negative integers are not allowed");
      let n = Ao(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = Ze;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return fe(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = Ze, i = Qt("signature", t), { v: a, l: c } = r.decode(48, i);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: f, l: d } = r.decode(2, a), { v: p, l: w } = r.decode(2, d);
    if (w.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(f), s: n.decode(p) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = Ze, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), a = r + i;
    return e.encode(48, a);
  }
};
function ss(t, e) {
  return Lr(Ve(t, e));
}
const Qe = BigInt(0), zt = BigInt(1);
BigInt(2);
const as = BigInt(3), Tl = BigInt(4);
function Al(t) {
  const e = Sl(t), { Fp: n } = e, r = Ws(e.n, e.nBitLength), i = e.toBytes || ((j, L, M) => {
    const tt = L.toAffine();
    return Mn(Uint8Array.from([4]), n.toBytes(tt.x), n.toBytes(tt.y));
  }), a = e.fromBytes || ((j) => {
    const L = j.subarray(1), M = n.fromBytes(L.subarray(0, n.BYTES)), tt = n.fromBytes(L.subarray(n.BYTES, 2 * n.BYTES));
    return { x: M, y: tt };
  });
  function c(j) {
    const { a: L, b: M } = e, tt = n.sqr(j), ot = n.mul(tt, j);
    return n.add(n.add(ot, n.mul(j, L)), M);
  }
  function f(j, L) {
    const M = n.sqr(L), tt = c(j);
    return n.eql(M, tt);
  }
  if (!f(e.Gx, e.Gy))
    throw new Error("bad curve params: generator point");
  const d = n.mul(n.pow(e.a, as), Tl), p = n.mul(n.sqr(e.b), BigInt(27));
  if (n.is0(n.add(d, p)))
    throw new Error("bad curve params: a or b");
  function w(j) {
    return Dr(j, zt, e.n);
  }
  function g(j) {
    const { allowedPrivateKeyLengths: L, nByteLength: M, wrapPrivateKey: tt, n: ot } = e;
    if (L && typeof j != "bigint") {
      if (Gr(j) && (j = Lr(j)), typeof j != "string" || !L.includes(j.length))
        throw new Error("invalid private key");
      j = j.padStart(M * 2, "0");
    }
    let yt;
    try {
      yt = typeof j == "bigint" ? j : fe(Qt("private key", j, M));
    } catch {
      throw new Error("invalid private key, expected hex or " + M + " bytes, got " + typeof j);
    }
    return tt && (yt = Wt(yt, ot)), Be("private key", yt, zt, ot), yt;
  }
  function b(j) {
    if (!(j instanceof A))
      throw new Error("ProjectivePoint expected");
  }
  const _ = sc((j, L) => {
    const { px: M, py: tt, pz: ot } = j;
    if (n.eql(ot, n.ONE))
      return { x: M, y: tt };
    const yt = j.is0();
    L == null && (L = yt ? n.ONE : n.inv(ot));
    const Et = n.mul(M, L), bt = n.mul(tt, L), ut = n.mul(ot, L);
    if (yt)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(ut, n.ONE))
      throw new Error("invZ was invalid");
    return { x: Et, y: bt };
  }), D = sc((j) => {
    if (j.is0()) {
      if (e.allowInfinityPoint && !n.is0(j.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: L, y: M } = j.toAffine();
    if (!n.isValid(L) || !n.isValid(M))
      throw new Error("bad point: x or y not FE");
    if (!f(L, M))
      throw new Error("bad point: equation left != right");
    if (!j.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class A {
    constructor(L, M, tt) {
      if (L == null || !n.isValid(L))
        throw new Error("x required");
      if (M == null || !n.isValid(M) || n.is0(M))
        throw new Error("y required");
      if (tt == null || !n.isValid(tt))
        throw new Error("z required");
      this.px = L, this.py = M, this.pz = tt, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(L) {
      const { x: M, y: tt } = L || {};
      if (!L || !n.isValid(M) || !n.isValid(tt))
        throw new Error("invalid affine point");
      if (L instanceof A)
        throw new Error("projective point not allowed");
      const ot = (yt) => n.eql(yt, n.ZERO);
      return ot(M) && ot(tt) ? A.ZERO : new A(M, tt, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(L) {
      const M = wu(n, L.map((tt) => tt.pz));
      return L.map((tt, ot) => tt.toAffine(M[ot])).map(A.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(L) {
      const M = A.fromAffine(a(Qt("pointHex", L)));
      return M.assertValidity(), M;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(L) {
      return A.BASE.multiply(g(L));
    }
    // Multiscalar Multiplication
    static msm(L, M) {
      return xl(A, r, L, M);
    }
    // "Private method", don't use it directly
    _setWindowSize(L) {
      W.setWindowSize(this, L);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      D(this);
    }
    hasEvenY() {
      const { y: L } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(L);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(L) {
      b(L);
      const { px: M, py: tt, pz: ot } = this, { px: yt, py: Et, pz: bt } = L, ut = n.eql(n.mul(M, bt), n.mul(yt, ot)), $ = n.eql(n.mul(tt, bt), n.mul(Et, ot));
      return ut && $;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new A(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: L, b: M } = e, tt = n.mul(M, as), { px: ot, py: yt, pz: Et } = this;
      let bt = n.ZERO, ut = n.ZERO, $ = n.ZERO, Z = n.mul(ot, ot), Ht = n.mul(yt, yt), X = n.mul(Et, Et), G = n.mul(ot, yt);
      return G = n.add(G, G), $ = n.mul(ot, Et), $ = n.add($, $), bt = n.mul(L, $), ut = n.mul(tt, X), ut = n.add(bt, ut), bt = n.sub(Ht, ut), ut = n.add(Ht, ut), ut = n.mul(bt, ut), bt = n.mul(G, bt), $ = n.mul(tt, $), X = n.mul(L, X), G = n.sub(Z, X), G = n.mul(L, G), G = n.add(G, $), $ = n.add(Z, Z), Z = n.add($, Z), Z = n.add(Z, X), Z = n.mul(Z, G), ut = n.add(ut, Z), X = n.mul(yt, Et), X = n.add(X, X), Z = n.mul(X, G), bt = n.sub(bt, Z), $ = n.mul(X, Ht), $ = n.add($, $), $ = n.add($, $), new A(bt, ut, $);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(L) {
      b(L);
      const { px: M, py: tt, pz: ot } = this, { px: yt, py: Et, pz: bt } = L;
      let ut = n.ZERO, $ = n.ZERO, Z = n.ZERO;
      const Ht = e.a, X = n.mul(e.b, as);
      let G = n.mul(M, yt), at = n.mul(tt, Et), dt = n.mul(ot, bt), ft = n.add(M, tt), lt = n.add(yt, Et);
      ft = n.mul(ft, lt), lt = n.add(G, at), ft = n.sub(ft, lt), lt = n.add(M, ot);
      let kt = n.add(yt, bt);
      return lt = n.mul(lt, kt), kt = n.add(G, dt), lt = n.sub(lt, kt), kt = n.add(tt, ot), ut = n.add(Et, bt), kt = n.mul(kt, ut), ut = n.add(at, dt), kt = n.sub(kt, ut), Z = n.mul(Ht, lt), ut = n.mul(X, dt), Z = n.add(ut, Z), ut = n.sub(at, Z), Z = n.add(at, Z), $ = n.mul(ut, Z), at = n.add(G, G), at = n.add(at, G), dt = n.mul(Ht, dt), lt = n.mul(X, lt), at = n.add(at, dt), dt = n.sub(G, dt), dt = n.mul(Ht, dt), lt = n.add(lt, dt), G = n.mul(at, lt), $ = n.add($, G), G = n.mul(kt, lt), ut = n.mul(ft, ut), ut = n.sub(ut, G), G = n.mul(ft, at), Z = n.mul(kt, Z), Z = n.add(Z, G), new A(ut, $, Z);
    }
    subtract(L) {
      return this.add(L.negate());
    }
    is0() {
      return this.equals(A.ZERO);
    }
    wNAF(L) {
      return W.wNAFCached(this, L, A.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(L) {
      const { endo: M, n: tt } = e;
      Be("scalar", L, Qe, tt);
      const ot = A.ZERO;
      if (L === Qe)
        return ot;
      if (this.is0() || L === zt)
        return this;
      if (!M || W.hasPrecomputes(this))
        return W.wNAFCachedUnsafe(this, L, A.normalizeZ);
      let { k1neg: yt, k1: Et, k2neg: bt, k2: ut } = M.splitScalar(L), $ = ot, Z = ot, Ht = this;
      for (; Et > Qe || ut > Qe; )
        Et & zt && ($ = $.add(Ht)), ut & zt && (Z = Z.add(Ht)), Ht = Ht.double(), Et >>= zt, ut >>= zt;
      return yt && ($ = $.negate()), bt && (Z = Z.negate()), Z = new A(n.mul(Z.px, M.beta), Z.py, Z.pz), $.add(Z);
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
    multiply(L) {
      const { endo: M, n: tt } = e;
      Be("scalar", L, zt, tt);
      let ot, yt;
      if (M) {
        const { k1neg: Et, k1: bt, k2neg: ut, k2: $ } = M.splitScalar(L);
        let { p: Z, f: Ht } = this.wNAF(bt), { p: X, f: G } = this.wNAF($);
        Z = W.constTimeNegate(Et, Z), X = W.constTimeNegate(ut, X), X = new A(n.mul(X.px, M.beta), X.py, X.pz), ot = Z.add(X), yt = Ht.add(G);
      } else {
        const { p: Et, f: bt } = this.wNAF(L);
        ot = Et, yt = bt;
      }
      return A.normalizeZ([ot, yt])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(L, M, tt) {
      const ot = A.BASE, yt = (bt, ut) => ut === Qe || ut === zt || !bt.equals(ot) ? bt.multiplyUnsafe(ut) : bt.multiply(ut), Et = yt(this, M).add(yt(L, tt));
      return Et.is0() ? void 0 : Et;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(L) {
      return _(this, L);
    }
    isTorsionFree() {
      const { h: L, isTorsionFree: M } = e;
      if (L === zt)
        return !0;
      if (M)
        return M(A, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: L, clearCofactor: M } = e;
      return L === zt ? this : M ? M(A, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(L = !0) {
      return Pr("isCompressed", L), this.assertValidity(), i(A, this, L);
    }
    toHex(L = !0) {
      return Pr("isCompressed", L), Lr(this.toRawBytes(L));
    }
  }
  A.BASE = new A(e.Gx, e.Gy, n.ONE), A.ZERO = new A(n.ZERO, n.ONE, n.ZERO);
  const { endo: P, nBitLength: H } = e, W = El(A, P ? Math.ceil(H / 2) : H);
  return {
    CURVE: e,
    ProjectivePoint: A,
    normPrivateKeyToScalar: g,
    weierstrassEquation: c,
    isWithinCurveOrder: w
  };
}
function Il(t) {
  const e = Su(t);
  return ai(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function _l(t) {
  const e = Il(t), { Fp: n, n: r, nByteLength: i, nBitLength: a } = e, c = n.BYTES + 1, f = 2 * n.BYTES + 1;
  function d(X) {
    return Wt(X, r);
  }
  function p(X) {
    return bs(X, r);
  }
  const { ProjectivePoint: w, normPrivateKeyToScalar: g, weierstrassEquation: b, isWithinCurveOrder: _ } = Al({
    ...e,
    toBytes(X, G, at) {
      const dt = G.toAffine(), ft = n.toBytes(dt.x), lt = Mn;
      return Pr("isCompressed", at), at ? lt(Uint8Array.from([G.hasEvenY() ? 2 : 3]), ft) : lt(Uint8Array.from([4]), ft, n.toBytes(dt.y));
    },
    fromBytes(X) {
      const G = X.length, at = X[0], dt = X.subarray(1);
      if (G === c && (at === 2 || at === 3)) {
        const ft = fe(dt);
        if (!Dr(ft, zt, n.ORDER))
          throw new Error("Point is not on curve");
        const lt = b(ft);
        let kt;
        try {
          kt = n.sqrt(lt);
        } catch (de) {
          const Kt = de instanceof Error ? ": " + de.message : "";
          throw new Error("Point is not on curve" + Kt);
        }
        const Xt = (kt & zt) === zt;
        return (at & 1) === 1 !== Xt && (kt = n.neg(kt)), { x: ft, y: kt };
      } else if (G === f && at === 4) {
        const ft = n.fromBytes(dt.subarray(0, n.BYTES)), lt = n.fromBytes(dt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: ft, y: lt };
      } else {
        const ft = c, lt = f;
        throw new Error("invalid Point, expected length of " + ft + ", or uncompressed " + lt + ", got " + G);
      }
    }
  });
  function D(X) {
    const G = r >> zt;
    return X > G;
  }
  function A(X) {
    return D(X) ? d(-X) : X;
  }
  const P = (X, G, at) => fe(X.slice(G, at));
  class H {
    constructor(G, at, dt) {
      Be("r", G, zt, r), Be("s", at, zt, r), this.r = G, this.s = at, dt != null && (this.recovery = dt), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(G) {
      const at = i;
      return G = Qt("compactSignature", G, at * 2), new H(P(G, 0, at), P(G, at, 2 * at));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(G) {
      const { r: at, s: dt } = Ze.toSig(Qt("DER", G));
      return new H(at, dt);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(G) {
      return new H(this.r, this.s, G);
    }
    recoverPublicKey(G) {
      const { r: at, s: dt, recovery: ft } = this, lt = ot(Qt("msgHash", G));
      if (ft == null || ![0, 1, 2, 3].includes(ft))
        throw new Error("recovery id invalid");
      const kt = ft === 2 || ft === 3 ? at + e.n : at;
      if (kt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const Xt = (ft & 1) === 0 ? "02" : "03", Jt = w.fromHex(Xt + ss(kt, n.BYTES)), de = p(kt), Kt = d(-lt * de), me = d(dt * de), Se = w.BASE.multiplyAndAddUnsafe(Jt, Kt, me);
      if (!Se)
        throw new Error("point at infinify");
      return Se.assertValidity(), Se;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return D(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new H(this.r, d(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Fo(this.toDERHex());
    }
    toDERHex() {
      return Ze.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Fo(this.toCompactHex());
    }
    toCompactHex() {
      const G = i;
      return ss(this.r, G) + ss(this.s, G);
    }
  }
  const W = {
    isValidPrivateKey(X) {
      try {
        return g(X), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: g,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const X = vu(e.n);
      return ml(e.randomBytes(X), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(X = 8, G = w.BASE) {
      return G._setWindowSize(X), G.multiply(BigInt(3)), G;
    }
  };
  function j(X, G = !0) {
    return w.fromPrivateKey(X).toRawBytes(G);
  }
  function L(X) {
    if (typeof X == "bigint")
      return !1;
    if (X instanceof w)
      return !0;
    const at = Qt("key", X).length, dt = n.BYTES, ft = dt + 1, lt = 2 * dt + 1;
    if (!(e.allowedPrivateKeyLengths || i === ft))
      return at === ft || at === lt;
  }
  function M(X, G, at = !0) {
    if (L(X) === !0)
      throw new Error("first arg must be private key");
    if (L(G) === !1)
      throw new Error("second arg must be public key");
    return w.fromHex(G).multiply(g(X)).toRawBytes(at);
  }
  const tt = e.bits2int || function(X) {
    if (X.length > 8192)
      throw new Error("input is too large");
    const G = fe(X), at = X.length * 8 - a;
    return at > 0 ? G >> BigInt(at) : G;
  }, ot = e.bits2int_modN || function(X) {
    return d(tt(X));
  }, yt = si(a);
  function Et(X) {
    return Be("num < 2^" + a, X, Qe, yt), Ve(X, i);
  }
  function bt(X, G, at = ut) {
    if (["recovered", "canonical"].some((rt) => rt in at))
      throw new Error("sign() legacy options not supported");
    const { hash: dt, randomBytes: ft } = e;
    let { lowS: lt, prehash: kt, extraEntropy: Xt } = at;
    lt == null && (lt = !0), X = Qt("msgHash", X), fc(at), kt && (X = Qt("prehashed msgHash", dt(X)));
    const Jt = ot(X), de = g(G), Kt = [Et(de), Et(Jt)];
    if (Xt != null && Xt !== !1) {
      const rt = Xt === !0 ? ft(n.BYTES) : Xt;
      Kt.push(Qt("extraEntropy", rt));
    }
    const me = Mn(...Kt), Se = Jt;
    function ur(rt) {
      const je = tt(rt);
      if (!_(je))
        return;
      const nn = p(je), xt = w.BASE.multiply(je).toAffine(), be = d(xt.x);
      if (be === Qe)
        return;
      const xn = d(nn * d(Se + be * de));
      if (xn === Qe)
        return;
      let ve = (xt.x === be ? 0 : 2) | Number(xt.y & zt), rn = xn;
      return lt && D(xn) && (rn = A(xn), ve ^= 1), new H(be, rn, ve);
    }
    return { seed: me, k2sig: ur };
  }
  const ut = { lowS: e.lowS, prehash: !1 }, $ = { lowS: e.lowS, prehash: !1 };
  function Z(X, G, at = ut) {
    const { seed: dt, k2sig: ft } = bt(X, G, at), lt = e;
    return ul(lt.hash.outputLen, lt.nByteLength, lt.hmac)(dt, ft);
  }
  w.BASE._setWindowSize(8);
  function Ht(X, G, at, dt = $) {
    var ve;
    const ft = X;
    G = Qt("msgHash", G), at = Qt("publicKey", at);
    const { lowS: lt, prehash: kt, format: Xt } = dt;
    if (fc(dt), "strict" in dt)
      throw new Error("options.strict was renamed to lowS");
    if (Xt !== void 0 && Xt !== "compact" && Xt !== "der")
      throw new Error("format must be compact or der");
    const Jt = typeof ft == "string" || Gr(ft), de = !Jt && !Xt && typeof ft == "object" && ft !== null && typeof ft.r == "bigint" && typeof ft.s == "bigint";
    if (!Jt && !de)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let Kt, me;
    try {
      if (de && (Kt = new H(ft.r, ft.s)), Jt) {
        try {
          Xt !== "compact" && (Kt = H.fromDER(ft));
        } catch (rn) {
          if (!(rn instanceof Ze.Err))
            throw rn;
        }
        !Kt && Xt !== "der" && (Kt = H.fromCompact(ft));
      }
      me = w.fromHex(at);
    } catch {
      return !1;
    }
    if (!Kt || lt && Kt.hasHighS())
      return !1;
    kt && (G = e.hash(G));
    const { r: Se, s: ur } = Kt, rt = ot(G), je = p(ur), nn = d(rt * je), xt = d(Se * je), be = (ve = w.BASE.multiplyAndAddUnsafe(me, nn, xt)) == null ? void 0 : ve.toAffine();
    return be ? d(be.x) === Se : !1;
  }
  return {
    CURVE: e,
    getPublicKey: j,
    getSharedSecret: M,
    sign: Z,
    verify: Ht,
    ProjectivePoint: w,
    Signature: H,
    utils: W
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Bl(t) {
  return {
    hash: t,
    hmac: (e, ...n) => cu(t, e, el(...n)),
    randomBytes: js
  };
}
function Cl(t, e) {
  const n = (r) => _l({ ...t, ...Bl(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const zr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Vo = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Ys = BigInt(0), $r = BigInt(1), Ho = BigInt(2), lc = (t, e) => (t + e / Ho) / e;
function ku(t) {
  const e = zr, n = BigInt(3), r = BigInt(6), i = BigInt(11), a = BigInt(22), c = BigInt(23), f = BigInt(44), d = BigInt(88), p = t * t * t % e, w = p * p * t % e, g = Te(w, n, e) * w % e, b = Te(g, n, e) * w % e, _ = Te(b, Ho, e) * p % e, D = Te(_, i, e) * _ % e, A = Te(D, a, e) * D % e, P = Te(A, f, e) * A % e, H = Te(P, d, e) * P % e, W = Te(H, f, e) * A % e, j = Te(W, n, e) * w % e, L = Te(j, c, e) * D % e, M = Te(L, r, e) * p % e, tt = Te(M, Ho, e);
  if (!Es.eql(Es.sqr(tt), t))
    throw new Error("Cannot find square root");
  return tt;
}
const Es = Ws(zr, void 0, void 0, { sqrt: ku }), Ce = Cl({
  a: Ys,
  b: BigInt(7),
  Fp: Es,
  n: Vo,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = Vo, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -$r * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), a = n, c = BigInt("0x100000000000000000000000000000000"), f = lc(a * t, e), d = lc(-r * t, e);
      let p = Wt(t - f * n - d * i, e), w = Wt(-f * r - d * a, e);
      const g = p > c, b = w > c;
      if (g && (p = e - p), b && (w = e - w), p > c || w > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: g, k1: p, k2neg: b, k2: w };
    }
  }
}, he), dc = {};
function qo(t, ...e) {
  let n = dc[t];
  if (n === void 0) {
    const r = he(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = Mn(r, r), dc[t] = n;
  }
  return he(Mn(n, ...e));
}
const Zs = (t) => t.toRawBytes(!0).slice(1), xs = (t) => Ve(t, 32), cs = (t) => Wt(t, zr), Mr = (t) => Wt(t, Vo), Xs = Ce.ProjectivePoint, Nl = (t, e, n) => Xs.BASE.multiplyAndAddUnsafe(t, e, n);
function Ss(t) {
  let e = Ce.utils.normPrivateKeyToScalar(t), n = Xs.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Mr(-e), bytes: Zs(n) };
}
function Tu(t) {
  Be("x", t, $r, zr);
  const e = cs(t * t), n = cs(e * t + BigInt(7));
  let r = ku(n);
  r % Ho !== Ys && (r = cs(-r));
  const i = new Xs(t, r, $r);
  return i.assertValidity(), i;
}
const Qn = fe;
function Au(...t) {
  return Mr(Qn(qo("BIP0340/challenge", ...t)));
}
function Ul(t) {
  return Ss(t).bytes;
}
function Rl(t, e, n = js(32)) {
  const r = Qt("message", t), { bytes: i, scalar: a } = Ss(e), c = Qt("auxRand", n, 32), f = xs(a ^ Qn(qo("BIP0340/aux", c))), d = qo("BIP0340/nonce", f, i, r), p = Mr(Qn(d));
  if (p === Ys)
    throw new Error("sign failed: k is zero");
  const { bytes: w, scalar: g } = Ss(p), b = Au(w, i, r), _ = new Uint8Array(64);
  if (_.set(w, 0), _.set(xs(Mr(g + b * a)), 32), !Iu(_, r, i))
    throw new Error("sign: Invalid signature produced");
  return _;
}
function Iu(t, e, n) {
  const r = Qt("signature", t, 64), i = Qt("message", e), a = Qt("publicKey", n, 32);
  try {
    const c = Tu(Qn(a)), f = Qn(r.subarray(0, 32));
    if (!Dr(f, $r, zr))
      return !1;
    const d = Qn(r.subarray(32, 64));
    if (!Dr(d, $r, Vo))
      return !1;
    const p = Au(xs(f), Zs(c), i), w = Nl(c, d, Mr(-p));
    return !(!w || !w.hasEvenY() || w.toAffine().x !== f);
  } catch {
    return !1;
  }
}
const Ne = {
  getPublicKey: Ul,
  sign: Rl,
  verify: Iu,
  utils: {
    randomPrivateKey: Ce.utils.randomPrivateKey,
    lift_x: Tu,
    pointToBytes: Zs,
    numberToBytesBE: Ve,
    bytesToNumberBE: fe,
    taggedHash: qo,
    mod: Wt
  }
}, Ol = /* @__PURE__ */ Uint8Array.from([
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
]), _u = Uint8Array.from(new Array(16).fill(0).map((t, e) => e)), Pl = _u.map((t) => (9 * t + 5) % 16), Bu = /* @__PURE__ */ (() => {
  const n = [[_u], [Pl]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((a) => Ol[a]));
  return n;
})(), Cu = Bu[0], Nu = Bu[1], Uu = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => Uint8Array.from(t)), Ll = /* @__PURE__ */ Cu.map((t, e) => t.map((n) => Uu[e][n])), Kl = /* @__PURE__ */ Nu.map((t, e) => t.map((n) => Uu[e][n])), Dl = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), $l = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function hc(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const Io = /* @__PURE__ */ new Uint32Array(16);
class Ml extends su {
  constructor() {
    super(64, 20, 8, !0), this.h0 = 1732584193, this.h1 = -271733879, this.h2 = -1732584194, this.h3 = 271733878, this.h4 = -1009589776;
  }
  get() {
    const { h0: e, h1: n, h2: r, h3: i, h4: a } = this;
    return [e, n, r, i, a];
  }
  set(e, n, r, i, a) {
    this.h0 = e | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = a | 0;
  }
  process(e, n) {
    for (let _ = 0; _ < 16; _++, n += 4)
      Io[_] = e.getUint32(n, !0);
    let r = this.h0 | 0, i = r, a = this.h1 | 0, c = a, f = this.h2 | 0, d = f, p = this.h3 | 0, w = p, g = this.h4 | 0, b = g;
    for (let _ = 0; _ < 5; _++) {
      const D = 4 - _, A = Dl[_], P = $l[_], H = Cu[_], W = Nu[_], j = Ll[_], L = Kl[_];
      for (let M = 0; M < 16; M++) {
        const tt = To(r + hc(_, a, f, p) + Io[H[M]] + A, j[M]) + g | 0;
        r = g, g = p, p = To(f, 10) | 0, f = a, a = tt;
      }
      for (let M = 0; M < 16; M++) {
        const tt = To(i + hc(D, c, d, w) + Io[W[M]] + P, L[M]) + b | 0;
        i = b, b = w, w = To(d, 10) | 0, d = c, c = tt;
      }
    }
    this.set(this.h1 + f + w | 0, this.h2 + p + b | 0, this.h3 + g + i | 0, this.h4 + r + c | 0, this.h0 + a + d | 0);
  }
  roundClean() {
    tr(Io);
  }
  destroy() {
    this.destroyed = !0, tr(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Fl = /* @__PURE__ */ iu(() => new Ml());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function er(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ru(t, ...e) {
  if (!er(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Ou(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Qs(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function bn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function ar(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function jo(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Go(t, e) {
  if (!Ou(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Js(t, e) {
  if (!Ou(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Wr(...t) {
  const e = (a) => a, n = (a, c) => (f) => a(c(f)), r = t.map((a) => a.encode).reduceRight(n, e), i = t.map((a) => a.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function ci(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Go("alphabet", e);
  const r = new Map(e.map((i, a) => [i, a]));
  return {
    encode: (i) => (jo(i), i.map((a) => {
      if (!Number.isSafeInteger(a) || a < 0 || a >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${a}". Allowed: ${t}`);
      return e[a];
    })),
    decode: (i) => (jo(i), i.map((a) => {
      bn("alphabet.decode", a);
      const c = r.get(a);
      if (c === void 0)
        throw new Error(`Unknown letter: "${a}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function ui(t = "") {
  return bn("join", t), {
    encode: (e) => (Go("join.decode", e), e.join(t)),
    decode: (e) => (bn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Vl(t, e = "=") {
  return ar(t), bn("padding", e), {
    encode(n) {
      for (Go("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Go("padding.decode", n);
      let r = n.length;
      if (r * t % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === e; r--)
        if ((r - 1) * t % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return n.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function Hl(t) {
  return Qs(t), { encode: (e) => e, decode: (e) => t(e) };
}
function pc(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (jo(t), !t.length)
    return [];
  let r = 0;
  const i = [], a = Array.from(t, (f) => {
    if (ar(f), f < 0 || f >= e)
      throw new Error(`invalid integer: ${f}`);
    return f;
  }), c = a.length;
  for (; ; ) {
    let f = 0, d = !0;
    for (let p = r; p < c; p++) {
      const w = a[p], g = e * f, b = g + w;
      if (!Number.isSafeInteger(b) || g / e !== f || b - w !== g)
        throw new Error("convertRadix: carry overflow");
      const _ = b / n;
      f = b % n;
      const D = Math.floor(_);
      if (a[p] = D, !Number.isSafeInteger(D) || D * n + f !== b)
        throw new Error("convertRadix: carry overflow");
      if (d)
        D ? d = !1 : r = p;
      else continue;
    }
    if (i.push(f), d)
      break;
  }
  for (let f = 0; f < t.length - 1 && t[f] === 0; f++)
    i.push(0);
  return i.reverse();
}
const Pu = (t, e) => e === 0 ? t : Pu(e, t % e), zo = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Pu(t, e)), Oo = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function ks(t, e, n, r) {
  if (jo(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ zo(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ zo(e, n)}`);
  let i = 0, a = 0;
  const c = Oo[e], f = Oo[n] - 1, d = [];
  for (const p of t) {
    if (ar(p), p >= c)
      throw new Error(`convertRadix2: invalid data word=${p} from=${e}`);
    if (i = i << e | p, a + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${a} from=${e}`);
    for (a += e; a >= n; a -= n)
      d.push((i >> a - n & f) >>> 0);
    const w = Oo[a];
    if (w === void 0)
      throw new Error("invalid carry");
    i &= w - 1;
  }
  if (i = i << n - a & f, !r && a >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && a > 0 && d.push(i >>> 0), d;
}
// @__NO_SIDE_EFFECTS__
function ql(t) {
  ar(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!er(n))
        throw new Error("radix.encode input should be Uint8Array");
      return pc(Array.from(n), e, t);
    },
    decode: (n) => (Js("radix.decode", n), Uint8Array.from(pc(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function ta(t, e = !1) {
  if (ar(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ zo(8, t) > 32 || /* @__PURE__ */ zo(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!er(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ks(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Js("radix2.decode", n), Uint8Array.from(ks(n, t, 8, e)))
  };
}
function yc(t) {
  return Qs(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function jl(t, e) {
  return ar(t), Qs(e), {
    encode(n) {
      if (!er(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), i = new Uint8Array(n.length + t);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!er(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), i = n.slice(-t), a = e(r).slice(0, t);
      for (let c = 0; c < t; c++)
        if (a[c] !== i[c])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Gl = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", zl = (t, e) => {
  bn("base64", t);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (t.length > 0 && !n.test(t))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(t, { alphabet: r, lastChunkHandling: "strict" });
}, ie = Gl ? {
  encode(t) {
    return Ru(t), t.toBase64();
  },
  decode(t) {
    return zl(t);
  }
} : /* @__PURE__ */ Wr(/* @__PURE__ */ ta(6), /* @__PURE__ */ ci("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Vl(6), /* @__PURE__ */ ui("")), Wl = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Wr(/* @__PURE__ */ ql(58), /* @__PURE__ */ ci(t), /* @__PURE__ */ ui("")), Ts = /* @__PURE__ */ Wl("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Yl = (t) => /* @__PURE__ */ Wr(jl(4, (e) => t(t(e))), Ts), As = /* @__PURE__ */ Wr(/* @__PURE__ */ ci("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ ui("")), gc = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Sr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < gc.length; r++)
    (e >> r & 1) === 1 && (n ^= gc[r]);
  return n;
}
function wc(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let a = 0; a < r; a++) {
    const c = t.charCodeAt(a);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = Sr(i) ^ c >> 5;
  }
  i = Sr(i);
  for (let a = 0; a < r; a++)
    i = Sr(i) ^ t.charCodeAt(a) & 31;
  for (let a of e)
    i = Sr(i) ^ a;
  for (let a = 0; a < 6; a++)
    i = Sr(i);
  return i ^= n, As.encode(ks([i % Oo[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Lu(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ ta(5), r = n.decode, i = n.encode, a = yc(r);
  function c(g, b, _ = 90) {
    bn("bech32.encode prefix", g), er(b) && (b = Array.from(b)), Js("bech32.encode", b);
    const D = g.length;
    if (D === 0)
      throw new TypeError(`Invalid prefix length ${D}`);
    const A = D + 7 + b.length;
    if (_ !== !1 && A > _)
      throw new TypeError(`Length ${A} exceeds limit ${_}`);
    const P = g.toLowerCase(), H = wc(P, b, e);
    return `${P}1${As.encode(b)}${H}`;
  }
  function f(g, b = 90) {
    bn("bech32.decode input", g);
    const _ = g.length;
    if (_ < 8 || b !== !1 && _ > b)
      throw new TypeError(`invalid string length: ${_} (${g}). Expected (8..${b})`);
    const D = g.toLowerCase();
    if (g !== D && g !== g.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const A = D.lastIndexOf("1");
    if (A === 0 || A === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const P = D.slice(0, A), H = D.slice(A + 1);
    if (H.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const W = As.decode(H).slice(0, -6), j = wc(P, W, e);
    if (!H.endsWith(j))
      throw new Error(`Invalid checksum in ${g}: expected "${j}"`);
    return { prefix: P, words: W };
  }
  const d = yc(f);
  function p(g) {
    const { prefix: b, words: _ } = f(g, !1);
    return { prefix: b, words: _, bytes: r(_) };
  }
  function w(g, b) {
    return c(g, i(b));
  }
  return {
    encode: c,
    decode: f,
    encodeFromBytes: w,
    decodeToBytes: p,
    decodeUnsafe: d,
    fromWords: r,
    fromWordsUnsafe: a,
    toWords: i
  };
}
const Is = /* @__PURE__ */ Lu("bech32"), Yn = /* @__PURE__ */ Lu("bech32m"), Zl = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, Xl = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ql = {
  encode(t) {
    return Ru(t), t.toHex();
  },
  decode(t) {
    return bn("hex", t), Uint8Array.fromHex(t);
  }
}, et = Xl ? Ql : /* @__PURE__ */ Wr(/* @__PURE__ */ ta(4), /* @__PURE__ */ ci("0123456789abcdef"), /* @__PURE__ */ ui(""), /* @__PURE__ */ Hl((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Ut = /* @__PURE__ */ new Uint8Array(), Ku = /* @__PURE__ */ new Uint8Array([0]);
function nr(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function _e(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Jl(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (!_e(i))
      throw new Error("Uint8Array expected");
    e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const a = t[r];
    n.set(a, i), i += a.length;
  }
  return n;
}
const Du = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function Yr(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function He(t) {
  return Number.isSafeInteger(t);
}
const ea = {
  equalBytes: nr,
  isBytes: _e,
  concatBytes: Jl
}, $u = (t) => {
  if (t !== null && typeof t != "string" && !Pe(t) && !_e(t) && !He(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (Pe(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = tn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (Pe(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = tn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, Gt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(Gt.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (Gt.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${Gt.len(e)}`);
  },
  chunkLen: (t, e, n) => {
    if (e < 0)
      throw new Error(`wrong pos=${e}`);
    if (e + n > t)
      throw new Error(`wrong range=${e}/${n} of ${t}`);
  },
  set: (t, e, n, r = !0) => !r && (t[e] & n) !== 0 ? !1 : (t[e] |= n, !0),
  pos: (t, e) => ({
    chunk: Math.floor((t + e) / 32),
    mask: 1 << 32 - (t + e) % 32 - 1
  }),
  indices: (t, e, n = !1) => {
    Gt.checkLen(t, e);
    const { FULL_MASK: r, BITS: i } = Gt, a = i - e % i, c = a ? r >>> a << a : r, f = [];
    for (let d = 0; d < t.length; d++) {
      let p = t[d];
      if (n && (p = ~p), d === t.length - 1 && (p &= c), p !== 0)
        for (let w = 0; w < i; w++) {
          const g = 1 << i - w - 1;
          p & g && f.push(d * i + w);
        }
    }
    return f;
  },
  range: (t) => {
    const e = [];
    let n;
    for (const r of t)
      n === void 0 || r !== n.pos + n.length ? e.push(n = { pos: r, length: 1 }) : n.length += 1;
    return e;
  },
  rangeDebug: (t, e, n = !1) => `[${Gt.range(Gt.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, i = !0) => {
    Gt.chunkLen(e, n, r);
    const { FULL_MASK: a, BITS: c } = Gt, f = n % c ? Math.floor(n / c) : void 0, d = n + r, p = d % c ? Math.floor(d / c) : void 0;
    if (f !== void 0 && f === p)
      return Gt.set(t, f, a >>> c - r << c - r - n, i);
    if (f !== void 0 && !Gt.set(t, f, a >>> n % c, i))
      return !1;
    const w = f !== void 0 ? f + 1 : n / c, g = p !== void 0 ? p : d / c;
    for (let b = w; b < g; b++)
      if (!Gt.set(t, b, a, i))
        return !1;
    return !(p !== void 0 && f !== p && !Gt.set(t, p, a << c - d % c, i));
  }
}, tn = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (t, e, n) => {
    const r = { obj: e };
    t.push(r), n((i, a) => {
      r.field = i, a(), r.field = void 0;
    }), t.pop();
  },
  path: (t) => {
    const e = [];
    for (const n of t)
      n.field !== void 0 && e.push(n.field);
    return e.join("/");
  },
  err: (t, e, n) => {
    const r = new Error(`${t}(${tn.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((c) => c.obj);
    let i = 0;
    for (; i < n.length && n[i] === ".."; i++)
      r.pop();
    let a = r.pop();
    for (; i < n.length; i++) {
      if (!a || a[n[i]] === void 0)
        return;
      a = a[n[i]];
    }
    return a;
  }
};
class na {
  constructor(e, n = {}, r = [], i = void 0, a = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = a, this.view = Du(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = Gt.create(this.data.length), Gt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : Gt.setRange(this.bs, this.data.length, e, n, !1);
  }
  markBytes(e) {
    const n = this.pos;
    this.pos += e;
    const r = this.markBytesBS(n, e);
    if (!this.opts.allowMultipleReads && !r)
      throw this.err(`multiple read pos=${this.pos} len=${e}`);
    return r;
  }
  pushObj(e, n) {
    return tn.pushObj(this.stack, e, n);
  }
  readView(e, n) {
    if (!Number.isFinite(e))
      throw this.err(`readView: wrong length=${e}`);
    if (this.pos + e > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const r = n(this.view, this.pos);
    return this.markBytes(e), r;
  }
  // read bytes by absolute offset
  absBytes(e) {
    if (e > this.data.length)
      throw new Error("Unexpected end of buffer");
    return this.data.subarray(e);
  }
  finish() {
    if (!this.opts.allowUnreadBytes) {
      if (this.bitPos)
        throw this.err(`${this.bitPos} bits left after unpack: ${et.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = Gt.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = Gt.range(e).map(({ pos: r, length: i }) => `(${r}/${i})[${et.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${et.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return tn.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new na(this.absBytes(e), this.opts, this.stack, this, e);
  }
  bytes(e, n = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(e))
      throw this.err(`readBytes: wrong length=${e}`);
    if (this.pos + e > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data.subarray(this.pos, this.pos + e);
    return n || this.markBytes(e), r;
  }
  byte(e = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const n = this.data[this.pos];
    return e || this.markBytes(1), n;
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
  bits(e) {
    if (e > 32)
      throw this.err("BitReader: cannot read more than 32 bits in single call");
    let n = 0;
    for (; e; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const r = Math.min(e, this.bitPos);
      this.bitPos -= r, n = n << r | this.bitBuf >> this.bitPos & 2 ** r - 1, this.bitBuf &= 2 ** this.bitPos - 1, e -= r;
    }
    return n >>> 0;
  }
  find(e, n = this.pos) {
    if (!_e(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (nr(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class td {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = Du(this.viewBuf);
  }
  pushObj(e, n) {
    return tn.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!He(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return tn.err("Reader", this.stack, e);
  }
  bytes(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeBytes: ends with non-empty bit buffer");
    this.buffers.push(e), this.pos += e.length;
  }
  byte(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeByte: ends with non-empty bit buffer");
    this.buffers.push(new Uint8Array([e])), this.pos++;
  }
  finish(e = !0) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("buffer: ends with non-empty bit buffer");
    const n = this.buffers.concat(this.ptrs.map((a) => a.buffer)), r = n.map((a) => a.length).reduce((a, c) => a + c, 0), i = new Uint8Array(r);
    for (let a = 0, c = 0; a < n.length; a++) {
      const f = n[a];
      i.set(f, c), c += f.length;
    }
    for (let a = this.pos, c = 0; c < this.ptrs.length; c++) {
      const f = this.ptrs[c];
      i.set(f.ptr.encode(a), f.pos), a += f.buffer.length;
    }
    if (e) {
      this.buffers = [];
      for (const a of this.ptrs)
        a.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return i;
  }
  bits(e, n) {
    if (n > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (e >= 2 ** n)
      throw this.err(`writeBits: value (${e}) >= 2**bits (${n})`);
    for (; n; ) {
      const r = Math.min(n, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << r | e >> n - r, this.bitPos += r, n -= r, e &= 2 ** n - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
}
const _s = (t) => Uint8Array.from(t).reverse();
function ed(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function Mu(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new td();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new na(e, n), i = t.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function ge(t, e) {
  if (!Pe(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return Mu({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e(r);
      } catch (a) {
        throw n.err(a);
      }
      t.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = t.decodeStream(n);
      try {
        return e(r);
      } catch (i) {
        throw n.err(i);
      }
    }
  });
}
const we = (t) => {
  const e = Mu(t);
  return t.validate ? ge(e, t.validate) : e;
}, fi = (t) => Yr(t) && typeof t.decode == "function" && typeof t.encode == "function";
function Pe(t) {
  return Yr(t) && fi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || He(t.size));
}
function nd() {
  return {
    encode: (t) => {
      if (!Array.isArray(t))
        throw new Error("array expected");
      const e = {};
      for (const n of t) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], i = n[1];
        if (e[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        e[r] = i;
      }
      return e;
    },
    decode: (t) => {
      if (!Yr(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const rd = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!He(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function od(t) {
  if (!Yr(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!He(e) || !(e in t))
        throw new Error(`wrong value ${e}`);
      return t[e];
    },
    decode: (e) => {
      if (typeof e != "string")
        throw new Error(`wrong value ${typeof e}`);
      return t[e];
    }
  };
}
function id(t, e = !1) {
  if (!He(t))
    throw new Error(`decimal/precision: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof e}`);
  const n = 10n ** BigInt(t);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), a = i.length - t;
      a < 0 && (i = i.padStart(i.length - a, "0"), a = 0);
      let c = i.length - 1;
      for (; c >= a && i[c] === "0"; c--)
        ;
      let f = i.slice(0, a), d = i.slice(a, c + 1);
      return f || (f = "0"), r < 0n && (f = "-" + f), d ? `${f}.${d}` : f;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let i = !1;
      if (r.startsWith("-") && (i = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let a = r.indexOf(".");
      a = a === -1 ? r.length : a;
      const c = r.slice(0, a), f = r.slice(a + 1).replace(/0+$/, ""), d = BigInt(c) * n;
      if (!e && f.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const p = Math.min(f.length, t), w = BigInt(f.slice(0, p)) * 10n ** BigInt(t - p), g = d + w;
      return i ? -g : g;
    }
  };
}
function sd(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!fi(e))
      throw new Error(`wrong base coder ${e}`);
  return {
    encode: (e) => {
      for (const n of t) {
        const r = n.encode(e);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/encode: cannot find match in ${e}`);
    },
    decode: (e) => {
      for (const n of t) {
        const r = n.decode(e);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/decode: cannot find match in ${e}`);
    }
  };
}
const Fu = (t) => {
  if (!fi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, li = { dict: nd, numberBigint: rd, tsEnum: od, decimal: id, match: sd, reverse: Fu }, ra = (t, e = !1, n = !1, r = !0) => {
  if (!He(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(t), a = 2n ** (8n * i - 1n);
  return we({
    size: r ? t : void 0,
    encodeStream: (c, f) => {
      n && f < 0 && (f = f | a);
      const d = [];
      for (let w = 0; w < t; w++)
        d.push(Number(f & 255n)), f >>= 8n;
      let p = new Uint8Array(d).reverse();
      if (!r) {
        let w = 0;
        for (w = 0; w < p.length && p[w] === 0; w++)
          ;
        p = p.subarray(w);
      }
      c.bytes(e ? p.reverse() : p);
    },
    decodeStream: (c) => {
      const f = c.bytes(r ? t : Math.min(t, c.leftBytes)), d = e ? f : _s(f);
      let p = 0n;
      for (let w = 0; w < d.length; w++)
        p |= BigInt(d[w]) << 8n * BigInt(w);
      return n && p & a && (p = (p ^ a) - a), p;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return ed(c, 8n * i, !!n), c;
    }
  });
}, Vu = /* @__PURE__ */ ra(32, !1), Po = /* @__PURE__ */ ra(8, !0), ad = /* @__PURE__ */ ra(8, !0, !0), cd = (t, e) => we({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (i) => e.write(i, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), Zr = (t, e, n) => {
  const r = t * 8, i = 2 ** (r - 1), a = (d) => {
    if (!He(d))
      throw new Error(`sintView: value is not safe integer: ${d}`);
    if (d < -i || d >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${d} < ${i}`);
  }, c = 2 ** r, f = (d) => {
    if (!He(d))
      throw new Error(`uintView: value is not safe integer: ${d}`);
    if (0 > d || d >= c)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${d} < ${c}`);
  };
  return cd(t, {
    write: n.write,
    read: n.read,
    validate: e ? a : f
  });
}, Tt = /* @__PURE__ */ Zr(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), ud = /* @__PURE__ */ Zr(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), Zn = /* @__PURE__ */ Zr(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), mc = /* @__PURE__ */ Zr(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), wn = /* @__PURE__ */ Zr(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Nt = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = $u(t), r = _e(t);
  return we({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (i, a) => {
      r || n.encodeStream(i, a.length), i.bytes(e ? _s(a) : a), r && i.bytes(t);
    },
    decodeStream: (i) => {
      let a;
      if (r) {
        const c = i.find(t);
        if (!c)
          throw i.err("bytes: cannot find terminator");
        a = i.bytes(c - i.pos), i.bytes(t.length);
      } else
        a = i.bytes(t === null ? i.leftBytes : n.decodeStream(i));
      return e ? _s(a) : a;
    },
    validate: (i) => {
      if (!_e(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function fd(t, e) {
  if (!Pe(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return vn(Nt(t), Fu(e));
}
const oa = (t, e = !1) => ge(vn(Nt(t, e), Zl), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), ld = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = vn(Nt(t, e.isLE), et);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = vn(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function vn(t, e) {
  if (!Pe(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!fi(e))
    throw new Error(`apply: invalid base value ${t}`);
  return we({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e.decode(r);
      } catch (a) {
        throw n.err("" + a);
      }
      return t.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = t.decodeStream(n);
      try {
        return e.encode(r);
      } catch (i) {
        throw n.err("" + i);
      }
    }
  });
}
const dd = (t, e = !1) => {
  if (!_e(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return we({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = nr(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function hd(t, e, n) {
  if (!Pe(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return we({
    encodeStream: (r, i) => {
      tn.resolve(r.stack, t) && e.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!tn.resolve(r.stack, t), i)
        return e.decodeStream(r);
    }
  });
}
function ia(t, e, n = !0) {
  if (!Pe(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return we({
    size: t.size,
    encodeStream: (r, i) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const i = t.decodeStream(r);
      if (n && typeof i != "object" && i !== e || _e(e) && !nr(e, i))
        throw r.err(`magic: invalid value: ${i} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Hu(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!He(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function Zt(t) {
  if (!Yr(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!Pe(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return we({
    size: Hu(Object.values(t)),
    encodeStream: (e, n) => {
      e.pushObj(n, (r) => {
        for (const i in t)
          r(i, () => t[i].encodeStream(e, n[i]));
      });
    },
    decodeStream: (e) => {
      const n = {};
      return e.pushObj(n, (r) => {
        for (const i in t)
          r(i, () => n[i] = t[i].decodeStream(e));
      }), n;
    },
    validate: (e) => {
      if (typeof e != "object" || e === null)
        throw new Error(`struct: invalid value ${e}`);
      return e;
    }
  });
}
function pd(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!Pe(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return we({
    size: Hu(t),
    encodeStream: (e, n) => {
      if (!Array.isArray(n))
        throw e.err(`tuple: invalid value ${n}`);
      e.pushObj(n, (r) => {
        for (let i = 0; i < t.length; i++)
          r(`${i}`, () => t[i].encodeStream(e, n[i]));
      });
    },
    decodeStream: (e) => {
      const n = [];
      return e.pushObj(n, (r) => {
        for (let i = 0; i < t.length; i++)
          r(`${i}`, () => n.push(t[i].decodeStream(e)));
      }), n;
    },
    validate: (e) => {
      if (!Array.isArray(e))
        throw new Error(`tuple: invalid value ${e}`);
      if (e.length !== t.length)
        throw new Error(`tuple: wrong length=${e.length}, expected ${t.length}`);
      return e;
    }
  });
}
function ye(t, e) {
  if (!Pe(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = $u(typeof t == "string" ? `../${t}` : t);
  return we({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, i) => {
      const a = r;
      a.pushObj(i, (c) => {
        _e(t) || n.encodeStream(r, i.length);
        for (let f = 0; f < i.length; f++)
          c(`${f}`, () => {
            const d = i[f], p = r.pos;
            if (e.encodeStream(r, d), _e(t)) {
              if (t.length > a.pos - p)
                return;
              const w = a.finish(!1).subarray(p, a.pos);
              if (nr(w.subarray(0, t.length), t))
                throw a.err(`array: inner element encoding same as separator. elm=${d} data=${w}`);
            }
          });
      }), _e(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (a) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (a(`${c}`, () => i.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if (_e(t))
          for (let c = 0; ; c++) {
            if (nr(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            a(`${c}`, () => i.push(e.decodeStream(r)));
          }
        else {
          let c;
          a("arrayLen", () => c = n.decodeStream(r));
          for (let f = 0; f < c; f++)
            a(`${f}`, () => i.push(e.decodeStream(r)));
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
const di = Ce.ProjectivePoint, Wo = Ce.CURVE.n, _t = ea.isBytes, pn = ea.concatBytes, Ft = ea.equalBytes, qu = (t) => Fl(he(t)), Ae = (...t) => he(he(pn(...t))), ju = Ne.utils.randomPrivateKey, sa = Ne.getPublicKey, yd = Ce.getPublicKey, bc = (t) => t.r < Wo / 2n;
function gd(t, e, n = !1) {
  let r = Ce.sign(t, e);
  if (n && !bc(r)) {
    const i = new Uint8Array(32);
    let a = 0;
    for (; !bc(r); )
      if (i.set(Tt.encode(a++)), r = Ce.sign(t, e, { extraEntropy: i }), a > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const vc = Ne.sign, aa = Ne.utils.taggedHash;
var ue;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(ue || (ue = {}));
function rr(t, e) {
  const n = t.length;
  if (e === ue.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return di.fromHex(t), t;
  } else if (e === ue.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Ne.utils.lift_x(Ne.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function Gu(t, e) {
  const n = Ne.utils, r = n.taggedHash("TapTweak", t, e), i = n.bytesToNumberBE(r);
  if (i >= Wo)
    throw new Error("tweak higher than curve order");
  return i;
}
function wd(t, e = Uint8Array.of()) {
  const n = Ne.utils, r = n.bytesToNumberBE(t), i = di.fromPrivateKey(r), a = i.hasEvenY() ? r : n.mod(-r, Wo), c = n.pointToBytes(i), f = Gu(c, e);
  return n.numberToBytesBE(n.mod(a + f, Wo), 32);
}
function Bs(t, e) {
  const n = Ne.utils, r = Gu(t, e), a = n.lift_x(n.bytesToNumberBE(t)).add(di.fromPrivateKey(r)), c = a.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(a), c];
}
const ca = he(di.BASE.toRawBytes(!1)), or = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, _o = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Yo(t, e) {
  if (!_t(t) || !_t(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
class zu extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: Wu, pointToBytes: Bo } = Ne.utils, En = Ce.ProjectivePoint, qe = 33, Cs = new Uint8Array(qe), yn = Ce.CURVE.n, Ec = vn(Nt(33), {
  decode: (t) => ua(t) ? Cs : t.toRawBytes(!0),
  encode: (t) => Kr(t, Cs) ? En.ZERO : En.fromHex(t)
}), xc = ge(Vu, (t) => (Be("n", t, 1n, yn), t)), Lo = Zt({ R1: Ec, R2: Ec }), Yu = Zt({ k1: xc, k2: xc, publicKey: Nt(qe) });
function Sc(t, ...e) {
}
function Ue(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => ce(n, ...e));
}
function kc(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Re = (t) => Wt(t, yn), Zo = (t, ...e) => Re(fe(Wu(t, ...e))), kr = (t, e) => t.hasEvenY() ? e : Re(-e);
function Dn(t) {
  return En.BASE.multiply(t);
}
function ua(t) {
  return t.equals(En.ZERO);
}
function Ns(t) {
  return Ue(t, qe), t.sort(Yo);
}
function Zu(t) {
  Ue(t, qe);
  for (let e = 1; e < t.length; e++)
    if (!Kr(t[e], t[0]))
      return t[e];
  return Cs;
}
function Xu(t) {
  return Ue(t, qe), Wu("KeyAgg list", ...t);
}
function Qu(t, e, n) {
  return ce(t, qe), ce(e, qe), Kr(t, e) ? 1n : Zo("KeyAgg coefficient", n, t);
}
function Us(t, e = [], n = []) {
  if (Ue(t, qe), Ue(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Zu(t), i = Xu(t);
  let a = En.ZERO;
  for (let d = 0; d < t.length; d++) {
    let p;
    try {
      p = En.fromHex(t[d]);
    } catch {
      throw new zu(d, "pubkey");
    }
    a = a.add(p.multiply(Qu(t[d], r, i)));
  }
  let c = 1n, f = 0n;
  for (let d = 0; d < e.length; d++) {
    const p = n[d] && !a.hasEvenY() ? Re(-1n) : 1n, w = fe(e[d]);
    if (Be("tweak", w, 0n, yn), a = a.multiply(p).add(Dn(w)), ua(a))
      throw new Error("The result of tweaking cannot be infinity");
    c = Re(p * c), f = Re(w + p * f);
  }
  return { aggPublicKey: a, gAcc: c, tweakAcc: f };
}
const Tc = (t, e, n, r, i, a) => Zo("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, i, Ve(a.length, 4), a, new Uint8Array([r]));
function md(t, e, n = new Uint8Array(0), r, i = new Uint8Array(0), a = js(32)) {
  ce(t, qe), Sc(e, 32), ce(n, 0, 32), Sc(), ce(i), ce(a, 32);
  const c = new Uint8Array([0]), f = Tc(a, t, n, 0, c, i), d = Tc(a, t, n, 1, c, i);
  return {
    secret: Yu.encode({ k1: f, k2: d, publicKey: t }),
    public: Lo.encode({ R1: Dn(f), R2: Dn(d) })
  };
}
class bd {
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
  constructor(e, n, r, i = [], a = []) {
    if (Ue(n, 33), Ue(i, 32), kc(a), ce(r), i.length !== a.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: f, tweakAcc: d } = Us(n, i, a), { R1: p, R2: w } = Lo.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = f, this.tweakAcc = d, this.b = Zo("MuSig/noncecoef", e, Bo(c), r);
    const g = p.add(w.multiply(this.b));
    this.R = ua(g) ? En.BASE : g, this.e = Zo("BIP0340/challenge", Bo(this.R), Bo(c), r), this.tweaks = i, this.isXonly = a, this.L = Xu(n), this.secondKey = Zu(n);
  }
  /**
   * Calculates the key aggregation coefficient for a given point.
   * @private
   * @param P The point to calculate the coefficient for.
   * @returns The key aggregation coefficient as a bigint.
   * @throws {Error} If the provided public key is not included in the list of pubkeys.
   */
  getSessionKeyAggCoeff(e) {
    const { publicKeys: n } = this, r = e.toRawBytes(!0);
    if (!n.some((a) => Kr(a, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Qu(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: i, gAcc: a, b: c, R: f, e: d } = this, p = fe(e);
    if (p >= yn)
      return !1;
    const { R1: w, R2: g } = Lo.decode(n), b = w.add(g.multiply(c)), _ = f.hasEvenY() ? b : b.negate(), D = En.fromHex(r), A = this.getSessionKeyAggCoeff(D), P = Re(kr(i, 1n) * a), H = Dn(p), W = _.add(D.multiply(Re(d * A * P)));
    return H.equals(W);
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
  sign(e, n, r = !1) {
    if (ce(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: a, b: c, R: f, e: d } = this, { k1: p, k2: w, publicKey: g } = Yu.decode(e);
    e.fill(0, 0, 64), Be("k1", p, 0n, yn), Be("k2", w, 0n, yn);
    const b = kr(f, p), _ = kr(f, w), D = fe(n);
    Be("d_", D, 1n, yn);
    const A = Dn(D), P = A.toRawBytes(!0);
    if (!Kr(P, g))
      throw new Error("Public key does not match nonceGen argument");
    const H = this.getSessionKeyAggCoeff(A), W = kr(i, 1n), j = Re(W * a * D), L = Re(b + c * _ + d * H * j), M = Ve(L, 32);
    if (!r) {
      const tt = Lo.encode({
        R1: Dn(p),
        R2: Dn(w)
      });
      if (!this.partialSigVerifyInternal(M, tt, P))
        throw new Error("Partial signature verification failed");
    }
    return M;
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
  partialSigVerify(e, n, r) {
    const { publicKeys: i, tweaks: a, isXonly: c } = this;
    if (ce(e, 32), Ue(n, 66), Ue(i, qe), Ue(a, 32), kc(c), $o(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (a.length !== c.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(e, n[r], i[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(e) {
    Ue(e, 32);
    const { Q: n, tweakAcc: r, R: i, e: a } = this;
    let c = 0n;
    for (let d = 0; d < e.length; d++) {
      const p = fe(e[d]);
      if (p >= yn)
        throw new zu(d, "psig");
      c = Re(c + p);
    }
    const f = kr(n, 1n);
    return c = Re(c + a * f * r), Mn(Bo(i), Ve(c, 32));
  }
}
function vd(t) {
  const e = md(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const fa = 2n ** 256n, Jn = fa - 0x1000003d1n, Ju = fa - 0x14551231950b75fc4402da1732fc9bebfn, Ed = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, xd = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, la = {
  n: Ju,
  a: 0n,
  b: 7n
}, Cr = 32, Ac = (t) => st(st(t * t) * t + la.b), se = (t = "") => {
  throw new Error(t);
}, hi = (t) => typeof t == "bigint", tf = (t) => typeof t == "string", us = (t) => hi(t) && 0n < t && t < Jn, ef = (t) => hi(t) && 0n < t && t < Ju, Sd = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", Rs = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Sd(t) || typeof e == "number" && e > 0 && t.length !== e ? se("Uint8Array expected") : t
), nf = (t) => new Uint8Array(t), rf = (t, e) => Rs(tf(t) ? da(t) : nf(Rs(t)), e), st = (t, e = Jn) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, Ic = (t) => t instanceof Ie ? t : se("Point expected");
class Ie {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? _r : new Ie(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = rf(e);
    let n;
    const r = e[0], i = e.subarray(1), a = Bc(i, 0, Cr), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      us(a) || se("Point hex invalid: x not FE");
      let f = Ad(Ac(a));
      const d = (f & 1n) === 1n;
      (r & 1) === 1 !== d && (f = st(-f)), n = new Ie(a, f, 1n);
    }
    return c === 65 && r === 4 && (n = new Ie(a, Bc(i, Cr, 2 * Cr), 1n)), n ? n.ok() : se("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return Nr.mul(Id(e));
  }
  get x() {
    return this.aff().x;
  }
  // .x, .y will call expensive toAffine:
  get y() {
    return this.aff().y;
  }
  // should be used with care.
  /** Equality check: compare points P&Q. */
  equals(e) {
    const { px: n, py: r, pz: i } = this, { px: a, py: c, pz: f } = Ic(e), d = st(n * f), p = st(a * i), w = st(r * f), g = st(c * i);
    return d === p && w === g;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Ie(this.px, st(-this.py), this.pz);
  }
  /** Point doubling: P+P, complete formula. */
  double() {
    return this.add(this);
  }
  /**
   * Point addition: P+Q, complete, exception-free formula
   * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
   * Cost: 12M + 0S + 3*a + 3*b3 + 23add.
   */
  add(e) {
    const { px: n, py: r, pz: i } = this, { px: a, py: c, pz: f } = Ic(e), { a: d, b: p } = la;
    let w = 0n, g = 0n, b = 0n;
    const _ = st(p * 3n);
    let D = st(n * a), A = st(r * c), P = st(i * f), H = st(n + r), W = st(a + c);
    H = st(H * W), W = st(D + A), H = st(H - W), W = st(n + i);
    let j = st(a + f);
    return W = st(W * j), j = st(D + P), W = st(W - j), j = st(r + i), w = st(c + f), j = st(j * w), w = st(A + P), j = st(j - w), b = st(d * W), w = st(_ * P), b = st(w + b), w = st(A - b), b = st(A + b), g = st(w * b), A = st(D + D), A = st(A + D), P = st(d * P), W = st(_ * W), A = st(A + P), P = st(D - P), P = st(d * P), W = st(W + P), D = st(A * W), g = st(g + D), D = st(j * W), w = st(H * w), w = st(w - D), D = st(H * A), b = st(j * b), b = st(b + D), new Ie(w, g, b);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return _r;
    if (ef(e) || se("scalar invalid"), this.equals(Nr))
      return Bd(e).p;
    let r = _r, i = Nr;
    for (let a = this; e > 0n; a = a.double(), e >>= 1n)
      e & 1n ? r = r.add(a) : n && (i = i.add(a));
    return r;
  }
  mulAddQUns(e, n, r) {
    return this.mul(n, !1).add(e.mul(r, !1)).ok();
  }
  // to private keys. Doesn't use Shamir trick
  /** Convert point to 2d xy affine point. (x, y, z) ∋ (x=x/z, y=y/z) */
  toAffine() {
    const { px: e, py: n, pz: r } = this;
    if (this.equals(_r))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const i = Td(r, Jn);
    return st(r * i) !== 1n && se("inverse invalid"), { x: st(e * i), y: st(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!us(e) || !us(n)) && se("Point invalid: x or y"), st(n * n) === Ac(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : se("Point invalid: not on curve");
  }
  multiply(e) {
    return this.mul(e);
  }
  // Aliases to compress code
  aff() {
    return this.toAffine();
  }
  ok() {
    return this.assertValidity();
  }
  toHex(e = !0) {
    const { x: n, y: r } = this.aff();
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Cc(n) + (e ? "" : Cc(r));
  }
  toRawBytes(e = !0) {
    return da(this.toHex(e));
  }
}
Ie.BASE = new Ie(Ed, xd, 1n);
Ie.ZERO = new Ie(0n, 1n, 0n);
const { BASE: Nr, ZERO: _r } = Ie, of = (t, e) => t.toString(16).padStart(e, "0"), sf = (t) => Array.from(Rs(t)).map((e) => of(e, 2)).join(""), Ye = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, _c = (t) => {
  if (t >= Ye._0 && t <= Ye._9)
    return t - Ye._0;
  if (t >= Ye.A && t <= Ye.F)
    return t - (Ye.A - 10);
  if (t >= Ye.a && t <= Ye.f)
    return t - (Ye.a - 10);
}, da = (t) => {
  const e = "hex invalid";
  if (!tf(t))
    return se(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return se(e);
  const i = nf(r);
  for (let a = 0, c = 0; a < r; a++, c += 2) {
    const f = _c(t.charCodeAt(c)), d = _c(t.charCodeAt(c + 1));
    if (f === void 0 || d === void 0)
      return se(e);
    i[a] = f * 16 + d;
  }
  return i;
}, af = (t) => BigInt("0x" + (sf(t) || "0")), Bc = (t, e, n) => af(t.slice(e, n)), kd = (t) => hi(t) && t >= 0n && t < fa ? da(of(t, 2 * Cr)) : se("bigint expected"), Cc = (t) => sf(kd(t)), Td = (t, e) => {
  (t === 0n || e <= 0n) && se("no inverse n=" + t + " mod=" + e);
  let n = st(t, e), r = e, i = 0n, a = 1n;
  for (; n !== 0n; ) {
    const c = r / n, f = r % n, d = i - a * c;
    r = n, n = f, i = a, a = d;
  }
  return r === 1n ? st(i, e) : se("no inverse");
}, Ad = (t) => {
  let e = 1n;
  for (let n = t, r = (Jn + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % Jn), n = n * n % Jn;
  return st(e * e) === t ? e : se("sqrt invalid");
}, Id = (t) => (hi(t) || (t = af(rf(t, Cr))), ef(t) ? t : se("private key invalid 3")), Ln = 8, _d = () => {
  const t = [], e = 256 / Ln + 1;
  let n = Nr, r = n;
  for (let i = 0; i < e; i++) {
    r = n, t.push(r);
    for (let a = 1; a < 2 ** (Ln - 1); a++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let Nc;
const Bd = (t) => {
  const e = Nc || (Nc = _d()), n = (w, g) => {
    let b = g.negate();
    return w ? b : g;
  };
  let r = _r, i = Nr;
  const a = 1 + 256 / Ln, c = 2 ** (Ln - 1), f = BigInt(2 ** Ln - 1), d = 2 ** Ln, p = BigInt(Ln);
  for (let w = 0; w < a; w++) {
    const g = w * c;
    let b = Number(t & f);
    t >>= p, b > c && (b -= d, t += 1n);
    const _ = g, D = g + Math.abs(b) - 1, A = w % 2 !== 0, P = b < 0;
    b === 0 ? i = i.add(n(A, e[_])) : r = r.add(n(P, e[D]));
  }
  return { p: r, f: i };
};
function ha(t, e, n = {}) {
  t = Ns(t);
  const { aggPublicKey: r } = Us(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const i = Ne.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: a } = Us(t, [i], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: a.toRawBytes(!0)
  };
}
class Co extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class pa {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new Co("Invalid s length");
    if (n.length !== 33)
      throw new Co("Invalid R length");
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
  static decode(e) {
    if (e.length !== 32)
      throw new Co("Invalid partial signature length");
    if (fe(e) >= la.n)
      throw new Co("s value overflows curve order");
    const r = new Uint8Array(33);
    return new pa(e, r);
  }
}
function Cd(t, e, n, r, i, a) {
  let c;
  if ((a == null ? void 0 : a.taprootTweak) !== void 0) {
    const { preTweakedKey: p } = ha(Ns(r));
    c = Ne.utils.taggedHash("TapTweak", p.subarray(1), a.taprootTweak);
  }
  const d = new bd(n, Ns(r), i, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return pa.decode(d);
}
var Nd = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ud(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var fs, Uc;
function Rd() {
  if (Uc) return fs;
  Uc = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, i = 1 << 22, a = r, c = 1 << n, f = r << n;
  function d(w) {
    return w & e ? {} : w & i ? {
      seconds: (w & r) << n
    } : {
      blocks: w & r
    };
  }
  function p({ blocks: w, seconds: g }) {
    if (w !== void 0 && g !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (w === void 0 && g === void 0) return t;
    if (g !== void 0) {
      if (!Number.isFinite(g)) throw new TypeError("Expected Number seconds");
      if (g > f) throw new TypeError("Expected Number seconds <= " + f);
      if (g % c !== 0) throw new TypeError("Expected Number seconds as a multiple of " + c);
      return i | g >> n;
    }
    if (!Number.isFinite(w)) throw new TypeError("Expected Number blocks");
    if (w > r) throw new TypeError("Expected Number blocks <= " + a);
    return w;
  }
  return fs = { decode: d, encode: p }, fs;
}
var Rc = Rd(), Dt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(Dt || (Dt = {}));
function ir(t = 6, e = !1) {
  return we({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, a = BigInt(r), c = [];
      for (let f = i ? -a : a; f; f >>= 8n)
        c.push(Number(f & 0xffn));
      c[c.length - 1] >= 128 ? c.push(i ? 128 : 0) : i && (c[c.length - 1] |= 128), n.bytes(new Uint8Array(c));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > t)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${t}`);
      if (r === 0)
        return 0n;
      if (e) {
        const c = n.bytes(r, !0);
        if ((c[c.length - 1] & 127) === 0 && (r <= 1 || (c[c.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, a = 0n;
      for (let c = 0; c < r; ++c)
        i = n.byte(), a |= BigInt(i) << 8n * BigInt(c);
      return i >= 128 && (a &= 2n ** BigInt(r * 8) - 1n >> 1n, a = -a), a;
    }
  });
}
function Od(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (_t(t))
    try {
      const r = ir(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const gt = we({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (Dt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(Dt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(Dt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = ir().encode(BigInt(n))), !_t(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Dt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(Dt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(Dt.PUSHDATA2), t.bytes(mc.encode(r))) : (t.byte(Dt.PUSHDATA4), t.bytes(Tt.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (Dt.OP_0 < n && n <= Dt.PUSHDATA4) {
        let r;
        if (n < Dt.PUSHDATA1)
          r = n;
        else if (n === Dt.PUSHDATA1)
          r = wn.decodeStream(t);
        else if (n === Dt.PUSHDATA2)
          r = mc.decodeStream(t);
        else if (n === Dt.PUSHDATA4)
          r = Tt.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (Dt.OP_1 <= n && n <= Dt.OP_16)
        e.push(n - (Dt.OP_1 - 1));
      else {
        const r = Dt[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), Oc = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, pi = we({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, i, a] of Object.values(Oc))
      if (!(i > e || e > a)) {
        t.byte(n);
        for (let c = 0; c < r; c++)
          t.byte(Number(e >> 8n * BigInt(c) & 0xffn));
        return;
      }
    throw t.err(`VarInt too big: ${e}`);
  },
  decodeStream: (t) => {
    const e = t.byte();
    if (e <= 252)
      return BigInt(e);
    const [n, r, i] = Oc[e];
    let a = 0n;
    for (let c = 0; c < r; c++)
      a |= BigInt(t.byte()) << 8n * BigInt(c);
    if (a < i)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return a;
  }
}), Le = vn(pi, li.numberBigint), Oe = Nt(pi), ya = ye(Le, Oe), Xo = (t) => ye(pi, t), cf = Zt({
  txid: Nt(32, !0),
  // hash(prev_tx),
  index: Tt,
  // output number of previous tx
  finalScriptSig: Oe,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Tt
  // ?
}), $n = Zt({ amount: Po, script: Oe }), Pd = Zt({
  version: Zn,
  segwitFlag: dd(new Uint8Array([0, 1])),
  inputs: Xo(cf),
  outputs: Xo($n),
  witnesses: hd("segwitFlag", ye("inputs/length", ya)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Tt
});
function Ld(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const mn = ge(Pd, Ld), Br = Zt({
  version: Zn,
  inputs: Xo(cf),
  outputs: Xo($n),
  lockTime: Tt
}), Os = ge(Nt(null), (t) => rr(t, ue.ecdsa)), Qo = ge(Nt(32), (t) => rr(t, ue.schnorr)), Pc = ge(Nt(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), yi = Zt({
  fingerprint: ud,
  path: ye(null, Tt)
}), uf = Zt({
  hashes: ye(Le, Nt(32)),
  der: yi
}), Kd = Nt(78), Dd = Zt({ pubKey: Qo, leafHash: Nt(32) }), $d = Zt({
  version: wn,
  // With parity :(
  internalKey: Nt(32),
  merklePath: ye(null, Nt(32))
}), gn = ge($d, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), Md = ye(null, Zt({
  depth: wn,
  version: wn,
  script: Oe
})), Mt = Nt(null), Lc = Nt(20), Tr = Nt(32), ga = {
  unsignedTx: [0, !1, Br, [0], [0], !1],
  xpub: [1, Kd, yi, [], [0, 2], !1],
  txVersion: [2, !1, Tt, [2], [2], !1],
  fallbackLocktime: [3, !1, Tt, [], [2], !1],
  inputCount: [4, !1, Le, [2], [2], !1],
  outputCount: [5, !1, Le, [2], [2], !1],
  txModifiable: [6, !1, wn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Tt, [], [0, 2], !1],
  proprietary: [252, Mt, Mt, [], [0, 2], !1]
}, gi = {
  nonWitnessUtxo: [0, !1, mn, [], [0, 2], !1],
  witnessUtxo: [1, !1, $n, [], [0, 2], !1],
  partialSig: [2, Os, Mt, [], [0, 2], !1],
  sighashType: [3, !1, Tt, [], [0, 2], !1],
  redeemScript: [4, !1, Mt, [], [0, 2], !1],
  witnessScript: [5, !1, Mt, [], [0, 2], !1],
  bip32Derivation: [6, Os, yi, [], [0, 2], !1],
  finalScriptSig: [7, !1, Mt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, ya, [], [0, 2], !1],
  porCommitment: [9, !1, Mt, [], [0, 2], !1],
  ripemd160: [10, Lc, Mt, [], [0, 2], !1],
  sha256: [11, Tr, Mt, [], [0, 2], !1],
  hash160: [12, Lc, Mt, [], [0, 2], !1],
  hash256: [13, Tr, Mt, [], [0, 2], !1],
  txid: [14, !1, Tr, [2], [2], !0],
  index: [15, !1, Tt, [2], [2], !0],
  sequence: [16, !1, Tt, [], [2], !0],
  requiredTimeLocktime: [17, !1, Tt, [], [2], !1],
  requiredHeightLocktime: [18, !1, Tt, [], [2], !1],
  tapKeySig: [19, !1, Pc, [], [0, 2], !1],
  tapScriptSig: [20, Dd, Pc, [], [0, 2], !1],
  tapLeafScript: [21, gn, Mt, [], [0, 2], !1],
  tapBip32Derivation: [22, Tr, uf, [], [0, 2], !1],
  tapInternalKey: [23, !1, Qo, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Tr, [], [0, 2], !1],
  proprietary: [252, Mt, Mt, [], [0, 2], !1]
}, Fd = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Vd = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Jo = {
  redeemScript: [0, !1, Mt, [], [0, 2], !1],
  witnessScript: [1, !1, Mt, [], [0, 2], !1],
  bip32Derivation: [2, Os, yi, [], [0, 2], !1],
  amount: [3, !1, ad, [2], [2], !0],
  script: [4, !1, Mt, [2], [2], !0],
  tapInternalKey: [5, !1, Qo, [], [0, 2], !1],
  tapTree: [6, !1, Md, [], [0, 2], !1],
  tapBip32Derivation: [7, Qo, uf, [], [0, 2], !1],
  proprietary: [252, Mt, Mt, [], [0, 2], !1]
}, Hd = [], Kc = ye(Ku, Zt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: fd(Le, Zt({ type: Le, key: Nt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Nt(Le)
}));
function Ps(t) {
  const [e, n, r, i, a, c] = t;
  return { type: e, kc: n, vc: r, reqInc: i, allowInc: a, silentIgnore: c };
}
Zt({ type: Le, key: Nt(null) });
function wa(t) {
  const e = {};
  for (const n in t) {
    const [r, i, a] = t[n];
    e[r] = [n, i, a];
  }
  return we({
    encodeStream: (n, r) => {
      let i = [];
      for (const a in t) {
        const c = r[a];
        if (c === void 0)
          continue;
        const [f, d, p] = t[a];
        if (!d)
          i.push({ key: { type: f, key: Ut }, value: p.encode(c) });
        else {
          const w = c.map(([g, b]) => [
            d.encode(g),
            p.encode(b)
          ]);
          w.sort((g, b) => Yo(g[0], b[0]));
          for (const [g, b] of w)
            i.push({ key: { key: g, type: f }, value: b });
        }
      }
      if (r.unknown) {
        r.unknown.sort((a, c) => Yo(a[0].key, c[0].key));
        for (const [a, c] of r.unknown)
          i.push({ key: a, value: c });
      }
      Kc.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Kc.decodeStream(n), i = {}, a = {};
      for (const c of r) {
        let f = "unknown", d = c.key.key, p = c.value;
        if (e[c.key.type]) {
          const [w, g, b] = e[c.key.type];
          if (f = w, !g && d.length)
            throw new Error(`PSBT: Non-empty key for ${f} (key=${et.encode(d)} value=${et.encode(p)}`);
          if (d = g ? g.decode(d) : void 0, p = b.decode(p), !g) {
            if (i[f])
              throw new Error(`PSBT: Same keys: ${f} (key=${d} value=${p})`);
            i[f] = p, a[f] = !0;
            continue;
          }
        } else
          d = { type: c.key.type, key: c.key.key };
        if (a[f])
          throw new Error(`PSBT: Key type with empty key and no key=${f} val=${p}`);
        i[f] || (i[f] = []), i[f].push([d, p]);
      }
      return i;
    }
  });
}
const ma = ge(wa(gi), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      rr(e, ue.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      rr(e, ue.ecdsa);
  if (t.requiredTimeLocktime !== void 0 && t.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${t.requiredTimeLocktime}`);
  if (t.requiredHeightLocktime !== void 0 && (t.requiredHeightLocktime <= 0 || t.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${t.requiredHeightLocktime}`);
  if (t.tapLeafScript)
    for (const [e, n] of t.tapLeafScript) {
      if ((e.version & 254) !== n[n.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (n[n.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return t;
}), ba = ge(wa(Jo), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      rr(e, ue.ecdsa);
  return t;
}), ff = ge(wa(ga), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), qd = Zt({
  magic: ia(oa(new Uint8Array([255])), "psbt"),
  global: ff,
  inputs: ye("global/unsignedTx/inputs/length", ma),
  outputs: ye(null, ba)
}), jd = Zt({
  magic: ia(oa(new Uint8Array([255])), "psbt"),
  global: ff,
  inputs: ye("global/inputCount", ma),
  outputs: ye("global/outputCount", ba)
});
Zt({
  magic: ia(oa(new Uint8Array([255])), "psbt"),
  items: ye(null, vn(ye(Ku, pd([ld(Le), Nt(pi)])), li.dict()))
});
function ls(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: i } = Ps(e[r]);
    if (!i.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: i } = Ps(e[r]);
    if (i.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Dc(t, e, n) {
  const r = {};
  for (const i in n) {
    const a = i;
    if (a !== "unknown") {
      if (!e[a])
        continue;
      const { allowInc: c, silentIgnore: f } = Ps(e[a]);
      if (!c.includes(t)) {
        if (f)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${a} but versions allows inclusion=${c}`);
      }
    }
    r[a] = n[a];
  }
  return r;
}
function lf(t) {
  const e = t && t.global && t.global.version || 0;
  ls(e, ga, t.global);
  for (const c of t.inputs)
    ls(e, gi, c);
  for (const c of t.outputs)
    ls(e, Jo, c);
  const n = e ? t.global.inputCount : t.global.unsignedTx.inputs.length;
  if (t.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = t.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = e ? t.global.outputCount : t.global.unsignedTx.outputs.length;
  if (t.outputs.length < i)
    throw new Error("Not outputs inputs");
  const a = t.outputs.slice(i);
  if (a.length > 1 || a.length && Object.keys(a[0]).length)
    throw new Error(`Unexpected outputs left in tx=${a}`);
  return t;
}
function Ls(t, e, n, r, i) {
  const a = { ...n, ...e };
  for (const c in t) {
    const f = c, [d, p, w] = t[f], g = r && !r.includes(c);
    if (e[c] === void 0 && c in e) {
      if (g)
        throw new Error(`Cannot remove signed field=${c}`);
      delete a[c];
    } else if (p) {
      const b = n && n[c] ? n[c] : [];
      let _ = e[f];
      if (_) {
        if (!Array.isArray(_))
          throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
        _ = _.map((P) => {
          if (P.length !== 2)
            throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
          return [
            typeof P[0] == "string" ? p.decode(et.decode(P[0])) : P[0],
            typeof P[1] == "string" ? w.decode(et.decode(P[1])) : P[1]
          ];
        });
        const D = {}, A = (P, H, W) => {
          if (D[P] === void 0) {
            D[P] = [H, W];
            return;
          }
          const j = et.encode(w.encode(D[P][1])), L = et.encode(w.encode(W));
          if (j !== L)
            throw new Error(`keyMap(${f}): same key=${P} oldVal=${j} newVal=${L}`);
        };
        for (const [P, H] of b) {
          const W = et.encode(p.encode(P));
          A(W, P, H);
        }
        for (const [P, H] of _) {
          const W = et.encode(p.encode(P));
          if (H === void 0) {
            if (g)
              throw new Error(`Cannot remove signed field=${f}/${P}`);
            delete D[W];
          } else
            A(W, P, H);
        }
        a[f] = Object.values(D);
      }
    } else if (typeof a[c] == "string")
      a[c] = w.decode(et.decode(a[c]));
    else if (g && c in e && n && n[c] !== void 0 && !Ft(w.encode(e[c]), w.encode(n[c])))
      throw new Error(`Cannot change signed field=${c}`);
  }
  for (const c in a)
    if (!t[c]) {
      if (i && c === "unknown")
        continue;
      delete a[c];
    }
  return a;
}
const $c = ge(qd, lf), Mc = ge(jd, lf), Gd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !_t(t[1]) || et.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: gt.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, et.decode("4e73")];
  }
};
function Xn(t, e) {
  try {
    return rr(t, e), !0;
  } catch {
    return !1;
  }
}
const zd = {
  encode(t) {
    if (!(t.length !== 2 || !_t(t[0]) || !Xn(t[0], ue.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Wd = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !_t(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Yd = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !_t(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, Zd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !_t(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Xd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !_t(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Qd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKMULTISIG")
      return;
    const n = t[0], r = t[e - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = t.slice(1, -2);
    if (r === i.length) {
      for (const a of i)
        if (!_t(a))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Jd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !_t(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, th = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < e; r++) {
      const i = t[r];
      if (r & 1) {
        if (i !== "CHECKSIGVERIFY" || r === e - 1)
          return;
        continue;
      }
      if (!_t(i))
        return;
      n.push(i);
    }
    return { type: "tr_ns", pubkeys: n };
  },
  decode: (t) => {
    if (t.type !== "tr_ns")
      return;
    const e = [];
    for (let n = 0; n < t.pubkeys.length - 1; n++)
      e.push(t.pubkeys[n], "CHECKSIGVERIFY");
    return e.push(t.pubkeys[t.pubkeys.length - 1], "CHECKSIG"), e;
  }
}, eh = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Od(t[e - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < e - 1; i++) {
        const a = t[i];
        if (i & 1) {
          if (a !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!_t(a))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(a);
      }
      return { type: "tr_ms", pubkeys: n, m: r };
    }
  },
  decode: (t) => {
    if (t.type !== "tr_ms")
      return;
    const e = [t.pubkeys[0], "CHECKSIG"];
    for (let n = 1; n < t.pubkeys.length; n++)
      e.push(t.pubkeys[n], "CHECKSIGADD");
    return e.push(t.m, "NUMEQUAL"), e;
  }
}, nh = {
  encode(t) {
    return { type: "unknown", script: gt.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? gt.decode(t.script) : void 0
}, rh = [
  Gd,
  zd,
  Wd,
  Yd,
  Zd,
  Xd,
  Qd,
  Jd,
  th,
  eh,
  nh
], oh = vn(gt, li.match(rh)), Yt = ge(oh, (t) => {
  if (t.type === "pk" && !Xn(t.pubkey, ue.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!_t(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!_t(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!_t(t.pubkey) || !Xn(t.pubkey, ue.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!Xn(n, ue.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!Xn(e, ue.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function Fc(t, e) {
  if (!Ft(t.hash, he(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = Yt.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function df(t, e, n) {
  if (t) {
    const r = Yt.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!Ft(r.hash, qu(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = Yt.decode(e);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Fc(r, n);
  }
  if (e) {
    const r = Yt.decode(e);
    r.type === "wsh" && n && Fc(r, n);
  }
}
function ih(t) {
  const e = {};
  for (const n of t) {
    const r = et.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(et.encode)}`);
    e[r] = !0;
  }
}
function sh(t, e, n = !1, r) {
  const i = Yt.decode(t);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const a = i;
  if (!n && a.pubkeys)
    for (const c of a.pubkeys) {
      if (Ft(c, ca))
        throw new Error("Unspendable taproot key in leaf script");
      if (Ft(c, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function hf(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((c, f) => (f.weight || 1) - (c.weight || 1));
    const r = e.pop(), i = e.pop(), a = ((i == null ? void 0 : i.weight) || 1) + ((r == null ? void 0 : r.weight) || 1);
    e.push({
      weight: a,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [(i == null ? void 0 : i.childs) || i, (r == null ? void 0 : r.childs) || r]
    });
  }
  const n = e[0];
  return (n == null ? void 0 : n.childs) || n;
}
function Ks(t, e = []) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return { ...t, path: e };
  if (t.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${t}`);
  return {
    ...t,
    path: e,
    // Left element has right hash in path and otherwise
    left: Ks(t.left, [t.right.hash, ...e]),
    right: Ks(t.right, [t.left.hash, ...e])
  };
}
function Ds(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...Ds(t.left), ...Ds(t.right)];
}
function $s(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: d, script: p } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !Ft(t.tapMerkleRoot, Ut))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const w = typeof p == "string" ? et.decode(p) : p;
    if (!_t(w))
      throw new Error(`checkScript: wrong script type=${w}`);
    return sh(w, e, n), {
      type: "leaf",
      version: d,
      script: w,
      hash: Ur(w, d)
    };
  }
  if (t.length !== 2 && (t = hf(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = $s(t[0], e, n), a = $s(t[1], e, n);
  let [c, f] = [i.hash, a.hash];
  return Yo(f, c) === -1 && ([c, f] = [f, c]), { type: "branch", left: i, right: a, hash: aa("TapBranch", c, f) };
}
const ti = 192, Ur = (t, e = ti) => aa("TapLeaf", new Uint8Array([e]), Oe.encode(t));
function pf(t, e, n = or, r = !1, i) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const a = typeof t == "string" ? et.decode(t) : t || ca;
  if (!Xn(a, ue.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (e) {
    let c = Ks($s(e, a, r));
    const f = c.hash, [d, p] = Bs(a, f), w = Ds(c).map((g) => ({
      ...g,
      controlBlock: gn.encode({
        version: (g.version || ti) + p,
        internalKey: a,
        merklePath: g.path
      })
    }));
    return {
      type: "tr",
      script: Yt.encode({ type: "tr", pubkey: d }),
      address: sr(n).encode({ type: "tr", pubkey: d }),
      // For tests
      tweakedPubkey: d,
      // PSBT stuff
      tapInternalKey: a,
      leaves: w,
      tapLeafScript: w.map((g) => [
        gn.decode(g.controlBlock),
        pn(g.script, new Uint8Array([g.version || ti]))
      ]),
      tapMerkleRoot: f
    };
  } else {
    const c = Bs(a, Ut)[0];
    return {
      type: "tr",
      script: Yt.encode({ type: "tr", pubkey: c }),
      address: sr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: a
    };
  }
}
function ah(t, e, n = !1) {
  return n || ih(e), {
    type: "tr_ms",
    script: Yt.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const yf = Yl(he);
function gf(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function ds(t, e, n = or) {
  gf(t, e);
  const r = t === 0 ? Is : Yn;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Vc(t, e) {
  return yf.encode(pn(Uint8Array.from(e), t));
}
function sr(t = or) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return ds(0, e.hash, t);
      if (n === "wsh")
        return ds(0, e.hash, t);
      if (n === "tr")
        return ds(1, e.pubkey, t);
      if (n === "pkh")
        return Vc(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Vc(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Is.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Yn.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...a] = r.words, c = Is.fromWords(a);
        if (gf(i, c), i === 0 && c.length === 32)
          return { type: "wsh", hash: c };
        if (i === 0 && c.length === 20)
          return { type: "wpkh", hash: c };
        if (i === 1 && c.length === 32)
          return { type: "tr", pubkey: c };
        throw new Error("Unknown witness program");
      }
      const n = yf.decode(e);
      if (n.length !== 21)
        throw new Error("Invalid base58 address");
      if (n[0] === t.pubKeyHash)
        return { type: "pkh", hash: n.slice(1) };
      if (n[0] === t.scriptHash)
        return {
          type: "sh",
          hash: n.slice(1)
        };
      throw new Error(`Invalid address prefix=${n[0]}`);
    }
  };
}
const No = new Uint8Array(32), ch = {
  amount: 0xffffffffffffffffn,
  script: Ut
}, uh = (t) => Math.ceil(t / 4), fh = 8, lh = 2, Rn = 0, va = 4294967295;
li.decimal(fh);
const Rr = (t, e) => t === void 0 ? e : t;
function ei(t) {
  if (Array.isArray(t))
    return t.map((e) => ei(e));
  if (_t(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, ei(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var It;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(It || (It = {}));
var Fr;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(Fr || (Fr = {}));
function dh(t, e, n, r = Ut) {
  return Ft(n, e) && (t = wd(t, r), e = sa(t)), { privKey: t, pubKey: e };
}
function On(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function Ar(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: Rr(t.sequence, va),
    finalScriptSig: Rr(t.finalScriptSig, Ut)
  };
}
function hs(t) {
  for (const e in t) {
    const n = e;
    Fd.includes(n) || delete t[n];
  }
}
const ps = Zt({ txid: Nt(32, !0), index: Tt });
function hh(t) {
  if (typeof t != "number" || typeof Fr[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Hc(t) {
  const e = t & 31;
  return {
    isAny: !!(t & It.ANYONECANPAY),
    isNone: e === It.NONE,
    isSingle: e === It.SINGLE
  };
}
function ph(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: Rr(t.version, lh),
    lockTime: Rr(t.lockTime, 0),
    PSBTVersion: Rr(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Tt.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${e.PSBTVersion}`);
  for (const n of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const r = e[n];
    if (r !== void 0 && typeof r != "boolean")
      throw new Error(`Transation options wrong type: ${n}=${r} (${typeof r})`);
  }
  if (e.allowUnknownVersion ? typeof e.version == "number" : ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (e.customScripts !== void 0) {
    const n = e.customScripts;
    if (!Array.isArray(n))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${n} (${typeof n})`);
    for (const r of n) {
      if (typeof r.encode != "function" || typeof r.decode != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
      if (r.finalizeTaproot !== void 0 && typeof r.finalizeTaproot != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
    }
  }
  return Object.freeze(e);
}
function qc(t) {
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!Ft(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (t.txid) {
      if (t.nonWitnessUtxo.outputs.length - 1 < t.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Lt.fromRaw(mn.encode(t.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), a = et.encode(t.txid);
      if (i.isFinal && i.id !== a)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${a} got=${i.id}`);
    }
  }
  return t;
}
function Ko(t) {
  if (t.nonWitnessUtxo) {
    if (t.index === void 0)
      throw new Error("Unknown input index");
    return t.nonWitnessUtxo.outputs[t.index];
  } else {
    if (t.witnessUtxo)
      return t.witnessUtxo;
    throw new Error("Cannot find previous output info");
  }
}
function jc(t, e, n, r = !1, i = !1) {
  let { nonWitnessUtxo: a, txid: c } = t;
  typeof a == "string" && (a = et.decode(a)), _t(a) && (a = mn.decode(a)), !("nonWitnessUtxo" in t) && a === void 0 && (a = e == null ? void 0 : e.nonWitnessUtxo), typeof c == "string" && (c = et.decode(c)), c === void 0 && (c = e == null ? void 0 : e.txid);
  let f = { ...e, ...t, nonWitnessUtxo: a, txid: c };
  !("nonWitnessUtxo" in t) && f.nonWitnessUtxo === void 0 && delete f.nonWitnessUtxo, f.sequence === void 0 && (f.sequence = va), f.tapMerkleRoot === null && delete f.tapMerkleRoot, f = Ls(gi, f, e, n, i), ma.encode(f);
  let d;
  return f.nonWitnessUtxo && f.index !== void 0 ? d = f.nonWitnessUtxo.outputs[f.index] : f.witnessUtxo && (d = f.witnessUtxo), d && !r && df(d && d.script, f.redeemScript, f.witnessScript), f;
}
function Gc(t, e = !1) {
  let n = "legacy", r = It.ALL;
  const i = Ko(t), a = Yt.decode(i.script);
  let c = a.type, f = a;
  const d = [a];
  if (a.type === "tr")
    return r = It.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: a,
      lastScript: i.script,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
  {
    if ((a.type === "wpkh" || a.type === "wsh") && (n = "segwit"), a.type === "sh") {
      if (!t.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let b = Yt.decode(t.redeemScript);
      (b.type === "wpkh" || b.type === "wsh") && (n = "segwit"), d.push(b), f = b, c += `-${b.type}`;
    }
    if (f.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let b = Yt.decode(t.witnessScript);
      b.type === "wsh" && (n = "segwit"), d.push(b), f = b, c += `-${b.type}`;
    }
    const p = d[d.length - 1];
    if (p.type === "sh" || p.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const w = Yt.encode(p), g = {
      type: c,
      txType: n,
      last: p,
      lastScript: w,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return g;
  }
}
class Lt {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = ph(e);
    n.lockTime !== Rn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = mn.decode(e), i = new Lt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const a of r.outputs)
      i.addOutput(a);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let a = 0; a < r.witnesses.length; a++)
        i.inputs[a].finalScriptWitness = r.witnesses[a];
    return i;
  }
  // PSBT
  static fromPSBT(e, n = {}) {
    let r;
    try {
      r = $c.decode(e);
    } catch (g) {
      try {
        r = Mc.decode(e);
      } catch {
        throw g;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const a = r.global.unsignedTx, c = i === 0 ? a == null ? void 0 : a.version : r.global.txVersion, f = i === 0 ? a == null ? void 0 : a.lockTime : r.global.fallbackLocktime, d = new Lt({ ...n, version: c, lockTime: f, PSBTVersion: i }), p = i === 0 ? a == null ? void 0 : a.inputs.length : r.global.inputCount;
    d.inputs = r.inputs.slice(0, p).map((g, b) => {
      var _;
      return qc({
        finalScriptSig: Ut,
        ...(_ = r.global.unsignedTx) == null ? void 0 : _.inputs[b],
        ...g
      });
    });
    const w = i === 0 ? a == null ? void 0 : a.outputs.length : r.global.outputCount;
    return d.outputs = r.outputs.slice(0, w).map((g, b) => {
      var _;
      return {
        ...g,
        ...(_ = r.global.unsignedTx) == null ? void 0 : _.outputs[b]
      };
    }), d.global = { ...r.global, txVersion: c }, f !== Rn && (d.global.fallbackLocktime = f), d;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((a) => qc(Dc(e, gi, a)));
    for (const a of n)
      a.partialSig && !a.partialSig.length && delete a.partialSig, a.finalScriptSig && !a.finalScriptSig.length && delete a.finalScriptSig, a.finalScriptWitness && !a.finalScriptWitness.length && delete a.finalScriptWitness;
    const r = this.outputs.map((a) => Dc(e, Jo, a)), i = { ...this.global };
    return e === 0 ? (i.unsignedTx = Br.decode(Br.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Ar).map((a) => ({
        ...a,
        finalScriptSig: Ut
      })),
      outputs: this.outputs.map(On)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = e, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Rn && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? $c : Mc).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Rn, n = 0, r = Rn, i = 0;
    for (const a of this.inputs)
      a.requiredHeightLocktime && (e = Math.max(e, a.requiredHeightLocktime), n++), a.requiredTimeLocktime && (r = Math.max(r, a.requiredTimeLocktime), i++);
    return n && n >= i ? e : r !== Rn ? r : this.global.fallbackLocktime || Rn;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(e) {
    this.checkInputIdx(e);
    const n = this.inputs[e];
    return n.finalScriptSig && n.finalScriptSig.length || n.finalScriptWitness && n.finalScriptWitness.length ? "finalized" : n.tapKeySig || n.tapScriptSig && n.tapScriptSig.length || n.partialSig && n.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(e) {
    this.checkInputIdx(e);
    const n = this.inputs[e].sighashType, r = n === void 0 ? It.DEFAULT : n, i = r === It.DEFAULT ? It.ALL : r & 3;
    return { sigInputs: r & It.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], i = [];
    for (let a = 0; a < this.inputs.length; a++) {
      if (this.inputStatus(a) === "unsigned")
        continue;
      const { sigInputs: f, sigOutputs: d } = this.inputSighash(a);
      if (f === It.ANYONECANPAY ? r.push(a) : e = !1, d === It.ALL)
        n = !1;
      else if (d === It.SINGLE)
        i.push(a);
      else if (d !== It.NONE) throw new Error(`Wrong signature hash output type: ${d}`);
    }
    return { addInput: e, addOutput: n, inputs: r, outputs: i };
  }
  get isFinal() {
    for (let e = 0; e < this.inputs.length; e++)
      if (this.inputStatus(e) !== "finalized")
        return !1;
    return !0;
  }
  // Info utils
  get hasWitnesses() {
    let e = !1;
    for (const n of this.inputs)
      n.finalScriptWitness && n.finalScriptWitness.length && (e = !0);
    return e;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let e = 32;
    const n = this.outputs.map(On);
    e += 4 * Le.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Oe.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Le.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Oe.encode(r.finalScriptSig || Ut).length, this.hasWitnesses && r.finalScriptWitness && (e += ya.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return uh(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return mn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Ar).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Ut
      })),
      outputs: this.outputs.map(On),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return et.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return et.encode(Ae(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return et.encode(Ae(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), ei(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(jc(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let i;
    if (!r) {
      const a = this.signStatus();
      (!a.addInput || a.inputs.includes(e)) && (i = Vd);
    }
    this.inputs[e] = jc(n, this.inputs[e], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), ei(this.outputs[e]);
  }
  getOutputAddress(e, n = or) {
    const r = this.getOutput(e);
    if (r.script)
      return sr(n).encode(Yt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: i, script: a } = e;
    if (i === void 0 && (i = n == null ? void 0 : n.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof a == "string" && (a = et.decode(a)), a === void 0 && (a = n == null ? void 0 : n.script);
    let c = { ...n, ...e, amount: i, script: a };
    if (c.amount === void 0 && delete c.amount, c = Ls(Jo, c, n, r, this.opts.allowUnknown), ba.encode(c), c.script && !this.opts.allowUnknownOutputs && Yt.decode(c.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || df(c.script, c.redeemScript, c.witnessScript), c;
  }
  addOutput(e, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(e)), this.outputs.length - 1;
  }
  updateOutput(e, n, r = !1) {
    this.checkOutputIdx(e);
    let i;
    if (!r) {
      const a = this.signStatus();
      (!a.addOutput || a.outputs.includes(e)) && (i = Hd);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], i);
  }
  addOutputAddress(e, n, r = or) {
    return this.addOutput({ script: Yt.encode(sr(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const i = Ko(r);
      if (!i)
        throw new Error("Empty input amount");
      e += i.amount;
    }
    const n = this.outputs.map(On);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: i, isNone: a, isSingle: c } = Hc(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return Vu.encode(1n);
    n = gt.encode(gt.decode(n).filter((w) => w !== "CODESEPARATOR"));
    let f = this.inputs.map(Ar).map((w, g) => ({
      ...w,
      finalScriptSig: g === e ? n : Ut
    }));
    i ? f = [f[e]] : (a || c) && (f = f.map((w, g) => ({
      ...w,
      sequence: g === e ? w.sequence : 0
    })));
    let d = this.outputs.map(On);
    a ? d = [] : c && (d = d.slice(0, e).fill(ch).concat([d[e]]));
    const p = mn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: f,
      outputs: d
    });
    return Ae(p, Zn.encode(r));
  }
  preimageWitnessV0(e, n, r, i) {
    const { isAny: a, isNone: c, isSingle: f } = Hc(r);
    let d = No, p = No, w = No;
    const g = this.inputs.map(Ar), b = this.outputs.map(On);
    a || (d = Ae(...g.map(ps.encode))), !a && !f && !c && (p = Ae(...g.map((D) => Tt.encode(D.sequence)))), !f && !c ? w = Ae(...b.map($n.encode)) : f && e < b.length && (w = Ae($n.encode(b[e])));
    const _ = g[e];
    return Ae(Zn.encode(this.version), d, p, Nt(32, !0).encode(_.txid), Tt.encode(_.index), Oe.encode(n), Po.encode(i), Tt.encode(_.sequence), w, Tt.encode(this.lockTime), Tt.encode(r));
  }
  preimageWitnessV1(e, n, r, i, a = -1, c, f = 192, d) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const p = [
      wn.encode(0),
      wn.encode(r),
      // U8 sigHash
      Zn.encode(this.version),
      Tt.encode(this.lockTime)
    ], w = r === It.DEFAULT ? It.ALL : r & 3, g = r & It.ANYONECANPAY, b = this.inputs.map(Ar), _ = this.outputs.map(On);
    g !== It.ANYONECANPAY && p.push(...[
      b.map(ps.encode),
      i.map(Po.encode),
      n.map(Oe.encode),
      b.map((A) => Tt.encode(A.sequence))
    ].map((A) => he(pn(...A)))), w === It.ALL && p.push(he(pn(..._.map($n.encode))));
    const D = (d ? 1 : 0) | (c ? 2 : 0);
    if (p.push(new Uint8Array([D])), g === It.ANYONECANPAY) {
      const A = b[e];
      p.push(ps.encode(A), Po.encode(i[e]), Oe.encode(n[e]), Tt.encode(A.sequence));
    } else
      p.push(Tt.encode(e));
    return D & 1 && p.push(he(Oe.encode(d || Ut))), w === It.SINGLE && p.push(e < _.length ? he($n.encode(_[e])) : No), c && p.push(Ur(c, f), wn.encode(0), Zn.encode(a)), aa("TapSighash", ...p);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, i) {
    this.checkInputIdx(n);
    const a = this.inputs[n], c = Gc(a, this.opts.allowLegacyWitnessUtxo);
    if (!_t(e)) {
      if (!a.bip32Derivation || !a.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const w = a.bip32Derivation.filter((b) => b[1].fingerprint == e.fingerprint).map(([b, { path: _ }]) => {
        let D = e;
        for (const A of _)
          D = D.deriveChild(A);
        if (!Ft(D.publicKey, b))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!D.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return D;
      });
      if (!w.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let g = !1;
      for (const b of w)
        this.signIdx(b.privateKey, n) && (g = !0);
      return g;
    }
    r ? r.forEach(hh) : r = [c.defaultSighash];
    const f = c.sighash;
    if (!r.includes(f))
      throw new Error(`Input with not allowed sigHash=${f}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: d } = this.inputSighash(n);
    if (d === It.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const p = Ko(a);
    if (c.txType === "taproot") {
      const w = this.inputs.map(Ko), g = w.map((P) => P.script), b = w.map((P) => P.amount);
      let _ = !1, D = sa(e), A = a.tapMerkleRoot || Ut;
      if (a.tapInternalKey) {
        const { pubKey: P, privKey: H } = dh(e, D, a.tapInternalKey, A), [W, j] = Bs(a.tapInternalKey, A);
        if (Ft(W, P)) {
          const L = this.preimageWitnessV1(n, g, f, b), M = pn(vc(L, H, i), f !== It.DEFAULT ? new Uint8Array([f]) : Ut);
          this.updateInput(n, { tapKeySig: M }, !0), _ = !0;
        }
      }
      if (a.tapLeafScript) {
        a.tapScriptSig = a.tapScriptSig || [];
        for (const [P, H] of a.tapLeafScript) {
          const W = H.subarray(0, -1), j = gt.decode(W), L = H[H.length - 1], M = Ur(W, L);
          if (j.findIndex((Et) => _t(Et) && Ft(Et, D)) === -1)
            continue;
          const ot = this.preimageWitnessV1(n, g, f, b, void 0, W, L), yt = pn(vc(ot, e, i), f !== It.DEFAULT ? new Uint8Array([f]) : Ut);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: D, leafHash: M }, yt]] }, !0), _ = !0;
        }
      }
      if (!_)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const w = yd(e);
      let g = !1;
      const b = qu(w);
      for (const A of gt.decode(c.lastScript))
        _t(A) && (Ft(A, w) || Ft(A, b)) && (g = !0);
      if (!g)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let _;
      if (c.txType === "legacy")
        _ = this.preimageLegacy(n, c.lastScript, f);
      else if (c.txType === "segwit") {
        let A = c.lastScript;
        c.last.type === "wpkh" && (A = Yt.encode({ type: "pkh", hash: c.last.hash })), _ = this.preimageWitnessV0(n, A, f, p.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const D = gd(_, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[w, pn(D, new Uint8Array([f]))]]
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
  sign(e, n, r) {
    let i = 0;
    for (let a = 0; a < this.inputs.length; a++)
      try {
        this.signIdx(e, a, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(e) {
    if (this.checkInputIdx(e), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[e], r = Gc(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const d = n.tapLeafScript.sort((p, w) => gn.encode(p[0]).length - gn.encode(w[0]).length);
        for (const [p, w] of d) {
          const g = w.slice(0, -1), b = w[w.length - 1], _ = Yt.decode(g), D = Ur(g, b), A = n.tapScriptSig.filter((H) => Ft(H[0].leafHash, D));
          let P = [];
          if (_.type === "tr_ms") {
            const H = _.m, W = _.pubkeys;
            let j = 0;
            for (const L of W) {
              const M = A.findIndex((tt) => Ft(tt[0].pubKey, L));
              if (j === H || M === -1) {
                P.push(Ut);
                continue;
              }
              P.push(A[M][1]), j++;
            }
            if (j !== H)
              continue;
          } else if (_.type === "tr_ns") {
            for (const H of _.pubkeys) {
              const W = A.findIndex((j) => Ft(j[0].pubKey, H));
              W !== -1 && P.push(A[W][1]);
            }
            if (P.length !== _.pubkeys.length)
              continue;
          } else if (_.type === "unknown" && this.opts.allowUnknownInputs) {
            const H = gt.decode(g);
            if (P = A.map(([{ pubKey: W }, j]) => {
              const L = H.findIndex((M) => _t(M) && Ft(M, W));
              if (L === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: j, pos: L };
            }).sort((W, j) => W.pos - j.pos).map((W) => W.signature), !P.length)
              continue;
          } else {
            const H = this.opts.customScripts;
            if (H)
              for (const W of H) {
                if (!W.finalizeTaproot)
                  continue;
                const j = gt.decode(g), L = W.encode(j);
                if (L === void 0)
                  continue;
                const M = W.finalizeTaproot(g, L, A);
                if (M) {
                  n.finalScriptWitness = M.concat(gn.encode(p)), n.finalScriptSig = Ut, hs(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = P.reverse().concat([g, gn.encode(p)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Ut, hs(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = Ut, a = [];
    if (r.last.type === "ms") {
      const d = r.last.m, p = r.last.pubkeys;
      let w = [];
      for (const g of p) {
        const b = n.partialSig.find((_) => Ft(g, _[0]));
        b && w.push(b[1]);
      }
      if (w = w.slice(0, d), w.length !== d)
        throw new Error(`Multisig: wrong signatures count, m=${d} n=${p.length} signatures=${w.length}`);
      i = gt.encode([0, ...w]);
    } else if (r.last.type === "pk")
      i = gt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = gt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = Ut, a = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let c, f;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (a = gt.decode(i).map((d) => {
      if (d === 0)
        return Ut;
      if (_t(d))
        return d;
      throw new Error(`Wrong witness op=${d}`);
    })), a = a.concat(r.lastScript)), r.txType === "segwit" && (f = a), r.type.startsWith("sh-wsh-") ? c = gt.encode([gt.encode([0, he(r.lastScript)])]) : r.type.startsWith("sh-") ? c = gt.encode([...gt.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (c = i), !c && !f)
      throw new Error("Unknown error finalizing input");
    c && (n.finalScriptSig = c), f && (n.finalScriptWitness = f), hs(n);
  }
  finalize() {
    for (let e = 0; e < this.inputs.length; e++)
      this.finalizeIdx(e);
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
  combine(e) {
    for (const i of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[i] !== e.opts[i])
        throw new Error(`Transaction/combine: different ${i} this=${this.opts[i]} other=${e.opts[i]}`);
    for (const i of ["inputs", "outputs"])
      if (this[i].length !== e[i].length)
        throw new Error(`Transaction/combine: different ${i} length this=${this[i].length} other=${e[i].length}`);
    const n = this.global.unsignedTx ? Br.encode(this.global.unsignedTx) : Ut, r = e.global.unsignedTx ? Br.encode(e.global.unsignedTx) : Ut;
    if (!Ft(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ls(ga, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, e.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, e.outputs[i], !0);
    return this;
  }
  clone() {
    return Lt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class Bt extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const yh = new Bt("leaf not found in tx tree"), gh = new Bt("parent not found");
class wh {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new Bt("empty vtxo tree");
    return this.tree[0][0];
  }
  // Returns the leaves of the vtxo tree
  leaves() {
    const e = [...this.tree[this.tree.length - 1]];
    for (let n = 0; n < this.tree.length - 1; n++)
      for (const r of this.tree[n])
        r.leaf && e.push(r);
    return e;
  }
  // Returns all nodes that have the given node as parent
  children(e) {
    const n = [];
    for (const r of this.tree)
      for (const i of r)
        i.parentTxid === e && n.push(i);
    return n;
  }
  // Returns the total number of nodes in the vtxo tree
  numberOfNodes() {
    return this.tree.reduce((e, n) => e + n.length, 0);
  }
  // Returns the branch of the given vtxo txid from root to leaf
  branch(e) {
    const n = [], i = this.leaves().find((c) => c.txid === e);
    if (!i)
      throw yh;
    n.push(i);
    const a = this.root().txid;
    for (; n[0].txid !== a; ) {
      const c = this.findParent(n[0]);
      n.unshift(c);
    }
    return n;
  }
  // Returns the remaining transactions to broadcast in order to exit the vtxo
  async exitBranch(e, n) {
    return (await bh(this.branch(e), n)).map(vh);
  }
  // Helper method to find parent of a node
  findParent(e) {
    for (const n of this.tree)
      for (const r of n)
        if (r.txid === e.parentTxid)
          return r;
    throw gh;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = Lt.fromPSBT(ie.decode(n.tx)), i = et.encode(Ae(r.toBytes(!0)).reverse());
        if (i !== n.txid)
          throw new Bt(`node ${n.txid} has txid ${n.txid}, but computed txid is ${i}`);
        try {
          this.findParent(n);
        } catch (a) {
          throw new Bt(`node ${n.txid} has no parent: ${a instanceof Error ? a.message : String(a)}`);
        }
      }
  }
}
const ys = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function mh(t) {
  if (t.length < ys.length)
    return !1;
  for (let e = 0; e < ys.length; e++)
    if (t[e] !== ys[e])
      return !1;
  return !0;
}
function wf(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    mh(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
async function bh(t, e) {
  let n = [...t];
  for (let r = t.length - 1; r >= 0; r--) {
    const i = t[r];
    if (await e(i.txid))
      return r === t.length - 1 ? [] : t.slice(r + 1);
  }
  return n;
}
function vh(t) {
  const e = Lt.fromPSBT(ie.decode(t.tx)), n = e.getInput(0);
  if (!n.tapKeySig)
    throw new Bt("missing tapkey signature");
  const r = mn.decode(e.unsignedTx);
  return r.witnesses = [[n.tapKeySig]], r.segwitFlag = !0, et.encode(mn.encode(r));
}
const gs = new Error("missing vtxo tree");
class Vr {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = ju();
    return new Vr(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return Ce.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw gs;
    this.myNonces || (this.myNonces = this.generateNonces());
    const e = [];
    for (const n of this.myNonces) {
      const r = [];
      for (const i of n) {
        if (!i) {
          r.push(null);
          continue;
        }
        r.push({ pubNonce: i.pubNonce });
      }
      e.push(r);
    }
    return e;
  }
  setAggregatedNonces(e) {
    if (this.aggregateNonces)
      throw new Error("nonces already set");
    this.aggregateNonces = e;
  }
  sign() {
    if (!this.tree)
      throw gs;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], i = this.tree.levels[n];
      for (let a = 0; a < i.length; a++) {
        const c = i[a], f = Lt.fromPSBT(ie.decode(c.tx)), d = this.signPartial(f, n, a);
        d ? r.push(d) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw gs;
    const e = [], n = Ce.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const i = [];
      for (let a = 0; a < r.length; a++) {
        const c = vd(n);
        i.push(c);
      }
      e.push(i);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Vr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const i = this.myNonces[n][r];
    if (!i)
      return null;
    const a = this.aggregateNonces[n][r];
    if (!a)
      throw new Error("missing aggregate nonce");
    const c = [], f = [], d = wf(e), { finalKey: p } = ha(d, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let g = 0; g < e.inputsLength; g++) {
      const b = Eh(p, this.tree, this.rootSharedOutputAmount, e);
      c.push(b.amount), f.push(b.script);
    }
    const w = e.preimageWitnessV1(
      0,
      // always first input
      f,
      Fr.DEFAULT,
      c
    );
    return Cd(i.secNonce, this.secretKey, a.pubNonce, d, w, {
      taprootTweak: this.scriptRoot
    });
  }
}
Vr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Eh(t, e, n, r) {
  const i = gt.encode(["OP_1", t.slice(1)]), a = e.levels[0][0];
  if (!a)
    throw new Error("empty vtxo tree");
  const c = r.getInput(0);
  if (!c.txid)
    throw new Error("missing input txid");
  const f = et.encode(c.txid);
  if (a.parentTxid === f)
    return {
      amount: n,
      script: i
    };
  let d = null;
  for (const g of e.levels) {
    for (const b of g)
      if (b.txid === f) {
        d = b;
        break;
      }
    if (d)
      break;
  }
  if (!d)
    throw new Error("parent tx not found");
  const p = Lt.fromPSBT(ie.decode(d.tx));
  if (!c.index)
    throw new Error("missing input index");
  const w = p.getOutput(c.index);
  if (!w)
    throw new Error("parent output not found");
  if (!w.amount)
    throw new Error("parent output amount not found");
  return {
    amount: w.amount,
    script: i
  };
}
const zc = new Uint8Array(32).fill(0);
class ni {
  constructor(e) {
    this.key = e || ju();
  }
  static fromPrivateKey(e) {
    return new ni(e);
  }
  static fromHex(e) {
    return new ni(et.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, zc))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, void 0, zc))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  xOnlyPublicKey() {
    return sa(this.key);
  }
  signerSession() {
    return Vr.random();
  }
}
class Xr {
  constructor(e, n, r) {
    if (this.serverPubKey = e, this.tweakedPubKey = n, this.hrp = r, e.length !== 32)
      throw new Error("Invalid server public key length");
    if (n.length !== 32)
      throw new Error("Invalid tweaked public key length");
  }
  static decode(e) {
    const n = Yn.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Yn.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const i = r.slice(0, 32), a = r.slice(32, 64);
    return new Xr(i, a, n.prefix);
  }
  encode() {
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = Yn.toWords(e);
    return Yn.encode(this.hrp, n, 1023);
  }
  get pkScript() {
    return gt.encode(["OP_1", this.tweakedPubKey]);
  }
}
var Vt;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(Vt || (Vt = {}));
function mf(t) {
  const e = [
    Ke,
    en,
    ri,
    oi,
    Hr
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${et.encode(t)} is not a valid tapscript`);
}
var Ke;
(function(t) {
  let e;
  (function(f) {
    f[f.CHECKSIG = 0] = "CHECKSIG", f[f.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(e = t.MultisigType || (t.MultisigType = {}));
  function n(f) {
    if (f.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const p of f.pubkeys)
      if (p.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
    if (f.type || (f.type = e.CHECKSIG), f.type === e.CHECKSIGADD)
      return {
        type: Vt.Multisig,
        params: f,
        script: ah(f.pubkeys.length, f.pubkeys).script,
        witnessSize: () => f.pubkeys.length * 64
      };
    const d = [];
    for (let p = 0; p < f.pubkeys.length; p++)
      d.push(f.pubkeys[p]), p < f.pubkeys.length - 1 ? d.push("CHECKSIGVERIFY") : d.push("CHECKSIG");
    return {
      type: Vt.Multisig,
      params: f,
      script: gt.encode(d),
      witnessSize: () => f.pubkeys.length * 64
    };
  }
  t.encode = n;
  function r(f) {
    if (f.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return i(f);
    } catch {
      try {
        return a(f);
      } catch (p) {
        throw new Error(`Failed to decode script: ${p instanceof Error ? p.message : String(p)}`);
      }
    }
  }
  t.decode = r;
  function i(f) {
    const d = gt.decode(f), p = [];
    let w = !1;
    for (let b = 0; b < d.length; b++) {
      const _ = d[b];
      if (typeof _ != "string" && typeof _ != "number") {
        if (_.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${_.length}`);
        if (p.push(_), b + 1 >= d.length || d[b + 1] !== "CHECKSIGADD" && d[b + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        b++;
        continue;
      }
      if (b === d.length - 1) {
        if (_ !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        w = !0;
      }
    }
    if (!w)
      throw new Error("Missing NUMEQUAL operation");
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const g = n({
      pubkeys: p,
      type: e.CHECKSIGADD
    });
    if (et.encode(g.script) !== et.encode(f))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.Multisig,
      params: { pubkeys: p, type: e.CHECKSIGADD },
      script: f,
      witnessSize: () => p.length * 64
    };
  }
  function a(f) {
    const d = gt.decode(f), p = [];
    for (let g = 0; g < d.length; g++) {
      const b = d[g];
      if (typeof b != "string" && typeof b != "number") {
        if (b.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${b.length}`);
        if (p.push(b), g + 1 >= d.length)
          throw new Error("Unexpected end of script");
        const _ = d[g + 1];
        if (_ !== "CHECKSIGVERIFY" && _ !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (g === d.length - 2 && _ !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        g++;
        continue;
      }
    }
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const w = n({ pubkeys: p, type: e.CHECKSIG });
    if (et.encode(w.script) !== et.encode(f))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.Multisig,
      params: { pubkeys: p, type: e.CHECKSIG },
      script: f,
      witnessSize: () => p.length * 64
    };
  }
  function c(f) {
    return f.type === Vt.Multisig;
  }
  t.is = c;
})(Ke || (Ke = {}));
var en;
(function(t) {
  function e(i) {
    for (const p of i.pubkeys)
      if (p.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
    const c = [ir().encode(BigInt(Rc.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], f = Ke.encode(i), d = new Uint8Array([
      ...gt.encode(c),
      ...f.script
    ]);
    return {
      type: Vt.CSVMultisig,
      params: i,
      script: d,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const a = gt.decode(i);
    if (a.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = a[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected sequence number");
    if (a[1] !== "CHECKSEQUENCEVERIFY" || a[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const f = new Uint8Array(gt.encode(a.slice(3)));
    let d;
    try {
      d = Ke.decode(f);
    } catch (_) {
      throw new Error(`Invalid multisig script: ${_ instanceof Error ? _.message : String(_)}`);
    }
    const p = Number(ir().decode(c)), w = Rc.decode(p), g = w.blocks !== void 0 ? { type: "blocks", value: BigInt(w.blocks) } : { type: "seconds", value: BigInt(w.seconds) }, b = e({
      timelock: g,
      ...d.params
    });
    if (et.encode(b.script) !== et.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.CSVMultisig,
      params: {
        timelock: g,
        ...d.params
      },
      script: i,
      witnessSize: () => d.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Vt.CSVMultisig;
  }
  t.is = r;
})(en || (en = {}));
var ri;
(function(t) {
  function e(i) {
    const a = new Uint8Array([
      ...i.conditionScript,
      ...gt.encode(["VERIFY"]),
      ...en.encode(i).script
    ]);
    return {
      type: Vt.ConditionCSVMultisig,
      params: i,
      script: a,
      witnessSize: (c) => c + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const a = gt.decode(i);
    if (a.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let g = a.length - 1; g >= 0; g--)
      a[g] === "VERIFY" && (c = g);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const f = new Uint8Array(gt.encode(a.slice(0, c))), d = new Uint8Array(gt.encode(a.slice(c + 1)));
    let p;
    try {
      p = en.decode(d);
    } catch (g) {
      throw new Error(`Invalid CSV multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const w = e({
      conditionScript: f,
      ...p.params
    });
    if (et.encode(w.script) !== et.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.ConditionCSVMultisig,
      params: {
        conditionScript: f,
        ...p.params
      },
      script: i,
      witnessSize: (g) => g + p.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Vt.ConditionCSVMultisig;
  }
  t.is = r;
})(ri || (ri = {}));
var oi;
(function(t) {
  function e(i) {
    const a = new Uint8Array([
      ...i.conditionScript,
      ...gt.encode(["VERIFY"]),
      ...Ke.encode(i).script
    ]);
    return {
      type: Vt.ConditionMultisig,
      params: i,
      script: a,
      witnessSize: (c) => c + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const a = gt.decode(i);
    if (a.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let g = a.length - 1; g >= 0; g--)
      a[g] === "VERIFY" && (c = g);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const f = new Uint8Array(gt.encode(a.slice(0, c))), d = new Uint8Array(gt.encode(a.slice(c + 1)));
    let p;
    try {
      p = Ke.decode(d);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const w = e({
      conditionScript: f,
      ...p.params
    });
    if (et.encode(w.script) !== et.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.ConditionMultisig,
      params: {
        conditionScript: f,
        ...p.params
      },
      script: i,
      witnessSize: (g) => g + p.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Vt.ConditionMultisig;
  }
  t.is = r;
})(oi || (oi = {}));
var Hr;
(function(t) {
  function e(i) {
    const c = [ir().encode(i.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], f = gt.encode(c), d = new Uint8Array([
      ...f,
      ...Ke.encode(i).script
    ]);
    return {
      type: Vt.CLTVMultisig,
      params: i,
      script: d,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const a = gt.decode(i);
    if (a.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = a[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected locktime number");
    if (a[1] !== "CHECKLOCKTIMEVERIFY" || a[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const f = new Uint8Array(gt.encode(a.slice(3)));
    let d;
    try {
      d = Ke.decode(f);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const p = ir().decode(c), w = e({
      absoluteTimelock: p,
      ...d.params
    });
    if (et.encode(w.script) !== et.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Vt.CLTVMultisig,
      params: {
        absoluteTimelock: p,
        ...d.params
      },
      script: i,
      witnessSize: () => d.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Vt.CLTVMultisig;
  }
  t.is = r;
})(Hr || (Hr = {}));
function Ea(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class cr {
  static decode(e) {
    return new cr(e.map(et.decode));
  }
  constructor(e) {
    this.scripts = e;
    const n = hf(e.map((i) => ({ script: i, leafVersion: ti }))), r = pf(ca, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return this.scripts.map(et.encode);
  }
  address(e, n) {
    return new Xr(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return gt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return sr(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => et.encode(Ea(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
}
var Wc;
(function(t) {
  class e extends cr {
    constructor(r) {
      const { sender: i, receiver: a, server: c, preimageHash: f, refundLocktime: d, unilateralClaimDelay: p, unilateralRefundDelay: w, unilateralRefundWithoutReceiverDelay: g } = r, b = xh(f), _ = oi.encode({
        conditionScript: b,
        pubkeys: [a, c]
      }).script, D = Ke.encode({
        pubkeys: [i, a, c]
      }).script, A = Hr.encode({
        absoluteTimelock: d,
        pubkeys: [i, c]
      }).script, P = ri.encode({
        conditionScript: b,
        timelock: p,
        pubkeys: [a]
      }).script, H = en.encode({
        timelock: w,
        pubkeys: [i, a]
      }).script, W = en.encode({
        timelock: g,
        pubkeys: [i]
      }).script;
      super([
        _,
        D,
        A,
        P,
        H,
        W
      ]), this.options = r, this.claimScript = et.encode(_), this.refundScript = et.encode(D), this.refundWithoutReceiverScript = et.encode(A), this.unilateralClaimScript = et.encode(P), this.unilateralRefundScript = et.encode(H), this.unilateralRefundWithoutReceiverScript = et.encode(W);
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
  t.Script = e;
})(Wc || (Wc = {}));
function xh(t) {
  return gt.encode(["HASH160", t, "EQUAL"]);
}
var qr;
(function(t) {
  class e extends cr {
    constructor(r) {
      const { pubKey: i, serverPubKey: a, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, f = Ke.encode({
        pubkeys: [i, a]
      }).script, d = en.encode({
        timelock: c,
        pubkeys: [i]
      }).script;
      super([f, d]), this.options = r, this.forfeitScript = et.encode(f), this.exitScript = et.encode(d);
    }
    forfeit() {
      return this.findLeaf(this.forfeitScript);
    }
    exit() {
      return this.findLeaf(this.exitScript);
    }
  }
  e.DEFAULT_TIMELOCK = {
    value: 144n,
    type: "blocks"
  }, t.Script = e;
})(qr || (qr = {}));
var jr;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(jr || (jr = {}));
function Sh(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function kh(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function Th(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function Uo(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function Ah(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function bf(t, e, n) {
  const r = [];
  let i = [...e];
  for (const c of [...t, ...e]) {
    if (c.virtualStatus.state !== "pending" && n.has(c.virtualStatus.batchTxID || ""))
      continue;
    const f = Sh(i, c);
    i = Yc(i, f);
    const d = Uo(f);
    if (c.value <= d)
      continue;
    const p = kh(i, c);
    i = Yc(i, p);
    const w = Uo(p);
    if (c.value <= w)
      continue;
    const g = {
      roundTxid: c.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let b = c.virtualStatus.state !== "pending";
    c.virtualStatus.state === "pending" && (g.redeemTxid = c.txid, c.spentBy && (b = !0)), r.push({
      key: g,
      amount: c.value - d - w,
      type: jr.TxReceived,
      createdAt: c.createdAt.getTime(),
      settled: b
    });
  }
  const a = /* @__PURE__ */ new Map();
  for (const c of e) {
    if (!c.spentBy)
      continue;
    a.has(c.spentBy) || a.set(c.spentBy, []);
    const f = a.get(c.spentBy);
    a.set(c.spentBy, [...f, c]);
  }
  for (const [c, f] of a) {
    const d = Th([...t, ...e], c), p = Uo(d), w = Uo(f);
    if (w <= p)
      continue;
    const g = Ah(d, f), b = {
      roundTxid: g.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    g.virtualStatus.state === "pending" && (b.redeemTxid = g.txid), r.push({
      key: b,
      amount: w - p,
      type: jr.TxSent,
      createdAt: g.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Yc(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var Ms;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(Ms || (Ms = {}));
class Zc {
  static create(e) {
    const { address: n, ...r } = e, i = {};
    for (const [c, f] of Object.entries(r))
      if (f !== void 0)
        if (c === "amount") {
          if (!isFinite(f)) {
            console.warn("Invalid amount");
            continue;
          }
          if (f < 0)
            continue;
          i[c] = f;
        } else c === "ark" ? typeof f == "string" && (f.startsWith("ark") || f.startsWith("tark")) ? i[c] = f : console.warn("Invalid ARK address format") : c === "sp" ? typeof f == "string" && f.startsWith("sp") ? i[c] = f : console.warn("Invalid Silent Payment address format") : (typeof f == "string" || typeof f == "number") && (i[c] = f);
    const a = Object.keys(i).length > 0 ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(i).map(([c, f]) => [
      c,
      String(f)
    ]))).toString() : "";
    return `bitcoin:${n ? n.toLowerCase() : ""}${a}`;
  }
  static parse(e) {
    if (!e.toLowerCase().startsWith("bitcoin:"))
      throw new Error(Ms.INVALID_URI);
    const n = e.slice(e.toLowerCase().indexOf("bitcoin:") + 8), [r, i] = n.split("?"), a = {};
    if (r && (a.address = r.toLowerCase()), i) {
      const c = new URLSearchParams(i);
      for (const [f, d] of c.entries())
        if (d)
          if (f === "amount") {
            const p = Number(d);
            if (!isFinite(p) || p < 0)
              continue;
            a[f] = p;
          } else f === "ark" ? d.startsWith("ark") || d.startsWith("tark") ? a[f] = d : console.warn("Invalid ARK address format") : f === "sp" ? d.startsWith("sp") ? a[f] = d : console.warn("Invalid Silent Payment address format") : a[f] = d;
    }
    return {
      originalString: e,
      params: a
    };
  }
}
function Ih(t, e) {
  const n = [...t].sort((c, f) => f.value - c.value), r = [];
  let i = 0;
  for (const c of n)
    if (r.push(c), i += c.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const a = i - e;
  return {
    inputs: r,
    changeAmount: a
  };
}
function _h(t, e) {
  const n = [...t].sort((c, f) => {
    const d = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, p = f.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return d !== p ? d - p : f.value - c.value;
  }), r = [];
  let i = 0;
  for (const c of n)
    if (r.push(c), i += c.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const a = i - e;
  return {
    inputs: r,
    changeAmount: a
  };
}
const Bh = (t) => Ch[t], Ch = {
  bitcoin: Ir(or, "ark"),
  testnet: Ir(_o, "tark"),
  signet: Ir(_o, "tark"),
  mutinynet: Ir(_o, "tark"),
  regtest: Ir({
    ..._o,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Ir(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const Nh = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Uh {
  constructor(e) {
    this.baseUrl = e;
  }
  async getCoins(e) {
    const n = await fetch(`${this.baseUrl}/address/${e}/utxo`);
    if (!n.ok)
      throw new Error(`Failed to fetch UTXOs: ${n.statusText}`);
    return n.json();
  }
  async getFeeRate() {
    const e = await fetch(`${this.baseUrl}/v1/fees/recommended`);
    if (!e.ok)
      throw new Error(`Failed to fetch fee rate: ${e.statusText}`);
    return (await e.json()).halfHourFee;
  }
  async broadcastTransaction(e) {
    const n = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: e
    });
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to broadcast transaction: ${r}`);
    }
    return n.text();
  }
  async getTxOutspends(e) {
    const n = await fetch(`${this.baseUrl}/tx/${e}/outspends`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transaction outspends: ${r}`);
    }
    return n.json();
  }
  async getTransactions(e) {
    const n = await fetch(`${this.baseUrl}/address/${e}/txs`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transactions: ${r}`);
    }
    return n.json();
  }
  async getTxStatus(e) {
    const n = await fetch(`${this.baseUrl}/tx/${e}/status`);
    if (!n.ok)
      throw new Error(`Failed to get transaction status: ${n.statusText}`);
    const r = await n.json();
    return {
      confirmed: r.confirmed,
      blockTime: r.block_time,
      blockHeight: r.block_height
    };
  }
}
var oe;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(oe || (oe = {}));
class vf {
  constructor(e) {
    this.serverUrl = e;
  }
  async getInfo() {
    const e = `${this.serverUrl}/v1/info`, n = await fetch(e);
    if (!n.ok)
      throw new Error(`Failed to get server info: ${n.statusText}`);
    const r = await n.json();
    return {
      ...r,
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      batchExpiry: BigInt(r.vtxoTreeExpiry ?? 0)
    };
  }
  async getVirtualCoins(e) {
    const n = `${this.serverUrl}/v1/vtxos/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch VTXOs: ${r.statusText}`);
    const i = await r.json();
    return {
      spendableVtxos: [...i.spendableVtxos || []].map(Ro),
      spentVtxos: [...i.spentVtxos || []].map(Ro)
    };
  }
  async getRound(e) {
    const n = `${this.serverUrl}/v1/round/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch round: ${r.statusText}`);
    const a = (await r.json()).round;
    return {
      id: a.id,
      start: new Date(Number(a.start) * 1e3),
      // Convert from Unix timestamp to Date
      end: new Date(Number(a.end) * 1e3),
      // Convert from Unix timestamp to Date
      vtxoTree: this.toTxTree(a.vtxoTree),
      forfeitTxs: a.forfeitTxs || [],
      connectors: this.toTxTree(a.connectors)
    };
  }
  async submitVirtualTx(e) {
    const n = `${this.serverUrl}/v1/redeem-tx`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        redeem_tx: e
      })
    });
    if (!r.ok) {
      const a = await r.text();
      try {
        const c = JSON.parse(a);
        throw new Error(`Failed to submit virtual transaction: ${c.message || c.error || a}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${a}`);
      }
    }
    const i = await r.json();
    return i.txid || i.signedRedeemTx;
  }
  async subscribeToEvents(e) {
    const n = `${this.serverUrl}/v1/events`;
    let r = new AbortController();
    return (async () => {
      for (; !r.signal.aborted; )
        try {
          const i = await fetch(n, {
            headers: {
              Accept: "application/json"
            },
            signal: r.signal
          });
          if (!i.ok)
            throw new Error(`Unexpected status ${i.status} when fetching event stream`);
          if (!i.body)
            throw new Error("Response body is null");
          const a = i.body.getReader(), c = new TextDecoder();
          let f = "";
          for (; !r.signal.aborted; ) {
            const { done: d, value: p } = await a.read();
            if (d)
              break;
            f += c.decode(p, { stream: !0 });
            const w = f.split(`
`);
            for (let g = 0; g < w.length - 1; g++) {
              const b = w[g].trim();
              if (b)
                try {
                  const _ = JSON.parse(b);
                  e(_);
                } catch (_) {
                  console.error("Failed to parse event:", _);
                }
            }
            f = w[w.length - 1];
          }
        } catch (i) {
          r.signal.aborted || console.error("Event stream error:", i);
        }
    })(), () => {
      r.abort(), r = new AbortController();
    };
  }
  async registerInputsForNextRound(e) {
    const n = `${this.serverUrl}/v1/round/registerInputs`, r = [], i = [];
    for (const f of e)
      typeof f == "string" ? i.push(f) : r.push({
        outpoint: {
          txid: f.outpoint.txid,
          vout: f.outpoint.vout
        },
        tapscripts: {
          scripts: f.tapscripts
        }
      });
    const a = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: r,
        notes: i
      })
    });
    if (!a.ok) {
      const f = await a.text();
      throw new Error(`Failed to register inputs: ${f}`);
    }
    return { requestId: (await a.json()).requestId };
  }
  async registerOutputsForNextRound(e, n, r, i = !1) {
    const a = `${this.serverUrl}/v1/round/registerOutputs`, c = await fetch(a, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestId: e,
        outputs: n.map((f) => ({
          address: f.address,
          amount: f.amount.toString(10)
        })),
        musig2: {
          cosignersPublicKeys: r,
          signingAll: i
        }
      })
    });
    if (!c.ok) {
      const f = await c.text();
      throw new Error(`Failed to register outputs: ${f}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const i = `${this.serverUrl}/v1/round/tree/submitNonces`, a = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeNonces: Ph(r)
      })
    });
    if (!a.ok) {
      const c = await a.text();
      throw new Error(`Failed to submit tree nonces: ${c}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const i = `${this.serverUrl}/v1/round/tree/submitSignatures`, a = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeSignatures: Lh(r)
      })
    });
    if (!a.ok) {
      const c = await a.text();
      throw new Error(`Failed to submit tree signatures: ${c}`);
    }
  }
  async submitSignedForfeitTxs(e, n) {
    const r = `${this.serverUrl}/v1/round/submitForfeitTxs`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: e,
        signedRoundTx: n
      })
    });
    if (!i.ok)
      throw new Error(`Failed to submit forfeit transactions: ${i.statusText}`);
  }
  async ping(e) {
    const n = `${this.serverUrl}/v1/round/ping/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Ping failed: ${r.statusText}`);
  }
  async *getEventStream(e) {
    const n = `${this.serverUrl}/v1/events`;
    for (; !(e != null && e.aborted); )
      try {
        const r = await fetch(n, {
          headers: {
            Accept: "application/json"
          },
          signal: e
        });
        if (!r.ok)
          throw new Error(`Unexpected status ${r.status} when fetching event stream`);
        if (!r.body)
          throw new Error("Response body is null");
        const i = r.body.getReader(), a = new TextDecoder();
        let c = "";
        for (; !(e != null && e.aborted); ) {
          const { done: f, value: d } = await i.read();
          if (f)
            break;
          c += a.decode(d, { stream: !0 });
          const p = c.split(`
`);
          for (let w = 0; w < p.length - 1; w++) {
            const g = p[w].trim();
            if (g)
              try {
                const b = JSON.parse(g), _ = this.parseSettlementEvent(b.result);
                _ && (yield _);
              } catch (b) {
                throw console.error("Failed to parse event:", b), b;
              }
          }
          c = p[p.length - 1];
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        throw console.error("Event stream error:", r), r;
      }
  }
  async *subscribeForAddress(e, n) {
    const r = `${this.serverUrl}/v1/vtxos/${e}/subscribe`;
    for (; !n.aborted; )
      try {
        const i = await fetch(r, {
          headers: {
            Accept: "application/json"
          }
        });
        if (!i.ok)
          throw new Error(`Unexpected status ${i.status} when subscribing to address updates`);
        if (!i.body)
          throw new Error("Response body is null");
        const a = i.body.getReader(), c = new TextDecoder();
        let f = "";
        for (; !n.aborted; ) {
          const { done: d, value: p } = await a.read();
          if (d)
            break;
          f += c.decode(p, { stream: !0 });
          const w = f.split(`
`);
          for (let g = 0; g < w.length - 1; g++) {
            const b = w[g].trim();
            if (b)
              try {
                const _ = JSON.parse(b);
                "result" in _ && (yield {
                  newVtxos: (_.result.newVtxos || []).map(Ro),
                  spentVtxos: (_.result.spentVtxos || []).map(Ro)
                });
              } catch (_) {
                throw console.error("Failed to parse address update:", _), _;
              }
          }
          f = w[w.length - 1];
        }
      } catch (i) {
        throw console.error("Address subscription error:", i), i;
      }
  }
  toConnectorsIndex(e) {
    return new Map(Object.entries(e).map(([n, r]) => [
      n,
      { txid: r.txid, vout: r.vout }
    ]));
  }
  toTxTree(e) {
    const n = /* @__PURE__ */ new Set();
    return e.levels.forEach((r) => r.nodes.forEach((i) => {
      i.parentTxid && n.add(i.parentTxid);
    })), new wh(e.levels.map((r) => r.nodes.map((i) => ({
      txid: i.txid,
      tx: i.tx,
      parentTxid: i.parentTxid,
      leaf: !n.has(i.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: oe.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: oe.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: oe.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: oe.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: oe.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: Oh(et.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function Ef(t) {
  let e = 4;
  for (const a of t) {
    e += 4;
    for (const c of a)
      e += 1, e += c.length;
  }
  const n = new ArrayBuffer(e), r = new DataView(n);
  let i = 0;
  r.setUint32(i, t.length, !0), i += 4;
  for (const a of t) {
    r.setUint32(i, a.length, !0), i += 4;
    for (const c of a) {
      const f = c.length > 0;
      r.setInt8(i, f ? 1 : 0), i += 1, f && (new Uint8Array(n).set(c, i), i += c.length);
    }
  }
  return new Uint8Array(n);
}
function Rh(t, e) {
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let r = 0;
  const i = n.getUint32(r, !0);
  r += 4;
  const a = [];
  for (let c = 0; c < i; c++) {
    const f = n.getUint32(r, !0);
    r += 4;
    const d = [];
    for (let p = 0; p < f; p++) {
      const w = n.getUint8(r) === 1;
      if (r += 1, w) {
        const g = new Uint8Array(t.buffer, t.byteOffset + r, e);
        d.push(new Uint8Array(g)), r += e;
      } else
        d.push(new Uint8Array());
    }
    a.push(d);
  }
  return a;
}
function Oh(t) {
  return Rh(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function Ph(t) {
  return et.encode(Ef(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function Lh(t) {
  return et.encode(Ef(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function Ro(t) {
  return {
    txid: t.outpoint.txid,
    vout: t.outpoint.vout,
    value: Number(t.amount),
    status: {
      confirmed: !!t.roundTxid
    },
    virtualStatus: {
      state: t.isPending ? "pending" : "settled",
      batchTxID: t.roundTxid,
      batchExpiry: t.expireAt ? Number(t.expireAt) : void 0
    },
    spentBy: t.spentBy,
    createdAt: new Date(t.createdAt * 1e3)
  };
}
function Kh({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: i, vtxoPkScript: a, connectorPkScript: c, serverPkScript: f, txLocktime: d }) {
  const p = new Lt({
    version: 2,
    lockTime: d
  });
  p.addInput({
    txid: t.txid,
    index: t.vout,
    witnessUtxo: {
      script: c,
      amount: r
    },
    sequence: 4294967295
  }), p.addInput({
    txid: e.txid,
    index: e.vout,
    witnessUtxo: {
      script: a,
      amount: n
    },
    sequence: d ? 4294967294 : 4294967295,
    // MAX_SEQUENCE - 1 if locktime is set
    sighashType: Fr.DEFAULT
  });
  const w = BigInt(n) + BigInt(r) - BigInt(i);
  return p.addOutput({
    script: f,
    amount: w
  }), p;
}
class Rt {
  constructor(e, n, r, i, a, c) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = a, this.outputSize = c;
  }
  static create() {
    return new Rt(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Rt.INPUT_SIZE + Rt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const i = 1 + Rt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + i, this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Rt.OUTPUT_SIZE + Rt.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (c) => c < 253 ? 1 : c < 65535 ? 3 : c < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let a = (Rt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Rt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (a += Rt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Dh(a);
  }
}
Rt.P2PKH_SCRIPT_SIG_SIZE = 108;
Rt.INPUT_SIZE = 41;
Rt.BASE_CONTROL_BLOCK_SIZE = 33;
Rt.OUTPUT_SIZE = 9;
Rt.P2WKH_OUTPUT_SIZE = 22;
Rt.BASE_TX_SIZE = 10;
Rt.WITNESS_HEADER_SIZE = 2;
Rt.WITNESS_SCALE_FACTOR = 4;
const Dh = (t) => {
  const e = BigInt(Math.ceil(t / Rt.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, $h = new Bt("invalid settlement transaction"), Fs = new Bt("invalid settlement transaction outputs"), xf = new Bt("empty tree"), Mh = new Bt("invalid root level"), xa = new Bt("invalid number of inputs"), Or = new Bt("wrong settlement txid"), Vs = new Bt("invalid amount"), Fh = new Bt("no leaves"), Vh = new Bt("node transaction empty"), Hh = new Bt("node txid empty"), qh = new Bt("node parent txid empty"), jh = new Bt("node txid different"), Xc = new Bt("parent txid input mismatch"), Gh = new Bt("leaf node has children"), Qc = new Bt("invalid taproot script"), zh = new Bt("invalid internal key");
new Bt("invalid control block");
const Wh = new Bt("invalid root transaction"), Yh = new Bt("invalid node transaction"), ws = 0, Jc = 1;
function Zh(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw xf;
  const r = Lt.fromPSBT(ie.decode(n.tx));
  if (r.inputsLength !== 1)
    throw xa;
  const i = r.getInput(0), a = Lt.fromPSBT(ie.decode(t));
  if (a.outputsLength <= Jc)
    throw Fs;
  const c = et.encode(Ae(a.toBytes(!0)).reverse());
  if (!i.txid || et.encode(i.txid) !== c || i.index !== Jc)
    throw Or;
}
function Xh(t, e, n) {
  e.validate();
  let r;
  try {
    r = Lt.fromPSBT(ie.decode(t));
  } catch {
    throw $h;
  }
  if (r.outputsLength <= ws)
    throw Fs;
  const i = r.getOutput(ws);
  if (!(i != null && i.amount))
    throw Fs;
  const a = i.amount;
  if (e.numberOfNodes() === 0)
    throw xf;
  if (e.levels[0].length !== 1)
    throw Mh;
  const f = e.levels[0][0];
  let d;
  try {
    d = Lt.fromPSBT(ie.decode(f.tx));
  } catch {
    throw Wh;
  }
  if (d.inputsLength !== 1)
    throw xa;
  const p = d.getInput(0);
  if (!p.txid || p.index === void 0)
    throw Or;
  const w = et.encode(Ae(r.toBytes(!0)).reverse());
  if (et.encode(p.txid) !== w || p.index !== ws)
    throw Or;
  let g = 0n;
  for (let b = 0; b < d.outputsLength; b++) {
    const _ = d.getOutput(b);
    _ != null && _.amount && (g += _.amount);
  }
  if (g >= a)
    throw Vs;
  if (e.leaves().length === 0)
    throw Fh;
  for (const b of e.levels)
    for (const _ of b)
      Qh(e, _, n);
}
function Qh(t, e, n) {
  if (!e.tx)
    throw Vh;
  if (!e.txid)
    throw Hh;
  if (!e.parentTxid)
    throw qh;
  let r;
  try {
    r = Lt.fromPSBT(ie.decode(e.tx));
  } catch {
    throw Yh;
  }
  if (et.encode(Ae(r.toBytes(!0)).reverse()) !== e.txid)
    throw jh;
  if (r.inputsLength !== 1)
    throw xa;
  const a = r.getInput(0);
  if (!a.txid || et.encode(a.txid) !== e.parentTxid)
    throw Xc;
  const c = t.children(e.txid);
  if (e.leaf && c.length >= 1)
    throw Gh;
  for (let f = 0; f < c.length; f++) {
    const d = c[f], p = Lt.fromPSBT(ie.decode(d.tx)), w = r.getOutput(f);
    if (!(w != null && w.script))
      throw Qc;
    const g = w.script.slice(2);
    if (g.length !== 32)
      throw Qc;
    const b = wf(p), { finalKey: _ } = ha(b, !0, {
      taprootTweak: n
    });
    if (et.encode(_) !== et.encode(g.slice(2)))
      throw zh;
    let D = 0n;
    for (let A = 0; A < p.outputsLength; A++) {
      const P = p.getOutput(A);
      P != null && P.amount && (D += P.amount);
    }
    if (!w.amount || D >= w.amount)
      throw Vs;
  }
}
const Jh = 255;
new TextEncoder().encode("condition");
const tp = new TextEncoder().encode("taptree");
function ep(t, e, n) {
  var r;
  e.updateInput(t, {
    unknown: [
      ...((r = e.getInput(t)) == null ? void 0 : r.unknown) ?? [],
      [
        {
          type: Jh,
          key: tp
        },
        rp(n)
      ]
    ]
  });
}
function np(t, e) {
  let n = 0n;
  for (const i of t) {
    const a = mf(Ea(i.tapLeafScript));
    if (Hr.is(a)) {
      if (n !== 0n && eu(n) !== eu(a.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      a.params.absoluteTimelock > n && (n = a.params.absoluteTimelock);
    }
  }
  const r = new Lt({
    allowUnknown: !0,
    lockTime: Number(n)
  });
  for (const [i, a] of t.entries())
    r.addInput({
      txid: a.txid,
      index: a.vout,
      sequence: n ? va - 1 : void 0,
      witnessUtxo: {
        script: cr.decode(a.scripts).pkScript,
        amount: BigInt(a.value)
      },
      tapLeafScript: [a.tapLeafScript]
    }), ep(i, r, a.scripts.map(et.decode));
  for (const i of e)
    r.addOutput({
      amount: i.amount,
      script: Xr.decode(i.address).pkScript
    });
  return r;
}
function rp(t) {
  const e = [];
  e.push(tu(t.length));
  for (const a of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(tu(a.length)), e.push(a);
  const n = e.reduce((a, c) => a + c.length, 0), r = new Uint8Array(n);
  let i = 0;
  for (const a of e)
    r.set(a, i), i += a.length;
  return r;
}
function tu(t) {
  if (t < 253)
    return new Uint8Array([t]);
  if (t <= 65535) {
    const e = new Uint8Array(3);
    return e[0] = 253, new DataView(e.buffer).setUint16(1, t, !0), e;
  } else if (t <= 4294967295) {
    const e = new Uint8Array(5);
    return e[0] = 254, new DataView(e.buffer).setUint32(1, t, !0), e;
  } else {
    const e = new Uint8Array(9);
    return e[0] = 255, new DataView(e.buffer).setBigUint64(1, BigInt(t), !0), e;
  }
}
const op = 500000000n;
function eu(t) {
  return t >= op;
}
class Sa {
  constructor(e, n) {
    this.id = e, this.value = n;
  }
  encode() {
    const e = new Uint8Array(12);
    return ip(e, this.id, 0), ap(e, this.value, 8), e;
  }
  static decode(e) {
    if (e.length !== 12)
      throw new Error(`invalid data length: expected 12 bytes, got ${e.length}`);
    const n = sp(e, 0), r = cp(e, 8);
    return new Sa(n, r);
  }
}
class Xe {
  constructor(e, n) {
    this.data = e, this.signature = n;
  }
  encode() {
    const e = this.data.encode(), n = new Uint8Array(e.length + this.signature.length);
    return n.set(e), n.set(this.signature, e.length), n;
  }
  static decode(e) {
    if (e.length < 12)
      throw new Error(`invalid data length: expected at least 12 bytes, got ${e.length}`);
    const n = Sa.decode(e.subarray(0, 12)), r = e.subarray(12);
    if (r.length !== 64)
      throw new Error(`invalid signature length: expected 64 bytes, got ${r.length}`);
    return new Xe(n, r);
  }
  static fromString(e) {
    if (!e.startsWith(Xe.HRP))
      throw new Error(`invalid human-readable part: expected ${Xe.HRP} prefix (note '${e}')`);
    const n = e.slice(Xe.HRP.length);
    if (n.length < 103 || n.length > 104)
      throw new Error(`invalid note length: expected 103 or 104 chars, got ${n.length}`);
    const r = Ts.decode(n);
    if (r.length === 0)
      throw new Error("failed to decode base58 string");
    return Xe.decode(new Uint8Array(r));
  }
  toString() {
    return Xe.HRP + Ts.encode(this.encode());
  }
}
Xe.HRP = "arknote";
function ip(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 8).setBigUint64(0, e, !1);
}
function sp(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 8).getBigUint64(0, !1);
}
function ap(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function cp(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
class Je {
  constructor(e, n, r, i, a, c, f, d) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = i, this.arkProvider = a, this.arkServerPublicKey = c, this.offchainTapscript = f, this.boardingTapscript = d;
  }
  static async create(e) {
    const n = Bh(e.network), r = new Uh(e.esploraUrl || Nh[e.network]), i = e.identity.xOnlyPublicKey();
    if (!i)
      throw new Error("Invalid configured public key");
    let a;
    e.arkServerUrl && (a = new vf(e.arkServerUrl));
    const c = pf(i, void 0, n);
    if (a) {
      const f = await a.getInfo();
      if (f.network !== e.network)
        throw new Error(`The Ark Server URL expects ${f.network} but ${e.network} was configured`);
      const d = {
        value: f.unilateralExitDelay,
        type: f.unilateralExitDelay < 512n ? "blocks" : "seconds"
      }, p = {
        value: f.unilateralExitDelay * 2n,
        type: f.unilateralExitDelay * 2n < 512n ? "blocks" : "seconds"
      }, w = et.decode(f.pubkey).slice(1), g = new qr.Script({
        pubKey: i,
        serverPubKey: w,
        csvTimelock: d
      }), b = new qr.Script({
        pubKey: i,
        serverPubKey: w,
        csvTimelock: p
      }), _ = g;
      return new Je(e.identity, n, r, c, a, w, _, b);
    }
    return new Je(e.identity, n, r, c);
  }
  get onchainAddress() {
    return this.onchainP2TR.address || "";
  }
  get boardingAddress() {
    if (!this.boardingTapscript || !this.arkServerPublicKey)
      throw new Error("Boarding address not configured");
    return this.boardingTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  get boardingOnchainAddress() {
    if (!this.boardingTapscript)
      throw new Error("Boarding address not configured");
    return this.boardingTapscript.onchainAddress(this.network);
  }
  get offchainAddress() {
    if (!this.offchainTapscript || !this.arkServerPublicKey)
      throw new Error("Offchain address not configured");
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  getAddress() {
    const e = {
      onchain: this.onchainAddress,
      bip21: Zc.create({
        address: this.onchainAddress
      })
    };
    if (this.arkProvider && this.offchainTapscript && this.boardingTapscript && this.arkServerPublicKey) {
      const n = this.offchainAddress.encode();
      e.offchain = n, e.bip21 = Zc.create({
        address: this.onchainP2TR.address,
        ark: n
      }), e.boarding = this.boardingOnchainAddress;
    }
    return Promise.resolve(e);
  }
  getAddressInfo() {
    if (!this.arkProvider || !this.offchainTapscript || !this.boardingTapscript || !this.arkServerPublicKey)
      throw new Error("Ark provider not configured");
    const e = this.offchainAddress.encode(), n = this.boardingOnchainAddress;
    return Promise.resolve({
      offchain: {
        address: e,
        scripts: {
          exit: [this.offchainTapscript.exitScript],
          forfeit: [this.offchainTapscript.forfeitScript]
        }
      },
      boarding: {
        address: n,
        scripts: {
          exit: [this.boardingTapscript.exitScript],
          forfeit: [this.boardingTapscript.forfeitScript]
        }
      }
    });
  }
  async getBalance() {
    const e = await this.getCoins(), n = e.filter((p) => p.status.confirmed).reduce((p, w) => p + w.value, 0), r = e.filter((p) => !p.status.confirmed).reduce((p, w) => p + w.value, 0), i = n + r;
    let a = 0, c = 0, f = 0;
    if (this.arkProvider) {
      const p = await this.getVirtualCoins();
      a = p.filter((w) => w.virtualStatus.state === "settled").reduce((w, g) => w + g.value, 0), c = p.filter((w) => w.virtualStatus.state === "pending").reduce((w, g) => w + g.value, 0), f = p.filter((w) => w.virtualStatus.state === "swept").reduce((w, g) => w + g.value, 0);
    }
    const d = a + c;
    return {
      onchain: {
        confirmed: n,
        unconfirmed: r,
        total: i
      },
      offchain: {
        swept: f,
        settled: a,
        pending: c,
        total: d
      },
      total: i + d
    };
  }
  async getCoins() {
    const e = await this.getAddress();
    return this.onchainProvider.getCoins(e.onchain);
  }
  async getVtxos() {
    if (!this.arkProvider || !this.offchainTapscript)
      return [];
    const e = await this.getAddress();
    if (!e.offchain)
      return [];
    const { spendableVtxos: n } = await this.arkProvider.getVirtualCoins(e.offchain), r = this.offchainTapscript.encode(), i = this.offchainTapscript.forfeit();
    return n.map((a) => ({
      ...a,
      tapLeafScript: i,
      scripts: r
    }));
  }
  async getVirtualCoins() {
    if (!this.arkProvider)
      return [];
    const e = await this.getAddress();
    return e.offchain ? this.arkProvider.getVirtualCoins(e.offchain).then(({ spendableVtxos: n }) => n) : [];
  }
  async getTransactionHistory() {
    if (!this.arkProvider)
      return [];
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.encode()), { boardingTxs: r, roundsToIgnore: i } = await this.getBoardingTxs(), a = bf(e, n, i), c = [...r, ...a];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (f, d) => f.createdAt === 0 ? -1 : d.createdAt === 0 ? 1 : d.createdAt - f.createdAt
    ), c;
  }
  async getBoardingTxs() {
    if (!this.boardingAddress)
      return { boardingTxs: [], roundsToIgnore: /* @__PURE__ */ new Set() };
    const e = this.boardingOnchainAddress, n = await this.onchainProvider.getTransactions(e), r = [], i = /* @__PURE__ */ new Set();
    for (const f of n)
      for (let d = 0; d < f.vout.length; d++) {
        const p = f.vout[d];
        if (p.scriptpubkey_address === e) {
          const g = (await this.onchainProvider.getTxOutspends(f.txid))[d];
          g != null && g.spent && i.add(g.txid), r.push({
            txid: f.txid,
            vout: d,
            value: Number(p.value),
            status: {
              confirmed: f.status.confirmed,
              block_time: f.status.block_time
            },
            virtualStatus: {
              state: g != null && g.spent ? "swept" : "pending",
              batchTxID: g != null && g.spent ? g.txid : void 0
            },
            createdAt: f.status.confirmed ? new Date(f.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const a = [], c = [];
    for (const f of r) {
      const d = {
        key: {
          boardingTxid: f.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: f.value,
        type: jr.TxReceived,
        settled: f.virtualStatus.state === "swept",
        createdAt: f.status.block_time ? new Date(f.status.block_time * 1e3).getTime() : 0
      };
      f.status.block_time ? c.push(d) : a.push(d);
    }
    return {
      boardingTxs: [...a, ...c],
      roundsToIgnore: i
    };
  }
  async getBoardingUtxos() {
    if (!this.boardingAddress || !this.boardingTapscript)
      throw new Error("Boarding address not configured");
    const e = await this.onchainProvider.getCoins(this.boardingOnchainAddress), n = this.boardingTapscript.encode(), r = this.boardingTapscript.forfeit();
    return e.map((i) => ({
      ...i,
      tapLeafScript: r,
      scripts: n
    }));
  }
  async sendBitcoin(e, n = !0) {
    if (e.amount <= 0)
      throw new Error("Amount must be positive");
    if (e.amount < Je.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return Xr.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || Je.FEE_RATE, i = Math.ceil(174 * r), a = e.amount + i, c = Ih(n, a);
    if (!c.inputs)
      throw new Error("Insufficient funds");
    let f = new Lt();
    for (const p of c.inputs)
      f.addInput({
        txid: p.txid,
        index: p.vout,
        witnessUtxo: {
          script: this.onchainP2TR.script,
          amount: BigInt(p.value)
        },
        tapInternalKey: this.onchainP2TR.tapInternalKey
      });
    return f.addOutputAddress(e.address, BigInt(e.amount), this.network), c.changeAmount > 0 && f.addOutputAddress(this.onchainAddress, BigInt(c.changeAmount), this.network), f = await this.identity.sign(f), f.finalize(), await this.onchainProvider.broadcastTransaction(f.hex);
  }
  async sendOffchain(e, n = !0) {
    if (!this.arkProvider || !this.offchainAddress || !this.offchainTapscript)
      throw new Error("wallet not initialized");
    const r = await this.getVirtualCoins(), i = n ? 0 : Math.ceil(174 * (e.feeRate || Je.FEE_RATE)), a = e.amount + i, c = _h(r, a);
    if (!c || !c.inputs)
      throw new Error("Insufficient funds");
    const f = this.offchainTapscript.forfeit();
    if (!f)
      throw new Error("Selected leaf not found");
    const d = [
      {
        address: e.address,
        amount: BigInt(e.amount)
      }
    ];
    c.changeAmount > 0 && d.push({
      address: this.offchainAddress.encode(),
      amount: BigInt(c.changeAmount)
    });
    const p = this.offchainTapscript.encode();
    let w = np(c.inputs.map((b) => ({
      ...b,
      tapLeafScript: f,
      scripts: p
    })), d);
    w = await this.identity.sign(w);
    const g = ie.encode(w.toPSBT());
    return this.arkProvider.submitVirtualTx(g);
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (e != null && e.inputs) {
      for (const g of e.inputs)
        if (typeof g == "string")
          try {
            Xe.fromString(g);
          } catch {
            throw new Error(`Invalid arknote "${g}"`);
          }
    }
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let g = 0;
      const b = await this.getBoardingUtxos();
      g += b.reduce((A, P) => A + P.value, 0);
      const _ = await this.getVtxos();
      g += _.reduce((A, P) => A + P.value, 0);
      const D = [...b, ..._];
      if (D.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: D,
        outputs: [
          {
            address: this.offchainAddress.encode(),
            amount: BigInt(g)
          }
        ]
      };
    }
    const { requestId: r } = await this.arkProvider.registerInputsForNextRound(e.inputs.map((g) => typeof g == "string" ? g : {
      outpoint: g,
      tapscripts: g.scripts
    })), i = e.outputs.some((g) => this.isOffchainSuitable(g.address));
    let a;
    const c = [];
    i && (a = this.identity.signerSession(), c.push(et.encode(a.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, c);
    const f = setInterval(() => {
      var g;
      (g = this.arkProvider) == null || g.ping(r).catch(p);
    }, 1e3);
    let d = !0;
    const p = () => {
      d && (d = !1, clearInterval(f));
    }, w = new AbortController();
    try {
      const g = this.arkProvider.getEventStream(w.signal);
      let b;
      i || (b = oe.SigningNoncesGenerated);
      const _ = await this.arkProvider.getInfo(), D = en.encode({
        timelock: {
          value: _.batchExpiry,
          type: _.batchExpiry >= 512n ? "seconds" : "blocks"
        },
        pubkeys: [et.decode(_.pubkey).slice(1)]
      }).script, A = Ur(D);
      for await (const P of g) {
        switch (n && n(P), P.type) {
          // the settlement failed
          case oe.Failed:
            if (b === void 0)
              continue;
            throw p(), new Error(P.reason);
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case oe.SigningStart:
            if (b !== void 0)
              continue;
            if (p(), i) {
              if (!a)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningEvent(P, A, a);
            }
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case oe.SigningNoncesGenerated:
            if (b !== oe.SigningStart)
              continue;
            if (p(), i) {
              if (!a)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningNoncesGeneratedEvent(P, a);
            }
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case oe.Finalization:
            if (b !== oe.SigningNoncesGenerated)
              continue;
            p(), await this.handleSettlementFinalizationEvent(P, e.inputs, _);
            break;
          // the settlement is done, last event to be received
          case oe.Finalized:
            if (b !== oe.Finalization)
              continue;
            return w.abort(), P.roundTxid;
        }
        b = P.type;
      }
    } catch (g) {
      throw w.abort(), g;
    }
    throw new Error("Settlement failed");
  }
  async exit(e) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    let n = await this.getVtxos();
    if (e && e.length > 0 && (n = n.filter((c) => e.some((f) => c.txid === f.txid && c.vout === f.vout))), n.length === 0)
      throw new Error("No vtxos to exit");
    const r = /* @__PURE__ */ new Map(), i = [];
    for (const c of n) {
      const f = c.virtualStatus.batchTxID;
      if (!f)
        continue;
      if (!r.has(f)) {
        const w = await this.arkProvider.getRound(f);
        r.set(f, w.vtxoTree);
      }
      const d = r.get(f);
      if (!d)
        throw new Error("Tree not found");
      const p = await d.exitBranch(c.txid, async (w) => (await this.onchainProvider.getTxStatus(w)).confirmed);
      i.push(...p);
    }
    const a = /* @__PURE__ */ new Map();
    for (const c of i) {
      if (a.has(c))
        continue;
      const f = await this.onchainProvider.broadcastTransaction(c);
      a.set(f, !0);
    }
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const i = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    Xh(e.unsignedSettlementTx, i, n);
    const a = ie.decode(e.unsignedSettlementTx), f = Lt.fromPSBT(a).getOutput(0);
    if (!(f != null && f.amount))
      throw new Error("Shared output not found");
    r.init(i, n, f.amount), await this.arkProvider.submitTreeNonces(e.id, et.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, et.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const i = sr(this.network).decode(r.forfeitAddress), a = Yt.encode(i), c = [], f = await this.getVirtualCoins();
    let d = Lt.fromPSBT(ie.decode(e.roundTx)), p = !1, w = !1;
    for (const g of n) {
      if (typeof g == "string")
        continue;
      const b = f.find((L) => L.txid === g.txid && L.vout === g.vout);
      if (!b) {
        p = !0;
        const L = [];
        for (let M = 0; M < d.inputsLength; M++) {
          const tt = d.getInput(M);
          if (!tt.txid || tt.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          et.encode(tt.txid) === g.txid && tt.index === g.vout && (d.updateInput(M, {
            tapLeafScript: [g.tapLeafScript]
          }), L.push(M));
        }
        d = await this.identity.sign(d, L);
        continue;
      }
      w || (Zh(e.roundTx, e.connectors), w = !0);
      const _ = gn.encode(g.tapLeafScript[0]), D = mf(Ea(g.tapLeafScript)), A = Rt.create().addKeySpendInput().addTapscriptInput(
        D.witnessSize(100),
        // TODO: handle conditional script
        g.tapLeafScript[1].length - 1,
        _.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), P = e.connectors.leaves(), H = e.connectorsIndex.get(`${b.txid}:${b.vout}`);
      if (!H)
        throw new Error("Connector outpoint not found");
      let W;
      for (const L of P)
        if (L.txid === H.txid)
          try {
            W = Lt.fromPSBT(ie.decode(L.tx)).getOutput(H.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!W || !W.amount || !W.script)
        throw new Error("Connector output not found");
      let j = Kh({
        connectorInput: H,
        connectorAmount: W.amount,
        feeAmount: A,
        serverPkScript: a,
        connectorPkScript: W.script,
        vtxoAmount: BigInt(b.value),
        vtxoInput: g,
        vtxoPkScript: cr.decode(g.scripts).pkScript
      });
      j.updateInput(1, {
        tapLeafScript: [g.tapLeafScript]
      }), j = await this.identity.sign(j, [1]), c.push(ie.encode(j.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(c, p ? ie.encode(d.toPSBT()) : void 0);
  }
}
Je.DUST_AMOUNT = BigInt(546);
Je.FEE_RATE = 1;
var ct;
(function(t) {
  t.walletInitialized = ($) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: $
  });
  function e($, Z) {
    return {
      type: "ERROR",
      success: !1,
      message: Z,
      id: $
    };
  }
  t.error = e;
  function n($, Z) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: Z,
      id: $
    };
  }
  t.settleEvent = n;
  function r($, Z) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: Z,
      id: $
    };
  }
  t.settleSuccess = r;
  function i($) {
    return $.type === "SETTLE_SUCCESS" && $.success;
  }
  t.isSettleSuccess = i;
  function a($) {
    return $.type === "ADDRESS" && $.success === !0;
  }
  t.isAddress = a;
  function c($, Z) {
    return {
      type: "ADDRESS",
      success: !0,
      addresses: Z,
      id: $
    };
  }
  t.addresses = c;
  function f($) {
    return $.type === "ADDRESS_INFO" && $.success === !0;
  }
  t.isAddressInfo = f;
  function d($, Z) {
    return {
      type: "ADDRESS_INFO",
      success: !0,
      addressInfo: Z,
      id: $
    };
  }
  t.addressInfo = d;
  function p($) {
    return $.type === "BALANCE" && $.success === !0;
  }
  t.isBalance = p;
  function w($, Z) {
    return {
      type: "BALANCE",
      success: !0,
      balance: Z,
      id: $
    };
  }
  t.balance = w;
  function g($) {
    return $.type === "COINS" && $.success === !0;
  }
  t.isCoins = g;
  function b($, Z) {
    return {
      type: "COINS",
      success: !0,
      coins: Z,
      id: $
    };
  }
  t.coins = b;
  function _($) {
    return $.type === "VTXOS" && $.success === !0;
  }
  t.isVtxos = _;
  function D($, Z) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: Z,
      id: $
    };
  }
  t.vtxos = D;
  function A($) {
    return $.type === "VIRTUAL_COINS" && $.success === !0;
  }
  t.isVirtualCoins = A;
  function P($, Z) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: Z,
      id: $
    };
  }
  t.virtualCoins = P;
  function H($) {
    return $.type === "BOARDING_UTXOS" && $.success === !0;
  }
  t.isBoardingUtxos = H;
  function W($, Z) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: Z,
      id: $
    };
  }
  t.boardingUtxos = W;
  function j($) {
    return $.type === "SEND_BITCOIN_SUCCESS" && $.success === !0;
  }
  t.isSendBitcoinSuccess = j;
  function L($, Z) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: Z,
      id: $
    };
  }
  t.sendBitcoinSuccess = L;
  function M($) {
    return $.type === "TRANSACTION_HISTORY" && $.success === !0;
  }
  t.isTransactionHistory = M;
  function tt($, Z) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: Z,
      id: $
    };
  }
  t.transactionHistory = tt;
  function ot($) {
    return $.type === "WALLET_STATUS" && $.success === !0;
  }
  t.isWalletStatus = ot;
  function yt($, Z) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: Z
      },
      id: $
    };
  }
  t.walletStatus = yt;
  function Et($) {
    return $.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = Et;
  function bt($, Z) {
    return {
      type: "CLEAR_RESPONSE",
      success: Z,
      id: $
    };
  }
  t.clearResponse = bt;
  function ut($) {
    return {
      type: "EXIT_SUCCESS",
      success: !0,
      id: $
    };
  }
  t.exitSuccess = ut;
})(ct || (ct = {}));
var re;
(function(t) {
  function e(A) {
    return typeof A == "object" && A !== null && "type" in A;
  }
  t.isBase = e;
  function n(A) {
    return A.type === "INIT_WALLET" && "privateKey" in A && typeof A.privateKey == "string" && "arkServerUrl" in A && typeof A.arkServerUrl == "string" && "network" in A && typeof A.network == "string" && ("arkServerPublicKey" in A ? typeof A.arkServerPublicKey == "string" || A.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(A) {
    return A.type === "SETTLE";
  }
  t.isSettle = r;
  function i(A) {
    return A.type === "GET_ADDRESS";
  }
  t.isGetAddress = i;
  function a(A) {
    return A.type === "GET_ADDRESS_INFO";
  }
  t.isGetAddressInfo = a;
  function c(A) {
    return A.type === "GET_BALANCE";
  }
  t.isGetBalance = c;
  function f(A) {
    return A.type === "GET_COINS";
  }
  t.isGetCoins = f;
  function d(A) {
    return A.type === "GET_VTXOS";
  }
  t.isGetVtxos = d;
  function p(A) {
    return A.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = p;
  function w(A) {
    return A.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = w;
  function g(A) {
    return A.type === "SEND_BITCOIN" && "params" in A && A.params !== null && typeof A.params == "object" && "address" in A.params && typeof A.params.address == "string" && "amount" in A.params && typeof A.params.amount == "number";
  }
  t.isSendBitcoin = g;
  function b(A) {
    return A.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = b;
  function _(A) {
    return A.type === "GET_STATUS";
  }
  t.isGetStatus = _;
  function D(A) {
    return A.type === "EXIT";
  }
  t.isExit = D;
})(re || (re = {}));
class $t {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase($t.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const i = indexedDB.deleteDatabase($t.DB_NAME);
            i.onsuccess = () => e(), i.onerror = () => n(i.error || new Error("Failed to delete database"));
          }, 100);
        }, r.onsuccess = () => {
          e();
        }, r.onerror = () => {
          n(r.error || new Error("Failed to delete database"));
        };
      } catch (r) {
        n(r instanceof Error ? r : new Error("Failed to delete database"));
      }
    });
  }
  async close() {
    this.db && (this.db.close(), this.db = null);
  }
  async open() {
    return new Promise((e, n) => {
      const r = indexedDB.open($t.DB_NAME, $t.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (i) => {
        const a = i.target.result;
        if (!a.objectStoreNames.contains($t.STORE_NAME)) {
          const c = a.createObjectStore($t.STORE_NAME, {
            keyPath: ["txid", "vout"]
          });
          c.createIndex("state", "virtualStatus.state", {
            unique: !1
          }), c.createIndex("spentBy", "spentBy", {
            unique: !1
          });
        }
      };
    });
  }
  async addOrUpdate(e) {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((n, r) => {
      const a = this.db.transaction($t.STORE_NAME, "readwrite").objectStore($t.STORE_NAME), c = e.map((f) => new Promise((d, p) => {
        const w = a.put(f);
        w.onsuccess = () => d(), w.onerror = () => p(w.error);
      }));
      Promise.all(c).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const a = this.db.transaction($t.STORE_NAME, "readwrite").objectStore($t.STORE_NAME).clear();
      a.onsuccess = () => e(), a.onerror = () => n(a.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction($t.STORE_NAME, "readonly").objectStore($t.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const a = this.db.transaction($t.STORE_NAME, "readonly").objectStore($t.STORE_NAME).index("spentBy"), c = a.getAll(IDBKeyRange.only("")), f = a.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((d, p) => {
          c.onsuccess = () => {
            d(c.result);
          }, c.onerror = () => p(c.error);
        }),
        new Promise((d, p) => {
          f.onsuccess = () => {
            d(f.result);
          }, f.onerror = () => p(f.error);
        })
      ]).then(([d, p]) => {
        e({
          spendable: d,
          spent: p
        });
      }).catch(n);
    });
  }
}
$t.DB_NAME = "wallet-db";
$t.STORE_NAME = "vtxos";
$t.DB_VERSION = 1;
class up {
  constructor(e = new $t(), n = () => {
  }) {
    this.vtxoRepository = e, this.messageCallback = n;
  }
  async start(e = !0) {
    self.addEventListener("message", async (n) => {
      await this.handleMessage(n);
    }), e && (self.addEventListener("install", () => {
      self.skipWaiting();
    }), self.addEventListener("activate", () => {
      self.clients.claim();
    }));
  }
  async clear() {
    this.vtxoSubscription && this.vtxoSubscription.abort(), await this.vtxoRepository.close(), this.wallet = void 0, this.arkProvider = void 0, this.vtxoSubscription = void 0;
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const e = await this.wallet.getAddressInfo();
    if (!e.offchain)
      return;
    await this.vtxoRepository.open();
    const { spendableVtxos: n, spentVtxos: r } = await this.arkProvider.getVirtualCoins(e.offchain.address), i = this.wallet.offchainTapscript.encode(), a = this.wallet.offchainTapscript.forfeit(), c = [...n, ...r].map((f) => ({
      ...f,
      tapLeafScript: a,
      scripts: i
    }));
    await this.vtxoRepository.addOrUpdate(c), this.processVtxoSubscription(e.offchain);
  }
  async processVtxoSubscription({ address: e, scripts: n }) {
    try {
      const r = [...n.exit, ...n.forfeit], a = qr.Script.decode(r).findLeaf(n.forfeit[0]), c = new AbortController(), f = this.arkProvider.subscribeForAddress(e, c.signal);
      this.vtxoSubscription = c;
      for await (const d of f) {
        const p = [...d.newVtxos, ...d.spentVtxos];
        if (p.length === 0)
          continue;
        const w = p.map((g) => ({
          ...g,
          tapLeafScript: a,
          scripts: r
        }));
        await this.vtxoRepository.addOrUpdate(w);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    var n;
    this.clear(), re.isBase(e.data) && ((n = e.source) == null || n.postMessage(ct.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, i, a;
    const n = e.data;
    if (!re.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new vf(n.arkServerUrl), this.wallet = await Je.create({
        network: n.network,
        identity: ni.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (i = e.source) == null || i.postMessage(ct.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (c) {
      console.error("Error initializing wallet:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(ct.error(n.id, f));
    }
  }
  async handleSettle(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
        return;
      }
      const f = await this.wallet.settle(n.params, (d) => {
        var p;
        (p = e.source) == null || p.postMessage(ct.settleEvent(n.id, d));
      });
      (a = e.source) == null || a.postMessage(ct.settleSuccess(n.id, f));
    } catch (f) {
      console.error("Error settling:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleSendBitcoin(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (a = e.source) == null || a.postMessage(ct.sendBitcoinSuccess(n.id, f));
    } catch (f) {
      console.error("Error sending bitcoin:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetAddress(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getAddress();
      (a = e.source) == null || a.postMessage(ct.addresses(n.id, f));
    } catch (f) {
      console.error("Error getting address:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetAddressInfo(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetAddressInfo(n)) {
      console.error("Invalid GET_ADDRESS_INFO message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_ADDRESS_INFO message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getAddressInfo();
      (a = e.source) == null || a.postMessage(ct.addressInfo(n.id, f));
    } catch (f) {
      console.error("Error getting address info:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetBalance(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getCoins(), d = f.filter((P) => P.status.confirmed).reduce((P, H) => P + H.value, 0), p = f.filter((P) => !P.status.confirmed).reduce((P, H) => P + H.value, 0), w = d + p, g = await this.vtxoRepository.getSpendableVtxos(), b = g.reduce((P, H) => H.virtualStatus.state === "settled" ? P + H.value : P, 0), _ = g.reduce((P, H) => H.virtualStatus.state === "pending" ? P + H.value : P, 0), D = g.reduce((P, H) => H.virtualStatus.state === "swept" ? P + H.value : P, 0), A = b + _ + D;
      (a = e.source) == null || a.postMessage(ct.balance(n.id, {
        onchain: {
          confirmed: d,
          unconfirmed: p,
          total: w
        },
        offchain: {
          swept: D,
          settled: b,
          pending: _,
          total: A
        },
        total: w + A
      }));
    } catch (f) {
      console.error("Error getting balance:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetCoins(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getCoins();
      (a = e.source) == null || a.postMessage(ct.coins(n.id, f));
    } catch (f) {
      console.error("Error getting coins:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetVtxos(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.vtxoRepository.getSpendableVtxos();
      (a = e.source) == null || a.postMessage(ct.vtxos(n.id, f));
    } catch (f) {
      console.error("Error getting vtxos:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getBoardingUtxos();
      (a = e.source) == null || a.postMessage(ct.boardingUtxos(n.id, f));
    } catch (f) {
      console.error("Error getting boarding utxos:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: f, roundsToIgnore: d } = await this.wallet.getBoardingTxs(), { spendable: p, spent: w } = await this.vtxoRepository.getAllVtxos(), g = bf(p, w, d), b = [...f, ...g];
      b.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (_, D) => _.createdAt === 0 ? -1 : D.createdAt === 0 ? 1 : D.createdAt - _.createdAt
      ), (a = e.source) == null || a.postMessage(ct.transactionHistory(n.id, b));
    } catch (f) {
      console.error("Error getting transaction history:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleGetStatus(e) {
    var r, i;
    const n = e.data;
    if (!re.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (i = e.source) == null || i.postMessage(ct.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleExit(e) {
    var r, i, a, c;
    const n = e.data;
    if (!re.isExit(n)) {
      console.error("Invalid EXIT message format", n), (r = e.source) == null || r.postMessage(ct.error(n.id, "Invalid EXIT message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(ct.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      await this.wallet.exit(n.outpoints), (a = e.source) == null || a.postMessage(ct.exitSuccess(n.id));
    } catch (f) {
      console.error("Error exiting:", f);
      const d = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(ct.error(n.id, d));
    }
  }
  async handleMessage(e) {
    var r;
    this.messageCallback(e);
    const n = e.data;
    if (!re.isBase(n)) {
      console.warn("Invalid message format", JSON.stringify(n));
      return;
    }
    switch (n.type) {
      case "INIT_WALLET": {
        await this.handleInitWallet(e);
        break;
      }
      case "SETTLE": {
        await this.handleSettle(e);
        break;
      }
      case "SEND_BITCOIN": {
        await this.handleSendBitcoin(e);
        break;
      }
      case "GET_ADDRESS": {
        await this.handleGetAddress(e);
        break;
      }
      case "GET_ADDRESS_INFO": {
        await this.handleGetAddressInfo(e);
        break;
      }
      case "GET_BALANCE": {
        await this.handleGetBalance(e);
        break;
      }
      case "GET_COINS": {
        await this.handleGetCoins(e);
        break;
      }
      case "GET_VTXOS": {
        await this.handleGetVtxos(e);
        break;
      }
      case "GET_BOARDING_UTXOS": {
        await this.handleGetBoardingUtxos(e);
        break;
      }
      case "GET_TRANSACTION_HISTORY": {
        await this.handleGetTransactionHistory(e);
        break;
      }
      case "GET_STATUS": {
        await this.handleGetStatus(e);
        break;
      }
      case "EXIT": {
        await this.handleExit(e);
        break;
      }
      case "CLEAR": {
        await this.handleClear(e);
        break;
      }
      default:
        (r = e.source) == null || r.postMessage(ct.error(n.id, "Unknown message type"));
    }
  }
}
var Do = { exports: {} }, fp = Do.exports, nu;
function lp() {
  return nu || (nu = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(fp, function() {
      var n = function(o, s) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(u, l) {
          u.__proto__ = l;
        } || function(u, l) {
          for (var h in l) Object.prototype.hasOwnProperty.call(l, h) && (u[h] = l[h]);
        })(o, s);
      }, r = function() {
        return (r = Object.assign || function(o) {
          for (var s, u = 1, l = arguments.length; u < l; u++) for (var h in s = arguments[u]) Object.prototype.hasOwnProperty.call(s, h) && (o[h] = s[h]);
          return o;
        }).apply(this, arguments);
      };
      function i(o, s, u) {
        for (var l, h = 0, y = s.length; h < y; h++) !l && h in s || ((l = l || Array.prototype.slice.call(s, 0, h))[h] = s[h]);
        return o.concat(l || Array.prototype.slice.call(s));
      }
      var a = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : Nd, c = Object.keys, f = Array.isArray;
      function d(o, s) {
        return typeof s != "object" || c(s).forEach(function(u) {
          o[u] = s[u];
        }), o;
      }
      typeof Promise > "u" || a.Promise || (a.Promise = Promise);
      var p = Object.getPrototypeOf, w = {}.hasOwnProperty;
      function g(o, s) {
        return w.call(o, s);
      }
      function b(o, s) {
        typeof s == "function" && (s = s(p(o))), (typeof Reflect > "u" ? c : Reflect.ownKeys)(s).forEach(function(u) {
          D(o, u, s[u]);
        });
      }
      var _ = Object.defineProperty;
      function D(o, s, u, l) {
        _(o, s, d(u && g(u, "get") && typeof u.get == "function" ? { get: u.get, set: u.set, configurable: !0 } : { value: u, configurable: !0, writable: !0 }, l));
      }
      function A(o) {
        return { from: function(s) {
          return o.prototype = Object.create(s.prototype), D(o.prototype, "constructor", o), { extend: b.bind(null, o.prototype) };
        } };
      }
      var P = Object.getOwnPropertyDescriptor, H = [].slice;
      function W(o, s, u) {
        return H.call(o, s, u);
      }
      function j(o, s) {
        return s(o);
      }
      function L(o) {
        if (!o) throw new Error("Assertion Failed");
      }
      function M(o) {
        a.setImmediate ? setImmediate(o) : setTimeout(o, 0);
      }
      function tt(o, s) {
        if (typeof s == "string" && g(o, s)) return o[s];
        if (!s) return o;
        if (typeof s != "string") {
          for (var u = [], l = 0, h = s.length; l < h; ++l) {
            var y = tt(o, s[l]);
            u.push(y);
          }
          return u;
        }
        var m = s.indexOf(".");
        if (m !== -1) {
          var v = o[s.substr(0, m)];
          return v == null ? void 0 : tt(v, s.substr(m + 1));
        }
      }
      function ot(o, s, u) {
        if (o && s !== void 0 && !("isFrozen" in Object && Object.isFrozen(o))) if (typeof s != "string" && "length" in s) {
          L(typeof u != "string" && "length" in u);
          for (var l = 0, h = s.length; l < h; ++l) ot(o, s[l], u[l]);
        } else {
          var y, m, v = s.indexOf(".");
          v !== -1 ? (y = s.substr(0, v), (m = s.substr(v + 1)) === "" ? u === void 0 ? f(o) && !isNaN(parseInt(y)) ? o.splice(y, 1) : delete o[y] : o[y] = u : ot(v = !(v = o[y]) || !g(o, y) ? o[y] = {} : v, m, u)) : u === void 0 ? f(o) && !isNaN(parseInt(s)) ? o.splice(s, 1) : delete o[s] : o[s] = u;
        }
      }
      function yt(o) {
        var s, u = {};
        for (s in o) g(o, s) && (u[s] = o[s]);
        return u;
      }
      var Et = [].concat;
      function bt(o) {
        return Et.apply([], o);
      }
      var Sn = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(bt([8, 16, 32, 64].map(function(o) {
        return ["Int", "Uint", "Float"].map(function(s) {
          return s + o + "Array";
        });
      }))).filter(function(o) {
        return a[o];
      }), ut = new Set(Sn.map(function(o) {
        return a[o];
      })), $ = null;
      function Z(o) {
        return $ = /* @__PURE__ */ new WeakMap(), o = function s(u) {
          if (!u || typeof u != "object") return u;
          var l = $.get(u);
          if (l) return l;
          if (f(u)) {
            l = [], $.set(u, l);
            for (var h = 0, y = u.length; h < y; ++h) l.push(s(u[h]));
          } else if (ut.has(u.constructor)) l = u;
          else {
            var m, v = p(u);
            for (m in l = v === Object.prototype ? {} : Object.create(v), $.set(u, l), u) g(u, m) && (l[m] = s(u[m]));
          }
          return l;
        }(o), $ = null, o;
      }
      var Ht = {}.toString;
      function X(o) {
        return Ht.call(o).slice(8, -1);
      }
      var G = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", at = typeof G == "symbol" ? function(o) {
        var s;
        return o != null && (s = o[G]) && s.apply(o);
      } : function() {
        return null;
      };
      function dt(o, s) {
        return s = o.indexOf(s), 0 <= s && o.splice(s, 1), 0 <= s;
      }
      var ft = {};
      function lt(o) {
        var s, u, l, h;
        if (arguments.length === 1) {
          if (f(o)) return o.slice();
          if (this === ft && typeof o == "string") return [o];
          if (h = at(o)) {
            for (u = []; !(l = h.next()).done; ) u.push(l.value);
            return u;
          }
          if (o == null) return [o];
          if (typeof (s = o.length) != "number") return [o];
          for (u = new Array(s); s--; ) u[s] = o[s];
          return u;
        }
        for (s = arguments.length, u = new Array(s); s--; ) u[s] = arguments[s];
        return u;
      }
      var kt = typeof Symbol < "u" ? function(o) {
        return o[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, lr = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], ke = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(lr), Xt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function Jt(o, s) {
        this.name = o, this.message = s;
      }
      function de(o, s) {
        return o + ". Errors: " + Object.keys(s).map(function(u) {
          return s[u].toString();
        }).filter(function(u, l, h) {
          return h.indexOf(u) === l;
        }).join(`
`);
      }
      function Kt(o, s, u, l) {
        this.failures = s, this.failedKeys = l, this.successCount = u, this.message = de(o, s);
      }
      function me(o, s) {
        this.name = "BulkError", this.failures = Object.keys(s).map(function(u) {
          return s[u];
        }), this.failuresByPos = s, this.message = de(o, this.failures);
      }
      A(Jt).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), A(Kt).from(Jt), A(me).from(Jt);
      var Se = ke.reduce(function(o, s) {
        return o[s] = s + "Error", o;
      }, {}), ur = Jt, rt = ke.reduce(function(o, s) {
        var u = s + "Error";
        function l(h, y) {
          this.name = u, h ? typeof h == "string" ? (this.message = "".concat(h).concat(y ? `
 ` + y : ""), this.inner = y || null) : typeof h == "object" && (this.message = "".concat(h.name, " ").concat(h.message), this.inner = h) : (this.message = Xt[s] || u, this.inner = null);
        }
        return A(l).from(ur), o[s] = l, o;
      }, {});
      rt.Syntax = SyntaxError, rt.Type = TypeError, rt.Range = RangeError;
      var je = lr.reduce(function(o, s) {
        return o[s + "Error"] = rt[s], o;
      }, {}), nn = ke.reduce(function(o, s) {
        return ["Syntax", "Type", "Range"].indexOf(s) === -1 && (o[s + "Error"] = rt[s]), o;
      }, {});
      function xt() {
      }
      function be(o) {
        return o;
      }
      function xn(o, s) {
        return o == null || o === be ? s : function(u) {
          return s(o(u));
        };
      }
      function ve(o, s) {
        return function() {
          o.apply(this, arguments), s.apply(this, arguments);
        };
      }
      function rn(o, s) {
        return o === xt ? s : function() {
          var u = o.apply(this, arguments);
          u !== void 0 && (arguments[0] = u);
          var l = this.onsuccess, h = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var y = s.apply(this, arguments);
          return l && (this.onsuccess = this.onsuccess ? ve(l, this.onsuccess) : l), h && (this.onerror = this.onerror ? ve(h, this.onerror) : h), y !== void 0 ? y : u;
        };
      }
      function Sf(o, s) {
        return o === xt ? s : function() {
          o.apply(this, arguments);
          var u = this.onsuccess, l = this.onerror;
          this.onsuccess = this.onerror = null, s.apply(this, arguments), u && (this.onsuccess = this.onsuccess ? ve(u, this.onsuccess) : u), l && (this.onerror = this.onerror ? ve(l, this.onerror) : l);
        };
      }
      function kf(o, s) {
        return o === xt ? s : function(u) {
          var l = o.apply(this, arguments);
          d(u, l);
          var h = this.onsuccess, y = this.onerror;
          return this.onsuccess = null, this.onerror = null, u = s.apply(this, arguments), h && (this.onsuccess = this.onsuccess ? ve(h, this.onsuccess) : h), y && (this.onerror = this.onerror ? ve(y, this.onerror) : y), l === void 0 ? u === void 0 ? void 0 : u : d(l, u);
        };
      }
      function Tf(o, s) {
        return o === xt ? s : function() {
          return s.apply(this, arguments) !== !1 && o.apply(this, arguments);
        };
      }
      function wi(o, s) {
        return o === xt ? s : function() {
          var u = o.apply(this, arguments);
          if (u && typeof u.then == "function") {
            for (var l = this, h = arguments.length, y = new Array(h); h--; ) y[h] = arguments[h];
            return u.then(function() {
              return s.apply(l, y);
            });
          }
          return s.apply(this, arguments);
        };
      }
      nn.ModifyError = Kt, nn.DexieError = Jt, nn.BulkError = me;
      var De = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Ta(o) {
        De = o;
      }
      var fr = {}, Aa = 100, Sn = typeof Promise > "u" ? [] : function() {
        var o = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [o, p(o), o];
        var s = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [s, p(s), o];
      }(), lr = Sn[0], ke = Sn[1], Sn = Sn[2], ke = ke && ke.then, kn = lr && lr.constructor, mi = !!Sn, dr = function(o, s) {
        hr.push([o, s]), Qr && (queueMicrotask(If), Qr = !1);
      }, bi = !0, Qr = !0, Tn = [], Jr = [], vi = be, on = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: xt, pgp: !1, env: {}, finalize: xt }, it = on, hr = [], An = 0, to = [];
      function J(o) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var s = this._PSD = it;
        if (typeof o != "function") {
          if (o !== fr) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && xi(this, this._value));
        }
        this._state = null, this._value = null, ++s.ref, function u(l, h) {
          try {
            h(function(y) {
              if (l._state === null) {
                if (y === l) throw new TypeError("A promise cannot be resolved with itself.");
                var m = l._lib && Fn();
                y && typeof y.then == "function" ? u(l, function(v, x) {
                  y instanceof J ? y._then(v, x) : y.then(v, x);
                }) : (l._state = !0, l._value = y, _a(l)), m && Vn();
              }
            }, xi.bind(null, l));
          } catch (y) {
            xi(l, y);
          }
        }(this, o);
      }
      var Ei = { get: function() {
        var o = it, s = oo;
        function u(l, h) {
          var y = this, m = !o.global && (o !== it || s !== oo), v = m && !an(), x = new J(function(k, B) {
            Si(y, new Ia(Ca(l, o, m, v), Ca(h, o, m, v), k, B, o));
          });
          return this._consoleTask && (x._consoleTask = this._consoleTask), x;
        }
        return u.prototype = fr, u;
      }, set: function(o) {
        D(this, "then", o && o.prototype === fr ? Ei : { get: function() {
          return o;
        }, set: Ei.set });
      } };
      function Ia(o, s, u, l, h) {
        this.onFulfilled = typeof o == "function" ? o : null, this.onRejected = typeof s == "function" ? s : null, this.resolve = u, this.reject = l, this.psd = h;
      }
      function xi(o, s) {
        var u, l;
        Jr.push(s), o._state === null && (u = o._lib && Fn(), s = vi(s), o._state = !1, o._value = s, l = o, Tn.some(function(h) {
          return h._value === l._value;
        }) || Tn.push(l), _a(o), u && Vn());
      }
      function _a(o) {
        var s = o._listeners;
        o._listeners = [];
        for (var u = 0, l = s.length; u < l; ++u) Si(o, s[u]);
        var h = o._PSD;
        --h.ref || h.finalize(), An === 0 && (++An, dr(function() {
          --An == 0 && ki();
        }, []));
      }
      function Si(o, s) {
        if (o._state !== null) {
          var u = o._state ? s.onFulfilled : s.onRejected;
          if (u === null) return (o._state ? s.resolve : s.reject)(o._value);
          ++s.psd.ref, ++An, dr(Af, [u, o, s]);
        } else o._listeners.push(s);
      }
      function Af(o, s, u) {
        try {
          var l, h = s._value;
          !s._state && Jr.length && (Jr = []), l = De && s._consoleTask ? s._consoleTask.run(function() {
            return o(h);
          }) : o(h), s._state || Jr.indexOf(h) !== -1 || function(y) {
            for (var m = Tn.length; m; ) if (Tn[--m]._value === y._value) return Tn.splice(m, 1);
          }(s), u.resolve(l);
        } catch (y) {
          u.reject(y);
        } finally {
          --An == 0 && ki(), --u.psd.ref || u.psd.finalize();
        }
      }
      function If() {
        In(on, function() {
          Fn() && Vn();
        });
      }
      function Fn() {
        var o = bi;
        return Qr = bi = !1, o;
      }
      function Vn() {
        var o, s, u;
        do
          for (; 0 < hr.length; ) for (o = hr, hr = [], u = o.length, s = 0; s < u; ++s) {
            var l = o[s];
            l[0].apply(null, l[1]);
          }
        while (0 < hr.length);
        Qr = bi = !0;
      }
      function ki() {
        var o = Tn;
        Tn = [], o.forEach(function(l) {
          l._PSD.onunhandled.call(null, l._value, l);
        });
        for (var s = to.slice(0), u = s.length; u; ) s[--u]();
      }
      function eo(o) {
        return new J(fr, !1, o);
      }
      function Ct(o, s) {
        var u = it;
        return function() {
          var l = Fn(), h = it;
          try {
            return cn(u, !0), o.apply(this, arguments);
          } catch (y) {
            s && s(y);
          } finally {
            cn(h, !1), l && Vn();
          }
        };
      }
      b(J.prototype, { then: Ei, _then: function(o, s) {
        Si(this, new Ia(null, null, o, s, it));
      }, catch: function(o) {
        if (arguments.length === 1) return this.then(null, o);
        var s = o, u = arguments[1];
        return typeof s == "function" ? this.then(null, function(l) {
          return (l instanceof s ? u : eo)(l);
        }) : this.then(null, function(l) {
          return (l && l.name === s ? u : eo)(l);
        });
      }, finally: function(o) {
        return this.then(function(s) {
          return J.resolve(o()).then(function() {
            return s;
          });
        }, function(s) {
          return J.resolve(o()).then(function() {
            return eo(s);
          });
        });
      }, timeout: function(o, s) {
        var u = this;
        return o < 1 / 0 ? new J(function(l, h) {
          var y = setTimeout(function() {
            return h(new rt.Timeout(s));
          }, o);
          u.then(l, h).finally(clearTimeout.bind(null, y));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && D(J.prototype, Symbol.toStringTag, "Dexie.Promise"), on.env = Ba(), b(J, { all: function() {
        var o = lt.apply(null, arguments).map(io);
        return new J(function(s, u) {
          o.length === 0 && s([]);
          var l = o.length;
          o.forEach(function(h, y) {
            return J.resolve(h).then(function(m) {
              o[y] = m, --l || s(o);
            }, u);
          });
        });
      }, resolve: function(o) {
        return o instanceof J ? o : o && typeof o.then == "function" ? new J(function(s, u) {
          o.then(s, u);
        }) : new J(fr, !0, o);
      }, reject: eo, race: function() {
        var o = lt.apply(null, arguments).map(io);
        return new J(function(s, u) {
          o.map(function(l) {
            return J.resolve(l).then(s, u);
          });
        });
      }, PSD: { get: function() {
        return it;
      }, set: function(o) {
        return it = o;
      } }, totalEchoes: { get: function() {
        return oo;
      } }, newPSD: sn, usePSD: In, scheduler: { get: function() {
        return dr;
      }, set: function(o) {
        dr = o;
      } }, rejectionMapper: { get: function() {
        return vi;
      }, set: function(o) {
        vi = o;
      } }, follow: function(o, s) {
        return new J(function(u, l) {
          return sn(function(h, y) {
            var m = it;
            m.unhandleds = [], m.onunhandled = y, m.finalize = ve(function() {
              var v, x = this;
              v = function() {
                x.unhandleds.length === 0 ? h() : y(x.unhandleds[0]);
              }, to.push(function k() {
                v(), to.splice(to.indexOf(k), 1);
              }), ++An, dr(function() {
                --An == 0 && ki();
              }, []);
            }, m.finalize), o();
          }, s, u, l);
        });
      } }), kn && (kn.allSettled && D(J, "allSettled", function() {
        var o = lt.apply(null, arguments).map(io);
        return new J(function(s) {
          o.length === 0 && s([]);
          var u = o.length, l = new Array(u);
          o.forEach(function(h, y) {
            return J.resolve(h).then(function(m) {
              return l[y] = { status: "fulfilled", value: m };
            }, function(m) {
              return l[y] = { status: "rejected", reason: m };
            }).then(function() {
              return --u || s(l);
            });
          });
        });
      }), kn.any && typeof AggregateError < "u" && D(J, "any", function() {
        var o = lt.apply(null, arguments).map(io);
        return new J(function(s, u) {
          o.length === 0 && u(new AggregateError([]));
          var l = o.length, h = new Array(l);
          o.forEach(function(y, m) {
            return J.resolve(y).then(function(v) {
              return s(v);
            }, function(v) {
              h[m] = v, --l || u(new AggregateError(h));
            });
          });
        });
      }), kn.withResolvers && (J.withResolvers = kn.withResolvers));
      var qt = { awaits: 0, echoes: 0, id: 0 }, _f = 0, no = [], ro = 0, oo = 0, Bf = 0;
      function sn(o, s, u, l) {
        var h = it, y = Object.create(h);
        return y.parent = h, y.ref = 0, y.global = !1, y.id = ++Bf, on.env, y.env = mi ? { Promise: J, PromiseProp: { value: J, configurable: !0, writable: !0 }, all: J.all, race: J.race, allSettled: J.allSettled, any: J.any, resolve: J.resolve, reject: J.reject } : {}, s && d(y, s), ++h.ref, y.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, l = In(y, o, u, l), y.ref === 0 && y.finalize(), l;
      }
      function Hn() {
        return qt.id || (qt.id = ++_f), ++qt.awaits, qt.echoes += Aa, qt.id;
      }
      function an() {
        return !!qt.awaits && (--qt.awaits == 0 && (qt.id = 0), qt.echoes = qt.awaits * Aa, !0);
      }
      function io(o) {
        return qt.echoes && o && o.constructor === kn ? (Hn(), o.then(function(s) {
          return an(), s;
        }, function(s) {
          return an(), Ot(s);
        })) : o;
      }
      function Cf() {
        var o = no[no.length - 1];
        no.pop(), cn(o, !1);
      }
      function cn(o, s) {
        var u, l = it;
        (s ? !qt.echoes || ro++ && o === it : !ro || --ro && o === it) || queueMicrotask(s ? (function(h) {
          ++oo, qt.echoes && --qt.echoes != 0 || (qt.echoes = qt.awaits = qt.id = 0), no.push(it), cn(h, !0);
        }).bind(null, o) : Cf), o !== it && (it = o, l === on && (on.env = Ba()), mi && (u = on.env.Promise, s = o.env, (l.global || o.global) && (Object.defineProperty(a, "Promise", s.PromiseProp), u.all = s.all, u.race = s.race, u.resolve = s.resolve, u.reject = s.reject, s.allSettled && (u.allSettled = s.allSettled), s.any && (u.any = s.any))));
      }
      function Ba() {
        var o = a.Promise;
        return mi ? { Promise: o, PromiseProp: Object.getOwnPropertyDescriptor(a, "Promise"), all: o.all, race: o.race, allSettled: o.allSettled, any: o.any, resolve: o.resolve, reject: o.reject } : {};
      }
      function In(o, s, u, l, h) {
        var y = it;
        try {
          return cn(o, !0), s(u, l, h);
        } finally {
          cn(y, !1);
        }
      }
      function Ca(o, s, u, l) {
        return typeof o != "function" ? o : function() {
          var h = it;
          u && Hn(), cn(s, !0);
          try {
            return o.apply(this, arguments);
          } finally {
            cn(h, !1), l && queueMicrotask(an);
          }
        };
      }
      function Ti(o) {
        Promise === kn && qt.echoes === 0 ? ro === 0 ? o() : enqueueNativeMicroTask(o) : setTimeout(o, 0);
      }
      ("" + ke).indexOf("[native code]") === -1 && (Hn = an = xt);
      var Ot = J.reject, _n = "￿", Ge = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Na = "String expected.", qn = [], so = "__dbnames", Ai = "readonly", Ii = "readwrite";
      function Bn(o, s) {
        return o ? s ? function() {
          return o.apply(this, arguments) && s.apply(this, arguments);
        } : o : s;
      }
      var Ua = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function ao(o) {
        return typeof o != "string" || /\./.test(o) ? function(s) {
          return s;
        } : function(s) {
          return s[o] === void 0 && o in s && delete (s = Z(s))[o], s;
        };
      }
      function Ra() {
        throw rt.Type();
      }
      function vt(o, s) {
        try {
          var u = Oa(o), l = Oa(s);
          if (u !== l) return u === "Array" ? 1 : l === "Array" ? -1 : u === "binary" ? 1 : l === "binary" ? -1 : u === "string" ? 1 : l === "string" ? -1 : u === "Date" ? 1 : l !== "Date" ? NaN : -1;
          switch (u) {
            case "number":
            case "Date":
            case "string":
              return s < o ? 1 : o < s ? -1 : 0;
            case "binary":
              return function(h, y) {
                for (var m = h.length, v = y.length, x = m < v ? m : v, k = 0; k < x; ++k) if (h[k] !== y[k]) return h[k] < y[k] ? -1 : 1;
                return m === v ? 0 : m < v ? -1 : 1;
              }(Pa(o), Pa(s));
            case "Array":
              return function(h, y) {
                for (var m = h.length, v = y.length, x = m < v ? m : v, k = 0; k < x; ++k) {
                  var B = vt(h[k], y[k]);
                  if (B !== 0) return B;
                }
                return m === v ? 0 : m < v ? -1 : 1;
              }(o, s);
          }
        } catch {
        }
        return NaN;
      }
      function Oa(o) {
        var s = typeof o;
        return s != "object" ? s : ArrayBuffer.isView(o) ? "binary" : (o = X(o), o === "ArrayBuffer" ? "binary" : o);
      }
      function Pa(o) {
        return o instanceof Uint8Array ? o : ArrayBuffer.isView(o) ? new Uint8Array(o.buffer, o.byteOffset, o.byteLength) : new Uint8Array(o);
      }
      var La = (At.prototype._trans = function(o, s, u) {
        var l = this._tx || it.trans, h = this.name, y = De && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(o === "readonly" ? "read" : "write", " ").concat(this.name));
        function m(k, B, E) {
          if (!E.schema[h]) throw new rt.NotFound("Table " + h + " not part of transaction");
          return s(E.idbtrans, E);
        }
        var v = Fn();
        try {
          var x = l && l.db._novip === this.db._novip ? l === it.trans ? l._promise(o, m, u) : sn(function() {
            return l._promise(o, m, u);
          }, { trans: l, transless: it.transless || it }) : function k(B, E, N, S) {
            if (B.idbdb && (B._state.openComplete || it.letThrough || B._vip)) {
              var I = B._createTransaction(E, N, B._dbSchema);
              try {
                I.create(), B._state.PR1398_maxLoop = 3;
              } catch (C) {
                return C.name === Se.InvalidState && B.isOpen() && 0 < --B._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), B.close({ disableAutoOpen: !1 }), B.open().then(function() {
                  return k(B, E, N, S);
                })) : Ot(C);
              }
              return I._promise(E, function(C, T) {
                return sn(function() {
                  return it.trans = I, S(C, T, I);
                });
              }).then(function(C) {
                if (E === "readwrite") try {
                  I.idbtrans.commit();
                } catch {
                }
                return E === "readonly" ? C : I._completion.then(function() {
                  return C;
                });
              });
            }
            if (B._state.openComplete) return Ot(new rt.DatabaseClosed(B._state.dbOpenError));
            if (!B._state.isBeingOpened) {
              if (!B._state.autoOpen) return Ot(new rt.DatabaseClosed());
              B.open().catch(xt);
            }
            return B._state.dbReadyPromise.then(function() {
              return k(B, E, N, S);
            });
          }(this.db, o, [this.name], m);
          return y && (x._consoleTask = y, x = x.catch(function(k) {
            return console.trace(k), Ot(k);
          })), x;
        } finally {
          v && Vn();
        }
      }, At.prototype.get = function(o, s) {
        var u = this;
        return o && o.constructor === Object ? this.where(o).first(s) : o == null ? Ot(new rt.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(l) {
          return u.core.get({ trans: l, key: o }).then(function(h) {
            return u.hook.reading.fire(h);
          });
        }).then(s);
      }, At.prototype.where = function(o) {
        if (typeof o == "string") return new this.db.WhereClause(this, o);
        if (f(o)) return new this.db.WhereClause(this, "[".concat(o.join("+"), "]"));
        var s = c(o);
        if (s.length === 1) return this.where(s[0]).equals(o[s[0]]);
        var u = this.schema.indexes.concat(this.schema.primKey).filter(function(v) {
          if (v.compound && s.every(function(k) {
            return 0 <= v.keyPath.indexOf(k);
          })) {
            for (var x = 0; x < s.length; ++x) if (s.indexOf(v.keyPath[x]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(v, x) {
          return v.keyPath.length - x.keyPath.length;
        })[0];
        if (u && this.db._maxKey !== _n) {
          var y = u.keyPath.slice(0, s.length);
          return this.where(y).equals(y.map(function(x) {
            return o[x];
          }));
        }
        !u && De && console.warn("The query ".concat(JSON.stringify(o), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(s.join("+"), "]"));
        var l = this.schema.idxByName;
        function h(v, x) {
          return vt(v, x) === 0;
        }
        var m = s.reduce(function(E, x) {
          var k = E[0], B = E[1], E = l[x], N = o[x];
          return [k || E, k || !E ? Bn(B, E && E.multi ? function(S) {
            return S = tt(S, x), f(S) && S.some(function(I) {
              return h(N, I);
            });
          } : function(S) {
            return h(N, tt(S, x));
          }) : B];
        }, [null, null]), y = m[0], m = m[1];
        return y ? this.where(y.name).equals(o[y.keyPath]).filter(m) : u ? this.filter(m) : this.where(s).equals("");
      }, At.prototype.filter = function(o) {
        return this.toCollection().and(o);
      }, At.prototype.count = function(o) {
        return this.toCollection().count(o);
      }, At.prototype.offset = function(o) {
        return this.toCollection().offset(o);
      }, At.prototype.limit = function(o) {
        return this.toCollection().limit(o);
      }, At.prototype.each = function(o) {
        return this.toCollection().each(o);
      }, At.prototype.toArray = function(o) {
        return this.toCollection().toArray(o);
      }, At.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, At.prototype.orderBy = function(o) {
        return new this.db.Collection(new this.db.WhereClause(this, f(o) ? "[".concat(o.join("+"), "]") : o));
      }, At.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, At.prototype.mapToClass = function(o) {
        var s, u = this.db, l = this.name;
        function h() {
          return s !== null && s.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = o).prototype instanceof Ra && (function(x, k) {
          if (typeof k != "function" && k !== null) throw new TypeError("Class extends value " + String(k) + " is not a constructor or null");
          function B() {
            this.constructor = x;
          }
          n(x, k), x.prototype = k === null ? Object.create(k) : (B.prototype = k.prototype, new B());
        }(h, s = o), Object.defineProperty(h.prototype, "db", { get: function() {
          return u;
        }, enumerable: !1, configurable: !0 }), h.prototype.table = function() {
          return l;
        }, o = h);
        for (var y = /* @__PURE__ */ new Set(), m = o.prototype; m; m = p(m)) Object.getOwnPropertyNames(m).forEach(function(x) {
          return y.add(x);
        });
        function v(x) {
          if (!x) return x;
          var k, B = Object.create(o.prototype);
          for (k in x) if (!y.has(k)) try {
            B[k] = x[k];
          } catch {
          }
          return B;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = v, this.hook("reading", v), o;
      }, At.prototype.defineClass = function() {
        return this.mapToClass(function(o) {
          d(this, o);
        });
      }, At.prototype.add = function(o, s) {
        var u = this, l = this.schema.primKey, h = l.auto, y = l.keyPath, m = o;
        return y && h && (m = ao(y)(o)), this._trans("readwrite", function(v) {
          return u.core.mutate({ trans: v, type: "add", keys: s != null ? [s] : null, values: [m] });
        }).then(function(v) {
          return v.numFailures ? J.reject(v.failures[0]) : v.lastResult;
        }).then(function(v) {
          if (y) try {
            ot(o, y, v);
          } catch {
          }
          return v;
        });
      }, At.prototype.update = function(o, s) {
        return typeof o != "object" || f(o) ? this.where(":id").equals(o).modify(s) : (o = tt(o, this.schema.primKey.keyPath), o === void 0 ? Ot(new rt.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(o).modify(s));
      }, At.prototype.put = function(o, s) {
        var u = this, l = this.schema.primKey, h = l.auto, y = l.keyPath, m = o;
        return y && h && (m = ao(y)(o)), this._trans("readwrite", function(v) {
          return u.core.mutate({ trans: v, type: "put", values: [m], keys: s != null ? [s] : null });
        }).then(function(v) {
          return v.numFailures ? J.reject(v.failures[0]) : v.lastResult;
        }).then(function(v) {
          if (y) try {
            ot(o, y, v);
          } catch {
          }
          return v;
        });
      }, At.prototype.delete = function(o) {
        var s = this;
        return this._trans("readwrite", function(u) {
          return s.core.mutate({ trans: u, type: "delete", keys: [o] });
        }).then(function(u) {
          return u.numFailures ? J.reject(u.failures[0]) : void 0;
        });
      }, At.prototype.clear = function() {
        var o = this;
        return this._trans("readwrite", function(s) {
          return o.core.mutate({ trans: s, type: "deleteRange", range: Ua });
        }).then(function(s) {
          return s.numFailures ? J.reject(s.failures[0]) : void 0;
        });
      }, At.prototype.bulkGet = function(o) {
        var s = this;
        return this._trans("readonly", function(u) {
          return s.core.getMany({ keys: o, trans: u }).then(function(l) {
            return l.map(function(h) {
              return s.hook.reading.fire(h);
            });
          });
        });
      }, At.prototype.bulkAdd = function(o, s, u) {
        var l = this, h = Array.isArray(s) ? s : void 0, y = (u = u || (h ? void 0 : s)) ? u.allKeys : void 0;
        return this._trans("readwrite", function(m) {
          var k = l.schema.primKey, v = k.auto, k = k.keyPath;
          if (k && h) throw new rt.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (h && h.length !== o.length) throw new rt.InvalidArgument("Arguments objects and keys must have the same length");
          var x = o.length, k = k && v ? o.map(ao(k)) : o;
          return l.core.mutate({ trans: m, type: "add", keys: h, values: k, wantResults: y }).then(function(I) {
            var E = I.numFailures, N = I.results, S = I.lastResult, I = I.failures;
            if (E === 0) return y ? N : S;
            throw new me("".concat(l.name, ".bulkAdd(): ").concat(E, " of ").concat(x, " operations failed"), I);
          });
        });
      }, At.prototype.bulkPut = function(o, s, u) {
        var l = this, h = Array.isArray(s) ? s : void 0, y = (u = u || (h ? void 0 : s)) ? u.allKeys : void 0;
        return this._trans("readwrite", function(m) {
          var k = l.schema.primKey, v = k.auto, k = k.keyPath;
          if (k && h) throw new rt.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (h && h.length !== o.length) throw new rt.InvalidArgument("Arguments objects and keys must have the same length");
          var x = o.length, k = k && v ? o.map(ao(k)) : o;
          return l.core.mutate({ trans: m, type: "put", keys: h, values: k, wantResults: y }).then(function(I) {
            var E = I.numFailures, N = I.results, S = I.lastResult, I = I.failures;
            if (E === 0) return y ? N : S;
            throw new me("".concat(l.name, ".bulkPut(): ").concat(E, " of ").concat(x, " operations failed"), I);
          });
        });
      }, At.prototype.bulkUpdate = function(o) {
        var s = this, u = this.core, l = o.map(function(m) {
          return m.key;
        }), h = o.map(function(m) {
          return m.changes;
        }), y = [];
        return this._trans("readwrite", function(m) {
          return u.getMany({ trans: m, keys: l, cache: "clone" }).then(function(v) {
            var x = [], k = [];
            o.forEach(function(E, N) {
              var S = E.key, I = E.changes, C = v[N];
              if (C) {
                for (var T = 0, U = Object.keys(I); T < U.length; T++) {
                  var R = U[T], O = I[R];
                  if (R === s.schema.primKey.keyPath) {
                    if (vt(O, S) !== 0) throw new rt.Constraint("Cannot update primary key in bulkUpdate()");
                  } else ot(C, R, O);
                }
                y.push(N), x.push(S), k.push(C);
              }
            });
            var B = x.length;
            return u.mutate({ trans: m, type: "put", keys: x, values: k, updates: { keys: l, changeSpecs: h } }).then(function(E) {
              var N = E.numFailures, S = E.failures;
              if (N === 0) return B;
              for (var I = 0, C = Object.keys(S); I < C.length; I++) {
                var T, U = C[I], R = y[Number(U)];
                R != null && (T = S[U], delete S[U], S[R] = T);
              }
              throw new me("".concat(s.name, ".bulkUpdate(): ").concat(N, " of ").concat(B, " operations failed"), S);
            });
          });
        });
      }, At.prototype.bulkDelete = function(o) {
        var s = this, u = o.length;
        return this._trans("readwrite", function(l) {
          return s.core.mutate({ trans: l, type: "delete", keys: o });
        }).then(function(m) {
          var h = m.numFailures, y = m.lastResult, m = m.failures;
          if (h === 0) return y;
          throw new me("".concat(s.name, ".bulkDelete(): ").concat(h, " of ").concat(u, " operations failed"), m);
        });
      }, At);
      function At() {
      }
      function pr(o) {
        function s(m, v) {
          if (v) {
            for (var x = arguments.length, k = new Array(x - 1); --x; ) k[x - 1] = arguments[x];
            return u[m].subscribe.apply(null, k), o;
          }
          if (typeof m == "string") return u[m];
        }
        var u = {};
        s.addEventType = y;
        for (var l = 1, h = arguments.length; l < h; ++l) y(arguments[l]);
        return s;
        function y(m, v, x) {
          if (typeof m != "object") {
            var k;
            v = v || Tf;
            var B = { subscribers: [], fire: x = x || xt, subscribe: function(E) {
              B.subscribers.indexOf(E) === -1 && (B.subscribers.push(E), B.fire = v(B.fire, E));
            }, unsubscribe: function(E) {
              B.subscribers = B.subscribers.filter(function(N) {
                return N !== E;
              }), B.fire = B.subscribers.reduce(v, x);
            } };
            return u[m] = s[m] = B;
          }
          c(k = m).forEach(function(E) {
            var N = k[E];
            if (f(N)) y(E, k[E][0], k[E][1]);
            else {
              if (N !== "asap") throw new rt.InvalidArgument("Invalid event config");
              var S = y(E, be, function() {
                for (var I = arguments.length, C = new Array(I); I--; ) C[I] = arguments[I];
                S.subscribers.forEach(function(T) {
                  M(function() {
                    T.apply(null, C);
                  });
                });
              });
            }
          });
        }
      }
      function yr(o, s) {
        return A(s).from({ prototype: o }), s;
      }
      function jn(o, s) {
        return !(o.filter || o.algorithm || o.or) && (s ? o.justLimit : !o.replayFilter);
      }
      function _i(o, s) {
        o.filter = Bn(o.filter, s);
      }
      function Bi(o, s, u) {
        var l = o.replayFilter;
        o.replayFilter = l ? function() {
          return Bn(l(), s());
        } : s, o.justLimit = u && !l;
      }
      function co(o, s) {
        if (o.isPrimKey) return s.primaryKey;
        var u = s.getIndexByKeyPath(o.index);
        if (!u) throw new rt.Schema("KeyPath " + o.index + " on object store " + s.name + " is not indexed");
        return u;
      }
      function Ka(o, s, u) {
        var l = co(o, s.schema);
        return s.openCursor({ trans: u, values: !o.keysOnly, reverse: o.dir === "prev", unique: !!o.unique, query: { index: l, range: o.range } });
      }
      function uo(o, s, u, l) {
        var h = o.replayFilter ? Bn(o.filter, o.replayFilter()) : o.filter;
        if (o.or) {
          var y = {}, m = function(v, x, k) {
            var B, E;
            h && !h(x, k, function(N) {
              return x.stop(N);
            }, function(N) {
              return x.fail(N);
            }) || ((E = "" + (B = x.primaryKey)) == "[object ArrayBuffer]" && (E = "" + new Uint8Array(B)), g(y, E) || (y[E] = !0, s(v, x, k)));
          };
          return Promise.all([o.or._iterate(m, u), Da(Ka(o, l, u), o.algorithm, m, !o.keysOnly && o.valueMapper)]);
        }
        return Da(Ka(o, l, u), Bn(o.algorithm, h), s, !o.keysOnly && o.valueMapper);
      }
      function Da(o, s, u, l) {
        var h = Ct(l ? function(y, m, v) {
          return u(l(y), m, v);
        } : u);
        return o.then(function(y) {
          if (y) return y.start(function() {
            var m = function() {
              return y.continue();
            };
            s && !s(y, function(v) {
              return m = v;
            }, function(v) {
              y.stop(v), m = xt;
            }, function(v) {
              y.fail(v), m = xt;
            }) || h(y.value, y, function(v) {
              return m = v;
            }), m();
          });
        });
      }
      var gr = ($a.prototype.execute = function(o) {
        var s = this["@@propmod"];
        if (s.add !== void 0) {
          var u = s.add;
          if (f(u)) return i(i([], f(o) ? o : [], !0), u).sort();
          if (typeof u == "number") return (Number(o) || 0) + u;
          if (typeof u == "bigint") try {
            return BigInt(o) + u;
          } catch {
            return BigInt(0) + u;
          }
          throw new TypeError("Invalid term ".concat(u));
        }
        if (s.remove !== void 0) {
          var l = s.remove;
          if (f(l)) return f(o) ? o.filter(function(h) {
            return !l.includes(h);
          }).sort() : [];
          if (typeof l == "number") return Number(o) - l;
          if (typeof l == "bigint") try {
            return BigInt(o) - l;
          } catch {
            return BigInt(0) - l;
          }
          throw new TypeError("Invalid subtrahend ".concat(l));
        }
        return u = (u = s.replacePrefix) === null || u === void 0 ? void 0 : u[0], u && typeof o == "string" && o.startsWith(u) ? s.replacePrefix[1] + o.substring(u.length) : o;
      }, $a);
      function $a(o) {
        this["@@propmod"] = o;
      }
      var Nf = (St.prototype._read = function(o, s) {
        var u = this._ctx;
        return u.error ? u.table._trans(null, Ot.bind(null, u.error)) : u.table._trans("readonly", o).then(s);
      }, St.prototype._write = function(o) {
        var s = this._ctx;
        return s.error ? s.table._trans(null, Ot.bind(null, s.error)) : s.table._trans("readwrite", o, "locked");
      }, St.prototype._addAlgorithm = function(o) {
        var s = this._ctx;
        s.algorithm = Bn(s.algorithm, o);
      }, St.prototype._iterate = function(o, s) {
        return uo(this._ctx, o, s, this._ctx.table.core);
      }, St.prototype.clone = function(o) {
        var s = Object.create(this.constructor.prototype), u = Object.create(this._ctx);
        return o && d(u, o), s._ctx = u, s;
      }, St.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, St.prototype.each = function(o) {
        var s = this._ctx;
        return this._read(function(u) {
          return uo(s, o, u, s.table.core);
        });
      }, St.prototype.count = function(o) {
        var s = this;
        return this._read(function(u) {
          var l = s._ctx, h = l.table.core;
          if (jn(l, !0)) return h.count({ trans: u, query: { index: co(l, h.schema), range: l.range } }).then(function(m) {
            return Math.min(m, l.limit);
          });
          var y = 0;
          return uo(l, function() {
            return ++y, !1;
          }, u, h).then(function() {
            return y;
          });
        }).then(o);
      }, St.prototype.sortBy = function(o, s) {
        var u = o.split(".").reverse(), l = u[0], h = u.length - 1;
        function y(x, k) {
          return k ? y(x[u[k]], k - 1) : x[l];
        }
        var m = this._ctx.dir === "next" ? 1 : -1;
        function v(x, k) {
          return vt(y(x, h), y(k, h)) * m;
        }
        return this.toArray(function(x) {
          return x.sort(v);
        }).then(s);
      }, St.prototype.toArray = function(o) {
        var s = this;
        return this._read(function(u) {
          var l = s._ctx;
          if (l.dir === "next" && jn(l, !0) && 0 < l.limit) {
            var h = l.valueMapper, y = co(l, l.table.core.schema);
            return l.table.core.query({ trans: u, limit: l.limit, values: !0, query: { index: y, range: l.range } }).then(function(v) {
              return v = v.result, h ? v.map(h) : v;
            });
          }
          var m = [];
          return uo(l, function(v) {
            return m.push(v);
          }, u, l.table.core).then(function() {
            return m;
          });
        }, o);
      }, St.prototype.offset = function(o) {
        var s = this._ctx;
        return o <= 0 || (s.offset += o, jn(s) ? Bi(s, function() {
          var u = o;
          return function(l, h) {
            return u === 0 || (u === 1 ? --u : h(function() {
              l.advance(u), u = 0;
            }), !1);
          };
        }) : Bi(s, function() {
          var u = o;
          return function() {
            return --u < 0;
          };
        })), this;
      }, St.prototype.limit = function(o) {
        return this._ctx.limit = Math.min(this._ctx.limit, o), Bi(this._ctx, function() {
          var s = o;
          return function(u, l, h) {
            return --s <= 0 && l(h), 0 <= s;
          };
        }, !0), this;
      }, St.prototype.until = function(o, s) {
        return _i(this._ctx, function(u, l, h) {
          return !o(u.value) || (l(h), s);
        }), this;
      }, St.prototype.first = function(o) {
        return this.limit(1).toArray(function(s) {
          return s[0];
        }).then(o);
      }, St.prototype.last = function(o) {
        return this.reverse().first(o);
      }, St.prototype.filter = function(o) {
        var s;
        return _i(this._ctx, function(u) {
          return o(u.value);
        }), (s = this._ctx).isMatch = Bn(s.isMatch, o), this;
      }, St.prototype.and = function(o) {
        return this.filter(o);
      }, St.prototype.or = function(o) {
        return new this.db.WhereClause(this._ctx.table, o, this);
      }, St.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, St.prototype.desc = function() {
        return this.reverse();
      }, St.prototype.eachKey = function(o) {
        var s = this._ctx;
        return s.keysOnly = !s.isMatch, this.each(function(u, l) {
          o(l.key, l);
        });
      }, St.prototype.eachUniqueKey = function(o) {
        return this._ctx.unique = "unique", this.eachKey(o);
      }, St.prototype.eachPrimaryKey = function(o) {
        var s = this._ctx;
        return s.keysOnly = !s.isMatch, this.each(function(u, l) {
          o(l.primaryKey, l);
        });
      }, St.prototype.keys = function(o) {
        var s = this._ctx;
        s.keysOnly = !s.isMatch;
        var u = [];
        return this.each(function(l, h) {
          u.push(h.key);
        }).then(function() {
          return u;
        }).then(o);
      }, St.prototype.primaryKeys = function(o) {
        var s = this._ctx;
        if (s.dir === "next" && jn(s, !0) && 0 < s.limit) return this._read(function(l) {
          var h = co(s, s.table.core.schema);
          return s.table.core.query({ trans: l, values: !1, limit: s.limit, query: { index: h, range: s.range } });
        }).then(function(l) {
          return l.result;
        }).then(o);
        s.keysOnly = !s.isMatch;
        var u = [];
        return this.each(function(l, h) {
          u.push(h.primaryKey);
        }).then(function() {
          return u;
        }).then(o);
      }, St.prototype.uniqueKeys = function(o) {
        return this._ctx.unique = "unique", this.keys(o);
      }, St.prototype.firstKey = function(o) {
        return this.limit(1).keys(function(s) {
          return s[0];
        }).then(o);
      }, St.prototype.lastKey = function(o) {
        return this.reverse().firstKey(o);
      }, St.prototype.distinct = function() {
        var o = this._ctx, o = o.index && o.table.schema.idxByName[o.index];
        if (!o || !o.multi) return this;
        var s = {};
        return _i(this._ctx, function(h) {
          var l = h.primaryKey.toString(), h = g(s, l);
          return s[l] = !0, !h;
        }), this;
      }, St.prototype.modify = function(o) {
        var s = this, u = this._ctx;
        return this._write(function(l) {
          var h, y, m;
          m = typeof o == "function" ? o : (h = c(o), y = h.length, function(T) {
            for (var U = !1, R = 0; R < y; ++R) {
              var O = h[R], K = o[O], F = tt(T, O);
              K instanceof gr ? (ot(T, O, K.execute(F)), U = !0) : F !== K && (ot(T, O, K), U = !0);
            }
            return U;
          });
          var v = u.table.core, E = v.schema.primaryKey, x = E.outbound, k = E.extractKey, B = 200, E = s.db._options.modifyChunkSize;
          E && (B = typeof E == "object" ? E[v.name] || E["*"] || 200 : E);
          function N(T, O) {
            var R = O.failures, O = O.numFailures;
            I += T - O;
            for (var K = 0, F = c(R); K < F.length; K++) {
              var Y = F[K];
              S.push(R[Y]);
            }
          }
          var S = [], I = 0, C = [];
          return s.clone().primaryKeys().then(function(T) {
            function U(O) {
              var K = Math.min(B, T.length - O);
              return v.getMany({ trans: l, keys: T.slice(O, O + K), cache: "immutable" }).then(function(F) {
                for (var Y = [], V = [], q = x ? [] : null, Q = [], z = 0; z < K; ++z) {
                  var nt = F[z], pt = { value: Z(nt), primKey: T[O + z] };
                  m.call(pt, pt.value, pt) !== !1 && (pt.value == null ? Q.push(T[O + z]) : x || vt(k(nt), k(pt.value)) === 0 ? (V.push(pt.value), x && q.push(T[O + z])) : (Q.push(T[O + z]), Y.push(pt.value)));
                }
                return Promise.resolve(0 < Y.length && v.mutate({ trans: l, type: "add", values: Y }).then(function(wt) {
                  for (var mt in wt.failures) Q.splice(parseInt(mt), 1);
                  N(Y.length, wt);
                })).then(function() {
                  return (0 < V.length || R && typeof o == "object") && v.mutate({ trans: l, type: "put", keys: q, values: V, criteria: R, changeSpec: typeof o != "function" && o, isAdditionalChunk: 0 < O }).then(function(wt) {
                    return N(V.length, wt);
                  });
                }).then(function() {
                  return (0 < Q.length || R && o === Ci) && v.mutate({ trans: l, type: "delete", keys: Q, criteria: R, isAdditionalChunk: 0 < O }).then(function(wt) {
                    return N(Q.length, wt);
                  });
                }).then(function() {
                  return T.length > O + K && U(O + B);
                });
              });
            }
            var R = jn(u) && u.limit === 1 / 0 && (typeof o != "function" || o === Ci) && { index: u.index, range: u.range };
            return U(0).then(function() {
              if (0 < S.length) throw new Kt("Error modifying one or more objects", S, I, C);
              return T.length;
            });
          });
        });
      }, St.prototype.delete = function() {
        var o = this._ctx, s = o.range;
        return jn(o) && (o.isPrimKey || s.type === 3) ? this._write(function(u) {
          var l = o.table.core.schema.primaryKey, h = s;
          return o.table.core.count({ trans: u, query: { index: l, range: h } }).then(function(y) {
            return o.table.core.mutate({ trans: u, type: "deleteRange", range: h }).then(function(m) {
              var v = m.failures;
              if (m.lastResult, m.results, m = m.numFailures, m) throw new Kt("Could not delete some values", Object.keys(v).map(function(x) {
                return v[x];
              }), y - m);
              return y - m;
            });
          });
        }) : this.modify(Ci);
      }, St);
      function St() {
      }
      var Ci = function(o, s) {
        return s.value = null;
      };
      function Uf(o, s) {
        return o < s ? -1 : o === s ? 0 : 1;
      }
      function Rf(o, s) {
        return s < o ? -1 : o === s ? 0 : 1;
      }
      function Ee(o, s, u) {
        return o = o instanceof Fa ? new o.Collection(o) : o, o._ctx.error = new (u || TypeError)(s), o;
      }
      function Gn(o) {
        return new o.Collection(o, function() {
          return Ma("");
        }).limit(0);
      }
      function fo(o, s, u, l) {
        var h, y, m, v, x, k, B, E = u.length;
        if (!u.every(function(I) {
          return typeof I == "string";
        })) return Ee(o, Na);
        function N(I) {
          h = I === "next" ? function(T) {
            return T.toUpperCase();
          } : function(T) {
            return T.toLowerCase();
          }, y = I === "next" ? function(T) {
            return T.toLowerCase();
          } : function(T) {
            return T.toUpperCase();
          }, m = I === "next" ? Uf : Rf;
          var C = u.map(function(T) {
            return { lower: y(T), upper: h(T) };
          }).sort(function(T, U) {
            return m(T.lower, U.lower);
          });
          v = C.map(function(T) {
            return T.upper;
          }), x = C.map(function(T) {
            return T.lower;
          }), B = (k = I) === "next" ? "" : l;
        }
        N("next"), o = new o.Collection(o, function() {
          return un(v[0], x[E - 1] + l);
        }), o._ondirectionchange = function(I) {
          N(I);
        };
        var S = 0;
        return o._addAlgorithm(function(I, C, T) {
          var U = I.key;
          if (typeof U != "string") return !1;
          var R = y(U);
          if (s(R, x, S)) return !0;
          for (var O = null, K = S; K < E; ++K) {
            var F = function(Y, V, q, Q, z, nt) {
              for (var pt = Math.min(Y.length, Q.length), wt = -1, mt = 0; mt < pt; ++mt) {
                var xe = V[mt];
                if (xe !== Q[mt]) return z(Y[mt], q[mt]) < 0 ? Y.substr(0, mt) + q[mt] + q.substr(mt + 1) : z(Y[mt], Q[mt]) < 0 ? Y.substr(0, mt) + Q[mt] + q.substr(mt + 1) : 0 <= wt ? Y.substr(0, wt) + V[wt] + q.substr(wt + 1) : null;
                z(Y[mt], xe) < 0 && (wt = mt);
              }
              return pt < Q.length && nt === "next" ? Y + q.substr(Y.length) : pt < Y.length && nt === "prev" ? Y.substr(0, q.length) : wt < 0 ? null : Y.substr(0, wt) + Q[wt] + q.substr(wt + 1);
            }(U, R, v[K], x[K], m, k);
            F === null && O === null ? S = K + 1 : (O === null || 0 < m(O, F)) && (O = F);
          }
          return C(O !== null ? function() {
            I.continue(O + B);
          } : T), !1;
        }), o;
      }
      function un(o, s, u, l) {
        return { type: 2, lower: o, upper: s, lowerOpen: u, upperOpen: l };
      }
      function Ma(o) {
        return { type: 1, lower: o, upper: o };
      }
      var Fa = (Object.defineProperty(jt.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), jt.prototype.between = function(o, s, u, l) {
        u = u !== !1, l = l === !0;
        try {
          return 0 < this._cmp(o, s) || this._cmp(o, s) === 0 && (u || l) && (!u || !l) ? Gn(this) : new this.Collection(this, function() {
            return un(o, s, !u, !l);
          });
        } catch {
          return Ee(this, Ge);
        }
      }, jt.prototype.equals = function(o) {
        return o == null ? Ee(this, Ge) : new this.Collection(this, function() {
          return Ma(o);
        });
      }, jt.prototype.above = function(o) {
        return o == null ? Ee(this, Ge) : new this.Collection(this, function() {
          return un(o, void 0, !0);
        });
      }, jt.prototype.aboveOrEqual = function(o) {
        return o == null ? Ee(this, Ge) : new this.Collection(this, function() {
          return un(o, void 0, !1);
        });
      }, jt.prototype.below = function(o) {
        return o == null ? Ee(this, Ge) : new this.Collection(this, function() {
          return un(void 0, o, !1, !0);
        });
      }, jt.prototype.belowOrEqual = function(o) {
        return o == null ? Ee(this, Ge) : new this.Collection(this, function() {
          return un(void 0, o);
        });
      }, jt.prototype.startsWith = function(o) {
        return typeof o != "string" ? Ee(this, Na) : this.between(o, o + _n, !0, !0);
      }, jt.prototype.startsWithIgnoreCase = function(o) {
        return o === "" ? this.startsWith(o) : fo(this, function(s, u) {
          return s.indexOf(u[0]) === 0;
        }, [o], _n);
      }, jt.prototype.equalsIgnoreCase = function(o) {
        return fo(this, function(s, u) {
          return s === u[0];
        }, [o], "");
      }, jt.prototype.anyOfIgnoreCase = function() {
        var o = lt.apply(ft, arguments);
        return o.length === 0 ? Gn(this) : fo(this, function(s, u) {
          return u.indexOf(s) !== -1;
        }, o, "");
      }, jt.prototype.startsWithAnyOfIgnoreCase = function() {
        var o = lt.apply(ft, arguments);
        return o.length === 0 ? Gn(this) : fo(this, function(s, u) {
          return u.some(function(l) {
            return s.indexOf(l) === 0;
          });
        }, o, _n);
      }, jt.prototype.anyOf = function() {
        var o = this, s = lt.apply(ft, arguments), u = this._cmp;
        try {
          s.sort(u);
        } catch {
          return Ee(this, Ge);
        }
        if (s.length === 0) return Gn(this);
        var l = new this.Collection(this, function() {
          return un(s[0], s[s.length - 1]);
        });
        l._ondirectionchange = function(y) {
          u = y === "next" ? o._ascending : o._descending, s.sort(u);
        };
        var h = 0;
        return l._addAlgorithm(function(y, m, v) {
          for (var x = y.key; 0 < u(x, s[h]); ) if (++h === s.length) return m(v), !1;
          return u(x, s[h]) === 0 || (m(function() {
            y.continue(s[h]);
          }), !1);
        }), l;
      }, jt.prototype.notEqual = function(o) {
        return this.inAnyRange([[-1 / 0, o], [o, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, jt.prototype.noneOf = function() {
        var o = lt.apply(ft, arguments);
        if (o.length === 0) return new this.Collection(this);
        try {
          o.sort(this._ascending);
        } catch {
          return Ee(this, Ge);
        }
        var s = o.reduce(function(u, l) {
          return u ? u.concat([[u[u.length - 1][1], l]]) : [[-1 / 0, l]];
        }, null);
        return s.push([o[o.length - 1], this.db._maxKey]), this.inAnyRange(s, { includeLowers: !1, includeUppers: !1 });
      }, jt.prototype.inAnyRange = function(U, s) {
        var u = this, l = this._cmp, h = this._ascending, y = this._descending, m = this._min, v = this._max;
        if (U.length === 0) return Gn(this);
        if (!U.every(function(R) {
          return R[0] !== void 0 && R[1] !== void 0 && h(R[0], R[1]) <= 0;
        })) return Ee(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", rt.InvalidArgument);
        var x = !s || s.includeLowers !== !1, k = s && s.includeUppers === !0, B, E = h;
        function N(R, O) {
          return E(R[0], O[0]);
        }
        try {
          (B = U.reduce(function(R, O) {
            for (var K = 0, F = R.length; K < F; ++K) {
              var Y = R[K];
              if (l(O[0], Y[1]) < 0 && 0 < l(O[1], Y[0])) {
                Y[0] = m(Y[0], O[0]), Y[1] = v(Y[1], O[1]);
                break;
              }
            }
            return K === F && R.push(O), R;
          }, [])).sort(N);
        } catch {
          return Ee(this, Ge);
        }
        var S = 0, I = k ? function(R) {
          return 0 < h(R, B[S][1]);
        } : function(R) {
          return 0 <= h(R, B[S][1]);
        }, C = x ? function(R) {
          return 0 < y(R, B[S][0]);
        } : function(R) {
          return 0 <= y(R, B[S][0]);
        }, T = I, U = new this.Collection(this, function() {
          return un(B[0][0], B[B.length - 1][1], !x, !k);
        });
        return U._ondirectionchange = function(R) {
          E = R === "next" ? (T = I, h) : (T = C, y), B.sort(N);
        }, U._addAlgorithm(function(R, O, K) {
          for (var F, Y = R.key; T(Y); ) if (++S === B.length) return O(K), !1;
          return !I(F = Y) && !C(F) || (u._cmp(Y, B[S][1]) === 0 || u._cmp(Y, B[S][0]) === 0 || O(function() {
            E === h ? R.continue(B[S][0]) : R.continue(B[S][1]);
          }), !1);
        }), U;
      }, jt.prototype.startsWithAnyOf = function() {
        var o = lt.apply(ft, arguments);
        return o.every(function(s) {
          return typeof s == "string";
        }) ? o.length === 0 ? Gn(this) : this.inAnyRange(o.map(function(s) {
          return [s, s + _n];
        })) : Ee(this, "startsWithAnyOf() only works with strings");
      }, jt);
      function jt() {
      }
      function $e(o) {
        return Ct(function(s) {
          return wr(s), o(s.target.error), !1;
        });
      }
      function wr(o) {
        o.stopPropagation && o.stopPropagation(), o.preventDefault && o.preventDefault();
      }
      var mr = "storagemutated", Ni = "x-storagemutated-1", fn = pr(null, mr), Of = (Me.prototype._lock = function() {
        return L(!it.global), ++this._reculock, this._reculock !== 1 || it.global || (it.lockOwnerFor = this), this;
      }, Me.prototype._unlock = function() {
        if (L(!it.global), --this._reculock == 0) for (it.global || (it.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var o = this._blockedFuncs.shift();
          try {
            In(o[1], o[0]);
          } catch {
          }
        }
        return this;
      }, Me.prototype._locked = function() {
        return this._reculock && it.lockOwnerFor !== this;
      }, Me.prototype.create = function(o) {
        var s = this;
        if (!this.mode) return this;
        var u = this.db.idbdb, l = this.db._state.dbOpenError;
        if (L(!this.idbtrans), !o && !u) switch (l && l.name) {
          case "DatabaseClosedError":
            throw new rt.DatabaseClosed(l);
          case "MissingAPIError":
            throw new rt.MissingAPI(l.message, l);
          default:
            throw new rt.OpenFailed(l);
        }
        if (!this.active) throw new rt.TransactionInactive();
        return L(this._completion._state === null), (o = this.idbtrans = o || (this.db.core || u).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Ct(function(h) {
          wr(h), s._reject(o.error);
        }), o.onabort = Ct(function(h) {
          wr(h), s.active && s._reject(new rt.Abort(o.error)), s.active = !1, s.on("abort").fire(h);
        }), o.oncomplete = Ct(function() {
          s.active = !1, s._resolve(), "mutatedParts" in o && fn.storagemutated.fire(o.mutatedParts);
        }), this;
      }, Me.prototype._promise = function(o, s, u) {
        var l = this;
        if (o === "readwrite" && this.mode !== "readwrite") return Ot(new rt.ReadOnly("Transaction is readonly"));
        if (!this.active) return Ot(new rt.TransactionInactive());
        if (this._locked()) return new J(function(y, m) {
          l._blockedFuncs.push([function() {
            l._promise(o, s, u).then(y, m);
          }, it]);
        });
        if (u) return sn(function() {
          var y = new J(function(m, v) {
            l._lock();
            var x = s(m, v, l);
            x && x.then && x.then(m, v);
          });
          return y.finally(function() {
            return l._unlock();
          }), y._lib = !0, y;
        });
        var h = new J(function(y, m) {
          var v = s(y, m, l);
          v && v.then && v.then(y, m);
        });
        return h._lib = !0, h;
      }, Me.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, Me.prototype.waitFor = function(o) {
        var s, u = this._root(), l = J.resolve(o);
        u._waitingFor ? u._waitingFor = u._waitingFor.then(function() {
          return l;
        }) : (u._waitingFor = l, u._waitingQueue = [], s = u.idbtrans.objectStore(u.storeNames[0]), function y() {
          for (++u._spinCount; u._waitingQueue.length; ) u._waitingQueue.shift()();
          u._waitingFor && (s.get(-1 / 0).onsuccess = y);
        }());
        var h = u._waitingFor;
        return new J(function(y, m) {
          l.then(function(v) {
            return u._waitingQueue.push(Ct(y.bind(null, v)));
          }, function(v) {
            return u._waitingQueue.push(Ct(m.bind(null, v)));
          }).finally(function() {
            u._waitingFor === h && (u._waitingFor = null);
          });
        });
      }, Me.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new rt.Abort()));
      }, Me.prototype.table = function(o) {
        var s = this._memoizedTables || (this._memoizedTables = {});
        if (g(s, o)) return s[o];
        var u = this.schema[o];
        if (!u) throw new rt.NotFound("Table " + o + " not part of transaction");
        return u = new this.db.Table(o, u, this), u.core = this.db.core.table(o), s[o] = u;
      }, Me);
      function Me() {
      }
      function Ui(o, s, u, l, h, y, m) {
        return { name: o, keyPath: s, unique: u, multi: l, auto: h, compound: y, src: (u && !m ? "&" : "") + (l ? "*" : "") + (h ? "++" : "") + Va(s) };
      }
      function Va(o) {
        return typeof o == "string" ? o : o ? "[" + [].join.call(o, "+") + "]" : "";
      }
      function Ri(o, s, u) {
        return { name: o, primKey: s, indexes: u, mappedClass: null, idxByName: (l = function(h) {
          return [h.name, h];
        }, u.reduce(function(h, y, m) {
          return m = l(y, m), m && (h[m[0]] = m[1]), h;
        }, {})) };
        var l;
      }
      var br = function(o) {
        try {
          return o.only([[]]), br = function() {
            return [[]];
          }, [[]];
        } catch {
          return br = function() {
            return _n;
          }, _n;
        }
      };
      function Oi(o) {
        return o == null ? function() {
        } : typeof o == "string" ? (s = o).split(".").length === 1 ? function(u) {
          return u[s];
        } : function(u) {
          return tt(u, s);
        } : function(u) {
          return tt(u, o);
        };
        var s;
      }
      function Ha(o) {
        return [].slice.call(o);
      }
      var Pf = 0;
      function vr(o) {
        return o == null ? ":id" : typeof o == "string" ? o : "[".concat(o.join("+"), "]");
      }
      function Lf(o, s, x) {
        function l(T) {
          if (T.type === 3) return null;
          if (T.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var S = T.lower, I = T.upper, C = T.lowerOpen, T = T.upperOpen;
          return S === void 0 ? I === void 0 ? null : s.upperBound(I, !!T) : I === void 0 ? s.lowerBound(S, !!C) : s.bound(S, I, !!C, !!T);
        }
        function h(N) {
          var S, I = N.name;
          return { name: I, schema: N, mutate: function(C) {
            var T = C.trans, U = C.type, R = C.keys, O = C.values, K = C.range;
            return new Promise(function(F, Y) {
              F = Ct(F);
              var V = T.objectStore(I), q = V.keyPath == null, Q = U === "put" || U === "add";
              if (!Q && U !== "delete" && U !== "deleteRange") throw new Error("Invalid operation type: " + U);
              var z, nt = (R || O || { length: 1 }).length;
              if (R && O && R.length !== O.length) throw new Error("Given keys array must have same length as given values array.");
              if (nt === 0) return F({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function pt(ae) {
                ++xe, wr(ae);
              }
              var wt = [], mt = [], xe = 0;
              if (U === "deleteRange") {
                if (K.type === 4) return F({ numFailures: xe, failures: mt, results: [], lastResult: void 0 });
                K.type === 3 ? wt.push(z = V.clear()) : wt.push(z = V.delete(l(K)));
              } else {
                var q = Q ? q ? [O, R] : [O, null] : [R, null], ht = q[0], ee = q[1];
                if (Q) for (var ne = 0; ne < nt; ++ne) wt.push(z = ee && ee[ne] !== void 0 ? V[U](ht[ne], ee[ne]) : V[U](ht[ne])), z.onerror = pt;
                else for (ne = 0; ne < nt; ++ne) wt.push(z = V[U](ht[ne])), z.onerror = pt;
              }
              function ko(ae) {
                ae = ae.target.result, wt.forEach(function(Un, Qi) {
                  return Un.error != null && (mt[Qi] = Un.error);
                }), F({ numFailures: xe, failures: mt, results: U === "delete" ? R : wt.map(function(Un) {
                  return Un.result;
                }), lastResult: ae });
              }
              z.onerror = function(ae) {
                pt(ae), ko(ae);
              }, z.onsuccess = ko;
            });
          }, getMany: function(C) {
            var T = C.trans, U = C.keys;
            return new Promise(function(R, O) {
              R = Ct(R);
              for (var K, F = T.objectStore(I), Y = U.length, V = new Array(Y), q = 0, Q = 0, z = function(wt) {
                wt = wt.target, V[wt._pos] = wt.result, ++Q === q && R(V);
              }, nt = $e(O), pt = 0; pt < Y; ++pt) U[pt] != null && ((K = F.get(U[pt]))._pos = pt, K.onsuccess = z, K.onerror = nt, ++q);
              q === 0 && R(V);
            });
          }, get: function(C) {
            var T = C.trans, U = C.key;
            return new Promise(function(R, O) {
              R = Ct(R);
              var K = T.objectStore(I).get(U);
              K.onsuccess = function(F) {
                return R(F.target.result);
              }, K.onerror = $e(O);
            });
          }, query: (S = k, function(C) {
            return new Promise(function(T, U) {
              T = Ct(T);
              var R, O, K, q = C.trans, F = C.values, Y = C.limit, z = C.query, V = Y === 1 / 0 ? void 0 : Y, Q = z.index, z = z.range, q = q.objectStore(I), Q = Q.isPrimaryKey ? q : q.index(Q.name), z = l(z);
              if (Y === 0) return T({ result: [] });
              S ? ((V = F ? Q.getAll(z, V) : Q.getAllKeys(z, V)).onsuccess = function(nt) {
                return T({ result: nt.target.result });
              }, V.onerror = $e(U)) : (R = 0, O = !F && "openKeyCursor" in Q ? Q.openKeyCursor(z) : Q.openCursor(z), K = [], O.onsuccess = function(nt) {
                var pt = O.result;
                return pt ? (K.push(F ? pt.value : pt.primaryKey), ++R === Y ? T({ result: K }) : void pt.continue()) : T({ result: K });
              }, O.onerror = $e(U));
            });
          }), openCursor: function(C) {
            var T = C.trans, U = C.values, R = C.query, O = C.reverse, K = C.unique;
            return new Promise(function(F, Y) {
              F = Ct(F);
              var Q = R.index, V = R.range, q = T.objectStore(I), q = Q.isPrimaryKey ? q : q.index(Q.name), Q = O ? K ? "prevunique" : "prev" : K ? "nextunique" : "next", z = !U && "openKeyCursor" in q ? q.openKeyCursor(l(V), Q) : q.openCursor(l(V), Q);
              z.onerror = $e(Y), z.onsuccess = Ct(function(nt) {
                var pt, wt, mt, xe, ht = z.result;
                ht ? (ht.___id = ++Pf, ht.done = !1, pt = ht.continue.bind(ht), wt = (wt = ht.continuePrimaryKey) && wt.bind(ht), mt = ht.advance.bind(ht), xe = function() {
                  throw new Error("Cursor not stopped");
                }, ht.trans = T, ht.stop = ht.continue = ht.continuePrimaryKey = ht.advance = function() {
                  throw new Error("Cursor not started");
                }, ht.fail = Ct(Y), ht.next = function() {
                  var ee = this, ne = 1;
                  return this.start(function() {
                    return ne-- ? ee.continue() : ee.stop();
                  }).then(function() {
                    return ee;
                  });
                }, ht.start = function(ee) {
                  function ne() {
                    if (z.result) try {
                      ee();
                    } catch (ae) {
                      ht.fail(ae);
                    }
                    else ht.done = !0, ht.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, ht.stop();
                  }
                  var ko = new Promise(function(ae, Un) {
                    ae = Ct(ae), z.onerror = $e(Un), ht.fail = Un, ht.stop = function(Qi) {
                      ht.stop = ht.continue = ht.continuePrimaryKey = ht.advance = xe, ae(Qi);
                    };
                  });
                  return z.onsuccess = Ct(function(ae) {
                    z.onsuccess = ne, ne();
                  }), ht.continue = pt, ht.continuePrimaryKey = wt, ht.advance = mt, ne(), ko;
                }, F(ht)) : F(null);
              }, Y);
            });
          }, count: function(C) {
            var T = C.query, U = C.trans, R = T.index, O = T.range;
            return new Promise(function(K, F) {
              var Y = U.objectStore(I), V = R.isPrimaryKey ? Y : Y.index(R.name), Y = l(O), V = Y ? V.count(Y) : V.count();
              V.onsuccess = Ct(function(q) {
                return K(q.target.result);
              }), V.onerror = $e(F);
            });
          } };
        }
        var y, m, v, B = (m = x, v = Ha((y = o).objectStoreNames), { schema: { name: y.name, tables: v.map(function(N) {
          return m.objectStore(N);
        }).map(function(N) {
          var S = N.keyPath, T = N.autoIncrement, I = f(S), C = {}, T = { name: N.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: S == null, compound: I, keyPath: S, autoIncrement: T, unique: !0, extractKey: Oi(S) }, indexes: Ha(N.indexNames).map(function(U) {
            return N.index(U);
          }).map(function(K) {
            var R = K.name, O = K.unique, F = K.multiEntry, K = K.keyPath, F = { name: R, compound: f(K), keyPath: K, unique: O, multiEntry: F, extractKey: Oi(K) };
            return C[vr(K)] = F;
          }), getIndexByKeyPath: function(U) {
            return C[vr(U)];
          } };
          return C[":id"] = T.primaryKey, S != null && (C[vr(S)] = T.primaryKey), T;
        }) }, hasGetAll: 0 < v.length && "getAll" in m.objectStore(v[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), x = B.schema, k = B.hasGetAll, B = x.tables.map(h), E = {};
        return B.forEach(function(N) {
          return E[N.name] = N;
        }), { stack: "dbcore", transaction: o.transaction.bind(o), table: function(N) {
          if (!E[N]) throw new Error("Table '".concat(N, "' not found"));
          return E[N];
        }, MIN_KEY: -1 / 0, MAX_KEY: br(s), schema: x };
      }
      function Kf(o, s, u, l) {
        var h = u.IDBKeyRange;
        return u.indexedDB, { dbcore: (l = Lf(s, h, l), o.dbcore.reduce(function(y, m) {
          return m = m.create, r(r({}, y), m(y));
        }, l)) };
      }
      function lo(o, l) {
        var u = l.db, l = Kf(o._middlewares, u, o._deps, l);
        o.core = l.dbcore, o.tables.forEach(function(h) {
          var y = h.name;
          o.core.schema.tables.some(function(m) {
            return m.name === y;
          }) && (h.core = o.core.table(y), o[y] instanceof o.Table && (o[y].core = h.core));
        });
      }
      function ho(o, s, u, l) {
        u.forEach(function(h) {
          var y = l[h];
          s.forEach(function(m) {
            var v = function x(k, B) {
              return P(k, B) || (k = p(k)) && x(k, B);
            }(m, h);
            (!v || "value" in v && v.value === void 0) && (m === o.Transaction.prototype || m instanceof o.Transaction ? D(m, h, { get: function() {
              return this.table(h);
            }, set: function(x) {
              _(this, h, { value: x, writable: !0, configurable: !0, enumerable: !0 });
            } }) : m[h] = new o.Table(h, y));
          });
        });
      }
      function Pi(o, s) {
        s.forEach(function(u) {
          for (var l in u) u[l] instanceof o.Table && delete u[l];
        });
      }
      function Df(o, s) {
        return o._cfg.version - s._cfg.version;
      }
      function $f(o, s, u, l) {
        var h = o._dbSchema;
        u.objectStoreNames.contains("$meta") && !h.$meta && (h.$meta = Ri("$meta", ja("")[0], []), o._storeNames.push("$meta"));
        var y = o._createTransaction("readwrite", o._storeNames, h);
        y.create(u), y._completion.catch(l);
        var m = y._reject.bind(y), v = it.transless || it;
        sn(function() {
          return it.trans = y, it.transless = v, s !== 0 ? (lo(o, u), k = s, ((x = y).storeNames.includes("$meta") ? x.table("$meta").get("version").then(function(B) {
            return B ?? k;
          }) : J.resolve(k)).then(function(B) {
            return N = B, S = y, I = u, C = [], B = (E = o)._versions, T = E._dbSchema = yo(0, E.idbdb, I), (B = B.filter(function(U) {
              return U._cfg.version >= N;
            })).length !== 0 ? (B.forEach(function(U) {
              C.push(function() {
                var R = T, O = U._cfg.dbschema;
                go(E, R, I), go(E, O, I), T = E._dbSchema = O;
                var K = Li(R, O);
                K.add.forEach(function(Q) {
                  Ki(I, Q[0], Q[1].primKey, Q[1].indexes);
                }), K.change.forEach(function(Q) {
                  if (Q.recreate) throw new rt.Upgrade("Not yet support for changing primary key");
                  var z = I.objectStore(Q.name);
                  Q.add.forEach(function(nt) {
                    return po(z, nt);
                  }), Q.change.forEach(function(nt) {
                    z.deleteIndex(nt.name), po(z, nt);
                  }), Q.del.forEach(function(nt) {
                    return z.deleteIndex(nt);
                  });
                });
                var F = U._cfg.contentUpgrade;
                if (F && U._cfg.version > N) {
                  lo(E, I), S._memoizedTables = {};
                  var Y = yt(O);
                  K.del.forEach(function(Q) {
                    Y[Q] = R[Q];
                  }), Pi(E, [E.Transaction.prototype]), ho(E, [E.Transaction.prototype], c(Y), Y), S.schema = Y;
                  var V, q = kt(F);
                  return q && Hn(), K = J.follow(function() {
                    var Q;
                    (V = F(S)) && q && (Q = an.bind(null, null), V.then(Q, Q));
                  }), V && typeof V.then == "function" ? J.resolve(V) : K.then(function() {
                    return V;
                  });
                }
              }), C.push(function(R) {
                var O, K, F = U._cfg.dbschema;
                O = F, K = R, [].slice.call(K.db.objectStoreNames).forEach(function(Y) {
                  return O[Y] == null && K.db.deleteObjectStore(Y);
                }), Pi(E, [E.Transaction.prototype]), ho(E, [E.Transaction.prototype], E._storeNames, E._dbSchema), S.schema = E._dbSchema;
              }), C.push(function(R) {
                E.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(E.idbdb.version / 10) === U._cfg.version ? (E.idbdb.deleteObjectStore("$meta"), delete E._dbSchema.$meta, E._storeNames = E._storeNames.filter(function(O) {
                  return O !== "$meta";
                })) : R.objectStore("$meta").put(U._cfg.version, "version"));
              });
            }), function U() {
              return C.length ? J.resolve(C.shift()(S.idbtrans)).then(U) : J.resolve();
            }().then(function() {
              qa(T, I);
            })) : J.resolve();
            var E, N, S, I, C, T;
          }).catch(m)) : (c(h).forEach(function(B) {
            Ki(u, B, h[B].primKey, h[B].indexes);
          }), lo(o, u), void J.follow(function() {
            return o.on.populate.fire(y);
          }).catch(m));
          var x, k;
        });
      }
      function Mf(o, s) {
        qa(o._dbSchema, s), s.db.version % 10 != 0 || s.objectStoreNames.contains("$meta") || s.db.createObjectStore("$meta").add(Math.ceil(s.db.version / 10 - 1), "version");
        var u = yo(0, o.idbdb, s);
        go(o, o._dbSchema, s);
        for (var l = 0, h = Li(u, o._dbSchema).change; l < h.length; l++) {
          var y = function(m) {
            if (m.change.length || m.recreate) return console.warn("Unable to patch indexes of table ".concat(m.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var v = s.objectStore(m.name);
            m.add.forEach(function(x) {
              De && console.debug("Dexie upgrade patch: Creating missing index ".concat(m.name, ".").concat(x.src)), po(v, x);
            });
          }(h[l]);
          if (typeof y == "object") return y.value;
        }
      }
      function Li(o, s) {
        var u, l = { del: [], add: [], change: [] };
        for (u in o) s[u] || l.del.push(u);
        for (u in s) {
          var h = o[u], y = s[u];
          if (h) {
            var m = { name: u, def: y, recreate: !1, del: [], add: [], change: [] };
            if ("" + (h.primKey.keyPath || "") != "" + (y.primKey.keyPath || "") || h.primKey.auto !== y.primKey.auto) m.recreate = !0, l.change.push(m);
            else {
              var v = h.idxByName, x = y.idxByName, k = void 0;
              for (k in v) x[k] || m.del.push(k);
              for (k in x) {
                var B = v[k], E = x[k];
                B ? B.src !== E.src && m.change.push(E) : m.add.push(E);
              }
              (0 < m.del.length || 0 < m.add.length || 0 < m.change.length) && l.change.push(m);
            }
          } else l.add.push([u, y]);
        }
        return l;
      }
      function Ki(o, s, u, l) {
        var h = o.db.createObjectStore(s, u.keyPath ? { keyPath: u.keyPath, autoIncrement: u.auto } : { autoIncrement: u.auto });
        return l.forEach(function(y) {
          return po(h, y);
        }), h;
      }
      function qa(o, s) {
        c(o).forEach(function(u) {
          s.db.objectStoreNames.contains(u) || (De && console.debug("Dexie: Creating missing table", u), Ki(s, u, o[u].primKey, o[u].indexes));
        });
      }
      function po(o, s) {
        o.createIndex(s.name, s.keyPath, { unique: s.unique, multiEntry: s.multi });
      }
      function yo(o, s, u) {
        var l = {};
        return W(s.objectStoreNames, 0).forEach(function(h) {
          for (var y = u.objectStore(h), m = Ui(Va(k = y.keyPath), k || "", !0, !1, !!y.autoIncrement, k && typeof k != "string", !0), v = [], x = 0; x < y.indexNames.length; ++x) {
            var B = y.index(y.indexNames[x]), k = B.keyPath, B = Ui(B.name, k, !!B.unique, !!B.multiEntry, !1, k && typeof k != "string", !1);
            v.push(B);
          }
          l[h] = Ri(h, m, v);
        }), l;
      }
      function go(o, s, u) {
        for (var l = u.db.objectStoreNames, h = 0; h < l.length; ++h) {
          var y = l[h], m = u.objectStore(y);
          o._hasGetAll = "getAll" in m;
          for (var v = 0; v < m.indexNames.length; ++v) {
            var x = m.indexNames[v], k = m.index(x).keyPath, B = typeof k == "string" ? k : "[" + W(k).join("+") + "]";
            !s[y] || (k = s[y].idxByName[B]) && (k.name = x, delete s[y].idxByName[B], s[y].idxByName[x] = k);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && a.WorkerGlobalScope && a instanceof a.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (o._hasGetAll = !1);
      }
      function ja(o) {
        return o.split(",").map(function(s, u) {
          var l = (s = s.trim()).replace(/([&*]|\+\+)/g, ""), h = /^\[/.test(l) ? l.match(/^\[(.*)\]$/)[1].split("+") : l;
          return Ui(l, h || null, /\&/.test(s), /\*/.test(s), /\+\+/.test(s), f(h), u === 0);
        });
      }
      var Ff = (wo.prototype._parseStoresSpec = function(o, s) {
        c(o).forEach(function(u) {
          if (o[u] !== null) {
            var l = ja(o[u]), h = l.shift();
            if (h.unique = !0, h.multi) throw new rt.Schema("Primary key cannot be multi-valued");
            l.forEach(function(y) {
              if (y.auto) throw new rt.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!y.keyPath) throw new rt.Schema("Index must have a name and cannot be an empty string");
            }), s[u] = Ri(u, h, l);
          }
        });
      }, wo.prototype.stores = function(u) {
        var s = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? d(this._cfg.storesSource, u) : u;
        var u = s._versions, l = {}, h = {};
        return u.forEach(function(y) {
          d(l, y._cfg.storesSource), h = y._cfg.dbschema = {}, y._parseStoresSpec(l, h);
        }), s._dbSchema = h, Pi(s, [s._allTables, s, s.Transaction.prototype]), ho(s, [s._allTables, s, s.Transaction.prototype, this._cfg.tables], c(h), h), s._storeNames = c(h), this;
      }, wo.prototype.upgrade = function(o) {
        return this._cfg.contentUpgrade = wi(this._cfg.contentUpgrade || xt, o), this;
      }, wo);
      function wo() {
      }
      function Di(o, s) {
        var u = o._dbNamesDB;
        return u || (u = o._dbNamesDB = new ze(so, { addons: [], indexedDB: o, IDBKeyRange: s })).version(1).stores({ dbnames: "name" }), u.table("dbnames");
      }
      function $i(o) {
        return o && typeof o.databases == "function";
      }
      function Mi(o) {
        return sn(function() {
          return it.letThrough = !0, o();
        });
      }
      function Fi(o) {
        return !("from" in o);
      }
      var te = function(o, s) {
        if (!this) {
          var u = new te();
          return o && "d" in o && d(u, o), u;
        }
        d(this, arguments.length ? { d: 1, from: o, to: 1 < arguments.length ? s : o } : { d: 0 });
      };
      function Er(o, s, u) {
        var l = vt(s, u);
        if (!isNaN(l)) {
          if (0 < l) throw RangeError();
          if (Fi(o)) return d(o, { from: s, to: u, d: 1 });
          var h = o.l, l = o.r;
          if (vt(u, o.from) < 0) return h ? Er(h, s, u) : o.l = { from: s, to: u, d: 1, l: null, r: null }, za(o);
          if (0 < vt(s, o.to)) return l ? Er(l, s, u) : o.r = { from: s, to: u, d: 1, l: null, r: null }, za(o);
          vt(s, o.from) < 0 && (o.from = s, o.l = null, o.d = l ? l.d + 1 : 1), 0 < vt(u, o.to) && (o.to = u, o.r = null, o.d = o.l ? o.l.d + 1 : 1), u = !o.r, h && !o.l && xr(o, h), l && u && xr(o, l);
        }
      }
      function xr(o, s) {
        Fi(s) || function u(l, x) {
          var y = x.from, m = x.to, v = x.l, x = x.r;
          Er(l, y, m), v && u(l, v), x && u(l, x);
        }(o, s);
      }
      function Ga(o, s) {
        var u = mo(s), l = u.next();
        if (l.done) return !1;
        for (var h = l.value, y = mo(o), m = y.next(h.from), v = m.value; !l.done && !m.done; ) {
          if (vt(v.from, h.to) <= 0 && 0 <= vt(v.to, h.from)) return !0;
          vt(h.from, v.from) < 0 ? h = (l = u.next(v.from)).value : v = (m = y.next(h.from)).value;
        }
        return !1;
      }
      function mo(o) {
        var s = Fi(o) ? null : { s: 0, n: o };
        return { next: function(u) {
          for (var l = 0 < arguments.length; s; ) switch (s.s) {
            case 0:
              if (s.s = 1, l) for (; s.n.l && vt(u, s.n.from) < 0; ) s = { up: s, n: s.n.l, s: 1 };
              else for (; s.n.l; ) s = { up: s, n: s.n.l, s: 1 };
            case 1:
              if (s.s = 2, !l || vt(u, s.n.to) <= 0) return { value: s.n, done: !1 };
            case 2:
              if (s.n.r) {
                s.s = 3, s = { up: s, n: s.n.r, s: 0 };
                continue;
              }
            case 3:
              s = s.up;
          }
          return { done: !0 };
        } };
      }
      function za(o) {
        var s, u, l = (((s = o.r) === null || s === void 0 ? void 0 : s.d) || 0) - (((u = o.l) === null || u === void 0 ? void 0 : u.d) || 0), h = 1 < l ? "r" : l < -1 ? "l" : "";
        h && (s = h == "r" ? "l" : "r", u = r({}, o), l = o[h], o.from = l.from, o.to = l.to, o[h] = l[h], u[h] = l[s], (o[s] = u).d = Wa(u)), o.d = Wa(o);
      }
      function Wa(u) {
        var s = u.r, u = u.l;
        return (s ? u ? Math.max(s.d, u.d) : s.d : u ? u.d : 0) + 1;
      }
      function bo(o, s) {
        return c(s).forEach(function(u) {
          o[u] ? xr(o[u], s[u]) : o[u] = function l(h) {
            var y, m, v = {};
            for (y in h) g(h, y) && (m = h[y], v[y] = !m || typeof m != "object" || ut.has(m.constructor) ? m : l(m));
            return v;
          }(s[u]);
        }), o;
      }
      function Vi(o, s) {
        return o.all || s.all || Object.keys(o).some(function(u) {
          return s[u] && Ga(s[u], o[u]);
        });
      }
      b(te.prototype, ((ke = { add: function(o) {
        return xr(this, o), this;
      }, addKey: function(o) {
        return Er(this, o, o), this;
      }, addKeys: function(o) {
        var s = this;
        return o.forEach(function(u) {
          return Er(s, u, u);
        }), this;
      }, hasKey: function(o) {
        var s = mo(this).next(o).value;
        return s && vt(s.from, o) <= 0 && 0 <= vt(s.to, o);
      } })[G] = function() {
        return mo(this);
      }, ke));
      var Cn = {}, Hi = {}, qi = !1;
      function vo(o) {
        bo(Hi, o), qi || (qi = !0, setTimeout(function() {
          qi = !1, ji(Hi, !(Hi = {}));
        }, 0));
      }
      function ji(o, s) {
        s === void 0 && (s = !1);
        var u = /* @__PURE__ */ new Set();
        if (o.all) for (var l = 0, h = Object.values(Cn); l < h.length; l++) Ya(m = h[l], o, u, s);
        else for (var y in o) {
          var m, v = /^idb\:\/\/(.*)\/(.*)\//.exec(y);
          v && (y = v[1], v = v[2], (m = Cn["idb://".concat(y, "/").concat(v)]) && Ya(m, o, u, s));
        }
        u.forEach(function(x) {
          return x();
        });
      }
      function Ya(o, s, u, l) {
        for (var h = [], y = 0, m = Object.entries(o.queries.query); y < m.length; y++) {
          for (var v = m[y], x = v[0], k = [], B = 0, E = v[1]; B < E.length; B++) {
            var N = E[B];
            Vi(s, N.obsSet) ? N.subscribers.forEach(function(T) {
              return u.add(T);
            }) : l && k.push(N);
          }
          l && h.push([x, k]);
        }
        if (l) for (var S = 0, I = h; S < I.length; S++) {
          var C = I[S], x = C[0], k = C[1];
          o.queries.query[x] = k;
        }
      }
      function Vf(o) {
        var s = o._state, u = o._deps.indexedDB;
        if (s.isBeingOpened || o.idbdb) return s.dbReadyPromise.then(function() {
          return s.dbOpenError ? Ot(s.dbOpenError) : o;
        });
        s.isBeingOpened = !0, s.dbOpenError = null, s.openComplete = !1;
        var l = s.openCanceller, h = Math.round(10 * o.verno), y = !1;
        function m() {
          if (s.openCanceller !== l) throw new rt.DatabaseClosed("db.open() was cancelled");
        }
        function v() {
          return new J(function(N, S) {
            if (m(), !u) throw new rt.MissingAPI();
            var I = o.name, C = s.autoSchema || !h ? u.open(I) : u.open(I, h);
            if (!C) throw new rt.MissingAPI();
            C.onerror = $e(S), C.onblocked = Ct(o._fireOnBlocked), C.onupgradeneeded = Ct(function(T) {
              var U;
              B = C.transaction, s.autoSchema && !o._options.allowEmptyDB ? (C.onerror = wr, B.abort(), C.result.close(), (U = u.deleteDatabase(I)).onsuccess = U.onerror = Ct(function() {
                S(new rt.NoSuchDatabase("Database ".concat(I, " doesnt exist")));
              })) : (B.onerror = $e(S), T = T.oldVersion > Math.pow(2, 62) ? 0 : T.oldVersion, E = T < 1, o.idbdb = C.result, y && Mf(o, B), $f(o, T / 10, B, S));
            }, S), C.onsuccess = Ct(function() {
              B = null;
              var T, U, R, O, K, F = o.idbdb = C.result, Y = W(F.objectStoreNames);
              if (0 < Y.length) try {
                var V = F.transaction((O = Y).length === 1 ? O[0] : O, "readonly");
                if (s.autoSchema) U = F, R = V, (T = o).verno = U.version / 10, R = T._dbSchema = yo(0, U, R), T._storeNames = W(U.objectStoreNames, 0), ho(T, [T._allTables], c(R), R);
                else if (go(o, o._dbSchema, V), ((K = Li(yo(0, (K = o).idbdb, V), K._dbSchema)).add.length || K.change.some(function(q) {
                  return q.add.length || q.change.length;
                })) && !y) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), F.close(), h = F.version + 1, y = !0, N(v());
                lo(o, V);
              } catch {
              }
              qn.push(o), F.onversionchange = Ct(function(q) {
                s.vcFired = !0, o.on("versionchange").fire(q);
              }), F.onclose = Ct(function(q) {
                o.on("close").fire(q);
              }), E && (K = o._deps, V = I, F = K.indexedDB, K = K.IDBKeyRange, $i(F) || V === so || Di(F, K).put({ name: V }).catch(xt)), N();
            }, S);
          }).catch(function(N) {
            switch (N == null ? void 0 : N.name) {
              case "UnknownError":
                if (0 < s.PR1398_maxLoop) return s.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), v();
                break;
              case "VersionError":
                if (0 < h) return h = 0, v();
            }
            return J.reject(N);
          });
        }
        var x, k = s.dbReadyResolve, B = null, E = !1;
        return J.race([l, (typeof navigator > "u" ? J.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(N) {
          function S() {
            return indexedDB.databases().finally(N);
          }
          x = setInterval(S, 100), S();
        }).finally(function() {
          return clearInterval(x);
        }) : Promise.resolve()).then(v)]).then(function() {
          return m(), s.onReadyBeingFired = [], J.resolve(Mi(function() {
            return o.on.ready.fire(o.vip);
          })).then(function N() {
            if (0 < s.onReadyBeingFired.length) {
              var S = s.onReadyBeingFired.reduce(wi, xt);
              return s.onReadyBeingFired = [], J.resolve(Mi(function() {
                return S(o.vip);
              })).then(N);
            }
          });
        }).finally(function() {
          s.openCanceller === l && (s.onReadyBeingFired = null, s.isBeingOpened = !1);
        }).catch(function(N) {
          s.dbOpenError = N;
          try {
            B && B.abort();
          } catch {
          }
          return l === s.openCanceller && o._close(), Ot(N);
        }).finally(function() {
          s.openComplete = !0, k();
        }).then(function() {
          var N;
          return E && (N = {}, o.tables.forEach(function(S) {
            S.schema.indexes.forEach(function(I) {
              I.name && (N["idb://".concat(o.name, "/").concat(S.name, "/").concat(I.name)] = new te(-1 / 0, [[[]]]));
            }), N["idb://".concat(o.name, "/").concat(S.name, "/")] = N["idb://".concat(o.name, "/").concat(S.name, "/:dels")] = new te(-1 / 0, [[[]]]);
          }), fn(mr).fire(N), ji(N, !0)), o;
        });
      }
      function Gi(o) {
        function s(y) {
          return o.next(y);
        }
        var u = h(s), l = h(function(y) {
          return o.throw(y);
        });
        function h(y) {
          return function(x) {
            var v = y(x), x = v.value;
            return v.done ? x : x && typeof x.then == "function" ? x.then(u, l) : f(x) ? Promise.all(x).then(u, l) : u(x);
          };
        }
        return h(s)();
      }
      function Eo(o, s, u) {
        for (var l = f(o) ? o.slice() : [o], h = 0; h < u; ++h) l.push(s);
        return l;
      }
      var Hf = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(o) {
        return r(r({}, o), { table: function(s) {
          var u = o.table(s), l = u.schema, h = {}, y = [];
          function m(E, N, S) {
            var I = vr(E), C = h[I] = h[I] || [], T = E == null ? 0 : typeof E == "string" ? 1 : E.length, U = 0 < N, U = r(r({}, S), { name: U ? "".concat(I, "(virtual-from:").concat(S.name, ")") : S.name, lowLevelIndex: S, isVirtual: U, keyTail: N, keyLength: T, extractKey: Oi(E), unique: !U && S.unique });
            return C.push(U), U.isPrimaryKey || y.push(U), 1 < T && m(T === 2 ? E[0] : E.slice(0, T - 1), N + 1, S), C.sort(function(R, O) {
              return R.keyTail - O.keyTail;
            }), U;
          }
          s = m(l.primaryKey.keyPath, 0, l.primaryKey), h[":id"] = [s];
          for (var v = 0, x = l.indexes; v < x.length; v++) {
            var k = x[v];
            m(k.keyPath, 0, k);
          }
          function B(E) {
            var N, S = E.query.index;
            return S.isVirtual ? r(r({}, E), { query: { index: S.lowLevelIndex, range: (N = E.query.range, S = S.keyTail, { type: N.type === 1 ? 2 : N.type, lower: Eo(N.lower, N.lowerOpen ? o.MAX_KEY : o.MIN_KEY, S), lowerOpen: !0, upper: Eo(N.upper, N.upperOpen ? o.MIN_KEY : o.MAX_KEY, S), upperOpen: !0 }) } }) : E;
          }
          return r(r({}, u), { schema: r(r({}, l), { primaryKey: s, indexes: y, getIndexByKeyPath: function(E) {
            return (E = h[vr(E)]) && E[0];
          } }), count: function(E) {
            return u.count(B(E));
          }, query: function(E) {
            return u.query(B(E));
          }, openCursor: function(E) {
            var N = E.query.index, S = N.keyTail, I = N.isVirtual, C = N.keyLength;
            return I ? u.openCursor(B(E)).then(function(U) {
              return U && T(U);
            }) : u.openCursor(E);
            function T(U) {
              return Object.create(U, { continue: { value: function(R) {
                R != null ? U.continue(Eo(R, E.reverse ? o.MAX_KEY : o.MIN_KEY, S)) : E.unique ? U.continue(U.key.slice(0, C).concat(E.reverse ? o.MIN_KEY : o.MAX_KEY, S)) : U.continue();
              } }, continuePrimaryKey: { value: function(R, O) {
                U.continuePrimaryKey(Eo(R, o.MAX_KEY, S), O);
              } }, primaryKey: { get: function() {
                return U.primaryKey;
              } }, key: { get: function() {
                var R = U.key;
                return C === 1 ? R[0] : R.slice(0, C);
              } }, value: { get: function() {
                return U.value;
              } } });
            }
          } });
        } });
      } };
      function zi(o, s, u, l) {
        return u = u || {}, l = l || "", c(o).forEach(function(h) {
          var y, m, v;
          g(s, h) ? (y = o[h], m = s[h], typeof y == "object" && typeof m == "object" && y && m ? (v = X(y)) !== X(m) ? u[l + h] = s[h] : v === "Object" ? zi(y, m, u, l + h + ".") : y !== m && (u[l + h] = s[h]) : y !== m && (u[l + h] = s[h])) : u[l + h] = void 0;
        }), c(s).forEach(function(h) {
          g(o, h) || (u[l + h] = s[h]);
        }), u;
      }
      function Wi(o, s) {
        return s.type === "delete" ? s.keys : s.keys || s.values.map(o.extractKey);
      }
      var qf = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(o) {
        return r(r({}, o), { table: function(s) {
          var u = o.table(s), l = u.schema.primaryKey;
          return r(r({}, u), { mutate: function(h) {
            var y = it.trans, m = y.table(s).hook, v = m.deleting, x = m.creating, k = m.updating;
            switch (h.type) {
              case "add":
                if (x.fire === xt) break;
                return y._promise("readwrite", function() {
                  return B(h);
                }, !0);
              case "put":
                if (x.fire === xt && k.fire === xt) break;
                return y._promise("readwrite", function() {
                  return B(h);
                }, !0);
              case "delete":
                if (v.fire === xt) break;
                return y._promise("readwrite", function() {
                  return B(h);
                }, !0);
              case "deleteRange":
                if (v.fire === xt) break;
                return y._promise("readwrite", function() {
                  return function E(N, S, I) {
                    return u.query({ trans: N, values: !1, query: { index: l, range: S }, limit: I }).then(function(C) {
                      var T = C.result;
                      return B({ type: "delete", keys: T, trans: N }).then(function(U) {
                        return 0 < U.numFailures ? Promise.reject(U.failures[0]) : T.length < I ? { failures: [], numFailures: 0, lastResult: void 0 } : E(N, r(r({}, S), { lower: T[T.length - 1], lowerOpen: !0 }), I);
                      });
                    });
                  }(h.trans, h.range, 1e4);
                }, !0);
            }
            return u.mutate(h);
            function B(E) {
              var N, S, I, C = it.trans, T = E.keys || Wi(l, E);
              if (!T) throw new Error("Keys missing");
              return (E = E.type === "add" || E.type === "put" ? r(r({}, E), { keys: T }) : r({}, E)).type !== "delete" && (E.values = i([], E.values)), E.keys && (E.keys = i([], E.keys)), N = u, I = T, ((S = E).type === "add" ? Promise.resolve([]) : N.getMany({ trans: S.trans, keys: I, cache: "immutable" })).then(function(U) {
                var R = T.map(function(O, K) {
                  var F, Y, V, q = U[K], Q = { onerror: null, onsuccess: null };
                  return E.type === "delete" ? v.fire.call(Q, O, q, C) : E.type === "add" || q === void 0 ? (F = x.fire.call(Q, O, E.values[K], C), O == null && F != null && (E.keys[K] = O = F, l.outbound || ot(E.values[K], l.keyPath, O))) : (F = zi(q, E.values[K]), (Y = k.fire.call(Q, F, O, q, C)) && (V = E.values[K], Object.keys(Y).forEach(function(z) {
                    g(V, z) ? V[z] = Y[z] : ot(V, z, Y[z]);
                  }))), Q;
                });
                return u.mutate(E).then(function(O) {
                  for (var K = O.failures, F = O.results, Y = O.numFailures, O = O.lastResult, V = 0; V < T.length; ++V) {
                    var q = (F || T)[V], Q = R[V];
                    q == null ? Q.onerror && Q.onerror(K[V]) : Q.onsuccess && Q.onsuccess(E.type === "put" && U[V] ? E.values[V] : q);
                  }
                  return { failures: K, results: F, numFailures: Y, lastResult: O };
                }).catch(function(O) {
                  return R.forEach(function(K) {
                    return K.onerror && K.onerror(O);
                  }), Promise.reject(O);
                });
              });
            }
          } });
        } });
      } };
      function Za(o, s, u) {
        try {
          if (!s || s.keys.length < o.length) return null;
          for (var l = [], h = 0, y = 0; h < s.keys.length && y < o.length; ++h) vt(s.keys[h], o[y]) === 0 && (l.push(u ? Z(s.values[h]) : s.values[h]), ++y);
          return l.length === o.length ? l : null;
        } catch {
          return null;
        }
      }
      var jf = { stack: "dbcore", level: -1, create: function(o) {
        return { table: function(s) {
          var u = o.table(s);
          return r(r({}, u), { getMany: function(l) {
            if (!l.cache) return u.getMany(l);
            var h = Za(l.keys, l.trans._cache, l.cache === "clone");
            return h ? J.resolve(h) : u.getMany(l).then(function(y) {
              return l.trans._cache = { keys: l.keys, values: l.cache === "clone" ? Z(y) : y }, y;
            });
          }, mutate: function(l) {
            return l.type !== "add" && (l.trans._cache = null), u.mutate(l);
          } });
        } };
      } };
      function Xa(o, s) {
        return o.trans.mode === "readonly" && !!o.subscr && !o.trans.explicit && o.trans.db._options.cache !== "disabled" && !s.schema.primaryKey.outbound;
      }
      function Qa(o, s) {
        switch (o) {
          case "query":
            return s.values && !s.unique;
          case "get":
          case "getMany":
          case "count":
          case "openCursor":
            return !1;
        }
      }
      var Gf = { stack: "dbcore", level: 0, name: "Observability", create: function(o) {
        var s = o.schema.name, u = new te(o.MIN_KEY, o.MAX_KEY);
        return r(r({}, o), { transaction: function(l, h, y) {
          if (it.subscr && h !== "readonly") throw new rt.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(it.querier));
          return o.transaction(l, h, y);
        }, table: function(l) {
          var h = o.table(l), y = h.schema, m = y.primaryKey, E = y.indexes, v = m.extractKey, x = m.outbound, k = m.autoIncrement && E.filter(function(S) {
            return S.compound && S.keyPath.includes(m.keyPath);
          }), B = r(r({}, h), { mutate: function(S) {
            function I(z) {
              return z = "idb://".concat(s, "/").concat(l, "/").concat(z), O[z] || (O[z] = new te());
            }
            var C, T, U, R = S.trans, O = S.mutatedParts || (S.mutatedParts = {}), K = I(""), F = I(":dels"), Y = S.type, Q = S.type === "deleteRange" ? [S.range] : S.type === "delete" ? [S.keys] : S.values.length < 50 ? [Wi(m, S).filter(function(z) {
              return z;
            }), S.values] : [], V = Q[0], q = Q[1], Q = S.trans._cache;
            return f(V) ? (K.addKeys(V), (Q = Y === "delete" || V.length === q.length ? Za(V, Q) : null) || F.addKeys(V), (Q || q) && (C = I, T = Q, U = q, y.indexes.forEach(function(z) {
              var nt = C(z.name || "");
              function pt(mt) {
                return mt != null ? z.extractKey(mt) : null;
              }
              function wt(mt) {
                return z.multiEntry && f(mt) ? mt.forEach(function(xe) {
                  return nt.addKey(xe);
                }) : nt.addKey(mt);
              }
              (T || U).forEach(function(mt, ee) {
                var ht = T && pt(T[ee]), ee = U && pt(U[ee]);
                vt(ht, ee) !== 0 && (ht != null && wt(ht), ee != null && wt(ee));
              });
            }))) : V ? (q = { from: (q = V.lower) !== null && q !== void 0 ? q : o.MIN_KEY, to: (q = V.upper) !== null && q !== void 0 ? q : o.MAX_KEY }, F.add(q), K.add(q)) : (K.add(u), F.add(u), y.indexes.forEach(function(z) {
              return I(z.name).add(u);
            })), h.mutate(S).then(function(z) {
              return !V || S.type !== "add" && S.type !== "put" || (K.addKeys(z.results), k && k.forEach(function(nt) {
                for (var pt = S.values.map(function(ht) {
                  return nt.extractKey(ht);
                }), wt = nt.keyPath.findIndex(function(ht) {
                  return ht === m.keyPath;
                }), mt = 0, xe = z.results.length; mt < xe; ++mt) pt[mt][wt] = z.results[mt];
                I(nt.name).addKeys(pt);
              })), R.mutatedParts = bo(R.mutatedParts || {}, O), z;
            });
          } }), E = function(I) {
            var C = I.query, I = C.index, C = C.range;
            return [I, new te((I = C.lower) !== null && I !== void 0 ? I : o.MIN_KEY, (C = C.upper) !== null && C !== void 0 ? C : o.MAX_KEY)];
          }, N = { get: function(S) {
            return [m, new te(S.key)];
          }, getMany: function(S) {
            return [m, new te().addKeys(S.keys)];
          }, count: E, query: E, openCursor: E };
          return c(N).forEach(function(S) {
            B[S] = function(I) {
              var C = it.subscr, T = !!C, U = Xa(it, h) && Qa(S, I) ? I.obsSet = {} : C;
              if (T) {
                var R = function(q) {
                  return q = "idb://".concat(s, "/").concat(l, "/").concat(q), U[q] || (U[q] = new te());
                }, O = R(""), K = R(":dels"), C = N[S](I), T = C[0], C = C[1];
                if ((S === "query" && T.isPrimaryKey && !I.values ? K : R(T.name || "")).add(C), !T.isPrimaryKey) {
                  if (S !== "count") {
                    var F = S === "query" && x && I.values && h.query(r(r({}, I), { values: !1 }));
                    return h[S].apply(this, arguments).then(function(q) {
                      if (S === "query") {
                        if (x && I.values) return F.then(function(pt) {
                          return pt = pt.result, O.addKeys(pt), q;
                        });
                        var Q = I.values ? q.result.map(v) : q.result;
                        (I.values ? O : K).addKeys(Q);
                      } else if (S === "openCursor") {
                        var z = q, nt = I.values;
                        return z && Object.create(z, { key: { get: function() {
                          return K.addKey(z.primaryKey), z.key;
                        } }, primaryKey: { get: function() {
                          var pt = z.primaryKey;
                          return K.addKey(pt), pt;
                        } }, value: { get: function() {
                          return nt && O.addKey(z.primaryKey), z.value;
                        } } });
                      }
                      return q;
                    });
                  }
                  K.add(u);
                }
              }
              return h[S].apply(this, arguments);
            };
          }), B;
        } });
      } };
      function Ja(o, s, u) {
        if (u.numFailures === 0) return s;
        if (s.type === "deleteRange") return null;
        var l = s.keys ? s.keys.length : "values" in s && s.values ? s.values.length : 1;
        return u.numFailures === l ? null : (s = r({}, s), f(s.keys) && (s.keys = s.keys.filter(function(h, y) {
          return !(y in u.failures);
        })), "values" in s && f(s.values) && (s.values = s.values.filter(function(h, y) {
          return !(y in u.failures);
        })), s);
      }
      function Yi(o, s) {
        return u = o, ((l = s).lower === void 0 || (l.lowerOpen ? 0 < vt(u, l.lower) : 0 <= vt(u, l.lower))) && (o = o, (s = s).upper === void 0 || (s.upperOpen ? vt(o, s.upper) < 0 : vt(o, s.upper) <= 0));
        var u, l;
      }
      function tc(o, s, N, l, h, y) {
        if (!N || N.length === 0) return o;
        var m = s.query.index, v = m.multiEntry, x = s.query.range, k = l.schema.primaryKey.extractKey, B = m.extractKey, E = (m.lowLevelIndex || m).extractKey, N = N.reduce(function(S, I) {
          var C = S, T = [];
          if (I.type === "add" || I.type === "put") for (var U = new te(), R = I.values.length - 1; 0 <= R; --R) {
            var O, K = I.values[R], F = k(K);
            U.hasKey(F) || (O = B(K), (v && f(O) ? O.some(function(z) {
              return Yi(z, x);
            }) : Yi(O, x)) && (U.addKey(F), T.push(K)));
          }
          switch (I.type) {
            case "add":
              var Y = new te().addKeys(s.values ? S.map(function(nt) {
                return k(nt);
              }) : S), C = S.concat(s.values ? T.filter(function(nt) {
                return nt = k(nt), !Y.hasKey(nt) && (Y.addKey(nt), !0);
              }) : T.map(function(nt) {
                return k(nt);
              }).filter(function(nt) {
                return !Y.hasKey(nt) && (Y.addKey(nt), !0);
              }));
              break;
            case "put":
              var V = new te().addKeys(I.values.map(function(nt) {
                return k(nt);
              }));
              C = S.filter(function(nt) {
                return !V.hasKey(s.values ? k(nt) : nt);
              }).concat(s.values ? T : T.map(function(nt) {
                return k(nt);
              }));
              break;
            case "delete":
              var q = new te().addKeys(I.keys);
              C = S.filter(function(nt) {
                return !q.hasKey(s.values ? k(nt) : nt);
              });
              break;
            case "deleteRange":
              var Q = I.range;
              C = S.filter(function(nt) {
                return !Yi(k(nt), Q);
              });
          }
          return C;
        }, o);
        return N === o ? o : (N.sort(function(S, I) {
          return vt(E(S), E(I)) || vt(k(S), k(I));
        }), s.limit && s.limit < 1 / 0 && (N.length > s.limit ? N.length = s.limit : o.length === s.limit && N.length < s.limit && (h.dirty = !0)), y ? Object.freeze(N) : N);
      }
      function ec(o, s) {
        return vt(o.lower, s.lower) === 0 && vt(o.upper, s.upper) === 0 && !!o.lowerOpen == !!s.lowerOpen && !!o.upperOpen == !!s.upperOpen;
      }
      function zf(o, s) {
        return function(u, l, h, y) {
          if (u === void 0) return l !== void 0 ? -1 : 0;
          if (l === void 0) return 1;
          if ((l = vt(u, l)) === 0) {
            if (h && y) return 0;
            if (h) return 1;
            if (y) return -1;
          }
          return l;
        }(o.lower, s.lower, o.lowerOpen, s.lowerOpen) <= 0 && 0 <= function(u, l, h, y) {
          if (u === void 0) return l !== void 0 ? 1 : 0;
          if (l === void 0) return -1;
          if ((l = vt(u, l)) === 0) {
            if (h && y) return 0;
            if (h) return -1;
            if (y) return 1;
          }
          return l;
        }(o.upper, s.upper, o.upperOpen, s.upperOpen);
      }
      function Wf(o, s, u, l) {
        o.subscribers.add(u), l.addEventListener("abort", function() {
          var h, y;
          o.subscribers.delete(u), o.subscribers.size === 0 && (h = o, y = s, setTimeout(function() {
            h.subscribers.size === 0 && dt(y, h);
          }, 3e3));
        });
      }
      var Yf = { stack: "dbcore", level: 0, name: "Cache", create: function(o) {
        var s = o.schema.name;
        return r(r({}, o), { transaction: function(u, l, h) {
          var y, m, v = o.transaction(u, l, h);
          return l === "readwrite" && (m = (y = new AbortController()).signal, h = function(x) {
            return function() {
              if (y.abort(), l === "readwrite") {
                for (var k = /* @__PURE__ */ new Set(), B = 0, E = u; B < E.length; B++) {
                  var N = E[B], S = Cn["idb://".concat(s, "/").concat(N)];
                  if (S) {
                    var I = o.table(N), C = S.optimisticOps.filter(function(nt) {
                      return nt.trans === v;
                    });
                    if (v._explicit && x && v.mutatedParts) for (var T = 0, U = Object.values(S.queries.query); T < U.length; T++) for (var R = 0, O = (Y = U[T]).slice(); R < O.length; R++) Vi((V = O[R]).obsSet, v.mutatedParts) && (dt(Y, V), V.subscribers.forEach(function(nt) {
                      return k.add(nt);
                    }));
                    else if (0 < C.length) {
                      S.optimisticOps = S.optimisticOps.filter(function(nt) {
                        return nt.trans !== v;
                      });
                      for (var K = 0, F = Object.values(S.queries.query); K < F.length; K++) for (var Y, V, q, Q = 0, z = (Y = F[K]).slice(); Q < z.length; Q++) (V = z[Q]).res != null && v.mutatedParts && (x && !V.dirty ? (q = Object.isFrozen(V.res), q = tc(V.res, V.req, C, I, V, q), V.dirty ? (dt(Y, V), V.subscribers.forEach(function(nt) {
                        return k.add(nt);
                      })) : q !== V.res && (V.res = q, V.promise = J.resolve({ result: q }))) : (V.dirty && dt(Y, V), V.subscribers.forEach(function(nt) {
                        return k.add(nt);
                      })));
                    }
                  }
                }
                k.forEach(function(nt) {
                  return nt();
                });
              }
            };
          }, v.addEventListener("abort", h(!1), { signal: m }), v.addEventListener("error", h(!1), { signal: m }), v.addEventListener("complete", h(!0), { signal: m })), v;
        }, table: function(u) {
          var l = o.table(u), h = l.schema.primaryKey;
          return r(r({}, l), { mutate: function(y) {
            var m = it.trans;
            if (h.outbound || m.db._options.cache === "disabled" || m.explicit || m.idbtrans.mode !== "readwrite") return l.mutate(y);
            var v = Cn["idb://".concat(s, "/").concat(u)];
            return v ? (m = l.mutate(y), y.type !== "add" && y.type !== "put" || !(50 <= y.values.length || Wi(h, y).some(function(x) {
              return x == null;
            })) ? (v.optimisticOps.push(y), y.mutatedParts && vo(y.mutatedParts), m.then(function(x) {
              0 < x.numFailures && (dt(v.optimisticOps, y), (x = Ja(0, y, x)) && v.optimisticOps.push(x), y.mutatedParts && vo(y.mutatedParts));
            }), m.catch(function() {
              dt(v.optimisticOps, y), y.mutatedParts && vo(y.mutatedParts);
            })) : m.then(function(x) {
              var k = Ja(0, r(r({}, y), { values: y.values.map(function(B, E) {
                var N;
                return x.failures[E] ? B : (B = (N = h.keyPath) !== null && N !== void 0 && N.includes(".") ? Z(B) : r({}, B), ot(B, h.keyPath, x.results[E]), B);
              }) }), x);
              v.optimisticOps.push(k), queueMicrotask(function() {
                return y.mutatedParts && vo(y.mutatedParts);
              });
            }), m) : l.mutate(y);
          }, query: function(y) {
            if (!Xa(it, l) || !Qa("query", y)) return l.query(y);
            var m = ((k = it.trans) === null || k === void 0 ? void 0 : k.db._options.cache) === "immutable", E = it, v = E.requery, x = E.signal, k = function(I, C, T, U) {
              var R = Cn["idb://".concat(I, "/").concat(C)];
              if (!R) return [];
              if (!(C = R.queries[T])) return [null, !1, R, null];
              var O = C[(U.query ? U.query.index.name : null) || ""];
              if (!O) return [null, !1, R, null];
              switch (T) {
                case "query":
                  var K = O.find(function(F) {
                    return F.req.limit === U.limit && F.req.values === U.values && ec(F.req.query.range, U.query.range);
                  });
                  return K ? [K, !0, R, O] : [O.find(function(F) {
                    return ("limit" in F.req ? F.req.limit : 1 / 0) >= U.limit && (!U.values || F.req.values) && zf(F.req.query.range, U.query.range);
                  }), !1, R, O];
                case "count":
                  return K = O.find(function(F) {
                    return ec(F.req.query.range, U.query.range);
                  }), [K, !!K, R, O];
              }
            }(s, u, "query", y), B = k[0], E = k[1], N = k[2], S = k[3];
            return B && E ? B.obsSet = y.obsSet : (E = l.query(y).then(function(I) {
              var C = I.result;
              if (B && (B.res = C), m) {
                for (var T = 0, U = C.length; T < U; ++T) Object.freeze(C[T]);
                Object.freeze(C);
              } else I.result = Z(C);
              return I;
            }).catch(function(I) {
              return S && B && dt(S, B), Promise.reject(I);
            }), B = { obsSet: y.obsSet, promise: E, subscribers: /* @__PURE__ */ new Set(), type: "query", req: y, dirty: !1 }, S ? S.push(B) : (S = [B], (N = N || (Cn["idb://".concat(s, "/").concat(u)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[y.query.index.name || ""] = S)), Wf(B, S, v, x), B.promise.then(function(I) {
              return { result: tc(I.result, y, N == null ? void 0 : N.optimisticOps, l, B, m) };
            });
          } });
        } });
      } };
      function xo(o, s) {
        return new Proxy(o, { get: function(u, l, h) {
          return l === "db" ? s : Reflect.get(u, l, h);
        } });
      }
      var ze = (Pt.prototype.version = function(o) {
        if (isNaN(o) || o < 0.1) throw new rt.Type("Given version is not a positive number");
        if (o = Math.round(10 * o) / 10, this.idbdb || this._state.isBeingOpened) throw new rt.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, o);
        var s = this._versions, u = s.filter(function(l) {
          return l._cfg.version === o;
        })[0];
        return u || (u = new this.Version(o), s.push(u), s.sort(Df), u.stores({}), this._state.autoSchema = !1, u);
      }, Pt.prototype._whenReady = function(o) {
        var s = this;
        return this.idbdb && (this._state.openComplete || it.letThrough || this._vip) ? o() : new J(function(u, l) {
          if (s._state.openComplete) return l(new rt.DatabaseClosed(s._state.dbOpenError));
          if (!s._state.isBeingOpened) {
            if (!s._state.autoOpen) return void l(new rt.DatabaseClosed());
            s.open().catch(xt);
          }
          s._state.dbReadyPromise.then(u, l);
        }).then(o);
      }, Pt.prototype.use = function(o) {
        var s = o.stack, u = o.create, l = o.level, h = o.name;
        return h && this.unuse({ stack: s, name: h }), o = this._middlewares[s] || (this._middlewares[s] = []), o.push({ stack: s, create: u, level: l ?? 10, name: h }), o.sort(function(y, m) {
          return y.level - m.level;
        }), this;
      }, Pt.prototype.unuse = function(o) {
        var s = o.stack, u = o.name, l = o.create;
        return s && this._middlewares[s] && (this._middlewares[s] = this._middlewares[s].filter(function(h) {
          return l ? h.create !== l : !!u && h.name !== u;
        })), this;
      }, Pt.prototype.open = function() {
        var o = this;
        return In(on, function() {
          return Vf(o);
        });
      }, Pt.prototype._close = function() {
        var o = this._state, s = qn.indexOf(this);
        if (0 <= s && qn.splice(s, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        o.isBeingOpened || (o.dbReadyPromise = new J(function(u) {
          o.dbReadyResolve = u;
        }), o.openCanceller = new J(function(u, l) {
          o.cancelOpen = l;
        }));
      }, Pt.prototype.close = function(u) {
        var s = (u === void 0 ? { disableAutoOpen: !0 } : u).disableAutoOpen, u = this._state;
        s ? (u.isBeingOpened && u.cancelOpen(new rt.DatabaseClosed()), this._close(), u.autoOpen = !1, u.dbOpenError = new rt.DatabaseClosed()) : (this._close(), u.autoOpen = this._options.autoOpen || u.isBeingOpened, u.openComplete = !1, u.dbOpenError = null);
      }, Pt.prototype.delete = function(o) {
        var s = this;
        o === void 0 && (o = { disableAutoOpen: !0 });
        var u = 0 < arguments.length && typeof arguments[0] != "object", l = this._state;
        return new J(function(h, y) {
          function m() {
            s.close(o);
            var v = s._deps.indexedDB.deleteDatabase(s.name);
            v.onsuccess = Ct(function() {
              var x, k, B;
              x = s._deps, k = s.name, B = x.indexedDB, x = x.IDBKeyRange, $i(B) || k === so || Di(B, x).delete(k).catch(xt), h();
            }), v.onerror = $e(y), v.onblocked = s._fireOnBlocked;
          }
          if (u) throw new rt.InvalidArgument("Invalid closeOptions argument to db.delete()");
          l.isBeingOpened ? l.dbReadyPromise.then(m) : m();
        });
      }, Pt.prototype.backendDB = function() {
        return this.idbdb;
      }, Pt.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, Pt.prototype.hasBeenClosed = function() {
        var o = this._state.dbOpenError;
        return o && o.name === "DatabaseClosed";
      }, Pt.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, Pt.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(Pt.prototype, "tables", { get: function() {
        var o = this;
        return c(this._allTables).map(function(s) {
          return o._allTables[s];
        });
      }, enumerable: !1, configurable: !0 }), Pt.prototype.transaction = function() {
        var o = (function(s, u, l) {
          var h = arguments.length;
          if (h < 2) throw new rt.InvalidArgument("Too few arguments");
          for (var y = new Array(h - 1); --h; ) y[h - 1] = arguments[h];
          return l = y.pop(), [s, bt(y), l];
        }).apply(this, arguments);
        return this._transaction.apply(this, o);
      }, Pt.prototype._transaction = function(o, s, u) {
        var l = this, h = it.trans;
        h && h.db === this && o.indexOf("!") === -1 || (h = null);
        var y, m, v = o.indexOf("?") !== -1;
        o = o.replace("!", "").replace("?", "");
        try {
          if (m = s.map(function(k) {
            if (k = k instanceof l.Table ? k.name : k, typeof k != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return k;
          }), o == "r" || o === Ai) y = Ai;
          else {
            if (o != "rw" && o != Ii) throw new rt.InvalidArgument("Invalid transaction mode: " + o);
            y = Ii;
          }
          if (h) {
            if (h.mode === Ai && y === Ii) {
              if (!v) throw new rt.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              h = null;
            }
            h && m.forEach(function(k) {
              if (h && h.storeNames.indexOf(k) === -1) {
                if (!v) throw new rt.SubTransaction("Table " + k + " not included in parent transaction.");
                h = null;
              }
            }), v && h && !h.active && (h = null);
          }
        } catch (k) {
          return h ? h._promise(null, function(B, E) {
            E(k);
          }) : Ot(k);
        }
        var x = (function k(B, E, N, S, I) {
          return J.resolve().then(function() {
            var C = it.transless || it, T = B._createTransaction(E, N, B._dbSchema, S);
            if (T.explicit = !0, C = { trans: T, transless: C }, S) T.idbtrans = S.idbtrans;
            else try {
              T.create(), T.idbtrans._explicit = !0, B._state.PR1398_maxLoop = 3;
            } catch (O) {
              return O.name === Se.InvalidState && B.isOpen() && 0 < --B._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), B.close({ disableAutoOpen: !1 }), B.open().then(function() {
                return k(B, E, N, null, I);
              })) : Ot(O);
            }
            var U, R = kt(I);
            return R && Hn(), C = J.follow(function() {
              var O;
              (U = I.call(T, T)) && (R ? (O = an.bind(null, null), U.then(O, O)) : typeof U.next == "function" && typeof U.throw == "function" && (U = Gi(U)));
            }, C), (U && typeof U.then == "function" ? J.resolve(U).then(function(O) {
              return T.active ? O : Ot(new rt.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : C.then(function() {
              return U;
            })).then(function(O) {
              return S && T._resolve(), T._completion.then(function() {
                return O;
              });
            }).catch(function(O) {
              return T._reject(O), Ot(O);
            });
          });
        }).bind(null, this, y, m, h, u);
        return h ? h._promise(y, x, "lock") : it.trans ? In(it.transless, function() {
          return l._whenReady(x);
        }) : this._whenReady(x);
      }, Pt.prototype.table = function(o) {
        if (!g(this._allTables, o)) throw new rt.InvalidTable("Table ".concat(o, " does not exist"));
        return this._allTables[o];
      }, Pt);
      function Pt(o, s) {
        var u = this;
        this._middlewares = {}, this.verno = 0;
        var l = Pt.dependencies;
        this._options = s = r({ addons: Pt.addons, autoOpen: !0, indexedDB: l.indexedDB, IDBKeyRange: l.IDBKeyRange, cache: "cloned" }, s), this._deps = { indexedDB: s.indexedDB, IDBKeyRange: s.IDBKeyRange }, l = s.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var h, y, m, v, x, k = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: xt, dbReadyPromise: null, cancelOpen: xt, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: s.autoOpen };
        k.dbReadyPromise = new J(function(E) {
          k.dbReadyResolve = E;
        }), k.openCanceller = new J(function(E, N) {
          k.cancelOpen = N;
        }), this._state = k, this.name = o, this.on = pr(this, "populate", "blocked", "versionchange", "close", { ready: [wi, xt] }), this.on.ready.subscribe = j(this.on.ready.subscribe, function(E) {
          return function(N, S) {
            Pt.vip(function() {
              var I, C = u._state;
              C.openComplete ? (C.dbOpenError || J.resolve().then(N), S && E(N)) : C.onReadyBeingFired ? (C.onReadyBeingFired.push(N), S && E(N)) : (E(N), I = u, S || E(function T() {
                I.on.ready.unsubscribe(N), I.on.ready.unsubscribe(T);
              }));
            });
          };
        }), this.Collection = (h = this, yr(Nf.prototype, function(U, T) {
          this.db = h;
          var S = Ua, I = null;
          if (T) try {
            S = T();
          } catch (R) {
            I = R;
          }
          var C = U._ctx, T = C.table, U = T.hook.reading.fire;
          this._ctx = { table: T, index: C.index, isPrimKey: !C.index || T.schema.primKey.keyPath && C.index === T.schema.primKey.name, range: S, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: I, or: C.or, valueMapper: U !== be ? U : null };
        })), this.Table = (y = this, yr(La.prototype, function(E, N, S) {
          this.db = y, this._tx = S, this.name = E, this.schema = N, this.hook = y._allTables[E] ? y._allTables[E].hook : pr(null, { creating: [rn, xt], reading: [xn, be], updating: [kf, xt], deleting: [Sf, xt] });
        })), this.Transaction = (m = this, yr(Of.prototype, function(E, N, S, I, C) {
          var T = this;
          this.db = m, this.mode = E, this.storeNames = N, this.schema = S, this.chromeTransactionDurability = I, this.idbtrans = null, this.on = pr(this, "complete", "error", "abort"), this.parent = C || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new J(function(U, R) {
            T._resolve = U, T._reject = R;
          }), this._completion.then(function() {
            T.active = !1, T.on.complete.fire();
          }, function(U) {
            var R = T.active;
            return T.active = !1, T.on.error.fire(U), T.parent ? T.parent._reject(U) : R && T.idbtrans && T.idbtrans.abort(), Ot(U);
          });
        })), this.Version = (v = this, yr(Ff.prototype, function(E) {
          this.db = v, this._cfg = { version: E, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (x = this, yr(Fa.prototype, function(E, N, S) {
          if (this.db = x, this._ctx = { table: E, index: N === ":id" ? null : N, or: S }, this._cmp = this._ascending = vt, this._descending = function(I, C) {
            return vt(C, I);
          }, this._max = function(I, C) {
            return 0 < vt(I, C) ? I : C;
          }, this._min = function(I, C) {
            return vt(I, C) < 0 ? I : C;
          }, this._IDBKeyRange = x._deps.IDBKeyRange, !this._IDBKeyRange) throw new rt.MissingAPI();
        })), this.on("versionchange", function(E) {
          0 < E.newVersion ? console.warn("Another connection wants to upgrade database '".concat(u.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(u.name, "'. Closing db now to resume the delete request.")), u.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(E) {
          !E.newVersion || E.newVersion < E.oldVersion ? console.warn("Dexie.delete('".concat(u.name, "') was blocked")) : console.warn("Upgrade '".concat(u.name, "' blocked by other connection holding version ").concat(E.oldVersion / 10));
        }), this._maxKey = br(s.IDBKeyRange), this._createTransaction = function(E, N, S, I) {
          return new u.Transaction(E, N, S, u._options.chromeTransactionDurability, I);
        }, this._fireOnBlocked = function(E) {
          u.on("blocked").fire(E), qn.filter(function(N) {
            return N.name === u.name && N !== u && !N._state.vcFired;
          }).map(function(N) {
            return N.on("versionchange").fire(E);
          });
        }, this.use(jf), this.use(Yf), this.use(Gf), this.use(Hf), this.use(qf);
        var B = new Proxy(this, { get: function(E, N, S) {
          if (N === "_vip") return !0;
          if (N === "table") return function(C) {
            return xo(u.table(C), B);
          };
          var I = Reflect.get(E, N, S);
          return I instanceof La ? xo(I, B) : N === "tables" ? I.map(function(C) {
            return xo(C, B);
          }) : N === "_createTransaction" ? function() {
            return xo(I.apply(this, arguments), B);
          } : I;
        } });
        this.vip = B, l.forEach(function(E) {
          return E(u);
        });
      }
      var So, ke = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", Zf = (Zi.prototype.subscribe = function(o, s, u) {
        return this._subscribe(o && typeof o != "function" ? o : { next: o, error: s, complete: u });
      }, Zi.prototype[ke] = function() {
        return this;
      }, Zi);
      function Zi(o) {
        this._subscribe = o;
      }
      try {
        So = { indexedDB: a.indexedDB || a.mozIndexedDB || a.webkitIndexedDB || a.msIndexedDB, IDBKeyRange: a.IDBKeyRange || a.webkitIDBKeyRange };
      } catch {
        So = { indexedDB: null, IDBKeyRange: null };
      }
      function nc(o) {
        var s, u = !1, l = new Zf(function(h) {
          var y = kt(o), m, v = !1, x = {}, k = {}, B = { get closed() {
            return v;
          }, unsubscribe: function() {
            v || (v = !0, m && m.abort(), E && fn.storagemutated.unsubscribe(S));
          } };
          h.start && h.start(B);
          var E = !1, N = function() {
            return Ti(I);
          }, S = function(C) {
            bo(x, C), Vi(k, x) && N();
          }, I = function() {
            var C, T, U;
            !v && So.indexedDB && (x = {}, C = {}, m && m.abort(), m = new AbortController(), U = function(R) {
              var O = Fn();
              try {
                y && Hn();
                var K = sn(o, R);
                return K = y ? K.finally(an) : K;
              } finally {
                O && Vn();
              }
            }(T = { subscr: C, signal: m.signal, requery: N, querier: o, trans: null }), Promise.resolve(U).then(function(R) {
              u = !0, s = R, v || T.signal.aborted || (x = {}, function(O) {
                for (var K in O) if (g(O, K)) return;
                return 1;
              }(k = C) || E || (fn(mr, S), E = !0), Ti(function() {
                return !v && h.next && h.next(R);
              }));
            }, function(R) {
              u = !1, ["DatabaseClosedError", "AbortError"].includes(R == null ? void 0 : R.name) || v || Ti(function() {
                v || h.error && h.error(R);
              });
            }));
          };
          return setTimeout(N, 0), B;
        });
        return l.hasValue = function() {
          return u;
        }, l.getValue = function() {
          return s;
        }, l;
      }
      var Nn = ze;
      function Xi(o) {
        var s = ln;
        try {
          ln = !0, fn.storagemutated.fire(o), ji(o, !0);
        } finally {
          ln = s;
        }
      }
      b(Nn, r(r({}, nn), { delete: function(o) {
        return new Nn(o, { addons: [] }).delete();
      }, exists: function(o) {
        return new Nn(o, { addons: [] }).open().then(function(s) {
          return s.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(o) {
        try {
          return s = Nn.dependencies, u = s.indexedDB, s = s.IDBKeyRange, ($i(u) ? Promise.resolve(u.databases()).then(function(l) {
            return l.map(function(h) {
              return h.name;
            }).filter(function(h) {
              return h !== so;
            });
          }) : Di(u, s).toCollection().primaryKeys()).then(o);
        } catch {
          return Ot(new rt.MissingAPI());
        }
        var s, u;
      }, defineClass: function() {
        return function(o) {
          d(this, o);
        };
      }, ignoreTransaction: function(o) {
        return it.trans ? In(it.transless, o) : o();
      }, vip: Mi, async: function(o) {
        return function() {
          try {
            var s = Gi(o.apply(this, arguments));
            return s && typeof s.then == "function" ? s : J.resolve(s);
          } catch (u) {
            return Ot(u);
          }
        };
      }, spawn: function(o, s, u) {
        try {
          var l = Gi(o.apply(u, s || []));
          return l && typeof l.then == "function" ? l : J.resolve(l);
        } catch (h) {
          return Ot(h);
        }
      }, currentTransaction: { get: function() {
        return it.trans || null;
      } }, waitFor: function(o, s) {
        return s = J.resolve(typeof o == "function" ? Nn.ignoreTransaction(o) : o).timeout(s || 6e4), it.trans ? it.trans.waitFor(s) : s;
      }, Promise: J, debug: { get: function() {
        return De;
      }, set: function(o) {
        Ta(o);
      } }, derive: A, extend: d, props: b, override: j, Events: pr, on: fn, liveQuery: nc, extendObservabilitySet: bo, getByKeyPath: tt, setByKeyPath: ot, delByKeyPath: function(o, s) {
        typeof s == "string" ? ot(o, s, void 0) : "length" in s && [].map.call(s, function(u) {
          ot(o, u, void 0);
        });
      }, shallowClone: yt, deepClone: Z, getObjectDiff: zi, cmp: vt, asap: M, minKey: -1 / 0, addons: [], connections: qn, errnames: Se, dependencies: So, cache: Cn, semVer: "4.0.11", version: "4.0.11".split(".").map(function(o) {
        return parseInt(o);
      }).reduce(function(o, s, u) {
        return o + s / Math.pow(10, 2 * u);
      }) })), Nn.maxKey = br(Nn.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (fn(mr, function(o) {
        ln || (o = new CustomEvent(Ni, { detail: o }), ln = !0, dispatchEvent(o), ln = !1);
      }), addEventListener(Ni, function(o) {
        o = o.detail, ln || Xi(o);
      }));
      var zn, ln = !1, rc = function() {
      };
      return typeof BroadcastChannel < "u" && ((rc = function() {
        (zn = new BroadcastChannel(Ni)).onmessage = function(o) {
          return o.data && Xi(o.data);
        };
      })(), typeof zn.unref == "function" && zn.unref(), fn(mr, function(o) {
        ln || zn.postMessage(o);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(o) {
        if (!ze.disableBfCache && o.persisted) {
          De && console.debug("Dexie: handling persisted pagehide"), zn != null && zn.close();
          for (var s = 0, u = qn; s < u.length; s++) u[s].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(o) {
        !ze.disableBfCache && o.persisted && (De && console.debug("Dexie: handling persisted pageshow"), rc(), Xi({ all: new te(-1 / 0, [[]]) }));
      })), J.rejectionMapper = function(o, s) {
        return !o || o instanceof Jt || o instanceof TypeError || o instanceof SyntaxError || !o.name || !je[o.name] ? o : (s = new je[o.name](s || o.message, o), "stack" in o && D(s, "stack", { get: function() {
          return this.inner.stack;
        } }), s);
      }, Ta(De), r(ze, Object.freeze({ __proto__: null, Dexie: ze, liveQuery: nc, Entity: Ra, cmp: vt, PropModification: gr, replacePrefix: function(o, s) {
        return new gr({ replacePrefix: [o, s] });
      }, add: function(o) {
        return new gr({ add: o });
      }, remove: function(o) {
        return new gr({ remove: o });
      }, default: ze, RangeSet: te, mergeRanges: xr, rangesOverlap: Ga }), { default: ze }), ze;
    });
  }(Do)), Do.exports;
}
var dp = lp();
const Hs = /* @__PURE__ */ Ud(dp), ru = Symbol.for("Dexie"), ii = globalThis[ru] || (globalThis[ru] = Hs);
if (Hs.semVer !== ii.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Hs.semVer} and ${ii.semVer}`);
const {
  liveQuery: gp,
  mergeRanges: wp,
  rangesOverlap: mp,
  RangeSet: bp,
  cmp: vp,
  Entity: Ep,
  PropModification: xp,
  replacePrefix: Sp,
  add: kp,
  remove: Tp
} = ii, Pn = new ii("arkade", { allowEmptyDB: !0 });
Pn.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const hp = {
  addOrUpdate: async (t) => {
    await Pn.vtxos.bulkPut(t);
  },
  deleteAll: async () => Pn.vtxos.clear(),
  getSpendableVtxos: async () => Pn.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await Pn.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  close: async () => Pn.close(),
  open: async () => {
    await Pn.open();
  }
}, pp = new up(hp);
pp.start().catch(console.error);
const ka = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(ka)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== ka)
          return caches.delete(n);
      })
    ))
  ), self.clients.claim();
});
async function yp(t) {
  const e = await caches.open(ka);
  try {
    const n = await fetch(t);
    return e.put(t, n.clone()), n;
  } catch {
    const r = await e.match(t);
    if (!r) throw new Error("No cached response found");
    return r;
  }
}
self.addEventListener("fetch", (t) => {
  t.respondWith(yp(t.request));
});
