function Hi(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Eu(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Lt(t, ...e) {
  if (!Eu(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function bu(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Hi(t.outputLen), Hi(t.blockLen);
}
function Tr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function xu(t, e) {
  Lt(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const nn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function hi(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function ie(t, e) {
  return t << 32 - e | t >>> e;
}
function cr(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function Su(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function To(t) {
  return typeof t == "string" && (t = Su(t)), Lt(t), t;
}
function vu(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Lt(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
let kc = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function Nc(t) {
  const e = (r) => t().update(To(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Ao(t = 32) {
  if (nn && typeof nn.getRandomValues == "function")
    return nn.getRandomValues(new Uint8Array(t));
  if (nn && typeof nn.randomBytes == "function")
    return nn.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Tu(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), s = Number(n >> i & o), c = Number(n & o), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
function Au(t, e, n) {
  return t & e ^ ~t & n;
}
function Iu(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
let Uc = class extends kc {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = hi(this.buffer);
  }
  update(e) {
    Tr(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = To(e);
    const o = e.length;
    for (let s = 0; s < o; ) {
      const c = Math.min(i - this.pos, o - s);
      if (c === i) {
        const a = hi(e);
        for (; i <= o - s; s += i)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Tr(this), xu(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > i - s && (this.process(r, 0), s = 0);
    for (let l = s; l < i; l++)
      n[l] = 0;
    Tu(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = hi(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let l = 0; l < u; l++)
      c.setUint32(4 * l, f[l], o);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: o, destroyed: s, pos: c } = this;
    return e.length = i, e.pos = c, e.finished = o, e.destroyed = s, i % n && e.buffer.set(r), e;
  }
};
const Bu = /* @__PURE__ */ new Uint32Array([
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
]), Te = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Ae = /* @__PURE__ */ new Uint32Array(64);
let ku = class extends Uc {
  constructor() {
    super(64, 32, 8, !1), this.A = Te[0] | 0, this.B = Te[1] | 0, this.C = Te[2] | 0, this.D = Te[3] | 0, this.E = Te[4] | 0, this.F = Te[5] | 0, this.G = Te[6] | 0, this.H = Te[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: o, F: s, G: c, H: a } = this;
    return [e, n, r, i, o, s, c, a];
  }
  // prettier-ignore
  set(e, n, r, i, o, s, c, a) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = o | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(e, n) {
    for (let l = 0; l < 16; l++, n += 4)
      Ae[l] = e.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const d = Ae[l - 15], h = Ae[l - 2], y = ie(d, 7) ^ ie(d, 18) ^ d >>> 3, w = ie(h, 17) ^ ie(h, 19) ^ h >>> 10;
      Ae[l] = w + Ae[l - 7] + y + Ae[l - 16] | 0;
    }
    let { A: r, B: i, C: o, D: s, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const d = ie(c, 6) ^ ie(c, 11) ^ ie(c, 25), h = f + d + Au(c, a, u) + Bu[l] + Ae[l] | 0, w = (ie(r, 2) ^ ie(r, 13) ^ ie(r, 22)) + Iu(r, i, o) | 0;
      f = u, u = a, a = c, c = s + h | 0, s = o, o = i, i = r, r = h + w | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, i, o, s, c, a, u, f);
  }
  roundClean() {
    Ae.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const $t = /* @__PURE__ */ Nc(() => new ku());
let $c = class extends kc {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, bu(e);
    const r = To(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, o = new Uint8Array(i);
    o.set(r.length > i ? e.create().update(r).digest() : r);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = e.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), o.fill(0);
  }
  update(e) {
    return Tr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Tr(this), Lt(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: o, blockLen: s, outputLen: c } = this;
    return e = e, e.finished = i, e.destroyed = o, e.blockLen = s, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Lc = (t, e, n) => new $c(t, e).update(n).digest();
Lc.create = (t, e) => new $c(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Zr = /* @__PURE__ */ BigInt(0), jr = /* @__PURE__ */ BigInt(1), Nu = /* @__PURE__ */ BigInt(2);
function Qe(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Qn(t) {
  if (!Qe(t))
    throw new Error("Uint8Array expected");
}
function wn(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const Uu = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function gn(t) {
  Qn(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Uu[t[n]];
  return e;
}
function sn(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Io(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Zr : BigInt("0x" + t);
}
const he = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ys(t) {
  if (t >= he._0 && t <= he._9)
    return t - he._0;
  if (t >= he.A && t <= he.F)
    return t - (he.A - 10);
  if (t >= he.a && t <= he.f)
    return t - (he.a - 10);
}
function yn(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const s = ys(t.charCodeAt(o)), c = ys(t.charCodeAt(o + 1));
    if (s === void 0 || c === void 0) {
      const a = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + o);
    }
    r[i] = s * 16 + c;
  }
  return r;
}
function Ct(t) {
  return Io(gn(t));
}
function Bo(t) {
  return Qn(t), Io(gn(Uint8Array.from(t).reverse()));
}
function re(t, e) {
  return yn(t.toString(16).padStart(e * 2, "0"));
}
function ko(t, e) {
  return re(t, e).reverse();
}
function $u(t) {
  return yn(sn(t));
}
function vt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = yn(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (Qe(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function _e(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Qn(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
function mn(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function Lu(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const pi = (t) => typeof t == "bigint" && Zr <= t;
function En(t, e, n) {
  return pi(t) && pi(e) && pi(n) && e <= t && t < n;
}
function Ft(t, e, n, r) {
  if (!En(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Cc(t) {
  let e;
  for (e = 0; t > Zr; t >>= jr, e += 1)
    ;
  return e;
}
function Cu(t, e) {
  return t >> BigInt(e) & jr;
}
function Ru(t, e, n) {
  return t | (n ? jr : Zr) << BigInt(e);
}
const No = (t) => (Nu << BigInt(t - 1)) - jr, wi = (t) => new Uint8Array(t), ms = (t) => Uint8Array.from(t);
function Rc(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = wi(t), i = wi(t), o = 0;
  const s = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...l) => n(i, r, ...l), a = (l = wi()) => {
    i = c(ms([0]), l), r = c(), l.length !== 0 && (i = c(ms([1]), l), r = c());
  }, u = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let l = 0;
    const d = [];
    for (; l < e; ) {
      r = c();
      const h = r.slice();
      d.push(h), l += r.length;
    }
    return _e(...d);
  };
  return (l, d) => {
    s(), a(l);
    let h;
    for (; !(h = d(u())); )
      a();
    return s(), h;
  };
}
const _u = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Qe(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Jn(t, e, n = {}) {
  const r = (i, o, s) => {
    const c = _u[o];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const a = t[i];
    if (!(s && a === void 0) && !c(a, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + o + ", got " + a);
  };
  for (const [i, o] of Object.entries(e))
    r(i, o, !1);
  for (const [i, o] of Object.entries(n))
    r(i, o, !0);
  return t;
}
const Ou = () => {
  throw new Error("not implemented");
};
function Mi(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
const Pu = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Ft,
  abool: wn,
  abytes: Qn,
  bitGet: Cu,
  bitLen: Cc,
  bitMask: No,
  bitSet: Ru,
  bytesToHex: gn,
  bytesToNumberBE: Ct,
  bytesToNumberLE: Bo,
  concatBytes: _e,
  createHmacDrbg: Rc,
  ensureBytes: vt,
  equalBytes: mn,
  hexToBytes: yn,
  hexToNumber: Io,
  inRange: En,
  isBytes: Qe,
  memoized: Mi,
  notImplemented: Ou,
  numberToBytesBE: re,
  numberToBytesLE: ko,
  numberToHexUnpadded: sn,
  numberToVarBytesBE: $u,
  utf8ToBytes: Lu,
  validateObject: Jn
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const wt = BigInt(0), rt = BigInt(1), Ge = /* @__PURE__ */ BigInt(2), Hu = /* @__PURE__ */ BigInt(3), Vi = /* @__PURE__ */ BigInt(4), Es = /* @__PURE__ */ BigInt(5), bs = /* @__PURE__ */ BigInt(8);
function pt(t, e) {
  const n = t % e;
  return n >= wt ? n : e + n;
}
function Mu(t, e, n) {
  if (e < wt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= wt)
    throw new Error("invalid modulus");
  if (n === rt)
    return wt;
  let r = rt;
  for (; e > wt; )
    e & rt && (r = r * t % n), t = t * t % n, e >>= rt;
  return r;
}
function Kt(t, e, n) {
  let r = t;
  for (; e-- > wt; )
    r *= r, r %= n;
  return r;
}
function Di(t, e) {
  if (t === wt)
    throw new Error("invert: expected non-zero number");
  if (e <= wt)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = pt(t, e), r = e, i = wt, o = rt;
  for (; n !== wt; ) {
    const c = r / n, a = r % n, u = i - o * c;
    r = n, n = a, i = o, o = u;
  }
  if (r !== rt)
    throw new Error("invert: does not exist");
  return pt(i, e);
}
function Vu(t) {
  const e = (t - rt) / Ge;
  let n, r, i;
  for (n = t - rt, r = 0; n % Ge === wt; n /= Ge, r++)
    ;
  for (i = Ge; i < t && Mu(i, e, t) !== t - rt; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + rt) / Vi;
    return function(a, u) {
      const f = a.pow(u, s);
      if (!a.eql(a.sqr(f), u))
        throw new Error("Cannot find square root");
      return f;
    };
  }
  const o = (n + rt) / Ge;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, f = c.pow(c.mul(c.ONE, i), n), l = c.pow(a, o), d = c.pow(a, n);
    for (; !c.eql(d, c.ONE); ) {
      if (c.eql(d, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(d); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const y = c.pow(f, rt << BigInt(u - h - 1));
      f = c.sqr(y), l = c.mul(l, y), d = c.mul(d, f), u = h;
    }
    return l;
  };
}
function Du(t) {
  if (t % Vi === Hu) {
    const e = (t + rt) / Vi;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % bs === Es) {
    const e = (t - Es) / bs;
    return function(r, i) {
      const o = r.mul(i, Ge), s = r.pow(o, e), c = r.mul(i, s), a = r.mul(r.mul(c, Ge), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), i))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return Vu(t);
}
const Fu = [
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
function Ku(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Fu.reduce((r, i) => (r[i] = "function", r), e);
  return Jn(t, n);
}
function qu(t, e, n) {
  if (n < wt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === wt)
    return t.ONE;
  if (n === rt)
    return e;
  let r = t.ONE, i = e;
  for (; n > wt; )
    n & rt && (r = t.mul(r, i)), i = t.sqr(i), n >>= rt;
  return r;
}
function zu(t, e) {
  const n = new Array(e.length), r = e.reduce((o, s, c) => t.is0(s) ? o : (n[c] = o, t.mul(o, s)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, s, c) => t.is0(s) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, s)), i), n;
}
function _c(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Oc(t, e, n = !1, r = {}) {
  if (t <= wt)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = _c(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: o,
    MASK: No(i),
    ZERO: wt,
    ONE: rt,
    create: (a) => pt(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return wt <= a && a < t;
    },
    is0: (a) => a === wt,
    isOdd: (a) => (a & rt) === rt,
    neg: (a) => pt(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => pt(a * a, t),
    add: (a, u) => pt(a + u, t),
    sub: (a, u) => pt(a - u, t),
    mul: (a, u) => pt(a * u, t),
    pow: (a, u) => qu(c, a, u),
    div: (a, u) => pt(a * Di(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => Di(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = Du(t)), s(c, a))),
    invertBatch: (a) => zu(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, f) => f ? u : a,
    toBytes: (a) => n ? ko(a, o) : re(a, o),
    fromBytes: (a) => {
      if (a.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + a.length);
      return n ? Bo(a) : Ct(a);
    }
  });
  return Object.freeze(c);
}
function Pc(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Hc(t) {
  const e = Pc(t);
  return e + Math.ceil(e / 2);
}
function Gu(t, e, n = !1) {
  const r = t.length, i = Pc(e), o = Hc(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const s = n ? Bo(t) : Ct(t), c = pt(s, e - rt) + rt;
  return n ? ko(c, i) : re(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const xs = BigInt(0), ar = BigInt(1);
function gi(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Mc(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function yi(t, e) {
  Mc(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function Wu(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Zu(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const mi = /* @__PURE__ */ new WeakMap(), Vc = /* @__PURE__ */ new WeakMap();
function Ei(t) {
  return Vc.get(t) || 1;
}
function ju(t, e) {
  return {
    constTimeNegate: gi,
    hasPrecomputes(n) {
      return Ei(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > xs; )
        r & ar && (i = i.add(o)), o = o.double(), r >>= ar;
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
      const { windows: i, windowSize: o } = yi(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < i; u++) {
        a = c, s.push(a);
        for (let f = 1; f < o; f++)
          a = a.add(c), s.push(a);
        c = a.double();
      }
      return s;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      const { windows: o, windowSize: s } = yi(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), f = 2 ** n, l = BigInt(n);
      for (let d = 0; d < o; d++) {
        const h = d * s;
        let y = Number(i & u);
        i >>= l, y > s && (y -= f, i += ar);
        const w = h, p = h + Math.abs(y) - 1, g = d % 2 !== 0, m = y < 0;
        y === 0 ? a = a.add(gi(g, r[w])) : c = c.add(gi(m, r[p]));
      }
      return { p: c, f: a };
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
      const { windows: s, windowSize: c } = yi(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, f = BigInt(n);
      for (let l = 0; l < s; l++) {
        const d = l * c;
        if (i === xs)
          break;
        let h = Number(i & a);
        if (i >>= f, h > c && (h -= u, i += ar), h === 0)
          continue;
        let y = r[d + Math.abs(h) - 1];
        h < 0 && (y = y.negate()), o = o.add(y);
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = mi.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && mi.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = Ei(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const s = Ei(n);
      return s === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Mc(r, e), Vc.set(n, r), mi.delete(n);
    }
  };
}
function Yu(t, e, n, r) {
  if (Wu(n, t), Zu(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = Cc(BigInt(n.length)), s = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(i), u = Math.floor((e.BITS - 1) / s) * s;
  let f = i;
  for (let l = u; l >= 0; l -= s) {
    a.fill(i);
    for (let h = 0; h < r.length; h++) {
      const y = r[h], w = Number(y >> BigInt(l) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let d = i;
    for (let h = a.length - 1, y = i; h > 0; h--)
      y = y.add(a[h]), d = d.add(y);
    if (f = f.add(d), l !== 0)
      for (let h = 0; h < s; h++)
        f = f.double();
  }
  return f;
}
function Dc(t) {
  return Ku(t.Fp), Jn(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ..._c(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ss(t) {
  t.lowS !== void 0 && wn("lowS", t.lowS), t.prehash !== void 0 && wn("prehash", t.prehash);
}
function Xu(t) {
  const e = Dc(t);
  Jn(e, {
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
const { bytesToNumberBE: Qu, hexToBytes: Ju } = Pu;
class tf extends Error {
  constructor(e = "") {
    super(e);
  }
}
const ge = {
  // asn.1 DER encoding utils
  Err: tf,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = ge;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = sn(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const o = r > 127 ? sn(i.length / 2 | 128) : "";
      return sn(t) + o + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = ge;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], o = !!(i & 128);
      let s = 0;
      if (!o)
        s = i;
      else {
        const a = i & 127;
        if (!a)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (a > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = e.subarray(r, r + a);
        if (u.length !== a)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          s = s << 8 | f;
        if (r += a, s < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = e.subarray(r, r + s);
      if (c.length !== s)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: e.subarray(r + s) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = ge;
      if (t < me)
        throw new e("integer: negative integers are not allowed");
      let n = sn(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = ge;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return Qu(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = ge, i = typeof t == "string" ? Ju(t) : t;
    Qn(i);
    const { v: o, l: s } = r.decode(48, i);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, o), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = ge, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, me = BigInt(0), dt = BigInt(1);
BigInt(2);
const vs = BigInt(3);
BigInt(4);
function ef(t) {
  const e = Xu(t), { Fp: n } = e, r = Oc(e.n, e.nBitLength), i = e.toBytes || ((w, p, g) => {
    const m = p.toAffine();
    return _e(Uint8Array.from([4]), n.toBytes(m.x), n.toBytes(m.y));
  }), o = e.fromBytes || ((w) => {
    const p = w.subarray(1), g = n.fromBytes(p.subarray(0, n.BYTES)), m = n.fromBytes(p.subarray(n.BYTES, 2 * n.BYTES));
    return { x: g, y: m };
  });
  function s(w) {
    const { a: p, b: g } = e, m = n.sqr(w), E = n.mul(m, w);
    return n.add(n.add(E, n.mul(w, p)), g);
  }
  if (!n.eql(n.sqr(e.Gy), s(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(w) {
    return En(w, dt, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: m, n: E } = e;
    if (p && typeof w != "bigint") {
      if (Qe(w) && (w = gn(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let T;
    try {
      T = typeof w == "bigint" ? w : Ct(vt("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return m && (T = pt(T, E)), Ft("private key", T, dt, E), T;
  }
  function u(w) {
    if (!(w instanceof d))
      throw new Error("ProjectivePoint expected");
  }
  const f = Mi((w, p) => {
    const { px: g, py: m, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y: m };
    const T = w.is0();
    p == null && (p = T ? n.ONE : n.inv(E));
    const I = n.mul(g, p), B = n.mul(m, p), b = n.mul(E, p);
    if (T)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(b, n.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: B };
  }), l = Mi((w) => {
    if (w.is0()) {
      if (e.allowInfinityPoint && !n.is0(w.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: p, y: g } = w.toAffine();
    if (!n.isValid(p) || !n.isValid(g))
      throw new Error("bad point: x or y not FE");
    const m = n.sqr(g), E = s(p);
    if (!n.eql(m, E))
      throw new Error("bad point: equation left != right");
    if (!w.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class d {
    constructor(p, g, m) {
      if (this.px = p, this.py = g, this.pz = m, p == null || !n.isValid(p))
        throw new Error("x required");
      if (g == null || !n.isValid(g))
        throw new Error("y required");
      if (m == null || !n.isValid(m))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x: g, y: m } = p || {};
      if (!p || !n.isValid(g) || !n.isValid(m))
        throw new Error("invalid affine point");
      if (p instanceof d)
        throw new Error("projective point not allowed");
      const E = (T) => n.eql(T, n.ZERO);
      return E(g) && E(m) ? d.ZERO : new d(g, m, n.ONE);
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
    static normalizeZ(p) {
      const g = n.invertBatch(p.map((m) => m.pz));
      return p.map((m, E) => m.toAffine(g[E])).map(d.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(p) {
      const g = d.fromAffine(o(vt("pointHex", p)));
      return g.assertValidity(), g;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return d.BASE.multiply(a(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return Yu(d, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      y.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      l(this);
    }
    hasEvenY() {
      const { y: p } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(p);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: T, py: I, pz: B } = p, b = n.eql(n.mul(g, B), n.mul(T, E)), N = n.eql(n.mul(m, B), n.mul(I, E));
      return b && N;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new d(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: p, b: g } = e, m = n.mul(g, vs), { px: E, py: T, pz: I } = this;
      let B = n.ZERO, b = n.ZERO, N = n.ZERO, k = n.mul(E, E), V = n.mul(T, T), C = n.mul(I, I), L = n.mul(E, T);
      return L = n.add(L, L), N = n.mul(E, I), N = n.add(N, N), B = n.mul(p, N), b = n.mul(m, C), b = n.add(B, b), B = n.sub(V, b), b = n.add(V, b), b = n.mul(B, b), B = n.mul(L, B), N = n.mul(m, N), C = n.mul(p, C), L = n.sub(k, C), L = n.mul(p, L), L = n.add(L, N), N = n.add(k, k), k = n.add(N, k), k = n.add(k, C), k = n.mul(k, L), b = n.add(b, k), C = n.mul(T, I), C = n.add(C, C), k = n.mul(C, L), B = n.sub(B, k), N = n.mul(C, V), N = n.add(N, N), N = n.add(N, N), new d(B, b, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: T, py: I, pz: B } = p;
      let b = n.ZERO, N = n.ZERO, k = n.ZERO;
      const V = e.a, C = n.mul(e.b, vs);
      let L = n.mul(g, T), D = n.mul(m, I), S = n.mul(E, B), v = n.add(g, m), x = n.add(T, I);
      v = n.mul(v, x), x = n.add(L, D), v = n.sub(v, x), x = n.add(g, E);
      let U = n.add(T, B);
      return x = n.mul(x, U), U = n.add(L, S), x = n.sub(x, U), U = n.add(m, E), b = n.add(I, B), U = n.mul(U, b), b = n.add(D, S), U = n.sub(U, b), k = n.mul(V, x), b = n.mul(C, S), k = n.add(b, k), b = n.sub(D, k), k = n.add(D, k), N = n.mul(b, k), D = n.add(L, L), D = n.add(D, L), S = n.mul(V, S), x = n.mul(C, x), D = n.add(D, S), S = n.sub(L, S), S = n.mul(V, S), x = n.add(x, S), L = n.mul(D, x), N = n.add(N, L), L = n.mul(U, x), b = n.mul(v, b), b = n.sub(b, L), L = n.mul(v, D), k = n.mul(U, k), k = n.add(k, L), new d(b, N, k);
    }
    subtract(p) {
      return this.add(p.negate());
    }
    is0() {
      return this.equals(d.ZERO);
    }
    wNAF(p) {
      return y.wNAFCached(this, p, d.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(p) {
      const { endo: g, n: m } = e;
      Ft("scalar", p, me, m);
      const E = d.ZERO;
      if (p === me)
        return E;
      if (this.is0() || p === dt)
        return this;
      if (!g || y.hasPrecomputes(this))
        return y.wNAFCachedUnsafe(this, p, d.normalizeZ);
      let { k1neg: T, k1: I, k2neg: B, k2: b } = g.splitScalar(p), N = E, k = E, V = this;
      for (; I > me || b > me; )
        I & dt && (N = N.add(V)), b & dt && (k = k.add(V)), V = V.double(), I >>= dt, b >>= dt;
      return T && (N = N.negate()), B && (k = k.negate()), k = new d(n.mul(k.px, g.beta), k.py, k.pz), N.add(k);
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
    multiply(p) {
      const { endo: g, n: m } = e;
      Ft("scalar", p, dt, m);
      let E, T;
      if (g) {
        const { k1neg: I, k1: B, k2neg: b, k2: N } = g.splitScalar(p);
        let { p: k, f: V } = this.wNAF(B), { p: C, f: L } = this.wNAF(N);
        k = y.constTimeNegate(I, k), C = y.constTimeNegate(b, C), C = new d(n.mul(C.px, g.beta), C.py, C.pz), E = k.add(C), T = V.add(L);
      } else {
        const { p: I, f: B } = this.wNAF(p);
        E = I, T = B;
      }
      return d.normalizeZ([E, T])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, m) {
      const E = d.BASE, T = (B, b) => b === me || b === dt || !B.equals(E) ? B.multiplyUnsafe(b) : B.multiply(b), I = T(this, g).add(T(p, m));
      return I.is0() ? void 0 : I;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return f(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = e;
      if (p === dt)
        return !0;
      if (g)
        return g(d, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = e;
      return p === dt ? this : g ? g(d, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(p = !0) {
      return wn("isCompressed", p), this.assertValidity(), i(d, this, p);
    }
    toHex(p = !0) {
      return wn("isCompressed", p), gn(this.toRawBytes(p));
    }
  }
  d.BASE = new d(e.Gx, e.Gy, n.ONE), d.ZERO = new d(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, y = ju(d, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: d,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function nf(t) {
  const e = Dc(t);
  return Jn(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function rf(t) {
  const e = nf(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function s(S) {
    return pt(S, r);
  }
  function c(S) {
    return Di(S, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: f, isWithinCurveOrder: l } = ef({
    ...e,
    toBytes(S, v, x) {
      const U = v.toAffine(), $ = n.toBytes(U.x), M = _e;
      return wn("isCompressed", x), x ? M(Uint8Array.from([v.hasEvenY() ? 2 : 3]), $) : M(Uint8Array.from([4]), $, n.toBytes(U.y));
    },
    fromBytes(S) {
      const v = S.length, x = S[0], U = S.subarray(1);
      if (v === i && (x === 2 || x === 3)) {
        const $ = Ct(U);
        if (!En($, dt, n.ORDER))
          throw new Error("Point is not on curve");
        const M = f($);
        let q;
        try {
          q = n.sqrt(M);
        } catch (J) {
          const z = J instanceof Error ? ": " + J.message : "";
          throw new Error("Point is not on curve" + z);
        }
        const K = (q & dt) === dt;
        return (x & 1) === 1 !== K && (q = n.neg(q)), { x: $, y: q };
      } else if (v === o && x === 4) {
        const $ = n.fromBytes(U.subarray(0, n.BYTES)), M = n.fromBytes(U.subarray(n.BYTES, 2 * n.BYTES));
        return { x: $, y: M };
      } else {
        const $ = i, M = o;
        throw new Error("invalid Point, expected length of " + $ + ", or uncompressed " + M + ", got " + v);
      }
    }
  }), d = (S) => gn(re(S, e.nByteLength));
  function h(S) {
    const v = r >> dt;
    return S > v;
  }
  function y(S) {
    return h(S) ? s(-S) : S;
  }
  const w = (S, v, x) => Ct(S.slice(v, x));
  class p {
    constructor(v, x, U) {
      this.r = v, this.s = x, this.recovery = U, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(v) {
      const x = e.nByteLength;
      return v = vt("compactSignature", v, x * 2), new p(w(v, 0, x), w(v, x, 2 * x));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(v) {
      const { r: x, s: U } = ge.toSig(vt("DER", v));
      return new p(x, U);
    }
    assertValidity() {
      Ft("r", this.r, dt, r), Ft("s", this.s, dt, r);
    }
    addRecoveryBit(v) {
      return new p(this.r, this.s, v);
    }
    recoverPublicKey(v) {
      const { r: x, s: U, recovery: $ } = this, M = B(vt("msgHash", v));
      if ($ == null || ![0, 1, 2, 3].includes($))
        throw new Error("recovery id invalid");
      const q = $ === 2 || $ === 3 ? x + e.n : x;
      if (q >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const K = ($ & 1) === 0 ? "02" : "03", st = a.fromHex(K + d(q)), J = c(q), z = s(-M * J), Ht = s(U * J), mt = a.BASE.multiplyAndAddUnsafe(st, z, Ht);
      if (!mt)
        throw new Error("point at infinify");
      return mt.assertValidity(), mt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return h(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new p(this.r, s(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return yn(this.toDERHex());
    }
    toDERHex() {
      return ge.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return yn(this.toCompactHex());
    }
    toCompactHex() {
      return d(this.r) + d(this.s);
    }
  }
  const g = {
    isValidPrivateKey(S) {
      try {
        return u(S), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: u,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const S = Hc(e.n);
      return Gu(e.randomBytes(S), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(S = 8, v = a.BASE) {
      return v._setWindowSize(S), v.multiply(BigInt(3)), v;
    }
  };
  function m(S, v = !0) {
    return a.fromPrivateKey(S).toRawBytes(v);
  }
  function E(S) {
    const v = Qe(S), x = typeof S == "string", U = (v || x) && S.length;
    return v ? U === i || U === o : x ? U === 2 * i || U === 2 * o : S instanceof a;
  }
  function T(S, v, x = !0) {
    if (E(S))
      throw new Error("first arg must be private key");
    if (!E(v))
      throw new Error("second arg must be public key");
    return a.fromHex(v).multiply(u(S)).toRawBytes(x);
  }
  const I = e.bits2int || function(S) {
    if (S.length > 8192)
      throw new Error("input is too large");
    const v = Ct(S), x = S.length * 8 - e.nBitLength;
    return x > 0 ? v >> BigInt(x) : v;
  }, B = e.bits2int_modN || function(S) {
    return s(I(S));
  }, b = No(e.nBitLength);
  function N(S) {
    return Ft("num < 2^" + e.nBitLength, S, me, b), re(S, e.nByteLength);
  }
  function k(S, v, x = V) {
    if (["recovered", "canonical"].some((Bt) => Bt in x))
      throw new Error("sign() legacy options not supported");
    const { hash: U, randomBytes: $ } = e;
    let { lowS: M, prehash: q, extraEntropy: K } = x;
    M == null && (M = !0), S = vt("msgHash", S), Ss(x), q && (S = vt("prehashed msgHash", U(S)));
    const st = B(S), J = u(v), z = [N(J), N(st)];
    if (K != null && K !== !1) {
      const Bt = K === !0 ? $(n.BYTES) : K;
      z.push(vt("extraEntropy", Bt));
    }
    const Ht = _e(...z), mt = st;
    function Fe(Bt) {
      const Mt = I(Bt);
      if (!l(Mt))
        return;
      const Ke = c(Mt), Wt = a.BASE.multiply(Mt).toAffine(), kt = s(Wt.x);
      if (kt === me)
        return;
      const Zt = s(Ke * s(mt + kt * J));
      if (Zt === me)
        return;
      let jt = (Wt.x === kt ? 0 : 2) | Number(Wt.y & dt), Vt = Zt;
      return M && h(Zt) && (Vt = y(Zt), jt ^= 1), new p(kt, Vt, jt);
    }
    return { seed: Ht, k2sig: Fe };
  }
  const V = { lowS: e.lowS, prehash: !1 }, C = { lowS: e.lowS, prehash: !1 };
  function L(S, v, x = V) {
    const { seed: U, k2sig: $ } = k(S, v, x), M = e;
    return Rc(M.hash.outputLen, M.nByteLength, M.hmac)(U, $);
  }
  a.BASE._setWindowSize(8);
  function D(S, v, x, U = C) {
    var jt;
    const $ = S;
    v = vt("msgHash", v), x = vt("publicKey", x);
    const { lowS: M, prehash: q, format: K } = U;
    if (Ss(U), "strict" in U)
      throw new Error("options.strict was renamed to lowS");
    if (K !== void 0 && K !== "compact" && K !== "der")
      throw new Error("format must be compact or der");
    const st = typeof $ == "string" || Qe($), J = !st && !K && typeof $ == "object" && $ !== null && typeof $.r == "bigint" && typeof $.s == "bigint";
    if (!st && !J)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let z, Ht;
    try {
      if (J && (z = new p($.r, $.s)), st) {
        try {
          K !== "compact" && (z = p.fromDER($));
        } catch (Vt) {
          if (!(Vt instanceof ge.Err))
            throw Vt;
        }
        !z && K !== "der" && (z = p.fromCompact($));
      }
      Ht = a.fromHex(x);
    } catch {
      return !1;
    }
    if (!z || M && z.hasHighS())
      return !1;
    q && (v = e.hash(v));
    const { r: mt, s: Fe } = z, Bt = B(v), Mt = c(Fe), Ke = s(Bt * Mt), Wt = s(mt * Mt), kt = (jt = a.BASE.multiplyAndAddUnsafe(Ht, Ke, Wt)) == null ? void 0 : jt.toAffine();
    return kt ? s(kt.x) === mt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: m,
    getSharedSecret: T,
    sign: L,
    verify: D,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function of(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Lc(t, e, vu(...n)),
    randomBytes: Ao
  };
}
function sf(t, e) {
  const n = (r) => rf({ ...t, ...of(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const tr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Ar = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Dn = BigInt(1), Ir = BigInt(2), Ts = (t, e) => (t + e / Ir) / e;
function Fc(t) {
  const e = tr, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, f = u * u * t % e, l = Kt(f, n, e) * f % e, d = Kt(l, n, e) * f % e, h = Kt(d, Ir, e) * u % e, y = Kt(h, i, e) * h % e, w = Kt(y, o, e) * y % e, p = Kt(w, c, e) * w % e, g = Kt(p, a, e) * p % e, m = Kt(g, c, e) * w % e, E = Kt(m, n, e) * f % e, T = Kt(E, s, e) * y % e, I = Kt(T, r, e) * u % e, B = Kt(I, Ir, e);
  if (!Fi.eql(Fi.sqr(B), t))
    throw new Error("Cannot find square root");
  return B;
}
const Fi = Oc(tr, void 0, void 0, { sqrt: Fc }), ae = sf({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: Fi,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: Ar,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
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
      const e = Ar, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Dn * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, s = BigInt("0x100000000000000000000000000000000"), c = Ts(o * t, e), a = Ts(-r * t, e);
      let u = pt(t - c * n - a * i, e), f = pt(-c * r - a * o, e);
      const l = u > s, d = f > s;
      if (l && (u = e - u), d && (f = e - f), u > s || f > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: l, k1: u, k2neg: d, k2: f };
    }
  }
}, $t), Kc = BigInt(0), As = {};
function Br(t, ...e) {
  let n = As[t];
  if (n === void 0) {
    const r = $t(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = _e(r, r), As[t] = n;
  }
  return $t(_e(n, ...e));
}
const Uo = (t) => t.toRawBytes(!0).slice(1), Ki = (t) => re(t, 32), bi = (t) => pt(t, tr), Fn = (t) => pt(t, Ar), $o = ae.ProjectivePoint, cf = (t, e, n) => $o.BASE.multiplyAndAddUnsafe(t, e, n);
function qi(t) {
  let e = ae.utils.normPrivateKeyToScalar(t), n = $o.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Fn(-e), bytes: Uo(n) };
}
function qc(t) {
  Ft("x", t, Dn, tr);
  const e = bi(t * t), n = bi(e * t + BigInt(7));
  let r = Fc(n);
  r % Ir !== Kc && (r = bi(-r));
  const i = new $o(t, r, Dn);
  return i.assertValidity(), i;
}
const fn = Ct;
function zc(...t) {
  return Fn(fn(Br("BIP0340/challenge", ...t)));
}
function af(t) {
  return qi(t).bytes;
}
function uf(t, e, n = Ao(32)) {
  const r = vt("message", t), { bytes: i, scalar: o } = qi(e), s = vt("auxRand", n, 32), c = Ki(o ^ fn(Br("BIP0340/aux", s))), a = Br("BIP0340/nonce", c, i, r), u = Fn(fn(a));
  if (u === Kc)
    throw new Error("sign failed: k is zero");
  const { bytes: f, scalar: l } = qi(u), d = zc(f, i, r), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(Ki(Fn(l + d * o)), 32), !Gc(h, r, i))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function Gc(t, e, n) {
  const r = vt("signature", t, 64), i = vt("message", e), o = vt("publicKey", n, 32);
  try {
    const s = qc(fn(o)), c = fn(r.subarray(0, 32));
    if (!En(c, Dn, tr))
      return !1;
    const a = fn(r.subarray(32, 64));
    if (!En(a, Dn, Ar))
      return !1;
    const u = zc(Ki(c), Uo(s), i), f = cf(s, a, Fn(-u));
    return !(!f || !f.hasEvenY() || f.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const ue = {
  getPublicKey: af,
  sign: uf,
  verify: Gc,
  utils: {
    randomPrivateKey: ae.utils.randomPrivateKey,
    lift_x: qc,
    pointToBytes: Uo,
    numberToBytesBE: re,
    bytesToNumberBE: Ct,
    taggedHash: Br,
    mod: pt
  }
}, ff = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), Wc = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), lf = /* @__PURE__ */ Wc.map((t) => (9 * t + 5) % 16);
let Lo = [Wc], Co = [lf];
for (let t = 0; t < 4; t++)
  for (let e of [Lo, Co])
    e.push(e[t].map((n) => ff[n]));
const Zc = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), df = /* @__PURE__ */ Lo.map((t, e) => t.map((n) => Zc[e][n])), hf = /* @__PURE__ */ Co.map((t, e) => t.map((n) => Zc[e][n])), pf = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), wf = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Is(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const ur = /* @__PURE__ */ new Uint32Array(16);
class gf extends Uc {
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
    for (let h = 0; h < 16; h++, n += 4)
      ur[h] = e.getUint32(n, !0);
    let r = this.h0 | 0, i = r, o = this.h1 | 0, s = o, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, l = this.h4 | 0, d = l;
    for (let h = 0; h < 5; h++) {
      const y = 4 - h, w = pf[h], p = wf[h], g = Lo[h], m = Co[h], E = df[h], T = hf[h];
      for (let I = 0; I < 16; I++) {
        const B = cr(r + Is(h, o, c, u) + ur[g[I]] + w, E[I]) + l | 0;
        r = l, l = u, u = cr(c, 10) | 0, c = o, o = B;
      }
      for (let I = 0; I < 16; I++) {
        const B = cr(i + Is(y, s, a, f) + ur[m[I]] + p, T[I]) + d | 0;
        i = d, d = f, f = cr(a, 10) | 0, a = s, s = B;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + d | 0, this.h3 + l + i | 0, this.h4 + r + s | 0, this.h0 + o + a | 0);
  }
  roundClean() {
    ur.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const yf = /* @__PURE__ */ Nc(() => new gf());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Kn(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function jc(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Ro(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function qn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function er(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function kr(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Yc(t, e) {
  if (!jc(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function _o(t, e) {
  if (!jc(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Yr(...t) {
  const e = (o) => o, n = (o, s) => (c) => o(s(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Oo(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Yc("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (kr(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (kr(i), i.map((o) => {
      qn("alphabet.decode", o);
      const s = r.get(o);
      if (s === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Po(t = "") {
  return qn("join", t), {
    encode: (e) => (Yc("join.decode", e), e.join(t)),
    decode: (e) => (qn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function mf(t) {
  return Ro(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Bs(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (kr(t), !t.length)
    return [];
  let r = 0;
  const i = [], o = Array.from(t, (c) => {
    if (er(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = o.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const f = o[u], l = e * c, d = l + f;
      if (!Number.isSafeInteger(d) || l / e !== c || d - f !== l)
        throw new Error("convertRadix: carry overflow");
      const h = d / n;
      c = d % n;
      const y = Math.floor(h);
      if (o[u] = y, !Number.isSafeInteger(y) || y * n + c !== d)
        throw new Error("convertRadix: carry overflow");
      if (a)
        y ? a = !1 : r = u;
      else continue;
    }
    if (i.push(c), a)
      break;
  }
  for (let c = 0; c < t.length - 1 && t[c] === 0; c++)
    i.push(0);
  return i.reverse();
}
const Xc = (t, e) => e === 0 ? t : Xc(e, t % e), Nr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Xc(t, e)), yr = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function zi(t, e, n, r) {
  if (kr(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Nr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Nr(e, n)}`);
  let i = 0, o = 0;
  const s = yr[e], c = yr[n] - 1, a = [];
  for (const u of t) {
    if (er(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (i = i << e | u, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      a.push((i >> o - n & c) >>> 0);
    const f = yr[o];
    if (f === void 0)
      throw new Error("invalid carry");
    i &= f - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && a.push(i >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Ef(t) {
  er(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Kn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Bs(Array.from(n), e, t);
    },
    decode: (n) => (_o("radix.decode", n), Uint8Array.from(Bs(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function Qc(t, e = !1) {
  if (er(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Nr(8, t) > 32 || /* @__PURE__ */ Nr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Kn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return zi(Array.from(n), 8, t, !e);
    },
    decode: (n) => (_o("radix2.decode", n), Uint8Array.from(zi(n, t, 8, e)))
  };
}
function ks(t) {
  return Ro(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function bf(t, e) {
  return er(t), Ro(e), {
    encode(n) {
      if (!Kn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), i = new Uint8Array(n.length + t);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Kn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), i = n.slice(-t), o = e(r).slice(0, t);
      for (let s = 0; s < t; s++)
        if (o[s] !== i[s])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const xf = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Yr(/* @__PURE__ */ Ef(58), /* @__PURE__ */ Oo(t), /* @__PURE__ */ Po("")), Sf = /* @__PURE__ */ xf("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), vf = (t) => /* @__PURE__ */ Yr(bf(4, (e) => t(t(e))), Sf), Gi = /* @__PURE__ */ Yr(/* @__PURE__ */ Oo("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Po("")), Ns = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Un(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Ns.length; r++)
    (e >> r & 1) === 1 && (n ^= Ns[r]);
  return n;
}
function Us(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let o = 0; o < r; o++) {
    const s = t.charCodeAt(o);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = Un(i) ^ s >> 5;
  }
  i = Un(i);
  for (let o = 0; o < r; o++)
    i = Un(i) ^ t.charCodeAt(o) & 31;
  for (let o of e)
    i = Un(i) ^ o;
  for (let o = 0; o < 6; o++)
    i = Un(i);
  return i ^= n, Gi.encode(zi([i % yr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Jc(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Qc(5), r = n.decode, i = n.encode, o = ks(r);
  function s(l, d, h = 90) {
    qn("bech32.encode prefix", l), Kn(d) && (d = Array.from(d)), _o("bech32.encode", d);
    const y = l.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const w = y + 7 + d.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = l.toLowerCase(), g = Us(p, d, e);
    return `${p}1${Gi.encode(d)}${g}`;
  }
  function c(l, d = 90) {
    qn("bech32.decode input", l);
    const h = l.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${l}). Expected (8..${d})`);
    const y = l.toLowerCase();
    if (l !== y && l !== l.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = y.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = y.slice(0, w), g = y.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const m = Gi.decode(g).slice(0, -6), E = Us(p, m, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${l}: expected "${E}"`);
    return { prefix: p, words: m };
  }
  const a = ks(c);
  function u(l) {
    const { prefix: d, words: h } = c(l, !1);
    return { prefix: d, words: h, bytes: r(h) };
  }
  function f(l, d) {
    return s(l, i(d));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const Wi = /* @__PURE__ */ Jc("bech32"), ta = /* @__PURE__ */ Jc("bech32m"), Tf = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, Z = /* @__PURE__ */ Yr(/* @__PURE__ */ Qc(4), /* @__PURE__ */ Oo("0123456789abcdef"), /* @__PURE__ */ Po(""), /* @__PURE__ */ mf((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), tt = /* @__PURE__ */ new Uint8Array(), ea = /* @__PURE__ */ new Uint8Array([0]);
function bn(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Gt(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Af(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (!Gt(i))
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
const na = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function nr(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function fe(t) {
  return Number.isSafeInteger(t);
}
const Ho = {
  equalBytes: bn,
  isBytes: Gt,
  concatBytes: Af
}, ra = (t) => {
  if (t !== null && typeof t != "string" && !te(t) && !Gt(t) && !fe(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (te(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = ve.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (te(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = ve.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, lt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(lt.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (lt.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${lt.len(e)}`);
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
    lt.checkLen(t, e);
    const { FULL_MASK: r, BITS: i } = lt, o = i - e % i, s = o ? r >>> o << o : r, c = [];
    for (let a = 0; a < t.length; a++) {
      let u = t[a];
      if (n && (u = ~u), a === t.length - 1 && (u &= s), u !== 0)
        for (let f = 0; f < i; f++) {
          const l = 1 << i - f - 1;
          u & l && c.push(a * i + f);
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
  rangeDebug: (t, e, n = !1) => `[${lt.range(lt.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, i = !0) => {
    lt.chunkLen(e, n, r);
    const { FULL_MASK: o, BITS: s } = lt, c = n % s ? Math.floor(n / s) : void 0, a = n + r, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return lt.set(t, c, o >>> s - r << s - r - n, i);
    if (c !== void 0 && !lt.set(t, c, o >>> n % s, i))
      return !1;
    const f = c !== void 0 ? c + 1 : n / s, l = u !== void 0 ? u : a / s;
    for (let d = f; d < l; d++)
      if (!lt.set(t, d, o, i))
        return !1;
    return !(u !== void 0 && c !== u && !lt.set(t, u, o << s - a % s, i));
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
    const r = new Error(`${t}(${ve.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((s) => s.obj);
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
class Mo {
  constructor(e, n = {}, r = [], i = void 0, o = 0) {
    this.data = e, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = o, this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.view = na(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = lt.create(this.data.length), lt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : lt.setRange(this.bs, this.data.length, e, n, !1);
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
    return ve.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${Z.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = lt.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = lt.range(e).map(({ pos: r, length: i }) => `(${r}/${i})[${Z.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${Z.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return ve.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Mo(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Gt(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (bn(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class If {
  constructor(e = []) {
    this.stack = e, this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.view = na(this.viewBuf);
  }
  pushObj(e, n) {
    return ve.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!fe(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return ve.err("Reader", this.stack, e);
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
    const n = this.buffers.concat(this.ptrs.map((o) => o.buffer)), r = n.map((o) => o.length).reduce((o, s) => o + s, 0), i = new Uint8Array(r);
    for (let o = 0, s = 0; o < n.length; o++) {
      const c = n[o];
      i.set(c, s), s += c.length;
    }
    for (let o = this.pos, s = 0; s < this.ptrs.length; s++) {
      const c = this.ptrs[s];
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
const Zi = (t) => Uint8Array.from(t).reverse();
function Bf(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function ia(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new If();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new Mo(e, n), i = t.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Ot(t, e) {
  if (!te(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return ia({
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
const Pt = (t) => {
  const e = ia(t);
  return t.validate ? Ot(e, t.validate) : e;
}, Xr = (t) => nr(t) && typeof t.decode == "function" && typeof t.encode == "function";
function te(t) {
  return nr(t) && Xr(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || fe(t.size));
}
function kf() {
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
      if (!nr(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Nf = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!fe(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function Uf(t) {
  if (!nr(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!fe(e) || !(e in t))
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
function $f(t, e = !1) {
  if (!fe(t))
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
      let s = i.length - 1;
      for (; s >= o && i[s] === "0"; s--)
        ;
      let c = i.slice(0, o), a = i.slice(o, s + 1);
      return c || (c = "0"), r < 0n && (c = "-" + c), a ? `${c}.${a}` : c;
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
      const s = r.slice(0, o), c = r.slice(o + 1).replace(/0+$/, ""), a = BigInt(s) * n;
      if (!e && c.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const u = Math.min(c.length, t), f = BigInt(c.slice(0, u)) * 10n ** BigInt(t - u), l = a + f;
      return i ? -l : l;
    }
  };
}
function Lf(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!Xr(e))
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
const oa = (t) => {
  if (!Xr(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, Qr = { dict: kf, numberBigint: Nf, tsEnum: Uf, decimal: $f, match: Lf, reverse: oa }, Vo = (t, e = !1, n = !1, r = !0) => {
  if (!fe(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(t), o = 2n ** (8n * i - 1n);
  return Pt({
    size: r ? t : void 0,
    encodeStream: (s, c) => {
      n && c < 0 && (c = c | o);
      const a = [];
      for (let f = 0; f < t; f++)
        a.push(Number(c & 255n)), c >>= 8n;
      let u = new Uint8Array(a).reverse();
      if (!r) {
        let f = 0;
        for (f = 0; f < u.length && u[f] === 0; f++)
          ;
        u = u.subarray(f);
      }
      s.bytes(e ? u.reverse() : u);
    },
    decodeStream: (s) => {
      const c = s.bytes(r ? t : Math.min(t, s.leftBytes)), a = e ? c : Zi(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & o && (u = (u ^ o) - o), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return Bf(s, 8n * i, !!n), s;
    }
  });
}, sa = /* @__PURE__ */ Vo(32, !1), mr = /* @__PURE__ */ Vo(8, !0), Cf = /* @__PURE__ */ Vo(8, !0, !0), Rf = (t, e) => Pt({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (i) => e.write(i, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), rr = (t, e, n) => {
  const r = t * 8, i = 2 ** (r - 1), o = (a) => {
    if (!fe(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -i || a >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${a} < ${i}`);
  }, s = 2 ** r, c = (a) => {
    if (!fe(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return Rf(t, {
    write: n.write,
    read: n.read,
    validate: e ? o : c
  });
}, G = /* @__PURE__ */ rr(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), _f = /* @__PURE__ */ rr(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), cn = /* @__PURE__ */ rr(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), $s = /* @__PURE__ */ rr(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), Ce = /* @__PURE__ */ rr(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Q = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = ra(t), r = Gt(t);
  return Pt({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (i, o) => {
      r || n.encodeStream(i, o.length), i.bytes(e ? Zi(o) : o), r && i.bytes(t);
    },
    decodeStream: (i) => {
      let o;
      if (r) {
        const s = i.find(t);
        if (!s)
          throw i.err("bytes: cannot find terminator");
        o = i.bytes(s - i.pos), i.bytes(t.length);
      } else
        o = i.bytes(t === null ? i.leftBytes : n.decodeStream(i));
      return e ? Zi(o) : o;
    },
    validate: (i) => {
      if (!Gt(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function Of(t, e) {
  if (!te(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Oe(Q(t), oa(e));
}
const Do = (t, e = !1) => Ot(Oe(Q(t, e), Tf), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Pf = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = Oe(Q(t, e.isLE), Z);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Oe(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function Oe(t, e) {
  if (!te(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!Xr(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Pt({
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
const Hf = (t, e = !1) => {
  if (!Gt(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Pt({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = bn(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Mf(t, e, n) {
  if (!te(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Pt({
    encodeStream: (r, i) => {
      ve.resolve(r.stack, t) && e.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!ve.resolve(r.stack, t), i)
        return e.decodeStream(r);
    }
  });
}
function Fo(t, e, n = !0) {
  if (!te(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Pt({
    size: t.size,
    encodeStream: (r, i) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const i = t.decodeStream(r);
      if (n && typeof i != "object" && i !== e || Gt(e) && !bn(e, i))
        throw r.err(`magic: invalid value: ${i} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function ca(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!fe(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function yt(t) {
  if (!nr(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!te(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Pt({
    size: ca(Object.values(t)),
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
function Vf(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!te(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Pt({
    size: ca(t),
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
function Rt(t, e) {
  if (!te(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = ra(typeof t == "string" ? `../${t}` : t);
  return Pt({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, i) => {
      const o = r;
      o.pushObj(i, (s) => {
        Gt(t) || n.encodeStream(r, i.length);
        for (let c = 0; c < i.length; c++)
          s(`${c}`, () => {
            const a = i[c], u = r.pos;
            if (e.encodeStream(r, a), Gt(t)) {
              if (t.length > o.pos - u)
                return;
              const f = o.finish(!1).subarray(u, o.pos);
              if (bn(f.subarray(0, t.length), t))
                throw o.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Gt(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (o) => {
        if (t === null)
          for (let s = 0; !r.isEnd() && (o(`${s}`, () => i.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); s++)
            ;
        else if (Gt(t))
          for (let s = 0; ; s++) {
            if (bn(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            o(`${s}`, () => i.push(e.decodeStream(r)));
          }
        else {
          let s;
          o("arrayLen", () => s = n.decodeStream(r));
          for (let c = 0; c < s; c++)
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
const Jr = ae.ProjectivePoint, Ur = ae.CURVE.n, Y = Ho.isBytes, Ne = Ho.concatBytes, ut = Ho.equalBytes, aa = (t) => yf($t(t)), zt = (...t) => $t($t(Ne(...t))), ua = ue.utils.randomPrivateKey, Ko = ue.getPublicKey, Df = ae.getPublicKey, Ls = (t) => t.r < Ur / 2n;
function Ff(t, e, n = !1) {
  let r = ae.sign(t, e);
  if (n && !Ls(r)) {
    const i = new Uint8Array(32);
    let o = 0;
    for (; !Ls(r); )
      if (i.set(G.encode(o++)), r = ae.sign(t, e, { extraEntropy: i }), o > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Cs = ue.sign, qo = ue.utils.taggedHash;
var Ut;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(Ut || (Ut = {}));
function xn(t, e) {
  const n = t.length;
  if (e === Ut.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Jr.fromHex(t), t;
  } else if (e === Ut.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return ue.utils.lift_x(ue.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function fa(t, e) {
  const n = ue.utils, r = n.taggedHash("TapTweak", t, e), i = n.bytesToNumberBE(r);
  if (i >= Ur)
    throw new Error("tweak higher than curve order");
  return i;
}
function Kf(t, e = new Uint8Array()) {
  const n = ue.utils, r = n.bytesToNumberBE(t), i = Jr.fromPrivateKey(r), o = i.hasEvenY() ? r : n.mod(-r, Ur), s = n.pointToBytes(i), c = fa(s, e);
  return n.numberToBytesBE(n.mod(o + c, Ur), 32);
}
function la(t, e) {
  const n = ue.utils, r = fa(t, e), o = n.lift_x(n.bytesToNumberBE(t)).add(Jr.fromPrivateKey(r)), s = o.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(o), s];
}
const Nn = $t(Jr.BASE.toRawBytes(!1)), Je = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, fr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function $r(t, e) {
  if (!Y(t) || !Y(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function da(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ha(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function pa(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Sn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function zo(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function ji(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Lr(t, e) {
  if (!ha(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function wa(t, e) {
  if (!ha(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Go(...t) {
  const e = (o) => o, n = (o, s) => (c) => o(s(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Wo(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Lr("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (ji(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (ji(i), i.map((o) => {
      Sn("alphabet.decode", o);
      const s = r.get(o);
      if (s === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Zo(t = "") {
  return Sn("join", t), {
    encode: (e) => (Lr("join.decode", e), e.join(t)),
    decode: (e) => (Sn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function qf(t, e = "=") {
  return zo(t), Sn("padding", e), {
    encode(n) {
      for (Lr("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Lr("padding.decode", n);
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
function zf(t) {
  return pa(t), { encode: (e) => e, decode: (e) => t(e) };
}
const ga = (t, e) => e === 0 ? t : ga(e, t % e), Cr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - ga(t, e)), Er = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Yi(t, e, n, r) {
  if (ji(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Cr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Cr(e, n)}`);
  let i = 0, o = 0;
  const s = Er[e], c = Er[n] - 1, a = [];
  for (const u of t) {
    if (zo(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (i = i << e | u, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      a.push((i >> o - n & c) >>> 0);
    const f = Er[o];
    if (f === void 0)
      throw new Error("invalid carry");
    i &= f - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && a.push(i >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function jo(t, e = !1) {
  if (zo(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Cr(8, t) > 32 || /* @__PURE__ */ Cr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!da(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Yi(Array.from(n), 8, t, !e);
    },
    decode: (n) => (wa("radix2.decode", n), Uint8Array.from(Yi(n, t, 8, e)))
  };
}
function Rs(t) {
  return pa(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const Nt = /* @__PURE__ */ Go(/* @__PURE__ */ jo(6), /* @__PURE__ */ Wo("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ qf(6), /* @__PURE__ */ Zo("")), Xi = /* @__PURE__ */ Go(/* @__PURE__ */ Wo("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Zo("")), _s = [996825010, 642813549, 513874426, 1027748829, 705979059];
function $n(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < _s.length; r++)
    (e >> r & 1) === 1 && (n ^= _s[r]);
  return n;
}
function Os(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let o = 0; o < r; o++) {
    const s = t.charCodeAt(o);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = $n(i) ^ s >> 5;
  }
  i = $n(i);
  for (let o = 0; o < r; o++)
    i = $n(i) ^ t.charCodeAt(o) & 31;
  for (let o of e)
    i = $n(i) ^ o;
  for (let o = 0; o < 6; o++)
    i = $n(i);
  return i ^= n, Xi.encode(Yi([i % Er[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Gf(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ jo(5), r = n.decode, i = n.encode, o = Rs(r);
  function s(l, d, h = 90) {
    Sn("bech32.encode prefix", l), da(d) && (d = Array.from(d)), wa("bech32.encode", d);
    const y = l.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const w = y + 7 + d.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = l.toLowerCase(), g = Os(p, d, e);
    return `${p}1${Xi.encode(d)}${g}`;
  }
  function c(l, d = 90) {
    Sn("bech32.decode input", l);
    const h = l.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${l}). Expected (8..${d})`);
    const y = l.toLowerCase();
    if (l !== y && l !== l.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = y.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = y.slice(0, w), g = y.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const m = Xi.decode(g).slice(0, -6), E = Os(p, m, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${l}: expected "${E}"`);
    return { prefix: p, words: m };
  }
  const a = Rs(c);
  function u(l) {
    const { prefix: d, words: h } = c(l, !1);
    return { prefix: d, words: h, bytes: r(h) };
  }
  function f(l, d) {
    return s(l, i(d));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const lr = /* @__PURE__ */ Gf("bech32m"), F = /* @__PURE__ */ Go(/* @__PURE__ */ jo(4), /* @__PURE__ */ Wo("0123456789abcdef"), /* @__PURE__ */ Zo(""), /* @__PURE__ */ zf((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class ya extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: ma, pointToBytes: dr } = ue.utils, Pe = ae.ProjectivePoint, le = 33, Qi = new Uint8Array(le), Ue = ae.CURVE.n, Ps = Oe(Q(33), {
  decode: (t) => Yo(t) ? Qi : t.toRawBytes(!0),
  encode: (t) => mn(t, Qi) ? Pe.ZERO : Pe.fromHex(t)
}), Hs = Ot(sa, (t) => (Ft("n", t, 1n, Ue), t)), br = yt({ R1: Ps, R2: Ps }), Ea = yt({ k1: Hs, k2: Hs, publicKey: Q(le) });
function Ms(t, ...e) {
}
function Yt(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Lt(n, ...e));
}
function Vs(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Xt = (t) => pt(t, Ue), Rr = (t, ...e) => Xt(Ct(ma(t, ...e))), Ln = (t, e) => t.hasEvenY() ? e : Xt(-e);
function je(t) {
  return Pe.BASE.multiply(t);
}
function Yo(t) {
  return t.equals(Pe.ZERO);
}
function Ji(t) {
  return Yt(t, le), t.sort($r);
}
function ba(t) {
  Yt(t, le);
  for (let e = 1; e < t.length; e++)
    if (!mn(t[e], t[0]))
      return t[e];
  return Qi;
}
function xa(t) {
  return Yt(t, le), ma("KeyAgg list", ...t);
}
function Sa(t, e, n) {
  return Lt(t, le), Lt(e, le), mn(t, e) ? 1n : Rr("KeyAgg coefficient", n, t);
}
function to(t, e = [], n = []) {
  if (Yt(t, le), Yt(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = ba(t), i = xa(t);
  let o = Pe.ZERO;
  for (let a = 0; a < t.length; a++) {
    let u;
    try {
      u = Pe.fromHex(t[a]);
    } catch {
      throw new ya(a, "pubkey");
    }
    o = o.add(u.multiply(Sa(t[a], r, i)));
  }
  let s = 1n, c = 0n;
  for (let a = 0; a < e.length; a++) {
    const u = n[a] && !o.hasEvenY() ? Xt(-1n) : 1n, f = Ct(e[a]);
    if (Ft("tweak", f, 0n, Ue), o = o.multiply(u).add(je(f)), Yo(o))
      throw new Error("The result of tweaking cannot be infinity");
    s = Xt(u * s), c = Xt(f + u * c);
  }
  return { aggPublicKey: o, gAcc: s, tweakAcc: c };
}
const Ds = (t, e, n, r, i, o) => Rr("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, i, re(o.length, 4), o, new Uint8Array([r]));
function Wf(t, e, n = new Uint8Array(0), r, i = new Uint8Array(0), o = Ao(32)) {
  Lt(t, le), Ms(e, 32), Lt(n, 0, 32), Ms(), Lt(i), Lt(o, 32);
  const s = new Uint8Array([0]), c = Ds(o, t, n, 0, s, i), a = Ds(o, t, n, 1, s, i);
  return {
    secret: Ea.encode({ k1: c, k2: a, publicKey: t }),
    public: br.encode({ R1: je(c), R2: je(a) })
  };
}
class Zf {
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
    if (Yt(n, 33), Yt(i, 32), Vs(o), Lt(r), i.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = to(n, i, o), { R1: u, R2: f } = br.decode(e);
    this.publicKeys = n, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = Rr("MuSig/noncecoef", e, dr(s), r);
    const l = u.add(f.multiply(this.b));
    this.R = Yo(l) ? Pe.BASE : l, this.e = Rr("BIP0340/challenge", dr(this.R), dr(s), r), this.tweaks = i, this.isXonly = o, this.L = xa(n), this.secondKey = ba(n);
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
    if (!n.some((o) => mn(o, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Sa(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: i, gAcc: o, b: s, R: c, e: a } = this, u = Ct(e);
    if (u >= Ue)
      return !1;
    const { R1: f, R2: l } = br.decode(n), d = f.add(l.multiply(s)), h = c.hasEvenY() ? d : d.negate(), y = Pe.fromHex(r), w = this.getSessionKeyAggCoeff(y), p = Xt(Ln(i, 1n) * o), g = je(u), m = h.add(y.multiply(Xt(a * w * p)));
    return g.equals(m);
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
    if (Lt(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: o, b: s, R: c, e: a } = this, { k1: u, k2: f, publicKey: l } = Ea.decode(e);
    e.fill(0, 0, 64), Ft("k1", u, 0n, Ue), Ft("k2", f, 0n, Ue);
    const d = Ln(c, u), h = Ln(c, f), y = Ct(n);
    Ft("d_", y, 1n, Ue);
    const w = je(y), p = w.toRawBytes(!0);
    if (!mn(p, l))
      throw new Error("Public key does not match nonceGen argument");
    const g = this.getSessionKeyAggCoeff(w), m = Ln(i, 1n), E = Xt(m * o * y), T = Xt(d + s * h + a * g * E), I = re(T, 32);
    if (!r) {
      const B = br.encode({
        R1: je(u),
        R2: je(f)
      });
      if (!this.partialSigVerifyInternal(I, B, p))
        throw new Error("Partial signature verification failed");
    }
    return I;
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
    const { publicKeys: i, tweaks: o, isXonly: s } = this;
    if (Lt(e, 32), Yt(n, 66), Yt(i, le), Yt(o, 32), Vs(s), Hi(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (o.length !== s.length)
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
    Yt(e, 32);
    const { Q: n, tweakAcc: r, R: i, e: o } = this;
    let s = 0n;
    for (let a = 0; a < e.length; a++) {
      const u = Ct(e[a]);
      if (u >= Ue)
        throw new ya(a, "psig");
      s = Xt(s + u);
    }
    const c = Ln(n, 1n);
    return s = Xt(s + o * c * r), _e(dr(i), re(s, 32));
  }
}
function jf(t) {
  const e = Wf(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ti = /* @__PURE__ */ BigInt(0), ei = /* @__PURE__ */ BigInt(1), Yf = /* @__PURE__ */ BigInt(2);
function tn(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ir(t) {
  if (!tn(t))
    throw new Error("Uint8Array expected");
}
function vn(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const Xf = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Tn(t) {
  ir(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Xf[t[n]];
  return e;
}
function an(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Xo(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? ti : BigInt("0x" + t);
}
const pe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Fs(t) {
  if (t >= pe._0 && t <= pe._9)
    return t - pe._0;
  if (t >= pe.A && t <= pe.F)
    return t - (pe.A - 10);
  if (t >= pe.a && t <= pe.f)
    return t - (pe.a - 10);
}
function An(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const s = Fs(t.charCodeAt(o)), c = Fs(t.charCodeAt(o + 1));
    if (s === void 0 || c === void 0) {
      const a = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + o);
    }
    r[i] = s * 16 + c;
  }
  return r;
}
function ce(t) {
  return Xo(Tn(t));
}
function Qo(t) {
  return ir(t), Xo(Tn(Uint8Array.from(t).reverse()));
}
function He(t, e) {
  return An(t.toString(16).padStart(e * 2, "0"));
}
function Jo(t, e) {
  return He(t, e).reverse();
}
function Qf(t) {
  return An(an(t));
}
function Tt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = An(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (tn(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function en(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ir(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
function Jf(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function tl(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const xi = (t) => typeof t == "bigint" && ti <= t;
function In(t, e, n) {
  return xi(t) && xi(e) && xi(n) && e <= t && t < n;
}
function Re(t, e, n, r) {
  if (!In(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function va(t) {
  let e;
  for (e = 0; t > ti; t >>= ei, e += 1)
    ;
  return e;
}
function el(t, e) {
  return t >> BigInt(e) & ei;
}
function nl(t, e, n) {
  return t | (n ? ei : ti) << BigInt(e);
}
const ts = (t) => (Yf << BigInt(t - 1)) - ei, Si = (t) => new Uint8Array(t), Ks = (t) => Uint8Array.from(t);
function Ta(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Si(t), i = Si(t), o = 0;
  const s = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...l) => n(i, r, ...l), a = (l = Si()) => {
    i = c(Ks([0]), l), r = c(), l.length !== 0 && (i = c(Ks([1]), l), r = c());
  }, u = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let l = 0;
    const d = [];
    for (; l < e; ) {
      r = c();
      const h = r.slice();
      d.push(h), l += r.length;
    }
    return en(...d);
  };
  return (l, d) => {
    s(), a(l);
    let h;
    for (; !(h = d(u())); )
      a();
    return s(), h;
  };
}
const rl = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || tn(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function or(t, e, n = {}) {
  const r = (i, o, s) => {
    const c = rl[o];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const a = t[i];
    if (!(s && a === void 0) && !c(a, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + o + ", got " + a);
  };
  for (const [i, o] of Object.entries(e))
    r(i, o, !1);
  for (const [i, o] of Object.entries(n))
    r(i, o, !0);
  return t;
}
const il = () => {
  throw new Error("not implemented");
};
function eo(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
const ol = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Re,
  abool: vn,
  abytes: ir,
  bitGet: el,
  bitLen: va,
  bitMask: ts,
  bitSet: nl,
  bytesToHex: Tn,
  bytesToNumberBE: ce,
  bytesToNumberLE: Qo,
  concatBytes: en,
  createHmacDrbg: Ta,
  ensureBytes: Tt,
  equalBytes: Jf,
  hexToBytes: An,
  hexToNumber: Xo,
  inRange: In,
  isBytes: tn,
  memoized: eo,
  notImplemented: il,
  numberToBytesBE: He,
  numberToBytesLE: Jo,
  numberToHexUnpadded: an,
  numberToVarBytesBE: Qf,
  utf8ToBytes: tl,
  validateObject: or
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const es = 2n ** 256n, ln = es - 0x1000003d1n, Aa = es - 0x14551231950b75fc4402da1732fc9bebfn, sl = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, cl = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, ns = {
  n: Aa,
  a: 0n,
  b: 7n
}, Pn = 32, qs = (t) => R(R(t * t) * t + ns.b), At = (t = "") => {
  throw new Error(t);
}, ni = (t) => typeof t == "bigint", Ia = (t) => typeof t == "string", vi = (t) => ni(t) && 0n < t && t < ln, Ba = (t) => ni(t) && 0n < t && t < Aa, al = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", no = (t, e) => (
  // assert is Uint8Array (of specific length)
  !al(t) || typeof e == "number" && e > 0 && t.length !== e ? At("Uint8Array expected") : t
), ka = (t) => new Uint8Array(t), Na = (t, e) => no(Ia(t) ? rs(t) : ka(no(t)), e), R = (t, e = ln) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, zs = (t) => t instanceof Bn ? t : At("Point expected");
let Bn = class on {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? _n : new on(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Na(e);
    let n;
    const r = e[0], i = e.subarray(1), o = Ws(i, 0, Pn), s = e.length;
    if (s === 33 && [2, 3].includes(r)) {
      vi(o) || At("Point hex invalid: x not FE");
      let c = ll(qs(o));
      const a = (c & 1n) === 1n;
      (r & 1) === 1 !== a && (c = R(-c)), n = new on(o, c, 1n);
    }
    return s === 65 && r === 4 && (n = new on(o, Ws(i, Pn, 2 * Pn), 1n)), n ? n.ok() : At("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return Hn.mul(dl(e));
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
    const { px: n, py: r, pz: i } = this, { px: o, py: s, pz: c } = zs(e), a = R(n * c), u = R(o * i), f = R(r * c), l = R(s * i);
    return a === u && f === l;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new on(this.px, R(-this.py), this.pz);
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
    const { px: n, py: r, pz: i } = this, { px: o, py: s, pz: c } = zs(e), { a, b: u } = ns;
    let f = 0n, l = 0n, d = 0n;
    const h = R(u * 3n);
    let y = R(n * o), w = R(r * s), p = R(i * c), g = R(n + r), m = R(o + s);
    g = R(g * m), m = R(y + w), g = R(g - m), m = R(n + i);
    let E = R(o + c);
    return m = R(m * E), E = R(y + p), m = R(m - E), E = R(r + i), f = R(s + c), E = R(E * f), f = R(w + p), E = R(E - f), d = R(a * m), f = R(h * p), d = R(f + d), f = R(w - d), d = R(w + d), l = R(f * d), w = R(y + y), w = R(w + y), p = R(a * p), m = R(h * m), w = R(w + p), p = R(y - p), p = R(a * p), m = R(m + p), y = R(w * m), l = R(l + y), y = R(E * m), f = R(g * f), f = R(f - y), y = R(g * w), d = R(E * d), d = R(d + y), new on(f, l, d);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return _n;
    if (Ba(e) || At("scalar invalid"), this.equals(Hn))
      return pl(e).p;
    let r = _n, i = Hn;
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
    if (this.equals(_n))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const i = fl(r, ln);
    return R(r * i) !== 1n && At("inverse invalid"), { x: R(e * i), y: R(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!vi(e) || !vi(n)) && At("Point invalid: x or y"), R(n * n) === qs(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : At("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Zs(n) + (e ? "" : Zs(r));
  }
  toRawBytes(e = !0) {
    return rs(this.toHex(e));
  }
};
Bn.BASE = new Bn(sl, cl, 1n);
Bn.ZERO = new Bn(0n, 1n, 0n);
const { BASE: Hn, ZERO: _n } = Bn, Ua = (t, e) => t.toString(16).padStart(e, "0"), $a = (t) => Array.from(no(t)).map((e) => Ua(e, 2)).join(""), we = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Gs = (t) => {
  if (t >= we._0 && t <= we._9)
    return t - we._0;
  if (t >= we.A && t <= we.F)
    return t - (we.A - 10);
  if (t >= we.a && t <= we.f)
    return t - (we.a - 10);
}, rs = (t) => {
  const e = "hex invalid";
  if (!Ia(t))
    return At(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return At(e);
  const i = ka(r);
  for (let o = 0, s = 0; o < r; o++, s += 2) {
    const c = Gs(t.charCodeAt(s)), a = Gs(t.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return At(e);
    i[o] = c * 16 + a;
  }
  return i;
}, La = (t) => BigInt("0x" + ($a(t) || "0")), Ws = (t, e, n) => La(t.slice(e, n)), ul = (t) => ni(t) && t >= 0n && t < es ? rs(Ua(t, 2 * Pn)) : At("bigint expected"), Zs = (t) => $a(ul(t)), fl = (t, e) => {
  (t === 0n || e <= 0n) && At("no inverse n=" + t + " mod=" + e);
  let n = R(t, e), r = e, i = 0n, o = 1n;
  for (; n !== 0n; ) {
    const s = r / n, c = r % n, a = i - o * s;
    r = n, n = c, i = o, o = a;
  }
  return r === 1n ? R(i, e) : At("no inverse");
}, ll = (t) => {
  let e = 1n;
  for (let n = t, r = (ln + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % ln), n = n * n % ln;
  return R(e * e) === t ? e : At("sqrt invalid");
}, dl = (t) => (ni(t) || (t = La(Na(t, Pn))), Ba(t) ? t : At("private key invalid 3")), We = 8, hl = () => {
  const t = [], e = 256 / We + 1;
  let n = Hn, r = n;
  for (let i = 0; i < e; i++) {
    r = n, t.push(r);
    for (let o = 1; o < 2 ** (We - 1); o++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let js;
const pl = (t) => {
  const e = js || (js = hl()), n = (f, l) => {
    let d = l.negate();
    return f ? d : l;
  };
  let r = _n, i = Hn;
  const o = 1 + 256 / We, s = 2 ** (We - 1), c = BigInt(2 ** We - 1), a = 2 ** We, u = BigInt(We);
  for (let f = 0; f < o; f++) {
    const l = f * s;
    let d = Number(t & c);
    t >>= u, d > s && (d -= a, t += 1n);
    const h = l, y = l + Math.abs(d) - 1, w = f % 2 !== 0, p = d < 0;
    d === 0 ? i = i.add(n(w, e[h])) : r = r.add(n(p, e[y]));
  }
  return { p: r, f: i };
};
function Ys(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function wl(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ri(t, ...e) {
  if (!wl(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function gl(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Ys(t.outputLen), Ys(t.blockLen);
}
function _r(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function yl(t, e) {
  ri(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const rn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ti = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), oe = (t, e) => t << 32 - e | t >>> e;
function ml(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function is(t) {
  return typeof t == "string" && (t = ml(t)), ri(t), t;
}
function El(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ri(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
class Ca {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function bl(t) {
  const e = (r) => t().update(is(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Ra(t = 32) {
  if (rn && typeof rn.getRandomValues == "function")
    return rn.getRandomValues(new Uint8Array(t));
  if (rn && typeof rn.randomBytes == "function")
    return rn.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function xl(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), s = Number(n >> i & o), c = Number(n & o), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
const Sl = (t, e, n) => t & e ^ ~t & n, vl = (t, e, n) => t & e ^ t & n ^ e & n;
class Tl extends Ca {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Ti(this.buffer);
  }
  update(e) {
    _r(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = is(e);
    const o = e.length;
    for (let s = 0; s < o; ) {
      const c = Math.min(i - this.pos, o - s);
      if (c === i) {
        const a = Ti(e);
        for (; i <= o - s; s += i)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    _r(this), yl(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > i - s && (this.process(r, 0), s = 0);
    for (let l = s; l < i; l++)
      n[l] = 0;
    xl(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = Ti(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let l = 0; l < u; l++)
      c.setUint32(4 * l, f[l], o);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: o, destroyed: s, pos: c } = this;
    return e.length = i, e.pos = c, e.finished = o, e.destroyed = s, i % n && e.buffer.set(r), e;
  }
}
const Al = /* @__PURE__ */ new Uint32Array([
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
]), Ie = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Be = /* @__PURE__ */ new Uint32Array(64);
class Il extends Tl {
  constructor() {
    super(64, 32, 8, !1), this.A = Ie[0] | 0, this.B = Ie[1] | 0, this.C = Ie[2] | 0, this.D = Ie[3] | 0, this.E = Ie[4] | 0, this.F = Ie[5] | 0, this.G = Ie[6] | 0, this.H = Ie[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: o, F: s, G: c, H: a } = this;
    return [e, n, r, i, o, s, c, a];
  }
  // prettier-ignore
  set(e, n, r, i, o, s, c, a) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = o | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(e, n) {
    for (let l = 0; l < 16; l++, n += 4)
      Be[l] = e.getUint32(n, !1);
    for (let l = 16; l < 64; l++) {
      const d = Be[l - 15], h = Be[l - 2], y = oe(d, 7) ^ oe(d, 18) ^ d >>> 3, w = oe(h, 17) ^ oe(h, 19) ^ h >>> 10;
      Be[l] = w + Be[l - 7] + y + Be[l - 16] | 0;
    }
    let { A: r, B: i, C: o, D: s, E: c, F: a, G: u, H: f } = this;
    for (let l = 0; l < 64; l++) {
      const d = oe(c, 6) ^ oe(c, 11) ^ oe(c, 25), h = f + d + Sl(c, a, u) + Al[l] + Be[l] | 0, w = (oe(r, 2) ^ oe(r, 13) ^ oe(r, 22)) + vl(r, i, o) | 0;
      f = u, u = a, a = c, c = s + h | 0, s = o, o = i, i = r, r = h + w | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, i, o, s, c, a, u, f);
  }
  roundClean() {
    Be.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const ro = /* @__PURE__ */ bl(() => new Il());
class _a extends Ca {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, gl(e);
    const r = is(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, o = new Uint8Array(i);
    o.set(r.length > i ? e.create().update(r).digest() : r);
    for (let s = 0; s < o.length; s++)
      o[s] ^= 54;
    this.iHash.update(o), this.oHash = e.create();
    for (let s = 0; s < o.length; s++)
      o[s] ^= 106;
    this.oHash.update(o), o.fill(0);
  }
  update(e) {
    return _r(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    _r(this), ri(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: o, blockLen: s, outputLen: c } = this;
    return e = e, e.finished = i, e.destroyed = o, e.blockLen = s, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Oa = (t, e, n) => new _a(t, e).update(n).digest();
Oa.create = (t, e) => new _a(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gt = BigInt(0), it = BigInt(1), Ze = /* @__PURE__ */ BigInt(2), Bl = /* @__PURE__ */ BigInt(3), io = /* @__PURE__ */ BigInt(4), Xs = /* @__PURE__ */ BigInt(5), Qs = /* @__PURE__ */ BigInt(8);
function Et(t, e) {
  const n = t % e;
  return n >= gt ? n : e + n;
}
function kl(t, e, n) {
  if (e < gt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= gt)
    throw new Error("invalid modulus");
  if (n === it)
    return gt;
  let r = it;
  for (; e > gt; )
    e & it && (r = r * t % n), t = t * t % n, e >>= it;
  return r;
}
function qt(t, e, n) {
  let r = t;
  for (; e-- > gt; )
    r *= r, r %= n;
  return r;
}
function oo(t, e) {
  if (t === gt)
    throw new Error("invert: expected non-zero number");
  if (e <= gt)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = Et(t, e), r = e, i = gt, o = it;
  for (; n !== gt; ) {
    const c = r / n, a = r % n, u = i - o * c;
    r = n, n = a, i = o, o = u;
  }
  if (r !== it)
    throw new Error("invert: does not exist");
  return Et(i, e);
}
function Nl(t) {
  const e = (t - it) / Ze;
  let n, r, i;
  for (n = t - it, r = 0; n % Ze === gt; n /= Ze, r++)
    ;
  for (i = Ze; i < t && kl(i, e, t) !== t - it; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + it) / io;
    return function(a, u) {
      const f = a.pow(u, s);
      if (!a.eql(a.sqr(f), u))
        throw new Error("Cannot find square root");
      return f;
    };
  }
  const o = (n + it) / Ze;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, f = c.pow(c.mul(c.ONE, i), n), l = c.pow(a, o), d = c.pow(a, n);
    for (; !c.eql(d, c.ONE); ) {
      if (c.eql(d, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(d); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const y = c.pow(f, it << BigInt(u - h - 1));
      f = c.sqr(y), l = c.mul(l, y), d = c.mul(d, f), u = h;
    }
    return l;
  };
}
function Ul(t) {
  if (t % io === Bl) {
    const e = (t + it) / io;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % Qs === Xs) {
    const e = (t - Xs) / Qs;
    return function(r, i) {
      const o = r.mul(i, Ze), s = r.pow(o, e), c = r.mul(i, s), a = r.mul(r.mul(c, Ze), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), i))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return Nl(t);
}
const $l = [
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
function Ll(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = $l.reduce((r, i) => (r[i] = "function", r), e);
  return or(t, n);
}
function Cl(t, e, n) {
  if (n < gt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === gt)
    return t.ONE;
  if (n === it)
    return e;
  let r = t.ONE, i = e;
  for (; n > gt; )
    n & it && (r = t.mul(r, i)), i = t.sqr(i), n >>= it;
  return r;
}
function Rl(t, e) {
  const n = new Array(e.length), r = e.reduce((o, s, c) => t.is0(s) ? o : (n[c] = o, t.mul(o, s)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, s, c) => t.is0(s) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, s)), i), n;
}
function Pa(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Ha(t, e, n = !1, r = {}) {
  if (t <= gt)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = Pa(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    BITS: i,
    BYTES: o,
    MASK: ts(i),
    ZERO: gt,
    ONE: it,
    create: (a) => Et(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return gt <= a && a < t;
    },
    is0: (a) => a === gt,
    isOdd: (a) => (a & it) === it,
    neg: (a) => Et(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => Et(a * a, t),
    add: (a, u) => Et(a + u, t),
    sub: (a, u) => Et(a - u, t),
    mul: (a, u) => Et(a * u, t),
    pow: (a, u) => Cl(c, a, u),
    div: (a, u) => Et(a * oo(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => oo(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = Ul(t)), s(c, a))),
    invertBatch: (a) => Rl(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, f) => f ? u : a,
    toBytes: (a) => n ? Jo(a, o) : He(a, o),
    fromBytes: (a) => {
      if (a.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + a.length);
      return n ? Qo(a) : ce(a);
    }
  });
  return Object.freeze(c);
}
function Ma(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Va(t) {
  const e = Ma(t);
  return e + Math.ceil(e / 2);
}
function _l(t, e, n = !1) {
  const r = t.length, i = Ma(e), o = Va(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const s = n ? ce(t) : Qo(t), c = Et(s, e - it) + it;
  return n ? Jo(c, i) : He(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Js = BigInt(0), hr = BigInt(1);
function Ai(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Da(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Ii(t, e) {
  Da(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function Ol(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Pl(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Bi = /* @__PURE__ */ new WeakMap(), Fa = /* @__PURE__ */ new WeakMap();
function ki(t) {
  return Fa.get(t) || 1;
}
function Hl(t, e) {
  return {
    constTimeNegate: Ai,
    hasPrecomputes(n) {
      return ki(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > Js; )
        r & hr && (i = i.add(o)), o = o.double(), r >>= hr;
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
      const { windows: i, windowSize: o } = Ii(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < i; u++) {
        a = c, s.push(a);
        for (let f = 1; f < o; f++)
          a = a.add(c), s.push(a);
        c = a.double();
      }
      return s;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(n, r, i) {
      const { windows: o, windowSize: s } = Ii(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), f = 2 ** n, l = BigInt(n);
      for (let d = 0; d < o; d++) {
        const h = d * s;
        let y = Number(i & u);
        i >>= l, y > s && (y -= f, i += hr);
        const w = h, p = h + Math.abs(y) - 1, g = d % 2 !== 0, m = y < 0;
        y === 0 ? a = a.add(Ai(g, r[w])) : c = c.add(Ai(m, r[p]));
      }
      return { p: c, f: a };
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
      const { windows: s, windowSize: c } = Ii(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, f = BigInt(n);
      for (let l = 0; l < s; l++) {
        const d = l * c;
        if (i === Js)
          break;
        let h = Number(i & a);
        if (i >>= f, h > c && (h -= u, i += hr), h === 0)
          continue;
        let y = r[d + Math.abs(h) - 1];
        h < 0 && (y = y.negate()), o = o.add(y);
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = Bi.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && Bi.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = ki(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const s = ki(n);
      return s === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Da(r, e), Fa.set(n, r), Bi.delete(n);
    }
  };
}
function Ml(t, e, n, r) {
  if (Ol(n, t), Pl(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = va(BigInt(n.length)), s = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(i), u = Math.floor((e.BITS - 1) / s) * s;
  let f = i;
  for (let l = u; l >= 0; l -= s) {
    a.fill(i);
    for (let h = 0; h < r.length; h++) {
      const y = r[h], w = Number(y >> BigInt(l) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let d = i;
    for (let h = a.length - 1, y = i; h > 0; h--)
      y = y.add(a[h]), d = d.add(y);
    if (f = f.add(d), l !== 0)
      for (let h = 0; h < s; h++)
        f = f.double();
  }
  return f;
}
function Ka(t) {
  return Ll(t.Fp), or(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Pa(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function tc(t) {
  t.lowS !== void 0 && vn("lowS", t.lowS), t.prehash !== void 0 && vn("prehash", t.prehash);
}
function Vl(t) {
  const e = Ka(t);
  or(e, {
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
const { bytesToNumberBE: Dl, hexToBytes: Fl } = ol, ye = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = ye;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = an(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const o = r > 127 ? an(i.length / 2 | 128) : "";
      return an(t) + o + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = ye;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], o = !!(i & 128);
      let s = 0;
      if (!o)
        s = i;
      else {
        const a = i & 127;
        if (!a)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (a > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = e.subarray(r, r + a);
        if (u.length !== a)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const f of u)
          s = s << 8 | f;
        if (r += a, s < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const c = e.subarray(r, r + s);
      if (c.length !== s)
        throw new n("tlv.decode: wrong value length");
      return { v: c, l: e.subarray(r + s) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = ye;
      if (t < Ee)
        throw new e("integer: negative integers are not allowed");
      let n = an(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = ye;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return Dl(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = ye, i = typeof t == "string" ? Fl(t) : t;
    ir(i);
    const { v: o, l: s } = r.decode(48, i);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, o), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = ye, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, Ee = BigInt(0), ht = BigInt(1);
BigInt(2);
const ec = BigInt(3);
BigInt(4);
function Kl(t) {
  const e = Vl(t), { Fp: n } = e, r = Ha(e.n, e.nBitLength), i = e.toBytes || ((w, p, g) => {
    const m = p.toAffine();
    return en(Uint8Array.from([4]), n.toBytes(m.x), n.toBytes(m.y));
  }), o = e.fromBytes || ((w) => {
    const p = w.subarray(1), g = n.fromBytes(p.subarray(0, n.BYTES)), m = n.fromBytes(p.subarray(n.BYTES, 2 * n.BYTES));
    return { x: g, y: m };
  });
  function s(w) {
    const { a: p, b: g } = e, m = n.sqr(w), E = n.mul(m, w);
    return n.add(n.add(E, n.mul(w, p)), g);
  }
  if (!n.eql(n.sqr(e.Gy), s(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(w) {
    return In(w, ht, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: m, n: E } = e;
    if (p && typeof w != "bigint") {
      if (tn(w) && (w = Tn(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let T;
    try {
      T = typeof w == "bigint" ? w : ce(Tt("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return m && (T = Et(T, E)), Re("private key", T, ht, E), T;
  }
  function u(w) {
    if (!(w instanceof d))
      throw new Error("ProjectivePoint expected");
  }
  const f = eo((w, p) => {
    const { px: g, py: m, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y: m };
    const T = w.is0();
    p == null && (p = T ? n.ONE : n.inv(E));
    const I = n.mul(g, p), B = n.mul(m, p), b = n.mul(E, p);
    if (T)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(b, n.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: B };
  }), l = eo((w) => {
    if (w.is0()) {
      if (e.allowInfinityPoint && !n.is0(w.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: p, y: g } = w.toAffine();
    if (!n.isValid(p) || !n.isValid(g))
      throw new Error("bad point: x or y not FE");
    const m = n.sqr(g), E = s(p);
    if (!n.eql(m, E))
      throw new Error("bad point: equation left != right");
    if (!w.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class d {
    constructor(p, g, m) {
      if (this.px = p, this.py = g, this.pz = m, p == null || !n.isValid(p))
        throw new Error("x required");
      if (g == null || !n.isValid(g))
        throw new Error("y required");
      if (m == null || !n.isValid(m))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x: g, y: m } = p || {};
      if (!p || !n.isValid(g) || !n.isValid(m))
        throw new Error("invalid affine point");
      if (p instanceof d)
        throw new Error("projective point not allowed");
      const E = (T) => n.eql(T, n.ZERO);
      return E(g) && E(m) ? d.ZERO : new d(g, m, n.ONE);
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
    static normalizeZ(p) {
      const g = n.invertBatch(p.map((m) => m.pz));
      return p.map((m, E) => m.toAffine(g[E])).map(d.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(p) {
      const g = d.fromAffine(o(Tt("pointHex", p)));
      return g.assertValidity(), g;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return d.BASE.multiply(a(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return Ml(d, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      y.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      l(this);
    }
    hasEvenY() {
      const { y: p } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(p);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: T, py: I, pz: B } = p, b = n.eql(n.mul(g, B), n.mul(T, E)), N = n.eql(n.mul(m, B), n.mul(I, E));
      return b && N;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new d(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: p, b: g } = e, m = n.mul(g, ec), { px: E, py: T, pz: I } = this;
      let B = n.ZERO, b = n.ZERO, N = n.ZERO, k = n.mul(E, E), V = n.mul(T, T), C = n.mul(I, I), L = n.mul(E, T);
      return L = n.add(L, L), N = n.mul(E, I), N = n.add(N, N), B = n.mul(p, N), b = n.mul(m, C), b = n.add(B, b), B = n.sub(V, b), b = n.add(V, b), b = n.mul(B, b), B = n.mul(L, B), N = n.mul(m, N), C = n.mul(p, C), L = n.sub(k, C), L = n.mul(p, L), L = n.add(L, N), N = n.add(k, k), k = n.add(N, k), k = n.add(k, C), k = n.mul(k, L), b = n.add(b, k), C = n.mul(T, I), C = n.add(C, C), k = n.mul(C, L), B = n.sub(B, k), N = n.mul(C, V), N = n.add(N, N), N = n.add(N, N), new d(B, b, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: T, py: I, pz: B } = p;
      let b = n.ZERO, N = n.ZERO, k = n.ZERO;
      const V = e.a, C = n.mul(e.b, ec);
      let L = n.mul(g, T), D = n.mul(m, I), S = n.mul(E, B), v = n.add(g, m), x = n.add(T, I);
      v = n.mul(v, x), x = n.add(L, D), v = n.sub(v, x), x = n.add(g, E);
      let U = n.add(T, B);
      return x = n.mul(x, U), U = n.add(L, S), x = n.sub(x, U), U = n.add(m, E), b = n.add(I, B), U = n.mul(U, b), b = n.add(D, S), U = n.sub(U, b), k = n.mul(V, x), b = n.mul(C, S), k = n.add(b, k), b = n.sub(D, k), k = n.add(D, k), N = n.mul(b, k), D = n.add(L, L), D = n.add(D, L), S = n.mul(V, S), x = n.mul(C, x), D = n.add(D, S), S = n.sub(L, S), S = n.mul(V, S), x = n.add(x, S), L = n.mul(D, x), N = n.add(N, L), L = n.mul(U, x), b = n.mul(v, b), b = n.sub(b, L), L = n.mul(v, D), k = n.mul(U, k), k = n.add(k, L), new d(b, N, k);
    }
    subtract(p) {
      return this.add(p.negate());
    }
    is0() {
      return this.equals(d.ZERO);
    }
    wNAF(p) {
      return y.wNAFCached(this, p, d.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(p) {
      const { endo: g, n: m } = e;
      Re("scalar", p, Ee, m);
      const E = d.ZERO;
      if (p === Ee)
        return E;
      if (this.is0() || p === ht)
        return this;
      if (!g || y.hasPrecomputes(this))
        return y.wNAFCachedUnsafe(this, p, d.normalizeZ);
      let { k1neg: T, k1: I, k2neg: B, k2: b } = g.splitScalar(p), N = E, k = E, V = this;
      for (; I > Ee || b > Ee; )
        I & ht && (N = N.add(V)), b & ht && (k = k.add(V)), V = V.double(), I >>= ht, b >>= ht;
      return T && (N = N.negate()), B && (k = k.negate()), k = new d(n.mul(k.px, g.beta), k.py, k.pz), N.add(k);
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
    multiply(p) {
      const { endo: g, n: m } = e;
      Re("scalar", p, ht, m);
      let E, T;
      if (g) {
        const { k1neg: I, k1: B, k2neg: b, k2: N } = g.splitScalar(p);
        let { p: k, f: V } = this.wNAF(B), { p: C, f: L } = this.wNAF(N);
        k = y.constTimeNegate(I, k), C = y.constTimeNegate(b, C), C = new d(n.mul(C.px, g.beta), C.py, C.pz), E = k.add(C), T = V.add(L);
      } else {
        const { p: I, f: B } = this.wNAF(p);
        E = I, T = B;
      }
      return d.normalizeZ([E, T])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, m) {
      const E = d.BASE, T = (B, b) => b === Ee || b === ht || !B.equals(E) ? B.multiplyUnsafe(b) : B.multiply(b), I = T(this, g).add(T(p, m));
      return I.is0() ? void 0 : I;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return f(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = e;
      if (p === ht)
        return !0;
      if (g)
        return g(d, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = e;
      return p === ht ? this : g ? g(d, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(p = !0) {
      return vn("isCompressed", p), this.assertValidity(), i(d, this, p);
    }
    toHex(p = !0) {
      return vn("isCompressed", p), Tn(this.toRawBytes(p));
    }
  }
  d.BASE = new d(e.Gx, e.Gy, n.ONE), d.ZERO = new d(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, y = Hl(d, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: d,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function ql(t) {
  const e = Ka(t);
  return or(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function zl(t) {
  const e = ql(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function s(S) {
    return Et(S, r);
  }
  function c(S) {
    return oo(S, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: f, isWithinCurveOrder: l } = Kl({
    ...e,
    toBytes(S, v, x) {
      const U = v.toAffine(), $ = n.toBytes(U.x), M = en;
      return vn("isCompressed", x), x ? M(Uint8Array.from([v.hasEvenY() ? 2 : 3]), $) : M(Uint8Array.from([4]), $, n.toBytes(U.y));
    },
    fromBytes(S) {
      const v = S.length, x = S[0], U = S.subarray(1);
      if (v === i && (x === 2 || x === 3)) {
        const $ = ce(U);
        if (!In($, ht, n.ORDER))
          throw new Error("Point is not on curve");
        const M = f($);
        let q;
        try {
          q = n.sqrt(M);
        } catch (J) {
          const z = J instanceof Error ? ": " + J.message : "";
          throw new Error("Point is not on curve" + z);
        }
        const K = (q & ht) === ht;
        return (x & 1) === 1 !== K && (q = n.neg(q)), { x: $, y: q };
      } else if (v === o && x === 4) {
        const $ = n.fromBytes(U.subarray(0, n.BYTES)), M = n.fromBytes(U.subarray(n.BYTES, 2 * n.BYTES));
        return { x: $, y: M };
      } else {
        const $ = i, M = o;
        throw new Error("invalid Point, expected length of " + $ + ", or uncompressed " + M + ", got " + v);
      }
    }
  }), d = (S) => Tn(He(S, e.nByteLength));
  function h(S) {
    const v = r >> ht;
    return S > v;
  }
  function y(S) {
    return h(S) ? s(-S) : S;
  }
  const w = (S, v, x) => ce(S.slice(v, x));
  class p {
    constructor(v, x, U) {
      this.r = v, this.s = x, this.recovery = U, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(v) {
      const x = e.nByteLength;
      return v = Tt("compactSignature", v, x * 2), new p(w(v, 0, x), w(v, x, 2 * x));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(v) {
      const { r: x, s: U } = ye.toSig(Tt("DER", v));
      return new p(x, U);
    }
    assertValidity() {
      Re("r", this.r, ht, r), Re("s", this.s, ht, r);
    }
    addRecoveryBit(v) {
      return new p(this.r, this.s, v);
    }
    recoverPublicKey(v) {
      const { r: x, s: U, recovery: $ } = this, M = B(Tt("msgHash", v));
      if ($ == null || ![0, 1, 2, 3].includes($))
        throw new Error("recovery id invalid");
      const q = $ === 2 || $ === 3 ? x + e.n : x;
      if (q >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const K = ($ & 1) === 0 ? "02" : "03", st = a.fromHex(K + d(q)), J = c(q), z = s(-M * J), Ht = s(U * J), mt = a.BASE.multiplyAndAddUnsafe(st, z, Ht);
      if (!mt)
        throw new Error("point at infinify");
      return mt.assertValidity(), mt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return h(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new p(this.r, s(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return An(this.toDERHex());
    }
    toDERHex() {
      return ye.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return An(this.toCompactHex());
    }
    toCompactHex() {
      return d(this.r) + d(this.s);
    }
  }
  const g = {
    isValidPrivateKey(S) {
      try {
        return u(S), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: u,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const S = Va(e.n);
      return _l(e.randomBytes(S), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(S = 8, v = a.BASE) {
      return v._setWindowSize(S), v.multiply(BigInt(3)), v;
    }
  };
  function m(S, v = !0) {
    return a.fromPrivateKey(S).toRawBytes(v);
  }
  function E(S) {
    const v = tn(S), x = typeof S == "string", U = (v || x) && S.length;
    return v ? U === i || U === o : x ? U === 2 * i || U === 2 * o : S instanceof a;
  }
  function T(S, v, x = !0) {
    if (E(S))
      throw new Error("first arg must be private key");
    if (!E(v))
      throw new Error("second arg must be public key");
    return a.fromHex(v).multiply(u(S)).toRawBytes(x);
  }
  const I = e.bits2int || function(S) {
    if (S.length > 8192)
      throw new Error("input is too large");
    const v = ce(S), x = S.length * 8 - e.nBitLength;
    return x > 0 ? v >> BigInt(x) : v;
  }, B = e.bits2int_modN || function(S) {
    return s(I(S));
  }, b = ts(e.nBitLength);
  function N(S) {
    return Re("num < 2^" + e.nBitLength, S, Ee, b), He(S, e.nByteLength);
  }
  function k(S, v, x = V) {
    if (["recovered", "canonical"].some((Bt) => Bt in x))
      throw new Error("sign() legacy options not supported");
    const { hash: U, randomBytes: $ } = e;
    let { lowS: M, prehash: q, extraEntropy: K } = x;
    M == null && (M = !0), S = Tt("msgHash", S), tc(x), q && (S = Tt("prehashed msgHash", U(S)));
    const st = B(S), J = u(v), z = [N(J), N(st)];
    if (K != null && K !== !1) {
      const Bt = K === !0 ? $(n.BYTES) : K;
      z.push(Tt("extraEntropy", Bt));
    }
    const Ht = en(...z), mt = st;
    function Fe(Bt) {
      const Mt = I(Bt);
      if (!l(Mt))
        return;
      const Ke = c(Mt), Wt = a.BASE.multiply(Mt).toAffine(), kt = s(Wt.x);
      if (kt === Ee)
        return;
      const Zt = s(Ke * s(mt + kt * J));
      if (Zt === Ee)
        return;
      let jt = (Wt.x === kt ? 0 : 2) | Number(Wt.y & ht), Vt = Zt;
      return M && h(Zt) && (Vt = y(Zt), jt ^= 1), new p(kt, Vt, jt);
    }
    return { seed: Ht, k2sig: Fe };
  }
  const V = { lowS: e.lowS, prehash: !1 }, C = { lowS: e.lowS, prehash: !1 };
  function L(S, v, x = V) {
    const { seed: U, k2sig: $ } = k(S, v, x), M = e;
    return Ta(M.hash.outputLen, M.nByteLength, M.hmac)(U, $);
  }
  a.BASE._setWindowSize(8);
  function D(S, v, x, U = C) {
    var jt;
    const $ = S;
    v = Tt("msgHash", v), x = Tt("publicKey", x);
    const { lowS: M, prehash: q, format: K } = U;
    if (tc(U), "strict" in U)
      throw new Error("options.strict was renamed to lowS");
    if (K !== void 0 && K !== "compact" && K !== "der")
      throw new Error("format must be compact or der");
    const st = typeof $ == "string" || tn($), J = !st && !K && typeof $ == "object" && $ !== null && typeof $.r == "bigint" && typeof $.s == "bigint";
    if (!st && !J)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let z, Ht;
    try {
      if (J && (z = new p($.r, $.s)), st) {
        try {
          K !== "compact" && (z = p.fromDER($));
        } catch (Vt) {
          if (!(Vt instanceof ye.Err))
            throw Vt;
        }
        !z && K !== "der" && (z = p.fromCompact($));
      }
      Ht = a.fromHex(x);
    } catch {
      return !1;
    }
    if (!z || M && z.hasHighS())
      return !1;
    q && (v = e.hash(v));
    const { r: mt, s: Fe } = z, Bt = B(v), Mt = c(Fe), Ke = s(Bt * Mt), Wt = s(mt * Mt), kt = (jt = a.BASE.multiplyAndAddUnsafe(Ht, Ke, Wt)) == null ? void 0 : jt.toAffine();
    return kt ? s(kt.x) === mt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: m,
    getSharedSecret: T,
    sign: L,
    verify: D,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Gl(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Oa(t, e, El(...n)),
    randomBytes: Ra
  };
}
function Wl(t, e) {
  const n = (r) => zl({ ...t, ...Gl(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Or = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), zn = BigInt(1), Pr = BigInt(2), nc = (t, e) => (t + e / Pr) / e;
function qa(t) {
  const e = sr, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, f = u * u * t % e, l = qt(f, n, e) * f % e, d = qt(l, n, e) * f % e, h = qt(d, Pr, e) * u % e, y = qt(h, i, e) * h % e, w = qt(y, o, e) * y % e, p = qt(w, c, e) * w % e, g = qt(p, a, e) * p % e, m = qt(g, c, e) * w % e, E = qt(m, n, e) * f % e, T = qt(E, s, e) * y % e, I = qt(T, r, e) * u % e, B = qt(I, Pr, e);
  if (!so.eql(so.sqr(B), t))
    throw new Error("Cannot find square root");
  return B;
}
const so = Ha(sr, void 0, void 0, { sqrt: qa }), Gn = Wl({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: so,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: Or,
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
      const e = Or, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -zn * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, s = BigInt("0x100000000000000000000000000000000"), c = nc(o * t, e), a = nc(-r * t, e);
      let u = Et(t - c * n - a * i, e), f = Et(-c * r - a * o, e);
      const l = u > s, d = f > s;
      if (l && (u = e - u), d && (f = e - f), u > s || f > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: l, k1: u, k2neg: d, k2: f };
    }
  }
}, ro), za = BigInt(0), rc = {};
function Hr(t, ...e) {
  let n = rc[t];
  if (n === void 0) {
    const r = ro(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = en(r, r), rc[t] = n;
  }
  return ro(en(n, ...e));
}
const os = (t) => t.toRawBytes(!0).slice(1), co = (t) => He(t, 32), Ni = (t) => Et(t, sr), Wn = (t) => Et(t, Or), ss = Gn.ProjectivePoint, Zl = (t, e, n) => ss.BASE.multiplyAndAddUnsafe(t, e, n);
function ao(t) {
  let e = Gn.utils.normPrivateKeyToScalar(t), n = ss.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Wn(-e), bytes: os(n) };
}
function Ga(t) {
  Re("x", t, zn, sr);
  const e = Ni(t * t), n = Ni(e * t + BigInt(7));
  let r = qa(n);
  r % Pr !== za && (r = Ni(-r));
  const i = new ss(t, r, zn);
  return i.assertValidity(), i;
}
const dn = ce;
function Wa(...t) {
  return Wn(dn(Hr("BIP0340/challenge", ...t)));
}
function jl(t) {
  return ao(t).bytes;
}
function Yl(t, e, n = Ra(32)) {
  const r = Tt("message", t), { bytes: i, scalar: o } = ao(e), s = Tt("auxRand", n, 32), c = co(o ^ dn(Hr("BIP0340/aux", s))), a = Hr("BIP0340/nonce", c, i, r), u = Wn(dn(a));
  if (u === za)
    throw new Error("sign failed: k is zero");
  const { bytes: f, scalar: l } = ao(u), d = Wa(f, i, r), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(co(Wn(l + d * o)), 32), !Za(h, r, i))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function Za(t, e, n) {
  const r = Tt("signature", t, 64), i = Tt("message", e), o = Tt("publicKey", n, 32);
  try {
    const s = Ga(dn(o)), c = dn(r.subarray(0, 32));
    if (!In(c, zn, sr))
      return !1;
    const a = dn(r.subarray(32, 64));
    if (!In(a, zn, Or))
      return !1;
    const u = Wa(co(c), os(s), i), f = Zl(s, a, Wn(-u));
    return !(!f || !f.hasEvenY() || f.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const ja = {
  getPublicKey: jl,
  sign: Yl,
  verify: Za,
  utils: {
    randomPrivateKey: Gn.utils.randomPrivateKey,
    lift_x: Ga,
    pointToBytes: os,
    numberToBytesBE: He,
    bytesToNumberBE: ce,
    taggedHash: Hr,
    mod: Et
  }
};
function cs(t, e, n = {}) {
  t = Ji(t);
  const { aggPublicKey: r } = to(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const i = ja.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: o } = to(t, [i], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: o.toRawBytes(!0)
  };
}
class pr extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class as {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new pr("Invalid s length");
    if (n.length !== 33)
      throw new pr("Invalid R length");
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
      throw new pr("Invalid partial signature length");
    if (ce(e) >= ns.n)
      throw new pr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new as(e, r);
  }
}
function Xl(t, e, n, r, i, o) {
  let s;
  if ((o == null ? void 0 : o.taprootTweak) !== void 0) {
    const { preTweakedKey: u } = cs(Ji(r));
    s = ja.utils.taggedHash("TapTweak", u.subarray(1), o.taprootTweak);
  }
  const a = new Zf(n, Ji(r), i, s ? [s] : void 0, s ? [!0] : void 0).sign(t, e);
  return as.decode(a);
}
var Ui, ic;
function Ql() {
  if (ic) return Ui;
  ic = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, i = 1 << 22, o = r, s = 1 << n, c = r << n;
  function a(f) {
    return f & e ? {} : f & i ? {
      seconds: (f & r) << n
    } : {
      blocks: f & r
    };
  }
  function u({ blocks: f, seconds: l }) {
    if (f !== void 0 && l !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (f === void 0 && l === void 0) return t;
    if (l !== void 0) {
      if (!Number.isFinite(l)) throw new TypeError("Expected Number seconds");
      if (l > c) throw new TypeError("Expected Number seconds <= " + c);
      if (l % s !== 0) throw new TypeError("Expected Number seconds as a multiple of " + s);
      return i | l >> n;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > r) throw new TypeError("Expected Number blocks <= " + o);
    return f;
  }
  return Ui = { decode: a, encode: u }, Ui;
}
var Jl = Ql(), ct;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(ct || (ct = {}));
function us(t = 6, e = !1) {
  return Pt({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, o = BigInt(r), s = [];
      for (let c = i ? -o : o; c; c >>= 8n)
        s.push(Number(c & 0xffn));
      s[s.length - 1] >= 128 ? s.push(i ? 128 : 0) : i && (s[s.length - 1] |= 128), n.bytes(new Uint8Array(s));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > t)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${t}`);
      if (r === 0)
        return 0n;
      if (e) {
        const s = n.bytes(r, !0);
        if ((s[s.length - 1] & 127) === 0 && (r <= 1 || (s[s.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, o = 0n;
      for (let s = 0; s < r; ++s)
        i = n.byte(), o |= BigInt(i) << 8n * BigInt(s);
      return i >= 128 && (o &= 2n ** BigInt(r * 8) - 1n >> 1n, o = -o), o;
    }
  });
}
function td(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Y(t))
    try {
      const r = us(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const nt = Pt({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (ct[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(ct[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(ct.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = us().encode(BigInt(n))), !Y(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < ct.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(ct.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(ct.PUSHDATA2), t.bytes($s.encode(r))) : (t.byte(ct.PUSHDATA4), t.bytes(G.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (ct.OP_0 < n && n <= ct.PUSHDATA4) {
        let r;
        if (n < ct.PUSHDATA1)
          r = n;
        else if (n === ct.PUSHDATA1)
          r = Ce.decodeStream(t);
        else if (n === ct.PUSHDATA2)
          r = $s.decodeStream(t);
        else if (n === ct.PUSHDATA4)
          r = G.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (ct.OP_1 <= n && n <= ct.OP_16)
        e.push(n - (ct.OP_1 - 1));
      else {
        const r = ct[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), oc = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, ii = Pt({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, i, o] of Object.values(oc))
      if (!(i > e || e > o)) {
        t.byte(n);
        for (let s = 0; s < r; s++)
          t.byte(Number(e >> 8n * BigInt(s) & 0xffn));
        return;
      }
    throw t.err(`VarInt too big: ${e}`);
  },
  decodeStream: (t) => {
    const e = t.byte();
    if (e <= 252)
      return BigInt(e);
    const [n, r, i] = oc[e];
    let o = 0n;
    for (let s = 0; s < r; s++)
      o |= BigInt(t.byte()) << 8n * BigInt(s);
    if (o < i)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return o;
  }
}), ee = Oe(ii, Qr.numberBigint), Qt = Q(ii), fs = Rt(ee, Qt), Mr = (t) => Rt(ii, t), Ya = yt({
  txid: Q(32, !0),
  // hash(prev_tx),
  index: G,
  // output number of previous tx
  finalScriptSig: Qt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: G
  // ?
}), Ye = yt({ amount: mr, script: Qt }), ed = yt({
  version: cn,
  segwitFlag: Hf(new Uint8Array([0, 1])),
  inputs: Mr(Ya),
  outputs: Mr(Ye),
  witnesses: Mf("segwitFlag", Rt("inputs/length", fs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: G
});
function nd(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const hn = Ot(ed, nd), On = yt({
  version: cn,
  inputs: Mr(Ya),
  outputs: Mr(Ye),
  lockTime: G
});
function xr(t) {
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
function sc(t, e, n, r = !1, i = !1) {
  let { nonWitnessUtxo: o, txid: s } = t;
  typeof o == "string" && (o = Z.decode(o)), Y(o) && (o = hn.decode(o)), !("nonWitnessUtxo" in t) && o === void 0 && (o = e == null ? void 0 : e.nonWitnessUtxo), typeof s == "string" && (s = Z.decode(s)), s === void 0 && (s = e == null ? void 0 : e.txid);
  let c = { ...e, ...t, nonWitnessUtxo: o, txid: s };
  !("nonWitnessUtxo" in t) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = Xa), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = lo(si, c, e, n, i), hs.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && eu(a && a.script, c.redeemScript, c.witnessScript), c;
}
function cc(t, e = !1) {
  let n = "legacy", r = j.ALL;
  const i = xr(t), o = bt.decode(i.script);
  let s = o.type, c = o;
  const a = [o];
  if (o.type === "tr")
    return r = j.DEFAULT, {
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
      let d = bt.decode(t.redeemScript);
      (d.type === "wpkh" || d.type === "wsh") && (n = "segwit"), a.push(d), c = d, s += `-${d.type}`;
    }
    if (c.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let d = bt.decode(t.witnessScript);
      d.type === "wsh" && (n = "segwit"), a.push(d), c = d, s += `-${d.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = bt.encode(u), l = {
      type: s,
      txType: n,
      last: u,
      lastScript: f,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return l;
  }
}
const rd = (t) => Math.ceil(t / 4), wr = new Uint8Array(32), id = {
  amount: 0xffffffffffffffffn,
  script: tt
}, od = 8, sd = 2, qe = 0, Xa = 4294967295;
Qr.decimal(od);
const Mn = (t, e) => t === void 0 ? e : t;
function Vr(t) {
  if (Array.isArray(t))
    return t.map((e) => Vr(e));
  if (Y(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Vr(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var j;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(j || (j = {}));
var Zn;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(Zn || (Zn = {}));
function cd(t, e, n, r = tt) {
  return ut(n, e) && (t = Kf(t, r), e = Ko(t)), { privKey: t, pubKey: e };
}
function ze(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function Cn(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: Mn(t.sequence, Xa),
    finalScriptSig: Mn(t.finalScriptSig, tt)
  };
}
function $i(t) {
  for (const e in t) {
    const n = e;
    pd.includes(n) || delete t[n];
  }
}
const Li = yt({ txid: Q(32, !0), index: G });
function ad(t) {
  if (typeof t != "number" || typeof Zn[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function ac(t) {
  const e = t & 31;
  return {
    isAny: !!(t & j.ANYONECANPAY),
    isNone: e === j.NONE,
    isSingle: e === j.SINGLE
  };
}
function ud(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: Mn(t.version, sd),
    lockTime: Mn(t.lockTime, 0),
    PSBTVersion: Mn(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (G.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
class ot {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = ud(e);
    n.lockTime !== qe && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = hn.decode(e), i = new ot({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = hc.decode(e);
    } catch (l) {
      try {
        r = pc.decode(e);
      } catch {
        throw l;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const o = r.global.unsignedTx, s = i === 0 ? o == null ? void 0 : o.version : r.global.txVersion, c = i === 0 ? o == null ? void 0 : o.lockTime : r.global.fallbackLocktime, a = new ot({ ...n, version: s, lockTime: c, PSBTVersion: i }), u = i === 0 ? o == null ? void 0 : o.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((l, d) => {
      var h;
      return {
        finalScriptSig: tt,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.inputs[d],
        ...l
      };
    });
    const f = i === 0 ? o == null ? void 0 : o.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((l, d) => {
      var h;
      return {
        ...l,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.outputs[d]
      };
    }), a.global = { ...r.global, txVersion: s }, c !== qe && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((o) => dc(e, si, o));
    for (const o of n)
      o.partialSig && !o.partialSig.length && delete o.partialSig, o.finalScriptSig && !o.finalScriptSig.length && delete o.finalScriptSig, o.finalScriptWitness && !o.finalScriptWitness.length && delete o.finalScriptWitness;
    const r = this.outputs.map((o) => dc(e, Fr, o)), i = { ...this.global };
    return e === 0 ? (i.unsignedTx = On.decode(On.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Cn).map((o) => ({
        ...o,
        finalScriptSig: tt
      })),
      outputs: this.outputs.map(ze)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = e, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === qe && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? hc : pc).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = qe, n = 0, r = qe, i = 0;
    for (const o of this.inputs)
      o.requiredHeightLocktime && (e = Math.max(e, o.requiredHeightLocktime), n++), o.requiredTimeLocktime && (r = Math.max(r, o.requiredTimeLocktime), i++);
    return n && n >= i ? e : r !== qe ? r : this.global.fallbackLocktime || qe;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? j.DEFAULT : n, i = r === j.DEFAULT ? j.ALL : r & 3;
    return { sigInputs: r & j.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], i = [];
    for (let o = 0; o < this.inputs.length; o++) {
      if (this.inputStatus(o) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(o);
      if (c === j.ANYONECANPAY ? r.push(o) : e = !1, a === j.ALL)
        n = !1;
      else if (a === j.SINGLE)
        i.push(o);
      else if (a !== j.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(ze);
    e += 4 * ee.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Qt.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * ee.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Qt.encode(r.finalScriptSig || tt).length, this.hasWitnesses && r.finalScriptWitness && (e += fs.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return rd(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return hn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Cn).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || tt
      })),
      outputs: this.outputs.map(ze),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return Z.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return Z.encode(zt(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return Z.encode(zt(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Vr(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(sc(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let i;
    if (!r) {
      const o = this.signStatus();
      (!o.addInput || o.inputs.includes(e)) && (i = wd);
    }
    this.inputs[e] = sc(n, this.inputs[e], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Vr(this.outputs[e]);
  }
  getOutputAddress(e, n = Je) {
    const r = this.getOutput(e);
    if (r.script)
      return Kr(n).encode(bt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: i, script: o } = e;
    if (i === void 0 && (i = n == null ? void 0 : n.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof o == "string" && (o = Z.decode(o)), o === void 0 && (o = n == null ? void 0 : n.script);
    let s = { ...n, ...e, amount: i, script: o };
    if (s.amount === void 0 && delete s.amount, s = lo(Fr, s, n, r, this.opts.allowUnknown), ps.encode(s), s.script && !this.opts.allowUnknownOutputs && bt.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || eu(s.script, s.redeemScript, s.witnessScript), s;
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
      (!o.addOutput || o.outputs.includes(e)) && (i = gd);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], i);
  }
  addOutputAddress(e, n, r = Je) {
    return this.addOutput({ script: bt.encode(Kr(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const i = xr(r);
      if (!i)
        throw new Error("Empty input amount");
      e += i.amount;
    }
    const n = this.outputs.map(ze);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: i, isNone: o, isSingle: s } = ac(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (s && e >= this.outputs.length || e >= this.inputs.length)
      return sa.encode(1n);
    n = nt.encode(nt.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(Cn).map((f, l) => ({
      ...f,
      finalScriptSig: l === e ? n : tt
    }));
    i ? c = [c[e]] : (o || s) && (c = c.map((f, l) => ({
      ...f,
      sequence: l === e ? f.sequence : 0
    })));
    let a = this.outputs.map(ze);
    o ? a = [] : s && (a = a.slice(0, e).fill(id).concat([a[e]]));
    const u = hn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return zt(u, cn.encode(r));
  }
  preimageWitnessV0(e, n, r, i) {
    const { isAny: o, isNone: s, isSingle: c } = ac(r);
    let a = wr, u = wr, f = wr;
    const l = this.inputs.map(Cn), d = this.outputs.map(ze);
    o || (a = zt(...l.map(Li.encode))), !o && !c && !s && (u = zt(...l.map((y) => G.encode(y.sequence)))), !c && !s ? f = zt(...d.map(Ye.encode)) : c && e < d.length && (f = zt(Ye.encode(d[e])));
    const h = l[e];
    return zt(cn.encode(this.version), a, u, Q(32, !0).encode(h.txid), G.encode(h.index), Qt.encode(n), mr.encode(i), G.encode(h.sequence), f, G.encode(this.lockTime), G.encode(r));
  }
  preimageWitnessV1(e, n, r, i, o = -1, s, c = 192, a) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Ce.encode(0),
      Ce.encode(r),
      // U8 sigHash
      cn.encode(this.version),
      G.encode(this.lockTime)
    ], f = r === j.DEFAULT ? j.ALL : r & 3, l = r & j.ANYONECANPAY, d = this.inputs.map(Cn), h = this.outputs.map(ze);
    l !== j.ANYONECANPAY && u.push(...[
      d.map(Li.encode),
      i.map(mr.encode),
      n.map(Qt.encode),
      d.map((w) => G.encode(w.sequence))
    ].map((w) => $t(Ne(...w)))), f === j.ALL && u.push($t(Ne(...h.map(Ye.encode))));
    const y = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([y])), l === j.ANYONECANPAY) {
      const w = d[e];
      u.push(Li.encode(w), mr.encode(i[e]), Qt.encode(n[e]), G.encode(w.sequence));
    } else
      u.push(G.encode(e));
    return y & 1 && u.push($t(Qt.encode(a || tt))), f === j.SINGLE && u.push(e < h.length ? $t(Ye.encode(h[e])) : wr), s && u.push(pn(s, c), Ce.encode(0), cn.encode(o)), qo("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, i) {
    this.checkInputIdx(n);
    const o = this.inputs[n], s = cc(o, this.opts.allowLegacyWitnessUtxo);
    if (!Y(e)) {
      if (!o.bip32Derivation || !o.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = o.bip32Derivation.filter((d) => d[1].fingerprint == e.fingerprint).map(([d, { path: h }]) => {
        let y = e;
        for (const w of h)
          y = y.deriveChild(w);
        if (!ut(y.publicKey, d))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let l = !1;
      for (const d of f)
        this.signIdx(d.privateKey, n) && (l = !0);
      return l;
    }
    r ? r.forEach(ad) : r = [s.defaultSighash];
    const c = s.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === j.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = xr(o);
    if (s.txType === "taproot") {
      const f = this.inputs.map(xr), l = f.map((p) => p.script), d = f.map((p) => p.amount);
      let h = !1, y = Ko(e), w = o.tapMerkleRoot || tt;
      if (o.tapInternalKey) {
        const { pubKey: p, privKey: g } = cd(e, y, o.tapInternalKey, w), [m, E] = la(o.tapInternalKey, w);
        if (ut(m, p)) {
          const T = this.preimageWitnessV1(n, l, c, d), I = Ne(Cs(T, g, i), c !== j.DEFAULT ? new Uint8Array([c]) : tt);
          this.updateInput(n, { tapKeySig: I }, !0), h = !0;
        }
      }
      if (o.tapLeafScript) {
        o.tapScriptSig = o.tapScriptSig || [];
        for (const [p, g] of o.tapLeafScript) {
          const m = g.subarray(0, -1), E = nt.decode(m), T = g[g.length - 1], I = pn(m, T);
          if (E.findIndex((k) => Y(k) && ut(k, y)) === -1)
            continue;
          const b = this.preimageWitnessV1(n, l, c, d, void 0, m, T), N = Ne(Cs(b, e, i), c !== j.DEFAULT ? new Uint8Array([c]) : tt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: I }, N]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = Df(e);
      let l = !1;
      const d = aa(f);
      for (const w of nt.decode(s.lastScript))
        Y(w) && (ut(w, f) || ut(w, d)) && (l = !0);
      if (!l)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let h;
      if (s.txType === "legacy")
        h = this.preimageLegacy(n, s.lastScript, c);
      else if (s.txType === "segwit") {
        let w = s.lastScript;
        s.last.type === "wpkh" && (w = bt.encode({ type: "pkh", hash: s.last.hash })), h = this.preimageWitnessV0(n, w, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const y = Ff(h, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, Ne(y, new Uint8Array([c]))]]
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
    const n = this.inputs[e], r = cc(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => $e.encode(u[0]).length - $e.encode(f[0]).length);
        for (const [u, f] of a) {
          const l = f.slice(0, -1), d = f[f.length - 1], h = bt.decode(l), y = pn(l, d), w = n.tapScriptSig.filter((g) => ut(g[0].leafHash, y));
          let p = [];
          if (h.type === "tr_ms") {
            const g = h.m, m = h.pubkeys;
            let E = 0;
            for (const T of m) {
              const I = w.findIndex((B) => ut(B[0].pubKey, T));
              if (E === g || I === -1) {
                p.push(tt);
                continue;
              }
              p.push(w[I][1]), E++;
            }
            if (E !== g)
              continue;
          } else if (h.type === "tr_ns") {
            for (const g of h.pubkeys) {
              const m = w.findIndex((E) => ut(E[0].pubKey, g));
              m !== -1 && p.push(w[m][1]);
            }
            if (p.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const g = nt.decode(l);
            if (p = w.map(([{ pubKey: m }, E]) => {
              const T = g.findIndex((I) => Y(I) && ut(I, m));
              if (T === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: E, pos: T };
            }).sort((m, E) => m.pos - E.pos).map((m) => m.signature), !p.length)
              continue;
          } else {
            const g = this.opts.customScripts;
            if (g)
              for (const m of g) {
                if (!m.finalizeTaproot)
                  continue;
                const E = nt.decode(l), T = m.encode(E);
                if (T === void 0)
                  continue;
                const I = m.finalizeTaproot(l, T, w);
                if (I) {
                  n.finalScriptWitness = I.concat($e.encode(u)), n.finalScriptSig = tt, $i(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = p.reverse().concat([l, $e.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = tt, $i(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = tt, o = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const l of u) {
        const d = n.partialSig.find((h) => ut(l, h[0]));
        d && f.push(d[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      i = nt.encode([0, ...f]);
    } else if (r.last.type === "pk")
      i = nt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = nt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = tt, o = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (o = nt.decode(i).map((a) => {
      if (a === 0)
        return tt;
      if (Y(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), o = o.concat(r.lastScript)), r.txType === "segwit" && (c = o), r.type.startsWith("sh-wsh-") ? s = nt.encode([nt.encode([0, $t(r.lastScript)])]) : r.type.startsWith("sh-") ? s = nt.encode([...nt.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (s = i), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (n.finalScriptSig = s), c && (n.finalScriptWitness = c), $i(n);
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
    const n = this.global.unsignedTx ? On.encode(this.global.unsignedTx) : tt, r = e.global.unsignedTx ? On.encode(e.global.unsignedTx) : tt;
    if (!ut(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = lo(ls, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, e.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, e.outputs[i], !0);
    return this;
  }
  clone() {
    return ot.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
const uo = Ot(Q(null), (t) => xn(t, Ut.ecdsa)), Dr = Ot(Q(32), (t) => xn(t, Ut.schnorr)), uc = Ot(Q(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), oi = yt({
  fingerprint: _f,
  path: Rt(null, G)
}), Qa = yt({
  hashes: Rt(ee, Q(32)),
  der: oi
}), fd = Q(78), ld = yt({ pubKey: Dr, leafHash: Q(32) }), dd = yt({
  version: Ce,
  // With parity :(
  internalKey: Q(32),
  merklePath: Rt(null, Q(32))
}), $e = Ot(dd, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), hd = Rt(null, yt({
  depth: Ce,
  version: Ce,
  script: Qt
})), at = Q(null), fc = Q(20), Rn = Q(32), ls = {
  unsignedTx: [0, !1, On, [0], [0], !1],
  xpub: [1, fd, oi, [], [0, 2], !1],
  txVersion: [2, !1, G, [2], [2], !1],
  fallbackLocktime: [3, !1, G, [], [2], !1],
  inputCount: [4, !1, ee, [2], [2], !1],
  outputCount: [5, !1, ee, [2], [2], !1],
  txModifiable: [6, !1, Ce, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, G, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, si = {
  nonWitnessUtxo: [0, !1, hn, [], [0, 2], !1],
  witnessUtxo: [1, !1, Ye, [], [0, 2], !1],
  partialSig: [2, uo, at, [], [0, 2], !1],
  sighashType: [3, !1, G, [], [0, 2], !1],
  redeemScript: [4, !1, at, [], [0, 2], !1],
  witnessScript: [5, !1, at, [], [0, 2], !1],
  bip32Derivation: [6, uo, oi, [], [0, 2], !1],
  finalScriptSig: [7, !1, at, [], [0, 2], !1],
  finalScriptWitness: [8, !1, fs, [], [0, 2], !1],
  porCommitment: [9, !1, at, [], [0, 2], !1],
  ripemd160: [10, fc, at, [], [0, 2], !1],
  sha256: [11, Rn, at, [], [0, 2], !1],
  hash160: [12, fc, at, [], [0, 2], !1],
  hash256: [13, Rn, at, [], [0, 2], !1],
  txid: [14, !1, Rn, [2], [2], !0],
  index: [15, !1, G, [2], [2], !0],
  sequence: [16, !1, G, [], [2], !0],
  requiredTimeLocktime: [17, !1, G, [], [2], !1],
  requiredHeightLocktime: [18, !1, G, [], [2], !1],
  tapKeySig: [19, !1, uc, [], [0, 2], !1],
  tapScriptSig: [20, ld, uc, [], [0, 2], !1],
  tapLeafScript: [21, $e, at, [], [0, 2], !1],
  tapBip32Derivation: [22, Rn, Qa, [], [0, 2], !1],
  tapInternalKey: [23, !1, Dr, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Rn, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, pd = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], wd = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Fr = {
  redeemScript: [0, !1, at, [], [0, 2], !1],
  witnessScript: [1, !1, at, [], [0, 2], !1],
  bip32Derivation: [2, uo, oi, [], [0, 2], !1],
  amount: [3, !1, Cf, [2], [2], !0],
  script: [4, !1, at, [2], [2], !0],
  tapInternalKey: [5, !1, Dr, [], [0, 2], !1],
  tapTree: [6, !1, hd, [], [0, 2], !1],
  tapBip32Derivation: [7, Dr, Qa, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, gd = [], lc = Rt(ea, yt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Of(ee, yt({ type: ee, key: Q(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Q(ee)
}));
function fo(t) {
  const [e, n, r, i, o, s] = t;
  return { type: e, kc: n, vc: r, reqInc: i, allowInc: o, silentIgnore: s };
}
yt({ type: ee, key: Q(null) });
function ds(t) {
  const e = {};
  for (const n in t) {
    const [r, i, o] = t[n];
    e[r] = [n, i, o];
  }
  return Pt({
    encodeStream: (n, r) => {
      let i = [];
      for (const o in t) {
        const s = r[o];
        if (s === void 0)
          continue;
        const [c, a, u] = t[o];
        if (!a)
          i.push({ key: { type: c, key: tt }, value: u.encode(s) });
        else {
          const f = s.map(([l, d]) => [
            a.encode(l),
            u.encode(d)
          ]);
          f.sort((l, d) => $r(l[0], d[0]));
          for (const [l, d] of f)
            i.push({ key: { key: l, type: c }, value: d });
        }
      }
      if (r.unknown) {
        r.unknown.sort((o, s) => $r(o[0].key, s[0].key));
        for (const [o, s] of r.unknown)
          i.push({ key: o, value: s });
      }
      lc.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = lc.decodeStream(n), i = {}, o = {};
      for (const s of r) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (e[s.key.type]) {
          const [f, l, d] = e[s.key.type];
          if (c = f, !l && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${Z.encode(a)} value=${Z.encode(u)}`);
          if (a = l ? l.decode(a) : void 0, u = d.decode(u), !l) {
            if (i[c])
              throw new Error(`PSBT: Same keys: ${c} (key=${a} value=${u})`);
            i[c] = u, o[c] = !0;
            continue;
          }
        } else
          a = { type: s.key.type, key: s.key.key };
        if (o[c])
          throw new Error(`PSBT: Key type with empty key and no key=${c} val=${u}`);
        i[c] || (i[c] = []), i[c].push([a, u]);
      }
      return i;
    }
  });
}
const hs = Ot(ds(si), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      xn(e, Ut.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      xn(e, Ut.ecdsa);
  if (t.requiredTimeLocktime !== void 0 && t.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${t.requiredTimeLocktime}`);
  if (t.requiredHeightLocktime !== void 0 && (t.requiredHeightLocktime <= 0 || t.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${t.requiredHeightLocktime}`);
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!ut(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
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
    const n = ot.fromRaw(hn.encode(t.nonWitnessUtxo), {
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    }), r = Z.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), ps = Ot(ds(Fr), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      xn(e, Ut.ecdsa);
  return t;
}), Ja = Ot(ds(ls), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), yd = yt({
  magic: Fo(Do(new Uint8Array([255])), "psbt"),
  global: Ja,
  inputs: Rt("global/unsignedTx/inputs/length", hs),
  outputs: Rt(null, ps)
}), md = yt({
  magic: Fo(Do(new Uint8Array([255])), "psbt"),
  global: Ja,
  inputs: Rt("global/inputCount", hs),
  outputs: Rt("global/outputCount", ps)
});
yt({
  magic: Fo(Do(new Uint8Array([255])), "psbt"),
  items: Rt(null, Oe(Rt(ea, Vf([Pf(ee), Q(ii)])), Qr.dict()))
});
function Ci(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: i } = fo(e[r]);
    if (!i.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: i } = fo(e[r]);
    if (i.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function dc(t, e, n) {
  const r = {};
  for (const i in n) {
    const o = i;
    if (o !== "unknown") {
      if (!e[o])
        continue;
      const { allowInc: s, silentIgnore: c } = fo(e[o]);
      if (!s.includes(t)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${o} but versions allows inclusion=${s}`);
      }
    }
    r[o] = n[o];
  }
  return r;
}
function tu(t) {
  const e = t && t.global && t.global.version || 0;
  Ci(e, ls, t.global);
  for (const s of t.inputs)
    Ci(e, si, s);
  for (const s of t.outputs)
    Ci(e, Fr, s);
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
function lo(t, e, n, r, i) {
  const o = { ...n, ...e };
  for (const s in t) {
    const c = s, [a, u, f] = t[c], l = r && !r.includes(s);
    if (e[s] === void 0 && s in e) {
      if (l)
        throw new Error(`Cannot remove signed field=${s}`);
      delete o[s];
    } else if (u) {
      const d = n && n[s] ? n[s] : [];
      let h = e[c];
      if (h) {
        if (!Array.isArray(h))
          throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
        h = h.map((p) => {
          if (p.length !== 2)
            throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
          return [
            typeof p[0] == "string" ? u.decode(Z.decode(p[0])) : p[0],
            typeof p[1] == "string" ? f.decode(Z.decode(p[1])) : p[1]
          ];
        });
        const y = {}, w = (p, g, m) => {
          if (y[p] === void 0) {
            y[p] = [g, m];
            return;
          }
          const E = Z.encode(f.encode(y[p][1])), T = Z.encode(f.encode(m));
          if (E !== T)
            throw new Error(`keyMap(${c}): same key=${p} oldVal=${E} newVal=${T}`);
        };
        for (const [p, g] of d) {
          const m = Z.encode(u.encode(p));
          w(m, p, g);
        }
        for (const [p, g] of h) {
          const m = Z.encode(u.encode(p));
          if (g === void 0) {
            if (l)
              throw new Error(`Cannot remove signed field=${c}/${p}`);
            delete y[m];
          } else
            w(m, p, g);
        }
        o[c] = Object.values(y);
      }
    } else if (typeof o[s] == "string")
      o[s] = f.decode(Z.decode(o[s]));
    else if (l && s in e && n && n[s] !== void 0 && !ut(f.encode(e[s]), f.encode(n[s])))
      throw new Error(`Cannot change signed field=${s}`);
  }
  for (const s in o)
    if (!t[s]) {
      if (i && s === "unknown")
        continue;
      delete o[s];
    }
  return o;
}
const hc = Ot(yd, tu), pc = Ot(md, tu), Ed = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Y(t[1]) || Z.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: nt.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, Z.decode("4e73")];
  }
};
function un(t, e) {
  try {
    return xn(t, e), !0;
  } catch {
    return !1;
  }
}
const bd = {
  encode(t) {
    if (!(t.length !== 2 || !Y(t[0]) || !un(t[0], Ut.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, xd = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Y(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Sd = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Y(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, vd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Y(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Td = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Y(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Ad = {
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
        if (!Y(o))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Id = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Y(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Bd = {
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
      if (!Y(i))
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
}, kd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = td(t[e - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < e - 1; i++) {
        const o = t[i];
        if (i & 1) {
          if (o !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Y(o))
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
}, Nd = {
  encode(t) {
    return { type: "unknown", script: nt.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? nt.decode(t.script) : void 0
}, Ud = [
  Ed,
  bd,
  xd,
  Sd,
  vd,
  Td,
  Ad,
  Id,
  Bd,
  kd,
  Nd
], $d = Oe(nt, Qr.match(Ud)), bt = Ot($d, (t) => {
  if (t.type === "pk" && !un(t.pubkey, Ut.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Y(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Y(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Y(t.pubkey) || !un(t.pubkey, Ut.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!un(n, Ut.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!un(e, Ut.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function wc(t, e) {
  if (!ut(t.hash, $t(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = bt.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function eu(t, e, n) {
  if (t) {
    const r = bt.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!ut(r.hash, aa(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = bt.decode(e);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && wc(r, n);
  }
  if (e) {
    const r = bt.decode(e);
    r.type === "wsh" && n && wc(r, n);
  }
}
function Ld(t) {
  const e = {};
  for (const n of t) {
    const r = Z.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(Z.encode)}`);
    e[r] = !0;
  }
}
function Cd(t, e, n = !1, r) {
  const i = bt.decode(t);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const o = i;
  if (!n && o.pubkeys)
    for (const s of o.pubkeys) {
      if (ut(s, Nn))
        throw new Error("Unspendable taproot key in leaf script");
      if (ut(s, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function ci(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((s, c) => (c.weight || 1) - (s.weight || 1));
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
function ho(t, e = []) {
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
    left: ho(t.left, [t.right.hash, ...e]),
    right: ho(t.right, [t.left.hash, ...e])
  };
}
function po(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...po(t.left), ...po(t.right)];
}
function wo(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: a, script: u } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !ut(t.tapMerkleRoot, tt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? Z.decode(u) : u;
    if (!Y(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Cd(f, e, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: pn(f, a)
    };
  }
  if (t.length !== 2 && (t = ci(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = wo(t[0], e, n), o = wo(t[1], e, n);
  let [s, c] = [i.hash, o.hash];
  return $r(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: i, right: o, hash: qo("TapBranch", s, c) };
}
const Me = 192, pn = (t, e = Me) => qo("TapLeaf", new Uint8Array([e]), Qt.encode(t));
function ai(t, e, n = Je, r = !1, i) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const o = typeof t == "string" ? Z.decode(t) : t || Nn;
  if (!un(o, Ut.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let s = e ? ho(wo(e, o, r)) : void 0;
  const c = s ? s.hash : void 0, [a, u] = la(o, c || tt);
  let f;
  s && (f = po(s).map((h) => ({
    ...h,
    controlBlock: $e.encode({
      version: (h.version || Me) + u,
      internalKey: o,
      merklePath: h.path
    })
  })));
  let l;
  f && (l = f.map((h) => [
    $e.decode(h.controlBlock),
    Ne(h.script, new Uint8Array([h.version || Me]))
  ]));
  const d = {
    type: "tr",
    script: bt.encode({ type: "tr", pubkey: a }),
    address: Kr(n).encode({ type: "tr", pubkey: a }),
    // For tests
    tweakedPubkey: a,
    // PSBT stuff
    tapInternalKey: o
  };
  return f && (d.leaves = f), l && (d.tapLeafScript = l), c && (d.tapMerkleRoot = c), d;
}
function Rd(t, e, n = !1) {
  return n || Ld(e), {
    type: "tr_ms",
    script: bt.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const nu = vf($t);
function ru(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Ri(t, e, n = Je) {
  ru(t, e);
  const r = t === 0 ? Wi : ta;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function gc(t, e) {
  return nu.encode(Ne(Uint8Array.from(e), t));
}
function Kr(t = Je) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return Ri(0, e.hash, t);
      if (n === "wsh")
        return Ri(0, e.hash, t);
      if (n === "tr")
        return Ri(1, e.pubkey, t);
      if (n === "pkh")
        return gc(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return gc(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Wi.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ta.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...o] = r.words, s = Wi.fromWords(o);
        if (ru(i, s), i === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (i === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (i === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const n = nu.decode(e);
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
class X extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const _d = new X("leaf not found in tx tree"), Od = new X("parent not found");
class Pd {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new X("empty vtxo tree");
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
    const n = [], i = this.leaves().find((s) => s.txid === e);
    if (!i)
      throw _d;
    n.push(i);
    const o = this.root().txid;
    for (; n[0].txid !== o; ) {
      const s = this.findParent(n[0]);
      n.unshift(s);
    }
    return n;
  }
  // Helper method to find parent of a node
  findParent(e) {
    for (const n of this.tree)
      for (const r of n)
        if (r.txid === e.parentTxid)
          return r;
    throw Od;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = ot.fromPSBT(Nt.decode(n.tx)), i = F.encode(zt(r.toBytes(!0)).reverse());
        if (i !== n.txid)
          throw new X(`node ${n.txid} has txid ${n.txid}, but computed txid is ${i}`);
        try {
          this.findParent(n);
        } catch (o) {
          throw new X(`node ${n.txid} has no parent: ${o instanceof Error ? o.message : String(o)}`);
        }
      }
  }
}
const _i = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function Hd(t) {
  if (t.length < _i.length)
    return !1;
  for (let e = 0; e < _i.length; e++)
    if (t[e] !== _i[e])
      return !1;
  return !0;
}
function iu(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    Hd(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const Oi = new Error("missing vtxo tree");
class jn {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = ua();
    return new jn(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return Gn.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw Oi;
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
      throw Oi;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], i = this.tree.levels[n];
      for (let o = 0; o < i.length; o++) {
        const s = i[o], c = ot.fromPSBT(Nt.decode(s.tx)), a = this.signPartial(c, n, o);
        a ? r.push(a) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw Oi;
    const e = [], n = Gn.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const i = [];
      for (let o = 0; o < r.length; o++) {
        const s = jf(n);
        i.push(s);
      }
      e.push(i);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw jn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const i = this.myNonces[n][r];
    if (!i)
      return null;
    const o = this.aggregateNonces[n][r];
    if (!o)
      throw new Error("missing aggregate nonce");
    const s = [], c = [], a = iu(e), { finalKey: u } = cs(a, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let l = 0; l < e.inputsLength; l++) {
      const d = Md(u, this.tree, this.rootSharedOutputAmount, e);
      s.push(d.amount), c.push(d.script);
    }
    const f = e.preimageWitnessV1(
      0,
      // always first input
      c,
      Zn.DEFAULT,
      s
    );
    return Xl(i.secNonce, this.secretKey, o.pubNonce, a, f, {
      taprootTweak: this.scriptRoot
    });
  }
}
jn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Md(t, e, n, r) {
  const i = nt.encode(["OP_1", t.slice(1)]), o = e.levels[0][0];
  if (!o)
    throw new Error("empty vtxo tree");
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing input txid");
  const c = F.encode(s.txid);
  if (o.parentTxid === c)
    return {
      amount: n,
      script: i
    };
  let a = null;
  for (const l of e.levels) {
    for (const d of l)
      if (d.txid === c) {
        a = d;
        break;
      }
    if (a)
      break;
  }
  if (!a)
    throw new Error("parent tx not found");
  const u = ot.fromPSBT(Nt.decode(a.tx));
  if (!s.index)
    throw new Error("missing input index");
  const f = u.getOutput(s.index);
  if (!f)
    throw new Error("parent output not found");
  if (!f.amount)
    throw new Error("parent output amount not found");
  return {
    amount: f.amount,
    script: i
  };
}
const yc = new Uint8Array(32).fill(0);
class qr {
  constructor(e) {
    this.key = e || ua();
  }
  static fromPrivateKey(e) {
    return new qr(e);
  }
  static fromHex(e) {
    return new qr(F.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, yc))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, void 0, yc))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  xOnlyPublicKey() {
    return Ko(this.key);
  }
  signerSession() {
    return jn.random();
  }
}
const Vd = (t) => xe[t], xe = {
  bitcoin: Je,
  testnet: fr,
  signet: fr,
  mutinynet: {
    ...fr
  },
  regtest: {
    ...fr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }
};
class Jt {
  /**
   * Get network from HRP prefix
   */
  static networkFromPrefix(e) {
    switch (e) {
      case "ark":
        return xe.bitcoin;
      case "tark":
        return xe.testnet;
      // Both testnet and regtest use tark
      default:
        throw new Error("Invalid Ark address format");
    }
  }
  /**
   * Get HRP prefix from network
   */
  static prefixFromNetwork(e) {
    return e === xe.bitcoin ? "ark" : "tark";
  }
  constructor(e, n, r = xe.testnet) {
    if (!Jt.VALID_NETWORKS.includes(r))
      throw new Error("Invalid network");
    this.network = r, this.serverPubKey = new Uint8Array(e), this.tweakedPubKey = new Uint8Array(n);
  }
  static fromTapscripts(e, n, r) {
    const i = ci(n.map((s) => ({ script: F.decode(s) }))), o = ai(Nn, i, void 0, !0);
    return new Jt(e, o.tweakedPubkey, r);
  }
  static decode(e) {
    const n = lr.decode(e, 1023), r = new Uint8Array(lr.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const i = r.slice(0, 32), o = r.slice(32, 64), s = Jt.networkFromPrefix(n.prefix);
    return new Jt(i, o, s);
  }
  /**
   * Get the HRP for this address
   */
  get hrp() {
    return Jt.prefixFromNetwork(this.network);
  }
  encode() {
    if (!this.serverPubKey)
      throw new Error("missing Server public key");
    if (!this.tweakedPubKey)
      throw new Error("missing Tweaked public key");
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = lr.toWords(e);
    return lr.encode(this.hrp, n, 1023);
  }
  get script() {
    return nt.encode(["OP_1", this.tweakedPubKey]);
  }
}
Jt.VALID_NETWORKS = [
  xe.bitcoin,
  xe.testnet,
  xe.mutinynet,
  xe.regtest
];
var mc;
(function(t) {
  t[t.FORFEIT = 0] = "FORFEIT", t[t.EXIT = 1] = "EXIT";
})(mc || (mc = {}));
class Xe {
  constructor(e, n = Je) {
    const { pubKey: r, serverPubKey: i, csvTimelock: o = Xe.DEFAULT_TIMELOCK } = e;
    this.pubKey = r, this.serverPubKey = i, this.csvTimelock = o, this.forfeitScript = Rd(2, [
      this.pubKey,
      this.serverPubKey
    ]).script, this.exitScript = ou(this.csvTimelock, this.pubKey);
    const s = ci([
      { script: this.forfeitScript, leafVersion: Me },
      { script: this.exitScript, leafVersion: Me }
    ]);
    this.p2tr = ai(Nn, s, n, !0);
  }
  /**
   * Get the P2TR output information
   */
  toP2TR() {
    return this.p2tr;
  }
  /**
   * Get the forfeit (2-of-2 multisig) script
   */
  getForfeitScript() {
    return this.forfeitScript;
  }
  /**
   * Get the exit (CSV timelock) script
   */
  getExitScript() {
    return this.exitScript;
  }
  /**
   * Create a bare VTXO tapscript (2-of-2 multisig + CSV timelock)
   */
  static createBareVtxo(e, n, r) {
    return new Xe({ pubKey: e, serverPubKey: n }, r);
  }
  /**
   * Create a boarding VTXO tapscript with longer timelock
   */
  static createBoarding(e, n, r, i) {
    return new Xe({
      pubKey: e,
      serverPubKey: n,
      csvTimelock: r
    }, i);
  }
}
Xe.DEFAULT_TIMELOCK = {
  value: 144n,
  type: "blocks"
};
function ou(t, e) {
  if (e.length !== 32)
    throw new Error("Invalid pubkey length");
  const n = us().encode(BigInt(Jl.encode(t.type === "blocks" ? { blocks: Number(t.value) } : { seconds: Number(t.value) })));
  return nt.encode([
    n,
    "CHECKSEQUENCEVERIFY",
    "DROP",
    e,
    "CHECKSIG"
  ]);
}
var Yn;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(Yn || (Yn = {}));
function Dd(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function Fd(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function Kd(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function gr(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function qd(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function zd(t, e, n) {
  const r = [];
  let i = [...e];
  for (const s of [...t, ...e]) {
    if (s.virtualStatus.state !== "pending" && n.has(s.virtualStatus.batchTxID || ""))
      continue;
    const c = Dd(i, s);
    i = Ec(i, c);
    const a = gr(c);
    if (s.value <= a)
      continue;
    const u = Fd(i, s);
    i = Ec(i, u);
    const f = gr(u);
    if (s.value <= f)
      continue;
    const l = {
      roundTxid: s.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let d = s.virtualStatus.state !== "pending";
    s.virtualStatus.state === "pending" && (l.redeemTxid = s.txid, s.spentBy && (d = !0)), r.push({
      key: l,
      amount: s.value - a - f,
      type: Yn.TxReceived,
      createdAt: s.createdAt.getTime(),
      settled: d
    });
  }
  const o = /* @__PURE__ */ new Map();
  for (const s of e) {
    if (!s.spentBy)
      continue;
    o.has(s.spentBy) || o.set(s.spentBy, []);
    const c = o.get(s.spentBy);
    o.set(s.spentBy, [...c, s]);
  }
  for (const [s, c] of o) {
    const a = Kd([...t, ...e], s), u = gr(a), f = gr(c);
    if (f <= u)
      continue;
    const l = qd(a, c), d = {
      roundTxid: l.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    l.virtualStatus.state === "pending" && (d.redeemTxid = l.txid), r.push({
      key: d,
      amount: f - u,
      type: Yn.TxSent,
      createdAt: l.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Ec(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var go;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(go || (go = {}));
class bc {
  static create(e) {
    const { address: n, ...r } = e, i = {};
    for (const [s, c] of Object.entries(r))
      if (c !== void 0)
        if (s === "amount") {
          if (!isFinite(c)) {
            console.warn("Invalid amount");
            continue;
          }
          if (c < 0)
            continue;
          i[s] = c;
        } else s === "ark" ? typeof c == "string" && (c.startsWith("ark") || c.startsWith("tark")) ? i[s] = c : console.warn("Invalid ARK address format") : s === "sp" ? typeof c == "string" && c.startsWith("sp") ? i[s] = c : console.warn("Invalid Silent Payment address format") : (typeof c == "string" || typeof c == "number") && (i[s] = c);
    const o = Object.keys(i).length > 0 ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(i).map(([s, c]) => [
      s,
      String(c)
    ]))).toString() : "";
    return `bitcoin:${n ? n.toLowerCase() : ""}${o}`;
  }
  static parse(e) {
    if (!e.toLowerCase().startsWith("bitcoin:"))
      throw new Error(go.INVALID_URI);
    const n = e.slice(e.toLowerCase().indexOf("bitcoin:") + 8), [r, i] = n.split("?"), o = {};
    if (r && (o.address = r.toLowerCase()), i) {
      const s = new URLSearchParams(i);
      for (const [c, a] of s.entries())
        if (a)
          if (c === "amount") {
            const u = Number(a);
            if (!isFinite(u) || u < 0)
              continue;
            o[c] = u;
          } else c === "ark" ? a.startsWith("ark") || a.startsWith("tark") ? o[c] = a : console.warn("Invalid ARK address format") : c === "sp" ? a.startsWith("sp") ? o[c] = a : console.warn("Invalid Silent Payment address format") : o[c] = a;
    }
    return {
      originalString: e,
      params: o
    };
  }
}
function Gd(t, e) {
  const n = [...t].sort((s, c) => c.value - s.value), r = [];
  let i = 0;
  for (const s of n)
    if (r.push(s), i += s.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const o = i - e;
  return {
    inputs: r,
    changeAmount: o
  };
}
function Wd(t, e) {
  const n = [...t].sort((s, c) => {
    const a = s.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - s.value;
  }), r = [];
  let i = 0;
  for (const s of n)
    if (r.push(s), i += s.value, i >= e)
      break;
  if (i < e)
    return { inputs: null, changeAmount: 0 };
  const o = i - e;
  return {
    inputs: r,
    changeAmount: o
  };
}
const Zd = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class jd {
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
var St;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(St || (St = {}));
class Yd {
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
      batchExpiry: r.vtxoTreeExpiry
    };
  }
  async getVirtualCoins(e) {
    const n = `${this.serverUrl}/v1/vtxos/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch VTXOs: ${r.statusText}`);
    const i = await r.json(), o = (s) => ({
      txid: s.outpoint.txid,
      vout: s.outpoint.vout,
      value: Number(s.amount),
      status: {
        confirmed: !!s.roundTxid
      },
      virtualStatus: {
        state: s.isPending ? "pending" : "settled",
        batchTxID: s.roundTxid,
        batchExpiry: s.expireAt ? Number(s.expireAt) : void 0
      },
      spentBy: s.spentBy,
      createdAt: new Date(s.createdAt * 1e3)
    });
    return {
      spendableVtxos: [...i.spendableVtxos || []].map(o),
      spentVtxos: [...i.spentVtxos || []].map(o)
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
        const s = JSON.parse(o);
        throw new Error(`Failed to submit virtual transaction: ${s.message || s.error || o}`);
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
          const o = i.body.getReader(), s = new TextDecoder();
          let c = "";
          for (; !r.signal.aborted; ) {
            const { done: a, value: u } = await o.read();
            if (a)
              break;
            c += s.decode(u, { stream: !0 });
            const f = c.split(`
`);
            for (let l = 0; l < f.length - 1; l++) {
              const d = f[l].trim();
              if (d)
                try {
                  const h = JSON.parse(d);
                  e(h);
                } catch (h) {
                  console.error("Failed to parse event:", h);
                }
            }
            c = f[f.length - 1];
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
    const o = `${this.serverUrl}/v1/round/registerOutputs`, s = await fetch(o, {
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
    if (!s.ok) {
      const c = await s.text();
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
        treeNonces: Jd(r)
      })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Failed to submit tree nonces: ${s}`);
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
        treeSignatures: th(r)
      })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Failed to submit tree signatures: ${s}`);
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
  async *getEventStream() {
    const e = `${this.serverUrl}/v1/events`;
    for (; ; )
      try {
        const n = await fetch(e, {
          headers: {
            Accept: "application/json"
          }
        });
        if (!n.ok)
          throw new Error(`Unexpected status ${n.status} when fetching event stream`);
        if (!n.body)
          throw new Error("Response body is null");
        const r = n.body.getReader(), i = new TextDecoder();
        let o = "";
        for (; ; ) {
          const { done: s, value: c } = await r.read();
          if (s)
            break;
          o += i.decode(c, { stream: !0 });
          const a = o.split(`
`);
          for (let u = 0; u < a.length - 1; u++) {
            const f = a[u].trim();
            if (f)
              try {
                const l = JSON.parse(f), d = this.parseSettlementEvent(l.result);
                d && (yield d);
              } catch (l) {
                throw console.error("Failed to parse event:", l), l;
              }
          }
          o = a[a.length - 1];
        }
      } catch (n) {
        throw console.error("Event stream error:", n), n;
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
    })), new Pd(e.levels.map((r) => r.nodes.map((i) => ({
      txid: i.txid,
      tx: i.tx,
      parentTxid: i.parentTxid,
      leaf: !n.has(i.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: St.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: St.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: St.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: St.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: St.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: Qd(F.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function su(t) {
  let e = 4;
  for (const o of t) {
    e += 4;
    for (const s of o)
      e += 1, e += s.length;
  }
  const n = new ArrayBuffer(e), r = new DataView(n);
  let i = 0;
  r.setUint32(i, t.length, !0), i += 4;
  for (const o of t) {
    r.setUint32(i, o.length, !0), i += 4;
    for (const s of o) {
      const c = s.length > 0;
      r.setInt8(i, c ? 1 : 0), i += 1, c && (new Uint8Array(n).set(s, i), i += s.length);
    }
  }
  return new Uint8Array(n);
}
function Xd(t, e) {
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let r = 0;
  const i = n.getUint32(r, !0);
  r += 4;
  const o = [];
  for (let s = 0; s < i; s++) {
    const c = n.getUint32(r, !0);
    r += 4;
    const a = [];
    for (let u = 0; u < c; u++) {
      const f = n.getUint8(r) === 1;
      if (r += 1, f) {
        const l = new Uint8Array(t.buffer, t.byteOffset + r, e);
        a.push(new Uint8Array(l)), r += e;
      } else
        a.push(new Uint8Array());
    }
    o.push(a);
  }
  return o;
}
function Qd(t) {
  return Xd(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function Jd(t) {
  return F.encode(su(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function th(t) {
  return F.encode(su(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function eh({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: i, vtxoScript: o, connectorScript: s, serverScript: c, txLocktime: a }) {
  const u = new ot({
    version: 2,
    lockTime: a
  });
  u.addInput({
    txid: t.txid,
    index: t.vout,
    witnessUtxo: {
      script: s,
      amount: r
    },
    sequence: 4294967295
  }), u.addInput({
    txid: e.txid,
    index: e.vout,
    witnessUtxo: {
      script: o,
      amount: n
    },
    sequence: a ? 4294967294 : 4294967295,
    // MAX_SEQUENCE - 1 if locktime is set
    sighashType: Zn.DEFAULT
  });
  const f = BigInt(n) + BigInt(r) - BigInt(i);
  return u.addOutput({
    script: c,
    amount: f
  }), u;
}
class et {
  constructor(e, n, r, i, o, s) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = o, this.outputSize = s;
  }
  static create() {
    return new et(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += et.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += et.INPUT_SIZE + et.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const i = 1 + et.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + i, this.inputSize += et.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += et.OUTPUT_SIZE + et.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let o = (et.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * et.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (o += et.WITNESS_HEADER_SIZE + this.inputWitnessSize), nh(o);
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
const nh = (t) => {
  const e = BigInt(Math.ceil(t / et.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, rh = new X("invalid settlement transaction"), yo = new X("invalid settlement transaction outputs"), cu = new X("empty tree"), ih = new X("invalid root level"), ws = new X("invalid number of inputs"), Vn = new X("wrong settlement txid"), mo = new X("invalid amount"), oh = new X("no leaves"), sh = new X("node transaction empty"), ch = new X("node txid empty"), ah = new X("node parent txid empty"), uh = new X("node txid different"), xc = new X("parent txid input mismatch"), fh = new X("leaf node has children"), Sc = new X("invalid taproot script"), lh = new X("invalid internal key");
new X("invalid control block");
const dh = new X("invalid root transaction"), hh = new X("invalid node transaction"), Pi = 0, vc = 1;
function ph(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw cu;
  const r = ot.fromPSBT(Nt.decode(n.tx));
  if (r.inputsLength !== 1)
    throw ws;
  const i = r.getInput(0), o = ot.fromPSBT(Nt.decode(t));
  if (o.outputsLength <= vc)
    throw yo;
  const s = F.encode(zt(o.toBytes(!0)).reverse());
  if (!i.txid || F.encode(i.txid) !== s || i.index !== vc)
    throw Vn;
}
function wh(t, e, n) {
  e.validate();
  let r;
  try {
    r = ot.fromPSBT(Nt.decode(t));
  } catch {
    throw rh;
  }
  if (r.outputsLength <= Pi)
    throw yo;
  const i = r.getOutput(Pi);
  if (!(i != null && i.amount))
    throw yo;
  const o = i.amount;
  if (e.numberOfNodes() === 0)
    throw cu;
  if (e.levels[0].length !== 1)
    throw ih;
  const c = e.levels[0][0];
  let a;
  try {
    a = ot.fromPSBT(Nt.decode(c.tx));
  } catch {
    throw dh;
  }
  if (a.inputsLength !== 1)
    throw ws;
  const u = a.getInput(0);
  if (!u.txid || u.index === void 0)
    throw Vn;
  const f = F.encode(zt(r.toBytes(!0)).reverse());
  if (F.encode(u.txid) !== f || u.index !== Pi)
    throw Vn;
  let l = 0n;
  for (let d = 0; d < a.outputsLength; d++) {
    const h = a.getOutput(d);
    h != null && h.amount && (l += h.amount);
  }
  if (l >= o)
    throw mo;
  if (e.leaves().length === 0)
    throw oh;
  for (const d of e.levels)
    for (const h of d)
      gh(e, h, n);
}
function gh(t, e, n) {
  if (!e.tx)
    throw sh;
  if (!e.txid)
    throw ch;
  if (!e.parentTxid)
    throw ah;
  let r;
  try {
    r = ot.fromPSBT(Nt.decode(e.tx));
  } catch {
    throw hh;
  }
  if (F.encode(zt(r.toBytes(!0)).reverse()) !== e.txid)
    throw uh;
  if (r.inputsLength !== 1)
    throw ws;
  const o = r.getInput(0);
  if (!o.txid || F.encode(o.txid) !== e.parentTxid)
    throw xc;
  const s = t.children(e.txid);
  if (e.leaf && s.length >= 1)
    throw fh;
  for (let c = 0; c < s.length; c++) {
    const a = s[c], u = ot.fromPSBT(Nt.decode(a.tx)), f = r.getOutput(c);
    if (!(f != null && f.script))
      throw Sc;
    const l = f.script.slice(2);
    if (l.length !== 32)
      throw Sc;
    const d = iu(u), { finalKey: h } = cs(d, !0, {
      taprootTweak: n
    });
    if (F.encode(h) !== F.encode(l.slice(2)))
      throw lh;
    let y = 0n;
    for (let w = 0; w < u.outputsLength; w++) {
      const p = u.getOutput(w);
      p != null && p.amount && (y += p.amount);
    }
    if (!f.amount || y >= f.amount)
      throw mo;
  }
}
class be {
  constructor(e, n, r, i, o, s, c, a) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = i, this.arkProvider = o, this.offchainAddress = s, this.boardingAddress = c, this.offchainTapscript = a;
  }
  static async create(e) {
    const n = Vd(e.network), r = new jd(e.esploraUrl || Zd[e.network]), i = e.identity.xOnlyPublicKey();
    if (!i)
      throw new Error("Invalid configured public key");
    let o;
    e.arkServerUrl && (o = new Yd(e.arkServerUrl));
    const s = ai(i, void 0, n);
    if (o) {
      let c = e.arkServerPublicKey, a = e.boardingTimelock;
      if (!c || !a) {
        const w = await o.getInfo();
        c = w.pubkey, a = {
          value: w.unilateralExitDelay,
          type: w.unilateralExitDelay < 512 ? "blocks" : "seconds"
        };
      }
      const u = F.decode(c).slice(1), f = Xe.createBareVtxo(i, u, n), l = Xe.createBoarding(i, u, a, n), d = {
        address: new Jt(u, f.toP2TR().tweakedPubkey, n).encode(),
        scripts: {
          exit: [F.encode(f.getExitScript())],
          forfeit: [F.encode(f.getForfeitScript())]
        }
      }, h = {
        address: l.toP2TR().address,
        scripts: {
          exit: [F.encode(l.getExitScript())],
          forfeit: [F.encode(l.getForfeitScript())]
        }
      }, y = f;
      return new be(e.identity, n, r, s, o, d, h, y);
    }
    return new be(e.identity, n, r, s);
  }
  get onchainAddress() {
    return this.onchainP2TR.address || "";
  }
  getAddress() {
    const e = {
      onchain: this.onchainAddress,
      bip21: bc.create({
        address: this.onchainAddress
      })
    };
    return this.arkProvider && this.offchainAddress && (e.offchain = this.offchainAddress, e.bip21 = bc.create({
      address: this.onchainP2TR.address,
      ark: this.offchainAddress.address
    }), e.boarding = this.boardingAddress), Promise.resolve(e);
  }
  async getBalance() {
    const e = await this.getCoins(), n = e.filter((u) => u.status.confirmed).reduce((u, f) => u + f.value, 0), r = e.filter((u) => !u.status.confirmed).reduce((u, f) => u + f.value, 0), i = n + r;
    let o = 0, s = 0, c = 0;
    if (this.arkProvider) {
      const u = await this.getVirtualCoins();
      o = u.filter((f) => f.virtualStatus.state === "settled").reduce((f, l) => f + l.value, 0), s = u.filter((f) => f.virtualStatus.state === "pending").reduce((f, l) => f + l.value, 0), c = u.filter((f) => f.virtualStatus.state === "swept").reduce((f, l) => f + l.value, 0);
    }
    const a = o + s;
    return {
      onchain: {
        confirmed: n,
        unconfirmed: r,
        total: i
      },
      offchain: {
        swept: c,
        settled: o,
        pending: s,
        total: a
      },
      total: i + a
    };
  }
  async getCoins() {
    const e = await this.getAddress();
    return this.onchainProvider.getCoins(e.onchain);
  }
  async getVtxos() {
    if (!this.arkProvider)
      return [];
    const e = await this.getAddress();
    if (!e.offchain)
      return [];
    const { spendableVtxos: n } = await this.arkProvider.getVirtualCoins(e.offchain.address);
    return n.map((r) => ({
      ...r,
      outpoint: {
        txid: r.txid,
        vout: r.vout
      },
      forfeitScript: e.offchain.scripts.forfeit[0],
      tapscripts: [
        ...e.offchain.scripts.forfeit,
        ...e.offchain.scripts.exit
      ]
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
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.address), { boardingTxs: r, roundsToIgnore: i } = await this.getBoardingTxs(), o = zd(e, n, i), s = [...r, ...o];
    return s.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (c, a) => c.createdAt === 0 ? -1 : a.createdAt === 0 ? 1 : a.createdAt - c.createdAt
    ), s;
  }
  async getBoardingTxs() {
    if (!this.boardingAddress)
      return { boardingTxs: [], roundsToIgnore: /* @__PURE__ */ new Set() };
    const e = await this.onchainProvider.getTransactions(this.boardingAddress.address), n = [], r = /* @__PURE__ */ new Set();
    for (const s of e)
      for (let c = 0; c < s.vout.length; c++) {
        const a = s.vout[c];
        if (a.scriptpubkey_address === this.boardingAddress.address) {
          const f = (await this.onchainProvider.getTxOutspends(s.txid))[c];
          f != null && f.spent && r.add(f.txid), n.push({
            txid: s.txid,
            vout: c,
            value: Number(a.value),
            status: {
              confirmed: s.status.confirmed,
              block_time: s.status.block_time
            },
            virtualStatus: {
              state: f != null && f.spent ? "swept" : "pending",
              batchTxID: f != null && f.spent ? f.txid : void 0
            },
            createdAt: s.status.confirmed ? new Date(s.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const i = [], o = [];
    for (const s of n) {
      const c = {
        key: {
          boardingTxid: s.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: s.value,
        type: Yn.TxReceived,
        settled: s.virtualStatus.state === "swept",
        createdAt: s.status.block_time ? new Date(s.status.block_time * 1e3).getTime() : 0
      };
      s.status.block_time ? o.push(c) : i.push(c);
    }
    return {
      boardingTxs: [...i, ...o],
      roundsToIgnore: r
    };
  }
  async getBoardingUtxos() {
    if (!this.boardingAddress)
      throw new Error("Boarding address not configured");
    return (await this.onchainProvider.getCoins(this.boardingAddress.address)).map((n) => ({
      ...n,
      outpoint: {
        txid: n.txid,
        vout: n.vout
      },
      forfeitScript: this.boardingAddress.scripts.forfeit[0],
      tapscripts: [
        ...this.boardingAddress.scripts.forfeit,
        ...this.boardingAddress.scripts.exit
      ]
    }));
  }
  async sendBitcoin(e, n = !0) {
    if (e.amount <= 0)
      throw new Error("Amount must be positive");
    if (e.amount < be.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return Jt.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || be.FEE_RATE, i = Math.ceil(174 * r), o = e.amount + i, s = Gd(n, o);
    if (!s.inputs)
      throw new Error("Insufficient funds");
    let c = new ot();
    for (const u of s.inputs)
      c.addInput({
        txid: u.txid,
        index: u.vout,
        witnessUtxo: {
          script: this.onchainP2TR.script,
          amount: BigInt(u.value)
        },
        tapInternalKey: this.onchainP2TR.tapInternalKey,
        tapMerkleRoot: this.onchainP2TR.tapMerkleRoot
      });
    return c.addOutputAddress(e.address, BigInt(e.amount), this.network), s.changeAmount > 0 && c.addOutputAddress(this.onchainAddress, BigInt(s.changeAmount), this.network), c = await this.identity.sign(c), c.finalize(), await this.onchainProvider.broadcastTransaction(c.hex);
  }
  async sendOffchain(e, n = !0) {
    var f;
    if (!this.arkProvider || !this.offchainAddress || !this.offchainTapscript)
      throw new Error("wallet not initialized");
    const r = await this.getVirtualCoins(), i = n ? 0 : Math.ceil(174 * (e.feeRate || be.FEE_RATE)), o = e.amount + i, s = Wd(r, o);
    if (!s || !s.inputs)
      throw new Error("Insufficient funds");
    let c = new ot({
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    });
    for (const l of s.inputs) {
      const d = this.offchainTapscript.toP2TR(), h = F.encode(this.offchainTapscript.getForfeitScript()), y = (f = d.leaves) == null ? void 0 : f.find((w) => F.encode(w.script) === h);
      if (!y)
        throw new Error("Selected leaf not found");
      c.addInput({
        txid: l.txid,
        index: l.vout,
        witnessUtxo: {
          script: d.script,
          amount: BigInt(l.value)
        },
        tapInternalKey: void 0,
        tapLeafScript: [
          [
            {
              version: Me,
              internalKey: Nn,
              merklePath: y.path
            },
            new Uint8Array([
              ...y.script,
              Me
            ])
          ]
        ]
      });
    }
    const a = Jt.decode(e.address);
    c.addOutput({
      script: new Uint8Array([
        81,
        32,
        ...a.tweakedPubKey
      ]),
      amount: BigInt(e.amount)
    }), s.changeAmount > 0 && c.addOutput({
      script: this.offchainTapscript.toP2TR().script,
      amount: BigInt(s.changeAmount)
    }), c = await this.identity.sign(c);
    const u = c.toPSBT();
    return this.arkProvider.submitVirtualTx(Nt.encode(u));
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let w = 0;
      const p = await this.getBoardingUtxos();
      w += p.reduce((E, T) => E + T.value, 0);
      const g = await this.getVtxos();
      w += g.reduce((E, T) => E + T.value, 0);
      const m = [...p, ...g];
      if (m.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: m,
        outputs: [
          {
            address: this.offchainAddress.address,
            amount: BigInt(w)
          }
        ]
      };
    }
    const { requestId: r } = await this.arkProvider.registerInputsForNextRound(e.inputs), i = e.outputs.some((w) => this.isOffchainSuitable(w.address));
    let o;
    const s = [];
    i && (o = this.identity.signerSession(), s.push(F.encode(o.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, s);
    const c = setInterval(() => {
      var w;
      (w = this.arkProvider) == null || w.ping(r).catch(u);
    }, 1e3);
    let a = !0;
    const u = () => {
      a && (a = !1, clearInterval(c));
    }, f = this.arkProvider.getEventStream();
    let l;
    i || (l = St.SigningNoncesGenerated);
    const d = await this.arkProvider.getInfo(), h = ou({
      value: d.batchExpiry,
      type: d.batchExpiry >= 512n ? "seconds" : "blocks"
    }, F.decode(d.pubkey).slice(1)), y = pn(h);
    for await (const w of f) {
      switch (n && n(w), w.type) {
        // the settlement failed
        case St.Failed:
          if (l === void 0)
            continue;
          throw u(), new Error(w.reason);
        // the server has started the signing process of the vtxo tree transactions
        // the server expects the partial musig2 nonces for each tx
        case St.SigningStart:
          if (l !== void 0)
            continue;
          if (u(), i) {
            if (!o)
              throw new Error("Signing session not found");
            await this.handleSettlementSigningEvent(w, y, o);
          }
          break;
        // the musig2 nonces of the vtxo tree transactions are generated
        // the server expects now the partial musig2 signatures
        case St.SigningNoncesGenerated:
          if (l !== St.SigningStart)
            continue;
          if (u(), i) {
            if (!o)
              throw new Error("Signing session not found");
            await this.handleSettlementSigningNoncesGeneratedEvent(w, o);
          }
          break;
        // the vtxo tree is signed, craft, sign and submit forfeit transactions
        // if any boarding utxos are involved, the settlement tx is also signed
        case St.Finalization:
          if (l !== St.SigningNoncesGenerated)
            continue;
          u(), await this.handleSettlementFinalizationEvent(w, e.inputs, d);
          break;
        // the settlement is done, last event to be received
        case St.Finalized:
          if (l !== St.Finalization)
            continue;
          return w.roundTxid;
      }
      l = w.type;
    }
    throw new Error("Settlement failed");
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const i = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    wh(e.unsignedSettlementTx, i, n);
    const o = Nt.decode(e.unsignedSettlementTx), c = ot.fromPSBT(o).getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(i, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, F.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, F.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const i = Kr(this.network).decode(r.forfeitAddress), o = bt.encode(i), s = [], c = await this.getVirtualCoins();
    let a = ot.fromPSBT(Nt.decode(e.roundTx)), u = !1, f = !1;
    for (const l of n) {
      if (typeof l == "string")
        continue;
      const d = yh(l, this.network), h = c.find((T) => T.txid === l.outpoint.txid && T.vout === l.outpoint.vout);
      if (!h) {
        u = !0;
        const T = [];
        for (let I = 0; I < a.inputsLength; I++) {
          const B = a.getInput(I);
          if (!B.txid || B.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          F.encode(B.txid) === l.outpoint.txid && B.index === l.outpoint.vout && (a.updateInput(I, {
            tapLeafScript: [d]
          }), T.push(I));
        }
        a = await this.identity.sign(a, T);
        continue;
      }
      f || (ph(e.roundTx, e.connectors), f = !0);
      const y = $e.encode(d[0]), w = et.create().addKeySpendInput().addTapscriptInput(
        64 * 2,
        // TODO: handle conditional script
        d[1].length,
        y.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), p = e.connectors.leaves(), g = e.connectorsIndex.get(`${h.txid}:${h.vout}`);
      if (!g)
        throw new Error("Connector outpoint not found");
      let m;
      for (const T of p)
        if (T.txid === g.txid)
          try {
            m = ot.fromPSBT(Nt.decode(T.tx)).getOutput(g.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!m || !m.amount || !m.script)
        throw new Error("Connector output not found");
      let E = eh({
        connectorInput: g,
        connectorAmount: m.amount,
        feeAmount: w,
        serverScript: o,
        connectorScript: m.script,
        vtxoAmount: BigInt(h.value),
        vtxoInput: l.outpoint,
        vtxoScript: Jt.fromTapscripts(F.decode(r.pubkey), l.tapscripts, this.network).script
      });
      E.updateInput(1, {
        tapLeafScript: [d]
      }), E = await this.identity.sign(E, [1]), s.push(Nt.encode(E.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(s, u ? Nt.encode(a.toPSBT()) : void 0);
  }
}
be.DUST_AMOUNT = BigInt(546);
be.FEE_RATE = 1;
function yh(t, e) {
  var s;
  const n = pn(F.decode(t.forfeitScript), Me), r = ci(t.tapscripts.map((c) => ({
    script: F.decode(c)
  }))), i = ai(Nn, r, e, !0);
  if (!i.leaves || !i.tapLeafScript)
    throw new Error("invalid vtxo tapscripts");
  const o = (s = i.leaves) == null ? void 0 : s.findIndex((c) => F.encode(c.hash) === F.encode(n));
  if (o === -1 || o === void 0)
    throw new Error("forfeit tapscript not found in vtxo tapscripts");
  return i.tapLeafScript[o];
}
var H;
(function(t) {
  t.walletInitialized = {
    type: "WALLET_INITIALIZED",
    success: !0
  };
  function e(b) {
    return {
      type: "ERROR",
      success: !1,
      message: b
    };
  }
  t.error = e;
  function n(b) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: b
    };
  }
  t.settleEvent = n;
  function r(b) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: b
    };
  }
  t.settleSuccess = r;
  function i(b) {
    return b.type === "SETTLE_SUCCESS" && b.success;
  }
  t.isSettleSuccess = i;
  function o(b) {
    return b.type === "ADDRESS" && b.success === !0;
  }
  t.isAddress = o;
  function s(b) {
    return {
      type: "ADDRESS",
      success: !0,
      address: b
    };
  }
  t.address = s;
  function c(b) {
    return b.type === "BALANCE" && b.success === !0;
  }
  t.isBalance = c;
  function a(b) {
    return {
      type: "BALANCE",
      success: !0,
      balance: b
    };
  }
  t.balance = a;
  function u(b) {
    return b.type === "COINS" && b.success === !0;
  }
  t.isCoins = u;
  function f(b) {
    return {
      type: "COINS",
      success: !0,
      coins: b
    };
  }
  t.coins = f;
  function l(b) {
    return b.type === "VTXOS" && b.success === !0;
  }
  t.isVtxos = l;
  function d(b) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: b
    };
  }
  t.vtxos = d;
  function h(b) {
    return b.type === "VIRTUAL_COINS" && b.success === !0;
  }
  t.isVirtualCoins = h;
  function y(b) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: b
    };
  }
  t.virtualCoins = y;
  function w(b) {
    return b.type === "BOARDING_UTXOS" && b.success === !0;
  }
  t.isBoardingUtxos = w;
  function p(b) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: b
    };
  }
  t.boardingUtxos = p;
  function g(b) {
    return b.type === "SEND_BITCOIN_SUCCESS" && b.success === !0;
  }
  t.isSendBitcoinSuccess = g;
  function m(b) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: b
    };
  }
  t.sendBitcoinSuccess = m;
  function E(b) {
    return b.type === "TRANSACTION_HISTORY" && b.success === !0;
  }
  t.isTransactionHistory = E;
  function T(b) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: b
    };
  }
  t.transactionHistory = T;
  function I(b) {
    return b.type === "WALLET_STATUS" && b.success === !0;
  }
  t.isWalletStatus = I;
  function B(b) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: b
      }
    };
  }
  t.walletStatus = B;
})(H || (H = {}));
var Dt;
(function(t) {
  function e(h) {
    return typeof h == "object" && h !== null && "type" in h;
  }
  t.isBase = e;
  function n(h) {
    return h.type === "INIT_WALLET" && "privateKey" in h && typeof h.privateKey == "string" && "arkServerUrl" in h && typeof h.arkServerUrl == "string" && "network" in h && typeof h.network == "string" && ("arkServerPublicKey" in h ? typeof h.arkServerPublicKey == "string" || h.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(h) {
    return h.type === "SETTLE";
  }
  t.isSettle = r;
  function i(h) {
    return h.type === "GET_ADDRESS";
  }
  t.isGetAddress = i;
  function o(h) {
    return h.type === "GET_BALANCE";
  }
  t.isGetBalance = o;
  function s(h) {
    return h.type === "GET_COINS";
  }
  t.isGetCoins = s;
  function c(h) {
    return h.type === "GET_VTXOS";
  }
  t.isGetVtxos = c;
  function a(h) {
    return h.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = a;
  function u(h) {
    return h.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = u;
  function f(h) {
    return h.type === "SEND_BITCOIN" && "params" in h && h.params !== null && typeof h.params == "object" && "address" in h.params && typeof h.params.address == "string" && "amount" in h.params && typeof h.params.amount == "number";
  }
  t.isSendBitcoin = f;
  function l(h) {
    return h.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = l;
  function d(h) {
    return h.type === "GET_STATUS";
  }
  t.isGetStatus = d;
})(Dt || (Dt = {}));
class mh {
  async start() {
    self.addEventListener("message", async (e) => {
      await this.handleMessage(e);
    });
  }
  async handleInitWallet(e) {
    var r, i, o;
    const n = e.data;
    if (!Dt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.wallet = await be.create({
        network: n.network,
        identity: qr.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (i = e.source) == null || i.postMessage(H.walletInitialized);
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const c = s instanceof Error ? s.message : "Unknown error occurred";
      (o = e.source) == null || o.postMessage(H.error(c));
    }
  }
  async handleSettle(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
        return;
      }
      const c = await this.wallet.settle(n.params, (a) => {
        var u;
        (u = e.source) == null || u.postMessage(H.settleEvent(a));
      });
      (o = e.source) == null || o.postMessage(H.settleSuccess(c));
    } catch (c) {
      console.error("Error settling:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleSendBitcoin(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (o = e.source) == null || o.postMessage(H.sendBitcoinSuccess(c));
    } catch (c) {
      console.error("Error sending bitcoin:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetAddress(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getAddress();
      (o = e.source) == null || o.postMessage(H.address(c));
    } catch (c) {
      console.error("Error getting address:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetBalance(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBalance();
      (o = e.source) == null || o.postMessage(H.balance(c));
    } catch (c) {
      console.error("Error getting balance:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetCoins(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins();
      (o = e.source) == null || o.postMessage(H.coins(c));
    } catch (c) {
      console.error("Error getting coins:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetVtxos(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getVtxos();
      (o = e.source) == null || o.postMessage(H.vtxos(c));
    } catch (c) {
      console.error("Error getting vtxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBoardingUtxos();
      (o = e.source) == null || o.postMessage(H.boardingUtxos(c));
    } catch (c) {
      console.error("Error getting boarding utxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Dt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(H.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getTransactionHistory();
      (o = e.source) == null || o.postMessage(H.transactionHistory(c));
    } catch (c) {
      console.error("Error getting transaction history:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(H.error(a));
    }
  }
  async handleGetStatus(e) {
    var r, i;
    const n = e.data;
    if (!Dt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(H.error("Invalid GET_STATUS message format"));
      return;
    }
    (i = e.source) == null || i.postMessage(H.walletStatus(this.wallet !== void 0));
  }
  async handleMessage(e) {
    var r, i;
    const n = e.data;
    if (!Dt.isBase(n)) {
      (r = e.source) == null || r.postMessage(H.error("Invalid message format"));
      return;
    }
    switch (console.log("Received message in service worker", n), n.type) {
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
      default:
        (i = e.source) == null || i.postMessage(H.error("Unknown message type"));
    }
  }
}
const Eh = (t) => {
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
var Eo = 9e15, De = 1e9, bo = "0123456789abcdef", zr = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058", Gr = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789", xo = {
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
  maxE: Eo,
  // 1 to EXP_LIMIT
  // Whether to use cryptographically-secure random number generation, if available.
  crypto: !1
  // true/false
}, au, Se, P = !0, ui = "[DecimalError] ", Ve = ui + "Invalid argument: ", uu = ui + "Precision limit exceeded", fu = ui + "crypto unavailable", lu = "[object Decimal]", It = Math.floor, ft = Math.pow, bh = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, xh = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, Sh = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, du = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, ne = 1e7, O = 7, vh = 9007199254740991, Th = zr.length - 1, So = Gr.length - 1, A = { toStringTag: lu };
A.absoluteValue = A.abs = function() {
  var t = new this.constructor(this);
  return t.s < 0 && (t.s = 1), _(t);
};
A.ceil = function() {
  return _(new this.constructor(this), this.e + 1, 2);
};
A.clampedTo = A.clamp = function(t, e) {
  var n, r = this, i = r.constructor;
  if (t = new i(t), e = new i(e), !t.s || !e.s) return new i(NaN);
  if (t.gt(e)) throw Error(Ve + e);
  return n = r.cmp(t), n < 0 ? t : r.cmp(e) > 0 ? e : new i(r);
};
A.comparedTo = A.cmp = function(t) {
  var e, n, r, i, o = this, s = o.d, c = (t = new o.constructor(t)).d, a = o.s, u = t.s;
  if (!s || !c)
    return !a || !u ? NaN : a !== u ? a : s === c ? 0 : !s ^ a < 0 ? 1 : -1;
  if (!s[0] || !c[0]) return s[0] ? a : c[0] ? -u : 0;
  if (a !== u) return a;
  if (o.e !== t.e) return o.e > t.e ^ a < 0 ? 1 : -1;
  for (r = s.length, i = c.length, e = 0, n = r < i ? r : i; e < n; ++e)
    if (s[e] !== c[e]) return s[e] > c[e] ^ a < 0 ? 1 : -1;
  return r === i ? 0 : r > i ^ a < 0 ? 1 : -1;
};
A.cosine = A.cos = function() {
  var t, e, n = this, r = n.constructor;
  return n.d ? n.d[0] ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + O, r.rounding = 1, n = Ah(r, yu(r, n)), r.precision = t, r.rounding = e, _(Se == 2 || Se == 3 ? n.neg() : n, t, e, !0)) : new r(1) : new r(NaN);
};
A.cubeRoot = A.cbrt = function() {
  var t, e, n, r, i, o, s, c, a, u, f = this, l = f.constructor;
  if (!f.isFinite() || f.isZero()) return new l(f);
  for (P = !1, o = f.s * ft(f.s * f, 1 / 3), !o || Math.abs(o) == 1 / 0 ? (n = xt(f.d), t = f.e, (o = (t - n.length + 1) % 3) && (n += o == 1 || o == -2 ? "0" : "00"), o = ft(n, 1 / 3), t = It((t + 1) / 3) - (t % 3 == (t < 0 ? -1 : 2)), o == 1 / 0 ? n = "5e" + t : (n = o.toExponential(), n = n.slice(0, n.indexOf("e") + 1) + t), r = new l(n), r.s = f.s) : r = new l(o.toString()), s = (t = l.precision) + 3; ; )
    if (c = r, a = c.times(c).times(c), u = a.plus(f), r = W(u.plus(f).times(c), u.plus(a), s + 2, 1), xt(c.d).slice(0, s) === (n = xt(r.d)).slice(0, s))
      if (n = n.slice(s - 3, s + 1), n == "9999" || !i && n == "4999") {
        if (!i && (_(c, t + 1, 0), c.times(c).times(c).eq(f))) {
          r = c;
          break;
        }
        s += 4, i = 1;
      } else {
        (!+n || !+n.slice(1) && n.charAt(0) == "5") && (_(r, t + 1, 1), e = !r.times(r).times(r).eq(f));
        break;
      }
  return P = !0, _(r, t, l.rounding, e);
};
A.decimalPlaces = A.dp = function() {
  var t, e = this.d, n = NaN;
  if (e) {
    if (t = e.length - 1, n = (t - It(this.e / O)) * O, t = e[t], t) for (; t % 10 == 0; t /= 10) n--;
    n < 0 && (n = 0);
  }
  return n;
};
A.dividedBy = A.div = function(t) {
  return W(this, new this.constructor(t));
};
A.dividedToIntegerBy = A.divToInt = function(t) {
  var e = this, n = e.constructor;
  return _(W(e, new n(t), 0, 1, 1), n.precision, n.rounding);
};
A.equals = A.eq = function(t) {
  return this.cmp(t) === 0;
};
A.floor = function() {
  return _(new this.constructor(this), this.e + 1, 3);
};
A.greaterThan = A.gt = function(t) {
  return this.cmp(t) > 0;
};
A.greaterThanOrEqualTo = A.gte = function(t) {
  var e = this.cmp(t);
  return e == 1 || e === 0;
};
A.hyperbolicCosine = A.cosh = function() {
  var t, e, n, r, i, o = this, s = o.constructor, c = new s(1);
  if (!o.isFinite()) return new s(o.s ? 1 / 0 : NaN);
  if (o.isZero()) return c;
  n = s.precision, r = s.rounding, s.precision = n + Math.max(o.e, o.sd()) + 4, s.rounding = 1, i = o.d.length, i < 32 ? (t = Math.ceil(i / 3), e = (1 / li(4, t)).toString()) : (t = 16, e = "2.3283064365386962890625e-10"), o = kn(s, 1, o.times(e), new s(1), !0);
  for (var a, u = t, f = new s(8); u--; )
    a = o.times(o), o = c.minus(a.times(f.minus(a.times(f))));
  return _(o, s.precision = n, s.rounding = r, !0);
};
A.hyperbolicSine = A.sinh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  if (!i.isFinite() || i.isZero()) return new o(i);
  if (e = o.precision, n = o.rounding, o.precision = e + Math.max(i.e, i.sd()) + 4, o.rounding = 1, r = i.d.length, r < 3)
    i = kn(o, 2, i, i, !0);
  else {
    t = 1.4 * Math.sqrt(r), t = t > 16 ? 16 : t | 0, i = i.times(1 / li(5, t)), i = kn(o, 2, i, i, !0);
    for (var s, c = new o(5), a = new o(16), u = new o(20); t--; )
      s = i.times(i), i = i.times(c.plus(s.times(a.times(s).plus(u))));
  }
  return o.precision = e, o.rounding = n, _(i, e, n, !0);
};
A.hyperbolicTangent = A.tanh = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 7, r.rounding = 1, W(n.sinh(), n.cosh(), r.precision = t, r.rounding = e)) : new r(n.s);
};
A.inverseCosine = A.acos = function() {
  var t = this, e = t.constructor, n = t.abs().cmp(1), r = e.precision, i = e.rounding;
  return n !== -1 ? n === 0 ? t.isNeg() ? se(e, r, i) : new e(0) : new e(NaN) : t.isZero() ? se(e, r + 4, i).times(0.5) : (e.precision = r + 6, e.rounding = 1, t = new e(1).minus(t).div(t.plus(1)).sqrt().atan(), e.precision = r, e.rounding = i, t.times(2));
};
A.inverseHyperbolicCosine = A.acosh = function() {
  var t, e, n = this, r = n.constructor;
  return n.lte(1) ? new r(n.eq(1) ? 0 : NaN) : n.isFinite() ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(Math.abs(n.e), n.sd()) + 4, r.rounding = 1, P = !1, n = n.times(n).minus(1).sqrt().plus(n), P = !0, r.precision = t, r.rounding = e, n.ln()) : new r(n);
};
A.inverseHyperbolicSine = A.asinh = function() {
  var t, e, n = this, r = n.constructor;
  return !n.isFinite() || n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 2 * Math.max(Math.abs(n.e), n.sd()) + 6, r.rounding = 1, P = !1, n = n.times(n).plus(1).sqrt().plus(n), P = !0, r.precision = t, r.rounding = e, n.ln());
};
A.inverseHyperbolicTangent = A.atanh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isFinite() ? i.e >= 0 ? new o(i.abs().eq(1) ? i.s / 0 : i.isZero() ? i : NaN) : (t = o.precision, e = o.rounding, r = i.sd(), Math.max(r, t) < 2 * -i.e - 1 ? _(new o(i), t, e, !0) : (o.precision = n = r - i.e, i = W(i.plus(1), new o(1).minus(i), n + t, 1), o.precision = t + 4, o.rounding = 1, i = i.ln(), o.precision = t, o.rounding = e, i.times(0.5))) : new o(NaN);
};
A.inverseSine = A.asin = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isZero() ? new o(i) : (e = i.abs().cmp(1), n = o.precision, r = o.rounding, e !== -1 ? e === 0 ? (t = se(o, n + 4, r).times(0.5), t.s = i.s, t) : new o(NaN) : (o.precision = n + 6, o.rounding = 1, i = i.div(new o(1).minus(i.times(i)).sqrt().plus(1)).atan(), o.precision = n, o.rounding = r, i.times(2)));
};
A.inverseTangent = A.atan = function() {
  var t, e, n, r, i, o, s, c, a, u = this, f = u.constructor, l = f.precision, d = f.rounding;
  if (u.isFinite()) {
    if (u.isZero())
      return new f(u);
    if (u.abs().eq(1) && l + 4 <= So)
      return s = se(f, l + 4, d).times(0.25), s.s = u.s, s;
  } else {
    if (!u.s) return new f(NaN);
    if (l + 4 <= So)
      return s = se(f, l + 4, d).times(0.5), s.s = u.s, s;
  }
  for (f.precision = c = l + 10, f.rounding = 1, n = Math.min(28, c / O + 2 | 0), t = n; t; --t) u = u.div(u.times(u).plus(1).sqrt().plus(1));
  for (P = !1, e = Math.ceil(c / O), r = 1, a = u.times(u), s = new f(u), i = u; t !== -1; )
    if (i = i.times(a), o = s.minus(i.div(r += 2)), i = i.times(a), s = o.plus(i.div(r += 2)), s.d[e] !== void 0) for (t = e; s.d[t] === o.d[t] && t--; ) ;
  return n && (s = s.times(2 << n - 1)), P = !0, _(s, f.precision = l, f.rounding = d, !0);
};
A.isFinite = function() {
  return !!this.d;
};
A.isInteger = A.isInt = function() {
  return !!this.d && It(this.e / O) > this.d.length - 2;
};
A.isNaN = function() {
  return !this.s;
};
A.isNegative = A.isNeg = function() {
  return this.s < 0;
};
A.isPositive = A.isPos = function() {
  return this.s > 0;
};
A.isZero = function() {
  return !!this.d && this.d[0] === 0;
};
A.lessThan = A.lt = function(t) {
  return this.cmp(t) < 0;
};
A.lessThanOrEqualTo = A.lte = function(t) {
  return this.cmp(t) < 1;
};
A.logarithm = A.log = function(t) {
  var e, n, r, i, o, s, c, a, u = this, f = u.constructor, l = f.precision, d = f.rounding, h = 5;
  if (t == null)
    t = new f(10), e = !0;
  else {
    if (t = new f(t), n = t.d, t.s < 0 || !n || !n[0] || t.eq(1)) return new f(NaN);
    e = t.eq(10);
  }
  if (n = u.d, u.s < 0 || !n || !n[0] || u.eq(1))
    return new f(n && !n[0] ? -1 / 0 : u.s != 1 ? NaN : n ? 0 : 1 / 0);
  if (e)
    if (n.length > 1)
      o = !0;
    else {
      for (i = n[0]; i % 10 === 0; ) i /= 10;
      o = i !== 1;
    }
  if (P = !1, c = l + h, s = Le(u, c), r = e ? Wr(f, c + 10) : Le(t, c), a = W(s, r, c, 1), Xn(a.d, i = l, d))
    do
      if (c += 10, s = Le(u, c), r = e ? Wr(f, c + 10) : Le(t, c), a = W(s, r, c, 1), !o) {
        +xt(a.d).slice(i + 1, i + 15) + 1 == 1e14 && (a = _(a, l + 1, 0));
        break;
      }
    while (Xn(a.d, i += 10, d));
  return P = !0, _(a, l, d);
};
A.minus = A.sub = function(t) {
  var e, n, r, i, o, s, c, a, u, f, l, d, h = this, y = h.constructor;
  if (t = new y(t), !h.d || !t.d)
    return !h.s || !t.s ? t = new y(NaN) : h.d ? t.s = -t.s : t = new y(t.d || h.s !== t.s ? h : NaN), t;
  if (h.s != t.s)
    return t.s = -t.s, h.plus(t);
  if (u = h.d, d = t.d, c = y.precision, a = y.rounding, !u[0] || !d[0]) {
    if (d[0]) t.s = -t.s;
    else if (u[0]) t = new y(h);
    else return new y(a === 3 ? -0 : 0);
    return P ? _(t, c, a) : t;
  }
  if (n = It(t.e / O), f = It(h.e / O), u = u.slice(), o = f - n, o) {
    for (l = o < 0, l ? (e = u, o = -o, s = d.length) : (e = d, n = f, s = u.length), r = Math.max(Math.ceil(c / O), s) + 2, o > r && (o = r, e.length = 1), e.reverse(), r = o; r--; ) e.push(0);
    e.reverse();
  } else {
    for (r = u.length, s = d.length, l = r < s, l && (s = r), r = 0; r < s; r++)
      if (u[r] != d[r]) {
        l = u[r] < d[r];
        break;
      }
    o = 0;
  }
  for (l && (e = u, u = d, d = e, t.s = -t.s), s = u.length, r = d.length - s; r > 0; --r) u[s++] = 0;
  for (r = d.length; r > o; ) {
    if (u[--r] < d[r]) {
      for (i = r; i && u[--i] === 0; ) u[i] = ne - 1;
      --u[i], u[r] += ne;
    }
    u[r] -= d[r];
  }
  for (; u[--s] === 0; ) u.pop();
  for (; u[0] === 0; u.shift()) --n;
  return u[0] ? (t.d = u, t.e = fi(u, n), P ? _(t, c, a) : t) : new y(a === 3 ? -0 : 0);
};
A.modulo = A.mod = function(t) {
  var e, n = this, r = n.constructor;
  return t = new r(t), !n.d || !t.s || t.d && !t.d[0] ? new r(NaN) : !t.d || n.d && !n.d[0] ? _(new r(n), r.precision, r.rounding) : (P = !1, r.modulo == 9 ? (e = W(n, t.abs(), 0, 3, 1), e.s *= t.s) : e = W(n, t, 0, r.modulo, 1), e = e.times(t), P = !0, n.minus(e));
};
A.naturalExponential = A.exp = function() {
  return vo(this);
};
A.naturalLogarithm = A.ln = function() {
  return Le(this);
};
A.negated = A.neg = function() {
  var t = new this.constructor(this);
  return t.s = -t.s, _(t);
};
A.plus = A.add = function(t) {
  var e, n, r, i, o, s, c, a, u, f, l = this, d = l.constructor;
  if (t = new d(t), !l.d || !t.d)
    return !l.s || !t.s ? t = new d(NaN) : l.d || (t = new d(t.d || l.s === t.s ? l : NaN)), t;
  if (l.s != t.s)
    return t.s = -t.s, l.minus(t);
  if (u = l.d, f = t.d, c = d.precision, a = d.rounding, !u[0] || !f[0])
    return f[0] || (t = new d(l)), P ? _(t, c, a) : t;
  if (o = It(l.e / O), r = It(t.e / O), u = u.slice(), i = o - r, i) {
    for (i < 0 ? (n = u, i = -i, s = f.length) : (n = f, r = o, s = u.length), o = Math.ceil(c / O), s = o > s ? o + 1 : s + 1, i > s && (i = s, n.length = 1), n.reverse(); i--; ) n.push(0);
    n.reverse();
  }
  for (s = u.length, i = f.length, s - i < 0 && (i = s, n = f, f = u, u = n), e = 0; i; )
    e = (u[--i] = u[i] + f[i] + e) / ne | 0, u[i] %= ne;
  for (e && (u.unshift(e), ++r), s = u.length; u[--s] == 0; ) u.pop();
  return t.d = u, t.e = fi(u, r), P ? _(t, c, a) : t;
};
A.precision = A.sd = function(t) {
  var e, n = this;
  if (t !== void 0 && t !== !!t && t !== 1 && t !== 0) throw Error(Ve + t);
  return n.d ? (e = hu(n.d), t && n.e + 1 > e && (e = n.e + 1)) : e = NaN, e;
};
A.round = function() {
  var t = this, e = t.constructor;
  return _(new e(t), t.e + 1, e.rounding);
};
A.sine = A.sin = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + O, r.rounding = 1, n = Bh(r, yu(r, n)), r.precision = t, r.rounding = e, _(Se > 2 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
A.squareRoot = A.sqrt = function() {
  var t, e, n, r, i, o, s = this, c = s.d, a = s.e, u = s.s, f = s.constructor;
  if (u !== 1 || !c || !c[0])
    return new f(!u || u < 0 && (!c || c[0]) ? NaN : c ? s : 1 / 0);
  for (P = !1, u = Math.sqrt(+s), u == 0 || u == 1 / 0 ? (e = xt(c), (e.length + a) % 2 == 0 && (e += "0"), u = Math.sqrt(e), a = It((a + 1) / 2) - (a < 0 || a % 2), u == 1 / 0 ? e = "5e" + a : (e = u.toExponential(), e = e.slice(0, e.indexOf("e") + 1) + a), r = new f(e)) : r = new f(u.toString()), n = (a = f.precision) + 3; ; )
    if (o = r, r = o.plus(W(s, o, n + 2, 1)).times(0.5), xt(o.d).slice(0, n) === (e = xt(r.d)).slice(0, n))
      if (e = e.slice(n - 3, n + 1), e == "9999" || !i && e == "4999") {
        if (!i && (_(o, a + 1, 0), o.times(o).eq(s))) {
          r = o;
          break;
        }
        n += 4, i = 1;
      } else {
        (!+e || !+e.slice(1) && e.charAt(0) == "5") && (_(r, a + 1, 1), t = !r.times(r).eq(s));
        break;
      }
  return P = !0, _(r, a, f.rounding, t);
};
A.tangent = A.tan = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 10, r.rounding = 1, n = n.sin(), n.s = 1, n = W(n, new r(1).minus(n.times(n)).sqrt(), t + 10, 0), r.precision = t, r.rounding = e, _(Se == 2 || Se == 4 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
A.times = A.mul = function(t) {
  var e, n, r, i, o, s, c, a, u, f = this, l = f.constructor, d = f.d, h = (t = new l(t)).d;
  if (t.s *= f.s, !d || !d[0] || !h || !h[0])
    return new l(!t.s || d && !d[0] && !h || h && !h[0] && !d ? NaN : !d || !h ? t.s / 0 : t.s * 0);
  for (n = It(f.e / O) + It(t.e / O), a = d.length, u = h.length, a < u && (o = d, d = h, h = o, s = a, a = u, u = s), o = [], s = a + u, r = s; r--; ) o.push(0);
  for (r = u; --r >= 0; ) {
    for (e = 0, i = a + r; i > r; )
      c = o[i] + h[r] * d[i - r - 1] + e, o[i--] = c % ne | 0, e = c / ne | 0;
    o[i] = (o[i] + e) % ne | 0;
  }
  for (; !o[--s]; ) o.pop();
  return e ? ++n : o.shift(), t.d = o, t.e = fi(o, n), P ? _(t, l.precision, l.rounding) : t;
};
A.toBinary = function(t, e) {
  return gs(this, 2, t, e);
};
A.toDecimalPlaces = A.toDP = function(t, e) {
  var n = this, r = n.constructor;
  return n = new r(n), t === void 0 ? n : (_t(t, 0, De), e === void 0 ? e = r.rounding : _t(e, 0, 8), _(n, t + n.e + 1, e));
};
A.toExponential = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = de(r, !0) : (_t(t, 0, De), e === void 0 ? e = i.rounding : _t(e, 0, 8), r = _(new i(r), t + 1, e), n = de(r, !0, t + 1)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
A.toFixed = function(t, e) {
  var n, r, i = this, o = i.constructor;
  return t === void 0 ? n = de(i) : (_t(t, 0, De), e === void 0 ? e = o.rounding : _t(e, 0, 8), r = _(new o(i), t + i.e + 1, e), n = de(r, !1, t + r.e + 1)), i.isNeg() && !i.isZero() ? "-" + n : n;
};
A.toFraction = function(t) {
  var e, n, r, i, o, s, c, a, u, f, l, d, h = this, y = h.d, w = h.constructor;
  if (!y) return new w(h);
  if (u = n = new w(1), r = a = new w(0), e = new w(r), o = e.e = hu(y) - h.e - 1, s = o % O, e.d[0] = ft(10, s < 0 ? O + s : s), t == null)
    t = o > 0 ? e : u;
  else {
    if (c = new w(t), !c.isInt() || c.lt(u)) throw Error(Ve + c);
    t = c.gt(e) ? o > 0 ? e : u : c;
  }
  for (P = !1, c = new w(xt(y)), f = w.precision, w.precision = o = y.length * O * 2; l = W(c, e, 0, 1, 1), i = n.plus(l.times(r)), i.cmp(t) != 1; )
    n = r, r = i, i = u, u = a.plus(l.times(i)), a = i, i = e, e = c.minus(l.times(i)), c = i;
  return i = W(t.minus(n), r, 0, 1, 1), a = a.plus(i.times(u)), n = n.plus(i.times(r)), a.s = u.s = h.s, d = W(u, r, o, 1).minus(h).abs().cmp(W(a, n, o, 1).minus(h).abs()) < 1 ? [u, r] : [a, n], w.precision = f, P = !0, d;
};
A.toHexadecimal = A.toHex = function(t, e) {
  return gs(this, 16, t, e);
};
A.toNearest = function(t, e) {
  var n = this, r = n.constructor;
  if (n = new r(n), t == null) {
    if (!n.d) return n;
    t = new r(1), e = r.rounding;
  } else {
    if (t = new r(t), e === void 0 ? e = r.rounding : _t(e, 0, 8), !n.d) return t.s ? n : t;
    if (!t.d)
      return t.s && (t.s = n.s), t;
  }
  return t.d[0] ? (P = !1, n = W(n, t, 0, e, 1).times(t), P = !0, _(n)) : (t.s = n.s, n = t), n;
};
A.toNumber = function() {
  return +this;
};
A.toOctal = function(t, e) {
  return gs(this, 8, t, e);
};
A.toPower = A.pow = function(t) {
  var e, n, r, i, o, s, c = this, a = c.constructor, u = +(t = new a(t));
  if (!c.d || !t.d || !c.d[0] || !t.d[0]) return new a(ft(+c, u));
  if (c = new a(c), c.eq(1)) return c;
  if (r = a.precision, o = a.rounding, t.eq(1)) return _(c, r, o);
  if (e = It(t.e / O), e >= t.d.length - 1 && (n = u < 0 ? -u : u) <= vh)
    return i = pu(a, c, n, r), t.s < 0 ? new a(1).div(i) : _(i, r, o);
  if (s = c.s, s < 0) {
    if (e < t.d.length - 1) return new a(NaN);
    if ((t.d[e] & 1) == 0 && (s = 1), c.e == 0 && c.d[0] == 1 && c.d.length == 1)
      return c.s = s, c;
  }
  return n = ft(+c, u), e = n == 0 || !isFinite(n) ? It(u * (Math.log("0." + xt(c.d)) / Math.LN10 + c.e + 1)) : new a(n + "").e, e > a.maxE + 1 || e < a.minE - 1 ? new a(e > 0 ? s / 0 : 0) : (P = !1, a.rounding = c.s = 1, n = Math.min(12, (e + "").length), i = vo(t.times(Le(c, r + n)), r), i.d && (i = _(i, r + 5, 1), Xn(i.d, r, o) && (e = r + 10, i = _(vo(t.times(Le(c, e + n)), e), e + 5, 1), +xt(i.d).slice(r + 1, r + 15) + 1 == 1e14 && (i = _(i, r + 1, 0)))), i.s = s, P = !0, a.rounding = o, _(i, r, o));
};
A.toPrecision = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = de(r, r.e <= i.toExpNeg || r.e >= i.toExpPos) : (_t(t, 1, De), e === void 0 ? e = i.rounding : _t(e, 0, 8), r = _(new i(r), t, e), n = de(r, t <= r.e || r.e <= i.toExpNeg, t)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
A.toSignificantDigits = A.toSD = function(t, e) {
  var n = this, r = n.constructor;
  return t === void 0 ? (t = r.precision, e = r.rounding) : (_t(t, 1, De), e === void 0 ? e = r.rounding : _t(e, 0, 8)), _(new r(n), t, e);
};
A.toString = function() {
  var t = this, e = t.constructor, n = de(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() && !t.isZero() ? "-" + n : n;
};
A.truncated = A.trunc = function() {
  return _(new this.constructor(this), this.e + 1, 1);
};
A.valueOf = A.toJSON = function() {
  var t = this, e = t.constructor, n = de(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() ? "-" + n : n;
};
function xt(t) {
  var e, n, r, i = t.length - 1, o = "", s = t[0];
  if (i > 0) {
    for (o += s, e = 1; e < i; e++)
      r = t[e] + "", n = O - r.length, n && (o += ke(n)), o += r;
    s = t[e], r = s + "", n = O - r.length, n && (o += ke(n));
  } else if (s === 0)
    return "0";
  for (; s % 10 === 0; ) s /= 10;
  return o + s;
}
function _t(t, e, n) {
  if (t !== ~~t || t < e || t > n)
    throw Error(Ve + t);
}
function Xn(t, e, n, r) {
  var i, o, s, c;
  for (o = t[0]; o >= 10; o /= 10) --e;
  return --e < 0 ? (e += O, i = 0) : (i = Math.ceil((e + 1) / O), e %= O), o = ft(10, O - e), c = t[i] % o | 0, r == null ? e < 3 ? (e == 0 ? c = c / 100 | 0 : e == 1 && (c = c / 10 | 0), s = n < 4 && c == 99999 || n > 3 && c == 49999 || c == 5e4 || c == 0) : s = (n < 4 && c + 1 == o || n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 100 | 0) == ft(10, e - 2) - 1 || (c == o / 2 || c == 0) && (t[i + 1] / o / 100 | 0) == 0 : e < 4 ? (e == 0 ? c = c / 1e3 | 0 : e == 1 ? c = c / 100 | 0 : e == 2 && (c = c / 10 | 0), s = (r || n < 4) && c == 9999 || !r && n > 3 && c == 4999) : s = ((r || n < 4) && c + 1 == o || !r && n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 1e3 | 0) == ft(10, e - 3) - 1, s;
}
function Sr(t, e, n) {
  for (var r, i = [0], o, s = 0, c = t.length; s < c; ) {
    for (o = i.length; o--; ) i[o] *= e;
    for (i[0] += bo.indexOf(t.charAt(s++)), r = 0; r < i.length; r++)
      i[r] > n - 1 && (i[r + 1] === void 0 && (i[r + 1] = 0), i[r + 1] += i[r] / n | 0, i[r] %= n);
  }
  return i.reverse();
}
function Ah(t, e) {
  var n, r, i;
  if (e.isZero()) return e;
  r = e.d.length, r < 32 ? (n = Math.ceil(r / 3), i = (1 / li(4, n)).toString()) : (n = 16, i = "2.3283064365386962890625e-10"), t.precision += n, e = kn(t, 1, e.times(i), new t(1));
  for (var o = n; o--; ) {
    var s = e.times(e);
    e = s.times(s).minus(s).times(8).plus(1);
  }
  return t.precision -= n, e;
}
var W = /* @__PURE__ */ function() {
  function t(r, i, o) {
    var s, c = 0, a = r.length;
    for (r = r.slice(); a--; )
      s = r[a] * i + c, r[a] = s % o | 0, c = s / o | 0;
    return c && r.unshift(c), r;
  }
  function e(r, i, o, s) {
    var c, a;
    if (o != s)
      a = o > s ? 1 : -1;
    else
      for (c = a = 0; c < o; c++)
        if (r[c] != i[c]) {
          a = r[c] > i[c] ? 1 : -1;
          break;
        }
    return a;
  }
  function n(r, i, o, s) {
    for (var c = 0; o--; )
      r[o] -= c, c = r[o] < i[o] ? 1 : 0, r[o] = c * s + r[o] - i[o];
    for (; !r[0] && r.length > 1; ) r.shift();
  }
  return function(r, i, o, s, c, a) {
    var u, f, l, d, h, y, w, p, g, m, E, T, I, B, b, N, k, V, C, L, D = r.constructor, S = r.s == i.s ? 1 : -1, v = r.d, x = i.d;
    if (!v || !v[0] || !x || !x[0])
      return new D(
        // Return NaN if either NaN, or both Infinity or 0.
        !r.s || !i.s || (v ? x && v[0] == x[0] : !x) ? NaN : (
          // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
          v && v[0] == 0 || !x ? S * 0 : S / 0
        )
      );
    for (a ? (h = 1, f = r.e - i.e) : (a = ne, h = O, f = It(r.e / h) - It(i.e / h)), C = x.length, k = v.length, g = new D(S), m = g.d = [], l = 0; x[l] == (v[l] || 0); l++) ;
    if (x[l] > (v[l] || 0) && f--, o == null ? (B = o = D.precision, s = D.rounding) : c ? B = o + (r.e - i.e) + 1 : B = o, B < 0)
      m.push(1), y = !0;
    else {
      if (B = B / h + 2 | 0, l = 0, C == 1) {
        for (d = 0, x = x[0], B++; (l < k || d) && B--; l++)
          b = d * a + (v[l] || 0), m[l] = b / x | 0, d = b % x | 0;
        y = d || l < k;
      } else {
        for (d = a / (x[0] + 1) | 0, d > 1 && (x = t(x, d, a), v = t(v, d, a), C = x.length, k = v.length), N = C, E = v.slice(0, C), T = E.length; T < C; ) E[T++] = 0;
        L = x.slice(), L.unshift(0), V = x[0], x[1] >= a / 2 && ++V;
        do
          d = 0, u = e(x, E, C, T), u < 0 ? (I = E[0], C != T && (I = I * a + (E[1] || 0)), d = I / V | 0, d > 1 ? (d >= a && (d = a - 1), w = t(x, d, a), p = w.length, T = E.length, u = e(w, E, p, T), u == 1 && (d--, n(w, C < p ? L : x, p, a))) : (d == 0 && (u = d = 1), w = x.slice()), p = w.length, p < T && w.unshift(0), n(E, w, T, a), u == -1 && (T = E.length, u = e(x, E, C, T), u < 1 && (d++, n(E, C < T ? L : x, T, a))), T = E.length) : u === 0 && (d++, E = [0]), m[l++] = d, u && E[0] ? E[T++] = v[N] || 0 : (E = [v[N]], T = 1);
        while ((N++ < k || E[0] !== void 0) && B--);
        y = E[0] !== void 0;
      }
      m[0] || m.shift();
    }
    if (h == 1)
      g.e = f, au = y;
    else {
      for (l = 1, d = m[0]; d >= 10; d /= 10) l++;
      g.e = l + f * h - 1, _(g, c ? o + g.e + 1 : o, s, y);
    }
    return g;
  };
}();
function _(t, e, n, r) {
  var i, o, s, c, a, u, f, l, d, h = t.constructor;
  t: if (e != null) {
    if (l = t.d, !l) return t;
    for (i = 1, c = l[0]; c >= 10; c /= 10) i++;
    if (o = e - i, o < 0)
      o += O, s = e, f = l[d = 0], a = f / ft(10, i - s - 1) % 10 | 0;
    else if (d = Math.ceil((o + 1) / O), c = l.length, d >= c)
      if (r) {
        for (; c++ <= d; ) l.push(0);
        f = a = 0, i = 1, o %= O, s = o - O + 1;
      } else
        break t;
    else {
      for (f = c = l[d], i = 1; c >= 10; c /= 10) i++;
      o %= O, s = o - O + i, a = s < 0 ? 0 : f / ft(10, i - s - 1) % 10 | 0;
    }
    if (r = r || e < 0 || l[d + 1] !== void 0 || (s < 0 ? f : f % ft(10, i - s - 1)), u = n < 4 ? (a || r) && (n == 0 || n == (t.s < 0 ? 3 : 2)) : a > 5 || a == 5 && (n == 4 || r || n == 6 && // Check whether the digit to the left of the rounding digit is odd.
    (o > 0 ? s > 0 ? f / ft(10, i - s) : 0 : l[d - 1]) % 10 & 1 || n == (t.s < 0 ? 8 : 7)), e < 1 || !l[0])
      return l.length = 0, u ? (e -= t.e + 1, l[0] = ft(10, (O - e % O) % O), t.e = -e || 0) : l[0] = t.e = 0, t;
    if (o == 0 ? (l.length = d, c = 1, d--) : (l.length = d + 1, c = ft(10, O - o), l[d] = s > 0 ? (f / ft(10, i - s) % ft(10, s) | 0) * c : 0), u)
      for (; ; )
        if (d == 0) {
          for (o = 1, s = l[0]; s >= 10; s /= 10) o++;
          for (s = l[0] += c, c = 1; s >= 10; s /= 10) c++;
          o != c && (t.e++, l[0] == ne && (l[0] = 1));
          break;
        } else {
          if (l[d] += c, l[d] != ne) break;
          l[d--] = 0, c = 1;
        }
    for (o = l.length; l[--o] === 0; ) l.pop();
  }
  return P && (t.e > h.maxE ? (t.d = null, t.e = NaN) : t.e < h.minE && (t.e = 0, t.d = [0])), t;
}
function de(t, e, n) {
  if (!t.isFinite()) return gu(t);
  var r, i = t.e, o = xt(t.d), s = o.length;
  return e ? (n && (r = n - s) > 0 ? o = o.charAt(0) + "." + o.slice(1) + ke(r) : s > 1 && (o = o.charAt(0) + "." + o.slice(1)), o = o + (t.e < 0 ? "e" : "e+") + t.e) : i < 0 ? (o = "0." + ke(-i - 1) + o, n && (r = n - s) > 0 && (o += ke(r))) : i >= s ? (o += ke(i + 1 - s), n && (r = n - i - 1) > 0 && (o = o + "." + ke(r))) : ((r = i + 1) < s && (o = o.slice(0, r) + "." + o.slice(r)), n && (r = n - s) > 0 && (i + 1 === s && (o += "."), o += ke(r))), o;
}
function fi(t, e) {
  var n = t[0];
  for (e *= O; n >= 10; n /= 10) e++;
  return e;
}
function Wr(t, e, n) {
  if (e > Th)
    throw P = !0, n && (t.precision = n), Error(uu);
  return _(new t(zr), e, 1, !0);
}
function se(t, e, n) {
  if (e > So) throw Error(uu);
  return _(new t(Gr), e, n, !0);
}
function hu(t) {
  var e = t.length - 1, n = e * O + 1;
  if (e = t[e], e) {
    for (; e % 10 == 0; e /= 10) n--;
    for (e = t[0]; e >= 10; e /= 10) n++;
  }
  return n;
}
function ke(t) {
  for (var e = ""; t--; ) e += "0";
  return e;
}
function pu(t, e, n, r) {
  var i, o = new t(1), s = Math.ceil(r / O + 4);
  for (P = !1; ; ) {
    if (n % 2 && (o = o.times(e), Ac(o.d, s) && (i = !0)), n = It(n / 2), n === 0) {
      n = o.d.length - 1, i && o.d[n] === 0 && ++o.d[n];
      break;
    }
    e = e.times(e), Ac(e.d, s);
  }
  return P = !0, o;
}
function Tc(t) {
  return t.d[t.d.length - 1] & 1;
}
function wu(t, e, n) {
  for (var r, i, o = new t(e[0]), s = 0; ++s < e.length; ) {
    if (i = new t(e[s]), !i.s) {
      o = i;
      break;
    }
    r = o.cmp(i), (r === n || r === 0 && o.s === n) && (o = i);
  }
  return o;
}
function vo(t, e) {
  var n, r, i, o, s, c, a, u = 0, f = 0, l = 0, d = t.constructor, h = d.rounding, y = d.precision;
  if (!t.d || !t.d[0] || t.e > 17)
    return new d(t.d ? t.d[0] ? t.s < 0 ? 0 : 1 / 0 : 1 : t.s ? t.s < 0 ? 0 : t : NaN);
  for (e == null ? (P = !1, a = y) : a = e, c = new d(0.03125); t.e > -2; )
    t = t.times(c), l += 5;
  for (r = Math.log(ft(2, l)) / Math.LN10 * 2 + 5 | 0, a += r, n = o = s = new d(1), d.precision = a; ; ) {
    if (o = _(o.times(t), a, 1), n = n.times(++f), c = s.plus(W(o, n, a, 1)), xt(c.d).slice(0, a) === xt(s.d).slice(0, a)) {
      for (i = l; i--; ) s = _(s.times(s), a, 1);
      if (e == null)
        if (u < 3 && Xn(s.d, a - r, h, u))
          d.precision = a += 10, n = o = c = new d(1), f = 0, u++;
        else
          return _(s, d.precision = y, h, P = !0);
      else
        return d.precision = y, s;
    }
    s = c;
  }
}
function Le(t, e) {
  var n, r, i, o, s, c, a, u, f, l, d, h = 1, y = 10, w = t, p = w.d, g = w.constructor, m = g.rounding, E = g.precision;
  if (w.s < 0 || !p || !p[0] || !w.e && p[0] == 1 && p.length == 1)
    return new g(p && !p[0] ? -1 / 0 : w.s != 1 ? NaN : p ? 0 : w);
  if (e == null ? (P = !1, f = E) : f = e, g.precision = f += y, n = xt(p), r = n.charAt(0), Math.abs(o = w.e) < 15e14) {
    for (; r < 7 && r != 1 || r == 1 && n.charAt(1) > 3; )
      w = w.times(t), n = xt(w.d), r = n.charAt(0), h++;
    o = w.e, r > 1 ? (w = new g("0." + n), o++) : w = new g(r + "." + n.slice(1));
  } else
    return u = Wr(g, f + 2, E).times(o + ""), w = Le(new g(r + "." + n.slice(1)), f - y).plus(u), g.precision = E, e == null ? _(w, E, m, P = !0) : w;
  for (l = w, a = s = w = W(w.minus(1), w.plus(1), f, 1), d = _(w.times(w), f, 1), i = 3; ; ) {
    if (s = _(s.times(d), f, 1), u = a.plus(W(s, new g(i), f, 1)), xt(u.d).slice(0, f) === xt(a.d).slice(0, f))
      if (a = a.times(2), o !== 0 && (a = a.plus(Wr(g, f + 2, E).times(o + ""))), a = W(a, new g(h), f, 1), e == null)
        if (Xn(a.d, f - y, m, c))
          g.precision = f += y, u = s = w = W(l.minus(1), l.plus(1), f, 1), d = _(w.times(w), f, 1), i = c = 1;
        else
          return _(a, g.precision = E, m, P = !0);
      else
        return g.precision = E, a;
    a = u, i += 2;
  }
}
function gu(t) {
  return String(t.s * t.s / 0);
}
function vr(t, e) {
  var n, r, i;
  for ((n = e.indexOf(".")) > -1 && (e = e.replace(".", "")), (r = e.search(/e/i)) > 0 ? (n < 0 && (n = r), n += +e.slice(r + 1), e = e.substring(0, r)) : n < 0 && (n = e.length), r = 0; e.charCodeAt(r) === 48; r++) ;
  for (i = e.length; e.charCodeAt(i - 1) === 48; --i) ;
  if (e = e.slice(r, i), e) {
    if (i -= r, t.e = n = n - r - 1, t.d = [], r = (n + 1) % O, n < 0 && (r += O), r < i) {
      for (r && t.d.push(+e.slice(0, r)), i -= O; r < i; ) t.d.push(+e.slice(r, r += O));
      e = e.slice(r), r = O - e.length;
    } else
      r -= i;
    for (; r--; ) e += "0";
    t.d.push(+e), P && (t.e > t.constructor.maxE ? (t.d = null, t.e = NaN) : t.e < t.constructor.minE && (t.e = 0, t.d = [0]));
  } else
    t.e = 0, t.d = [0];
  return t;
}
function Ih(t, e) {
  var n, r, i, o, s, c, a, u, f;
  if (e.indexOf("_") > -1) {
    if (e = e.replace(/(\d)_(?=\d)/g, "$1"), du.test(e)) return vr(t, e);
  } else if (e === "Infinity" || e === "NaN")
    return +e || (t.s = NaN), t.e = NaN, t.d = null, t;
  if (xh.test(e))
    n = 16, e = e.toLowerCase();
  else if (bh.test(e))
    n = 2;
  else if (Sh.test(e))
    n = 8;
  else
    throw Error(Ve + e);
  for (o = e.search(/p/i), o > 0 ? (a = +e.slice(o + 1), e = e.substring(2, o)) : e = e.slice(2), o = e.indexOf("."), s = o >= 0, r = t.constructor, s && (e = e.replace(".", ""), c = e.length, o = c - o, i = pu(r, new r(n), o, o * 2)), u = Sr(e, n, ne), f = u.length - 1, o = f; u[o] === 0; --o) u.pop();
  return o < 0 ? new r(t.s * 0) : (t.e = fi(u, f), t.d = u, P = !1, s && (t = W(t, i, c * 4)), a && (t = t.times(Math.abs(a) < 54 ? ft(2, a) : di.pow(2, a))), P = !0, t);
}
function Bh(t, e) {
  var n, r = e.d.length;
  if (r < 3)
    return e.isZero() ? e : kn(t, 2, e, e);
  n = 1.4 * Math.sqrt(r), n = n > 16 ? 16 : n | 0, e = e.times(1 / li(5, n)), e = kn(t, 2, e, e);
  for (var i, o = new t(5), s = new t(16), c = new t(20); n--; )
    i = e.times(e), e = e.times(o.plus(i.times(s.times(i).minus(c))));
  return e;
}
function kn(t, e, n, r, i) {
  var o, s, c, a, u = t.precision, f = Math.ceil(u / O);
  for (P = !1, a = n.times(n), c = new t(r); ; ) {
    if (s = W(c.times(a), new t(e++ * e++), u, 1), c = i ? r.plus(s) : r.minus(s), r = W(s.times(a), new t(e++ * e++), u, 1), s = c.plus(r), s.d[f] !== void 0) {
      for (o = f; s.d[o] === c.d[o] && o--; ) ;
      if (o == -1) break;
    }
    o = c, c = r, r = s, s = o;
  }
  return P = !0, s.d.length = f + 1, s;
}
function li(t, e) {
  for (var n = t; --e; ) n *= t;
  return n;
}
function yu(t, e) {
  var n, r = e.s < 0, i = se(t, t.precision, 1), o = i.times(0.5);
  if (e = e.abs(), e.lte(o))
    return Se = r ? 4 : 1, e;
  if (n = e.divToInt(i), n.isZero())
    Se = r ? 3 : 2;
  else {
    if (e = e.minus(n.times(i)), e.lte(o))
      return Se = Tc(n) ? r ? 2 : 3 : r ? 4 : 1, e;
    Se = Tc(n) ? r ? 1 : 4 : r ? 3 : 2;
  }
  return e.minus(i).abs();
}
function gs(t, e, n, r) {
  var i, o, s, c, a, u, f, l, d, h = t.constructor, y = n !== void 0;
  if (y ? (_t(n, 1, De), r === void 0 ? r = h.rounding : _t(r, 0, 8)) : (n = h.precision, r = h.rounding), !t.isFinite())
    f = gu(t);
  else {
    for (f = de(t), s = f.indexOf("."), y ? (i = 2, e == 16 ? n = n * 4 - 3 : e == 8 && (n = n * 3 - 2)) : i = e, s >= 0 && (f = f.replace(".", ""), d = new h(1), d.e = f.length - s, d.d = Sr(de(d), 10, i), d.e = d.d.length), l = Sr(f, 10, i), o = a = l.length; l[--a] == 0; ) l.pop();
    if (!l[0])
      f = y ? "0p+0" : "0";
    else {
      if (s < 0 ? o-- : (t = new h(t), t.d = l, t.e = o, t = W(t, d, n, r, 0, i), l = t.d, o = t.e, u = au), s = l[n], c = i / 2, u = u || l[n + 1] !== void 0, u = r < 4 ? (s !== void 0 || u) && (r === 0 || r === (t.s < 0 ? 3 : 2)) : s > c || s === c && (r === 4 || u || r === 6 && l[n - 1] & 1 || r === (t.s < 0 ? 8 : 7)), l.length = n, u)
        for (; ++l[--n] > i - 1; )
          l[n] = 0, n || (++o, l.unshift(1));
      for (a = l.length; !l[a - 1]; --a) ;
      for (s = 0, f = ""; s < a; s++) f += bo.charAt(l[s]);
      if (y) {
        if (a > 1)
          if (e == 16 || e == 8) {
            for (s = e == 16 ? 4 : 3, --a; a % s; a++) f += "0";
            for (l = Sr(f, i, e), a = l.length; !l[a - 1]; --a) ;
            for (s = 1, f = "1."; s < a; s++) f += bo.charAt(l[s]);
          } else
            f = f.charAt(0) + "." + f.slice(1);
        f = f + (o < 0 ? "p" : "p+") + o;
      } else if (o < 0) {
        for (; ++o; ) f = "0" + f;
        f = "0." + f;
      } else if (++o > a) for (o -= a; o--; ) f += "0";
      else o < a && (f = f.slice(0, o) + "." + f.slice(o));
    }
    f = (e == 16 ? "0x" : e == 2 ? "0b" : e == 8 ? "0o" : "") + f;
  }
  return t.s < 0 ? "-" + f : f;
}
function Ac(t, e) {
  if (t.length > e)
    return t.length = e, !0;
}
function kh(t) {
  return new this(t).abs();
}
function Nh(t) {
  return new this(t).acos();
}
function Uh(t) {
  return new this(t).acosh();
}
function $h(t, e) {
  return new this(t).plus(e);
}
function Lh(t) {
  return new this(t).asin();
}
function Ch(t) {
  return new this(t).asinh();
}
function Rh(t) {
  return new this(t).atan();
}
function _h(t) {
  return new this(t).atanh();
}
function Oh(t, e) {
  t = new this(t), e = new this(e);
  var n, r = this.precision, i = this.rounding, o = r + 4;
  return !t.s || !e.s ? n = new this(NaN) : !t.d && !e.d ? (n = se(this, o, 1).times(e.s > 0 ? 0.25 : 0.75), n.s = t.s) : !e.d || t.isZero() ? (n = e.s < 0 ? se(this, r, i) : new this(0), n.s = t.s) : !t.d || e.isZero() ? (n = se(this, o, 1).times(0.5), n.s = t.s) : e.s < 0 ? (this.precision = o, this.rounding = 1, n = this.atan(W(t, e, o, 1)), e = se(this, o, 1), this.precision = r, this.rounding = i, n = t.s < 0 ? n.minus(e) : n.plus(e)) : n = this.atan(W(t, e, o, 1)), n;
}
function Ph(t) {
  return new this(t).cbrt();
}
function Hh(t) {
  return _(t = new this(t), t.e + 1, 2);
}
function Mh(t, e, n) {
  return new this(t).clamp(e, n);
}
function Vh(t) {
  if (!t || typeof t != "object") throw Error(ui + "Object expected");
  var e, n, r, i = t.defaults === !0, o = [
    "precision",
    1,
    De,
    "rounding",
    0,
    8,
    "toExpNeg",
    -9e15,
    0,
    "toExpPos",
    0,
    Eo,
    "maxE",
    0,
    Eo,
    "minE",
    -9e15,
    0,
    "modulo",
    0,
    9
  ];
  for (e = 0; e < o.length; e += 3)
    if (n = o[e], i && (this[n] = xo[n]), (r = t[n]) !== void 0)
      if (It(r) === r && r >= o[e + 1] && r <= o[e + 2]) this[n] = r;
      else throw Error(Ve + n + ": " + r);
  if (n = "crypto", i && (this[n] = xo[n]), (r = t[n]) !== void 0)
    if (r === !0 || r === !1 || r === 0 || r === 1)
      if (r)
        if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
          this[n] = !0;
        else
          throw Error(fu);
      else
        this[n] = !1;
    else
      throw Error(Ve + n + ": " + r);
  return this;
}
function Dh(t) {
  return new this(t).cos();
}
function Fh(t) {
  return new this(t).cosh();
}
function mu(t) {
  var e, n, r;
  function i(o) {
    var s, c, a, u = this;
    if (!(u instanceof i)) return new i(o);
    if (u.constructor = i, Ic(o)) {
      u.s = o.s, P ? !o.d || o.e > i.maxE ? (u.e = NaN, u.d = null) : o.e < i.minE ? (u.e = 0, u.d = [0]) : (u.e = o.e, u.d = o.d.slice()) : (u.e = o.e, u.d = o.d ? o.d.slice() : o.d);
      return;
    }
    if (a = typeof o, a === "number") {
      if (o === 0) {
        u.s = 1 / o < 0 ? -1 : 1, u.e = 0, u.d = [0];
        return;
      }
      if (o < 0 ? (o = -o, u.s = -1) : u.s = 1, o === ~~o && o < 1e7) {
        for (s = 0, c = o; c >= 10; c /= 10) s++;
        P ? s > i.maxE ? (u.e = NaN, u.d = null) : s < i.minE ? (u.e = 0, u.d = [0]) : (u.e = s, u.d = [o]) : (u.e = s, u.d = [o]);
        return;
      }
      if (o * 0 !== 0) {
        o || (u.s = NaN), u.e = NaN, u.d = null;
        return;
      }
      return vr(u, o.toString());
    }
    if (a === "string")
      return (c = o.charCodeAt(0)) === 45 ? (o = o.slice(1), u.s = -1) : (c === 43 && (o = o.slice(1)), u.s = 1), du.test(o) ? vr(u, o) : Ih(u, o);
    if (a === "bigint")
      return o < 0 ? (o = -o, u.s = -1) : u.s = 1, vr(u, o.toString());
    throw Error(Ve + o);
  }
  if (i.prototype = A, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.EUCLID = 9, i.config = i.set = Vh, i.clone = mu, i.isDecimal = Ic, i.abs = kh, i.acos = Nh, i.acosh = Uh, i.add = $h, i.asin = Lh, i.asinh = Ch, i.atan = Rh, i.atanh = _h, i.atan2 = Oh, i.cbrt = Ph, i.ceil = Hh, i.clamp = Mh, i.cos = Dh, i.cosh = Fh, i.div = Kh, i.exp = qh, i.floor = zh, i.hypot = Gh, i.ln = Wh, i.log = Zh, i.log10 = Yh, i.log2 = jh, i.max = Xh, i.min = Qh, i.mod = Jh, i.mul = tp, i.pow = ep, i.random = np, i.round = rp, i.sign = ip, i.sin = op, i.sinh = sp, i.sqrt = cp, i.sub = ap, i.sum = up, i.tan = fp, i.tanh = lp, i.trunc = dp, t === void 0 && (t = {}), t && t.defaults !== !0)
    for (r = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], e = 0; e < r.length; ) t.hasOwnProperty(n = r[e++]) || (t[n] = this[n]);
  return i.config(t), i;
}
function Kh(t, e) {
  return new this(t).div(e);
}
function qh(t) {
  return new this(t).exp();
}
function zh(t) {
  return _(t = new this(t), t.e + 1, 3);
}
function Gh() {
  var t, e, n = new this(0);
  for (P = !1, t = 0; t < arguments.length; )
    if (e = new this(arguments[t++]), e.d)
      n.d && (n = n.plus(e.times(e)));
    else {
      if (e.s)
        return P = !0, new this(1 / 0);
      n = e;
    }
  return P = !0, n.sqrt();
}
function Ic(t) {
  return t instanceof di || t && t.toStringTag === lu || !1;
}
function Wh(t) {
  return new this(t).ln();
}
function Zh(t, e) {
  return new this(t).log(e);
}
function jh(t) {
  return new this(t).log(2);
}
function Yh(t) {
  return new this(t).log(10);
}
function Xh() {
  return wu(this, arguments, -1);
}
function Qh() {
  return wu(this, arguments, 1);
}
function Jh(t, e) {
  return new this(t).mod(e);
}
function tp(t, e) {
  return new this(t).mul(e);
}
function ep(t, e) {
  return new this(t).pow(e);
}
function np(t) {
  var e, n, r, i, o = 0, s = new this(1), c = [];
  if (t === void 0 ? t = this.precision : _t(t, 1, De), r = Math.ceil(t / O), this.crypto)
    if (crypto.getRandomValues)
      for (e = crypto.getRandomValues(new Uint32Array(r)); o < r; )
        i = e[o], i >= 429e7 ? e[o] = crypto.getRandomValues(new Uint32Array(1))[0] : c[o++] = i % 1e7;
    else if (crypto.randomBytes) {
      for (e = crypto.randomBytes(r *= 4); o < r; )
        i = e[o] + (e[o + 1] << 8) + (e[o + 2] << 16) + ((e[o + 3] & 127) << 24), i >= 214e7 ? crypto.randomBytes(4).copy(e, o) : (c.push(i % 1e7), o += 4);
      o = r / 4;
    } else
      throw Error(fu);
  else for (; o < r; ) c[o++] = Math.random() * 1e7 | 0;
  for (r = c[--o], t %= O, r && t && (i = ft(10, O - t), c[o] = (r / i | 0) * i); c[o] === 0; o--) c.pop();
  if (o < 0)
    n = 0, c = [0];
  else {
    for (n = -1; c[0] === 0; n -= O) c.shift();
    for (r = 1, i = c[0]; i >= 10; i /= 10) r++;
    r < O && (n -= O - r);
  }
  return s.e = n, s.d = c, s;
}
function rp(t) {
  return _(t = new this(t), t.e + 1, this.rounding);
}
function ip(t) {
  return t = new this(t), t.d ? t.d[0] ? t.s : 0 * t.s : t.s || NaN;
}
function op(t) {
  return new this(t).sin();
}
function sp(t) {
  return new this(t).sinh();
}
function cp(t) {
  return new this(t).sqrt();
}
function ap(t, e) {
  return new this(t).sub(e);
}
function up() {
  var t = 0, e = arguments, n = new this(e[t]);
  for (P = !1; n.s && ++t < e.length; ) n = n.plus(e[t]);
  return P = !0, _(n, this.precision, this.rounding);
}
function fp(t) {
  return new this(t).tan();
}
function lp(t) {
  return new this(t).tanh();
}
function dp(t) {
  return _(t = new this(t), t.e + 1, 1);
}
A[Symbol.for("nodejs.util.inspect.custom")] = A.toString;
A[Symbol.toStringTag] = "Decimal";
var di = A.constructor = mu(xo);
zr = new di(zr);
Gr = new di(Gr);
const hp = (t, e = !1) => {
  const n = typeof t == "string" ? Math.floor(new Date(t).getTime() / 1e3) : t, r = Math.floor(Date.now() / 1e3), i = Math.floor(r - n);
  return i === 0 ? "just now" : i > 0 ? `${Bc(i, e)} ago` : i < 0 ? `in ${Bc(i, e)}` : "";
}, Bc = (t, e = !0) => {
  const n = Math.abs(t);
  return n > 86400 ? `${Math.floor(n / 86400)}${e ? " days" : "d"}` : n > 3600 ? `${Math.floor(n / 3600)}${e ? " hours" : "h"}` : n > 60 ? `${Math.floor(n / 60)}${e ? " minutes" : "m"}` : n > 0 ? `${n}${e ? " seconds" : "s"}` : "";
}, pp = new mh();
pp.start().catch(console.error);
function wp(t, e) {
  self.registration.showNotification(t, { body: e, icon: "/arkade-icon-220.png" });
}
function gp(t) {
  const e = `Virtual coins expiring ${hp(t)}`;
  wp(e, "Open wallet to renew virtual coins");
}
function yp(t) {
  return t.spendableVtxos ? t.spendableVtxos.reduce((e, n) => {
    const r = parseInt(n.expireAt);
    return r < e || e === 0 ? r : e;
  }, 0) : 0;
}
async function mp(t, e) {
  try {
    const n = { "Content-Type": "application/json" };
    return await (await fetch(`${e}/v1/vtxos/${t}`, { headers: n })).json();
  } catch {
    return {};
  }
}
async function Ep(t, e) {
  const n = await mp(t, e), r = yp(n);
  Eh(r) && gp(r);
}
self.addEventListener("message", (t) => {
  let e;
  if (!t.data) return;
  const { data: n, type: r } = t.data;
  r === "SKIP_WAITING" && self.skipWaiting(), r === "START_CHECK" && n && (e = window.setInterval(() => {
    Ep(n.arkAddress, n.serverUrl);
  }, 4 * 60 * 60 * 1e3)), r === "STOP_CHECK" && e && clearInterval(e);
});
