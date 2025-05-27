function ma(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Yd(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ae(t, ...e) {
  if (!Yd(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Zd(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  ma(t.outputLen), ma(t.blockLen);
}
function Ai(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Xd(t, e) {
  Ae(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const lr = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Gs(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function Ze(t, e) {
  return t << 32 - e | t >>> e;
}
function ai(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function Qd(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Qa(t) {
  return typeof t == "string" && (t = Qd(t)), Ae(t), t;
}
function Jd(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Ae(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
let Df = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function Mf(t) {
  const e = (r) => t().update(Qa(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Ja(t = 32) {
  if (lr && typeof lr.getRandomValues == "function")
    return lr.getRandomValues(new Uint8Array(t));
  if (lr && typeof lr.randomBytes == "function")
    return lr.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function th(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), c = Number(n >> o & s), u = Number(n & s), f = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + f, c, r), t.setUint32(e + h, u, r);
}
function eh(t, e, n) {
  return t & e ^ ~t & n;
}
function nh(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
let Ff = class extends Df {
  constructor(e, n, r, o) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Gs(this.buffer);
  }
  update(e) {
    Ai(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = Qa(e);
    const s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const f = Gs(e);
        for (; o <= s - c; c += o)
          this.process(f, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Ai(this), Xd(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, this.buffer.subarray(c).fill(0), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let g = c; g < o; g++)
      n[g] = 0;
    th(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = Gs(e), f = this.outputLen;
    if (f % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = f / 4, y = this.get();
    if (h > y.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let g = 0; g < h; g++)
      u.setUint32(4 * g, y[g], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: s, destroyed: c, pos: u } = this;
    return e.length = o, e.pos = u, e.finished = s, e.destroyed = c, o % n && e.buffer.set(r), e;
  }
};
const rh = /* @__PURE__ */ new Uint32Array([
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
]), An = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), kn = /* @__PURE__ */ new Uint32Array(64);
let oh = class extends Ff {
  constructor() {
    super(64, 32, 8, !1), this.A = An[0] | 0, this.B = An[1] | 0, this.C = An[2] | 0, this.D = An[3] | 0, this.E = An[4] | 0, this.F = An[5] | 0, this.G = An[6] | 0, this.H = An[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: o, E: s, F: c, G: u, H: f } = this;
    return [e, n, r, o, s, c, u, f];
  }
  // prettier-ignore
  set(e, n, r, o, s, c, u, f) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = s | 0, this.F = c | 0, this.G = u | 0, this.H = f | 0;
  }
  process(e, n) {
    for (let g = 0; g < 16; g++, n += 4)
      kn[g] = e.getUint32(n, !1);
    for (let g = 16; g < 64; g++) {
      const m = kn[g - 15], E = kn[g - 2], A = Ze(m, 7) ^ Ze(m, 18) ^ m >>> 3, T = Ze(E, 17) ^ Ze(E, 19) ^ E >>> 10;
      kn[g] = T + kn[g - 7] + A + kn[g - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: f, G: h, H: y } = this;
    for (let g = 0; g < 64; g++) {
      const m = Ze(u, 6) ^ Ze(u, 11) ^ Ze(u, 25), E = y + m + eh(u, f, h) + rh[g] + kn[g] | 0, T = (Ze(r, 2) ^ Ze(r, 13) ^ Ze(r, 22)) + nh(r, o, s) | 0;
      y = h, h = f, f = u, u = c + E | 0, c = s, s = o, o = r, r = E + T | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, c = c + this.D | 0, u = u + this.E | 0, f = f + this.F | 0, h = h + this.G | 0, y = y + this.H | 0, this.set(r, o, s, c, u, f, h, y);
  }
  roundClean() {
    kn.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const Se = /* @__PURE__ */ Mf(() => new oh());
let Hf = class extends Df {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Zd(e);
    const r = Qa(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o = this.blockLen, s = new Uint8Array(o);
    s.set(r.length > o ? e.create().update(r).digest() : r);
    for (let c = 0; c < s.length; c++)
      s[c] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let c = 0; c < s.length; c++)
      s[c] ^= 106;
    this.oHash.update(s), s.fill(0);
  }
  update(e) {
    return Ai(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Ai(this), Ae(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: o, destroyed: s, blockLen: c, outputLen: u } = this;
    return e = e, e.finished = o, e.destroyed = s, e.blockLen = c, e.outputLen = u, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Vf = (t, e, n) => new Hf(t, e).update(n).digest();
Vf.create = (t, e) => new Hf(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Yi = /* @__PURE__ */ BigInt(0), Zi = /* @__PURE__ */ BigInt(1), ih = /* @__PURE__ */ BigInt(2);
function er(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ao(t) {
  if (!er(t))
    throw new Error("Uint8Array expected");
}
function xr(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const sh = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Sr(t) {
  Ao(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += sh[t[n]];
  return e;
}
function pr(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function tc(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Yi : BigInt("0x" + t);
}
const sn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ku(t) {
  if (t >= sn._0 && t <= sn._9)
    return t - sn._0;
  if (t >= sn.A && t <= sn.F)
    return t - (sn.A - 10);
  if (t >= sn.a && t <= sn.f)
    return t - (sn.a - 10);
}
function Ar(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = ku(t.charCodeAt(s)), u = ku(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const f = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function ke(t) {
  return tc(Sr(t));
}
function ec(t) {
  return Ao(t), tc(Sr(Uint8Array.from(t).reverse()));
}
function qe(t, e) {
  return Ar(t.toString(16).padStart(e * 2, "0"));
}
function nc(t, e) {
  return qe(t, e).reverse();
}
function ah(t) {
  return Ar(pr(t));
}
function ye(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Ar(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (er(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function $n(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Ao(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function kr(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function ch(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const Ws = (t) => typeof t == "bigint" && Yi <= t;
function Tr(t, e, n) {
  return Ws(t) && Ws(e) && Ws(n) && e <= t && t < n;
}
function Ue(t, e, n, r) {
  if (!Tr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function qf(t) {
  let e;
  for (e = 0; t > Yi; t >>= Zi, e += 1)
    ;
  return e;
}
function uh(t, e) {
  return t >> BigInt(e) & Zi;
}
function fh(t, e, n) {
  return t | (n ? Zi : Yi) << BigInt(e);
}
const rc = (t) => (ih << BigInt(t - 1)) - Zi, Ys = (t) => new Uint8Array(t), Tu = (t) => Uint8Array.from(t);
function jf(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Ys(t), o = Ys(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...g) => n(o, r, ...g), f = (g = Ys()) => {
    o = u(Tu([0]), g), r = u(), g.length !== 0 && (o = u(Tu([1]), g), r = u());
  }, h = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let g = 0;
    const m = [];
    for (; g < e; ) {
      r = u();
      const E = r.slice();
      m.push(E), g += r.length;
    }
    return $n(...m);
  };
  return (g, m) => {
    c(), f(g);
    let E;
    for (; !(E = m(h())); )
      f();
    return c(), E;
  };
}
const lh = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || er(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function ko(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = lh[s];
    if (typeof u != "function")
      throw new Error("invalid validator function");
    const f = t[o];
    if (!(c && f === void 0) && !u(f, t))
      throw new Error("param " + String(o) + " is invalid. Expected " + s + ", got " + f);
  };
  for (const [o, s] of Object.entries(e))
    r(o, s, !1);
  for (const [o, s] of Object.entries(n))
    r(o, s, !0);
  return t;
}
const dh = () => {
  throw new Error("not implemented");
};
function ba(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
const hh = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Ue,
  abool: xr,
  abytes: Ao,
  bitGet: uh,
  bitLen: qf,
  bitMask: rc,
  bitSet: fh,
  bytesToHex: Sr,
  bytesToNumberBE: ke,
  bytesToNumberLE: ec,
  concatBytes: $n,
  createHmacDrbg: jf,
  ensureBytes: ye,
  equalBytes: kr,
  hexToBytes: Ar,
  hexToNumber: tc,
  inRange: Tr,
  isBytes: er,
  memoized: ba,
  notImplemented: dh,
  numberToBytesBE: qe,
  numberToBytesLE: nc,
  numberToHexUnpadded: pr,
  numberToVarBytesBE: ah,
  utf8ToBytes: ch,
  validateObject: ko
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const oe = BigInt(0), Vt = BigInt(1), Zn = /* @__PURE__ */ BigInt(2), ph = /* @__PURE__ */ BigInt(3), va = /* @__PURE__ */ BigInt(4), Iu = /* @__PURE__ */ BigInt(5), Bu = /* @__PURE__ */ BigInt(8);
function re(t, e) {
  const n = t % e;
  return n >= oe ? n : e + n;
}
function gh(t, e, n) {
  if (e < oe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= oe)
    throw new Error("invalid modulus");
  if (n === Vt)
    return oe;
  let r = Vt;
  for (; e > oe; )
    e & Vt && (r = r * t % n), t = t * t % n, e >>= Vt;
  return r;
}
function Re(t, e, n) {
  let r = t;
  for (; e-- > oe; )
    r *= r, r %= n;
  return r;
}
function Ea(t, e) {
  if (t === oe)
    throw new Error("invert: expected non-zero number");
  if (e <= oe)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = re(t, e), r = e, o = oe, s = Vt;
  for (; n !== oe; ) {
    const u = r / n, f = r % n, h = o - s * u;
    r = n, n = f, o = s, s = h;
  }
  if (r !== Vt)
    throw new Error("invert: does not exist");
  return re(o, e);
}
function yh(t) {
  const e = (t - Vt) / Zn;
  let n, r, o;
  for (n = t - Vt, r = 0; n % Zn === oe; n /= Zn, r++)
    ;
  for (o = Zn; o < t && gh(o, e, t) !== t - Vt; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const c = (t + Vt) / va;
    return function(f, h) {
      const y = f.pow(h, c);
      if (!f.eql(f.sqr(y), h))
        throw new Error("Cannot find square root");
      return y;
    };
  }
  const s = (n + Vt) / Zn;
  return function(u, f) {
    if (u.pow(f, e) === u.neg(u.ONE))
      throw new Error("Cannot find square root");
    let h = r, y = u.pow(u.mul(u.ONE, o), n), g = u.pow(f, s), m = u.pow(f, n);
    for (; !u.eql(m, u.ONE); ) {
      if (u.eql(m, u.ZERO))
        return u.ZERO;
      let E = 1;
      for (let T = u.sqr(m); E < h && !u.eql(T, u.ONE); E++)
        T = u.sqr(T);
      const A = u.pow(y, Vt << BigInt(h - E - 1));
      y = u.sqr(A), g = u.mul(g, A), m = u.mul(m, y), h = E;
    }
    return g;
  };
}
function wh(t) {
  if (t % va === ph) {
    const e = (t + Vt) / va;
    return function(r, o) {
      const s = r.pow(o, e);
      if (!r.eql(r.sqr(s), o))
        throw new Error("Cannot find square root");
      return s;
    };
  }
  if (t % Bu === Iu) {
    const e = (t - Iu) / Bu;
    return function(r, o) {
      const s = r.mul(o, Zn), c = r.pow(s, e), u = r.mul(o, c), f = r.mul(r.mul(u, Zn), c), h = r.mul(u, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(h), o))
        throw new Error("Cannot find square root");
      return h;
    };
  }
  return yh(t);
}
const mh = [
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
function bh(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = mh.reduce((r, o) => (r[o] = "function", r), e);
  return ko(t, n);
}
function vh(t, e, n) {
  if (n < oe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === oe)
    return t.ONE;
  if (n === Vt)
    return e;
  let r = t.ONE, o = e;
  for (; n > oe; )
    n & Vt && (r = t.mul(r, o)), o = t.sqr(o), n >>= Vt;
  return r;
}
function Eh(t, e) {
  const n = new Array(e.length), r = e.reduce((s, c, u) => t.is0(c) ? s : (n[u] = s, t.mul(s, c)), t.ONE), o = t.inv(r);
  return e.reduceRight((s, c, u) => t.is0(c) ? s : (n[u] = t.mul(s, n[u]), t.mul(s, c)), o), n;
}
function zf(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Gf(t, e, n = !1, r = {}) {
  if (t <= oe)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: s } = zf(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const u = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: o,
    BYTES: s,
    MASK: rc(o),
    ZERO: oe,
    ONE: Vt,
    create: (f) => re(f, t),
    isValid: (f) => {
      if (typeof f != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof f);
      return oe <= f && f < t;
    },
    is0: (f) => f === oe,
    isOdd: (f) => (f & Vt) === Vt,
    neg: (f) => re(-f, t),
    eql: (f, h) => f === h,
    sqr: (f) => re(f * f, t),
    add: (f, h) => re(f + h, t),
    sub: (f, h) => re(f - h, t),
    mul: (f, h) => re(f * h, t),
    pow: (f, h) => vh(u, f, h),
    div: (f, h) => re(f * Ea(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, h) => f + h,
    subN: (f, h) => f - h,
    mulN: (f, h) => f * h,
    inv: (f) => Ea(f, t),
    sqrt: r.sqrt || ((f) => (c || (c = wh(t)), c(u, f))),
    invertBatch: (f) => Eh(u, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, h, y) => y ? h : f,
    toBytes: (f) => n ? nc(f, s) : qe(f, s),
    fromBytes: (f) => {
      if (f.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + f.length);
      return n ? ec(f) : ke(f);
    }
  });
  return Object.freeze(u);
}
function Wf(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Yf(t) {
  const e = Wf(t);
  return e + Math.ceil(e / 2);
}
function xh(t, e, n = !1) {
  const r = t.length, o = Wf(e), s = Yf(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? ec(t) : ke(t), u = re(c, e - Vt) + Vt;
  return n ? nc(u, o) : qe(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _u = BigInt(0), ci = BigInt(1);
function Zs(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Zf(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Xs(t, e) {
  Zf(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function Sh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Ah(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Qs = /* @__PURE__ */ new WeakMap(), Xf = /* @__PURE__ */ new WeakMap();
function Js(t) {
  return Xf.get(t) || 1;
}
function kh(t, e) {
  return {
    constTimeNegate: Zs,
    hasPrecomputes(n) {
      return Js(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > _u; )
        r & ci && (o = o.add(s)), s = s.double(), r >>= ci;
      return o;
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
      const { windows: o, windowSize: s } = Xs(r, e), c = [];
      let u = n, f = u;
      for (let h = 0; h < o; h++) {
        f = u, c.push(f);
        for (let y = 1; y < s; y++)
          f = f.add(u), c.push(f);
        u = f.double();
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
    wNAF(n, r, o) {
      const { windows: s, windowSize: c } = Xs(n, e);
      let u = t.ZERO, f = t.BASE;
      const h = BigInt(2 ** n - 1), y = 2 ** n, g = BigInt(n);
      for (let m = 0; m < s; m++) {
        const E = m * c;
        let A = Number(o & h);
        o >>= g, A > c && (A -= y, o += ci);
        const T = E, b = E + Math.abs(A) - 1, B = m % 2 !== 0, O = A < 0;
        A === 0 ? f = f.add(Zs(B, r[T])) : u = u.add(Zs(O, r[b]));
      }
      return { p: u, f };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, o, s = t.ZERO) {
      const { windows: c, windowSize: u } = Xs(n, e), f = BigInt(2 ** n - 1), h = 2 ** n, y = BigInt(n);
      for (let g = 0; g < c; g++) {
        const m = g * u;
        if (o === _u)
          break;
        let E = Number(o & f);
        if (o >>= y, E > u && (E -= h, o += ci), E === 0)
          continue;
        let A = r[m + Math.abs(E) - 1];
        E < 0 && (A = A.negate()), s = s.add(A);
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = Qs.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && Qs.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = Js(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = Js(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Zf(r, e), Xf.set(n, r), Qs.delete(n);
    }
  };
}
function Th(t, e, n, r) {
  if (Sh(n, t), Ah(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, s = qf(BigInt(n.length)), c = s > 12 ? s - 3 : s > 4 ? s - 2 : s ? 2 : 1, u = (1 << c) - 1, f = new Array(u + 1).fill(o), h = Math.floor((e.BITS - 1) / c) * c;
  let y = o;
  for (let g = h; g >= 0; g -= c) {
    f.fill(o);
    for (let E = 0; E < r.length; E++) {
      const A = r[E], T = Number(A >> BigInt(g) & BigInt(u));
      f[T] = f[T].add(n[E]);
    }
    let m = o;
    for (let E = f.length - 1, A = o; E > 0; E--)
      A = A.add(f[E]), m = m.add(A);
    if (y = y.add(m), g !== 0)
      for (let E = 0; E < c; E++)
        y = y.double();
  }
  return y;
}
function Qf(t) {
  return bh(t.Fp), ko(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...zf(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Nu(t) {
  t.lowS !== void 0 && xr("lowS", t.lowS), t.prehash !== void 0 && xr("prehash", t.prehash);
}
function Ih(t) {
  const e = Qf(t);
  ko(e, {
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
  const { endo: n, Fp: r, a: o } = e;
  if (n) {
    if (!r.eql(o, r.ZERO))
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e });
}
const { bytesToNumberBE: Bh, hexToBytes: _h } = hh;
class Nh extends Error {
  constructor(e = "") {
    super(e);
  }
}
const un = {
  // asn.1 DER encoding utils
  Err: Nh,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = un;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = pr(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? pr(o.length / 2 | 128) : "";
      return pr(t) + s + o + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = un;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const o = e[r++], s = !!(o & 128);
      let c = 0;
      if (!s)
        c = o;
      else {
        const f = o & 127;
        if (!f)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (f > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const h = e.subarray(r, r + f);
        if (h.length !== f)
          throw new n("tlv.decode: length bytes not complete");
        if (h[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const y of h)
          c = c << 8 | y;
        if (r += f, c < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const u = e.subarray(r, r + c);
      if (u.length !== c)
        throw new n("tlv.decode: wrong value length");
      return { v: u, l: e.subarray(r + c) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = un;
      if (t < dn)
        throw new e("integer: negative integers are not allowed");
      let n = pr(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = un;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return Bh(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = un, o = typeof t == "string" ? _h(t) : t;
    Ao(o);
    const { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l: f } = r.decode(2, s), { v: h, l: y } = r.decode(2, f);
    if (y.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(h) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = un, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
}, dn = BigInt(0), ee = BigInt(1);
BigInt(2);
const Cu = BigInt(3);
BigInt(4);
function Ch(t) {
  const e = Ih(t), { Fp: n } = e, r = Gf(e.n, e.nBitLength), o = e.toBytes || ((T, b, B) => {
    const O = b.toAffine();
    return $n(Uint8Array.from([4]), n.toBytes(O.x), n.toBytes(O.y));
  }), s = e.fromBytes || ((T) => {
    const b = T.subarray(1), B = n.fromBytes(b.subarray(0, n.BYTES)), O = n.fromBytes(b.subarray(n.BYTES, 2 * n.BYTES));
    return { x: B, y: O };
  });
  function c(T) {
    const { a: b, b: B } = e, O = n.sqr(T), D = n.mul(O, T);
    return n.add(n.add(D, n.mul(T, b)), B);
  }
  if (!n.eql(n.sqr(e.Gy), c(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function u(T) {
    return Tr(T, ee, e.n);
  }
  function f(T) {
    const { allowedPrivateKeyLengths: b, nByteLength: B, wrapPrivateKey: O, n: D } = e;
    if (b && typeof T != "bigint") {
      if (er(T) && (T = Sr(T)), typeof T != "string" || !b.includes(T.length))
        throw new Error("invalid private key");
      T = T.padStart(B * 2, "0");
    }
    let j;
    try {
      j = typeof T == "bigint" ? T : ke(ye("private key", T, B));
    } catch {
      throw new Error("invalid private key, expected hex or " + B + " bytes, got " + typeof T);
    }
    return O && (j = re(j, D)), Ue("private key", j, ee, D), j;
  }
  function h(T) {
    if (!(T instanceof m))
      throw new Error("ProjectivePoint expected");
  }
  const y = ba((T, b) => {
    const { px: B, py: O, pz: D } = T;
    if (n.eql(D, n.ONE))
      return { x: B, y: O };
    const j = T.is0();
    b == null && (b = j ? n.ONE : n.inv(D));
    const G = n.mul(B, b), W = n.mul(O, b), z = n.mul(D, b);
    if (j)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: G, y: W };
  }), g = ba((T) => {
    if (T.is0()) {
      if (e.allowInfinityPoint && !n.is0(T.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: B } = T.toAffine();
    if (!n.isValid(b) || !n.isValid(B))
      throw new Error("bad point: x or y not FE");
    const O = n.sqr(B), D = c(b);
    if (!n.eql(O, D))
      throw new Error("bad point: equation left != right");
    if (!T.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class m {
    constructor(b, B, O) {
      if (this.px = b, this.py = B, this.pz = O, b == null || !n.isValid(b))
        throw new Error("x required");
      if (B == null || !n.isValid(B))
        throw new Error("y required");
      if (O == null || !n.isValid(O))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(b) {
      const { x: B, y: O } = b || {};
      if (!b || !n.isValid(B) || !n.isValid(O))
        throw new Error("invalid affine point");
      if (b instanceof m)
        throw new Error("projective point not allowed");
      const D = (j) => n.eql(j, n.ZERO);
      return D(B) && D(O) ? m.ZERO : new m(B, O, n.ONE);
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
    static normalizeZ(b) {
      const B = n.invertBatch(b.map((O) => O.pz));
      return b.map((O, D) => O.toAffine(B[D])).map(m.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(b) {
      const B = m.fromAffine(s(ye("pointHex", b)));
      return B.assertValidity(), B;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(b) {
      return m.BASE.multiply(f(b));
    }
    // Multiscalar Multiplication
    static msm(b, B) {
      return Th(m, r, b, B);
    }
    // "Private method", don't use it directly
    _setWindowSize(b) {
      A.setWindowSize(this, b);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(b);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b, z = n.eql(n.mul(B, W), n.mul(j, D)), nt = n.eql(n.mul(O, W), n.mul(G, D));
      return z && nt;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new m(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: b, b: B } = e, O = n.mul(B, Cu), { px: D, py: j, pz: G } = this;
      let W = n.ZERO, z = n.ZERO, nt = n.ZERO, Q = n.mul(D, D), wt = n.mul(j, j), H = n.mul(G, G), Y = n.mul(D, j);
      return Y = n.add(Y, Y), nt = n.mul(D, G), nt = n.add(nt, nt), W = n.mul(b, nt), z = n.mul(O, H), z = n.add(W, z), W = n.sub(wt, z), z = n.add(wt, z), z = n.mul(W, z), W = n.mul(Y, W), nt = n.mul(O, nt), H = n.mul(b, H), Y = n.sub(Q, H), Y = n.mul(b, Y), Y = n.add(Y, nt), nt = n.add(Q, Q), Q = n.add(nt, Q), Q = n.add(Q, H), Q = n.mul(Q, Y), z = n.add(z, Q), H = n.mul(j, G), H = n.add(H, H), Q = n.mul(H, Y), W = n.sub(W, Q), nt = n.mul(H, wt), nt = n.add(nt, nt), nt = n.add(nt, nt), new m(W, z, nt);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b;
      let z = n.ZERO, nt = n.ZERO, Q = n.ZERO;
      const wt = e.a, H = n.mul(e.b, Cu);
      let Y = n.mul(B, j), xt = n.mul(O, G), M = n.mul(D, W), V = n.add(B, O), q = n.add(j, G);
      V = n.mul(V, q), q = n.add(Y, xt), V = n.sub(V, q), q = n.add(B, D);
      let rt = n.add(j, W);
      return q = n.mul(q, rt), rt = n.add(Y, M), q = n.sub(q, rt), rt = n.add(O, D), z = n.add(G, W), rt = n.mul(rt, z), z = n.add(xt, M), rt = n.sub(rt, z), Q = n.mul(wt, q), z = n.mul(H, M), Q = n.add(z, Q), z = n.sub(xt, Q), Q = n.add(xt, Q), nt = n.mul(z, Q), xt = n.add(Y, Y), xt = n.add(xt, Y), M = n.mul(wt, M), q = n.mul(H, q), xt = n.add(xt, M), M = n.sub(Y, M), M = n.mul(wt, M), q = n.add(q, M), Y = n.mul(xt, q), nt = n.add(nt, Y), Y = n.mul(rt, q), z = n.mul(V, z), z = n.sub(z, Y), Y = n.mul(V, xt), Q = n.mul(rt, Q), Q = n.add(Q, Y), new m(z, nt, Q);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    is0() {
      return this.equals(m.ZERO);
    }
    wNAF(b) {
      return A.wNAFCached(this, b, m.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(b) {
      const { endo: B, n: O } = e;
      Ue("scalar", b, dn, O);
      const D = m.ZERO;
      if (b === dn)
        return D;
      if (this.is0() || b === ee)
        return this;
      if (!B || A.hasPrecomputes(this))
        return A.wNAFCachedUnsafe(this, b, m.normalizeZ);
      let { k1neg: j, k1: G, k2neg: W, k2: z } = B.splitScalar(b), nt = D, Q = D, wt = this;
      for (; G > dn || z > dn; )
        G & ee && (nt = nt.add(wt)), z & ee && (Q = Q.add(wt)), wt = wt.double(), G >>= ee, z >>= ee;
      return j && (nt = nt.negate()), W && (Q = Q.negate()), Q = new m(n.mul(Q.px, B.beta), Q.py, Q.pz), nt.add(Q);
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
      const { endo: B, n: O } = e;
      Ue("scalar", b, ee, O);
      let D, j;
      if (B) {
        const { k1neg: G, k1: W, k2neg: z, k2: nt } = B.splitScalar(b);
        let { p: Q, f: wt } = this.wNAF(W), { p: H, f: Y } = this.wNAF(nt);
        Q = A.constTimeNegate(G, Q), H = A.constTimeNegate(z, H), H = new m(n.mul(H.px, B.beta), H.py, H.pz), D = Q.add(H), j = wt.add(Y);
      } else {
        const { p: G, f: W } = this.wNAF(b);
        D = G, j = W;
      }
      return m.normalizeZ([D, j])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(b, B, O) {
      const D = m.BASE, j = (W, z) => z === dn || z === ee || !W.equals(D) ? W.multiplyUnsafe(z) : W.multiply(z), G = j(this, B).add(j(b, O));
      return G.is0() ? void 0 : G;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(b) {
      return y(this, b);
    }
    isTorsionFree() {
      const { h: b, isTorsionFree: B } = e;
      if (b === ee)
        return !0;
      if (B)
        return B(m, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: b, clearCofactor: B } = e;
      return b === ee ? this : B ? B(m, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(b = !0) {
      return xr("isCompressed", b), this.assertValidity(), o(m, this, b);
    }
    toHex(b = !0) {
      return xr("isCompressed", b), Sr(this.toRawBytes(b));
    }
  }
  m.BASE = new m(e.Gx, e.Gy, n.ONE), m.ZERO = new m(n.ZERO, n.ONE, n.ZERO);
  const E = e.nBitLength, A = kh(m, e.endo ? Math.ceil(E / 2) : E);
  return {
    CURVE: e,
    ProjectivePoint: m,
    normPrivateKeyToScalar: f,
    weierstrassEquation: c,
    isWithinCurveOrder: u
  };
}
function Uh(t) {
  const e = Qf(t);
  return ko(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function $h(t) {
  const e = Uh(t), { Fp: n, n: r } = e, o = n.BYTES + 1, s = 2 * n.BYTES + 1;
  function c(M) {
    return re(M, r);
  }
  function u(M) {
    return Ea(M, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: h, weierstrassEquation: y, isWithinCurveOrder: g } = Ch({
    ...e,
    toBytes(M, V, q) {
      const rt = V.toAffine(), st = n.toBytes(rt.x), lt = $n;
      return xr("isCompressed", q), q ? lt(Uint8Array.from([V.hasEvenY() ? 2 : 3]), st) : lt(Uint8Array.from([4]), st, n.toBytes(rt.y));
    },
    fromBytes(M) {
      const V = M.length, q = M[0], rt = M.subarray(1);
      if (V === o && (q === 2 || q === 3)) {
        const st = ke(rt);
        if (!Tr(st, ee, n.ORDER))
          throw new Error("Point is not on curve");
        const lt = y(st);
        let mt;
        try {
          mt = n.sqrt(lt);
        } catch (It) {
          const kt = It instanceof Error ? ": " + It.message : "";
          throw new Error("Point is not on curve" + kt);
        }
        const St = (mt & ee) === ee;
        return (q & 1) === 1 !== St && (mt = n.neg(mt)), { x: st, y: mt };
      } else if (V === s && q === 4) {
        const st = n.fromBytes(rt.subarray(0, n.BYTES)), lt = n.fromBytes(rt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: st, y: lt };
      } else {
        const st = o, lt = s;
        throw new Error("invalid Point, expected length of " + st + ", or uncompressed " + lt + ", got " + V);
      }
    }
  }), m = (M) => Sr(qe(M, e.nByteLength));
  function E(M) {
    const V = r >> ee;
    return M > V;
  }
  function A(M) {
    return E(M) ? c(-M) : M;
  }
  const T = (M, V, q) => ke(M.slice(V, q));
  class b {
    constructor(V, q, rt) {
      this.r = V, this.s = q, this.recovery = rt, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(V) {
      const q = e.nByteLength;
      return V = ye("compactSignature", V, q * 2), new b(T(V, 0, q), T(V, q, 2 * q));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(V) {
      const { r: q, s: rt } = un.toSig(ye("DER", V));
      return new b(q, rt);
    }
    assertValidity() {
      Ue("r", this.r, ee, r), Ue("s", this.s, ee, r);
    }
    addRecoveryBit(V) {
      return new b(this.r, this.s, V);
    }
    recoverPublicKey(V) {
      const { r: q, s: rt, recovery: st } = this, lt = W(ye("msgHash", V));
      if (st == null || ![0, 1, 2, 3].includes(st))
        throw new Error("recovery id invalid");
      const mt = st === 2 || st === 3 ? q + e.n : q;
      if (mt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const St = (st & 1) === 0 ? "02" : "03", Dt = f.fromHex(St + m(mt)), It = u(mt), kt = c(-lt * It), Xt = c(rt * It), $t = f.BASE.multiplyAndAddUnsafe(Dt, kt, Xt);
      if (!$t)
        throw new Error("point at infinify");
      return $t.assertValidity(), $t;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return E(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new b(this.r, c(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Ar(this.toDERHex());
    }
    toDERHex() {
      return un.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Ar(this.toCompactHex());
    }
    toCompactHex() {
      return m(this.r) + m(this.s);
    }
  }
  const B = {
    isValidPrivateKey(M) {
      try {
        return h(M), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: h,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const M = Yf(e.n);
      return xh(e.randomBytes(M), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(M = 8, V = f.BASE) {
      return V._setWindowSize(M), V.multiply(BigInt(3)), V;
    }
  };
  function O(M, V = !0) {
    return f.fromPrivateKey(M).toRawBytes(V);
  }
  function D(M) {
    const V = er(M), q = typeof M == "string", rt = (V || q) && M.length;
    return V ? rt === o || rt === s : q ? rt === 2 * o || rt === 2 * s : M instanceof f;
  }
  function j(M, V, q = !0) {
    if (D(M))
      throw new Error("first arg must be private key");
    if (!D(V))
      throw new Error("second arg must be public key");
    return f.fromHex(V).multiply(h(M)).toRawBytes(q);
  }
  const G = e.bits2int || function(M) {
    if (M.length > 8192)
      throw new Error("input is too large");
    const V = ke(M), q = M.length * 8 - e.nBitLength;
    return q > 0 ? V >> BigInt(q) : V;
  }, W = e.bits2int_modN || function(M) {
    return c(G(M));
  }, z = rc(e.nBitLength);
  function nt(M) {
    return Ue("num < 2^" + e.nBitLength, M, dn, z), qe(M, e.nByteLength);
  }
  function Q(M, V, q = wt) {
    if (["recovered", "canonical"].some((ae) => ae in q))
      throw new Error("sign() legacy options not supported");
    const { hash: rt, randomBytes: st } = e;
    let { lowS: lt, prehash: mt, extraEntropy: St } = q;
    lt == null && (lt = !0), M = ye("msgHash", M), Nu(q), mt && (M = ye("prehashed msgHash", rt(M)));
    const Dt = W(M), It = h(V), kt = [nt(It), nt(Dt)];
    if (St != null && St !== !1) {
      const ae = St === !0 ? st(n.BYTES) : St;
      kt.push(ye("extraEntropy", ae));
    }
    const Xt = $n(...kt), $t = Dt;
    function Ke(ae) {
      const at = G(ae);
      if (!g(at))
        return;
      const ze = u(at), le = f.BASE.multiply(at).toAffine(), pt = c(le.x);
      if (pt === dn)
        return;
      const ce = c(ze * c($t + pt * It));
      if (ce === dn)
        return;
      let _e = (le.x === pt ? 0 : 2) | Number(le.y & ee), Mt = ce;
      return lt && E(ce) && (Mt = A(ce), _e ^= 1), new b(pt, Mt, _e);
    }
    return { seed: Xt, k2sig: Ke };
  }
  const wt = { lowS: e.lowS, prehash: !1 }, H = { lowS: e.lowS, prehash: !1 };
  function Y(M, V, q = wt) {
    const { seed: rt, k2sig: st } = Q(M, V, q), lt = e;
    return jf(lt.hash.outputLen, lt.nByteLength, lt.hmac)(rt, st);
  }
  f.BASE._setWindowSize(8);
  function xt(M, V, q, rt = H) {
    var _e;
    const st = M;
    V = ye("msgHash", V), q = ye("publicKey", q);
    const { lowS: lt, prehash: mt, format: St } = rt;
    if (Nu(rt), "strict" in rt)
      throw new Error("options.strict was renamed to lowS");
    if (St !== void 0 && St !== "compact" && St !== "der")
      throw new Error("format must be compact or der");
    const Dt = typeof st == "string" || er(st), It = !Dt && !St && typeof st == "object" && st !== null && typeof st.r == "bigint" && typeof st.s == "bigint";
    if (!Dt && !It)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let kt, Xt;
    try {
      if (It && (kt = new b(st.r, st.s)), Dt) {
        try {
          St !== "compact" && (kt = b.fromDER(st));
        } catch (Mt) {
          if (!(Mt instanceof un.Err))
            throw Mt;
        }
        !kt && St !== "der" && (kt = b.fromCompact(st));
      }
      Xt = f.fromHex(q);
    } catch {
      return !1;
    }
    if (!kt || lt && kt.hasHighS())
      return !1;
    mt && (V = e.hash(V));
    const { r: $t, s: Ke } = kt, ae = W(V), at = u(Ke), ze = c(ae * at), le = c($t * at), pt = (_e = f.BASE.multiplyAndAddUnsafe(Xt, ze, le)) == null ? void 0 : _e.toAffine();
    return pt ? c(pt.x) === $t : !1;
  }
  return {
    CURVE: e,
    getPublicKey: O,
    getSharedSecret: j,
    sign: Y,
    verify: xt,
    ProjectivePoint: f,
    Signature: b,
    utils: B
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Rh(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Vf(t, e, Jd(...n)),
    randomBytes: Ja
  };
}
function Oh(t, e) {
  const n = (r) => $h({ ...t, ...Rh(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const To = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), ki = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), fo = BigInt(1), Ti = BigInt(2), Uu = (t, e) => (t + e / Ti) / e;
function Jf(t) {
  const e = To, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), f = BigInt(88), h = t * t * t % e, y = h * h * t % e, g = Re(y, n, e) * y % e, m = Re(g, n, e) * y % e, E = Re(m, Ti, e) * h % e, A = Re(E, o, e) * E % e, T = Re(A, s, e) * A % e, b = Re(T, u, e) * T % e, B = Re(b, f, e) * b % e, O = Re(B, u, e) * T % e, D = Re(O, n, e) * y % e, j = Re(D, c, e) * A % e, G = Re(j, r, e) * h % e, W = Re(G, Ti, e);
  if (!xa.eql(xa.sqr(W), t))
    throw new Error("Cannot find square root");
  return W;
}
const xa = Gf(To, void 0, void 0, { sqrt: Jf }), Je = Oh({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: xa,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: ki,
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
      const e = ki, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -fo * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = Uu(s * t, e), f = Uu(-r * t, e);
      let h = re(t - u * n - f * o, e), y = re(-u * r - f * s, e);
      const g = h > c, m = y > c;
      if (g && (h = e - h), m && (y = e - y), h > c || y > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: g, k1: h, k2neg: m, k2: y };
    }
  }
}, Se), tl = BigInt(0), $u = {};
function Ii(t, ...e) {
  let n = $u[t];
  if (n === void 0) {
    const r = Se(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = $n(r, r), $u[t] = n;
  }
  return Se($n(n, ...e));
}
const oc = (t) => t.toRawBytes(!0).slice(1), Sa = (t) => qe(t, 32), ta = (t) => re(t, To), lo = (t) => re(t, ki), ic = Je.ProjectivePoint, Lh = (t, e, n) => ic.BASE.multiplyAndAddUnsafe(t, e, n);
function Aa(t) {
  let e = Je.utils.normPrivateKeyToScalar(t), n = ic.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : lo(-e), bytes: oc(n) };
}
function el(t) {
  Ue("x", t, fo, To);
  const e = ta(t * t), n = ta(e * t + BigInt(7));
  let r = Jf(n);
  r % Ti !== tl && (r = ta(-r));
  const o = new ic(t, r, fo);
  return o.assertValidity(), o;
}
const mr = ke;
function nl(...t) {
  return lo(mr(Ii("BIP0340/challenge", ...t)));
}
function Ph(t) {
  return Aa(t).bytes;
}
function Kh(t, e, n = Ja(32)) {
  const r = ye("message", t), { bytes: o, scalar: s } = Aa(e), c = ye("auxRand", n, 32), u = Sa(s ^ mr(Ii("BIP0340/aux", c))), f = Ii("BIP0340/nonce", u, o, r), h = lo(mr(f));
  if (h === tl)
    throw new Error("sign failed: k is zero");
  const { bytes: y, scalar: g } = Aa(h), m = nl(y, o, r), E = new Uint8Array(64);
  if (E.set(y, 0), E.set(Sa(lo(g + m * s)), 32), !rl(E, r, o))
    throw new Error("sign: Invalid signature produced");
  return E;
}
function rl(t, e, n) {
  const r = ye("signature", t, 64), o = ye("message", e), s = ye("publicKey", n, 32);
  try {
    const c = el(mr(s)), u = mr(r.subarray(0, 32));
    if (!Tr(u, fo, To))
      return !1;
    const f = mr(r.subarray(32, 64));
    if (!Tr(f, fo, ki))
      return !1;
    const h = nl(Sa(u), oc(c), o), y = Lh(c, f, lo(-h));
    return !(!y || !y.hasEvenY() || y.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const tn = {
  getPublicKey: Ph,
  sign: Kh,
  verify: rl,
  utils: {
    randomPrivateKey: Je.utils.randomPrivateKey,
    lift_x: el,
    pointToBytes: oc,
    numberToBytesBE: qe,
    bytesToNumberBE: ke,
    taggedHash: Ii,
    mod: re
  }
}, Dh = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), ol = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), Mh = /* @__PURE__ */ ol.map((t) => (9 * t + 5) % 16);
let sc = [ol], ac = [Mh];
for (let t = 0; t < 4; t++)
  for (let e of [sc, ac])
    e.push(e[t].map((n) => Dh[n]));
const il = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), Fh = /* @__PURE__ */ sc.map((t, e) => t.map((n) => il[e][n])), Hh = /* @__PURE__ */ ac.map((t, e) => t.map((n) => il[e][n])), Vh = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), qh = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Ru(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const ui = /* @__PURE__ */ new Uint32Array(16);
class jh extends Ff {
  constructor() {
    super(64, 20, 8, !0), this.h0 = 1732584193, this.h1 = -271733879, this.h2 = -1732584194, this.h3 = 271733878, this.h4 = -1009589776;
  }
  get() {
    const { h0: e, h1: n, h2: r, h3: o, h4: s } = this;
    return [e, n, r, o, s];
  }
  set(e, n, r, o, s) {
    this.h0 = e | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = o | 0, this.h4 = s | 0;
  }
  process(e, n) {
    for (let E = 0; E < 16; E++, n += 4)
      ui[E] = e.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, c = s, u = this.h2 | 0, f = u, h = this.h3 | 0, y = h, g = this.h4 | 0, m = g;
    for (let E = 0; E < 5; E++) {
      const A = 4 - E, T = Vh[E], b = qh[E], B = sc[E], O = ac[E], D = Fh[E], j = Hh[E];
      for (let G = 0; G < 16; G++) {
        const W = ai(r + Ru(E, s, u, h) + ui[B[G]] + T, D[G]) + g | 0;
        r = g, g = h, h = ai(u, 10) | 0, u = s, s = W;
      }
      for (let G = 0; G < 16; G++) {
        const W = ai(o + Ru(A, c, f, y) + ui[O[G]] + b, j[G]) + m | 0;
        o = m, m = y, y = ai(f, 10) | 0, f = c, c = W;
      }
    }
    this.set(this.h1 + u + y | 0, this.h2 + h + m | 0, this.h3 + g + o | 0, this.h4 + r + c | 0, this.h0 + s + f | 0);
  }
  roundClean() {
    ui.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const zh = /* @__PURE__ */ Mf(() => new jh());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ho(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function sl(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function cc(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function po(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function Io(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Bi(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function al(t, e) {
  if (!sl(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function uc(t, e) {
  if (!sl(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Xi(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function fc(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  al("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (Bi(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (Bi(o), o.map((s) => {
      po("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function lc(t = "") {
  return po("join", t), {
    encode: (e) => (al("join.decode", e), e.join(t)),
    decode: (e) => (po("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Gh(t) {
  return cc(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Ou(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Bi(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (Io(u), u < 0 || u >= e)
      throw new Error(`invalid integer: ${u}`);
    return u;
  }), c = s.length;
  for (; ; ) {
    let u = 0, f = !0;
    for (let h = r; h < c; h++) {
      const y = s[h], g = e * u, m = g + y;
      if (!Number.isSafeInteger(m) || g / e !== u || m - y !== g)
        throw new Error("convertRadix: carry overflow");
      const E = m / n;
      u = m % n;
      const A = Math.floor(E);
      if (s[h] = A, !Number.isSafeInteger(A) || A * n + u !== m)
        throw new Error("convertRadix: carry overflow");
      if (f)
        A ? f = !1 : r = h;
      else continue;
    }
    if (o.push(u), f)
      break;
  }
  for (let u = 0; u < t.length - 1 && t[u] === 0; u++)
    o.push(0);
  return o.reverse();
}
const cl = (t, e) => e === 0 ? t : cl(e, t % e), _i = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - cl(t, e)), mi = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function ka(t, e, n, r) {
  if (Bi(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ _i(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ _i(e, n)}`);
  let o = 0, s = 0;
  const c = mi[e], u = mi[n] - 1, f = [];
  for (const h of t) {
    if (Io(h), h >= c)
      throw new Error(`convertRadix2: invalid data word=${h} from=${e}`);
    if (o = o << e | h, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      f.push((o >> s - n & u) >>> 0);
    const y = mi[s];
    if (y === void 0)
      throw new Error("invalid carry");
    o &= y - 1;
  }
  if (o = o << n - s & u, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && s > 0 && f.push(o >>> 0), f;
}
// @__NO_SIDE_EFFECTS__
function Wh(t) {
  Io(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!ho(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ou(Array.from(n), e, t);
    },
    decode: (n) => (uc("radix.decode", n), Uint8Array.from(Ou(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function ul(t, e = !1) {
  if (Io(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ _i(8, t) > 32 || /* @__PURE__ */ _i(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!ho(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ka(Array.from(n), 8, t, !e);
    },
    decode: (n) => (uc("radix2.decode", n), Uint8Array.from(ka(n, t, 8, e)))
  };
}
function Lu(t) {
  return cc(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Yh(t, e) {
  return Io(t), cc(e), {
    encode(n) {
      if (!ho(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), o = new Uint8Array(n.length + t);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!ho(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), o = n.slice(-t), s = e(r).slice(0, t);
      for (let c = 0; c < t; c++)
        if (s[c] !== o[c])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Zh = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Xi(/* @__PURE__ */ Wh(58), /* @__PURE__ */ fc(t), /* @__PURE__ */ lc("")), Xh = /* @__PURE__ */ Zh("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Qh = (t) => /* @__PURE__ */ Xi(Yh(4, (e) => t(t(e))), Xh), Ta = /* @__PURE__ */ Xi(/* @__PURE__ */ fc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ lc("")), Pu = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Xr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Pu.length; r++)
    (e >> r & 1) === 1 && (n ^= Pu[r]);
  return n;
}
function Ku(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = Xr(o) ^ c >> 5;
  }
  o = Xr(o);
  for (let s = 0; s < r; s++)
    o = Xr(o) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    o = Xr(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Xr(o);
  return o ^= n, Ta.encode(ka([o % mi[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function fl(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ ul(5), r = n.decode, o = n.encode, s = Lu(r);
  function c(g, m, E = 90) {
    po("bech32.encode prefix", g), ho(m) && (m = Array.from(m)), uc("bech32.encode", m);
    const A = g.length;
    if (A === 0)
      throw new TypeError(`Invalid prefix length ${A}`);
    const T = A + 7 + m.length;
    if (E !== !1 && T > E)
      throw new TypeError(`Length ${T} exceeds limit ${E}`);
    const b = g.toLowerCase(), B = Ku(b, m, e);
    return `${b}1${Ta.encode(m)}${B}`;
  }
  function u(g, m = 90) {
    po("bech32.decode input", g);
    const E = g.length;
    if (E < 8 || m !== !1 && E > m)
      throw new TypeError(`invalid string length: ${E} (${g}). Expected (8..${m})`);
    const A = g.toLowerCase();
    if (g !== A && g !== g.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const T = A.lastIndexOf("1");
    if (T === 0 || T === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const b = A.slice(0, T), B = A.slice(T + 1);
    if (B.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const O = Ta.decode(B).slice(0, -6), D = Ku(b, O, e);
    if (!B.endsWith(D))
      throw new Error(`Invalid checksum in ${g}: expected "${D}"`);
    return { prefix: b, words: O };
  }
  const f = Lu(u);
  function h(g) {
    const { prefix: m, words: E } = u(g, !1);
    return { prefix: m, words: E, bytes: r(E) };
  }
  function y(g, m) {
    return c(g, o(m));
  }
  return {
    encode: c,
    decode: u,
    encodeFromBytes: y,
    decodeToBytes: h,
    decodeUnsafe: f,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: o
  };
}
const Ia = /* @__PURE__ */ fl("bech32"), ll = /* @__PURE__ */ fl("bech32m"), Jh = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, _t = /* @__PURE__ */ Xi(/* @__PURE__ */ ul(4), /* @__PURE__ */ fc("0123456789abcdef"), /* @__PURE__ */ lc(""), /* @__PURE__ */ Gh((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Pt = /* @__PURE__ */ new Uint8Array(), dl = /* @__PURE__ */ new Uint8Array([0]);
function Ir(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Pe(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function tp(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    if (!Pe(o))
      throw new Error("Uint8Array expected");
    e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
const hl = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function Bo(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function en(t) {
  return Number.isSafeInteger(t);
}
const dc = {
  equalBytes: Ir,
  isBytes: Pe,
  concatBytes: tp
}, pl = (t) => {
  if (t !== null && typeof t != "string" && !He(t) && !Pe(t) && !en(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (He(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = gn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (He(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = gn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, te = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(te.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (te.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${te.len(e)}`);
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
    te.checkLen(t, e);
    const { FULL_MASK: r, BITS: o } = te, s = o - e % o, c = s ? r >>> s << s : r, u = [];
    for (let f = 0; f < t.length; f++) {
      let h = t[f];
      if (n && (h = ~h), f === t.length - 1 && (h &= c), h !== 0)
        for (let y = 0; y < o; y++) {
          const g = 1 << o - y - 1;
          h & g && u.push(f * o + y);
        }
    }
    return u;
  },
  range: (t) => {
    const e = [];
    let n;
    for (const r of t)
      n === void 0 || r !== n.pos + n.length ? e.push(n = { pos: r, length: 1 }) : n.length += 1;
    return e;
  },
  rangeDebug: (t, e, n = !1) => `[${te.range(te.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, o = !0) => {
    te.chunkLen(e, n, r);
    const { FULL_MASK: s, BITS: c } = te, u = n % c ? Math.floor(n / c) : void 0, f = n + r, h = f % c ? Math.floor(f / c) : void 0;
    if (u !== void 0 && u === h)
      return te.set(t, u, s >>> c - r << c - r - n, o);
    if (u !== void 0 && !te.set(t, u, s >>> n % c, o))
      return !1;
    const y = u !== void 0 ? u + 1 : n / c, g = h !== void 0 ? h : f / c;
    for (let m = y; m < g; m++)
      if (!te.set(t, m, s, o))
        return !1;
    return !(h !== void 0 && u !== h && !te.set(t, h, s << c - f % c, o));
  }
}, gn = {
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
    t.push(r), n((o, s) => {
      r.field = o, s(), r.field = void 0;
    }), t.pop();
  },
  path: (t) => {
    const e = [];
    for (const n of t)
      n.field !== void 0 && e.push(n.field);
    return e.join("/");
  },
  err: (t, e, n) => {
    const r = new Error(`${t}(${gn.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((c) => c.obj);
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
class hc {
  constructor(e, n = {}, r = [], o = void 0, s = 0) {
    this.data = e, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.view = hl(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = te.create(this.data.length), te.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : te.setRange(this.bs, this.data.length, e, n, !1);
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
    return gn.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${_t.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = te.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = te.range(e).map(({ pos: r, length: o }) => `(${r}/${o})[${_t.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${_t.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return gn.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new hc(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Pe(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (Ir(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class ep {
  constructor(e = []) {
    this.stack = e, this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.view = hl(this.viewBuf);
  }
  pushObj(e, n) {
    return gn.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!en(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return gn.err("Reader", this.stack, e);
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
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, c) => s + c, 0), o = new Uint8Array(r);
    for (let s = 0, c = 0; s < n.length; s++) {
      const u = n[s];
      o.set(u, c), c += u.length;
    }
    for (let s = this.pos, c = 0; c < this.ptrs.length; c++) {
      const u = this.ptrs[c];
      o.set(u.ptr.encode(s), u.pos), s += u.buffer.length;
    }
    if (e) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return o;
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
const Ba = (t) => Uint8Array.from(t).reverse();
function np(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function gl(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new ep();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new hc(e, n), o = t.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function Ie(t, e) {
  if (!He(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return gl({
    size: t.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = e(r);
      } catch (s) {
        throw n.err(s);
      }
      t.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = t.decodeStream(n);
      try {
        return e(r);
      } catch (o) {
        throw n.err(o);
      }
    }
  });
}
const Be = (t) => {
  const e = gl(t);
  return t.validate ? Ie(e, t.validate) : e;
}, Qi = (t) => Bo(t) && typeof t.decode == "function" && typeof t.encode == "function";
function He(t) {
  return Bo(t) && Qi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || en(t.size));
}
function rp() {
  return {
    encode: (t) => {
      if (!Array.isArray(t))
        throw new Error("array expected");
      const e = {};
      for (const n of t) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], o = n[1];
        if (e[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        e[r] = o;
      }
      return e;
    },
    decode: (t) => {
      if (!Bo(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const op = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!en(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function ip(t) {
  if (!Bo(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!en(e) || !(e in t))
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
function sp(t, e = !1) {
  if (!en(t))
    throw new Error(`decimal/precision: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof e}`);
  const n = 10n ** BigInt(t);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let o = (r < 0n ? -r : r).toString(10), s = o.length - t;
      s < 0 && (o = o.padStart(o.length - s, "0"), s = 0);
      let c = o.length - 1;
      for (; c >= s && o[c] === "0"; c--)
        ;
      let u = o.slice(0, s), f = o.slice(s, c + 1);
      return u || (u = "0"), r < 0n && (u = "-" + u), f ? `${u}.${f}` : u;
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
      const c = r.slice(0, s), u = r.slice(s + 1).replace(/0+$/, ""), f = BigInt(c) * n;
      if (!e && u.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const h = Math.min(u.length, t), y = BigInt(u.slice(0, h)) * 10n ** BigInt(t - h), g = f + y;
      return o ? -g : g;
    }
  };
}
function ap(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!Qi(e))
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
const yl = (t) => {
  if (!Qi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, Ji = { dict: rp, numberBigint: op, tsEnum: ip, decimal: sp, match: ap, reverse: yl }, pc = (t, e = !1, n = !1, r = !0) => {
  if (!en(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(t), s = 2n ** (8n * o - 1n);
  return Be({
    size: r ? t : void 0,
    encodeStream: (c, u) => {
      n && u < 0 && (u = u | s);
      const f = [];
      for (let y = 0; y < t; y++)
        f.push(Number(u & 255n)), u >>= 8n;
      let h = new Uint8Array(f).reverse();
      if (!r) {
        let y = 0;
        for (y = 0; y < h.length && h[y] === 0; y++)
          ;
        h = h.subarray(y);
      }
      c.bytes(e ? h.reverse() : h);
    },
    decodeStream: (c) => {
      const u = c.bytes(r ? t : Math.min(t, c.leftBytes)), f = e ? u : Ba(u);
      let h = 0n;
      for (let y = 0; y < f.length; y++)
        h |= BigInt(f[y]) << 8n * BigInt(y);
      return n && h & s && (h = (h ^ s) - s), h;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return np(c, 8n * o, !!n), c;
    }
  });
}, wl = /* @__PURE__ */ pc(32, !1), bi = /* @__PURE__ */ pc(8, !0), cp = /* @__PURE__ */ pc(8, !0, !0), up = (t, e) => Be({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (o) => e.write(o, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), _o = (t, e, n) => {
  const r = t * 8, o = 2 ** (r - 1), s = (f) => {
    if (!en(f))
      throw new Error(`sintView: value is not safe integer: ${f}`);
    if (f < -o || f >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${f} < ${o}`);
  }, c = 2 ** r, u = (f) => {
    if (!en(f))
      throw new Error(`uintView: value is not safe integer: ${f}`);
    if (0 > f || f >= c)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${f} < ${c}`);
  };
  return up(t, {
    write: n.write,
    read: n.read,
    validate: e ? s : u
  });
}, Bt = /* @__PURE__ */ _o(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), fp = /* @__PURE__ */ _o(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), gr = /* @__PURE__ */ _o(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), Du = /* @__PURE__ */ _o(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), Cn = /* @__PURE__ */ _o(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Lt = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = pl(t), r = Pe(t);
  return Be({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(e ? Ba(s) : s), r && o.bytes(t);
    },
    decodeStream: (o) => {
      let s;
      if (r) {
        const c = o.find(t);
        if (!c)
          throw o.err("bytes: cannot find terminator");
        s = o.bytes(c - o.pos), o.bytes(t.length);
      } else
        s = o.bytes(t === null ? o.leftBytes : n.decodeStream(o));
      return e ? Ba(s) : s;
    },
    validate: (o) => {
      if (!Pe(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function lp(t, e) {
  if (!He(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Rn(Lt(t), yl(e));
}
const gc = (t, e = !1) => Ie(Rn(Lt(t, e), Jh), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), dp = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = Rn(Lt(t, e.isLE), _t);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Rn(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function Rn(t, e) {
  if (!He(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!Qi(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Be({
    size: t.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = e.decode(r);
      } catch (s) {
        throw n.err("" + s);
      }
      return t.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = t.decodeStream(n);
      try {
        return e.encode(r);
      } catch (o) {
        throw n.err("" + o);
      }
    }
  });
}
const hp = (t, e = !1) => {
  if (!Pe(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Be({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = Ir(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function pp(t, e, n) {
  if (!He(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Be({
    encodeStream: (r, o) => {
      gn.resolve(r.stack, t) && e.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!gn.resolve(r.stack, t), o)
        return e.decodeStream(r);
    }
  });
}
function yc(t, e, n = !0) {
  if (!He(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Be({
    size: t.size,
    encodeStream: (r, o) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const o = t.decodeStream(r);
      if (n && typeof o != "object" && o !== e || Pe(e) && !Ir(e, o))
        throw r.err(`magic: invalid value: ${o} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function ml(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!en(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function se(t) {
  if (!Bo(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!He(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Be({
    size: ml(Object.values(t)),
    encodeStream: (e, n) => {
      e.pushObj(n, (r) => {
        for (const o in t)
          r(o, () => t[o].encodeStream(e, n[o]));
      });
    },
    decodeStream: (e) => {
      const n = {};
      return e.pushObj(n, (r) => {
        for (const o in t)
          r(o, () => n[o] = t[o].decodeStream(e));
      }), n;
    },
    validate: (e) => {
      if (typeof e != "object" || e === null)
        throw new Error(`struct: invalid value ${e}`);
      return e;
    }
  });
}
function gp(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!He(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Be({
    size: ml(t),
    encodeStream: (e, n) => {
      if (!Array.isArray(n))
        throw e.err(`tuple: invalid value ${n}`);
      e.pushObj(n, (r) => {
        for (let o = 0; o < t.length; o++)
          r(`${o}`, () => t[o].encodeStream(e, n[o]));
      });
    },
    decodeStream: (e) => {
      const n = [];
      return e.pushObj(n, (r) => {
        for (let o = 0; o < t.length; o++)
          r(`${o}`, () => n.push(t[o].decodeStream(e)));
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
function Te(t, e) {
  if (!He(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = pl(typeof t == "string" ? `../${t}` : t);
  return Be({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (c) => {
        Pe(t) || n.encodeStream(r, o.length);
        for (let u = 0; u < o.length; u++)
          c(`${u}`, () => {
            const f = o[u], h = r.pos;
            if (e.encodeStream(r, f), Pe(t)) {
              if (t.length > s.pos - h)
                return;
              const y = s.finish(!1).subarray(h, s.pos);
              if (Ir(y.subarray(0, t.length), t))
                throw s.err(`array: inner element encoding same as separator. elm=${f} data=${y}`);
            }
          });
      }), Pe(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (s(`${c}`, () => o.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if (Pe(t))
          for (let c = 0; ; c++) {
            if (Ir(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            s(`${c}`, () => o.push(e.decodeStream(r)));
          }
        else {
          let c;
          s("arrayLen", () => c = n.decodeStream(r));
          for (let u = 0; u < c; u++)
            s(`${u}`, () => o.push(e.decodeStream(r)));
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
const ts = Je.ProjectivePoint, Ni = Je.CURVE.n, Ut = dc.isBytes, Bn = dc.concatBytes, Yt = dc.equalBytes, bl = (t) => zh(Se(t)), Le = (...t) => Se(Se(Bn(...t))), vl = tn.utils.randomPrivateKey, wc = tn.getPublicKey, yp = Je.getPublicKey, Mu = (t) => t.r < Ni / 2n;
function wp(t, e, n = !1) {
  let r = Je.sign(t, e);
  if (n && !Mu(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !Mu(r); )
      if (o.set(Bt.encode(s++)), r = Je.sign(t, e, { extraEntropy: o }), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Fu = tn.sign, mc = tn.utils.taggedHash;
var xe;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(xe || (xe = {}));
function Br(t, e) {
  const n = t.length;
  if (e === xe.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return ts.fromHex(t), t;
  } else if (e === xe.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return tn.utils.lift_x(tn.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function El(t, e) {
  const n = tn.utils, r = n.taggedHash("TapTweak", t, e), o = n.bytesToNumberBE(r);
  if (o >= Ni)
    throw new Error("tweak higher than curve order");
  return o;
}
function mp(t, e = new Uint8Array()) {
  const n = tn.utils, r = n.bytesToNumberBE(t), o = ts.fromPrivateKey(r), s = o.hasEvenY() ? r : n.mod(-r, Ni), c = n.pointToBytes(o), u = El(c, e);
  return n.numberToBytesBE(n.mod(s + u, Ni), 32);
}
function xl(t, e) {
  const n = tn.utils, r = El(t, e), s = n.lift_x(n.bytesToNumberBE(t)).add(ts.fromPrivateKey(r)), c = s.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(s), c];
}
const bc = Se(ts.BASE.toRawBytes(!1)), _r = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, fi = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Ci(t, e) {
  if (!Ut(t) || !Ut(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vc(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Sl(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Al(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Nr(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function No(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Ui(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function $i(t, e) {
  if (!Sl(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Ec(t, e) {
  if (!Sl(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function es(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function ns(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  $i("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (Ui(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (Ui(o), o.map((s) => {
      Nr("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function rs(t = "") {
  return Nr("join", t), {
    encode: (e) => ($i("join.decode", e), e.join(t)),
    decode: (e) => (Nr("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function bp(t, e = "=") {
  return No(t), Nr("padding", e), {
    encode(n) {
      for ($i("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      $i("padding.decode", n);
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
function vp(t) {
  return Al(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Hu(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Ui(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (No(u), u < 0 || u >= e)
      throw new Error(`invalid integer: ${u}`);
    return u;
  }), c = s.length;
  for (; ; ) {
    let u = 0, f = !0;
    for (let h = r; h < c; h++) {
      const y = s[h], g = e * u, m = g + y;
      if (!Number.isSafeInteger(m) || g / e !== u || m - y !== g)
        throw new Error("convertRadix: carry overflow");
      const E = m / n;
      u = m % n;
      const A = Math.floor(E);
      if (s[h] = A, !Number.isSafeInteger(A) || A * n + u !== m)
        throw new Error("convertRadix: carry overflow");
      if (f)
        A ? f = !1 : r = h;
      else continue;
    }
    if (o.push(u), f)
      break;
  }
  for (let u = 0; u < t.length - 1 && t[u] === 0; u++)
    o.push(0);
  return o.reverse();
}
const kl = (t, e) => e === 0 ? t : kl(e, t % e), Ri = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - kl(t, e)), vi = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function _a(t, e, n, r) {
  if (Ui(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ri(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Ri(e, n)}`);
  let o = 0, s = 0;
  const c = vi[e], u = vi[n] - 1, f = [];
  for (const h of t) {
    if (No(h), h >= c)
      throw new Error(`convertRadix2: invalid data word=${h} from=${e}`);
    if (o = o << e | h, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      f.push((o >> s - n & u) >>> 0);
    const y = vi[s];
    if (y === void 0)
      throw new Error("invalid carry");
    o &= y - 1;
  }
  if (o = o << n - s & u, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && s > 0 && f.push(o >>> 0), f;
}
// @__NO_SIDE_EFFECTS__
function Ep(t) {
  No(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!vc(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Hu(Array.from(n), e, t);
    },
    decode: (n) => (Ec("radix.decode", n), Uint8Array.from(Hu(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function xc(t, e = !1) {
  if (No(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ri(8, t) > 32 || /* @__PURE__ */ Ri(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!vc(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return _a(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Ec("radix2.decode", n), Uint8Array.from(_a(n, t, 8, e)))
  };
}
function Vu(t) {
  return Al(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const Ee = /* @__PURE__ */ es(/* @__PURE__ */ xc(6), /* @__PURE__ */ ns("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ bp(6), /* @__PURE__ */ rs("")), xp = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ es(/* @__PURE__ */ Ep(58), /* @__PURE__ */ ns(t), /* @__PURE__ */ rs("")), qu = /* @__PURE__ */ xp("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Na = /* @__PURE__ */ es(/* @__PURE__ */ ns("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ rs("")), ju = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Qr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < ju.length; r++)
    (e >> r & 1) === 1 && (n ^= ju[r]);
  return n;
}
function zu(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = Qr(o) ^ c >> 5;
  }
  o = Qr(o);
  for (let s = 0; s < r; s++)
    o = Qr(o) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    o = Qr(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Qr(o);
  return o ^= n, Na.encode(_a([o % vi[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Sp(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ xc(5), r = n.decode, o = n.encode, s = Vu(r);
  function c(g, m, E = 90) {
    Nr("bech32.encode prefix", g), vc(m) && (m = Array.from(m)), Ec("bech32.encode", m);
    const A = g.length;
    if (A === 0)
      throw new TypeError(`Invalid prefix length ${A}`);
    const T = A + 7 + m.length;
    if (E !== !1 && T > E)
      throw new TypeError(`Length ${T} exceeds limit ${E}`);
    const b = g.toLowerCase(), B = zu(b, m, e);
    return `${b}1${Na.encode(m)}${B}`;
  }
  function u(g, m = 90) {
    Nr("bech32.decode input", g);
    const E = g.length;
    if (E < 8 || m !== !1 && E > m)
      throw new TypeError(`invalid string length: ${E} (${g}). Expected (8..${m})`);
    const A = g.toLowerCase();
    if (g !== A && g !== g.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const T = A.lastIndexOf("1");
    if (T === 0 || T === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const b = A.slice(0, T), B = A.slice(T + 1);
    if (B.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const O = Na.decode(B).slice(0, -6), D = zu(b, O, e);
    if (!B.endsWith(D))
      throw new Error(`Invalid checksum in ${g}: expected "${D}"`);
    return { prefix: b, words: O };
  }
  const f = Vu(u);
  function h(g) {
    const { prefix: m, words: E } = u(g, !1);
    return { prefix: m, words: E, bytes: r(E) };
  }
  function y(g, m) {
    return c(g, o(m));
  }
  return {
    encode: c,
    decode: u,
    encodeFromBytes: y,
    decodeToBytes: h,
    decodeUnsafe: f,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: o
  };
}
const li = /* @__PURE__ */ Sp("bech32m"), ht = /* @__PURE__ */ es(/* @__PURE__ */ xc(4), /* @__PURE__ */ ns("0123456789abcdef"), /* @__PURE__ */ rs(""), /* @__PURE__ */ vp((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class Tl extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: Il, pointToBytes: di } = tn.utils, On = Je.ProjectivePoint, nn = 33, Ca = new Uint8Array(nn), _n = Je.CURVE.n, Gu = Rn(Lt(33), {
  decode: (t) => Sc(t) ? Ca : t.toRawBytes(!0),
  encode: (t) => kr(t, Ca) ? On.ZERO : On.fromHex(t)
}), Wu = Ie(wl, (t) => (Ue("n", t, 1n, _n), t)), Ei = se({ R1: Gu, R2: Gu }), Bl = se({ k1: Wu, k2: Wu, publicKey: Lt(nn) });
function Yu(t, ...e) {
}
function De(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Ae(n, ...e));
}
function Zu(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Me = (t) => re(t, _n), Oi = (t, ...e) => Me(ke(Il(t, ...e))), Jr = (t, e) => t.hasEvenY() ? e : Me(-e);
function Jn(t) {
  return On.BASE.multiply(t);
}
function Sc(t) {
  return t.equals(On.ZERO);
}
function Ua(t) {
  return De(t, nn), t.sort(Ci);
}
function _l(t) {
  De(t, nn);
  for (let e = 1; e < t.length; e++)
    if (!kr(t[e], t[0]))
      return t[e];
  return Ca;
}
function Nl(t) {
  return De(t, nn), Il("KeyAgg list", ...t);
}
function Cl(t, e, n) {
  return Ae(t, nn), Ae(e, nn), kr(t, e) ? 1n : Oi("KeyAgg coefficient", n, t);
}
function $a(t, e = [], n = []) {
  if (De(t, nn), De(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = _l(t), o = Nl(t);
  let s = On.ZERO;
  for (let f = 0; f < t.length; f++) {
    let h;
    try {
      h = On.fromHex(t[f]);
    } catch {
      throw new Tl(f, "pubkey");
    }
    s = s.add(h.multiply(Cl(t[f], r, o)));
  }
  let c = 1n, u = 0n;
  for (let f = 0; f < e.length; f++) {
    const h = n[f] && !s.hasEvenY() ? Me(-1n) : 1n, y = ke(e[f]);
    if (Ue("tweak", y, 0n, _n), s = s.multiply(h).add(Jn(y)), Sc(s))
      throw new Error("The result of tweaking cannot be infinity");
    c = Me(h * c), u = Me(y + h * u);
  }
  return { aggPublicKey: s, gAcc: c, tweakAcc: u };
}
const Xu = (t, e, n, r, o, s) => Oi("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, o, qe(s.length, 4), s, new Uint8Array([r]));
function Ap(t, e, n = new Uint8Array(0), r, o = new Uint8Array(0), s = Ja(32)) {
  Ae(t, nn), Yu(e, 32), Ae(n, 0, 32), Yu(), Ae(o), Ae(s, 32);
  const c = new Uint8Array([0]), u = Xu(s, t, n, 0, c, o), f = Xu(s, t, n, 1, c, o);
  return {
    secret: Bl.encode({ k1: u, k2: f, publicKey: t }),
    public: Ei.encode({ R1: Jn(u), R2: Jn(f) })
  };
}
class kp {
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
  constructor(e, n, r, o = [], s = []) {
    if (De(n, 33), De(o, 32), Zu(s), Ae(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: u, tweakAcc: f } = $a(n, o, s), { R1: h, R2: y } = Ei.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = u, this.tweakAcc = f, this.b = Oi("MuSig/noncecoef", e, di(c), r);
    const g = h.add(y.multiply(this.b));
    this.R = Sc(g) ? On.BASE : g, this.e = Oi("BIP0340/challenge", di(this.R), di(c), r), this.tweaks = o, this.isXonly = s, this.L = Nl(n), this.secondKey = _l(n);
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
    if (!n.some((s) => kr(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Cl(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: o, gAcc: s, b: c, R: u, e: f } = this, h = ke(e);
    if (h >= _n)
      return !1;
    const { R1: y, R2: g } = Ei.decode(n), m = y.add(g.multiply(c)), E = u.hasEvenY() ? m : m.negate(), A = On.fromHex(r), T = this.getSessionKeyAggCoeff(A), b = Me(Jr(o, 1n) * s), B = Jn(h), O = E.add(A.multiply(Me(f * T * b)));
    return B.equals(O);
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
    if (Ae(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: c, R: u, e: f } = this, { k1: h, k2: y, publicKey: g } = Bl.decode(e);
    e.fill(0, 0, 64), Ue("k1", h, 0n, _n), Ue("k2", y, 0n, _n);
    const m = Jr(u, h), E = Jr(u, y), A = ke(n);
    Ue("d_", A, 1n, _n);
    const T = Jn(A), b = T.toRawBytes(!0);
    if (!kr(b, g))
      throw new Error("Public key does not match nonceGen argument");
    const B = this.getSessionKeyAggCoeff(T), O = Jr(o, 1n), D = Me(O * s * A), j = Me(m + c * E + f * B * D), G = qe(j, 32);
    if (!r) {
      const W = Ei.encode({
        R1: Jn(h),
        R2: Jn(y)
      });
      if (!this.partialSigVerifyInternal(G, W, b))
        throw new Error("Partial signature verification failed");
    }
    return G;
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
    const { publicKeys: o, tweaks: s, isXonly: c } = this;
    if (Ae(e, 32), De(n, 66), De(o, nn), De(s, 32), Zu(c), ma(r), n.length !== o.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (s.length !== c.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(e, n[r], o[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(e) {
    De(e, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let c = 0n;
    for (let f = 0; f < e.length; f++) {
      const h = ke(e[f]);
      if (h >= _n)
        throw new Tl(f, "psig");
      c = Me(c + h);
    }
    const u = Jr(n, 1n);
    return c = Me(c + s * u * r), $n(di(o), qe(c, 32));
  }
}
function Tp(t) {
  const e = Ap(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const os = /* @__PURE__ */ BigInt(0), is = /* @__PURE__ */ BigInt(1), Ip = /* @__PURE__ */ BigInt(2);
function nr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Co(t) {
  if (!nr(t))
    throw new Error("Uint8Array expected");
}
function Cr(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const Bp = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Ur(t) {
  Co(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Bp[t[n]];
  return e;
}
function yr(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Ac(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? os : BigInt("0x" + t);
}
const an = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Qu(t) {
  if (t >= an._0 && t <= an._9)
    return t - an._0;
  if (t >= an.A && t <= an.F)
    return t - (an.A - 10);
  if (t >= an.a && t <= an.f)
    return t - (an.a - 10);
}
function $r(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = Qu(t.charCodeAt(s)), u = Qu(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const f = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Qe(t) {
  return Ac(Ur(t));
}
function kc(t) {
  return Co(t), Ac(Ur(Uint8Array.from(t).reverse()));
}
function Ln(t, e) {
  return $r(t.toString(16).padStart(e * 2, "0"));
}
function Tc(t, e) {
  return Ln(t, e).reverse();
}
function _p(t) {
  return $r(yr(t));
}
function we(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = $r(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (nr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function rr(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Co(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function Np(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function Cp(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const ea = (t) => typeof t == "bigint" && os <= t;
function Rr(t, e, n) {
  return ea(t) && ea(e) && ea(n) && e <= t && t < n;
}
function Un(t, e, n, r) {
  if (!Rr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Ul(t) {
  let e;
  for (e = 0; t > os; t >>= is, e += 1)
    ;
  return e;
}
function Up(t, e) {
  return t >> BigInt(e) & is;
}
function $p(t, e, n) {
  return t | (n ? is : os) << BigInt(e);
}
const Ic = (t) => (Ip << BigInt(t - 1)) - is, na = (t) => new Uint8Array(t), Ju = (t) => Uint8Array.from(t);
function $l(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = na(t), o = na(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...g) => n(o, r, ...g), f = (g = na()) => {
    o = u(Ju([0]), g), r = u(), g.length !== 0 && (o = u(Ju([1]), g), r = u());
  }, h = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let g = 0;
    const m = [];
    for (; g < e; ) {
      r = u();
      const E = r.slice();
      m.push(E), g += r.length;
    }
    return rr(...m);
  };
  return (g, m) => {
    c(), f(g);
    let E;
    for (; !(E = m(h())); )
      f();
    return c(), E;
  };
}
const Rp = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || nr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Uo(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = Rp[s];
    if (typeof u != "function")
      throw new Error("invalid validator function");
    const f = t[o];
    if (!(c && f === void 0) && !u(f, t))
      throw new Error("param " + String(o) + " is invalid. Expected " + s + ", got " + f);
  };
  for (const [o, s] of Object.entries(e))
    r(o, s, !1);
  for (const [o, s] of Object.entries(n))
    r(o, s, !0);
  return t;
}
const Op = () => {
  throw new Error("not implemented");
};
function Ra(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
const Lp = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Un,
  abool: Cr,
  abytes: Co,
  bitGet: Up,
  bitLen: Ul,
  bitMask: Ic,
  bitSet: $p,
  bytesToHex: Ur,
  bytesToNumberBE: Qe,
  bytesToNumberLE: kc,
  concatBytes: rr,
  createHmacDrbg: $l,
  ensureBytes: we,
  equalBytes: Np,
  hexToBytes: $r,
  hexToNumber: Ac,
  inRange: Rr,
  isBytes: nr,
  memoized: Ra,
  notImplemented: Op,
  numberToBytesBE: Ln,
  numberToBytesLE: Tc,
  numberToHexUnpadded: yr,
  numberToVarBytesBE: _p,
  utf8ToBytes: Cp,
  validateObject: Uo
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Bc = 2n ** 256n, br = Bc - 0x1000003d1n, Rl = Bc - 0x14551231950b75fc4402da1732fc9bebfn, Pp = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, Kp = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, _c = {
  n: Rl,
  a: 0n,
  b: 7n
}, io = 32, tf = (t) => ft(ft(t * t) * t + _c.b), me = (t = "") => {
  throw new Error(t);
}, ss = (t) => typeof t == "bigint", Ol = (t) => typeof t == "string", ra = (t) => ss(t) && 0n < t && t < br, Ll = (t) => ss(t) && 0n < t && t < Rl, Dp = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", Oa = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Dp(t) || typeof e == "number" && e > 0 && t.length !== e ? me("Uint8Array expected") : t
), Pl = (t) => new Uint8Array(t), Kl = (t, e) => Oa(Ol(t) ? Nc(t) : Pl(Oa(t)), e), ft = (t, e = br) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, ef = (t) => t instanceof Or ? t : me("Point expected");
let Or = class hr {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? ro : new hr(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Kl(e);
    let n;
    const r = e[0], o = e.subarray(1), s = rf(o, 0, io), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      ra(s) || me("Point hex invalid: x not FE");
      let u = Hp(tf(s));
      const f = (u & 1n) === 1n;
      (r & 1) === 1 !== f && (u = ft(-u)), n = new hr(s, u, 1n);
    }
    return c === 65 && r === 4 && (n = new hr(s, rf(o, io, 2 * io), 1n)), n ? n.ok() : me("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return so.mul(Vp(e));
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = ef(e), f = ft(n * u), h = ft(s * o), y = ft(r * u), g = ft(c * o);
    return f === h && y === g;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new hr(this.px, ft(-this.py), this.pz);
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = ef(e), { a: f, b: h } = _c;
    let y = 0n, g = 0n, m = 0n;
    const E = ft(h * 3n);
    let A = ft(n * s), T = ft(r * c), b = ft(o * u), B = ft(n + r), O = ft(s + c);
    B = ft(B * O), O = ft(A + T), B = ft(B - O), O = ft(n + o);
    let D = ft(s + u);
    return O = ft(O * D), D = ft(A + b), O = ft(O - D), D = ft(r + o), y = ft(c + u), D = ft(D * y), y = ft(T + b), D = ft(D - y), m = ft(f * O), y = ft(E * b), m = ft(y + m), y = ft(T - m), m = ft(T + m), g = ft(y * m), T = ft(A + A), T = ft(T + A), b = ft(f * b), O = ft(E * O), T = ft(T + b), b = ft(A - b), b = ft(f * b), O = ft(O + b), A = ft(T * O), g = ft(g + A), A = ft(D * O), y = ft(B * y), y = ft(y - A), A = ft(B * T), m = ft(D * m), m = ft(m + A), new hr(y, g, m);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return ro;
    if (Ll(e) || me("scalar invalid"), this.equals(so))
      return jp(e).p;
    let r = ro, o = so;
    for (let s = this; e > 0n; s = s.double(), e >>= 1n)
      e & 1n ? r = r.add(s) : n && (o = o.add(s));
    return r;
  }
  mulAddQUns(e, n, r) {
    return this.mul(n, !1).add(e.mul(r, !1)).ok();
  }
  // to private keys. Doesn't use Shamir trick
  /** Convert point to 2d xy affine point. (x, y, z) ∋ (x=x/z, y=y/z) */
  toAffine() {
    const { px: e, py: n, pz: r } = this;
    if (this.equals(ro))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const o = Fp(r, br);
    return ft(r * o) !== 1n && me("inverse invalid"), { x: ft(e * o), y: ft(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!ra(e) || !ra(n)) && me("Point invalid: x or y"), ft(n * n) === tf(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : me("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + of(n) + (e ? "" : of(r));
  }
  toRawBytes(e = !0) {
    return Nc(this.toHex(e));
  }
};
Or.BASE = new Or(Pp, Kp, 1n);
Or.ZERO = new Or(0n, 1n, 0n);
const { BASE: so, ZERO: ro } = Or, Dl = (t, e) => t.toString(16).padStart(e, "0"), Ml = (t) => Array.from(Oa(t)).map((e) => Dl(e, 2)).join(""), cn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, nf = (t) => {
  if (t >= cn._0 && t <= cn._9)
    return t - cn._0;
  if (t >= cn.A && t <= cn.F)
    return t - (cn.A - 10);
  if (t >= cn.a && t <= cn.f)
    return t - (cn.a - 10);
}, Nc = (t) => {
  const e = "hex invalid";
  if (!Ol(t))
    return me(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return me(e);
  const o = Pl(r);
  for (let s = 0, c = 0; s < r; s++, c += 2) {
    const u = nf(t.charCodeAt(c)), f = nf(t.charCodeAt(c + 1));
    if (u === void 0 || f === void 0)
      return me(e);
    o[s] = u * 16 + f;
  }
  return o;
}, Fl = (t) => BigInt("0x" + (Ml(t) || "0")), rf = (t, e, n) => Fl(t.slice(e, n)), Mp = (t) => ss(t) && t >= 0n && t < Bc ? Nc(Dl(t, 2 * io)) : me("bigint expected"), of = (t) => Ml(Mp(t)), Fp = (t, e) => {
  (t === 0n || e <= 0n) && me("no inverse n=" + t + " mod=" + e);
  let n = ft(t, e), r = e, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const c = r / n, u = r % n, f = o - s * c;
    r = n, n = u, o = s, s = f;
  }
  return r === 1n ? ft(o, e) : me("no inverse");
}, Hp = (t) => {
  let e = 1n;
  for (let n = t, r = (br + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % br), n = n * n % br;
  return ft(e * e) === t ? e : me("sqrt invalid");
}, Vp = (t) => (ss(t) || (t = Fl(Kl(t, io))), Ll(t) ? t : me("private key invalid 3")), Xn = 8, qp = () => {
  const t = [], e = 256 / Xn + 1;
  let n = so, r = n;
  for (let o = 0; o < e; o++) {
    r = n, t.push(r);
    for (let s = 1; s < 2 ** (Xn - 1); s++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let sf;
const jp = (t) => {
  const e = sf || (sf = qp()), n = (y, g) => {
    let m = g.negate();
    return y ? m : g;
  };
  let r = ro, o = so;
  const s = 1 + 256 / Xn, c = 2 ** (Xn - 1), u = BigInt(2 ** Xn - 1), f = 2 ** Xn, h = BigInt(Xn);
  for (let y = 0; y < s; y++) {
    const g = y * c;
    let m = Number(t & u);
    t >>= h, m > c && (m -= f, t += 1n);
    const E = g, A = g + Math.abs(m) - 1, T = y % 2 !== 0, b = m < 0;
    m === 0 ? o = o.add(n(T, e[E])) : r = r.add(n(b, e[A]));
  }
  return { p: r, f: o };
};
function af(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function zp(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function as(t, ...e) {
  if (!zp(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Gp(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  af(t.outputLen), af(t.blockLen);
}
function Li(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Wp(t, e) {
  as(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const dr = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const oa = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), Xe = (t, e) => t << 32 - e | t >>> e;
function Yp(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Cc(t) {
  return typeof t == "string" && (t = Yp(t)), as(t), t;
}
function Zp(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    as(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
class Hl {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function Xp(t) {
  const e = (r) => t().update(Cc(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Vl(t = 32) {
  if (dr && typeof dr.getRandomValues == "function")
    return dr.getRandomValues(new Uint8Array(t));
  if (dr && typeof dr.randomBytes == "function")
    return dr.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Qp(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), c = Number(n >> o & s), u = Number(n & s), f = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + f, c, r), t.setUint32(e + h, u, r);
}
const Jp = (t, e, n) => t & e ^ ~t & n, tg = (t, e, n) => t & e ^ t & n ^ e & n;
class eg extends Hl {
  constructor(e, n, r, o) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = oa(this.buffer);
  }
  update(e) {
    Li(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = Cc(e);
    const s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const f = oa(e);
        for (; o <= s - c; c += o)
          this.process(f, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Li(this), Wp(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, this.buffer.subarray(c).fill(0), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let g = c; g < o; g++)
      n[g] = 0;
    Qp(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = oa(e), f = this.outputLen;
    if (f % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = f / 4, y = this.get();
    if (h > y.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let g = 0; g < h; g++)
      u.setUint32(4 * g, y[g], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: s, destroyed: c, pos: u } = this;
    return e.length = o, e.pos = u, e.finished = s, e.destroyed = c, o % n && e.buffer.set(r), e;
  }
}
const ng = /* @__PURE__ */ new Uint32Array([
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
]), Tn = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), In = /* @__PURE__ */ new Uint32Array(64);
class rg extends eg {
  constructor() {
    super(64, 32, 8, !1), this.A = Tn[0] | 0, this.B = Tn[1] | 0, this.C = Tn[2] | 0, this.D = Tn[3] | 0, this.E = Tn[4] | 0, this.F = Tn[5] | 0, this.G = Tn[6] | 0, this.H = Tn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: o, E: s, F: c, G: u, H: f } = this;
    return [e, n, r, o, s, c, u, f];
  }
  // prettier-ignore
  set(e, n, r, o, s, c, u, f) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = s | 0, this.F = c | 0, this.G = u | 0, this.H = f | 0;
  }
  process(e, n) {
    for (let g = 0; g < 16; g++, n += 4)
      In[g] = e.getUint32(n, !1);
    for (let g = 16; g < 64; g++) {
      const m = In[g - 15], E = In[g - 2], A = Xe(m, 7) ^ Xe(m, 18) ^ m >>> 3, T = Xe(E, 17) ^ Xe(E, 19) ^ E >>> 10;
      In[g] = T + In[g - 7] + A + In[g - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: f, G: h, H: y } = this;
    for (let g = 0; g < 64; g++) {
      const m = Xe(u, 6) ^ Xe(u, 11) ^ Xe(u, 25), E = y + m + Jp(u, f, h) + ng[g] + In[g] | 0, T = (Xe(r, 2) ^ Xe(r, 13) ^ Xe(r, 22)) + tg(r, o, s) | 0;
      y = h, h = f, f = u, u = c + E | 0, c = s, s = o, o = r, r = E + T | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, c = c + this.D | 0, u = u + this.E | 0, f = f + this.F | 0, h = h + this.G | 0, y = y + this.H | 0, this.set(r, o, s, c, u, f, h, y);
  }
  roundClean() {
    In.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const La = /* @__PURE__ */ Xp(() => new rg());
class ql extends Hl {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Gp(e);
    const r = Cc(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o = this.blockLen, s = new Uint8Array(o);
    s.set(r.length > o ? e.create().update(r).digest() : r);
    for (let c = 0; c < s.length; c++)
      s[c] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let c = 0; c < s.length; c++)
      s[c] ^= 106;
    this.oHash.update(s), s.fill(0);
  }
  update(e) {
    return Li(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Li(this), as(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: o, destroyed: s, blockLen: c, outputLen: u } = this;
    return e = e, e.finished = o, e.destroyed = s, e.blockLen = c, e.outputLen = u, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const jl = (t, e, n) => new ql(t, e).update(n).digest();
jl.create = (t, e) => new ql(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ie = BigInt(0), qt = BigInt(1), Qn = /* @__PURE__ */ BigInt(2), og = /* @__PURE__ */ BigInt(3), Pa = /* @__PURE__ */ BigInt(4), cf = /* @__PURE__ */ BigInt(5), uf = /* @__PURE__ */ BigInt(8);
function ue(t, e) {
  const n = t % e;
  return n >= ie ? n : e + n;
}
function ig(t, e, n) {
  if (e < ie)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= ie)
    throw new Error("invalid modulus");
  if (n === qt)
    return ie;
  let r = qt;
  for (; e > ie; )
    e & qt && (r = r * t % n), t = t * t % n, e >>= qt;
  return r;
}
function Oe(t, e, n) {
  let r = t;
  for (; e-- > ie; )
    r *= r, r %= n;
  return r;
}
function Ka(t, e) {
  if (t === ie)
    throw new Error("invert: expected non-zero number");
  if (e <= ie)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = ue(t, e), r = e, o = ie, s = qt;
  for (; n !== ie; ) {
    const u = r / n, f = r % n, h = o - s * u;
    r = n, n = f, o = s, s = h;
  }
  if (r !== qt)
    throw new Error("invert: does not exist");
  return ue(o, e);
}
function sg(t) {
  const e = (t - qt) / Qn;
  let n, r, o;
  for (n = t - qt, r = 0; n % Qn === ie; n /= Qn, r++)
    ;
  for (o = Qn; o < t && ig(o, e, t) !== t - qt; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const c = (t + qt) / Pa;
    return function(f, h) {
      const y = f.pow(h, c);
      if (!f.eql(f.sqr(y), h))
        throw new Error("Cannot find square root");
      return y;
    };
  }
  const s = (n + qt) / Qn;
  return function(u, f) {
    if (u.pow(f, e) === u.neg(u.ONE))
      throw new Error("Cannot find square root");
    let h = r, y = u.pow(u.mul(u.ONE, o), n), g = u.pow(f, s), m = u.pow(f, n);
    for (; !u.eql(m, u.ONE); ) {
      if (u.eql(m, u.ZERO))
        return u.ZERO;
      let E = 1;
      for (let T = u.sqr(m); E < h && !u.eql(T, u.ONE); E++)
        T = u.sqr(T);
      const A = u.pow(y, qt << BigInt(h - E - 1));
      y = u.sqr(A), g = u.mul(g, A), m = u.mul(m, y), h = E;
    }
    return g;
  };
}
function ag(t) {
  if (t % Pa === og) {
    const e = (t + qt) / Pa;
    return function(r, o) {
      const s = r.pow(o, e);
      if (!r.eql(r.sqr(s), o))
        throw new Error("Cannot find square root");
      return s;
    };
  }
  if (t % uf === cf) {
    const e = (t - cf) / uf;
    return function(r, o) {
      const s = r.mul(o, Qn), c = r.pow(s, e), u = r.mul(o, c), f = r.mul(r.mul(u, Qn), c), h = r.mul(u, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(h), o))
        throw new Error("Cannot find square root");
      return h;
    };
  }
  return sg(t);
}
const cg = [
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
function ug(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = cg.reduce((r, o) => (r[o] = "function", r), e);
  return Uo(t, n);
}
function fg(t, e, n) {
  if (n < ie)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ie)
    return t.ONE;
  if (n === qt)
    return e;
  let r = t.ONE, o = e;
  for (; n > ie; )
    n & qt && (r = t.mul(r, o)), o = t.sqr(o), n >>= qt;
  return r;
}
function lg(t, e) {
  const n = new Array(e.length), r = e.reduce((s, c, u) => t.is0(c) ? s : (n[u] = s, t.mul(s, c)), t.ONE), o = t.inv(r);
  return e.reduceRight((s, c, u) => t.is0(c) ? s : (n[u] = t.mul(s, n[u]), t.mul(s, c)), o), n;
}
function zl(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Gl(t, e, n = !1, r = {}) {
  if (t <= ie)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: s } = zl(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const u = Object.freeze({
    ORDER: t,
    BITS: o,
    BYTES: s,
    MASK: Ic(o),
    ZERO: ie,
    ONE: qt,
    create: (f) => ue(f, t),
    isValid: (f) => {
      if (typeof f != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof f);
      return ie <= f && f < t;
    },
    is0: (f) => f === ie,
    isOdd: (f) => (f & qt) === qt,
    neg: (f) => ue(-f, t),
    eql: (f, h) => f === h,
    sqr: (f) => ue(f * f, t),
    add: (f, h) => ue(f + h, t),
    sub: (f, h) => ue(f - h, t),
    mul: (f, h) => ue(f * h, t),
    pow: (f, h) => fg(u, f, h),
    div: (f, h) => ue(f * Ka(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, h) => f + h,
    subN: (f, h) => f - h,
    mulN: (f, h) => f * h,
    inv: (f) => Ka(f, t),
    sqrt: r.sqrt || ((f) => (c || (c = ag(t)), c(u, f))),
    invertBatch: (f) => lg(u, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, h, y) => y ? h : f,
    toBytes: (f) => n ? Tc(f, s) : Ln(f, s),
    fromBytes: (f) => {
      if (f.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + f.length);
      return n ? kc(f) : Qe(f);
    }
  });
  return Object.freeze(u);
}
function Wl(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Yl(t) {
  const e = Wl(t);
  return e + Math.ceil(e / 2);
}
function dg(t, e, n = !1) {
  const r = t.length, o = Wl(e), s = Yl(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? Qe(t) : kc(t), u = ue(c, e - qt) + qt;
  return n ? Tc(u, o) : Ln(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ff = BigInt(0), hi = BigInt(1);
function ia(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Zl(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function sa(t, e) {
  Zl(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function hg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function pg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const aa = /* @__PURE__ */ new WeakMap(), Xl = /* @__PURE__ */ new WeakMap();
function ca(t) {
  return Xl.get(t) || 1;
}
function gg(t, e) {
  return {
    constTimeNegate: ia,
    hasPrecomputes(n) {
      return ca(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > ff; )
        r & hi && (o = o.add(s)), s = s.double(), r >>= hi;
      return o;
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
      const { windows: o, windowSize: s } = sa(r, e), c = [];
      let u = n, f = u;
      for (let h = 0; h < o; h++) {
        f = u, c.push(f);
        for (let y = 1; y < s; y++)
          f = f.add(u), c.push(f);
        u = f.double();
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
    wNAF(n, r, o) {
      const { windows: s, windowSize: c } = sa(n, e);
      let u = t.ZERO, f = t.BASE;
      const h = BigInt(2 ** n - 1), y = 2 ** n, g = BigInt(n);
      for (let m = 0; m < s; m++) {
        const E = m * c;
        let A = Number(o & h);
        o >>= g, A > c && (A -= y, o += hi);
        const T = E, b = E + Math.abs(A) - 1, B = m % 2 !== 0, O = A < 0;
        A === 0 ? f = f.add(ia(B, r[T])) : u = u.add(ia(O, r[b]));
      }
      return { p: u, f };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(n, r, o, s = t.ZERO) {
      const { windows: c, windowSize: u } = sa(n, e), f = BigInt(2 ** n - 1), h = 2 ** n, y = BigInt(n);
      for (let g = 0; g < c; g++) {
        const m = g * u;
        if (o === ff)
          break;
        let E = Number(o & f);
        if (o >>= y, E > u && (E -= h, o += hi), E === 0)
          continue;
        let A = r[m + Math.abs(E) - 1];
        E < 0 && (A = A.negate()), s = s.add(A);
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = aa.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && aa.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = ca(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = ca(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Zl(r, e), Xl.set(n, r), aa.delete(n);
    }
  };
}
function yg(t, e, n, r) {
  if (hg(n, t), pg(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, s = Ul(BigInt(n.length)), c = s > 12 ? s - 3 : s > 4 ? s - 2 : s ? 2 : 1, u = (1 << c) - 1, f = new Array(u + 1).fill(o), h = Math.floor((e.BITS - 1) / c) * c;
  let y = o;
  for (let g = h; g >= 0; g -= c) {
    f.fill(o);
    for (let E = 0; E < r.length; E++) {
      const A = r[E], T = Number(A >> BigInt(g) & BigInt(u));
      f[T] = f[T].add(n[E]);
    }
    let m = o;
    for (let E = f.length - 1, A = o; E > 0; E--)
      A = A.add(f[E]), m = m.add(A);
    if (y = y.add(m), g !== 0)
      for (let E = 0; E < c; E++)
        y = y.double();
  }
  return y;
}
function Ql(t) {
  return ug(t.Fp), Uo(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...zl(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function lf(t) {
  t.lowS !== void 0 && Cr("lowS", t.lowS), t.prehash !== void 0 && Cr("prehash", t.prehash);
}
function wg(t) {
  const e = Ql(t);
  Uo(e, {
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
  const { endo: n, Fp: r, a: o } = e;
  if (n) {
    if (!r.eql(o, r.ZERO))
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
  }
  return Object.freeze({ ...e });
}
const { bytesToNumberBE: mg, hexToBytes: bg } = Lp, fn = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = fn;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = yr(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? yr(o.length / 2 | 128) : "";
      return yr(t) + s + o + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = fn;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const o = e[r++], s = !!(o & 128);
      let c = 0;
      if (!s)
        c = o;
      else {
        const f = o & 127;
        if (!f)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (f > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const h = e.subarray(r, r + f);
        if (h.length !== f)
          throw new n("tlv.decode: length bytes not complete");
        if (h[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const y of h)
          c = c << 8 | y;
        if (r += f, c < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const u = e.subarray(r, r + c);
      if (u.length !== c)
        throw new n("tlv.decode: wrong value length");
      return { v: u, l: e.subarray(r + c) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(t) {
      const { Err: e } = fn;
      if (t < hn)
        throw new e("integer: negative integers are not allowed");
      let n = yr(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = fn;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return mg(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = fn, o = typeof t == "string" ? bg(t) : t;
    Co(o);
    const { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l: f } = r.decode(2, s), { v: h, l: y } = r.decode(2, f);
    if (y.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(h) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = fn, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
}, hn = BigInt(0), ne = BigInt(1);
BigInt(2);
const df = BigInt(3);
BigInt(4);
function vg(t) {
  const e = wg(t), { Fp: n } = e, r = Gl(e.n, e.nBitLength), o = e.toBytes || ((T, b, B) => {
    const O = b.toAffine();
    return rr(Uint8Array.from([4]), n.toBytes(O.x), n.toBytes(O.y));
  }), s = e.fromBytes || ((T) => {
    const b = T.subarray(1), B = n.fromBytes(b.subarray(0, n.BYTES)), O = n.fromBytes(b.subarray(n.BYTES, 2 * n.BYTES));
    return { x: B, y: O };
  });
  function c(T) {
    const { a: b, b: B } = e, O = n.sqr(T), D = n.mul(O, T);
    return n.add(n.add(D, n.mul(T, b)), B);
  }
  if (!n.eql(n.sqr(e.Gy), c(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function u(T) {
    return Rr(T, ne, e.n);
  }
  function f(T) {
    const { allowedPrivateKeyLengths: b, nByteLength: B, wrapPrivateKey: O, n: D } = e;
    if (b && typeof T != "bigint") {
      if (nr(T) && (T = Ur(T)), typeof T != "string" || !b.includes(T.length))
        throw new Error("invalid private key");
      T = T.padStart(B * 2, "0");
    }
    let j;
    try {
      j = typeof T == "bigint" ? T : Qe(we("private key", T, B));
    } catch {
      throw new Error("invalid private key, expected hex or " + B + " bytes, got " + typeof T);
    }
    return O && (j = ue(j, D)), Un("private key", j, ne, D), j;
  }
  function h(T) {
    if (!(T instanceof m))
      throw new Error("ProjectivePoint expected");
  }
  const y = Ra((T, b) => {
    const { px: B, py: O, pz: D } = T;
    if (n.eql(D, n.ONE))
      return { x: B, y: O };
    const j = T.is0();
    b == null && (b = j ? n.ONE : n.inv(D));
    const G = n.mul(B, b), W = n.mul(O, b), z = n.mul(D, b);
    if (j)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: G, y: W };
  }), g = Ra((T) => {
    if (T.is0()) {
      if (e.allowInfinityPoint && !n.is0(T.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: B } = T.toAffine();
    if (!n.isValid(b) || !n.isValid(B))
      throw new Error("bad point: x or y not FE");
    const O = n.sqr(B), D = c(b);
    if (!n.eql(O, D))
      throw new Error("bad point: equation left != right");
    if (!T.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class m {
    constructor(b, B, O) {
      if (this.px = b, this.py = B, this.pz = O, b == null || !n.isValid(b))
        throw new Error("x required");
      if (B == null || !n.isValid(B))
        throw new Error("y required");
      if (O == null || !n.isValid(O))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(b) {
      const { x: B, y: O } = b || {};
      if (!b || !n.isValid(B) || !n.isValid(O))
        throw new Error("invalid affine point");
      if (b instanceof m)
        throw new Error("projective point not allowed");
      const D = (j) => n.eql(j, n.ZERO);
      return D(B) && D(O) ? m.ZERO : new m(B, O, n.ONE);
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
    static normalizeZ(b) {
      const B = n.invertBatch(b.map((O) => O.pz));
      return b.map((O, D) => O.toAffine(B[D])).map(m.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(b) {
      const B = m.fromAffine(s(we("pointHex", b)));
      return B.assertValidity(), B;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(b) {
      return m.BASE.multiply(f(b));
    }
    // Multiscalar Multiplication
    static msm(b, B) {
      return yg(m, r, b, B);
    }
    // "Private method", don't use it directly
    _setWindowSize(b) {
      A.setWindowSize(this, b);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      g(this);
    }
    hasEvenY() {
      const { y: b } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(b);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b, z = n.eql(n.mul(B, W), n.mul(j, D)), nt = n.eql(n.mul(O, W), n.mul(G, D));
      return z && nt;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new m(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: b, b: B } = e, O = n.mul(B, df), { px: D, py: j, pz: G } = this;
      let W = n.ZERO, z = n.ZERO, nt = n.ZERO, Q = n.mul(D, D), wt = n.mul(j, j), H = n.mul(G, G), Y = n.mul(D, j);
      return Y = n.add(Y, Y), nt = n.mul(D, G), nt = n.add(nt, nt), W = n.mul(b, nt), z = n.mul(O, H), z = n.add(W, z), W = n.sub(wt, z), z = n.add(wt, z), z = n.mul(W, z), W = n.mul(Y, W), nt = n.mul(O, nt), H = n.mul(b, H), Y = n.sub(Q, H), Y = n.mul(b, Y), Y = n.add(Y, nt), nt = n.add(Q, Q), Q = n.add(nt, Q), Q = n.add(Q, H), Q = n.mul(Q, Y), z = n.add(z, Q), H = n.mul(j, G), H = n.add(H, H), Q = n.mul(H, Y), W = n.sub(W, Q), nt = n.mul(H, wt), nt = n.add(nt, nt), nt = n.add(nt, nt), new m(W, z, nt);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b;
      let z = n.ZERO, nt = n.ZERO, Q = n.ZERO;
      const wt = e.a, H = n.mul(e.b, df);
      let Y = n.mul(B, j), xt = n.mul(O, G), M = n.mul(D, W), V = n.add(B, O), q = n.add(j, G);
      V = n.mul(V, q), q = n.add(Y, xt), V = n.sub(V, q), q = n.add(B, D);
      let rt = n.add(j, W);
      return q = n.mul(q, rt), rt = n.add(Y, M), q = n.sub(q, rt), rt = n.add(O, D), z = n.add(G, W), rt = n.mul(rt, z), z = n.add(xt, M), rt = n.sub(rt, z), Q = n.mul(wt, q), z = n.mul(H, M), Q = n.add(z, Q), z = n.sub(xt, Q), Q = n.add(xt, Q), nt = n.mul(z, Q), xt = n.add(Y, Y), xt = n.add(xt, Y), M = n.mul(wt, M), q = n.mul(H, q), xt = n.add(xt, M), M = n.sub(Y, M), M = n.mul(wt, M), q = n.add(q, M), Y = n.mul(xt, q), nt = n.add(nt, Y), Y = n.mul(rt, q), z = n.mul(V, z), z = n.sub(z, Y), Y = n.mul(V, xt), Q = n.mul(rt, Q), Q = n.add(Q, Y), new m(z, nt, Q);
    }
    subtract(b) {
      return this.add(b.negate());
    }
    is0() {
      return this.equals(m.ZERO);
    }
    wNAF(b) {
      return A.wNAFCached(this, b, m.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(b) {
      const { endo: B, n: O } = e;
      Un("scalar", b, hn, O);
      const D = m.ZERO;
      if (b === hn)
        return D;
      if (this.is0() || b === ne)
        return this;
      if (!B || A.hasPrecomputes(this))
        return A.wNAFCachedUnsafe(this, b, m.normalizeZ);
      let { k1neg: j, k1: G, k2neg: W, k2: z } = B.splitScalar(b), nt = D, Q = D, wt = this;
      for (; G > hn || z > hn; )
        G & ne && (nt = nt.add(wt)), z & ne && (Q = Q.add(wt)), wt = wt.double(), G >>= ne, z >>= ne;
      return j && (nt = nt.negate()), W && (Q = Q.negate()), Q = new m(n.mul(Q.px, B.beta), Q.py, Q.pz), nt.add(Q);
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
      const { endo: B, n: O } = e;
      Un("scalar", b, ne, O);
      let D, j;
      if (B) {
        const { k1neg: G, k1: W, k2neg: z, k2: nt } = B.splitScalar(b);
        let { p: Q, f: wt } = this.wNAF(W), { p: H, f: Y } = this.wNAF(nt);
        Q = A.constTimeNegate(G, Q), H = A.constTimeNegate(z, H), H = new m(n.mul(H.px, B.beta), H.py, H.pz), D = Q.add(H), j = wt.add(Y);
      } else {
        const { p: G, f: W } = this.wNAF(b);
        D = G, j = W;
      }
      return m.normalizeZ([D, j])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(b, B, O) {
      const D = m.BASE, j = (W, z) => z === hn || z === ne || !W.equals(D) ? W.multiplyUnsafe(z) : W.multiply(z), G = j(this, B).add(j(b, O));
      return G.is0() ? void 0 : G;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(b) {
      return y(this, b);
    }
    isTorsionFree() {
      const { h: b, isTorsionFree: B } = e;
      if (b === ne)
        return !0;
      if (B)
        return B(m, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: b, clearCofactor: B } = e;
      return b === ne ? this : B ? B(m, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(b = !0) {
      return Cr("isCompressed", b), this.assertValidity(), o(m, this, b);
    }
    toHex(b = !0) {
      return Cr("isCompressed", b), Ur(this.toRawBytes(b));
    }
  }
  m.BASE = new m(e.Gx, e.Gy, n.ONE), m.ZERO = new m(n.ZERO, n.ONE, n.ZERO);
  const E = e.nBitLength, A = gg(m, e.endo ? Math.ceil(E / 2) : E);
  return {
    CURVE: e,
    ProjectivePoint: m,
    normPrivateKeyToScalar: f,
    weierstrassEquation: c,
    isWithinCurveOrder: u
  };
}
function Eg(t) {
  const e = Ql(t);
  return Uo(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function xg(t) {
  const e = Eg(t), { Fp: n, n: r } = e, o = n.BYTES + 1, s = 2 * n.BYTES + 1;
  function c(M) {
    return ue(M, r);
  }
  function u(M) {
    return Ka(M, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: h, weierstrassEquation: y, isWithinCurveOrder: g } = vg({
    ...e,
    toBytes(M, V, q) {
      const rt = V.toAffine(), st = n.toBytes(rt.x), lt = rr;
      return Cr("isCompressed", q), q ? lt(Uint8Array.from([V.hasEvenY() ? 2 : 3]), st) : lt(Uint8Array.from([4]), st, n.toBytes(rt.y));
    },
    fromBytes(M) {
      const V = M.length, q = M[0], rt = M.subarray(1);
      if (V === o && (q === 2 || q === 3)) {
        const st = Qe(rt);
        if (!Rr(st, ne, n.ORDER))
          throw new Error("Point is not on curve");
        const lt = y(st);
        let mt;
        try {
          mt = n.sqrt(lt);
        } catch (It) {
          const kt = It instanceof Error ? ": " + It.message : "";
          throw new Error("Point is not on curve" + kt);
        }
        const St = (mt & ne) === ne;
        return (q & 1) === 1 !== St && (mt = n.neg(mt)), { x: st, y: mt };
      } else if (V === s && q === 4) {
        const st = n.fromBytes(rt.subarray(0, n.BYTES)), lt = n.fromBytes(rt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: st, y: lt };
      } else {
        const st = o, lt = s;
        throw new Error("invalid Point, expected length of " + st + ", or uncompressed " + lt + ", got " + V);
      }
    }
  }), m = (M) => Ur(Ln(M, e.nByteLength));
  function E(M) {
    const V = r >> ne;
    return M > V;
  }
  function A(M) {
    return E(M) ? c(-M) : M;
  }
  const T = (M, V, q) => Qe(M.slice(V, q));
  class b {
    constructor(V, q, rt) {
      this.r = V, this.s = q, this.recovery = rt, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(V) {
      const q = e.nByteLength;
      return V = we("compactSignature", V, q * 2), new b(T(V, 0, q), T(V, q, 2 * q));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(V) {
      const { r: q, s: rt } = fn.toSig(we("DER", V));
      return new b(q, rt);
    }
    assertValidity() {
      Un("r", this.r, ne, r), Un("s", this.s, ne, r);
    }
    addRecoveryBit(V) {
      return new b(this.r, this.s, V);
    }
    recoverPublicKey(V) {
      const { r: q, s: rt, recovery: st } = this, lt = W(we("msgHash", V));
      if (st == null || ![0, 1, 2, 3].includes(st))
        throw new Error("recovery id invalid");
      const mt = st === 2 || st === 3 ? q + e.n : q;
      if (mt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const St = (st & 1) === 0 ? "02" : "03", Dt = f.fromHex(St + m(mt)), It = u(mt), kt = c(-lt * It), Xt = c(rt * It), $t = f.BASE.multiplyAndAddUnsafe(Dt, kt, Xt);
      if (!$t)
        throw new Error("point at infinify");
      return $t.assertValidity(), $t;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return E(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new b(this.r, c(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return $r(this.toDERHex());
    }
    toDERHex() {
      return fn.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return $r(this.toCompactHex());
    }
    toCompactHex() {
      return m(this.r) + m(this.s);
    }
  }
  const B = {
    isValidPrivateKey(M) {
      try {
        return h(M), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: h,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const M = Yl(e.n);
      return dg(e.randomBytes(M), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(M = 8, V = f.BASE) {
      return V._setWindowSize(M), V.multiply(BigInt(3)), V;
    }
  };
  function O(M, V = !0) {
    return f.fromPrivateKey(M).toRawBytes(V);
  }
  function D(M) {
    const V = nr(M), q = typeof M == "string", rt = (V || q) && M.length;
    return V ? rt === o || rt === s : q ? rt === 2 * o || rt === 2 * s : M instanceof f;
  }
  function j(M, V, q = !0) {
    if (D(M))
      throw new Error("first arg must be private key");
    if (!D(V))
      throw new Error("second arg must be public key");
    return f.fromHex(V).multiply(h(M)).toRawBytes(q);
  }
  const G = e.bits2int || function(M) {
    if (M.length > 8192)
      throw new Error("input is too large");
    const V = Qe(M), q = M.length * 8 - e.nBitLength;
    return q > 0 ? V >> BigInt(q) : V;
  }, W = e.bits2int_modN || function(M) {
    return c(G(M));
  }, z = Ic(e.nBitLength);
  function nt(M) {
    return Un("num < 2^" + e.nBitLength, M, hn, z), Ln(M, e.nByteLength);
  }
  function Q(M, V, q = wt) {
    if (["recovered", "canonical"].some((ae) => ae in q))
      throw new Error("sign() legacy options not supported");
    const { hash: rt, randomBytes: st } = e;
    let { lowS: lt, prehash: mt, extraEntropy: St } = q;
    lt == null && (lt = !0), M = we("msgHash", M), lf(q), mt && (M = we("prehashed msgHash", rt(M)));
    const Dt = W(M), It = h(V), kt = [nt(It), nt(Dt)];
    if (St != null && St !== !1) {
      const ae = St === !0 ? st(n.BYTES) : St;
      kt.push(we("extraEntropy", ae));
    }
    const Xt = rr(...kt), $t = Dt;
    function Ke(ae) {
      const at = G(ae);
      if (!g(at))
        return;
      const ze = u(at), le = f.BASE.multiply(at).toAffine(), pt = c(le.x);
      if (pt === hn)
        return;
      const ce = c(ze * c($t + pt * It));
      if (ce === hn)
        return;
      let _e = (le.x === pt ? 0 : 2) | Number(le.y & ne), Mt = ce;
      return lt && E(ce) && (Mt = A(ce), _e ^= 1), new b(pt, Mt, _e);
    }
    return { seed: Xt, k2sig: Ke };
  }
  const wt = { lowS: e.lowS, prehash: !1 }, H = { lowS: e.lowS, prehash: !1 };
  function Y(M, V, q = wt) {
    const { seed: rt, k2sig: st } = Q(M, V, q), lt = e;
    return $l(lt.hash.outputLen, lt.nByteLength, lt.hmac)(rt, st);
  }
  f.BASE._setWindowSize(8);
  function xt(M, V, q, rt = H) {
    var _e;
    const st = M;
    V = we("msgHash", V), q = we("publicKey", q);
    const { lowS: lt, prehash: mt, format: St } = rt;
    if (lf(rt), "strict" in rt)
      throw new Error("options.strict was renamed to lowS");
    if (St !== void 0 && St !== "compact" && St !== "der")
      throw new Error("format must be compact or der");
    const Dt = typeof st == "string" || nr(st), It = !Dt && !St && typeof st == "object" && st !== null && typeof st.r == "bigint" && typeof st.s == "bigint";
    if (!Dt && !It)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let kt, Xt;
    try {
      if (It && (kt = new b(st.r, st.s)), Dt) {
        try {
          St !== "compact" && (kt = b.fromDER(st));
        } catch (Mt) {
          if (!(Mt instanceof fn.Err))
            throw Mt;
        }
        !kt && St !== "der" && (kt = b.fromCompact(st));
      }
      Xt = f.fromHex(q);
    } catch {
      return !1;
    }
    if (!kt || lt && kt.hasHighS())
      return !1;
    mt && (V = e.hash(V));
    const { r: $t, s: Ke } = kt, ae = W(V), at = u(Ke), ze = c(ae * at), le = c($t * at), pt = (_e = f.BASE.multiplyAndAddUnsafe(Xt, ze, le)) == null ? void 0 : _e.toAffine();
    return pt ? c(pt.x) === $t : !1;
  }
  return {
    CURVE: e,
    getPublicKey: O,
    getSharedSecret: j,
    sign: Y,
    verify: xt,
    ProjectivePoint: f,
    Signature: b,
    utils: B
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Sg(t) {
  return {
    hash: t,
    hmac: (e, ...n) => jl(t, e, Zp(...n)),
    randomBytes: Vl
  };
}
function Ag(t, e) {
  const n = (r) => xg({ ...t, ...Sg(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $o = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Pi = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), go = BigInt(1), Ki = BigInt(2), hf = (t, e) => (t + e / Ki) / e;
function Jl(t) {
  const e = $o, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), f = BigInt(88), h = t * t * t % e, y = h * h * t % e, g = Oe(y, n, e) * y % e, m = Oe(g, n, e) * y % e, E = Oe(m, Ki, e) * h % e, A = Oe(E, o, e) * E % e, T = Oe(A, s, e) * A % e, b = Oe(T, u, e) * T % e, B = Oe(b, f, e) * b % e, O = Oe(B, u, e) * T % e, D = Oe(O, n, e) * y % e, j = Oe(D, c, e) * A % e, G = Oe(j, r, e) * h % e, W = Oe(G, Ki, e);
  if (!Da.eql(Da.sqr(W), t))
    throw new Error("Cannot find square root");
  return W;
}
const Da = Gl($o, void 0, void 0, { sqrt: Jl }), yo = Ag({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: Da,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: Pi,
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
      const e = Pi, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -go * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = hf(s * t, e), f = hf(-r * t, e);
      let h = ue(t - u * n - f * o, e), y = ue(-u * r - f * s, e);
      const g = h > c, m = y > c;
      if (g && (h = e - h), m && (y = e - y), h > c || y > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: g, k1: h, k2neg: m, k2: y };
    }
  }
}, La), td = BigInt(0), pf = {};
function Di(t, ...e) {
  let n = pf[t];
  if (n === void 0) {
    const r = La(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = rr(r, r), pf[t] = n;
  }
  return La(rr(n, ...e));
}
const Uc = (t) => t.toRawBytes(!0).slice(1), Ma = (t) => Ln(t, 32), ua = (t) => ue(t, $o), wo = (t) => ue(t, Pi), $c = yo.ProjectivePoint, kg = (t, e, n) => $c.BASE.multiplyAndAddUnsafe(t, e, n);
function Fa(t) {
  let e = yo.utils.normPrivateKeyToScalar(t), n = $c.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : wo(-e), bytes: Uc(n) };
}
function ed(t) {
  Un("x", t, go, $o);
  const e = ua(t * t), n = ua(e * t + BigInt(7));
  let r = Jl(n);
  r % Ki !== td && (r = ua(-r));
  const o = new $c(t, r, go);
  return o.assertValidity(), o;
}
const vr = Qe;
function nd(...t) {
  return wo(vr(Di("BIP0340/challenge", ...t)));
}
function Tg(t) {
  return Fa(t).bytes;
}
function Ig(t, e, n = Vl(32)) {
  const r = we("message", t), { bytes: o, scalar: s } = Fa(e), c = we("auxRand", n, 32), u = Ma(s ^ vr(Di("BIP0340/aux", c))), f = Di("BIP0340/nonce", u, o, r), h = wo(vr(f));
  if (h === td)
    throw new Error("sign failed: k is zero");
  const { bytes: y, scalar: g } = Fa(h), m = nd(y, o, r), E = new Uint8Array(64);
  if (E.set(y, 0), E.set(Ma(wo(g + m * s)), 32), !rd(E, r, o))
    throw new Error("sign: Invalid signature produced");
  return E;
}
function rd(t, e, n) {
  const r = we("signature", t, 64), o = we("message", e), s = we("publicKey", n, 32);
  try {
    const c = ed(vr(s)), u = vr(r.subarray(0, 32));
    if (!Rr(u, go, $o))
      return !1;
    const f = vr(r.subarray(32, 64));
    if (!Rr(f, go, Pi))
      return !1;
    const h = nd(Ma(u), Uc(c), o), y = kg(c, f, wo(-h));
    return !(!y || !y.hasEvenY() || y.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const od = {
  getPublicKey: Tg,
  sign: Ig,
  verify: rd,
  utils: {
    randomPrivateKey: yo.utils.randomPrivateKey,
    lift_x: ed,
    pointToBytes: Uc,
    numberToBytesBE: Ln,
    bytesToNumberBE: Qe,
    taggedHash: Di,
    mod: ue
  }
};
function Rc(t, e, n = {}) {
  t = Ua(t);
  const { aggPublicKey: r } = $a(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const o = od.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = $a(t, [o], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: s.toRawBytes(!0)
  };
}
class pi extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Oc {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new pi("Invalid s length");
    if (n.length !== 33)
      throw new pi("Invalid R length");
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
      throw new pi("Invalid partial signature length");
    if (Qe(e) >= _c.n)
      throw new pi("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Oc(e, r);
  }
}
function Bg(t, e, n, r, o, s) {
  let c;
  if ((s == null ? void 0 : s.taprootTweak) !== void 0) {
    const { preTweakedKey: h } = Rc(Ua(r));
    c = od.utils.taggedHash("TapTweak", h.subarray(1), s.taprootTweak);
  }
  const f = new kp(n, Ua(r), o, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return Oc.decode(f);
}
var _g = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ng(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var fa, gf;
function Cg() {
  if (gf) return fa;
  gf = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, o = 1 << 22, s = r, c = 1 << n, u = r << n;
  function f(y) {
    return y & e ? {} : y & o ? {
      seconds: (y & r) << n
    } : {
      blocks: y & r
    };
  }
  function h({ blocks: y, seconds: g }) {
    if (y !== void 0 && g !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (y === void 0 && g === void 0) return t;
    if (g !== void 0) {
      if (!Number.isFinite(g)) throw new TypeError("Expected Number seconds");
      if (g > u) throw new TypeError("Expected Number seconds <= " + u);
      if (g % c !== 0) throw new TypeError("Expected Number seconds as a multiple of " + c);
      return o | g >> n;
    }
    if (!Number.isFinite(y)) throw new TypeError("Expected Number blocks");
    if (y > r) throw new TypeError("Expected Number blocks <= " + s);
    return y;
  }
  return fa = { decode: f, encode: h }, fa;
}
var yf = Cg(), zt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(zt || (zt = {}));
function Lr(t = 6, e = !1) {
  return Be({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const o = r < 0, s = BigInt(r), c = [];
      for (let u = o ? -s : s; u; u >>= 8n)
        c.push(Number(u & 0xffn));
      c[c.length - 1] >= 128 ? c.push(o ? 128 : 0) : o && (c[c.length - 1] |= 128), n.bytes(new Uint8Array(c));
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
      let o = 0, s = 0n;
      for (let c = 0; c < r; ++c)
        o = n.byte(), s |= BigInt(o) << 8n * BigInt(c);
      return o >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function Ug(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Ut(t))
    try {
      const r = Lr(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const bt = Be({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (zt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(zt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(zt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Lr().encode(BigInt(n))), !Ut(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < zt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(zt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(zt.PUSHDATA2), t.bytes(Du.encode(r))) : (t.byte(zt.PUSHDATA4), t.bytes(Bt.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (zt.OP_0 < n && n <= zt.PUSHDATA4) {
        let r;
        if (n < zt.PUSHDATA1)
          r = n;
        else if (n === zt.PUSHDATA1)
          r = Cn.decodeStream(t);
        else if (n === zt.PUSHDATA2)
          r = Du.decodeStream(t);
        else if (n === zt.PUSHDATA4)
          r = Bt.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (zt.OP_1 <= n && n <= zt.OP_16)
        e.push(n - (zt.OP_1 - 1));
      else {
        const r = zt[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), wf = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, cs = Be({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, o, s] of Object.values(wf))
      if (!(o > e || e > s)) {
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
    const [n, r, o] = wf[e];
    let s = 0n;
    for (let c = 0; c < r; c++)
      s |= BigInt(t.byte()) << 8n * BigInt(c);
    if (s < o)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Ve = Rn(cs, Ji.numberBigint), Fe = Lt(cs), Lc = Te(Ve, Fe), Mi = (t) => Te(cs, t), id = se({
  txid: Lt(32, !0),
  // hash(prev_tx),
  index: Bt,
  // output number of previous tx
  finalScriptSig: Fe,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Bt
  // ?
}), tr = se({ amount: bi, script: Fe }), $g = se({
  version: gr,
  segwitFlag: hp(new Uint8Array([0, 1])),
  inputs: Mi(id),
  outputs: Mi(tr),
  witnesses: pp("segwitFlag", Te("inputs/length", Lc)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Bt
});
function Rg(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const Er = Ie($g, Rg), oo = se({
  version: gr,
  inputs: Mi(id),
  outputs: Mi(tr),
  lockTime: Bt
});
function xi(t) {
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
function mf(t, e, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: c } = t;
  typeof s == "string" && (s = _t.decode(s)), Ut(s) && (s = Er.decode(s)), !("nonWitnessUtxo" in t) && s === void 0 && (s = e == null ? void 0 : e.nonWitnessUtxo), typeof c == "string" && (c = _t.decode(c)), c === void 0 && (c = e == null ? void 0 : e.txid);
  let u = { ...e, ...t, nonWitnessUtxo: s, txid: c };
  !("nonWitnessUtxo" in t) && u.nonWitnessUtxo === void 0 && delete u.nonWitnessUtxo, u.sequence === void 0 && (u.sequence = Pc), u.tapMerkleRoot === null && delete u.tapMerkleRoot, u = qa(fs, u, e, n, o), Mc.encode(u);
  let f;
  return u.nonWitnessUtxo && u.index !== void 0 ? f = u.nonWitnessUtxo.outputs[u.index] : u.witnessUtxo && (f = u.witnessUtxo), f && !r && ud(f && f.script, u.redeemScript, u.witnessScript), u;
}
function bf(t, e = !1) {
  let n = "legacy", r = Ct.ALL;
  const o = xi(t), s = fe.decode(o.script);
  let c = s.type, u = s;
  const f = [s];
  if (s.type === "tr")
    return r = Ct.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: o.script,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!t.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let m = fe.decode(t.redeemScript);
      (m.type === "wpkh" || m.type === "wsh") && (n = "segwit"), f.push(m), u = m, c += `-${m.type}`;
    }
    if (u.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let m = fe.decode(t.witnessScript);
      m.type === "wsh" && (n = "segwit"), f.push(m), u = m, c += `-${m.type}`;
    }
    const h = f[f.length - 1];
    if (h.type === "sh" || h.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const y = fe.encode(h), g = {
      type: c,
      txType: n,
      last: h,
      lastScript: y,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return g;
  }
}
const Og = (t) => Math.ceil(t / 4), gi = new Uint8Array(32), Lg = {
  amount: 0xffffffffffffffffn,
  script: Pt
}, Pg = 8, Kg = 2, Gn = 0, Pc = 4294967295;
Ji.decimal(Pg);
const ao = (t, e) => t === void 0 ? e : t;
function Fi(t) {
  if (Array.isArray(t))
    return t.map((e) => Fi(e));
  if (Ut(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Fi(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Ct;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Ct || (Ct = {}));
var mo;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(mo || (mo = {}));
function Dg(t, e, n, r = Pt) {
  return Yt(n, e) && (t = mp(t, r), e = wc(t)), { privKey: t, pubKey: e };
}
function Wn(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function to(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: ao(t.sequence, Pc),
    finalScriptSig: ao(t.finalScriptSig, Pt)
  };
}
function la(t) {
  for (const e in t) {
    const n = e;
    zg.includes(n) || delete t[n];
  }
}
const da = se({ txid: Lt(32, !0), index: Bt });
function Mg(t) {
  if (typeof t != "number" || typeof mo[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function vf(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Ct.ANYONECANPAY),
    isNone: e === Ct.NONE,
    isSingle: e === Ct.SINGLE
  };
}
function Fg(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: ao(t.version, Kg),
    lockTime: ao(t.lockTime, 0),
    PSBTVersion: ao(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Bt.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
class jt {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = Fg(e);
    n.lockTime !== Gn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = Er.decode(e), o = new jt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      o.addOutput(s);
    if (o.outputs = r.outputs, o.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        o.inputs[s].finalScriptWitness = r.witnesses[s];
    return o;
  }
  // PSBT
  static fromPSBT(e, n = {}) {
    let r;
    try {
      r = kf.decode(e);
    } catch (g) {
      try {
        r = Tf.decode(e);
      } catch {
        throw g;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, c = o === 0 ? s == null ? void 0 : s.version : r.global.txVersion, u = o === 0 ? s == null ? void 0 : s.lockTime : r.global.fallbackLocktime, f = new jt({ ...n, version: c, lockTime: u, PSBTVersion: o }), h = o === 0 ? s == null ? void 0 : s.inputs.length : r.global.inputCount;
    f.inputs = r.inputs.slice(0, h).map((g, m) => {
      var E;
      return {
        finalScriptSig: Pt,
        ...(E = r.global.unsignedTx) == null ? void 0 : E.inputs[m],
        ...g
      };
    });
    const y = o === 0 ? s == null ? void 0 : s.outputs.length : r.global.outputCount;
    return f.outputs = r.outputs.slice(0, y).map((g, m) => {
      var E;
      return {
        ...g,
        ...(E = r.global.unsignedTx) == null ? void 0 : E.outputs[m]
      };
    }), f.global = { ...r.global, txVersion: c }, u !== Gn && (f.global.fallbackLocktime = u), f;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((s) => Af(e, fs, s));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Af(e, Vi, s)), o = { ...this.global };
    return e === 0 ? (o.unsignedTx = oo.decode(oo.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(to).map((s) => ({
        ...s,
        finalScriptSig: Pt
      })),
      outputs: this.outputs.map(Wn)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = e, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Gn && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? kf : Tf).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Gn, n = 0, r = Gn, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (e = Math.max(e, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? e : r !== Gn ? r : this.global.fallbackLocktime || Gn;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? Ct.DEFAULT : n, o = r === Ct.DEFAULT ? Ct.ALL : r & 3;
    return { sigInputs: r & Ct.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: u, sigOutputs: f } = this.inputSighash(s);
      if (u === Ct.ANYONECANPAY ? r.push(s) : e = !1, f === Ct.ALL)
        n = !1;
      else if (f === Ct.SINGLE)
        o.push(s);
      else if (f !== Ct.NONE) throw new Error(`Wrong signature hash output type: ${f}`);
    }
    return { addInput: e, addOutput: n, inputs: r, outputs: o };
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
    const n = this.outputs.map(Wn);
    e += 4 * Ve.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Fe.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Ve.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Fe.encode(r.finalScriptSig || Pt).length, this.hasWitnesses && r.finalScriptWitness && (e += Lc.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return Og(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return Er.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(to).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Pt
      })),
      outputs: this.outputs.map(Wn),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return _t.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return _t.encode(Le(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return _t.encode(Le(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Fi(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(mf(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(e)) && (o = Gg);
    }
    this.inputs[e] = mf(n, this.inputs[e], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Fi(this.outputs[e]);
  }
  getOutputAddress(e, n = _r) {
    const r = this.getOutput(e);
    if (r.script)
      return bo(n).encode(fe.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: o, script: s } = e;
    if (o === void 0 && (o = n == null ? void 0 : n.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = _t.decode(s)), s === void 0 && (s = n == null ? void 0 : n.script);
    let c = { ...n, ...e, amount: o, script: s };
    if (c.amount === void 0 && delete c.amount, c = qa(Vi, c, n, r, this.opts.allowUnknown), Fc.encode(c), c.script && !this.opts.allowUnknownOutputs && fe.decode(c.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || ud(c.script, c.redeemScript, c.witnessScript), c;
  }
  addOutput(e, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(e)), this.outputs.length - 1;
  }
  updateOutput(e, n, r = !1) {
    this.checkOutputIdx(e);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(e)) && (o = Wg);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], o);
  }
  addOutputAddress(e, n, r = _r) {
    return this.addOutput({ script: fe.encode(bo(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const o = xi(r);
      if (!o)
        throw new Error("Empty input amount");
      e += o.amount;
    }
    const n = this.outputs.map(Wn);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: o, isNone: s, isSingle: c } = vf(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return wl.encode(1n);
    n = bt.encode(bt.decode(n).filter((y) => y !== "CODESEPARATOR"));
    let u = this.inputs.map(to).map((y, g) => ({
      ...y,
      finalScriptSig: g === e ? n : Pt
    }));
    o ? u = [u[e]] : (s || c) && (u = u.map((y, g) => ({
      ...y,
      sequence: g === e ? y.sequence : 0
    })));
    let f = this.outputs.map(Wn);
    s ? f = [] : c && (f = f.slice(0, e).fill(Lg).concat([f[e]]));
    const h = Er.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: u,
      outputs: f
    });
    return Le(h, gr.encode(r));
  }
  preimageWitnessV0(e, n, r, o) {
    const { isAny: s, isNone: c, isSingle: u } = vf(r);
    let f = gi, h = gi, y = gi;
    const g = this.inputs.map(to), m = this.outputs.map(Wn);
    s || (f = Le(...g.map(da.encode))), !s && !u && !c && (h = Le(...g.map((A) => Bt.encode(A.sequence)))), !u && !c ? y = Le(...m.map(tr.encode)) : u && e < m.length && (y = Le(tr.encode(m[e])));
    const E = g[e];
    return Le(gr.encode(this.version), f, h, Lt(32, !0).encode(E.txid), Bt.encode(E.index), Fe.encode(n), bi.encode(o), Bt.encode(E.sequence), y, Bt.encode(this.lockTime), Bt.encode(r));
  }
  preimageWitnessV1(e, n, r, o, s = -1, c, u = 192, f) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const h = [
      Cn.encode(0),
      Cn.encode(r),
      // U8 sigHash
      gr.encode(this.version),
      Bt.encode(this.lockTime)
    ], y = r === Ct.DEFAULT ? Ct.ALL : r & 3, g = r & Ct.ANYONECANPAY, m = this.inputs.map(to), E = this.outputs.map(Wn);
    g !== Ct.ANYONECANPAY && h.push(...[
      m.map(da.encode),
      o.map(bi.encode),
      n.map(Fe.encode),
      m.map((T) => Bt.encode(T.sequence))
    ].map((T) => Se(Bn(...T)))), y === Ct.ALL && h.push(Se(Bn(...E.map(tr.encode))));
    const A = (f ? 1 : 0) | (c ? 2 : 0);
    if (h.push(new Uint8Array([A])), g === Ct.ANYONECANPAY) {
      const T = m[e];
      h.push(da.encode(T), bi.encode(o[e]), Fe.encode(n[e]), Bt.encode(T.sequence));
    } else
      h.push(Bt.encode(e));
    return A & 1 && h.push(Se(Fe.encode(f || Pt))), y === Ct.SINGLE && h.push(e < E.length ? Se(tr.encode(E[e])) : gi), c && h.push(co(c, u), Cn.encode(0), gr.encode(s)), mc("TapSighash", ...h);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], c = bf(s, this.opts.allowLegacyWitnessUtxo);
    if (!Ut(e)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const y = s.bip32Derivation.filter((m) => m[1].fingerprint == e.fingerprint).map(([m, { path: E }]) => {
        let A = e;
        for (const T of E)
          A = A.deriveChild(T);
        if (!Yt(A.publicKey, m))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!A.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return A;
      });
      if (!y.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let g = !1;
      for (const m of y)
        this.signIdx(m.privateKey, n) && (g = !0);
      return g;
    }
    r ? r.forEach(Mg) : r = [c.defaultSighash];
    const u = c.sighash;
    if (!r.includes(u))
      throw new Error(`Input with not allowed sigHash=${u}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: f } = this.inputSighash(n);
    if (f === Ct.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const h = xi(s);
    if (c.txType === "taproot") {
      const y = this.inputs.map(xi), g = y.map((b) => b.script), m = y.map((b) => b.amount);
      let E = !1, A = wc(e), T = s.tapMerkleRoot || Pt;
      if (s.tapInternalKey) {
        const { pubKey: b, privKey: B } = Dg(e, A, s.tapInternalKey, T), [O, D] = xl(s.tapInternalKey, T);
        if (Yt(O, b)) {
          const j = this.preimageWitnessV1(n, g, u, m), G = Bn(Fu(j, B, o), u !== Ct.DEFAULT ? new Uint8Array([u]) : Pt);
          this.updateInput(n, { tapKeySig: G }, !0), E = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [b, B] of s.tapLeafScript) {
          const O = B.subarray(0, -1), D = bt.decode(O), j = B[B.length - 1], G = co(O, j);
          if (D.findIndex((Q) => Ut(Q) && Yt(Q, A)) === -1)
            continue;
          const z = this.preimageWitnessV1(n, g, u, m, void 0, O, j), nt = Bn(Fu(z, e, o), u !== Ct.DEFAULT ? new Uint8Array([u]) : Pt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: A, leafHash: G }, nt]] }, !0), E = !0;
        }
      }
      if (!E)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const y = yp(e);
      let g = !1;
      const m = bl(y);
      for (const T of bt.decode(c.lastScript))
        Ut(T) && (Yt(T, y) || Yt(T, m)) && (g = !0);
      if (!g)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let E;
      if (c.txType === "legacy")
        E = this.preimageLegacy(n, c.lastScript, u);
      else if (c.txType === "segwit") {
        let T = c.lastScript;
        c.last.type === "wpkh" && (T = fe.encode({ type: "pkh", hash: c.last.hash })), E = this.preimageWitnessV0(n, T, u, h.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const A = wp(E, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[y, Bn(A, new Uint8Array([u]))]]
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
    let o = 0;
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(e, s, n, r) && o++;
      } catch {
      }
    if (!o)
      throw new Error("No inputs signed");
    return o;
  }
  finalizeIdx(e) {
    if (this.checkInputIdx(e), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[e], r = bf(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const f = n.tapLeafScript.sort((h, y) => Nn.encode(h[0]).length - Nn.encode(y[0]).length);
        for (const [h, y] of f) {
          const g = y.slice(0, -1), m = y[y.length - 1], E = fe.decode(g), A = co(g, m), T = n.tapScriptSig.filter((B) => Yt(B[0].leafHash, A));
          let b = [];
          if (E.type === "tr_ms") {
            const B = E.m, O = E.pubkeys;
            let D = 0;
            for (const j of O) {
              const G = T.findIndex((W) => Yt(W[0].pubKey, j));
              if (D === B || G === -1) {
                b.push(Pt);
                continue;
              }
              b.push(T[G][1]), D++;
            }
            if (D !== B)
              continue;
          } else if (E.type === "tr_ns") {
            for (const B of E.pubkeys) {
              const O = T.findIndex((D) => Yt(D[0].pubKey, B));
              O !== -1 && b.push(T[O][1]);
            }
            if (b.length !== E.pubkeys.length)
              continue;
          } else if (E.type === "unknown" && this.opts.allowUnknownInputs) {
            const B = bt.decode(g);
            if (b = T.map(([{ pubKey: O }, D]) => {
              const j = B.findIndex((G) => Ut(G) && Yt(G, O));
              if (j === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: D, pos: j };
            }).sort((O, D) => O.pos - D.pos).map((O) => O.signature), !b.length)
              continue;
          } else {
            const B = this.opts.customScripts;
            if (B)
              for (const O of B) {
                if (!O.finalizeTaproot)
                  continue;
                const D = bt.decode(g), j = O.encode(D);
                if (j === void 0)
                  continue;
                const G = O.finalizeTaproot(g, j, T);
                if (G) {
                  n.finalScriptWitness = G.concat(Nn.encode(h)), n.finalScriptSig = Pt, la(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = b.reverse().concat([g, Nn.encode(h)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Pt, la(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = Pt, s = [];
    if (r.last.type === "ms") {
      const f = r.last.m, h = r.last.pubkeys;
      let y = [];
      for (const g of h) {
        const m = n.partialSig.find((E) => Yt(g, E[0]));
        m && y.push(m[1]);
      }
      if (y = y.slice(0, f), y.length !== f)
        throw new Error(`Multisig: wrong signatures count, m=${f} n=${h.length} signatures=${y.length}`);
      o = bt.encode([0, ...y]);
    } else if (r.last.type === "pk")
      o = bt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = bt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = Pt, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let c, u;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = bt.decode(o).map((f) => {
      if (f === 0)
        return Pt;
      if (Ut(f))
        return f;
      throw new Error(`Wrong witness op=${f}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (u = s), r.type.startsWith("sh-wsh-") ? c = bt.encode([bt.encode([0, Se(r.lastScript)])]) : r.type.startsWith("sh-") ? c = bt.encode([...bt.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (c = o), !c && !u)
      throw new Error("Unknown error finalizing input");
    c && (n.finalScriptSig = c), u && (n.finalScriptWitness = u), la(n);
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
    for (const o of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[o] !== e.opts[o])
        throw new Error(`Transaction/combine: different ${o} this=${this.opts[o]} other=${e.opts[o]}`);
    for (const o of ["inputs", "outputs"])
      if (this[o].length !== e[o].length)
        throw new Error(`Transaction/combine: different ${o} length this=${this[o].length} other=${e[o].length}`);
    const n = this.global.unsignedTx ? oo.encode(this.global.unsignedTx) : Pt, r = e.global.unsignedTx ? oo.encode(e.global.unsignedTx) : Pt;
    if (!Yt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = qa(Kc, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, e.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, e.outputs[o], !0);
    return this;
  }
  clone() {
    return jt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
const Ha = Ie(Lt(null), (t) => Br(t, xe.ecdsa)), Hi = Ie(Lt(32), (t) => Br(t, xe.schnorr)), Ef = Ie(Lt(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), us = se({
  fingerprint: fp,
  path: Te(null, Bt)
}), sd = se({
  hashes: Te(Ve, Lt(32)),
  der: us
}), Hg = Lt(78), Vg = se({ pubKey: Hi, leafHash: Lt(32) }), qg = se({
  version: Cn,
  // With parity :(
  internalKey: Lt(32),
  merklePath: Te(null, Lt(32))
}), Nn = Ie(qg, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), jg = Te(null, se({
  depth: Cn,
  version: Cn,
  script: Fe
})), Wt = Lt(null), xf = Lt(20), eo = Lt(32), Kc = {
  unsignedTx: [0, !1, oo, [0], [0], !1],
  xpub: [1, Hg, us, [], [0, 2], !1],
  txVersion: [2, !1, Bt, [2], [2], !1],
  fallbackLocktime: [3, !1, Bt, [], [2], !1],
  inputCount: [4, !1, Ve, [2], [2], !1],
  outputCount: [5, !1, Ve, [2], [2], !1],
  txModifiable: [6, !1, Cn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Bt, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, fs = {
  nonWitnessUtxo: [0, !1, Er, [], [0, 2], !1],
  witnessUtxo: [1, !1, tr, [], [0, 2], !1],
  partialSig: [2, Ha, Wt, [], [0, 2], !1],
  sighashType: [3, !1, Bt, [], [0, 2], !1],
  redeemScript: [4, !1, Wt, [], [0, 2], !1],
  witnessScript: [5, !1, Wt, [], [0, 2], !1],
  bip32Derivation: [6, Ha, us, [], [0, 2], !1],
  finalScriptSig: [7, !1, Wt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Lc, [], [0, 2], !1],
  porCommitment: [9, !1, Wt, [], [0, 2], !1],
  ripemd160: [10, xf, Wt, [], [0, 2], !1],
  sha256: [11, eo, Wt, [], [0, 2], !1],
  hash160: [12, xf, Wt, [], [0, 2], !1],
  hash256: [13, eo, Wt, [], [0, 2], !1],
  txid: [14, !1, eo, [2], [2], !0],
  index: [15, !1, Bt, [2], [2], !0],
  sequence: [16, !1, Bt, [], [2], !0],
  requiredTimeLocktime: [17, !1, Bt, [], [2], !1],
  requiredHeightLocktime: [18, !1, Bt, [], [2], !1],
  tapKeySig: [19, !1, Ef, [], [0, 2], !1],
  tapScriptSig: [20, Vg, Ef, [], [0, 2], !1],
  tapLeafScript: [21, Nn, Wt, [], [0, 2], !1],
  tapBip32Derivation: [22, eo, sd, [], [0, 2], !1],
  tapInternalKey: [23, !1, Hi, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, eo, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, zg = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Gg = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Vi = {
  redeemScript: [0, !1, Wt, [], [0, 2], !1],
  witnessScript: [1, !1, Wt, [], [0, 2], !1],
  bip32Derivation: [2, Ha, us, [], [0, 2], !1],
  amount: [3, !1, cp, [2], [2], !0],
  script: [4, !1, Wt, [2], [2], !0],
  tapInternalKey: [5, !1, Hi, [], [0, 2], !1],
  tapTree: [6, !1, jg, [], [0, 2], !1],
  tapBip32Derivation: [7, Hi, sd, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, Wg = [], Sf = Te(dl, se({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: lp(Ve, se({ type: Ve, key: Lt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Lt(Ve)
}));
function Va(t) {
  const [e, n, r, o, s, c] = t;
  return { type: e, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: c };
}
se({ type: Ve, key: Lt(null) });
function Dc(t) {
  const e = {};
  for (const n in t) {
    const [r, o, s] = t[n];
    e[r] = [n, o, s];
  }
  return Be({
    encodeStream: (n, r) => {
      let o = [];
      for (const s in t) {
        const c = r[s];
        if (c === void 0)
          continue;
        const [u, f, h] = t[s];
        if (!f)
          o.push({ key: { type: u, key: Pt }, value: h.encode(c) });
        else {
          const y = c.map(([g, m]) => [
            f.encode(g),
            h.encode(m)
          ]);
          y.sort((g, m) => Ci(g[0], m[0]));
          for (const [g, m] of y)
            o.push({ key: { key: g, type: u }, value: m });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, c) => Ci(s[0].key, c[0].key));
        for (const [s, c] of r.unknown)
          o.push({ key: s, value: c });
      }
      Sf.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Sf.decodeStream(n), o = {}, s = {};
      for (const c of r) {
        let u = "unknown", f = c.key.key, h = c.value;
        if (e[c.key.type]) {
          const [y, g, m] = e[c.key.type];
          if (u = y, !g && f.length)
            throw new Error(`PSBT: Non-empty key for ${u} (key=${_t.encode(f)} value=${_t.encode(h)}`);
          if (f = g ? g.decode(f) : void 0, h = m.decode(h), !g) {
            if (o[u])
              throw new Error(`PSBT: Same keys: ${u} (key=${f} value=${h})`);
            o[u] = h, s[u] = !0;
            continue;
          }
        } else
          f = { type: c.key.type, key: c.key.key };
        if (s[u])
          throw new Error(`PSBT: Key type with empty key and no key=${u} val=${h}`);
        o[u] || (o[u] = []), o[u].push([f, h]);
      }
      return o;
    }
  });
}
const Mc = Ie(Dc(fs), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      Br(e, xe.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Br(e, xe.ecdsa);
  if (t.requiredTimeLocktime !== void 0 && t.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${t.requiredTimeLocktime}`);
  if (t.requiredHeightLocktime !== void 0 && (t.requiredHeightLocktime <= 0 || t.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${t.requiredHeightLocktime}`);
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!Yt(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
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
    const n = jt.fromRaw(Er.encode(t.nonWitnessUtxo), {
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    }), r = _t.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), Fc = Ie(Dc(Vi), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Br(e, xe.ecdsa);
  return t;
}), ad = Ie(Dc(Kc), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Yg = se({
  magic: yc(gc(new Uint8Array([255])), "psbt"),
  global: ad,
  inputs: Te("global/unsignedTx/inputs/length", Mc),
  outputs: Te(null, Fc)
}), Zg = se({
  magic: yc(gc(new Uint8Array([255])), "psbt"),
  global: ad,
  inputs: Te("global/inputCount", Mc),
  outputs: Te("global/outputCount", Fc)
});
se({
  magic: yc(gc(new Uint8Array([255])), "psbt"),
  items: Te(null, Rn(Te(dl, gp([dp(Ve), Lt(cs)])), Ji.dict()))
});
function ha(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: o } = Va(e[r]);
    if (!o.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: o } = Va(e[r]);
    if (o.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Af(t, e, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!e[s])
        continue;
      const { allowInc: c, silentIgnore: u } = Va(e[s]);
      if (!c.includes(t)) {
        if (u)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${s} but versions allows inclusion=${c}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function cd(t) {
  const e = t && t.global && t.global.version || 0;
  ha(e, Kc, t.global);
  for (const c of t.inputs)
    ha(e, fs, c);
  for (const c of t.outputs)
    ha(e, Vi, c);
  const n = e ? t.global.inputCount : t.global.unsignedTx.inputs.length;
  if (t.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = t.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const o = e ? t.global.outputCount : t.global.unsignedTx.outputs.length;
  if (t.outputs.length < o)
    throw new Error("Not outputs inputs");
  const s = t.outputs.slice(o);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return t;
}
function qa(t, e, n, r, o) {
  const s = { ...n, ...e };
  for (const c in t) {
    const u = c, [f, h, y] = t[u], g = r && !r.includes(c);
    if (e[c] === void 0 && c in e) {
      if (g)
        throw new Error(`Cannot remove signed field=${c}`);
      delete s[c];
    } else if (h) {
      const m = n && n[c] ? n[c] : [];
      let E = e[u];
      if (E) {
        if (!Array.isArray(E))
          throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
        E = E.map((b) => {
          if (b.length !== 2)
            throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
          return [
            typeof b[0] == "string" ? h.decode(_t.decode(b[0])) : b[0],
            typeof b[1] == "string" ? y.decode(_t.decode(b[1])) : b[1]
          ];
        });
        const A = {}, T = (b, B, O) => {
          if (A[b] === void 0) {
            A[b] = [B, O];
            return;
          }
          const D = _t.encode(y.encode(A[b][1])), j = _t.encode(y.encode(O));
          if (D !== j)
            throw new Error(`keyMap(${u}): same key=${b} oldVal=${D} newVal=${j}`);
        };
        for (const [b, B] of m) {
          const O = _t.encode(h.encode(b));
          T(O, b, B);
        }
        for (const [b, B] of E) {
          const O = _t.encode(h.encode(b));
          if (B === void 0) {
            if (g)
              throw new Error(`Cannot remove signed field=${u}/${b}`);
            delete A[O];
          } else
            T(O, b, B);
        }
        s[u] = Object.values(A);
      }
    } else if (typeof s[c] == "string")
      s[c] = y.decode(_t.decode(s[c]));
    else if (g && c in e && n && n[c] !== void 0 && !Yt(y.encode(e[c]), y.encode(n[c])))
      throw new Error(`Cannot change signed field=${c}`);
  }
  for (const c in s)
    if (!t[c]) {
      if (o && c === "unknown")
        continue;
      delete s[c];
    }
  return s;
}
const kf = Ie(Yg, cd), Tf = Ie(Zg, cd), Xg = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Ut(t[1]) || _t.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: bt.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, _t.decode("4e73")];
  }
};
function wr(t, e) {
  try {
    return Br(t, e), !0;
  } catch {
    return !1;
  }
}
const Qg = {
  encode(t) {
    if (!(t.length !== 2 || !Ut(t[0]) || !wr(t[0], xe.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Jg = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Ut(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, ty = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Ut(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, ey = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Ut(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, ny = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Ut(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, ry = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKMULTISIG")
      return;
    const n = t[0], r = t[e - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const o = t.slice(1, -2);
    if (r === o.length) {
      for (const s of o)
        if (!Ut(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, oy = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Ut(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, iy = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < e; r++) {
      const o = t[r];
      if (r & 1) {
        if (o !== "CHECKSIGVERIFY" || r === e - 1)
          return;
        continue;
      }
      if (!Ut(o))
        return;
      n.push(o);
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
}, sy = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Ug(t[e - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < e - 1; o++) {
        const s = t[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Ut(s))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(s);
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
}, ay = {
  encode(t) {
    return { type: "unknown", script: bt.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? bt.decode(t.script) : void 0
}, cy = [
  Xg,
  Qg,
  Jg,
  ty,
  ey,
  ny,
  ry,
  oy,
  iy,
  sy,
  ay
], uy = Rn(bt, Ji.match(cy)), fe = Ie(uy, (t) => {
  if (t.type === "pk" && !wr(t.pubkey, xe.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Ut(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Ut(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Ut(t.pubkey) || !wr(t.pubkey, xe.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!wr(n, xe.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!wr(e, xe.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function If(t, e) {
  if (!Yt(t.hash, Se(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = fe.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function ud(t, e, n) {
  if (t) {
    const r = fe.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!Yt(r.hash, bl(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = fe.decode(e);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && If(r, n);
  }
  if (e) {
    const r = fe.decode(e);
    r.type === "wsh" && n && If(r, n);
  }
}
function fy(t) {
  const e = {};
  for (const n of t) {
    const r = _t.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(_t.encode)}`);
    e[r] = !0;
  }
}
function ly(t, e, n = !1, r) {
  const o = fe.decode(t);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const c of s.pubkeys) {
      if (Yt(c, bc))
        throw new Error("Unspendable taproot key in leaf script");
      if (Yt(c, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function fd(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((c, u) => (u.weight || 1) - (c.weight || 1));
    const r = e.pop(), o = e.pop(), s = ((o == null ? void 0 : o.weight) || 1) + ((r == null ? void 0 : r.weight) || 1);
    e.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [(o == null ? void 0 : o.childs) || o, (r == null ? void 0 : r.childs) || r]
    });
  }
  const n = e[0];
  return (n == null ? void 0 : n.childs) || n;
}
function ja(t, e = []) {
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
    left: ja(t.left, [t.right.hash, ...e]),
    right: ja(t.right, [t.left.hash, ...e])
  };
}
function za(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...za(t.left), ...za(t.right)];
}
function Ga(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: f, script: h } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !Yt(t.tapMerkleRoot, Pt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const y = typeof h == "string" ? _t.decode(h) : h;
    if (!Ut(y))
      throw new Error(`checkScript: wrong script type=${y}`);
    return ly(y, e, n), {
      type: "leaf",
      version: f,
      script: y,
      hash: co(y, f)
    };
  }
  if (t.length !== 2 && (t = fd(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Ga(t[0], e, n), s = Ga(t[1], e, n);
  let [c, u] = [o.hash, s.hash];
  return Ci(u, c) === -1 && ([c, u] = [u, c]), { type: "branch", left: o, right: s, hash: mc("TapBranch", c, u) };
}
const qi = 192, co = (t, e = qi) => mc("TapLeaf", new Uint8Array([e]), Fe.encode(t));
function ld(t, e, n = _r, r = !1, o) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof t == "string" ? _t.decode(t) : t || bc;
  if (!wr(s, xe.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let c = e ? ja(Ga(e, s, r)) : void 0;
  const u = c ? c.hash : void 0, [f, h] = xl(s, u || Pt);
  let y;
  c && (y = za(c).map((E) => ({
    ...E,
    controlBlock: Nn.encode({
      version: (E.version || qi) + h,
      internalKey: s,
      merklePath: E.path
    })
  })));
  let g;
  y && (g = y.map((E) => [
    Nn.decode(E.controlBlock),
    Bn(E.script, new Uint8Array([E.version || qi]))
  ]));
  const m = {
    type: "tr",
    script: fe.encode({ type: "tr", pubkey: f }),
    address: bo(n).encode({ type: "tr", pubkey: f }),
    // For tests
    tweakedPubkey: f,
    // PSBT stuff
    tapInternalKey: s
  };
  return y && (m.leaves = y), g && (m.tapLeafScript = g), u && (m.tapMerkleRoot = u), m;
}
function dy(t, e, n = !1) {
  return n || fy(e), {
    type: "tr_ms",
    script: fe.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const dd = Qh(Se);
function hd(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function pa(t, e, n = _r) {
  hd(t, e);
  const r = t === 0 ? Ia : ll;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Bf(t, e) {
  return dd.encode(Bn(Uint8Array.from(e), t));
}
function bo(t = _r) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return pa(0, e.hash, t);
      if (n === "wsh")
        return pa(0, e.hash, t);
      if (n === "tr")
        return pa(1, e.pubkey, t);
      if (n === "pkh")
        return Bf(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Bf(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Ia.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ll.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, c = Ia.fromWords(s);
        if (hd(o, c), o === 0 && c.length === 32)
          return { type: "wsh", hash: c };
        if (o === 0 && c.length === 20)
          return { type: "wpkh", hash: c };
        if (o === 1 && c.length === 32)
          return { type: "tr", pubkey: c };
        throw new Error("Unknown witness program");
      }
      const n = dd.decode(e);
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
class Ot extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const hy = new Ot("leaf not found in tx tree"), py = new Ot("parent not found");
class gy {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new Ot("empty vtxo tree");
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
      for (const o of r)
        o.parentTxid === e && n.push(o);
    return n;
  }
  // Returns the total number of nodes in the vtxo tree
  numberOfNodes() {
    return this.tree.reduce((e, n) => e + n.length, 0);
  }
  // Returns the branch of the given vtxo txid from root to leaf
  branch(e) {
    const n = [], o = this.leaves().find((c) => c.txid === e);
    if (!o)
      throw hy;
    n.push(o);
    const s = this.root().txid;
    for (; n[0].txid !== s; ) {
      const c = this.findParent(n[0]);
      n.unshift(c);
    }
    return n;
  }
  // Helper method to find parent of a node
  findParent(e) {
    for (const n of this.tree)
      for (const r of n)
        if (r.txid === e.parentTxid)
          return r;
    throw py;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = jt.fromPSBT(Ee.decode(n.tx)), o = ht.encode(Le(r.toBytes(!0)).reverse());
        if (o !== n.txid)
          throw new Ot(`node ${n.txid} has txid ${n.txid}, but computed txid is ${o}`);
        try {
          this.findParent(n);
        } catch (s) {
          throw new Ot(`node ${n.txid} has no parent: ${s instanceof Error ? s.message : String(s)}`);
        }
      }
  }
}
const ga = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function yy(t) {
  if (t.length < ga.length)
    return !1;
  for (let e = 0; e < ga.length; e++)
    if (t[e] !== ga[e])
      return !1;
  return !0;
}
function pd(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    yy(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const ya = new Error("missing vtxo tree");
class vo {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = vl();
    return new vo(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return yo.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw ya;
    this.myNonces || (this.myNonces = this.generateNonces());
    const e = [];
    for (const n of this.myNonces) {
      const r = [];
      for (const o of n) {
        if (!o) {
          r.push(null);
          continue;
        }
        r.push({ pubNonce: o.pubNonce });
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
      throw ya;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], o = this.tree.levels[n];
      for (let s = 0; s < o.length; s++) {
        const c = o[s], u = jt.fromPSBT(Ee.decode(c.tx)), f = this.signPartial(u, n, s);
        f ? r.push(f) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw ya;
    const e = [], n = yo.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const o = [];
      for (let s = 0; s < r.length; s++) {
        const c = Tp(n);
        o.push(c);
      }
      e.push(o);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw vo.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const o = this.myNonces[n][r];
    if (!o)
      return null;
    const s = this.aggregateNonces[n][r];
    if (!s)
      throw new Error("missing aggregate nonce");
    const c = [], u = [], f = pd(e), { finalKey: h } = Rc(f, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let g = 0; g < e.inputsLength; g++) {
      const m = wy(h, this.tree, this.rootSharedOutputAmount, e);
      c.push(m.amount), u.push(m.script);
    }
    const y = e.preimageWitnessV1(
      0,
      // always first input
      u,
      mo.DEFAULT,
      c
    );
    return Bg(o.secNonce, this.secretKey, s.pubNonce, f, y, {
      taprootTweak: this.scriptRoot
    });
  }
}
vo.NOT_INITIALIZED = new Error("session not initialized, call init method");
function wy(t, e, n, r) {
  const o = bt.encode(["OP_1", t.slice(1)]), s = e.levels[0][0];
  if (!s)
    throw new Error("empty vtxo tree");
  const c = r.getInput(0);
  if (!c.txid)
    throw new Error("missing input txid");
  const u = ht.encode(c.txid);
  if (s.parentTxid === u)
    return {
      amount: n,
      script: o
    };
  let f = null;
  for (const g of e.levels) {
    for (const m of g)
      if (m.txid === u) {
        f = m;
        break;
      }
    if (f)
      break;
  }
  if (!f)
    throw new Error("parent tx not found");
  const h = jt.fromPSBT(Ee.decode(f.tx));
  if (!c.index)
    throw new Error("missing input index");
  const y = h.getOutput(c.index);
  if (!y)
    throw new Error("parent output not found");
  if (!y.amount)
    throw new Error("parent output amount not found");
  return {
    amount: y.amount,
    script: o
  };
}
const _f = new Uint8Array(32).fill(0);
class ji {
  constructor(e) {
    this.key = e || vl();
  }
  static fromPrivateKey(e) {
    return new ji(e);
  }
  static fromHex(e) {
    return new ji(ht.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, _f))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, void 0, _f))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  xOnlyPublicKey() {
    return wc(this.key);
  }
  signerSession() {
    return vo.random();
  }
}
class Ro {
  constructor(e, n, r) {
    if (this.serverPubKey = e, this.tweakedPubKey = n, this.hrp = r, e.length !== 32)
      throw new Error("Invalid server public key length");
    if (n.length !== 32)
      throw new Error("Invalid tweaked public key length");
  }
  static decode(e) {
    const n = li.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(li.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const o = r.slice(0, 32), s = r.slice(32, 64);
    return new Ro(o, s, n.prefix);
  }
  encode() {
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = li.toWords(e);
    return li.encode(this.hrp, n, 1023);
  }
  get pkScript() {
    return bt.encode(["OP_1", this.tweakedPubKey]);
  }
}
var Zt;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(Zt || (Zt = {}));
function gd(t) {
  const e = [
    je,
    yn,
    zi,
    Gi,
    Eo
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${ht.encode(t)} is not a valid tapscript`);
}
var je;
(function(t) {
  let e;
  (function(u) {
    u[u.CHECKSIG = 0] = "CHECKSIG", u[u.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(e = t.MultisigType || (t.MultisigType = {}));
  function n(u) {
    if (u.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const h of u.pubkeys)
      if (h.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
    if (u.type || (u.type = e.CHECKSIG), u.type === e.CHECKSIGADD)
      return {
        type: Zt.Multisig,
        params: u,
        script: dy(u.pubkeys.length, u.pubkeys).script,
        witnessSize: () => u.pubkeys.length * 64
      };
    const f = [];
    for (let h = 0; h < u.pubkeys.length; h++)
      f.push(u.pubkeys[h]), h < u.pubkeys.length - 1 ? f.push("CHECKSIGVERIFY") : f.push("CHECKSIG");
    return {
      type: Zt.Multisig,
      params: u,
      script: bt.encode(f),
      witnessSize: () => u.pubkeys.length * 64
    };
  }
  t.encode = n;
  function r(u) {
    if (u.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return o(u);
    } catch {
      try {
        return s(u);
      } catch (h) {
        throw new Error(`Failed to decode script: ${h instanceof Error ? h.message : String(h)}`);
      }
    }
  }
  t.decode = r;
  function o(u) {
    const f = bt.decode(u), h = [];
    let y = !1;
    for (let m = 0; m < f.length; m++) {
      const E = f[m];
      if (typeof E != "string" && typeof E != "number") {
        if (E.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${E.length}`);
        if (h.push(E), m + 1 >= f.length || f[m + 1] !== "CHECKSIGADD" && f[m + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        m++;
        continue;
      }
      if (m === f.length - 1) {
        if (E !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        y = !0;
      }
    }
    if (!y)
      throw new Error("Missing NUMEQUAL operation");
    if (h.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const g = n({
      pubkeys: h,
      type: e.CHECKSIGADD
    });
    if (ht.encode(g.script) !== ht.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.Multisig,
      params: { pubkeys: h, type: e.CHECKSIGADD },
      script: u,
      witnessSize: () => h.length * 64
    };
  }
  function s(u) {
    const f = bt.decode(u), h = [];
    for (let g = 0; g < f.length; g++) {
      const m = f[g];
      if (typeof m != "string" && typeof m != "number") {
        if (m.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${m.length}`);
        if (h.push(m), g + 1 >= f.length)
          throw new Error("Unexpected end of script");
        const E = f[g + 1];
        if (E !== "CHECKSIGVERIFY" && E !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (g === f.length - 2 && E !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        g++;
        continue;
      }
    }
    if (h.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const y = n({ pubkeys: h, type: e.CHECKSIG });
    if (ht.encode(y.script) !== ht.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.Multisig,
      params: { pubkeys: h, type: e.CHECKSIG },
      script: u,
      witnessSize: () => h.length * 64
    };
  }
  function c(u) {
    return u.type === Zt.Multisig;
  }
  t.is = c;
})(je || (je = {}));
var yn;
(function(t) {
  function e(o) {
    for (const h of o.pubkeys)
      if (h.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
    const c = [Lr().encode(BigInt(yf.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], u = je.encode(o), f = new Uint8Array([
      ...bt.encode(c),
      ...u.script
    ]);
    return {
      type: Zt.CSVMultisig,
      params: o,
      script: f,
      witnessSize: () => o.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = bt.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const u = new Uint8Array(bt.encode(s.slice(3)));
    let f;
    try {
      f = je.decode(u);
    } catch (E) {
      throw new Error(`Invalid multisig script: ${E instanceof Error ? E.message : String(E)}`);
    }
    const h = Number(Lr().decode(c)), y = yf.decode(h), g = y.blocks !== void 0 ? { type: "blocks", value: BigInt(y.blocks) } : { type: "seconds", value: BigInt(y.seconds) }, m = e({
      timelock: g,
      ...f.params
    });
    if (ht.encode(m.script) !== ht.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.CSVMultisig,
      params: {
        timelock: g,
        ...f.params
      },
      script: o,
      witnessSize: () => f.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Zt.CSVMultisig;
  }
  t.is = r;
})(yn || (yn = {}));
var zi;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...bt.encode(["VERIFY"]),
      ...yn.encode(o).script
    ]);
    return {
      type: Zt.ConditionCSVMultisig,
      params: o,
      script: s,
      witnessSize: (c) => c + o.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = bt.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let g = s.length - 1; g >= 0; g--)
      s[g] === "VERIFY" && (c = g);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const u = new Uint8Array(bt.encode(s.slice(0, c))), f = new Uint8Array(bt.encode(s.slice(c + 1)));
    let h;
    try {
      h = yn.decode(f);
    } catch (g) {
      throw new Error(`Invalid CSV multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const y = e({
      conditionScript: u,
      ...h.params
    });
    if (ht.encode(y.script) !== ht.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.ConditionCSVMultisig,
      params: {
        conditionScript: u,
        ...h.params
      },
      script: o,
      witnessSize: (g) => g + h.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Zt.ConditionCSVMultisig;
  }
  t.is = r;
})(zi || (zi = {}));
var Gi;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...bt.encode(["VERIFY"]),
      ...je.encode(o).script
    ]);
    return {
      type: Zt.ConditionMultisig,
      params: o,
      script: s,
      witnessSize: (c) => c + o.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = bt.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let g = s.length - 1; g >= 0; g--)
      s[g] === "VERIFY" && (c = g);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const u = new Uint8Array(bt.encode(s.slice(0, c))), f = new Uint8Array(bt.encode(s.slice(c + 1)));
    let h;
    try {
      h = je.decode(f);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const y = e({
      conditionScript: u,
      ...h.params
    });
    if (ht.encode(y.script) !== ht.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.ConditionMultisig,
      params: {
        conditionScript: u,
        ...h.params
      },
      script: o,
      witnessSize: (g) => g + h.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Zt.ConditionMultisig;
  }
  t.is = r;
})(Gi || (Gi = {}));
var Eo;
(function(t) {
  function e(o) {
    const c = [Lr().encode(o.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], u = bt.encode(c), f = new Uint8Array([
      ...u,
      ...je.encode(o).script
    ]);
    return {
      type: Zt.CLTVMultisig,
      params: o,
      script: f,
      witnessSize: () => o.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = bt.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const u = new Uint8Array(bt.encode(s.slice(3)));
    let f;
    try {
      f = je.decode(u);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const h = Lr().decode(c), y = e({
      absoluteTimelock: h,
      ...f.params
    });
    if (ht.encode(y.script) !== ht.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Zt.CLTVMultisig,
      params: {
        absoluteTimelock: h,
        ...f.params
      },
      script: o,
      witnessSize: () => f.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Zt.CLTVMultisig;
  }
  t.is = r;
})(Eo || (Eo = {}));
function Hc(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Pr {
  static decode(e) {
    return new Pr(e.map(ht.decode));
  }
  constructor(e) {
    this.scripts = e;
    const n = fd(e.map((o) => ({ script: o, leafVersion: qi }))), r = ld(bc, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return this.scripts.map(ht.encode);
  }
  address(e, n) {
    return new Ro(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return bt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return bo(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => ht.encode(Hc(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
}
var Nf;
(function(t) {
  class e extends Pr {
    constructor(r) {
      const { sender: o, receiver: s, server: c, preimageHash: u, refundLocktime: f, unilateralClaimDelay: h, unilateralRefundDelay: y, unilateralRefundWithoutReceiverDelay: g } = r, m = my(u), E = Gi.encode({
        conditionScript: m,
        pubkeys: [s, c]
      }).script, A = je.encode({
        pubkeys: [o, s, c]
      }).script, T = Eo.encode({
        absoluteTimelock: f,
        pubkeys: [o, c]
      }).script, b = zi.encode({
        conditionScript: m,
        timelock: h,
        pubkeys: [s]
      }).script, B = yn.encode({
        timelock: y,
        pubkeys: [o, s]
      }).script, O = yn.encode({
        timelock: g,
        pubkeys: [o]
      }).script;
      super([
        E,
        A,
        T,
        b,
        B,
        O
      ]), this.options = r, this.claimScript = ht.encode(E), this.refundScript = ht.encode(A), this.refundWithoutReceiverScript = ht.encode(T), this.unilateralClaimScript = ht.encode(b), this.unilateralRefundScript = ht.encode(B), this.unilateralRefundWithoutReceiverScript = ht.encode(O);
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
})(Nf || (Nf = {}));
function my(t) {
  return bt.encode(["HASH160", t, "EQUAL"]);
}
var xo;
(function(t) {
  class e extends Pr {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, u = je.encode({
        pubkeys: [o, s]
      }).script, f = yn.encode({
        timelock: c,
        pubkeys: [o]
      }).script;
      super([u, f]), this.options = r, this.forfeitScript = ht.encode(u), this.exitScript = ht.encode(f);
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
})(xo || (xo = {}));
var So;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(So || (So = {}));
function by(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function vy(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function Ey(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function yi(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function xy(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function yd(t, e, n) {
  const r = [];
  let o = [...e];
  for (const c of [...t, ...e]) {
    if (c.virtualStatus.state !== "pending" && n.has(c.virtualStatus.batchTxID || ""))
      continue;
    const u = by(o, c);
    o = Cf(o, u);
    const f = yi(u);
    if (c.value <= f)
      continue;
    const h = vy(o, c);
    o = Cf(o, h);
    const y = yi(h);
    if (c.value <= y)
      continue;
    const g = {
      roundTxid: c.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let m = c.virtualStatus.state !== "pending";
    c.virtualStatus.state === "pending" && (g.redeemTxid = c.txid, c.spentBy && (m = !0)), r.push({
      key: g,
      amount: c.value - f - y,
      type: So.TxReceived,
      createdAt: c.createdAt.getTime(),
      settled: m
    });
  }
  const s = /* @__PURE__ */ new Map();
  for (const c of e) {
    if (!c.spentBy)
      continue;
    s.has(c.spentBy) || s.set(c.spentBy, []);
    const u = s.get(c.spentBy);
    s.set(c.spentBy, [...u, c]);
  }
  for (const [c, u] of s) {
    const f = Ey([...t, ...e], c), h = yi(f), y = yi(u);
    if (y <= h)
      continue;
    const g = xy(f, u), m = {
      roundTxid: g.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    g.virtualStatus.state === "pending" && (m.redeemTxid = g.txid), r.push({
      key: m,
      amount: y - h,
      type: So.TxSent,
      createdAt: g.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Cf(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var Wa;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(Wa || (Wa = {}));
class Uf {
  static create(e) {
    const { address: n, ...r } = e, o = {};
    for (const [c, u] of Object.entries(r))
      if (u !== void 0)
        if (c === "amount") {
          if (!isFinite(u)) {
            console.warn("Invalid amount");
            continue;
          }
          if (u < 0)
            continue;
          o[c] = u;
        } else c === "ark" ? typeof u == "string" && (u.startsWith("ark") || u.startsWith("tark")) ? o[c] = u : console.warn("Invalid ARK address format") : c === "sp" ? typeof u == "string" && u.startsWith("sp") ? o[c] = u : console.warn("Invalid Silent Payment address format") : (typeof u == "string" || typeof u == "number") && (o[c] = u);
    const s = Object.keys(o).length > 0 ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(o).map(([c, u]) => [
      c,
      String(u)
    ]))).toString() : "";
    return `bitcoin:${n ? n.toLowerCase() : ""}${s}`;
  }
  static parse(e) {
    if (!e.toLowerCase().startsWith("bitcoin:"))
      throw new Error(Wa.INVALID_URI);
    const n = e.slice(e.toLowerCase().indexOf("bitcoin:") + 8), [r, o] = n.split("?"), s = {};
    if (r && (s.address = r.toLowerCase()), o) {
      const c = new URLSearchParams(o);
      for (const [u, f] of c.entries())
        if (f)
          if (u === "amount") {
            const h = Number(f);
            if (!isFinite(h) || h < 0)
              continue;
            s[u] = h;
          } else u === "ark" ? f.startsWith("ark") || f.startsWith("tark") ? s[u] = f : console.warn("Invalid ARK address format") : u === "sp" ? f.startsWith("sp") ? s[u] = f : console.warn("Invalid Silent Payment address format") : s[u] = f;
    }
    return {
      originalString: e,
      params: s
    };
  }
}
function Sy(t, e) {
  const n = [...t].sort((c, u) => u.value - c.value), r = [];
  let o = 0;
  for (const c of n)
    if (r.push(c), o += c.value, o >= e)
      break;
  if (o < e)
    return { inputs: null, changeAmount: 0 };
  const s = o - e;
  return {
    inputs: r,
    changeAmount: s
  };
}
function Ay(t, e) {
  const n = [...t].sort((c, u) => {
    const f = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, h = u.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return f !== h ? f - h : u.value - c.value;
  }), r = [];
  let o = 0;
  for (const c of n)
    if (r.push(c), o += c.value, o >= e)
      break;
  if (o < e)
    return { inputs: null, changeAmount: 0 };
  const s = o - e;
  return {
    inputs: r,
    changeAmount: s
  };
}
const ky = (t) => Ty[t], Ty = {
  bitcoin: no(_r, "ark"),
  testnet: no(fi, "tark"),
  signet: no(fi, "tark"),
  mutinynet: no(fi, "tark"),
  regtest: no({
    ...fi,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function no(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const Iy = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class By {
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
var ge;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(ge || (ge = {}));
class wd {
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
    const o = await r.json();
    return {
      spendableVtxos: [...o.spendableVtxos || []].map(wi),
      spentVtxos: [...o.spentVtxos || []].map(wi)
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
      const s = await r.text();
      try {
        const c = JSON.parse(s);
        throw new Error(`Failed to submit virtual transaction: ${c.message || c.error || s}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${s}`);
      }
    }
    const o = await r.json();
    return o.txid || o.signedRedeemTx;
  }
  async subscribeToEvents(e) {
    const n = `${this.serverUrl}/v1/events`;
    let r = new AbortController();
    return (async () => {
      for (; !r.signal.aborted; )
        try {
          const o = await fetch(n, {
            headers: {
              Accept: "application/json"
            },
            signal: r.signal
          });
          if (!o.ok)
            throw new Error(`Unexpected status ${o.status} when fetching event stream`);
          if (!o.body)
            throw new Error("Response body is null");
          const s = o.body.getReader(), c = new TextDecoder();
          let u = "";
          for (; !r.signal.aborted; ) {
            const { done: f, value: h } = await s.read();
            if (f)
              break;
            u += c.decode(h, { stream: !0 });
            const y = u.split(`
`);
            for (let g = 0; g < y.length - 1; g++) {
              const m = y[g].trim();
              if (m)
                try {
                  const E = JSON.parse(m);
                  e(E);
                } catch (E) {
                  console.error("Failed to parse event:", E);
                }
            }
            u = y[y.length - 1];
          }
        } catch (o) {
          r.signal.aborted || console.error("Event stream error:", o);
        }
    })(), () => {
      r.abort(), r = new AbortController();
    };
  }
  async registerInputsForNextRound(e) {
    const n = `${this.serverUrl}/v1/round/registerInputs`, r = [], o = [];
    for (const u of e)
      typeof u == "string" ? o.push(u) : r.push({
        outpoint: {
          txid: u.outpoint.txid,
          vout: u.outpoint.vout
        },
        tapscripts: {
          scripts: u.tapscripts
        }
      });
    const s = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: r,
        notes: o
      })
    });
    if (!s.ok) {
      const u = await s.text();
      throw new Error(`Failed to register inputs: ${u}`);
    }
    return { requestId: (await s.json()).requestId };
  }
  async registerOutputsForNextRound(e, n, r, o = !1) {
    const s = `${this.serverUrl}/v1/round/registerOutputs`, c = await fetch(s, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestId: e,
        outputs: n.map((u) => ({
          address: u.address,
          amount: u.amount.toString(10)
        })),
        musig2: {
          cosignersPublicKeys: r,
          signingAll: o
        }
      })
    });
    if (!c.ok) {
      const u = await c.text();
      throw new Error(`Failed to register outputs: ${u}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const o = `${this.serverUrl}/v1/round/tree/submitNonces`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeNonces: Cy(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree nonces: ${c}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const o = `${this.serverUrl}/v1/round/tree/submitSignatures`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeSignatures: Uy(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree signatures: ${c}`);
    }
  }
  async submitSignedForfeitTxs(e, n) {
    const r = `${this.serverUrl}/v1/round/submitForfeitTxs`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: e,
        signedRoundTx: n
      })
    });
    if (!o.ok)
      throw new Error(`Failed to submit forfeit transactions: ${o.statusText}`);
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
        const o = r.body.getReader(), s = new TextDecoder();
        let c = "";
        for (; !(e != null && e.aborted); ) {
          const { done: u, value: f } = await o.read();
          if (u)
            break;
          c += s.decode(f, { stream: !0 });
          const h = c.split(`
`);
          for (let y = 0; y < h.length - 1; y++) {
            const g = h[y].trim();
            if (g)
              try {
                const m = JSON.parse(g), E = this.parseSettlementEvent(m.result);
                E && (yield E);
              } catch (m) {
                throw console.error("Failed to parse event:", m), m;
              }
          }
          c = h[h.length - 1];
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
        const o = await fetch(r, {
          headers: {
            Accept: "application/json"
          }
        });
        if (!o.ok)
          throw new Error(`Unexpected status ${o.status} when subscribing to address updates`);
        if (!o.body)
          throw new Error("Response body is null");
        const s = o.body.getReader(), c = new TextDecoder();
        let u = "";
        for (; !n.aborted; ) {
          const { done: f, value: h } = await s.read();
          if (f)
            break;
          u += c.decode(h, { stream: !0 });
          const y = u.split(`
`);
          for (let g = 0; g < y.length - 1; g++) {
            const m = y[g].trim();
            if (m)
              try {
                const E = JSON.parse(m);
                "result" in E && (yield {
                  newVtxos: (E.result.newVtxos || []).map(wi),
                  spentVtxos: (E.result.spentVtxos || []).map(wi)
                });
              } catch (E) {
                throw console.error("Failed to parse address update:", E), E;
              }
          }
          u = y[y.length - 1];
        }
      } catch (o) {
        throw console.error("Address subscription error:", o), o;
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
    return e.levels.forEach((r) => r.nodes.forEach((o) => {
      o.parentTxid && n.add(o.parentTxid);
    })), new gy(e.levels.map((r) => r.nodes.map((o) => ({
      txid: o.txid,
      tx: o.tx,
      parentTxid: o.parentTxid,
      leaf: !n.has(o.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: ge.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: ge.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: ge.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: ge.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: ge.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: Ny(ht.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function md(t) {
  let e = 4;
  for (const s of t) {
    e += 4;
    for (const c of s)
      e += 1, e += c.length;
  }
  const n = new ArrayBuffer(e), r = new DataView(n);
  let o = 0;
  r.setUint32(o, t.length, !0), o += 4;
  for (const s of t) {
    r.setUint32(o, s.length, !0), o += 4;
    for (const c of s) {
      const u = c.length > 0;
      r.setInt8(o, u ? 1 : 0), o += 1, u && (new Uint8Array(n).set(c, o), o += c.length);
    }
  }
  return new Uint8Array(n);
}
function _y(t, e) {
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let r = 0;
  const o = n.getUint32(r, !0);
  r += 4;
  const s = [];
  for (let c = 0; c < o; c++) {
    const u = n.getUint32(r, !0);
    r += 4;
    const f = [];
    for (let h = 0; h < u; h++) {
      const y = n.getUint8(r) === 1;
      if (r += 1, y) {
        const g = new Uint8Array(t.buffer, t.byteOffset + r, e);
        f.push(new Uint8Array(g)), r += e;
      } else
        f.push(new Uint8Array());
    }
    s.push(f);
  }
  return s;
}
function Ny(t) {
  return _y(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function Cy(t) {
  return ht.encode(md(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function Uy(t) {
  return ht.encode(md(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function wi(t) {
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
function $y({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: o, vtxoPkScript: s, connectorPkScript: c, serverPkScript: u, txLocktime: f }) {
  const h = new jt({
    version: 2,
    lockTime: f
  });
  h.addInput({
    txid: t.txid,
    index: t.vout,
    witnessUtxo: {
      script: c,
      amount: r
    },
    sequence: 4294967295
  }), h.addInput({
    txid: e.txid,
    index: e.vout,
    witnessUtxo: {
      script: s,
      amount: n
    },
    sequence: f ? 4294967294 : 4294967295,
    // MAX_SEQUENCE - 1 if locktime is set
    sighashType: mo.DEFAULT
  });
  const y = BigInt(n) + BigInt(r) - BigInt(o);
  return h.addOutput({
    script: u,
    amount: y
  }), h;
}
class Kt {
  constructor(e, n, r, o, s, c) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = s, this.outputSize = c;
  }
  static create() {
    return new Kt(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += Kt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Kt.INPUT_SIZE + Kt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const o = 1 + Kt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + o, this.inputSize += Kt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Kt.OUTPUT_SIZE + Kt.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (c) => c < 253 ? 1 : c < 65535 ? 3 : c < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let s = (Kt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Kt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += Kt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Ry(s);
  }
}
Kt.P2PKH_SCRIPT_SIG_SIZE = 108;
Kt.INPUT_SIZE = 41;
Kt.BASE_CONTROL_BLOCK_SIZE = 33;
Kt.OUTPUT_SIZE = 9;
Kt.P2WKH_OUTPUT_SIZE = 22;
Kt.BASE_TX_SIZE = 10;
Kt.WITNESS_HEADER_SIZE = 2;
Kt.WITNESS_SCALE_FACTOR = 4;
const Ry = (t) => {
  const e = BigInt(Math.ceil(t / Kt.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, Oy = new Ot("invalid settlement transaction"), Ya = new Ot("invalid settlement transaction outputs"), bd = new Ot("empty tree"), Ly = new Ot("invalid root level"), Vc = new Ot("invalid number of inputs"), uo = new Ot("wrong settlement txid"), Za = new Ot("invalid amount"), Py = new Ot("no leaves"), Ky = new Ot("node transaction empty"), Dy = new Ot("node txid empty"), My = new Ot("node parent txid empty"), Fy = new Ot("node txid different"), $f = new Ot("parent txid input mismatch"), Hy = new Ot("leaf node has children"), Rf = new Ot("invalid taproot script"), Vy = new Ot("invalid internal key");
new Ot("invalid control block");
const qy = new Ot("invalid root transaction"), jy = new Ot("invalid node transaction"), wa = 0, Of = 1;
function zy(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw bd;
  const r = jt.fromPSBT(Ee.decode(n.tx));
  if (r.inputsLength !== 1)
    throw Vc;
  const o = r.getInput(0), s = jt.fromPSBT(Ee.decode(t));
  if (s.outputsLength <= Of)
    throw Ya;
  const c = ht.encode(Le(s.toBytes(!0)).reverse());
  if (!o.txid || ht.encode(o.txid) !== c || o.index !== Of)
    throw uo;
}
function Gy(t, e, n) {
  e.validate();
  let r;
  try {
    r = jt.fromPSBT(Ee.decode(t));
  } catch {
    throw Oy;
  }
  if (r.outputsLength <= wa)
    throw Ya;
  const o = r.getOutput(wa);
  if (!(o != null && o.amount))
    throw Ya;
  const s = o.amount;
  if (e.numberOfNodes() === 0)
    throw bd;
  if (e.levels[0].length !== 1)
    throw Ly;
  const u = e.levels[0][0];
  let f;
  try {
    f = jt.fromPSBT(Ee.decode(u.tx));
  } catch {
    throw qy;
  }
  if (f.inputsLength !== 1)
    throw Vc;
  const h = f.getInput(0);
  if (!h.txid || h.index === void 0)
    throw uo;
  const y = ht.encode(Le(r.toBytes(!0)).reverse());
  if (ht.encode(h.txid) !== y || h.index !== wa)
    throw uo;
  let g = 0n;
  for (let m = 0; m < f.outputsLength; m++) {
    const E = f.getOutput(m);
    E != null && E.amount && (g += E.amount);
  }
  if (g >= s)
    throw Za;
  if (e.leaves().length === 0)
    throw Py;
  for (const m of e.levels)
    for (const E of m)
      Wy(e, E, n);
}
function Wy(t, e, n) {
  if (!e.tx)
    throw Ky;
  if (!e.txid)
    throw Dy;
  if (!e.parentTxid)
    throw My;
  let r;
  try {
    r = jt.fromPSBT(Ee.decode(e.tx));
  } catch {
    throw jy;
  }
  if (ht.encode(Le(r.toBytes(!0)).reverse()) !== e.txid)
    throw Fy;
  if (r.inputsLength !== 1)
    throw Vc;
  const s = r.getInput(0);
  if (!s.txid || ht.encode(s.txid) !== e.parentTxid)
    throw $f;
  const c = t.children(e.txid);
  if (e.leaf && c.length >= 1)
    throw Hy;
  for (let u = 0; u < c.length; u++) {
    const f = c[u], h = jt.fromPSBT(Ee.decode(f.tx)), y = r.getOutput(u);
    if (!(y != null && y.script))
      throw Rf;
    const g = y.script.slice(2);
    if (g.length !== 32)
      throw Rf;
    const m = pd(h), { finalKey: E } = Rc(m, !0, {
      taprootTweak: n
    });
    if (ht.encode(E) !== ht.encode(g.slice(2)))
      throw Vy;
    let A = 0n;
    for (let T = 0; T < h.outputsLength; T++) {
      const b = h.getOutput(T);
      b != null && b.amount && (A += b.amount);
    }
    if (!y.amount || A >= y.amount)
      throw Za;
  }
}
const Yy = 255;
new TextEncoder().encode("condition");
const Zy = new TextEncoder().encode("taptree");
function Xy(t, e, n) {
  var r;
  e.updateInput(t, {
    unknown: [
      ...((r = e.getInput(t)) == null ? void 0 : r.unknown) ?? [],
      [
        {
          type: Yy,
          key: Zy
        },
        Jy(n)
      ]
    ]
  });
}
function Qy(t, e) {
  let n;
  for (const o of t) {
    const s = gd(Hc(o.tapLeafScript));
    Eo.is(s) && (n = Number(s.params.absoluteTimelock));
  }
  const r = new jt({
    allowUnknown: !0,
    lockTime: n
  });
  for (const [o, s] of t.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Pc - 1 : void 0,
      witnessUtxo: {
        script: Pr.decode(s.scripts).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Xy(o, r, s.scripts.map(ht.decode));
  for (const o of e)
    r.addOutput({
      amount: o.amount,
      script: Ro.decode(o.address).pkScript
    });
  return r;
}
function Jy(t) {
  const e = [];
  e.push(Lf(t.length));
  for (const s of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(Lf(s.length)), e.push(s);
  const n = e.reduce((s, c) => s + c.length, 0), r = new Uint8Array(n);
  let o = 0;
  for (const s of e)
    r.set(s, o), o += s.length;
  return r;
}
function Lf(t) {
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
class qc {
  constructor(e, n) {
    this.id = e, this.value = n;
  }
  encode() {
    const e = new Uint8Array(12);
    return tw(e, this.id, 0), nw(e, this.value, 8), e;
  }
  static decode(e) {
    if (e.length !== 12)
      throw new Error(`invalid data length: expected 12 bytes, got ${e.length}`);
    const n = ew(e, 0), r = rw(e, 8);
    return new qc(n, r);
  }
}
class ln {
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
    const n = qc.decode(e.subarray(0, 12)), r = e.subarray(12);
    if (r.length !== 64)
      throw new Error(`invalid signature length: expected 64 bytes, got ${r.length}`);
    return new ln(n, r);
  }
  static fromString(e) {
    if (!e.startsWith(ln.HRP))
      throw new Error(`invalid human-readable part: expected ${ln.HRP} prefix (note '${e}')`);
    const n = e.slice(ln.HRP.length);
    if (n.length < 103 || n.length > 104)
      throw new Error(`invalid note length: expected 103 or 104 chars, got ${n.length}`);
    const r = qu.decode(n);
    if (r.length === 0)
      throw new Error("failed to decode base58 string");
    return ln.decode(new Uint8Array(r));
  }
  toString() {
    return ln.HRP + qu.encode(this.encode());
  }
}
ln.HRP = "arknote";
function tw(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 8).setBigUint64(0, e, !1);
}
function ew(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 8).getBigUint64(0, !1);
}
function nw(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function rw(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
class pn {
  constructor(e, n, r, o, s, c, u, f) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = o, this.arkProvider = s, this.arkServerPublicKey = c, this.offchainTapscript = u, this.boardingTapscript = f;
  }
  static async create(e) {
    const n = ky(e.network), r = new By(e.esploraUrl || Iy[e.network]), o = e.identity.xOnlyPublicKey();
    if (!o)
      throw new Error("Invalid configured public key");
    let s;
    e.arkServerUrl && (s = new wd(e.arkServerUrl));
    const c = ld(o, void 0, n);
    if (s) {
      const u = await s.getInfo();
      if (u.network !== e.network)
        throw new Error(`The Ark Server URL expects ${u.network} but ${e.network} was configured`);
      const f = {
        value: u.unilateralExitDelay,
        type: u.unilateralExitDelay < 512n ? "blocks" : "seconds"
      }, h = {
        value: u.unilateralExitDelay * 2n,
        type: u.unilateralExitDelay * 2n < 512n ? "blocks" : "seconds"
      }, y = ht.decode(u.pubkey).slice(1), g = new xo.Script({
        pubKey: o,
        serverPubKey: y,
        csvTimelock: f
      }), m = new xo.Script({
        pubKey: o,
        serverPubKey: y,
        csvTimelock: h
      }), E = g;
      return new pn(e.identity, n, r, c, s, y, E, m);
    }
    return new pn(e.identity, n, r, c);
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
      bip21: Uf.create({
        address: this.onchainAddress
      })
    };
    if (this.arkProvider && this.offchainTapscript && this.boardingTapscript && this.arkServerPublicKey) {
      const n = this.offchainAddress.encode();
      e.offchain = n, e.bip21 = Uf.create({
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
    const e = await this.getCoins(), n = e.filter((h) => h.status.confirmed).reduce((h, y) => h + y.value, 0), r = e.filter((h) => !h.status.confirmed).reduce((h, y) => h + y.value, 0), o = n + r;
    let s = 0, c = 0, u = 0;
    if (this.arkProvider) {
      const h = await this.getVirtualCoins();
      s = h.filter((y) => y.virtualStatus.state === "settled").reduce((y, g) => y + g.value, 0), c = h.filter((y) => y.virtualStatus.state === "pending").reduce((y, g) => y + g.value, 0), u = h.filter((y) => y.virtualStatus.state === "swept").reduce((y, g) => y + g.value, 0);
    }
    const f = s + c;
    return {
      onchain: {
        confirmed: n,
        unconfirmed: r,
        total: o
      },
      offchain: {
        swept: u,
        settled: s,
        pending: c,
        total: f
      },
      total: o + f
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
    const { spendableVtxos: n } = await this.arkProvider.getVirtualCoins(e.offchain), r = this.offchainTapscript.encode(), o = this.offchainTapscript.forfeit();
    return n.map((s) => ({
      ...s,
      tapLeafScript: o,
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
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.encode()), { boardingTxs: r, roundsToIgnore: o } = await this.getBoardingTxs(), s = yd(e, n, o), c = [...r, ...s];
    return c.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (u, f) => u.createdAt === 0 ? -1 : f.createdAt === 0 ? 1 : f.createdAt - u.createdAt
    ), c;
  }
  async getBoardingTxs() {
    if (!this.boardingAddress)
      return { boardingTxs: [], roundsToIgnore: /* @__PURE__ */ new Set() };
    const e = this.boardingOnchainAddress, n = await this.onchainProvider.getTransactions(e), r = [], o = /* @__PURE__ */ new Set();
    for (const u of n)
      for (let f = 0; f < u.vout.length; f++) {
        const h = u.vout[f];
        if (h.scriptpubkey_address === e) {
          const g = (await this.onchainProvider.getTxOutspends(u.txid))[f];
          g != null && g.spent && o.add(g.txid), r.push({
            txid: u.txid,
            vout: f,
            value: Number(h.value),
            status: {
              confirmed: u.status.confirmed,
              block_time: u.status.block_time
            },
            virtualStatus: {
              state: g != null && g.spent ? "swept" : "pending",
              batchTxID: g != null && g.spent ? g.txid : void 0
            },
            createdAt: u.status.confirmed ? new Date(u.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], c = [];
    for (const u of r) {
      const f = {
        key: {
          boardingTxid: u.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: u.value,
        type: So.TxReceived,
        settled: u.virtualStatus.state === "swept",
        createdAt: u.status.block_time ? new Date(u.status.block_time * 1e3).getTime() : 0
      };
      u.status.block_time ? c.push(f) : s.push(f);
    }
    return {
      boardingTxs: [...s, ...c],
      roundsToIgnore: o
    };
  }
  async getBoardingUtxos() {
    if (!this.boardingAddress || !this.boardingTapscript)
      throw new Error("Boarding address not configured");
    const e = await this.onchainProvider.getCoins(this.boardingOnchainAddress), n = this.boardingTapscript.encode(), r = this.boardingTapscript.forfeit();
    return e.map((o) => ({
      ...o,
      tapLeafScript: r,
      scripts: n
    }));
  }
  async sendBitcoin(e, n = !0) {
    if (e.amount <= 0)
      throw new Error("Amount must be positive");
    if (e.amount < pn.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return Ro.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || pn.FEE_RATE, o = Math.ceil(174 * r), s = e.amount + o, c = Sy(n, s);
    if (!c.inputs)
      throw new Error("Insufficient funds");
    let u = new jt();
    for (const h of c.inputs)
      u.addInput({
        txid: h.txid,
        index: h.vout,
        witnessUtxo: {
          script: this.onchainP2TR.script,
          amount: BigInt(h.value)
        },
        tapInternalKey: this.onchainP2TR.tapInternalKey,
        tapMerkleRoot: this.onchainP2TR.tapMerkleRoot
      });
    return u.addOutputAddress(e.address, BigInt(e.amount), this.network), c.changeAmount > 0 && u.addOutputAddress(this.onchainAddress, BigInt(c.changeAmount), this.network), u = await this.identity.sign(u), u.finalize(), await this.onchainProvider.broadcastTransaction(u.hex);
  }
  async sendOffchain(e, n = !0) {
    if (!this.arkProvider || !this.offchainAddress || !this.offchainTapscript)
      throw new Error("wallet not initialized");
    const r = await this.getVirtualCoins(), o = n ? 0 : Math.ceil(174 * (e.feeRate || pn.FEE_RATE)), s = e.amount + o, c = Ay(r, s);
    if (!c || !c.inputs)
      throw new Error("Insufficient funds");
    const u = this.offchainTapscript.forfeit();
    if (!u)
      throw new Error("Selected leaf not found");
    const f = [
      {
        address: e.address,
        amount: BigInt(e.amount)
      }
    ];
    c.changeAmount > 0 && f.push({
      address: this.offchainAddress.encode(),
      amount: BigInt(c.changeAmount)
    });
    const h = this.offchainTapscript.encode();
    let y = Qy(c.inputs.map((m) => ({
      ...m,
      tapLeafScript: u,
      scripts: h
    })), f);
    y = await this.identity.sign(y);
    const g = Ee.encode(y.toPSBT());
    return this.arkProvider.submitVirtualTx(g);
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (e != null && e.inputs) {
      for (const g of e.inputs)
        if (typeof g == "string")
          try {
            ln.fromString(g);
          } catch {
            throw new Error(`Invalid arknote "${g}"`);
          }
    }
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let g = 0;
      const m = await this.getBoardingUtxos();
      g += m.reduce((T, b) => T + b.value, 0);
      const E = await this.getVtxos();
      g += E.reduce((T, b) => T + b.value, 0);
      const A = [...m, ...E];
      if (A.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: A,
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
    })), o = e.outputs.some((g) => this.isOffchainSuitable(g.address));
    let s;
    const c = [];
    o && (s = this.identity.signerSession(), c.push(ht.encode(s.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, c);
    const u = setInterval(() => {
      var g;
      (g = this.arkProvider) == null || g.ping(r).catch(h);
    }, 1e3);
    let f = !0;
    const h = () => {
      f && (f = !1, clearInterval(u));
    }, y = new AbortController();
    try {
      const g = this.arkProvider.getEventStream(y.signal);
      let m;
      o || (m = ge.SigningNoncesGenerated);
      const E = await this.arkProvider.getInfo(), A = yn.encode({
        timelock: {
          value: E.batchExpiry,
          type: E.batchExpiry >= 512n ? "seconds" : "blocks"
        },
        pubkeys: [ht.decode(E.pubkey).slice(1)]
      }).script, T = co(A);
      for await (const b of g) {
        switch (n && n(b), b.type) {
          // the settlement failed
          case ge.Failed:
            if (m === void 0)
              continue;
            throw h(), new Error(b.reason);
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case ge.SigningStart:
            if (m !== void 0)
              continue;
            if (h(), o) {
              if (!s)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningEvent(b, T, s);
            }
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case ge.SigningNoncesGenerated:
            if (m !== ge.SigningStart)
              continue;
            if (h(), o) {
              if (!s)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningNoncesGeneratedEvent(b, s);
            }
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case ge.Finalization:
            if (m !== ge.SigningNoncesGenerated)
              continue;
            h(), await this.handleSettlementFinalizationEvent(b, e.inputs, E);
            break;
          // the settlement is done, last event to be received
          case ge.Finalized:
            if (m !== ge.Finalization)
              continue;
            return y.abort(), b.roundTxid;
        }
        m = b.type;
      }
    } catch (g) {
      throw y.abort(), g;
    }
    throw new Error("Settlement failed");
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const o = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    Gy(e.unsignedSettlementTx, o, n);
    const s = Ee.decode(e.unsignedSettlementTx), u = jt.fromPSBT(s).getOutput(0);
    if (!(u != null && u.amount))
      throw new Error("Shared output not found");
    r.init(o, n, u.amount), await this.arkProvider.submitTreeNonces(e.id, ht.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, ht.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const o = bo(this.network).decode(r.forfeitAddress), s = fe.encode(o), c = [], u = await this.getVirtualCoins();
    let f = jt.fromPSBT(Ee.decode(e.roundTx)), h = !1, y = !1;
    for (const g of n) {
      if (typeof g == "string")
        continue;
      const m = u.find((j) => j.txid === g.txid && j.vout === g.vout);
      if (!m) {
        h = !0;
        const j = [];
        for (let G = 0; G < f.inputsLength; G++) {
          const W = f.getInput(G);
          if (!W.txid || W.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          ht.encode(W.txid) === g.txid && W.index === g.vout && (f.updateInput(G, {
            tapLeafScript: [g.tapLeafScript]
          }), j.push(G));
        }
        f = await this.identity.sign(f, j);
        continue;
      }
      y || (zy(e.roundTx, e.connectors), y = !0);
      const E = Nn.encode(g.tapLeafScript[0]), A = gd(Hc(g.tapLeafScript)), T = Kt.create().addKeySpendInput().addTapscriptInput(
        A.witnessSize(100),
        // TODO: handle conditional script
        g.tapLeafScript[1].length - 1,
        E.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), b = e.connectors.leaves(), B = e.connectorsIndex.get(`${m.txid}:${m.vout}`);
      if (!B)
        throw new Error("Connector outpoint not found");
      let O;
      for (const j of b)
        if (j.txid === B.txid)
          try {
            O = jt.fromPSBT(Ee.decode(j.tx)).getOutput(B.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!O || !O.amount || !O.script)
        throw new Error("Connector output not found");
      let D = $y({
        connectorInput: B,
        connectorAmount: O.amount,
        feeAmount: T,
        serverPkScript: s,
        connectorPkScript: O.script,
        vtxoAmount: BigInt(m.value),
        vtxoInput: g,
        vtxoPkScript: Pr.decode(g.scripts).pkScript
      });
      D.updateInput(1, {
        tapLeafScript: [g.tapLeafScript]
      }), D = await this.identity.sign(D, [1]), c.push(Ee.encode(D.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(c, h ? Ee.encode(f.toPSBT()) : void 0);
  }
}
pn.DUST_AMOUNT = BigInt(546);
pn.FEE_RATE = 1;
var dt;
(function(t) {
  t.walletInitialized = (H) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: H
  });
  function e(H, Y) {
    return {
      type: "ERROR",
      success: !1,
      message: Y,
      id: H
    };
  }
  t.error = e;
  function n(H, Y) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: Y,
      id: H
    };
  }
  t.settleEvent = n;
  function r(H, Y) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: Y,
      id: H
    };
  }
  t.settleSuccess = r;
  function o(H) {
    return H.type === "SETTLE_SUCCESS" && H.success;
  }
  t.isSettleSuccess = o;
  function s(H) {
    return H.type === "ADDRESS" && H.success === !0;
  }
  t.isAddress = s;
  function c(H, Y) {
    return {
      type: "ADDRESS",
      success: !0,
      addresses: Y,
      id: H
    };
  }
  t.addresses = c;
  function u(H) {
    return H.type === "ADDRESS_INFO" && H.success === !0;
  }
  t.isAddressInfo = u;
  function f(H, Y) {
    return {
      type: "ADDRESS_INFO",
      success: !0,
      addressInfo: Y,
      id: H
    };
  }
  t.addressInfo = f;
  function h(H) {
    return H.type === "BALANCE" && H.success === !0;
  }
  t.isBalance = h;
  function y(H, Y) {
    return {
      type: "BALANCE",
      success: !0,
      balance: Y,
      id: H
    };
  }
  t.balance = y;
  function g(H) {
    return H.type === "COINS" && H.success === !0;
  }
  t.isCoins = g;
  function m(H, Y) {
    return {
      type: "COINS",
      success: !0,
      coins: Y,
      id: H
    };
  }
  t.coins = m;
  function E(H) {
    return H.type === "VTXOS" && H.success === !0;
  }
  t.isVtxos = E;
  function A(H, Y) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: Y,
      id: H
    };
  }
  t.vtxos = A;
  function T(H) {
    return H.type === "VIRTUAL_COINS" && H.success === !0;
  }
  t.isVirtualCoins = T;
  function b(H, Y) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: Y,
      id: H
    };
  }
  t.virtualCoins = b;
  function B(H) {
    return H.type === "BOARDING_UTXOS" && H.success === !0;
  }
  t.isBoardingUtxos = B;
  function O(H, Y) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: Y,
      id: H
    };
  }
  t.boardingUtxos = O;
  function D(H) {
    return H.type === "SEND_BITCOIN_SUCCESS" && H.success === !0;
  }
  t.isSendBitcoinSuccess = D;
  function j(H, Y) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: Y,
      id: H
    };
  }
  t.sendBitcoinSuccess = j;
  function G(H) {
    return H.type === "TRANSACTION_HISTORY" && H.success === !0;
  }
  t.isTransactionHistory = G;
  function W(H, Y) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: Y,
      id: H
    };
  }
  t.transactionHistory = W;
  function z(H) {
    return H.type === "WALLET_STATUS" && H.success === !0;
  }
  t.isWalletStatus = z;
  function nt(H, Y) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: Y
      },
      id: H
    };
  }
  t.walletStatus = nt;
  function Q(H) {
    return H.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = Q;
  function wt(H, Y) {
    return {
      type: "CLEAR_RESPONSE",
      success: Y,
      id: H
    };
  }
  t.clearResponse = wt;
})(dt || (dt = {}));
var ve;
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
  function o(A) {
    return A.type === "GET_ADDRESS";
  }
  t.isGetAddress = o;
  function s(A) {
    return A.type === "GET_ADDRESS_INFO";
  }
  t.isGetAddressInfo = s;
  function c(A) {
    return A.type === "GET_BALANCE";
  }
  t.isGetBalance = c;
  function u(A) {
    return A.type === "GET_COINS";
  }
  t.isGetCoins = u;
  function f(A) {
    return A.type === "GET_VTXOS";
  }
  t.isGetVtxos = f;
  function h(A) {
    return A.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = h;
  function y(A) {
    return A.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = y;
  function g(A) {
    return A.type === "SEND_BITCOIN" && "params" in A && A.params !== null && typeof A.params == "object" && "address" in A.params && typeof A.params.address == "string" && "amount" in A.params && typeof A.params.amount == "number";
  }
  t.isSendBitcoin = g;
  function m(A) {
    return A.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = m;
  function E(A) {
    return A.type === "GET_STATUS";
  }
  t.isGetStatus = E;
})(ve || (ve = {}));
class Gt {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase(Gt.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const o = indexedDB.deleteDatabase(Gt.DB_NAME);
            o.onsuccess = () => e(), o.onerror = () => n(o.error || new Error("Failed to delete database"));
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
      const r = indexedDB.open(Gt.DB_NAME, Gt.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (o) => {
        const s = o.target.result;
        if (!s.objectStoreNames.contains(Gt.STORE_NAME)) {
          const c = s.createObjectStore(Gt.STORE_NAME, {
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
      const s = this.db.transaction(Gt.STORE_NAME, "readwrite").objectStore(Gt.STORE_NAME), c = e.map((u) => new Promise((f, h) => {
        const y = s.put(u);
        y.onsuccess = () => f(), y.onerror = () => h(y.error);
      }));
      Promise.all(c).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Gt.STORE_NAME, "readwrite").objectStore(Gt.STORE_NAME).clear();
      s.onsuccess = () => e(), s.onerror = () => n(s.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Gt.STORE_NAME, "readonly").objectStore(Gt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Gt.STORE_NAME, "readonly").objectStore(Gt.STORE_NAME).index("spentBy"), c = s.getAll(IDBKeyRange.only("")), u = s.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((f, h) => {
          c.onsuccess = () => {
            f(c.result);
          }, c.onerror = () => h(c.error);
        }),
        new Promise((f, h) => {
          u.onsuccess = () => {
            f(u.result);
          }, u.onerror = () => h(u.error);
        })
      ]).then(([f, h]) => {
        e({
          spendable: f,
          spent: h
        });
      }).catch(n);
    });
  }
}
Gt.DB_NAME = "wallet-db";
Gt.STORE_NAME = "vtxos";
Gt.DB_VERSION = 1;
class ow {
  constructor(e = new Gt(), n = () => {
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
    const e = await this.wallet.getAddressInfo();
    if (!e.offchain)
      return;
    await this.vtxoRepository.open();
    const { spendableVtxos: n, spentVtxos: r } = await this.arkProvider.getVirtualCoins(e.offchain.address), o = this.wallet.offchainTapscript.encode(), s = this.wallet.offchainTapscript.forfeit(), c = [...n, ...r].map((u) => ({
      ...u,
      tapLeafScript: s,
      scripts: o
    }));
    await this.vtxoRepository.addOrUpdate(c), this.processVtxoSubscription(e.offchain);
  }
  async processVtxoSubscription({ address: e, scripts: n }) {
    try {
      const r = [...n.exit, ...n.forfeit], s = xo.Script.decode(r).findLeaf(n.forfeit[0]), c = new AbortController(), u = this.arkProvider.subscribeForAddress(e, c.signal);
      this.vtxoSubscription = c;
      for await (const f of u) {
        const h = [...f.newVtxos, ...f.spentVtxos];
        if (h.length === 0)
          continue;
        const y = h.map((g) => ({
          ...g,
          tapLeafScript: s,
          scripts: r
        }));
        await this.vtxoRepository.addOrUpdate(y);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    var n;
    this.clear(), ve.isBase(e.data) && ((n = e.source) == null || n.postMessage(dt.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, o, s;
    const n = e.data;
    if (!ve.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new wd(n.arkServerUrl), this.wallet = await pn.create({
        network: n.network,
        identity: ji.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (o = e.source) == null || o.postMessage(dt.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (c) {
      console.error("Error initializing wallet:", c);
      const u = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(dt.error(n.id, u));
    }
  }
  async handleSettle(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
        return;
      }
      const u = await this.wallet.settle(n.params, (f) => {
        var h;
        (h = e.source) == null || h.postMessage(dt.settleEvent(n.id, f));
      });
      (s = e.source) == null || s.postMessage(dt.settleSuccess(n.id, u));
    } catch (u) {
      console.error("Error settling:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleSendBitcoin(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (s = e.source) == null || s.postMessage(dt.sendBitcoinSuccess(n.id, u));
    } catch (u) {
      console.error("Error sending bitcoin:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetAddress(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getAddress();
      (s = e.source) == null || s.postMessage(dt.addresses(n.id, u));
    } catch (u) {
      console.error("Error getting address:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetAddressInfo(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetAddressInfo(n)) {
      console.error("Invalid GET_ADDRESS_INFO message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_ADDRESS_INFO message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getAddressInfo();
      (s = e.source) == null || s.postMessage(dt.addressInfo(n.id, u));
    } catch (u) {
      console.error("Error getting address info:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetBalance(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getCoins(), f = u.filter((b) => b.status.confirmed).reduce((b, B) => b + B.value, 0), h = u.filter((b) => !b.status.confirmed).reduce((b, B) => b + B.value, 0), y = f + h, g = await this.vtxoRepository.getSpendableVtxos(), m = g.reduce((b, B) => B.virtualStatus.state === "settled" ? b + B.value : b, 0), E = g.reduce((b, B) => B.virtualStatus.state === "pending" ? b + B.value : b, 0), A = g.reduce((b, B) => B.virtualStatus.state === "swept" ? b + B.value : b, 0), T = m + E + A;
      (s = e.source) == null || s.postMessage(dt.balance(n.id, {
        onchain: {
          confirmed: f,
          unconfirmed: h,
          total: y
        },
        offchain: {
          swept: A,
          settled: m,
          pending: E,
          total: T
        },
        total: y + T
      }));
    } catch (u) {
      console.error("Error getting balance:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetCoins(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getCoins();
      (s = e.source) == null || s.postMessage(dt.coins(n.id, u));
    } catch (u) {
      console.error("Error getting coins:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetVtxos(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.vtxoRepository.getSpendableVtxos();
      (s = e.source) == null || s.postMessage(dt.vtxos(n.id, u));
    } catch (u) {
      console.error("Error getting vtxos:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getBoardingUtxos();
      (s = e.source) == null || s.postMessage(dt.boardingUtxos(n.id, u));
    } catch (u) {
      console.error("Error getting boarding utxos:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ve.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: u, roundsToIgnore: f } = await this.wallet.getBoardingTxs(), { spendable: h, spent: y } = await this.vtxoRepository.getAllVtxos(), g = yd(h, y, f), m = [...u, ...g];
      m.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (E, A) => E.createdAt === 0 ? -1 : A.createdAt === 0 ? 1 : A.createdAt - E.createdAt
      ), (s = e.source) == null || s.postMessage(dt.transactionHistory(n.id, m));
    } catch (u) {
      console.error("Error getting transaction history:", u);
      const f = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, f));
    }
  }
  async handleGetStatus(e) {
    var r, o;
    const n = e.data;
    if (!ve.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (o = e.source) == null || o.postMessage(dt.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleMessage(e) {
    var r;
    this.messageCallback(e);
    const n = e.data;
    if (!ve.isBase(n)) {
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
      case "CLEAR": {
        await this.handleClear(e);
        break;
      }
      default:
        (r = e.source) == null || r.postMessage(dt.error(n.id, "Unknown message type"));
    }
  }
}
var Si = { exports: {} }, iw = Si.exports, Pf;
function sw() {
  return Pf || (Pf = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(iw, function() {
      var n = function(i, a) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(l, d) {
          l.__proto__ = d;
        } || function(l, d) {
          for (var p in d) Object.prototype.hasOwnProperty.call(d, p) && (l[p] = d[p]);
        })(i, a);
      }, r = function() {
        return (r = Object.assign || function(i) {
          for (var a, l = 1, d = arguments.length; l < d; l++) for (var p in a = arguments[l]) Object.prototype.hasOwnProperty.call(a, p) && (i[p] = a[p]);
          return i;
        }).apply(this, arguments);
      };
      function o(i, a, l) {
        for (var d, p = 0, w = a.length; p < w; p++) !d && p in a || ((d = d || Array.prototype.slice.call(a, 0, p))[p] = a[p]);
        return i.concat(d || Array.prototype.slice.call(a));
      }
      var s = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : _g, c = Object.keys, u = Array.isArray;
      function f(i, a) {
        return typeof a != "object" || c(a).forEach(function(l) {
          i[l] = a[l];
        }), i;
      }
      typeof Promise > "u" || s.Promise || (s.Promise = Promise);
      var h = Object.getPrototypeOf, y = {}.hasOwnProperty;
      function g(i, a) {
        return y.call(i, a);
      }
      function m(i, a) {
        typeof a == "function" && (a = a(h(i))), (typeof Reflect > "u" ? c : Reflect.ownKeys)(a).forEach(function(l) {
          A(i, l, a[l]);
        });
      }
      var E = Object.defineProperty;
      function A(i, a, l, d) {
        E(i, a, f(l && g(l, "get") && typeof l.get == "function" ? { get: l.get, set: l.set, configurable: !0 } : { value: l, configurable: !0, writable: !0 }, d));
      }
      function T(i) {
        return { from: function(a) {
          return i.prototype = Object.create(a.prototype), A(i.prototype, "constructor", i), { extend: m.bind(null, i.prototype) };
        } };
      }
      var b = Object.getOwnPropertyDescriptor, B = [].slice;
      function O(i, a, l) {
        return B.call(i, a, l);
      }
      function D(i, a) {
        return a(i);
      }
      function j(i) {
        if (!i) throw new Error("Assertion Failed");
      }
      function G(i) {
        s.setImmediate ? setImmediate(i) : setTimeout(i, 0);
      }
      function W(i, a) {
        if (typeof a == "string" && g(i, a)) return i[a];
        if (!a) return i;
        if (typeof a != "string") {
          for (var l = [], d = 0, p = a.length; d < p; ++d) {
            var w = W(i, a[d]);
            l.push(w);
          }
          return l;
        }
        var v = a.indexOf(".");
        if (v !== -1) {
          var x = i[a.substr(0, v)];
          return x == null ? void 0 : W(x, a.substr(v + 1));
        }
      }
      function z(i, a, l) {
        if (i && a !== void 0 && !("isFrozen" in Object && Object.isFrozen(i))) if (typeof a != "string" && "length" in a) {
          j(typeof l != "string" && "length" in l);
          for (var d = 0, p = a.length; d < p; ++d) z(i, a[d], l[d]);
        } else {
          var w, v, x = a.indexOf(".");
          x !== -1 ? (w = a.substr(0, x), (v = a.substr(x + 1)) === "" ? l === void 0 ? u(i) && !isNaN(parseInt(w)) ? i.splice(w, 1) : delete i[w] : i[w] = l : z(x = !(x = i[w]) || !g(i, w) ? i[w] = {} : x, v, l)) : l === void 0 ? u(i) && !isNaN(parseInt(a)) ? i.splice(a, 1) : delete i[a] : i[a] = l;
        }
      }
      function nt(i) {
        var a, l = {};
        for (a in i) g(i, a) && (l[a] = i[a]);
        return l;
      }
      var Q = [].concat;
      function wt(i) {
        return Q.apply([], i);
      }
      var Pn = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(wt([8, 16, 32, 64].map(function(i) {
        return ["Int", "Uint", "Float"].map(function(a) {
          return a + i + "Array";
        });
      }))).filter(function(i) {
        return s[i];
      }), H = new Set(Pn.map(function(i) {
        return s[i];
      })), Y = null;
      function xt(i) {
        return Y = /* @__PURE__ */ new WeakMap(), i = function a(l) {
          if (!l || typeof l != "object") return l;
          var d = Y.get(l);
          if (d) return d;
          if (u(l)) {
            d = [], Y.set(l, d);
            for (var p = 0, w = l.length; p < w; ++p) d.push(a(l[p]));
          } else if (H.has(l.constructor)) d = l;
          else {
            var v, x = h(l);
            for (v in d = x === Object.prototype ? {} : Object.create(x), Y.set(l, d), l) g(l, v) && (d[v] = a(l[v]));
          }
          return d;
        }(i), Y = null, i;
      }
      var M = {}.toString;
      function V(i) {
        return M.call(i).slice(8, -1);
      }
      var q = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", rt = typeof q == "symbol" ? function(i) {
        var a;
        return i != null && (a = i[q]) && a.apply(i);
      } : function() {
        return null;
      };
      function st(i, a) {
        return a = i.indexOf(a), 0 <= a && i.splice(a, 1), 0 <= a;
      }
      var lt = {};
      function mt(i) {
        var a, l, d, p;
        if (arguments.length === 1) {
          if (u(i)) return i.slice();
          if (this === lt && typeof i == "string") return [i];
          if (p = rt(i)) {
            for (l = []; !(d = p.next()).done; ) l.push(d.value);
            return l;
          }
          if (i == null) return [i];
          if (typeof (a = i.length) != "number") return [i];
          for (l = new Array(a); a--; ) l[a] = i[a];
          return l;
        }
        for (a = arguments.length, l = new Array(a); a--; ) l[a] = arguments[a];
        return l;
      }
      var St = typeof Symbol < "u" ? function(i) {
        return i[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, Dr = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], $e = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Dr), Dt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function It(i, a) {
        this.name = i, this.message = a;
      }
      function kt(i, a) {
        return i + ". Errors: " + Object.keys(a).map(function(l) {
          return a[l].toString();
        }).filter(function(l, d, p) {
          return p.indexOf(l) === d;
        }).join(`
`);
      }
      function Xt(i, a, l, d) {
        this.failures = a, this.failedKeys = d, this.successCount = l, this.message = kt(i, a);
      }
      function $t(i, a) {
        this.name = "BulkError", this.failures = Object.keys(a).map(function(l) {
          return a[l];
        }), this.failuresByPos = a, this.message = kt(i, this.failures);
      }
      T(It).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), T(Xt).from(It), T($t).from(It);
      var Ke = $e.reduce(function(i, a) {
        return i[a] = a + "Error", i;
      }, {}), ae = It, at = $e.reduce(function(i, a) {
        var l = a + "Error";
        function d(p, w) {
          this.name = l, p ? typeof p == "string" ? (this.message = "".concat(p).concat(w ? `
 ` + w : ""), this.inner = w || null) : typeof p == "object" && (this.message = "".concat(p.name, " ").concat(p.message), this.inner = p) : (this.message = Dt[a] || l, this.inner = null);
        }
        return T(d).from(ae), i[a] = d, i;
      }, {});
      at.Syntax = SyntaxError, at.Type = TypeError, at.Range = RangeError;
      var ze = Dr.reduce(function(i, a) {
        return i[a + "Error"] = at[a], i;
      }, {}), le = $e.reduce(function(i, a) {
        return ["Syntax", "Type", "Range"].indexOf(a) === -1 && (i[a + "Error"] = at[a]), i;
      }, {});
      function pt() {
      }
      function ce(i) {
        return i;
      }
      function _e(i, a) {
        return i == null || i === ce ? a : function(l) {
          return a(i(l));
        };
      }
      function Mt(i, a) {
        return function() {
          i.apply(this, arguments), a.apply(this, arguments);
        };
      }
      function vd(i, a) {
        return i === pt ? a : function() {
          var l = i.apply(this, arguments);
          l !== void 0 && (arguments[0] = l);
          var d = this.onsuccess, p = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var w = a.apply(this, arguments);
          return d && (this.onsuccess = this.onsuccess ? Mt(d, this.onsuccess) : d), p && (this.onerror = this.onerror ? Mt(p, this.onerror) : p), w !== void 0 ? w : l;
        };
      }
      function Ed(i, a) {
        return i === pt ? a : function() {
          i.apply(this, arguments);
          var l = this.onsuccess, d = this.onerror;
          this.onsuccess = this.onerror = null, a.apply(this, arguments), l && (this.onsuccess = this.onsuccess ? Mt(l, this.onsuccess) : l), d && (this.onerror = this.onerror ? Mt(d, this.onerror) : d);
        };
      }
      function xd(i, a) {
        return i === pt ? a : function(l) {
          var d = i.apply(this, arguments);
          f(l, d);
          var p = this.onsuccess, w = this.onerror;
          return this.onsuccess = null, this.onerror = null, l = a.apply(this, arguments), p && (this.onsuccess = this.onsuccess ? Mt(p, this.onsuccess) : p), w && (this.onerror = this.onerror ? Mt(w, this.onerror) : w), d === void 0 ? l === void 0 ? void 0 : l : f(d, l);
        };
      }
      function Sd(i, a) {
        return i === pt ? a : function() {
          return a.apply(this, arguments) !== !1 && i.apply(this, arguments);
        };
      }
      function ls(i, a) {
        return i === pt ? a : function() {
          var l = i.apply(this, arguments);
          if (l && typeof l.then == "function") {
            for (var d = this, p = arguments.length, w = new Array(p); p--; ) w[p] = arguments[p];
            return l.then(function() {
              return a.apply(d, w);
            });
          }
          return a.apply(this, arguments);
        };
      }
      le.ModifyError = Xt, le.DexieError = It, le.BulkError = $t;
      var Ge = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function zc(i) {
        Ge = i;
      }
      var Kr = {}, Gc = 100, Pn = typeof Promise > "u" ? [] : function() {
        var i = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [i, h(i), i];
        var a = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [a, h(a), i];
      }(), Dr = Pn[0], $e = Pn[1], Pn = Pn[2], $e = $e && $e.then, Kn = Dr && Dr.constructor, ds = !!Pn, Mr = function(i, a) {
        Fr.push([i, a]), Oo && (queueMicrotask(kd), Oo = !1);
      }, hs = !0, Oo = !0, Dn = [], Lo = [], ps = ce, wn = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: pt, pgp: !1, env: {}, finalize: pt }, ut = wn, Fr = [], Mn = 0, Po = [];
      function it(i) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var a = this._PSD = ut;
        if (typeof i != "function") {
          if (i !== Kr) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && ys(this, this._value));
        }
        this._state = null, this._value = null, ++a.ref, function l(d, p) {
          try {
            p(function(w) {
              if (d._state === null) {
                if (w === d) throw new TypeError("A promise cannot be resolved with itself.");
                var v = d._lib && or();
                w && typeof w.then == "function" ? l(d, function(x, k) {
                  w instanceof it ? w._then(x, k) : w.then(x, k);
                }) : (d._state = !0, d._value = w, Yc(d)), v && ir();
              }
            }, ys.bind(null, d));
          } catch (w) {
            ys(d, w);
          }
        }(this, i);
      }
      var gs = { get: function() {
        var i = ut, a = Fo;
        function l(d, p) {
          var w = this, v = !i.global && (i !== ut || a !== Fo), x = v && !bn(), k = new it(function(_, U) {
            ws(w, new Wc(Xc(d, i, v, x), Xc(p, i, v, x), _, U, i));
          });
          return this._consoleTask && (k._consoleTask = this._consoleTask), k;
        }
        return l.prototype = Kr, l;
      }, set: function(i) {
        A(this, "then", i && i.prototype === Kr ? gs : { get: function() {
          return i;
        }, set: gs.set });
      } };
      function Wc(i, a, l, d, p) {
        this.onFulfilled = typeof i == "function" ? i : null, this.onRejected = typeof a == "function" ? a : null, this.resolve = l, this.reject = d, this.psd = p;
      }
      function ys(i, a) {
        var l, d;
        Lo.push(a), i._state === null && (l = i._lib && or(), a = ps(a), i._state = !1, i._value = a, d = i, Dn.some(function(p) {
          return p._value === d._value;
        }) || Dn.push(d), Yc(i), l && ir());
      }
      function Yc(i) {
        var a = i._listeners;
        i._listeners = [];
        for (var l = 0, d = a.length; l < d; ++l) ws(i, a[l]);
        var p = i._PSD;
        --p.ref || p.finalize(), Mn === 0 && (++Mn, Mr(function() {
          --Mn == 0 && ms();
        }, []));
      }
      function ws(i, a) {
        if (i._state !== null) {
          var l = i._state ? a.onFulfilled : a.onRejected;
          if (l === null) return (i._state ? a.resolve : a.reject)(i._value);
          ++a.psd.ref, ++Mn, Mr(Ad, [l, i, a]);
        } else i._listeners.push(a);
      }
      function Ad(i, a, l) {
        try {
          var d, p = a._value;
          !a._state && Lo.length && (Lo = []), d = Ge && a._consoleTask ? a._consoleTask.run(function() {
            return i(p);
          }) : i(p), a._state || Lo.indexOf(p) !== -1 || function(w) {
            for (var v = Dn.length; v; ) if (Dn[--v]._value === w._value) return Dn.splice(v, 1);
          }(a), l.resolve(d);
        } catch (w) {
          l.reject(w);
        } finally {
          --Mn == 0 && ms(), --l.psd.ref || l.psd.finalize();
        }
      }
      function kd() {
        Fn(wn, function() {
          or() && ir();
        });
      }
      function or() {
        var i = hs;
        return Oo = hs = !1, i;
      }
      function ir() {
        var i, a, l;
        do
          for (; 0 < Fr.length; ) for (i = Fr, Fr = [], l = i.length, a = 0; a < l; ++a) {
            var d = i[a];
            d[0].apply(null, d[1]);
          }
        while (0 < Fr.length);
        Oo = hs = !0;
      }
      function ms() {
        var i = Dn;
        Dn = [], i.forEach(function(d) {
          d._PSD.onunhandled.call(null, d._value, d);
        });
        for (var a = Po.slice(0), l = a.length; l; ) a[--l]();
      }
      function Ko(i) {
        return new it(Kr, !1, i);
      }
      function Rt(i, a) {
        var l = ut;
        return function() {
          var d = or(), p = ut;
          try {
            return vn(l, !0), i.apply(this, arguments);
          } catch (w) {
            a && a(w);
          } finally {
            vn(p, !1), d && ir();
          }
        };
      }
      m(it.prototype, { then: gs, _then: function(i, a) {
        ws(this, new Wc(null, null, i, a, ut));
      }, catch: function(i) {
        if (arguments.length === 1) return this.then(null, i);
        var a = i, l = arguments[1];
        return typeof a == "function" ? this.then(null, function(d) {
          return (d instanceof a ? l : Ko)(d);
        }) : this.then(null, function(d) {
          return (d && d.name === a ? l : Ko)(d);
        });
      }, finally: function(i) {
        return this.then(function(a) {
          return it.resolve(i()).then(function() {
            return a;
          });
        }, function(a) {
          return it.resolve(i()).then(function() {
            return Ko(a);
          });
        });
      }, timeout: function(i, a) {
        var l = this;
        return i < 1 / 0 ? new it(function(d, p) {
          var w = setTimeout(function() {
            return p(new at.Timeout(a));
          }, i);
          l.then(d, p).finally(clearTimeout.bind(null, w));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && A(it.prototype, Symbol.toStringTag, "Dexie.Promise"), wn.env = Zc(), m(it, { all: function() {
        var i = mt.apply(null, arguments).map(Ho);
        return new it(function(a, l) {
          i.length === 0 && a([]);
          var d = i.length;
          i.forEach(function(p, w) {
            return it.resolve(p).then(function(v) {
              i[w] = v, --d || a(i);
            }, l);
          });
        });
      }, resolve: function(i) {
        return i instanceof it ? i : i && typeof i.then == "function" ? new it(function(a, l) {
          i.then(a, l);
        }) : new it(Kr, !0, i);
      }, reject: Ko, race: function() {
        var i = mt.apply(null, arguments).map(Ho);
        return new it(function(a, l) {
          i.map(function(d) {
            return it.resolve(d).then(a, l);
          });
        });
      }, PSD: { get: function() {
        return ut;
      }, set: function(i) {
        return ut = i;
      } }, totalEchoes: { get: function() {
        return Fo;
      } }, newPSD: mn, usePSD: Fn, scheduler: { get: function() {
        return Mr;
      }, set: function(i) {
        Mr = i;
      } }, rejectionMapper: { get: function() {
        return ps;
      }, set: function(i) {
        ps = i;
      } }, follow: function(i, a) {
        return new it(function(l, d) {
          return mn(function(p, w) {
            var v = ut;
            v.unhandleds = [], v.onunhandled = w, v.finalize = Mt(function() {
              var x, k = this;
              x = function() {
                k.unhandleds.length === 0 ? p() : w(k.unhandleds[0]);
              }, Po.push(function _() {
                x(), Po.splice(Po.indexOf(_), 1);
              }), ++Mn, Mr(function() {
                --Mn == 0 && ms();
              }, []);
            }, v.finalize), i();
          }, a, l, d);
        });
      } }), Kn && (Kn.allSettled && A(it, "allSettled", function() {
        var i = mt.apply(null, arguments).map(Ho);
        return new it(function(a) {
          i.length === 0 && a([]);
          var l = i.length, d = new Array(l);
          i.forEach(function(p, w) {
            return it.resolve(p).then(function(v) {
              return d[w] = { status: "fulfilled", value: v };
            }, function(v) {
              return d[w] = { status: "rejected", reason: v };
            }).then(function() {
              return --l || a(d);
            });
          });
        });
      }), Kn.any && typeof AggregateError < "u" && A(it, "any", function() {
        var i = mt.apply(null, arguments).map(Ho);
        return new it(function(a, l) {
          i.length === 0 && l(new AggregateError([]));
          var d = i.length, p = new Array(d);
          i.forEach(function(w, v) {
            return it.resolve(w).then(function(x) {
              return a(x);
            }, function(x) {
              p[v] = x, --d || l(new AggregateError(p));
            });
          });
        });
      }), Kn.withResolvers && (it.withResolvers = Kn.withResolvers));
      var Qt = { awaits: 0, echoes: 0, id: 0 }, Td = 0, Do = [], Mo = 0, Fo = 0, Id = 0;
      function mn(i, a, l, d) {
        var p = ut, w = Object.create(p);
        return w.parent = p, w.ref = 0, w.global = !1, w.id = ++Id, wn.env, w.env = ds ? { Promise: it, PromiseProp: { value: it, configurable: !0, writable: !0 }, all: it.all, race: it.race, allSettled: it.allSettled, any: it.any, resolve: it.resolve, reject: it.reject } : {}, a && f(w, a), ++p.ref, w.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, d = Fn(w, i, l, d), w.ref === 0 && w.finalize(), d;
      }
      function sr() {
        return Qt.id || (Qt.id = ++Td), ++Qt.awaits, Qt.echoes += Gc, Qt.id;
      }
      function bn() {
        return !!Qt.awaits && (--Qt.awaits == 0 && (Qt.id = 0), Qt.echoes = Qt.awaits * Gc, !0);
      }
      function Ho(i) {
        return Qt.echoes && i && i.constructor === Kn ? (sr(), i.then(function(a) {
          return bn(), a;
        }, function(a) {
          return bn(), Ft(a);
        })) : i;
      }
      function Bd() {
        var i = Do[Do.length - 1];
        Do.pop(), vn(i, !1);
      }
      function vn(i, a) {
        var l, d = ut;
        (a ? !Qt.echoes || Mo++ && i === ut : !Mo || --Mo && i === ut) || queueMicrotask(a ? (function(p) {
          ++Fo, Qt.echoes && --Qt.echoes != 0 || (Qt.echoes = Qt.awaits = Qt.id = 0), Do.push(ut), vn(p, !0);
        }).bind(null, i) : Bd), i !== ut && (ut = i, d === wn && (wn.env = Zc()), ds && (l = wn.env.Promise, a = i.env, (d.global || i.global) && (Object.defineProperty(s, "Promise", a.PromiseProp), l.all = a.all, l.race = a.race, l.resolve = a.resolve, l.reject = a.reject, a.allSettled && (l.allSettled = a.allSettled), a.any && (l.any = a.any))));
      }
      function Zc() {
        var i = s.Promise;
        return ds ? { Promise: i, PromiseProp: Object.getOwnPropertyDescriptor(s, "Promise"), all: i.all, race: i.race, allSettled: i.allSettled, any: i.any, resolve: i.resolve, reject: i.reject } : {};
      }
      function Fn(i, a, l, d, p) {
        var w = ut;
        try {
          return vn(i, !0), a(l, d, p);
        } finally {
          vn(w, !1);
        }
      }
      function Xc(i, a, l, d) {
        return typeof i != "function" ? i : function() {
          var p = ut;
          l && sr(), vn(a, !0);
          try {
            return i.apply(this, arguments);
          } finally {
            vn(p, !1), d && queueMicrotask(bn);
          }
        };
      }
      function bs(i) {
        Promise === Kn && Qt.echoes === 0 ? Mo === 0 ? i() : enqueueNativeMicroTask(i) : setTimeout(i, 0);
      }
      ("" + $e).indexOf("[native code]") === -1 && (sr = bn = pt);
      var Ft = it.reject, Hn = "￿", rn = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Qc = "String expected.", ar = [], Vo = "__dbnames", vs = "readonly", Es = "readwrite";
      function Vn(i, a) {
        return i ? a ? function() {
          return i.apply(this, arguments) && a.apply(this, arguments);
        } : i : a;
      }
      var Jc = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function qo(i) {
        return typeof i != "string" || /\./.test(i) ? function(a) {
          return a;
        } : function(a) {
          return a[i] === void 0 && i in a && delete (a = xt(a))[i], a;
        };
      }
      function tu() {
        throw at.Type();
      }
      function At(i, a) {
        try {
          var l = eu(i), d = eu(a);
          if (l !== d) return l === "Array" ? 1 : d === "Array" ? -1 : l === "binary" ? 1 : d === "binary" ? -1 : l === "string" ? 1 : d === "string" ? -1 : l === "Date" ? 1 : d !== "Date" ? NaN : -1;
          switch (l) {
            case "number":
            case "Date":
            case "string":
              return a < i ? 1 : i < a ? -1 : 0;
            case "binary":
              return function(p, w) {
                for (var v = p.length, x = w.length, k = v < x ? v : x, _ = 0; _ < k; ++_) if (p[_] !== w[_]) return p[_] < w[_] ? -1 : 1;
                return v === x ? 0 : v < x ? -1 : 1;
              }(nu(i), nu(a));
            case "Array":
              return function(p, w) {
                for (var v = p.length, x = w.length, k = v < x ? v : x, _ = 0; _ < k; ++_) {
                  var U = At(p[_], w[_]);
                  if (U !== 0) return U;
                }
                return v === x ? 0 : v < x ? -1 : 1;
              }(i, a);
          }
        } catch {
        }
        return NaN;
      }
      function eu(i) {
        var a = typeof i;
        return a != "object" ? a : ArrayBuffer.isView(i) ? "binary" : (i = V(i), i === "ArrayBuffer" ? "binary" : i);
      }
      function nu(i) {
        return i instanceof Uint8Array ? i : ArrayBuffer.isView(i) ? new Uint8Array(i.buffer, i.byteOffset, i.byteLength) : new Uint8Array(i);
      }
      var ru = (Nt.prototype._trans = function(i, a, l) {
        var d = this._tx || ut.trans, p = this.name, w = Ge && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(i === "readonly" ? "read" : "write", " ").concat(this.name));
        function v(_, U, S) {
          if (!S.schema[p]) throw new at.NotFound("Table " + p + " not part of transaction");
          return a(S.idbtrans, S);
        }
        var x = or();
        try {
          var k = d && d.db._novip === this.db._novip ? d === ut.trans ? d._promise(i, v, l) : mn(function() {
            return d._promise(i, v, l);
          }, { trans: d, transless: ut.transless || ut }) : function _(U, S, R, I) {
            if (U.idbdb && (U._state.openComplete || ut.letThrough || U._vip)) {
              var C = U._createTransaction(S, R, U._dbSchema);
              try {
                C.create(), U._state.PR1398_maxLoop = 3;
              } catch ($) {
                return $.name === Ke.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                  return _(U, S, R, I);
                })) : Ft($);
              }
              return C._promise(S, function($, N) {
                return mn(function() {
                  return ut.trans = C, I($, N, C);
                });
              }).then(function($) {
                if (S === "readwrite") try {
                  C.idbtrans.commit();
                } catch {
                }
                return S === "readonly" ? $ : C._completion.then(function() {
                  return $;
                });
              });
            }
            if (U._state.openComplete) return Ft(new at.DatabaseClosed(U._state.dbOpenError));
            if (!U._state.isBeingOpened) {
              if (!U._state.autoOpen) return Ft(new at.DatabaseClosed());
              U.open().catch(pt);
            }
            return U._state.dbReadyPromise.then(function() {
              return _(U, S, R, I);
            });
          }(this.db, i, [this.name], v);
          return w && (k._consoleTask = w, k = k.catch(function(_) {
            return console.trace(_), Ft(_);
          })), k;
        } finally {
          x && ir();
        }
      }, Nt.prototype.get = function(i, a) {
        var l = this;
        return i && i.constructor === Object ? this.where(i).first(a) : i == null ? Ft(new at.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(d) {
          return l.core.get({ trans: d, key: i }).then(function(p) {
            return l.hook.reading.fire(p);
          });
        }).then(a);
      }, Nt.prototype.where = function(i) {
        if (typeof i == "string") return new this.db.WhereClause(this, i);
        if (u(i)) return new this.db.WhereClause(this, "[".concat(i.join("+"), "]"));
        var a = c(i);
        if (a.length === 1) return this.where(a[0]).equals(i[a[0]]);
        var l = this.schema.indexes.concat(this.schema.primKey).filter(function(x) {
          if (x.compound && a.every(function(_) {
            return 0 <= x.keyPath.indexOf(_);
          })) {
            for (var k = 0; k < a.length; ++k) if (a.indexOf(x.keyPath[k]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(x, k) {
          return x.keyPath.length - k.keyPath.length;
        })[0];
        if (l && this.db._maxKey !== Hn) {
          var w = l.keyPath.slice(0, a.length);
          return this.where(w).equals(w.map(function(k) {
            return i[k];
          }));
        }
        !l && Ge && console.warn("The query ".concat(JSON.stringify(i), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(a.join("+"), "]"));
        var d = this.schema.idxByName;
        function p(x, k) {
          return At(x, k) === 0;
        }
        var v = a.reduce(function(S, k) {
          var _ = S[0], U = S[1], S = d[k], R = i[k];
          return [_ || S, _ || !S ? Vn(U, S && S.multi ? function(I) {
            return I = W(I, k), u(I) && I.some(function(C) {
              return p(R, C);
            });
          } : function(I) {
            return p(R, W(I, k));
          }) : U];
        }, [null, null]), w = v[0], v = v[1];
        return w ? this.where(w.name).equals(i[w.keyPath]).filter(v) : l ? this.filter(v) : this.where(a).equals("");
      }, Nt.prototype.filter = function(i) {
        return this.toCollection().and(i);
      }, Nt.prototype.count = function(i) {
        return this.toCollection().count(i);
      }, Nt.prototype.offset = function(i) {
        return this.toCollection().offset(i);
      }, Nt.prototype.limit = function(i) {
        return this.toCollection().limit(i);
      }, Nt.prototype.each = function(i) {
        return this.toCollection().each(i);
      }, Nt.prototype.toArray = function(i) {
        return this.toCollection().toArray(i);
      }, Nt.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, Nt.prototype.orderBy = function(i) {
        return new this.db.Collection(new this.db.WhereClause(this, u(i) ? "[".concat(i.join("+"), "]") : i));
      }, Nt.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, Nt.prototype.mapToClass = function(i) {
        var a, l = this.db, d = this.name;
        function p() {
          return a !== null && a.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = i).prototype instanceof tu && (function(k, _) {
          if (typeof _ != "function" && _ !== null) throw new TypeError("Class extends value " + String(_) + " is not a constructor or null");
          function U() {
            this.constructor = k;
          }
          n(k, _), k.prototype = _ === null ? Object.create(_) : (U.prototype = _.prototype, new U());
        }(p, a = i), Object.defineProperty(p.prototype, "db", { get: function() {
          return l;
        }, enumerable: !1, configurable: !0 }), p.prototype.table = function() {
          return d;
        }, i = p);
        for (var w = /* @__PURE__ */ new Set(), v = i.prototype; v; v = h(v)) Object.getOwnPropertyNames(v).forEach(function(k) {
          return w.add(k);
        });
        function x(k) {
          if (!k) return k;
          var _, U = Object.create(i.prototype);
          for (_ in k) if (!w.has(_)) try {
            U[_] = k[_];
          } catch {
          }
          return U;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = x, this.hook("reading", x), i;
      }, Nt.prototype.defineClass = function() {
        return this.mapToClass(function(i) {
          f(this, i);
        });
      }, Nt.prototype.add = function(i, a) {
        var l = this, d = this.schema.primKey, p = d.auto, w = d.keyPath, v = i;
        return w && p && (v = qo(w)(i)), this._trans("readwrite", function(x) {
          return l.core.mutate({ trans: x, type: "add", keys: a != null ? [a] : null, values: [v] });
        }).then(function(x) {
          return x.numFailures ? it.reject(x.failures[0]) : x.lastResult;
        }).then(function(x) {
          if (w) try {
            z(i, w, x);
          } catch {
          }
          return x;
        });
      }, Nt.prototype.update = function(i, a) {
        return typeof i != "object" || u(i) ? this.where(":id").equals(i).modify(a) : (i = W(i, this.schema.primKey.keyPath), i === void 0 ? Ft(new at.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(i).modify(a));
      }, Nt.prototype.put = function(i, a) {
        var l = this, d = this.schema.primKey, p = d.auto, w = d.keyPath, v = i;
        return w && p && (v = qo(w)(i)), this._trans("readwrite", function(x) {
          return l.core.mutate({ trans: x, type: "put", values: [v], keys: a != null ? [a] : null });
        }).then(function(x) {
          return x.numFailures ? it.reject(x.failures[0]) : x.lastResult;
        }).then(function(x) {
          if (w) try {
            z(i, w, x);
          } catch {
          }
          return x;
        });
      }, Nt.prototype.delete = function(i) {
        var a = this;
        return this._trans("readwrite", function(l) {
          return a.core.mutate({ trans: l, type: "delete", keys: [i] });
        }).then(function(l) {
          return l.numFailures ? it.reject(l.failures[0]) : void 0;
        });
      }, Nt.prototype.clear = function() {
        var i = this;
        return this._trans("readwrite", function(a) {
          return i.core.mutate({ trans: a, type: "deleteRange", range: Jc });
        }).then(function(a) {
          return a.numFailures ? it.reject(a.failures[0]) : void 0;
        });
      }, Nt.prototype.bulkGet = function(i) {
        var a = this;
        return this._trans("readonly", function(l) {
          return a.core.getMany({ keys: i, trans: l }).then(function(d) {
            return d.map(function(p) {
              return a.hook.reading.fire(p);
            });
          });
        });
      }, Nt.prototype.bulkAdd = function(i, a, l) {
        var d = this, p = Array.isArray(a) ? a : void 0, w = (l = l || (p ? void 0 : a)) ? l.allKeys : void 0;
        return this._trans("readwrite", function(v) {
          var _ = d.schema.primKey, x = _.auto, _ = _.keyPath;
          if (_ && p) throw new at.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (p && p.length !== i.length) throw new at.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, _ = _ && x ? i.map(qo(_)) : i;
          return d.core.mutate({ trans: v, type: "add", keys: p, values: _, wantResults: w }).then(function(C) {
            var S = C.numFailures, R = C.results, I = C.lastResult, C = C.failures;
            if (S === 0) return w ? R : I;
            throw new $t("".concat(d.name, ".bulkAdd(): ").concat(S, " of ").concat(k, " operations failed"), C);
          });
        });
      }, Nt.prototype.bulkPut = function(i, a, l) {
        var d = this, p = Array.isArray(a) ? a : void 0, w = (l = l || (p ? void 0 : a)) ? l.allKeys : void 0;
        return this._trans("readwrite", function(v) {
          var _ = d.schema.primKey, x = _.auto, _ = _.keyPath;
          if (_ && p) throw new at.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (p && p.length !== i.length) throw new at.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, _ = _ && x ? i.map(qo(_)) : i;
          return d.core.mutate({ trans: v, type: "put", keys: p, values: _, wantResults: w }).then(function(C) {
            var S = C.numFailures, R = C.results, I = C.lastResult, C = C.failures;
            if (S === 0) return w ? R : I;
            throw new $t("".concat(d.name, ".bulkPut(): ").concat(S, " of ").concat(k, " operations failed"), C);
          });
        });
      }, Nt.prototype.bulkUpdate = function(i) {
        var a = this, l = this.core, d = i.map(function(v) {
          return v.key;
        }), p = i.map(function(v) {
          return v.changes;
        }), w = [];
        return this._trans("readwrite", function(v) {
          return l.getMany({ trans: v, keys: d, cache: "clone" }).then(function(x) {
            var k = [], _ = [];
            i.forEach(function(S, R) {
              var I = S.key, C = S.changes, $ = x[R];
              if ($) {
                for (var N = 0, L = Object.keys(C); N < L.length; N++) {
                  var P = L[N], K = C[P];
                  if (P === a.schema.primKey.keyPath) {
                    if (At(K, I) !== 0) throw new at.Constraint("Cannot update primary key in bulkUpdate()");
                  } else z($, P, K);
                }
                w.push(R), k.push(I), _.push($);
              }
            });
            var U = k.length;
            return l.mutate({ trans: v, type: "put", keys: k, values: _, updates: { keys: d, changeSpecs: p } }).then(function(S) {
              var R = S.numFailures, I = S.failures;
              if (R === 0) return U;
              for (var C = 0, $ = Object.keys(I); C < $.length; C++) {
                var N, L = $[C], P = w[Number(L)];
                P != null && (N = I[L], delete I[L], I[P] = N);
              }
              throw new $t("".concat(a.name, ".bulkUpdate(): ").concat(R, " of ").concat(U, " operations failed"), I);
            });
          });
        });
      }, Nt.prototype.bulkDelete = function(i) {
        var a = this, l = i.length;
        return this._trans("readwrite", function(d) {
          return a.core.mutate({ trans: d, type: "delete", keys: i });
        }).then(function(v) {
          var p = v.numFailures, w = v.lastResult, v = v.failures;
          if (p === 0) return w;
          throw new $t("".concat(a.name, ".bulkDelete(): ").concat(p, " of ").concat(l, " operations failed"), v);
        });
      }, Nt);
      function Nt() {
      }
      function Hr(i) {
        function a(v, x) {
          if (x) {
            for (var k = arguments.length, _ = new Array(k - 1); --k; ) _[k - 1] = arguments[k];
            return l[v].subscribe.apply(null, _), i;
          }
          if (typeof v == "string") return l[v];
        }
        var l = {};
        a.addEventType = w;
        for (var d = 1, p = arguments.length; d < p; ++d) w(arguments[d]);
        return a;
        function w(v, x, k) {
          if (typeof v != "object") {
            var _;
            x = x || Sd;
            var U = { subscribers: [], fire: k = k || pt, subscribe: function(S) {
              U.subscribers.indexOf(S) === -1 && (U.subscribers.push(S), U.fire = x(U.fire, S));
            }, unsubscribe: function(S) {
              U.subscribers = U.subscribers.filter(function(R) {
                return R !== S;
              }), U.fire = U.subscribers.reduce(x, k);
            } };
            return l[v] = a[v] = U;
          }
          c(_ = v).forEach(function(S) {
            var R = _[S];
            if (u(R)) w(S, _[S][0], _[S][1]);
            else {
              if (R !== "asap") throw new at.InvalidArgument("Invalid event config");
              var I = w(S, ce, function() {
                for (var C = arguments.length, $ = new Array(C); C--; ) $[C] = arguments[C];
                I.subscribers.forEach(function(N) {
                  G(function() {
                    N.apply(null, $);
                  });
                });
              });
            }
          });
        }
      }
      function Vr(i, a) {
        return T(a).from({ prototype: i }), a;
      }
      function cr(i, a) {
        return !(i.filter || i.algorithm || i.or) && (a ? i.justLimit : !i.replayFilter);
      }
      function xs(i, a) {
        i.filter = Vn(i.filter, a);
      }
      function Ss(i, a, l) {
        var d = i.replayFilter;
        i.replayFilter = d ? function() {
          return Vn(d(), a());
        } : a, i.justLimit = l && !d;
      }
      function jo(i, a) {
        if (i.isPrimKey) return a.primaryKey;
        var l = a.getIndexByKeyPath(i.index);
        if (!l) throw new at.Schema("KeyPath " + i.index + " on object store " + a.name + " is not indexed");
        return l;
      }
      function ou(i, a, l) {
        var d = jo(i, a.schema);
        return a.openCursor({ trans: l, values: !i.keysOnly, reverse: i.dir === "prev", unique: !!i.unique, query: { index: d, range: i.range } });
      }
      function zo(i, a, l, d) {
        var p = i.replayFilter ? Vn(i.filter, i.replayFilter()) : i.filter;
        if (i.or) {
          var w = {}, v = function(x, k, _) {
            var U, S;
            p && !p(k, _, function(R) {
              return k.stop(R);
            }, function(R) {
              return k.fail(R);
            }) || ((S = "" + (U = k.primaryKey)) == "[object ArrayBuffer]" && (S = "" + new Uint8Array(U)), g(w, S) || (w[S] = !0, a(x, k, _)));
          };
          return Promise.all([i.or._iterate(v, l), iu(ou(i, d, l), i.algorithm, v, !i.keysOnly && i.valueMapper)]);
        }
        return iu(ou(i, d, l), Vn(i.algorithm, p), a, !i.keysOnly && i.valueMapper);
      }
      function iu(i, a, l, d) {
        var p = Rt(d ? function(w, v, x) {
          return l(d(w), v, x);
        } : l);
        return i.then(function(w) {
          if (w) return w.start(function() {
            var v = function() {
              return w.continue();
            };
            a && !a(w, function(x) {
              return v = x;
            }, function(x) {
              w.stop(x), v = pt;
            }, function(x) {
              w.fail(x), v = pt;
            }) || p(w.value, w, function(x) {
              return v = x;
            }), v();
          });
        });
      }
      var qr = (su.prototype.execute = function(i) {
        var a = this["@@propmod"];
        if (a.add !== void 0) {
          var l = a.add;
          if (u(l)) return o(o([], u(i) ? i : [], !0), l).sort();
          if (typeof l == "number") return (Number(i) || 0) + l;
          if (typeof l == "bigint") try {
            return BigInt(i) + l;
          } catch {
            return BigInt(0) + l;
          }
          throw new TypeError("Invalid term ".concat(l));
        }
        if (a.remove !== void 0) {
          var d = a.remove;
          if (u(d)) return u(i) ? i.filter(function(p) {
            return !d.includes(p);
          }).sort() : [];
          if (typeof d == "number") return Number(i) - d;
          if (typeof d == "bigint") try {
            return BigInt(i) - d;
          } catch {
            return BigInt(0) - d;
          }
          throw new TypeError("Invalid subtrahend ".concat(d));
        }
        return l = (l = a.replacePrefix) === null || l === void 0 ? void 0 : l[0], l && typeof i == "string" && i.startsWith(l) ? a.replacePrefix[1] + i.substring(l.length) : i;
      }, su);
      function su(i) {
        this["@@propmod"] = i;
      }
      var _d = (Tt.prototype._read = function(i, a) {
        var l = this._ctx;
        return l.error ? l.table._trans(null, Ft.bind(null, l.error)) : l.table._trans("readonly", i).then(a);
      }, Tt.prototype._write = function(i) {
        var a = this._ctx;
        return a.error ? a.table._trans(null, Ft.bind(null, a.error)) : a.table._trans("readwrite", i, "locked");
      }, Tt.prototype._addAlgorithm = function(i) {
        var a = this._ctx;
        a.algorithm = Vn(a.algorithm, i);
      }, Tt.prototype._iterate = function(i, a) {
        return zo(this._ctx, i, a, this._ctx.table.core);
      }, Tt.prototype.clone = function(i) {
        var a = Object.create(this.constructor.prototype), l = Object.create(this._ctx);
        return i && f(l, i), a._ctx = l, a;
      }, Tt.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, Tt.prototype.each = function(i) {
        var a = this._ctx;
        return this._read(function(l) {
          return zo(a, i, l, a.table.core);
        });
      }, Tt.prototype.count = function(i) {
        var a = this;
        return this._read(function(l) {
          var d = a._ctx, p = d.table.core;
          if (cr(d, !0)) return p.count({ trans: l, query: { index: jo(d, p.schema), range: d.range } }).then(function(v) {
            return Math.min(v, d.limit);
          });
          var w = 0;
          return zo(d, function() {
            return ++w, !1;
          }, l, p).then(function() {
            return w;
          });
        }).then(i);
      }, Tt.prototype.sortBy = function(i, a) {
        var l = i.split(".").reverse(), d = l[0], p = l.length - 1;
        function w(k, _) {
          return _ ? w(k[l[_]], _ - 1) : k[d];
        }
        var v = this._ctx.dir === "next" ? 1 : -1;
        function x(k, _) {
          return At(w(k, p), w(_, p)) * v;
        }
        return this.toArray(function(k) {
          return k.sort(x);
        }).then(a);
      }, Tt.prototype.toArray = function(i) {
        var a = this;
        return this._read(function(l) {
          var d = a._ctx;
          if (d.dir === "next" && cr(d, !0) && 0 < d.limit) {
            var p = d.valueMapper, w = jo(d, d.table.core.schema);
            return d.table.core.query({ trans: l, limit: d.limit, values: !0, query: { index: w, range: d.range } }).then(function(x) {
              return x = x.result, p ? x.map(p) : x;
            });
          }
          var v = [];
          return zo(d, function(x) {
            return v.push(x);
          }, l, d.table.core).then(function() {
            return v;
          });
        }, i);
      }, Tt.prototype.offset = function(i) {
        var a = this._ctx;
        return i <= 0 || (a.offset += i, cr(a) ? Ss(a, function() {
          var l = i;
          return function(d, p) {
            return l === 0 || (l === 1 ? --l : p(function() {
              d.advance(l), l = 0;
            }), !1);
          };
        }) : Ss(a, function() {
          var l = i;
          return function() {
            return --l < 0;
          };
        })), this;
      }, Tt.prototype.limit = function(i) {
        return this._ctx.limit = Math.min(this._ctx.limit, i), Ss(this._ctx, function() {
          var a = i;
          return function(l, d, p) {
            return --a <= 0 && d(p), 0 <= a;
          };
        }, !0), this;
      }, Tt.prototype.until = function(i, a) {
        return xs(this._ctx, function(l, d, p) {
          return !i(l.value) || (d(p), a);
        }), this;
      }, Tt.prototype.first = function(i) {
        return this.limit(1).toArray(function(a) {
          return a[0];
        }).then(i);
      }, Tt.prototype.last = function(i) {
        return this.reverse().first(i);
      }, Tt.prototype.filter = function(i) {
        var a;
        return xs(this._ctx, function(l) {
          return i(l.value);
        }), (a = this._ctx).isMatch = Vn(a.isMatch, i), this;
      }, Tt.prototype.and = function(i) {
        return this.filter(i);
      }, Tt.prototype.or = function(i) {
        return new this.db.WhereClause(this._ctx.table, i, this);
      }, Tt.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, Tt.prototype.desc = function() {
        return this.reverse();
      }, Tt.prototype.eachKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(l, d) {
          i(d.key, d);
        });
      }, Tt.prototype.eachUniqueKey = function(i) {
        return this._ctx.unique = "unique", this.eachKey(i);
      }, Tt.prototype.eachPrimaryKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(l, d) {
          i(d.primaryKey, d);
        });
      }, Tt.prototype.keys = function(i) {
        var a = this._ctx;
        a.keysOnly = !a.isMatch;
        var l = [];
        return this.each(function(d, p) {
          l.push(p.key);
        }).then(function() {
          return l;
        }).then(i);
      }, Tt.prototype.primaryKeys = function(i) {
        var a = this._ctx;
        if (a.dir === "next" && cr(a, !0) && 0 < a.limit) return this._read(function(d) {
          var p = jo(a, a.table.core.schema);
          return a.table.core.query({ trans: d, values: !1, limit: a.limit, query: { index: p, range: a.range } });
        }).then(function(d) {
          return d.result;
        }).then(i);
        a.keysOnly = !a.isMatch;
        var l = [];
        return this.each(function(d, p) {
          l.push(p.primaryKey);
        }).then(function() {
          return l;
        }).then(i);
      }, Tt.prototype.uniqueKeys = function(i) {
        return this._ctx.unique = "unique", this.keys(i);
      }, Tt.prototype.firstKey = function(i) {
        return this.limit(1).keys(function(a) {
          return a[0];
        }).then(i);
      }, Tt.prototype.lastKey = function(i) {
        return this.reverse().firstKey(i);
      }, Tt.prototype.distinct = function() {
        var i = this._ctx, i = i.index && i.table.schema.idxByName[i.index];
        if (!i || !i.multi) return this;
        var a = {};
        return xs(this._ctx, function(p) {
          var d = p.primaryKey.toString(), p = g(a, d);
          return a[d] = !0, !p;
        }), this;
      }, Tt.prototype.modify = function(i) {
        var a = this, l = this._ctx;
        return this._write(function(d) {
          var p, w, v;
          v = typeof i == "function" ? i : (p = c(i), w = p.length, function(N) {
            for (var L = !1, P = 0; P < w; ++P) {
              var K = p[P], F = i[K], Z = W(N, K);
              F instanceof qr ? (z(N, K, F.execute(Z)), L = !0) : Z !== F && (z(N, K, F), L = !0);
            }
            return L;
          });
          var x = l.table.core, S = x.schema.primaryKey, k = S.outbound, _ = S.extractKey, U = 200, S = a.db._options.modifyChunkSize;
          S && (U = typeof S == "object" ? S[x.name] || S["*"] || 200 : S);
          function R(N, K) {
            var P = K.failures, K = K.numFailures;
            C += N - K;
            for (var F = 0, Z = c(P); F < Z.length; F++) {
              var et = Z[F];
              I.push(P[et]);
            }
          }
          var I = [], C = 0, $ = [];
          return a.clone().primaryKeys().then(function(N) {
            function L(K) {
              var F = Math.min(U, N.length - K);
              return x.getMany({ trans: d, keys: N.slice(K, K + F), cache: "immutable" }).then(function(Z) {
                for (var et = [], X = [], J = k ? [] : null, ot = [], tt = 0; tt < F; ++tt) {
                  var ct = Z[tt], yt = { value: xt(ct), primKey: N[K + tt] };
                  v.call(yt, yt.value, yt) !== !1 && (yt.value == null ? ot.push(N[K + tt]) : k || At(_(ct), _(yt.value)) === 0 ? (X.push(yt.value), k && J.push(N[K + tt])) : (ot.push(N[K + tt]), et.push(yt.value)));
                }
                return Promise.resolve(0 < et.length && x.mutate({ trans: d, type: "add", values: et }).then(function(vt) {
                  for (var Et in vt.failures) ot.splice(parseInt(Et), 1);
                  R(et.length, vt);
                })).then(function() {
                  return (0 < X.length || P && typeof i == "object") && x.mutate({ trans: d, type: "put", keys: J, values: X, criteria: P, changeSpec: typeof i != "function" && i, isAdditionalChunk: 0 < K }).then(function(vt) {
                    return R(X.length, vt);
                  });
                }).then(function() {
                  return (0 < ot.length || P && i === As) && x.mutate({ trans: d, type: "delete", keys: ot, criteria: P, isAdditionalChunk: 0 < K }).then(function(vt) {
                    return R(ot.length, vt);
                  });
                }).then(function() {
                  return N.length > K + F && L(K + U);
                });
              });
            }
            var P = cr(l) && l.limit === 1 / 0 && (typeof i != "function" || i === As) && { index: l.index, range: l.range };
            return L(0).then(function() {
              if (0 < I.length) throw new Xt("Error modifying one or more objects", I, C, $);
              return N.length;
            });
          });
        });
      }, Tt.prototype.delete = function() {
        var i = this._ctx, a = i.range;
        return cr(i) && (i.isPrimKey || a.type === 3) ? this._write(function(l) {
          var d = i.table.core.schema.primaryKey, p = a;
          return i.table.core.count({ trans: l, query: { index: d, range: p } }).then(function(w) {
            return i.table.core.mutate({ trans: l, type: "deleteRange", range: p }).then(function(v) {
              var x = v.failures;
              if (v.lastResult, v.results, v = v.numFailures, v) throw new Xt("Could not delete some values", Object.keys(x).map(function(k) {
                return x[k];
              }), w - v);
              return w - v;
            });
          });
        }) : this.modify(As);
      }, Tt);
      function Tt() {
      }
      var As = function(i, a) {
        return a.value = null;
      };
      function Nd(i, a) {
        return i < a ? -1 : i === a ? 0 : 1;
      }
      function Cd(i, a) {
        return a < i ? -1 : i === a ? 0 : 1;
      }
      function Ne(i, a, l) {
        return i = i instanceof cu ? new i.Collection(i) : i, i._ctx.error = new (l || TypeError)(a), i;
      }
      function ur(i) {
        return new i.Collection(i, function() {
          return au("");
        }).limit(0);
      }
      function Go(i, a, l, d) {
        var p, w, v, x, k, _, U, S = l.length;
        if (!l.every(function(C) {
          return typeof C == "string";
        })) return Ne(i, Qc);
        function R(C) {
          p = C === "next" ? function(N) {
            return N.toUpperCase();
          } : function(N) {
            return N.toLowerCase();
          }, w = C === "next" ? function(N) {
            return N.toLowerCase();
          } : function(N) {
            return N.toUpperCase();
          }, v = C === "next" ? Nd : Cd;
          var $ = l.map(function(N) {
            return { lower: w(N), upper: p(N) };
          }).sort(function(N, L) {
            return v(N.lower, L.lower);
          });
          x = $.map(function(N) {
            return N.upper;
          }), k = $.map(function(N) {
            return N.lower;
          }), U = (_ = C) === "next" ? "" : d;
        }
        R("next"), i = new i.Collection(i, function() {
          return En(x[0], k[S - 1] + d);
        }), i._ondirectionchange = function(C) {
          R(C);
        };
        var I = 0;
        return i._addAlgorithm(function(C, $, N) {
          var L = C.key;
          if (typeof L != "string") return !1;
          var P = w(L);
          if (a(P, k, I)) return !0;
          for (var K = null, F = I; F < S; ++F) {
            var Z = function(et, X, J, ot, tt, ct) {
              for (var yt = Math.min(et.length, ot.length), vt = -1, Et = 0; Et < yt; ++Et) {
                var Ce = X[Et];
                if (Ce !== ot[Et]) return tt(et[Et], J[Et]) < 0 ? et.substr(0, Et) + J[Et] + J.substr(Et + 1) : tt(et[Et], ot[Et]) < 0 ? et.substr(0, Et) + ot[Et] + J.substr(Et + 1) : 0 <= vt ? et.substr(0, vt) + X[vt] + J.substr(vt + 1) : null;
                tt(et[Et], Ce) < 0 && (vt = Et);
              }
              return yt < ot.length && ct === "next" ? et + J.substr(et.length) : yt < et.length && ct === "prev" ? et.substr(0, J.length) : vt < 0 ? null : et.substr(0, vt) + ot[vt] + J.substr(vt + 1);
            }(L, P, x[F], k[F], v, _);
            Z === null && K === null ? I = F + 1 : (K === null || 0 < v(K, Z)) && (K = Z);
          }
          return $(K !== null ? function() {
            C.continue(K + U);
          } : N), !1;
        }), i;
      }
      function En(i, a, l, d) {
        return { type: 2, lower: i, upper: a, lowerOpen: l, upperOpen: d };
      }
      function au(i) {
        return { type: 1, lower: i, upper: i };
      }
      var cu = (Object.defineProperty(Jt.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), Jt.prototype.between = function(i, a, l, d) {
        l = l !== !1, d = d === !0;
        try {
          return 0 < this._cmp(i, a) || this._cmp(i, a) === 0 && (l || d) && (!l || !d) ? ur(this) : new this.Collection(this, function() {
            return En(i, a, !l, !d);
          });
        } catch {
          return Ne(this, rn);
        }
      }, Jt.prototype.equals = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return au(i);
        });
      }, Jt.prototype.above = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return En(i, void 0, !0);
        });
      }, Jt.prototype.aboveOrEqual = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return En(i, void 0, !1);
        });
      }, Jt.prototype.below = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return En(void 0, i, !1, !0);
        });
      }, Jt.prototype.belowOrEqual = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return En(void 0, i);
        });
      }, Jt.prototype.startsWith = function(i) {
        return typeof i != "string" ? Ne(this, Qc) : this.between(i, i + Hn, !0, !0);
      }, Jt.prototype.startsWithIgnoreCase = function(i) {
        return i === "" ? this.startsWith(i) : Go(this, function(a, l) {
          return a.indexOf(l[0]) === 0;
        }, [i], Hn);
      }, Jt.prototype.equalsIgnoreCase = function(i) {
        return Go(this, function(a, l) {
          return a === l[0];
        }, [i], "");
      }, Jt.prototype.anyOfIgnoreCase = function() {
        var i = mt.apply(lt, arguments);
        return i.length === 0 ? ur(this) : Go(this, function(a, l) {
          return l.indexOf(a) !== -1;
        }, i, "");
      }, Jt.prototype.startsWithAnyOfIgnoreCase = function() {
        var i = mt.apply(lt, arguments);
        return i.length === 0 ? ur(this) : Go(this, function(a, l) {
          return l.some(function(d) {
            return a.indexOf(d) === 0;
          });
        }, i, Hn);
      }, Jt.prototype.anyOf = function() {
        var i = this, a = mt.apply(lt, arguments), l = this._cmp;
        try {
          a.sort(l);
        } catch {
          return Ne(this, rn);
        }
        if (a.length === 0) return ur(this);
        var d = new this.Collection(this, function() {
          return En(a[0], a[a.length - 1]);
        });
        d._ondirectionchange = function(w) {
          l = w === "next" ? i._ascending : i._descending, a.sort(l);
        };
        var p = 0;
        return d._addAlgorithm(function(w, v, x) {
          for (var k = w.key; 0 < l(k, a[p]); ) if (++p === a.length) return v(x), !1;
          return l(k, a[p]) === 0 || (v(function() {
            w.continue(a[p]);
          }), !1);
        }), d;
      }, Jt.prototype.notEqual = function(i) {
        return this.inAnyRange([[-1 / 0, i], [i, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, Jt.prototype.noneOf = function() {
        var i = mt.apply(lt, arguments);
        if (i.length === 0) return new this.Collection(this);
        try {
          i.sort(this._ascending);
        } catch {
          return Ne(this, rn);
        }
        var a = i.reduce(function(l, d) {
          return l ? l.concat([[l[l.length - 1][1], d]]) : [[-1 / 0, d]];
        }, null);
        return a.push([i[i.length - 1], this.db._maxKey]), this.inAnyRange(a, { includeLowers: !1, includeUppers: !1 });
      }, Jt.prototype.inAnyRange = function(L, a) {
        var l = this, d = this._cmp, p = this._ascending, w = this._descending, v = this._min, x = this._max;
        if (L.length === 0) return ur(this);
        if (!L.every(function(P) {
          return P[0] !== void 0 && P[1] !== void 0 && p(P[0], P[1]) <= 0;
        })) return Ne(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", at.InvalidArgument);
        var k = !a || a.includeLowers !== !1, _ = a && a.includeUppers === !0, U, S = p;
        function R(P, K) {
          return S(P[0], K[0]);
        }
        try {
          (U = L.reduce(function(P, K) {
            for (var F = 0, Z = P.length; F < Z; ++F) {
              var et = P[F];
              if (d(K[0], et[1]) < 0 && 0 < d(K[1], et[0])) {
                et[0] = v(et[0], K[0]), et[1] = x(et[1], K[1]);
                break;
              }
            }
            return F === Z && P.push(K), P;
          }, [])).sort(R);
        } catch {
          return Ne(this, rn);
        }
        var I = 0, C = _ ? function(P) {
          return 0 < p(P, U[I][1]);
        } : function(P) {
          return 0 <= p(P, U[I][1]);
        }, $ = k ? function(P) {
          return 0 < w(P, U[I][0]);
        } : function(P) {
          return 0 <= w(P, U[I][0]);
        }, N = C, L = new this.Collection(this, function() {
          return En(U[0][0], U[U.length - 1][1], !k, !_);
        });
        return L._ondirectionchange = function(P) {
          S = P === "next" ? (N = C, p) : (N = $, w), U.sort(R);
        }, L._addAlgorithm(function(P, K, F) {
          for (var Z, et = P.key; N(et); ) if (++I === U.length) return K(F), !1;
          return !C(Z = et) && !$(Z) || (l._cmp(et, U[I][1]) === 0 || l._cmp(et, U[I][0]) === 0 || K(function() {
            S === p ? P.continue(U[I][0]) : P.continue(U[I][1]);
          }), !1);
        }), L;
      }, Jt.prototype.startsWithAnyOf = function() {
        var i = mt.apply(lt, arguments);
        return i.every(function(a) {
          return typeof a == "string";
        }) ? i.length === 0 ? ur(this) : this.inAnyRange(i.map(function(a) {
          return [a, a + Hn];
        })) : Ne(this, "startsWithAnyOf() only works with strings");
      }, Jt);
      function Jt() {
      }
      function We(i) {
        return Rt(function(a) {
          return jr(a), i(a.target.error), !1;
        });
      }
      function jr(i) {
        i.stopPropagation && i.stopPropagation(), i.preventDefault && i.preventDefault();
      }
      var zr = "storagemutated", ks = "x-storagemutated-1", xn = Hr(null, zr), Ud = (Ye.prototype._lock = function() {
        return j(!ut.global), ++this._reculock, this._reculock !== 1 || ut.global || (ut.lockOwnerFor = this), this;
      }, Ye.prototype._unlock = function() {
        if (j(!ut.global), --this._reculock == 0) for (ut.global || (ut.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var i = this._blockedFuncs.shift();
          try {
            Fn(i[1], i[0]);
          } catch {
          }
        }
        return this;
      }, Ye.prototype._locked = function() {
        return this._reculock && ut.lockOwnerFor !== this;
      }, Ye.prototype.create = function(i) {
        var a = this;
        if (!this.mode) return this;
        var l = this.db.idbdb, d = this.db._state.dbOpenError;
        if (j(!this.idbtrans), !i && !l) switch (d && d.name) {
          case "DatabaseClosedError":
            throw new at.DatabaseClosed(d);
          case "MissingAPIError":
            throw new at.MissingAPI(d.message, d);
          default:
            throw new at.OpenFailed(d);
        }
        if (!this.active) throw new at.TransactionInactive();
        return j(this._completion._state === null), (i = this.idbtrans = i || (this.db.core || l).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Rt(function(p) {
          jr(p), a._reject(i.error);
        }), i.onabort = Rt(function(p) {
          jr(p), a.active && a._reject(new at.Abort(i.error)), a.active = !1, a.on("abort").fire(p);
        }), i.oncomplete = Rt(function() {
          a.active = !1, a._resolve(), "mutatedParts" in i && xn.storagemutated.fire(i.mutatedParts);
        }), this;
      }, Ye.prototype._promise = function(i, a, l) {
        var d = this;
        if (i === "readwrite" && this.mode !== "readwrite") return Ft(new at.ReadOnly("Transaction is readonly"));
        if (!this.active) return Ft(new at.TransactionInactive());
        if (this._locked()) return new it(function(w, v) {
          d._blockedFuncs.push([function() {
            d._promise(i, a, l).then(w, v);
          }, ut]);
        });
        if (l) return mn(function() {
          var w = new it(function(v, x) {
            d._lock();
            var k = a(v, x, d);
            k && k.then && k.then(v, x);
          });
          return w.finally(function() {
            return d._unlock();
          }), w._lib = !0, w;
        });
        var p = new it(function(w, v) {
          var x = a(w, v, d);
          x && x.then && x.then(w, v);
        });
        return p._lib = !0, p;
      }, Ye.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, Ye.prototype.waitFor = function(i) {
        var a, l = this._root(), d = it.resolve(i);
        l._waitingFor ? l._waitingFor = l._waitingFor.then(function() {
          return d;
        }) : (l._waitingFor = d, l._waitingQueue = [], a = l.idbtrans.objectStore(l.storeNames[0]), function w() {
          for (++l._spinCount; l._waitingQueue.length; ) l._waitingQueue.shift()();
          l._waitingFor && (a.get(-1 / 0).onsuccess = w);
        }());
        var p = l._waitingFor;
        return new it(function(w, v) {
          d.then(function(x) {
            return l._waitingQueue.push(Rt(w.bind(null, x)));
          }, function(x) {
            return l._waitingQueue.push(Rt(v.bind(null, x)));
          }).finally(function() {
            l._waitingFor === p && (l._waitingFor = null);
          });
        });
      }, Ye.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new at.Abort()));
      }, Ye.prototype.table = function(i) {
        var a = this._memoizedTables || (this._memoizedTables = {});
        if (g(a, i)) return a[i];
        var l = this.schema[i];
        if (!l) throw new at.NotFound("Table " + i + " not part of transaction");
        return l = new this.db.Table(i, l, this), l.core = this.db.core.table(i), a[i] = l;
      }, Ye);
      function Ye() {
      }
      function Ts(i, a, l, d, p, w, v) {
        return { name: i, keyPath: a, unique: l, multi: d, auto: p, compound: w, src: (l && !v ? "&" : "") + (d ? "*" : "") + (p ? "++" : "") + uu(a) };
      }
      function uu(i) {
        return typeof i == "string" ? i : i ? "[" + [].join.call(i, "+") + "]" : "";
      }
      function Is(i, a, l) {
        return { name: i, primKey: a, indexes: l, mappedClass: null, idxByName: (d = function(p) {
          return [p.name, p];
        }, l.reduce(function(p, w, v) {
          return v = d(w, v), v && (p[v[0]] = v[1]), p;
        }, {})) };
        var d;
      }
      var Gr = function(i) {
        try {
          return i.only([[]]), Gr = function() {
            return [[]];
          }, [[]];
        } catch {
          return Gr = function() {
            return Hn;
          }, Hn;
        }
      };
      function Bs(i) {
        return i == null ? function() {
        } : typeof i == "string" ? (a = i).split(".").length === 1 ? function(l) {
          return l[a];
        } : function(l) {
          return W(l, a);
        } : function(l) {
          return W(l, i);
        };
        var a;
      }
      function fu(i) {
        return [].slice.call(i);
      }
      var $d = 0;
      function Wr(i) {
        return i == null ? ":id" : typeof i == "string" ? i : "[".concat(i.join("+"), "]");
      }
      function Rd(i, a, k) {
        function d(N) {
          if (N.type === 3) return null;
          if (N.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var I = N.lower, C = N.upper, $ = N.lowerOpen, N = N.upperOpen;
          return I === void 0 ? C === void 0 ? null : a.upperBound(C, !!N) : C === void 0 ? a.lowerBound(I, !!$) : a.bound(I, C, !!$, !!N);
        }
        function p(R) {
          var I, C = R.name;
          return { name: C, schema: R, mutate: function($) {
            var N = $.trans, L = $.type, P = $.keys, K = $.values, F = $.range;
            return new Promise(function(Z, et) {
              Z = Rt(Z);
              var X = N.objectStore(C), J = X.keyPath == null, ot = L === "put" || L === "add";
              if (!ot && L !== "delete" && L !== "deleteRange") throw new Error("Invalid operation type: " + L);
              var tt, ct = (P || K || { length: 1 }).length;
              if (P && K && P.length !== K.length) throw new Error("Given keys array must have same length as given values array.");
              if (ct === 0) return Z({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function yt(be) {
                ++Ce, jr(be);
              }
              var vt = [], Et = [], Ce = 0;
              if (L === "deleteRange") {
                if (F.type === 4) return Z({ numFailures: Ce, failures: Et, results: [], lastResult: void 0 });
                F.type === 3 ? vt.push(tt = X.clear()) : vt.push(tt = X.delete(d(F)));
              } else {
                var J = ot ? J ? [K, P] : [K, null] : [P, null], gt = J[0], he = J[1];
                if (ot) for (var pe = 0; pe < ct; ++pe) vt.push(tt = he && he[pe] !== void 0 ? X[L](gt[pe], he[pe]) : X[L](gt[pe])), tt.onerror = yt;
                else for (pe = 0; pe < ct; ++pe) vt.push(tt = X[L](gt[pe])), tt.onerror = yt;
              }
              function si(be) {
                be = be.target.result, vt.forEach(function(zn, zs) {
                  return zn.error != null && (Et[zs] = zn.error);
                }), Z({ numFailures: Ce, failures: Et, results: L === "delete" ? P : vt.map(function(zn) {
                  return zn.result;
                }), lastResult: be });
              }
              tt.onerror = function(be) {
                yt(be), si(be);
              }, tt.onsuccess = si;
            });
          }, getMany: function($) {
            var N = $.trans, L = $.keys;
            return new Promise(function(P, K) {
              P = Rt(P);
              for (var F, Z = N.objectStore(C), et = L.length, X = new Array(et), J = 0, ot = 0, tt = function(vt) {
                vt = vt.target, X[vt._pos] = vt.result, ++ot === J && P(X);
              }, ct = We(K), yt = 0; yt < et; ++yt) L[yt] != null && ((F = Z.get(L[yt]))._pos = yt, F.onsuccess = tt, F.onerror = ct, ++J);
              J === 0 && P(X);
            });
          }, get: function($) {
            var N = $.trans, L = $.key;
            return new Promise(function(P, K) {
              P = Rt(P);
              var F = N.objectStore(C).get(L);
              F.onsuccess = function(Z) {
                return P(Z.target.result);
              }, F.onerror = We(K);
            });
          }, query: (I = _, function($) {
            return new Promise(function(N, L) {
              N = Rt(N);
              var P, K, F, J = $.trans, Z = $.values, et = $.limit, tt = $.query, X = et === 1 / 0 ? void 0 : et, ot = tt.index, tt = tt.range, J = J.objectStore(C), ot = ot.isPrimaryKey ? J : J.index(ot.name), tt = d(tt);
              if (et === 0) return N({ result: [] });
              I ? ((X = Z ? ot.getAll(tt, X) : ot.getAllKeys(tt, X)).onsuccess = function(ct) {
                return N({ result: ct.target.result });
              }, X.onerror = We(L)) : (P = 0, K = !Z && "openKeyCursor" in ot ? ot.openKeyCursor(tt) : ot.openCursor(tt), F = [], K.onsuccess = function(ct) {
                var yt = K.result;
                return yt ? (F.push(Z ? yt.value : yt.primaryKey), ++P === et ? N({ result: F }) : void yt.continue()) : N({ result: F });
              }, K.onerror = We(L));
            });
          }), openCursor: function($) {
            var N = $.trans, L = $.values, P = $.query, K = $.reverse, F = $.unique;
            return new Promise(function(Z, et) {
              Z = Rt(Z);
              var ot = P.index, X = P.range, J = N.objectStore(C), J = ot.isPrimaryKey ? J : J.index(ot.name), ot = K ? F ? "prevunique" : "prev" : F ? "nextunique" : "next", tt = !L && "openKeyCursor" in J ? J.openKeyCursor(d(X), ot) : J.openCursor(d(X), ot);
              tt.onerror = We(et), tt.onsuccess = Rt(function(ct) {
                var yt, vt, Et, Ce, gt = tt.result;
                gt ? (gt.___id = ++$d, gt.done = !1, yt = gt.continue.bind(gt), vt = (vt = gt.continuePrimaryKey) && vt.bind(gt), Et = gt.advance.bind(gt), Ce = function() {
                  throw new Error("Cursor not stopped");
                }, gt.trans = N, gt.stop = gt.continue = gt.continuePrimaryKey = gt.advance = function() {
                  throw new Error("Cursor not started");
                }, gt.fail = Rt(et), gt.next = function() {
                  var he = this, pe = 1;
                  return this.start(function() {
                    return pe-- ? he.continue() : he.stop();
                  }).then(function() {
                    return he;
                  });
                }, gt.start = function(he) {
                  function pe() {
                    if (tt.result) try {
                      he();
                    } catch (be) {
                      gt.fail(be);
                    }
                    else gt.done = !0, gt.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, gt.stop();
                  }
                  var si = new Promise(function(be, zn) {
                    be = Rt(be), tt.onerror = We(zn), gt.fail = zn, gt.stop = function(zs) {
                      gt.stop = gt.continue = gt.continuePrimaryKey = gt.advance = Ce, be(zs);
                    };
                  });
                  return tt.onsuccess = Rt(function(be) {
                    tt.onsuccess = pe, pe();
                  }), gt.continue = yt, gt.continuePrimaryKey = vt, gt.advance = Et, pe(), si;
                }, Z(gt)) : Z(null);
              }, et);
            });
          }, count: function($) {
            var N = $.query, L = $.trans, P = N.index, K = N.range;
            return new Promise(function(F, Z) {
              var et = L.objectStore(C), X = P.isPrimaryKey ? et : et.index(P.name), et = d(K), X = et ? X.count(et) : X.count();
              X.onsuccess = Rt(function(J) {
                return F(J.target.result);
              }), X.onerror = We(Z);
            });
          } };
        }
        var w, v, x, U = (v = k, x = fu((w = i).objectStoreNames), { schema: { name: w.name, tables: x.map(function(R) {
          return v.objectStore(R);
        }).map(function(R) {
          var I = R.keyPath, N = R.autoIncrement, C = u(I), $ = {}, N = { name: R.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: I == null, compound: C, keyPath: I, autoIncrement: N, unique: !0, extractKey: Bs(I) }, indexes: fu(R.indexNames).map(function(L) {
            return R.index(L);
          }).map(function(F) {
            var P = F.name, K = F.unique, Z = F.multiEntry, F = F.keyPath, Z = { name: P, compound: u(F), keyPath: F, unique: K, multiEntry: Z, extractKey: Bs(F) };
            return $[Wr(F)] = Z;
          }), getIndexByKeyPath: function(L) {
            return $[Wr(L)];
          } };
          return $[":id"] = N.primaryKey, I != null && ($[Wr(I)] = N.primaryKey), N;
        }) }, hasGetAll: 0 < x.length && "getAll" in v.objectStore(x[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), k = U.schema, _ = U.hasGetAll, U = k.tables.map(p), S = {};
        return U.forEach(function(R) {
          return S[R.name] = R;
        }), { stack: "dbcore", transaction: i.transaction.bind(i), table: function(R) {
          if (!S[R]) throw new Error("Table '".concat(R, "' not found"));
          return S[R];
        }, MIN_KEY: -1 / 0, MAX_KEY: Gr(a), schema: k };
      }
      function Od(i, a, l, d) {
        var p = l.IDBKeyRange;
        return l.indexedDB, { dbcore: (d = Rd(a, p, d), i.dbcore.reduce(function(w, v) {
          return v = v.create, r(r({}, w), v(w));
        }, d)) };
      }
      function Wo(i, d) {
        var l = d.db, d = Od(i._middlewares, l, i._deps, d);
        i.core = d.dbcore, i.tables.forEach(function(p) {
          var w = p.name;
          i.core.schema.tables.some(function(v) {
            return v.name === w;
          }) && (p.core = i.core.table(w), i[w] instanceof i.Table && (i[w].core = p.core));
        });
      }
      function Yo(i, a, l, d) {
        l.forEach(function(p) {
          var w = d[p];
          a.forEach(function(v) {
            var x = function k(_, U) {
              return b(_, U) || (_ = h(_)) && k(_, U);
            }(v, p);
            (!x || "value" in x && x.value === void 0) && (v === i.Transaction.prototype || v instanceof i.Transaction ? A(v, p, { get: function() {
              return this.table(p);
            }, set: function(k) {
              E(this, p, { value: k, writable: !0, configurable: !0, enumerable: !0 });
            } }) : v[p] = new i.Table(p, w));
          });
        });
      }
      function _s(i, a) {
        a.forEach(function(l) {
          for (var d in l) l[d] instanceof i.Table && delete l[d];
        });
      }
      function Ld(i, a) {
        return i._cfg.version - a._cfg.version;
      }
      function Pd(i, a, l, d) {
        var p = i._dbSchema;
        l.objectStoreNames.contains("$meta") && !p.$meta && (p.$meta = Is("$meta", du("")[0], []), i._storeNames.push("$meta"));
        var w = i._createTransaction("readwrite", i._storeNames, p);
        w.create(l), w._completion.catch(d);
        var v = w._reject.bind(w), x = ut.transless || ut;
        mn(function() {
          return ut.trans = w, ut.transless = x, a !== 0 ? (Wo(i, l), _ = a, ((k = w).storeNames.includes("$meta") ? k.table("$meta").get("version").then(function(U) {
            return U ?? _;
          }) : it.resolve(_)).then(function(U) {
            return R = U, I = w, C = l, $ = [], U = (S = i)._versions, N = S._dbSchema = Xo(0, S.idbdb, C), (U = U.filter(function(L) {
              return L._cfg.version >= R;
            })).length !== 0 ? (U.forEach(function(L) {
              $.push(function() {
                var P = N, K = L._cfg.dbschema;
                Qo(S, P, C), Qo(S, K, C), N = S._dbSchema = K;
                var F = Ns(P, K);
                F.add.forEach(function(ot) {
                  Cs(C, ot[0], ot[1].primKey, ot[1].indexes);
                }), F.change.forEach(function(ot) {
                  if (ot.recreate) throw new at.Upgrade("Not yet support for changing primary key");
                  var tt = C.objectStore(ot.name);
                  ot.add.forEach(function(ct) {
                    return Zo(tt, ct);
                  }), ot.change.forEach(function(ct) {
                    tt.deleteIndex(ct.name), Zo(tt, ct);
                  }), ot.del.forEach(function(ct) {
                    return tt.deleteIndex(ct);
                  });
                });
                var Z = L._cfg.contentUpgrade;
                if (Z && L._cfg.version > R) {
                  Wo(S, C), I._memoizedTables = {};
                  var et = nt(K);
                  F.del.forEach(function(ot) {
                    et[ot] = P[ot];
                  }), _s(S, [S.Transaction.prototype]), Yo(S, [S.Transaction.prototype], c(et), et), I.schema = et;
                  var X, J = St(Z);
                  return J && sr(), F = it.follow(function() {
                    var ot;
                    (X = Z(I)) && J && (ot = bn.bind(null, null), X.then(ot, ot));
                  }), X && typeof X.then == "function" ? it.resolve(X) : F.then(function() {
                    return X;
                  });
                }
              }), $.push(function(P) {
                var K, F, Z = L._cfg.dbschema;
                K = Z, F = P, [].slice.call(F.db.objectStoreNames).forEach(function(et) {
                  return K[et] == null && F.db.deleteObjectStore(et);
                }), _s(S, [S.Transaction.prototype]), Yo(S, [S.Transaction.prototype], S._storeNames, S._dbSchema), I.schema = S._dbSchema;
              }), $.push(function(P) {
                S.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(S.idbdb.version / 10) === L._cfg.version ? (S.idbdb.deleteObjectStore("$meta"), delete S._dbSchema.$meta, S._storeNames = S._storeNames.filter(function(K) {
                  return K !== "$meta";
                })) : P.objectStore("$meta").put(L._cfg.version, "version"));
              });
            }), function L() {
              return $.length ? it.resolve($.shift()(I.idbtrans)).then(L) : it.resolve();
            }().then(function() {
              lu(N, C);
            })) : it.resolve();
            var S, R, I, C, $, N;
          }).catch(v)) : (c(p).forEach(function(U) {
            Cs(l, U, p[U].primKey, p[U].indexes);
          }), Wo(i, l), void it.follow(function() {
            return i.on.populate.fire(w);
          }).catch(v));
          var k, _;
        });
      }
      function Kd(i, a) {
        lu(i._dbSchema, a), a.db.version % 10 != 0 || a.objectStoreNames.contains("$meta") || a.db.createObjectStore("$meta").add(Math.ceil(a.db.version / 10 - 1), "version");
        var l = Xo(0, i.idbdb, a);
        Qo(i, i._dbSchema, a);
        for (var d = 0, p = Ns(l, i._dbSchema).change; d < p.length; d++) {
          var w = function(v) {
            if (v.change.length || v.recreate) return console.warn("Unable to patch indexes of table ".concat(v.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var x = a.objectStore(v.name);
            v.add.forEach(function(k) {
              Ge && console.debug("Dexie upgrade patch: Creating missing index ".concat(v.name, ".").concat(k.src)), Zo(x, k);
            });
          }(p[d]);
          if (typeof w == "object") return w.value;
        }
      }
      function Ns(i, a) {
        var l, d = { del: [], add: [], change: [] };
        for (l in i) a[l] || d.del.push(l);
        for (l in a) {
          var p = i[l], w = a[l];
          if (p) {
            var v = { name: l, def: w, recreate: !1, del: [], add: [], change: [] };
            if ("" + (p.primKey.keyPath || "") != "" + (w.primKey.keyPath || "") || p.primKey.auto !== w.primKey.auto) v.recreate = !0, d.change.push(v);
            else {
              var x = p.idxByName, k = w.idxByName, _ = void 0;
              for (_ in x) k[_] || v.del.push(_);
              for (_ in k) {
                var U = x[_], S = k[_];
                U ? U.src !== S.src && v.change.push(S) : v.add.push(S);
              }
              (0 < v.del.length || 0 < v.add.length || 0 < v.change.length) && d.change.push(v);
            }
          } else d.add.push([l, w]);
        }
        return d;
      }
      function Cs(i, a, l, d) {
        var p = i.db.createObjectStore(a, l.keyPath ? { keyPath: l.keyPath, autoIncrement: l.auto } : { autoIncrement: l.auto });
        return d.forEach(function(w) {
          return Zo(p, w);
        }), p;
      }
      function lu(i, a) {
        c(i).forEach(function(l) {
          a.db.objectStoreNames.contains(l) || (Ge && console.debug("Dexie: Creating missing table", l), Cs(a, l, i[l].primKey, i[l].indexes));
        });
      }
      function Zo(i, a) {
        i.createIndex(a.name, a.keyPath, { unique: a.unique, multiEntry: a.multi });
      }
      function Xo(i, a, l) {
        var d = {};
        return O(a.objectStoreNames, 0).forEach(function(p) {
          for (var w = l.objectStore(p), v = Ts(uu(_ = w.keyPath), _ || "", !0, !1, !!w.autoIncrement, _ && typeof _ != "string", !0), x = [], k = 0; k < w.indexNames.length; ++k) {
            var U = w.index(w.indexNames[k]), _ = U.keyPath, U = Ts(U.name, _, !!U.unique, !!U.multiEntry, !1, _ && typeof _ != "string", !1);
            x.push(U);
          }
          d[p] = Is(p, v, x);
        }), d;
      }
      function Qo(i, a, l) {
        for (var d = l.db.objectStoreNames, p = 0; p < d.length; ++p) {
          var w = d[p], v = l.objectStore(w);
          i._hasGetAll = "getAll" in v;
          for (var x = 0; x < v.indexNames.length; ++x) {
            var k = v.indexNames[x], _ = v.index(k).keyPath, U = typeof _ == "string" ? _ : "[" + O(_).join("+") + "]";
            !a[w] || (_ = a[w].idxByName[U]) && (_.name = k, delete a[w].idxByName[U], a[w].idxByName[k] = _);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && s.WorkerGlobalScope && s instanceof s.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (i._hasGetAll = !1);
      }
      function du(i) {
        return i.split(",").map(function(a, l) {
          var d = (a = a.trim()).replace(/([&*]|\+\+)/g, ""), p = /^\[/.test(d) ? d.match(/^\[(.*)\]$/)[1].split("+") : d;
          return Ts(d, p || null, /\&/.test(a), /\*/.test(a), /\+\+/.test(a), u(p), l === 0);
        });
      }
      var Dd = (Jo.prototype._parseStoresSpec = function(i, a) {
        c(i).forEach(function(l) {
          if (i[l] !== null) {
            var d = du(i[l]), p = d.shift();
            if (p.unique = !0, p.multi) throw new at.Schema("Primary key cannot be multi-valued");
            d.forEach(function(w) {
              if (w.auto) throw new at.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!w.keyPath) throw new at.Schema("Index must have a name and cannot be an empty string");
            }), a[l] = Is(l, p, d);
          }
        });
      }, Jo.prototype.stores = function(l) {
        var a = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? f(this._cfg.storesSource, l) : l;
        var l = a._versions, d = {}, p = {};
        return l.forEach(function(w) {
          f(d, w._cfg.storesSource), p = w._cfg.dbschema = {}, w._parseStoresSpec(d, p);
        }), a._dbSchema = p, _s(a, [a._allTables, a, a.Transaction.prototype]), Yo(a, [a._allTables, a, a.Transaction.prototype, this._cfg.tables], c(p), p), a._storeNames = c(p), this;
      }, Jo.prototype.upgrade = function(i) {
        return this._cfg.contentUpgrade = ls(this._cfg.contentUpgrade || pt, i), this;
      }, Jo);
      function Jo() {
      }
      function Us(i, a) {
        var l = i._dbNamesDB;
        return l || (l = i._dbNamesDB = new on(Vo, { addons: [], indexedDB: i, IDBKeyRange: a })).version(1).stores({ dbnames: "name" }), l.table("dbnames");
      }
      function $s(i) {
        return i && typeof i.databases == "function";
      }
      function Rs(i) {
        return mn(function() {
          return ut.letThrough = !0, i();
        });
      }
      function Os(i) {
        return !("from" in i);
      }
      var de = function(i, a) {
        if (!this) {
          var l = new de();
          return i && "d" in i && f(l, i), l;
        }
        f(this, arguments.length ? { d: 1, from: i, to: 1 < arguments.length ? a : i } : { d: 0 });
      };
      function Yr(i, a, l) {
        var d = At(a, l);
        if (!isNaN(d)) {
          if (0 < d) throw RangeError();
          if (Os(i)) return f(i, { from: a, to: l, d: 1 });
          var p = i.l, d = i.r;
          if (At(l, i.from) < 0) return p ? Yr(p, a, l) : i.l = { from: a, to: l, d: 1, l: null, r: null }, pu(i);
          if (0 < At(a, i.to)) return d ? Yr(d, a, l) : i.r = { from: a, to: l, d: 1, l: null, r: null }, pu(i);
          At(a, i.from) < 0 && (i.from = a, i.l = null, i.d = d ? d.d + 1 : 1), 0 < At(l, i.to) && (i.to = l, i.r = null, i.d = i.l ? i.l.d + 1 : 1), l = !i.r, p && !i.l && Zr(i, p), d && l && Zr(i, d);
        }
      }
      function Zr(i, a) {
        Os(a) || function l(d, k) {
          var w = k.from, v = k.to, x = k.l, k = k.r;
          Yr(d, w, v), x && l(d, x), k && l(d, k);
        }(i, a);
      }
      function hu(i, a) {
        var l = ti(a), d = l.next();
        if (d.done) return !1;
        for (var p = d.value, w = ti(i), v = w.next(p.from), x = v.value; !d.done && !v.done; ) {
          if (At(x.from, p.to) <= 0 && 0 <= At(x.to, p.from)) return !0;
          At(p.from, x.from) < 0 ? p = (d = l.next(x.from)).value : x = (v = w.next(p.from)).value;
        }
        return !1;
      }
      function ti(i) {
        var a = Os(i) ? null : { s: 0, n: i };
        return { next: function(l) {
          for (var d = 0 < arguments.length; a; ) switch (a.s) {
            case 0:
              if (a.s = 1, d) for (; a.n.l && At(l, a.n.from) < 0; ) a = { up: a, n: a.n.l, s: 1 };
              else for (; a.n.l; ) a = { up: a, n: a.n.l, s: 1 };
            case 1:
              if (a.s = 2, !d || At(l, a.n.to) <= 0) return { value: a.n, done: !1 };
            case 2:
              if (a.n.r) {
                a.s = 3, a = { up: a, n: a.n.r, s: 0 };
                continue;
              }
            case 3:
              a = a.up;
          }
          return { done: !0 };
        } };
      }
      function pu(i) {
        var a, l, d = (((a = i.r) === null || a === void 0 ? void 0 : a.d) || 0) - (((l = i.l) === null || l === void 0 ? void 0 : l.d) || 0), p = 1 < d ? "r" : d < -1 ? "l" : "";
        p && (a = p == "r" ? "l" : "r", l = r({}, i), d = i[p], i.from = d.from, i.to = d.to, i[p] = d[p], l[p] = d[a], (i[a] = l).d = gu(l)), i.d = gu(i);
      }
      function gu(l) {
        var a = l.r, l = l.l;
        return (a ? l ? Math.max(a.d, l.d) : a.d : l ? l.d : 0) + 1;
      }
      function ei(i, a) {
        return c(a).forEach(function(l) {
          i[l] ? Zr(i[l], a[l]) : i[l] = function d(p) {
            var w, v, x = {};
            for (w in p) g(p, w) && (v = p[w], x[w] = !v || typeof v != "object" || H.has(v.constructor) ? v : d(v));
            return x;
          }(a[l]);
        }), i;
      }
      function Ls(i, a) {
        return i.all || a.all || Object.keys(i).some(function(l) {
          return a[l] && hu(a[l], i[l]);
        });
      }
      m(de.prototype, (($e = { add: function(i) {
        return Zr(this, i), this;
      }, addKey: function(i) {
        return Yr(this, i, i), this;
      }, addKeys: function(i) {
        var a = this;
        return i.forEach(function(l) {
          return Yr(a, l, l);
        }), this;
      }, hasKey: function(i) {
        var a = ti(this).next(i).value;
        return a && At(a.from, i) <= 0 && 0 <= At(a.to, i);
      } })[q] = function() {
        return ti(this);
      }, $e));
      var qn = {}, Ps = {}, Ks = !1;
      function ni(i) {
        ei(Ps, i), Ks || (Ks = !0, setTimeout(function() {
          Ks = !1, Ds(Ps, !(Ps = {}));
        }, 0));
      }
      function Ds(i, a) {
        a === void 0 && (a = !1);
        var l = /* @__PURE__ */ new Set();
        if (i.all) for (var d = 0, p = Object.values(qn); d < p.length; d++) yu(v = p[d], i, l, a);
        else for (var w in i) {
          var v, x = /^idb\:\/\/(.*)\/(.*)\//.exec(w);
          x && (w = x[1], x = x[2], (v = qn["idb://".concat(w, "/").concat(x)]) && yu(v, i, l, a));
        }
        l.forEach(function(k) {
          return k();
        });
      }
      function yu(i, a, l, d) {
        for (var p = [], w = 0, v = Object.entries(i.queries.query); w < v.length; w++) {
          for (var x = v[w], k = x[0], _ = [], U = 0, S = x[1]; U < S.length; U++) {
            var R = S[U];
            Ls(a, R.obsSet) ? R.subscribers.forEach(function(N) {
              return l.add(N);
            }) : d && _.push(R);
          }
          d && p.push([k, _]);
        }
        if (d) for (var I = 0, C = p; I < C.length; I++) {
          var $ = C[I], k = $[0], _ = $[1];
          i.queries.query[k] = _;
        }
      }
      function Md(i) {
        var a = i._state, l = i._deps.indexedDB;
        if (a.isBeingOpened || i.idbdb) return a.dbReadyPromise.then(function() {
          return a.dbOpenError ? Ft(a.dbOpenError) : i;
        });
        a.isBeingOpened = !0, a.dbOpenError = null, a.openComplete = !1;
        var d = a.openCanceller, p = Math.round(10 * i.verno), w = !1;
        function v() {
          if (a.openCanceller !== d) throw new at.DatabaseClosed("db.open() was cancelled");
        }
        function x() {
          return new it(function(R, I) {
            if (v(), !l) throw new at.MissingAPI();
            var C = i.name, $ = a.autoSchema || !p ? l.open(C) : l.open(C, p);
            if (!$) throw new at.MissingAPI();
            $.onerror = We(I), $.onblocked = Rt(i._fireOnBlocked), $.onupgradeneeded = Rt(function(N) {
              var L;
              U = $.transaction, a.autoSchema && !i._options.allowEmptyDB ? ($.onerror = jr, U.abort(), $.result.close(), (L = l.deleteDatabase(C)).onsuccess = L.onerror = Rt(function() {
                I(new at.NoSuchDatabase("Database ".concat(C, " doesnt exist")));
              })) : (U.onerror = We(I), N = N.oldVersion > Math.pow(2, 62) ? 0 : N.oldVersion, S = N < 1, i.idbdb = $.result, w && Kd(i, U), Pd(i, N / 10, U, I));
            }, I), $.onsuccess = Rt(function() {
              U = null;
              var N, L, P, K, F, Z = i.idbdb = $.result, et = O(Z.objectStoreNames);
              if (0 < et.length) try {
                var X = Z.transaction((K = et).length === 1 ? K[0] : K, "readonly");
                if (a.autoSchema) L = Z, P = X, (N = i).verno = L.version / 10, P = N._dbSchema = Xo(0, L, P), N._storeNames = O(L.objectStoreNames, 0), Yo(N, [N._allTables], c(P), P);
                else if (Qo(i, i._dbSchema, X), ((F = Ns(Xo(0, (F = i).idbdb, X), F._dbSchema)).add.length || F.change.some(function(J) {
                  return J.add.length || J.change.length;
                })) && !w) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), Z.close(), p = Z.version + 1, w = !0, R(x());
                Wo(i, X);
              } catch {
              }
              ar.push(i), Z.onversionchange = Rt(function(J) {
                a.vcFired = !0, i.on("versionchange").fire(J);
              }), Z.onclose = Rt(function(J) {
                i.on("close").fire(J);
              }), S && (F = i._deps, X = C, Z = F.indexedDB, F = F.IDBKeyRange, $s(Z) || X === Vo || Us(Z, F).put({ name: X }).catch(pt)), R();
            }, I);
          }).catch(function(R) {
            switch (R == null ? void 0 : R.name) {
              case "UnknownError":
                if (0 < a.PR1398_maxLoop) return a.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), x();
                break;
              case "VersionError":
                if (0 < p) return p = 0, x();
            }
            return it.reject(R);
          });
        }
        var k, _ = a.dbReadyResolve, U = null, S = !1;
        return it.race([d, (typeof navigator > "u" ? it.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(R) {
          function I() {
            return indexedDB.databases().finally(R);
          }
          k = setInterval(I, 100), I();
        }).finally(function() {
          return clearInterval(k);
        }) : Promise.resolve()).then(x)]).then(function() {
          return v(), a.onReadyBeingFired = [], it.resolve(Rs(function() {
            return i.on.ready.fire(i.vip);
          })).then(function R() {
            if (0 < a.onReadyBeingFired.length) {
              var I = a.onReadyBeingFired.reduce(ls, pt);
              return a.onReadyBeingFired = [], it.resolve(Rs(function() {
                return I(i.vip);
              })).then(R);
            }
          });
        }).finally(function() {
          a.openCanceller === d && (a.onReadyBeingFired = null, a.isBeingOpened = !1);
        }).catch(function(R) {
          a.dbOpenError = R;
          try {
            U && U.abort();
          } catch {
          }
          return d === a.openCanceller && i._close(), Ft(R);
        }).finally(function() {
          a.openComplete = !0, _();
        }).then(function() {
          var R;
          return S && (R = {}, i.tables.forEach(function(I) {
            I.schema.indexes.forEach(function(C) {
              C.name && (R["idb://".concat(i.name, "/").concat(I.name, "/").concat(C.name)] = new de(-1 / 0, [[[]]]));
            }), R["idb://".concat(i.name, "/").concat(I.name, "/")] = R["idb://".concat(i.name, "/").concat(I.name, "/:dels")] = new de(-1 / 0, [[[]]]);
          }), xn(zr).fire(R), Ds(R, !0)), i;
        });
      }
      function Ms(i) {
        function a(w) {
          return i.next(w);
        }
        var l = p(a), d = p(function(w) {
          return i.throw(w);
        });
        function p(w) {
          return function(k) {
            var x = w(k), k = x.value;
            return x.done ? k : k && typeof k.then == "function" ? k.then(l, d) : u(k) ? Promise.all(k).then(l, d) : l(k);
          };
        }
        return p(a)();
      }
      function ri(i, a, l) {
        for (var d = u(i) ? i.slice() : [i], p = 0; p < l; ++p) d.push(a);
        return d;
      }
      var Fd = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var l = i.table(a), d = l.schema, p = {}, w = [];
          function v(S, R, I) {
            var C = Wr(S), $ = p[C] = p[C] || [], N = S == null ? 0 : typeof S == "string" ? 1 : S.length, L = 0 < R, L = r(r({}, I), { name: L ? "".concat(C, "(virtual-from:").concat(I.name, ")") : I.name, lowLevelIndex: I, isVirtual: L, keyTail: R, keyLength: N, extractKey: Bs(S), unique: !L && I.unique });
            return $.push(L), L.isPrimaryKey || w.push(L), 1 < N && v(N === 2 ? S[0] : S.slice(0, N - 1), R + 1, I), $.sort(function(P, K) {
              return P.keyTail - K.keyTail;
            }), L;
          }
          a = v(d.primaryKey.keyPath, 0, d.primaryKey), p[":id"] = [a];
          for (var x = 0, k = d.indexes; x < k.length; x++) {
            var _ = k[x];
            v(_.keyPath, 0, _);
          }
          function U(S) {
            var R, I = S.query.index;
            return I.isVirtual ? r(r({}, S), { query: { index: I.lowLevelIndex, range: (R = S.query.range, I = I.keyTail, { type: R.type === 1 ? 2 : R.type, lower: ri(R.lower, R.lowerOpen ? i.MAX_KEY : i.MIN_KEY, I), lowerOpen: !0, upper: ri(R.upper, R.upperOpen ? i.MIN_KEY : i.MAX_KEY, I), upperOpen: !0 }) } }) : S;
          }
          return r(r({}, l), { schema: r(r({}, d), { primaryKey: a, indexes: w, getIndexByKeyPath: function(S) {
            return (S = p[Wr(S)]) && S[0];
          } }), count: function(S) {
            return l.count(U(S));
          }, query: function(S) {
            return l.query(U(S));
          }, openCursor: function(S) {
            var R = S.query.index, I = R.keyTail, C = R.isVirtual, $ = R.keyLength;
            return C ? l.openCursor(U(S)).then(function(L) {
              return L && N(L);
            }) : l.openCursor(S);
            function N(L) {
              return Object.create(L, { continue: { value: function(P) {
                P != null ? L.continue(ri(P, S.reverse ? i.MAX_KEY : i.MIN_KEY, I)) : S.unique ? L.continue(L.key.slice(0, $).concat(S.reverse ? i.MIN_KEY : i.MAX_KEY, I)) : L.continue();
              } }, continuePrimaryKey: { value: function(P, K) {
                L.continuePrimaryKey(ri(P, i.MAX_KEY, I), K);
              } }, primaryKey: { get: function() {
                return L.primaryKey;
              } }, key: { get: function() {
                var P = L.key;
                return $ === 1 ? P[0] : P.slice(0, $);
              } }, value: { get: function() {
                return L.value;
              } } });
            }
          } });
        } });
      } };
      function Fs(i, a, l, d) {
        return l = l || {}, d = d || "", c(i).forEach(function(p) {
          var w, v, x;
          g(a, p) ? (w = i[p], v = a[p], typeof w == "object" && typeof v == "object" && w && v ? (x = V(w)) !== V(v) ? l[d + p] = a[p] : x === "Object" ? Fs(w, v, l, d + p + ".") : w !== v && (l[d + p] = a[p]) : w !== v && (l[d + p] = a[p])) : l[d + p] = void 0;
        }), c(a).forEach(function(p) {
          g(i, p) || (l[d + p] = a[p]);
        }), l;
      }
      function Hs(i, a) {
        return a.type === "delete" ? a.keys : a.keys || a.values.map(i.extractKey);
      }
      var Hd = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var l = i.table(a), d = l.schema.primaryKey;
          return r(r({}, l), { mutate: function(p) {
            var w = ut.trans, v = w.table(a).hook, x = v.deleting, k = v.creating, _ = v.updating;
            switch (p.type) {
              case "add":
                if (k.fire === pt) break;
                return w._promise("readwrite", function() {
                  return U(p);
                }, !0);
              case "put":
                if (k.fire === pt && _.fire === pt) break;
                return w._promise("readwrite", function() {
                  return U(p);
                }, !0);
              case "delete":
                if (x.fire === pt) break;
                return w._promise("readwrite", function() {
                  return U(p);
                }, !0);
              case "deleteRange":
                if (x.fire === pt) break;
                return w._promise("readwrite", function() {
                  return function S(R, I, C) {
                    return l.query({ trans: R, values: !1, query: { index: d, range: I }, limit: C }).then(function($) {
                      var N = $.result;
                      return U({ type: "delete", keys: N, trans: R }).then(function(L) {
                        return 0 < L.numFailures ? Promise.reject(L.failures[0]) : N.length < C ? { failures: [], numFailures: 0, lastResult: void 0 } : S(R, r(r({}, I), { lower: N[N.length - 1], lowerOpen: !0 }), C);
                      });
                    });
                  }(p.trans, p.range, 1e4);
                }, !0);
            }
            return l.mutate(p);
            function U(S) {
              var R, I, C, $ = ut.trans, N = S.keys || Hs(d, S);
              if (!N) throw new Error("Keys missing");
              return (S = S.type === "add" || S.type === "put" ? r(r({}, S), { keys: N }) : r({}, S)).type !== "delete" && (S.values = o([], S.values)), S.keys && (S.keys = o([], S.keys)), R = l, C = N, ((I = S).type === "add" ? Promise.resolve([]) : R.getMany({ trans: I.trans, keys: C, cache: "immutable" })).then(function(L) {
                var P = N.map(function(K, F) {
                  var Z, et, X, J = L[F], ot = { onerror: null, onsuccess: null };
                  return S.type === "delete" ? x.fire.call(ot, K, J, $) : S.type === "add" || J === void 0 ? (Z = k.fire.call(ot, K, S.values[F], $), K == null && Z != null && (S.keys[F] = K = Z, d.outbound || z(S.values[F], d.keyPath, K))) : (Z = Fs(J, S.values[F]), (et = _.fire.call(ot, Z, K, J, $)) && (X = S.values[F], Object.keys(et).forEach(function(tt) {
                    g(X, tt) ? X[tt] = et[tt] : z(X, tt, et[tt]);
                  }))), ot;
                });
                return l.mutate(S).then(function(K) {
                  for (var F = K.failures, Z = K.results, et = K.numFailures, K = K.lastResult, X = 0; X < N.length; ++X) {
                    var J = (Z || N)[X], ot = P[X];
                    J == null ? ot.onerror && ot.onerror(F[X]) : ot.onsuccess && ot.onsuccess(S.type === "put" && L[X] ? S.values[X] : J);
                  }
                  return { failures: F, results: Z, numFailures: et, lastResult: K };
                }).catch(function(K) {
                  return P.forEach(function(F) {
                    return F.onerror && F.onerror(K);
                  }), Promise.reject(K);
                });
              });
            }
          } });
        } });
      } };
      function wu(i, a, l) {
        try {
          if (!a || a.keys.length < i.length) return null;
          for (var d = [], p = 0, w = 0; p < a.keys.length && w < i.length; ++p) At(a.keys[p], i[w]) === 0 && (d.push(l ? xt(a.values[p]) : a.values[p]), ++w);
          return d.length === i.length ? d : null;
        } catch {
          return null;
        }
      }
      var Vd = { stack: "dbcore", level: -1, create: function(i) {
        return { table: function(a) {
          var l = i.table(a);
          return r(r({}, l), { getMany: function(d) {
            if (!d.cache) return l.getMany(d);
            var p = wu(d.keys, d.trans._cache, d.cache === "clone");
            return p ? it.resolve(p) : l.getMany(d).then(function(w) {
              return d.trans._cache = { keys: d.keys, values: d.cache === "clone" ? xt(w) : w }, w;
            });
          }, mutate: function(d) {
            return d.type !== "add" && (d.trans._cache = null), l.mutate(d);
          } });
        } };
      } };
      function mu(i, a) {
        return i.trans.mode === "readonly" && !!i.subscr && !i.trans.explicit && i.trans.db._options.cache !== "disabled" && !a.schema.primaryKey.outbound;
      }
      function bu(i, a) {
        switch (i) {
          case "query":
            return a.values && !a.unique;
          case "get":
          case "getMany":
          case "count":
          case "openCursor":
            return !1;
        }
      }
      var qd = { stack: "dbcore", level: 0, name: "Observability", create: function(i) {
        var a = i.schema.name, l = new de(i.MIN_KEY, i.MAX_KEY);
        return r(r({}, i), { transaction: function(d, p, w) {
          if (ut.subscr && p !== "readonly") throw new at.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(ut.querier));
          return i.transaction(d, p, w);
        }, table: function(d) {
          var p = i.table(d), w = p.schema, v = w.primaryKey, S = w.indexes, x = v.extractKey, k = v.outbound, _ = v.autoIncrement && S.filter(function(I) {
            return I.compound && I.keyPath.includes(v.keyPath);
          }), U = r(r({}, p), { mutate: function(I) {
            function C(tt) {
              return tt = "idb://".concat(a, "/").concat(d, "/").concat(tt), K[tt] || (K[tt] = new de());
            }
            var $, N, L, P = I.trans, K = I.mutatedParts || (I.mutatedParts = {}), F = C(""), Z = C(":dels"), et = I.type, ot = I.type === "deleteRange" ? [I.range] : I.type === "delete" ? [I.keys] : I.values.length < 50 ? [Hs(v, I).filter(function(tt) {
              return tt;
            }), I.values] : [], X = ot[0], J = ot[1], ot = I.trans._cache;
            return u(X) ? (F.addKeys(X), (ot = et === "delete" || X.length === J.length ? wu(X, ot) : null) || Z.addKeys(X), (ot || J) && ($ = C, N = ot, L = J, w.indexes.forEach(function(tt) {
              var ct = $(tt.name || "");
              function yt(Et) {
                return Et != null ? tt.extractKey(Et) : null;
              }
              function vt(Et) {
                return tt.multiEntry && u(Et) ? Et.forEach(function(Ce) {
                  return ct.addKey(Ce);
                }) : ct.addKey(Et);
              }
              (N || L).forEach(function(Et, he) {
                var gt = N && yt(N[he]), he = L && yt(L[he]);
                At(gt, he) !== 0 && (gt != null && vt(gt), he != null && vt(he));
              });
            }))) : X ? (J = { from: (J = X.lower) !== null && J !== void 0 ? J : i.MIN_KEY, to: (J = X.upper) !== null && J !== void 0 ? J : i.MAX_KEY }, Z.add(J), F.add(J)) : (F.add(l), Z.add(l), w.indexes.forEach(function(tt) {
              return C(tt.name).add(l);
            })), p.mutate(I).then(function(tt) {
              return !X || I.type !== "add" && I.type !== "put" || (F.addKeys(tt.results), _ && _.forEach(function(ct) {
                for (var yt = I.values.map(function(gt) {
                  return ct.extractKey(gt);
                }), vt = ct.keyPath.findIndex(function(gt) {
                  return gt === v.keyPath;
                }), Et = 0, Ce = tt.results.length; Et < Ce; ++Et) yt[Et][vt] = tt.results[Et];
                C(ct.name).addKeys(yt);
              })), P.mutatedParts = ei(P.mutatedParts || {}, K), tt;
            });
          } }), S = function(C) {
            var $ = C.query, C = $.index, $ = $.range;
            return [C, new de((C = $.lower) !== null && C !== void 0 ? C : i.MIN_KEY, ($ = $.upper) !== null && $ !== void 0 ? $ : i.MAX_KEY)];
          }, R = { get: function(I) {
            return [v, new de(I.key)];
          }, getMany: function(I) {
            return [v, new de().addKeys(I.keys)];
          }, count: S, query: S, openCursor: S };
          return c(R).forEach(function(I) {
            U[I] = function(C) {
              var $ = ut.subscr, N = !!$, L = mu(ut, p) && bu(I, C) ? C.obsSet = {} : $;
              if (N) {
                var P = function(J) {
                  return J = "idb://".concat(a, "/").concat(d, "/").concat(J), L[J] || (L[J] = new de());
                }, K = P(""), F = P(":dels"), $ = R[I](C), N = $[0], $ = $[1];
                if ((I === "query" && N.isPrimaryKey && !C.values ? F : P(N.name || "")).add($), !N.isPrimaryKey) {
                  if (I !== "count") {
                    var Z = I === "query" && k && C.values && p.query(r(r({}, C), { values: !1 }));
                    return p[I].apply(this, arguments).then(function(J) {
                      if (I === "query") {
                        if (k && C.values) return Z.then(function(yt) {
                          return yt = yt.result, K.addKeys(yt), J;
                        });
                        var ot = C.values ? J.result.map(x) : J.result;
                        (C.values ? K : F).addKeys(ot);
                      } else if (I === "openCursor") {
                        var tt = J, ct = C.values;
                        return tt && Object.create(tt, { key: { get: function() {
                          return F.addKey(tt.primaryKey), tt.key;
                        } }, primaryKey: { get: function() {
                          var yt = tt.primaryKey;
                          return F.addKey(yt), yt;
                        } }, value: { get: function() {
                          return ct && K.addKey(tt.primaryKey), tt.value;
                        } } });
                      }
                      return J;
                    });
                  }
                  F.add(l);
                }
              }
              return p[I].apply(this, arguments);
            };
          }), U;
        } });
      } };
      function vu(i, a, l) {
        if (l.numFailures === 0) return a;
        if (a.type === "deleteRange") return null;
        var d = a.keys ? a.keys.length : "values" in a && a.values ? a.values.length : 1;
        return l.numFailures === d ? null : (a = r({}, a), u(a.keys) && (a.keys = a.keys.filter(function(p, w) {
          return !(w in l.failures);
        })), "values" in a && u(a.values) && (a.values = a.values.filter(function(p, w) {
          return !(w in l.failures);
        })), a);
      }
      function Vs(i, a) {
        return l = i, ((d = a).lower === void 0 || (d.lowerOpen ? 0 < At(l, d.lower) : 0 <= At(l, d.lower))) && (i = i, (a = a).upper === void 0 || (a.upperOpen ? At(i, a.upper) < 0 : At(i, a.upper) <= 0));
        var l, d;
      }
      function Eu(i, a, R, d, p, w) {
        if (!R || R.length === 0) return i;
        var v = a.query.index, x = v.multiEntry, k = a.query.range, _ = d.schema.primaryKey.extractKey, U = v.extractKey, S = (v.lowLevelIndex || v).extractKey, R = R.reduce(function(I, C) {
          var $ = I, N = [];
          if (C.type === "add" || C.type === "put") for (var L = new de(), P = C.values.length - 1; 0 <= P; --P) {
            var K, F = C.values[P], Z = _(F);
            L.hasKey(Z) || (K = U(F), (x && u(K) ? K.some(function(tt) {
              return Vs(tt, k);
            }) : Vs(K, k)) && (L.addKey(Z), N.push(F)));
          }
          switch (C.type) {
            case "add":
              var et = new de().addKeys(a.values ? I.map(function(ct) {
                return _(ct);
              }) : I), $ = I.concat(a.values ? N.filter(function(ct) {
                return ct = _(ct), !et.hasKey(ct) && (et.addKey(ct), !0);
              }) : N.map(function(ct) {
                return _(ct);
              }).filter(function(ct) {
                return !et.hasKey(ct) && (et.addKey(ct), !0);
              }));
              break;
            case "put":
              var X = new de().addKeys(C.values.map(function(ct) {
                return _(ct);
              }));
              $ = I.filter(function(ct) {
                return !X.hasKey(a.values ? _(ct) : ct);
              }).concat(a.values ? N : N.map(function(ct) {
                return _(ct);
              }));
              break;
            case "delete":
              var J = new de().addKeys(C.keys);
              $ = I.filter(function(ct) {
                return !J.hasKey(a.values ? _(ct) : ct);
              });
              break;
            case "deleteRange":
              var ot = C.range;
              $ = I.filter(function(ct) {
                return !Vs(_(ct), ot);
              });
          }
          return $;
        }, i);
        return R === i ? i : (R.sort(function(I, C) {
          return At(S(I), S(C)) || At(_(I), _(C));
        }), a.limit && a.limit < 1 / 0 && (R.length > a.limit ? R.length = a.limit : i.length === a.limit && R.length < a.limit && (p.dirty = !0)), w ? Object.freeze(R) : R);
      }
      function xu(i, a) {
        return At(i.lower, a.lower) === 0 && At(i.upper, a.upper) === 0 && !!i.lowerOpen == !!a.lowerOpen && !!i.upperOpen == !!a.upperOpen;
      }
      function jd(i, a) {
        return function(l, d, p, w) {
          if (l === void 0) return d !== void 0 ? -1 : 0;
          if (d === void 0) return 1;
          if ((d = At(l, d)) === 0) {
            if (p && w) return 0;
            if (p) return 1;
            if (w) return -1;
          }
          return d;
        }(i.lower, a.lower, i.lowerOpen, a.lowerOpen) <= 0 && 0 <= function(l, d, p, w) {
          if (l === void 0) return d !== void 0 ? 1 : 0;
          if (d === void 0) return -1;
          if ((d = At(l, d)) === 0) {
            if (p && w) return 0;
            if (p) return -1;
            if (w) return 1;
          }
          return d;
        }(i.upper, a.upper, i.upperOpen, a.upperOpen);
      }
      function zd(i, a, l, d) {
        i.subscribers.add(l), d.addEventListener("abort", function() {
          var p, w;
          i.subscribers.delete(l), i.subscribers.size === 0 && (p = i, w = a, setTimeout(function() {
            p.subscribers.size === 0 && st(w, p);
          }, 3e3));
        });
      }
      var Gd = { stack: "dbcore", level: 0, name: "Cache", create: function(i) {
        var a = i.schema.name;
        return r(r({}, i), { transaction: function(l, d, p) {
          var w, v, x = i.transaction(l, d, p);
          return d === "readwrite" && (v = (w = new AbortController()).signal, p = function(k) {
            return function() {
              if (w.abort(), d === "readwrite") {
                for (var _ = /* @__PURE__ */ new Set(), U = 0, S = l; U < S.length; U++) {
                  var R = S[U], I = qn["idb://".concat(a, "/").concat(R)];
                  if (I) {
                    var C = i.table(R), $ = I.optimisticOps.filter(function(ct) {
                      return ct.trans === x;
                    });
                    if (x._explicit && k && x.mutatedParts) for (var N = 0, L = Object.values(I.queries.query); N < L.length; N++) for (var P = 0, K = (et = L[N]).slice(); P < K.length; P++) Ls((X = K[P]).obsSet, x.mutatedParts) && (st(et, X), X.subscribers.forEach(function(ct) {
                      return _.add(ct);
                    }));
                    else if (0 < $.length) {
                      I.optimisticOps = I.optimisticOps.filter(function(ct) {
                        return ct.trans !== x;
                      });
                      for (var F = 0, Z = Object.values(I.queries.query); F < Z.length; F++) for (var et, X, J, ot = 0, tt = (et = Z[F]).slice(); ot < tt.length; ot++) (X = tt[ot]).res != null && x.mutatedParts && (k && !X.dirty ? (J = Object.isFrozen(X.res), J = Eu(X.res, X.req, $, C, X, J), X.dirty ? (st(et, X), X.subscribers.forEach(function(ct) {
                        return _.add(ct);
                      })) : J !== X.res && (X.res = J, X.promise = it.resolve({ result: J }))) : (X.dirty && st(et, X), X.subscribers.forEach(function(ct) {
                        return _.add(ct);
                      })));
                    }
                  }
                }
                _.forEach(function(ct) {
                  return ct();
                });
              }
            };
          }, x.addEventListener("abort", p(!1), { signal: v }), x.addEventListener("error", p(!1), { signal: v }), x.addEventListener("complete", p(!0), { signal: v })), x;
        }, table: function(l) {
          var d = i.table(l), p = d.schema.primaryKey;
          return r(r({}, d), { mutate: function(w) {
            var v = ut.trans;
            if (p.outbound || v.db._options.cache === "disabled" || v.explicit || v.idbtrans.mode !== "readwrite") return d.mutate(w);
            var x = qn["idb://".concat(a, "/").concat(l)];
            return x ? (v = d.mutate(w), w.type !== "add" && w.type !== "put" || !(50 <= w.values.length || Hs(p, w).some(function(k) {
              return k == null;
            })) ? (x.optimisticOps.push(w), w.mutatedParts && ni(w.mutatedParts), v.then(function(k) {
              0 < k.numFailures && (st(x.optimisticOps, w), (k = vu(0, w, k)) && x.optimisticOps.push(k), w.mutatedParts && ni(w.mutatedParts));
            }), v.catch(function() {
              st(x.optimisticOps, w), w.mutatedParts && ni(w.mutatedParts);
            })) : v.then(function(k) {
              var _ = vu(0, r(r({}, w), { values: w.values.map(function(U, S) {
                var R;
                return k.failures[S] ? U : (U = (R = p.keyPath) !== null && R !== void 0 && R.includes(".") ? xt(U) : r({}, U), z(U, p.keyPath, k.results[S]), U);
              }) }), k);
              x.optimisticOps.push(_), queueMicrotask(function() {
                return w.mutatedParts && ni(w.mutatedParts);
              });
            }), v) : d.mutate(w);
          }, query: function(w) {
            if (!mu(ut, d) || !bu("query", w)) return d.query(w);
            var v = ((_ = ut.trans) === null || _ === void 0 ? void 0 : _.db._options.cache) === "immutable", S = ut, x = S.requery, k = S.signal, _ = function(C, $, N, L) {
              var P = qn["idb://".concat(C, "/").concat($)];
              if (!P) return [];
              if (!($ = P.queries[N])) return [null, !1, P, null];
              var K = $[(L.query ? L.query.index.name : null) || ""];
              if (!K) return [null, !1, P, null];
              switch (N) {
                case "query":
                  var F = K.find(function(Z) {
                    return Z.req.limit === L.limit && Z.req.values === L.values && xu(Z.req.query.range, L.query.range);
                  });
                  return F ? [F, !0, P, K] : [K.find(function(Z) {
                    return ("limit" in Z.req ? Z.req.limit : 1 / 0) >= L.limit && (!L.values || Z.req.values) && jd(Z.req.query.range, L.query.range);
                  }), !1, P, K];
                case "count":
                  return F = K.find(function(Z) {
                    return xu(Z.req.query.range, L.query.range);
                  }), [F, !!F, P, K];
              }
            }(a, l, "query", w), U = _[0], S = _[1], R = _[2], I = _[3];
            return U && S ? U.obsSet = w.obsSet : (S = d.query(w).then(function(C) {
              var $ = C.result;
              if (U && (U.res = $), v) {
                for (var N = 0, L = $.length; N < L; ++N) Object.freeze($[N]);
                Object.freeze($);
              } else C.result = xt($);
              return C;
            }).catch(function(C) {
              return I && U && st(I, U), Promise.reject(C);
            }), U = { obsSet: w.obsSet, promise: S, subscribers: /* @__PURE__ */ new Set(), type: "query", req: w, dirty: !1 }, I ? I.push(U) : (I = [U], (R = R || (qn["idb://".concat(a, "/").concat(l)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[w.query.index.name || ""] = I)), zd(U, I, x, k), U.promise.then(function(C) {
              return { result: Eu(C.result, w, R == null ? void 0 : R.optimisticOps, d, U, v) };
            });
          } });
        } });
      } };
      function oi(i, a) {
        return new Proxy(i, { get: function(l, d, p) {
          return d === "db" ? a : Reflect.get(l, d, p);
        } });
      }
      var on = (Ht.prototype.version = function(i) {
        if (isNaN(i) || i < 0.1) throw new at.Type("Given version is not a positive number");
        if (i = Math.round(10 * i) / 10, this.idbdb || this._state.isBeingOpened) throw new at.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, i);
        var a = this._versions, l = a.filter(function(d) {
          return d._cfg.version === i;
        })[0];
        return l || (l = new this.Version(i), a.push(l), a.sort(Ld), l.stores({}), this._state.autoSchema = !1, l);
      }, Ht.prototype._whenReady = function(i) {
        var a = this;
        return this.idbdb && (this._state.openComplete || ut.letThrough || this._vip) ? i() : new it(function(l, d) {
          if (a._state.openComplete) return d(new at.DatabaseClosed(a._state.dbOpenError));
          if (!a._state.isBeingOpened) {
            if (!a._state.autoOpen) return void d(new at.DatabaseClosed());
            a.open().catch(pt);
          }
          a._state.dbReadyPromise.then(l, d);
        }).then(i);
      }, Ht.prototype.use = function(i) {
        var a = i.stack, l = i.create, d = i.level, p = i.name;
        return p && this.unuse({ stack: a, name: p }), i = this._middlewares[a] || (this._middlewares[a] = []), i.push({ stack: a, create: l, level: d ?? 10, name: p }), i.sort(function(w, v) {
          return w.level - v.level;
        }), this;
      }, Ht.prototype.unuse = function(i) {
        var a = i.stack, l = i.name, d = i.create;
        return a && this._middlewares[a] && (this._middlewares[a] = this._middlewares[a].filter(function(p) {
          return d ? p.create !== d : !!l && p.name !== l;
        })), this;
      }, Ht.prototype.open = function() {
        var i = this;
        return Fn(wn, function() {
          return Md(i);
        });
      }, Ht.prototype._close = function() {
        var i = this._state, a = ar.indexOf(this);
        if (0 <= a && ar.splice(a, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        i.isBeingOpened || (i.dbReadyPromise = new it(function(l) {
          i.dbReadyResolve = l;
        }), i.openCanceller = new it(function(l, d) {
          i.cancelOpen = d;
        }));
      }, Ht.prototype.close = function(l) {
        var a = (l === void 0 ? { disableAutoOpen: !0 } : l).disableAutoOpen, l = this._state;
        a ? (l.isBeingOpened && l.cancelOpen(new at.DatabaseClosed()), this._close(), l.autoOpen = !1, l.dbOpenError = new at.DatabaseClosed()) : (this._close(), l.autoOpen = this._options.autoOpen || l.isBeingOpened, l.openComplete = !1, l.dbOpenError = null);
      }, Ht.prototype.delete = function(i) {
        var a = this;
        i === void 0 && (i = { disableAutoOpen: !0 });
        var l = 0 < arguments.length && typeof arguments[0] != "object", d = this._state;
        return new it(function(p, w) {
          function v() {
            a.close(i);
            var x = a._deps.indexedDB.deleteDatabase(a.name);
            x.onsuccess = Rt(function() {
              var k, _, U;
              k = a._deps, _ = a.name, U = k.indexedDB, k = k.IDBKeyRange, $s(U) || _ === Vo || Us(U, k).delete(_).catch(pt), p();
            }), x.onerror = We(w), x.onblocked = a._fireOnBlocked;
          }
          if (l) throw new at.InvalidArgument("Invalid closeOptions argument to db.delete()");
          d.isBeingOpened ? d.dbReadyPromise.then(v) : v();
        });
      }, Ht.prototype.backendDB = function() {
        return this.idbdb;
      }, Ht.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, Ht.prototype.hasBeenClosed = function() {
        var i = this._state.dbOpenError;
        return i && i.name === "DatabaseClosed";
      }, Ht.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, Ht.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(Ht.prototype, "tables", { get: function() {
        var i = this;
        return c(this._allTables).map(function(a) {
          return i._allTables[a];
        });
      }, enumerable: !1, configurable: !0 }), Ht.prototype.transaction = function() {
        var i = (function(a, l, d) {
          var p = arguments.length;
          if (p < 2) throw new at.InvalidArgument("Too few arguments");
          for (var w = new Array(p - 1); --p; ) w[p - 1] = arguments[p];
          return d = w.pop(), [a, wt(w), d];
        }).apply(this, arguments);
        return this._transaction.apply(this, i);
      }, Ht.prototype._transaction = function(i, a, l) {
        var d = this, p = ut.trans;
        p && p.db === this && i.indexOf("!") === -1 || (p = null);
        var w, v, x = i.indexOf("?") !== -1;
        i = i.replace("!", "").replace("?", "");
        try {
          if (v = a.map(function(_) {
            if (_ = _ instanceof d.Table ? _.name : _, typeof _ != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return _;
          }), i == "r" || i === vs) w = vs;
          else {
            if (i != "rw" && i != Es) throw new at.InvalidArgument("Invalid transaction mode: " + i);
            w = Es;
          }
          if (p) {
            if (p.mode === vs && w === Es) {
              if (!x) throw new at.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              p = null;
            }
            p && v.forEach(function(_) {
              if (p && p.storeNames.indexOf(_) === -1) {
                if (!x) throw new at.SubTransaction("Table " + _ + " not included in parent transaction.");
                p = null;
              }
            }), x && p && !p.active && (p = null);
          }
        } catch (_) {
          return p ? p._promise(null, function(U, S) {
            S(_);
          }) : Ft(_);
        }
        var k = (function _(U, S, R, I, C) {
          return it.resolve().then(function() {
            var $ = ut.transless || ut, N = U._createTransaction(S, R, U._dbSchema, I);
            if (N.explicit = !0, $ = { trans: N, transless: $ }, I) N.idbtrans = I.idbtrans;
            else try {
              N.create(), N.idbtrans._explicit = !0, U._state.PR1398_maxLoop = 3;
            } catch (K) {
              return K.name === Ke.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                return _(U, S, R, null, C);
              })) : Ft(K);
            }
            var L, P = St(C);
            return P && sr(), $ = it.follow(function() {
              var K;
              (L = C.call(N, N)) && (P ? (K = bn.bind(null, null), L.then(K, K)) : typeof L.next == "function" && typeof L.throw == "function" && (L = Ms(L)));
            }, $), (L && typeof L.then == "function" ? it.resolve(L).then(function(K) {
              return N.active ? K : Ft(new at.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : $.then(function() {
              return L;
            })).then(function(K) {
              return I && N._resolve(), N._completion.then(function() {
                return K;
              });
            }).catch(function(K) {
              return N._reject(K), Ft(K);
            });
          });
        }).bind(null, this, w, v, p, l);
        return p ? p._promise(w, k, "lock") : ut.trans ? Fn(ut.transless, function() {
          return d._whenReady(k);
        }) : this._whenReady(k);
      }, Ht.prototype.table = function(i) {
        if (!g(this._allTables, i)) throw new at.InvalidTable("Table ".concat(i, " does not exist"));
        return this._allTables[i];
      }, Ht);
      function Ht(i, a) {
        var l = this;
        this._middlewares = {}, this.verno = 0;
        var d = Ht.dependencies;
        this._options = a = r({ addons: Ht.addons, autoOpen: !0, indexedDB: d.indexedDB, IDBKeyRange: d.IDBKeyRange, cache: "cloned" }, a), this._deps = { indexedDB: a.indexedDB, IDBKeyRange: a.IDBKeyRange }, d = a.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var p, w, v, x, k, _ = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: pt, dbReadyPromise: null, cancelOpen: pt, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: a.autoOpen };
        _.dbReadyPromise = new it(function(S) {
          _.dbReadyResolve = S;
        }), _.openCanceller = new it(function(S, R) {
          _.cancelOpen = R;
        }), this._state = _, this.name = i, this.on = Hr(this, "populate", "blocked", "versionchange", "close", { ready: [ls, pt] }), this.on.ready.subscribe = D(this.on.ready.subscribe, function(S) {
          return function(R, I) {
            Ht.vip(function() {
              var C, $ = l._state;
              $.openComplete ? ($.dbOpenError || it.resolve().then(R), I && S(R)) : $.onReadyBeingFired ? ($.onReadyBeingFired.push(R), I && S(R)) : (S(R), C = l, I || S(function N() {
                C.on.ready.unsubscribe(R), C.on.ready.unsubscribe(N);
              }));
            });
          };
        }), this.Collection = (p = this, Vr(_d.prototype, function(L, N) {
          this.db = p;
          var I = Jc, C = null;
          if (N) try {
            I = N();
          } catch (P) {
            C = P;
          }
          var $ = L._ctx, N = $.table, L = N.hook.reading.fire;
          this._ctx = { table: N, index: $.index, isPrimKey: !$.index || N.schema.primKey.keyPath && $.index === N.schema.primKey.name, range: I, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: C, or: $.or, valueMapper: L !== ce ? L : null };
        })), this.Table = (w = this, Vr(ru.prototype, function(S, R, I) {
          this.db = w, this._tx = I, this.name = S, this.schema = R, this.hook = w._allTables[S] ? w._allTables[S].hook : Hr(null, { creating: [vd, pt], reading: [_e, ce], updating: [xd, pt], deleting: [Ed, pt] });
        })), this.Transaction = (v = this, Vr(Ud.prototype, function(S, R, I, C, $) {
          var N = this;
          this.db = v, this.mode = S, this.storeNames = R, this.schema = I, this.chromeTransactionDurability = C, this.idbtrans = null, this.on = Hr(this, "complete", "error", "abort"), this.parent = $ || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new it(function(L, P) {
            N._resolve = L, N._reject = P;
          }), this._completion.then(function() {
            N.active = !1, N.on.complete.fire();
          }, function(L) {
            var P = N.active;
            return N.active = !1, N.on.error.fire(L), N.parent ? N.parent._reject(L) : P && N.idbtrans && N.idbtrans.abort(), Ft(L);
          });
        })), this.Version = (x = this, Vr(Dd.prototype, function(S) {
          this.db = x, this._cfg = { version: S, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (k = this, Vr(cu.prototype, function(S, R, I) {
          if (this.db = k, this._ctx = { table: S, index: R === ":id" ? null : R, or: I }, this._cmp = this._ascending = At, this._descending = function(C, $) {
            return At($, C);
          }, this._max = function(C, $) {
            return 0 < At(C, $) ? C : $;
          }, this._min = function(C, $) {
            return At(C, $) < 0 ? C : $;
          }, this._IDBKeyRange = k._deps.IDBKeyRange, !this._IDBKeyRange) throw new at.MissingAPI();
        })), this.on("versionchange", function(S) {
          0 < S.newVersion ? console.warn("Another connection wants to upgrade database '".concat(l.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(l.name, "'. Closing db now to resume the delete request.")), l.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(S) {
          !S.newVersion || S.newVersion < S.oldVersion ? console.warn("Dexie.delete('".concat(l.name, "') was blocked")) : console.warn("Upgrade '".concat(l.name, "' blocked by other connection holding version ").concat(S.oldVersion / 10));
        }), this._maxKey = Gr(a.IDBKeyRange), this._createTransaction = function(S, R, I, C) {
          return new l.Transaction(S, R, I, l._options.chromeTransactionDurability, C);
        }, this._fireOnBlocked = function(S) {
          l.on("blocked").fire(S), ar.filter(function(R) {
            return R.name === l.name && R !== l && !R._state.vcFired;
          }).map(function(R) {
            return R.on("versionchange").fire(S);
          });
        }, this.use(Vd), this.use(Gd), this.use(qd), this.use(Fd), this.use(Hd);
        var U = new Proxy(this, { get: function(S, R, I) {
          if (R === "_vip") return !0;
          if (R === "table") return function($) {
            return oi(l.table($), U);
          };
          var C = Reflect.get(S, R, I);
          return C instanceof ru ? oi(C, U) : R === "tables" ? C.map(function($) {
            return oi($, U);
          }) : R === "_createTransaction" ? function() {
            return oi(C.apply(this, arguments), U);
          } : C;
        } });
        this.vip = U, d.forEach(function(S) {
          return S(l);
        });
      }
      var ii, $e = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", Wd = (qs.prototype.subscribe = function(i, a, l) {
        return this._subscribe(i && typeof i != "function" ? i : { next: i, error: a, complete: l });
      }, qs.prototype[$e] = function() {
        return this;
      }, qs);
      function qs(i) {
        this._subscribe = i;
      }
      try {
        ii = { indexedDB: s.indexedDB || s.mozIndexedDB || s.webkitIndexedDB || s.msIndexedDB, IDBKeyRange: s.IDBKeyRange || s.webkitIDBKeyRange };
      } catch {
        ii = { indexedDB: null, IDBKeyRange: null };
      }
      function Su(i) {
        var a, l = !1, d = new Wd(function(p) {
          var w = St(i), v, x = !1, k = {}, _ = {}, U = { get closed() {
            return x;
          }, unsubscribe: function() {
            x || (x = !0, v && v.abort(), S && xn.storagemutated.unsubscribe(I));
          } };
          p.start && p.start(U);
          var S = !1, R = function() {
            return bs(C);
          }, I = function($) {
            ei(k, $), Ls(_, k) && R();
          }, C = function() {
            var $, N, L;
            !x && ii.indexedDB && (k = {}, $ = {}, v && v.abort(), v = new AbortController(), L = function(P) {
              var K = or();
              try {
                w && sr();
                var F = mn(i, P);
                return F = w ? F.finally(bn) : F;
              } finally {
                K && ir();
              }
            }(N = { subscr: $, signal: v.signal, requery: R, querier: i, trans: null }), Promise.resolve(L).then(function(P) {
              l = !0, a = P, x || N.signal.aborted || (k = {}, function(K) {
                for (var F in K) if (g(K, F)) return;
                return 1;
              }(_ = $) || S || (xn(zr, I), S = !0), bs(function() {
                return !x && p.next && p.next(P);
              }));
            }, function(P) {
              l = !1, ["DatabaseClosedError", "AbortError"].includes(P == null ? void 0 : P.name) || x || bs(function() {
                x || p.error && p.error(P);
              });
            }));
          };
          return setTimeout(R, 0), U;
        });
        return d.hasValue = function() {
          return l;
        }, d.getValue = function() {
          return a;
        }, d;
      }
      var jn = on;
      function js(i) {
        var a = Sn;
        try {
          Sn = !0, xn.storagemutated.fire(i), Ds(i, !0);
        } finally {
          Sn = a;
        }
      }
      m(jn, r(r({}, le), { delete: function(i) {
        return new jn(i, { addons: [] }).delete();
      }, exists: function(i) {
        return new jn(i, { addons: [] }).open().then(function(a) {
          return a.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(i) {
        try {
          return a = jn.dependencies, l = a.indexedDB, a = a.IDBKeyRange, ($s(l) ? Promise.resolve(l.databases()).then(function(d) {
            return d.map(function(p) {
              return p.name;
            }).filter(function(p) {
              return p !== Vo;
            });
          }) : Us(l, a).toCollection().primaryKeys()).then(i);
        } catch {
          return Ft(new at.MissingAPI());
        }
        var a, l;
      }, defineClass: function() {
        return function(i) {
          f(this, i);
        };
      }, ignoreTransaction: function(i) {
        return ut.trans ? Fn(ut.transless, i) : i();
      }, vip: Rs, async: function(i) {
        return function() {
          try {
            var a = Ms(i.apply(this, arguments));
            return a && typeof a.then == "function" ? a : it.resolve(a);
          } catch (l) {
            return Ft(l);
          }
        };
      }, spawn: function(i, a, l) {
        try {
          var d = Ms(i.apply(l, a || []));
          return d && typeof d.then == "function" ? d : it.resolve(d);
        } catch (p) {
          return Ft(p);
        }
      }, currentTransaction: { get: function() {
        return ut.trans || null;
      } }, waitFor: function(i, a) {
        return a = it.resolve(typeof i == "function" ? jn.ignoreTransaction(i) : i).timeout(a || 6e4), ut.trans ? ut.trans.waitFor(a) : a;
      }, Promise: it, debug: { get: function() {
        return Ge;
      }, set: function(i) {
        zc(i);
      } }, derive: T, extend: f, props: m, override: D, Events: Hr, on: xn, liveQuery: Su, extendObservabilitySet: ei, getByKeyPath: W, setByKeyPath: z, delByKeyPath: function(i, a) {
        typeof a == "string" ? z(i, a, void 0) : "length" in a && [].map.call(a, function(l) {
          z(i, l, void 0);
        });
      }, shallowClone: nt, deepClone: xt, getObjectDiff: Fs, cmp: At, asap: G, minKey: -1 / 0, addons: [], connections: ar, errnames: Ke, dependencies: ii, cache: qn, semVer: "4.0.11", version: "4.0.11".split(".").map(function(i) {
        return parseInt(i);
      }).reduce(function(i, a, l) {
        return i + a / Math.pow(10, 2 * l);
      }) })), jn.maxKey = Gr(jn.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (xn(zr, function(i) {
        Sn || (i = new CustomEvent(ks, { detail: i }), Sn = !0, dispatchEvent(i), Sn = !1);
      }), addEventListener(ks, function(i) {
        i = i.detail, Sn || js(i);
      }));
      var fr, Sn = !1, Au = function() {
      };
      return typeof BroadcastChannel < "u" && ((Au = function() {
        (fr = new BroadcastChannel(ks)).onmessage = function(i) {
          return i.data && js(i.data);
        };
      })(), typeof fr.unref == "function" && fr.unref(), xn(zr, function(i) {
        Sn || fr.postMessage(i);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(i) {
        if (!on.disableBfCache && i.persisted) {
          Ge && console.debug("Dexie: handling persisted pagehide"), fr != null && fr.close();
          for (var a = 0, l = ar; a < l.length; a++) l[a].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(i) {
        !on.disableBfCache && i.persisted && (Ge && console.debug("Dexie: handling persisted pageshow"), Au(), js({ all: new de(-1 / 0, [[]]) }));
      })), it.rejectionMapper = function(i, a) {
        return !i || i instanceof It || i instanceof TypeError || i instanceof SyntaxError || !i.name || !ze[i.name] ? i : (a = new ze[i.name](a || i.message, i), "stack" in i && A(a, "stack", { get: function() {
          return this.inner.stack;
        } }), a);
      }, zc(Ge), r(on, Object.freeze({ __proto__: null, Dexie: on, liveQuery: Su, Entity: tu, cmp: At, PropModification: qr, replacePrefix: function(i, a) {
        return new qr({ replacePrefix: [i, a] });
      }, add: function(i) {
        return new qr({ add: i });
      }, remove: function(i) {
        return new qr({ remove: i });
      }, default: on, RangeSet: de, mergeRanges: Zr, rangesOverlap: hu }), { default: on }), on;
    });
  }(Si)), Si.exports;
}
var aw = sw();
const Xa = /* @__PURE__ */ Ng(aw), Kf = Symbol.for("Dexie"), Wi = globalThis[Kf] || (globalThis[Kf] = Xa);
if (Xa.semVer !== Wi.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Xa.semVer} and ${Wi.semVer}`);
const {
  liveQuery: yw,
  mergeRanges: ww,
  rangesOverlap: mw,
  RangeSet: bw,
  cmp: vw,
  Entity: Ew,
  PropModification: xw,
  replacePrefix: Sw,
  add: Aw,
  remove: kw
} = Wi, Yn = new Wi("arkade", { allowEmptyDB: !0 });
Yn.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const cw = {
  addOrUpdate: async (t) => {
    await Yn.vtxos.bulkPut(t);
  },
  deleteAll: async () => Yn.vtxos.clear(),
  getSpendableVtxos: async () => Yn.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await Yn.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  close: async () => Yn.close(),
  open: async () => {
    await Yn.open();
  }
}, uw = new ow(cw);
uw.start().catch(console.error);
const jc = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(jc)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== jc)
          return caches.delete(n);
      })
    ))
  ), self.clients.claim();
});
async function fw(t) {
  const e = await caches.open(jc);
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
  t.respondWith(fw(t.request));
});
