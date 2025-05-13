function Ha(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Vh(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ue(t, ...e) {
  if (!Vh(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function jh(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Ha(t.outputLen), Ha(t.blockLen);
}
function Fo(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function zh(t, e) {
  Ue(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const Ir = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ma(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function sn(t, e) {
  return t << 32 - e | t >>> e;
}
function xo(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
typeof Uint8Array.from([]).toHex == "function" && Uint8Array.fromHex;
function Gh(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function _c(t) {
  return typeof t == "string" && (t = Gh(t)), Ue(t), t;
}
function Wh(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Ue(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
let vl = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function El(t) {
  const e = (r) => t().update(_c(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Nc(t = 32) {
  if (Ir && typeof Ir.getRandomValues == "function")
    return Ir.getRandomValues(new Uint8Array(t));
  if (Ir && typeof Ir.randomBytes == "function")
    return Uint8Array.from(Ir.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function Yh(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), a = Number(n >> i & o), c = Number(n & o), f = r ? 4 : 0, l = r ? 0 : 4;
  t.setUint32(e + f, a, r), t.setUint32(e + l, c, r);
}
function Zh(t, e, n) {
  return t & e ^ ~t & n;
}
function Xh(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
let xl = class extends vl {
  constructor(e, n, r, i) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(e), this.view = ma(this.buffer);
  }
  update(e) {
    Fo(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = _c(e);
    const o = e.length;
    for (let a = 0; a < o; ) {
      const c = Math.min(i - this.pos, o - a);
      if (c === i) {
        const f = ma(e);
        for (; i <= o - a; a += i)
          this.process(f, a);
        continue;
      }
      r.set(e.subarray(a, a + c), this.pos), this.pos += c, a += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Fo(this), zh(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: a } = this;
    n[a++] = 128, this.buffer.subarray(a).fill(0), this.padOffset > i - a && (this.process(r, 0), a = 0);
    for (let h = a; h < i; h++)
      n[h] = 0;
    Yh(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = ma(e), f = this.outputLen;
    if (f % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const l = f / 4, p = this.get();
    if (l > p.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let h = 0; h < l; h++)
      c.setUint32(4 * h, p[h], o);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: o, destroyed: a, pos: c } = this;
    return e.length = i, e.pos = c, e.finished = o, e.destroyed = a, i % n && e.buffer.set(r), e;
  }
};
const Qh = /* @__PURE__ */ new Uint32Array([
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
]), Pn = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Kn = /* @__PURE__ */ new Uint32Array(64);
let Jh = class extends xl {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = Pn[0] | 0, this.B = Pn[1] | 0, this.C = Pn[2] | 0, this.D = Pn[3] | 0, this.E = Pn[4] | 0, this.F = Pn[5] | 0, this.G = Pn[6] | 0, this.H = Pn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: o, F: a, G: c, H: f } = this;
    return [e, n, r, i, o, a, c, f];
  }
  // prettier-ignore
  set(e, n, r, i, o, a, c, f) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = o | 0, this.F = a | 0, this.G = c | 0, this.H = f | 0;
  }
  process(e, n) {
    for (let h = 0; h < 16; h++, n += 4)
      Kn[h] = e.getUint32(n, !1);
    for (let h = 16; h < 64; h++) {
      const w = Kn[h - 15], b = Kn[h - 2], T = sn(w, 7) ^ sn(w, 18) ^ w >>> 3, x = sn(b, 17) ^ sn(b, 19) ^ b >>> 10;
      Kn[h] = x + Kn[h - 7] + T + Kn[h - 16] | 0;
    }
    let { A: r, B: i, C: o, D: a, E: c, F: f, G: l, H: p } = this;
    for (let h = 0; h < 64; h++) {
      const w = sn(c, 6) ^ sn(c, 11) ^ sn(c, 25), b = p + w + Zh(c, f, l) + Qh[h] + Kn[h] | 0, x = (sn(r, 2) ^ sn(r, 13) ^ sn(r, 22)) + Xh(r, i, o) | 0;
      p = l, l = f, f = c, c = a + b | 0, a = o, o = i, i = r, r = b + x | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, a = a + this.D | 0, c = c + this.E | 0, f = f + this.F | 0, l = l + this.G | 0, p = p + this.H | 0, this.set(r, i, o, a, c, f, l, p);
  }
  roundClean() {
    Kn.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const Ce = /* @__PURE__ */ El(() => new Jh());
let Sl = class extends vl {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, jh(e);
    const r = _c(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, o = new Uint8Array(i);
    o.set(r.length > i ? e.create().update(r).digest() : r);
    for (let a = 0; a < o.length; a++)
      o[a] ^= 54;
    this.iHash.update(o), this.oHash = e.create();
    for (let a = 0; a < o.length; a++)
      o[a] ^= 106;
    this.oHash.update(o), o.fill(0);
  }
  update(e) {
    return Fo(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Fo(this), Ue(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: o, blockLen: a, outputLen: c } = this;
    return e = e, e.finished = i, e.destroyed = o, e.blockLen = a, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Al = (t, e, n) => new Sl(t, e).update(n).digest();
Al.create = (t, e) => new Sl(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Cc = /* @__PURE__ */ BigInt(0), Va = /* @__PURE__ */ BigInt(1);
function Pr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Uc(t) {
  if (!Pr(t))
    throw new Error("Uint8Array expected");
}
function Ai(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function So(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function kl(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Cc : BigInt("0x" + t);
}
const Tl = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), tp = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function ki(t) {
  if (Uc(t), Tl)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += tp[t[n]];
  return e;
}
const mn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function tf(t) {
  if (t >= mn._0 && t <= mn._9)
    return t - mn._0;
  if (t >= mn.A && t <= mn.F)
    return t - (mn.A - 10);
  if (t >= mn.a && t <= mn.f)
    return t - (mn.a - 10);
}
function qo(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (Tl)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const a = tf(t.charCodeAt(o)), c = tf(t.charCodeAt(o + 1));
    if (a === void 0 || c === void 0) {
      const f = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + o);
    }
    r[i] = a * 16 + c;
  }
  return r;
}
function $e(t) {
  return kl(ki(t));
}
function Il(t) {
  return Uc(t), kl(ki(Uint8Array.from(t).reverse()));
}
function fn(t, e) {
  return qo(t.toString(16).padStart(e * 2, "0"));
}
function Bl(t, e) {
  return fn(t, e).reverse();
}
function Se(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = qo(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (Pr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function yr(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Uc(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
function Ti(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const ba = (t) => typeof t == "bigint" && Cc <= t;
function Ii(t, e, n) {
  return ba(t) && ba(e) && ba(n) && e <= t && t < n;
}
function ze(t, e, n, r) {
  if (!Ii(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function ep(t) {
  let e;
  for (e = 0; t > Cc; t >>= Va, e += 1)
    ;
  return e;
}
const ws = (t) => (Va << BigInt(t)) - Va, va = (t) => new Uint8Array(t), ef = (t) => Uint8Array.from(t);
function np(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = va(t), i = va(t), o = 0;
  const a = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...h) => n(i, r, ...h), f = (h = va(0)) => {
    i = c(ef([0]), h), r = c(), h.length !== 0 && (i = c(ef([1]), h), r = c());
  }, l = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let h = 0;
    const w = [];
    for (; h < e; ) {
      r = c();
      const b = r.slice();
      w.push(b), h += r.length;
    }
    return yr(...w);
  };
  return (h, w) => {
    a(), f(h);
    let b;
    for (; !(b = w(l())); )
      f();
    return a(), b;
  };
}
const rp = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Pr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function ys(t, e, n = {}) {
  const r = (i, o, a) => {
    const c = rp[o];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const f = t[i];
    if (!(a && f === void 0) && !c(f, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + o + ", got " + f);
  };
  for (const [i, o] of Object.entries(e))
    r(i, o, !1);
  for (const [i, o] of Object.entries(n))
    r(i, o, !0);
  return t;
}
function nf(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const fe = BigInt(0), Wt = BigInt(1), dr = /* @__PURE__ */ BigInt(2), ip = /* @__PURE__ */ BigInt(3), ja = /* @__PURE__ */ BigInt(4), rf = /* @__PURE__ */ BigInt(5), of = /* @__PURE__ */ BigInt(8);
function ue(t, e) {
  const n = t % e;
  return n >= fe ? n : e + n;
}
function op(t, e, n) {
  if (e < fe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= fe)
    throw new Error("invalid modulus");
  if (n === Wt)
    return fe;
  let r = Wt;
  for (; e > fe; )
    e & Wt && (r = r * t % n), t = t * t % n, e >>= Wt;
  return r;
}
function qe(t, e, n) {
  let r = t;
  for (; e-- > fe; )
    r *= r, r %= n;
  return r;
}
function za(t, e) {
  if (t === fe)
    throw new Error("invert: expected non-zero number");
  if (e <= fe)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = ue(t, e), r = e, i = fe, o = Wt;
  for (; n !== fe; ) {
    const c = r / n, f = r % n, l = i - o * c;
    r = n, n = f, i = o, o = l;
  }
  if (r !== Wt)
    throw new Error("invert: does not exist");
  return ue(i, e);
}
function sp(t) {
  const e = (t - Wt) / dr;
  let n, r, i;
  for (n = t - Wt, r = 0; n % dr === fe; n /= dr, r++)
    ;
  for (i = dr; i < t && op(i, e, t) !== t - Wt; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const a = (t + Wt) / ja;
    return function(f, l) {
      const p = f.pow(l, a);
      if (!f.eql(f.sqr(p), l))
        throw new Error("Cannot find square root");
      return p;
    };
  }
  const o = (n + Wt) / dr;
  return function(c, f) {
    if (c.pow(f, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let l = r, p = c.pow(c.mul(c.ONE, i), n), h = c.pow(f, o), w = c.pow(f, n);
    for (; !c.eql(w, c.ONE); ) {
      if (c.eql(w, c.ZERO))
        return c.ZERO;
      let b = 1;
      for (let x = c.sqr(w); b < l && !c.eql(x, c.ONE); b++)
        x = c.sqr(x);
      const T = c.pow(p, Wt << BigInt(l - b - 1));
      p = c.sqr(T), h = c.mul(h, T), w = c.mul(w, p), l = b;
    }
    return h;
  };
}
function ap(t) {
  if (t % ja === ip) {
    const e = (t + Wt) / ja;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % of === rf) {
    const e = (t - rf) / of;
    return function(r, i) {
      const o = r.mul(i, dr), a = r.pow(o, e), c = r.mul(i, a), f = r.mul(r.mul(c, dr), a), l = r.mul(c, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(l), i))
        throw new Error("Cannot find square root");
      return l;
    };
  }
  return sp(t);
}
const cp = [
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
function up(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = cp.reduce((r, i) => (r[i] = "function", r), e);
  return ys(t, n);
}
function fp(t, e, n) {
  if (n < fe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === fe)
    return t.ONE;
  if (n === Wt)
    return e;
  let r = t.ONE, i = e;
  for (; n > fe; )
    n & Wt && (r = t.mul(r, i)), i = t.sqr(i), n >>= Wt;
  return r;
}
function lp(t, e) {
  const n = new Array(e.length), r = e.reduce((o, a, c) => t.is0(a) ? o : (n[c] = o, t.mul(o, a)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, a, c) => t.is0(a) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, a)), i), n;
}
function _l(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Nl(t, e, n = !1, r = {}) {
  if (t <= fe)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = _l(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let a;
  const c = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: o,
    MASK: ws(i),
    ZERO: fe,
    ONE: Wt,
    create: (f) => ue(f, t),
    isValid: (f) => {
      if (typeof f != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof f);
      return fe <= f && f < t;
    },
    is0: (f) => f === fe,
    isOdd: (f) => (f & Wt) === Wt,
    neg: (f) => ue(-f, t),
    eql: (f, l) => f === l,
    sqr: (f) => ue(f * f, t),
    add: (f, l) => ue(f + l, t),
    sub: (f, l) => ue(f - l, t),
    mul: (f, l) => ue(f * l, t),
    pow: (f, l) => fp(c, f, l),
    div: (f, l) => ue(f * za(l, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, l) => f + l,
    subN: (f, l) => f - l,
    mulN: (f, l) => f * l,
    inv: (f) => za(f, t),
    sqrt: r.sqrt || ((f) => (a || (a = ap(t)), a(c, f))),
    invertBatch: (f) => lp(c, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, l, p) => p ? l : f,
    toBytes: (f) => n ? Bl(f, o) : fn(f, o),
    fromBytes: (f) => {
      if (f.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + f.length);
      return n ? Il(f) : $e(f);
    }
  });
  return Object.freeze(c);
}
function Cl(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Ul(t) {
  const e = Cl(t);
  return e + Math.ceil(e / 2);
}
function dp(t, e, n = !1) {
  const r = t.length, i = Cl(e), o = Ul(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const a = n ? Il(t) : $e(t), c = ue(a, e - Wt) + Wt;
  return n ? Bl(c, i) : fn(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sf = BigInt(0), Ga = BigInt(1);
function Ea(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function $l(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function xa(t, e) {
  $l(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), i = 2 ** t, o = ws(t), a = BigInt(t);
  return { windows: n, windowSize: r, mask: o, maxNumber: i, shiftBy: a };
}
function af(t, e, n) {
  const { windowSize: r, mask: i, maxNumber: o, shiftBy: a } = n;
  let c = Number(t & i), f = t >> a;
  c > r && (c -= o, f += Ga);
  const l = e * r, p = l + Math.abs(c) - 1, h = c === 0, w = c < 0, b = e % 2 !== 0;
  return { nextN: f, offset: p, isZero: h, isNeg: w, isNegF: b, offsetF: l };
}
function hp(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function pp(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Sa = /* @__PURE__ */ new WeakMap(), Ol = /* @__PURE__ */ new WeakMap();
function Aa(t) {
  return Ol.get(t) || 1;
}
function gp(t, e) {
  return {
    constTimeNegate: Ea,
    hasPrecomputes(n) {
      return Aa(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > sf; )
        r & Ga && (i = i.add(o)), o = o.double(), r >>= Ga;
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
      const { windows: i, windowSize: o } = xa(r, e), a = [];
      let c = n, f = c;
      for (let l = 0; l < i; l++) {
        f = c, a.push(f);
        for (let p = 1; p < o; p++)
          f = f.add(c), a.push(f);
        c = f.double();
      }
      return a;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      let o = t.ZERO, a = t.BASE;
      const c = xa(n, e);
      for (let f = 0; f < c.windows; f++) {
        const { nextN: l, offset: p, isZero: h, isNeg: w, isNegF: b, offsetF: T } = af(i, f, c);
        i = l, h ? a = a.add(Ea(b, r[T])) : o = o.add(Ea(w, r[p]));
      }
      return { p: o, f: a };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, i, o = t.ZERO) {
      const a = xa(n, e);
      for (let c = 0; c < a.windows && i !== sf; c++) {
        const { nextN: f, offset: l, isZero: p, isNeg: h } = af(i, c, a);
        if (i = f, !p) {
          const w = r[l];
          o = o.add(h ? w.negate() : w);
        }
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = Sa.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && Sa.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = Aa(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const a = Aa(n);
      return a === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(a, this.getPrecomputes(a, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      $l(r, e), Ol.set(n, r), Sa.delete(n);
    }
  };
}
function wp(t, e, n, r) {
  if (hp(n, t), pp(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = ep(BigInt(n.length)), a = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = ws(a), f = new Array(Number(c) + 1).fill(i), l = Math.floor((e.BITS - 1) / a) * a;
  let p = i;
  for (let h = l; h >= 0; h -= a) {
    f.fill(i);
    for (let b = 0; b < r.length; b++) {
      const T = r[b], x = Number(T >> BigInt(h) & c);
      f[x] = f[x].add(n[b]);
    }
    let w = i;
    for (let b = f.length - 1, T = i; b > 0; b--)
      T = T.add(f[b]), w = w.add(T);
    if (p = p.add(w), h !== 0)
      for (let b = 0; b < a; b++)
        p = p.double();
  }
  return p;
}
function Rl(t) {
  return up(t.Fp), ys(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ..._l(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function cf(t) {
  t.lowS !== void 0 && Ai("lowS", t.lowS), t.prehash !== void 0 && Ai("prehash", t.prehash);
}
function yp(t) {
  const e = Rl(t);
  ys(e, {
    a: "field",
    b: "field"
  }, {
    allowedPrivateKeyLengths: "array",
    wrapPrivateKey: "boolean",
    isTorsionFree: "function",
    clearCofactor: "function",
    allowInfinityPoint: "boolean",
    fromBytes: "function",
    toBytes: "function"
  });
  const { endo: n, Fp: r, a: i } = e;
  if (n) {
    if (!r.eql(i, r.ZERO))
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e });
}
class mp extends Error {
  constructor(e = "") {
    super(e);
  }
}
const En = {
  // asn.1 DER encoding utils
  Err: mp,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = En;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = So(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const o = r > 127 ? So(i.length / 2 | 128) : "";
      return So(t) + o + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = En;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], o = !!(i & 128);
      let a = 0;
      if (!o)
        a = i;
      else {
        const f = i & 127;
        if (!f)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (f > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const l = e.subarray(r, r + f);
        if (l.length !== f)
          throw new n("tlv.decode: length bytes not complete");
        if (l[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const p of l)
          a = a << 8 | p;
        if (r += f, a < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = e.subarray(r, r + a);
      if (c.length !== a)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: e.subarray(r + a) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = En;
      if (t < An)
        throw new e("integer: negative integers are not allowed");
      let n = So(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = En;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return $e(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = En, i = Se("signature", t), { v: o, l: a } = r.decode(48, i);
    if (a.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: f } = r.decode(2, o), { v: l, l: p } = r.decode(2, f);
    if (p.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(l) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = En, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, An = BigInt(0), ae = BigInt(1);
BigInt(2);
const uf = BigInt(3);
BigInt(4);
function bp(t) {
  const e = yp(t), { Fp: n } = e, r = Nl(e.n, e.nBitLength), i = e.toBytes || ((x, v, k) => {
    const $ = v.toAffine();
    return yr(Uint8Array.from([4]), n.toBytes($.x), n.toBytes($.y));
  }), o = e.fromBytes || ((x) => {
    const v = x.subarray(1), k = n.fromBytes(v.subarray(0, n.BYTES)), $ = n.fromBytes(v.subarray(n.BYTES, 2 * n.BYTES));
    return { x: k, y: $ };
  });
  function a(x) {
    const { a: v, b: k } = e, $ = n.sqr(x), L = n.mul($, x);
    return n.add(n.add(L, n.mul(x, v)), k);
  }
  if (!n.eql(n.sqr(e.Gy), a(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(x) {
    return Ii(x, ae, e.n);
  }
  function f(x) {
    const { allowedPrivateKeyLengths: v, nByteLength: k, wrapPrivateKey: $, n: L } = e;
    if (v && typeof x != "bigint") {
      if (Pr(x) && (x = ki(x)), typeof x != "string" || !v.includes(x.length))
        throw new Error("invalid private key");
      x = x.padStart(k * 2, "0");
    }
    let V;
    try {
      V = typeof x == "bigint" ? x : $e(Se("private key", x, k));
    } catch {
      throw new Error("invalid private key, expected hex or " + k + " bytes, got " + typeof x);
    }
    return $ && (V = ue(V, L)), ze("private key", V, ae, L), V;
  }
  function l(x) {
    if (!(x instanceof w))
      throw new Error("ProjectivePoint expected");
  }
  const p = nf((x, v) => {
    const { px: k, py: $, pz: L } = x;
    if (n.eql(L, n.ONE))
      return { x: k, y: $ };
    const V = x.is0();
    v == null && (v = V ? n.ONE : n.inv(L));
    const Y = n.mul(k, v), G = n.mul($, v), z = n.mul(L, v);
    if (V)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: Y, y: G };
  }), h = nf((x) => {
    if (x.is0()) {
      if (e.allowInfinityPoint && !n.is0(x.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: v, y: k } = x.toAffine();
    if (!n.isValid(v) || !n.isValid(k))
      throw new Error("bad point: x or y not FE");
    const $ = n.sqr(k), L = a(v);
    if (!n.eql($, L))
      throw new Error("bad point: equation left != right");
    if (!x.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class w {
    constructor(v, k, $) {
      if (v == null || !n.isValid(v))
        throw new Error("x required");
      if (k == null || !n.isValid(k))
        throw new Error("y required");
      if ($ == null || !n.isValid($))
        throw new Error("z required");
      this.px = v, this.py = k, this.pz = $, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(v) {
      const { x: k, y: $ } = v || {};
      if (!v || !n.isValid(k) || !n.isValid($))
        throw new Error("invalid affine point");
      if (v instanceof w)
        throw new Error("projective point not allowed");
      const L = (V) => n.eql(V, n.ZERO);
      return L(k) && L($) ? w.ZERO : new w(k, $, n.ONE);
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
    static normalizeZ(v) {
      const k = n.invertBatch(v.map(($) => $.pz));
      return v.map(($, L) => $.toAffine(k[L])).map(w.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(v) {
      const k = w.fromAffine(o(Se("pointHex", v)));
      return k.assertValidity(), k;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(v) {
      return w.BASE.multiply(f(v));
    }
    // Multiscalar Multiplication
    static msm(v, k) {
      return wp(w, r, v, k);
    }
    // "Private method", don't use it directly
    _setWindowSize(v) {
      T.setWindowSize(this, v);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      h(this);
    }
    hasEvenY() {
      const { y: v } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(v);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(v) {
      l(v);
      const { px: k, py: $, pz: L } = this, { px: V, py: Y, pz: G } = v, z = n.eql(n.mul(k, G), n.mul(V, L)), J = n.eql(n.mul($, G), n.mul(Y, L));
      return z && J;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new w(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: v, b: k } = e, $ = n.mul(k, uf), { px: L, py: V, pz: Y } = this;
      let G = n.ZERO, z = n.ZERO, J = n.ZERO, P = n.mul(L, L), st = n.mul(V, V), ft = n.mul(Y, Y), at = n.mul(L, V);
      return at = n.add(at, at), J = n.mul(L, Y), J = n.add(J, J), G = n.mul(v, J), z = n.mul($, ft), z = n.add(G, z), G = n.sub(st, z), z = n.add(st, z), z = n.mul(G, z), G = n.mul(at, G), J = n.mul($, J), ft = n.mul(v, ft), at = n.sub(P, ft), at = n.mul(v, at), at = n.add(at, J), J = n.add(P, P), P = n.add(J, P), P = n.add(P, ft), P = n.mul(P, at), z = n.add(z, P), ft = n.mul(V, Y), ft = n.add(ft, ft), P = n.mul(ft, at), G = n.sub(G, P), J = n.mul(ft, st), J = n.add(J, J), J = n.add(J, J), new w(G, z, J);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(v) {
      l(v);
      const { px: k, py: $, pz: L } = this, { px: V, py: Y, pz: G } = v;
      let z = n.ZERO, J = n.ZERO, P = n.ZERO;
      const st = e.a, ft = n.mul(e.b, uf);
      let at = n.mul(k, V), xt = n.mul($, Y), q = n.mul(L, G), H = n.add(k, $), D = n.add(V, Y);
      H = n.mul(H, D), D = n.add(at, xt), H = n.sub(H, D), D = n.add(k, L);
      let nt = n.add(V, G);
      return D = n.mul(D, nt), nt = n.add(at, q), D = n.sub(D, nt), nt = n.add($, L), z = n.add(Y, G), nt = n.mul(nt, z), z = n.add(xt, q), nt = n.sub(nt, z), P = n.mul(st, D), z = n.mul(ft, q), P = n.add(z, P), z = n.sub(xt, P), P = n.add(xt, P), J = n.mul(z, P), xt = n.add(at, at), xt = n.add(xt, at), q = n.mul(st, q), D = n.mul(ft, D), xt = n.add(xt, q), q = n.sub(at, q), q = n.mul(st, q), D = n.add(D, q), at = n.mul(xt, D), J = n.add(J, at), at = n.mul(nt, D), z = n.mul(H, z), z = n.sub(z, at), at = n.mul(H, xt), P = n.mul(nt, P), P = n.add(P, at), new w(z, J, P);
    }
    subtract(v) {
      return this.add(v.negate());
    }
    is0() {
      return this.equals(w.ZERO);
    }
    wNAF(v) {
      return T.wNAFCached(this, v, w.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(v) {
      const { endo: k, n: $ } = e;
      ze("scalar", v, An, $);
      const L = w.ZERO;
      if (v === An)
        return L;
      if (this.is0() || v === ae)
        return this;
      if (!k || T.hasPrecomputes(this))
        return T.wNAFCachedUnsafe(this, v, w.normalizeZ);
      let { k1neg: V, k1: Y, k2neg: G, k2: z } = k.splitScalar(v), J = L, P = L, st = this;
      for (; Y > An || z > An; )
        Y & ae && (J = J.add(st)), z & ae && (P = P.add(st)), st = st.double(), Y >>= ae, z >>= ae;
      return V && (J = J.negate()), G && (P = P.negate()), P = new w(n.mul(P.px, k.beta), P.py, P.pz), J.add(P);
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
      const { endo: k, n: $ } = e;
      ze("scalar", v, ae, $);
      let L, V;
      if (k) {
        const { k1neg: Y, k1: G, k2neg: z, k2: J } = k.splitScalar(v);
        let { p: P, f: st } = this.wNAF(G), { p: ft, f: at } = this.wNAF(J);
        P = T.constTimeNegate(Y, P), ft = T.constTimeNegate(z, ft), ft = new w(n.mul(ft.px, k.beta), ft.py, ft.pz), L = P.add(ft), V = st.add(at);
      } else {
        const { p: Y, f: G } = this.wNAF(v);
        L = Y, V = G;
      }
      return w.normalizeZ([L, V])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(v, k, $) {
      const L = w.BASE, V = (G, z) => z === An || z === ae || !G.equals(L) ? G.multiplyUnsafe(z) : G.multiply(z), Y = V(this, k).add(V(v, $));
      return Y.is0() ? void 0 : Y;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(v) {
      return p(this, v);
    }
    isTorsionFree() {
      const { h: v, isTorsionFree: k } = e;
      if (v === ae)
        return !0;
      if (k)
        return k(w, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: v, clearCofactor: k } = e;
      return v === ae ? this : k ? k(w, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(v = !0) {
      return Ai("isCompressed", v), this.assertValidity(), i(w, this, v);
    }
    toHex(v = !0) {
      return Ai("isCompressed", v), ki(this.toRawBytes(v));
    }
  }
  w.BASE = new w(e.Gx, e.Gy, n.ONE), w.ZERO = new w(n.ZERO, n.ONE, n.ZERO);
  const b = e.nBitLength, T = gp(w, e.endo ? Math.ceil(b / 2) : b);
  return {
    CURVE: e,
    ProjectivePoint: w,
    normPrivateKeyToScalar: f,
    weierstrassEquation: a,
    isWithinCurveOrder: c
  };
}
function vp(t) {
  const e = Rl(t);
  return ys(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Ep(t) {
  const e = vp(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function a(q) {
    return ue(q, r);
  }
  function c(q) {
    return za(q, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: l, weierstrassEquation: p, isWithinCurveOrder: h } = bp({
    ...e,
    toBytes(q, H, D) {
      const nt = H.toAffine(), ot = n.toBytes(nt.x), gt = yr;
      return Ai("isCompressed", D), D ? gt(Uint8Array.from([H.hasEvenY() ? 2 : 3]), ot) : gt(Uint8Array.from([4]), ot, n.toBytes(nt.y));
    },
    fromBytes(q) {
      const H = q.length, D = q[0], nt = q.subarray(1);
      if (H === i && (D === 2 || D === 3)) {
        const ot = $e(nt);
        if (!Ii(ot, ae, n.ORDER))
          throw new Error("Point is not on curve");
        const gt = p(ot);
        let St;
        try {
          St = n.sqrt(gt);
        } catch (Ct) {
          const _t = Ct instanceof Error ? ": " + Ct.message : "";
          throw new Error("Point is not on curve" + _t);
        }
        const It = (St & ae) === ae;
        return (D & 1) === 1 !== It && (St = n.neg(St)), { x: ot, y: St };
      } else if (H === o && D === 4) {
        const ot = n.fromBytes(nt.subarray(0, n.BYTES)), gt = n.fromBytes(nt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: ot, y: gt };
      } else {
        const ot = i, gt = o;
        throw new Error("invalid Point, expected length of " + ot + ", or uncompressed " + gt + ", got " + H);
      }
    }
  }), w = (q) => ki(fn(q, e.nByteLength));
  function b(q) {
    const H = r >> ae;
    return q > H;
  }
  function T(q) {
    return b(q) ? a(-q) : q;
  }
  const x = (q, H, D) => $e(q.slice(H, D));
  class v {
    constructor(H, D, nt) {
      ze("r", H, ae, r), ze("s", D, ae, r), this.r = H, this.s = D, nt != null && (this.recovery = nt), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(H) {
      const D = e.nByteLength;
      return H = Se("compactSignature", H, D * 2), new v(x(H, 0, D), x(H, D, 2 * D));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(H) {
      const { r: D, s: nt } = En.toSig(Se("DER", H));
      return new v(D, nt);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(H) {
      return new v(this.r, this.s, H);
    }
    recoverPublicKey(H) {
      const { r: D, s: nt, recovery: ot } = this, gt = G(Se("msgHash", H));
      if (ot == null || ![0, 1, 2, 3].includes(ot))
        throw new Error("recovery id invalid");
      const St = ot === 2 || ot === 3 ? D + e.n : D;
      if (St >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const It = (ot & 1) === 0 ? "02" : "03", Vt = f.fromHex(It + w(St)), Ct = c(St), _t = a(-gt * Ct), re = a(nt * Ct), Kt = f.BASE.multiplyAndAddUnsafe(Vt, _t, re);
      if (!Kt)
        throw new Error("point at infinify");
      return Kt.assertValidity(), Kt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return b(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new v(this.r, a(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return qo(this.toDERHex());
    }
    toDERHex() {
      return En.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return qo(this.toCompactHex());
    }
    toCompactHex() {
      return w(this.r) + w(this.s);
    }
  }
  const k = {
    isValidPrivateKey(q) {
      try {
        return l(q), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: l,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const q = Ul(e.n);
      return dp(e.randomBytes(q), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(q = 8, H = f.BASE) {
      return H._setWindowSize(q), H.multiply(BigInt(3)), H;
    }
  };
  function $(q, H = !0) {
    return f.fromPrivateKey(q).toRawBytes(H);
  }
  function L(q) {
    const H = Pr(q), D = typeof q == "string", nt = (H || D) && q.length;
    return H ? nt === i || nt === o : D ? nt === 2 * i || nt === 2 * o : q instanceof f;
  }
  function V(q, H, D = !0) {
    if (L(q))
      throw new Error("first arg must be private key");
    if (!L(H))
      throw new Error("second arg must be public key");
    return f.fromHex(H).multiply(l(q)).toRawBytes(D);
  }
  const Y = e.bits2int || function(q) {
    if (q.length > 8192)
      throw new Error("input is too large");
    const H = $e(q), D = q.length * 8 - e.nBitLength;
    return D > 0 ? H >> BigInt(D) : H;
  }, G = e.bits2int_modN || function(q) {
    return a(Y(q));
  }, z = ws(e.nBitLength);
  function J(q) {
    return ze("num < 2^" + e.nBitLength, q, An, z), fn(q, e.nByteLength);
  }
  function P(q, H, D = st) {
    if (["recovered", "canonical"].some((he) => he in D))
      throw new Error("sign() legacy options not supported");
    const { hash: nt, randomBytes: ot } = e;
    let { lowS: gt, prehash: St, extraEntropy: It } = D;
    gt == null && (gt = !0), q = Se("msgHash", q), cf(D), St && (q = Se("prehashed msgHash", nt(q)));
    const Vt = G(q), Ct = l(H), _t = [J(Ct), J(Vt)];
    if (It != null && It !== !1) {
      const he = It === !0 ? ot(n.BYTES) : It;
      _t.push(Se("extraEntropy", he));
    }
    const re = yr(..._t), Kt = Vt;
    function Ge(he) {
      const ct = Y(he);
      if (!h(ct))
        return;
      const en = c(ct), me = f.BASE.multiply(ct).toAffine(), mt = a(me.x);
      if (mt === An)
        return;
      const pe = a(en * a(Kt + mt * Ct));
      if (pe === An)
        return;
      let Ke = (me.x === mt ? 0 : 2) | Number(me.y & ae), jt = pe;
      return gt && b(pe) && (jt = T(pe), Ke ^= 1), new v(mt, jt, Ke);
    }
    return { seed: re, k2sig: Ge };
  }
  const st = { lowS: e.lowS, prehash: !1 }, ft = { lowS: e.lowS, prehash: !1 };
  function at(q, H, D = st) {
    const { seed: nt, k2sig: ot } = P(q, H, D), gt = e;
    return np(gt.hash.outputLen, gt.nByteLength, gt.hmac)(nt, ot);
  }
  f.BASE._setWindowSize(8);
  function xt(q, H, D, nt = ft) {
    var Ke;
    const ot = q;
    H = Se("msgHash", H), D = Se("publicKey", D);
    const { lowS: gt, prehash: St, format: It } = nt;
    if (cf(nt), "strict" in nt)
      throw new Error("options.strict was renamed to lowS");
    if (It !== void 0 && It !== "compact" && It !== "der")
      throw new Error("format must be compact or der");
    const Vt = typeof ot == "string" || Pr(ot), Ct = !Vt && !It && typeof ot == "object" && ot !== null && typeof ot.r == "bigint" && typeof ot.s == "bigint";
    if (!Vt && !Ct)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let _t, re;
    try {
      if (Ct && (_t = new v(ot.r, ot.s)), Vt) {
        try {
          It !== "compact" && (_t = v.fromDER(ot));
        } catch (jt) {
          if (!(jt instanceof En.Err))
            throw jt;
        }
        !_t && It !== "der" && (_t = v.fromCompact(ot));
      }
      re = f.fromHex(D);
    } catch {
      return !1;
    }
    if (!_t || gt && _t.hasHighS())
      return !1;
    St && (H = e.hash(H));
    const { r: Kt, s: Ge } = _t, he = G(H), ct = c(Ge), en = a(he * ct), me = a(Kt * ct), mt = (Ke = f.BASE.multiplyAndAddUnsafe(re, en, me)) == null ? void 0 : Ke.toAffine();
    return mt ? a(mt.x) === Kt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: $,
    getSharedSecret: V,
    sign: at,
    verify: xt,
    ProjectivePoint: f,
    Signature: v,
    utils: k
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function xp(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Al(t, e, Wh(...n)),
    randomBytes: Nc
  };
}
function Sp(t, e) {
  const n = (r) => Ep({ ...t, ...xp(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Mi = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Ho = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Bi = BigInt(1), Vo = BigInt(2), ff = (t, e) => (t + e / Vo) / e;
function Ll(t) {
  const e = Mi, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), a = BigInt(23), c = BigInt(44), f = BigInt(88), l = t * t * t % e, p = l * l * t % e, h = qe(p, n, e) * p % e, w = qe(h, n, e) * p % e, b = qe(w, Vo, e) * l % e, T = qe(b, i, e) * b % e, x = qe(T, o, e) * T % e, v = qe(x, c, e) * x % e, k = qe(v, f, e) * v % e, $ = qe(k, c, e) * x % e, L = qe($, n, e) * p % e, V = qe(L, a, e) * T % e, Y = qe(V, r, e) * l % e, G = qe(Y, Vo, e);
  if (!Wa.eql(Wa.sqr(G), t))
    throw new Error("Cannot find square root");
  return G;
}
const Wa = Nl(Mi, void 0, void 0, { sqrt: Ll }), ln = Sp({
  a: BigInt(0),
  b: BigInt(7),
  Fp: Wa,
  n: Ho,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  // Cofactor
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = Ho, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Bi * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, a = BigInt("0x100000000000000000000000000000000"), c = ff(o * t, e), f = ff(-r * t, e);
      let l = ue(t - c * n - f * i, e), p = ue(-c * r - f * o, e);
      const h = l > a, w = p > a;
      if (h && (l = e - l), w && (p = e - p), l > a || p > a)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: h, k1: l, k2neg: w, k2: p };
    }
  }
}, Ce), Pl = BigInt(0), lf = {};
function jo(t, ...e) {
  let n = lf[t];
  if (n === void 0) {
    const r = Ce(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = yr(r, r), lf[t] = n;
  }
  return Ce(yr(n, ...e));
}
const $c = (t) => t.toRawBytes(!0).slice(1), Ya = (t) => fn(t, 32), ka = (t) => ue(t, Mi), _i = (t) => ue(t, Ho), Oc = ln.ProjectivePoint, Ap = (t, e, n) => Oc.BASE.multiplyAndAddUnsafe(t, e, n);
function Za(t) {
  let e = ln.utils.normPrivateKeyToScalar(t), n = Oc.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : _i(-e), bytes: $c(n) };
}
function Kl(t) {
  ze("x", t, Bi, Mi);
  const e = ka(t * t), n = ka(e * t + BigInt(7));
  let r = Ll(n);
  r % Vo !== Pl && (r = ka(-r));
  const i = new Oc(t, r, Bi);
  return i.assertValidity(), i;
}
const $r = $e;
function Dl(...t) {
  return _i($r(jo("BIP0340/challenge", ...t)));
}
function kp(t) {
  return Za(t).bytes;
}
function Tp(t, e, n = Nc(32)) {
  const r = Se("message", t), { bytes: i, scalar: o } = Za(e), a = Se("auxRand", n, 32), c = Ya(o ^ $r(jo("BIP0340/aux", a))), f = jo("BIP0340/nonce", c, i, r), l = _i($r(f));
  if (l === Pl)
    throw new Error("sign failed: k is zero");
  const { bytes: p, scalar: h } = Za(l), w = Dl(p, i, r), b = new Uint8Array(64);
  if (b.set(p, 0), b.set(Ya(_i(h + w * o)), 32), !Ml(b, r, i))
    throw new Error("sign: Invalid signature produced");
  return b;
}
function Ml(t, e, n) {
  const r = Se("signature", t, 64), i = Se("message", e), o = Se("publicKey", n, 32);
  try {
    const a = Kl($r(o)), c = $r(r.subarray(0, 32));
    if (!Ii(c, Bi, Mi))
      return !1;
    const f = $r(r.subarray(32, 64));
    if (!Ii(f, Bi, Ho))
      return !1;
    const l = Dl(Ya(c), $c(a), i), p = Ap(a, f, _i(-l));
    return !(!p || !p.hasEvenY() || p.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const dn = {
  getPublicKey: kp,
  sign: Tp,
  verify: Ml,
  utils: {
    randomPrivateKey: ln.utils.randomPrivateKey,
    lift_x: Kl,
    pointToBytes: $c,
    numberToBytesBE: fn,
    bytesToNumberBE: $e,
    taggedHash: jo,
    mod: ue
  }
}, Ip = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), Fl = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), Bp = /* @__PURE__ */ Fl.map((t) => (9 * t + 5) % 16);
let Rc = [Fl], Lc = [Bp];
for (let t = 0; t < 4; t++)
  for (let e of [Rc, Lc])
    e.push(e[t].map((n) => Ip[n]));
const ql = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), _p = /* @__PURE__ */ Rc.map((t, e) => t.map((n) => ql[e][n])), Np = /* @__PURE__ */ Lc.map((t, e) => t.map((n) => ql[e][n])), Cp = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Up = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function df(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const Ao = /* @__PURE__ */ new Uint32Array(16);
class $p extends xl {
  constructor() {
    super(64, 20, 8, !0), this.h0 = 1732584193, this.h1 = -271733879, this.h2 = -1732584194, this.h3 = 271733878, this.h4 = -1009589776;
  }
  get() {
    const { h0: e, h1: n, h2: r, h3: i, h4: o } = this;
    return [e, n, r, i, o];
  }
  set(e, n, r, i, o) {
    this.h0 = e | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = o | 0;
  }
  process(e, n) {
    for (let b = 0; b < 16; b++, n += 4)
      Ao[b] = e.getUint32(n, !0);
    let r = this.h0 | 0, i = r, o = this.h1 | 0, a = o, c = this.h2 | 0, f = c, l = this.h3 | 0, p = l, h = this.h4 | 0, w = h;
    for (let b = 0; b < 5; b++) {
      const T = 4 - b, x = Cp[b], v = Up[b], k = Rc[b], $ = Lc[b], L = _p[b], V = Np[b];
      for (let Y = 0; Y < 16; Y++) {
        const G = xo(r + df(b, o, c, l) + Ao[k[Y]] + x, L[Y]) + h | 0;
        r = h, h = l, l = xo(c, 10) | 0, c = o, o = G;
      }
      for (let Y = 0; Y < 16; Y++) {
        const G = xo(i + df(T, a, f, p) + Ao[$[Y]] + v, V[Y]) + w | 0;
        i = w, w = p, p = xo(f, 10) | 0, f = a, a = G;
      }
    }
    this.set(this.h1 + c + p | 0, this.h2 + l + w | 0, this.h3 + h + i | 0, this.h4 + r + a | 0, this.h0 + o + f | 0);
  }
  roundClean() {
    Ao.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const Op = /* @__PURE__ */ El(() => new $p());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Kr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Rp(t, ...e) {
  if (!Kr(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Hl(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Pc(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Dr(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function Fi(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function zo(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Vl(t, e) {
  if (!Hl(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Kc(t, e) {
  if (!Hl(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function ms(...t) {
  const e = (o) => o, n = (o, a) => (c) => o(a(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Dc(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Vl("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (zo(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (zo(i), i.map((o) => {
      Dr("alphabet.decode", o);
      const a = r.get(o);
      if (a === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return a;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Mc(t = "") {
  return Dr("join", t), {
    encode: (e) => (Vl("join.decode", e), e.join(t)),
    decode: (e) => (Dr("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Lp(t) {
  return Pc(t), { encode: (e) => e, decode: (e) => t(e) };
}
function hf(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (zo(t), !t.length)
    return [];
  let r = 0;
  const i = [], o = Array.from(t, (c) => {
    if (Fi(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), a = o.length;
  for (; ; ) {
    let c = 0, f = !0;
    for (let l = r; l < a; l++) {
      const p = o[l], h = e * c, w = h + p;
      if (!Number.isSafeInteger(w) || h / e !== c || w - p !== h)
        throw new Error("convertRadix: carry overflow");
      const b = w / n;
      c = w % n;
      const T = Math.floor(b);
      if (o[l] = T, !Number.isSafeInteger(T) || T * n + c !== w)
        throw new Error("convertRadix: carry overflow");
      if (f)
        T ? f = !1 : r = l;
      else continue;
    }
    if (i.push(c), f)
      break;
  }
  for (let c = 0; c < t.length - 1 && t[c] === 0; c++)
    i.push(0);
  return i.reverse();
}
const jl = (t, e) => e === 0 ? t : jl(e, t % e), Go = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - jl(t, e)), $o = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Xa(t, e, n, r) {
  if (zo(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Go(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Go(e, n)}`);
  let i = 0, o = 0;
  const a = $o[e], c = $o[n] - 1, f = [];
  for (const l of t) {
    if (Fi(l), l >= a)
      throw new Error(`convertRadix2: invalid data word=${l} from=${e}`);
    if (i = i << e | l, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      f.push((i >> o - n & c) >>> 0);
    const p = $o[o];
    if (p === void 0)
      throw new Error("invalid carry");
    i &= p - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && f.push(i >>> 0), f;
}
// @__NO_SIDE_EFFECTS__
function Pp(t) {
  Fi(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Kr(n))
        throw new Error("radix.encode input should be Uint8Array");
      return hf(Array.from(n), e, t);
    },
    decode: (n) => (Kc("radix.decode", n), Uint8Array.from(hf(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function zl(t, e = !1) {
  if (Fi(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Go(8, t) > 32 || /* @__PURE__ */ Go(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Kr(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Xa(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Kc("radix2.decode", n), Uint8Array.from(Xa(n, t, 8, e)))
  };
}
function pf(t) {
  return Pc(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Kp(t, e) {
  return Fi(t), Pc(e), {
    encode(n) {
      if (!Kr(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), i = new Uint8Array(n.length + t);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Kr(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), i = n.slice(-t), o = e(r).slice(0, t);
      for (let a = 0; a < t; a++)
        if (o[a] !== i[a])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Dp = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ ms(/* @__PURE__ */ Pp(58), /* @__PURE__ */ Dc(t), /* @__PURE__ */ Mc("")), Mp = /* @__PURE__ */ Dp("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Fp = (t) => /* @__PURE__ */ ms(Kp(4, (e) => t(t(e))), Mp), Qa = /* @__PURE__ */ ms(/* @__PURE__ */ Dc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Mc("")), gf = [996825010, 642813549, 513874426, 1027748829, 705979059];
function li(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < gf.length; r++)
    (e >> r & 1) === 1 && (n ^= gf[r]);
  return n;
}
function wf(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let o = 0; o < r; o++) {
    const a = t.charCodeAt(o);
    if (a < 33 || a > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = li(i) ^ a >> 5;
  }
  i = li(i);
  for (let o = 0; o < r; o++)
    i = li(i) ^ t.charCodeAt(o) & 31;
  for (let o of e)
    i = li(i) ^ o;
  for (let o = 0; o < 6; o++)
    i = li(i);
  return i ^= n, Qa.encode(Xa([i % $o[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Gl(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ zl(5), r = n.decode, i = n.encode, o = pf(r);
  function a(h, w, b = 90) {
    Dr("bech32.encode prefix", h), Kr(w) && (w = Array.from(w)), Kc("bech32.encode", w);
    const T = h.length;
    if (T === 0)
      throw new TypeError(`Invalid prefix length ${T}`);
    const x = T + 7 + w.length;
    if (b !== !1 && x > b)
      throw new TypeError(`Length ${x} exceeds limit ${b}`);
    const v = h.toLowerCase(), k = wf(v, w, e);
    return `${v}1${Qa.encode(w)}${k}`;
  }
  function c(h, w = 90) {
    Dr("bech32.decode input", h);
    const b = h.length;
    if (b < 8 || w !== !1 && b > w)
      throw new TypeError(`invalid string length: ${b} (${h}). Expected (8..${w})`);
    const T = h.toLowerCase();
    if (h !== T && h !== h.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const x = T.lastIndexOf("1");
    if (x === 0 || x === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const v = T.slice(0, x), k = T.slice(x + 1);
    if (k.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const $ = Qa.decode(k).slice(0, -6), L = wf(v, $, e);
    if (!k.endsWith(L))
      throw new Error(`Invalid checksum in ${h}: expected "${L}"`);
    return { prefix: v, words: $ };
  }
  const f = pf(c);
  function l(h) {
    const { prefix: w, words: b } = c(h, !1);
    return { prefix: w, words: b, bytes: r(b) };
  }
  function p(h, w) {
    return a(h, i(w));
  }
  return {
    encode: a,
    decode: c,
    encodeFromBytes: p,
    decodeToBytes: l,
    decodeUnsafe: f,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const Ja = /* @__PURE__ */ Gl("bech32"), Wl = /* @__PURE__ */ Gl("bech32m"), qp = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, Hp = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Vp = {
  encode(t) {
    return Rp(t), t.toHex();
  },
  decode(t) {
    return Dr("hex", t), Uint8Array.fromHex(t);
  }
}, Ot = Hp ? Vp : /* @__PURE__ */ ms(/* @__PURE__ */ zl(4), /* @__PURE__ */ Dc("0123456789abcdef"), /* @__PURE__ */ Mc(""), /* @__PURE__ */ Lp((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), qt = /* @__PURE__ */ new Uint8Array(), Yl = /* @__PURE__ */ new Uint8Array([0]);
function Mr(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function je(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function jp(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (!je(i))
      throw new Error("Uint8Array expected");
    e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
const Zl = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function qi(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function hn(t) {
  return Number.isSafeInteger(t);
}
const Fc = {
  equalBytes: Mr,
  isBytes: je,
  concatBytes: jp
}, Xl = (t) => {
  if (t !== null && typeof t != "string" && !Xe(t) && !je(t) && !hn(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (Xe(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = Bn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (Xe(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = Bn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, se = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(se.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (se.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${se.len(e)}`);
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
    se.checkLen(t, e);
    const { FULL_MASK: r, BITS: i } = se, o = i - e % i, a = o ? r >>> o << o : r, c = [];
    for (let f = 0; f < t.length; f++) {
      let l = t[f];
      if (n && (l = ~l), f === t.length - 1 && (l &= a), l !== 0)
        for (let p = 0; p < i; p++) {
          const h = 1 << i - p - 1;
          l & h && c.push(f * i + p);
        }
    }
    return c;
  },
  range: (t) => {
    const e = [];
    let n;
    for (const r of t)
      n === void 0 || r !== n.pos + n.length ? e.push(n = { pos: r, length: 1 }) : n.length += 1;
    return e;
  },
  rangeDebug: (t, e, n = !1) => `[${se.range(se.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, i = !0) => {
    se.chunkLen(e, n, r);
    const { FULL_MASK: o, BITS: a } = se, c = n % a ? Math.floor(n / a) : void 0, f = n + r, l = f % a ? Math.floor(f / a) : void 0;
    if (c !== void 0 && c === l)
      return se.set(t, c, o >>> a - r << a - r - n, i);
    if (c !== void 0 && !se.set(t, c, o >>> n % a, i))
      return !1;
    const p = c !== void 0 ? c + 1 : n / a, h = l !== void 0 ? l : f / a;
    for (let w = p; w < h; w++)
      if (!se.set(t, w, o, i))
        return !1;
    return !(l !== void 0 && c !== l && !se.set(t, l, o << a - f % a, i));
  }
}, Bn = {
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
    t.push(r), n((i, o) => {
      r.field = i, o(), r.field = void 0;
    }), t.pop();
  },
  path: (t) => {
    const e = [];
    for (const n of t)
      n.field !== void 0 && e.push(n.field);
    return e.join("/");
  },
  err: (t, e, n) => {
    const r = new Error(`${t}(${Bn.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((a) => a.obj);
    let i = 0;
    for (; i < n.length && n[i] === ".."; i++)
      r.pop();
    let o = r.pop();
    for (; i < n.length; i++) {
      if (!o || o[n[i]] === void 0)
        return;
      o = o[n[i]];
    }
    return o;
  }
};
class qc {
  constructor(e, n = {}, r = [], i = void 0, o = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = o, this.view = Zl(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = se.create(this.data.length), se.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : se.setRange(this.bs, this.data.length, e, n, !1);
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
    return Bn.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${Ot.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = se.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = se.range(e).map(({ pos: r, length: i }) => `(${r}/${i})[${Ot.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${Ot.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return Bn.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new qc(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!je(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (Mr(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class zp {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = Zl(this.viewBuf);
  }
  pushObj(e, n) {
    return Bn.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!hn(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Bn.err("Reader", this.stack, e);
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
    const n = this.buffers.concat(this.ptrs.map((o) => o.buffer)), r = n.map((o) => o.length).reduce((o, a) => o + a, 0), i = new Uint8Array(r);
    for (let o = 0, a = 0; o < n.length; o++) {
      const c = n[o];
      i.set(c, a), a += c.length;
    }
    for (let o = this.pos, a = 0; a < this.ptrs.length; a++) {
      const c = this.ptrs[a];
      i.set(c.ptr.encode(o), c.pos), o += c.buffer.length;
    }
    if (e) {
      this.buffers = [];
      for (const o of this.ptrs)
        o.buffer.fill(0);
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
const tc = (t) => Uint8Array.from(t).reverse();
function Gp(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function Ql(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new zp();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new qc(e, n), i = t.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Le(t, e) {
  if (!Xe(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return Ql({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e(r);
      } catch (o) {
        throw n.err(o);
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
const Pe = (t) => {
  const e = Ql(t);
  return t.validate ? Le(e, t.validate) : e;
}, bs = (t) => qi(t) && typeof t.decode == "function" && typeof t.encode == "function";
function Xe(t) {
  return qi(t) && bs(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || hn(t.size));
}
function Wp() {
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
      if (!qi(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Yp = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!hn(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function Zp(t) {
  if (!qi(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!hn(e) || !(e in t))
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
function Xp(t, e = !1) {
  if (!hn(t))
    throw new Error(`decimal/precision: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof e}`);
  const n = 10n ** BigInt(t);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), o = i.length - t;
      o < 0 && (i = i.padStart(i.length - o, "0"), o = 0);
      let a = i.length - 1;
      for (; a >= o && i[a] === "0"; a--)
        ;
      let c = i.slice(0, o), f = i.slice(o, a + 1);
      return c || (c = "0"), r < 0n && (c = "-" + c), f ? `${c}.${f}` : c;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let i = !1;
      if (r.startsWith("-") && (i = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let o = r.indexOf(".");
      o = o === -1 ? r.length : o;
      const a = r.slice(0, o), c = r.slice(o + 1).replace(/0+$/, ""), f = BigInt(a) * n;
      if (!e && c.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const l = Math.min(c.length, t), p = BigInt(c.slice(0, l)) * 10n ** BigInt(t - l), h = f + p;
      return i ? -h : h;
    }
  };
}
function Qp(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!bs(e))
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
const Jl = (t) => {
  if (!bs(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, vs = { dict: Wp, numberBigint: Yp, tsEnum: Zp, decimal: Xp, match: Qp, reverse: Jl }, Hc = (t, e = !1, n = !1, r = !0) => {
  if (!hn(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(t), o = 2n ** (8n * i - 1n);
  return Pe({
    size: r ? t : void 0,
    encodeStream: (a, c) => {
      n && c < 0 && (c = c | o);
      const f = [];
      for (let p = 0; p < t; p++)
        f.push(Number(c & 255n)), c >>= 8n;
      let l = new Uint8Array(f).reverse();
      if (!r) {
        let p = 0;
        for (p = 0; p < l.length && l[p] === 0; p++)
          ;
        l = l.subarray(p);
      }
      a.bytes(e ? l.reverse() : l);
    },
    decodeStream: (a) => {
      const c = a.bytes(r ? t : Math.min(t, a.leftBytes)), f = e ? c : tc(c);
      let l = 0n;
      for (let p = 0; p < f.length; p++)
        l |= BigInt(f[p]) << 8n * BigInt(p);
      return n && l & o && (l = (l ^ o) - o), l;
    },
    validate: (a) => {
      if (typeof a != "bigint")
        throw new Error(`bigint: invalid value: ${a}`);
      return Gp(a, 8n * i, !!n), a;
    }
  });
}, td = /* @__PURE__ */ Hc(32, !1), Oo = /* @__PURE__ */ Hc(8, !0), Jp = /* @__PURE__ */ Hc(8, !0, !0), tg = (t, e) => Pe({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (i) => e.write(i, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), Hi = (t, e, n) => {
  const r = t * 8, i = 2 ** (r - 1), o = (f) => {
    if (!hn(f))
      throw new Error(`sintView: value is not safe integer: ${f}`);
    if (f < -i || f >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${f} < ${i}`);
  }, a = 2 ** r, c = (f) => {
    if (!hn(f))
      throw new Error(`uintView: value is not safe integer: ${f}`);
    if (0 > f || f >= a)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${f} < ${a}`);
  };
  return tg(t, {
    write: n.write,
    read: n.read,
    validate: e ? o : c
  });
}, Ut = /* @__PURE__ */ Hi(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), eg = /* @__PURE__ */ Hi(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), Nr = /* @__PURE__ */ Hi(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), yf = /* @__PURE__ */ Hi(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), zn = /* @__PURE__ */ Hi(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Ft = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = Xl(t), r = je(t);
  return Pe({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (i, o) => {
      r || n.encodeStream(i, o.length), i.bytes(e ? tc(o) : o), r && i.bytes(t);
    },
    decodeStream: (i) => {
      let o;
      if (r) {
        const a = i.find(t);
        if (!a)
          throw i.err("bytes: cannot find terminator");
        o = i.bytes(a - i.pos), i.bytes(t.length);
      } else
        o = i.bytes(t === null ? i.leftBytes : n.decodeStream(i));
      return e ? tc(o) : o;
    },
    validate: (i) => {
      if (!je(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function ng(t, e) {
  if (!Xe(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Wn(Ft(t), Jl(e));
}
const Vc = (t, e = !1) => Le(Wn(Ft(t, e), qp), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), rg = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = Wn(Ft(t, e.isLE), Ot);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Wn(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function Wn(t, e) {
  if (!Xe(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!bs(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Pe({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e.decode(r);
      } catch (o) {
        throw n.err("" + o);
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
const ig = (t, e = !1) => {
  if (!je(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Pe({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = Mr(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function og(t, e, n) {
  if (!Xe(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Pe({
    encodeStream: (r, i) => {
      Bn.resolve(r.stack, t) && e.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Bn.resolve(r.stack, t), i)
        return e.decodeStream(r);
    }
  });
}
function jc(t, e, n = !0) {
  if (!Xe(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Pe({
    size: t.size,
    encodeStream: (r, i) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const i = t.decodeStream(r);
      if (n && typeof i != "object" && i !== e || je(e) && !Mr(e, i))
        throw r.err(`magic: invalid value: ${i} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function ed(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!hn(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function de(t) {
  if (!qi(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!Xe(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Pe({
    size: ed(Object.values(t)),
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
function sg(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!Xe(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Pe({
    size: ed(t),
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
function Oe(t, e) {
  if (!Xe(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = Xl(typeof t == "string" ? `../${t}` : t);
  return Pe({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, i) => {
      const o = r;
      o.pushObj(i, (a) => {
        je(t) || n.encodeStream(r, i.length);
        for (let c = 0; c < i.length; c++)
          a(`${c}`, () => {
            const f = i[c], l = r.pos;
            if (e.encodeStream(r, f), je(t)) {
              if (t.length > o.pos - l)
                return;
              const p = o.finish(!1).subarray(l, o.pos);
              if (Mr(p.subarray(0, t.length), t))
                throw o.err(`array: inner element encoding same as separator. elm=${f} data=${p}`);
            }
          });
      }), je(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (o) => {
        if (t === null)
          for (let a = 0; !r.isEnd() && (o(`${a}`, () => i.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); a++)
            ;
        else if (je(t))
          for (let a = 0; ; a++) {
            if (Mr(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            o(`${a}`, () => i.push(e.decodeStream(r)));
          }
        else {
          let a;
          o("arrayLen", () => a = n.decodeStream(r));
          for (let c = 0; c < a; c++)
            o(`${c}`, () => i.push(e.decodeStream(r)));
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
const Es = ln.ProjectivePoint, Wo = ln.CURVE.n, Pt = Fc.isBytes, qn = Fc.concatBytes, te = Fc.equalBytes, nd = (t) => Op(Ce(t)), Ve = (...t) => Ce(Ce(qn(...t))), rd = dn.utils.randomPrivateKey, zc = dn.getPublicKey, ag = ln.getPublicKey, mf = (t) => t.r < Wo / 2n;
function cg(t, e, n = !1) {
  let r = ln.sign(t, e);
  if (n && !mf(r)) {
    const i = new Uint8Array(32);
    let o = 0;
    for (; !mf(r); )
      if (i.set(Ut.encode(o++)), r = ln.sign(t, e, { extraEntropy: i }), o > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const bf = dn.sign, Gc = dn.utils.taggedHash;
var _e;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(_e || (_e = {}));
function Fr(t, e) {
  const n = t.length;
  if (e === _e.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Es.fromHex(t), t;
  } else if (e === _e.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return dn.utils.lift_x(dn.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function id(t, e) {
  const n = dn.utils, r = n.taggedHash("TapTweak", t, e), i = n.bytesToNumberBE(r);
  if (i >= Wo)
    throw new Error("tweak higher than curve order");
  return i;
}
function ug(t, e = new Uint8Array()) {
  const n = dn.utils, r = n.bytesToNumberBE(t), i = Es.fromPrivateKey(r), o = i.hasEvenY() ? r : n.mod(-r, Wo), a = n.pointToBytes(i), c = id(a, e);
  return n.numberToBytesBE(n.mod(o + c, Wo), 32);
}
function od(t, e) {
  const n = dn.utils, r = id(t, e), o = n.lift_x(n.bytesToNumberBE(t)).add(Es.fromPrivateKey(r)), a = o.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(o), a];
}
const Wc = Ce(Es.BASE.toRawBytes(!1)), qr = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, ko = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Yo(t, e) {
  if (!Pt(t) || !Pt(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Yc(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function sd(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function ad(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Hr(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function Vi(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Zo(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Xo(t, e) {
  if (!sd(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Zc(t, e) {
  if (!sd(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function xs(...t) {
  const e = (o) => o, n = (o, a) => (c) => o(a(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Ss(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Xo("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (Zo(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (Zo(i), i.map((o) => {
      Hr("alphabet.decode", o);
      const a = r.get(o);
      if (a === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return a;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function As(t = "") {
  return Hr("join", t), {
    encode: (e) => (Xo("join.decode", e), e.join(t)),
    decode: (e) => (Hr("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function fg(t, e = "=") {
  return Vi(t), Hr("padding", e), {
    encode(n) {
      for (Xo("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Xo("padding.decode", n);
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
function lg(t) {
  return ad(t), { encode: (e) => e, decode: (e) => t(e) };
}
function vf(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Zo(t), !t.length)
    return [];
  let r = 0;
  const i = [], o = Array.from(t, (c) => {
    if (Vi(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), a = o.length;
  for (; ; ) {
    let c = 0, f = !0;
    for (let l = r; l < a; l++) {
      const p = o[l], h = e * c, w = h + p;
      if (!Number.isSafeInteger(w) || h / e !== c || w - p !== h)
        throw new Error("convertRadix: carry overflow");
      const b = w / n;
      c = w % n;
      const T = Math.floor(b);
      if (o[l] = T, !Number.isSafeInteger(T) || T * n + c !== w)
        throw new Error("convertRadix: carry overflow");
      if (f)
        T ? f = !1 : r = l;
      else continue;
    }
    if (i.push(c), f)
      break;
  }
  for (let c = 0; c < t.length - 1 && t[c] === 0; c++)
    i.push(0);
  return i.reverse();
}
const cd = (t, e) => e === 0 ? t : cd(e, t % e), Qo = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - cd(t, e)), Ro = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function ec(t, e, n, r) {
  if (Zo(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Qo(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Qo(e, n)}`);
  let i = 0, o = 0;
  const a = Ro[e], c = Ro[n] - 1, f = [];
  for (const l of t) {
    if (Vi(l), l >= a)
      throw new Error(`convertRadix2: invalid data word=${l} from=${e}`);
    if (i = i << e | l, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      f.push((i >> o - n & c) >>> 0);
    const p = Ro[o];
    if (p === void 0)
      throw new Error("invalid carry");
    i &= p - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && f.push(i >>> 0), f;
}
// @__NO_SIDE_EFFECTS__
function dg(t) {
  Vi(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Yc(n))
        throw new Error("radix.encode input should be Uint8Array");
      return vf(Array.from(n), e, t);
    },
    decode: (n) => (Zc("radix.decode", n), Uint8Array.from(vf(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function Xc(t, e = !1) {
  if (Vi(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Qo(8, t) > 32 || /* @__PURE__ */ Qo(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Yc(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ec(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Zc("radix2.decode", n), Uint8Array.from(ec(n, t, 8, e)))
  };
}
function Ef(t) {
  return ad(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const Be = /* @__PURE__ */ xs(/* @__PURE__ */ Xc(6), /* @__PURE__ */ Ss("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ fg(6), /* @__PURE__ */ As("")), hg = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ xs(/* @__PURE__ */ dg(58), /* @__PURE__ */ Ss(t), /* @__PURE__ */ As("")), xf = /* @__PURE__ */ hg("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), nc = /* @__PURE__ */ xs(/* @__PURE__ */ Ss("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ As("")), Sf = [996825010, 642813549, 513874426, 1027748829, 705979059];
function di(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Sf.length; r++)
    (e >> r & 1) === 1 && (n ^= Sf[r]);
  return n;
}
function Af(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let o = 0; o < r; o++) {
    const a = t.charCodeAt(o);
    if (a < 33 || a > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = di(i) ^ a >> 5;
  }
  i = di(i);
  for (let o = 0; o < r; o++)
    i = di(i) ^ t.charCodeAt(o) & 31;
  for (let o of e)
    i = di(i) ^ o;
  for (let o = 0; o < 6; o++)
    i = di(i);
  return i ^= n, nc.encode(ec([i % Ro[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function pg(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Xc(5), r = n.decode, i = n.encode, o = Ef(r);
  function a(h, w, b = 90) {
    Hr("bech32.encode prefix", h), Yc(w) && (w = Array.from(w)), Zc("bech32.encode", w);
    const T = h.length;
    if (T === 0)
      throw new TypeError(`Invalid prefix length ${T}`);
    const x = T + 7 + w.length;
    if (b !== !1 && x > b)
      throw new TypeError(`Length ${x} exceeds limit ${b}`);
    const v = h.toLowerCase(), k = Af(v, w, e);
    return `${v}1${nc.encode(w)}${k}`;
  }
  function c(h, w = 90) {
    Hr("bech32.decode input", h);
    const b = h.length;
    if (b < 8 || w !== !1 && b > w)
      throw new TypeError(`invalid string length: ${b} (${h}). Expected (8..${w})`);
    const T = h.toLowerCase();
    if (h !== T && h !== h.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const x = T.lastIndexOf("1");
    if (x === 0 || x === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const v = T.slice(0, x), k = T.slice(x + 1);
    if (k.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const $ = nc.decode(k).slice(0, -6), L = Af(v, $, e);
    if (!k.endsWith(L))
      throw new Error(`Invalid checksum in ${h}: expected "${L}"`);
    return { prefix: v, words: $ };
  }
  const f = Ef(c);
  function l(h) {
    const { prefix: w, words: b } = c(h, !1);
    return { prefix: w, words: b, bytes: r(b) };
  }
  function p(h, w) {
    return a(h, i(w));
  }
  return {
    encode: a,
    decode: c,
    encodeFromBytes: p,
    decodeToBytes: l,
    decodeUnsafe: f,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const To = /* @__PURE__ */ pg("bech32m"), yt = /* @__PURE__ */ xs(/* @__PURE__ */ Xc(4), /* @__PURE__ */ Ss("0123456789abcdef"), /* @__PURE__ */ As(""), /* @__PURE__ */ lg((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class ud extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: fd, pointToBytes: Io } = dn.utils, Yn = ln.ProjectivePoint, pn = 33, rc = new Uint8Array(pn), Hn = ln.CURVE.n, kf = Wn(Ft(33), {
  decode: (t) => Qc(t) ? rc : t.toRawBytes(!0),
  encode: (t) => Ti(t, rc) ? Yn.ZERO : Yn.fromHex(t)
}), Tf = Le(td, (t) => (ze("n", t, 1n, Hn), t)), Lo = de({ R1: kf, R2: kf }), ld = de({ k1: Tf, k2: Tf, publicKey: Ft(pn) });
function If(t, ...e) {
}
function We(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Ue(n, ...e));
}
function Bf(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Ye = (t) => ue(t, Hn), Jo = (t, ...e) => Ye($e(fd(t, ...e))), hi = (t, e) => t.hasEvenY() ? e : Ye(-e);
function gr(t) {
  return Yn.BASE.multiply(t);
}
function Qc(t) {
  return t.equals(Yn.ZERO);
}
function ic(t) {
  return We(t, pn), t.sort(Yo);
}
function dd(t) {
  We(t, pn);
  for (let e = 1; e < t.length; e++)
    if (!Ti(t[e], t[0]))
      return t[e];
  return rc;
}
function hd(t) {
  return We(t, pn), fd("KeyAgg list", ...t);
}
function pd(t, e, n) {
  return Ue(t, pn), Ue(e, pn), Ti(t, e) ? 1n : Jo("KeyAgg coefficient", n, t);
}
function oc(t, e = [], n = []) {
  if (We(t, pn), We(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = dd(t), i = hd(t);
  let o = Yn.ZERO;
  for (let f = 0; f < t.length; f++) {
    let l;
    try {
      l = Yn.fromHex(t[f]);
    } catch {
      throw new ud(f, "pubkey");
    }
    o = o.add(l.multiply(pd(t[f], r, i)));
  }
  let a = 1n, c = 0n;
  for (let f = 0; f < e.length; f++) {
    const l = n[f] && !o.hasEvenY() ? Ye(-1n) : 1n, p = $e(e[f]);
    if (ze("tweak", p, 0n, Hn), o = o.multiply(l).add(gr(p)), Qc(o))
      throw new Error("The result of tweaking cannot be infinity");
    a = Ye(l * a), c = Ye(p + l * c);
  }
  return { aggPublicKey: o, gAcc: a, tweakAcc: c };
}
const _f = (t, e, n, r, i, o) => Jo("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, i, fn(o.length, 4), o, new Uint8Array([r]));
function gg(t, e, n = new Uint8Array(0), r, i = new Uint8Array(0), o = Nc(32)) {
  Ue(t, pn), If(e, 32), Ue(n, 0, 32), If(), Ue(i), Ue(o, 32);
  const a = new Uint8Array([0]), c = _f(o, t, n, 0, a, i), f = _f(o, t, n, 1, a, i);
  return {
    secret: ld.encode({ k1: c, k2: f, publicKey: t }),
    public: Lo.encode({ R1: gr(c), R2: gr(f) })
  };
}
class wg {
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
  constructor(e, n, r, i = [], o = []) {
    if (We(n, 33), We(i, 32), Bf(o), Ue(r), i.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: a, gAcc: c, tweakAcc: f } = oc(n, i, o), { R1: l, R2: p } = Lo.decode(e);
    this.publicKeys = n, this.Q = a, this.gAcc = c, this.tweakAcc = f, this.b = Jo("MuSig/noncecoef", e, Io(a), r);
    const h = l.add(p.multiply(this.b));
    this.R = Qc(h) ? Yn.BASE : h, this.e = Jo("BIP0340/challenge", Io(this.R), Io(a), r), this.tweaks = i, this.isXonly = o, this.L = hd(n), this.secondKey = dd(n);
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
    if (!n.some((o) => Ti(o, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return pd(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: i, gAcc: o, b: a, R: c, e: f } = this, l = $e(e);
    if (l >= Hn)
      return !1;
    const { R1: p, R2: h } = Lo.decode(n), w = p.add(h.multiply(a)), b = c.hasEvenY() ? w : w.negate(), T = Yn.fromHex(r), x = this.getSessionKeyAggCoeff(T), v = Ye(hi(i, 1n) * o), k = gr(l), $ = b.add(T.multiply(Ye(f * x * v)));
    return k.equals($);
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
    if (Ue(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: o, b: a, R: c, e: f } = this, { k1: l, k2: p, publicKey: h } = ld.decode(e);
    e.fill(0, 0, 64), ze("k1", l, 0n, Hn), ze("k2", p, 0n, Hn);
    const w = hi(c, l), b = hi(c, p), T = $e(n);
    ze("d_", T, 1n, Hn);
    const x = gr(T), v = x.toRawBytes(!0);
    if (!Ti(v, h))
      throw new Error("Public key does not match nonceGen argument");
    const k = this.getSessionKeyAggCoeff(x), $ = hi(i, 1n), L = Ye($ * o * T), V = Ye(w + a * b + f * k * L), Y = fn(V, 32);
    if (!r) {
      const G = Lo.encode({
        R1: gr(l),
        R2: gr(p)
      });
      if (!this.partialSigVerifyInternal(Y, G, v))
        throw new Error("Partial signature verification failed");
    }
    return Y;
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
    const { publicKeys: i, tweaks: o, isXonly: a } = this;
    if (Ue(e, 32), We(n, 66), We(i, pn), We(o, 32), Bf(a), Ha(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (o.length !== a.length)
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
    We(e, 32);
    const { Q: n, tweakAcc: r, R: i, e: o } = this;
    let a = 0n;
    for (let f = 0; f < e.length; f++) {
      const l = $e(e[f]);
      if (l >= Hn)
        throw new ud(f, "psig");
      a = Ye(a + l);
    }
    const c = hi(n, 1n);
    return a = Ye(a + o * c * r), yr(Io(i), fn(a, 32));
  }
}
function yg(t) {
  const e = gg(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ks = /* @__PURE__ */ BigInt(0), Ts = /* @__PURE__ */ BigInt(1), mg = /* @__PURE__ */ BigInt(2);
function mr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ji(t) {
  if (!mr(t))
    throw new Error("Uint8Array expected");
}
function Vr(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const bg = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function jr(t) {
  ji(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += bg[t[n]];
  return e;
}
function Cr(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Jc(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? ks : BigInt("0x" + t);
}
const bn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Nf(t) {
  if (t >= bn._0 && t <= bn._9)
    return t - bn._0;
  if (t >= bn.A && t <= bn.F)
    return t - (bn.A - 10);
  if (t >= bn.a && t <= bn.f)
    return t - (bn.a - 10);
}
function zr(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const a = Nf(t.charCodeAt(o)), c = Nf(t.charCodeAt(o + 1));
    if (a === void 0 || c === void 0) {
      const f = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + o);
    }
    r[i] = a * 16 + c;
  }
  return r;
}
function un(t) {
  return Jc(jr(t));
}
function tu(t) {
  return ji(t), Jc(jr(Uint8Array.from(t).reverse()));
}
function Zn(t, e) {
  return zr(t.toString(16).padStart(e * 2, "0"));
}
function eu(t, e) {
  return Zn(t, e).reverse();
}
function vg(t) {
  return zr(Cr(t));
}
function Ae(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = zr(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (mr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function br(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ji(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
function Eg(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function xg(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const Ta = (t) => typeof t == "bigint" && ks <= t;
function Gr(t, e, n) {
  return Ta(t) && Ta(e) && Ta(n) && e <= t && t < n;
}
function Gn(t, e, n, r) {
  if (!Gr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function gd(t) {
  let e;
  for (e = 0; t > ks; t >>= Ts, e += 1)
    ;
  return e;
}
function Sg(t, e) {
  return t >> BigInt(e) & Ts;
}
function Ag(t, e, n) {
  return t | (n ? Ts : ks) << BigInt(e);
}
const nu = (t) => (mg << BigInt(t - 1)) - Ts, Ia = (t) => new Uint8Array(t), Cf = (t) => Uint8Array.from(t);
function wd(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Ia(t), i = Ia(t), o = 0;
  const a = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...h) => n(i, r, ...h), f = (h = Ia()) => {
    i = c(Cf([0]), h), r = c(), h.length !== 0 && (i = c(Cf([1]), h), r = c());
  }, l = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let h = 0;
    const w = [];
    for (; h < e; ) {
      r = c();
      const b = r.slice();
      w.push(b), h += r.length;
    }
    return br(...w);
  };
  return (h, w) => {
    a(), f(h);
    let b;
    for (; !(b = w(l())); )
      f();
    return a(), b;
  };
}
const kg = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || mr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function zi(t, e, n = {}) {
  const r = (i, o, a) => {
    const c = kg[o];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const f = t[i];
    if (!(a && f === void 0) && !c(f, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + o + ", got " + f);
  };
  for (const [i, o] of Object.entries(e))
    r(i, o, !1);
  for (const [i, o] of Object.entries(n))
    r(i, o, !0);
  return t;
}
const Tg = () => {
  throw new Error("not implemented");
};
function sc(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
const Ig = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Gn,
  abool: Vr,
  abytes: ji,
  bitGet: Sg,
  bitLen: gd,
  bitMask: nu,
  bitSet: Ag,
  bytesToHex: jr,
  bytesToNumberBE: un,
  bytesToNumberLE: tu,
  concatBytes: br,
  createHmacDrbg: wd,
  ensureBytes: Ae,
  equalBytes: Eg,
  hexToBytes: zr,
  hexToNumber: Jc,
  inRange: Gr,
  isBytes: mr,
  memoized: sc,
  notImplemented: Tg,
  numberToBytesBE: Zn,
  numberToBytesLE: eu,
  numberToHexUnpadded: Cr,
  numberToVarBytesBE: vg,
  utf8ToBytes: xg,
  validateObject: zi
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const ru = 2n ** 256n, Or = ru - 0x1000003d1n, yd = ru - 0x14551231950b75fc4402da1732fc9bebfn, Bg = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, _g = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, iu = {
  n: yd,
  a: 0n,
  b: 7n
}, bi = 32, Uf = (t) => dt(dt(t * t) * t + iu.b), ke = (t = "") => {
  throw new Error(t);
}, Is = (t) => typeof t == "bigint", md = (t) => typeof t == "string", Ba = (t) => Is(t) && 0n < t && t < Or, bd = (t) => Is(t) && 0n < t && t < yd, Ng = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", ac = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Ng(t) || typeof e == "number" && e > 0 && t.length !== e ? ke("Uint8Array expected") : t
), vd = (t) => new Uint8Array(t), Ed = (t, e) => ac(md(t) ? ou(t) : vd(ac(t)), e), dt = (t, e = Or) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, $f = (t) => t instanceof Wr ? t : ke("Point expected");
let Wr = class _r {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? yi : new _r(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Ed(e);
    let n;
    const r = e[0], i = e.subarray(1), o = Rf(i, 0, bi), a = e.length;
    if (a === 33 && [2, 3].includes(r)) {
      Ba(o) || ke("Point hex invalid: x not FE");
      let c = $g(Uf(o));
      const f = (c & 1n) === 1n;
      (r & 1) === 1 !== f && (c = dt(-c)), n = new _r(o, c, 1n);
    }
    return a === 65 && r === 4 && (n = new _r(o, Rf(i, bi, 2 * bi), 1n)), n ? n.ok() : ke("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return vi.mul(Og(e));
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
    const { px: n, py: r, pz: i } = this, { px: o, py: a, pz: c } = $f(e), f = dt(n * c), l = dt(o * i), p = dt(r * c), h = dt(a * i);
    return f === l && p === h;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new _r(this.px, dt(-this.py), this.pz);
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
    const { px: n, py: r, pz: i } = this, { px: o, py: a, pz: c } = $f(e), { a: f, b: l } = iu;
    let p = 0n, h = 0n, w = 0n;
    const b = dt(l * 3n);
    let T = dt(n * o), x = dt(r * a), v = dt(i * c), k = dt(n + r), $ = dt(o + a);
    k = dt(k * $), $ = dt(T + x), k = dt(k - $), $ = dt(n + i);
    let L = dt(o + c);
    return $ = dt($ * L), L = dt(T + v), $ = dt($ - L), L = dt(r + i), p = dt(a + c), L = dt(L * p), p = dt(x + v), L = dt(L - p), w = dt(f * $), p = dt(b * v), w = dt(p + w), p = dt(x - w), w = dt(x + w), h = dt(p * w), x = dt(T + T), x = dt(x + T), v = dt(f * v), $ = dt(b * $), x = dt(x + v), v = dt(T - v), v = dt(f * v), $ = dt($ + v), T = dt(x * $), h = dt(h + T), T = dt(L * $), p = dt(k * p), p = dt(p - T), T = dt(k * x), w = dt(L * w), w = dt(w + T), new _r(p, h, w);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return yi;
    if (bd(e) || ke("scalar invalid"), this.equals(vi))
      return Lg(e).p;
    let r = yi, i = vi;
    for (let o = this; e > 0n; o = o.double(), e >>= 1n)
      e & 1n ? r = r.add(o) : n && (i = i.add(o));
    return r;
  }
  mulAddQUns(e, n, r) {
    return this.mul(n, !1).add(e.mul(r, !1)).ok();
  }
  // to private keys. Doesn't use Shamir trick
  /** Convert point to 2d xy affine point. (x, y, z) ∋ (x=x/z, y=y/z) */
  toAffine() {
    const { px: e, py: n, pz: r } = this;
    if (this.equals(yi))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const i = Ug(r, Or);
    return dt(r * i) !== 1n && ke("inverse invalid"), { x: dt(e * i), y: dt(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!Ba(e) || !Ba(n)) && ke("Point invalid: x or y"), dt(n * n) === Uf(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : ke("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Lf(n) + (e ? "" : Lf(r));
  }
  toRawBytes(e = !0) {
    return ou(this.toHex(e));
  }
};
Wr.BASE = new Wr(Bg, _g, 1n);
Wr.ZERO = new Wr(0n, 1n, 0n);
const { BASE: vi, ZERO: yi } = Wr, xd = (t, e) => t.toString(16).padStart(e, "0"), Sd = (t) => Array.from(ac(t)).map((e) => xd(e, 2)).join(""), vn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Of = (t) => {
  if (t >= vn._0 && t <= vn._9)
    return t - vn._0;
  if (t >= vn.A && t <= vn.F)
    return t - (vn.A - 10);
  if (t >= vn.a && t <= vn.f)
    return t - (vn.a - 10);
}, ou = (t) => {
  const e = "hex invalid";
  if (!md(t))
    return ke(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return ke(e);
  const i = vd(r);
  for (let o = 0, a = 0; o < r; o++, a += 2) {
    const c = Of(t.charCodeAt(a)), f = Of(t.charCodeAt(a + 1));
    if (c === void 0 || f === void 0)
      return ke(e);
    i[o] = c * 16 + f;
  }
  return i;
}, Ad = (t) => BigInt("0x" + (Sd(t) || "0")), Rf = (t, e, n) => Ad(t.slice(e, n)), Cg = (t) => Is(t) && t >= 0n && t < ru ? ou(xd(t, 2 * bi)) : ke("bigint expected"), Lf = (t) => Sd(Cg(t)), Ug = (t, e) => {
  (t === 0n || e <= 0n) && ke("no inverse n=" + t + " mod=" + e);
  let n = dt(t, e), r = e, i = 0n, o = 1n;
  for (; n !== 0n; ) {
    const a = r / n, c = r % n, f = i - o * a;
    r = n, n = c, i = o, o = f;
  }
  return r === 1n ? dt(i, e) : ke("no inverse");
}, $g = (t) => {
  let e = 1n;
  for (let n = t, r = (Or + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % Or), n = n * n % Or;
  return dt(e * e) === t ? e : ke("sqrt invalid");
}, Og = (t) => (Is(t) || (t = Ad(Ed(t, bi))), bd(t) ? t : ke("private key invalid 3")), hr = 8, Rg = () => {
  const t = [], e = 256 / hr + 1;
  let n = vi, r = n;
  for (let i = 0; i < e; i++) {
    r = n, t.push(r);
    for (let o = 1; o < 2 ** (hr - 1); o++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let Pf;
const Lg = (t) => {
  const e = Pf || (Pf = Rg()), n = (p, h) => {
    let w = h.negate();
    return p ? w : h;
  };
  let r = yi, i = vi;
  const o = 1 + 256 / hr, a = 2 ** (hr - 1), c = BigInt(2 ** hr - 1), f = 2 ** hr, l = BigInt(hr);
  for (let p = 0; p < o; p++) {
    const h = p * a;
    let w = Number(t & c);
    t >>= l, w > a && (w -= f, t += 1n);
    const b = h, T = h + Math.abs(w) - 1, x = p % 2 !== 0, v = w < 0;
    w === 0 ? i = i.add(n(x, e[b])) : r = r.add(n(v, e[T]));
  }
  return { p: r, f: i };
};
function Kf(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Pg(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Bs(t, ...e) {
  if (!Pg(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Kg(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Kf(t.outputLen), Kf(t.blockLen);
}
function ts(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Dg(t, e) {
  Bs(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const Br = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _a = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), an = (t, e) => t << 32 - e | t >>> e;
function Mg(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function su(t) {
  return typeof t == "string" && (t = Mg(t)), Bs(t), t;
}
function Fg(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Bs(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
class kd {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function qg(t) {
  const e = (r) => t().update(su(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Td(t = 32) {
  if (Br && typeof Br.getRandomValues == "function")
    return Br.getRandomValues(new Uint8Array(t));
  if (Br && typeof Br.randomBytes == "function")
    return Br.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Hg(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), a = Number(n >> i & o), c = Number(n & o), f = r ? 4 : 0, l = r ? 0 : 4;
  t.setUint32(e + f, a, r), t.setUint32(e + l, c, r);
}
const Vg = (t, e, n) => t & e ^ ~t & n, jg = (t, e, n) => t & e ^ t & n ^ e & n;
class zg extends kd {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = _a(this.buffer);
  }
  update(e) {
    ts(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = su(e);
    const o = e.length;
    for (let a = 0; a < o; ) {
      const c = Math.min(i - this.pos, o - a);
      if (c === i) {
        const f = _a(e);
        for (; i <= o - a; a += i)
          this.process(f, a);
        continue;
      }
      r.set(e.subarray(a, a + c), this.pos), this.pos += c, a += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    ts(this), Dg(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: a } = this;
    n[a++] = 128, this.buffer.subarray(a).fill(0), this.padOffset > i - a && (this.process(r, 0), a = 0);
    for (let h = a; h < i; h++)
      n[h] = 0;
    Hg(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = _a(e), f = this.outputLen;
    if (f % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const l = f / 4, p = this.get();
    if (l > p.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let h = 0; h < l; h++)
      c.setUint32(4 * h, p[h], o);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: o, destroyed: a, pos: c } = this;
    return e.length = i, e.pos = c, e.finished = o, e.destroyed = a, i % n && e.buffer.set(r), e;
  }
}
const Gg = /* @__PURE__ */ new Uint32Array([
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
]), Dn = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Mn = /* @__PURE__ */ new Uint32Array(64);
class Wg extends zg {
  constructor() {
    super(64, 32, 8, !1), this.A = Dn[0] | 0, this.B = Dn[1] | 0, this.C = Dn[2] | 0, this.D = Dn[3] | 0, this.E = Dn[4] | 0, this.F = Dn[5] | 0, this.G = Dn[6] | 0, this.H = Dn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: o, F: a, G: c, H: f } = this;
    return [e, n, r, i, o, a, c, f];
  }
  // prettier-ignore
  set(e, n, r, i, o, a, c, f) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = o | 0, this.F = a | 0, this.G = c | 0, this.H = f | 0;
  }
  process(e, n) {
    for (let h = 0; h < 16; h++, n += 4)
      Mn[h] = e.getUint32(n, !1);
    for (let h = 16; h < 64; h++) {
      const w = Mn[h - 15], b = Mn[h - 2], T = an(w, 7) ^ an(w, 18) ^ w >>> 3, x = an(b, 17) ^ an(b, 19) ^ b >>> 10;
      Mn[h] = x + Mn[h - 7] + T + Mn[h - 16] | 0;
    }
    let { A: r, B: i, C: o, D: a, E: c, F: f, G: l, H: p } = this;
    for (let h = 0; h < 64; h++) {
      const w = an(c, 6) ^ an(c, 11) ^ an(c, 25), b = p + w + Vg(c, f, l) + Gg[h] + Mn[h] | 0, x = (an(r, 2) ^ an(r, 13) ^ an(r, 22)) + jg(r, i, o) | 0;
      p = l, l = f, f = c, c = a + b | 0, a = o, o = i, i = r, r = b + x | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, a = a + this.D | 0, c = c + this.E | 0, f = f + this.F | 0, l = l + this.G | 0, p = p + this.H | 0, this.set(r, i, o, a, c, f, l, p);
  }
  roundClean() {
    Mn.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const cc = /* @__PURE__ */ qg(() => new Wg());
class Id extends kd {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Kg(e);
    const r = su(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, o = new Uint8Array(i);
    o.set(r.length > i ? e.create().update(r).digest() : r);
    for (let a = 0; a < o.length; a++)
      o[a] ^= 54;
    this.iHash.update(o), this.oHash = e.create();
    for (let a = 0; a < o.length; a++)
      o[a] ^= 106;
    this.oHash.update(o), o.fill(0);
  }
  update(e) {
    return ts(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    ts(this), Bs(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: o, blockLen: a, outputLen: c } = this;
    return e = e, e.finished = i, e.destroyed = o, e.blockLen = a, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Bd = (t, e, n) => new Id(t, e).update(n).digest();
Bd.create = (t, e) => new Id(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const le = BigInt(0), Yt = BigInt(1), pr = /* @__PURE__ */ BigInt(2), Yg = /* @__PURE__ */ BigInt(3), uc = /* @__PURE__ */ BigInt(4), Df = /* @__PURE__ */ BigInt(5), Mf = /* @__PURE__ */ BigInt(8);
function ge(t, e) {
  const n = t % e;
  return n >= le ? n : e + n;
}
function Zg(t, e, n) {
  if (e < le)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= le)
    throw new Error("invalid modulus");
  if (n === Yt)
    return le;
  let r = Yt;
  for (; e > le; )
    e & Yt && (r = r * t % n), t = t * t % n, e >>= Yt;
  return r;
}
function He(t, e, n) {
  let r = t;
  for (; e-- > le; )
    r *= r, r %= n;
  return r;
}
function fc(t, e) {
  if (t === le)
    throw new Error("invert: expected non-zero number");
  if (e <= le)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = ge(t, e), r = e, i = le, o = Yt;
  for (; n !== le; ) {
    const c = r / n, f = r % n, l = i - o * c;
    r = n, n = f, i = o, o = l;
  }
  if (r !== Yt)
    throw new Error("invert: does not exist");
  return ge(i, e);
}
function Xg(t) {
  const e = (t - Yt) / pr;
  let n, r, i;
  for (n = t - Yt, r = 0; n % pr === le; n /= pr, r++)
    ;
  for (i = pr; i < t && Zg(i, e, t) !== t - Yt; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const a = (t + Yt) / uc;
    return function(f, l) {
      const p = f.pow(l, a);
      if (!f.eql(f.sqr(p), l))
        throw new Error("Cannot find square root");
      return p;
    };
  }
  const o = (n + Yt) / pr;
  return function(c, f) {
    if (c.pow(f, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let l = r, p = c.pow(c.mul(c.ONE, i), n), h = c.pow(f, o), w = c.pow(f, n);
    for (; !c.eql(w, c.ONE); ) {
      if (c.eql(w, c.ZERO))
        return c.ZERO;
      let b = 1;
      for (let x = c.sqr(w); b < l && !c.eql(x, c.ONE); b++)
        x = c.sqr(x);
      const T = c.pow(p, Yt << BigInt(l - b - 1));
      p = c.sqr(T), h = c.mul(h, T), w = c.mul(w, p), l = b;
    }
    return h;
  };
}
function Qg(t) {
  if (t % uc === Yg) {
    const e = (t + Yt) / uc;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % Mf === Df) {
    const e = (t - Df) / Mf;
    return function(r, i) {
      const o = r.mul(i, pr), a = r.pow(o, e), c = r.mul(i, a), f = r.mul(r.mul(c, pr), a), l = r.mul(c, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(l), i))
        throw new Error("Cannot find square root");
      return l;
    };
  }
  return Xg(t);
}
const Jg = [
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
function tw(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Jg.reduce((r, i) => (r[i] = "function", r), e);
  return zi(t, n);
}
function ew(t, e, n) {
  if (n < le)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === le)
    return t.ONE;
  if (n === Yt)
    return e;
  let r = t.ONE, i = e;
  for (; n > le; )
    n & Yt && (r = t.mul(r, i)), i = t.sqr(i), n >>= Yt;
  return r;
}
function nw(t, e) {
  const n = new Array(e.length), r = e.reduce((o, a, c) => t.is0(a) ? o : (n[c] = o, t.mul(o, a)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, a, c) => t.is0(a) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, a)), i), n;
}
function _d(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Nd(t, e, n = !1, r = {}) {
  if (t <= le)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = _d(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let a;
  const c = Object.freeze({
    ORDER: t,
    BITS: i,
    BYTES: o,
    MASK: nu(i),
    ZERO: le,
    ONE: Yt,
    create: (f) => ge(f, t),
    isValid: (f) => {
      if (typeof f != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof f);
      return le <= f && f < t;
    },
    is0: (f) => f === le,
    isOdd: (f) => (f & Yt) === Yt,
    neg: (f) => ge(-f, t),
    eql: (f, l) => f === l,
    sqr: (f) => ge(f * f, t),
    add: (f, l) => ge(f + l, t),
    sub: (f, l) => ge(f - l, t),
    mul: (f, l) => ge(f * l, t),
    pow: (f, l) => ew(c, f, l),
    div: (f, l) => ge(f * fc(l, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, l) => f + l,
    subN: (f, l) => f - l,
    mulN: (f, l) => f * l,
    inv: (f) => fc(f, t),
    sqrt: r.sqrt || ((f) => (a || (a = Qg(t)), a(c, f))),
    invertBatch: (f) => nw(c, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, l, p) => p ? l : f,
    toBytes: (f) => n ? eu(f, o) : Zn(f, o),
    fromBytes: (f) => {
      if (f.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + f.length);
      return n ? tu(f) : un(f);
    }
  });
  return Object.freeze(c);
}
function Cd(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Ud(t) {
  const e = Cd(t);
  return e + Math.ceil(e / 2);
}
function rw(t, e, n = !1) {
  const r = t.length, i = Cd(e), o = Ud(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const a = n ? un(t) : tu(t), c = ge(a, e - Yt) + Yt;
  return n ? eu(c, i) : Zn(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ff = BigInt(0), Bo = BigInt(1);
function Na(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function $d(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Ca(t, e) {
  $d(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function iw(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function ow(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Ua = /* @__PURE__ */ new WeakMap(), Od = /* @__PURE__ */ new WeakMap();
function $a(t) {
  return Od.get(t) || 1;
}
function sw(t, e) {
  return {
    constTimeNegate: Na,
    hasPrecomputes(n) {
      return $a(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > Ff; )
        r & Bo && (i = i.add(o)), o = o.double(), r >>= Bo;
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
      const { windows: i, windowSize: o } = Ca(r, e), a = [];
      let c = n, f = c;
      for (let l = 0; l < i; l++) {
        f = c, a.push(f);
        for (let p = 1; p < o; p++)
          f = f.add(c), a.push(f);
        c = f.double();
      }
      return a;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      const { windows: o, windowSize: a } = Ca(n, e);
      let c = t.ZERO, f = t.BASE;
      const l = BigInt(2 ** n - 1), p = 2 ** n, h = BigInt(n);
      for (let w = 0; w < o; w++) {
        const b = w * a;
        let T = Number(i & l);
        i >>= h, T > a && (T -= p, i += Bo);
        const x = b, v = b + Math.abs(T) - 1, k = w % 2 !== 0, $ = T < 0;
        T === 0 ? f = f.add(Na(k, r[x])) : c = c.add(Na($, r[v]));
      }
      return { p: c, f };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, i, o = t.ZERO) {
      const { windows: a, windowSize: c } = Ca(n, e), f = BigInt(2 ** n - 1), l = 2 ** n, p = BigInt(n);
      for (let h = 0; h < a; h++) {
        const w = h * c;
        if (i === Ff)
          break;
        let b = Number(i & f);
        if (i >>= p, b > c && (b -= l, i += Bo), b === 0)
          continue;
        let T = r[w + Math.abs(b) - 1];
        b < 0 && (T = T.negate()), o = o.add(T);
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = Ua.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && Ua.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = $a(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const a = $a(n);
      return a === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(a, this.getPrecomputes(a, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      $d(r, e), Od.set(n, r), Ua.delete(n);
    }
  };
}
function aw(t, e, n, r) {
  if (iw(n, t), ow(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = gd(BigInt(n.length)), a = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = (1 << a) - 1, f = new Array(c + 1).fill(i), l = Math.floor((e.BITS - 1) / a) * a;
  let p = i;
  for (let h = l; h >= 0; h -= a) {
    f.fill(i);
    for (let b = 0; b < r.length; b++) {
      const T = r[b], x = Number(T >> BigInt(h) & BigInt(c));
      f[x] = f[x].add(n[b]);
    }
    let w = i;
    for (let b = f.length - 1, T = i; b > 0; b--)
      T = T.add(f[b]), w = w.add(T);
    if (p = p.add(w), h !== 0)
      for (let b = 0; b < a; b++)
        p = p.double();
  }
  return p;
}
function Rd(t) {
  return tw(t.Fp), zi(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ..._d(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function qf(t) {
  t.lowS !== void 0 && Vr("lowS", t.lowS), t.prehash !== void 0 && Vr("prehash", t.prehash);
}
function cw(t) {
  const e = Rd(t);
  zi(e, {
    a: "field",
    b: "field"
  }, {
    allowedPrivateKeyLengths: "array",
    wrapPrivateKey: "boolean",
    isTorsionFree: "function",
    clearCofactor: "function",
    allowInfinityPoint: "boolean",
    fromBytes: "function",
    toBytes: "function"
  });
  const { endo: n, Fp: r, a: i } = e;
  if (n) {
    if (!r.eql(i, r.ZERO))
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e });
}
const { bytesToNumberBE: uw, hexToBytes: fw } = Ig, xn = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = xn;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = Cr(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const o = r > 127 ? Cr(i.length / 2 | 128) : "";
      return Cr(t) + o + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = xn;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], o = !!(i & 128);
      let a = 0;
      if (!o)
        a = i;
      else {
        const f = i & 127;
        if (!f)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (f > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const l = e.subarray(r, r + f);
        if (l.length !== f)
          throw new n("tlv.decode: length bytes not complete");
        if (l[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const p of l)
          a = a << 8 | p;
        if (r += f, a < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = e.subarray(r, r + a);
      if (c.length !== a)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: e.subarray(r + a) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = xn;
      if (t < kn)
        throw new e("integer: negative integers are not allowed");
      let n = Cr(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = xn;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return uw(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = xn, i = typeof t == "string" ? fw(t) : t;
    ji(i);
    const { v: o, l: a } = r.decode(48, i);
    if (a.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: f } = r.decode(2, o), { v: l, l: p } = r.decode(2, f);
    if (p.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(l) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = xn, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, kn = BigInt(0), ce = BigInt(1);
BigInt(2);
const Hf = BigInt(3);
BigInt(4);
function lw(t) {
  const e = cw(t), { Fp: n } = e, r = Nd(e.n, e.nBitLength), i = e.toBytes || ((x, v, k) => {
    const $ = v.toAffine();
    return br(Uint8Array.from([4]), n.toBytes($.x), n.toBytes($.y));
  }), o = e.fromBytes || ((x) => {
    const v = x.subarray(1), k = n.fromBytes(v.subarray(0, n.BYTES)), $ = n.fromBytes(v.subarray(n.BYTES, 2 * n.BYTES));
    return { x: k, y: $ };
  });
  function a(x) {
    const { a: v, b: k } = e, $ = n.sqr(x), L = n.mul($, x);
    return n.add(n.add(L, n.mul(x, v)), k);
  }
  if (!n.eql(n.sqr(e.Gy), a(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(x) {
    return Gr(x, ce, e.n);
  }
  function f(x) {
    const { allowedPrivateKeyLengths: v, nByteLength: k, wrapPrivateKey: $, n: L } = e;
    if (v && typeof x != "bigint") {
      if (mr(x) && (x = jr(x)), typeof x != "string" || !v.includes(x.length))
        throw new Error("invalid private key");
      x = x.padStart(k * 2, "0");
    }
    let V;
    try {
      V = typeof x == "bigint" ? x : un(Ae("private key", x, k));
    } catch {
      throw new Error("invalid private key, expected hex or " + k + " bytes, got " + typeof x);
    }
    return $ && (V = ge(V, L)), Gn("private key", V, ce, L), V;
  }
  function l(x) {
    if (!(x instanceof w))
      throw new Error("ProjectivePoint expected");
  }
  const p = sc((x, v) => {
    const { px: k, py: $, pz: L } = x;
    if (n.eql(L, n.ONE))
      return { x: k, y: $ };
    const V = x.is0();
    v == null && (v = V ? n.ONE : n.inv(L));
    const Y = n.mul(k, v), G = n.mul($, v), z = n.mul(L, v);
    if (V)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: Y, y: G };
  }), h = sc((x) => {
    if (x.is0()) {
      if (e.allowInfinityPoint && !n.is0(x.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: v, y: k } = x.toAffine();
    if (!n.isValid(v) || !n.isValid(k))
      throw new Error("bad point: x or y not FE");
    const $ = n.sqr(k), L = a(v);
    if (!n.eql($, L))
      throw new Error("bad point: equation left != right");
    if (!x.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class w {
    constructor(v, k, $) {
      if (this.px = v, this.py = k, this.pz = $, v == null || !n.isValid(v))
        throw new Error("x required");
      if (k == null || !n.isValid(k))
        throw new Error("y required");
      if ($ == null || !n.isValid($))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(v) {
      const { x: k, y: $ } = v || {};
      if (!v || !n.isValid(k) || !n.isValid($))
        throw new Error("invalid affine point");
      if (v instanceof w)
        throw new Error("projective point not allowed");
      const L = (V) => n.eql(V, n.ZERO);
      return L(k) && L($) ? w.ZERO : new w(k, $, n.ONE);
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
    static normalizeZ(v) {
      const k = n.invertBatch(v.map(($) => $.pz));
      return v.map(($, L) => $.toAffine(k[L])).map(w.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(v) {
      const k = w.fromAffine(o(Ae("pointHex", v)));
      return k.assertValidity(), k;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(v) {
      return w.BASE.multiply(f(v));
    }
    // Multiscalar Multiplication
    static msm(v, k) {
      return aw(w, r, v, k);
    }
    // "Private method", don't use it directly
    _setWindowSize(v) {
      T.setWindowSize(this, v);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      h(this);
    }
    hasEvenY() {
      const { y: v } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(v);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(v) {
      l(v);
      const { px: k, py: $, pz: L } = this, { px: V, py: Y, pz: G } = v, z = n.eql(n.mul(k, G), n.mul(V, L)), J = n.eql(n.mul($, G), n.mul(Y, L));
      return z && J;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new w(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: v, b: k } = e, $ = n.mul(k, Hf), { px: L, py: V, pz: Y } = this;
      let G = n.ZERO, z = n.ZERO, J = n.ZERO, P = n.mul(L, L), st = n.mul(V, V), ft = n.mul(Y, Y), at = n.mul(L, V);
      return at = n.add(at, at), J = n.mul(L, Y), J = n.add(J, J), G = n.mul(v, J), z = n.mul($, ft), z = n.add(G, z), G = n.sub(st, z), z = n.add(st, z), z = n.mul(G, z), G = n.mul(at, G), J = n.mul($, J), ft = n.mul(v, ft), at = n.sub(P, ft), at = n.mul(v, at), at = n.add(at, J), J = n.add(P, P), P = n.add(J, P), P = n.add(P, ft), P = n.mul(P, at), z = n.add(z, P), ft = n.mul(V, Y), ft = n.add(ft, ft), P = n.mul(ft, at), G = n.sub(G, P), J = n.mul(ft, st), J = n.add(J, J), J = n.add(J, J), new w(G, z, J);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(v) {
      l(v);
      const { px: k, py: $, pz: L } = this, { px: V, py: Y, pz: G } = v;
      let z = n.ZERO, J = n.ZERO, P = n.ZERO;
      const st = e.a, ft = n.mul(e.b, Hf);
      let at = n.mul(k, V), xt = n.mul($, Y), q = n.mul(L, G), H = n.add(k, $), D = n.add(V, Y);
      H = n.mul(H, D), D = n.add(at, xt), H = n.sub(H, D), D = n.add(k, L);
      let nt = n.add(V, G);
      return D = n.mul(D, nt), nt = n.add(at, q), D = n.sub(D, nt), nt = n.add($, L), z = n.add(Y, G), nt = n.mul(nt, z), z = n.add(xt, q), nt = n.sub(nt, z), P = n.mul(st, D), z = n.mul(ft, q), P = n.add(z, P), z = n.sub(xt, P), P = n.add(xt, P), J = n.mul(z, P), xt = n.add(at, at), xt = n.add(xt, at), q = n.mul(st, q), D = n.mul(ft, D), xt = n.add(xt, q), q = n.sub(at, q), q = n.mul(st, q), D = n.add(D, q), at = n.mul(xt, D), J = n.add(J, at), at = n.mul(nt, D), z = n.mul(H, z), z = n.sub(z, at), at = n.mul(H, xt), P = n.mul(nt, P), P = n.add(P, at), new w(z, J, P);
    }
    subtract(v) {
      return this.add(v.negate());
    }
    is0() {
      return this.equals(w.ZERO);
    }
    wNAF(v) {
      return T.wNAFCached(this, v, w.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(v) {
      const { endo: k, n: $ } = e;
      Gn("scalar", v, kn, $);
      const L = w.ZERO;
      if (v === kn)
        return L;
      if (this.is0() || v === ce)
        return this;
      if (!k || T.hasPrecomputes(this))
        return T.wNAFCachedUnsafe(this, v, w.normalizeZ);
      let { k1neg: V, k1: Y, k2neg: G, k2: z } = k.splitScalar(v), J = L, P = L, st = this;
      for (; Y > kn || z > kn; )
        Y & ce && (J = J.add(st)), z & ce && (P = P.add(st)), st = st.double(), Y >>= ce, z >>= ce;
      return V && (J = J.negate()), G && (P = P.negate()), P = new w(n.mul(P.px, k.beta), P.py, P.pz), J.add(P);
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
      const { endo: k, n: $ } = e;
      Gn("scalar", v, ce, $);
      let L, V;
      if (k) {
        const { k1neg: Y, k1: G, k2neg: z, k2: J } = k.splitScalar(v);
        let { p: P, f: st } = this.wNAF(G), { p: ft, f: at } = this.wNAF(J);
        P = T.constTimeNegate(Y, P), ft = T.constTimeNegate(z, ft), ft = new w(n.mul(ft.px, k.beta), ft.py, ft.pz), L = P.add(ft), V = st.add(at);
      } else {
        const { p: Y, f: G } = this.wNAF(v);
        L = Y, V = G;
      }
      return w.normalizeZ([L, V])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(v, k, $) {
      const L = w.BASE, V = (G, z) => z === kn || z === ce || !G.equals(L) ? G.multiplyUnsafe(z) : G.multiply(z), Y = V(this, k).add(V(v, $));
      return Y.is0() ? void 0 : Y;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(v) {
      return p(this, v);
    }
    isTorsionFree() {
      const { h: v, isTorsionFree: k } = e;
      if (v === ce)
        return !0;
      if (k)
        return k(w, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: v, clearCofactor: k } = e;
      return v === ce ? this : k ? k(w, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(v = !0) {
      return Vr("isCompressed", v), this.assertValidity(), i(w, this, v);
    }
    toHex(v = !0) {
      return Vr("isCompressed", v), jr(this.toRawBytes(v));
    }
  }
  w.BASE = new w(e.Gx, e.Gy, n.ONE), w.ZERO = new w(n.ZERO, n.ONE, n.ZERO);
  const b = e.nBitLength, T = sw(w, e.endo ? Math.ceil(b / 2) : b);
  return {
    CURVE: e,
    ProjectivePoint: w,
    normPrivateKeyToScalar: f,
    weierstrassEquation: a,
    isWithinCurveOrder: c
  };
}
function dw(t) {
  const e = Rd(t);
  return zi(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function hw(t) {
  const e = dw(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function a(q) {
    return ge(q, r);
  }
  function c(q) {
    return fc(q, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: l, weierstrassEquation: p, isWithinCurveOrder: h } = lw({
    ...e,
    toBytes(q, H, D) {
      const nt = H.toAffine(), ot = n.toBytes(nt.x), gt = br;
      return Vr("isCompressed", D), D ? gt(Uint8Array.from([H.hasEvenY() ? 2 : 3]), ot) : gt(Uint8Array.from([4]), ot, n.toBytes(nt.y));
    },
    fromBytes(q) {
      const H = q.length, D = q[0], nt = q.subarray(1);
      if (H === i && (D === 2 || D === 3)) {
        const ot = un(nt);
        if (!Gr(ot, ce, n.ORDER))
          throw new Error("Point is not on curve");
        const gt = p(ot);
        let St;
        try {
          St = n.sqrt(gt);
        } catch (Ct) {
          const _t = Ct instanceof Error ? ": " + Ct.message : "";
          throw new Error("Point is not on curve" + _t);
        }
        const It = (St & ce) === ce;
        return (D & 1) === 1 !== It && (St = n.neg(St)), { x: ot, y: St };
      } else if (H === o && D === 4) {
        const ot = n.fromBytes(nt.subarray(0, n.BYTES)), gt = n.fromBytes(nt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: ot, y: gt };
      } else {
        const ot = i, gt = o;
        throw new Error("invalid Point, expected length of " + ot + ", or uncompressed " + gt + ", got " + H);
      }
    }
  }), w = (q) => jr(Zn(q, e.nByteLength));
  function b(q) {
    const H = r >> ce;
    return q > H;
  }
  function T(q) {
    return b(q) ? a(-q) : q;
  }
  const x = (q, H, D) => un(q.slice(H, D));
  class v {
    constructor(H, D, nt) {
      this.r = H, this.s = D, this.recovery = nt, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(H) {
      const D = e.nByteLength;
      return H = Ae("compactSignature", H, D * 2), new v(x(H, 0, D), x(H, D, 2 * D));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(H) {
      const { r: D, s: nt } = xn.toSig(Ae("DER", H));
      return new v(D, nt);
    }
    assertValidity() {
      Gn("r", this.r, ce, r), Gn("s", this.s, ce, r);
    }
    addRecoveryBit(H) {
      return new v(this.r, this.s, H);
    }
    recoverPublicKey(H) {
      const { r: D, s: nt, recovery: ot } = this, gt = G(Ae("msgHash", H));
      if (ot == null || ![0, 1, 2, 3].includes(ot))
        throw new Error("recovery id invalid");
      const St = ot === 2 || ot === 3 ? D + e.n : D;
      if (St >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const It = (ot & 1) === 0 ? "02" : "03", Vt = f.fromHex(It + w(St)), Ct = c(St), _t = a(-gt * Ct), re = a(nt * Ct), Kt = f.BASE.multiplyAndAddUnsafe(Vt, _t, re);
      if (!Kt)
        throw new Error("point at infinify");
      return Kt.assertValidity(), Kt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return b(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new v(this.r, a(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return zr(this.toDERHex());
    }
    toDERHex() {
      return xn.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return zr(this.toCompactHex());
    }
    toCompactHex() {
      return w(this.r) + w(this.s);
    }
  }
  const k = {
    isValidPrivateKey(q) {
      try {
        return l(q), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: l,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const q = Ud(e.n);
      return rw(e.randomBytes(q), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(q = 8, H = f.BASE) {
      return H._setWindowSize(q), H.multiply(BigInt(3)), H;
    }
  };
  function $(q, H = !0) {
    return f.fromPrivateKey(q).toRawBytes(H);
  }
  function L(q) {
    const H = mr(q), D = typeof q == "string", nt = (H || D) && q.length;
    return H ? nt === i || nt === o : D ? nt === 2 * i || nt === 2 * o : q instanceof f;
  }
  function V(q, H, D = !0) {
    if (L(q))
      throw new Error("first arg must be private key");
    if (!L(H))
      throw new Error("second arg must be public key");
    return f.fromHex(H).multiply(l(q)).toRawBytes(D);
  }
  const Y = e.bits2int || function(q) {
    if (q.length > 8192)
      throw new Error("input is too large");
    const H = un(q), D = q.length * 8 - e.nBitLength;
    return D > 0 ? H >> BigInt(D) : H;
  }, G = e.bits2int_modN || function(q) {
    return a(Y(q));
  }, z = nu(e.nBitLength);
  function J(q) {
    return Gn("num < 2^" + e.nBitLength, q, kn, z), Zn(q, e.nByteLength);
  }
  function P(q, H, D = st) {
    if (["recovered", "canonical"].some((he) => he in D))
      throw new Error("sign() legacy options not supported");
    const { hash: nt, randomBytes: ot } = e;
    let { lowS: gt, prehash: St, extraEntropy: It } = D;
    gt == null && (gt = !0), q = Ae("msgHash", q), qf(D), St && (q = Ae("prehashed msgHash", nt(q)));
    const Vt = G(q), Ct = l(H), _t = [J(Ct), J(Vt)];
    if (It != null && It !== !1) {
      const he = It === !0 ? ot(n.BYTES) : It;
      _t.push(Ae("extraEntropy", he));
    }
    const re = br(..._t), Kt = Vt;
    function Ge(he) {
      const ct = Y(he);
      if (!h(ct))
        return;
      const en = c(ct), me = f.BASE.multiply(ct).toAffine(), mt = a(me.x);
      if (mt === kn)
        return;
      const pe = a(en * a(Kt + mt * Ct));
      if (pe === kn)
        return;
      let Ke = (me.x === mt ? 0 : 2) | Number(me.y & ce), jt = pe;
      return gt && b(pe) && (jt = T(pe), Ke ^= 1), new v(mt, jt, Ke);
    }
    return { seed: re, k2sig: Ge };
  }
  const st = { lowS: e.lowS, prehash: !1 }, ft = { lowS: e.lowS, prehash: !1 };
  function at(q, H, D = st) {
    const { seed: nt, k2sig: ot } = P(q, H, D), gt = e;
    return wd(gt.hash.outputLen, gt.nByteLength, gt.hmac)(nt, ot);
  }
  f.BASE._setWindowSize(8);
  function xt(q, H, D, nt = ft) {
    var Ke;
    const ot = q;
    H = Ae("msgHash", H), D = Ae("publicKey", D);
    const { lowS: gt, prehash: St, format: It } = nt;
    if (qf(nt), "strict" in nt)
      throw new Error("options.strict was renamed to lowS");
    if (It !== void 0 && It !== "compact" && It !== "der")
      throw new Error("format must be compact or der");
    const Vt = typeof ot == "string" || mr(ot), Ct = !Vt && !It && typeof ot == "object" && ot !== null && typeof ot.r == "bigint" && typeof ot.s == "bigint";
    if (!Vt && !Ct)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let _t, re;
    try {
      if (Ct && (_t = new v(ot.r, ot.s)), Vt) {
        try {
          It !== "compact" && (_t = v.fromDER(ot));
        } catch (jt) {
          if (!(jt instanceof xn.Err))
            throw jt;
        }
        !_t && It !== "der" && (_t = v.fromCompact(ot));
      }
      re = f.fromHex(D);
    } catch {
      return !1;
    }
    if (!_t || gt && _t.hasHighS())
      return !1;
    St && (H = e.hash(H));
    const { r: Kt, s: Ge } = _t, he = G(H), ct = c(Ge), en = a(he * ct), me = a(Kt * ct), mt = (Ke = f.BASE.multiplyAndAddUnsafe(re, en, me)) == null ? void 0 : Ke.toAffine();
    return mt ? a(mt.x) === Kt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: $,
    getSharedSecret: V,
    sign: at,
    verify: xt,
    ProjectivePoint: f,
    Signature: v,
    utils: k
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function pw(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Bd(t, e, Fg(...n)),
    randomBytes: Td
  };
}
function gw(t, e) {
  const n = (r) => hw({ ...t, ...pw(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Gi = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), es = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Ni = BigInt(1), ns = BigInt(2), Vf = (t, e) => (t + e / ns) / e;
function Ld(t) {
  const e = Gi, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), a = BigInt(23), c = BigInt(44), f = BigInt(88), l = t * t * t % e, p = l * l * t % e, h = He(p, n, e) * p % e, w = He(h, n, e) * p % e, b = He(w, ns, e) * l % e, T = He(b, i, e) * b % e, x = He(T, o, e) * T % e, v = He(x, c, e) * x % e, k = He(v, f, e) * v % e, $ = He(k, c, e) * x % e, L = He($, n, e) * p % e, V = He(L, a, e) * T % e, Y = He(V, r, e) * l % e, G = He(Y, ns, e);
  if (!lc.eql(lc.sqr(G), t))
    throw new Error("Cannot find square root");
  return G;
}
const lc = Nd(Gi, void 0, void 0, { sqrt: Ld }), Ci = gw({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: lc,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: es,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  // Cofactor
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  /**
   * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
   * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
   * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
   * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
   */
  endo: {
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = es, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Ni * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, a = BigInt("0x100000000000000000000000000000000"), c = Vf(o * t, e), f = Vf(-r * t, e);
      let l = ge(t - c * n - f * i, e), p = ge(-c * r - f * o, e);
      const h = l > a, w = p > a;
      if (h && (l = e - l), w && (p = e - p), l > a || p > a)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: h, k1: l, k2neg: w, k2: p };
    }
  }
}, cc), Pd = BigInt(0), jf = {};
function rs(t, ...e) {
  let n = jf[t];
  if (n === void 0) {
    const r = cc(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = br(r, r), jf[t] = n;
  }
  return cc(br(n, ...e));
}
const au = (t) => t.toRawBytes(!0).slice(1), dc = (t) => Zn(t, 32), Oa = (t) => ge(t, Gi), Ui = (t) => ge(t, es), cu = Ci.ProjectivePoint, ww = (t, e, n) => cu.BASE.multiplyAndAddUnsafe(t, e, n);
function hc(t) {
  let e = Ci.utils.normPrivateKeyToScalar(t), n = cu.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Ui(-e), bytes: au(n) };
}
function Kd(t) {
  Gn("x", t, Ni, Gi);
  const e = Oa(t * t), n = Oa(e * t + BigInt(7));
  let r = Ld(n);
  r % ns !== Pd && (r = Oa(-r));
  const i = new cu(t, r, Ni);
  return i.assertValidity(), i;
}
const Rr = un;
function Dd(...t) {
  return Ui(Rr(rs("BIP0340/challenge", ...t)));
}
function yw(t) {
  return hc(t).bytes;
}
function mw(t, e, n = Td(32)) {
  const r = Ae("message", t), { bytes: i, scalar: o } = hc(e), a = Ae("auxRand", n, 32), c = dc(o ^ Rr(rs("BIP0340/aux", a))), f = rs("BIP0340/nonce", c, i, r), l = Ui(Rr(f));
  if (l === Pd)
    throw new Error("sign failed: k is zero");
  const { bytes: p, scalar: h } = hc(l), w = Dd(p, i, r), b = new Uint8Array(64);
  if (b.set(p, 0), b.set(dc(Ui(h + w * o)), 32), !Md(b, r, i))
    throw new Error("sign: Invalid signature produced");
  return b;
}
function Md(t, e, n) {
  const r = Ae("signature", t, 64), i = Ae("message", e), o = Ae("publicKey", n, 32);
  try {
    const a = Kd(Rr(o)), c = Rr(r.subarray(0, 32));
    if (!Gr(c, Ni, Gi))
      return !1;
    const f = Rr(r.subarray(32, 64));
    if (!Gr(f, Ni, es))
      return !1;
    const l = Dd(dc(c), au(a), i), p = ww(a, f, Ui(-l));
    return !(!p || !p.hasEvenY() || p.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const Fd = {
  getPublicKey: yw,
  sign: mw,
  verify: Md,
  utils: {
    randomPrivateKey: Ci.utils.randomPrivateKey,
    lift_x: Kd,
    pointToBytes: au,
    numberToBytesBE: Zn,
    bytesToNumberBE: un,
    taggedHash: rs,
    mod: ge
  }
};
function uu(t, e, n = {}) {
  t = ic(t);
  const { aggPublicKey: r } = oc(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const i = Fd.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: o } = oc(t, [i], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: o.toRawBytes(!0)
  };
}
class _o extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class fu {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new _o("Invalid s length");
    if (n.length !== 33)
      throw new _o("Invalid R length");
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
      throw new _o("Invalid partial signature length");
    if (un(e) >= iu.n)
      throw new _o("s value overflows curve order");
    const r = new Uint8Array(33);
    return new fu(e, r);
  }
}
function bw(t, e, n, r, i, o) {
  let a;
  if ((o == null ? void 0 : o.taprootTweak) !== void 0) {
    const { preTweakedKey: l } = uu(ic(r));
    a = Fd.utils.taggedHash("TapTweak", l.subarray(1), o.taprootTweak);
  }
  const f = new wg(n, ic(r), i, a ? [a] : void 0, a ? [!0] : void 0).sign(t, e);
  return fu.decode(f);
}
var vw = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ew(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Ra, zf;
function xw() {
  if (zf) return Ra;
  zf = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, i = 1 << 22, o = r, a = 1 << n, c = r << n;
  function f(p) {
    return p & e ? {} : p & i ? {
      seconds: (p & r) << n
    } : {
      blocks: p & r
    };
  }
  function l({ blocks: p, seconds: h }) {
    if (p !== void 0 && h !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (p === void 0 && h === void 0) return t;
    if (h !== void 0) {
      if (!Number.isFinite(h)) throw new TypeError("Expected Number seconds");
      if (h > c) throw new TypeError("Expected Number seconds <= " + c);
      if (h % a !== 0) throw new TypeError("Expected Number seconds as a multiple of " + a);
      return i | h >> n;
    }
    if (!Number.isFinite(p)) throw new TypeError("Expected Number blocks");
    if (p > r) throw new TypeError("Expected Number blocks <= " + o);
    return p;
  }
  return Ra = { decode: f, encode: l }, Ra;
}
var Gf = xw(), Xt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(Xt || (Xt = {}));
function Yr(t = 6, e = !1) {
  return Pe({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, o = BigInt(r), a = [];
      for (let c = i ? -o : o; c; c >>= 8n)
        a.push(Number(c & 0xffn));
      a[a.length - 1] >= 128 ? a.push(i ? 128 : 0) : i && (a[a.length - 1] |= 128), n.bytes(new Uint8Array(a));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > t)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${t}`);
      if (r === 0)
        return 0n;
      if (e) {
        const a = n.bytes(r, !0);
        if ((a[a.length - 1] & 127) === 0 && (r <= 1 || (a[a.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, o = 0n;
      for (let a = 0; a < r; ++a)
        i = n.byte(), o |= BigInt(i) << 8n * BigInt(a);
      return i >= 128 && (o &= 2n ** BigInt(r * 8) - 1n >> 1n, o = -o), o;
    }
  });
}
function Sw(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Pt(t))
    try {
      const r = Yr(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const At = Pe({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (Xt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(Xt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(Xt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Yr().encode(BigInt(n))), !Pt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Xt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(Xt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(Xt.PUSHDATA2), t.bytes(yf.encode(r))) : (t.byte(Xt.PUSHDATA4), t.bytes(Ut.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (Xt.OP_0 < n && n <= Xt.PUSHDATA4) {
        let r;
        if (n < Xt.PUSHDATA1)
          r = n;
        else if (n === Xt.PUSHDATA1)
          r = zn.decodeStream(t);
        else if (n === Xt.PUSHDATA2)
          r = yf.decodeStream(t);
        else if (n === Xt.PUSHDATA4)
          r = Ut.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (Xt.OP_1 <= n && n <= Xt.OP_16)
        e.push(n - (Xt.OP_1 - 1));
      else {
        const r = Xt[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), Wf = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, _s = Pe({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, i, o] of Object.values(Wf))
      if (!(i > e || e > o)) {
        t.byte(n);
        for (let a = 0; a < r; a++)
          t.byte(Number(e >> 8n * BigInt(a) & 0xffn));
        return;
      }
    throw t.err(`VarInt too big: ${e}`);
  },
  decodeStream: (t) => {
    const e = t.byte();
    if (e <= 252)
      return BigInt(e);
    const [n, r, i] = Wf[e];
    let o = 0n;
    for (let a = 0; a < r; a++)
      o |= BigInt(t.byte()) << 8n * BigInt(a);
    if (o < i)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return o;
  }
}), Qe = Wn(_s, vs.numberBigint), Ze = Ft(_s), lu = Oe(Qe, Ze), is = (t) => Oe(_s, t), qd = de({
  txid: Ft(32, !0),
  // hash(prev_tx),
  index: Ut,
  // output number of previous tx
  finalScriptSig: Ze,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Ut
  // ?
}), wr = de({ amount: Oo, script: Ze }), Aw = de({
  version: Nr,
  segwitFlag: ig(new Uint8Array([0, 1])),
  inputs: is(qd),
  outputs: is(wr),
  witnesses: og("segwitFlag", Oe("inputs/length", lu)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Ut
});
function kw(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const Lr = Le(Aw, kw), mi = de({
  version: Nr,
  inputs: is(qd),
  outputs: is(wr),
  lockTime: Ut
});
function Po(t) {
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
function Yf(t, e, n, r = !1, i = !1) {
  let { nonWitnessUtxo: o, txid: a } = t;
  typeof o == "string" && (o = Ot.decode(o)), Pt(o) && (o = Lr.decode(o)), !("nonWitnessUtxo" in t) && o === void 0 && (o = e == null ? void 0 : e.nonWitnessUtxo), typeof a == "string" && (a = Ot.decode(a)), a === void 0 && (a = e == null ? void 0 : e.txid);
  let c = { ...e, ...t, nonWitnessUtxo: o, txid: a };
  !("nonWitnessUtxo" in t) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = du), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = wc(Cs, c, e, n, i), gu.encode(c);
  let f;
  return c.nonWitnessUtxo && c.index !== void 0 ? f = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (f = c.witnessUtxo), f && !r && zd(f && f.script, c.redeemScript, c.witnessScript), c;
}
function Zf(t, e = !1) {
  let n = "legacy", r = Lt.ALL;
  const i = Po(t), o = we.decode(i.script);
  let a = o.type, c = o;
  const f = [o];
  if (o.type === "tr")
    return r = Lt.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: o,
      lastScript: i.script,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
  {
    if ((o.type === "wpkh" || o.type === "wsh") && (n = "segwit"), o.type === "sh") {
      if (!t.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let w = we.decode(t.redeemScript);
      (w.type === "wpkh" || w.type === "wsh") && (n = "segwit"), f.push(w), c = w, a += `-${w.type}`;
    }
    if (c.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let w = we.decode(t.witnessScript);
      w.type === "wsh" && (n = "segwit"), f.push(w), c = w, a += `-${w.type}`;
    }
    const l = f[f.length - 1];
    if (l.type === "sh" || l.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const p = we.encode(l), h = {
      type: a,
      txType: n,
      last: l,
      lastScript: p,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return h;
  }
}
const Tw = (t) => Math.ceil(t / 4), No = new Uint8Array(32), Iw = {
  amount: 0xffffffffffffffffn,
  script: qt
}, Bw = 8, _w = 2, ur = 0, du = 4294967295;
vs.decimal(Bw);
const Ei = (t, e) => t === void 0 ? e : t;
function os(t) {
  if (Array.isArray(t))
    return t.map((e) => os(e));
  if (Pt(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, os(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Lt;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Lt || (Lt = {}));
var $i;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})($i || ($i = {}));
function Nw(t, e, n, r = qt) {
  return te(n, e) && (t = ug(t, r), e = zc(t)), { privKey: t, pubKey: e };
}
function fr(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function pi(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: Ei(t.sequence, du),
    finalScriptSig: Ei(t.finalScriptSig, qt)
  };
}
function La(t) {
  for (const e in t) {
    const n = e;
    Pw.includes(n) || delete t[n];
  }
}
const Pa = de({ txid: Ft(32, !0), index: Ut });
function Cw(t) {
  if (typeof t != "number" || typeof $i[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Xf(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Lt.ANYONECANPAY),
    isNone: e === Lt.NONE,
    isSingle: e === Lt.SINGLE
  };
}
function Uw(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: Ei(t.version, _w),
    lockTime: Ei(t.lockTime, 0),
    PSBTVersion: Ei(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Ut.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${e.PSBTVersion}`);
  for (const n of [
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
class Zt {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = Uw(e);
    n.lockTime !== ur && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = Lr.decode(e), i = new Zt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const o of r.outputs)
      i.addOutput(o);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let o = 0; o < r.witnesses.length; o++)
        i.inputs[o].finalScriptWitness = r.witnesses[o];
    return i;
  }
  // PSBT
  static fromPSBT(e, n = {}) {
    let r;
    try {
      r = nl.decode(e);
    } catch (h) {
      try {
        r = rl.decode(e);
      } catch {
        throw h;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const o = r.global.unsignedTx, a = i === 0 ? o == null ? void 0 : o.version : r.global.txVersion, c = i === 0 ? o == null ? void 0 : o.lockTime : r.global.fallbackLocktime, f = new Zt({ ...n, version: a, lockTime: c, PSBTVersion: i }), l = i === 0 ? o == null ? void 0 : o.inputs.length : r.global.inputCount;
    f.inputs = r.inputs.slice(0, l).map((h, w) => {
      var b;
      return {
        finalScriptSig: qt,
        ...(b = r.global.unsignedTx) == null ? void 0 : b.inputs[w],
        ...h
      };
    });
    const p = i === 0 ? o == null ? void 0 : o.outputs.length : r.global.outputCount;
    return f.outputs = r.outputs.slice(0, p).map((h, w) => {
      var b;
      return {
        ...h,
        ...(b = r.global.unsignedTx) == null ? void 0 : b.outputs[w]
      };
    }), f.global = { ...r.global, txVersion: a }, c !== ur && (f.global.fallbackLocktime = c), f;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((o) => el(e, Cs, o));
    for (const o of n)
      o.partialSig && !o.partialSig.length && delete o.partialSig, o.finalScriptSig && !o.finalScriptSig.length && delete o.finalScriptSig, o.finalScriptWitness && !o.finalScriptWitness.length && delete o.finalScriptWitness;
    const r = this.outputs.map((o) => el(e, as, o)), i = { ...this.global };
    return e === 0 ? (i.unsignedTx = mi.decode(mi.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(pi).map((o) => ({
        ...o,
        finalScriptSig: qt
      })),
      outputs: this.outputs.map(fr)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = e, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === ur && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? nl : rl).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = ur, n = 0, r = ur, i = 0;
    for (const o of this.inputs)
      o.requiredHeightLocktime && (e = Math.max(e, o.requiredHeightLocktime), n++), o.requiredTimeLocktime && (r = Math.max(r, o.requiredTimeLocktime), i++);
    return n && n >= i ? e : r !== ur ? r : this.global.fallbackLocktime || ur;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? Lt.DEFAULT : n, i = r === Lt.DEFAULT ? Lt.ALL : r & 3;
    return { sigInputs: r & Lt.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], i = [];
    for (let o = 0; o < this.inputs.length; o++) {
      if (this.inputStatus(o) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: f } = this.inputSighash(o);
      if (c === Lt.ANYONECANPAY ? r.push(o) : e = !1, f === Lt.ALL)
        n = !1;
      else if (f === Lt.SINGLE)
        i.push(o);
      else if (f !== Lt.NONE) throw new Error(`Wrong signature hash output type: ${f}`);
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
    const n = this.outputs.map(fr);
    e += 4 * Qe.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Ze.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Qe.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Ze.encode(r.finalScriptSig || qt).length, this.hasWitnesses && r.finalScriptWitness && (e += lu.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return Tw(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return Lr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(pi).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || qt
      })),
      outputs: this.outputs.map(fr),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return Ot.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return Ot.encode(Ve(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return Ot.encode(Ve(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), os(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Yf(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let i;
    if (!r) {
      const o = this.signStatus();
      (!o.addInput || o.inputs.includes(e)) && (i = Kw);
    }
    this.inputs[e] = Yf(n, this.inputs[e], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), os(this.outputs[e]);
  }
  getOutputAddress(e, n = qr) {
    const r = this.getOutput(e);
    if (r.script)
      return Oi(n).encode(we.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: i, script: o } = e;
    if (i === void 0 && (i = n == null ? void 0 : n.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof o == "string" && (o = Ot.decode(o)), o === void 0 && (o = n == null ? void 0 : n.script);
    let a = { ...n, ...e, amount: i, script: o };
    if (a.amount === void 0 && delete a.amount, a = wc(as, a, n, r, this.opts.allowUnknown), wu.encode(a), a.script && !this.opts.allowUnknownOutputs && we.decode(a.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || zd(a.script, a.redeemScript, a.witnessScript), a;
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
      const o = this.signStatus();
      (!o.addOutput || o.outputs.includes(e)) && (i = Dw);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], i);
  }
  addOutputAddress(e, n, r = qr) {
    return this.addOutput({ script: we.encode(Oi(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const i = Po(r);
      if (!i)
        throw new Error("Empty input amount");
      e += i.amount;
    }
    const n = this.outputs.map(fr);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: i, isNone: o, isSingle: a } = Xf(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (a && e >= this.outputs.length || e >= this.inputs.length)
      return td.encode(1n);
    n = At.encode(At.decode(n).filter((p) => p !== "CODESEPARATOR"));
    let c = this.inputs.map(pi).map((p, h) => ({
      ...p,
      finalScriptSig: h === e ? n : qt
    }));
    i ? c = [c[e]] : (o || a) && (c = c.map((p, h) => ({
      ...p,
      sequence: h === e ? p.sequence : 0
    })));
    let f = this.outputs.map(fr);
    o ? f = [] : a && (f = f.slice(0, e).fill(Iw).concat([f[e]]));
    const l = Lr.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: f
    });
    return Ve(l, Nr.encode(r));
  }
  preimageWitnessV0(e, n, r, i) {
    const { isAny: o, isNone: a, isSingle: c } = Xf(r);
    let f = No, l = No, p = No;
    const h = this.inputs.map(pi), w = this.outputs.map(fr);
    o || (f = Ve(...h.map(Pa.encode))), !o && !c && !a && (l = Ve(...h.map((T) => Ut.encode(T.sequence)))), !c && !a ? p = Ve(...w.map(wr.encode)) : c && e < w.length && (p = Ve(wr.encode(w[e])));
    const b = h[e];
    return Ve(Nr.encode(this.version), f, l, Ft(32, !0).encode(b.txid), Ut.encode(b.index), Ze.encode(n), Oo.encode(i), Ut.encode(b.sequence), p, Ut.encode(this.lockTime), Ut.encode(r));
  }
  preimageWitnessV1(e, n, r, i, o = -1, a, c = 192, f) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const l = [
      zn.encode(0),
      zn.encode(r),
      // U8 sigHash
      Nr.encode(this.version),
      Ut.encode(this.lockTime)
    ], p = r === Lt.DEFAULT ? Lt.ALL : r & 3, h = r & Lt.ANYONECANPAY, w = this.inputs.map(pi), b = this.outputs.map(fr);
    h !== Lt.ANYONECANPAY && l.push(...[
      w.map(Pa.encode),
      i.map(Oo.encode),
      n.map(Ze.encode),
      w.map((x) => Ut.encode(x.sequence))
    ].map((x) => Ce(qn(...x)))), p === Lt.ALL && l.push(Ce(qn(...b.map(wr.encode))));
    const T = (f ? 1 : 0) | (a ? 2 : 0);
    if (l.push(new Uint8Array([T])), h === Lt.ANYONECANPAY) {
      const x = w[e];
      l.push(Pa.encode(x), Oo.encode(i[e]), Ze.encode(n[e]), Ut.encode(x.sequence));
    } else
      l.push(Ut.encode(e));
    return T & 1 && l.push(Ce(Ze.encode(f || qt))), p === Lt.SINGLE && l.push(e < b.length ? Ce(wr.encode(b[e])) : No), a && l.push(xi(a, c), zn.encode(0), Nr.encode(o)), Gc("TapSighash", ...l);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, i) {
    this.checkInputIdx(n);
    const o = this.inputs[n], a = Zf(o, this.opts.allowLegacyWitnessUtxo);
    if (!Pt(e)) {
      if (!o.bip32Derivation || !o.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const p = o.bip32Derivation.filter((w) => w[1].fingerprint == e.fingerprint).map(([w, { path: b }]) => {
        let T = e;
        for (const x of b)
          T = T.deriveChild(x);
        if (!te(T.publicKey, w))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!T.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return T;
      });
      if (!p.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let h = !1;
      for (const w of p)
        this.signIdx(w.privateKey, n) && (h = !0);
      return h;
    }
    r ? r.forEach(Cw) : r = [a.defaultSighash];
    const c = a.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: f } = this.inputSighash(n);
    if (f === Lt.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const l = Po(o);
    if (a.txType === "taproot") {
      const p = this.inputs.map(Po), h = p.map((v) => v.script), w = p.map((v) => v.amount);
      let b = !1, T = zc(e), x = o.tapMerkleRoot || qt;
      if (o.tapInternalKey) {
        const { pubKey: v, privKey: k } = Nw(e, T, o.tapInternalKey, x), [$, L] = od(o.tapInternalKey, x);
        if (te($, v)) {
          const V = this.preimageWitnessV1(n, h, c, w), Y = qn(bf(V, k, i), c !== Lt.DEFAULT ? new Uint8Array([c]) : qt);
          this.updateInput(n, { tapKeySig: Y }, !0), b = !0;
        }
      }
      if (o.tapLeafScript) {
        o.tapScriptSig = o.tapScriptSig || [];
        for (const [v, k] of o.tapLeafScript) {
          const $ = k.subarray(0, -1), L = At.decode($), V = k[k.length - 1], Y = xi($, V);
          if (L.findIndex((P) => Pt(P) && te(P, T)) === -1)
            continue;
          const z = this.preimageWitnessV1(n, h, c, w, void 0, $, V), J = qn(bf(z, e, i), c !== Lt.DEFAULT ? new Uint8Array([c]) : qt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: T, leafHash: Y }, J]] }, !0), b = !0;
        }
      }
      if (!b)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const p = ag(e);
      let h = !1;
      const w = nd(p);
      for (const x of At.decode(a.lastScript))
        Pt(x) && (te(x, p) || te(x, w)) && (h = !0);
      if (!h)
        throw new Error(`Input script doesn't have pubKey: ${a.lastScript}`);
      let b;
      if (a.txType === "legacy")
        b = this.preimageLegacy(n, a.lastScript, c);
      else if (a.txType === "segwit") {
        let x = a.lastScript;
        a.last.type === "wpkh" && (x = we.encode({ type: "pkh", hash: a.last.hash })), b = this.preimageWitnessV0(n, x, c, l.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${a.txType}`);
      const T = cg(b, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[p, qn(T, new Uint8Array([c]))]]
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
    for (let o = 0; o < this.inputs.length; o++)
      try {
        this.signIdx(e, o, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(e) {
    if (this.checkInputIdx(e), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[e], r = Zf(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const f = n.tapLeafScript.sort((l, p) => Vn.encode(l[0]).length - Vn.encode(p[0]).length);
        for (const [l, p] of f) {
          const h = p.slice(0, -1), w = p[p.length - 1], b = we.decode(h), T = xi(h, w), x = n.tapScriptSig.filter((k) => te(k[0].leafHash, T));
          let v = [];
          if (b.type === "tr_ms") {
            const k = b.m, $ = b.pubkeys;
            let L = 0;
            for (const V of $) {
              const Y = x.findIndex((G) => te(G[0].pubKey, V));
              if (L === k || Y === -1) {
                v.push(qt);
                continue;
              }
              v.push(x[Y][1]), L++;
            }
            if (L !== k)
              continue;
          } else if (b.type === "tr_ns") {
            for (const k of b.pubkeys) {
              const $ = x.findIndex((L) => te(L[0].pubKey, k));
              $ !== -1 && v.push(x[$][1]);
            }
            if (v.length !== b.pubkeys.length)
              continue;
          } else if (b.type === "unknown" && this.opts.allowUnknownInputs) {
            const k = At.decode(h);
            if (v = x.map(([{ pubKey: $ }, L]) => {
              const V = k.findIndex((Y) => Pt(Y) && te(Y, $));
              if (V === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: L, pos: V };
            }).sort(($, L) => $.pos - L.pos).map(($) => $.signature), !v.length)
              continue;
          } else {
            const k = this.opts.customScripts;
            if (k)
              for (const $ of k) {
                if (!$.finalizeTaproot)
                  continue;
                const L = At.decode(h), V = $.encode(L);
                if (V === void 0)
                  continue;
                const Y = $.finalizeTaproot(h, V, x);
                if (Y) {
                  n.finalScriptWitness = Y.concat(Vn.encode(l)), n.finalScriptSig = qt, La(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = v.reverse().concat([h, Vn.encode(l)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = qt, La(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = qt, o = [];
    if (r.last.type === "ms") {
      const f = r.last.m, l = r.last.pubkeys;
      let p = [];
      for (const h of l) {
        const w = n.partialSig.find((b) => te(h, b[0]));
        w && p.push(w[1]);
      }
      if (p = p.slice(0, f), p.length !== f)
        throw new Error(`Multisig: wrong signatures count, m=${f} n=${l.length} signatures=${p.length}`);
      i = At.encode([0, ...p]);
    } else if (r.last.type === "pk")
      i = At.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = At.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = qt, o = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let a, c;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (o = At.decode(i).map((f) => {
      if (f === 0)
        return qt;
      if (Pt(f))
        return f;
      throw new Error(`Wrong witness op=${f}`);
    })), o = o.concat(r.lastScript)), r.txType === "segwit" && (c = o), r.type.startsWith("sh-wsh-") ? a = At.encode([At.encode([0, Ce(r.lastScript)])]) : r.type.startsWith("sh-") ? a = At.encode([...At.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (a = i), !a && !c)
      throw new Error("Unknown error finalizing input");
    a && (n.finalScriptSig = a), c && (n.finalScriptWitness = c), La(n);
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
    const n = this.global.unsignedTx ? mi.encode(this.global.unsignedTx) : qt, r = e.global.unsignedTx ? mi.encode(e.global.unsignedTx) : qt;
    if (!te(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = wc(hu, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, e.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, e.outputs[i], !0);
    return this;
  }
  clone() {
    return Zt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
const pc = Le(Ft(null), (t) => Fr(t, _e.ecdsa)), ss = Le(Ft(32), (t) => Fr(t, _e.schnorr)), Qf = Le(Ft(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), Ns = de({
  fingerprint: eg,
  path: Oe(null, Ut)
}), Hd = de({
  hashes: Oe(Qe, Ft(32)),
  der: Ns
}), $w = Ft(78), Ow = de({ pubKey: ss, leafHash: Ft(32) }), Rw = de({
  version: zn,
  // With parity :(
  internalKey: Ft(32),
  merklePath: Oe(null, Ft(32))
}), Vn = Le(Rw, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), Lw = Oe(null, de({
  depth: zn,
  version: zn,
  script: Ze
})), Jt = Ft(null), Jf = Ft(20), gi = Ft(32), hu = {
  unsignedTx: [0, !1, mi, [0], [0], !1],
  xpub: [1, $w, Ns, [], [0, 2], !1],
  txVersion: [2, !1, Ut, [2], [2], !1],
  fallbackLocktime: [3, !1, Ut, [], [2], !1],
  inputCount: [4, !1, Qe, [2], [2], !1],
  outputCount: [5, !1, Qe, [2], [2], !1],
  txModifiable: [6, !1, zn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Ut, [], [0, 2], !1],
  proprietary: [252, Jt, Jt, [], [0, 2], !1]
}, Cs = {
  nonWitnessUtxo: [0, !1, Lr, [], [0, 2], !1],
  witnessUtxo: [1, !1, wr, [], [0, 2], !1],
  partialSig: [2, pc, Jt, [], [0, 2], !1],
  sighashType: [3, !1, Ut, [], [0, 2], !1],
  redeemScript: [4, !1, Jt, [], [0, 2], !1],
  witnessScript: [5, !1, Jt, [], [0, 2], !1],
  bip32Derivation: [6, pc, Ns, [], [0, 2], !1],
  finalScriptSig: [7, !1, Jt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, lu, [], [0, 2], !1],
  porCommitment: [9, !1, Jt, [], [0, 2], !1],
  ripemd160: [10, Jf, Jt, [], [0, 2], !1],
  sha256: [11, gi, Jt, [], [0, 2], !1],
  hash160: [12, Jf, Jt, [], [0, 2], !1],
  hash256: [13, gi, Jt, [], [0, 2], !1],
  txid: [14, !1, gi, [2], [2], !0],
  index: [15, !1, Ut, [2], [2], !0],
  sequence: [16, !1, Ut, [], [2], !0],
  requiredTimeLocktime: [17, !1, Ut, [], [2], !1],
  requiredHeightLocktime: [18, !1, Ut, [], [2], !1],
  tapKeySig: [19, !1, Qf, [], [0, 2], !1],
  tapScriptSig: [20, Ow, Qf, [], [0, 2], !1],
  tapLeafScript: [21, Vn, Jt, [], [0, 2], !1],
  tapBip32Derivation: [22, gi, Hd, [], [0, 2], !1],
  tapInternalKey: [23, !1, ss, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, gi, [], [0, 2], !1],
  proprietary: [252, Jt, Jt, [], [0, 2], !1]
}, Pw = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Kw = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], as = {
  redeemScript: [0, !1, Jt, [], [0, 2], !1],
  witnessScript: [1, !1, Jt, [], [0, 2], !1],
  bip32Derivation: [2, pc, Ns, [], [0, 2], !1],
  amount: [3, !1, Jp, [2], [2], !0],
  script: [4, !1, Jt, [2], [2], !0],
  tapInternalKey: [5, !1, ss, [], [0, 2], !1],
  tapTree: [6, !1, Lw, [], [0, 2], !1],
  tapBip32Derivation: [7, ss, Hd, [], [0, 2], !1],
  proprietary: [252, Jt, Jt, [], [0, 2], !1]
}, Dw = [], tl = Oe(Yl, de({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: ng(Qe, de({ type: Qe, key: Ft(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Ft(Qe)
}));
function gc(t) {
  const [e, n, r, i, o, a] = t;
  return { type: e, kc: n, vc: r, reqInc: i, allowInc: o, silentIgnore: a };
}
de({ type: Qe, key: Ft(null) });
function pu(t) {
  const e = {};
  for (const n in t) {
    const [r, i, o] = t[n];
    e[r] = [n, i, o];
  }
  return Pe({
    encodeStream: (n, r) => {
      let i = [];
      for (const o in t) {
        const a = r[o];
        if (a === void 0)
          continue;
        const [c, f, l] = t[o];
        if (!f)
          i.push({ key: { type: c, key: qt }, value: l.encode(a) });
        else {
          const p = a.map(([h, w]) => [
            f.encode(h),
            l.encode(w)
          ]);
          p.sort((h, w) => Yo(h[0], w[0]));
          for (const [h, w] of p)
            i.push({ key: { key: h, type: c }, value: w });
        }
      }
      if (r.unknown) {
        r.unknown.sort((o, a) => Yo(o[0].key, a[0].key));
        for (const [o, a] of r.unknown)
          i.push({ key: o, value: a });
      }
      tl.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = tl.decodeStream(n), i = {}, o = {};
      for (const a of r) {
        let c = "unknown", f = a.key.key, l = a.value;
        if (e[a.key.type]) {
          const [p, h, w] = e[a.key.type];
          if (c = p, !h && f.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${Ot.encode(f)} value=${Ot.encode(l)}`);
          if (f = h ? h.decode(f) : void 0, l = w.decode(l), !h) {
            if (i[c])
              throw new Error(`PSBT: Same keys: ${c} (key=${f} value=${l})`);
            i[c] = l, o[c] = !0;
            continue;
          }
        } else
          f = { type: a.key.type, key: a.key.key };
        if (o[c])
          throw new Error(`PSBT: Key type with empty key and no key=${c} val=${l}`);
        i[c] || (i[c] = []), i[c].push([f, l]);
      }
      return i;
    }
  });
}
const gu = Le(pu(Cs), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      Fr(e, _e.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Fr(e, _e.ecdsa);
  if (t.requiredTimeLocktime !== void 0 && t.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${t.requiredTimeLocktime}`);
  if (t.requiredHeightLocktime !== void 0 && (t.requiredHeightLocktime <= 0 || t.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${t.requiredHeightLocktime}`);
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!te(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
  }
  if (t.tapLeafScript)
    for (const [e, n] of t.tapLeafScript) {
      if ((e.version & 254) !== n[n.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (n[n.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  if (t.nonWitnessUtxo && t.index !== void 0 && t.txid) {
    if (t.nonWitnessUtxo.outputs.length - 1 < t.index)
      throw new Error("nonWitnessUtxo: incorect output index");
    const n = Zt.fromRaw(Lr.encode(t.nonWitnessUtxo), {
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    }), r = Ot.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), wu = Le(pu(as), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Fr(e, _e.ecdsa);
  return t;
}), Vd = Le(pu(hu), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Mw = de({
  magic: jc(Vc(new Uint8Array([255])), "psbt"),
  global: Vd,
  inputs: Oe("global/unsignedTx/inputs/length", gu),
  outputs: Oe(null, wu)
}), Fw = de({
  magic: jc(Vc(new Uint8Array([255])), "psbt"),
  global: Vd,
  inputs: Oe("global/inputCount", gu),
  outputs: Oe("global/outputCount", wu)
});
de({
  magic: jc(Vc(new Uint8Array([255])), "psbt"),
  items: Oe(null, Wn(Oe(Yl, sg([rg(Qe), Ft(_s)])), vs.dict()))
});
function Ka(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: i } = gc(e[r]);
    if (!i.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: i } = gc(e[r]);
    if (i.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function el(t, e, n) {
  const r = {};
  for (const i in n) {
    const o = i;
    if (o !== "unknown") {
      if (!e[o])
        continue;
      const { allowInc: a, silentIgnore: c } = gc(e[o]);
      if (!a.includes(t)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${o} but versions allows inclusion=${a}`);
      }
    }
    r[o] = n[o];
  }
  return r;
}
function jd(t) {
  const e = t && t.global && t.global.version || 0;
  Ka(e, hu, t.global);
  for (const a of t.inputs)
    Ka(e, Cs, a);
  for (const a of t.outputs)
    Ka(e, as, a);
  const n = e ? t.global.inputCount : t.global.unsignedTx.inputs.length;
  if (t.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = t.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = e ? t.global.outputCount : t.global.unsignedTx.outputs.length;
  if (t.outputs.length < i)
    throw new Error("Not outputs inputs");
  const o = t.outputs.slice(i);
  if (o.length > 1 || o.length && Object.keys(o[0]).length)
    throw new Error(`Unexpected outputs left in tx=${o}`);
  return t;
}
function wc(t, e, n, r, i) {
  const o = { ...n, ...e };
  for (const a in t) {
    const c = a, [f, l, p] = t[c], h = r && !r.includes(a);
    if (e[a] === void 0 && a in e) {
      if (h)
        throw new Error(`Cannot remove signed field=${a}`);
      delete o[a];
    } else if (l) {
      const w = n && n[a] ? n[a] : [];
      let b = e[c];
      if (b) {
        if (!Array.isArray(b))
          throw new Error(`keyMap(${a}): KV pairs should be [k, v][]`);
        b = b.map((v) => {
          if (v.length !== 2)
            throw new Error(`keyMap(${a}): KV pairs should be [k, v][]`);
          return [
            typeof v[0] == "string" ? l.decode(Ot.decode(v[0])) : v[0],
            typeof v[1] == "string" ? p.decode(Ot.decode(v[1])) : v[1]
          ];
        });
        const T = {}, x = (v, k, $) => {
          if (T[v] === void 0) {
            T[v] = [k, $];
            return;
          }
          const L = Ot.encode(p.encode(T[v][1])), V = Ot.encode(p.encode($));
          if (L !== V)
            throw new Error(`keyMap(${c}): same key=${v} oldVal=${L} newVal=${V}`);
        };
        for (const [v, k] of w) {
          const $ = Ot.encode(l.encode(v));
          x($, v, k);
        }
        for (const [v, k] of b) {
          const $ = Ot.encode(l.encode(v));
          if (k === void 0) {
            if (h)
              throw new Error(`Cannot remove signed field=${c}/${v}`);
            delete T[$];
          } else
            x($, v, k);
        }
        o[c] = Object.values(T);
      }
    } else if (typeof o[a] == "string")
      o[a] = p.decode(Ot.decode(o[a]));
    else if (h && a in e && n && n[a] !== void 0 && !te(p.encode(e[a]), p.encode(n[a])))
      throw new Error(`Cannot change signed field=${a}`);
  }
  for (const a in o)
    if (!t[a]) {
      if (i && a === "unknown")
        continue;
      delete o[a];
    }
  return o;
}
const nl = Le(Mw, jd), rl = Le(Fw, jd), qw = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Pt(t[1]) || Ot.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: At.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, Ot.decode("4e73")];
  }
};
function Ur(t, e) {
  try {
    return Fr(t, e), !0;
  } catch {
    return !1;
  }
}
const Hw = {
  encode(t) {
    if (!(t.length !== 2 || !Pt(t[0]) || !Ur(t[0], _e.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Vw = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Pt(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, jw = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Pt(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, zw = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Pt(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Gw = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Pt(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Ww = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKMULTISIG")
      return;
    const n = t[0], r = t[e - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = t.slice(1, -2);
    if (r === i.length) {
      for (const o of i)
        if (!Pt(o))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Yw = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Pt(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Zw = {
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
      if (!Pt(i))
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
}, Xw = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Sw(t[e - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < e - 1; i++) {
        const o = t[i];
        if (i & 1) {
          if (o !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Pt(o))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(o);
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
}, Qw = {
  encode(t) {
    return { type: "unknown", script: At.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? At.decode(t.script) : void 0
}, Jw = [
  qw,
  Hw,
  Vw,
  jw,
  zw,
  Gw,
  Ww,
  Yw,
  Zw,
  Xw,
  Qw
], t0 = Wn(At, vs.match(Jw)), we = Le(t0, (t) => {
  if (t.type === "pk" && !Ur(t.pubkey, _e.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Pt(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Pt(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Pt(t.pubkey) || !Ur(t.pubkey, _e.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!Ur(n, _e.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!Ur(e, _e.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function il(t, e) {
  if (!te(t.hash, Ce(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = we.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function zd(t, e, n) {
  if (t) {
    const r = we.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!te(r.hash, nd(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = we.decode(e);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && il(r, n);
  }
  if (e) {
    const r = we.decode(e);
    r.type === "wsh" && n && il(r, n);
  }
}
function e0(t) {
  const e = {};
  for (const n of t) {
    const r = Ot.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(Ot.encode)}`);
    e[r] = !0;
  }
}
function n0(t, e, n = !1, r) {
  const i = we.decode(t);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const o = i;
  if (!n && o.pubkeys)
    for (const a of o.pubkeys) {
      if (te(a, Wc))
        throw new Error("Unspendable taproot key in leaf script");
      if (te(a, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Gd(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((a, c) => (c.weight || 1) - (a.weight || 1));
    const r = e.pop(), i = e.pop(), o = ((i == null ? void 0 : i.weight) || 1) + ((r == null ? void 0 : r.weight) || 1);
    e.push({
      weight: o,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [(i == null ? void 0 : i.childs) || i, (r == null ? void 0 : r.childs) || r]
    });
  }
  const n = e[0];
  return (n == null ? void 0 : n.childs) || n;
}
function yc(t, e = []) {
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
    left: yc(t.left, [t.right.hash, ...e]),
    right: yc(t.right, [t.left.hash, ...e])
  };
}
function mc(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...mc(t.left), ...mc(t.right)];
}
function bc(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: f, script: l } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !te(t.tapMerkleRoot, qt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const p = typeof l == "string" ? Ot.decode(l) : l;
    if (!Pt(p))
      throw new Error(`checkScript: wrong script type=${p}`);
    return n0(p, e, n), {
      type: "leaf",
      version: f,
      script: p,
      hash: xi(p, f)
    };
  }
  if (t.length !== 2 && (t = Gd(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = bc(t[0], e, n), o = bc(t[1], e, n);
  let [a, c] = [i.hash, o.hash];
  return Yo(c, a) === -1 && ([a, c] = [c, a]), { type: "branch", left: i, right: o, hash: Gc("TapBranch", a, c) };
}
const cs = 192, xi = (t, e = cs) => Gc("TapLeaf", new Uint8Array([e]), Ze.encode(t));
function Wd(t, e, n = qr, r = !1, i) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const o = typeof t == "string" ? Ot.decode(t) : t || Wc;
  if (!Ur(o, _e.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let a = e ? yc(bc(e, o, r)) : void 0;
  const c = a ? a.hash : void 0, [f, l] = od(o, c || qt);
  let p;
  a && (p = mc(a).map((b) => ({
    ...b,
    controlBlock: Vn.encode({
      version: (b.version || cs) + l,
      internalKey: o,
      merklePath: b.path
    })
  })));
  let h;
  p && (h = p.map((b) => [
    Vn.decode(b.controlBlock),
    qn(b.script, new Uint8Array([b.version || cs]))
  ]));
  const w = {
    type: "tr",
    script: we.encode({ type: "tr", pubkey: f }),
    address: Oi(n).encode({ type: "tr", pubkey: f }),
    // For tests
    tweakedPubkey: f,
    // PSBT stuff
    tapInternalKey: o
  };
  return p && (w.leaves = p), h && (w.tapLeafScript = h), c && (w.tapMerkleRoot = c), w;
}
function r0(t, e, n = !1) {
  return n || e0(e), {
    type: "tr_ms",
    script: we.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const Yd = Fp(Ce);
function Zd(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Da(t, e, n = qr) {
  Zd(t, e);
  const r = t === 0 ? Ja : Wl;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function ol(t, e) {
  return Yd.encode(qn(Uint8Array.from(e), t));
}
function Oi(t = qr) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return Da(0, e.hash, t);
      if (n === "wsh")
        return Da(0, e.hash, t);
      if (n === "tr")
        return Da(1, e.pubkey, t);
      if (n === "pkh")
        return ol(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return ol(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Ja.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Wl.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...o] = r.words, a = Ja.fromWords(o);
        if (Zd(i, a), i === 0 && a.length === 32)
          return { type: "wsh", hash: a };
        if (i === 0 && a.length === 20)
          return { type: "wpkh", hash: a };
        if (i === 1 && a.length === 32)
          return { type: "tr", pubkey: a };
        throw new Error("Unknown witness program");
      }
      const n = Yd.decode(e);
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
class Mt extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const i0 = new Mt("leaf not found in tx tree"), o0 = new Mt("parent not found");
class s0 {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new Mt("empty vtxo tree");
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
    const n = [], i = this.leaves().find((a) => a.txid === e);
    if (!i)
      throw i0;
    n.push(i);
    const o = this.root().txid;
    for (; n[0].txid !== o; ) {
      const a = this.findParent(n[0]);
      n.unshift(a);
    }
    return n;
  }
  // Helper method to find parent of a node
  findParent(e) {
    for (const n of this.tree)
      for (const r of n)
        if (r.txid === e.parentTxid)
          return r;
    throw o0;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = Zt.fromPSBT(Be.decode(n.tx)), i = yt.encode(Ve(r.toBytes(!0)).reverse());
        if (i !== n.txid)
          throw new Mt(`node ${n.txid} has txid ${n.txid}, but computed txid is ${i}`);
        try {
          this.findParent(n);
        } catch (o) {
          throw new Mt(`node ${n.txid} has no parent: ${o instanceof Error ? o.message : String(o)}`);
        }
      }
  }
}
const Ma = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function a0(t) {
  if (t.length < Ma.length)
    return !1;
  for (let e = 0; e < Ma.length; e++)
    if (t[e] !== Ma[e])
      return !1;
  return !0;
}
function Xd(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    a0(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const Fa = new Error("missing vtxo tree");
class Ri {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = rd();
    return new Ri(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return Ci.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw Fa;
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
      throw Fa;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], i = this.tree.levels[n];
      for (let o = 0; o < i.length; o++) {
        const a = i[o], c = Zt.fromPSBT(Be.decode(a.tx)), f = this.signPartial(c, n, o);
        f ? r.push(f) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw Fa;
    const e = [], n = Ci.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const i = [];
      for (let o = 0; o < r.length; o++) {
        const a = yg(n);
        i.push(a);
      }
      e.push(i);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Ri.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const i = this.myNonces[n][r];
    if (!i)
      return null;
    const o = this.aggregateNonces[n][r];
    if (!o)
      throw new Error("missing aggregate nonce");
    const a = [], c = [], f = Xd(e), { finalKey: l } = uu(f, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let h = 0; h < e.inputsLength; h++) {
      const w = c0(l, this.tree, this.rootSharedOutputAmount, e);
      a.push(w.amount), c.push(w.script);
    }
    const p = e.preimageWitnessV1(
      0,
      // always first input
      c,
      $i.DEFAULT,
      a
    );
    return bw(i.secNonce, this.secretKey, o.pubNonce, f, p, {
      taprootTweak: this.scriptRoot
    });
  }
}
Ri.NOT_INITIALIZED = new Error("session not initialized, call init method");
function c0(t, e, n, r) {
  const i = At.encode(["OP_1", t.slice(1)]), o = e.levels[0][0];
  if (!o)
    throw new Error("empty vtxo tree");
  const a = r.getInput(0);
  if (!a.txid)
    throw new Error("missing input txid");
  const c = yt.encode(a.txid);
  if (o.parentTxid === c)
    return {
      amount: n,
      script: i
    };
  let f = null;
  for (const h of e.levels) {
    for (const w of h)
      if (w.txid === c) {
        f = w;
        break;
      }
    if (f)
      break;
  }
  if (!f)
    throw new Error("parent tx not found");
  const l = Zt.fromPSBT(Be.decode(f.tx));
  if (!a.index)
    throw new Error("missing input index");
  const p = l.getOutput(a.index);
  if (!p)
    throw new Error("parent output not found");
  if (!p.amount)
    throw new Error("parent output amount not found");
  return {
    amount: p.amount,
    script: i
  };
}
const sl = new Uint8Array(32).fill(0);
class us {
  constructor(e) {
    this.key = e || rd();
  }
  static fromPrivateKey(e) {
    return new us(e);
  }
  static fromHex(e) {
    return new us(yt.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, sl))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, void 0, sl))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  xOnlyPublicKey() {
    return zc(this.key);
  }
  signerSession() {
    return Ri.random();
  }
}
class Wi {
  constructor(e, n, r) {
    if (this.serverPubKey = e, this.tweakedPubKey = n, this.hrp = r, e.length !== 32)
      throw new Error("Invalid server public key length");
    if (n.length !== 32)
      throw new Error("Invalid tweaked public key length");
  }
  static decode(e) {
    const n = To.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(To.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const i = r.slice(0, 32), o = r.slice(32, 64);
    return new Wi(i, o, n.prefix);
  }
  encode() {
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = To.toWords(e);
    return To.encode(this.hrp, n, 1023);
  }
  get pkScript() {
    return At.encode(["OP_1", this.tweakedPubKey]);
  }
}
var ne;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(ne || (ne = {}));
function Qd(t) {
  const e = [
    tn,
    _n,
    fs,
    ls,
    Li
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${yt.encode(t)} is not a valid tapscript`);
}
var tn;
(function(t) {
  let e;
  (function(c) {
    c[c.CHECKSIG = 0] = "CHECKSIG", c[c.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(e = t.MultisigType || (t.MultisigType = {}));
  function n(c) {
    if (c.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const l of c.pubkeys)
      if (l.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${l.length}`);
    if (c.type || (c.type = e.CHECKSIG), c.type === e.CHECKSIGADD)
      return {
        type: ne.Multisig,
        params: c,
        script: r0(c.pubkeys.length, c.pubkeys).script,
        witnessSize: () => c.pubkeys.length * 64
      };
    const f = [];
    for (let l = 0; l < c.pubkeys.length; l++)
      f.push(c.pubkeys[l]), l < c.pubkeys.length - 1 ? f.push("CHECKSIGVERIFY") : f.push("CHECKSIG");
    return {
      type: ne.Multisig,
      params: c,
      script: At.encode(f),
      witnessSize: () => c.pubkeys.length * 64
    };
  }
  t.encode = n;
  function r(c) {
    if (c.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return i(c);
    } catch {
      try {
        return o(c);
      } catch (l) {
        throw new Error(`Failed to decode script: ${l instanceof Error ? l.message : String(l)}`);
      }
    }
  }
  t.decode = r;
  function i(c) {
    const f = At.decode(c), l = [];
    let p = !1;
    for (let w = 0; w < f.length; w++) {
      const b = f[w];
      if (typeof b != "string" && typeof b != "number") {
        if (b.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${b.length}`);
        if (l.push(b), w + 1 >= f.length || f[w + 1] !== "CHECKSIGADD" && f[w + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        w++;
        continue;
      }
      if (w === f.length - 1) {
        if (b !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        p = !0;
      }
    }
    if (!p)
      throw new Error("Missing NUMEQUAL operation");
    if (l.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const h = n({
      pubkeys: l,
      type: e.CHECKSIGADD
    });
    if (yt.encode(h.script) !== yt.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.Multisig,
      params: { pubkeys: l, type: e.CHECKSIGADD },
      script: c,
      witnessSize: () => l.length * 64
    };
  }
  function o(c) {
    const f = At.decode(c), l = [];
    for (let h = 0; h < f.length; h++) {
      const w = f[h];
      if (typeof w != "string" && typeof w != "number") {
        if (w.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${w.length}`);
        if (l.push(w), h + 1 >= f.length)
          throw new Error("Unexpected end of script");
        const b = f[h + 1];
        if (b !== "CHECKSIGVERIFY" && b !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (h === f.length - 2 && b !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        h++;
        continue;
      }
    }
    if (l.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const p = n({ pubkeys: l, type: e.CHECKSIG });
    if (yt.encode(p.script) !== yt.encode(c))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.Multisig,
      params: { pubkeys: l, type: e.CHECKSIG },
      script: c,
      witnessSize: () => l.length * 64
    };
  }
  function a(c) {
    return c.type === ne.Multisig;
  }
  t.is = a;
})(tn || (tn = {}));
var _n;
(function(t) {
  function e(i) {
    for (const l of i.pubkeys)
      if (l.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${l.length}`);
    const a = [Yr().encode(BigInt(Gf.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], c = tn.encode(i), f = new Uint8Array([
      ...At.encode(a),
      ...c.script
    ]);
    return {
      type: ne.CSVMultisig,
      params: i,
      script: f,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = At.decode(i);
    if (o.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const a = o[0];
    if (typeof a == "string" || typeof a == "number")
      throw new Error("Invalid script: expected sequence number");
    if (o[1] !== "CHECKSEQUENCEVERIFY" || o[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(At.encode(o.slice(3)));
    let f;
    try {
      f = tn.decode(c);
    } catch (b) {
      throw new Error(`Invalid multisig script: ${b instanceof Error ? b.message : String(b)}`);
    }
    const l = Number(Yr().decode(a)), p = Gf.decode(l), h = p.blocks !== void 0 ? { type: "blocks", value: BigInt(p.blocks) } : { type: "seconds", value: BigInt(p.seconds) }, w = e({
      timelock: h,
      ...f.params
    });
    if (yt.encode(w.script) !== yt.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.CSVMultisig,
      params: {
        timelock: h,
        ...f.params
      },
      script: i,
      witnessSize: () => f.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === ne.CSVMultisig;
  }
  t.is = r;
})(_n || (_n = {}));
var fs;
(function(t) {
  function e(i) {
    const o = new Uint8Array([
      ...i.conditionScript,
      ...At.encode(["VERIFY"]),
      ..._n.encode(i).script
    ]);
    return {
      type: ne.ConditionCSVMultisig,
      params: i,
      script: o,
      witnessSize: (a) => a + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = At.decode(i);
    if (o.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let a = -1;
    for (let h = o.length - 1; h >= 0; h--)
      o[h] === "VERIFY" && (a = h);
    if (a === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(At.encode(o.slice(0, a))), f = new Uint8Array(At.encode(o.slice(a + 1)));
    let l;
    try {
      l = _n.decode(f);
    } catch (h) {
      throw new Error(`Invalid CSV multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    const p = e({
      conditionScript: c,
      ...l.params
    });
    if (yt.encode(p.script) !== yt.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...l.params
      },
      script: i,
      witnessSize: (h) => h + l.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === ne.ConditionCSVMultisig;
  }
  t.is = r;
})(fs || (fs = {}));
var ls;
(function(t) {
  function e(i) {
    const o = new Uint8Array([
      ...i.conditionScript,
      ...At.encode(["VERIFY"]),
      ...tn.encode(i).script
    ]);
    return {
      type: ne.ConditionMultisig,
      params: i,
      script: o,
      witnessSize: (a) => a + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = At.decode(i);
    if (o.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let a = -1;
    for (let h = o.length - 1; h >= 0; h--)
      o[h] === "VERIFY" && (a = h);
    if (a === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(At.encode(o.slice(0, a))), f = new Uint8Array(At.encode(o.slice(a + 1)));
    let l;
    try {
      l = tn.decode(f);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    const p = e({
      conditionScript: c,
      ...l.params
    });
    if (yt.encode(p.script) !== yt.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.ConditionMultisig,
      params: {
        conditionScript: c,
        ...l.params
      },
      script: i,
      witnessSize: (h) => h + l.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === ne.ConditionMultisig;
  }
  t.is = r;
})(ls || (ls = {}));
var Li;
(function(t) {
  function e(i) {
    const a = [Yr().encode(i.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], c = At.encode(a), f = new Uint8Array([
      ...c,
      ...tn.encode(i).script
    ]);
    return {
      type: ne.CLTVMultisig,
      params: i,
      script: f,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = At.decode(i);
    if (o.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const a = o[0];
    if (typeof a == "string" || typeof a == "number")
      throw new Error("Invalid script: expected locktime number");
    if (o[1] !== "CHECKLOCKTIMEVERIFY" || o[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(At.encode(o.slice(3)));
    let f;
    try {
      f = tn.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    const l = Yr().decode(a), p = e({
      absoluteTimelock: l,
      ...f.params
    });
    if (yt.encode(p.script) !== yt.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: ne.CLTVMultisig,
      params: {
        absoluteTimelock: l,
        ...f.params
      },
      script: i,
      witnessSize: () => f.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === ne.CLTVMultisig;
  }
  t.is = r;
})(Li || (Li = {}));
function yu(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Xr {
  static decode(e) {
    return new Xr(e.map(yt.decode));
  }
  constructor(e) {
    this.scripts = e;
    const n = Gd(e.map((i) => ({ script: i, leafVersion: cs }))), r = Wd(Wc, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return this.scripts.map(yt.encode);
  }
  address(e, n) {
    return new Wi(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return At.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return Oi(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => yt.encode(yu(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
}
var al;
(function(t) {
  class e extends Xr {
    constructor(r) {
      const { sender: i, receiver: o, server: a, preimageHash: c, refundLocktime: f, unilateralClaimDelay: l, unilateralRefundDelay: p, unilateralRefundWithoutReceiverDelay: h } = r, w = u0(c), b = ls.encode({
        conditionScript: w,
        pubkeys: [o, a]
      }).script, T = tn.encode({
        pubkeys: [i, o, a]
      }).script, x = Li.encode({
        absoluteTimelock: f,
        pubkeys: [i, a]
      }).script, v = fs.encode({
        conditionScript: w,
        timelock: l,
        pubkeys: [o]
      }).script, k = _n.encode({
        timelock: p,
        pubkeys: [i, o]
      }).script, $ = _n.encode({
        timelock: h,
        pubkeys: [i]
      }).script;
      super([
        b,
        T,
        x,
        v,
        k,
        $
      ]), this.options = r, this.claimScript = yt.encode(b), this.refundScript = yt.encode(T), this.refundWithoutReceiverScript = yt.encode(x), this.unilateralClaimScript = yt.encode(v), this.unilateralRefundScript = yt.encode(k), this.unilateralRefundWithoutReceiverScript = yt.encode($);
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
})(al || (al = {}));
function u0(t) {
  return At.encode(["HASH160", t, "EQUAL"]);
}
var Pi;
(function(t) {
  class e extends Xr {
    constructor(r) {
      const { pubKey: i, serverPubKey: o, csvTimelock: a = e.DEFAULT_TIMELOCK } = r, c = tn.encode({
        pubkeys: [i, o]
      }).script, f = _n.encode({
        timelock: a,
        pubkeys: [i]
      }).script;
      super([c, f]), this.options = r, this.forfeitScript = yt.encode(c), this.exitScript = yt.encode(f);
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
})(Pi || (Pi = {}));
var Ki;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(Ki || (Ki = {}));
function f0(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function l0(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function d0(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function Co(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function h0(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function Jd(t, e, n) {
  const r = [];
  let i = [...e];
  for (const a of [...t, ...e]) {
    if (a.virtualStatus.state !== "pending" && n.has(a.virtualStatus.batchTxID || ""))
      continue;
    const c = f0(i, a);
    i = cl(i, c);
    const f = Co(c);
    if (a.value <= f)
      continue;
    const l = l0(i, a);
    i = cl(i, l);
    const p = Co(l);
    if (a.value <= p)
      continue;
    const h = {
      roundTxid: a.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let w = a.virtualStatus.state !== "pending";
    a.virtualStatus.state === "pending" && (h.redeemTxid = a.txid, a.spentBy && (w = !0)), r.push({
      key: h,
      amount: a.value - f - p,
      type: Ki.TxReceived,
      createdAt: a.createdAt.getTime(),
      settled: w
    });
  }
  const o = /* @__PURE__ */ new Map();
  for (const a of e) {
    if (!a.spentBy)
      continue;
    o.has(a.spentBy) || o.set(a.spentBy, []);
    const c = o.get(a.spentBy);
    o.set(a.spentBy, [...c, a]);
  }
  for (const [a, c] of o) {
    const f = d0([...t, ...e], a), l = Co(f), p = Co(c);
    if (p <= l)
      continue;
    const h = h0(f, c), w = {
      roundTxid: h.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    h.virtualStatus.state === "pending" && (w.redeemTxid = h.txid), r.push({
      key: w,
      amount: p - l,
      type: Ki.TxSent,
      createdAt: h.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function cl(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var vc;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(vc || (vc = {}));
class ul {
  static create(e) {
    const { address: n, ...r } = e, i = {};
    for (const [a, c] of Object.entries(r))
      if (c !== void 0)
        if (a === "amount") {
          if (!isFinite(c)) {
            console.warn("Invalid amount");
            continue;
          }
          if (c < 0)
            continue;
          i[a] = c;
        } else a === "ark" ? typeof c == "string" && (c.startsWith("ark") || c.startsWith("tark")) ? i[a] = c : console.warn("Invalid ARK address format") : a === "sp" ? typeof c == "string" && c.startsWith("sp") ? i[a] = c : console.warn("Invalid Silent Payment address format") : (typeof c == "string" || typeof c == "number") && (i[a] = c);
    const o = Object.keys(i).length > 0 ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(i).map(([a, c]) => [
      a,
      String(c)
    ]))).toString() : "";
    return `bitcoin:${n ? n.toLowerCase() : ""}${o}`;
  }
  static parse(e) {
    if (!e.toLowerCase().startsWith("bitcoin:"))
      throw new Error(vc.INVALID_URI);
    const n = e.slice(e.toLowerCase().indexOf("bitcoin:") + 8), [r, i] = n.split("?"), o = {};
    if (r && (o.address = r.toLowerCase()), i) {
      const a = new URLSearchParams(i);
      for (const [c, f] of a.entries())
        if (f)
          if (c === "amount") {
            const l = Number(f);
            if (!isFinite(l) || l < 0)
              continue;
            o[c] = l;
          } else c === "ark" ? f.startsWith("ark") || f.startsWith("tark") ? o[c] = f : console.warn("Invalid ARK address format") : c === "sp" ? f.startsWith("sp") ? o[c] = f : console.warn("Invalid Silent Payment address format") : o[c] = f;
    }
    return {
      originalString: e,
      params: o
    };
  }
}
function p0(t, e) {
  const n = [...t].sort((a, c) => c.value - a.value), r = [];
  let i = 0;
  for (const a of n)
    if (r.push(a), i += a.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const o = i - e;
  return {
    inputs: r,
    changeAmount: o
  };
}
function g0(t, e) {
  const n = [...t].sort((a, c) => {
    const f = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, l = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return f !== l ? f - l : c.value - a.value;
  }), r = [];
  let i = 0;
  for (const a of n)
    if (r.push(a), i += a.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const o = i - e;
  return {
    inputs: r,
    changeAmount: o
  };
}
const w0 = (t) => y0[t], y0 = {
  bitcoin: wi(qr, "ark"),
  testnet: wi(ko, "tark"),
  signet: wi(ko, "tark"),
  mutinynet: wi(ko, "tark"),
  regtest: wi({
    ...ko,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function wi(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const m0 = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class b0 {
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
}
var xe;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(xe || (xe = {}));
class th {
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
      spendableVtxos: [...i.spendableVtxos || []].map(Uo),
      spentVtxos: [...i.spentVtxos || []].map(Uo)
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
      const o = await r.text();
      try {
        const a = JSON.parse(o);
        throw new Error(`Failed to submit virtual transaction: ${a.message || a.error || o}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${o}`);
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
          const o = i.body.getReader(), a = new TextDecoder();
          let c = "";
          for (; !r.signal.aborted; ) {
            const { done: f, value: l } = await o.read();
            if (f)
              break;
            c += a.decode(l, { stream: !0 });
            const p = c.split(`
`);
            for (let h = 0; h < p.length - 1; h++) {
              const w = p[h].trim();
              if (w)
                try {
                  const b = JSON.parse(w);
                  e(b);
                } catch (b) {
                  console.error("Failed to parse event:", b);
                }
            }
            c = p[p.length - 1];
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
    for (const c of e)
      typeof c == "string" ? i.push(c) : r.push({
        outpoint: {
          txid: c.outpoint.txid,
          vout: c.outpoint.vout
        },
        tapscripts: {
          scripts: c.tapscripts
        }
      });
    const o = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: r,
        notes: i
      })
    });
    if (!o.ok) {
      const c = await o.text();
      throw new Error(`Failed to register inputs: ${c}`);
    }
    return { requestId: (await o.json()).requestId };
  }
  async registerOutputsForNextRound(e, n, r, i = !1) {
    const o = `${this.serverUrl}/v1/round/registerOutputs`, a = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestId: e,
        outputs: n.map((c) => ({
          address: c.address,
          amount: c.amount.toString(10)
        })),
        musig2: {
          cosignersPublicKeys: r,
          signingAll: i
        }
      })
    });
    if (!a.ok) {
      const c = await a.text();
      throw new Error(`Failed to register outputs: ${c}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const i = `${this.serverUrl}/v1/round/tree/submitNonces`, o = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeNonces: x0(r)
      })
    });
    if (!o.ok) {
      const a = await o.text();
      throw new Error(`Failed to submit tree nonces: ${a}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const i = `${this.serverUrl}/v1/round/tree/submitSignatures`, o = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeSignatures: S0(r)
      })
    });
    if (!o.ok) {
      const a = await o.text();
      throw new Error(`Failed to submit tree signatures: ${a}`);
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
        const i = r.body.getReader(), o = new TextDecoder();
        let a = "";
        for (; !(e != null && e.aborted); ) {
          const { done: c, value: f } = await i.read();
          if (c)
            break;
          a += o.decode(f, { stream: !0 });
          const l = a.split(`
`);
          for (let p = 0; p < l.length - 1; p++) {
            const h = l[p].trim();
            if (h)
              try {
                const w = JSON.parse(h), b = this.parseSettlementEvent(w.result);
                b && (yield b);
              } catch (w) {
                throw console.error("Failed to parse event:", w), w;
              }
          }
          a = l[l.length - 1];
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
        const o = i.body.getReader(), a = new TextDecoder();
        let c = "";
        for (; !n.aborted; ) {
          const { done: f, value: l } = await o.read();
          if (f)
            break;
          c += a.decode(l, { stream: !0 });
          const p = c.split(`
`);
          for (let h = 0; h < p.length - 1; h++) {
            const w = p[h].trim();
            if (w)
              try {
                const b = JSON.parse(w);
                "result" in b && (yield {
                  newVtxos: (b.result.newVtxos || []).map(Uo),
                  spentVtxos: (b.result.spentVtxos || []).map(Uo)
                });
              } catch (b) {
                throw console.error("Failed to parse address update:", b), b;
              }
          }
          c = p[p.length - 1];
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
    })), new s0(e.levels.map((r) => r.nodes.map((i) => ({
      txid: i.txid,
      tx: i.tx,
      parentTxid: i.parentTxid,
      leaf: !n.has(i.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: xe.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: xe.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: xe.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: xe.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: xe.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: E0(yt.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function eh(t) {
  let e = 4;
  for (const o of t) {
    e += 4;
    for (const a of o)
      e += 1, e += a.length;
  }
  const n = new ArrayBuffer(e), r = new DataView(n);
  let i = 0;
  r.setUint32(i, t.length, !0), i += 4;
  for (const o of t) {
    r.setUint32(i, o.length, !0), i += 4;
    for (const a of o) {
      const c = a.length > 0;
      r.setInt8(i, c ? 1 : 0), i += 1, c && (new Uint8Array(n).set(a, i), i += a.length);
    }
  }
  return new Uint8Array(n);
}
function v0(t, e) {
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let r = 0;
  const i = n.getUint32(r, !0);
  r += 4;
  const o = [];
  for (let a = 0; a < i; a++) {
    const c = n.getUint32(r, !0);
    r += 4;
    const f = [];
    for (let l = 0; l < c; l++) {
      const p = n.getUint8(r) === 1;
      if (r += 1, p) {
        const h = new Uint8Array(t.buffer, t.byteOffset + r, e);
        f.push(new Uint8Array(h)), r += e;
      } else
        f.push(new Uint8Array());
    }
    o.push(f);
  }
  return o;
}
function E0(t) {
  return v0(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function x0(t) {
  return yt.encode(eh(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function S0(t) {
  return yt.encode(eh(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function Uo(t) {
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
function A0({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: i, vtxoPkScript: o, connectorPkScript: a, serverPkScript: c, txLocktime: f }) {
  const l = new Zt({
    version: 2,
    lockTime: f
  });
  l.addInput({
    txid: t.txid,
    index: t.vout,
    witnessUtxo: {
      script: a,
      amount: r
    },
    sequence: 4294967295
  }), l.addInput({
    txid: e.txid,
    index: e.vout,
    witnessUtxo: {
      script: o,
      amount: n
    },
    sequence: f ? 4294967294 : 4294967295,
    // MAX_SEQUENCE - 1 if locktime is set
    sighashType: $i.DEFAULT
  });
  const p = BigInt(n) + BigInt(r) - BigInt(i);
  return l.addOutput({
    script: c,
    amount: p
  }), l;
}
class Ht {
  constructor(e, n, r, i, o, a) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = o, this.outputSize = a;
  }
  static create() {
    return new Ht(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += Ht.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Ht.INPUT_SIZE + Ht.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const i = 1 + Ht.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + i, this.inputSize += Ht.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Ht.OUTPUT_SIZE + Ht.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (a) => a < 253 ? 1 : a < 65535 ? 3 : a < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let o = (Ht.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Ht.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (o += Ht.WITNESS_HEADER_SIZE + this.inputWitnessSize), k0(o);
  }
}
Ht.P2PKH_SCRIPT_SIG_SIZE = 108;
Ht.INPUT_SIZE = 41;
Ht.BASE_CONTROL_BLOCK_SIZE = 33;
Ht.OUTPUT_SIZE = 9;
Ht.P2WKH_OUTPUT_SIZE = 22;
Ht.BASE_TX_SIZE = 10;
Ht.WITNESS_HEADER_SIZE = 2;
Ht.WITNESS_SCALE_FACTOR = 4;
const k0 = (t) => {
  const e = BigInt(Math.ceil(t / Ht.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, T0 = new Mt("invalid settlement transaction"), Ec = new Mt("invalid settlement transaction outputs"), nh = new Mt("empty tree"), I0 = new Mt("invalid root level"), mu = new Mt("invalid number of inputs"), Si = new Mt("wrong settlement txid"), xc = new Mt("invalid amount"), B0 = new Mt("no leaves"), _0 = new Mt("node transaction empty"), N0 = new Mt("node txid empty"), C0 = new Mt("node parent txid empty"), U0 = new Mt("node txid different"), fl = new Mt("parent txid input mismatch"), $0 = new Mt("leaf node has children"), ll = new Mt("invalid taproot script"), O0 = new Mt("invalid internal key");
new Mt("invalid control block");
const R0 = new Mt("invalid root transaction"), L0 = new Mt("invalid node transaction"), qa = 0, dl = 1;
function P0(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw nh;
  const r = Zt.fromPSBT(Be.decode(n.tx));
  if (r.inputsLength !== 1)
    throw mu;
  const i = r.getInput(0), o = Zt.fromPSBT(Be.decode(t));
  if (o.outputsLength <= dl)
    throw Ec;
  const a = yt.encode(Ve(o.toBytes(!0)).reverse());
  if (!i.txid || yt.encode(i.txid) !== a || i.index !== dl)
    throw Si;
}
function K0(t, e, n) {
  e.validate();
  let r;
  try {
    r = Zt.fromPSBT(Be.decode(t));
  } catch {
    throw T0;
  }
  if (r.outputsLength <= qa)
    throw Ec;
  const i = r.getOutput(qa);
  if (!(i != null && i.amount))
    throw Ec;
  const o = i.amount;
  if (e.numberOfNodes() === 0)
    throw nh;
  if (e.levels[0].length !== 1)
    throw I0;
  const c = e.levels[0][0];
  let f;
  try {
    f = Zt.fromPSBT(Be.decode(c.tx));
  } catch {
    throw R0;
  }
  if (f.inputsLength !== 1)
    throw mu;
  const l = f.getInput(0);
  if (!l.txid || l.index === void 0)
    throw Si;
  const p = yt.encode(Ve(r.toBytes(!0)).reverse());
  if (yt.encode(l.txid) !== p || l.index !== qa)
    throw Si;
  let h = 0n;
  for (let w = 0; w < f.outputsLength; w++) {
    const b = f.getOutput(w);
    b != null && b.amount && (h += b.amount);
  }
  if (h >= o)
    throw xc;
  if (e.leaves().length === 0)
    throw B0;
  for (const w of e.levels)
    for (const b of w)
      D0(e, b, n);
}
function D0(t, e, n) {
  if (!e.tx)
    throw _0;
  if (!e.txid)
    throw N0;
  if (!e.parentTxid)
    throw C0;
  let r;
  try {
    r = Zt.fromPSBT(Be.decode(e.tx));
  } catch {
    throw L0;
  }
  if (yt.encode(Ve(r.toBytes(!0)).reverse()) !== e.txid)
    throw U0;
  if (r.inputsLength !== 1)
    throw mu;
  const o = r.getInput(0);
  if (!o.txid || yt.encode(o.txid) !== e.parentTxid)
    throw fl;
  const a = t.children(e.txid);
  if (e.leaf && a.length >= 1)
    throw $0;
  for (let c = 0; c < a.length; c++) {
    const f = a[c], l = Zt.fromPSBT(Be.decode(f.tx)), p = r.getOutput(c);
    if (!(p != null && p.script))
      throw ll;
    const h = p.script.slice(2);
    if (h.length !== 32)
      throw ll;
    const w = Xd(l), { finalKey: b } = uu(w, !0, {
      taprootTweak: n
    });
    if (yt.encode(b) !== yt.encode(h.slice(2)))
      throw O0;
    let T = 0n;
    for (let x = 0; x < l.outputsLength; x++) {
      const v = l.getOutput(x);
      v != null && v.amount && (T += v.amount);
    }
    if (!p.amount || T >= p.amount)
      throw xc;
  }
}
const M0 = 255;
new TextEncoder().encode("condition");
const F0 = new TextEncoder().encode("taptree");
function q0(t, e, n) {
  var r;
  e.updateInput(t, {
    unknown: [
      ...((r = e.getInput(t)) == null ? void 0 : r.unknown) ?? [],
      [
        {
          type: M0,
          key: F0
        },
        V0(n)
      ]
    ]
  });
}
function H0(t, e) {
  let n;
  for (const i of t) {
    const o = Qd(yu(i.tapLeafScript));
    Li.is(o) && (n = Number(o.params.absoluteTimelock));
  }
  const r = new Zt({
    allowUnknown: !0,
    lockTime: n
  });
  for (const [i, o] of t.entries())
    r.addInput({
      txid: o.txid,
      index: o.vout,
      sequence: n ? du - 1 : void 0,
      witnessUtxo: {
        script: Xr.decode(o.scripts).pkScript,
        amount: BigInt(o.value)
      },
      tapLeafScript: [o.tapLeafScript]
    }), q0(i, r, o.scripts.map(yt.decode));
  for (const i of e)
    r.addOutput({
      amount: i.amount,
      script: Wi.decode(i.address).pkScript
    });
  return r;
}
function V0(t) {
  const e = [];
  e.push(hl(t.length));
  for (const o of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(hl(o.length)), e.push(o);
  const n = e.reduce((o, a) => o + a.length, 0), r = new Uint8Array(n);
  let i = 0;
  for (const o of e)
    r.set(o, i), i += o.length;
  return r;
}
function hl(t) {
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
class bu {
  constructor(e, n) {
    this.id = e, this.value = n;
  }
  encode() {
    const e = new Uint8Array(12);
    return j0(e, this.id, 0), G0(e, this.value, 8), e;
  }
  static decode(e) {
    if (e.length !== 12)
      throw new Error(`invalid data length: expected 12 bytes, got ${e.length}`);
    const n = z0(e, 0), r = W0(e, 8);
    return new bu(n, r);
  }
}
class Sn {
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
    const n = bu.decode(e.subarray(0, 12)), r = e.subarray(12);
    if (r.length !== 64)
      throw new Error(`invalid signature length: expected 64 bytes, got ${r.length}`);
    return new Sn(n, r);
  }
  static fromString(e) {
    if (!e.startsWith(Sn.HRP))
      throw new Error(`invalid human-readable part: expected ${Sn.HRP} prefix (note '${e}')`);
    const n = e.slice(Sn.HRP.length);
    if (n.length < 103 || n.length > 104)
      throw new Error(`invalid note length: expected 103 or 104 chars, got ${n.length}`);
    const r = xf.decode(n);
    if (r.length === 0)
      throw new Error("failed to decode base58 string");
    return Sn.decode(new Uint8Array(r));
  }
  toString() {
    return Sn.HRP + xf.encode(this.encode());
  }
}
Sn.HRP = "arknote";
function j0(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 8).setBigUint64(0, e, !1);
}
function z0(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 8).getBigUint64(0, !1);
}
function G0(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function W0(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
class Tn {
  constructor(e, n, r, i, o, a, c, f) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = i, this.arkProvider = o, this.arkServerPublicKey = a, this.offchainTapscript = c, this.boardingTapscript = f;
  }
  static async create(e) {
    const n = w0(e.network), r = new b0(e.esploraUrl || m0[e.network]), i = e.identity.xOnlyPublicKey();
    if (!i)
      throw new Error("Invalid configured public key");
    let o;
    e.arkServerUrl && (o = new th(e.arkServerUrl));
    const a = Wd(i, void 0, n);
    if (o) {
      let c = e.arkServerPublicKey, f = e.exitTimelock, l = e.boardingTimelock;
      if (!c || !f) {
        const T = await o.getInfo();
        c = T.pubkey, f = {
          value: T.unilateralExitDelay,
          type: T.unilateralExitDelay < 512n ? "blocks" : "seconds"
        }, l = {
          value: T.unilateralExitDelay * 2n,
          type: T.unilateralExitDelay * 2n < 512n ? "blocks" : "seconds"
        };
      }
      const p = yt.decode(c).slice(1), h = new Pi.Script({
        pubKey: i,
        serverPubKey: p,
        csvTimelock: f
      }), w = new Pi.Script({
        pubKey: i,
        serverPubKey: p,
        csvTimelock: l
      }), b = h;
      return new Tn(e.identity, n, r, a, o, p, b, w);
    }
    return new Tn(e.identity, n, r, a);
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
      bip21: ul.create({
        address: this.onchainAddress
      })
    };
    if (this.arkProvider && this.offchainTapscript && this.boardingTapscript && this.arkServerPublicKey) {
      const n = this.offchainAddress.encode();
      e.offchain = {
        address: n,
        scripts: {
          exit: [this.offchainTapscript.exitScript],
          forfeit: [this.offchainTapscript.forfeitScript]
        }
      }, e.bip21 = ul.create({
        address: this.onchainP2TR.address,
        ark: n
      }), e.boarding = {
        address: this.boardingOnchainAddress,
        scripts: {
          exit: [this.boardingTapscript.exitScript],
          forfeit: [this.boardingTapscript.forfeitScript]
        }
      };
    }
    return Promise.resolve(e);
  }
  async getBalance() {
    const e = await this.getCoins(), n = e.filter((l) => l.status.confirmed).reduce((l, p) => l + p.value, 0), r = e.filter((l) => !l.status.confirmed).reduce((l, p) => l + p.value, 0), i = n + r;
    let o = 0, a = 0, c = 0;
    if (this.arkProvider) {
      const l = await this.getVirtualCoins();
      o = l.filter((p) => p.virtualStatus.state === "settled").reduce((p, h) => p + h.value, 0), a = l.filter((p) => p.virtualStatus.state === "pending").reduce((p, h) => p + h.value, 0), c = l.filter((p) => p.virtualStatus.state === "swept").reduce((p, h) => p + h.value, 0);
    }
    const f = o + a;
    return {
      onchain: {
        confirmed: n,
        unconfirmed: r,
        total: i
      },
      offchain: {
        swept: c,
        settled: o,
        pending: a,
        total: f
      },
      total: i + f
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
    const { spendableVtxos: n } = await this.arkProvider.getVirtualCoins(e.offchain.address), r = this.offchainTapscript.encode(), i = this.offchainTapscript.forfeit();
    return n.map((o) => ({
      ...o,
      tapLeafScript: i,
      scripts: r
    }));
  }
  async getVirtualCoins() {
    if (!this.arkProvider)
      return [];
    const e = await this.getAddress();
    return e.offchain ? this.arkProvider.getVirtualCoins(e.offchain.address).then(({ spendableVtxos: n }) => n) : [];
  }
  async getTransactionHistory() {
    if (!this.arkProvider)
      return [];
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.encode()), { boardingTxs: r, roundsToIgnore: i } = await this.getBoardingTxs(), o = Jd(e, n, i), a = [...r, ...o];
    return a.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (c, f) => c.createdAt === 0 ? -1 : f.createdAt === 0 ? 1 : f.createdAt - c.createdAt
    ), a;
  }
  async getBoardingTxs() {
    if (!this.boardingAddress)
      return { boardingTxs: [], roundsToIgnore: /* @__PURE__ */ new Set() };
    const e = this.boardingOnchainAddress, n = await this.onchainProvider.getTransactions(e), r = [], i = /* @__PURE__ */ new Set();
    for (const c of n)
      for (let f = 0; f < c.vout.length; f++) {
        const l = c.vout[f];
        if (l.scriptpubkey_address === e) {
          const h = (await this.onchainProvider.getTxOutspends(c.txid))[f];
          h != null && h.spent && i.add(h.txid), r.push({
            txid: c.txid,
            vout: f,
            value: Number(l.value),
            status: {
              confirmed: c.status.confirmed,
              block_time: c.status.block_time
            },
            virtualStatus: {
              state: h != null && h.spent ? "swept" : "pending",
              batchTxID: h != null && h.spent ? h.txid : void 0
            },
            createdAt: c.status.confirmed ? new Date(c.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const o = [], a = [];
    for (const c of r) {
      const f = {
        key: {
          boardingTxid: c.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: c.value,
        type: Ki.TxReceived,
        settled: c.virtualStatus.state === "swept",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? a.push(f) : o.push(f);
    }
    return {
      boardingTxs: [...o, ...a],
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
    if (e.amount < Tn.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return Wi.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || Tn.FEE_RATE, i = Math.ceil(174 * r), o = e.amount + i, a = p0(n, o);
    if (!a.inputs)
      throw new Error("Insufficient funds");
    let c = new Zt();
    for (const l of a.inputs)
      c.addInput({
        txid: l.txid,
        index: l.vout,
        witnessUtxo: {
          script: this.onchainP2TR.script,
          amount: BigInt(l.value)
        },
        tapInternalKey: this.onchainP2TR.tapInternalKey,
        tapMerkleRoot: this.onchainP2TR.tapMerkleRoot
      });
    return c.addOutputAddress(e.address, BigInt(e.amount), this.network), a.changeAmount > 0 && c.addOutputAddress(this.onchainAddress, BigInt(a.changeAmount), this.network), c = await this.identity.sign(c), c.finalize(), await this.onchainProvider.broadcastTransaction(c.hex);
  }
  async sendOffchain(e, n = !0) {
    if (!this.arkProvider || !this.offchainAddress || !this.offchainTapscript)
      throw new Error("wallet not initialized");
    const r = await this.getVirtualCoins(), i = n ? 0 : Math.ceil(174 * (e.feeRate || Tn.FEE_RATE)), o = e.amount + i, a = g0(r, o);
    if (!a || !a.inputs)
      throw new Error("Insufficient funds");
    const c = this.offchainTapscript.forfeit();
    if (!c)
      throw new Error("Selected leaf not found");
    const f = [
      {
        address: e.address,
        amount: BigInt(e.amount)
      }
    ];
    a.changeAmount > 0 && f.push({
      address: this.offchainAddress.encode(),
      amount: BigInt(a.changeAmount)
    });
    const l = this.offchainTapscript.encode();
    let p = H0(a.inputs.map((w) => ({
      ...w,
      tapLeafScript: c,
      scripts: l
    })), f);
    p = await this.identity.sign(p);
    const h = Be.encode(p.toPSBT());
    return this.arkProvider.submitVirtualTx(h);
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (e != null && e.inputs) {
      for (const h of e.inputs)
        if (typeof h == "string")
          try {
            Sn.fromString(h);
          } catch {
            throw new Error(`Invalid arknote "${h}"`);
          }
    }
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let h = 0;
      const w = await this.getBoardingUtxos();
      h += w.reduce((x, v) => x + v.value, 0);
      const b = await this.getVtxos();
      h += b.reduce((x, v) => x + v.value, 0);
      const T = [...w, ...b];
      if (T.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: T,
        outputs: [
          {
            address: this.offchainAddress.encode(),
            amount: BigInt(h)
          }
        ]
      };
    }
    const { requestId: r } = await this.arkProvider.registerInputsForNextRound(e.inputs.map((h) => typeof h == "string" ? h : {
      outpoint: h,
      tapscripts: h.scripts
    })), i = e.outputs.some((h) => this.isOffchainSuitable(h.address));
    let o;
    const a = [];
    i && (o = this.identity.signerSession(), a.push(yt.encode(o.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, a);
    const c = setInterval(() => {
      var h;
      (h = this.arkProvider) == null || h.ping(r).catch(l);
    }, 1e3);
    let f = !0;
    const l = () => {
      f && (f = !1, clearInterval(c));
    }, p = new AbortController();
    try {
      const h = this.arkProvider.getEventStream(p.signal);
      let w;
      i || (w = xe.SigningNoncesGenerated);
      const b = await this.arkProvider.getInfo(), T = _n.encode({
        timelock: {
          value: b.batchExpiry,
          type: b.batchExpiry >= 512n ? "seconds" : "blocks"
        },
        pubkeys: [yt.decode(b.pubkey).slice(1)]
      }).script, x = xi(T);
      for await (const v of h) {
        switch (n && n(v), v.type) {
          // the settlement failed
          case xe.Failed:
            if (w === void 0)
              continue;
            throw l(), new Error(v.reason);
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case xe.SigningStart:
            if (w !== void 0)
              continue;
            if (l(), i) {
              if (!o)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningEvent(v, x, o);
            }
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case xe.SigningNoncesGenerated:
            if (w !== xe.SigningStart)
              continue;
            if (l(), i) {
              if (!o)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningNoncesGeneratedEvent(v, o);
            }
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case xe.Finalization:
            if (w !== xe.SigningNoncesGenerated)
              continue;
            l(), await this.handleSettlementFinalizationEvent(v, e.inputs, b);
            break;
          // the settlement is done, last event to be received
          case xe.Finalized:
            if (w !== xe.Finalization)
              continue;
            return p.abort(), v.roundTxid;
        }
        w = v.type;
      }
    } catch (h) {
      throw p.abort(), h;
    }
    throw new Error("Settlement failed");
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const i = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    K0(e.unsignedSettlementTx, i, n);
    const o = Be.decode(e.unsignedSettlementTx), c = Zt.fromPSBT(o).getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(i, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, yt.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, yt.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const i = Oi(this.network).decode(r.forfeitAddress), o = we.encode(i), a = [], c = await this.getVirtualCoins();
    let f = Zt.fromPSBT(Be.decode(e.roundTx)), l = !1, p = !1;
    for (const h of n) {
      if (typeof h == "string")
        continue;
      const w = c.find((V) => V.txid === h.txid && V.vout === h.vout);
      if (!w) {
        l = !0;
        const V = [];
        for (let Y = 0; Y < f.inputsLength; Y++) {
          const G = f.getInput(Y);
          if (!G.txid || G.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          yt.encode(G.txid) === h.txid && G.index === h.vout && (f.updateInput(Y, {
            tapLeafScript: [h.tapLeafScript]
          }), V.push(Y));
        }
        f = await this.identity.sign(f, V);
        continue;
      }
      p || (P0(e.roundTx, e.connectors), p = !0);
      const b = Vn.encode(h.tapLeafScript[0]), T = Qd(yu(h.tapLeafScript)), x = Ht.create().addKeySpendInput().addTapscriptInput(
        T.witnessSize(100),
        // TODO: handle conditional script
        h.tapLeafScript[1].length - 1,
        b.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), v = e.connectors.leaves(), k = e.connectorsIndex.get(`${w.txid}:${w.vout}`);
      if (!k)
        throw new Error("Connector outpoint not found");
      let $;
      for (const V of v)
        if (V.txid === k.txid)
          try {
            $ = Zt.fromPSBT(Be.decode(V.tx)).getOutput(k.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!$ || !$.amount || !$.script)
        throw new Error("Connector output not found");
      let L = A0({
        connectorInput: k,
        connectorAmount: $.amount,
        feeAmount: x,
        serverPkScript: o,
        connectorPkScript: $.script,
        vtxoAmount: BigInt(w.value),
        vtxoInput: h,
        vtxoPkScript: Xr.decode(h.scripts).pkScript
      });
      L.updateInput(1, {
        tapLeafScript: [h.tapLeafScript]
      }), L = await this.identity.sign(L, [1]), a.push(Be.encode(L.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(a, l ? Be.encode(f.toPSBT()) : void 0);
  }
}
Tn.DUST_AMOUNT = BigInt(546);
Tn.FEE_RATE = 1;
var Et;
(function(t) {
  t.walletInitialized = (P) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: P
  });
  function e(P, st) {
    return {
      type: "ERROR",
      success: !1,
      message: st,
      id: P
    };
  }
  t.error = e;
  function n(P, st) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: st,
      id: P
    };
  }
  t.settleEvent = n;
  function r(P, st) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: st,
      id: P
    };
  }
  t.settleSuccess = r;
  function i(P) {
    return P.type === "SETTLE_SUCCESS" && P.success;
  }
  t.isSettleSuccess = i;
  function o(P) {
    return P.type === "ADDRESS" && P.success === !0;
  }
  t.isAddress = o;
  function a(P, st) {
    return {
      type: "ADDRESS",
      success: !0,
      address: st,
      id: P
    };
  }
  t.address = a;
  function c(P) {
    return P.type === "BALANCE" && P.success === !0;
  }
  t.isBalance = c;
  function f(P, st) {
    return {
      type: "BALANCE",
      success: !0,
      balance: st,
      id: P
    };
  }
  t.balance = f;
  function l(P) {
    return P.type === "COINS" && P.success === !0;
  }
  t.isCoins = l;
  function p(P, st) {
    return {
      type: "COINS",
      success: !0,
      coins: st,
      id: P
    };
  }
  t.coins = p;
  function h(P) {
    return P.type === "VTXOS" && P.success === !0;
  }
  t.isVtxos = h;
  function w(P, st) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: st,
      id: P
    };
  }
  t.vtxos = w;
  function b(P) {
    return P.type === "VIRTUAL_COINS" && P.success === !0;
  }
  t.isVirtualCoins = b;
  function T(P, st) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: st,
      id: P
    };
  }
  t.virtualCoins = T;
  function x(P) {
    return P.type === "BOARDING_UTXOS" && P.success === !0;
  }
  t.isBoardingUtxos = x;
  function v(P, st) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: st,
      id: P
    };
  }
  t.boardingUtxos = v;
  function k(P) {
    return P.type === "SEND_BITCOIN_SUCCESS" && P.success === !0;
  }
  t.isSendBitcoinSuccess = k;
  function $(P, st) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: st,
      id: P
    };
  }
  t.sendBitcoinSuccess = $;
  function L(P) {
    return P.type === "TRANSACTION_HISTORY" && P.success === !0;
  }
  t.isTransactionHistory = L;
  function V(P, st) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: st,
      id: P
    };
  }
  t.transactionHistory = V;
  function Y(P) {
    return P.type === "WALLET_STATUS" && P.success === !0;
  }
  t.isWalletStatus = Y;
  function G(P, st) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: st
      },
      id: P
    };
  }
  t.walletStatus = G;
  function z(P) {
    return P.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = z;
  function J(P, st) {
    return {
      type: "CLEAR_RESPONSE",
      success: st,
      id: P
    };
  }
  t.clearResponse = J;
})(Et || (Et = {}));
var Ne;
(function(t) {
  function e(b) {
    return typeof b == "object" && b !== null && "type" in b;
  }
  t.isBase = e;
  function n(b) {
    return b.type === "INIT_WALLET" && "privateKey" in b && typeof b.privateKey == "string" && "arkServerUrl" in b && typeof b.arkServerUrl == "string" && "network" in b && typeof b.network == "string" && ("arkServerPublicKey" in b ? typeof b.arkServerPublicKey == "string" || b.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(b) {
    return b.type === "SETTLE";
  }
  t.isSettle = r;
  function i(b) {
    return b.type === "GET_ADDRESS";
  }
  t.isGetAddress = i;
  function o(b) {
    return b.type === "GET_BALANCE";
  }
  t.isGetBalance = o;
  function a(b) {
    return b.type === "GET_COINS";
  }
  t.isGetCoins = a;
  function c(b) {
    return b.type === "GET_VTXOS";
  }
  t.isGetVtxos = c;
  function f(b) {
    return b.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = f;
  function l(b) {
    return b.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = l;
  function p(b) {
    return b.type === "SEND_BITCOIN" && "params" in b && b.params !== null && typeof b.params == "object" && "address" in b.params && typeof b.params.address == "string" && "amount" in b.params && typeof b.params.amount == "number";
  }
  t.isSendBitcoin = p;
  function h(b) {
    return b.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = h;
  function w(b) {
    return b.type === "GET_STATUS";
  }
  t.isGetStatus = w;
})(Ne || (Ne = {}));
class Qt {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase(Qt.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const i = indexedDB.deleteDatabase(Qt.DB_NAME);
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
      const r = indexedDB.open(Qt.DB_NAME, Qt.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (i) => {
        const o = i.target.result;
        if (!o.objectStoreNames.contains(Qt.STORE_NAME)) {
          const a = o.createObjectStore(Qt.STORE_NAME, {
            keyPath: ["txid", "vout"]
          });
          a.createIndex("state", "virtualStatus.state", {
            unique: !1
          }), a.createIndex("spentBy", "spentBy", {
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
      const o = this.db.transaction(Qt.STORE_NAME, "readwrite").objectStore(Qt.STORE_NAME), a = e.map((c) => new Promise((f, l) => {
        const p = o.put(c);
        p.onsuccess = () => f(), p.onerror = () => l(p.error);
      }));
      Promise.all(a).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const o = this.db.transaction(Qt.STORE_NAME, "readwrite").objectStore(Qt.STORE_NAME).clear();
      o.onsuccess = () => e(), o.onerror = () => n(o.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const a = this.db.transaction(Qt.STORE_NAME, "readonly").objectStore(Qt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      a.onsuccess = () => {
        e(a.result);
      }, a.onerror = () => n(a.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const o = this.db.transaction(Qt.STORE_NAME, "readonly").objectStore(Qt.STORE_NAME).index("spentBy"), a = o.getAll(IDBKeyRange.only("")), c = o.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((f, l) => {
          a.onsuccess = () => {
            f(a.result);
          }, a.onerror = () => l(a.error);
        }),
        new Promise((f, l) => {
          c.onsuccess = () => {
            f(c.result);
          }, c.onerror = () => l(c.error);
        })
      ]).then(([f, l]) => {
        e({
          spendable: f,
          spent: l
        });
      }).catch(n);
    });
  }
}
Qt.DB_NAME = "wallet-db";
Qt.STORE_NAME = "vtxos";
Qt.DB_VERSION = 1;
class Y0 {
  constructor(e = new Qt(), n = () => {
  }) {
    this.vtxoRepository = e, this.messageCallback = n;
  }
  async start() {
    self.addEventListener("message", async (e) => {
      await this.handleMessage(e);
    });
  }
  async clear() {
    this.vtxoSubscription && this.vtxoSubscription.abort(), await this.vtxoRepository.close(), this.wallet = void 0, this.arkProvider = void 0, this.vtxoSubscription = void 0;
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    const e = await this.wallet.getAddress();
    if (!e.offchain)
      return;
    await this.vtxoRepository.open();
    const { spendableVtxos: n, spentVtxos: r } = await this.arkProvider.getVirtualCoins(e.offchain.address), i = this.wallet.offchainTapscript.encode(), o = this.wallet.offchainTapscript.forfeit(), a = [...n, ...r].map((c) => ({
      ...c,
      tapLeafScript: o,
      scripts: i
    }));
    await this.vtxoRepository.addOrUpdate(a), this.processVtxoSubscription(e.offchain);
  }
  async processVtxoSubscription({ address: e, scripts: n }) {
    try {
      const r = [...n.exit, ...n.forfeit], o = Pi.Script.decode(r).findLeaf(n.forfeit[0]), a = new AbortController(), c = this.arkProvider.subscribeForAddress(e, a.signal);
      this.vtxoSubscription = a;
      for await (const f of c) {
        const l = [...f.newVtxos, ...f.spentVtxos];
        if (l.length === 0)
          continue;
        const p = l.map((h) => ({
          ...h,
          tapLeafScript: o,
          scripts: r
        }));
        await this.vtxoRepository.addOrUpdate(p);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    var n;
    this.clear(), Ne.isBase(e.data) && ((n = e.source) == null || n.postMessage(Et.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, i, o;
    const n = e.data;
    if (!Ne.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new th(n.arkServerUrl), this.wallet = await Tn.create({
        network: n.network,
        identity: us.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (i = e.source) == null || i.postMessage(Et.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (a) {
      console.error("Error initializing wallet:", a);
      const c = a instanceof Error ? a.message : "Unknown error occurred";
      (o = e.source) == null || o.postMessage(Et.error(n.id, c));
    }
  }
  async handleSettle(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
        return;
      }
      const c = await this.wallet.settle(n.params, (f) => {
        var l;
        (l = e.source) == null || l.postMessage(Et.settleEvent(n.id, f));
      });
      (o = e.source) == null || o.postMessage(Et.settleSuccess(n.id, c));
    } catch (c) {
      console.error("Error settling:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleSendBitcoin(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (o = e.source) == null || o.postMessage(Et.sendBitcoinSuccess(n.id, c));
    } catch (c) {
      console.error("Error sending bitcoin:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetAddress(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getAddress();
      (o = e.source) == null || o.postMessage(Et.address(n.id, c));
    } catch (c) {
      console.error("Error getting address:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetBalance(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins(), f = c.filter((v) => v.status.confirmed).reduce((v, k) => v + k.value, 0), l = c.filter((v) => !v.status.confirmed).reduce((v, k) => v + k.value, 0), p = f + l, h = await this.vtxoRepository.getSpendableVtxos(), w = h.reduce((v, k) => k.virtualStatus.state === "settled" ? v + k.value : v, 0), b = h.reduce((v, k) => k.virtualStatus.state === "pending" ? v + k.value : v, 0), T = h.reduce((v, k) => k.virtualStatus.state === "swept" ? v + k.value : v, 0), x = w + b + T;
      (o = e.source) == null || o.postMessage(Et.balance(n.id, {
        onchain: {
          confirmed: f,
          unconfirmed: l,
          total: p
        },
        offchain: {
          swept: T,
          settled: w,
          pending: b,
          total: x
        },
        total: p + x
      }));
    } catch (c) {
      console.error("Error getting balance:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetCoins(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins();
      (o = e.source) == null || o.postMessage(Et.coins(n.id, c));
    } catch (c) {
      console.error("Error getting coins:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetVtxos(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.vtxoRepository.getSpendableVtxos();
      (o = e.source) == null || o.postMessage(Et.vtxos(n.id, c));
    } catch (c) {
      console.error("Error getting vtxos:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBoardingUtxos();
      (o = e.source) == null || o.postMessage(Et.boardingUtxos(n.id, c));
    } catch (c) {
      console.error("Error getting boarding utxos:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, i, o, a;
    const n = e.data;
    if (!Ne.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(Et.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: c, roundsToIgnore: f } = await this.wallet.getBoardingTxs(), { spendable: l, spent: p } = await this.vtxoRepository.getAllVtxos(), h = Jd(l, p, f), w = [...c, ...h];
      w.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (b, T) => b.createdAt === 0 ? -1 : T.createdAt === 0 ? 1 : T.createdAt - b.createdAt
      ), (o = e.source) == null || o.postMessage(Et.transactionHistory(n.id, w));
    } catch (c) {
      console.error("Error getting transaction history:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (a = e.source) == null || a.postMessage(Et.error(n.id, f));
    }
  }
  async handleGetStatus(e) {
    var r, i;
    const n = e.data;
    if (!Ne.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(Et.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (i = e.source) == null || i.postMessage(Et.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleMessage(e) {
    var r;
    this.messageCallback(e);
    const n = e.data;
    if (!Ne.isBase(n)) {
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
      case "CLEAR": {
        await this.handleClear(e);
        break;
      }
      default:
        (r = e.source) == null || r.postMessage(Et.error(n.id, "Unknown message type"));
    }
  }
}
const Z0 = (t) => {
  if (!t) return !1;
  const e = Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3), n = 60 * 60 * 24;
  return e + n > t;
};
/*!
 *  decimal.js v10.5.0
 *  An arbitrary-precision Decimal type for JavaScript.
 *  https://github.com/MikeMcl/decimal.js
 *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
 *  MIT Licence
 */
var Sc = 9e15, Qn = 1e9, Ac = "0123456789abcdef", ds = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058", hs = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789", kc = {
  // These values must be integers within the stated ranges (inclusive).
  // Most of these values can be changed at run-time using the `Decimal.config` method.
  // The maximum number of significant digits of the result of a calculation or base conversion.
  // E.g. `Decimal.config({ precision: 20 });`
  precision: 20,
  // 1 to MAX_DIGITS
  // The rounding mode used when rounding to `precision`.
  //
  // ROUND_UP         0 Away from zero.
  // ROUND_DOWN       1 Towards zero.
  // ROUND_CEIL       2 Towards +Infinity.
  // ROUND_FLOOR      3 Towards -Infinity.
  // ROUND_HALF_UP    4 Towards nearest neighbour. If equidistant, up.
  // ROUND_HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
  // ROUND_HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
  // ROUND_HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
  // ROUND_HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
  //
  // E.g.
  // `Decimal.rounding = 4;`
  // `Decimal.rounding = Decimal.ROUND_HALF_UP;`
  rounding: 4,
  // 0 to 8
  // The modulo mode used when calculating the modulus: a mod n.
  // The quotient (q = a / n) is calculated according to the corresponding rounding mode.
  // The remainder (r) is calculated as: r = a - n * q.
  //
  // UP         0 The remainder is positive if the dividend is negative, else is negative.
  // DOWN       1 The remainder has the same sign as the dividend (JavaScript %).
  // FLOOR      3 The remainder has the same sign as the divisor (Python %).
  // HALF_EVEN  6 The IEEE 754 remainder function.
  // EUCLID     9 Euclidian division. q = sign(n) * floor(a / abs(n)). Always positive.
  //
  // Truncated division (1), floored division (3), the IEEE 754 remainder (6), and Euclidian
  // division (9) are commonly used for the modulus operation. The other rounding modes can also
  // be used, but they may not give useful results.
  modulo: 1,
  // 0 to 9
  // The exponent value at and beneath which `toString` returns exponential notation.
  // JavaScript numbers: -7
  toExpNeg: -7,
  // 0 to -EXP_LIMIT
  // The exponent value at and above which `toString` returns exponential notation.
  // JavaScript numbers: 21
  toExpPos: 21,
  // 0 to EXP_LIMIT
  // The minimum exponent value, beneath which underflow to zero occurs.
  // JavaScript numbers: -324  (5e-324)
  minE: -9e15,
  // -1 to -EXP_LIMIT
  // The maximum exponent value, above which overflow to Infinity occurs.
  // JavaScript numbers: 308  (1.7976931348623157e+308)
  maxE: Sc,
  // 1 to EXP_LIMIT
  // Whether to use cryptographically-secure random number generation, if available.
  crypto: !1
  // true/false
}, rh, In, wt = !0, Us = "[DecimalError] ", Xn = Us + "Invalid argument: ", ih = Us + "Precision limit exceeded", oh = Us + "crypto unavailable", sh = "[object Decimal]", Te = Math.floor, ee = Math.pow, X0 = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, Q0 = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, J0 = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, ah = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, Je = 1e7, pt = 7, ty = 9007199254740991, ey = ds.length - 1, Tc = hs.length - 1, W = { toStringTag: sh };
W.absoluteValue = W.abs = function() {
  var t = new this.constructor(this);
  return t.s < 0 && (t.s = 1), ht(t);
};
W.ceil = function() {
  return ht(new this.constructor(this), this.e + 1, 2);
};
W.clampedTo = W.clamp = function(t, e) {
  var n, r = this, i = r.constructor;
  if (t = new i(t), e = new i(e), !t.s || !e.s) return new i(NaN);
  if (t.gt(e)) throw Error(Xn + e);
  return n = r.cmp(t), n < 0 ? t : r.cmp(e) > 0 ? e : new i(r);
};
W.comparedTo = W.cmp = function(t) {
  var e, n, r, i, o = this, a = o.d, c = (t = new o.constructor(t)).d, f = o.s, l = t.s;
  if (!a || !c)
    return !f || !l ? NaN : f !== l ? f : a === c ? 0 : !a ^ f < 0 ? 1 : -1;
  if (!a[0] || !c[0]) return a[0] ? f : c[0] ? -l : 0;
  if (f !== l) return f;
  if (o.e !== t.e) return o.e > t.e ^ f < 0 ? 1 : -1;
  for (r = a.length, i = c.length, e = 0, n = r < i ? r : i; e < n; ++e)
    if (a[e] !== c[e]) return a[e] > c[e] ^ f < 0 ? 1 : -1;
  return r === i ? 0 : r > i ^ f < 0 ? 1 : -1;
};
W.cosine = W.cos = function() {
  var t, e, n = this, r = n.constructor;
  return n.d ? n.d[0] ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + pt, r.rounding = 1, n = ny(r, dh(r, n)), r.precision = t, r.rounding = e, ht(In == 2 || In == 3 ? n.neg() : n, t, e, !0)) : new r(1) : new r(NaN);
};
W.cubeRoot = W.cbrt = function() {
  var t, e, n, r, i, o, a, c, f, l, p = this, h = p.constructor;
  if (!p.isFinite() || p.isZero()) return new h(p);
  for (wt = !1, o = p.s * ee(p.s * p, 1 / 3), !o || Math.abs(o) == 1 / 0 ? (n = ye(p.d), t = p.e, (o = (t - n.length + 1) % 3) && (n += o == 1 || o == -2 ? "0" : "00"), o = ee(n, 1 / 3), t = Te((t + 1) / 3) - (t % 3 == (t < 0 ? -1 : 2)), o == 1 / 0 ? n = "5e" + t : (n = o.toExponential(), n = n.slice(0, n.indexOf("e") + 1) + t), r = new h(n), r.s = p.s) : r = new h(o.toString()), a = (t = h.precision) + 3; ; )
    if (c = r, f = c.times(c).times(c), l = f.plus(p), r = $t(l.plus(p).times(c), l.plus(f), a + 2, 1), ye(c.d).slice(0, a) === (n = ye(r.d)).slice(0, a))
      if (n = n.slice(a - 3, a + 1), n == "9999" || !i && n == "4999") {
        if (!i && (ht(c, t + 1, 0), c.times(c).times(c).eq(p))) {
          r = c;
          break;
        }
        a += 4, i = 1;
      } else {
        (!+n || !+n.slice(1) && n.charAt(0) == "5") && (ht(r, t + 1, 1), e = !r.times(r).times(r).eq(p));
        break;
      }
  return wt = !0, ht(r, t, h.rounding, e);
};
W.decimalPlaces = W.dp = function() {
  var t, e = this.d, n = NaN;
  if (e) {
    if (t = e.length - 1, n = (t - Te(this.e / pt)) * pt, t = e[t], t) for (; t % 10 == 0; t /= 10) n--;
    n < 0 && (n = 0);
  }
  return n;
};
W.dividedBy = W.div = function(t) {
  return $t(this, new this.constructor(t));
};
W.dividedToIntegerBy = W.divToInt = function(t) {
  var e = this, n = e.constructor;
  return ht($t(e, new n(t), 0, 1, 1), n.precision, n.rounding);
};
W.equals = W.eq = function(t) {
  return this.cmp(t) === 0;
};
W.floor = function() {
  return ht(new this.constructor(this), this.e + 1, 3);
};
W.greaterThan = W.gt = function(t) {
  return this.cmp(t) > 0;
};
W.greaterThanOrEqualTo = W.gte = function(t) {
  var e = this.cmp(t);
  return e == 1 || e === 0;
};
W.hyperbolicCosine = W.cosh = function() {
  var t, e, n, r, i, o = this, a = o.constructor, c = new a(1);
  if (!o.isFinite()) return new a(o.s ? 1 / 0 : NaN);
  if (o.isZero()) return c;
  n = a.precision, r = a.rounding, a.precision = n + Math.max(o.e, o.sd()) + 4, a.rounding = 1, i = o.d.length, i < 32 ? (t = Math.ceil(i / 3), e = (1 / Os(4, t)).toString()) : (t = 16, e = "2.3283064365386962890625e-10"), o = Zr(a, 1, o.times(e), new a(1), !0);
  for (var f, l = t, p = new a(8); l--; )
    f = o.times(o), o = c.minus(f.times(p.minus(f.times(p))));
  return ht(o, a.precision = n, a.rounding = r, !0);
};
W.hyperbolicSine = W.sinh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  if (!i.isFinite() || i.isZero()) return new o(i);
  if (e = o.precision, n = o.rounding, o.precision = e + Math.max(i.e, i.sd()) + 4, o.rounding = 1, r = i.d.length, r < 3)
    i = Zr(o, 2, i, i, !0);
  else {
    t = 1.4 * Math.sqrt(r), t = t > 16 ? 16 : t | 0, i = i.times(1 / Os(5, t)), i = Zr(o, 2, i, i, !0);
    for (var a, c = new o(5), f = new o(16), l = new o(20); t--; )
      a = i.times(i), i = i.times(c.plus(a.times(f.times(a).plus(l))));
  }
  return o.precision = e, o.rounding = n, ht(i, e, n, !0);
};
W.hyperbolicTangent = W.tanh = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 7, r.rounding = 1, $t(n.sinh(), n.cosh(), r.precision = t, r.rounding = e)) : new r(n.s);
};
W.inverseCosine = W.acos = function() {
  var t = this, e = t.constructor, n = t.abs().cmp(1), r = e.precision, i = e.rounding;
  return n !== -1 ? n === 0 ? t.isNeg() ? cn(e, r, i) : new e(0) : new e(NaN) : t.isZero() ? cn(e, r + 4, i).times(0.5) : (e.precision = r + 6, e.rounding = 1, t = new e(1).minus(t).div(t.plus(1)).sqrt().atan(), e.precision = r, e.rounding = i, t.times(2));
};
W.inverseHyperbolicCosine = W.acosh = function() {
  var t, e, n = this, r = n.constructor;
  return n.lte(1) ? new r(n.eq(1) ? 0 : NaN) : n.isFinite() ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(Math.abs(n.e), n.sd()) + 4, r.rounding = 1, wt = !1, n = n.times(n).minus(1).sqrt().plus(n), wt = !0, r.precision = t, r.rounding = e, n.ln()) : new r(n);
};
W.inverseHyperbolicSine = W.asinh = function() {
  var t, e, n = this, r = n.constructor;
  return !n.isFinite() || n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 2 * Math.max(Math.abs(n.e), n.sd()) + 6, r.rounding = 1, wt = !1, n = n.times(n).plus(1).sqrt().plus(n), wt = !0, r.precision = t, r.rounding = e, n.ln());
};
W.inverseHyperbolicTangent = W.atanh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isFinite() ? i.e >= 0 ? new o(i.abs().eq(1) ? i.s / 0 : i.isZero() ? i : NaN) : (t = o.precision, e = o.rounding, r = i.sd(), Math.max(r, t) < 2 * -i.e - 1 ? ht(new o(i), t, e, !0) : (o.precision = n = r - i.e, i = $t(i.plus(1), new o(1).minus(i), n + t, 1), o.precision = t + 4, o.rounding = 1, i = i.ln(), o.precision = t, o.rounding = e, i.times(0.5))) : new o(NaN);
};
W.inverseSine = W.asin = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isZero() ? new o(i) : (e = i.abs().cmp(1), n = o.precision, r = o.rounding, e !== -1 ? e === 0 ? (t = cn(o, n + 4, r).times(0.5), t.s = i.s, t) : new o(NaN) : (o.precision = n + 6, o.rounding = 1, i = i.div(new o(1).minus(i.times(i)).sqrt().plus(1)).atan(), o.precision = n, o.rounding = r, i.times(2)));
};
W.inverseTangent = W.atan = function() {
  var t, e, n, r, i, o, a, c, f, l = this, p = l.constructor, h = p.precision, w = p.rounding;
  if (l.isFinite()) {
    if (l.isZero())
      return new p(l);
    if (l.abs().eq(1) && h + 4 <= Tc)
      return a = cn(p, h + 4, w).times(0.25), a.s = l.s, a;
  } else {
    if (!l.s) return new p(NaN);
    if (h + 4 <= Tc)
      return a = cn(p, h + 4, w).times(0.5), a.s = l.s, a;
  }
  for (p.precision = c = h + 10, p.rounding = 1, n = Math.min(28, c / pt + 2 | 0), t = n; t; --t) l = l.div(l.times(l).plus(1).sqrt().plus(1));
  for (wt = !1, e = Math.ceil(c / pt), r = 1, f = l.times(l), a = new p(l), i = l; t !== -1; )
    if (i = i.times(f), o = a.minus(i.div(r += 2)), i = i.times(f), a = o.plus(i.div(r += 2)), a.d[e] !== void 0) for (t = e; a.d[t] === o.d[t] && t--; ) ;
  return n && (a = a.times(2 << n - 1)), wt = !0, ht(a, p.precision = h, p.rounding = w, !0);
};
W.isFinite = function() {
  return !!this.d;
};
W.isInteger = W.isInt = function() {
  return !!this.d && Te(this.e / pt) > this.d.length - 2;
};
W.isNaN = function() {
  return !this.s;
};
W.isNegative = W.isNeg = function() {
  return this.s < 0;
};
W.isPositive = W.isPos = function() {
  return this.s > 0;
};
W.isZero = function() {
  return !!this.d && this.d[0] === 0;
};
W.lessThan = W.lt = function(t) {
  return this.cmp(t) < 0;
};
W.lessThanOrEqualTo = W.lte = function(t) {
  return this.cmp(t) < 1;
};
W.logarithm = W.log = function(t) {
  var e, n, r, i, o, a, c, f, l = this, p = l.constructor, h = p.precision, w = p.rounding, b = 5;
  if (t == null)
    t = new p(10), e = !0;
  else {
    if (t = new p(t), n = t.d, t.s < 0 || !n || !n[0] || t.eq(1)) return new p(NaN);
    e = t.eq(10);
  }
  if (n = l.d, l.s < 0 || !n || !n[0] || l.eq(1))
    return new p(n && !n[0] ? -1 / 0 : l.s != 1 ? NaN : n ? 0 : 1 / 0);
  if (e)
    if (n.length > 1)
      o = !0;
    else {
      for (i = n[0]; i % 10 === 0; ) i /= 10;
      o = i !== 1;
    }
  if (wt = !1, c = h + b, a = jn(l, c), r = e ? ps(p, c + 10) : jn(t, c), f = $t(a, r, c, 1), Di(f.d, i = h, w))
    do
      if (c += 10, a = jn(l, c), r = e ? ps(p, c + 10) : jn(t, c), f = $t(a, r, c, 1), !o) {
        +ye(f.d).slice(i + 1, i + 15) + 1 == 1e14 && (f = ht(f, h + 1, 0));
        break;
      }
    while (Di(f.d, i += 10, w));
  return wt = !0, ht(f, h, w);
};
W.minus = W.sub = function(t) {
  var e, n, r, i, o, a, c, f, l, p, h, w, b = this, T = b.constructor;
  if (t = new T(t), !b.d || !t.d)
    return !b.s || !t.s ? t = new T(NaN) : b.d ? t.s = -t.s : t = new T(t.d || b.s !== t.s ? b : NaN), t;
  if (b.s != t.s)
    return t.s = -t.s, b.plus(t);
  if (l = b.d, w = t.d, c = T.precision, f = T.rounding, !l[0] || !w[0]) {
    if (w[0]) t.s = -t.s;
    else if (l[0]) t = new T(b);
    else return new T(f === 3 ? -0 : 0);
    return wt ? ht(t, c, f) : t;
  }
  if (n = Te(t.e / pt), p = Te(b.e / pt), l = l.slice(), o = p - n, o) {
    for (h = o < 0, h ? (e = l, o = -o, a = w.length) : (e = w, n = p, a = l.length), r = Math.max(Math.ceil(c / pt), a) + 2, o > r && (o = r, e.length = 1), e.reverse(), r = o; r--; ) e.push(0);
    e.reverse();
  } else {
    for (r = l.length, a = w.length, h = r < a, h && (a = r), r = 0; r < a; r++)
      if (l[r] != w[r]) {
        h = l[r] < w[r];
        break;
      }
    o = 0;
  }
  for (h && (e = l, l = w, w = e, t.s = -t.s), a = l.length, r = w.length - a; r > 0; --r) l[a++] = 0;
  for (r = w.length; r > o; ) {
    if (l[--r] < w[r]) {
      for (i = r; i && l[--i] === 0; ) l[i] = Je - 1;
      --l[i], l[r] += Je;
    }
    l[r] -= w[r];
  }
  for (; l[--a] === 0; ) l.pop();
  for (; l[0] === 0; l.shift()) --n;
  return l[0] ? (t.d = l, t.e = $s(l, n), wt ? ht(t, c, f) : t) : new T(f === 3 ? -0 : 0);
};
W.modulo = W.mod = function(t) {
  var e, n = this, r = n.constructor;
  return t = new r(t), !n.d || !t.s || t.d && !t.d[0] ? new r(NaN) : !t.d || n.d && !n.d[0] ? ht(new r(n), r.precision, r.rounding) : (wt = !1, r.modulo == 9 ? (e = $t(n, t.abs(), 0, 3, 1), e.s *= t.s) : e = $t(n, t, 0, r.modulo, 1), e = e.times(t), wt = !0, n.minus(e));
};
W.naturalExponential = W.exp = function() {
  return Ic(this);
};
W.naturalLogarithm = W.ln = function() {
  return jn(this);
};
W.negated = W.neg = function() {
  var t = new this.constructor(this);
  return t.s = -t.s, ht(t);
};
W.plus = W.add = function(t) {
  var e, n, r, i, o, a, c, f, l, p, h = this, w = h.constructor;
  if (t = new w(t), !h.d || !t.d)
    return !h.s || !t.s ? t = new w(NaN) : h.d || (t = new w(t.d || h.s === t.s ? h : NaN)), t;
  if (h.s != t.s)
    return t.s = -t.s, h.minus(t);
  if (l = h.d, p = t.d, c = w.precision, f = w.rounding, !l[0] || !p[0])
    return p[0] || (t = new w(h)), wt ? ht(t, c, f) : t;
  if (o = Te(h.e / pt), r = Te(t.e / pt), l = l.slice(), i = o - r, i) {
    for (i < 0 ? (n = l, i = -i, a = p.length) : (n = p, r = o, a = l.length), o = Math.ceil(c / pt), a = o > a ? o + 1 : a + 1, i > a && (i = a, n.length = 1), n.reverse(); i--; ) n.push(0);
    n.reverse();
  }
  for (a = l.length, i = p.length, a - i < 0 && (i = a, n = p, p = l, l = n), e = 0; i; )
    e = (l[--i] = l[i] + p[i] + e) / Je | 0, l[i] %= Je;
  for (e && (l.unshift(e), ++r), a = l.length; l[--a] == 0; ) l.pop();
  return t.d = l, t.e = $s(l, r), wt ? ht(t, c, f) : t;
};
W.precision = W.sd = function(t) {
  var e, n = this;
  if (t !== void 0 && t !== !!t && t !== 1 && t !== 0) throw Error(Xn + t);
  return n.d ? (e = ch(n.d), t && n.e + 1 > e && (e = n.e + 1)) : e = NaN, e;
};
W.round = function() {
  var t = this, e = t.constructor;
  return ht(new e(t), t.e + 1, e.rounding);
};
W.sine = W.sin = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + pt, r.rounding = 1, n = iy(r, dh(r, n)), r.precision = t, r.rounding = e, ht(In > 2 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
W.squareRoot = W.sqrt = function() {
  var t, e, n, r, i, o, a = this, c = a.d, f = a.e, l = a.s, p = a.constructor;
  if (l !== 1 || !c || !c[0])
    return new p(!l || l < 0 && (!c || c[0]) ? NaN : c ? a : 1 / 0);
  for (wt = !1, l = Math.sqrt(+a), l == 0 || l == 1 / 0 ? (e = ye(c), (e.length + f) % 2 == 0 && (e += "0"), l = Math.sqrt(e), f = Te((f + 1) / 2) - (f < 0 || f % 2), l == 1 / 0 ? e = "5e" + f : (e = l.toExponential(), e = e.slice(0, e.indexOf("e") + 1) + f), r = new p(e)) : r = new p(l.toString()), n = (f = p.precision) + 3; ; )
    if (o = r, r = o.plus($t(a, o, n + 2, 1)).times(0.5), ye(o.d).slice(0, n) === (e = ye(r.d)).slice(0, n))
      if (e = e.slice(n - 3, n + 1), e == "9999" || !i && e == "4999") {
        if (!i && (ht(o, f + 1, 0), o.times(o).eq(a))) {
          r = o;
          break;
        }
        n += 4, i = 1;
      } else {
        (!+e || !+e.slice(1) && e.charAt(0) == "5") && (ht(r, f + 1, 1), t = !r.times(r).eq(a));
        break;
      }
  return wt = !0, ht(r, f, p.rounding, t);
};
W.tangent = W.tan = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 10, r.rounding = 1, n = n.sin(), n.s = 1, n = $t(n, new r(1).minus(n.times(n)).sqrt(), t + 10, 0), r.precision = t, r.rounding = e, ht(In == 2 || In == 4 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
W.times = W.mul = function(t) {
  var e, n, r, i, o, a, c, f, l, p = this, h = p.constructor, w = p.d, b = (t = new h(t)).d;
  if (t.s *= p.s, !w || !w[0] || !b || !b[0])
    return new h(!t.s || w && !w[0] && !b || b && !b[0] && !w ? NaN : !w || !b ? t.s / 0 : t.s * 0);
  for (n = Te(p.e / pt) + Te(t.e / pt), f = w.length, l = b.length, f < l && (o = w, w = b, b = o, a = f, f = l, l = a), o = [], a = f + l, r = a; r--; ) o.push(0);
  for (r = l; --r >= 0; ) {
    for (e = 0, i = f + r; i > r; )
      c = o[i] + b[r] * w[i - r - 1] + e, o[i--] = c % Je | 0, e = c / Je | 0;
    o[i] = (o[i] + e) % Je | 0;
  }
  for (; !o[--a]; ) o.pop();
  return e ? ++n : o.shift(), t.d = o, t.e = $s(o, n), wt ? ht(t, h.precision, h.rounding) : t;
};
W.toBinary = function(t, e) {
  return vu(this, 2, t, e);
};
W.toDecimalPlaces = W.toDP = function(t, e) {
  var n = this, r = n.constructor;
  return n = new r(n), t === void 0 ? n : (Re(t, 0, Qn), e === void 0 ? e = r.rounding : Re(e, 0, 8), ht(n, t + n.e + 1, e));
};
W.toExponential = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = gn(r, !0) : (Re(t, 0, Qn), e === void 0 ? e = i.rounding : Re(e, 0, 8), r = ht(new i(r), t + 1, e), n = gn(r, !0, t + 1)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
W.toFixed = function(t, e) {
  var n, r, i = this, o = i.constructor;
  return t === void 0 ? n = gn(i) : (Re(t, 0, Qn), e === void 0 ? e = o.rounding : Re(e, 0, 8), r = ht(new o(i), t + i.e + 1, e), n = gn(r, !1, t + r.e + 1)), i.isNeg() && !i.isZero() ? "-" + n : n;
};
W.toFraction = function(t) {
  var e, n, r, i, o, a, c, f, l, p, h, w, b = this, T = b.d, x = b.constructor;
  if (!T) return new x(b);
  if (l = n = new x(1), r = f = new x(0), e = new x(r), o = e.e = ch(T) - b.e - 1, a = o % pt, e.d[0] = ee(10, a < 0 ? pt + a : a), t == null)
    t = o > 0 ? e : l;
  else {
    if (c = new x(t), !c.isInt() || c.lt(l)) throw Error(Xn + c);
    t = c.gt(e) ? o > 0 ? e : l : c;
  }
  for (wt = !1, c = new x(ye(T)), p = x.precision, x.precision = o = T.length * pt * 2; h = $t(c, e, 0, 1, 1), i = n.plus(h.times(r)), i.cmp(t) != 1; )
    n = r, r = i, i = l, l = f.plus(h.times(i)), f = i, i = e, e = c.minus(h.times(i)), c = i;
  return i = $t(t.minus(n), r, 0, 1, 1), f = f.plus(i.times(l)), n = n.plus(i.times(r)), f.s = l.s = b.s, w = $t(l, r, o, 1).minus(b).abs().cmp($t(f, n, o, 1).minus(b).abs()) < 1 ? [l, r] : [f, n], x.precision = p, wt = !0, w;
};
W.toHexadecimal = W.toHex = function(t, e) {
  return vu(this, 16, t, e);
};
W.toNearest = function(t, e) {
  var n = this, r = n.constructor;
  if (n = new r(n), t == null) {
    if (!n.d) return n;
    t = new r(1), e = r.rounding;
  } else {
    if (t = new r(t), e === void 0 ? e = r.rounding : Re(e, 0, 8), !n.d) return t.s ? n : t;
    if (!t.d)
      return t.s && (t.s = n.s), t;
  }
  return t.d[0] ? (wt = !1, n = $t(n, t, 0, e, 1).times(t), wt = !0, ht(n)) : (t.s = n.s, n = t), n;
};
W.toNumber = function() {
  return +this;
};
W.toOctal = function(t, e) {
  return vu(this, 8, t, e);
};
W.toPower = W.pow = function(t) {
  var e, n, r, i, o, a, c = this, f = c.constructor, l = +(t = new f(t));
  if (!c.d || !t.d || !c.d[0] || !t.d[0]) return new f(ee(+c, l));
  if (c = new f(c), c.eq(1)) return c;
  if (r = f.precision, o = f.rounding, t.eq(1)) return ht(c, r, o);
  if (e = Te(t.e / pt), e >= t.d.length - 1 && (n = l < 0 ? -l : l) <= ty)
    return i = uh(f, c, n, r), t.s < 0 ? new f(1).div(i) : ht(i, r, o);
  if (a = c.s, a < 0) {
    if (e < t.d.length - 1) return new f(NaN);
    if ((t.d[e] & 1) == 0 && (a = 1), c.e == 0 && c.d[0] == 1 && c.d.length == 1)
      return c.s = a, c;
  }
  return n = ee(+c, l), e = n == 0 || !isFinite(n) ? Te(l * (Math.log("0." + ye(c.d)) / Math.LN10 + c.e + 1)) : new f(n + "").e, e > f.maxE + 1 || e < f.minE - 1 ? new f(e > 0 ? a / 0 : 0) : (wt = !1, f.rounding = c.s = 1, n = Math.min(12, (e + "").length), i = Ic(t.times(jn(c, r + n)), r), i.d && (i = ht(i, r + 5, 1), Di(i.d, r, o) && (e = r + 10, i = ht(Ic(t.times(jn(c, e + n)), e), e + 5, 1), +ye(i.d).slice(r + 1, r + 15) + 1 == 1e14 && (i = ht(i, r + 1, 0)))), i.s = a, wt = !0, f.rounding = o, ht(i, r, o));
};
W.toPrecision = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = gn(r, r.e <= i.toExpNeg || r.e >= i.toExpPos) : (Re(t, 1, Qn), e === void 0 ? e = i.rounding : Re(e, 0, 8), r = ht(new i(r), t, e), n = gn(r, t <= r.e || r.e <= i.toExpNeg, t)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
W.toSignificantDigits = W.toSD = function(t, e) {
  var n = this, r = n.constructor;
  return t === void 0 ? (t = r.precision, e = r.rounding) : (Re(t, 1, Qn), e === void 0 ? e = r.rounding : Re(e, 0, 8)), ht(new r(n), t, e);
};
W.toString = function() {
  var t = this, e = t.constructor, n = gn(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() && !t.isZero() ? "-" + n : n;
};
W.truncated = W.trunc = function() {
  return ht(new this.constructor(this), this.e + 1, 1);
};
W.valueOf = W.toJSON = function() {
  var t = this, e = t.constructor, n = gn(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() ? "-" + n : n;
};
function ye(t) {
  var e, n, r, i = t.length - 1, o = "", a = t[0];
  if (i > 0) {
    for (o += a, e = 1; e < i; e++)
      r = t[e] + "", n = pt - r.length, n && (o += Fn(n)), o += r;
    a = t[e], r = a + "", n = pt - r.length, n && (o += Fn(n));
  } else if (a === 0)
    return "0";
  for (; a % 10 === 0; ) a /= 10;
  return o + a;
}
function Re(t, e, n) {
  if (t !== ~~t || t < e || t > n)
    throw Error(Xn + t);
}
function Di(t, e, n, r) {
  var i, o, a, c;
  for (o = t[0]; o >= 10; o /= 10) --e;
  return --e < 0 ? (e += pt, i = 0) : (i = Math.ceil((e + 1) / pt), e %= pt), o = ee(10, pt - e), c = t[i] % o | 0, r == null ? e < 3 ? (e == 0 ? c = c / 100 | 0 : e == 1 && (c = c / 10 | 0), a = n < 4 && c == 99999 || n > 3 && c == 49999 || c == 5e4 || c == 0) : a = (n < 4 && c + 1 == o || n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 100 | 0) == ee(10, e - 2) - 1 || (c == o / 2 || c == 0) && (t[i + 1] / o / 100 | 0) == 0 : e < 4 ? (e == 0 ? c = c / 1e3 | 0 : e == 1 ? c = c / 100 | 0 : e == 2 && (c = c / 10 | 0), a = (r || n < 4) && c == 9999 || !r && n > 3 && c == 4999) : a = ((r || n < 4) && c + 1 == o || !r && n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 1e3 | 0) == ee(10, e - 3) - 1, a;
}
function Ko(t, e, n) {
  for (var r, i = [0], o, a = 0, c = t.length; a < c; ) {
    for (o = i.length; o--; ) i[o] *= e;
    for (i[0] += Ac.indexOf(t.charAt(a++)), r = 0; r < i.length; r++)
      i[r] > n - 1 && (i[r + 1] === void 0 && (i[r + 1] = 0), i[r + 1] += i[r] / n | 0, i[r] %= n);
  }
  return i.reverse();
}
function ny(t, e) {
  var n, r, i;
  if (e.isZero()) return e;
  r = e.d.length, r < 32 ? (n = Math.ceil(r / 3), i = (1 / Os(4, n)).toString()) : (n = 16, i = "2.3283064365386962890625e-10"), t.precision += n, e = Zr(t, 1, e.times(i), new t(1));
  for (var o = n; o--; ) {
    var a = e.times(e);
    e = a.times(a).minus(a).times(8).plus(1);
  }
  return t.precision -= n, e;
}
var $t = /* @__PURE__ */ function() {
  function t(r, i, o) {
    var a, c = 0, f = r.length;
    for (r = r.slice(); f--; )
      a = r[f] * i + c, r[f] = a % o | 0, c = a / o | 0;
    return c && r.unshift(c), r;
  }
  function e(r, i, o, a) {
    var c, f;
    if (o != a)
      f = o > a ? 1 : -1;
    else
      for (c = f = 0; c < o; c++)
        if (r[c] != i[c]) {
          f = r[c] > i[c] ? 1 : -1;
          break;
        }
    return f;
  }
  function n(r, i, o, a) {
    for (var c = 0; o--; )
      r[o] -= c, c = r[o] < i[o] ? 1 : 0, r[o] = c * a + r[o] - i[o];
    for (; !r[0] && r.length > 1; ) r.shift();
  }
  return function(r, i, o, a, c, f) {
    var l, p, h, w, b, T, x, v, k, $, L, V, Y, G, z, J, P, st, ft, at, xt = r.constructor, q = r.s == i.s ? 1 : -1, H = r.d, D = i.d;
    if (!H || !H[0] || !D || !D[0])
      return new xt(
        // Return NaN if either NaN, or both Infinity or 0.
        !r.s || !i.s || (H ? D && H[0] == D[0] : !D) ? NaN : (
          // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
          H && H[0] == 0 || !D ? q * 0 : q / 0
        )
      );
    for (f ? (b = 1, p = r.e - i.e) : (f = Je, b = pt, p = Te(r.e / b) - Te(i.e / b)), ft = D.length, P = H.length, k = new xt(q), $ = k.d = [], h = 0; D[h] == (H[h] || 0); h++) ;
    if (D[h] > (H[h] || 0) && p--, o == null ? (G = o = xt.precision, a = xt.rounding) : c ? G = o + (r.e - i.e) + 1 : G = o, G < 0)
      $.push(1), T = !0;
    else {
      if (G = G / b + 2 | 0, h = 0, ft == 1) {
        for (w = 0, D = D[0], G++; (h < P || w) && G--; h++)
          z = w * f + (H[h] || 0), $[h] = z / D | 0, w = z % D | 0;
        T = w || h < P;
      } else {
        for (w = f / (D[0] + 1) | 0, w > 1 && (D = t(D, w, f), H = t(H, w, f), ft = D.length, P = H.length), J = ft, L = H.slice(0, ft), V = L.length; V < ft; ) L[V++] = 0;
        at = D.slice(), at.unshift(0), st = D[0], D[1] >= f / 2 && ++st;
        do
          w = 0, l = e(D, L, ft, V), l < 0 ? (Y = L[0], ft != V && (Y = Y * f + (L[1] || 0)), w = Y / st | 0, w > 1 ? (w >= f && (w = f - 1), x = t(D, w, f), v = x.length, V = L.length, l = e(x, L, v, V), l == 1 && (w--, n(x, ft < v ? at : D, v, f))) : (w == 0 && (l = w = 1), x = D.slice()), v = x.length, v < V && x.unshift(0), n(L, x, V, f), l == -1 && (V = L.length, l = e(D, L, ft, V), l < 1 && (w++, n(L, ft < V ? at : D, V, f))), V = L.length) : l === 0 && (w++, L = [0]), $[h++] = w, l && L[0] ? L[V++] = H[J] || 0 : (L = [H[J]], V = 1);
        while ((J++ < P || L[0] !== void 0) && G--);
        T = L[0] !== void 0;
      }
      $[0] || $.shift();
    }
    if (b == 1)
      k.e = p, rh = T;
    else {
      for (h = 1, w = $[0]; w >= 10; w /= 10) h++;
      k.e = h + p * b - 1, ht(k, c ? o + k.e + 1 : o, a, T);
    }
    return k;
  };
}();
function ht(t, e, n, r) {
  var i, o, a, c, f, l, p, h, w, b = t.constructor;
  t: if (e != null) {
    if (h = t.d, !h) return t;
    for (i = 1, c = h[0]; c >= 10; c /= 10) i++;
    if (o = e - i, o < 0)
      o += pt, a = e, p = h[w = 0], f = p / ee(10, i - a - 1) % 10 | 0;
    else if (w = Math.ceil((o + 1) / pt), c = h.length, w >= c)
      if (r) {
        for (; c++ <= w; ) h.push(0);
        p = f = 0, i = 1, o %= pt, a = o - pt + 1;
      } else
        break t;
    else {
      for (p = c = h[w], i = 1; c >= 10; c /= 10) i++;
      o %= pt, a = o - pt + i, f = a < 0 ? 0 : p / ee(10, i - a - 1) % 10 | 0;
    }
    if (r = r || e < 0 || h[w + 1] !== void 0 || (a < 0 ? p : p % ee(10, i - a - 1)), l = n < 4 ? (f || r) && (n == 0 || n == (t.s < 0 ? 3 : 2)) : f > 5 || f == 5 && (n == 4 || r || n == 6 && // Check whether the digit to the left of the rounding digit is odd.
    (o > 0 ? a > 0 ? p / ee(10, i - a) : 0 : h[w - 1]) % 10 & 1 || n == (t.s < 0 ? 8 : 7)), e < 1 || !h[0])
      return h.length = 0, l ? (e -= t.e + 1, h[0] = ee(10, (pt - e % pt) % pt), t.e = -e || 0) : h[0] = t.e = 0, t;
    if (o == 0 ? (h.length = w, c = 1, w--) : (h.length = w + 1, c = ee(10, pt - o), h[w] = a > 0 ? (p / ee(10, i - a) % ee(10, a) | 0) * c : 0), l)
      for (; ; )
        if (w == 0) {
          for (o = 1, a = h[0]; a >= 10; a /= 10) o++;
          for (a = h[0] += c, c = 1; a >= 10; a /= 10) c++;
          o != c && (t.e++, h[0] == Je && (h[0] = 1));
          break;
        } else {
          if (h[w] += c, h[w] != Je) break;
          h[w--] = 0, c = 1;
        }
    for (o = h.length; h[--o] === 0; ) h.pop();
  }
  return wt && (t.e > b.maxE ? (t.d = null, t.e = NaN) : t.e < b.minE && (t.e = 0, t.d = [0])), t;
}
function gn(t, e, n) {
  if (!t.isFinite()) return lh(t);
  var r, i = t.e, o = ye(t.d), a = o.length;
  return e ? (n && (r = n - a) > 0 ? o = o.charAt(0) + "." + o.slice(1) + Fn(r) : a > 1 && (o = o.charAt(0) + "." + o.slice(1)), o = o + (t.e < 0 ? "e" : "e+") + t.e) : i < 0 ? (o = "0." + Fn(-i - 1) + o, n && (r = n - a) > 0 && (o += Fn(r))) : i >= a ? (o += Fn(i + 1 - a), n && (r = n - i - 1) > 0 && (o = o + "." + Fn(r))) : ((r = i + 1) < a && (o = o.slice(0, r) + "." + o.slice(r)), n && (r = n - a) > 0 && (i + 1 === a && (o += "."), o += Fn(r))), o;
}
function $s(t, e) {
  var n = t[0];
  for (e *= pt; n >= 10; n /= 10) e++;
  return e;
}
function ps(t, e, n) {
  if (e > ey)
    throw wt = !0, n && (t.precision = n), Error(ih);
  return ht(new t(ds), e, 1, !0);
}
function cn(t, e, n) {
  if (e > Tc) throw Error(ih);
  return ht(new t(hs), e, n, !0);
}
function ch(t) {
  var e = t.length - 1, n = e * pt + 1;
  if (e = t[e], e) {
    for (; e % 10 == 0; e /= 10) n--;
    for (e = t[0]; e >= 10; e /= 10) n++;
  }
  return n;
}
function Fn(t) {
  for (var e = ""; t--; ) e += "0";
  return e;
}
function uh(t, e, n, r) {
  var i, o = new t(1), a = Math.ceil(r / pt + 4);
  for (wt = !1; ; ) {
    if (n % 2 && (o = o.times(e), gl(o.d, a) && (i = !0)), n = Te(n / 2), n === 0) {
      n = o.d.length - 1, i && o.d[n] === 0 && ++o.d[n];
      break;
    }
    e = e.times(e), gl(e.d, a);
  }
  return wt = !0, o;
}
function pl(t) {
  return t.d[t.d.length - 1] & 1;
}
function fh(t, e, n) {
  for (var r, i, o = new t(e[0]), a = 0; ++a < e.length; ) {
    if (i = new t(e[a]), !i.s) {
      o = i;
      break;
    }
    r = o.cmp(i), (r === n || r === 0 && o.s === n) && (o = i);
  }
  return o;
}
function Ic(t, e) {
  var n, r, i, o, a, c, f, l = 0, p = 0, h = 0, w = t.constructor, b = w.rounding, T = w.precision;
  if (!t.d || !t.d[0] || t.e > 17)
    return new w(t.d ? t.d[0] ? t.s < 0 ? 0 : 1 / 0 : 1 : t.s ? t.s < 0 ? 0 : t : NaN);
  for (e == null ? (wt = !1, f = T) : f = e, c = new w(0.03125); t.e > -2; )
    t = t.times(c), h += 5;
  for (r = Math.log(ee(2, h)) / Math.LN10 * 2 + 5 | 0, f += r, n = o = a = new w(1), w.precision = f; ; ) {
    if (o = ht(o.times(t), f, 1), n = n.times(++p), c = a.plus($t(o, n, f, 1)), ye(c.d).slice(0, f) === ye(a.d).slice(0, f)) {
      for (i = h; i--; ) a = ht(a.times(a), f, 1);
      if (e == null)
        if (l < 3 && Di(a.d, f - r, b, l))
          w.precision = f += 10, n = o = c = new w(1), p = 0, l++;
        else
          return ht(a, w.precision = T, b, wt = !0);
      else
        return w.precision = T, a;
    }
    a = c;
  }
}
function jn(t, e) {
  var n, r, i, o, a, c, f, l, p, h, w, b = 1, T = 10, x = t, v = x.d, k = x.constructor, $ = k.rounding, L = k.precision;
  if (x.s < 0 || !v || !v[0] || !x.e && v[0] == 1 && v.length == 1)
    return new k(v && !v[0] ? -1 / 0 : x.s != 1 ? NaN : v ? 0 : x);
  if (e == null ? (wt = !1, p = L) : p = e, k.precision = p += T, n = ye(v), r = n.charAt(0), Math.abs(o = x.e) < 15e14) {
    for (; r < 7 && r != 1 || r == 1 && n.charAt(1) > 3; )
      x = x.times(t), n = ye(x.d), r = n.charAt(0), b++;
    o = x.e, r > 1 ? (x = new k("0." + n), o++) : x = new k(r + "." + n.slice(1));
  } else
    return l = ps(k, p + 2, L).times(o + ""), x = jn(new k(r + "." + n.slice(1)), p - T).plus(l), k.precision = L, e == null ? ht(x, L, $, wt = !0) : x;
  for (h = x, f = a = x = $t(x.minus(1), x.plus(1), p, 1), w = ht(x.times(x), p, 1), i = 3; ; ) {
    if (a = ht(a.times(w), p, 1), l = f.plus($t(a, new k(i), p, 1)), ye(l.d).slice(0, p) === ye(f.d).slice(0, p))
      if (f = f.times(2), o !== 0 && (f = f.plus(ps(k, p + 2, L).times(o + ""))), f = $t(f, new k(b), p, 1), e == null)
        if (Di(f.d, p - T, $, c))
          k.precision = p += T, l = a = x = $t(h.minus(1), h.plus(1), p, 1), w = ht(x.times(x), p, 1), i = c = 1;
        else
          return ht(f, k.precision = L, $, wt = !0);
      else
        return k.precision = L, f;
    f = l, i += 2;
  }
}
function lh(t) {
  return String(t.s * t.s / 0);
}
function Do(t, e) {
  var n, r, i;
  for ((n = e.indexOf(".")) > -1 && (e = e.replace(".", "")), (r = e.search(/e/i)) > 0 ? (n < 0 && (n = r), n += +e.slice(r + 1), e = e.substring(0, r)) : n < 0 && (n = e.length), r = 0; e.charCodeAt(r) === 48; r++) ;
  for (i = e.length; e.charCodeAt(i - 1) === 48; --i) ;
  if (e = e.slice(r, i), e) {
    if (i -= r, t.e = n = n - r - 1, t.d = [], r = (n + 1) % pt, n < 0 && (r += pt), r < i) {
      for (r && t.d.push(+e.slice(0, r)), i -= pt; r < i; ) t.d.push(+e.slice(r, r += pt));
      e = e.slice(r), r = pt - e.length;
    } else
      r -= i;
    for (; r--; ) e += "0";
    t.d.push(+e), wt && (t.e > t.constructor.maxE ? (t.d = null, t.e = NaN) : t.e < t.constructor.minE && (t.e = 0, t.d = [0]));
  } else
    t.e = 0, t.d = [0];
  return t;
}
function ry(t, e) {
  var n, r, i, o, a, c, f, l, p;
  if (e.indexOf("_") > -1) {
    if (e = e.replace(/(\d)_(?=\d)/g, "$1"), ah.test(e)) return Do(t, e);
  } else if (e === "Infinity" || e === "NaN")
    return +e || (t.s = NaN), t.e = NaN, t.d = null, t;
  if (Q0.test(e))
    n = 16, e = e.toLowerCase();
  else if (X0.test(e))
    n = 2;
  else if (J0.test(e))
    n = 8;
  else
    throw Error(Xn + e);
  for (o = e.search(/p/i), o > 0 ? (f = +e.slice(o + 1), e = e.substring(2, o)) : e = e.slice(2), o = e.indexOf("."), a = o >= 0, r = t.constructor, a && (e = e.replace(".", ""), c = e.length, o = c - o, i = uh(r, new r(n), o, o * 2)), l = Ko(e, n, Je), p = l.length - 1, o = p; l[o] === 0; --o) l.pop();
  return o < 0 ? new r(t.s * 0) : (t.e = $s(l, p), t.d = l, wt = !1, a && (t = $t(t, i, c * 4)), f && (t = t.times(Math.abs(f) < 54 ? ee(2, f) : Rs.pow(2, f))), wt = !0, t);
}
function iy(t, e) {
  var n, r = e.d.length;
  if (r < 3)
    return e.isZero() ? e : Zr(t, 2, e, e);
  n = 1.4 * Math.sqrt(r), n = n > 16 ? 16 : n | 0, e = e.times(1 / Os(5, n)), e = Zr(t, 2, e, e);
  for (var i, o = new t(5), a = new t(16), c = new t(20); n--; )
    i = e.times(e), e = e.times(o.plus(i.times(a.times(i).minus(c))));
  return e;
}
function Zr(t, e, n, r, i) {
  var o, a, c, f, l = t.precision, p = Math.ceil(l / pt);
  for (wt = !1, f = n.times(n), c = new t(r); ; ) {
    if (a = $t(c.times(f), new t(e++ * e++), l, 1), c = i ? r.plus(a) : r.minus(a), r = $t(a.times(f), new t(e++ * e++), l, 1), a = c.plus(r), a.d[p] !== void 0) {
      for (o = p; a.d[o] === c.d[o] && o--; ) ;
      if (o == -1) break;
    }
    o = c, c = r, r = a, a = o;
  }
  return wt = !0, a.d.length = p + 1, a;
}
function Os(t, e) {
  for (var n = t; --e; ) n *= t;
  return n;
}
function dh(t, e) {
  var n, r = e.s < 0, i = cn(t, t.precision, 1), o = i.times(0.5);
  if (e = e.abs(), e.lte(o))
    return In = r ? 4 : 1, e;
  if (n = e.divToInt(i), n.isZero())
    In = r ? 3 : 2;
  else {
    if (e = e.minus(n.times(i)), e.lte(o))
      return In = pl(n) ? r ? 2 : 3 : r ? 4 : 1, e;
    In = pl(n) ? r ? 1 : 4 : r ? 3 : 2;
  }
  return e.minus(i).abs();
}
function vu(t, e, n, r) {
  var i, o, a, c, f, l, p, h, w, b = t.constructor, T = n !== void 0;
  if (T ? (Re(n, 1, Qn), r === void 0 ? r = b.rounding : Re(r, 0, 8)) : (n = b.precision, r = b.rounding), !t.isFinite())
    p = lh(t);
  else {
    for (p = gn(t), a = p.indexOf("."), T ? (i = 2, e == 16 ? n = n * 4 - 3 : e == 8 && (n = n * 3 - 2)) : i = e, a >= 0 && (p = p.replace(".", ""), w = new b(1), w.e = p.length - a, w.d = Ko(gn(w), 10, i), w.e = w.d.length), h = Ko(p, 10, i), o = f = h.length; h[--f] == 0; ) h.pop();
    if (!h[0])
      p = T ? "0p+0" : "0";
    else {
      if (a < 0 ? o-- : (t = new b(t), t.d = h, t.e = o, t = $t(t, w, n, r, 0, i), h = t.d, o = t.e, l = rh), a = h[n], c = i / 2, l = l || h[n + 1] !== void 0, l = r < 4 ? (a !== void 0 || l) && (r === 0 || r === (t.s < 0 ? 3 : 2)) : a > c || a === c && (r === 4 || l || r === 6 && h[n - 1] & 1 || r === (t.s < 0 ? 8 : 7)), h.length = n, l)
        for (; ++h[--n] > i - 1; )
          h[n] = 0, n || (++o, h.unshift(1));
      for (f = h.length; !h[f - 1]; --f) ;
      for (a = 0, p = ""; a < f; a++) p += Ac.charAt(h[a]);
      if (T) {
        if (f > 1)
          if (e == 16 || e == 8) {
            for (a = e == 16 ? 4 : 3, --f; f % a; f++) p += "0";
            for (h = Ko(p, i, e), f = h.length; !h[f - 1]; --f) ;
            for (a = 1, p = "1."; a < f; a++) p += Ac.charAt(h[a]);
          } else
            p = p.charAt(0) + "." + p.slice(1);
        p = p + (o < 0 ? "p" : "p+") + o;
      } else if (o < 0) {
        for (; ++o; ) p = "0" + p;
        p = "0." + p;
      } else if (++o > f) for (o -= f; o--; ) p += "0";
      else o < f && (p = p.slice(0, o) + "." + p.slice(o));
    }
    p = (e == 16 ? "0x" : e == 2 ? "0b" : e == 8 ? "0o" : "") + p;
  }
  return t.s < 0 ? "-" + p : p;
}
function gl(t, e) {
  if (t.length > e)
    return t.length = e, !0;
}
function oy(t) {
  return new this(t).abs();
}
function sy(t) {
  return new this(t).acos();
}
function ay(t) {
  return new this(t).acosh();
}
function cy(t, e) {
  return new this(t).plus(e);
}
function uy(t) {
  return new this(t).asin();
}
function fy(t) {
  return new this(t).asinh();
}
function ly(t) {
  return new this(t).atan();
}
function dy(t) {
  return new this(t).atanh();
}
function hy(t, e) {
  t = new this(t), e = new this(e);
  var n, r = this.precision, i = this.rounding, o = r + 4;
  return !t.s || !e.s ? n = new this(NaN) : !t.d && !e.d ? (n = cn(this, o, 1).times(e.s > 0 ? 0.25 : 0.75), n.s = t.s) : !e.d || t.isZero() ? (n = e.s < 0 ? cn(this, r, i) : new this(0), n.s = t.s) : !t.d || e.isZero() ? (n = cn(this, o, 1).times(0.5), n.s = t.s) : e.s < 0 ? (this.precision = o, this.rounding = 1, n = this.atan($t(t, e, o, 1)), e = cn(this, o, 1), this.precision = r, this.rounding = i, n = t.s < 0 ? n.minus(e) : n.plus(e)) : n = this.atan($t(t, e, o, 1)), n;
}
function py(t) {
  return new this(t).cbrt();
}
function gy(t) {
  return ht(t = new this(t), t.e + 1, 2);
}
function wy(t, e, n) {
  return new this(t).clamp(e, n);
}
function yy(t) {
  if (!t || typeof t != "object") throw Error(Us + "Object expected");
  var e, n, r, i = t.defaults === !0, o = [
    "precision",
    1,
    Qn,
    "rounding",
    0,
    8,
    "toExpNeg",
    -9e15,
    0,
    "toExpPos",
    0,
    Sc,
    "maxE",
    0,
    Sc,
    "minE",
    -9e15,
    0,
    "modulo",
    0,
    9
  ];
  for (e = 0; e < o.length; e += 3)
    if (n = o[e], i && (this[n] = kc[n]), (r = t[n]) !== void 0)
      if (Te(r) === r && r >= o[e + 1] && r <= o[e + 2]) this[n] = r;
      else throw Error(Xn + n + ": " + r);
  if (n = "crypto", i && (this[n] = kc[n]), (r = t[n]) !== void 0)
    if (r === !0 || r === !1 || r === 0 || r === 1)
      if (r)
        if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
          this[n] = !0;
        else
          throw Error(oh);
      else
        this[n] = !1;
    else
      throw Error(Xn + n + ": " + r);
  return this;
}
function my(t) {
  return new this(t).cos();
}
function by(t) {
  return new this(t).cosh();
}
function hh(t) {
  var e, n, r;
  function i(o) {
    var a, c, f, l = this;
    if (!(l instanceof i)) return new i(o);
    if (l.constructor = i, wl(o)) {
      l.s = o.s, wt ? !o.d || o.e > i.maxE ? (l.e = NaN, l.d = null) : o.e < i.minE ? (l.e = 0, l.d = [0]) : (l.e = o.e, l.d = o.d.slice()) : (l.e = o.e, l.d = o.d ? o.d.slice() : o.d);
      return;
    }
    if (f = typeof o, f === "number") {
      if (o === 0) {
        l.s = 1 / o < 0 ? -1 : 1, l.e = 0, l.d = [0];
        return;
      }
      if (o < 0 ? (o = -o, l.s = -1) : l.s = 1, o === ~~o && o < 1e7) {
        for (a = 0, c = o; c >= 10; c /= 10) a++;
        wt ? a > i.maxE ? (l.e = NaN, l.d = null) : a < i.minE ? (l.e = 0, l.d = [0]) : (l.e = a, l.d = [o]) : (l.e = a, l.d = [o]);
        return;
      }
      if (o * 0 !== 0) {
        o || (l.s = NaN), l.e = NaN, l.d = null;
        return;
      }
      return Do(l, o.toString());
    }
    if (f === "string")
      return (c = o.charCodeAt(0)) === 45 ? (o = o.slice(1), l.s = -1) : (c === 43 && (o = o.slice(1)), l.s = 1), ah.test(o) ? Do(l, o) : ry(l, o);
    if (f === "bigint")
      return o < 0 ? (o = -o, l.s = -1) : l.s = 1, Do(l, o.toString());
    throw Error(Xn + o);
  }
  if (i.prototype = W, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.EUCLID = 9, i.config = i.set = yy, i.clone = hh, i.isDecimal = wl, i.abs = oy, i.acos = sy, i.acosh = ay, i.add = cy, i.asin = uy, i.asinh = fy, i.atan = ly, i.atanh = dy, i.atan2 = hy, i.cbrt = py, i.ceil = gy, i.clamp = wy, i.cos = my, i.cosh = by, i.div = vy, i.exp = Ey, i.floor = xy, i.hypot = Sy, i.ln = Ay, i.log = ky, i.log10 = Iy, i.log2 = Ty, i.max = By, i.min = _y, i.mod = Ny, i.mul = Cy, i.pow = Uy, i.random = $y, i.round = Oy, i.sign = Ry, i.sin = Ly, i.sinh = Py, i.sqrt = Ky, i.sub = Dy, i.sum = My, i.tan = Fy, i.tanh = qy, i.trunc = Hy, t === void 0 && (t = {}), t && t.defaults !== !0)
    for (r = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], e = 0; e < r.length; ) t.hasOwnProperty(n = r[e++]) || (t[n] = this[n]);
  return i.config(t), i;
}
function vy(t, e) {
  return new this(t).div(e);
}
function Ey(t) {
  return new this(t).exp();
}
function xy(t) {
  return ht(t = new this(t), t.e + 1, 3);
}
function Sy() {
  var t, e, n = new this(0);
  for (wt = !1, t = 0; t < arguments.length; )
    if (e = new this(arguments[t++]), e.d)
      n.d && (n = n.plus(e.times(e)));
    else {
      if (e.s)
        return wt = !0, new this(1 / 0);
      n = e;
    }
  return wt = !0, n.sqrt();
}
function wl(t) {
  return t instanceof Rs || t && t.toStringTag === sh || !1;
}
function Ay(t) {
  return new this(t).ln();
}
function ky(t, e) {
  return new this(t).log(e);
}
function Ty(t) {
  return new this(t).log(2);
}
function Iy(t) {
  return new this(t).log(10);
}
function By() {
  return fh(this, arguments, -1);
}
function _y() {
  return fh(this, arguments, 1);
}
function Ny(t, e) {
  return new this(t).mod(e);
}
function Cy(t, e) {
  return new this(t).mul(e);
}
function Uy(t, e) {
  return new this(t).pow(e);
}
function $y(t) {
  var e, n, r, i, o = 0, a = new this(1), c = [];
  if (t === void 0 ? t = this.precision : Re(t, 1, Qn), r = Math.ceil(t / pt), this.crypto)
    if (crypto.getRandomValues)
      for (e = crypto.getRandomValues(new Uint32Array(r)); o < r; )
        i = e[o], i >= 429e7 ? e[o] = crypto.getRandomValues(new Uint32Array(1))[0] : c[o++] = i % 1e7;
    else if (crypto.randomBytes) {
      for (e = crypto.randomBytes(r *= 4); o < r; )
        i = e[o] + (e[o + 1] << 8) + (e[o + 2] << 16) + ((e[o + 3] & 127) << 24), i >= 214e7 ? crypto.randomBytes(4).copy(e, o) : (c.push(i % 1e7), o += 4);
      o = r / 4;
    } else
      throw Error(oh);
  else for (; o < r; ) c[o++] = Math.random() * 1e7 | 0;
  for (r = c[--o], t %= pt, r && t && (i = ee(10, pt - t), c[o] = (r / i | 0) * i); c[o] === 0; o--) c.pop();
  if (o < 0)
    n = 0, c = [0];
  else {
    for (n = -1; c[0] === 0; n -= pt) c.shift();
    for (r = 1, i = c[0]; i >= 10; i /= 10) r++;
    r < pt && (n -= pt - r);
  }
  return a.e = n, a.d = c, a;
}
function Oy(t) {
  return ht(t = new this(t), t.e + 1, this.rounding);
}
function Ry(t) {
  return t = new this(t), t.d ? t.d[0] ? t.s : 0 * t.s : t.s || NaN;
}
function Ly(t) {
  return new this(t).sin();
}
function Py(t) {
  return new this(t).sinh();
}
function Ky(t) {
  return new this(t).sqrt();
}
function Dy(t, e) {
  return new this(t).sub(e);
}
function My() {
  var t = 0, e = arguments, n = new this(e[t]);
  for (wt = !1; n.s && ++t < e.length; ) n = n.plus(e[t]);
  return wt = !0, ht(n, this.precision, this.rounding);
}
function Fy(t) {
  return new this(t).tan();
}
function qy(t) {
  return new this(t).tanh();
}
function Hy(t) {
  return ht(t = new this(t), t.e + 1, 1);
}
W[Symbol.for("nodejs.util.inspect.custom")] = W.toString;
W[Symbol.toStringTag] = "Decimal";
var Rs = W.constructor = hh(kc);
ds = new Rs(ds);
hs = new Rs(hs);
const Vy = (t, e = !1) => {
  const n = typeof t == "string" ? Math.floor(new Date(t).getTime() / 1e3) : t, r = Math.floor(Date.now() / 1e3), i = Math.floor(r - n);
  return i === 0 ? "just now" : i > 0 ? `${yl(i, e)} ago` : i < 0 ? `in ${yl(i, e)}` : "";
}, yl = (t, e = !0) => {
  const n = Math.abs(t);
  return n > 86400 ? `${Math.floor(n / 86400)}${e ? " days" : "d"}` : n > 3600 ? `${Math.floor(n / 3600)}${e ? " hours" : "h"}` : n > 60 ? `${Math.floor(n / 60)}${e ? " minutes" : "m"}` : n > 0 ? `${n}${e ? " seconds" : "s"}` : "";
};
var Mo = { exports: {} }, jy = Mo.exports, ml;
function zy() {
  return ml || (ml = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(jy, function() {
      var n = function(s, u) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, g) {
          d.__proto__ = g;
        } || function(d, g) {
          for (var y in g) Object.prototype.hasOwnProperty.call(g, y) && (d[y] = g[y]);
        })(s, u);
      }, r = function() {
        return (r = Object.assign || function(s) {
          for (var u, d = 1, g = arguments.length; d < g; d++) for (var y in u = arguments[d]) Object.prototype.hasOwnProperty.call(u, y) && (s[y] = u[y]);
          return s;
        }).apply(this, arguments);
      };
      function i(s, u, d) {
        for (var g, y = 0, m = u.length; y < m; y++) !g && y in u || ((g = g || Array.prototype.slice.call(u, 0, y))[y] = u[y]);
        return s.concat(g || Array.prototype.slice.call(u));
      }
      var o = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : vw, a = Object.keys, c = Array.isArray;
      function f(s, u) {
        return typeof u != "object" || a(u).forEach(function(d) {
          s[d] = u[d];
        }), s;
      }
      typeof Promise > "u" || o.Promise || (o.Promise = Promise);
      var l = Object.getPrototypeOf, p = {}.hasOwnProperty;
      function h(s, u) {
        return p.call(s, u);
      }
      function w(s, u) {
        typeof u == "function" && (u = u(l(s))), (typeof Reflect > "u" ? a : Reflect.ownKeys)(u).forEach(function(d) {
          T(s, d, u[d]);
        });
      }
      var b = Object.defineProperty;
      function T(s, u, d, g) {
        b(s, u, f(d && h(d, "get") && typeof d.get == "function" ? { get: d.get, set: d.set, configurable: !0 } : { value: d, configurable: !0, writable: !0 }, g));
      }
      function x(s) {
        return { from: function(u) {
          return s.prototype = Object.create(u.prototype), T(s.prototype, "constructor", s), { extend: w.bind(null, s.prototype) };
        } };
      }
      var v = Object.getOwnPropertyDescriptor, k = [].slice;
      function $(s, u, d) {
        return k.call(s, u, d);
      }
      function L(s, u) {
        return u(s);
      }
      function V(s) {
        if (!s) throw new Error("Assertion Failed");
      }
      function Y(s) {
        o.setImmediate ? setImmediate(s) : setTimeout(s, 0);
      }
      function G(s, u) {
        if (typeof u == "string" && h(s, u)) return s[u];
        if (!u) return s;
        if (typeof u != "string") {
          for (var d = [], g = 0, y = u.length; g < y; ++g) {
            var m = G(s, u[g]);
            d.push(m);
          }
          return d;
        }
        var E = u.indexOf(".");
        if (E !== -1) {
          var S = s[u.substr(0, E)];
          return S == null ? void 0 : G(S, u.substr(E + 1));
        }
      }
      function z(s, u, d) {
        if (s && u !== void 0 && !("isFrozen" in Object && Object.isFrozen(s))) if (typeof u != "string" && "length" in u) {
          V(typeof d != "string" && "length" in d);
          for (var g = 0, y = u.length; g < y; ++g) z(s, u[g], d[g]);
        } else {
          var m, E, S = u.indexOf(".");
          S !== -1 ? (m = u.substr(0, S), (E = u.substr(S + 1)) === "" ? d === void 0 ? c(s) && !isNaN(parseInt(m)) ? s.splice(m, 1) : delete s[m] : s[m] = d : z(S = !(S = s[m]) || !h(s, m) ? s[m] = {} : S, E, d)) : d === void 0 ? c(s) && !isNaN(parseInt(u)) ? s.splice(u, 1) : delete s[u] : s[u] = d;
        }
      }
      function J(s) {
        var u, d = {};
        for (u in s) h(s, u) && (d[u] = s[u]);
        return d;
      }
      var P = [].concat;
      function st(s) {
        return P.apply([], s);
      }
      var Jn = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(st([8, 16, 32, 64].map(function(s) {
        return ["Int", "Uint", "Float"].map(function(u) {
          return u + s + "Array";
        });
      }))).filter(function(s) {
        return o[s];
      }), ft = new Set(Jn.map(function(s) {
        return o[s];
      })), at = null;
      function xt(s) {
        return at = /* @__PURE__ */ new WeakMap(), s = function u(d) {
          if (!d || typeof d != "object") return d;
          var g = at.get(d);
          if (g) return g;
          if (c(d)) {
            g = [], at.set(d, g);
            for (var y = 0, m = d.length; y < m; ++y) g.push(u(d[y]));
          } else if (ft.has(d.constructor)) g = d;
          else {
            var E, S = l(d);
            for (E in g = S === Object.prototype ? {} : Object.create(S), at.set(d, g), d) h(d, E) && (g[E] = u(d[E]));
          }
          return g;
        }(s), at = null, s;
      }
      var q = {}.toString;
      function H(s) {
        return q.call(s).slice(8, -1);
      }
      var D = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", nt = typeof D == "symbol" ? function(s) {
        var u;
        return s != null && (u = s[D]) && u.apply(s);
      } : function() {
        return null;
      };
      function ot(s, u) {
        return u = s.indexOf(u), 0 <= u && s.splice(u, 1), 0 <= u;
      }
      var gt = {};
      function St(s) {
        var u, d, g, y;
        if (arguments.length === 1) {
          if (c(s)) return s.slice();
          if (this === gt && typeof s == "string") return [s];
          if (y = nt(s)) {
            for (d = []; !(g = y.next()).done; ) d.push(g.value);
            return d;
          }
          if (s == null) return [s];
          if (typeof (u = s.length) != "number") return [s];
          for (d = new Array(u); u--; ) d[u] = s[u];
          return d;
        }
        for (u = arguments.length, d = new Array(u); u--; ) d[u] = arguments[u];
        return d;
      }
      var It = typeof Symbol < "u" ? function(s) {
        return s[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, Jr = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], Fe = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Jr), Vt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function Ct(s, u) {
        this.name = s, this.message = u;
      }
      function _t(s, u) {
        return s + ". Errors: " + Object.keys(u).map(function(d) {
          return u[d].toString();
        }).filter(function(d, g, y) {
          return y.indexOf(d) === g;
        }).join(`
`);
      }
      function re(s, u, d, g) {
        this.failures = u, this.failedKeys = g, this.successCount = d, this.message = _t(s, u);
      }
      function Kt(s, u) {
        this.name = "BulkError", this.failures = Object.keys(u).map(function(d) {
          return u[d];
        }), this.failuresByPos = u, this.message = _t(s, this.failures);
      }
      x(Ct).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), x(re).from(Ct), x(Kt).from(Ct);
      var Ge = Fe.reduce(function(s, u) {
        return s[u] = u + "Error", s;
      }, {}), he = Ct, ct = Fe.reduce(function(s, u) {
        var d = u + "Error";
        function g(y, m) {
          this.name = d, y ? typeof y == "string" ? (this.message = "".concat(y).concat(m ? `
 ` + m : ""), this.inner = m || null) : typeof y == "object" && (this.message = "".concat(y.name, " ").concat(y.message), this.inner = y) : (this.message = Vt[u] || d, this.inner = null);
        }
        return x(g).from(he), s[u] = g, s;
      }, {});
      ct.Syntax = SyntaxError, ct.Type = TypeError, ct.Range = RangeError;
      var en = Jr.reduce(function(s, u) {
        return s[u + "Error"] = ct[u], s;
      }, {}), me = Fe.reduce(function(s, u) {
        return ["Syntax", "Type", "Range"].indexOf(u) === -1 && (s[u + "Error"] = ct[u]), s;
      }, {});
      function mt() {
      }
      function pe(s) {
        return s;
      }
      function Ke(s, u) {
        return s == null || s === pe ? u : function(d) {
          return u(s(d));
        };
      }
      function jt(s, u) {
        return function() {
          s.apply(this, arguments), u.apply(this, arguments);
        };
      }
      function gh(s, u) {
        return s === mt ? u : function() {
          var d = s.apply(this, arguments);
          d !== void 0 && (arguments[0] = d);
          var g = this.onsuccess, y = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var m = u.apply(this, arguments);
          return g && (this.onsuccess = this.onsuccess ? jt(g, this.onsuccess) : g), y && (this.onerror = this.onerror ? jt(y, this.onerror) : y), m !== void 0 ? m : d;
        };
      }
      function wh(s, u) {
        return s === mt ? u : function() {
          s.apply(this, arguments);
          var d = this.onsuccess, g = this.onerror;
          this.onsuccess = this.onerror = null, u.apply(this, arguments), d && (this.onsuccess = this.onsuccess ? jt(d, this.onsuccess) : d), g && (this.onerror = this.onerror ? jt(g, this.onerror) : g);
        };
      }
      function yh(s, u) {
        return s === mt ? u : function(d) {
          var g = s.apply(this, arguments);
          f(d, g);
          var y = this.onsuccess, m = this.onerror;
          return this.onsuccess = null, this.onerror = null, d = u.apply(this, arguments), y && (this.onsuccess = this.onsuccess ? jt(y, this.onsuccess) : y), m && (this.onerror = this.onerror ? jt(m, this.onerror) : m), g === void 0 ? d === void 0 ? void 0 : d : f(g, d);
        };
      }
      function mh(s, u) {
        return s === mt ? u : function() {
          return u.apply(this, arguments) !== !1 && s.apply(this, arguments);
        };
      }
      function Ls(s, u) {
        return s === mt ? u : function() {
          var d = s.apply(this, arguments);
          if (d && typeof d.then == "function") {
            for (var g = this, y = arguments.length, m = new Array(y); y--; ) m[y] = arguments[y];
            return d.then(function() {
              return u.apply(g, m);
            });
          }
          return u.apply(this, arguments);
        };
      }
      me.ModifyError = re, me.DexieError = Ct, me.BulkError = Kt;
      var nn = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Eu(s) {
        nn = s;
      }
      var Qr = {}, xu = 100, Jn = typeof Promise > "u" ? [] : function() {
        var s = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [s, l(s), s];
        var u = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [u, l(u), s];
      }(), Jr = Jn[0], Fe = Jn[1], Jn = Jn[2], Fe = Fe && Fe.then, tr = Jr && Jr.constructor, Ps = !!Jn, ti = function(s, u) {
        ei.push([s, u]), Yi && (queueMicrotask(vh), Yi = !1);
      }, Ks = !0, Yi = !0, er = [], Zi = [], Ds = pe, Nn = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: mt, pgp: !1, env: {}, finalize: mt }, lt = Nn, ei = [], nr = 0, Xi = [];
      function it(s) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var u = this._PSD = lt;
        if (typeof s != "function") {
          if (s !== Qr) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && Fs(this, this._value));
        }
        this._state = null, this._value = null, ++u.ref, function d(g, y) {
          try {
            y(function(m) {
              if (g._state === null) {
                if (m === g) throw new TypeError("A promise cannot be resolved with itself.");
                var E = g._lib && vr();
                m && typeof m.then == "function" ? d(g, function(S, I) {
                  m instanceof it ? m._then(S, I) : m.then(S, I);
                }) : (g._state = !0, g._value = m, Au(g)), E && Er();
              }
            }, Fs.bind(null, g));
          } catch (m) {
            Fs(g, m);
          }
        }(this, s);
      }
      var Ms = { get: function() {
        var s = lt, u = eo;
        function d(g, y) {
          var m = this, E = !s.global && (s !== lt || u !== eo), S = E && !Un(), I = new it(function(_, U) {
            qs(m, new Su(Tu(g, s, E, S), Tu(y, s, E, S), _, U, s));
          });
          return this._consoleTask && (I._consoleTask = this._consoleTask), I;
        }
        return d.prototype = Qr, d;
      }, set: function(s) {
        T(this, "then", s && s.prototype === Qr ? Ms : { get: function() {
          return s;
        }, set: Ms.set });
      } };
      function Su(s, u, d, g, y) {
        this.onFulfilled = typeof s == "function" ? s : null, this.onRejected = typeof u == "function" ? u : null, this.resolve = d, this.reject = g, this.psd = y;
      }
      function Fs(s, u) {
        var d, g;
        Zi.push(u), s._state === null && (d = s._lib && vr(), u = Ds(u), s._state = !1, s._value = u, g = s, er.some(function(y) {
          return y._value === g._value;
        }) || er.push(g), Au(s), d && Er());
      }
      function Au(s) {
        var u = s._listeners;
        s._listeners = [];
        for (var d = 0, g = u.length; d < g; ++d) qs(s, u[d]);
        var y = s._PSD;
        --y.ref || y.finalize(), nr === 0 && (++nr, ti(function() {
          --nr == 0 && Hs();
        }, []));
      }
      function qs(s, u) {
        if (s._state !== null) {
          var d = s._state ? u.onFulfilled : u.onRejected;
          if (d === null) return (s._state ? u.resolve : u.reject)(s._value);
          ++u.psd.ref, ++nr, ti(bh, [d, s, u]);
        } else s._listeners.push(u);
      }
      function bh(s, u, d) {
        try {
          var g, y = u._value;
          !u._state && Zi.length && (Zi = []), g = nn && u._consoleTask ? u._consoleTask.run(function() {
            return s(y);
          }) : s(y), u._state || Zi.indexOf(y) !== -1 || function(m) {
            for (var E = er.length; E; ) if (er[--E]._value === m._value) return er.splice(E, 1);
          }(u), d.resolve(g);
        } catch (m) {
          d.reject(m);
        } finally {
          --nr == 0 && Hs(), --d.psd.ref || d.psd.finalize();
        }
      }
      function vh() {
        rr(Nn, function() {
          vr() && Er();
        });
      }
      function vr() {
        var s = Ks;
        return Yi = Ks = !1, s;
      }
      function Er() {
        var s, u, d;
        do
          for (; 0 < ei.length; ) for (s = ei, ei = [], d = s.length, u = 0; u < d; ++u) {
            var g = s[u];
            g[0].apply(null, g[1]);
          }
        while (0 < ei.length);
        Yi = Ks = !0;
      }
      function Hs() {
        var s = er;
        er = [], s.forEach(function(g) {
          g._PSD.onunhandled.call(null, g._value, g);
        });
        for (var u = Xi.slice(0), d = u.length; d; ) u[--d]();
      }
      function Qi(s) {
        return new it(Qr, !1, s);
      }
      function Dt(s, u) {
        var d = lt;
        return function() {
          var g = vr(), y = lt;
          try {
            return $n(d, !0), s.apply(this, arguments);
          } catch (m) {
            u && u(m);
          } finally {
            $n(y, !1), g && Er();
          }
        };
      }
      w(it.prototype, { then: Ms, _then: function(s, u) {
        qs(this, new Su(null, null, s, u, lt));
      }, catch: function(s) {
        if (arguments.length === 1) return this.then(null, s);
        var u = s, d = arguments[1];
        return typeof u == "function" ? this.then(null, function(g) {
          return (g instanceof u ? d : Qi)(g);
        }) : this.then(null, function(g) {
          return (g && g.name === u ? d : Qi)(g);
        });
      }, finally: function(s) {
        return this.then(function(u) {
          return it.resolve(s()).then(function() {
            return u;
          });
        }, function(u) {
          return it.resolve(s()).then(function() {
            return Qi(u);
          });
        });
      }, timeout: function(s, u) {
        var d = this;
        return s < 1 / 0 ? new it(function(g, y) {
          var m = setTimeout(function() {
            return y(new ct.Timeout(u));
          }, s);
          d.then(g, y).finally(clearTimeout.bind(null, m));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && T(it.prototype, Symbol.toStringTag, "Dexie.Promise"), Nn.env = ku(), w(it, { all: function() {
        var s = St.apply(null, arguments).map(no);
        return new it(function(u, d) {
          s.length === 0 && u([]);
          var g = s.length;
          s.forEach(function(y, m) {
            return it.resolve(y).then(function(E) {
              s[m] = E, --g || u(s);
            }, d);
          });
        });
      }, resolve: function(s) {
        return s instanceof it ? s : s && typeof s.then == "function" ? new it(function(u, d) {
          s.then(u, d);
        }) : new it(Qr, !0, s);
      }, reject: Qi, race: function() {
        var s = St.apply(null, arguments).map(no);
        return new it(function(u, d) {
          s.map(function(g) {
            return it.resolve(g).then(u, d);
          });
        });
      }, PSD: { get: function() {
        return lt;
      }, set: function(s) {
        return lt = s;
      } }, totalEchoes: { get: function() {
        return eo;
      } }, newPSD: Cn, usePSD: rr, scheduler: { get: function() {
        return ti;
      }, set: function(s) {
        ti = s;
      } }, rejectionMapper: { get: function() {
        return Ds;
      }, set: function(s) {
        Ds = s;
      } }, follow: function(s, u) {
        return new it(function(d, g) {
          return Cn(function(y, m) {
            var E = lt;
            E.unhandleds = [], E.onunhandled = m, E.finalize = jt(function() {
              var S, I = this;
              S = function() {
                I.unhandleds.length === 0 ? y() : m(I.unhandleds[0]);
              }, Xi.push(function _() {
                S(), Xi.splice(Xi.indexOf(_), 1);
              }), ++nr, ti(function() {
                --nr == 0 && Hs();
              }, []);
            }, E.finalize), s();
          }, u, d, g);
        });
      } }), tr && (tr.allSettled && T(it, "allSettled", function() {
        var s = St.apply(null, arguments).map(no);
        return new it(function(u) {
          s.length === 0 && u([]);
          var d = s.length, g = new Array(d);
          s.forEach(function(y, m) {
            return it.resolve(y).then(function(E) {
              return g[m] = { status: "fulfilled", value: E };
            }, function(E) {
              return g[m] = { status: "rejected", reason: E };
            }).then(function() {
              return --d || u(g);
            });
          });
        });
      }), tr.any && typeof AggregateError < "u" && T(it, "any", function() {
        var s = St.apply(null, arguments).map(no);
        return new it(function(u, d) {
          s.length === 0 && d(new AggregateError([]));
          var g = s.length, y = new Array(g);
          s.forEach(function(m, E) {
            return it.resolve(m).then(function(S) {
              return u(S);
            }, function(S) {
              y[E] = S, --g || d(new AggregateError(y));
            });
          });
        });
      }), tr.withResolvers && (it.withResolvers = tr.withResolvers));
      var ie = { awaits: 0, echoes: 0, id: 0 }, Eh = 0, Ji = [], to = 0, eo = 0, xh = 0;
      function Cn(s, u, d, g) {
        var y = lt, m = Object.create(y);
        return m.parent = y, m.ref = 0, m.global = !1, m.id = ++xh, Nn.env, m.env = Ps ? { Promise: it, PromiseProp: { value: it, configurable: !0, writable: !0 }, all: it.all, race: it.race, allSettled: it.allSettled, any: it.any, resolve: it.resolve, reject: it.reject } : {}, u && f(m, u), ++y.ref, m.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, g = rr(m, s, d, g), m.ref === 0 && m.finalize(), g;
      }
      function xr() {
        return ie.id || (ie.id = ++Eh), ++ie.awaits, ie.echoes += xu, ie.id;
      }
      function Un() {
        return !!ie.awaits && (--ie.awaits == 0 && (ie.id = 0), ie.echoes = ie.awaits * xu, !0);
      }
      function no(s) {
        return ie.echoes && s && s.constructor === tr ? (xr(), s.then(function(u) {
          return Un(), u;
        }, function(u) {
          return Un(), zt(u);
        })) : s;
      }
      function Sh() {
        var s = Ji[Ji.length - 1];
        Ji.pop(), $n(s, !1);
      }
      function $n(s, u) {
        var d, g = lt;
        (u ? !ie.echoes || to++ && s === lt : !to || --to && s === lt) || queueMicrotask(u ? (function(y) {
          ++eo, ie.echoes && --ie.echoes != 0 || (ie.echoes = ie.awaits = ie.id = 0), Ji.push(lt), $n(y, !0);
        }).bind(null, s) : Sh), s !== lt && (lt = s, g === Nn && (Nn.env = ku()), Ps && (d = Nn.env.Promise, u = s.env, (g.global || s.global) && (Object.defineProperty(o, "Promise", u.PromiseProp), d.all = u.all, d.race = u.race, d.resolve = u.resolve, d.reject = u.reject, u.allSettled && (d.allSettled = u.allSettled), u.any && (d.any = u.any))));
      }
      function ku() {
        var s = o.Promise;
        return Ps ? { Promise: s, PromiseProp: Object.getOwnPropertyDescriptor(o, "Promise"), all: s.all, race: s.race, allSettled: s.allSettled, any: s.any, resolve: s.resolve, reject: s.reject } : {};
      }
      function rr(s, u, d, g, y) {
        var m = lt;
        try {
          return $n(s, !0), u(d, g, y);
        } finally {
          $n(m, !1);
        }
      }
      function Tu(s, u, d, g) {
        return typeof s != "function" ? s : function() {
          var y = lt;
          d && xr(), $n(u, !0);
          try {
            return s.apply(this, arguments);
          } finally {
            $n(y, !1), g && queueMicrotask(Un);
          }
        };
      }
      function Vs(s) {
        Promise === tr && ie.echoes === 0 ? to === 0 ? s() : enqueueNativeMicroTask(s) : setTimeout(s, 0);
      }
      ("" + Fe).indexOf("[native code]") === -1 && (xr = Un = mt);
      var zt = it.reject, ir = "￿", wn = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Iu = "String expected.", Sr = [], ro = "__dbnames", js = "readonly", zs = "readwrite";
      function or(s, u) {
        return s ? u ? function() {
          return s.apply(this, arguments) && u.apply(this, arguments);
        } : s : u;
      }
      var Bu = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function io(s) {
        return typeof s != "string" || /\./.test(s) ? function(u) {
          return u;
        } : function(u) {
          return u[s] === void 0 && s in u && delete (u = xt(u))[s], u;
        };
      }
      function _u() {
        throw ct.Type();
      }
      function Bt(s, u) {
        try {
          var d = Nu(s), g = Nu(u);
          if (d !== g) return d === "Array" ? 1 : g === "Array" ? -1 : d === "binary" ? 1 : g === "binary" ? -1 : d === "string" ? 1 : g === "string" ? -1 : d === "Date" ? 1 : g !== "Date" ? NaN : -1;
          switch (d) {
            case "number":
            case "Date":
            case "string":
              return u < s ? 1 : s < u ? -1 : 0;
            case "binary":
              return function(y, m) {
                for (var E = y.length, S = m.length, I = E < S ? E : S, _ = 0; _ < I; ++_) if (y[_] !== m[_]) return y[_] < m[_] ? -1 : 1;
                return E === S ? 0 : E < S ? -1 : 1;
              }(Cu(s), Cu(u));
            case "Array":
              return function(y, m) {
                for (var E = y.length, S = m.length, I = E < S ? E : S, _ = 0; _ < I; ++_) {
                  var U = Bt(y[_], m[_]);
                  if (U !== 0) return U;
                }
                return E === S ? 0 : E < S ? -1 : 1;
              }(s, u);
          }
        } catch {
        }
        return NaN;
      }
      function Nu(s) {
        var u = typeof s;
        return u != "object" ? u : ArrayBuffer.isView(s) ? "binary" : (s = H(s), s === "ArrayBuffer" ? "binary" : s);
      }
      function Cu(s) {
        return s instanceof Uint8Array ? s : ArrayBuffer.isView(s) ? new Uint8Array(s.buffer, s.byteOffset, s.byteLength) : new Uint8Array(s);
      }
      var Uu = (Rt.prototype._trans = function(s, u, d) {
        var g = this._tx || lt.trans, y = this.name, m = nn && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(s === "readonly" ? "read" : "write", " ").concat(this.name));
        function E(_, U, A) {
          if (!A.schema[y]) throw new ct.NotFound("Table " + y + " not part of transaction");
          return u(A.idbtrans, A);
        }
        var S = vr();
        try {
          var I = g && g.db._novip === this.db._novip ? g === lt.trans ? g._promise(s, E, d) : Cn(function() {
            return g._promise(s, E, d);
          }, { trans: g, transless: lt.transless || lt }) : function _(U, A, R, B) {
            if (U.idbdb && (U._state.openComplete || lt.letThrough || U._vip)) {
              var C = U._createTransaction(A, R, U._dbSchema);
              try {
                C.create(), U._state.PR1398_maxLoop = 3;
              } catch (O) {
                return O.name === Ge.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                  return _(U, A, R, B);
                })) : zt(O);
              }
              return C._promise(A, function(O, N) {
                return Cn(function() {
                  return lt.trans = C, B(O, N, C);
                });
              }).then(function(O) {
                if (A === "readwrite") try {
                  C.idbtrans.commit();
                } catch {
                }
                return A === "readonly" ? O : C._completion.then(function() {
                  return O;
                });
              });
            }
            if (U._state.openComplete) return zt(new ct.DatabaseClosed(U._state.dbOpenError));
            if (!U._state.isBeingOpened) {
              if (!U._state.autoOpen) return zt(new ct.DatabaseClosed());
              U.open().catch(mt);
            }
            return U._state.dbReadyPromise.then(function() {
              return _(U, A, R, B);
            });
          }(this.db, s, [this.name], E);
          return m && (I._consoleTask = m, I = I.catch(function(_) {
            return console.trace(_), zt(_);
          })), I;
        } finally {
          S && Er();
        }
      }, Rt.prototype.get = function(s, u) {
        var d = this;
        return s && s.constructor === Object ? this.where(s).first(u) : s == null ? zt(new ct.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(g) {
          return d.core.get({ trans: g, key: s }).then(function(y) {
            return d.hook.reading.fire(y);
          });
        }).then(u);
      }, Rt.prototype.where = function(s) {
        if (typeof s == "string") return new this.db.WhereClause(this, s);
        if (c(s)) return new this.db.WhereClause(this, "[".concat(s.join("+"), "]"));
        var u = a(s);
        if (u.length === 1) return this.where(u[0]).equals(s[u[0]]);
        var d = this.schema.indexes.concat(this.schema.primKey).filter(function(S) {
          if (S.compound && u.every(function(_) {
            return 0 <= S.keyPath.indexOf(_);
          })) {
            for (var I = 0; I < u.length; ++I) if (u.indexOf(S.keyPath[I]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(S, I) {
          return S.keyPath.length - I.keyPath.length;
        })[0];
        if (d && this.db._maxKey !== ir) {
          var m = d.keyPath.slice(0, u.length);
          return this.where(m).equals(m.map(function(I) {
            return s[I];
          }));
        }
        !d && nn && console.warn("The query ".concat(JSON.stringify(s), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(u.join("+"), "]"));
        var g = this.schema.idxByName;
        function y(S, I) {
          return Bt(S, I) === 0;
        }
        var E = u.reduce(function(A, I) {
          var _ = A[0], U = A[1], A = g[I], R = s[I];
          return [_ || A, _ || !A ? or(U, A && A.multi ? function(B) {
            return B = G(B, I), c(B) && B.some(function(C) {
              return y(R, C);
            });
          } : function(B) {
            return y(R, G(B, I));
          }) : U];
        }, [null, null]), m = E[0], E = E[1];
        return m ? this.where(m.name).equals(s[m.keyPath]).filter(E) : d ? this.filter(E) : this.where(u).equals("");
      }, Rt.prototype.filter = function(s) {
        return this.toCollection().and(s);
      }, Rt.prototype.count = function(s) {
        return this.toCollection().count(s);
      }, Rt.prototype.offset = function(s) {
        return this.toCollection().offset(s);
      }, Rt.prototype.limit = function(s) {
        return this.toCollection().limit(s);
      }, Rt.prototype.each = function(s) {
        return this.toCollection().each(s);
      }, Rt.prototype.toArray = function(s) {
        return this.toCollection().toArray(s);
      }, Rt.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, Rt.prototype.orderBy = function(s) {
        return new this.db.Collection(new this.db.WhereClause(this, c(s) ? "[".concat(s.join("+"), "]") : s));
      }, Rt.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, Rt.prototype.mapToClass = function(s) {
        var u, d = this.db, g = this.name;
        function y() {
          return u !== null && u.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = s).prototype instanceof _u && (function(I, _) {
          if (typeof _ != "function" && _ !== null) throw new TypeError("Class extends value " + String(_) + " is not a constructor or null");
          function U() {
            this.constructor = I;
          }
          n(I, _), I.prototype = _ === null ? Object.create(_) : (U.prototype = _.prototype, new U());
        }(y, u = s), Object.defineProperty(y.prototype, "db", { get: function() {
          return d;
        }, enumerable: !1, configurable: !0 }), y.prototype.table = function() {
          return g;
        }, s = y);
        for (var m = /* @__PURE__ */ new Set(), E = s.prototype; E; E = l(E)) Object.getOwnPropertyNames(E).forEach(function(I) {
          return m.add(I);
        });
        function S(I) {
          if (!I) return I;
          var _, U = Object.create(s.prototype);
          for (_ in I) if (!m.has(_)) try {
            U[_] = I[_];
          } catch {
          }
          return U;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = S, this.hook("reading", S), s;
      }, Rt.prototype.defineClass = function() {
        return this.mapToClass(function(s) {
          f(this, s);
        });
      }, Rt.prototype.add = function(s, u) {
        var d = this, g = this.schema.primKey, y = g.auto, m = g.keyPath, E = s;
        return m && y && (E = io(m)(s)), this._trans("readwrite", function(S) {
          return d.core.mutate({ trans: S, type: "add", keys: u != null ? [u] : null, values: [E] });
        }).then(function(S) {
          return S.numFailures ? it.reject(S.failures[0]) : S.lastResult;
        }).then(function(S) {
          if (m) try {
            z(s, m, S);
          } catch {
          }
          return S;
        });
      }, Rt.prototype.update = function(s, u) {
        return typeof s != "object" || c(s) ? this.where(":id").equals(s).modify(u) : (s = G(s, this.schema.primKey.keyPath), s === void 0 ? zt(new ct.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(s).modify(u));
      }, Rt.prototype.put = function(s, u) {
        var d = this, g = this.schema.primKey, y = g.auto, m = g.keyPath, E = s;
        return m && y && (E = io(m)(s)), this._trans("readwrite", function(S) {
          return d.core.mutate({ trans: S, type: "put", values: [E], keys: u != null ? [u] : null });
        }).then(function(S) {
          return S.numFailures ? it.reject(S.failures[0]) : S.lastResult;
        }).then(function(S) {
          if (m) try {
            z(s, m, S);
          } catch {
          }
          return S;
        });
      }, Rt.prototype.delete = function(s) {
        var u = this;
        return this._trans("readwrite", function(d) {
          return u.core.mutate({ trans: d, type: "delete", keys: [s] });
        }).then(function(d) {
          return d.numFailures ? it.reject(d.failures[0]) : void 0;
        });
      }, Rt.prototype.clear = function() {
        var s = this;
        return this._trans("readwrite", function(u) {
          return s.core.mutate({ trans: u, type: "deleteRange", range: Bu });
        }).then(function(u) {
          return u.numFailures ? it.reject(u.failures[0]) : void 0;
        });
      }, Rt.prototype.bulkGet = function(s) {
        var u = this;
        return this._trans("readonly", function(d) {
          return u.core.getMany({ keys: s, trans: d }).then(function(g) {
            return g.map(function(y) {
              return u.hook.reading.fire(y);
            });
          });
        });
      }, Rt.prototype.bulkAdd = function(s, u, d) {
        var g = this, y = Array.isArray(u) ? u : void 0, m = (d = d || (y ? void 0 : u)) ? d.allKeys : void 0;
        return this._trans("readwrite", function(E) {
          var _ = g.schema.primKey, S = _.auto, _ = _.keyPath;
          if (_ && y) throw new ct.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (y && y.length !== s.length) throw new ct.InvalidArgument("Arguments objects and keys must have the same length");
          var I = s.length, _ = _ && S ? s.map(io(_)) : s;
          return g.core.mutate({ trans: E, type: "add", keys: y, values: _, wantResults: m }).then(function(C) {
            var A = C.numFailures, R = C.results, B = C.lastResult, C = C.failures;
            if (A === 0) return m ? R : B;
            throw new Kt("".concat(g.name, ".bulkAdd(): ").concat(A, " of ").concat(I, " operations failed"), C);
          });
        });
      }, Rt.prototype.bulkPut = function(s, u, d) {
        var g = this, y = Array.isArray(u) ? u : void 0, m = (d = d || (y ? void 0 : u)) ? d.allKeys : void 0;
        return this._trans("readwrite", function(E) {
          var _ = g.schema.primKey, S = _.auto, _ = _.keyPath;
          if (_ && y) throw new ct.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (y && y.length !== s.length) throw new ct.InvalidArgument("Arguments objects and keys must have the same length");
          var I = s.length, _ = _ && S ? s.map(io(_)) : s;
          return g.core.mutate({ trans: E, type: "put", keys: y, values: _, wantResults: m }).then(function(C) {
            var A = C.numFailures, R = C.results, B = C.lastResult, C = C.failures;
            if (A === 0) return m ? R : B;
            throw new Kt("".concat(g.name, ".bulkPut(): ").concat(A, " of ").concat(I, " operations failed"), C);
          });
        });
      }, Rt.prototype.bulkUpdate = function(s) {
        var u = this, d = this.core, g = s.map(function(E) {
          return E.key;
        }), y = s.map(function(E) {
          return E.changes;
        }), m = [];
        return this._trans("readwrite", function(E) {
          return d.getMany({ trans: E, keys: g, cache: "clone" }).then(function(S) {
            var I = [], _ = [];
            s.forEach(function(A, R) {
              var B = A.key, C = A.changes, O = S[R];
              if (O) {
                for (var N = 0, K = Object.keys(C); N < K.length; N++) {
                  var M = K[N], F = C[M];
                  if (M === u.schema.primKey.keyPath) {
                    if (Bt(F, B) !== 0) throw new ct.Constraint("Cannot update primary key in bulkUpdate()");
                  } else z(O, M, F);
                }
                m.push(R), I.push(B), _.push(O);
              }
            });
            var U = I.length;
            return d.mutate({ trans: E, type: "put", keys: I, values: _, updates: { keys: g, changeSpecs: y } }).then(function(A) {
              var R = A.numFailures, B = A.failures;
              if (R === 0) return U;
              for (var C = 0, O = Object.keys(B); C < O.length; C++) {
                var N, K = O[C], M = m[Number(K)];
                M != null && (N = B[K], delete B[K], B[M] = N);
              }
              throw new Kt("".concat(u.name, ".bulkUpdate(): ").concat(R, " of ").concat(U, " operations failed"), B);
            });
          });
        });
      }, Rt.prototype.bulkDelete = function(s) {
        var u = this, d = s.length;
        return this._trans("readwrite", function(g) {
          return u.core.mutate({ trans: g, type: "delete", keys: s });
        }).then(function(E) {
          var y = E.numFailures, m = E.lastResult, E = E.failures;
          if (y === 0) return m;
          throw new Kt("".concat(u.name, ".bulkDelete(): ").concat(y, " of ").concat(d, " operations failed"), E);
        });
      }, Rt);
      function Rt() {
      }
      function ni(s) {
        function u(E, S) {
          if (S) {
            for (var I = arguments.length, _ = new Array(I - 1); --I; ) _[I - 1] = arguments[I];
            return d[E].subscribe.apply(null, _), s;
          }
          if (typeof E == "string") return d[E];
        }
        var d = {};
        u.addEventType = m;
        for (var g = 1, y = arguments.length; g < y; ++g) m(arguments[g]);
        return u;
        function m(E, S, I) {
          if (typeof E != "object") {
            var _;
            S = S || mh;
            var U = { subscribers: [], fire: I = I || mt, subscribe: function(A) {
              U.subscribers.indexOf(A) === -1 && (U.subscribers.push(A), U.fire = S(U.fire, A));
            }, unsubscribe: function(A) {
              U.subscribers = U.subscribers.filter(function(R) {
                return R !== A;
              }), U.fire = U.subscribers.reduce(S, I);
            } };
            return d[E] = u[E] = U;
          }
          a(_ = E).forEach(function(A) {
            var R = _[A];
            if (c(R)) m(A, _[A][0], _[A][1]);
            else {
              if (R !== "asap") throw new ct.InvalidArgument("Invalid event config");
              var B = m(A, pe, function() {
                for (var C = arguments.length, O = new Array(C); C--; ) O[C] = arguments[C];
                B.subscribers.forEach(function(N) {
                  Y(function() {
                    N.apply(null, O);
                  });
                });
              });
            }
          });
        }
      }
      function ri(s, u) {
        return x(u).from({ prototype: s }), u;
      }
      function Ar(s, u) {
        return !(s.filter || s.algorithm || s.or) && (u ? s.justLimit : !s.replayFilter);
      }
      function Gs(s, u) {
        s.filter = or(s.filter, u);
      }
      function Ws(s, u, d) {
        var g = s.replayFilter;
        s.replayFilter = g ? function() {
          return or(g(), u());
        } : u, s.justLimit = d && !g;
      }
      function oo(s, u) {
        if (s.isPrimKey) return u.primaryKey;
        var d = u.getIndexByKeyPath(s.index);
        if (!d) throw new ct.Schema("KeyPath " + s.index + " on object store " + u.name + " is not indexed");
        return d;
      }
      function $u(s, u, d) {
        var g = oo(s, u.schema);
        return u.openCursor({ trans: d, values: !s.keysOnly, reverse: s.dir === "prev", unique: !!s.unique, query: { index: g, range: s.range } });
      }
      function so(s, u, d, g) {
        var y = s.replayFilter ? or(s.filter, s.replayFilter()) : s.filter;
        if (s.or) {
          var m = {}, E = function(S, I, _) {
            var U, A;
            y && !y(I, _, function(R) {
              return I.stop(R);
            }, function(R) {
              return I.fail(R);
            }) || ((A = "" + (U = I.primaryKey)) == "[object ArrayBuffer]" && (A = "" + new Uint8Array(U)), h(m, A) || (m[A] = !0, u(S, I, _)));
          };
          return Promise.all([s.or._iterate(E, d), Ou($u(s, g, d), s.algorithm, E, !s.keysOnly && s.valueMapper)]);
        }
        return Ou($u(s, g, d), or(s.algorithm, y), u, !s.keysOnly && s.valueMapper);
      }
      function Ou(s, u, d, g) {
        var y = Dt(g ? function(m, E, S) {
          return d(g(m), E, S);
        } : d);
        return s.then(function(m) {
          if (m) return m.start(function() {
            var E = function() {
              return m.continue();
            };
            u && !u(m, function(S) {
              return E = S;
            }, function(S) {
              m.stop(S), E = mt;
            }, function(S) {
              m.fail(S), E = mt;
            }) || y(m.value, m, function(S) {
              return E = S;
            }), E();
          });
        });
      }
      var ii = (Ru.prototype.execute = function(s) {
        var u = this["@@propmod"];
        if (u.add !== void 0) {
          var d = u.add;
          if (c(d)) return i(i([], c(s) ? s : [], !0), d).sort();
          if (typeof d == "number") return (Number(s) || 0) + d;
          if (typeof d == "bigint") try {
            return BigInt(s) + d;
          } catch {
            return BigInt(0) + d;
          }
          throw new TypeError("Invalid term ".concat(d));
        }
        if (u.remove !== void 0) {
          var g = u.remove;
          if (c(g)) return c(s) ? s.filter(function(y) {
            return !g.includes(y);
          }).sort() : [];
          if (typeof g == "number") return Number(s) - g;
          if (typeof g == "bigint") try {
            return BigInt(s) - g;
          } catch {
            return BigInt(0) - g;
          }
          throw new TypeError("Invalid subtrahend ".concat(g));
        }
        return d = (d = u.replacePrefix) === null || d === void 0 ? void 0 : d[0], d && typeof s == "string" && s.startsWith(d) ? u.replacePrefix[1] + s.substring(d.length) : s;
      }, Ru);
      function Ru(s) {
        this["@@propmod"] = s;
      }
      var Ah = (Nt.prototype._read = function(s, u) {
        var d = this._ctx;
        return d.error ? d.table._trans(null, zt.bind(null, d.error)) : d.table._trans("readonly", s).then(u);
      }, Nt.prototype._write = function(s) {
        var u = this._ctx;
        return u.error ? u.table._trans(null, zt.bind(null, u.error)) : u.table._trans("readwrite", s, "locked");
      }, Nt.prototype._addAlgorithm = function(s) {
        var u = this._ctx;
        u.algorithm = or(u.algorithm, s);
      }, Nt.prototype._iterate = function(s, u) {
        return so(this._ctx, s, u, this._ctx.table.core);
      }, Nt.prototype.clone = function(s) {
        var u = Object.create(this.constructor.prototype), d = Object.create(this._ctx);
        return s && f(d, s), u._ctx = d, u;
      }, Nt.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, Nt.prototype.each = function(s) {
        var u = this._ctx;
        return this._read(function(d) {
          return so(u, s, d, u.table.core);
        });
      }, Nt.prototype.count = function(s) {
        var u = this;
        return this._read(function(d) {
          var g = u._ctx, y = g.table.core;
          if (Ar(g, !0)) return y.count({ trans: d, query: { index: oo(g, y.schema), range: g.range } }).then(function(E) {
            return Math.min(E, g.limit);
          });
          var m = 0;
          return so(g, function() {
            return ++m, !1;
          }, d, y).then(function() {
            return m;
          });
        }).then(s);
      }, Nt.prototype.sortBy = function(s, u) {
        var d = s.split(".").reverse(), g = d[0], y = d.length - 1;
        function m(I, _) {
          return _ ? m(I[d[_]], _ - 1) : I[g];
        }
        var E = this._ctx.dir === "next" ? 1 : -1;
        function S(I, _) {
          return Bt(m(I, y), m(_, y)) * E;
        }
        return this.toArray(function(I) {
          return I.sort(S);
        }).then(u);
      }, Nt.prototype.toArray = function(s) {
        var u = this;
        return this._read(function(d) {
          var g = u._ctx;
          if (g.dir === "next" && Ar(g, !0) && 0 < g.limit) {
            var y = g.valueMapper, m = oo(g, g.table.core.schema);
            return g.table.core.query({ trans: d, limit: g.limit, values: !0, query: { index: m, range: g.range } }).then(function(S) {
              return S = S.result, y ? S.map(y) : S;
            });
          }
          var E = [];
          return so(g, function(S) {
            return E.push(S);
          }, d, g.table.core).then(function() {
            return E;
          });
        }, s);
      }, Nt.prototype.offset = function(s) {
        var u = this._ctx;
        return s <= 0 || (u.offset += s, Ar(u) ? Ws(u, function() {
          var d = s;
          return function(g, y) {
            return d === 0 || (d === 1 ? --d : y(function() {
              g.advance(d), d = 0;
            }), !1);
          };
        }) : Ws(u, function() {
          var d = s;
          return function() {
            return --d < 0;
          };
        })), this;
      }, Nt.prototype.limit = function(s) {
        return this._ctx.limit = Math.min(this._ctx.limit, s), Ws(this._ctx, function() {
          var u = s;
          return function(d, g, y) {
            return --u <= 0 && g(y), 0 <= u;
          };
        }, !0), this;
      }, Nt.prototype.until = function(s, u) {
        return Gs(this._ctx, function(d, g, y) {
          return !s(d.value) || (g(y), u);
        }), this;
      }, Nt.prototype.first = function(s) {
        return this.limit(1).toArray(function(u) {
          return u[0];
        }).then(s);
      }, Nt.prototype.last = function(s) {
        return this.reverse().first(s);
      }, Nt.prototype.filter = function(s) {
        var u;
        return Gs(this._ctx, function(d) {
          return s(d.value);
        }), (u = this._ctx).isMatch = or(u.isMatch, s), this;
      }, Nt.prototype.and = function(s) {
        return this.filter(s);
      }, Nt.prototype.or = function(s) {
        return new this.db.WhereClause(this._ctx.table, s, this);
      }, Nt.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, Nt.prototype.desc = function() {
        return this.reverse();
      }, Nt.prototype.eachKey = function(s) {
        var u = this._ctx;
        return u.keysOnly = !u.isMatch, this.each(function(d, g) {
          s(g.key, g);
        });
      }, Nt.prototype.eachUniqueKey = function(s) {
        return this._ctx.unique = "unique", this.eachKey(s);
      }, Nt.prototype.eachPrimaryKey = function(s) {
        var u = this._ctx;
        return u.keysOnly = !u.isMatch, this.each(function(d, g) {
          s(g.primaryKey, g);
        });
      }, Nt.prototype.keys = function(s) {
        var u = this._ctx;
        u.keysOnly = !u.isMatch;
        var d = [];
        return this.each(function(g, y) {
          d.push(y.key);
        }).then(function() {
          return d;
        }).then(s);
      }, Nt.prototype.primaryKeys = function(s) {
        var u = this._ctx;
        if (u.dir === "next" && Ar(u, !0) && 0 < u.limit) return this._read(function(g) {
          var y = oo(u, u.table.core.schema);
          return u.table.core.query({ trans: g, values: !1, limit: u.limit, query: { index: y, range: u.range } });
        }).then(function(g) {
          return g.result;
        }).then(s);
        u.keysOnly = !u.isMatch;
        var d = [];
        return this.each(function(g, y) {
          d.push(y.primaryKey);
        }).then(function() {
          return d;
        }).then(s);
      }, Nt.prototype.uniqueKeys = function(s) {
        return this._ctx.unique = "unique", this.keys(s);
      }, Nt.prototype.firstKey = function(s) {
        return this.limit(1).keys(function(u) {
          return u[0];
        }).then(s);
      }, Nt.prototype.lastKey = function(s) {
        return this.reverse().firstKey(s);
      }, Nt.prototype.distinct = function() {
        var s = this._ctx, s = s.index && s.table.schema.idxByName[s.index];
        if (!s || !s.multi) return this;
        var u = {};
        return Gs(this._ctx, function(y) {
          var g = y.primaryKey.toString(), y = h(u, g);
          return u[g] = !0, !y;
        }), this;
      }, Nt.prototype.modify = function(s) {
        var u = this, d = this._ctx;
        return this._write(function(g) {
          var y, m, E;
          E = typeof s == "function" ? s : (y = a(s), m = y.length, function(N) {
            for (var K = !1, M = 0; M < m; ++M) {
              var F = y[M], j = s[F], Z = G(N, F);
              j instanceof ii ? (z(N, F, j.execute(Z)), K = !0) : Z !== j && (z(N, F, j), K = !0);
            }
            return K;
          });
          var S = d.table.core, A = S.schema.primaryKey, I = A.outbound, _ = A.extractKey, U = 200, A = u.db._options.modifyChunkSize;
          A && (U = typeof A == "object" ? A[S.name] || A["*"] || 200 : A);
          function R(N, F) {
            var M = F.failures, F = F.numFailures;
            C += N - F;
            for (var j = 0, Z = a(M); j < Z.length; j++) {
              var et = Z[j];
              B.push(M[et]);
            }
          }
          var B = [], C = 0, O = [];
          return u.clone().primaryKeys().then(function(N) {
            function K(F) {
              var j = Math.min(U, N.length - F);
              return S.getMany({ trans: g, keys: N.slice(F, F + j), cache: "immutable" }).then(function(Z) {
                for (var et = [], X = [], Q = I ? [] : null, rt = [], tt = 0; tt < j; ++tt) {
                  var ut = Z[tt], vt = { value: xt(ut), primKey: N[F + tt] };
                  E.call(vt, vt.value, vt) !== !1 && (vt.value == null ? rt.push(N[F + tt]) : I || Bt(_(ut), _(vt.value)) === 0 ? (X.push(vt.value), I && Q.push(N[F + tt])) : (rt.push(N[F + tt]), et.push(vt.value)));
                }
                return Promise.resolve(0 < et.length && S.mutate({ trans: g, type: "add", values: et }).then(function(kt) {
                  for (var Tt in kt.failures) rt.splice(parseInt(Tt), 1);
                  R(et.length, kt);
                })).then(function() {
                  return (0 < X.length || M && typeof s == "object") && S.mutate({ trans: g, type: "put", keys: Q, values: X, criteria: M, changeSpec: typeof s != "function" && s, isAdditionalChunk: 0 < F }).then(function(kt) {
                    return R(X.length, kt);
                  });
                }).then(function() {
                  return (0 < rt.length || M && s === Ys) && S.mutate({ trans: g, type: "delete", keys: rt, criteria: M, isAdditionalChunk: 0 < F }).then(function(kt) {
                    return R(rt.length, kt);
                  });
                }).then(function() {
                  return N.length > F + j && K(F + U);
                });
              });
            }
            var M = Ar(d) && d.limit === 1 / 0 && (typeof s != "function" || s === Ys) && { index: d.index, range: d.range };
            return K(0).then(function() {
              if (0 < B.length) throw new re("Error modifying one or more objects", B, C, O);
              return N.length;
            });
          });
        });
      }, Nt.prototype.delete = function() {
        var s = this._ctx, u = s.range;
        return Ar(s) && (s.isPrimKey || u.type === 3) ? this._write(function(d) {
          var g = s.table.core.schema.primaryKey, y = u;
          return s.table.core.count({ trans: d, query: { index: g, range: y } }).then(function(m) {
            return s.table.core.mutate({ trans: d, type: "deleteRange", range: y }).then(function(E) {
              var S = E.failures;
              if (E.lastResult, E.results, E = E.numFailures, E) throw new re("Could not delete some values", Object.keys(S).map(function(I) {
                return S[I];
              }), m - E);
              return m - E;
            });
          });
        }) : this.modify(Ys);
      }, Nt);
      function Nt() {
      }
      var Ys = function(s, u) {
        return u.value = null;
      };
      function kh(s, u) {
        return s < u ? -1 : s === u ? 0 : 1;
      }
      function Th(s, u) {
        return u < s ? -1 : s === u ? 0 : 1;
      }
      function De(s, u, d) {
        return s = s instanceof Pu ? new s.Collection(s) : s, s._ctx.error = new (d || TypeError)(u), s;
      }
      function kr(s) {
        return new s.Collection(s, function() {
          return Lu("");
        }).limit(0);
      }
      function ao(s, u, d, g) {
        var y, m, E, S, I, _, U, A = d.length;
        if (!d.every(function(C) {
          return typeof C == "string";
        })) return De(s, Iu);
        function R(C) {
          y = C === "next" ? function(N) {
            return N.toUpperCase();
          } : function(N) {
            return N.toLowerCase();
          }, m = C === "next" ? function(N) {
            return N.toLowerCase();
          } : function(N) {
            return N.toUpperCase();
          }, E = C === "next" ? kh : Th;
          var O = d.map(function(N) {
            return { lower: m(N), upper: y(N) };
          }).sort(function(N, K) {
            return E(N.lower, K.lower);
          });
          S = O.map(function(N) {
            return N.upper;
          }), I = O.map(function(N) {
            return N.lower;
          }), U = (_ = C) === "next" ? "" : g;
        }
        R("next"), s = new s.Collection(s, function() {
          return On(S[0], I[A - 1] + g);
        }), s._ondirectionchange = function(C) {
          R(C);
        };
        var B = 0;
        return s._addAlgorithm(function(C, O, N) {
          var K = C.key;
          if (typeof K != "string") return !1;
          var M = m(K);
          if (u(M, I, B)) return !0;
          for (var F = null, j = B; j < A; ++j) {
            var Z = function(et, X, Q, rt, tt, ut) {
              for (var vt = Math.min(et.length, rt.length), kt = -1, Tt = 0; Tt < vt; ++Tt) {
                var Me = X[Tt];
                if (Me !== rt[Tt]) return tt(et[Tt], Q[Tt]) < 0 ? et.substr(0, Tt) + Q[Tt] + Q.substr(Tt + 1) : tt(et[Tt], rt[Tt]) < 0 ? et.substr(0, Tt) + rt[Tt] + Q.substr(Tt + 1) : 0 <= kt ? et.substr(0, kt) + X[kt] + Q.substr(kt + 1) : null;
                tt(et[Tt], Me) < 0 && (kt = Tt);
              }
              return vt < rt.length && ut === "next" ? et + Q.substr(et.length) : vt < et.length && ut === "prev" ? et.substr(0, Q.length) : kt < 0 ? null : et.substr(0, kt) + rt[kt] + Q.substr(kt + 1);
            }(K, M, S[j], I[j], E, _);
            Z === null && F === null ? B = j + 1 : (F === null || 0 < E(F, Z)) && (F = Z);
          }
          return O(F !== null ? function() {
            C.continue(F + U);
          } : N), !1;
        }), s;
      }
      function On(s, u, d, g) {
        return { type: 2, lower: s, upper: u, lowerOpen: d, upperOpen: g };
      }
      function Lu(s) {
        return { type: 1, lower: s, upper: s };
      }
      var Pu = (Object.defineProperty(oe.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), oe.prototype.between = function(s, u, d, g) {
        d = d !== !1, g = g === !0;
        try {
          return 0 < this._cmp(s, u) || this._cmp(s, u) === 0 && (d || g) && (!d || !g) ? kr(this) : new this.Collection(this, function() {
            return On(s, u, !d, !g);
          });
        } catch {
          return De(this, wn);
        }
      }, oe.prototype.equals = function(s) {
        return s == null ? De(this, wn) : new this.Collection(this, function() {
          return Lu(s);
        });
      }, oe.prototype.above = function(s) {
        return s == null ? De(this, wn) : new this.Collection(this, function() {
          return On(s, void 0, !0);
        });
      }, oe.prototype.aboveOrEqual = function(s) {
        return s == null ? De(this, wn) : new this.Collection(this, function() {
          return On(s, void 0, !1);
        });
      }, oe.prototype.below = function(s) {
        return s == null ? De(this, wn) : new this.Collection(this, function() {
          return On(void 0, s, !1, !0);
        });
      }, oe.prototype.belowOrEqual = function(s) {
        return s == null ? De(this, wn) : new this.Collection(this, function() {
          return On(void 0, s);
        });
      }, oe.prototype.startsWith = function(s) {
        return typeof s != "string" ? De(this, Iu) : this.between(s, s + ir, !0, !0);
      }, oe.prototype.startsWithIgnoreCase = function(s) {
        return s === "" ? this.startsWith(s) : ao(this, function(u, d) {
          return u.indexOf(d[0]) === 0;
        }, [s], ir);
      }, oe.prototype.equalsIgnoreCase = function(s) {
        return ao(this, function(u, d) {
          return u === d[0];
        }, [s], "");
      }, oe.prototype.anyOfIgnoreCase = function() {
        var s = St.apply(gt, arguments);
        return s.length === 0 ? kr(this) : ao(this, function(u, d) {
          return d.indexOf(u) !== -1;
        }, s, "");
      }, oe.prototype.startsWithAnyOfIgnoreCase = function() {
        var s = St.apply(gt, arguments);
        return s.length === 0 ? kr(this) : ao(this, function(u, d) {
          return d.some(function(g) {
            return u.indexOf(g) === 0;
          });
        }, s, ir);
      }, oe.prototype.anyOf = function() {
        var s = this, u = St.apply(gt, arguments), d = this._cmp;
        try {
          u.sort(d);
        } catch {
          return De(this, wn);
        }
        if (u.length === 0) return kr(this);
        var g = new this.Collection(this, function() {
          return On(u[0], u[u.length - 1]);
        });
        g._ondirectionchange = function(m) {
          d = m === "next" ? s._ascending : s._descending, u.sort(d);
        };
        var y = 0;
        return g._addAlgorithm(function(m, E, S) {
          for (var I = m.key; 0 < d(I, u[y]); ) if (++y === u.length) return E(S), !1;
          return d(I, u[y]) === 0 || (E(function() {
            m.continue(u[y]);
          }), !1);
        }), g;
      }, oe.prototype.notEqual = function(s) {
        return this.inAnyRange([[-1 / 0, s], [s, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, oe.prototype.noneOf = function() {
        var s = St.apply(gt, arguments);
        if (s.length === 0) return new this.Collection(this);
        try {
          s.sort(this._ascending);
        } catch {
          return De(this, wn);
        }
        var u = s.reduce(function(d, g) {
          return d ? d.concat([[d[d.length - 1][1], g]]) : [[-1 / 0, g]];
        }, null);
        return u.push([s[s.length - 1], this.db._maxKey]), this.inAnyRange(u, { includeLowers: !1, includeUppers: !1 });
      }, oe.prototype.inAnyRange = function(K, u) {
        var d = this, g = this._cmp, y = this._ascending, m = this._descending, E = this._min, S = this._max;
        if (K.length === 0) return kr(this);
        if (!K.every(function(M) {
          return M[0] !== void 0 && M[1] !== void 0 && y(M[0], M[1]) <= 0;
        })) return De(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", ct.InvalidArgument);
        var I = !u || u.includeLowers !== !1, _ = u && u.includeUppers === !0, U, A = y;
        function R(M, F) {
          return A(M[0], F[0]);
        }
        try {
          (U = K.reduce(function(M, F) {
            for (var j = 0, Z = M.length; j < Z; ++j) {
              var et = M[j];
              if (g(F[0], et[1]) < 0 && 0 < g(F[1], et[0])) {
                et[0] = E(et[0], F[0]), et[1] = S(et[1], F[1]);
                break;
              }
            }
            return j === Z && M.push(F), M;
          }, [])).sort(R);
        } catch {
          return De(this, wn);
        }
        var B = 0, C = _ ? function(M) {
          return 0 < y(M, U[B][1]);
        } : function(M) {
          return 0 <= y(M, U[B][1]);
        }, O = I ? function(M) {
          return 0 < m(M, U[B][0]);
        } : function(M) {
          return 0 <= m(M, U[B][0]);
        }, N = C, K = new this.Collection(this, function() {
          return On(U[0][0], U[U.length - 1][1], !I, !_);
        });
        return K._ondirectionchange = function(M) {
          A = M === "next" ? (N = C, y) : (N = O, m), U.sort(R);
        }, K._addAlgorithm(function(M, F, j) {
          for (var Z, et = M.key; N(et); ) if (++B === U.length) return F(j), !1;
          return !C(Z = et) && !O(Z) || (d._cmp(et, U[B][1]) === 0 || d._cmp(et, U[B][0]) === 0 || F(function() {
            A === y ? M.continue(U[B][0]) : M.continue(U[B][1]);
          }), !1);
        }), K;
      }, oe.prototype.startsWithAnyOf = function() {
        var s = St.apply(gt, arguments);
        return s.every(function(u) {
          return typeof u == "string";
        }) ? s.length === 0 ? kr(this) : this.inAnyRange(s.map(function(u) {
          return [u, u + ir];
        })) : De(this, "startsWithAnyOf() only works with strings");
      }, oe);
      function oe() {
      }
      function rn(s) {
        return Dt(function(u) {
          return oi(u), s(u.target.error), !1;
        });
      }
      function oi(s) {
        s.stopPropagation && s.stopPropagation(), s.preventDefault && s.preventDefault();
      }
      var si = "storagemutated", Zs = "x-storagemutated-1", Rn = ni(null, si), Ih = (on.prototype._lock = function() {
        return V(!lt.global), ++this._reculock, this._reculock !== 1 || lt.global || (lt.lockOwnerFor = this), this;
      }, on.prototype._unlock = function() {
        if (V(!lt.global), --this._reculock == 0) for (lt.global || (lt.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var s = this._blockedFuncs.shift();
          try {
            rr(s[1], s[0]);
          } catch {
          }
        }
        return this;
      }, on.prototype._locked = function() {
        return this._reculock && lt.lockOwnerFor !== this;
      }, on.prototype.create = function(s) {
        var u = this;
        if (!this.mode) return this;
        var d = this.db.idbdb, g = this.db._state.dbOpenError;
        if (V(!this.idbtrans), !s && !d) switch (g && g.name) {
          case "DatabaseClosedError":
            throw new ct.DatabaseClosed(g);
          case "MissingAPIError":
            throw new ct.MissingAPI(g.message, g);
          default:
            throw new ct.OpenFailed(g);
        }
        if (!this.active) throw new ct.TransactionInactive();
        return V(this._completion._state === null), (s = this.idbtrans = s || (this.db.core || d).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Dt(function(y) {
          oi(y), u._reject(s.error);
        }), s.onabort = Dt(function(y) {
          oi(y), u.active && u._reject(new ct.Abort(s.error)), u.active = !1, u.on("abort").fire(y);
        }), s.oncomplete = Dt(function() {
          u.active = !1, u._resolve(), "mutatedParts" in s && Rn.storagemutated.fire(s.mutatedParts);
        }), this;
      }, on.prototype._promise = function(s, u, d) {
        var g = this;
        if (s === "readwrite" && this.mode !== "readwrite") return zt(new ct.ReadOnly("Transaction is readonly"));
        if (!this.active) return zt(new ct.TransactionInactive());
        if (this._locked()) return new it(function(m, E) {
          g._blockedFuncs.push([function() {
            g._promise(s, u, d).then(m, E);
          }, lt]);
        });
        if (d) return Cn(function() {
          var m = new it(function(E, S) {
            g._lock();
            var I = u(E, S, g);
            I && I.then && I.then(E, S);
          });
          return m.finally(function() {
            return g._unlock();
          }), m._lib = !0, m;
        });
        var y = new it(function(m, E) {
          var S = u(m, E, g);
          S && S.then && S.then(m, E);
        });
        return y._lib = !0, y;
      }, on.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, on.prototype.waitFor = function(s) {
        var u, d = this._root(), g = it.resolve(s);
        d._waitingFor ? d._waitingFor = d._waitingFor.then(function() {
          return g;
        }) : (d._waitingFor = g, d._waitingQueue = [], u = d.idbtrans.objectStore(d.storeNames[0]), function m() {
          for (++d._spinCount; d._waitingQueue.length; ) d._waitingQueue.shift()();
          d._waitingFor && (u.get(-1 / 0).onsuccess = m);
        }());
        var y = d._waitingFor;
        return new it(function(m, E) {
          g.then(function(S) {
            return d._waitingQueue.push(Dt(m.bind(null, S)));
          }, function(S) {
            return d._waitingQueue.push(Dt(E.bind(null, S)));
          }).finally(function() {
            d._waitingFor === y && (d._waitingFor = null);
          });
        });
      }, on.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new ct.Abort()));
      }, on.prototype.table = function(s) {
        var u = this._memoizedTables || (this._memoizedTables = {});
        if (h(u, s)) return u[s];
        var d = this.schema[s];
        if (!d) throw new ct.NotFound("Table " + s + " not part of transaction");
        return d = new this.db.Table(s, d, this), d.core = this.db.core.table(s), u[s] = d;
      }, on);
      function on() {
      }
      function Xs(s, u, d, g, y, m, E) {
        return { name: s, keyPath: u, unique: d, multi: g, auto: y, compound: m, src: (d && !E ? "&" : "") + (g ? "*" : "") + (y ? "++" : "") + Ku(u) };
      }
      function Ku(s) {
        return typeof s == "string" ? s : s ? "[" + [].join.call(s, "+") + "]" : "";
      }
      function Qs(s, u, d) {
        return { name: s, primKey: u, indexes: d, mappedClass: null, idxByName: (g = function(y) {
          return [y.name, y];
        }, d.reduce(function(y, m, E) {
          return E = g(m, E), E && (y[E[0]] = E[1]), y;
        }, {})) };
        var g;
      }
      var ai = function(s) {
        try {
          return s.only([[]]), ai = function() {
            return [[]];
          }, [[]];
        } catch {
          return ai = function() {
            return ir;
          }, ir;
        }
      };
      function Js(s) {
        return s == null ? function() {
        } : typeof s == "string" ? (u = s).split(".").length === 1 ? function(d) {
          return d[u];
        } : function(d) {
          return G(d, u);
        } : function(d) {
          return G(d, s);
        };
        var u;
      }
      function Du(s) {
        return [].slice.call(s);
      }
      var Bh = 0;
      function ci(s) {
        return s == null ? ":id" : typeof s == "string" ? s : "[".concat(s.join("+"), "]");
      }
      function _h(s, u, I) {
        function g(N) {
          if (N.type === 3) return null;
          if (N.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var B = N.lower, C = N.upper, O = N.lowerOpen, N = N.upperOpen;
          return B === void 0 ? C === void 0 ? null : u.upperBound(C, !!N) : C === void 0 ? u.lowerBound(B, !!O) : u.bound(B, C, !!O, !!N);
        }
        function y(R) {
          var B, C = R.name;
          return { name: C, schema: R, mutate: function(O) {
            var N = O.trans, K = O.type, M = O.keys, F = O.values, j = O.range;
            return new Promise(function(Z, et) {
              Z = Dt(Z);
              var X = N.objectStore(C), Q = X.keyPath == null, rt = K === "put" || K === "add";
              if (!rt && K !== "delete" && K !== "deleteRange") throw new Error("Invalid operation type: " + K);
              var tt, ut = (M || F || { length: 1 }).length;
              if (M && F && M.length !== F.length) throw new Error("Given keys array must have same length as given values array.");
              if (ut === 0) return Z({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function vt(Ie) {
                ++Me, oi(Ie);
              }
              var kt = [], Tt = [], Me = 0;
              if (K === "deleteRange") {
                if (j.type === 4) return Z({ numFailures: Me, failures: Tt, results: [], lastResult: void 0 });
                j.type === 3 ? kt.push(tt = X.clear()) : kt.push(tt = X.delete(g(j)));
              } else {
                var Q = rt ? Q ? [F, M] : [F, null] : [M, null], bt = Q[0], ve = Q[1];
                if (rt) for (var Ee = 0; Ee < ut; ++Ee) kt.push(tt = ve && ve[Ee] !== void 0 ? X[K](bt[Ee], ve[Ee]) : X[K](bt[Ee])), tt.onerror = vt;
                else for (Ee = 0; Ee < ut; ++Ee) kt.push(tt = X[K](bt[Ee])), tt.onerror = vt;
              }
              function Eo(Ie) {
                Ie = Ie.target.result, kt.forEach(function(cr, ya) {
                  return cr.error != null && (Tt[ya] = cr.error);
                }), Z({ numFailures: Me, failures: Tt, results: K === "delete" ? M : kt.map(function(cr) {
                  return cr.result;
                }), lastResult: Ie });
              }
              tt.onerror = function(Ie) {
                vt(Ie), Eo(Ie);
              }, tt.onsuccess = Eo;
            });
          }, getMany: function(O) {
            var N = O.trans, K = O.keys;
            return new Promise(function(M, F) {
              M = Dt(M);
              for (var j, Z = N.objectStore(C), et = K.length, X = new Array(et), Q = 0, rt = 0, tt = function(kt) {
                kt = kt.target, X[kt._pos] = kt.result, ++rt === Q && M(X);
              }, ut = rn(F), vt = 0; vt < et; ++vt) K[vt] != null && ((j = Z.get(K[vt]))._pos = vt, j.onsuccess = tt, j.onerror = ut, ++Q);
              Q === 0 && M(X);
            });
          }, get: function(O) {
            var N = O.trans, K = O.key;
            return new Promise(function(M, F) {
              M = Dt(M);
              var j = N.objectStore(C).get(K);
              j.onsuccess = function(Z) {
                return M(Z.target.result);
              }, j.onerror = rn(F);
            });
          }, query: (B = _, function(O) {
            return new Promise(function(N, K) {
              N = Dt(N);
              var M, F, j, Q = O.trans, Z = O.values, et = O.limit, tt = O.query, X = et === 1 / 0 ? void 0 : et, rt = tt.index, tt = tt.range, Q = Q.objectStore(C), rt = rt.isPrimaryKey ? Q : Q.index(rt.name), tt = g(tt);
              if (et === 0) return N({ result: [] });
              B ? ((X = Z ? rt.getAll(tt, X) : rt.getAllKeys(tt, X)).onsuccess = function(ut) {
                return N({ result: ut.target.result });
              }, X.onerror = rn(K)) : (M = 0, F = !Z && "openKeyCursor" in rt ? rt.openKeyCursor(tt) : rt.openCursor(tt), j = [], F.onsuccess = function(ut) {
                var vt = F.result;
                return vt ? (j.push(Z ? vt.value : vt.primaryKey), ++M === et ? N({ result: j }) : void vt.continue()) : N({ result: j });
              }, F.onerror = rn(K));
            });
          }), openCursor: function(O) {
            var N = O.trans, K = O.values, M = O.query, F = O.reverse, j = O.unique;
            return new Promise(function(Z, et) {
              Z = Dt(Z);
              var rt = M.index, X = M.range, Q = N.objectStore(C), Q = rt.isPrimaryKey ? Q : Q.index(rt.name), rt = F ? j ? "prevunique" : "prev" : j ? "nextunique" : "next", tt = !K && "openKeyCursor" in Q ? Q.openKeyCursor(g(X), rt) : Q.openCursor(g(X), rt);
              tt.onerror = rn(et), tt.onsuccess = Dt(function(ut) {
                var vt, kt, Tt, Me, bt = tt.result;
                bt ? (bt.___id = ++Bh, bt.done = !1, vt = bt.continue.bind(bt), kt = (kt = bt.continuePrimaryKey) && kt.bind(bt), Tt = bt.advance.bind(bt), Me = function() {
                  throw new Error("Cursor not stopped");
                }, bt.trans = N, bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = function() {
                  throw new Error("Cursor not started");
                }, bt.fail = Dt(et), bt.next = function() {
                  var ve = this, Ee = 1;
                  return this.start(function() {
                    return Ee-- ? ve.continue() : ve.stop();
                  }).then(function() {
                    return ve;
                  });
                }, bt.start = function(ve) {
                  function Ee() {
                    if (tt.result) try {
                      ve();
                    } catch (Ie) {
                      bt.fail(Ie);
                    }
                    else bt.done = !0, bt.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, bt.stop();
                  }
                  var Eo = new Promise(function(Ie, cr) {
                    Ie = Dt(Ie), tt.onerror = rn(cr), bt.fail = cr, bt.stop = function(ya) {
                      bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = Me, Ie(ya);
                    };
                  });
                  return tt.onsuccess = Dt(function(Ie) {
                    tt.onsuccess = Ee, Ee();
                  }), bt.continue = vt, bt.continuePrimaryKey = kt, bt.advance = Tt, Ee(), Eo;
                }, Z(bt)) : Z(null);
              }, et);
            });
          }, count: function(O) {
            var N = O.query, K = O.trans, M = N.index, F = N.range;
            return new Promise(function(j, Z) {
              var et = K.objectStore(C), X = M.isPrimaryKey ? et : et.index(M.name), et = g(F), X = et ? X.count(et) : X.count();
              X.onsuccess = Dt(function(Q) {
                return j(Q.target.result);
              }), X.onerror = rn(Z);
            });
          } };
        }
        var m, E, S, U = (E = I, S = Du((m = s).objectStoreNames), { schema: { name: m.name, tables: S.map(function(R) {
          return E.objectStore(R);
        }).map(function(R) {
          var B = R.keyPath, N = R.autoIncrement, C = c(B), O = {}, N = { name: R.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: B == null, compound: C, keyPath: B, autoIncrement: N, unique: !0, extractKey: Js(B) }, indexes: Du(R.indexNames).map(function(K) {
            return R.index(K);
          }).map(function(j) {
            var M = j.name, F = j.unique, Z = j.multiEntry, j = j.keyPath, Z = { name: M, compound: c(j), keyPath: j, unique: F, multiEntry: Z, extractKey: Js(j) };
            return O[ci(j)] = Z;
          }), getIndexByKeyPath: function(K) {
            return O[ci(K)];
          } };
          return O[":id"] = N.primaryKey, B != null && (O[ci(B)] = N.primaryKey), N;
        }) }, hasGetAll: 0 < S.length && "getAll" in E.objectStore(S[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), I = U.schema, _ = U.hasGetAll, U = I.tables.map(y), A = {};
        return U.forEach(function(R) {
          return A[R.name] = R;
        }), { stack: "dbcore", transaction: s.transaction.bind(s), table: function(R) {
          if (!A[R]) throw new Error("Table '".concat(R, "' not found"));
          return A[R];
        }, MIN_KEY: -1 / 0, MAX_KEY: ai(u), schema: I };
      }
      function Nh(s, u, d, g) {
        var y = d.IDBKeyRange;
        return d.indexedDB, { dbcore: (g = _h(u, y, g), s.dbcore.reduce(function(m, E) {
          return E = E.create, r(r({}, m), E(m));
        }, g)) };
      }
      function co(s, g) {
        var d = g.db, g = Nh(s._middlewares, d, s._deps, g);
        s.core = g.dbcore, s.tables.forEach(function(y) {
          var m = y.name;
          s.core.schema.tables.some(function(E) {
            return E.name === m;
          }) && (y.core = s.core.table(m), s[m] instanceof s.Table && (s[m].core = y.core));
        });
      }
      function uo(s, u, d, g) {
        d.forEach(function(y) {
          var m = g[y];
          u.forEach(function(E) {
            var S = function I(_, U) {
              return v(_, U) || (_ = l(_)) && I(_, U);
            }(E, y);
            (!S || "value" in S && S.value === void 0) && (E === s.Transaction.prototype || E instanceof s.Transaction ? T(E, y, { get: function() {
              return this.table(y);
            }, set: function(I) {
              b(this, y, { value: I, writable: !0, configurable: !0, enumerable: !0 });
            } }) : E[y] = new s.Table(y, m));
          });
        });
      }
      function ta(s, u) {
        u.forEach(function(d) {
          for (var g in d) d[g] instanceof s.Table && delete d[g];
        });
      }
      function Ch(s, u) {
        return s._cfg.version - u._cfg.version;
      }
      function Uh(s, u, d, g) {
        var y = s._dbSchema;
        d.objectStoreNames.contains("$meta") && !y.$meta && (y.$meta = Qs("$meta", Fu("")[0], []), s._storeNames.push("$meta"));
        var m = s._createTransaction("readwrite", s._storeNames, y);
        m.create(d), m._completion.catch(g);
        var E = m._reject.bind(m), S = lt.transless || lt;
        Cn(function() {
          return lt.trans = m, lt.transless = S, u !== 0 ? (co(s, d), _ = u, ((I = m).storeNames.includes("$meta") ? I.table("$meta").get("version").then(function(U) {
            return U ?? _;
          }) : it.resolve(_)).then(function(U) {
            return R = U, B = m, C = d, O = [], U = (A = s)._versions, N = A._dbSchema = lo(0, A.idbdb, C), (U = U.filter(function(K) {
              return K._cfg.version >= R;
            })).length !== 0 ? (U.forEach(function(K) {
              O.push(function() {
                var M = N, F = K._cfg.dbschema;
                ho(A, M, C), ho(A, F, C), N = A._dbSchema = F;
                var j = ea(M, F);
                j.add.forEach(function(rt) {
                  na(C, rt[0], rt[1].primKey, rt[1].indexes);
                }), j.change.forEach(function(rt) {
                  if (rt.recreate) throw new ct.Upgrade("Not yet support for changing primary key");
                  var tt = C.objectStore(rt.name);
                  rt.add.forEach(function(ut) {
                    return fo(tt, ut);
                  }), rt.change.forEach(function(ut) {
                    tt.deleteIndex(ut.name), fo(tt, ut);
                  }), rt.del.forEach(function(ut) {
                    return tt.deleteIndex(ut);
                  });
                });
                var Z = K._cfg.contentUpgrade;
                if (Z && K._cfg.version > R) {
                  co(A, C), B._memoizedTables = {};
                  var et = J(F);
                  j.del.forEach(function(rt) {
                    et[rt] = M[rt];
                  }), ta(A, [A.Transaction.prototype]), uo(A, [A.Transaction.prototype], a(et), et), B.schema = et;
                  var X, Q = It(Z);
                  return Q && xr(), j = it.follow(function() {
                    var rt;
                    (X = Z(B)) && Q && (rt = Un.bind(null, null), X.then(rt, rt));
                  }), X && typeof X.then == "function" ? it.resolve(X) : j.then(function() {
                    return X;
                  });
                }
              }), O.push(function(M) {
                var F, j, Z = K._cfg.dbschema;
                F = Z, j = M, [].slice.call(j.db.objectStoreNames).forEach(function(et) {
                  return F[et] == null && j.db.deleteObjectStore(et);
                }), ta(A, [A.Transaction.prototype]), uo(A, [A.Transaction.prototype], A._storeNames, A._dbSchema), B.schema = A._dbSchema;
              }), O.push(function(M) {
                A.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(A.idbdb.version / 10) === K._cfg.version ? (A.idbdb.deleteObjectStore("$meta"), delete A._dbSchema.$meta, A._storeNames = A._storeNames.filter(function(F) {
                  return F !== "$meta";
                })) : M.objectStore("$meta").put(K._cfg.version, "version"));
              });
            }), function K() {
              return O.length ? it.resolve(O.shift()(B.idbtrans)).then(K) : it.resolve();
            }().then(function() {
              Mu(N, C);
            })) : it.resolve();
            var A, R, B, C, O, N;
          }).catch(E)) : (a(y).forEach(function(U) {
            na(d, U, y[U].primKey, y[U].indexes);
          }), co(s, d), void it.follow(function() {
            return s.on.populate.fire(m);
          }).catch(E));
          var I, _;
        });
      }
      function $h(s, u) {
        Mu(s._dbSchema, u), u.db.version % 10 != 0 || u.objectStoreNames.contains("$meta") || u.db.createObjectStore("$meta").add(Math.ceil(u.db.version / 10 - 1), "version");
        var d = lo(0, s.idbdb, u);
        ho(s, s._dbSchema, u);
        for (var g = 0, y = ea(d, s._dbSchema).change; g < y.length; g++) {
          var m = function(E) {
            if (E.change.length || E.recreate) return console.warn("Unable to patch indexes of table ".concat(E.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var S = u.objectStore(E.name);
            E.add.forEach(function(I) {
              nn && console.debug("Dexie upgrade patch: Creating missing index ".concat(E.name, ".").concat(I.src)), fo(S, I);
            });
          }(y[g]);
          if (typeof m == "object") return m.value;
        }
      }
      function ea(s, u) {
        var d, g = { del: [], add: [], change: [] };
        for (d in s) u[d] || g.del.push(d);
        for (d in u) {
          var y = s[d], m = u[d];
          if (y) {
            var E = { name: d, def: m, recreate: !1, del: [], add: [], change: [] };
            if ("" + (y.primKey.keyPath || "") != "" + (m.primKey.keyPath || "") || y.primKey.auto !== m.primKey.auto) E.recreate = !0, g.change.push(E);
            else {
              var S = y.idxByName, I = m.idxByName, _ = void 0;
              for (_ in S) I[_] || E.del.push(_);
              for (_ in I) {
                var U = S[_], A = I[_];
                U ? U.src !== A.src && E.change.push(A) : E.add.push(A);
              }
              (0 < E.del.length || 0 < E.add.length || 0 < E.change.length) && g.change.push(E);
            }
          } else g.add.push([d, m]);
        }
        return g;
      }
      function na(s, u, d, g) {
        var y = s.db.createObjectStore(u, d.keyPath ? { keyPath: d.keyPath, autoIncrement: d.auto } : { autoIncrement: d.auto });
        return g.forEach(function(m) {
          return fo(y, m);
        }), y;
      }
      function Mu(s, u) {
        a(s).forEach(function(d) {
          u.db.objectStoreNames.contains(d) || (nn && console.debug("Dexie: Creating missing table", d), na(u, d, s[d].primKey, s[d].indexes));
        });
      }
      function fo(s, u) {
        s.createIndex(u.name, u.keyPath, { unique: u.unique, multiEntry: u.multi });
      }
      function lo(s, u, d) {
        var g = {};
        return $(u.objectStoreNames, 0).forEach(function(y) {
          for (var m = d.objectStore(y), E = Xs(Ku(_ = m.keyPath), _ || "", !0, !1, !!m.autoIncrement, _ && typeof _ != "string", !0), S = [], I = 0; I < m.indexNames.length; ++I) {
            var U = m.index(m.indexNames[I]), _ = U.keyPath, U = Xs(U.name, _, !!U.unique, !!U.multiEntry, !1, _ && typeof _ != "string", !1);
            S.push(U);
          }
          g[y] = Qs(y, E, S);
        }), g;
      }
      function ho(s, u, d) {
        for (var g = d.db.objectStoreNames, y = 0; y < g.length; ++y) {
          var m = g[y], E = d.objectStore(m);
          s._hasGetAll = "getAll" in E;
          for (var S = 0; S < E.indexNames.length; ++S) {
            var I = E.indexNames[S], _ = E.index(I).keyPath, U = typeof _ == "string" ? _ : "[" + $(_).join("+") + "]";
            !u[m] || (_ = u[m].idxByName[U]) && (_.name = I, delete u[m].idxByName[U], u[m].idxByName[I] = _);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && o.WorkerGlobalScope && o instanceof o.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (s._hasGetAll = !1);
      }
      function Fu(s) {
        return s.split(",").map(function(u, d) {
          var g = (u = u.trim()).replace(/([&*]|\+\+)/g, ""), y = /^\[/.test(g) ? g.match(/^\[(.*)\]$/)[1].split("+") : g;
          return Xs(g, y || null, /\&/.test(u), /\*/.test(u), /\+\+/.test(u), c(y), d === 0);
        });
      }
      var Oh = (po.prototype._parseStoresSpec = function(s, u) {
        a(s).forEach(function(d) {
          if (s[d] !== null) {
            var g = Fu(s[d]), y = g.shift();
            if (y.unique = !0, y.multi) throw new ct.Schema("Primary key cannot be multi-valued");
            g.forEach(function(m) {
              if (m.auto) throw new ct.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!m.keyPath) throw new ct.Schema("Index must have a name and cannot be an empty string");
            }), u[d] = Qs(d, y, g);
          }
        });
      }, po.prototype.stores = function(d) {
        var u = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? f(this._cfg.storesSource, d) : d;
        var d = u._versions, g = {}, y = {};
        return d.forEach(function(m) {
          f(g, m._cfg.storesSource), y = m._cfg.dbschema = {}, m._parseStoresSpec(g, y);
        }), u._dbSchema = y, ta(u, [u._allTables, u, u.Transaction.prototype]), uo(u, [u._allTables, u, u.Transaction.prototype, this._cfg.tables], a(y), y), u._storeNames = a(y), this;
      }, po.prototype.upgrade = function(s) {
        return this._cfg.contentUpgrade = Ls(this._cfg.contentUpgrade || mt, s), this;
      }, po);
      function po() {
      }
      function ra(s, u) {
        var d = s._dbNamesDB;
        return d || (d = s._dbNamesDB = new yn(ro, { addons: [], indexedDB: s, IDBKeyRange: u })).version(1).stores({ dbnames: "name" }), d.table("dbnames");
      }
      function ia(s) {
        return s && typeof s.databases == "function";
      }
      function oa(s) {
        return Cn(function() {
          return lt.letThrough = !0, s();
        });
      }
      function sa(s) {
        return !("from" in s);
      }
      var be = function(s, u) {
        if (!this) {
          var d = new be();
          return s && "d" in s && f(d, s), d;
        }
        f(this, arguments.length ? { d: 1, from: s, to: 1 < arguments.length ? u : s } : { d: 0 });
      };
      function ui(s, u, d) {
        var g = Bt(u, d);
        if (!isNaN(g)) {
          if (0 < g) throw RangeError();
          if (sa(s)) return f(s, { from: u, to: d, d: 1 });
          var y = s.l, g = s.r;
          if (Bt(d, s.from) < 0) return y ? ui(y, u, d) : s.l = { from: u, to: d, d: 1, l: null, r: null }, Hu(s);
          if (0 < Bt(u, s.to)) return g ? ui(g, u, d) : s.r = { from: u, to: d, d: 1, l: null, r: null }, Hu(s);
          Bt(u, s.from) < 0 && (s.from = u, s.l = null, s.d = g ? g.d + 1 : 1), 0 < Bt(d, s.to) && (s.to = d, s.r = null, s.d = s.l ? s.l.d + 1 : 1), d = !s.r, y && !s.l && fi(s, y), g && d && fi(s, g);
        }
      }
      function fi(s, u) {
        sa(u) || function d(g, I) {
          var m = I.from, E = I.to, S = I.l, I = I.r;
          ui(g, m, E), S && d(g, S), I && d(g, I);
        }(s, u);
      }
      function qu(s, u) {
        var d = go(u), g = d.next();
        if (g.done) return !1;
        for (var y = g.value, m = go(s), E = m.next(y.from), S = E.value; !g.done && !E.done; ) {
          if (Bt(S.from, y.to) <= 0 && 0 <= Bt(S.to, y.from)) return !0;
          Bt(y.from, S.from) < 0 ? y = (g = d.next(S.from)).value : S = (E = m.next(y.from)).value;
        }
        return !1;
      }
      function go(s) {
        var u = sa(s) ? null : { s: 0, n: s };
        return { next: function(d) {
          for (var g = 0 < arguments.length; u; ) switch (u.s) {
            case 0:
              if (u.s = 1, g) for (; u.n.l && Bt(d, u.n.from) < 0; ) u = { up: u, n: u.n.l, s: 1 };
              else for (; u.n.l; ) u = { up: u, n: u.n.l, s: 1 };
            case 1:
              if (u.s = 2, !g || Bt(d, u.n.to) <= 0) return { value: u.n, done: !1 };
            case 2:
              if (u.n.r) {
                u.s = 3, u = { up: u, n: u.n.r, s: 0 };
                continue;
              }
            case 3:
              u = u.up;
          }
          return { done: !0 };
        } };
      }
      function Hu(s) {
        var u, d, g = (((u = s.r) === null || u === void 0 ? void 0 : u.d) || 0) - (((d = s.l) === null || d === void 0 ? void 0 : d.d) || 0), y = 1 < g ? "r" : g < -1 ? "l" : "";
        y && (u = y == "r" ? "l" : "r", d = r({}, s), g = s[y], s.from = g.from, s.to = g.to, s[y] = g[y], d[y] = g[u], (s[u] = d).d = Vu(d)), s.d = Vu(s);
      }
      function Vu(d) {
        var u = d.r, d = d.l;
        return (u ? d ? Math.max(u.d, d.d) : u.d : d ? d.d : 0) + 1;
      }
      function wo(s, u) {
        return a(u).forEach(function(d) {
          s[d] ? fi(s[d], u[d]) : s[d] = function g(y) {
            var m, E, S = {};
            for (m in y) h(y, m) && (E = y[m], S[m] = !E || typeof E != "object" || ft.has(E.constructor) ? E : g(E));
            return S;
          }(u[d]);
        }), s;
      }
      function aa(s, u) {
        return s.all || u.all || Object.keys(s).some(function(d) {
          return u[d] && qu(u[d], s[d]);
        });
      }
      w(be.prototype, ((Fe = { add: function(s) {
        return fi(this, s), this;
      }, addKey: function(s) {
        return ui(this, s, s), this;
      }, addKeys: function(s) {
        var u = this;
        return s.forEach(function(d) {
          return ui(u, d, d);
        }), this;
      }, hasKey: function(s) {
        var u = go(this).next(s).value;
        return u && Bt(u.from, s) <= 0 && 0 <= Bt(u.to, s);
      } })[D] = function() {
        return go(this);
      }, Fe));
      var sr = {}, ca = {}, ua = !1;
      function yo(s) {
        wo(ca, s), ua || (ua = !0, setTimeout(function() {
          ua = !1, fa(ca, !(ca = {}));
        }, 0));
      }
      function fa(s, u) {
        u === void 0 && (u = !1);
        var d = /* @__PURE__ */ new Set();
        if (s.all) for (var g = 0, y = Object.values(sr); g < y.length; g++) ju(E = y[g], s, d, u);
        else for (var m in s) {
          var E, S = /^idb\:\/\/(.*)\/(.*)\//.exec(m);
          S && (m = S[1], S = S[2], (E = sr["idb://".concat(m, "/").concat(S)]) && ju(E, s, d, u));
        }
        d.forEach(function(I) {
          return I();
        });
      }
      function ju(s, u, d, g) {
        for (var y = [], m = 0, E = Object.entries(s.queries.query); m < E.length; m++) {
          for (var S = E[m], I = S[0], _ = [], U = 0, A = S[1]; U < A.length; U++) {
            var R = A[U];
            aa(u, R.obsSet) ? R.subscribers.forEach(function(N) {
              return d.add(N);
            }) : g && _.push(R);
          }
          g && y.push([I, _]);
        }
        if (g) for (var B = 0, C = y; B < C.length; B++) {
          var O = C[B], I = O[0], _ = O[1];
          s.queries.query[I] = _;
        }
      }
      function Rh(s) {
        var u = s._state, d = s._deps.indexedDB;
        if (u.isBeingOpened || s.idbdb) return u.dbReadyPromise.then(function() {
          return u.dbOpenError ? zt(u.dbOpenError) : s;
        });
        u.isBeingOpened = !0, u.dbOpenError = null, u.openComplete = !1;
        var g = u.openCanceller, y = Math.round(10 * s.verno), m = !1;
        function E() {
          if (u.openCanceller !== g) throw new ct.DatabaseClosed("db.open() was cancelled");
        }
        function S() {
          return new it(function(R, B) {
            if (E(), !d) throw new ct.MissingAPI();
            var C = s.name, O = u.autoSchema || !y ? d.open(C) : d.open(C, y);
            if (!O) throw new ct.MissingAPI();
            O.onerror = rn(B), O.onblocked = Dt(s._fireOnBlocked), O.onupgradeneeded = Dt(function(N) {
              var K;
              U = O.transaction, u.autoSchema && !s._options.allowEmptyDB ? (O.onerror = oi, U.abort(), O.result.close(), (K = d.deleteDatabase(C)).onsuccess = K.onerror = Dt(function() {
                B(new ct.NoSuchDatabase("Database ".concat(C, " doesnt exist")));
              })) : (U.onerror = rn(B), N = N.oldVersion > Math.pow(2, 62) ? 0 : N.oldVersion, A = N < 1, s.idbdb = O.result, m && $h(s, U), Uh(s, N / 10, U, B));
            }, B), O.onsuccess = Dt(function() {
              U = null;
              var N, K, M, F, j, Z = s.idbdb = O.result, et = $(Z.objectStoreNames);
              if (0 < et.length) try {
                var X = Z.transaction((F = et).length === 1 ? F[0] : F, "readonly");
                if (u.autoSchema) K = Z, M = X, (N = s).verno = K.version / 10, M = N._dbSchema = lo(0, K, M), N._storeNames = $(K.objectStoreNames, 0), uo(N, [N._allTables], a(M), M);
                else if (ho(s, s._dbSchema, X), ((j = ea(lo(0, (j = s).idbdb, X), j._dbSchema)).add.length || j.change.some(function(Q) {
                  return Q.add.length || Q.change.length;
                })) && !m) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), Z.close(), y = Z.version + 1, m = !0, R(S());
                co(s, X);
              } catch {
              }
              Sr.push(s), Z.onversionchange = Dt(function(Q) {
                u.vcFired = !0, s.on("versionchange").fire(Q);
              }), Z.onclose = Dt(function(Q) {
                s.on("close").fire(Q);
              }), A && (j = s._deps, X = C, Z = j.indexedDB, j = j.IDBKeyRange, ia(Z) || X === ro || ra(Z, j).put({ name: X }).catch(mt)), R();
            }, B);
          }).catch(function(R) {
            switch (R == null ? void 0 : R.name) {
              case "UnknownError":
                if (0 < u.PR1398_maxLoop) return u.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), S();
                break;
              case "VersionError":
                if (0 < y) return y = 0, S();
            }
            return it.reject(R);
          });
        }
        var I, _ = u.dbReadyResolve, U = null, A = !1;
        return it.race([g, (typeof navigator > "u" ? it.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(R) {
          function B() {
            return indexedDB.databases().finally(R);
          }
          I = setInterval(B, 100), B();
        }).finally(function() {
          return clearInterval(I);
        }) : Promise.resolve()).then(S)]).then(function() {
          return E(), u.onReadyBeingFired = [], it.resolve(oa(function() {
            return s.on.ready.fire(s.vip);
          })).then(function R() {
            if (0 < u.onReadyBeingFired.length) {
              var B = u.onReadyBeingFired.reduce(Ls, mt);
              return u.onReadyBeingFired = [], it.resolve(oa(function() {
                return B(s.vip);
              })).then(R);
            }
          });
        }).finally(function() {
          u.openCanceller === g && (u.onReadyBeingFired = null, u.isBeingOpened = !1);
        }).catch(function(R) {
          u.dbOpenError = R;
          try {
            U && U.abort();
          } catch {
          }
          return g === u.openCanceller && s._close(), zt(R);
        }).finally(function() {
          u.openComplete = !0, _();
        }).then(function() {
          var R;
          return A && (R = {}, s.tables.forEach(function(B) {
            B.schema.indexes.forEach(function(C) {
              C.name && (R["idb://".concat(s.name, "/").concat(B.name, "/").concat(C.name)] = new be(-1 / 0, [[[]]]));
            }), R["idb://".concat(s.name, "/").concat(B.name, "/")] = R["idb://".concat(s.name, "/").concat(B.name, "/:dels")] = new be(-1 / 0, [[[]]]);
          }), Rn(si).fire(R), fa(R, !0)), s;
        });
      }
      function la(s) {
        function u(m) {
          return s.next(m);
        }
        var d = y(u), g = y(function(m) {
          return s.throw(m);
        });
        function y(m) {
          return function(I) {
            var S = m(I), I = S.value;
            return S.done ? I : I && typeof I.then == "function" ? I.then(d, g) : c(I) ? Promise.all(I).then(d, g) : d(I);
          };
        }
        return y(u)();
      }
      function mo(s, u, d) {
        for (var g = c(s) ? s.slice() : [s], y = 0; y < d; ++y) g.push(u);
        return g;
      }
      var Lh = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(s) {
        return r(r({}, s), { table: function(u) {
          var d = s.table(u), g = d.schema, y = {}, m = [];
          function E(A, R, B) {
            var C = ci(A), O = y[C] = y[C] || [], N = A == null ? 0 : typeof A == "string" ? 1 : A.length, K = 0 < R, K = r(r({}, B), { name: K ? "".concat(C, "(virtual-from:").concat(B.name, ")") : B.name, lowLevelIndex: B, isVirtual: K, keyTail: R, keyLength: N, extractKey: Js(A), unique: !K && B.unique });
            return O.push(K), K.isPrimaryKey || m.push(K), 1 < N && E(N === 2 ? A[0] : A.slice(0, N - 1), R + 1, B), O.sort(function(M, F) {
              return M.keyTail - F.keyTail;
            }), K;
          }
          u = E(g.primaryKey.keyPath, 0, g.primaryKey), y[":id"] = [u];
          for (var S = 0, I = g.indexes; S < I.length; S++) {
            var _ = I[S];
            E(_.keyPath, 0, _);
          }
          function U(A) {
            var R, B = A.query.index;
            return B.isVirtual ? r(r({}, A), { query: { index: B.lowLevelIndex, range: (R = A.query.range, B = B.keyTail, { type: R.type === 1 ? 2 : R.type, lower: mo(R.lower, R.lowerOpen ? s.MAX_KEY : s.MIN_KEY, B), lowerOpen: !0, upper: mo(R.upper, R.upperOpen ? s.MIN_KEY : s.MAX_KEY, B), upperOpen: !0 }) } }) : A;
          }
          return r(r({}, d), { schema: r(r({}, g), { primaryKey: u, indexes: m, getIndexByKeyPath: function(A) {
            return (A = y[ci(A)]) && A[0];
          } }), count: function(A) {
            return d.count(U(A));
          }, query: function(A) {
            return d.query(U(A));
          }, openCursor: function(A) {
            var R = A.query.index, B = R.keyTail, C = R.isVirtual, O = R.keyLength;
            return C ? d.openCursor(U(A)).then(function(K) {
              return K && N(K);
            }) : d.openCursor(A);
            function N(K) {
              return Object.create(K, { continue: { value: function(M) {
                M != null ? K.continue(mo(M, A.reverse ? s.MAX_KEY : s.MIN_KEY, B)) : A.unique ? K.continue(K.key.slice(0, O).concat(A.reverse ? s.MIN_KEY : s.MAX_KEY, B)) : K.continue();
              } }, continuePrimaryKey: { value: function(M, F) {
                K.continuePrimaryKey(mo(M, s.MAX_KEY, B), F);
              } }, primaryKey: { get: function() {
                return K.primaryKey;
              } }, key: { get: function() {
                var M = K.key;
                return O === 1 ? M[0] : M.slice(0, O);
              } }, value: { get: function() {
                return K.value;
              } } });
            }
          } });
        } });
      } };
      function da(s, u, d, g) {
        return d = d || {}, g = g || "", a(s).forEach(function(y) {
          var m, E, S;
          h(u, y) ? (m = s[y], E = u[y], typeof m == "object" && typeof E == "object" && m && E ? (S = H(m)) !== H(E) ? d[g + y] = u[y] : S === "Object" ? da(m, E, d, g + y + ".") : m !== E && (d[g + y] = u[y]) : m !== E && (d[g + y] = u[y])) : d[g + y] = void 0;
        }), a(u).forEach(function(y) {
          h(s, y) || (d[g + y] = u[y]);
        }), d;
      }
      function ha(s, u) {
        return u.type === "delete" ? u.keys : u.keys || u.values.map(s.extractKey);
      }
      var Ph = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(s) {
        return r(r({}, s), { table: function(u) {
          var d = s.table(u), g = d.schema.primaryKey;
          return r(r({}, d), { mutate: function(y) {
            var m = lt.trans, E = m.table(u).hook, S = E.deleting, I = E.creating, _ = E.updating;
            switch (y.type) {
              case "add":
                if (I.fire === mt) break;
                return m._promise("readwrite", function() {
                  return U(y);
                }, !0);
              case "put":
                if (I.fire === mt && _.fire === mt) break;
                return m._promise("readwrite", function() {
                  return U(y);
                }, !0);
              case "delete":
                if (S.fire === mt) break;
                return m._promise("readwrite", function() {
                  return U(y);
                }, !0);
              case "deleteRange":
                if (S.fire === mt) break;
                return m._promise("readwrite", function() {
                  return function A(R, B, C) {
                    return d.query({ trans: R, values: !1, query: { index: g, range: B }, limit: C }).then(function(O) {
                      var N = O.result;
                      return U({ type: "delete", keys: N, trans: R }).then(function(K) {
                        return 0 < K.numFailures ? Promise.reject(K.failures[0]) : N.length < C ? { failures: [], numFailures: 0, lastResult: void 0 } : A(R, r(r({}, B), { lower: N[N.length - 1], lowerOpen: !0 }), C);
                      });
                    });
                  }(y.trans, y.range, 1e4);
                }, !0);
            }
            return d.mutate(y);
            function U(A) {
              var R, B, C, O = lt.trans, N = A.keys || ha(g, A);
              if (!N) throw new Error("Keys missing");
              return (A = A.type === "add" || A.type === "put" ? r(r({}, A), { keys: N }) : r({}, A)).type !== "delete" && (A.values = i([], A.values)), A.keys && (A.keys = i([], A.keys)), R = d, C = N, ((B = A).type === "add" ? Promise.resolve([]) : R.getMany({ trans: B.trans, keys: C, cache: "immutable" })).then(function(K) {
                var M = N.map(function(F, j) {
                  var Z, et, X, Q = K[j], rt = { onerror: null, onsuccess: null };
                  return A.type === "delete" ? S.fire.call(rt, F, Q, O) : A.type === "add" || Q === void 0 ? (Z = I.fire.call(rt, F, A.values[j], O), F == null && Z != null && (A.keys[j] = F = Z, g.outbound || z(A.values[j], g.keyPath, F))) : (Z = da(Q, A.values[j]), (et = _.fire.call(rt, Z, F, Q, O)) && (X = A.values[j], Object.keys(et).forEach(function(tt) {
                    h(X, tt) ? X[tt] = et[tt] : z(X, tt, et[tt]);
                  }))), rt;
                });
                return d.mutate(A).then(function(F) {
                  for (var j = F.failures, Z = F.results, et = F.numFailures, F = F.lastResult, X = 0; X < N.length; ++X) {
                    var Q = (Z || N)[X], rt = M[X];
                    Q == null ? rt.onerror && rt.onerror(j[X]) : rt.onsuccess && rt.onsuccess(A.type === "put" && K[X] ? A.values[X] : Q);
                  }
                  return { failures: j, results: Z, numFailures: et, lastResult: F };
                }).catch(function(F) {
                  return M.forEach(function(j) {
                    return j.onerror && j.onerror(F);
                  }), Promise.reject(F);
                });
              });
            }
          } });
        } });
      } };
      function zu(s, u, d) {
        try {
          if (!u || u.keys.length < s.length) return null;
          for (var g = [], y = 0, m = 0; y < u.keys.length && m < s.length; ++y) Bt(u.keys[y], s[m]) === 0 && (g.push(d ? xt(u.values[y]) : u.values[y]), ++m);
          return g.length === s.length ? g : null;
        } catch {
          return null;
        }
      }
      var Kh = { stack: "dbcore", level: -1, create: function(s) {
        return { table: function(u) {
          var d = s.table(u);
          return r(r({}, d), { getMany: function(g) {
            if (!g.cache) return d.getMany(g);
            var y = zu(g.keys, g.trans._cache, g.cache === "clone");
            return y ? it.resolve(y) : d.getMany(g).then(function(m) {
              return g.trans._cache = { keys: g.keys, values: g.cache === "clone" ? xt(m) : m }, m;
            });
          }, mutate: function(g) {
            return g.type !== "add" && (g.trans._cache = null), d.mutate(g);
          } });
        } };
      } };
      function Gu(s, u) {
        return s.trans.mode === "readonly" && !!s.subscr && !s.trans.explicit && s.trans.db._options.cache !== "disabled" && !u.schema.primaryKey.outbound;
      }
      function Wu(s, u) {
        switch (s) {
          case "query":
            return u.values && !u.unique;
          case "get":
          case "getMany":
          case "count":
          case "openCursor":
            return !1;
        }
      }
      var Dh = { stack: "dbcore", level: 0, name: "Observability", create: function(s) {
        var u = s.schema.name, d = new be(s.MIN_KEY, s.MAX_KEY);
        return r(r({}, s), { transaction: function(g, y, m) {
          if (lt.subscr && y !== "readonly") throw new ct.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(lt.querier));
          return s.transaction(g, y, m);
        }, table: function(g) {
          var y = s.table(g), m = y.schema, E = m.primaryKey, A = m.indexes, S = E.extractKey, I = E.outbound, _ = E.autoIncrement && A.filter(function(B) {
            return B.compound && B.keyPath.includes(E.keyPath);
          }), U = r(r({}, y), { mutate: function(B) {
            function C(tt) {
              return tt = "idb://".concat(u, "/").concat(g, "/").concat(tt), F[tt] || (F[tt] = new be());
            }
            var O, N, K, M = B.trans, F = B.mutatedParts || (B.mutatedParts = {}), j = C(""), Z = C(":dels"), et = B.type, rt = B.type === "deleteRange" ? [B.range] : B.type === "delete" ? [B.keys] : B.values.length < 50 ? [ha(E, B).filter(function(tt) {
              return tt;
            }), B.values] : [], X = rt[0], Q = rt[1], rt = B.trans._cache;
            return c(X) ? (j.addKeys(X), (rt = et === "delete" || X.length === Q.length ? zu(X, rt) : null) || Z.addKeys(X), (rt || Q) && (O = C, N = rt, K = Q, m.indexes.forEach(function(tt) {
              var ut = O(tt.name || "");
              function vt(Tt) {
                return Tt != null ? tt.extractKey(Tt) : null;
              }
              function kt(Tt) {
                return tt.multiEntry && c(Tt) ? Tt.forEach(function(Me) {
                  return ut.addKey(Me);
                }) : ut.addKey(Tt);
              }
              (N || K).forEach(function(Tt, ve) {
                var bt = N && vt(N[ve]), ve = K && vt(K[ve]);
                Bt(bt, ve) !== 0 && (bt != null && kt(bt), ve != null && kt(ve));
              });
            }))) : X ? (Q = { from: (Q = X.lower) !== null && Q !== void 0 ? Q : s.MIN_KEY, to: (Q = X.upper) !== null && Q !== void 0 ? Q : s.MAX_KEY }, Z.add(Q), j.add(Q)) : (j.add(d), Z.add(d), m.indexes.forEach(function(tt) {
              return C(tt.name).add(d);
            })), y.mutate(B).then(function(tt) {
              return !X || B.type !== "add" && B.type !== "put" || (j.addKeys(tt.results), _ && _.forEach(function(ut) {
                for (var vt = B.values.map(function(bt) {
                  return ut.extractKey(bt);
                }), kt = ut.keyPath.findIndex(function(bt) {
                  return bt === E.keyPath;
                }), Tt = 0, Me = tt.results.length; Tt < Me; ++Tt) vt[Tt][kt] = tt.results[Tt];
                C(ut.name).addKeys(vt);
              })), M.mutatedParts = wo(M.mutatedParts || {}, F), tt;
            });
          } }), A = function(C) {
            var O = C.query, C = O.index, O = O.range;
            return [C, new be((C = O.lower) !== null && C !== void 0 ? C : s.MIN_KEY, (O = O.upper) !== null && O !== void 0 ? O : s.MAX_KEY)];
          }, R = { get: function(B) {
            return [E, new be(B.key)];
          }, getMany: function(B) {
            return [E, new be().addKeys(B.keys)];
          }, count: A, query: A, openCursor: A };
          return a(R).forEach(function(B) {
            U[B] = function(C) {
              var O = lt.subscr, N = !!O, K = Gu(lt, y) && Wu(B, C) ? C.obsSet = {} : O;
              if (N) {
                var M = function(Q) {
                  return Q = "idb://".concat(u, "/").concat(g, "/").concat(Q), K[Q] || (K[Q] = new be());
                }, F = M(""), j = M(":dels"), O = R[B](C), N = O[0], O = O[1];
                if ((B === "query" && N.isPrimaryKey && !C.values ? j : M(N.name || "")).add(O), !N.isPrimaryKey) {
                  if (B !== "count") {
                    var Z = B === "query" && I && C.values && y.query(r(r({}, C), { values: !1 }));
                    return y[B].apply(this, arguments).then(function(Q) {
                      if (B === "query") {
                        if (I && C.values) return Z.then(function(vt) {
                          return vt = vt.result, F.addKeys(vt), Q;
                        });
                        var rt = C.values ? Q.result.map(S) : Q.result;
                        (C.values ? F : j).addKeys(rt);
                      } else if (B === "openCursor") {
                        var tt = Q, ut = C.values;
                        return tt && Object.create(tt, { key: { get: function() {
                          return j.addKey(tt.primaryKey), tt.key;
                        } }, primaryKey: { get: function() {
                          var vt = tt.primaryKey;
                          return j.addKey(vt), vt;
                        } }, value: { get: function() {
                          return ut && F.addKey(tt.primaryKey), tt.value;
                        } } });
                      }
                      return Q;
                    });
                  }
                  j.add(d);
                }
              }
              return y[B].apply(this, arguments);
            };
          }), U;
        } });
      } };
      function Yu(s, u, d) {
        if (d.numFailures === 0) return u;
        if (u.type === "deleteRange") return null;
        var g = u.keys ? u.keys.length : "values" in u && u.values ? u.values.length : 1;
        return d.numFailures === g ? null : (u = r({}, u), c(u.keys) && (u.keys = u.keys.filter(function(y, m) {
          return !(m in d.failures);
        })), "values" in u && c(u.values) && (u.values = u.values.filter(function(y, m) {
          return !(m in d.failures);
        })), u);
      }
      function pa(s, u) {
        return d = s, ((g = u).lower === void 0 || (g.lowerOpen ? 0 < Bt(d, g.lower) : 0 <= Bt(d, g.lower))) && (s = s, (u = u).upper === void 0 || (u.upperOpen ? Bt(s, u.upper) < 0 : Bt(s, u.upper) <= 0));
        var d, g;
      }
      function Zu(s, u, R, g, y, m) {
        if (!R || R.length === 0) return s;
        var E = u.query.index, S = E.multiEntry, I = u.query.range, _ = g.schema.primaryKey.extractKey, U = E.extractKey, A = (E.lowLevelIndex || E).extractKey, R = R.reduce(function(B, C) {
          var O = B, N = [];
          if (C.type === "add" || C.type === "put") for (var K = new be(), M = C.values.length - 1; 0 <= M; --M) {
            var F, j = C.values[M], Z = _(j);
            K.hasKey(Z) || (F = U(j), (S && c(F) ? F.some(function(tt) {
              return pa(tt, I);
            }) : pa(F, I)) && (K.addKey(Z), N.push(j)));
          }
          switch (C.type) {
            case "add":
              var et = new be().addKeys(u.values ? B.map(function(ut) {
                return _(ut);
              }) : B), O = B.concat(u.values ? N.filter(function(ut) {
                return ut = _(ut), !et.hasKey(ut) && (et.addKey(ut), !0);
              }) : N.map(function(ut) {
                return _(ut);
              }).filter(function(ut) {
                return !et.hasKey(ut) && (et.addKey(ut), !0);
              }));
              break;
            case "put":
              var X = new be().addKeys(C.values.map(function(ut) {
                return _(ut);
              }));
              O = B.filter(function(ut) {
                return !X.hasKey(u.values ? _(ut) : ut);
              }).concat(u.values ? N : N.map(function(ut) {
                return _(ut);
              }));
              break;
            case "delete":
              var Q = new be().addKeys(C.keys);
              O = B.filter(function(ut) {
                return !Q.hasKey(u.values ? _(ut) : ut);
              });
              break;
            case "deleteRange":
              var rt = C.range;
              O = B.filter(function(ut) {
                return !pa(_(ut), rt);
              });
          }
          return O;
        }, s);
        return R === s ? s : (R.sort(function(B, C) {
          return Bt(A(B), A(C)) || Bt(_(B), _(C));
        }), u.limit && u.limit < 1 / 0 && (R.length > u.limit ? R.length = u.limit : s.length === u.limit && R.length < u.limit && (y.dirty = !0)), m ? Object.freeze(R) : R);
      }
      function Xu(s, u) {
        return Bt(s.lower, u.lower) === 0 && Bt(s.upper, u.upper) === 0 && !!s.lowerOpen == !!u.lowerOpen && !!s.upperOpen == !!u.upperOpen;
      }
      function Mh(s, u) {
        return function(d, g, y, m) {
          if (d === void 0) return g !== void 0 ? -1 : 0;
          if (g === void 0) return 1;
          if ((g = Bt(d, g)) === 0) {
            if (y && m) return 0;
            if (y) return 1;
            if (m) return -1;
          }
          return g;
        }(s.lower, u.lower, s.lowerOpen, u.lowerOpen) <= 0 && 0 <= function(d, g, y, m) {
          if (d === void 0) return g !== void 0 ? 1 : 0;
          if (g === void 0) return -1;
          if ((g = Bt(d, g)) === 0) {
            if (y && m) return 0;
            if (y) return -1;
            if (m) return 1;
          }
          return g;
        }(s.upper, u.upper, s.upperOpen, u.upperOpen);
      }
      function Fh(s, u, d, g) {
        s.subscribers.add(d), g.addEventListener("abort", function() {
          var y, m;
          s.subscribers.delete(d), s.subscribers.size === 0 && (y = s, m = u, setTimeout(function() {
            y.subscribers.size === 0 && ot(m, y);
          }, 3e3));
        });
      }
      var qh = { stack: "dbcore", level: 0, name: "Cache", create: function(s) {
        var u = s.schema.name;
        return r(r({}, s), { transaction: function(d, g, y) {
          var m, E, S = s.transaction(d, g, y);
          return g === "readwrite" && (E = (m = new AbortController()).signal, y = function(I) {
            return function() {
              if (m.abort(), g === "readwrite") {
                for (var _ = /* @__PURE__ */ new Set(), U = 0, A = d; U < A.length; U++) {
                  var R = A[U], B = sr["idb://".concat(u, "/").concat(R)];
                  if (B) {
                    var C = s.table(R), O = B.optimisticOps.filter(function(ut) {
                      return ut.trans === S;
                    });
                    if (S._explicit && I && S.mutatedParts) for (var N = 0, K = Object.values(B.queries.query); N < K.length; N++) for (var M = 0, F = (et = K[N]).slice(); M < F.length; M++) aa((X = F[M]).obsSet, S.mutatedParts) && (ot(et, X), X.subscribers.forEach(function(ut) {
                      return _.add(ut);
                    }));
                    else if (0 < O.length) {
                      B.optimisticOps = B.optimisticOps.filter(function(ut) {
                        return ut.trans !== S;
                      });
                      for (var j = 0, Z = Object.values(B.queries.query); j < Z.length; j++) for (var et, X, Q, rt = 0, tt = (et = Z[j]).slice(); rt < tt.length; rt++) (X = tt[rt]).res != null && S.mutatedParts && (I && !X.dirty ? (Q = Object.isFrozen(X.res), Q = Zu(X.res, X.req, O, C, X, Q), X.dirty ? (ot(et, X), X.subscribers.forEach(function(ut) {
                        return _.add(ut);
                      })) : Q !== X.res && (X.res = Q, X.promise = it.resolve({ result: Q }))) : (X.dirty && ot(et, X), X.subscribers.forEach(function(ut) {
                        return _.add(ut);
                      })));
                    }
                  }
                }
                _.forEach(function(ut) {
                  return ut();
                });
              }
            };
          }, S.addEventListener("abort", y(!1), { signal: E }), S.addEventListener("error", y(!1), { signal: E }), S.addEventListener("complete", y(!0), { signal: E })), S;
        }, table: function(d) {
          var g = s.table(d), y = g.schema.primaryKey;
          return r(r({}, g), { mutate: function(m) {
            var E = lt.trans;
            if (y.outbound || E.db._options.cache === "disabled" || E.explicit || E.idbtrans.mode !== "readwrite") return g.mutate(m);
            var S = sr["idb://".concat(u, "/").concat(d)];
            return S ? (E = g.mutate(m), m.type !== "add" && m.type !== "put" || !(50 <= m.values.length || ha(y, m).some(function(I) {
              return I == null;
            })) ? (S.optimisticOps.push(m), m.mutatedParts && yo(m.mutatedParts), E.then(function(I) {
              0 < I.numFailures && (ot(S.optimisticOps, m), (I = Yu(0, m, I)) && S.optimisticOps.push(I), m.mutatedParts && yo(m.mutatedParts));
            }), E.catch(function() {
              ot(S.optimisticOps, m), m.mutatedParts && yo(m.mutatedParts);
            })) : E.then(function(I) {
              var _ = Yu(0, r(r({}, m), { values: m.values.map(function(U, A) {
                var R;
                return I.failures[A] ? U : (U = (R = y.keyPath) !== null && R !== void 0 && R.includes(".") ? xt(U) : r({}, U), z(U, y.keyPath, I.results[A]), U);
              }) }), I);
              S.optimisticOps.push(_), queueMicrotask(function() {
                return m.mutatedParts && yo(m.mutatedParts);
              });
            }), E) : g.mutate(m);
          }, query: function(m) {
            if (!Gu(lt, g) || !Wu("query", m)) return g.query(m);
            var E = ((_ = lt.trans) === null || _ === void 0 ? void 0 : _.db._options.cache) === "immutable", A = lt, S = A.requery, I = A.signal, _ = function(C, O, N, K) {
              var M = sr["idb://".concat(C, "/").concat(O)];
              if (!M) return [];
              if (!(O = M.queries[N])) return [null, !1, M, null];
              var F = O[(K.query ? K.query.index.name : null) || ""];
              if (!F) return [null, !1, M, null];
              switch (N) {
                case "query":
                  var j = F.find(function(Z) {
                    return Z.req.limit === K.limit && Z.req.values === K.values && Xu(Z.req.query.range, K.query.range);
                  });
                  return j ? [j, !0, M, F] : [F.find(function(Z) {
                    return ("limit" in Z.req ? Z.req.limit : 1 / 0) >= K.limit && (!K.values || Z.req.values) && Mh(Z.req.query.range, K.query.range);
                  }), !1, M, F];
                case "count":
                  return j = F.find(function(Z) {
                    return Xu(Z.req.query.range, K.query.range);
                  }), [j, !!j, M, F];
              }
            }(u, d, "query", m), U = _[0], A = _[1], R = _[2], B = _[3];
            return U && A ? U.obsSet = m.obsSet : (A = g.query(m).then(function(C) {
              var O = C.result;
              if (U && (U.res = O), E) {
                for (var N = 0, K = O.length; N < K; ++N) Object.freeze(O[N]);
                Object.freeze(O);
              } else C.result = xt(O);
              return C;
            }).catch(function(C) {
              return B && U && ot(B, U), Promise.reject(C);
            }), U = { obsSet: m.obsSet, promise: A, subscribers: /* @__PURE__ */ new Set(), type: "query", req: m, dirty: !1 }, B ? B.push(U) : (B = [U], (R = R || (sr["idb://".concat(u, "/").concat(d)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[m.query.index.name || ""] = B)), Fh(U, B, S, I), U.promise.then(function(C) {
              return { result: Zu(C.result, m, R == null ? void 0 : R.optimisticOps, g, U, E) };
            });
          } });
        } });
      } };
      function bo(s, u) {
        return new Proxy(s, { get: function(d, g, y) {
          return g === "db" ? u : Reflect.get(d, g, y);
        } });
      }
      var yn = (Gt.prototype.version = function(s) {
        if (isNaN(s) || s < 0.1) throw new ct.Type("Given version is not a positive number");
        if (s = Math.round(10 * s) / 10, this.idbdb || this._state.isBeingOpened) throw new ct.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, s);
        var u = this._versions, d = u.filter(function(g) {
          return g._cfg.version === s;
        })[0];
        return d || (d = new this.Version(s), u.push(d), u.sort(Ch), d.stores({}), this._state.autoSchema = !1, d);
      }, Gt.prototype._whenReady = function(s) {
        var u = this;
        return this.idbdb && (this._state.openComplete || lt.letThrough || this._vip) ? s() : new it(function(d, g) {
          if (u._state.openComplete) return g(new ct.DatabaseClosed(u._state.dbOpenError));
          if (!u._state.isBeingOpened) {
            if (!u._state.autoOpen) return void g(new ct.DatabaseClosed());
            u.open().catch(mt);
          }
          u._state.dbReadyPromise.then(d, g);
        }).then(s);
      }, Gt.prototype.use = function(s) {
        var u = s.stack, d = s.create, g = s.level, y = s.name;
        return y && this.unuse({ stack: u, name: y }), s = this._middlewares[u] || (this._middlewares[u] = []), s.push({ stack: u, create: d, level: g ?? 10, name: y }), s.sort(function(m, E) {
          return m.level - E.level;
        }), this;
      }, Gt.prototype.unuse = function(s) {
        var u = s.stack, d = s.name, g = s.create;
        return u && this._middlewares[u] && (this._middlewares[u] = this._middlewares[u].filter(function(y) {
          return g ? y.create !== g : !!d && y.name !== d;
        })), this;
      }, Gt.prototype.open = function() {
        var s = this;
        return rr(Nn, function() {
          return Rh(s);
        });
      }, Gt.prototype._close = function() {
        var s = this._state, u = Sr.indexOf(this);
        if (0 <= u && Sr.splice(u, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        s.isBeingOpened || (s.dbReadyPromise = new it(function(d) {
          s.dbReadyResolve = d;
        }), s.openCanceller = new it(function(d, g) {
          s.cancelOpen = g;
        }));
      }, Gt.prototype.close = function(d) {
        var u = (d === void 0 ? { disableAutoOpen: !0 } : d).disableAutoOpen, d = this._state;
        u ? (d.isBeingOpened && d.cancelOpen(new ct.DatabaseClosed()), this._close(), d.autoOpen = !1, d.dbOpenError = new ct.DatabaseClosed()) : (this._close(), d.autoOpen = this._options.autoOpen || d.isBeingOpened, d.openComplete = !1, d.dbOpenError = null);
      }, Gt.prototype.delete = function(s) {
        var u = this;
        s === void 0 && (s = { disableAutoOpen: !0 });
        var d = 0 < arguments.length && typeof arguments[0] != "object", g = this._state;
        return new it(function(y, m) {
          function E() {
            u.close(s);
            var S = u._deps.indexedDB.deleteDatabase(u.name);
            S.onsuccess = Dt(function() {
              var I, _, U;
              I = u._deps, _ = u.name, U = I.indexedDB, I = I.IDBKeyRange, ia(U) || _ === ro || ra(U, I).delete(_).catch(mt), y();
            }), S.onerror = rn(m), S.onblocked = u._fireOnBlocked;
          }
          if (d) throw new ct.InvalidArgument("Invalid closeOptions argument to db.delete()");
          g.isBeingOpened ? g.dbReadyPromise.then(E) : E();
        });
      }, Gt.prototype.backendDB = function() {
        return this.idbdb;
      }, Gt.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, Gt.prototype.hasBeenClosed = function() {
        var s = this._state.dbOpenError;
        return s && s.name === "DatabaseClosed";
      }, Gt.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, Gt.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(Gt.prototype, "tables", { get: function() {
        var s = this;
        return a(this._allTables).map(function(u) {
          return s._allTables[u];
        });
      }, enumerable: !1, configurable: !0 }), Gt.prototype.transaction = function() {
        var s = (function(u, d, g) {
          var y = arguments.length;
          if (y < 2) throw new ct.InvalidArgument("Too few arguments");
          for (var m = new Array(y - 1); --y; ) m[y - 1] = arguments[y];
          return g = m.pop(), [u, st(m), g];
        }).apply(this, arguments);
        return this._transaction.apply(this, s);
      }, Gt.prototype._transaction = function(s, u, d) {
        var g = this, y = lt.trans;
        y && y.db === this && s.indexOf("!") === -1 || (y = null);
        var m, E, S = s.indexOf("?") !== -1;
        s = s.replace("!", "").replace("?", "");
        try {
          if (E = u.map(function(_) {
            if (_ = _ instanceof g.Table ? _.name : _, typeof _ != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return _;
          }), s == "r" || s === js) m = js;
          else {
            if (s != "rw" && s != zs) throw new ct.InvalidArgument("Invalid transaction mode: " + s);
            m = zs;
          }
          if (y) {
            if (y.mode === js && m === zs) {
              if (!S) throw new ct.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              y = null;
            }
            y && E.forEach(function(_) {
              if (y && y.storeNames.indexOf(_) === -1) {
                if (!S) throw new ct.SubTransaction("Table " + _ + " not included in parent transaction.");
                y = null;
              }
            }), S && y && !y.active && (y = null);
          }
        } catch (_) {
          return y ? y._promise(null, function(U, A) {
            A(_);
          }) : zt(_);
        }
        var I = (function _(U, A, R, B, C) {
          return it.resolve().then(function() {
            var O = lt.transless || lt, N = U._createTransaction(A, R, U._dbSchema, B);
            if (N.explicit = !0, O = { trans: N, transless: O }, B) N.idbtrans = B.idbtrans;
            else try {
              N.create(), N.idbtrans._explicit = !0, U._state.PR1398_maxLoop = 3;
            } catch (F) {
              return F.name === Ge.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                return _(U, A, R, null, C);
              })) : zt(F);
            }
            var K, M = It(C);
            return M && xr(), O = it.follow(function() {
              var F;
              (K = C.call(N, N)) && (M ? (F = Un.bind(null, null), K.then(F, F)) : typeof K.next == "function" && typeof K.throw == "function" && (K = la(K)));
            }, O), (K && typeof K.then == "function" ? it.resolve(K).then(function(F) {
              return N.active ? F : zt(new ct.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : O.then(function() {
              return K;
            })).then(function(F) {
              return B && N._resolve(), N._completion.then(function() {
                return F;
              });
            }).catch(function(F) {
              return N._reject(F), zt(F);
            });
          });
        }).bind(null, this, m, E, y, d);
        return y ? y._promise(m, I, "lock") : lt.trans ? rr(lt.transless, function() {
          return g._whenReady(I);
        }) : this._whenReady(I);
      }, Gt.prototype.table = function(s) {
        if (!h(this._allTables, s)) throw new ct.InvalidTable("Table ".concat(s, " does not exist"));
        return this._allTables[s];
      }, Gt);
      function Gt(s, u) {
        var d = this;
        this._middlewares = {}, this.verno = 0;
        var g = Gt.dependencies;
        this._options = u = r({ addons: Gt.addons, autoOpen: !0, indexedDB: g.indexedDB, IDBKeyRange: g.IDBKeyRange, cache: "cloned" }, u), this._deps = { indexedDB: u.indexedDB, IDBKeyRange: u.IDBKeyRange }, g = u.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var y, m, E, S, I, _ = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: mt, dbReadyPromise: null, cancelOpen: mt, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: u.autoOpen };
        _.dbReadyPromise = new it(function(A) {
          _.dbReadyResolve = A;
        }), _.openCanceller = new it(function(A, R) {
          _.cancelOpen = R;
        }), this._state = _, this.name = s, this.on = ni(this, "populate", "blocked", "versionchange", "close", { ready: [Ls, mt] }), this.on.ready.subscribe = L(this.on.ready.subscribe, function(A) {
          return function(R, B) {
            Gt.vip(function() {
              var C, O = d._state;
              O.openComplete ? (O.dbOpenError || it.resolve().then(R), B && A(R)) : O.onReadyBeingFired ? (O.onReadyBeingFired.push(R), B && A(R)) : (A(R), C = d, B || A(function N() {
                C.on.ready.unsubscribe(R), C.on.ready.unsubscribe(N);
              }));
            });
          };
        }), this.Collection = (y = this, ri(Ah.prototype, function(K, N) {
          this.db = y;
          var B = Bu, C = null;
          if (N) try {
            B = N();
          } catch (M) {
            C = M;
          }
          var O = K._ctx, N = O.table, K = N.hook.reading.fire;
          this._ctx = { table: N, index: O.index, isPrimKey: !O.index || N.schema.primKey.keyPath && O.index === N.schema.primKey.name, range: B, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: C, or: O.or, valueMapper: K !== pe ? K : null };
        })), this.Table = (m = this, ri(Uu.prototype, function(A, R, B) {
          this.db = m, this._tx = B, this.name = A, this.schema = R, this.hook = m._allTables[A] ? m._allTables[A].hook : ni(null, { creating: [gh, mt], reading: [Ke, pe], updating: [yh, mt], deleting: [wh, mt] });
        })), this.Transaction = (E = this, ri(Ih.prototype, function(A, R, B, C, O) {
          var N = this;
          this.db = E, this.mode = A, this.storeNames = R, this.schema = B, this.chromeTransactionDurability = C, this.idbtrans = null, this.on = ni(this, "complete", "error", "abort"), this.parent = O || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new it(function(K, M) {
            N._resolve = K, N._reject = M;
          }), this._completion.then(function() {
            N.active = !1, N.on.complete.fire();
          }, function(K) {
            var M = N.active;
            return N.active = !1, N.on.error.fire(K), N.parent ? N.parent._reject(K) : M && N.idbtrans && N.idbtrans.abort(), zt(K);
          });
        })), this.Version = (S = this, ri(Oh.prototype, function(A) {
          this.db = S, this._cfg = { version: A, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (I = this, ri(Pu.prototype, function(A, R, B) {
          if (this.db = I, this._ctx = { table: A, index: R === ":id" ? null : R, or: B }, this._cmp = this._ascending = Bt, this._descending = function(C, O) {
            return Bt(O, C);
          }, this._max = function(C, O) {
            return 0 < Bt(C, O) ? C : O;
          }, this._min = function(C, O) {
            return Bt(C, O) < 0 ? C : O;
          }, this._IDBKeyRange = I._deps.IDBKeyRange, !this._IDBKeyRange) throw new ct.MissingAPI();
        })), this.on("versionchange", function(A) {
          0 < A.newVersion ? console.warn("Another connection wants to upgrade database '".concat(d.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(d.name, "'. Closing db now to resume the delete request.")), d.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(A) {
          !A.newVersion || A.newVersion < A.oldVersion ? console.warn("Dexie.delete('".concat(d.name, "') was blocked")) : console.warn("Upgrade '".concat(d.name, "' blocked by other connection holding version ").concat(A.oldVersion / 10));
        }), this._maxKey = ai(u.IDBKeyRange), this._createTransaction = function(A, R, B, C) {
          return new d.Transaction(A, R, B, d._options.chromeTransactionDurability, C);
        }, this._fireOnBlocked = function(A) {
          d.on("blocked").fire(A), Sr.filter(function(R) {
            return R.name === d.name && R !== d && !R._state.vcFired;
          }).map(function(R) {
            return R.on("versionchange").fire(A);
          });
        }, this.use(Kh), this.use(qh), this.use(Dh), this.use(Lh), this.use(Ph);
        var U = new Proxy(this, { get: function(A, R, B) {
          if (R === "_vip") return !0;
          if (R === "table") return function(O) {
            return bo(d.table(O), U);
          };
          var C = Reflect.get(A, R, B);
          return C instanceof Uu ? bo(C, U) : R === "tables" ? C.map(function(O) {
            return bo(O, U);
          }) : R === "_createTransaction" ? function() {
            return bo(C.apply(this, arguments), U);
          } : C;
        } });
        this.vip = U, g.forEach(function(A) {
          return A(d);
        });
      }
      var vo, Fe = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", Hh = (ga.prototype.subscribe = function(s, u, d) {
        return this._subscribe(s && typeof s != "function" ? s : { next: s, error: u, complete: d });
      }, ga.prototype[Fe] = function() {
        return this;
      }, ga);
      function ga(s) {
        this._subscribe = s;
      }
      try {
        vo = { indexedDB: o.indexedDB || o.mozIndexedDB || o.webkitIndexedDB || o.msIndexedDB, IDBKeyRange: o.IDBKeyRange || o.webkitIDBKeyRange };
      } catch {
        vo = { indexedDB: null, IDBKeyRange: null };
      }
      function Qu(s) {
        var u, d = !1, g = new Hh(function(y) {
          var m = It(s), E, S = !1, I = {}, _ = {}, U = { get closed() {
            return S;
          }, unsubscribe: function() {
            S || (S = !0, E && E.abort(), A && Rn.storagemutated.unsubscribe(B));
          } };
          y.start && y.start(U);
          var A = !1, R = function() {
            return Vs(C);
          }, B = function(O) {
            wo(I, O), aa(_, I) && R();
          }, C = function() {
            var O, N, K;
            !S && vo.indexedDB && (I = {}, O = {}, E && E.abort(), E = new AbortController(), K = function(M) {
              var F = vr();
              try {
                m && xr();
                var j = Cn(s, M);
                return j = m ? j.finally(Un) : j;
              } finally {
                F && Er();
              }
            }(N = { subscr: O, signal: E.signal, requery: R, querier: s, trans: null }), Promise.resolve(K).then(function(M) {
              d = !0, u = M, S || N.signal.aborted || (I = {}, function(F) {
                for (var j in F) if (h(F, j)) return;
                return 1;
              }(_ = O) || A || (Rn(si, B), A = !0), Vs(function() {
                return !S && y.next && y.next(M);
              }));
            }, function(M) {
              d = !1, ["DatabaseClosedError", "AbortError"].includes(M == null ? void 0 : M.name) || S || Vs(function() {
                S || y.error && y.error(M);
              });
            }));
          };
          return setTimeout(R, 0), U;
        });
        return g.hasValue = function() {
          return d;
        }, g.getValue = function() {
          return u;
        }, g;
      }
      var ar = yn;
      function wa(s) {
        var u = Ln;
        try {
          Ln = !0, Rn.storagemutated.fire(s), fa(s, !0);
        } finally {
          Ln = u;
        }
      }
      w(ar, r(r({}, me), { delete: function(s) {
        return new ar(s, { addons: [] }).delete();
      }, exists: function(s) {
        return new ar(s, { addons: [] }).open().then(function(u) {
          return u.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(s) {
        try {
          return u = ar.dependencies, d = u.indexedDB, u = u.IDBKeyRange, (ia(d) ? Promise.resolve(d.databases()).then(function(g) {
            return g.map(function(y) {
              return y.name;
            }).filter(function(y) {
              return y !== ro;
            });
          }) : ra(d, u).toCollection().primaryKeys()).then(s);
        } catch {
          return zt(new ct.MissingAPI());
        }
        var u, d;
      }, defineClass: function() {
        return function(s) {
          f(this, s);
        };
      }, ignoreTransaction: function(s) {
        return lt.trans ? rr(lt.transless, s) : s();
      }, vip: oa, async: function(s) {
        return function() {
          try {
            var u = la(s.apply(this, arguments));
            return u && typeof u.then == "function" ? u : it.resolve(u);
          } catch (d) {
            return zt(d);
          }
        };
      }, spawn: function(s, u, d) {
        try {
          var g = la(s.apply(d, u || []));
          return g && typeof g.then == "function" ? g : it.resolve(g);
        } catch (y) {
          return zt(y);
        }
      }, currentTransaction: { get: function() {
        return lt.trans || null;
      } }, waitFor: function(s, u) {
        return u = it.resolve(typeof s == "function" ? ar.ignoreTransaction(s) : s).timeout(u || 6e4), lt.trans ? lt.trans.waitFor(u) : u;
      }, Promise: it, debug: { get: function() {
        return nn;
      }, set: function(s) {
        Eu(s);
      } }, derive: x, extend: f, props: w, override: L, Events: ni, on: Rn, liveQuery: Qu, extendObservabilitySet: wo, getByKeyPath: G, setByKeyPath: z, delByKeyPath: function(s, u) {
        typeof u == "string" ? z(s, u, void 0) : "length" in u && [].map.call(u, function(d) {
          z(s, d, void 0);
        });
      }, shallowClone: J, deepClone: xt, getObjectDiff: da, cmp: Bt, asap: Y, minKey: -1 / 0, addons: [], connections: Sr, errnames: Ge, dependencies: vo, cache: sr, semVer: "4.0.11", version: "4.0.11".split(".").map(function(s) {
        return parseInt(s);
      }).reduce(function(s, u, d) {
        return s + u / Math.pow(10, 2 * d);
      }) })), ar.maxKey = ai(ar.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (Rn(si, function(s) {
        Ln || (s = new CustomEvent(Zs, { detail: s }), Ln = !0, dispatchEvent(s), Ln = !1);
      }), addEventListener(Zs, function(s) {
        s = s.detail, Ln || wa(s);
      }));
      var Tr, Ln = !1, Ju = function() {
      };
      return typeof BroadcastChannel < "u" && ((Ju = function() {
        (Tr = new BroadcastChannel(Zs)).onmessage = function(s) {
          return s.data && wa(s.data);
        };
      })(), typeof Tr.unref == "function" && Tr.unref(), Rn(si, function(s) {
        Ln || Tr.postMessage(s);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(s) {
        if (!yn.disableBfCache && s.persisted) {
          nn && console.debug("Dexie: handling persisted pagehide"), Tr != null && Tr.close();
          for (var u = 0, d = Sr; u < d.length; u++) d[u].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(s) {
        !yn.disableBfCache && s.persisted && (nn && console.debug("Dexie: handling persisted pageshow"), Ju(), wa({ all: new be(-1 / 0, [[]]) }));
      })), it.rejectionMapper = function(s, u) {
        return !s || s instanceof Ct || s instanceof TypeError || s instanceof SyntaxError || !s.name || !en[s.name] ? s : (u = new en[s.name](u || s.message, s), "stack" in s && T(u, "stack", { get: function() {
          return this.inner.stack;
        } }), u);
      }, Eu(nn), r(yn, Object.freeze({ __proto__: null, Dexie: yn, liveQuery: Qu, Entity: _u, cmp: Bt, PropModification: ii, replacePrefix: function(s, u) {
        return new ii({ replacePrefix: [s, u] });
      }, add: function(s) {
        return new ii({ add: s });
      }, remove: function(s) {
        return new ii({ remove: s });
      }, default: yn, RangeSet: be, mergeRanges: fi, rangesOverlap: qu }), { default: yn }), yn;
    });
  }(Mo)), Mo.exports;
}
var Gy = zy();
const Bc = /* @__PURE__ */ Ew(Gy), bl = Symbol.for("Dexie"), gs = globalThis[bl] || (globalThis[bl] = Bc);
if (Bc.semVer !== gs.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Bc.semVer} and ${gs.semVer}`);
const {
  liveQuery: im,
  mergeRanges: om,
  rangesOverlap: sm,
  RangeSet: am,
  cmp: cm,
  Entity: um,
  PropModification: fm,
  replacePrefix: lm,
  add: dm,
  remove: hm
} = gs, lr = new gs("arkade", { allowEmptyDB: !0 });
lr.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const ph = {
  addOrUpdate: async (t) => {
    await lr.vtxos.bulkPut(t);
  },
  deleteAll: async () => lr.vtxos.clear(),
  getSpendableVtxos: async () => lr.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await lr.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  close: async () => lr.close(),
  open: async () => {
    await lr.open();
  }
}, Wy = new Y0(ph);
Wy.start().catch(console.error);
function Yy(t, e) {
  self.registration.showNotification(t, { body: e, icon: "/arkade-icon-220.png" });
}
function Zy(t) {
  const e = `Virtual coins expiring ${Vy(t)}`;
  Yy(e, "Open wallet to renew virtual coins");
}
function Xy(t) {
  return t ? t.reduce((e, n) => {
    const r = n.virtualStatus.batchExpiry;
    if (!r) return e;
    const i = r;
    return i < e || e === 0 ? i : e;
  }, 0) : 0;
}
async function Qy() {
  const t = await ph.getSpendableVtxos(), e = Xy(t);
  Z0(e) && Zy(e);
}
self.addEventListener("message", (t) => {
  let e;
  if (!t.data) return;
  const { type: n } = t.data;
  n === "SKIP_WAITING" && self.skipWaiting(), n === "START_CHECK" && (e = window.setInterval(() => {
    Qy();
  }, 4 * 60 * 60 * 1e3)), n === "STOP_CHECK" && e && clearInterval(e);
});
