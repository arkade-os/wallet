function ga(t) {
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
  ga(t.outputLen), ga(t.blockLen);
}
function vi(t, e = !0) {
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
const fr = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function qs(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function Ye(t, e) {
  return t << 32 - e | t >>> e;
}
function ri(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
typeof Uint8Array.from([]).toHex == "function" && Uint8Array.fromHex;
function Qd(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Za(t) {
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
let Pf = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function Kf(t) {
  const e = (r) => t().update(Za(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Xa(t = 32) {
  if (fr && typeof fr.getRandomValues == "function")
    return fr.getRandomValues(new Uint8Array(t));
  if (fr && typeof fr.randomBytes == "function")
    return Uint8Array.from(fr.randomBytes(t));
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
let Df = class extends Pf {
  constructor(e, n, r, o) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(e), this.view = qs(this.buffer);
  }
  update(e) {
    vi(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = Za(e);
    const s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const f = qs(e);
        for (; o <= s - c; c += o)
          this.process(f, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    vi(this), Xd(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, this.buffer.subarray(c).fill(0), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let g = c; g < o; g++)
      n[g] = 0;
    th(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = qs(e), f = this.outputLen;
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
let oh = class extends Df {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = An[0] | 0, this.B = An[1] | 0, this.C = An[2] | 0, this.D = An[3] | 0, this.E = An[4] | 0, this.F = An[5] | 0, this.G = An[6] | 0, this.H = An[7] | 0;
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
      const m = kn[g - 15], E = kn[g - 2], A = Ye(m, 7) ^ Ye(m, 18) ^ m >>> 3, I = Ye(E, 17) ^ Ye(E, 19) ^ E >>> 10;
      kn[g] = I + kn[g - 7] + A + kn[g - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: f, G: h, H: y } = this;
    for (let g = 0; g < 64; g++) {
      const m = Ye(u, 6) ^ Ye(u, 11) ^ Ye(u, 25), E = y + m + eh(u, f, h) + rh[g] + kn[g] | 0, I = (Ye(r, 2) ^ Ye(r, 13) ^ Ye(r, 22)) + nh(r, o, s) | 0;
      y = h, h = f, f = u, u = c + E | 0, c = s, s = o, o = r, r = E + I | 0;
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
const Se = /* @__PURE__ */ Kf(() => new oh());
let Mf = class extends Pf {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Zd(e);
    const r = Za(n);
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
    return vi(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    vi(this), Ae(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
const Hf = (t, e, n) => new Mf(t, e).update(n).digest();
Hf.create = (t, e) => new Mf(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Qa = /* @__PURE__ */ BigInt(0), ya = /* @__PURE__ */ BigInt(1);
function vr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ja(t) {
  if (!vr(t))
    throw new Error("Uint8Array expected");
}
function so(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function oi(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Ff(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Qa : BigInt("0x" + t);
}
const Vf = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), ih = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function ao(t) {
  if (Ja(t), Vf)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += ih[t[n]];
  return e;
}
const sn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Eu(t) {
  if (t >= sn._0 && t <= sn._9)
    return t - sn._0;
  if (t >= sn.A && t <= sn.F)
    return t - (sn.A - 10);
  if (t >= sn.a && t <= sn.f)
    return t - (sn.a - 10);
}
function Ei(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (Vf)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = Eu(t.charCodeAt(s)), u = Eu(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const f = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function ke(t) {
  return Ff(ao(t));
}
function qf(t) {
  return Ja(t), Ff(ao(Uint8Array.from(t).reverse()));
}
function Qe(t, e) {
  return Ei(t.toString(16).padStart(e * 2, "0"));
}
function jf(t, e) {
  return Qe(t, e).reverse();
}
function ye(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Ei(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (vr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function tr(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Ja(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function co(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const js = (t) => typeof t == "bigint" && Qa <= t;
function uo(t, e, n) {
  return js(t) && js(e) && js(n) && e <= t && t < n;
}
function Pe(t, e, n, r) {
  if (!uo(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function sh(t) {
  let e;
  for (e = 0; t > Qa; t >>= ya, e += 1)
    ;
  return e;
}
const zi = (t) => (ya << BigInt(t)) - ya, zs = (t) => new Uint8Array(t), xu = (t) => Uint8Array.from(t);
function ah(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = zs(t), o = zs(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...g) => n(o, r, ...g), f = (g = zs(0)) => {
    o = u(xu([0]), g), r = u(), g.length !== 0 && (o = u(xu([1]), g), r = u());
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
    return tr(...m);
  };
  return (g, m) => {
    c(), f(g);
    let E;
    for (; !(E = m(h())); )
      f();
    return c(), E;
  };
}
const ch = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || vr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Gi(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = ch[s];
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
function Su(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const oe = BigInt(0), Vt = BigInt(1), Yn = /* @__PURE__ */ BigInt(2), uh = /* @__PURE__ */ BigInt(3), wa = /* @__PURE__ */ BigInt(4), Au = /* @__PURE__ */ BigInt(5), ku = /* @__PURE__ */ BigInt(8);
function re(t, e) {
  const n = t % e;
  return n >= oe ? n : e + n;
}
function fh(t, e, n) {
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
function ma(t, e) {
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
function lh(t) {
  const e = (t - Vt) / Yn;
  let n, r, o;
  for (n = t - Vt, r = 0; n % Yn === oe; n /= Yn, r++)
    ;
  for (o = Yn; o < t && fh(o, e, t) !== t - Vt; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const c = (t + Vt) / wa;
    return function(f, h) {
      const y = f.pow(h, c);
      if (!f.eql(f.sqr(y), h))
        throw new Error("Cannot find square root");
      return y;
    };
  }
  const s = (n + Vt) / Yn;
  return function(u, f) {
    if (u.pow(f, e) === u.neg(u.ONE))
      throw new Error("Cannot find square root");
    let h = r, y = u.pow(u.mul(u.ONE, o), n), g = u.pow(f, s), m = u.pow(f, n);
    for (; !u.eql(m, u.ONE); ) {
      if (u.eql(m, u.ZERO))
        return u.ZERO;
      let E = 1;
      for (let I = u.sqr(m); E < h && !u.eql(I, u.ONE); E++)
        I = u.sqr(I);
      const A = u.pow(y, Vt << BigInt(h - E - 1));
      y = u.sqr(A), g = u.mul(g, A), m = u.mul(m, y), h = E;
    }
    return g;
  };
}
function dh(t) {
  if (t % wa === uh) {
    const e = (t + Vt) / wa;
    return function(r, o) {
      const s = r.pow(o, e);
      if (!r.eql(r.sqr(s), o))
        throw new Error("Cannot find square root");
      return s;
    };
  }
  if (t % ku === Au) {
    const e = (t - Au) / ku;
    return function(r, o) {
      const s = r.mul(o, Yn), c = r.pow(s, e), u = r.mul(o, c), f = r.mul(r.mul(u, Yn), c), h = r.mul(u, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(h), o))
        throw new Error("Cannot find square root");
      return h;
    };
  }
  return lh(t);
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
function ph(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = hh.reduce((r, o) => (r[o] = "function", r), e);
  return Gi(t, n);
}
function gh(t, e, n) {
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
function yh(t, e) {
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
    MASK: zi(o),
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
    pow: (f, h) => gh(u, f, h),
    div: (f, h) => re(f * ma(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, h) => f + h,
    subN: (f, h) => f - h,
    mulN: (f, h) => f * h,
    inv: (f) => ma(f, t),
    sqrt: r.sqrt || ((f) => (c || (c = dh(t)), c(u, f))),
    invertBatch: (f) => yh(u, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, h, y) => y ? h : f,
    toBytes: (f) => n ? jf(f, s) : Qe(f, s),
    fromBytes: (f) => {
      if (f.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + f.length);
      return n ? qf(f) : ke(f);
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
function wh(t, e, n = !1) {
  const r = t.length, o = Wf(e), s = Yf(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? qf(t) : ke(t), u = re(c, e - Vt) + Vt;
  return n ? jf(u, o) : Qe(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Tu = BigInt(0), ba = BigInt(1);
function Gs(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Zf(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Ws(t, e) {
  Zf(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), o = 2 ** t, s = zi(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: c };
}
function Iu(t, e, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: c } = n;
  let u = Number(t & o), f = t >> c;
  u > r && (u -= s, f += ba);
  const h = e * r, y = h + Math.abs(u) - 1, g = u === 0, m = u < 0, E = e % 2 !== 0;
  return { nextN: f, offset: y, isZero: g, isNeg: m, isNegF: E, offsetF: h };
}
function mh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function bh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Ys = /* @__PURE__ */ new WeakMap(), Xf = /* @__PURE__ */ new WeakMap();
function Zs(t) {
  return Xf.get(t) || 1;
}
function vh(t, e) {
  return {
    constTimeNegate: Gs,
    hasPrecomputes(n) {
      return Zs(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > Tu; )
        r & ba && (o = o.add(s)), s = s.double(), r >>= ba;
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
      const { windows: o, windowSize: s } = Ws(r, e), c = [];
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
      let s = t.ZERO, c = t.BASE;
      const u = Ws(n, e);
      for (let f = 0; f < u.windows; f++) {
        const { nextN: h, offset: y, isZero: g, isNeg: m, isNegF: E, offsetF: A } = Iu(o, f, u);
        o = h, g ? c = c.add(Gs(E, r[A])) : s = s.add(Gs(m, r[y]));
      }
      return { p: s, f: c };
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
      const c = Ws(n, e);
      for (let u = 0; u < c.windows && o !== Tu; u++) {
        const { nextN: f, offset: h, isZero: y, isNeg: g } = Iu(o, u, c);
        if (o = f, !y) {
          const m = r[h];
          s = s.add(g ? m.negate() : m);
        }
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = Ys.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && Ys.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = Zs(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = Zs(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Zf(r, e), Xf.set(n, r), Ys.delete(n);
    }
  };
}
function Eh(t, e, n, r) {
  if (mh(n, t), bh(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, s = sh(BigInt(n.length)), c = s > 12 ? s - 3 : s > 4 ? s - 2 : s ? 2 : 1, u = zi(c), f = new Array(Number(u) + 1).fill(o), h = Math.floor((e.BITS - 1) / c) * c;
  let y = o;
  for (let g = h; g >= 0; g -= c) {
    f.fill(o);
    for (let E = 0; E < r.length; E++) {
      const A = r[E], I = Number(A >> BigInt(g) & u);
      f[I] = f[I].add(n[E]);
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
  return ph(t.Fp), Gi(t, {
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
function Bu(t) {
  t.lowS !== void 0 && so("lowS", t.lowS), t.prehash !== void 0 && so("prehash", t.prehash);
}
function xh(t) {
  const e = Qf(t);
  Gi(e, {
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
class Sh extends Error {
  constructor(e = "") {
    super(e);
  }
}
const un = {
  // asn.1 DER encoding utils
  Err: Sh,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = un;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = oi(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? oi(o.length / 2 | 128) : "";
      return oi(t) + s + o + e;
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
      let n = oi(t);
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
      return ke(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = un, o = ye("signature", t), { v: s, l: c } = r.decode(48, o);
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
const _u = BigInt(3);
BigInt(4);
function Ah(t) {
  const e = xh(t), { Fp: n } = e, r = Gf(e.n, e.nBitLength), o = e.toBytes || ((I, b, B) => {
    const O = b.toAffine();
    return tr(Uint8Array.from([4]), n.toBytes(O.x), n.toBytes(O.y));
  }), s = e.fromBytes || ((I) => {
    const b = I.subarray(1), B = n.fromBytes(b.subarray(0, n.BYTES)), O = n.fromBytes(b.subarray(n.BYTES, 2 * n.BYTES));
    return { x: B, y: O };
  });
  function c(I) {
    const { a: b, b: B } = e, O = n.sqr(I), D = n.mul(O, I);
    return n.add(n.add(D, n.mul(I, b)), B);
  }
  if (!n.eql(n.sqr(e.Gy), c(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function u(I) {
    return uo(I, ee, e.n);
  }
  function f(I) {
    const { allowedPrivateKeyLengths: b, nByteLength: B, wrapPrivateKey: O, n: D } = e;
    if (b && typeof I != "bigint") {
      if (vr(I) && (I = ao(I)), typeof I != "string" || !b.includes(I.length))
        throw new Error("invalid private key");
      I = I.padStart(B * 2, "0");
    }
    let j;
    try {
      j = typeof I == "bigint" ? I : ke(ye("private key", I, B));
    } catch {
      throw new Error("invalid private key, expected hex or " + B + " bytes, got " + typeof I);
    }
    return O && (j = re(j, D)), Pe("private key", j, ee, D), j;
  }
  function h(I) {
    if (!(I instanceof m))
      throw new Error("ProjectivePoint expected");
  }
  const y = Su((I, b) => {
    const { px: B, py: O, pz: D } = I;
    if (n.eql(D, n.ONE))
      return { x: B, y: O };
    const j = I.is0();
    b == null && (b = j ? n.ONE : n.inv(D));
    const G = n.mul(B, b), W = n.mul(O, b), z = n.mul(D, b);
    if (j)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: G, y: W };
  }), g = Su((I) => {
    if (I.is0()) {
      if (e.allowInfinityPoint && !n.is0(I.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: B } = I.toAffine();
    if (!n.isValid(b) || !n.isValid(B))
      throw new Error("bad point: x or y not FE");
    const O = n.sqr(B), D = c(b);
    if (!n.eql(O, D))
      throw new Error("bad point: equation left != right");
    if (!I.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class m {
    constructor(b, B, O) {
      if (b == null || !n.isValid(b))
        throw new Error("x required");
      if (B == null || !n.isValid(B))
        throw new Error("y required");
      if (O == null || !n.isValid(O))
        throw new Error("z required");
      this.px = b, this.py = B, this.pz = O, Object.freeze(this);
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
      return Eh(m, r, b, B);
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
      const { a: b, b: B } = e, O = n.mul(B, _u), { px: D, py: j, pz: G } = this;
      let W = n.ZERO, z = n.ZERO, nt = n.ZERO, Q = n.mul(D, D), wt = n.mul(j, j), V = n.mul(G, G), Y = n.mul(D, j);
      return Y = n.add(Y, Y), nt = n.mul(D, G), nt = n.add(nt, nt), W = n.mul(b, nt), z = n.mul(O, V), z = n.add(W, z), W = n.sub(wt, z), z = n.add(wt, z), z = n.mul(W, z), W = n.mul(Y, W), nt = n.mul(O, nt), V = n.mul(b, V), Y = n.sub(Q, V), Y = n.mul(b, Y), Y = n.add(Y, nt), nt = n.add(Q, Q), Q = n.add(nt, Q), Q = n.add(Q, V), Q = n.mul(Q, Y), z = n.add(z, Q), V = n.mul(j, G), V = n.add(V, V), Q = n.mul(V, Y), W = n.sub(W, Q), nt = n.mul(V, wt), nt = n.add(nt, nt), nt = n.add(nt, nt), new m(W, z, nt);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b;
      let z = n.ZERO, nt = n.ZERO, Q = n.ZERO;
      const wt = e.a, V = n.mul(e.b, _u);
      let Y = n.mul(B, j), xt = n.mul(O, G), M = n.mul(D, W), F = n.add(B, O), q = n.add(j, G);
      F = n.mul(F, q), q = n.add(Y, xt), F = n.sub(F, q), q = n.add(B, D);
      let rt = n.add(j, W);
      return q = n.mul(q, rt), rt = n.add(Y, M), q = n.sub(q, rt), rt = n.add(O, D), z = n.add(G, W), rt = n.mul(rt, z), z = n.add(xt, M), rt = n.sub(rt, z), Q = n.mul(wt, q), z = n.mul(V, M), Q = n.add(z, Q), z = n.sub(xt, Q), Q = n.add(xt, Q), nt = n.mul(z, Q), xt = n.add(Y, Y), xt = n.add(xt, Y), M = n.mul(wt, M), q = n.mul(V, q), xt = n.add(xt, M), M = n.sub(Y, M), M = n.mul(wt, M), q = n.add(q, M), Y = n.mul(xt, q), nt = n.add(nt, Y), Y = n.mul(rt, q), z = n.mul(F, z), z = n.sub(z, Y), Y = n.mul(F, xt), Q = n.mul(rt, Q), Q = n.add(Q, Y), new m(z, nt, Q);
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
      Pe("scalar", b, dn, O);
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
      Pe("scalar", b, ee, O);
      let D, j;
      if (B) {
        const { k1neg: G, k1: W, k2neg: z, k2: nt } = B.splitScalar(b);
        let { p: Q, f: wt } = this.wNAF(W), { p: V, f: Y } = this.wNAF(nt);
        Q = A.constTimeNegate(G, Q), V = A.constTimeNegate(z, V), V = new m(n.mul(V.px, B.beta), V.py, V.pz), D = Q.add(V), j = wt.add(Y);
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
      return so("isCompressed", b), this.assertValidity(), o(m, this, b);
    }
    toHex(b = !0) {
      return so("isCompressed", b), ao(this.toRawBytes(b));
    }
  }
  m.BASE = new m(e.Gx, e.Gy, n.ONE), m.ZERO = new m(n.ZERO, n.ONE, n.ZERO);
  const E = e.nBitLength, A = vh(m, e.endo ? Math.ceil(E / 2) : E);
  return {
    CURVE: e,
    ProjectivePoint: m,
    normPrivateKeyToScalar: f,
    weierstrassEquation: c,
    isWithinCurveOrder: u
  };
}
function kh(t) {
  const e = Qf(t);
  return Gi(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Th(t) {
  const e = kh(t), { Fp: n, n: r } = e, o = n.BYTES + 1, s = 2 * n.BYTES + 1;
  function c(M) {
    return re(M, r);
  }
  function u(M) {
    return ma(M, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: h, weierstrassEquation: y, isWithinCurveOrder: g } = Ah({
    ...e,
    toBytes(M, F, q) {
      const rt = F.toAffine(), st = n.toBytes(rt.x), lt = tr;
      return so("isCompressed", q), q ? lt(Uint8Array.from([F.hasEvenY() ? 2 : 3]), st) : lt(Uint8Array.from([4]), st, n.toBytes(rt.y));
    },
    fromBytes(M) {
      const F = M.length, q = M[0], rt = M.subarray(1);
      if (F === o && (q === 2 || q === 3)) {
        const st = ke(rt);
        if (!uo(st, ee, n.ORDER))
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
      } else if (F === s && q === 4) {
        const st = n.fromBytes(rt.subarray(0, n.BYTES)), lt = n.fromBytes(rt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: st, y: lt };
      } else {
        const st = o, lt = s;
        throw new Error("invalid Point, expected length of " + st + ", or uncompressed " + lt + ", got " + F);
      }
    }
  }), m = (M) => ao(Qe(M, e.nByteLength));
  function E(M) {
    const F = r >> ee;
    return M > F;
  }
  function A(M) {
    return E(M) ? c(-M) : M;
  }
  const I = (M, F, q) => ke(M.slice(F, q));
  class b {
    constructor(F, q, rt) {
      Pe("r", F, ee, r), Pe("s", q, ee, r), this.r = F, this.s = q, rt != null && (this.recovery = rt), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(F) {
      const q = e.nByteLength;
      return F = ye("compactSignature", F, q * 2), new b(I(F, 0, q), I(F, q, 2 * q));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(F) {
      const { r: q, s: rt } = un.toSig(ye("DER", F));
      return new b(q, rt);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(F) {
      return new b(this.r, this.s, F);
    }
    recoverPublicKey(F) {
      const { r: q, s: rt, recovery: st } = this, lt = W(ye("msgHash", F));
      if (st == null || ![0, 1, 2, 3].includes(st))
        throw new Error("recovery id invalid");
      const mt = st === 2 || st === 3 ? q + e.n : q;
      if (mt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const St = (st & 1) === 0 ? "02" : "03", Dt = f.fromHex(St + m(mt)), It = u(mt), kt = c(-lt * It), Xt = c(rt * It), Rt = f.BASE.multiplyAndAddUnsafe(Dt, kt, Xt);
      if (!Rt)
        throw new Error("point at infinify");
      return Rt.assertValidity(), Rt;
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
      return Ei(this.toDERHex());
    }
    toDERHex() {
      return un.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Ei(this.toCompactHex());
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
      return wh(e.randomBytes(M), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(M = 8, F = f.BASE) {
      return F._setWindowSize(M), F.multiply(BigInt(3)), F;
    }
  };
  function O(M, F = !0) {
    return f.fromPrivateKey(M).toRawBytes(F);
  }
  function D(M) {
    const F = vr(M), q = typeof M == "string", rt = (F || q) && M.length;
    return F ? rt === o || rt === s : q ? rt === 2 * o || rt === 2 * s : M instanceof f;
  }
  function j(M, F, q = !0) {
    if (D(M))
      throw new Error("first arg must be private key");
    if (!D(F))
      throw new Error("second arg must be public key");
    return f.fromHex(F).multiply(h(M)).toRawBytes(q);
  }
  const G = e.bits2int || function(M) {
    if (M.length > 8192)
      throw new Error("input is too large");
    const F = ke(M), q = M.length * 8 - e.nBitLength;
    return q > 0 ? F >> BigInt(q) : F;
  }, W = e.bits2int_modN || function(M) {
    return c(G(M));
  }, z = zi(e.nBitLength);
  function nt(M) {
    return Pe("num < 2^" + e.nBitLength, M, dn, z), Qe(M, e.nByteLength);
  }
  function Q(M, F, q = wt) {
    if (["recovered", "canonical"].some((ae) => ae in q))
      throw new Error("sign() legacy options not supported");
    const { hash: rt, randomBytes: st } = e;
    let { lowS: lt, prehash: mt, extraEntropy: St } = q;
    lt == null && (lt = !0), M = ye("msgHash", M), Bu(q), mt && (M = ye("prehashed msgHash", rt(M)));
    const Dt = W(M), It = h(F), kt = [nt(It), nt(Dt)];
    if (St != null && St !== !1) {
      const ae = St === !0 ? st(n.BYTES) : St;
      kt.push(ye("extraEntropy", ae));
    }
    const Xt = tr(...kt), Rt = Dt;
    function Ke(ae) {
      const at = G(ae);
      if (!g(at))
        return;
      const je = u(at), le = f.BASE.multiply(at).toAffine(), pt = c(le.x);
      if (pt === dn)
        return;
      const ce = c(je * c(Rt + pt * It));
      if (ce === dn)
        return;
      let _e = (le.x === pt ? 0 : 2) | Number(le.y & ee), Mt = ce;
      return lt && E(ce) && (Mt = A(ce), _e ^= 1), new b(pt, Mt, _e);
    }
    return { seed: Xt, k2sig: Ke };
  }
  const wt = { lowS: e.lowS, prehash: !1 }, V = { lowS: e.lowS, prehash: !1 };
  function Y(M, F, q = wt) {
    const { seed: rt, k2sig: st } = Q(M, F, q), lt = e;
    return ah(lt.hash.outputLen, lt.nByteLength, lt.hmac)(rt, st);
  }
  f.BASE._setWindowSize(8);
  function xt(M, F, q, rt = V) {
    var _e;
    const st = M;
    F = ye("msgHash", F), q = ye("publicKey", q);
    const { lowS: lt, prehash: mt, format: St } = rt;
    if (Bu(rt), "strict" in rt)
      throw new Error("options.strict was renamed to lowS");
    if (St !== void 0 && St !== "compact" && St !== "der")
      throw new Error("format must be compact or der");
    const Dt = typeof st == "string" || vr(st), It = !Dt && !St && typeof st == "object" && st !== null && typeof st.r == "bigint" && typeof st.s == "bigint";
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
    mt && (F = e.hash(F));
    const { r: Rt, s: Ke } = kt, ae = W(F), at = u(Ke), je = c(ae * at), le = c(Rt * at), pt = (_e = f.BASE.multiplyAndAddUnsafe(Xt, je, le)) == null ? void 0 : _e.toAffine();
    return pt ? c(pt.x) === Rt : !1;
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
function Ih(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Hf(t, e, Jd(...n)),
    randomBytes: Xa
  };
}
function Bh(t, e) {
  const n = (r) => Th({ ...t, ...Ih(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const xo = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), xi = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), fo = BigInt(1), Si = BigInt(2), Nu = (t, e) => (t + e / Si) / e;
function Jf(t) {
  const e = xo, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), f = BigInt(88), h = t * t * t % e, y = h * h * t % e, g = Re(y, n, e) * y % e, m = Re(g, n, e) * y % e, E = Re(m, Si, e) * h % e, A = Re(E, o, e) * E % e, I = Re(A, s, e) * A % e, b = Re(I, u, e) * I % e, B = Re(b, f, e) * b % e, O = Re(B, u, e) * I % e, D = Re(O, n, e) * y % e, j = Re(D, c, e) * A % e, G = Re(j, r, e) * h % e, W = Re(G, Si, e);
  if (!va.eql(va.sqr(W), t))
    throw new Error("Cannot find square root");
  return W;
}
const va = Gf(xo, void 0, void 0, { sqrt: Jf }), Je = Bh({
  a: BigInt(0),
  b: BigInt(7),
  Fp: va,
  n: xi,
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
      const e = xi, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -fo * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = Nu(s * t, e), f = Nu(-r * t, e);
      let h = re(t - u * n - f * o, e), y = re(-u * r - f * s, e);
      const g = h > c, m = y > c;
      if (g && (h = e - h), m && (y = e - y), h > c || y > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: g, k1: h, k2neg: m, k2: y };
    }
  }
}, Se), tl = BigInt(0), Cu = {};
function Ai(t, ...e) {
  let n = Cu[t];
  if (n === void 0) {
    const r = Se(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = tr(r, r), Cu[t] = n;
  }
  return Se(tr(n, ...e));
}
const tc = (t) => t.toRawBytes(!0).slice(1), Ea = (t) => Qe(t, 32), Xs = (t) => re(t, xo), lo = (t) => re(t, xi), ec = Je.ProjectivePoint, _h = (t, e, n) => ec.BASE.multiplyAndAddUnsafe(t, e, n);
function xa(t) {
  let e = Je.utils.normPrivateKeyToScalar(t), n = ec.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : lo(-e), bytes: tc(n) };
}
function el(t) {
  Pe("x", t, fo, xo);
  const e = Xs(t * t), n = Xs(e * t + BigInt(7));
  let r = Jf(n);
  r % Si !== tl && (r = Xs(-r));
  const o = new ec(t, r, fo);
  return o.assertValidity(), o;
}
const yr = ke;
function nl(...t) {
  return lo(yr(Ai("BIP0340/challenge", ...t)));
}
function Nh(t) {
  return xa(t).bytes;
}
function Ch(t, e, n = Xa(32)) {
  const r = ye("message", t), { bytes: o, scalar: s } = xa(e), c = ye("auxRand", n, 32), u = Ea(s ^ yr(Ai("BIP0340/aux", c))), f = Ai("BIP0340/nonce", u, o, r), h = lo(yr(f));
  if (h === tl)
    throw new Error("sign failed: k is zero");
  const { bytes: y, scalar: g } = xa(h), m = nl(y, o, r), E = new Uint8Array(64);
  if (E.set(y, 0), E.set(Ea(lo(g + m * s)), 32), !rl(E, r, o))
    throw new Error("sign: Invalid signature produced");
  return E;
}
function rl(t, e, n) {
  const r = ye("signature", t, 64), o = ye("message", e), s = ye("publicKey", n, 32);
  try {
    const c = el(yr(s)), u = yr(r.subarray(0, 32));
    if (!uo(u, fo, xo))
      return !1;
    const f = yr(r.subarray(32, 64));
    if (!uo(f, fo, xi))
      return !1;
    const h = nl(Ea(u), tc(c), o), y = _h(c, f, lo(-h));
    return !(!y || !y.hasEvenY() || y.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const tn = {
  getPublicKey: Nh,
  sign: Ch,
  verify: rl,
  utils: {
    randomPrivateKey: Je.utils.randomPrivateKey,
    lift_x: el,
    pointToBytes: tc,
    numberToBytesBE: Qe,
    bytesToNumberBE: ke,
    taggedHash: Ai,
    mod: re
  }
}, Uh = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), ol = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), Rh = /* @__PURE__ */ ol.map((t) => (9 * t + 5) % 16);
let nc = [ol], rc = [Rh];
for (let t = 0; t < 4; t++)
  for (let e of [nc, rc])
    e.push(e[t].map((n) => Uh[n]));
const il = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), $h = /* @__PURE__ */ nc.map((t, e) => t.map((n) => il[e][n])), Oh = /* @__PURE__ */ rc.map((t, e) => t.map((n) => il[e][n])), Lh = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Ph = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Uu(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const ii = /* @__PURE__ */ new Uint32Array(16);
class Kh extends Df {
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
      ii[E] = e.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, c = s, u = this.h2 | 0, f = u, h = this.h3 | 0, y = h, g = this.h4 | 0, m = g;
    for (let E = 0; E < 5; E++) {
      const A = 4 - E, I = Lh[E], b = Ph[E], B = nc[E], O = rc[E], D = $h[E], j = Oh[E];
      for (let G = 0; G < 16; G++) {
        const W = ri(r + Uu(E, s, u, h) + ii[B[G]] + I, D[G]) + g | 0;
        r = g, g = h, h = ri(u, 10) | 0, u = s, s = W;
      }
      for (let G = 0; G < 16; G++) {
        const W = ri(o + Uu(A, c, f, y) + ii[O[G]] + b, j[G]) + m | 0;
        o = m, m = y, y = ri(f, 10) | 0, f = c, c = W;
      }
    }
    this.set(this.h1 + u + y | 0, this.h2 + h + m | 0, this.h3 + g + o | 0, this.h4 + r + c | 0, this.h0 + s + f | 0);
  }
  roundClean() {
    ii.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const Dh = /* @__PURE__ */ Kf(() => new Kh());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Er(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Mh(t, ...e) {
  if (!Er(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function sl(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function oc(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function xr(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function So(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function ki(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function al(t, e) {
  if (!sl(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function ic(t, e) {
  if (!sl(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Wi(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function sc(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  al("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (ki(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (ki(o), o.map((s) => {
      xr("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function ac(t = "") {
  return xr("join", t), {
    encode: (e) => (al("join.decode", e), e.join(t)),
    decode: (e) => (xr("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Hh(t) {
  return oc(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Ru(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (ki(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (So(u), u < 0 || u >= e)
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
const cl = (t, e) => e === 0 ? t : cl(e, t % e), Ti = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - cl(t, e)), pi = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Sa(t, e, n, r) {
  if (ki(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ti(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Ti(e, n)}`);
  let o = 0, s = 0;
  const c = pi[e], u = pi[n] - 1, f = [];
  for (const h of t) {
    if (So(h), h >= c)
      throw new Error(`convertRadix2: invalid data word=${h} from=${e}`);
    if (o = o << e | h, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      f.push((o >> s - n & u) >>> 0);
    const y = pi[s];
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
function Fh(t) {
  So(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Er(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ru(Array.from(n), e, t);
    },
    decode: (n) => (ic("radix.decode", n), Uint8Array.from(Ru(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function ul(t, e = !1) {
  if (So(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ti(8, t) > 32 || /* @__PURE__ */ Ti(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Er(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Sa(Array.from(n), 8, t, !e);
    },
    decode: (n) => (ic("radix2.decode", n), Uint8Array.from(Sa(n, t, 8, e)))
  };
}
function $u(t) {
  return oc(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Vh(t, e) {
  return So(t), oc(e), {
    encode(n) {
      if (!Er(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), o = new Uint8Array(n.length + t);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!Er(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), o = n.slice(-t), s = e(r).slice(0, t);
      for (let c = 0; c < t; c++)
        if (s[c] !== o[c])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const qh = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Wi(/* @__PURE__ */ Fh(58), /* @__PURE__ */ sc(t), /* @__PURE__ */ ac("")), jh = /* @__PURE__ */ qh("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), zh = (t) => /* @__PURE__ */ Wi(Vh(4, (e) => t(t(e))), jh), Aa = /* @__PURE__ */ Wi(/* @__PURE__ */ sc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ ac("")), Ou = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Gr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Ou.length; r++)
    (e >> r & 1) === 1 && (n ^= Ou[r]);
  return n;
}
function Lu(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = Gr(o) ^ c >> 5;
  }
  o = Gr(o);
  for (let s = 0; s < r; s++)
    o = Gr(o) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    o = Gr(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Gr(o);
  return o ^= n, Aa.encode(Sa([o % pi[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function fl(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ ul(5), r = n.decode, o = n.encode, s = $u(r);
  function c(g, m, E = 90) {
    xr("bech32.encode prefix", g), Er(m) && (m = Array.from(m)), ic("bech32.encode", m);
    const A = g.length;
    if (A === 0)
      throw new TypeError(`Invalid prefix length ${A}`);
    const I = A + 7 + m.length;
    if (E !== !1 && I > E)
      throw new TypeError(`Length ${I} exceeds limit ${E}`);
    const b = g.toLowerCase(), B = Lu(b, m, e);
    return `${b}1${Aa.encode(m)}${B}`;
  }
  function u(g, m = 90) {
    xr("bech32.decode input", g);
    const E = g.length;
    if (E < 8 || m !== !1 && E > m)
      throw new TypeError(`invalid string length: ${E} (${g}). Expected (8..${m})`);
    const A = g.toLowerCase();
    if (g !== A && g !== g.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const I = A.lastIndexOf("1");
    if (I === 0 || I === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const b = A.slice(0, I), B = A.slice(I + 1);
    if (B.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const O = Aa.decode(B).slice(0, -6), D = Lu(b, O, e);
    if (!B.endsWith(D))
      throw new Error(`Invalid checksum in ${g}: expected "${D}"`);
    return { prefix: b, words: O };
  }
  const f = $u(u);
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
const ka = /* @__PURE__ */ fl("bech32"), ll = /* @__PURE__ */ fl("bech32m"), Gh = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, Wh = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Yh = {
  encode(t) {
    return Mh(t), t.toHex();
  },
  decode(t) {
    return xr("hex", t), Uint8Array.fromHex(t);
  }
}, _t = Wh ? Yh : /* @__PURE__ */ Wi(/* @__PURE__ */ ul(4), /* @__PURE__ */ sc("0123456789abcdef"), /* @__PURE__ */ ac(""), /* @__PURE__ */ Hh((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Pt = /* @__PURE__ */ new Uint8Array(), dl = /* @__PURE__ */ new Uint8Array([0]);
function Sr(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Le(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Zh(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    if (!Le(o))
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
function Ao(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function en(t) {
  return Number.isSafeInteger(t);
}
const cc = {
  equalBytes: Sr,
  isBytes: Le,
  concatBytes: Zh
}, pl = (t) => {
  if (t !== null && typeof t != "string" && !Fe(t) && !Le(t) && !en(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (Fe(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = gn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (Fe(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = gn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
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
class uc {
  constructor(e, n = {}, r = [], o = void 0, s = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = hl(e);
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
    return new uc(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Le(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (Sr(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class Xh {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = hl(this.viewBuf);
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
const Ta = (t) => Uint8Array.from(t).reverse();
function Qh(t, e, n) {
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
      const n = new Xh();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new uc(e, n), o = t.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function Ie(t, e) {
  if (!Fe(t))
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
}, Yi = (t) => Ao(t) && typeof t.decode == "function" && typeof t.encode == "function";
function Fe(t) {
  return Ao(t) && Yi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || en(t.size));
}
function Jh() {
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
      if (!Ao(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const tp = {
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
function ep(t) {
  if (!Ao(t))
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
function np(t, e = !1) {
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
function rp(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!Yi(e))
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
  if (!Yi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, Zi = { dict: Jh, numberBigint: tp, tsEnum: ep, decimal: np, match: rp, reverse: yl }, fc = (t, e = !1, n = !1, r = !0) => {
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
      const u = c.bytes(r ? t : Math.min(t, c.leftBytes)), f = e ? u : Ta(u);
      let h = 0n;
      for (let y = 0; y < f.length; y++)
        h |= BigInt(f[y]) << 8n * BigInt(y);
      return n && h & s && (h = (h ^ s) - s), h;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return Qh(c, 8n * o, !!n), c;
    }
  });
}, wl = /* @__PURE__ */ fc(32, !1), gi = /* @__PURE__ */ fc(8, !0), op = /* @__PURE__ */ fc(8, !0, !0), ip = (t, e) => Be({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (o) => e.write(o, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), ko = (t, e, n) => {
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
  return ip(t, {
    write: n.write,
    read: n.read,
    validate: e ? s : u
  });
}, Bt = /* @__PURE__ */ ko(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), sp = /* @__PURE__ */ ko(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), hr = /* @__PURE__ */ ko(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), Pu = /* @__PURE__ */ ko(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), Cn = /* @__PURE__ */ ko(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Lt = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = pl(t), r = Le(t);
  return Be({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(e ? Ta(s) : s), r && o.bytes(t);
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
      return e ? Ta(s) : s;
    },
    validate: (o) => {
      if (!Le(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function ap(t, e) {
  if (!Fe(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Rn(Lt(t), yl(e));
}
const lc = (t, e = !1) => Ie(Rn(Lt(t, e), Gh), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), cp = (t, e = { isLE: !1, with0x: !1 }) => {
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
  if (!Fe(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!Yi(e))
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
const up = (t, e = !1) => {
  if (!Le(t))
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
      return r && (r = Sr(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function fp(t, e, n) {
  if (!Fe(e))
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
function dc(t, e, n = !0) {
  if (!Fe(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Be({
    size: t.size,
    encodeStream: (r, o) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const o = t.decodeStream(r);
      if (n && typeof o != "object" && o !== e || Le(e) && !Sr(e, o))
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
  if (!Ao(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!Fe(t[e]))
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
function lp(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!Fe(t[e]))
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
  if (!Fe(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = pl(typeof t == "string" ? `../${t}` : t);
  return Be({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (c) => {
        Le(t) || n.encodeStream(r, o.length);
        for (let u = 0; u < o.length; u++)
          c(`${u}`, () => {
            const f = o[u], h = r.pos;
            if (e.encodeStream(r, f), Le(t)) {
              if (t.length > s.pos - h)
                return;
              const y = s.finish(!1).subarray(h, s.pos);
              if (Sr(y.subarray(0, t.length), t))
                throw s.err(`array: inner element encoding same as separator. elm=${f} data=${y}`);
            }
          });
      }), Le(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (s(`${c}`, () => o.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if (Le(t))
          for (let c = 0; ; c++) {
            if (Sr(r.bytes(t.length, !0), t)) {
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
const Xi = Je.ProjectivePoint, Ii = Je.CURVE.n, Ut = cc.isBytes, Bn = cc.concatBytes, Yt = cc.equalBytes, bl = (t) => Dh(Se(t)), Oe = (...t) => Se(Se(Bn(...t))), vl = tn.utils.randomPrivateKey, hc = tn.getPublicKey, dp = Je.getPublicKey, Ku = (t) => t.r < Ii / 2n;
function hp(t, e, n = !1) {
  let r = Je.sign(t, e);
  if (n && !Ku(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !Ku(r); )
      if (o.set(Bt.encode(s++)), r = Je.sign(t, e, { extraEntropy: o }), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Du = tn.sign, pc = tn.utils.taggedHash;
var xe;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(xe || (xe = {}));
function Ar(t, e) {
  const n = t.length;
  if (e === xe.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Xi.fromHex(t), t;
  } else if (e === xe.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return tn.utils.lift_x(tn.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function El(t, e) {
  const n = tn.utils, r = n.taggedHash("TapTweak", t, e), o = n.bytesToNumberBE(r);
  if (o >= Ii)
    throw new Error("tweak higher than curve order");
  return o;
}
function pp(t, e = new Uint8Array()) {
  const n = tn.utils, r = n.bytesToNumberBE(t), o = Xi.fromPrivateKey(r), s = o.hasEvenY() ? r : n.mod(-r, Ii), c = n.pointToBytes(o), u = El(c, e);
  return n.numberToBytesBE(n.mod(s + u, Ii), 32);
}
function xl(t, e) {
  const n = tn.utils, r = El(t, e), s = n.lift_x(n.bytesToNumberBE(t)).add(Xi.fromPrivateKey(r)), c = s.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(s), c];
}
const gc = Se(Xi.BASE.toRawBytes(!1)), kr = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, si = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Bi(t, e) {
  if (!Ut(t) || !Ut(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function yc(t) {
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
function Tr(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function To(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function _i(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Ni(t, e) {
  if (!Sl(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function wc(t, e) {
  if (!Sl(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Qi(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function Ji(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Ni("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (_i(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (_i(o), o.map((s) => {
      Tr("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function ts(t = "") {
  return Tr("join", t), {
    encode: (e) => (Ni("join.decode", e), e.join(t)),
    decode: (e) => (Tr("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function gp(t, e = "=") {
  return To(t), Tr("padding", e), {
    encode(n) {
      for (Ni("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Ni("padding.decode", n);
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
function yp(t) {
  return Al(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Mu(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (_i(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (To(u), u < 0 || u >= e)
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
const kl = (t, e) => e === 0 ? t : kl(e, t % e), Ci = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - kl(t, e)), yi = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Ia(t, e, n, r) {
  if (_i(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ci(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Ci(e, n)}`);
  let o = 0, s = 0;
  const c = yi[e], u = yi[n] - 1, f = [];
  for (const h of t) {
    if (To(h), h >= c)
      throw new Error(`convertRadix2: invalid data word=${h} from=${e}`);
    if (o = o << e | h, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      f.push((o >> s - n & u) >>> 0);
    const y = yi[s];
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
function wp(t) {
  To(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!yc(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Mu(Array.from(n), e, t);
    },
    decode: (n) => (wc("radix.decode", n), Uint8Array.from(Mu(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function mc(t, e = !1) {
  if (To(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ci(8, t) > 32 || /* @__PURE__ */ Ci(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!yc(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Ia(Array.from(n), 8, t, !e);
    },
    decode: (n) => (wc("radix2.decode", n), Uint8Array.from(Ia(n, t, 8, e)))
  };
}
function Hu(t) {
  return Al(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const Ee = /* @__PURE__ */ Qi(/* @__PURE__ */ mc(6), /* @__PURE__ */ Ji("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ gp(6), /* @__PURE__ */ ts("")), mp = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Qi(/* @__PURE__ */ wp(58), /* @__PURE__ */ Ji(t), /* @__PURE__ */ ts("")), Fu = /* @__PURE__ */ mp("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Ba = /* @__PURE__ */ Qi(/* @__PURE__ */ Ji("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ ts("")), Vu = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Wr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Vu.length; r++)
    (e >> r & 1) === 1 && (n ^= Vu[r]);
  return n;
}
function qu(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = Wr(o) ^ c >> 5;
  }
  o = Wr(o);
  for (let s = 0; s < r; s++)
    o = Wr(o) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    o = Wr(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = Wr(o);
  return o ^= n, Ba.encode(Ia([o % yi[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function bp(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ mc(5), r = n.decode, o = n.encode, s = Hu(r);
  function c(g, m, E = 90) {
    Tr("bech32.encode prefix", g), yc(m) && (m = Array.from(m)), wc("bech32.encode", m);
    const A = g.length;
    if (A === 0)
      throw new TypeError(`Invalid prefix length ${A}`);
    const I = A + 7 + m.length;
    if (E !== !1 && I > E)
      throw new TypeError(`Length ${I} exceeds limit ${E}`);
    const b = g.toLowerCase(), B = qu(b, m, e);
    return `${b}1${Ba.encode(m)}${B}`;
  }
  function u(g, m = 90) {
    Tr("bech32.decode input", g);
    const E = g.length;
    if (E < 8 || m !== !1 && E > m)
      throw new TypeError(`invalid string length: ${E} (${g}). Expected (8..${m})`);
    const A = g.toLowerCase();
    if (g !== A && g !== g.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const I = A.lastIndexOf("1");
    if (I === 0 || I === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const b = A.slice(0, I), B = A.slice(I + 1);
    if (B.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const O = Ba.decode(B).slice(0, -6), D = qu(b, O, e);
    if (!B.endsWith(D))
      throw new Error(`Invalid checksum in ${g}: expected "${D}"`);
    return { prefix: b, words: O };
  }
  const f = Hu(u);
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
const ai = /* @__PURE__ */ bp("bech32m"), ht = /* @__PURE__ */ Qi(/* @__PURE__ */ mc(4), /* @__PURE__ */ Ji("0123456789abcdef"), /* @__PURE__ */ ts(""), /* @__PURE__ */ yp((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class Tl extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: Il, pointToBytes: ci } = tn.utils, $n = Je.ProjectivePoint, nn = 33, _a = new Uint8Array(nn), _n = Je.CURVE.n, ju = Rn(Lt(33), {
  decode: (t) => bc(t) ? _a : t.toRawBytes(!0),
  encode: (t) => co(t, _a) ? $n.ZERO : $n.fromHex(t)
}), zu = Ie(wl, (t) => (Pe("n", t, 1n, _n), t)), wi = se({ R1: ju, R2: ju }), Bl = se({ k1: zu, k2: zu, publicKey: Lt(nn) });
function Gu(t, ...e) {
}
function De(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Ae(n, ...e));
}
function Wu(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Me = (t) => re(t, _n), Ui = (t, ...e) => Me(ke(Il(t, ...e))), Yr = (t, e) => t.hasEvenY() ? e : Me(-e);
function Qn(t) {
  return $n.BASE.multiply(t);
}
function bc(t) {
  return t.equals($n.ZERO);
}
function Na(t) {
  return De(t, nn), t.sort(Bi);
}
function _l(t) {
  De(t, nn);
  for (let e = 1; e < t.length; e++)
    if (!co(t[e], t[0]))
      return t[e];
  return _a;
}
function Nl(t) {
  return De(t, nn), Il("KeyAgg list", ...t);
}
function Cl(t, e, n) {
  return Ae(t, nn), Ae(e, nn), co(t, e) ? 1n : Ui("KeyAgg coefficient", n, t);
}
function Ca(t, e = [], n = []) {
  if (De(t, nn), De(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = _l(t), o = Nl(t);
  let s = $n.ZERO;
  for (let f = 0; f < t.length; f++) {
    let h;
    try {
      h = $n.fromHex(t[f]);
    } catch {
      throw new Tl(f, "pubkey");
    }
    s = s.add(h.multiply(Cl(t[f], r, o)));
  }
  let c = 1n, u = 0n;
  for (let f = 0; f < e.length; f++) {
    const h = n[f] && !s.hasEvenY() ? Me(-1n) : 1n, y = ke(e[f]);
    if (Pe("tweak", y, 0n, _n), s = s.multiply(h).add(Qn(y)), bc(s))
      throw new Error("The result of tweaking cannot be infinity");
    c = Me(h * c), u = Me(y + h * u);
  }
  return { aggPublicKey: s, gAcc: c, tweakAcc: u };
}
const Yu = (t, e, n, r, o, s) => Ui("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, o, Qe(s.length, 4), s, new Uint8Array([r]));
function vp(t, e, n = new Uint8Array(0), r, o = new Uint8Array(0), s = Xa(32)) {
  Ae(t, nn), Gu(e, 32), Ae(n, 0, 32), Gu(), Ae(o), Ae(s, 32);
  const c = new Uint8Array([0]), u = Yu(s, t, n, 0, c, o), f = Yu(s, t, n, 1, c, o);
  return {
    secret: Bl.encode({ k1: u, k2: f, publicKey: t }),
    public: wi.encode({ R1: Qn(u), R2: Qn(f) })
  };
}
class Ep {
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
    if (De(n, 33), De(o, 32), Wu(s), Ae(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: u, tweakAcc: f } = Ca(n, o, s), { R1: h, R2: y } = wi.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = u, this.tweakAcc = f, this.b = Ui("MuSig/noncecoef", e, ci(c), r);
    const g = h.add(y.multiply(this.b));
    this.R = bc(g) ? $n.BASE : g, this.e = Ui("BIP0340/challenge", ci(this.R), ci(c), r), this.tweaks = o, this.isXonly = s, this.L = Nl(n), this.secondKey = _l(n);
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
    if (!n.some((s) => co(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Cl(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: o, gAcc: s, b: c, R: u, e: f } = this, h = ke(e);
    if (h >= _n)
      return !1;
    const { R1: y, R2: g } = wi.decode(n), m = y.add(g.multiply(c)), E = u.hasEvenY() ? m : m.negate(), A = $n.fromHex(r), I = this.getSessionKeyAggCoeff(A), b = Me(Yr(o, 1n) * s), B = Qn(h), O = E.add(A.multiply(Me(f * I * b)));
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
    e.fill(0, 0, 64), Pe("k1", h, 0n, _n), Pe("k2", y, 0n, _n);
    const m = Yr(u, h), E = Yr(u, y), A = ke(n);
    Pe("d_", A, 1n, _n);
    const I = Qn(A), b = I.toRawBytes(!0);
    if (!co(b, g))
      throw new Error("Public key does not match nonceGen argument");
    const B = this.getSessionKeyAggCoeff(I), O = Yr(o, 1n), D = Me(O * s * A), j = Me(m + c * E + f * B * D), G = Qe(j, 32);
    if (!r) {
      const W = wi.encode({
        R1: Qn(h),
        R2: Qn(y)
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
    if (Ae(e, 32), De(n, 66), De(o, nn), De(s, 32), Wu(c), ga(r), n.length !== o.length)
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
    const u = Yr(n, 1n);
    return c = Me(c + s * u * r), tr(ci(o), Qe(c, 32));
  }
}
function xp(t) {
  const e = vp(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const es = /* @__PURE__ */ BigInt(0), ns = /* @__PURE__ */ BigInt(1), Sp = /* @__PURE__ */ BigInt(2);
function er(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Io(t) {
  if (!er(t))
    throw new Error("Uint8Array expected");
}
function Ir(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const Ap = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Br(t) {
  Io(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Ap[t[n]];
  return e;
}
function pr(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function vc(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? es : BigInt("0x" + t);
}
const an = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Zu(t) {
  if (t >= an._0 && t <= an._9)
    return t - an._0;
  if (t >= an.A && t <= an.F)
    return t - (an.A - 10);
  if (t >= an.a && t <= an.f)
    return t - (an.a - 10);
}
function _r(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = Zu(t.charCodeAt(s)), u = Zu(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const f = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + f + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Xe(t) {
  return vc(Br(t));
}
function Ec(t) {
  return Io(t), vc(Br(Uint8Array.from(t).reverse()));
}
function On(t, e) {
  return _r(t.toString(16).padStart(e * 2, "0"));
}
function xc(t, e) {
  return On(t, e).reverse();
}
function kp(t) {
  return _r(pr(t));
}
function we(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = _r(e);
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
function nr(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Io(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
function Tp(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function Ip(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const Qs = (t) => typeof t == "bigint" && es <= t;
function Nr(t, e, n) {
  return Qs(t) && Qs(e) && Qs(n) && e <= t && t < n;
}
function Un(t, e, n, r) {
  if (!Nr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Ul(t) {
  let e;
  for (e = 0; t > es; t >>= ns, e += 1)
    ;
  return e;
}
function Bp(t, e) {
  return t >> BigInt(e) & ns;
}
function _p(t, e, n) {
  return t | (n ? ns : es) << BigInt(e);
}
const Sc = (t) => (Sp << BigInt(t - 1)) - ns, Js = (t) => new Uint8Array(t), Xu = (t) => Uint8Array.from(t);
function Rl(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Js(t), o = Js(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...g) => n(o, r, ...g), f = (g = Js()) => {
    o = u(Xu([0]), g), r = u(), g.length !== 0 && (o = u(Xu([1]), g), r = u());
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
    return nr(...m);
  };
  return (g, m) => {
    c(), f(g);
    let E;
    for (; !(E = m(h())); )
      f();
    return c(), E;
  };
}
const Np = {
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
function Bo(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = Np[s];
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
const Cp = () => {
  throw new Error("not implemented");
};
function Ua(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
const Up = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Un,
  abool: Ir,
  abytes: Io,
  bitGet: Bp,
  bitLen: Ul,
  bitMask: Sc,
  bitSet: _p,
  bytesToHex: Br,
  bytesToNumberBE: Xe,
  bytesToNumberLE: Ec,
  concatBytes: nr,
  createHmacDrbg: Rl,
  ensureBytes: we,
  equalBytes: Tp,
  hexToBytes: _r,
  hexToNumber: vc,
  inRange: Nr,
  isBytes: er,
  memoized: Ua,
  notImplemented: Cp,
  numberToBytesBE: On,
  numberToBytesLE: xc,
  numberToHexUnpadded: pr,
  numberToVarBytesBE: kp,
  utf8ToBytes: Ip,
  validateObject: Bo
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Ac = 2n ** 256n, wr = Ac - 0x1000003d1n, $l = Ac - 0x14551231950b75fc4402da1732fc9bebfn, Rp = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, $p = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, kc = {
  n: $l,
  a: 0n,
  b: 7n
}, eo = 32, Qu = (t) => ft(ft(t * t) * t + kc.b), me = (t = "") => {
  throw new Error(t);
}, rs = (t) => typeof t == "bigint", Ol = (t) => typeof t == "string", ta = (t) => rs(t) && 0n < t && t < wr, Ll = (t) => rs(t) && 0n < t && t < $l, Op = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", Ra = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Op(t) || typeof e == "number" && e > 0 && t.length !== e ? me("Uint8Array expected") : t
), Pl = (t) => new Uint8Array(t), Kl = (t, e) => Ra(Ol(t) ? Tc(t) : Pl(Ra(t)), e), ft = (t, e = wr) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, Ju = (t) => t instanceof Cr ? t : me("Point expected");
let Cr = class dr {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? Jr : new dr(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Kl(e);
    let n;
    const r = e[0], o = e.subarray(1), s = ef(o, 0, eo), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      ta(s) || me("Point hex invalid: x not FE");
      let u = Kp(Qu(s));
      const f = (u & 1n) === 1n;
      (r & 1) === 1 !== f && (u = ft(-u)), n = new dr(s, u, 1n);
    }
    return c === 65 && r === 4 && (n = new dr(s, ef(o, eo, 2 * eo), 1n)), n ? n.ok() : me("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return no.mul(Dp(e));
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Ju(e), f = ft(n * u), h = ft(s * o), y = ft(r * u), g = ft(c * o);
    return f === h && y === g;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new dr(this.px, ft(-this.py), this.pz);
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Ju(e), { a: f, b: h } = kc;
    let y = 0n, g = 0n, m = 0n;
    const E = ft(h * 3n);
    let A = ft(n * s), I = ft(r * c), b = ft(o * u), B = ft(n + r), O = ft(s + c);
    B = ft(B * O), O = ft(A + I), B = ft(B - O), O = ft(n + o);
    let D = ft(s + u);
    return O = ft(O * D), D = ft(A + b), O = ft(O - D), D = ft(r + o), y = ft(c + u), D = ft(D * y), y = ft(I + b), D = ft(D - y), m = ft(f * O), y = ft(E * b), m = ft(y + m), y = ft(I - m), m = ft(I + m), g = ft(y * m), I = ft(A + A), I = ft(I + A), b = ft(f * b), O = ft(E * O), I = ft(I + b), b = ft(A - b), b = ft(f * b), O = ft(O + b), A = ft(I * O), g = ft(g + A), A = ft(D * O), y = ft(B * y), y = ft(y - A), A = ft(B * I), m = ft(D * m), m = ft(m + A), new dr(y, g, m);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return Jr;
    if (Ll(e) || me("scalar invalid"), this.equals(no))
      return Hp(e).p;
    let r = Jr, o = no;
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
    if (this.equals(Jr))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const o = Pp(r, wr);
    return ft(r * o) !== 1n && me("inverse invalid"), { x: ft(e * o), y: ft(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!ta(e) || !ta(n)) && me("Point invalid: x or y"), ft(n * n) === Qu(e) ? (
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + nf(n) + (e ? "" : nf(r));
  }
  toRawBytes(e = !0) {
    return Tc(this.toHex(e));
  }
};
Cr.BASE = new Cr(Rp, $p, 1n);
Cr.ZERO = new Cr(0n, 1n, 0n);
const { BASE: no, ZERO: Jr } = Cr, Dl = (t, e) => t.toString(16).padStart(e, "0"), Ml = (t) => Array.from(Ra(t)).map((e) => Dl(e, 2)).join(""), cn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, tf = (t) => {
  if (t >= cn._0 && t <= cn._9)
    return t - cn._0;
  if (t >= cn.A && t <= cn.F)
    return t - (cn.A - 10);
  if (t >= cn.a && t <= cn.f)
    return t - (cn.a - 10);
}, Tc = (t) => {
  const e = "hex invalid";
  if (!Ol(t))
    return me(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return me(e);
  const o = Pl(r);
  for (let s = 0, c = 0; s < r; s++, c += 2) {
    const u = tf(t.charCodeAt(c)), f = tf(t.charCodeAt(c + 1));
    if (u === void 0 || f === void 0)
      return me(e);
    o[s] = u * 16 + f;
  }
  return o;
}, Hl = (t) => BigInt("0x" + (Ml(t) || "0")), ef = (t, e, n) => Hl(t.slice(e, n)), Lp = (t) => rs(t) && t >= 0n && t < Ac ? Tc(Dl(t, 2 * eo)) : me("bigint expected"), nf = (t) => Ml(Lp(t)), Pp = (t, e) => {
  (t === 0n || e <= 0n) && me("no inverse n=" + t + " mod=" + e);
  let n = ft(t, e), r = e, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const c = r / n, u = r % n, f = o - s * c;
    r = n, n = u, o = s, s = f;
  }
  return r === 1n ? ft(o, e) : me("no inverse");
}, Kp = (t) => {
  let e = 1n;
  for (let n = t, r = (wr + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % wr), n = n * n % wr;
  return ft(e * e) === t ? e : me("sqrt invalid");
}, Dp = (t) => (rs(t) || (t = Hl(Kl(t, eo))), Ll(t) ? t : me("private key invalid 3")), Zn = 8, Mp = () => {
  const t = [], e = 256 / Zn + 1;
  let n = no, r = n;
  for (let o = 0; o < e; o++) {
    r = n, t.push(r);
    for (let s = 1; s < 2 ** (Zn - 1); s++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let rf;
const Hp = (t) => {
  const e = rf || (rf = Mp()), n = (y, g) => {
    let m = g.negate();
    return y ? m : g;
  };
  let r = Jr, o = no;
  const s = 1 + 256 / Zn, c = 2 ** (Zn - 1), u = BigInt(2 ** Zn - 1), f = 2 ** Zn, h = BigInt(Zn);
  for (let y = 0; y < s; y++) {
    const g = y * c;
    let m = Number(t & u);
    t >>= h, m > c && (m -= f, t += 1n);
    const E = g, A = g + Math.abs(m) - 1, I = y % 2 !== 0, b = m < 0;
    m === 0 ? o = o.add(n(I, e[E])) : r = r.add(n(b, e[A]));
  }
  return { p: r, f: o };
};
function of(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Fp(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function os(t, ...e) {
  if (!Fp(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Vp(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  of(t.outputLen), of(t.blockLen);
}
function Ri(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function qp(t, e) {
  os(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const lr = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ea = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), Ze = (t, e) => t << 32 - e | t >>> e;
function jp(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Ic(t) {
  return typeof t == "string" && (t = jp(t)), os(t), t;
}
function zp(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    os(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
class Fl {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function Gp(t) {
  const e = (r) => t().update(Ic(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Vl(t = 32) {
  if (lr && typeof lr.getRandomValues == "function")
    return lr.getRandomValues(new Uint8Array(t));
  if (lr && typeof lr.randomBytes == "function")
    return lr.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Wp(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), c = Number(n >> o & s), u = Number(n & s), f = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + f, c, r), t.setUint32(e + h, u, r);
}
const Yp = (t, e, n) => t & e ^ ~t & n, Zp = (t, e, n) => t & e ^ t & n ^ e & n;
class Xp extends Fl {
  constructor(e, n, r, o) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = ea(this.buffer);
  }
  update(e) {
    Ri(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = Ic(e);
    const s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const f = ea(e);
        for (; o <= s - c; c += o)
          this.process(f, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Ri(this), qp(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, this.buffer.subarray(c).fill(0), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let g = c; g < o; g++)
      n[g] = 0;
    Wp(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = ea(e), f = this.outputLen;
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
const Qp = /* @__PURE__ */ new Uint32Array([
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
class Jp extends Xp {
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
      const m = In[g - 15], E = In[g - 2], A = Ze(m, 7) ^ Ze(m, 18) ^ m >>> 3, I = Ze(E, 17) ^ Ze(E, 19) ^ E >>> 10;
      In[g] = I + In[g - 7] + A + In[g - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: f, G: h, H: y } = this;
    for (let g = 0; g < 64; g++) {
      const m = Ze(u, 6) ^ Ze(u, 11) ^ Ze(u, 25), E = y + m + Yp(u, f, h) + Qp[g] + In[g] | 0, I = (Ze(r, 2) ^ Ze(r, 13) ^ Ze(r, 22)) + Zp(r, o, s) | 0;
      y = h, h = f, f = u, u = c + E | 0, c = s, s = o, o = r, r = E + I | 0;
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
const $a = /* @__PURE__ */ Gp(() => new Jp());
class ql extends Fl {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Vp(e);
    const r = Ic(n);
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
    return Ri(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Ri(this), os(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
const ie = BigInt(0), qt = BigInt(1), Xn = /* @__PURE__ */ BigInt(2), tg = /* @__PURE__ */ BigInt(3), Oa = /* @__PURE__ */ BigInt(4), sf = /* @__PURE__ */ BigInt(5), af = /* @__PURE__ */ BigInt(8);
function ue(t, e) {
  const n = t % e;
  return n >= ie ? n : e + n;
}
function eg(t, e, n) {
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
function $e(t, e, n) {
  let r = t;
  for (; e-- > ie; )
    r *= r, r %= n;
  return r;
}
function La(t, e) {
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
function ng(t) {
  const e = (t - qt) / Xn;
  let n, r, o;
  for (n = t - qt, r = 0; n % Xn === ie; n /= Xn, r++)
    ;
  for (o = Xn; o < t && eg(o, e, t) !== t - qt; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const c = (t + qt) / Oa;
    return function(f, h) {
      const y = f.pow(h, c);
      if (!f.eql(f.sqr(y), h))
        throw new Error("Cannot find square root");
      return y;
    };
  }
  const s = (n + qt) / Xn;
  return function(u, f) {
    if (u.pow(f, e) === u.neg(u.ONE))
      throw new Error("Cannot find square root");
    let h = r, y = u.pow(u.mul(u.ONE, o), n), g = u.pow(f, s), m = u.pow(f, n);
    for (; !u.eql(m, u.ONE); ) {
      if (u.eql(m, u.ZERO))
        return u.ZERO;
      let E = 1;
      for (let I = u.sqr(m); E < h && !u.eql(I, u.ONE); E++)
        I = u.sqr(I);
      const A = u.pow(y, qt << BigInt(h - E - 1));
      y = u.sqr(A), g = u.mul(g, A), m = u.mul(m, y), h = E;
    }
    return g;
  };
}
function rg(t) {
  if (t % Oa === tg) {
    const e = (t + qt) / Oa;
    return function(r, o) {
      const s = r.pow(o, e);
      if (!r.eql(r.sqr(s), o))
        throw new Error("Cannot find square root");
      return s;
    };
  }
  if (t % af === sf) {
    const e = (t - sf) / af;
    return function(r, o) {
      const s = r.mul(o, Xn), c = r.pow(s, e), u = r.mul(o, c), f = r.mul(r.mul(u, Xn), c), h = r.mul(u, r.sub(f, r.ONE));
      if (!r.eql(r.sqr(h), o))
        throw new Error("Cannot find square root");
      return h;
    };
  }
  return ng(t);
}
const og = [
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
function ig(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = og.reduce((r, o) => (r[o] = "function", r), e);
  return Bo(t, n);
}
function sg(t, e, n) {
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
function ag(t, e) {
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
    MASK: Sc(o),
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
    pow: (f, h) => sg(u, f, h),
    div: (f, h) => ue(f * La(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (f) => f * f,
    addN: (f, h) => f + h,
    subN: (f, h) => f - h,
    mulN: (f, h) => f * h,
    inv: (f) => La(f, t),
    sqrt: r.sqrt || ((f) => (c || (c = rg(t)), c(u, f))),
    invertBatch: (f) => ag(u, f),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (f, h, y) => y ? h : f,
    toBytes: (f) => n ? xc(f, s) : On(f, s),
    fromBytes: (f) => {
      if (f.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + f.length);
      return n ? Ec(f) : Xe(f);
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
function cg(t, e, n = !1) {
  const r = t.length, o = Wl(e), s = Yl(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? Xe(t) : Ec(t), u = ue(c, e - qt) + qt;
  return n ? xc(u, o) : On(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const cf = BigInt(0), ui = BigInt(1);
function na(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Zl(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function ra(t, e) {
  Zl(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function ug(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function fg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const oa = /* @__PURE__ */ new WeakMap(), Xl = /* @__PURE__ */ new WeakMap();
function ia(t) {
  return Xl.get(t) || 1;
}
function lg(t, e) {
  return {
    constTimeNegate: na,
    hasPrecomputes(n) {
      return ia(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > cf; )
        r & ui && (o = o.add(s)), s = s.double(), r >>= ui;
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
      const { windows: o, windowSize: s } = ra(r, e), c = [];
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
      const { windows: s, windowSize: c } = ra(n, e);
      let u = t.ZERO, f = t.BASE;
      const h = BigInt(2 ** n - 1), y = 2 ** n, g = BigInt(n);
      for (let m = 0; m < s; m++) {
        const E = m * c;
        let A = Number(o & h);
        o >>= g, A > c && (A -= y, o += ui);
        const I = E, b = E + Math.abs(A) - 1, B = m % 2 !== 0, O = A < 0;
        A === 0 ? f = f.add(na(B, r[I])) : u = u.add(na(O, r[b]));
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
      const { windows: c, windowSize: u } = ra(n, e), f = BigInt(2 ** n - 1), h = 2 ** n, y = BigInt(n);
      for (let g = 0; g < c; g++) {
        const m = g * u;
        if (o === cf)
          break;
        let E = Number(o & f);
        if (o >>= y, E > u && (E -= h, o += ui), E === 0)
          continue;
        let A = r[m + Math.abs(E) - 1];
        E < 0 && (A = A.negate()), s = s.add(A);
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = oa.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && oa.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = ia(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = ia(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Zl(r, e), Xl.set(n, r), oa.delete(n);
    }
  };
}
function dg(t, e, n, r) {
  if (ug(n, t), fg(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, s = Ul(BigInt(n.length)), c = s > 12 ? s - 3 : s > 4 ? s - 2 : s ? 2 : 1, u = (1 << c) - 1, f = new Array(u + 1).fill(o), h = Math.floor((e.BITS - 1) / c) * c;
  let y = o;
  for (let g = h; g >= 0; g -= c) {
    f.fill(o);
    for (let E = 0; E < r.length; E++) {
      const A = r[E], I = Number(A >> BigInt(g) & BigInt(u));
      f[I] = f[I].add(n[E]);
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
  return ig(t.Fp), Bo(t, {
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
function uf(t) {
  t.lowS !== void 0 && Ir("lowS", t.lowS), t.prehash !== void 0 && Ir("prehash", t.prehash);
}
function hg(t) {
  const e = Ql(t);
  Bo(e, {
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
const { bytesToNumberBE: pg, hexToBytes: gg } = Up, fn = {
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
      const r = e.length / 2, o = pr(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? pr(o.length / 2 | 128) : "";
      return pr(t) + s + o + e;
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
      let n = pr(t);
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
      return pg(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = fn, o = typeof t == "string" ? gg(t) : t;
    Io(o);
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
const ff = BigInt(3);
BigInt(4);
function yg(t) {
  const e = hg(t), { Fp: n } = e, r = Gl(e.n, e.nBitLength), o = e.toBytes || ((I, b, B) => {
    const O = b.toAffine();
    return nr(Uint8Array.from([4]), n.toBytes(O.x), n.toBytes(O.y));
  }), s = e.fromBytes || ((I) => {
    const b = I.subarray(1), B = n.fromBytes(b.subarray(0, n.BYTES)), O = n.fromBytes(b.subarray(n.BYTES, 2 * n.BYTES));
    return { x: B, y: O };
  });
  function c(I) {
    const { a: b, b: B } = e, O = n.sqr(I), D = n.mul(O, I);
    return n.add(n.add(D, n.mul(I, b)), B);
  }
  if (!n.eql(n.sqr(e.Gy), c(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function u(I) {
    return Nr(I, ne, e.n);
  }
  function f(I) {
    const { allowedPrivateKeyLengths: b, nByteLength: B, wrapPrivateKey: O, n: D } = e;
    if (b && typeof I != "bigint") {
      if (er(I) && (I = Br(I)), typeof I != "string" || !b.includes(I.length))
        throw new Error("invalid private key");
      I = I.padStart(B * 2, "0");
    }
    let j;
    try {
      j = typeof I == "bigint" ? I : Xe(we("private key", I, B));
    } catch {
      throw new Error("invalid private key, expected hex or " + B + " bytes, got " + typeof I);
    }
    return O && (j = ue(j, D)), Un("private key", j, ne, D), j;
  }
  function h(I) {
    if (!(I instanceof m))
      throw new Error("ProjectivePoint expected");
  }
  const y = Ua((I, b) => {
    const { px: B, py: O, pz: D } = I;
    if (n.eql(D, n.ONE))
      return { x: B, y: O };
    const j = I.is0();
    b == null && (b = j ? n.ONE : n.inv(D));
    const G = n.mul(B, b), W = n.mul(O, b), z = n.mul(D, b);
    if (j)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(z, n.ONE))
      throw new Error("invZ was invalid");
    return { x: G, y: W };
  }), g = Ua((I) => {
    if (I.is0()) {
      if (e.allowInfinityPoint && !n.is0(I.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: b, y: B } = I.toAffine();
    if (!n.isValid(b) || !n.isValid(B))
      throw new Error("bad point: x or y not FE");
    const O = n.sqr(B), D = c(b);
    if (!n.eql(O, D))
      throw new Error("bad point: equation left != right");
    if (!I.isTorsionFree())
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
      return dg(m, r, b, B);
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
      const { a: b, b: B } = e, O = n.mul(B, ff), { px: D, py: j, pz: G } = this;
      let W = n.ZERO, z = n.ZERO, nt = n.ZERO, Q = n.mul(D, D), wt = n.mul(j, j), V = n.mul(G, G), Y = n.mul(D, j);
      return Y = n.add(Y, Y), nt = n.mul(D, G), nt = n.add(nt, nt), W = n.mul(b, nt), z = n.mul(O, V), z = n.add(W, z), W = n.sub(wt, z), z = n.add(wt, z), z = n.mul(W, z), W = n.mul(Y, W), nt = n.mul(O, nt), V = n.mul(b, V), Y = n.sub(Q, V), Y = n.mul(b, Y), Y = n.add(Y, nt), nt = n.add(Q, Q), Q = n.add(nt, Q), Q = n.add(Q, V), Q = n.mul(Q, Y), z = n.add(z, Q), V = n.mul(j, G), V = n.add(V, V), Q = n.mul(V, Y), W = n.sub(W, Q), nt = n.mul(V, wt), nt = n.add(nt, nt), nt = n.add(nt, nt), new m(W, z, nt);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(b) {
      h(b);
      const { px: B, py: O, pz: D } = this, { px: j, py: G, pz: W } = b;
      let z = n.ZERO, nt = n.ZERO, Q = n.ZERO;
      const wt = e.a, V = n.mul(e.b, ff);
      let Y = n.mul(B, j), xt = n.mul(O, G), M = n.mul(D, W), F = n.add(B, O), q = n.add(j, G);
      F = n.mul(F, q), q = n.add(Y, xt), F = n.sub(F, q), q = n.add(B, D);
      let rt = n.add(j, W);
      return q = n.mul(q, rt), rt = n.add(Y, M), q = n.sub(q, rt), rt = n.add(O, D), z = n.add(G, W), rt = n.mul(rt, z), z = n.add(xt, M), rt = n.sub(rt, z), Q = n.mul(wt, q), z = n.mul(V, M), Q = n.add(z, Q), z = n.sub(xt, Q), Q = n.add(xt, Q), nt = n.mul(z, Q), xt = n.add(Y, Y), xt = n.add(xt, Y), M = n.mul(wt, M), q = n.mul(V, q), xt = n.add(xt, M), M = n.sub(Y, M), M = n.mul(wt, M), q = n.add(q, M), Y = n.mul(xt, q), nt = n.add(nt, Y), Y = n.mul(rt, q), z = n.mul(F, z), z = n.sub(z, Y), Y = n.mul(F, xt), Q = n.mul(rt, Q), Q = n.add(Q, Y), new m(z, nt, Q);
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
        let { p: Q, f: wt } = this.wNAF(W), { p: V, f: Y } = this.wNAF(nt);
        Q = A.constTimeNegate(G, Q), V = A.constTimeNegate(z, V), V = new m(n.mul(V.px, B.beta), V.py, V.pz), D = Q.add(V), j = wt.add(Y);
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
      return Ir("isCompressed", b), this.assertValidity(), o(m, this, b);
    }
    toHex(b = !0) {
      return Ir("isCompressed", b), Br(this.toRawBytes(b));
    }
  }
  m.BASE = new m(e.Gx, e.Gy, n.ONE), m.ZERO = new m(n.ZERO, n.ONE, n.ZERO);
  const E = e.nBitLength, A = lg(m, e.endo ? Math.ceil(E / 2) : E);
  return {
    CURVE: e,
    ProjectivePoint: m,
    normPrivateKeyToScalar: f,
    weierstrassEquation: c,
    isWithinCurveOrder: u
  };
}
function wg(t) {
  const e = Ql(t);
  return Bo(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function mg(t) {
  const e = wg(t), { Fp: n, n: r } = e, o = n.BYTES + 1, s = 2 * n.BYTES + 1;
  function c(M) {
    return ue(M, r);
  }
  function u(M) {
    return La(M, r);
  }
  const { ProjectivePoint: f, normPrivateKeyToScalar: h, weierstrassEquation: y, isWithinCurveOrder: g } = yg({
    ...e,
    toBytes(M, F, q) {
      const rt = F.toAffine(), st = n.toBytes(rt.x), lt = nr;
      return Ir("isCompressed", q), q ? lt(Uint8Array.from([F.hasEvenY() ? 2 : 3]), st) : lt(Uint8Array.from([4]), st, n.toBytes(rt.y));
    },
    fromBytes(M) {
      const F = M.length, q = M[0], rt = M.subarray(1);
      if (F === o && (q === 2 || q === 3)) {
        const st = Xe(rt);
        if (!Nr(st, ne, n.ORDER))
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
      } else if (F === s && q === 4) {
        const st = n.fromBytes(rt.subarray(0, n.BYTES)), lt = n.fromBytes(rt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: st, y: lt };
      } else {
        const st = o, lt = s;
        throw new Error("invalid Point, expected length of " + st + ", or uncompressed " + lt + ", got " + F);
      }
    }
  }), m = (M) => Br(On(M, e.nByteLength));
  function E(M) {
    const F = r >> ne;
    return M > F;
  }
  function A(M) {
    return E(M) ? c(-M) : M;
  }
  const I = (M, F, q) => Xe(M.slice(F, q));
  class b {
    constructor(F, q, rt) {
      this.r = F, this.s = q, this.recovery = rt, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(F) {
      const q = e.nByteLength;
      return F = we("compactSignature", F, q * 2), new b(I(F, 0, q), I(F, q, 2 * q));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(F) {
      const { r: q, s: rt } = fn.toSig(we("DER", F));
      return new b(q, rt);
    }
    assertValidity() {
      Un("r", this.r, ne, r), Un("s", this.s, ne, r);
    }
    addRecoveryBit(F) {
      return new b(this.r, this.s, F);
    }
    recoverPublicKey(F) {
      const { r: q, s: rt, recovery: st } = this, lt = W(we("msgHash", F));
      if (st == null || ![0, 1, 2, 3].includes(st))
        throw new Error("recovery id invalid");
      const mt = st === 2 || st === 3 ? q + e.n : q;
      if (mt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const St = (st & 1) === 0 ? "02" : "03", Dt = f.fromHex(St + m(mt)), It = u(mt), kt = c(-lt * It), Xt = c(rt * It), Rt = f.BASE.multiplyAndAddUnsafe(Dt, kt, Xt);
      if (!Rt)
        throw new Error("point at infinify");
      return Rt.assertValidity(), Rt;
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
      return _r(this.toDERHex());
    }
    toDERHex() {
      return fn.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return _r(this.toCompactHex());
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
      return cg(e.randomBytes(M), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(M = 8, F = f.BASE) {
      return F._setWindowSize(M), F.multiply(BigInt(3)), F;
    }
  };
  function O(M, F = !0) {
    return f.fromPrivateKey(M).toRawBytes(F);
  }
  function D(M) {
    const F = er(M), q = typeof M == "string", rt = (F || q) && M.length;
    return F ? rt === o || rt === s : q ? rt === 2 * o || rt === 2 * s : M instanceof f;
  }
  function j(M, F, q = !0) {
    if (D(M))
      throw new Error("first arg must be private key");
    if (!D(F))
      throw new Error("second arg must be public key");
    return f.fromHex(F).multiply(h(M)).toRawBytes(q);
  }
  const G = e.bits2int || function(M) {
    if (M.length > 8192)
      throw new Error("input is too large");
    const F = Xe(M), q = M.length * 8 - e.nBitLength;
    return q > 0 ? F >> BigInt(q) : F;
  }, W = e.bits2int_modN || function(M) {
    return c(G(M));
  }, z = Sc(e.nBitLength);
  function nt(M) {
    return Un("num < 2^" + e.nBitLength, M, hn, z), On(M, e.nByteLength);
  }
  function Q(M, F, q = wt) {
    if (["recovered", "canonical"].some((ae) => ae in q))
      throw new Error("sign() legacy options not supported");
    const { hash: rt, randomBytes: st } = e;
    let { lowS: lt, prehash: mt, extraEntropy: St } = q;
    lt == null && (lt = !0), M = we("msgHash", M), uf(q), mt && (M = we("prehashed msgHash", rt(M)));
    const Dt = W(M), It = h(F), kt = [nt(It), nt(Dt)];
    if (St != null && St !== !1) {
      const ae = St === !0 ? st(n.BYTES) : St;
      kt.push(we("extraEntropy", ae));
    }
    const Xt = nr(...kt), Rt = Dt;
    function Ke(ae) {
      const at = G(ae);
      if (!g(at))
        return;
      const je = u(at), le = f.BASE.multiply(at).toAffine(), pt = c(le.x);
      if (pt === hn)
        return;
      const ce = c(je * c(Rt + pt * It));
      if (ce === hn)
        return;
      let _e = (le.x === pt ? 0 : 2) | Number(le.y & ne), Mt = ce;
      return lt && E(ce) && (Mt = A(ce), _e ^= 1), new b(pt, Mt, _e);
    }
    return { seed: Xt, k2sig: Ke };
  }
  const wt = { lowS: e.lowS, prehash: !1 }, V = { lowS: e.lowS, prehash: !1 };
  function Y(M, F, q = wt) {
    const { seed: rt, k2sig: st } = Q(M, F, q), lt = e;
    return Rl(lt.hash.outputLen, lt.nByteLength, lt.hmac)(rt, st);
  }
  f.BASE._setWindowSize(8);
  function xt(M, F, q, rt = V) {
    var _e;
    const st = M;
    F = we("msgHash", F), q = we("publicKey", q);
    const { lowS: lt, prehash: mt, format: St } = rt;
    if (uf(rt), "strict" in rt)
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
    mt && (F = e.hash(F));
    const { r: Rt, s: Ke } = kt, ae = W(F), at = u(Ke), je = c(ae * at), le = c(Rt * at), pt = (_e = f.BASE.multiplyAndAddUnsafe(Xt, je, le)) == null ? void 0 : _e.toAffine();
    return pt ? c(pt.x) === Rt : !1;
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
function bg(t) {
  return {
    hash: t,
    hmac: (e, ...n) => jl(t, e, zp(...n)),
    randomBytes: Vl
  };
}
function vg(t, e) {
  const n = (r) => mg({ ...t, ...bg(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _o = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), $i = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), ho = BigInt(1), Oi = BigInt(2), lf = (t, e) => (t + e / Oi) / e;
function Jl(t) {
  const e = _o, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), f = BigInt(88), h = t * t * t % e, y = h * h * t % e, g = $e(y, n, e) * y % e, m = $e(g, n, e) * y % e, E = $e(m, Oi, e) * h % e, A = $e(E, o, e) * E % e, I = $e(A, s, e) * A % e, b = $e(I, u, e) * I % e, B = $e(b, f, e) * b % e, O = $e(B, u, e) * I % e, D = $e(O, n, e) * y % e, j = $e(D, c, e) * A % e, G = $e(j, r, e) * h % e, W = $e(G, Oi, e);
  if (!Pa.eql(Pa.sqr(W), t))
    throw new Error("Cannot find square root");
  return W;
}
const Pa = Gl(_o, void 0, void 0, { sqrt: Jl }), po = vg({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: Pa,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: $i,
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
      const e = $i, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -ho * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = lf(s * t, e), f = lf(-r * t, e);
      let h = ue(t - u * n - f * o, e), y = ue(-u * r - f * s, e);
      const g = h > c, m = y > c;
      if (g && (h = e - h), m && (y = e - y), h > c || y > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: g, k1: h, k2neg: m, k2: y };
    }
  }
}, $a), td = BigInt(0), df = {};
function Li(t, ...e) {
  let n = df[t];
  if (n === void 0) {
    const r = $a(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = nr(r, r), df[t] = n;
  }
  return $a(nr(n, ...e));
}
const Bc = (t) => t.toRawBytes(!0).slice(1), Ka = (t) => On(t, 32), sa = (t) => ue(t, _o), go = (t) => ue(t, $i), _c = po.ProjectivePoint, Eg = (t, e, n) => _c.BASE.multiplyAndAddUnsafe(t, e, n);
function Da(t) {
  let e = po.utils.normPrivateKeyToScalar(t), n = _c.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : go(-e), bytes: Bc(n) };
}
function ed(t) {
  Un("x", t, ho, _o);
  const e = sa(t * t), n = sa(e * t + BigInt(7));
  let r = Jl(n);
  r % Oi !== td && (r = sa(-r));
  const o = new _c(t, r, ho);
  return o.assertValidity(), o;
}
const mr = Xe;
function nd(...t) {
  return go(mr(Li("BIP0340/challenge", ...t)));
}
function xg(t) {
  return Da(t).bytes;
}
function Sg(t, e, n = Vl(32)) {
  const r = we("message", t), { bytes: o, scalar: s } = Da(e), c = we("auxRand", n, 32), u = Ka(s ^ mr(Li("BIP0340/aux", c))), f = Li("BIP0340/nonce", u, o, r), h = go(mr(f));
  if (h === td)
    throw new Error("sign failed: k is zero");
  const { bytes: y, scalar: g } = Da(h), m = nd(y, o, r), E = new Uint8Array(64);
  if (E.set(y, 0), E.set(Ka(go(g + m * s)), 32), !rd(E, r, o))
    throw new Error("sign: Invalid signature produced");
  return E;
}
function rd(t, e, n) {
  const r = we("signature", t, 64), o = we("message", e), s = we("publicKey", n, 32);
  try {
    const c = ed(mr(s)), u = mr(r.subarray(0, 32));
    if (!Nr(u, ho, _o))
      return !1;
    const f = mr(r.subarray(32, 64));
    if (!Nr(f, ho, $i))
      return !1;
    const h = nd(Ka(u), Bc(c), o), y = Eg(c, f, go(-h));
    return !(!y || !y.hasEvenY() || y.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const od = {
  getPublicKey: xg,
  sign: Sg,
  verify: rd,
  utils: {
    randomPrivateKey: po.utils.randomPrivateKey,
    lift_x: ed,
    pointToBytes: Bc,
    numberToBytesBE: On,
    bytesToNumberBE: Xe,
    taggedHash: Li,
    mod: ue
  }
};
function Nc(t, e, n = {}) {
  t = Na(t);
  const { aggPublicKey: r } = Ca(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const o = od.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Ca(t, [o], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: s.toRawBytes(!0)
  };
}
class fi extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Cc {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new fi("Invalid s length");
    if (n.length !== 33)
      throw new fi("Invalid R length");
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
      throw new fi("Invalid partial signature length");
    if (Xe(e) >= kc.n)
      throw new fi("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Cc(e, r);
  }
}
function Ag(t, e, n, r, o, s) {
  let c;
  if ((s == null ? void 0 : s.taprootTweak) !== void 0) {
    const { preTweakedKey: h } = Nc(Na(r));
    c = od.utils.taggedHash("TapTweak", h.subarray(1), s.taprootTweak);
  }
  const f = new Ep(n, Na(r), o, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return Cc.decode(f);
}
var kg = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Tg(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var aa, hf;
function Ig() {
  if (hf) return aa;
  hf = 1;
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
  return aa = { decode: f, encode: h }, aa;
}
var pf = Ig(), zt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(zt || (zt = {}));
function Ur(t = 6, e = !1) {
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
function Bg(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Ut(t))
    try {
      const r = Ur(e, n).decode(t);
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
      if (typeof n == "number" && (n = Ur().encode(BigInt(n))), !Ut(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < zt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(zt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(zt.PUSHDATA2), t.bytes(Pu.encode(r))) : (t.byte(zt.PUSHDATA4), t.bytes(Bt.encode(r))), t.bytes(n);
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
          r = Pu.decodeStream(t);
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
}), gf = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, is = Be({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, o, s] of Object.values(gf))
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
    const [n, r, o] = gf[e];
    let s = 0n;
    for (let c = 0; c < r; c++)
      s |= BigInt(t.byte()) << 8n * BigInt(c);
    if (s < o)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Ve = Rn(is, Zi.numberBigint), He = Lt(is), Uc = Te(Ve, He), Pi = (t) => Te(is, t), id = se({
  txid: Lt(32, !0),
  // hash(prev_tx),
  index: Bt,
  // output number of previous tx
  finalScriptSig: He,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Bt
  // ?
}), Jn = se({ amount: gi, script: He }), _g = se({
  version: hr,
  segwitFlag: up(new Uint8Array([0, 1])),
  inputs: Pi(id),
  outputs: Pi(Jn),
  witnesses: fp("segwitFlag", Te("inputs/length", Uc)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Bt
});
function Ng(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const br = Ie(_g, Ng), to = se({
  version: hr,
  inputs: Pi(id),
  outputs: Pi(Jn),
  lockTime: Bt
});
function mi(t) {
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
function yf(t, e, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: c } = t;
  typeof s == "string" && (s = _t.decode(s)), Ut(s) && (s = br.decode(s)), !("nonWitnessUtxo" in t) && s === void 0 && (s = e == null ? void 0 : e.nonWitnessUtxo), typeof c == "string" && (c = _t.decode(c)), c === void 0 && (c = e == null ? void 0 : e.txid);
  let u = { ...e, ...t, nonWitnessUtxo: s, txid: c };
  !("nonWitnessUtxo" in t) && u.nonWitnessUtxo === void 0 && delete u.nonWitnessUtxo, u.sequence === void 0 && (u.sequence = Rc), u.tapMerkleRoot === null && delete u.tapMerkleRoot, u = Fa(as, u, e, n, o), Lc.encode(u);
  let f;
  return u.nonWitnessUtxo && u.index !== void 0 ? f = u.nonWitnessUtxo.outputs[u.index] : u.witnessUtxo && (f = u.witnessUtxo), f && !r && ud(f && f.script, u.redeemScript, u.witnessScript), u;
}
function wf(t, e = !1) {
  let n = "legacy", r = Ct.ALL;
  const o = mi(t), s = fe.decode(o.script);
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
const Cg = (t) => Math.ceil(t / 4), li = new Uint8Array(32), Ug = {
  amount: 0xffffffffffffffffn,
  script: Pt
}, Rg = 8, $g = 2, zn = 0, Rc = 4294967295;
Zi.decimal(Rg);
const ro = (t, e) => t === void 0 ? e : t;
function Ki(t) {
  if (Array.isArray(t))
    return t.map((e) => Ki(e));
  if (Ut(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Ki(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Ct;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Ct || (Ct = {}));
var yo;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(yo || (yo = {}));
function Og(t, e, n, r = Pt) {
  return Yt(n, e) && (t = pp(t, r), e = hc(t)), { privKey: t, pubKey: e };
}
function Gn(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function Zr(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: ro(t.sequence, Rc),
    finalScriptSig: ro(t.finalScriptSig, Pt)
  };
}
function ca(t) {
  for (const e in t) {
    const n = e;
    Fg.includes(n) || delete t[n];
  }
}
const ua = se({ txid: Lt(32, !0), index: Bt });
function Lg(t) {
  if (typeof t != "number" || typeof yo[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function mf(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Ct.ANYONECANPAY),
    isNone: e === Ct.NONE,
    isSingle: e === Ct.SINGLE
  };
}
function Pg(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: ro(t.version, $g),
    lockTime: ro(t.lockTime, 0),
    PSBTVersion: ro(t.PSBTVersion, 0)
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
    const n = this.opts = Pg(e);
    n.lockTime !== zn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = br.decode(e), o = new jt({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Sf.decode(e);
    } catch (g) {
      try {
        r = Af.decode(e);
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
    }), f.global = { ...r.global, txVersion: c }, u !== zn && (f.global.fallbackLocktime = u), f;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((s) => xf(e, as, s));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => xf(e, Mi, s)), o = { ...this.global };
    return e === 0 ? (o.unsignedTx = to.decode(to.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Zr).map((s) => ({
        ...s,
        finalScriptSig: Pt
      })),
      outputs: this.outputs.map(Gn)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = e, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === zn && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Sf : Af).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = zn, n = 0, r = zn, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (e = Math.max(e, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? e : r !== zn ? r : this.global.fallbackLocktime || zn;
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
    const n = this.outputs.map(Gn);
    e += 4 * Ve.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * He.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Ve.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * He.encode(r.finalScriptSig || Pt).length, this.hasWitnesses && r.finalScriptWitness && (e += Uc.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return Cg(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return br.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Zr).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Pt
      })),
      outputs: this.outputs.map(Gn),
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
    return _t.encode(Oe(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return _t.encode(Oe(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Ki(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(yf(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(e)) && (o = Vg);
    }
    this.inputs[e] = yf(n, this.inputs[e], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Ki(this.outputs[e]);
  }
  getOutputAddress(e, n = kr) {
    const r = this.getOutput(e);
    if (r.script)
      return wo(n).encode(fe.decode(r.script));
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
    if (c.amount === void 0 && delete c.amount, c = Fa(Mi, c, n, r, this.opts.allowUnknown), Pc.encode(c), c.script && !this.opts.allowUnknownOutputs && fe.decode(c.script).type === "unknown")
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
      (!s.addOutput || s.outputs.includes(e)) && (o = qg);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], o);
  }
  addOutputAddress(e, n, r = kr) {
    return this.addOutput({ script: fe.encode(wo(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const o = mi(r);
      if (!o)
        throw new Error("Empty input amount");
      e += o.amount;
    }
    const n = this.outputs.map(Gn);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: o, isNone: s, isSingle: c } = mf(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return wl.encode(1n);
    n = bt.encode(bt.decode(n).filter((y) => y !== "CODESEPARATOR"));
    let u = this.inputs.map(Zr).map((y, g) => ({
      ...y,
      finalScriptSig: g === e ? n : Pt
    }));
    o ? u = [u[e]] : (s || c) && (u = u.map((y, g) => ({
      ...y,
      sequence: g === e ? y.sequence : 0
    })));
    let f = this.outputs.map(Gn);
    s ? f = [] : c && (f = f.slice(0, e).fill(Ug).concat([f[e]]));
    const h = br.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: u,
      outputs: f
    });
    return Oe(h, hr.encode(r));
  }
  preimageWitnessV0(e, n, r, o) {
    const { isAny: s, isNone: c, isSingle: u } = mf(r);
    let f = li, h = li, y = li;
    const g = this.inputs.map(Zr), m = this.outputs.map(Gn);
    s || (f = Oe(...g.map(ua.encode))), !s && !u && !c && (h = Oe(...g.map((A) => Bt.encode(A.sequence)))), !u && !c ? y = Oe(...m.map(Jn.encode)) : u && e < m.length && (y = Oe(Jn.encode(m[e])));
    const E = g[e];
    return Oe(hr.encode(this.version), f, h, Lt(32, !0).encode(E.txid), Bt.encode(E.index), He.encode(n), gi.encode(o), Bt.encode(E.sequence), y, Bt.encode(this.lockTime), Bt.encode(r));
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
      hr.encode(this.version),
      Bt.encode(this.lockTime)
    ], y = r === Ct.DEFAULT ? Ct.ALL : r & 3, g = r & Ct.ANYONECANPAY, m = this.inputs.map(Zr), E = this.outputs.map(Gn);
    g !== Ct.ANYONECANPAY && h.push(...[
      m.map(ua.encode),
      o.map(gi.encode),
      n.map(He.encode),
      m.map((I) => Bt.encode(I.sequence))
    ].map((I) => Se(Bn(...I)))), y === Ct.ALL && h.push(Se(Bn(...E.map(Jn.encode))));
    const A = (f ? 1 : 0) | (c ? 2 : 0);
    if (h.push(new Uint8Array([A])), g === Ct.ANYONECANPAY) {
      const I = m[e];
      h.push(ua.encode(I), gi.encode(o[e]), He.encode(n[e]), Bt.encode(I.sequence));
    } else
      h.push(Bt.encode(e));
    return A & 1 && h.push(Se(He.encode(f || Pt))), y === Ct.SINGLE && h.push(e < E.length ? Se(Jn.encode(E[e])) : li), c && h.push(oo(c, u), Cn.encode(0), hr.encode(s)), pc("TapSighash", ...h);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], c = wf(s, this.opts.allowLegacyWitnessUtxo);
    if (!Ut(e)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const y = s.bip32Derivation.filter((m) => m[1].fingerprint == e.fingerprint).map(([m, { path: E }]) => {
        let A = e;
        for (const I of E)
          A = A.deriveChild(I);
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
    r ? r.forEach(Lg) : r = [c.defaultSighash];
    const u = c.sighash;
    if (!r.includes(u))
      throw new Error(`Input with not allowed sigHash=${u}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: f } = this.inputSighash(n);
    if (f === Ct.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const h = mi(s);
    if (c.txType === "taproot") {
      const y = this.inputs.map(mi), g = y.map((b) => b.script), m = y.map((b) => b.amount);
      let E = !1, A = hc(e), I = s.tapMerkleRoot || Pt;
      if (s.tapInternalKey) {
        const { pubKey: b, privKey: B } = Og(e, A, s.tapInternalKey, I), [O, D] = xl(s.tapInternalKey, I);
        if (Yt(O, b)) {
          const j = this.preimageWitnessV1(n, g, u, m), G = Bn(Du(j, B, o), u !== Ct.DEFAULT ? new Uint8Array([u]) : Pt);
          this.updateInput(n, { tapKeySig: G }, !0), E = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [b, B] of s.tapLeafScript) {
          const O = B.subarray(0, -1), D = bt.decode(O), j = B[B.length - 1], G = oo(O, j);
          if (D.findIndex((Q) => Ut(Q) && Yt(Q, A)) === -1)
            continue;
          const z = this.preimageWitnessV1(n, g, u, m, void 0, O, j), nt = Bn(Du(z, e, o), u !== Ct.DEFAULT ? new Uint8Array([u]) : Pt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: A, leafHash: G }, nt]] }, !0), E = !0;
        }
      }
      if (!E)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const y = dp(e);
      let g = !1;
      const m = bl(y);
      for (const I of bt.decode(c.lastScript))
        Ut(I) && (Yt(I, y) || Yt(I, m)) && (g = !0);
      if (!g)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let E;
      if (c.txType === "legacy")
        E = this.preimageLegacy(n, c.lastScript, u);
      else if (c.txType === "segwit") {
        let I = c.lastScript;
        c.last.type === "wpkh" && (I = fe.encode({ type: "pkh", hash: c.last.hash })), E = this.preimageWitnessV0(n, I, u, h.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const A = hp(E, e, this.opts.lowR);
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
    const n = this.inputs[e], r = wf(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const f = n.tapLeafScript.sort((h, y) => Nn.encode(h[0]).length - Nn.encode(y[0]).length);
        for (const [h, y] of f) {
          const g = y.slice(0, -1), m = y[y.length - 1], E = fe.decode(g), A = oo(g, m), I = n.tapScriptSig.filter((B) => Yt(B[0].leafHash, A));
          let b = [];
          if (E.type === "tr_ms") {
            const B = E.m, O = E.pubkeys;
            let D = 0;
            for (const j of O) {
              const G = I.findIndex((W) => Yt(W[0].pubKey, j));
              if (D === B || G === -1) {
                b.push(Pt);
                continue;
              }
              b.push(I[G][1]), D++;
            }
            if (D !== B)
              continue;
          } else if (E.type === "tr_ns") {
            for (const B of E.pubkeys) {
              const O = I.findIndex((D) => Yt(D[0].pubKey, B));
              O !== -1 && b.push(I[O][1]);
            }
            if (b.length !== E.pubkeys.length)
              continue;
          } else if (E.type === "unknown" && this.opts.allowUnknownInputs) {
            const B = bt.decode(g);
            if (b = I.map(([{ pubKey: O }, D]) => {
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
                const G = O.finalizeTaproot(g, j, I);
                if (G) {
                  n.finalScriptWitness = G.concat(Nn.encode(h)), n.finalScriptSig = Pt, ca(n);
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
      n.finalScriptSig = Pt, ca(n);
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
    c && (n.finalScriptSig = c), u && (n.finalScriptWitness = u), ca(n);
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
    const n = this.global.unsignedTx ? to.encode(this.global.unsignedTx) : Pt, r = e.global.unsignedTx ? to.encode(e.global.unsignedTx) : Pt;
    if (!Yt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Fa($c, this.global, e.global, void 0, this.opts.allowUnknown);
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
const Ma = Ie(Lt(null), (t) => Ar(t, xe.ecdsa)), Di = Ie(Lt(32), (t) => Ar(t, xe.schnorr)), bf = Ie(Lt(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), ss = se({
  fingerprint: sp,
  path: Te(null, Bt)
}), sd = se({
  hashes: Te(Ve, Lt(32)),
  der: ss
}), Kg = Lt(78), Dg = se({ pubKey: Di, leafHash: Lt(32) }), Mg = se({
  version: Cn,
  // With parity :(
  internalKey: Lt(32),
  merklePath: Te(null, Lt(32))
}), Nn = Ie(Mg, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), Hg = Te(null, se({
  depth: Cn,
  version: Cn,
  script: He
})), Wt = Lt(null), vf = Lt(20), Xr = Lt(32), $c = {
  unsignedTx: [0, !1, to, [0], [0], !1],
  xpub: [1, Kg, ss, [], [0, 2], !1],
  txVersion: [2, !1, Bt, [2], [2], !1],
  fallbackLocktime: [3, !1, Bt, [], [2], !1],
  inputCount: [4, !1, Ve, [2], [2], !1],
  outputCount: [5, !1, Ve, [2], [2], !1],
  txModifiable: [6, !1, Cn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Bt, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, as = {
  nonWitnessUtxo: [0, !1, br, [], [0, 2], !1],
  witnessUtxo: [1, !1, Jn, [], [0, 2], !1],
  partialSig: [2, Ma, Wt, [], [0, 2], !1],
  sighashType: [3, !1, Bt, [], [0, 2], !1],
  redeemScript: [4, !1, Wt, [], [0, 2], !1],
  witnessScript: [5, !1, Wt, [], [0, 2], !1],
  bip32Derivation: [6, Ma, ss, [], [0, 2], !1],
  finalScriptSig: [7, !1, Wt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Uc, [], [0, 2], !1],
  porCommitment: [9, !1, Wt, [], [0, 2], !1],
  ripemd160: [10, vf, Wt, [], [0, 2], !1],
  sha256: [11, Xr, Wt, [], [0, 2], !1],
  hash160: [12, vf, Wt, [], [0, 2], !1],
  hash256: [13, Xr, Wt, [], [0, 2], !1],
  txid: [14, !1, Xr, [2], [2], !0],
  index: [15, !1, Bt, [2], [2], !0],
  sequence: [16, !1, Bt, [], [2], !0],
  requiredTimeLocktime: [17, !1, Bt, [], [2], !1],
  requiredHeightLocktime: [18, !1, Bt, [], [2], !1],
  tapKeySig: [19, !1, bf, [], [0, 2], !1],
  tapScriptSig: [20, Dg, bf, [], [0, 2], !1],
  tapLeafScript: [21, Nn, Wt, [], [0, 2], !1],
  tapBip32Derivation: [22, Xr, sd, [], [0, 2], !1],
  tapInternalKey: [23, !1, Di, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Xr, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, Fg = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Vg = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Mi = {
  redeemScript: [0, !1, Wt, [], [0, 2], !1],
  witnessScript: [1, !1, Wt, [], [0, 2], !1],
  bip32Derivation: [2, Ma, ss, [], [0, 2], !1],
  amount: [3, !1, op, [2], [2], !0],
  script: [4, !1, Wt, [2], [2], !0],
  tapInternalKey: [5, !1, Di, [], [0, 2], !1],
  tapTree: [6, !1, Hg, [], [0, 2], !1],
  tapBip32Derivation: [7, Di, sd, [], [0, 2], !1],
  proprietary: [252, Wt, Wt, [], [0, 2], !1]
}, qg = [], Ef = Te(dl, se({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: ap(Ve, se({ type: Ve, key: Lt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Lt(Ve)
}));
function Ha(t) {
  const [e, n, r, o, s, c] = t;
  return { type: e, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: c };
}
se({ type: Ve, key: Lt(null) });
function Oc(t) {
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
          y.sort((g, m) => Bi(g[0], m[0]));
          for (const [g, m] of y)
            o.push({ key: { key: g, type: u }, value: m });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, c) => Bi(s[0].key, c[0].key));
        for (const [s, c] of r.unknown)
          o.push({ key: s, value: c });
      }
      Ef.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Ef.decodeStream(n), o = {}, s = {};
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
const Lc = Ie(Oc(as), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      Ar(e, xe.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Ar(e, xe.ecdsa);
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
    const n = jt.fromRaw(br.encode(t.nonWitnessUtxo), {
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    }), r = _t.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), Pc = Ie(Oc(Mi), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Ar(e, xe.ecdsa);
  return t;
}), ad = Ie(Oc($c), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), jg = se({
  magic: dc(lc(new Uint8Array([255])), "psbt"),
  global: ad,
  inputs: Te("global/unsignedTx/inputs/length", Lc),
  outputs: Te(null, Pc)
}), zg = se({
  magic: dc(lc(new Uint8Array([255])), "psbt"),
  global: ad,
  inputs: Te("global/inputCount", Lc),
  outputs: Te("global/outputCount", Pc)
});
se({
  magic: dc(lc(new Uint8Array([255])), "psbt"),
  items: Te(null, Rn(Te(dl, lp([cp(Ve), Lt(is)])), Zi.dict()))
});
function fa(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: o } = Ha(e[r]);
    if (!o.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: o } = Ha(e[r]);
    if (o.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function xf(t, e, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!e[s])
        continue;
      const { allowInc: c, silentIgnore: u } = Ha(e[s]);
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
  fa(e, $c, t.global);
  for (const c of t.inputs)
    fa(e, as, c);
  for (const c of t.outputs)
    fa(e, Mi, c);
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
function Fa(t, e, n, r, o) {
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
        const A = {}, I = (b, B, O) => {
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
          I(O, b, B);
        }
        for (const [b, B] of E) {
          const O = _t.encode(h.encode(b));
          if (B === void 0) {
            if (g)
              throw new Error(`Cannot remove signed field=${u}/${b}`);
            delete A[O];
          } else
            I(O, b, B);
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
const Sf = Ie(jg, cd), Af = Ie(zg, cd), Gg = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Ut(t[1]) || _t.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: bt.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, _t.decode("4e73")];
  }
};
function gr(t, e) {
  try {
    return Ar(t, e), !0;
  } catch {
    return !1;
  }
}
const Wg = {
  encode(t) {
    if (!(t.length !== 2 || !Ut(t[0]) || !gr(t[0], xe.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Yg = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Ut(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Zg = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Ut(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, Xg = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Ut(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Qg = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Ut(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Jg = {
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
}, ty = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Ut(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, ey = {
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
}, ny = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Bg(t[e - 1]);
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
}, ry = {
  encode(t) {
    return { type: "unknown", script: bt.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? bt.decode(t.script) : void 0
}, oy = [
  Gg,
  Wg,
  Yg,
  Zg,
  Xg,
  Qg,
  Jg,
  ty,
  ey,
  ny,
  ry
], iy = Rn(bt, Zi.match(oy)), fe = Ie(iy, (t) => {
  if (t.type === "pk" && !gr(t.pubkey, xe.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Ut(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Ut(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Ut(t.pubkey) || !gr(t.pubkey, xe.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!gr(n, xe.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!gr(e, xe.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function kf(t, e) {
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
    r.type === "wsh" && n && kf(r, n);
  }
  if (e) {
    const r = fe.decode(e);
    r.type === "wsh" && n && kf(r, n);
  }
}
function sy(t) {
  const e = {};
  for (const n of t) {
    const r = _t.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(_t.encode)}`);
    e[r] = !0;
  }
}
function ay(t, e, n = !1, r) {
  const o = fe.decode(t);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const c of s.pubkeys) {
      if (Yt(c, gc))
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
function Va(t, e = []) {
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
    left: Va(t.left, [t.right.hash, ...e]),
    right: Va(t.right, [t.left.hash, ...e])
  };
}
function qa(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...qa(t.left), ...qa(t.right)];
}
function ja(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: f, script: h } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !Yt(t.tapMerkleRoot, Pt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const y = typeof h == "string" ? _t.decode(h) : h;
    if (!Ut(y))
      throw new Error(`checkScript: wrong script type=${y}`);
    return ay(y, e, n), {
      type: "leaf",
      version: f,
      script: y,
      hash: oo(y, f)
    };
  }
  if (t.length !== 2 && (t = fd(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = ja(t[0], e, n), s = ja(t[1], e, n);
  let [c, u] = [o.hash, s.hash];
  return Bi(u, c) === -1 && ([c, u] = [u, c]), { type: "branch", left: o, right: s, hash: pc("TapBranch", c, u) };
}
const Hi = 192, oo = (t, e = Hi) => pc("TapLeaf", new Uint8Array([e]), He.encode(t));
function ld(t, e, n = kr, r = !1, o) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof t == "string" ? _t.decode(t) : t || gc;
  if (!gr(s, xe.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let c = e ? Va(ja(e, s, r)) : void 0;
  const u = c ? c.hash : void 0, [f, h] = xl(s, u || Pt);
  let y;
  c && (y = qa(c).map((E) => ({
    ...E,
    controlBlock: Nn.encode({
      version: (E.version || Hi) + h,
      internalKey: s,
      merklePath: E.path
    })
  })));
  let g;
  y && (g = y.map((E) => [
    Nn.decode(E.controlBlock),
    Bn(E.script, new Uint8Array([E.version || Hi]))
  ]));
  const m = {
    type: "tr",
    script: fe.encode({ type: "tr", pubkey: f }),
    address: wo(n).encode({ type: "tr", pubkey: f }),
    // For tests
    tweakedPubkey: f,
    // PSBT stuff
    tapInternalKey: s
  };
  return y && (m.leaves = y), g && (m.tapLeafScript = g), u && (m.tapMerkleRoot = u), m;
}
function cy(t, e, n = !1) {
  return n || sy(e), {
    type: "tr_ms",
    script: fe.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const dd = zh(Se);
function hd(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function la(t, e, n = kr) {
  hd(t, e);
  const r = t === 0 ? ka : ll;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Tf(t, e) {
  return dd.encode(Bn(Uint8Array.from(e), t));
}
function wo(t = kr) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return la(0, e.hash, t);
      if (n === "wsh")
        return la(0, e.hash, t);
      if (n === "tr")
        return la(1, e.pubkey, t);
      if (n === "pkh")
        return Tf(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Tf(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = ka.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ll.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, c = ka.fromWords(s);
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
const uy = new Ot("leaf not found in tx tree"), fy = new Ot("parent not found");
class ly {
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
      throw uy;
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
    throw fy;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = jt.fromPSBT(Ee.decode(n.tx)), o = ht.encode(Oe(r.toBytes(!0)).reverse());
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
const da = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function dy(t) {
  if (t.length < da.length)
    return !1;
  for (let e = 0; e < da.length; e++)
    if (t[e] !== da[e])
      return !1;
  return !0;
}
function pd(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    dy(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const ha = new Error("missing vtxo tree");
class mo {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = vl();
    return new mo(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return po.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw ha;
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
      throw ha;
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
      throw ha;
    const e = [], n = po.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const o = [];
      for (let s = 0; s < r.length; s++) {
        const c = xp(n);
        o.push(c);
      }
      e.push(o);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw mo.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const o = this.myNonces[n][r];
    if (!o)
      return null;
    const s = this.aggregateNonces[n][r];
    if (!s)
      throw new Error("missing aggregate nonce");
    const c = [], u = [], f = pd(e), { finalKey: h } = Nc(f, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let g = 0; g < e.inputsLength; g++) {
      const m = hy(h, this.tree, this.rootSharedOutputAmount, e);
      c.push(m.amount), u.push(m.script);
    }
    const y = e.preimageWitnessV1(
      0,
      // always first input
      u,
      yo.DEFAULT,
      c
    );
    return Ag(o.secNonce, this.secretKey, s.pubNonce, f, y, {
      taprootTweak: this.scriptRoot
    });
  }
}
mo.NOT_INITIALIZED = new Error("session not initialized, call init method");
function hy(t, e, n, r) {
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
const If = new Uint8Array(32).fill(0);
class Fi {
  constructor(e) {
    this.key = e || vl();
  }
  static fromPrivateKey(e) {
    return new Fi(e);
  }
  static fromHex(e) {
    return new Fi(ht.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, If))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, void 0, If))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  xOnlyPublicKey() {
    return hc(this.key);
  }
  signerSession() {
    return mo.random();
  }
}
class No {
  constructor(e, n, r) {
    if (this.serverPubKey = e, this.tweakedPubKey = n, this.hrp = r, e.length !== 32)
      throw new Error("Invalid server public key length");
    if (n.length !== 32)
      throw new Error("Invalid tweaked public key length");
  }
  static decode(e) {
    const n = ai.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(ai.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const o = r.slice(0, 32), s = r.slice(32, 64);
    return new No(o, s, n.prefix);
  }
  encode() {
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = ai.toWords(e);
    return ai.encode(this.hrp, n, 1023);
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
    qe,
    yn,
    Vi,
    qi,
    bo
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${ht.encode(t)} is not a valid tapscript`);
}
var qe;
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
        script: cy(u.pubkeys.length, u.pubkeys).script,
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
})(qe || (qe = {}));
var yn;
(function(t) {
  function e(o) {
    for (const h of o.pubkeys)
      if (h.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
    const c = [Ur().encode(BigInt(pf.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], u = qe.encode(o), f = new Uint8Array([
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
      f = qe.decode(u);
    } catch (E) {
      throw new Error(`Invalid multisig script: ${E instanceof Error ? E.message : String(E)}`);
    }
    const h = Number(Ur().decode(c)), y = pf.decode(h), g = y.blocks !== void 0 ? { type: "blocks", value: BigInt(y.blocks) } : { type: "seconds", value: BigInt(y.seconds) }, m = e({
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
var Vi;
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
})(Vi || (Vi = {}));
var qi;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...bt.encode(["VERIFY"]),
      ...qe.encode(o).script
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
      h = qe.decode(f);
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
})(qi || (qi = {}));
var bo;
(function(t) {
  function e(o) {
    const c = [Ur().encode(o.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], u = bt.encode(c), f = new Uint8Array([
      ...u,
      ...qe.encode(o).script
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
      f = qe.decode(u);
    } catch (g) {
      throw new Error(`Invalid multisig script: ${g instanceof Error ? g.message : String(g)}`);
    }
    const h = Ur().decode(c), y = e({
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
})(bo || (bo = {}));
function Kc(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Rr {
  static decode(e) {
    return new Rr(e.map(ht.decode));
  }
  constructor(e) {
    this.scripts = e;
    const n = fd(e.map((o) => ({ script: o, leafVersion: Hi }))), r = ld(gc, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return this.scripts.map(ht.encode);
  }
  address(e, n) {
    return new No(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return bt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return wo(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => ht.encode(Kc(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
}
var Bf;
(function(t) {
  class e extends Rr {
    constructor(r) {
      const { sender: o, receiver: s, server: c, preimageHash: u, refundLocktime: f, unilateralClaimDelay: h, unilateralRefundDelay: y, unilateralRefundWithoutReceiverDelay: g } = r, m = py(u), E = qi.encode({
        conditionScript: m,
        pubkeys: [s, c]
      }).script, A = qe.encode({
        pubkeys: [o, s, c]
      }).script, I = bo.encode({
        absoluteTimelock: f,
        pubkeys: [o, c]
      }).script, b = Vi.encode({
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
        I,
        b,
        B,
        O
      ]), this.options = r, this.claimScript = ht.encode(E), this.refundScript = ht.encode(A), this.refundWithoutReceiverScript = ht.encode(I), this.unilateralClaimScript = ht.encode(b), this.unilateralRefundScript = ht.encode(B), this.unilateralRefundWithoutReceiverScript = ht.encode(O);
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
})(Bf || (Bf = {}));
function py(t) {
  return bt.encode(["HASH160", t, "EQUAL"]);
}
var vo;
(function(t) {
  class e extends Rr {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, u = qe.encode({
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
})(vo || (vo = {}));
var Eo;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(Eo || (Eo = {}));
function gy(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function yy(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function wy(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function di(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function my(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function yd(t, e, n) {
  const r = [];
  let o = [...e];
  for (const c of [...t, ...e]) {
    if (c.virtualStatus.state !== "pending" && n.has(c.virtualStatus.batchTxID || ""))
      continue;
    const u = gy(o, c);
    o = _f(o, u);
    const f = di(u);
    if (c.value <= f)
      continue;
    const h = yy(o, c);
    o = _f(o, h);
    const y = di(h);
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
      type: Eo.TxReceived,
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
    const f = wy([...t, ...e], c), h = di(f), y = di(u);
    if (y <= h)
      continue;
    const g = my(f, u), m = {
      roundTxid: g.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    g.virtualStatus.state === "pending" && (m.redeemTxid = g.txid), r.push({
      key: m,
      amount: y - h,
      type: Eo.TxSent,
      createdAt: g.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function _f(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var za;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(za || (za = {}));
class Nf {
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
      throw new Error(za.INVALID_URI);
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
function by(t, e) {
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
function vy(t, e) {
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
const Ey = (t) => xy[t], xy = {
  bitcoin: Qr(kr, "ark"),
  testnet: Qr(si, "tark"),
  signet: Qr(si, "tark"),
  mutinynet: Qr(si, "tark"),
  regtest: Qr({
    ...si,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Qr(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const Sy = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Ay {
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
      spendableVtxos: [...o.spendableVtxos || []].map(hi),
      spentVtxos: [...o.spentVtxos || []].map(hi)
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
        treeNonces: Iy(r)
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
        treeSignatures: By(r)
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
                  newVtxos: (E.result.newVtxos || []).map(hi),
                  spentVtxos: (E.result.spentVtxos || []).map(hi)
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
    })), new ly(e.levels.map((r) => r.nodes.map((o) => ({
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
      treeNonces: Ty(ht.decode(e.roundSigningNoncesGenerated.treeNonces))
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
function ky(t, e) {
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
function Ty(t) {
  return ky(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function Iy(t) {
  return ht.encode(md(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function By(t) {
  return ht.encode(md(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function hi(t) {
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
function _y({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: o, vtxoPkScript: s, connectorPkScript: c, serverPkScript: u, txLocktime: f }) {
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
    sighashType: yo.DEFAULT
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
    return this.hasWitness && (s += Kt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Ny(s);
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
const Ny = (t) => {
  const e = BigInt(Math.ceil(t / Kt.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, Cy = new Ot("invalid settlement transaction"), Ga = new Ot("invalid settlement transaction outputs"), bd = new Ot("empty tree"), Uy = new Ot("invalid root level"), Dc = new Ot("invalid number of inputs"), io = new Ot("wrong settlement txid"), Wa = new Ot("invalid amount"), Ry = new Ot("no leaves"), $y = new Ot("node transaction empty"), Oy = new Ot("node txid empty"), Ly = new Ot("node parent txid empty"), Py = new Ot("node txid different"), Cf = new Ot("parent txid input mismatch"), Ky = new Ot("leaf node has children"), Uf = new Ot("invalid taproot script"), Dy = new Ot("invalid internal key");
new Ot("invalid control block");
const My = new Ot("invalid root transaction"), Hy = new Ot("invalid node transaction"), pa = 0, Rf = 1;
function Fy(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw bd;
  const r = jt.fromPSBT(Ee.decode(n.tx));
  if (r.inputsLength !== 1)
    throw Dc;
  const o = r.getInput(0), s = jt.fromPSBT(Ee.decode(t));
  if (s.outputsLength <= Rf)
    throw Ga;
  const c = ht.encode(Oe(s.toBytes(!0)).reverse());
  if (!o.txid || ht.encode(o.txid) !== c || o.index !== Rf)
    throw io;
}
function Vy(t, e, n) {
  e.validate();
  let r;
  try {
    r = jt.fromPSBT(Ee.decode(t));
  } catch {
    throw Cy;
  }
  if (r.outputsLength <= pa)
    throw Ga;
  const o = r.getOutput(pa);
  if (!(o != null && o.amount))
    throw Ga;
  const s = o.amount;
  if (e.numberOfNodes() === 0)
    throw bd;
  if (e.levels[0].length !== 1)
    throw Uy;
  const u = e.levels[0][0];
  let f;
  try {
    f = jt.fromPSBT(Ee.decode(u.tx));
  } catch {
    throw My;
  }
  if (f.inputsLength !== 1)
    throw Dc;
  const h = f.getInput(0);
  if (!h.txid || h.index === void 0)
    throw io;
  const y = ht.encode(Oe(r.toBytes(!0)).reverse());
  if (ht.encode(h.txid) !== y || h.index !== pa)
    throw io;
  let g = 0n;
  for (let m = 0; m < f.outputsLength; m++) {
    const E = f.getOutput(m);
    E != null && E.amount && (g += E.amount);
  }
  if (g >= s)
    throw Wa;
  if (e.leaves().length === 0)
    throw Ry;
  for (const m of e.levels)
    for (const E of m)
      qy(e, E, n);
}
function qy(t, e, n) {
  if (!e.tx)
    throw $y;
  if (!e.txid)
    throw Oy;
  if (!e.parentTxid)
    throw Ly;
  let r;
  try {
    r = jt.fromPSBT(Ee.decode(e.tx));
  } catch {
    throw Hy;
  }
  if (ht.encode(Oe(r.toBytes(!0)).reverse()) !== e.txid)
    throw Py;
  if (r.inputsLength !== 1)
    throw Dc;
  const s = r.getInput(0);
  if (!s.txid || ht.encode(s.txid) !== e.parentTxid)
    throw Cf;
  const c = t.children(e.txid);
  if (e.leaf && c.length >= 1)
    throw Ky;
  for (let u = 0; u < c.length; u++) {
    const f = c[u], h = jt.fromPSBT(Ee.decode(f.tx)), y = r.getOutput(u);
    if (!(y != null && y.script))
      throw Uf;
    const g = y.script.slice(2);
    if (g.length !== 32)
      throw Uf;
    const m = pd(h), { finalKey: E } = Nc(m, !0, {
      taprootTweak: n
    });
    if (ht.encode(E) !== ht.encode(g.slice(2)))
      throw Dy;
    let A = 0n;
    for (let I = 0; I < h.outputsLength; I++) {
      const b = h.getOutput(I);
      b != null && b.amount && (A += b.amount);
    }
    if (!y.amount || A >= y.amount)
      throw Wa;
  }
}
const jy = 255;
new TextEncoder().encode("condition");
const zy = new TextEncoder().encode("taptree");
function Gy(t, e, n) {
  var r;
  e.updateInput(t, {
    unknown: [
      ...((r = e.getInput(t)) == null ? void 0 : r.unknown) ?? [],
      [
        {
          type: jy,
          key: zy
        },
        Yy(n)
      ]
    ]
  });
}
function Wy(t, e) {
  let n;
  for (const o of t) {
    const s = gd(Kc(o.tapLeafScript));
    bo.is(s) && (n = Number(s.params.absoluteTimelock));
  }
  const r = new jt({
    allowUnknown: !0,
    lockTime: n
  });
  for (const [o, s] of t.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Rc - 1 : void 0,
      witnessUtxo: {
        script: Rr.decode(s.scripts).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Gy(o, r, s.scripts.map(ht.decode));
  for (const o of e)
    r.addOutput({
      amount: o.amount,
      script: No.decode(o.address).pkScript
    });
  return r;
}
function Yy(t) {
  const e = [];
  e.push($f(t.length));
  for (const s of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push($f(s.length)), e.push(s);
  const n = e.reduce((s, c) => s + c.length, 0), r = new Uint8Array(n);
  let o = 0;
  for (const s of e)
    r.set(s, o), o += s.length;
  return r;
}
function $f(t) {
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
class Mc {
  constructor(e, n) {
    this.id = e, this.value = n;
  }
  encode() {
    const e = new Uint8Array(12);
    return Zy(e, this.id, 0), Qy(e, this.value, 8), e;
  }
  static decode(e) {
    if (e.length !== 12)
      throw new Error(`invalid data length: expected 12 bytes, got ${e.length}`);
    const n = Xy(e, 0), r = Jy(e, 8);
    return new Mc(n, r);
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
    const n = Mc.decode(e.subarray(0, 12)), r = e.subarray(12);
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
    const r = Fu.decode(n);
    if (r.length === 0)
      throw new Error("failed to decode base58 string");
    return ln.decode(new Uint8Array(r));
  }
  toString() {
    return ln.HRP + Fu.encode(this.encode());
  }
}
ln.HRP = "arknote";
function Zy(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 8).setBigUint64(0, e, !1);
}
function Xy(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 8).getBigUint64(0, !1);
}
function Qy(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function Jy(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
class pn {
  constructor(e, n, r, o, s, c, u, f) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = o, this.arkProvider = s, this.arkServerPublicKey = c, this.offchainTapscript = u, this.boardingTapscript = f;
  }
  static async create(e) {
    const n = Ey(e.network), r = new Ay(e.esploraUrl || Sy[e.network]), o = e.identity.xOnlyPublicKey();
    if (!o)
      throw new Error("Invalid configured public key");
    let s;
    e.arkServerUrl && (s = new wd(e.arkServerUrl));
    const c = ld(o, void 0, n);
    if (s) {
      let u = e.arkServerPublicKey, f = e.exitTimelock, h = e.boardingTimelock;
      if (!u || !f) {
        const A = await s.getInfo();
        u = A.pubkey, f = {
          value: A.unilateralExitDelay,
          type: A.unilateralExitDelay < 512n ? "blocks" : "seconds"
        }, h = {
          value: A.unilateralExitDelay * 2n,
          type: A.unilateralExitDelay * 2n < 512n ? "blocks" : "seconds"
        };
      }
      const y = ht.decode(u).slice(1), g = new vo.Script({
        pubKey: o,
        serverPubKey: y,
        csvTimelock: f
      }), m = new vo.Script({
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
      bip21: Nf.create({
        address: this.onchainAddress
      })
    };
    if (this.arkProvider && this.offchainTapscript && this.boardingTapscript && this.arkServerPublicKey) {
      const n = this.offchainAddress.encode();
      e.offchain = n, e.bip21 = Nf.create({
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
        type: Eo.TxReceived,
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
      return No.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || pn.FEE_RATE, o = Math.ceil(174 * r), s = e.amount + o, c = by(n, s);
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
    const r = await this.getVirtualCoins(), o = n ? 0 : Math.ceil(174 * (e.feeRate || pn.FEE_RATE)), s = e.amount + o, c = vy(r, s);
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
    let y = Wy(c.inputs.map((m) => ({
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
      g += m.reduce((I, b) => I + b.value, 0);
      const E = await this.getVtxos();
      g += E.reduce((I, b) => I + b.value, 0);
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
      }).script, I = oo(A);
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
              await this.handleSettlementSigningEvent(b, I, s);
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
    Vy(e.unsignedSettlementTx, o, n);
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
    const o = wo(this.network).decode(r.forfeitAddress), s = fe.encode(o), c = [], u = await this.getVirtualCoins();
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
      y || (Fy(e.roundTx, e.connectors), y = !0);
      const E = Nn.encode(g.tapLeafScript[0]), A = gd(Kc(g.tapLeafScript)), I = Kt.create().addKeySpendInput().addTapscriptInput(
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
      let D = _y({
        connectorInput: B,
        connectorAmount: O.amount,
        feeAmount: I,
        serverPkScript: s,
        connectorPkScript: O.script,
        vtxoAmount: BigInt(m.value),
        vtxoInput: g,
        vtxoPkScript: Rr.decode(g.scripts).pkScript
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
  t.walletInitialized = (V) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: V
  });
  function e(V, Y) {
    return {
      type: "ERROR",
      success: !1,
      message: Y,
      id: V
    };
  }
  t.error = e;
  function n(V, Y) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: Y,
      id: V
    };
  }
  t.settleEvent = n;
  function r(V, Y) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: Y,
      id: V
    };
  }
  t.settleSuccess = r;
  function o(V) {
    return V.type === "SETTLE_SUCCESS" && V.success;
  }
  t.isSettleSuccess = o;
  function s(V) {
    return V.type === "ADDRESS" && V.success === !0;
  }
  t.isAddress = s;
  function c(V, Y) {
    return {
      type: "ADDRESS",
      success: !0,
      addresses: Y,
      id: V
    };
  }
  t.addresses = c;
  function u(V) {
    return V.type === "ADDRESS_INFO" && V.success === !0;
  }
  t.isAddressInfo = u;
  function f(V, Y) {
    return {
      type: "ADDRESS_INFO",
      success: !0,
      addressInfo: Y,
      id: V
    };
  }
  t.addressInfo = f;
  function h(V) {
    return V.type === "BALANCE" && V.success === !0;
  }
  t.isBalance = h;
  function y(V, Y) {
    return {
      type: "BALANCE",
      success: !0,
      balance: Y,
      id: V
    };
  }
  t.balance = y;
  function g(V) {
    return V.type === "COINS" && V.success === !0;
  }
  t.isCoins = g;
  function m(V, Y) {
    return {
      type: "COINS",
      success: !0,
      coins: Y,
      id: V
    };
  }
  t.coins = m;
  function E(V) {
    return V.type === "VTXOS" && V.success === !0;
  }
  t.isVtxos = E;
  function A(V, Y) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: Y,
      id: V
    };
  }
  t.vtxos = A;
  function I(V) {
    return V.type === "VIRTUAL_COINS" && V.success === !0;
  }
  t.isVirtualCoins = I;
  function b(V, Y) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: Y,
      id: V
    };
  }
  t.virtualCoins = b;
  function B(V) {
    return V.type === "BOARDING_UTXOS" && V.success === !0;
  }
  t.isBoardingUtxos = B;
  function O(V, Y) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: Y,
      id: V
    };
  }
  t.boardingUtxos = O;
  function D(V) {
    return V.type === "SEND_BITCOIN_SUCCESS" && V.success === !0;
  }
  t.isSendBitcoinSuccess = D;
  function j(V, Y) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: Y,
      id: V
    };
  }
  t.sendBitcoinSuccess = j;
  function G(V) {
    return V.type === "TRANSACTION_HISTORY" && V.success === !0;
  }
  t.isTransactionHistory = G;
  function W(V, Y) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: Y,
      id: V
    };
  }
  t.transactionHistory = W;
  function z(V) {
    return V.type === "WALLET_STATUS" && V.success === !0;
  }
  t.isWalletStatus = z;
  function nt(V, Y) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: Y
      },
      id: V
    };
  }
  t.walletStatus = nt;
  function Q(V) {
    return V.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = Q;
  function wt(V, Y) {
    return {
      type: "CLEAR_RESPONSE",
      success: Y,
      id: V
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
class tw {
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
      const r = [...n.exit, ...n.forfeit], s = vo.Script.decode(r).findLeaf(n.forfeit[0]), c = new AbortController(), u = this.arkProvider.subscribeForAddress(e, c.signal);
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
        identity: Fi.fromHex(n.privateKey),
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
      const u = await this.wallet.getCoins(), f = u.filter((b) => b.status.confirmed).reduce((b, B) => b + B.value, 0), h = u.filter((b) => !b.status.confirmed).reduce((b, B) => b + B.value, 0), y = f + h, g = await this.vtxoRepository.getSpendableVtxos(), m = g.reduce((b, B) => B.virtualStatus.state === "settled" ? b + B.value : b, 0), E = g.reduce((b, B) => B.virtualStatus.state === "pending" ? b + B.value : b, 0), A = g.reduce((b, B) => B.virtualStatus.state === "swept" ? b + B.value : b, 0), I = m + E + A;
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
          total: I
        },
        total: y + I
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
var bi = { exports: {} }, ew = bi.exports, Of;
function nw() {
  return Of || (Of = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(ew, function() {
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
      var s = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : kg, c = Object.keys, u = Array.isArray;
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
      function I(i) {
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
      var Ln = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(wt([8, 16, 32, 64].map(function(i) {
        return ["Int", "Uint", "Float"].map(function(a) {
          return a + i + "Array";
        });
      }))).filter(function(i) {
        return s[i];
      }), V = new Set(Ln.map(function(i) {
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
          } else if (V.has(l.constructor)) d = l;
          else {
            var v, x = h(l);
            for (v in d = x === Object.prototype ? {} : Object.create(x), Y.set(l, d), l) g(l, v) && (d[v] = a(l[v]));
          }
          return d;
        }(i), Y = null, i;
      }
      var M = {}.toString;
      function F(i) {
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
      }, Or = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], Ue = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Or), Dt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
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
      function Rt(i, a) {
        this.name = "BulkError", this.failures = Object.keys(a).map(function(l) {
          return a[l];
        }), this.failuresByPos = a, this.message = kt(i, this.failures);
      }
      I(It).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), I(Xt).from(It), I(Rt).from(It);
      var Ke = Ue.reduce(function(i, a) {
        return i[a] = a + "Error", i;
      }, {}), ae = It, at = Ue.reduce(function(i, a) {
        var l = a + "Error";
        function d(p, w) {
          this.name = l, p ? typeof p == "string" ? (this.message = "".concat(p).concat(w ? `
 ` + w : ""), this.inner = w || null) : typeof p == "object" && (this.message = "".concat(p.name, " ").concat(p.message), this.inner = p) : (this.message = Dt[a] || l, this.inner = null);
        }
        return I(d).from(ae), i[a] = d, i;
      }, {});
      at.Syntax = SyntaxError, at.Type = TypeError, at.Range = RangeError;
      var je = Or.reduce(function(i, a) {
        return i[a + "Error"] = at[a], i;
      }, {}), le = Ue.reduce(function(i, a) {
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
      function cs(i, a) {
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
      le.ModifyError = Xt, le.DexieError = It, le.BulkError = Rt;
      var ze = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Fc(i) {
        ze = i;
      }
      var $r = {}, Vc = 100, Ln = typeof Promise > "u" ? [] : function() {
        var i = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [i, h(i), i];
        var a = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [a, h(a), i];
      }(), Or = Ln[0], Ue = Ln[1], Ln = Ln[2], Ue = Ue && Ue.then, Pn = Or && Or.constructor, us = !!Ln, Lr = function(i, a) {
        Pr.push([i, a]), Co && (queueMicrotask(kd), Co = !1);
      }, fs = !0, Co = !0, Kn = [], Uo = [], ls = ce, wn = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: pt, pgp: !1, env: {}, finalize: pt }, ut = wn, Pr = [], Dn = 0, Ro = [];
      function it(i) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var a = this._PSD = ut;
        if (typeof i != "function") {
          if (i !== $r) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && hs(this, this._value));
        }
        this._state = null, this._value = null, ++a.ref, function l(d, p) {
          try {
            p(function(w) {
              if (d._state === null) {
                if (w === d) throw new TypeError("A promise cannot be resolved with itself.");
                var v = d._lib && rr();
                w && typeof w.then == "function" ? l(d, function(x, k) {
                  w instanceof it ? w._then(x, k) : w.then(x, k);
                }) : (d._state = !0, d._value = w, jc(d)), v && or();
              }
            }, hs.bind(null, d));
          } catch (w) {
            hs(d, w);
          }
        }(this, i);
      }
      var ds = { get: function() {
        var i = ut, a = Po;
        function l(d, p) {
          var w = this, v = !i.global && (i !== ut || a !== Po), x = v && !bn(), k = new it(function(_, U) {
            ps(w, new qc(Gc(d, i, v, x), Gc(p, i, v, x), _, U, i));
          });
          return this._consoleTask && (k._consoleTask = this._consoleTask), k;
        }
        return l.prototype = $r, l;
      }, set: function(i) {
        A(this, "then", i && i.prototype === $r ? ds : { get: function() {
          return i;
        }, set: ds.set });
      } };
      function qc(i, a, l, d, p) {
        this.onFulfilled = typeof i == "function" ? i : null, this.onRejected = typeof a == "function" ? a : null, this.resolve = l, this.reject = d, this.psd = p;
      }
      function hs(i, a) {
        var l, d;
        Uo.push(a), i._state === null && (l = i._lib && rr(), a = ls(a), i._state = !1, i._value = a, d = i, Kn.some(function(p) {
          return p._value === d._value;
        }) || Kn.push(d), jc(i), l && or());
      }
      function jc(i) {
        var a = i._listeners;
        i._listeners = [];
        for (var l = 0, d = a.length; l < d; ++l) ps(i, a[l]);
        var p = i._PSD;
        --p.ref || p.finalize(), Dn === 0 && (++Dn, Lr(function() {
          --Dn == 0 && gs();
        }, []));
      }
      function ps(i, a) {
        if (i._state !== null) {
          var l = i._state ? a.onFulfilled : a.onRejected;
          if (l === null) return (i._state ? a.resolve : a.reject)(i._value);
          ++a.psd.ref, ++Dn, Lr(Ad, [l, i, a]);
        } else i._listeners.push(a);
      }
      function Ad(i, a, l) {
        try {
          var d, p = a._value;
          !a._state && Uo.length && (Uo = []), d = ze && a._consoleTask ? a._consoleTask.run(function() {
            return i(p);
          }) : i(p), a._state || Uo.indexOf(p) !== -1 || function(w) {
            for (var v = Kn.length; v; ) if (Kn[--v]._value === w._value) return Kn.splice(v, 1);
          }(a), l.resolve(d);
        } catch (w) {
          l.reject(w);
        } finally {
          --Dn == 0 && gs(), --l.psd.ref || l.psd.finalize();
        }
      }
      function kd() {
        Mn(wn, function() {
          rr() && or();
        });
      }
      function rr() {
        var i = fs;
        return Co = fs = !1, i;
      }
      function or() {
        var i, a, l;
        do
          for (; 0 < Pr.length; ) for (i = Pr, Pr = [], l = i.length, a = 0; a < l; ++a) {
            var d = i[a];
            d[0].apply(null, d[1]);
          }
        while (0 < Pr.length);
        Co = fs = !0;
      }
      function gs() {
        var i = Kn;
        Kn = [], i.forEach(function(d) {
          d._PSD.onunhandled.call(null, d._value, d);
        });
        for (var a = Ro.slice(0), l = a.length; l; ) a[--l]();
      }
      function $o(i) {
        return new it($r, !1, i);
      }
      function $t(i, a) {
        var l = ut;
        return function() {
          var d = rr(), p = ut;
          try {
            return vn(l, !0), i.apply(this, arguments);
          } catch (w) {
            a && a(w);
          } finally {
            vn(p, !1), d && or();
          }
        };
      }
      m(it.prototype, { then: ds, _then: function(i, a) {
        ps(this, new qc(null, null, i, a, ut));
      }, catch: function(i) {
        if (arguments.length === 1) return this.then(null, i);
        var a = i, l = arguments[1];
        return typeof a == "function" ? this.then(null, function(d) {
          return (d instanceof a ? l : $o)(d);
        }) : this.then(null, function(d) {
          return (d && d.name === a ? l : $o)(d);
        });
      }, finally: function(i) {
        return this.then(function(a) {
          return it.resolve(i()).then(function() {
            return a;
          });
        }, function(a) {
          return it.resolve(i()).then(function() {
            return $o(a);
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
      } }), typeof Symbol < "u" && Symbol.toStringTag && A(it.prototype, Symbol.toStringTag, "Dexie.Promise"), wn.env = zc(), m(it, { all: function() {
        var i = mt.apply(null, arguments).map(Ko);
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
        }) : new it($r, !0, i);
      }, reject: $o, race: function() {
        var i = mt.apply(null, arguments).map(Ko);
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
        return Po;
      } }, newPSD: mn, usePSD: Mn, scheduler: { get: function() {
        return Lr;
      }, set: function(i) {
        Lr = i;
      } }, rejectionMapper: { get: function() {
        return ls;
      }, set: function(i) {
        ls = i;
      } }, follow: function(i, a) {
        return new it(function(l, d) {
          return mn(function(p, w) {
            var v = ut;
            v.unhandleds = [], v.onunhandled = w, v.finalize = Mt(function() {
              var x, k = this;
              x = function() {
                k.unhandleds.length === 0 ? p() : w(k.unhandleds[0]);
              }, Ro.push(function _() {
                x(), Ro.splice(Ro.indexOf(_), 1);
              }), ++Dn, Lr(function() {
                --Dn == 0 && gs();
              }, []);
            }, v.finalize), i();
          }, a, l, d);
        });
      } }), Pn && (Pn.allSettled && A(it, "allSettled", function() {
        var i = mt.apply(null, arguments).map(Ko);
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
      }), Pn.any && typeof AggregateError < "u" && A(it, "any", function() {
        var i = mt.apply(null, arguments).map(Ko);
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
      }), Pn.withResolvers && (it.withResolvers = Pn.withResolvers));
      var Qt = { awaits: 0, echoes: 0, id: 0 }, Td = 0, Oo = [], Lo = 0, Po = 0, Id = 0;
      function mn(i, a, l, d) {
        var p = ut, w = Object.create(p);
        return w.parent = p, w.ref = 0, w.global = !1, w.id = ++Id, wn.env, w.env = us ? { Promise: it, PromiseProp: { value: it, configurable: !0, writable: !0 }, all: it.all, race: it.race, allSettled: it.allSettled, any: it.any, resolve: it.resolve, reject: it.reject } : {}, a && f(w, a), ++p.ref, w.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, d = Mn(w, i, l, d), w.ref === 0 && w.finalize(), d;
      }
      function ir() {
        return Qt.id || (Qt.id = ++Td), ++Qt.awaits, Qt.echoes += Vc, Qt.id;
      }
      function bn() {
        return !!Qt.awaits && (--Qt.awaits == 0 && (Qt.id = 0), Qt.echoes = Qt.awaits * Vc, !0);
      }
      function Ko(i) {
        return Qt.echoes && i && i.constructor === Pn ? (ir(), i.then(function(a) {
          return bn(), a;
        }, function(a) {
          return bn(), Ht(a);
        })) : i;
      }
      function Bd() {
        var i = Oo[Oo.length - 1];
        Oo.pop(), vn(i, !1);
      }
      function vn(i, a) {
        var l, d = ut;
        (a ? !Qt.echoes || Lo++ && i === ut : !Lo || --Lo && i === ut) || queueMicrotask(a ? (function(p) {
          ++Po, Qt.echoes && --Qt.echoes != 0 || (Qt.echoes = Qt.awaits = Qt.id = 0), Oo.push(ut), vn(p, !0);
        }).bind(null, i) : Bd), i !== ut && (ut = i, d === wn && (wn.env = zc()), us && (l = wn.env.Promise, a = i.env, (d.global || i.global) && (Object.defineProperty(s, "Promise", a.PromiseProp), l.all = a.all, l.race = a.race, l.resolve = a.resolve, l.reject = a.reject, a.allSettled && (l.allSettled = a.allSettled), a.any && (l.any = a.any))));
      }
      function zc() {
        var i = s.Promise;
        return us ? { Promise: i, PromiseProp: Object.getOwnPropertyDescriptor(s, "Promise"), all: i.all, race: i.race, allSettled: i.allSettled, any: i.any, resolve: i.resolve, reject: i.reject } : {};
      }
      function Mn(i, a, l, d, p) {
        var w = ut;
        try {
          return vn(i, !0), a(l, d, p);
        } finally {
          vn(w, !1);
        }
      }
      function Gc(i, a, l, d) {
        return typeof i != "function" ? i : function() {
          var p = ut;
          l && ir(), vn(a, !0);
          try {
            return i.apply(this, arguments);
          } finally {
            vn(p, !1), d && queueMicrotask(bn);
          }
        };
      }
      function ys(i) {
        Promise === Pn && Qt.echoes === 0 ? Lo === 0 ? i() : enqueueNativeMicroTask(i) : setTimeout(i, 0);
      }
      ("" + Ue).indexOf("[native code]") === -1 && (ir = bn = pt);
      var Ht = it.reject, Hn = "￿", rn = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Wc = "String expected.", sr = [], Do = "__dbnames", ws = "readonly", ms = "readwrite";
      function Fn(i, a) {
        return i ? a ? function() {
          return i.apply(this, arguments) && a.apply(this, arguments);
        } : i : a;
      }
      var Yc = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function Mo(i) {
        return typeof i != "string" || /\./.test(i) ? function(a) {
          return a;
        } : function(a) {
          return a[i] === void 0 && i in a && delete (a = xt(a))[i], a;
        };
      }
      function Zc() {
        throw at.Type();
      }
      function At(i, a) {
        try {
          var l = Xc(i), d = Xc(a);
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
              }(Qc(i), Qc(a));
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
      function Xc(i) {
        var a = typeof i;
        return a != "object" ? a : ArrayBuffer.isView(i) ? "binary" : (i = F(i), i === "ArrayBuffer" ? "binary" : i);
      }
      function Qc(i) {
        return i instanceof Uint8Array ? i : ArrayBuffer.isView(i) ? new Uint8Array(i.buffer, i.byteOffset, i.byteLength) : new Uint8Array(i);
      }
      var Jc = (Nt.prototype._trans = function(i, a, l) {
        var d = this._tx || ut.trans, p = this.name, w = ze && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(i === "readonly" ? "read" : "write", " ").concat(this.name));
        function v(_, U, S) {
          if (!S.schema[p]) throw new at.NotFound("Table " + p + " not part of transaction");
          return a(S.idbtrans, S);
        }
        var x = rr();
        try {
          var k = d && d.db._novip === this.db._novip ? d === ut.trans ? d._promise(i, v, l) : mn(function() {
            return d._promise(i, v, l);
          }, { trans: d, transless: ut.transless || ut }) : function _(U, S, $, T) {
            if (U.idbdb && (U._state.openComplete || ut.letThrough || U._vip)) {
              var C = U._createTransaction(S, $, U._dbSchema);
              try {
                C.create(), U._state.PR1398_maxLoop = 3;
              } catch (R) {
                return R.name === Ke.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                  return _(U, S, $, T);
                })) : Ht(R);
              }
              return C._promise(S, function(R, N) {
                return mn(function() {
                  return ut.trans = C, T(R, N, C);
                });
              }).then(function(R) {
                if (S === "readwrite") try {
                  C.idbtrans.commit();
                } catch {
                }
                return S === "readonly" ? R : C._completion.then(function() {
                  return R;
                });
              });
            }
            if (U._state.openComplete) return Ht(new at.DatabaseClosed(U._state.dbOpenError));
            if (!U._state.isBeingOpened) {
              if (!U._state.autoOpen) return Ht(new at.DatabaseClosed());
              U.open().catch(pt);
            }
            return U._state.dbReadyPromise.then(function() {
              return _(U, S, $, T);
            });
          }(this.db, i, [this.name], v);
          return w && (k._consoleTask = w, k = k.catch(function(_) {
            return console.trace(_), Ht(_);
          })), k;
        } finally {
          x && or();
        }
      }, Nt.prototype.get = function(i, a) {
        var l = this;
        return i && i.constructor === Object ? this.where(i).first(a) : i == null ? Ht(new at.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(d) {
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
        !l && ze && console.warn("The query ".concat(JSON.stringify(i), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(a.join("+"), "]"));
        var d = this.schema.idxByName;
        function p(x, k) {
          return At(x, k) === 0;
        }
        var v = a.reduce(function(S, k) {
          var _ = S[0], U = S[1], S = d[k], $ = i[k];
          return [_ || S, _ || !S ? Fn(U, S && S.multi ? function(T) {
            return T = W(T, k), u(T) && T.some(function(C) {
              return p($, C);
            });
          } : function(T) {
            return p($, W(T, k));
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
        (this.schema.mappedClass = i).prototype instanceof Zc && (function(k, _) {
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
        return w && p && (v = Mo(w)(i)), this._trans("readwrite", function(x) {
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
        return typeof i != "object" || u(i) ? this.where(":id").equals(i).modify(a) : (i = W(i, this.schema.primKey.keyPath), i === void 0 ? Ht(new at.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(i).modify(a));
      }, Nt.prototype.put = function(i, a) {
        var l = this, d = this.schema.primKey, p = d.auto, w = d.keyPath, v = i;
        return w && p && (v = Mo(w)(i)), this._trans("readwrite", function(x) {
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
          return i.core.mutate({ trans: a, type: "deleteRange", range: Yc });
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
          var k = i.length, _ = _ && x ? i.map(Mo(_)) : i;
          return d.core.mutate({ trans: v, type: "add", keys: p, values: _, wantResults: w }).then(function(C) {
            var S = C.numFailures, $ = C.results, T = C.lastResult, C = C.failures;
            if (S === 0) return w ? $ : T;
            throw new Rt("".concat(d.name, ".bulkAdd(): ").concat(S, " of ").concat(k, " operations failed"), C);
          });
        });
      }, Nt.prototype.bulkPut = function(i, a, l) {
        var d = this, p = Array.isArray(a) ? a : void 0, w = (l = l || (p ? void 0 : a)) ? l.allKeys : void 0;
        return this._trans("readwrite", function(v) {
          var _ = d.schema.primKey, x = _.auto, _ = _.keyPath;
          if (_ && p) throw new at.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (p && p.length !== i.length) throw new at.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, _ = _ && x ? i.map(Mo(_)) : i;
          return d.core.mutate({ trans: v, type: "put", keys: p, values: _, wantResults: w }).then(function(C) {
            var S = C.numFailures, $ = C.results, T = C.lastResult, C = C.failures;
            if (S === 0) return w ? $ : T;
            throw new Rt("".concat(d.name, ".bulkPut(): ").concat(S, " of ").concat(k, " operations failed"), C);
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
            i.forEach(function(S, $) {
              var T = S.key, C = S.changes, R = x[$];
              if (R) {
                for (var N = 0, L = Object.keys(C); N < L.length; N++) {
                  var P = L[N], K = C[P];
                  if (P === a.schema.primKey.keyPath) {
                    if (At(K, T) !== 0) throw new at.Constraint("Cannot update primary key in bulkUpdate()");
                  } else z(R, P, K);
                }
                w.push($), k.push(T), _.push(R);
              }
            });
            var U = k.length;
            return l.mutate({ trans: v, type: "put", keys: k, values: _, updates: { keys: d, changeSpecs: p } }).then(function(S) {
              var $ = S.numFailures, T = S.failures;
              if ($ === 0) return U;
              for (var C = 0, R = Object.keys(T); C < R.length; C++) {
                var N, L = R[C], P = w[Number(L)];
                P != null && (N = T[L], delete T[L], T[P] = N);
              }
              throw new Rt("".concat(a.name, ".bulkUpdate(): ").concat($, " of ").concat(U, " operations failed"), T);
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
          throw new Rt("".concat(a.name, ".bulkDelete(): ").concat(p, " of ").concat(l, " operations failed"), v);
        });
      }, Nt);
      function Nt() {
      }
      function Kr(i) {
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
              U.subscribers = U.subscribers.filter(function($) {
                return $ !== S;
              }), U.fire = U.subscribers.reduce(x, k);
            } };
            return l[v] = a[v] = U;
          }
          c(_ = v).forEach(function(S) {
            var $ = _[S];
            if (u($)) w(S, _[S][0], _[S][1]);
            else {
              if ($ !== "asap") throw new at.InvalidArgument("Invalid event config");
              var T = w(S, ce, function() {
                for (var C = arguments.length, R = new Array(C); C--; ) R[C] = arguments[C];
                T.subscribers.forEach(function(N) {
                  G(function() {
                    N.apply(null, R);
                  });
                });
              });
            }
          });
        }
      }
      function Dr(i, a) {
        return I(a).from({ prototype: i }), a;
      }
      function ar(i, a) {
        return !(i.filter || i.algorithm || i.or) && (a ? i.justLimit : !i.replayFilter);
      }
      function bs(i, a) {
        i.filter = Fn(i.filter, a);
      }
      function vs(i, a, l) {
        var d = i.replayFilter;
        i.replayFilter = d ? function() {
          return Fn(d(), a());
        } : a, i.justLimit = l && !d;
      }
      function Ho(i, a) {
        if (i.isPrimKey) return a.primaryKey;
        var l = a.getIndexByKeyPath(i.index);
        if (!l) throw new at.Schema("KeyPath " + i.index + " on object store " + a.name + " is not indexed");
        return l;
      }
      function tu(i, a, l) {
        var d = Ho(i, a.schema);
        return a.openCursor({ trans: l, values: !i.keysOnly, reverse: i.dir === "prev", unique: !!i.unique, query: { index: d, range: i.range } });
      }
      function Fo(i, a, l, d) {
        var p = i.replayFilter ? Fn(i.filter, i.replayFilter()) : i.filter;
        if (i.or) {
          var w = {}, v = function(x, k, _) {
            var U, S;
            p && !p(k, _, function($) {
              return k.stop($);
            }, function($) {
              return k.fail($);
            }) || ((S = "" + (U = k.primaryKey)) == "[object ArrayBuffer]" && (S = "" + new Uint8Array(U)), g(w, S) || (w[S] = !0, a(x, k, _)));
          };
          return Promise.all([i.or._iterate(v, l), eu(tu(i, d, l), i.algorithm, v, !i.keysOnly && i.valueMapper)]);
        }
        return eu(tu(i, d, l), Fn(i.algorithm, p), a, !i.keysOnly && i.valueMapper);
      }
      function eu(i, a, l, d) {
        var p = $t(d ? function(w, v, x) {
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
      var Mr = (nu.prototype.execute = function(i) {
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
      }, nu);
      function nu(i) {
        this["@@propmod"] = i;
      }
      var _d = (Tt.prototype._read = function(i, a) {
        var l = this._ctx;
        return l.error ? l.table._trans(null, Ht.bind(null, l.error)) : l.table._trans("readonly", i).then(a);
      }, Tt.prototype._write = function(i) {
        var a = this._ctx;
        return a.error ? a.table._trans(null, Ht.bind(null, a.error)) : a.table._trans("readwrite", i, "locked");
      }, Tt.prototype._addAlgorithm = function(i) {
        var a = this._ctx;
        a.algorithm = Fn(a.algorithm, i);
      }, Tt.prototype._iterate = function(i, a) {
        return Fo(this._ctx, i, a, this._ctx.table.core);
      }, Tt.prototype.clone = function(i) {
        var a = Object.create(this.constructor.prototype), l = Object.create(this._ctx);
        return i && f(l, i), a._ctx = l, a;
      }, Tt.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, Tt.prototype.each = function(i) {
        var a = this._ctx;
        return this._read(function(l) {
          return Fo(a, i, l, a.table.core);
        });
      }, Tt.prototype.count = function(i) {
        var a = this;
        return this._read(function(l) {
          var d = a._ctx, p = d.table.core;
          if (ar(d, !0)) return p.count({ trans: l, query: { index: Ho(d, p.schema), range: d.range } }).then(function(v) {
            return Math.min(v, d.limit);
          });
          var w = 0;
          return Fo(d, function() {
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
          if (d.dir === "next" && ar(d, !0) && 0 < d.limit) {
            var p = d.valueMapper, w = Ho(d, d.table.core.schema);
            return d.table.core.query({ trans: l, limit: d.limit, values: !0, query: { index: w, range: d.range } }).then(function(x) {
              return x = x.result, p ? x.map(p) : x;
            });
          }
          var v = [];
          return Fo(d, function(x) {
            return v.push(x);
          }, l, d.table.core).then(function() {
            return v;
          });
        }, i);
      }, Tt.prototype.offset = function(i) {
        var a = this._ctx;
        return i <= 0 || (a.offset += i, ar(a) ? vs(a, function() {
          var l = i;
          return function(d, p) {
            return l === 0 || (l === 1 ? --l : p(function() {
              d.advance(l), l = 0;
            }), !1);
          };
        }) : vs(a, function() {
          var l = i;
          return function() {
            return --l < 0;
          };
        })), this;
      }, Tt.prototype.limit = function(i) {
        return this._ctx.limit = Math.min(this._ctx.limit, i), vs(this._ctx, function() {
          var a = i;
          return function(l, d, p) {
            return --a <= 0 && d(p), 0 <= a;
          };
        }, !0), this;
      }, Tt.prototype.until = function(i, a) {
        return bs(this._ctx, function(l, d, p) {
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
        return bs(this._ctx, function(l) {
          return i(l.value);
        }), (a = this._ctx).isMatch = Fn(a.isMatch, i), this;
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
        if (a.dir === "next" && ar(a, !0) && 0 < a.limit) return this._read(function(d) {
          var p = Ho(a, a.table.core.schema);
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
        return bs(this._ctx, function(p) {
          var d = p.primaryKey.toString(), p = g(a, d);
          return a[d] = !0, !p;
        }), this;
      }, Tt.prototype.modify = function(i) {
        var a = this, l = this._ctx;
        return this._write(function(d) {
          var p, w, v;
          v = typeof i == "function" ? i : (p = c(i), w = p.length, function(N) {
            for (var L = !1, P = 0; P < w; ++P) {
              var K = p[P], H = i[K], Z = W(N, K);
              H instanceof Mr ? (z(N, K, H.execute(Z)), L = !0) : Z !== H && (z(N, K, H), L = !0);
            }
            return L;
          });
          var x = l.table.core, S = x.schema.primaryKey, k = S.outbound, _ = S.extractKey, U = 200, S = a.db._options.modifyChunkSize;
          S && (U = typeof S == "object" ? S[x.name] || S["*"] || 200 : S);
          function $(N, K) {
            var P = K.failures, K = K.numFailures;
            C += N - K;
            for (var H = 0, Z = c(P); H < Z.length; H++) {
              var et = Z[H];
              T.push(P[et]);
            }
          }
          var T = [], C = 0, R = [];
          return a.clone().primaryKeys().then(function(N) {
            function L(K) {
              var H = Math.min(U, N.length - K);
              return x.getMany({ trans: d, keys: N.slice(K, K + H), cache: "immutable" }).then(function(Z) {
                for (var et = [], X = [], J = k ? [] : null, ot = [], tt = 0; tt < H; ++tt) {
                  var ct = Z[tt], yt = { value: xt(ct), primKey: N[K + tt] };
                  v.call(yt, yt.value, yt) !== !1 && (yt.value == null ? ot.push(N[K + tt]) : k || At(_(ct), _(yt.value)) === 0 ? (X.push(yt.value), k && J.push(N[K + tt])) : (ot.push(N[K + tt]), et.push(yt.value)));
                }
                return Promise.resolve(0 < et.length && x.mutate({ trans: d, type: "add", values: et }).then(function(vt) {
                  for (var Et in vt.failures) ot.splice(parseInt(Et), 1);
                  $(et.length, vt);
                })).then(function() {
                  return (0 < X.length || P && typeof i == "object") && x.mutate({ trans: d, type: "put", keys: J, values: X, criteria: P, changeSpec: typeof i != "function" && i, isAdditionalChunk: 0 < K }).then(function(vt) {
                    return $(X.length, vt);
                  });
                }).then(function() {
                  return (0 < ot.length || P && i === Es) && x.mutate({ trans: d, type: "delete", keys: ot, criteria: P, isAdditionalChunk: 0 < K }).then(function(vt) {
                    return $(ot.length, vt);
                  });
                }).then(function() {
                  return N.length > K + H && L(K + U);
                });
              });
            }
            var P = ar(l) && l.limit === 1 / 0 && (typeof i != "function" || i === Es) && { index: l.index, range: l.range };
            return L(0).then(function() {
              if (0 < T.length) throw new Xt("Error modifying one or more objects", T, C, R);
              return N.length;
            });
          });
        });
      }, Tt.prototype.delete = function() {
        var i = this._ctx, a = i.range;
        return ar(i) && (i.isPrimKey || a.type === 3) ? this._write(function(l) {
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
        }) : this.modify(Es);
      }, Tt);
      function Tt() {
      }
      var Es = function(i, a) {
        return a.value = null;
      };
      function Nd(i, a) {
        return i < a ? -1 : i === a ? 0 : 1;
      }
      function Cd(i, a) {
        return a < i ? -1 : i === a ? 0 : 1;
      }
      function Ne(i, a, l) {
        return i = i instanceof ou ? new i.Collection(i) : i, i._ctx.error = new (l || TypeError)(a), i;
      }
      function cr(i) {
        return new i.Collection(i, function() {
          return ru("");
        }).limit(0);
      }
      function Vo(i, a, l, d) {
        var p, w, v, x, k, _, U, S = l.length;
        if (!l.every(function(C) {
          return typeof C == "string";
        })) return Ne(i, Wc);
        function $(C) {
          p = C === "next" ? function(N) {
            return N.toUpperCase();
          } : function(N) {
            return N.toLowerCase();
          }, w = C === "next" ? function(N) {
            return N.toLowerCase();
          } : function(N) {
            return N.toUpperCase();
          }, v = C === "next" ? Nd : Cd;
          var R = l.map(function(N) {
            return { lower: w(N), upper: p(N) };
          }).sort(function(N, L) {
            return v(N.lower, L.lower);
          });
          x = R.map(function(N) {
            return N.upper;
          }), k = R.map(function(N) {
            return N.lower;
          }), U = (_ = C) === "next" ? "" : d;
        }
        $("next"), i = new i.Collection(i, function() {
          return En(x[0], k[S - 1] + d);
        }), i._ondirectionchange = function(C) {
          $(C);
        };
        var T = 0;
        return i._addAlgorithm(function(C, R, N) {
          var L = C.key;
          if (typeof L != "string") return !1;
          var P = w(L);
          if (a(P, k, T)) return !0;
          for (var K = null, H = T; H < S; ++H) {
            var Z = function(et, X, J, ot, tt, ct) {
              for (var yt = Math.min(et.length, ot.length), vt = -1, Et = 0; Et < yt; ++Et) {
                var Ce = X[Et];
                if (Ce !== ot[Et]) return tt(et[Et], J[Et]) < 0 ? et.substr(0, Et) + J[Et] + J.substr(Et + 1) : tt(et[Et], ot[Et]) < 0 ? et.substr(0, Et) + ot[Et] + J.substr(Et + 1) : 0 <= vt ? et.substr(0, vt) + X[vt] + J.substr(vt + 1) : null;
                tt(et[Et], Ce) < 0 && (vt = Et);
              }
              return yt < ot.length && ct === "next" ? et + J.substr(et.length) : yt < et.length && ct === "prev" ? et.substr(0, J.length) : vt < 0 ? null : et.substr(0, vt) + ot[vt] + J.substr(vt + 1);
            }(L, P, x[H], k[H], v, _);
            Z === null && K === null ? T = H + 1 : (K === null || 0 < v(K, Z)) && (K = Z);
          }
          return R(K !== null ? function() {
            C.continue(K + U);
          } : N), !1;
        }), i;
      }
      function En(i, a, l, d) {
        return { type: 2, lower: i, upper: a, lowerOpen: l, upperOpen: d };
      }
      function ru(i) {
        return { type: 1, lower: i, upper: i };
      }
      var ou = (Object.defineProperty(Jt.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), Jt.prototype.between = function(i, a, l, d) {
        l = l !== !1, d = d === !0;
        try {
          return 0 < this._cmp(i, a) || this._cmp(i, a) === 0 && (l || d) && (!l || !d) ? cr(this) : new this.Collection(this, function() {
            return En(i, a, !l, !d);
          });
        } catch {
          return Ne(this, rn);
        }
      }, Jt.prototype.equals = function(i) {
        return i == null ? Ne(this, rn) : new this.Collection(this, function() {
          return ru(i);
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
        return typeof i != "string" ? Ne(this, Wc) : this.between(i, i + Hn, !0, !0);
      }, Jt.prototype.startsWithIgnoreCase = function(i) {
        return i === "" ? this.startsWith(i) : Vo(this, function(a, l) {
          return a.indexOf(l[0]) === 0;
        }, [i], Hn);
      }, Jt.prototype.equalsIgnoreCase = function(i) {
        return Vo(this, function(a, l) {
          return a === l[0];
        }, [i], "");
      }, Jt.prototype.anyOfIgnoreCase = function() {
        var i = mt.apply(lt, arguments);
        return i.length === 0 ? cr(this) : Vo(this, function(a, l) {
          return l.indexOf(a) !== -1;
        }, i, "");
      }, Jt.prototype.startsWithAnyOfIgnoreCase = function() {
        var i = mt.apply(lt, arguments);
        return i.length === 0 ? cr(this) : Vo(this, function(a, l) {
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
        if (a.length === 0) return cr(this);
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
        if (L.length === 0) return cr(this);
        if (!L.every(function(P) {
          return P[0] !== void 0 && P[1] !== void 0 && p(P[0], P[1]) <= 0;
        })) return Ne(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", at.InvalidArgument);
        var k = !a || a.includeLowers !== !1, _ = a && a.includeUppers === !0, U, S = p;
        function $(P, K) {
          return S(P[0], K[0]);
        }
        try {
          (U = L.reduce(function(P, K) {
            for (var H = 0, Z = P.length; H < Z; ++H) {
              var et = P[H];
              if (d(K[0], et[1]) < 0 && 0 < d(K[1], et[0])) {
                et[0] = v(et[0], K[0]), et[1] = x(et[1], K[1]);
                break;
              }
            }
            return H === Z && P.push(K), P;
          }, [])).sort($);
        } catch {
          return Ne(this, rn);
        }
        var T = 0, C = _ ? function(P) {
          return 0 < p(P, U[T][1]);
        } : function(P) {
          return 0 <= p(P, U[T][1]);
        }, R = k ? function(P) {
          return 0 < w(P, U[T][0]);
        } : function(P) {
          return 0 <= w(P, U[T][0]);
        }, N = C, L = new this.Collection(this, function() {
          return En(U[0][0], U[U.length - 1][1], !k, !_);
        });
        return L._ondirectionchange = function(P) {
          S = P === "next" ? (N = C, p) : (N = R, w), U.sort($);
        }, L._addAlgorithm(function(P, K, H) {
          for (var Z, et = P.key; N(et); ) if (++T === U.length) return K(H), !1;
          return !C(Z = et) && !R(Z) || (l._cmp(et, U[T][1]) === 0 || l._cmp(et, U[T][0]) === 0 || K(function() {
            S === p ? P.continue(U[T][0]) : P.continue(U[T][1]);
          }), !1);
        }), L;
      }, Jt.prototype.startsWithAnyOf = function() {
        var i = mt.apply(lt, arguments);
        return i.every(function(a) {
          return typeof a == "string";
        }) ? i.length === 0 ? cr(this) : this.inAnyRange(i.map(function(a) {
          return [a, a + Hn];
        })) : Ne(this, "startsWithAnyOf() only works with strings");
      }, Jt);
      function Jt() {
      }
      function Ge(i) {
        return $t(function(a) {
          return Hr(a), i(a.target.error), !1;
        });
      }
      function Hr(i) {
        i.stopPropagation && i.stopPropagation(), i.preventDefault && i.preventDefault();
      }
      var Fr = "storagemutated", xs = "x-storagemutated-1", xn = Kr(null, Fr), Ud = (We.prototype._lock = function() {
        return j(!ut.global), ++this._reculock, this._reculock !== 1 || ut.global || (ut.lockOwnerFor = this), this;
      }, We.prototype._unlock = function() {
        if (j(!ut.global), --this._reculock == 0) for (ut.global || (ut.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var i = this._blockedFuncs.shift();
          try {
            Mn(i[1], i[0]);
          } catch {
          }
        }
        return this;
      }, We.prototype._locked = function() {
        return this._reculock && ut.lockOwnerFor !== this;
      }, We.prototype.create = function(i) {
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
        return j(this._completion._state === null), (i = this.idbtrans = i || (this.db.core || l).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = $t(function(p) {
          Hr(p), a._reject(i.error);
        }), i.onabort = $t(function(p) {
          Hr(p), a.active && a._reject(new at.Abort(i.error)), a.active = !1, a.on("abort").fire(p);
        }), i.oncomplete = $t(function() {
          a.active = !1, a._resolve(), "mutatedParts" in i && xn.storagemutated.fire(i.mutatedParts);
        }), this;
      }, We.prototype._promise = function(i, a, l) {
        var d = this;
        if (i === "readwrite" && this.mode !== "readwrite") return Ht(new at.ReadOnly("Transaction is readonly"));
        if (!this.active) return Ht(new at.TransactionInactive());
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
      }, We.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, We.prototype.waitFor = function(i) {
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
            return l._waitingQueue.push($t(w.bind(null, x)));
          }, function(x) {
            return l._waitingQueue.push($t(v.bind(null, x)));
          }).finally(function() {
            l._waitingFor === p && (l._waitingFor = null);
          });
        });
      }, We.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new at.Abort()));
      }, We.prototype.table = function(i) {
        var a = this._memoizedTables || (this._memoizedTables = {});
        if (g(a, i)) return a[i];
        var l = this.schema[i];
        if (!l) throw new at.NotFound("Table " + i + " not part of transaction");
        return l = new this.db.Table(i, l, this), l.core = this.db.core.table(i), a[i] = l;
      }, We);
      function We() {
      }
      function Ss(i, a, l, d, p, w, v) {
        return { name: i, keyPath: a, unique: l, multi: d, auto: p, compound: w, src: (l && !v ? "&" : "") + (d ? "*" : "") + (p ? "++" : "") + iu(a) };
      }
      function iu(i) {
        return typeof i == "string" ? i : i ? "[" + [].join.call(i, "+") + "]" : "";
      }
      function As(i, a, l) {
        return { name: i, primKey: a, indexes: l, mappedClass: null, idxByName: (d = function(p) {
          return [p.name, p];
        }, l.reduce(function(p, w, v) {
          return v = d(w, v), v && (p[v[0]] = v[1]), p;
        }, {})) };
        var d;
      }
      var Vr = function(i) {
        try {
          return i.only([[]]), Vr = function() {
            return [[]];
          }, [[]];
        } catch {
          return Vr = function() {
            return Hn;
          }, Hn;
        }
      };
      function ks(i) {
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
      function su(i) {
        return [].slice.call(i);
      }
      var Rd = 0;
      function qr(i) {
        return i == null ? ":id" : typeof i == "string" ? i : "[".concat(i.join("+"), "]");
      }
      function $d(i, a, k) {
        function d(N) {
          if (N.type === 3) return null;
          if (N.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var T = N.lower, C = N.upper, R = N.lowerOpen, N = N.upperOpen;
          return T === void 0 ? C === void 0 ? null : a.upperBound(C, !!N) : C === void 0 ? a.lowerBound(T, !!R) : a.bound(T, C, !!R, !!N);
        }
        function p($) {
          var T, C = $.name;
          return { name: C, schema: $, mutate: function(R) {
            var N = R.trans, L = R.type, P = R.keys, K = R.values, H = R.range;
            return new Promise(function(Z, et) {
              Z = $t(Z);
              var X = N.objectStore(C), J = X.keyPath == null, ot = L === "put" || L === "add";
              if (!ot && L !== "delete" && L !== "deleteRange") throw new Error("Invalid operation type: " + L);
              var tt, ct = (P || K || { length: 1 }).length;
              if (P && K && P.length !== K.length) throw new Error("Given keys array must have same length as given values array.");
              if (ct === 0) return Z({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function yt(be) {
                ++Ce, Hr(be);
              }
              var vt = [], Et = [], Ce = 0;
              if (L === "deleteRange") {
                if (H.type === 4) return Z({ numFailures: Ce, failures: Et, results: [], lastResult: void 0 });
                H.type === 3 ? vt.push(tt = X.clear()) : vt.push(tt = X.delete(d(H)));
              } else {
                var J = ot ? J ? [K, P] : [K, null] : [P, null], gt = J[0], he = J[1];
                if (ot) for (var pe = 0; pe < ct; ++pe) vt.push(tt = he && he[pe] !== void 0 ? X[L](gt[pe], he[pe]) : X[L](gt[pe])), tt.onerror = yt;
                else for (pe = 0; pe < ct; ++pe) vt.push(tt = X[L](gt[pe])), tt.onerror = yt;
              }
              function ni(be) {
                be = be.target.result, vt.forEach(function(jn, Vs) {
                  return jn.error != null && (Et[Vs] = jn.error);
                }), Z({ numFailures: Ce, failures: Et, results: L === "delete" ? P : vt.map(function(jn) {
                  return jn.result;
                }), lastResult: be });
              }
              tt.onerror = function(be) {
                yt(be), ni(be);
              }, tt.onsuccess = ni;
            });
          }, getMany: function(R) {
            var N = R.trans, L = R.keys;
            return new Promise(function(P, K) {
              P = $t(P);
              for (var H, Z = N.objectStore(C), et = L.length, X = new Array(et), J = 0, ot = 0, tt = function(vt) {
                vt = vt.target, X[vt._pos] = vt.result, ++ot === J && P(X);
              }, ct = Ge(K), yt = 0; yt < et; ++yt) L[yt] != null && ((H = Z.get(L[yt]))._pos = yt, H.onsuccess = tt, H.onerror = ct, ++J);
              J === 0 && P(X);
            });
          }, get: function(R) {
            var N = R.trans, L = R.key;
            return new Promise(function(P, K) {
              P = $t(P);
              var H = N.objectStore(C).get(L);
              H.onsuccess = function(Z) {
                return P(Z.target.result);
              }, H.onerror = Ge(K);
            });
          }, query: (T = _, function(R) {
            return new Promise(function(N, L) {
              N = $t(N);
              var P, K, H, J = R.trans, Z = R.values, et = R.limit, tt = R.query, X = et === 1 / 0 ? void 0 : et, ot = tt.index, tt = tt.range, J = J.objectStore(C), ot = ot.isPrimaryKey ? J : J.index(ot.name), tt = d(tt);
              if (et === 0) return N({ result: [] });
              T ? ((X = Z ? ot.getAll(tt, X) : ot.getAllKeys(tt, X)).onsuccess = function(ct) {
                return N({ result: ct.target.result });
              }, X.onerror = Ge(L)) : (P = 0, K = !Z && "openKeyCursor" in ot ? ot.openKeyCursor(tt) : ot.openCursor(tt), H = [], K.onsuccess = function(ct) {
                var yt = K.result;
                return yt ? (H.push(Z ? yt.value : yt.primaryKey), ++P === et ? N({ result: H }) : void yt.continue()) : N({ result: H });
              }, K.onerror = Ge(L));
            });
          }), openCursor: function(R) {
            var N = R.trans, L = R.values, P = R.query, K = R.reverse, H = R.unique;
            return new Promise(function(Z, et) {
              Z = $t(Z);
              var ot = P.index, X = P.range, J = N.objectStore(C), J = ot.isPrimaryKey ? J : J.index(ot.name), ot = K ? H ? "prevunique" : "prev" : H ? "nextunique" : "next", tt = !L && "openKeyCursor" in J ? J.openKeyCursor(d(X), ot) : J.openCursor(d(X), ot);
              tt.onerror = Ge(et), tt.onsuccess = $t(function(ct) {
                var yt, vt, Et, Ce, gt = tt.result;
                gt ? (gt.___id = ++Rd, gt.done = !1, yt = gt.continue.bind(gt), vt = (vt = gt.continuePrimaryKey) && vt.bind(gt), Et = gt.advance.bind(gt), Ce = function() {
                  throw new Error("Cursor not stopped");
                }, gt.trans = N, gt.stop = gt.continue = gt.continuePrimaryKey = gt.advance = function() {
                  throw new Error("Cursor not started");
                }, gt.fail = $t(et), gt.next = function() {
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
                  var ni = new Promise(function(be, jn) {
                    be = $t(be), tt.onerror = Ge(jn), gt.fail = jn, gt.stop = function(Vs) {
                      gt.stop = gt.continue = gt.continuePrimaryKey = gt.advance = Ce, be(Vs);
                    };
                  });
                  return tt.onsuccess = $t(function(be) {
                    tt.onsuccess = pe, pe();
                  }), gt.continue = yt, gt.continuePrimaryKey = vt, gt.advance = Et, pe(), ni;
                }, Z(gt)) : Z(null);
              }, et);
            });
          }, count: function(R) {
            var N = R.query, L = R.trans, P = N.index, K = N.range;
            return new Promise(function(H, Z) {
              var et = L.objectStore(C), X = P.isPrimaryKey ? et : et.index(P.name), et = d(K), X = et ? X.count(et) : X.count();
              X.onsuccess = $t(function(J) {
                return H(J.target.result);
              }), X.onerror = Ge(Z);
            });
          } };
        }
        var w, v, x, U = (v = k, x = su((w = i).objectStoreNames), { schema: { name: w.name, tables: x.map(function($) {
          return v.objectStore($);
        }).map(function($) {
          var T = $.keyPath, N = $.autoIncrement, C = u(T), R = {}, N = { name: $.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: T == null, compound: C, keyPath: T, autoIncrement: N, unique: !0, extractKey: ks(T) }, indexes: su($.indexNames).map(function(L) {
            return $.index(L);
          }).map(function(H) {
            var P = H.name, K = H.unique, Z = H.multiEntry, H = H.keyPath, Z = { name: P, compound: u(H), keyPath: H, unique: K, multiEntry: Z, extractKey: ks(H) };
            return R[qr(H)] = Z;
          }), getIndexByKeyPath: function(L) {
            return R[qr(L)];
          } };
          return R[":id"] = N.primaryKey, T != null && (R[qr(T)] = N.primaryKey), N;
        }) }, hasGetAll: 0 < x.length && "getAll" in v.objectStore(x[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), k = U.schema, _ = U.hasGetAll, U = k.tables.map(p), S = {};
        return U.forEach(function($) {
          return S[$.name] = $;
        }), { stack: "dbcore", transaction: i.transaction.bind(i), table: function($) {
          if (!S[$]) throw new Error("Table '".concat($, "' not found"));
          return S[$];
        }, MIN_KEY: -1 / 0, MAX_KEY: Vr(a), schema: k };
      }
      function Od(i, a, l, d) {
        var p = l.IDBKeyRange;
        return l.indexedDB, { dbcore: (d = $d(a, p, d), i.dbcore.reduce(function(w, v) {
          return v = v.create, r(r({}, w), v(w));
        }, d)) };
      }
      function qo(i, d) {
        var l = d.db, d = Od(i._middlewares, l, i._deps, d);
        i.core = d.dbcore, i.tables.forEach(function(p) {
          var w = p.name;
          i.core.schema.tables.some(function(v) {
            return v.name === w;
          }) && (p.core = i.core.table(w), i[w] instanceof i.Table && (i[w].core = p.core));
        });
      }
      function jo(i, a, l, d) {
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
      function Ts(i, a) {
        a.forEach(function(l) {
          for (var d in l) l[d] instanceof i.Table && delete l[d];
        });
      }
      function Ld(i, a) {
        return i._cfg.version - a._cfg.version;
      }
      function Pd(i, a, l, d) {
        var p = i._dbSchema;
        l.objectStoreNames.contains("$meta") && !p.$meta && (p.$meta = As("$meta", cu("")[0], []), i._storeNames.push("$meta"));
        var w = i._createTransaction("readwrite", i._storeNames, p);
        w.create(l), w._completion.catch(d);
        var v = w._reject.bind(w), x = ut.transless || ut;
        mn(function() {
          return ut.trans = w, ut.transless = x, a !== 0 ? (qo(i, l), _ = a, ((k = w).storeNames.includes("$meta") ? k.table("$meta").get("version").then(function(U) {
            return U ?? _;
          }) : it.resolve(_)).then(function(U) {
            return $ = U, T = w, C = l, R = [], U = (S = i)._versions, N = S._dbSchema = Go(0, S.idbdb, C), (U = U.filter(function(L) {
              return L._cfg.version >= $;
            })).length !== 0 ? (U.forEach(function(L) {
              R.push(function() {
                var P = N, K = L._cfg.dbschema;
                Wo(S, P, C), Wo(S, K, C), N = S._dbSchema = K;
                var H = Is(P, K);
                H.add.forEach(function(ot) {
                  Bs(C, ot[0], ot[1].primKey, ot[1].indexes);
                }), H.change.forEach(function(ot) {
                  if (ot.recreate) throw new at.Upgrade("Not yet support for changing primary key");
                  var tt = C.objectStore(ot.name);
                  ot.add.forEach(function(ct) {
                    return zo(tt, ct);
                  }), ot.change.forEach(function(ct) {
                    tt.deleteIndex(ct.name), zo(tt, ct);
                  }), ot.del.forEach(function(ct) {
                    return tt.deleteIndex(ct);
                  });
                });
                var Z = L._cfg.contentUpgrade;
                if (Z && L._cfg.version > $) {
                  qo(S, C), T._memoizedTables = {};
                  var et = nt(K);
                  H.del.forEach(function(ot) {
                    et[ot] = P[ot];
                  }), Ts(S, [S.Transaction.prototype]), jo(S, [S.Transaction.prototype], c(et), et), T.schema = et;
                  var X, J = St(Z);
                  return J && ir(), H = it.follow(function() {
                    var ot;
                    (X = Z(T)) && J && (ot = bn.bind(null, null), X.then(ot, ot));
                  }), X && typeof X.then == "function" ? it.resolve(X) : H.then(function() {
                    return X;
                  });
                }
              }), R.push(function(P) {
                var K, H, Z = L._cfg.dbschema;
                K = Z, H = P, [].slice.call(H.db.objectStoreNames).forEach(function(et) {
                  return K[et] == null && H.db.deleteObjectStore(et);
                }), Ts(S, [S.Transaction.prototype]), jo(S, [S.Transaction.prototype], S._storeNames, S._dbSchema), T.schema = S._dbSchema;
              }), R.push(function(P) {
                S.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(S.idbdb.version / 10) === L._cfg.version ? (S.idbdb.deleteObjectStore("$meta"), delete S._dbSchema.$meta, S._storeNames = S._storeNames.filter(function(K) {
                  return K !== "$meta";
                })) : P.objectStore("$meta").put(L._cfg.version, "version"));
              });
            }), function L() {
              return R.length ? it.resolve(R.shift()(T.idbtrans)).then(L) : it.resolve();
            }().then(function() {
              au(N, C);
            })) : it.resolve();
            var S, $, T, C, R, N;
          }).catch(v)) : (c(p).forEach(function(U) {
            Bs(l, U, p[U].primKey, p[U].indexes);
          }), qo(i, l), void it.follow(function() {
            return i.on.populate.fire(w);
          }).catch(v));
          var k, _;
        });
      }
      function Kd(i, a) {
        au(i._dbSchema, a), a.db.version % 10 != 0 || a.objectStoreNames.contains("$meta") || a.db.createObjectStore("$meta").add(Math.ceil(a.db.version / 10 - 1), "version");
        var l = Go(0, i.idbdb, a);
        Wo(i, i._dbSchema, a);
        for (var d = 0, p = Is(l, i._dbSchema).change; d < p.length; d++) {
          var w = function(v) {
            if (v.change.length || v.recreate) return console.warn("Unable to patch indexes of table ".concat(v.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var x = a.objectStore(v.name);
            v.add.forEach(function(k) {
              ze && console.debug("Dexie upgrade patch: Creating missing index ".concat(v.name, ".").concat(k.src)), zo(x, k);
            });
          }(p[d]);
          if (typeof w == "object") return w.value;
        }
      }
      function Is(i, a) {
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
      function Bs(i, a, l, d) {
        var p = i.db.createObjectStore(a, l.keyPath ? { keyPath: l.keyPath, autoIncrement: l.auto } : { autoIncrement: l.auto });
        return d.forEach(function(w) {
          return zo(p, w);
        }), p;
      }
      function au(i, a) {
        c(i).forEach(function(l) {
          a.db.objectStoreNames.contains(l) || (ze && console.debug("Dexie: Creating missing table", l), Bs(a, l, i[l].primKey, i[l].indexes));
        });
      }
      function zo(i, a) {
        i.createIndex(a.name, a.keyPath, { unique: a.unique, multiEntry: a.multi });
      }
      function Go(i, a, l) {
        var d = {};
        return O(a.objectStoreNames, 0).forEach(function(p) {
          for (var w = l.objectStore(p), v = Ss(iu(_ = w.keyPath), _ || "", !0, !1, !!w.autoIncrement, _ && typeof _ != "string", !0), x = [], k = 0; k < w.indexNames.length; ++k) {
            var U = w.index(w.indexNames[k]), _ = U.keyPath, U = Ss(U.name, _, !!U.unique, !!U.multiEntry, !1, _ && typeof _ != "string", !1);
            x.push(U);
          }
          d[p] = As(p, v, x);
        }), d;
      }
      function Wo(i, a, l) {
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
      function cu(i) {
        return i.split(",").map(function(a, l) {
          var d = (a = a.trim()).replace(/([&*]|\+\+)/g, ""), p = /^\[/.test(d) ? d.match(/^\[(.*)\]$/)[1].split("+") : d;
          return Ss(d, p || null, /\&/.test(a), /\*/.test(a), /\+\+/.test(a), u(p), l === 0);
        });
      }
      var Dd = (Yo.prototype._parseStoresSpec = function(i, a) {
        c(i).forEach(function(l) {
          if (i[l] !== null) {
            var d = cu(i[l]), p = d.shift();
            if (p.unique = !0, p.multi) throw new at.Schema("Primary key cannot be multi-valued");
            d.forEach(function(w) {
              if (w.auto) throw new at.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!w.keyPath) throw new at.Schema("Index must have a name and cannot be an empty string");
            }), a[l] = As(l, p, d);
          }
        });
      }, Yo.prototype.stores = function(l) {
        var a = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? f(this._cfg.storesSource, l) : l;
        var l = a._versions, d = {}, p = {};
        return l.forEach(function(w) {
          f(d, w._cfg.storesSource), p = w._cfg.dbschema = {}, w._parseStoresSpec(d, p);
        }), a._dbSchema = p, Ts(a, [a._allTables, a, a.Transaction.prototype]), jo(a, [a._allTables, a, a.Transaction.prototype, this._cfg.tables], c(p), p), a._storeNames = c(p), this;
      }, Yo.prototype.upgrade = function(i) {
        return this._cfg.contentUpgrade = cs(this._cfg.contentUpgrade || pt, i), this;
      }, Yo);
      function Yo() {
      }
      function _s(i, a) {
        var l = i._dbNamesDB;
        return l || (l = i._dbNamesDB = new on(Do, { addons: [], indexedDB: i, IDBKeyRange: a })).version(1).stores({ dbnames: "name" }), l.table("dbnames");
      }
      function Ns(i) {
        return i && typeof i.databases == "function";
      }
      function Cs(i) {
        return mn(function() {
          return ut.letThrough = !0, i();
        });
      }
      function Us(i) {
        return !("from" in i);
      }
      var de = function(i, a) {
        if (!this) {
          var l = new de();
          return i && "d" in i && f(l, i), l;
        }
        f(this, arguments.length ? { d: 1, from: i, to: 1 < arguments.length ? a : i } : { d: 0 });
      };
      function jr(i, a, l) {
        var d = At(a, l);
        if (!isNaN(d)) {
          if (0 < d) throw RangeError();
          if (Us(i)) return f(i, { from: a, to: l, d: 1 });
          var p = i.l, d = i.r;
          if (At(l, i.from) < 0) return p ? jr(p, a, l) : i.l = { from: a, to: l, d: 1, l: null, r: null }, fu(i);
          if (0 < At(a, i.to)) return d ? jr(d, a, l) : i.r = { from: a, to: l, d: 1, l: null, r: null }, fu(i);
          At(a, i.from) < 0 && (i.from = a, i.l = null, i.d = d ? d.d + 1 : 1), 0 < At(l, i.to) && (i.to = l, i.r = null, i.d = i.l ? i.l.d + 1 : 1), l = !i.r, p && !i.l && zr(i, p), d && l && zr(i, d);
        }
      }
      function zr(i, a) {
        Us(a) || function l(d, k) {
          var w = k.from, v = k.to, x = k.l, k = k.r;
          jr(d, w, v), x && l(d, x), k && l(d, k);
        }(i, a);
      }
      function uu(i, a) {
        var l = Zo(a), d = l.next();
        if (d.done) return !1;
        for (var p = d.value, w = Zo(i), v = w.next(p.from), x = v.value; !d.done && !v.done; ) {
          if (At(x.from, p.to) <= 0 && 0 <= At(x.to, p.from)) return !0;
          At(p.from, x.from) < 0 ? p = (d = l.next(x.from)).value : x = (v = w.next(p.from)).value;
        }
        return !1;
      }
      function Zo(i) {
        var a = Us(i) ? null : { s: 0, n: i };
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
      function fu(i) {
        var a, l, d = (((a = i.r) === null || a === void 0 ? void 0 : a.d) || 0) - (((l = i.l) === null || l === void 0 ? void 0 : l.d) || 0), p = 1 < d ? "r" : d < -1 ? "l" : "";
        p && (a = p == "r" ? "l" : "r", l = r({}, i), d = i[p], i.from = d.from, i.to = d.to, i[p] = d[p], l[p] = d[a], (i[a] = l).d = lu(l)), i.d = lu(i);
      }
      function lu(l) {
        var a = l.r, l = l.l;
        return (a ? l ? Math.max(a.d, l.d) : a.d : l ? l.d : 0) + 1;
      }
      function Xo(i, a) {
        return c(a).forEach(function(l) {
          i[l] ? zr(i[l], a[l]) : i[l] = function d(p) {
            var w, v, x = {};
            for (w in p) g(p, w) && (v = p[w], x[w] = !v || typeof v != "object" || V.has(v.constructor) ? v : d(v));
            return x;
          }(a[l]);
        }), i;
      }
      function Rs(i, a) {
        return i.all || a.all || Object.keys(i).some(function(l) {
          return a[l] && uu(a[l], i[l]);
        });
      }
      m(de.prototype, ((Ue = { add: function(i) {
        return zr(this, i), this;
      }, addKey: function(i) {
        return jr(this, i, i), this;
      }, addKeys: function(i) {
        var a = this;
        return i.forEach(function(l) {
          return jr(a, l, l);
        }), this;
      }, hasKey: function(i) {
        var a = Zo(this).next(i).value;
        return a && At(a.from, i) <= 0 && 0 <= At(a.to, i);
      } })[q] = function() {
        return Zo(this);
      }, Ue));
      var Vn = {}, $s = {}, Os = !1;
      function Qo(i) {
        Xo($s, i), Os || (Os = !0, setTimeout(function() {
          Os = !1, Ls($s, !($s = {}));
        }, 0));
      }
      function Ls(i, a) {
        a === void 0 && (a = !1);
        var l = /* @__PURE__ */ new Set();
        if (i.all) for (var d = 0, p = Object.values(Vn); d < p.length; d++) du(v = p[d], i, l, a);
        else for (var w in i) {
          var v, x = /^idb\:\/\/(.*)\/(.*)\//.exec(w);
          x && (w = x[1], x = x[2], (v = Vn["idb://".concat(w, "/").concat(x)]) && du(v, i, l, a));
        }
        l.forEach(function(k) {
          return k();
        });
      }
      function du(i, a, l, d) {
        for (var p = [], w = 0, v = Object.entries(i.queries.query); w < v.length; w++) {
          for (var x = v[w], k = x[0], _ = [], U = 0, S = x[1]; U < S.length; U++) {
            var $ = S[U];
            Rs(a, $.obsSet) ? $.subscribers.forEach(function(N) {
              return l.add(N);
            }) : d && _.push($);
          }
          d && p.push([k, _]);
        }
        if (d) for (var T = 0, C = p; T < C.length; T++) {
          var R = C[T], k = R[0], _ = R[1];
          i.queries.query[k] = _;
        }
      }
      function Md(i) {
        var a = i._state, l = i._deps.indexedDB;
        if (a.isBeingOpened || i.idbdb) return a.dbReadyPromise.then(function() {
          return a.dbOpenError ? Ht(a.dbOpenError) : i;
        });
        a.isBeingOpened = !0, a.dbOpenError = null, a.openComplete = !1;
        var d = a.openCanceller, p = Math.round(10 * i.verno), w = !1;
        function v() {
          if (a.openCanceller !== d) throw new at.DatabaseClosed("db.open() was cancelled");
        }
        function x() {
          return new it(function($, T) {
            if (v(), !l) throw new at.MissingAPI();
            var C = i.name, R = a.autoSchema || !p ? l.open(C) : l.open(C, p);
            if (!R) throw new at.MissingAPI();
            R.onerror = Ge(T), R.onblocked = $t(i._fireOnBlocked), R.onupgradeneeded = $t(function(N) {
              var L;
              U = R.transaction, a.autoSchema && !i._options.allowEmptyDB ? (R.onerror = Hr, U.abort(), R.result.close(), (L = l.deleteDatabase(C)).onsuccess = L.onerror = $t(function() {
                T(new at.NoSuchDatabase("Database ".concat(C, " doesnt exist")));
              })) : (U.onerror = Ge(T), N = N.oldVersion > Math.pow(2, 62) ? 0 : N.oldVersion, S = N < 1, i.idbdb = R.result, w && Kd(i, U), Pd(i, N / 10, U, T));
            }, T), R.onsuccess = $t(function() {
              U = null;
              var N, L, P, K, H, Z = i.idbdb = R.result, et = O(Z.objectStoreNames);
              if (0 < et.length) try {
                var X = Z.transaction((K = et).length === 1 ? K[0] : K, "readonly");
                if (a.autoSchema) L = Z, P = X, (N = i).verno = L.version / 10, P = N._dbSchema = Go(0, L, P), N._storeNames = O(L.objectStoreNames, 0), jo(N, [N._allTables], c(P), P);
                else if (Wo(i, i._dbSchema, X), ((H = Is(Go(0, (H = i).idbdb, X), H._dbSchema)).add.length || H.change.some(function(J) {
                  return J.add.length || J.change.length;
                })) && !w) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), Z.close(), p = Z.version + 1, w = !0, $(x());
                qo(i, X);
              } catch {
              }
              sr.push(i), Z.onversionchange = $t(function(J) {
                a.vcFired = !0, i.on("versionchange").fire(J);
              }), Z.onclose = $t(function(J) {
                i.on("close").fire(J);
              }), S && (H = i._deps, X = C, Z = H.indexedDB, H = H.IDBKeyRange, Ns(Z) || X === Do || _s(Z, H).put({ name: X }).catch(pt)), $();
            }, T);
          }).catch(function($) {
            switch ($ == null ? void 0 : $.name) {
              case "UnknownError":
                if (0 < a.PR1398_maxLoop) return a.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), x();
                break;
              case "VersionError":
                if (0 < p) return p = 0, x();
            }
            return it.reject($);
          });
        }
        var k, _ = a.dbReadyResolve, U = null, S = !1;
        return it.race([d, (typeof navigator > "u" ? it.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function($) {
          function T() {
            return indexedDB.databases().finally($);
          }
          k = setInterval(T, 100), T();
        }).finally(function() {
          return clearInterval(k);
        }) : Promise.resolve()).then(x)]).then(function() {
          return v(), a.onReadyBeingFired = [], it.resolve(Cs(function() {
            return i.on.ready.fire(i.vip);
          })).then(function $() {
            if (0 < a.onReadyBeingFired.length) {
              var T = a.onReadyBeingFired.reduce(cs, pt);
              return a.onReadyBeingFired = [], it.resolve(Cs(function() {
                return T(i.vip);
              })).then($);
            }
          });
        }).finally(function() {
          a.openCanceller === d && (a.onReadyBeingFired = null, a.isBeingOpened = !1);
        }).catch(function($) {
          a.dbOpenError = $;
          try {
            U && U.abort();
          } catch {
          }
          return d === a.openCanceller && i._close(), Ht($);
        }).finally(function() {
          a.openComplete = !0, _();
        }).then(function() {
          var $;
          return S && ($ = {}, i.tables.forEach(function(T) {
            T.schema.indexes.forEach(function(C) {
              C.name && ($["idb://".concat(i.name, "/").concat(T.name, "/").concat(C.name)] = new de(-1 / 0, [[[]]]));
            }), $["idb://".concat(i.name, "/").concat(T.name, "/")] = $["idb://".concat(i.name, "/").concat(T.name, "/:dels")] = new de(-1 / 0, [[[]]]);
          }), xn(Fr).fire($), Ls($, !0)), i;
        });
      }
      function Ps(i) {
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
      function Jo(i, a, l) {
        for (var d = u(i) ? i.slice() : [i], p = 0; p < l; ++p) d.push(a);
        return d;
      }
      var Hd = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var l = i.table(a), d = l.schema, p = {}, w = [];
          function v(S, $, T) {
            var C = qr(S), R = p[C] = p[C] || [], N = S == null ? 0 : typeof S == "string" ? 1 : S.length, L = 0 < $, L = r(r({}, T), { name: L ? "".concat(C, "(virtual-from:").concat(T.name, ")") : T.name, lowLevelIndex: T, isVirtual: L, keyTail: $, keyLength: N, extractKey: ks(S), unique: !L && T.unique });
            return R.push(L), L.isPrimaryKey || w.push(L), 1 < N && v(N === 2 ? S[0] : S.slice(0, N - 1), $ + 1, T), R.sort(function(P, K) {
              return P.keyTail - K.keyTail;
            }), L;
          }
          a = v(d.primaryKey.keyPath, 0, d.primaryKey), p[":id"] = [a];
          for (var x = 0, k = d.indexes; x < k.length; x++) {
            var _ = k[x];
            v(_.keyPath, 0, _);
          }
          function U(S) {
            var $, T = S.query.index;
            return T.isVirtual ? r(r({}, S), { query: { index: T.lowLevelIndex, range: ($ = S.query.range, T = T.keyTail, { type: $.type === 1 ? 2 : $.type, lower: Jo($.lower, $.lowerOpen ? i.MAX_KEY : i.MIN_KEY, T), lowerOpen: !0, upper: Jo($.upper, $.upperOpen ? i.MIN_KEY : i.MAX_KEY, T), upperOpen: !0 }) } }) : S;
          }
          return r(r({}, l), { schema: r(r({}, d), { primaryKey: a, indexes: w, getIndexByKeyPath: function(S) {
            return (S = p[qr(S)]) && S[0];
          } }), count: function(S) {
            return l.count(U(S));
          }, query: function(S) {
            return l.query(U(S));
          }, openCursor: function(S) {
            var $ = S.query.index, T = $.keyTail, C = $.isVirtual, R = $.keyLength;
            return C ? l.openCursor(U(S)).then(function(L) {
              return L && N(L);
            }) : l.openCursor(S);
            function N(L) {
              return Object.create(L, { continue: { value: function(P) {
                P != null ? L.continue(Jo(P, S.reverse ? i.MAX_KEY : i.MIN_KEY, T)) : S.unique ? L.continue(L.key.slice(0, R).concat(S.reverse ? i.MIN_KEY : i.MAX_KEY, T)) : L.continue();
              } }, continuePrimaryKey: { value: function(P, K) {
                L.continuePrimaryKey(Jo(P, i.MAX_KEY, T), K);
              } }, primaryKey: { get: function() {
                return L.primaryKey;
              } }, key: { get: function() {
                var P = L.key;
                return R === 1 ? P[0] : P.slice(0, R);
              } }, value: { get: function() {
                return L.value;
              } } });
            }
          } });
        } });
      } };
      function Ks(i, a, l, d) {
        return l = l || {}, d = d || "", c(i).forEach(function(p) {
          var w, v, x;
          g(a, p) ? (w = i[p], v = a[p], typeof w == "object" && typeof v == "object" && w && v ? (x = F(w)) !== F(v) ? l[d + p] = a[p] : x === "Object" ? Ks(w, v, l, d + p + ".") : w !== v && (l[d + p] = a[p]) : w !== v && (l[d + p] = a[p])) : l[d + p] = void 0;
        }), c(a).forEach(function(p) {
          g(i, p) || (l[d + p] = a[p]);
        }), l;
      }
      function Ds(i, a) {
        return a.type === "delete" ? a.keys : a.keys || a.values.map(i.extractKey);
      }
      var Fd = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(i) {
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
                  return function S($, T, C) {
                    return l.query({ trans: $, values: !1, query: { index: d, range: T }, limit: C }).then(function(R) {
                      var N = R.result;
                      return U({ type: "delete", keys: N, trans: $ }).then(function(L) {
                        return 0 < L.numFailures ? Promise.reject(L.failures[0]) : N.length < C ? { failures: [], numFailures: 0, lastResult: void 0 } : S($, r(r({}, T), { lower: N[N.length - 1], lowerOpen: !0 }), C);
                      });
                    });
                  }(p.trans, p.range, 1e4);
                }, !0);
            }
            return l.mutate(p);
            function U(S) {
              var $, T, C, R = ut.trans, N = S.keys || Ds(d, S);
              if (!N) throw new Error("Keys missing");
              return (S = S.type === "add" || S.type === "put" ? r(r({}, S), { keys: N }) : r({}, S)).type !== "delete" && (S.values = o([], S.values)), S.keys && (S.keys = o([], S.keys)), $ = l, C = N, ((T = S).type === "add" ? Promise.resolve([]) : $.getMany({ trans: T.trans, keys: C, cache: "immutable" })).then(function(L) {
                var P = N.map(function(K, H) {
                  var Z, et, X, J = L[H], ot = { onerror: null, onsuccess: null };
                  return S.type === "delete" ? x.fire.call(ot, K, J, R) : S.type === "add" || J === void 0 ? (Z = k.fire.call(ot, K, S.values[H], R), K == null && Z != null && (S.keys[H] = K = Z, d.outbound || z(S.values[H], d.keyPath, K))) : (Z = Ks(J, S.values[H]), (et = _.fire.call(ot, Z, K, J, R)) && (X = S.values[H], Object.keys(et).forEach(function(tt) {
                    g(X, tt) ? X[tt] = et[tt] : z(X, tt, et[tt]);
                  }))), ot;
                });
                return l.mutate(S).then(function(K) {
                  for (var H = K.failures, Z = K.results, et = K.numFailures, K = K.lastResult, X = 0; X < N.length; ++X) {
                    var J = (Z || N)[X], ot = P[X];
                    J == null ? ot.onerror && ot.onerror(H[X]) : ot.onsuccess && ot.onsuccess(S.type === "put" && L[X] ? S.values[X] : J);
                  }
                  return { failures: H, results: Z, numFailures: et, lastResult: K };
                }).catch(function(K) {
                  return P.forEach(function(H) {
                    return H.onerror && H.onerror(K);
                  }), Promise.reject(K);
                });
              });
            }
          } });
        } });
      } };
      function hu(i, a, l) {
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
            var p = hu(d.keys, d.trans._cache, d.cache === "clone");
            return p ? it.resolve(p) : l.getMany(d).then(function(w) {
              return d.trans._cache = { keys: d.keys, values: d.cache === "clone" ? xt(w) : w }, w;
            });
          }, mutate: function(d) {
            return d.type !== "add" && (d.trans._cache = null), l.mutate(d);
          } });
        } };
      } };
      function pu(i, a) {
        return i.trans.mode === "readonly" && !!i.subscr && !i.trans.explicit && i.trans.db._options.cache !== "disabled" && !a.schema.primaryKey.outbound;
      }
      function gu(i, a) {
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
          var p = i.table(d), w = p.schema, v = w.primaryKey, S = w.indexes, x = v.extractKey, k = v.outbound, _ = v.autoIncrement && S.filter(function(T) {
            return T.compound && T.keyPath.includes(v.keyPath);
          }), U = r(r({}, p), { mutate: function(T) {
            function C(tt) {
              return tt = "idb://".concat(a, "/").concat(d, "/").concat(tt), K[tt] || (K[tt] = new de());
            }
            var R, N, L, P = T.trans, K = T.mutatedParts || (T.mutatedParts = {}), H = C(""), Z = C(":dels"), et = T.type, ot = T.type === "deleteRange" ? [T.range] : T.type === "delete" ? [T.keys] : T.values.length < 50 ? [Ds(v, T).filter(function(tt) {
              return tt;
            }), T.values] : [], X = ot[0], J = ot[1], ot = T.trans._cache;
            return u(X) ? (H.addKeys(X), (ot = et === "delete" || X.length === J.length ? hu(X, ot) : null) || Z.addKeys(X), (ot || J) && (R = C, N = ot, L = J, w.indexes.forEach(function(tt) {
              var ct = R(tt.name || "");
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
            }))) : X ? (J = { from: (J = X.lower) !== null && J !== void 0 ? J : i.MIN_KEY, to: (J = X.upper) !== null && J !== void 0 ? J : i.MAX_KEY }, Z.add(J), H.add(J)) : (H.add(l), Z.add(l), w.indexes.forEach(function(tt) {
              return C(tt.name).add(l);
            })), p.mutate(T).then(function(tt) {
              return !X || T.type !== "add" && T.type !== "put" || (H.addKeys(tt.results), _ && _.forEach(function(ct) {
                for (var yt = T.values.map(function(gt) {
                  return ct.extractKey(gt);
                }), vt = ct.keyPath.findIndex(function(gt) {
                  return gt === v.keyPath;
                }), Et = 0, Ce = tt.results.length; Et < Ce; ++Et) yt[Et][vt] = tt.results[Et];
                C(ct.name).addKeys(yt);
              })), P.mutatedParts = Xo(P.mutatedParts || {}, K), tt;
            });
          } }), S = function(C) {
            var R = C.query, C = R.index, R = R.range;
            return [C, new de((C = R.lower) !== null && C !== void 0 ? C : i.MIN_KEY, (R = R.upper) !== null && R !== void 0 ? R : i.MAX_KEY)];
          }, $ = { get: function(T) {
            return [v, new de(T.key)];
          }, getMany: function(T) {
            return [v, new de().addKeys(T.keys)];
          }, count: S, query: S, openCursor: S };
          return c($).forEach(function(T) {
            U[T] = function(C) {
              var R = ut.subscr, N = !!R, L = pu(ut, p) && gu(T, C) ? C.obsSet = {} : R;
              if (N) {
                var P = function(J) {
                  return J = "idb://".concat(a, "/").concat(d, "/").concat(J), L[J] || (L[J] = new de());
                }, K = P(""), H = P(":dels"), R = $[T](C), N = R[0], R = R[1];
                if ((T === "query" && N.isPrimaryKey && !C.values ? H : P(N.name || "")).add(R), !N.isPrimaryKey) {
                  if (T !== "count") {
                    var Z = T === "query" && k && C.values && p.query(r(r({}, C), { values: !1 }));
                    return p[T].apply(this, arguments).then(function(J) {
                      if (T === "query") {
                        if (k && C.values) return Z.then(function(yt) {
                          return yt = yt.result, K.addKeys(yt), J;
                        });
                        var ot = C.values ? J.result.map(x) : J.result;
                        (C.values ? K : H).addKeys(ot);
                      } else if (T === "openCursor") {
                        var tt = J, ct = C.values;
                        return tt && Object.create(tt, { key: { get: function() {
                          return H.addKey(tt.primaryKey), tt.key;
                        } }, primaryKey: { get: function() {
                          var yt = tt.primaryKey;
                          return H.addKey(yt), yt;
                        } }, value: { get: function() {
                          return ct && K.addKey(tt.primaryKey), tt.value;
                        } } });
                      }
                      return J;
                    });
                  }
                  H.add(l);
                }
              }
              return p[T].apply(this, arguments);
            };
          }), U;
        } });
      } };
      function yu(i, a, l) {
        if (l.numFailures === 0) return a;
        if (a.type === "deleteRange") return null;
        var d = a.keys ? a.keys.length : "values" in a && a.values ? a.values.length : 1;
        return l.numFailures === d ? null : (a = r({}, a), u(a.keys) && (a.keys = a.keys.filter(function(p, w) {
          return !(w in l.failures);
        })), "values" in a && u(a.values) && (a.values = a.values.filter(function(p, w) {
          return !(w in l.failures);
        })), a);
      }
      function Ms(i, a) {
        return l = i, ((d = a).lower === void 0 || (d.lowerOpen ? 0 < At(l, d.lower) : 0 <= At(l, d.lower))) && (i = i, (a = a).upper === void 0 || (a.upperOpen ? At(i, a.upper) < 0 : At(i, a.upper) <= 0));
        var l, d;
      }
      function wu(i, a, $, d, p, w) {
        if (!$ || $.length === 0) return i;
        var v = a.query.index, x = v.multiEntry, k = a.query.range, _ = d.schema.primaryKey.extractKey, U = v.extractKey, S = (v.lowLevelIndex || v).extractKey, $ = $.reduce(function(T, C) {
          var R = T, N = [];
          if (C.type === "add" || C.type === "put") for (var L = new de(), P = C.values.length - 1; 0 <= P; --P) {
            var K, H = C.values[P], Z = _(H);
            L.hasKey(Z) || (K = U(H), (x && u(K) ? K.some(function(tt) {
              return Ms(tt, k);
            }) : Ms(K, k)) && (L.addKey(Z), N.push(H)));
          }
          switch (C.type) {
            case "add":
              var et = new de().addKeys(a.values ? T.map(function(ct) {
                return _(ct);
              }) : T), R = T.concat(a.values ? N.filter(function(ct) {
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
              R = T.filter(function(ct) {
                return !X.hasKey(a.values ? _(ct) : ct);
              }).concat(a.values ? N : N.map(function(ct) {
                return _(ct);
              }));
              break;
            case "delete":
              var J = new de().addKeys(C.keys);
              R = T.filter(function(ct) {
                return !J.hasKey(a.values ? _(ct) : ct);
              });
              break;
            case "deleteRange":
              var ot = C.range;
              R = T.filter(function(ct) {
                return !Ms(_(ct), ot);
              });
          }
          return R;
        }, i);
        return $ === i ? i : ($.sort(function(T, C) {
          return At(S(T), S(C)) || At(_(T), _(C));
        }), a.limit && a.limit < 1 / 0 && ($.length > a.limit ? $.length = a.limit : i.length === a.limit && $.length < a.limit && (p.dirty = !0)), w ? Object.freeze($) : $);
      }
      function mu(i, a) {
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
                  var $ = S[U], T = Vn["idb://".concat(a, "/").concat($)];
                  if (T) {
                    var C = i.table($), R = T.optimisticOps.filter(function(ct) {
                      return ct.trans === x;
                    });
                    if (x._explicit && k && x.mutatedParts) for (var N = 0, L = Object.values(T.queries.query); N < L.length; N++) for (var P = 0, K = (et = L[N]).slice(); P < K.length; P++) Rs((X = K[P]).obsSet, x.mutatedParts) && (st(et, X), X.subscribers.forEach(function(ct) {
                      return _.add(ct);
                    }));
                    else if (0 < R.length) {
                      T.optimisticOps = T.optimisticOps.filter(function(ct) {
                        return ct.trans !== x;
                      });
                      for (var H = 0, Z = Object.values(T.queries.query); H < Z.length; H++) for (var et, X, J, ot = 0, tt = (et = Z[H]).slice(); ot < tt.length; ot++) (X = tt[ot]).res != null && x.mutatedParts && (k && !X.dirty ? (J = Object.isFrozen(X.res), J = wu(X.res, X.req, R, C, X, J), X.dirty ? (st(et, X), X.subscribers.forEach(function(ct) {
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
            var x = Vn["idb://".concat(a, "/").concat(l)];
            return x ? (v = d.mutate(w), w.type !== "add" && w.type !== "put" || !(50 <= w.values.length || Ds(p, w).some(function(k) {
              return k == null;
            })) ? (x.optimisticOps.push(w), w.mutatedParts && Qo(w.mutatedParts), v.then(function(k) {
              0 < k.numFailures && (st(x.optimisticOps, w), (k = yu(0, w, k)) && x.optimisticOps.push(k), w.mutatedParts && Qo(w.mutatedParts));
            }), v.catch(function() {
              st(x.optimisticOps, w), w.mutatedParts && Qo(w.mutatedParts);
            })) : v.then(function(k) {
              var _ = yu(0, r(r({}, w), { values: w.values.map(function(U, S) {
                var $;
                return k.failures[S] ? U : (U = ($ = p.keyPath) !== null && $ !== void 0 && $.includes(".") ? xt(U) : r({}, U), z(U, p.keyPath, k.results[S]), U);
              }) }), k);
              x.optimisticOps.push(_), queueMicrotask(function() {
                return w.mutatedParts && Qo(w.mutatedParts);
              });
            }), v) : d.mutate(w);
          }, query: function(w) {
            if (!pu(ut, d) || !gu("query", w)) return d.query(w);
            var v = ((_ = ut.trans) === null || _ === void 0 ? void 0 : _.db._options.cache) === "immutable", S = ut, x = S.requery, k = S.signal, _ = function(C, R, N, L) {
              var P = Vn["idb://".concat(C, "/").concat(R)];
              if (!P) return [];
              if (!(R = P.queries[N])) return [null, !1, P, null];
              var K = R[(L.query ? L.query.index.name : null) || ""];
              if (!K) return [null, !1, P, null];
              switch (N) {
                case "query":
                  var H = K.find(function(Z) {
                    return Z.req.limit === L.limit && Z.req.values === L.values && mu(Z.req.query.range, L.query.range);
                  });
                  return H ? [H, !0, P, K] : [K.find(function(Z) {
                    return ("limit" in Z.req ? Z.req.limit : 1 / 0) >= L.limit && (!L.values || Z.req.values) && jd(Z.req.query.range, L.query.range);
                  }), !1, P, K];
                case "count":
                  return H = K.find(function(Z) {
                    return mu(Z.req.query.range, L.query.range);
                  }), [H, !!H, P, K];
              }
            }(a, l, "query", w), U = _[0], S = _[1], $ = _[2], T = _[3];
            return U && S ? U.obsSet = w.obsSet : (S = d.query(w).then(function(C) {
              var R = C.result;
              if (U && (U.res = R), v) {
                for (var N = 0, L = R.length; N < L; ++N) Object.freeze(R[N]);
                Object.freeze(R);
              } else C.result = xt(R);
              return C;
            }).catch(function(C) {
              return T && U && st(T, U), Promise.reject(C);
            }), U = { obsSet: w.obsSet, promise: S, subscribers: /* @__PURE__ */ new Set(), type: "query", req: w, dirty: !1 }, T ? T.push(U) : (T = [U], ($ = $ || (Vn["idb://".concat(a, "/").concat(l)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[w.query.index.name || ""] = T)), zd(U, T, x, k), U.promise.then(function(C) {
              return { result: wu(C.result, w, $ == null ? void 0 : $.optimisticOps, d, U, v) };
            });
          } });
        } });
      } };
      function ti(i, a) {
        return new Proxy(i, { get: function(l, d, p) {
          return d === "db" ? a : Reflect.get(l, d, p);
        } });
      }
      var on = (Ft.prototype.version = function(i) {
        if (isNaN(i) || i < 0.1) throw new at.Type("Given version is not a positive number");
        if (i = Math.round(10 * i) / 10, this.idbdb || this._state.isBeingOpened) throw new at.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, i);
        var a = this._versions, l = a.filter(function(d) {
          return d._cfg.version === i;
        })[0];
        return l || (l = new this.Version(i), a.push(l), a.sort(Ld), l.stores({}), this._state.autoSchema = !1, l);
      }, Ft.prototype._whenReady = function(i) {
        var a = this;
        return this.idbdb && (this._state.openComplete || ut.letThrough || this._vip) ? i() : new it(function(l, d) {
          if (a._state.openComplete) return d(new at.DatabaseClosed(a._state.dbOpenError));
          if (!a._state.isBeingOpened) {
            if (!a._state.autoOpen) return void d(new at.DatabaseClosed());
            a.open().catch(pt);
          }
          a._state.dbReadyPromise.then(l, d);
        }).then(i);
      }, Ft.prototype.use = function(i) {
        var a = i.stack, l = i.create, d = i.level, p = i.name;
        return p && this.unuse({ stack: a, name: p }), i = this._middlewares[a] || (this._middlewares[a] = []), i.push({ stack: a, create: l, level: d ?? 10, name: p }), i.sort(function(w, v) {
          return w.level - v.level;
        }), this;
      }, Ft.prototype.unuse = function(i) {
        var a = i.stack, l = i.name, d = i.create;
        return a && this._middlewares[a] && (this._middlewares[a] = this._middlewares[a].filter(function(p) {
          return d ? p.create !== d : !!l && p.name !== l;
        })), this;
      }, Ft.prototype.open = function() {
        var i = this;
        return Mn(wn, function() {
          return Md(i);
        });
      }, Ft.prototype._close = function() {
        var i = this._state, a = sr.indexOf(this);
        if (0 <= a && sr.splice(a, 1), this.idbdb) {
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
      }, Ft.prototype.close = function(l) {
        var a = (l === void 0 ? { disableAutoOpen: !0 } : l).disableAutoOpen, l = this._state;
        a ? (l.isBeingOpened && l.cancelOpen(new at.DatabaseClosed()), this._close(), l.autoOpen = !1, l.dbOpenError = new at.DatabaseClosed()) : (this._close(), l.autoOpen = this._options.autoOpen || l.isBeingOpened, l.openComplete = !1, l.dbOpenError = null);
      }, Ft.prototype.delete = function(i) {
        var a = this;
        i === void 0 && (i = { disableAutoOpen: !0 });
        var l = 0 < arguments.length && typeof arguments[0] != "object", d = this._state;
        return new it(function(p, w) {
          function v() {
            a.close(i);
            var x = a._deps.indexedDB.deleteDatabase(a.name);
            x.onsuccess = $t(function() {
              var k, _, U;
              k = a._deps, _ = a.name, U = k.indexedDB, k = k.IDBKeyRange, Ns(U) || _ === Do || _s(U, k).delete(_).catch(pt), p();
            }), x.onerror = Ge(w), x.onblocked = a._fireOnBlocked;
          }
          if (l) throw new at.InvalidArgument("Invalid closeOptions argument to db.delete()");
          d.isBeingOpened ? d.dbReadyPromise.then(v) : v();
        });
      }, Ft.prototype.backendDB = function() {
        return this.idbdb;
      }, Ft.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, Ft.prototype.hasBeenClosed = function() {
        var i = this._state.dbOpenError;
        return i && i.name === "DatabaseClosed";
      }, Ft.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, Ft.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(Ft.prototype, "tables", { get: function() {
        var i = this;
        return c(this._allTables).map(function(a) {
          return i._allTables[a];
        });
      }, enumerable: !1, configurable: !0 }), Ft.prototype.transaction = function() {
        var i = (function(a, l, d) {
          var p = arguments.length;
          if (p < 2) throw new at.InvalidArgument("Too few arguments");
          for (var w = new Array(p - 1); --p; ) w[p - 1] = arguments[p];
          return d = w.pop(), [a, wt(w), d];
        }).apply(this, arguments);
        return this._transaction.apply(this, i);
      }, Ft.prototype._transaction = function(i, a, l) {
        var d = this, p = ut.trans;
        p && p.db === this && i.indexOf("!") === -1 || (p = null);
        var w, v, x = i.indexOf("?") !== -1;
        i = i.replace("!", "").replace("?", "");
        try {
          if (v = a.map(function(_) {
            if (_ = _ instanceof d.Table ? _.name : _, typeof _ != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return _;
          }), i == "r" || i === ws) w = ws;
          else {
            if (i != "rw" && i != ms) throw new at.InvalidArgument("Invalid transaction mode: " + i);
            w = ms;
          }
          if (p) {
            if (p.mode === ws && w === ms) {
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
          }) : Ht(_);
        }
        var k = (function _(U, S, $, T, C) {
          return it.resolve().then(function() {
            var R = ut.transless || ut, N = U._createTransaction(S, $, U._dbSchema, T);
            if (N.explicit = !0, R = { trans: N, transless: R }, T) N.idbtrans = T.idbtrans;
            else try {
              N.create(), N.idbtrans._explicit = !0, U._state.PR1398_maxLoop = 3;
            } catch (K) {
              return K.name === Ke.InvalidState && U.isOpen() && 0 < --U._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), U.close({ disableAutoOpen: !1 }), U.open().then(function() {
                return _(U, S, $, null, C);
              })) : Ht(K);
            }
            var L, P = St(C);
            return P && ir(), R = it.follow(function() {
              var K;
              (L = C.call(N, N)) && (P ? (K = bn.bind(null, null), L.then(K, K)) : typeof L.next == "function" && typeof L.throw == "function" && (L = Ps(L)));
            }, R), (L && typeof L.then == "function" ? it.resolve(L).then(function(K) {
              return N.active ? K : Ht(new at.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : R.then(function() {
              return L;
            })).then(function(K) {
              return T && N._resolve(), N._completion.then(function() {
                return K;
              });
            }).catch(function(K) {
              return N._reject(K), Ht(K);
            });
          });
        }).bind(null, this, w, v, p, l);
        return p ? p._promise(w, k, "lock") : ut.trans ? Mn(ut.transless, function() {
          return d._whenReady(k);
        }) : this._whenReady(k);
      }, Ft.prototype.table = function(i) {
        if (!g(this._allTables, i)) throw new at.InvalidTable("Table ".concat(i, " does not exist"));
        return this._allTables[i];
      }, Ft);
      function Ft(i, a) {
        var l = this;
        this._middlewares = {}, this.verno = 0;
        var d = Ft.dependencies;
        this._options = a = r({ addons: Ft.addons, autoOpen: !0, indexedDB: d.indexedDB, IDBKeyRange: d.IDBKeyRange, cache: "cloned" }, a), this._deps = { indexedDB: a.indexedDB, IDBKeyRange: a.IDBKeyRange }, d = a.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var p, w, v, x, k, _ = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: pt, dbReadyPromise: null, cancelOpen: pt, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: a.autoOpen };
        _.dbReadyPromise = new it(function(S) {
          _.dbReadyResolve = S;
        }), _.openCanceller = new it(function(S, $) {
          _.cancelOpen = $;
        }), this._state = _, this.name = i, this.on = Kr(this, "populate", "blocked", "versionchange", "close", { ready: [cs, pt] }), this.on.ready.subscribe = D(this.on.ready.subscribe, function(S) {
          return function($, T) {
            Ft.vip(function() {
              var C, R = l._state;
              R.openComplete ? (R.dbOpenError || it.resolve().then($), T && S($)) : R.onReadyBeingFired ? (R.onReadyBeingFired.push($), T && S($)) : (S($), C = l, T || S(function N() {
                C.on.ready.unsubscribe($), C.on.ready.unsubscribe(N);
              }));
            });
          };
        }), this.Collection = (p = this, Dr(_d.prototype, function(L, N) {
          this.db = p;
          var T = Yc, C = null;
          if (N) try {
            T = N();
          } catch (P) {
            C = P;
          }
          var R = L._ctx, N = R.table, L = N.hook.reading.fire;
          this._ctx = { table: N, index: R.index, isPrimKey: !R.index || N.schema.primKey.keyPath && R.index === N.schema.primKey.name, range: T, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: C, or: R.or, valueMapper: L !== ce ? L : null };
        })), this.Table = (w = this, Dr(Jc.prototype, function(S, $, T) {
          this.db = w, this._tx = T, this.name = S, this.schema = $, this.hook = w._allTables[S] ? w._allTables[S].hook : Kr(null, { creating: [vd, pt], reading: [_e, ce], updating: [xd, pt], deleting: [Ed, pt] });
        })), this.Transaction = (v = this, Dr(Ud.prototype, function(S, $, T, C, R) {
          var N = this;
          this.db = v, this.mode = S, this.storeNames = $, this.schema = T, this.chromeTransactionDurability = C, this.idbtrans = null, this.on = Kr(this, "complete", "error", "abort"), this.parent = R || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new it(function(L, P) {
            N._resolve = L, N._reject = P;
          }), this._completion.then(function() {
            N.active = !1, N.on.complete.fire();
          }, function(L) {
            var P = N.active;
            return N.active = !1, N.on.error.fire(L), N.parent ? N.parent._reject(L) : P && N.idbtrans && N.idbtrans.abort(), Ht(L);
          });
        })), this.Version = (x = this, Dr(Dd.prototype, function(S) {
          this.db = x, this._cfg = { version: S, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (k = this, Dr(ou.prototype, function(S, $, T) {
          if (this.db = k, this._ctx = { table: S, index: $ === ":id" ? null : $, or: T }, this._cmp = this._ascending = At, this._descending = function(C, R) {
            return At(R, C);
          }, this._max = function(C, R) {
            return 0 < At(C, R) ? C : R;
          }, this._min = function(C, R) {
            return At(C, R) < 0 ? C : R;
          }, this._IDBKeyRange = k._deps.IDBKeyRange, !this._IDBKeyRange) throw new at.MissingAPI();
        })), this.on("versionchange", function(S) {
          0 < S.newVersion ? console.warn("Another connection wants to upgrade database '".concat(l.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(l.name, "'. Closing db now to resume the delete request.")), l.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(S) {
          !S.newVersion || S.newVersion < S.oldVersion ? console.warn("Dexie.delete('".concat(l.name, "') was blocked")) : console.warn("Upgrade '".concat(l.name, "' blocked by other connection holding version ").concat(S.oldVersion / 10));
        }), this._maxKey = Vr(a.IDBKeyRange), this._createTransaction = function(S, $, T, C) {
          return new l.Transaction(S, $, T, l._options.chromeTransactionDurability, C);
        }, this._fireOnBlocked = function(S) {
          l.on("blocked").fire(S), sr.filter(function($) {
            return $.name === l.name && $ !== l && !$._state.vcFired;
          }).map(function($) {
            return $.on("versionchange").fire(S);
          });
        }, this.use(Vd), this.use(Gd), this.use(qd), this.use(Hd), this.use(Fd);
        var U = new Proxy(this, { get: function(S, $, T) {
          if ($ === "_vip") return !0;
          if ($ === "table") return function(R) {
            return ti(l.table(R), U);
          };
          var C = Reflect.get(S, $, T);
          return C instanceof Jc ? ti(C, U) : $ === "tables" ? C.map(function(R) {
            return ti(R, U);
          }) : $ === "_createTransaction" ? function() {
            return ti(C.apply(this, arguments), U);
          } : C;
        } });
        this.vip = U, d.forEach(function(S) {
          return S(l);
        });
      }
      var ei, Ue = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", Wd = (Hs.prototype.subscribe = function(i, a, l) {
        return this._subscribe(i && typeof i != "function" ? i : { next: i, error: a, complete: l });
      }, Hs.prototype[Ue] = function() {
        return this;
      }, Hs);
      function Hs(i) {
        this._subscribe = i;
      }
      try {
        ei = { indexedDB: s.indexedDB || s.mozIndexedDB || s.webkitIndexedDB || s.msIndexedDB, IDBKeyRange: s.IDBKeyRange || s.webkitIDBKeyRange };
      } catch {
        ei = { indexedDB: null, IDBKeyRange: null };
      }
      function bu(i) {
        var a, l = !1, d = new Wd(function(p) {
          var w = St(i), v, x = !1, k = {}, _ = {}, U = { get closed() {
            return x;
          }, unsubscribe: function() {
            x || (x = !0, v && v.abort(), S && xn.storagemutated.unsubscribe(T));
          } };
          p.start && p.start(U);
          var S = !1, $ = function() {
            return ys(C);
          }, T = function(R) {
            Xo(k, R), Rs(_, k) && $();
          }, C = function() {
            var R, N, L;
            !x && ei.indexedDB && (k = {}, R = {}, v && v.abort(), v = new AbortController(), L = function(P) {
              var K = rr();
              try {
                w && ir();
                var H = mn(i, P);
                return H = w ? H.finally(bn) : H;
              } finally {
                K && or();
              }
            }(N = { subscr: R, signal: v.signal, requery: $, querier: i, trans: null }), Promise.resolve(L).then(function(P) {
              l = !0, a = P, x || N.signal.aborted || (k = {}, function(K) {
                for (var H in K) if (g(K, H)) return;
                return 1;
              }(_ = R) || S || (xn(Fr, T), S = !0), ys(function() {
                return !x && p.next && p.next(P);
              }));
            }, function(P) {
              l = !1, ["DatabaseClosedError", "AbortError"].includes(P == null ? void 0 : P.name) || x || ys(function() {
                x || p.error && p.error(P);
              });
            }));
          };
          return setTimeout($, 0), U;
        });
        return d.hasValue = function() {
          return l;
        }, d.getValue = function() {
          return a;
        }, d;
      }
      var qn = on;
      function Fs(i) {
        var a = Sn;
        try {
          Sn = !0, xn.storagemutated.fire(i), Ls(i, !0);
        } finally {
          Sn = a;
        }
      }
      m(qn, r(r({}, le), { delete: function(i) {
        return new qn(i, { addons: [] }).delete();
      }, exists: function(i) {
        return new qn(i, { addons: [] }).open().then(function(a) {
          return a.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(i) {
        try {
          return a = qn.dependencies, l = a.indexedDB, a = a.IDBKeyRange, (Ns(l) ? Promise.resolve(l.databases()).then(function(d) {
            return d.map(function(p) {
              return p.name;
            }).filter(function(p) {
              return p !== Do;
            });
          }) : _s(l, a).toCollection().primaryKeys()).then(i);
        } catch {
          return Ht(new at.MissingAPI());
        }
        var a, l;
      }, defineClass: function() {
        return function(i) {
          f(this, i);
        };
      }, ignoreTransaction: function(i) {
        return ut.trans ? Mn(ut.transless, i) : i();
      }, vip: Cs, async: function(i) {
        return function() {
          try {
            var a = Ps(i.apply(this, arguments));
            return a && typeof a.then == "function" ? a : it.resolve(a);
          } catch (l) {
            return Ht(l);
          }
        };
      }, spawn: function(i, a, l) {
        try {
          var d = Ps(i.apply(l, a || []));
          return d && typeof d.then == "function" ? d : it.resolve(d);
        } catch (p) {
          return Ht(p);
        }
      }, currentTransaction: { get: function() {
        return ut.trans || null;
      } }, waitFor: function(i, a) {
        return a = it.resolve(typeof i == "function" ? qn.ignoreTransaction(i) : i).timeout(a || 6e4), ut.trans ? ut.trans.waitFor(a) : a;
      }, Promise: it, debug: { get: function() {
        return ze;
      }, set: function(i) {
        Fc(i);
      } }, derive: I, extend: f, props: m, override: D, Events: Kr, on: xn, liveQuery: bu, extendObservabilitySet: Xo, getByKeyPath: W, setByKeyPath: z, delByKeyPath: function(i, a) {
        typeof a == "string" ? z(i, a, void 0) : "length" in a && [].map.call(a, function(l) {
          z(i, l, void 0);
        });
      }, shallowClone: nt, deepClone: xt, getObjectDiff: Ks, cmp: At, asap: G, minKey: -1 / 0, addons: [], connections: sr, errnames: Ke, dependencies: ei, cache: Vn, semVer: "4.0.11", version: "4.0.11".split(".").map(function(i) {
        return parseInt(i);
      }).reduce(function(i, a, l) {
        return i + a / Math.pow(10, 2 * l);
      }) })), qn.maxKey = Vr(qn.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (xn(Fr, function(i) {
        Sn || (i = new CustomEvent(xs, { detail: i }), Sn = !0, dispatchEvent(i), Sn = !1);
      }), addEventListener(xs, function(i) {
        i = i.detail, Sn || Fs(i);
      }));
      var ur, Sn = !1, vu = function() {
      };
      return typeof BroadcastChannel < "u" && ((vu = function() {
        (ur = new BroadcastChannel(xs)).onmessage = function(i) {
          return i.data && Fs(i.data);
        };
      })(), typeof ur.unref == "function" && ur.unref(), xn(Fr, function(i) {
        Sn || ur.postMessage(i);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(i) {
        if (!on.disableBfCache && i.persisted) {
          ze && console.debug("Dexie: handling persisted pagehide"), ur != null && ur.close();
          for (var a = 0, l = sr; a < l.length; a++) l[a].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(i) {
        !on.disableBfCache && i.persisted && (ze && console.debug("Dexie: handling persisted pageshow"), vu(), Fs({ all: new de(-1 / 0, [[]]) }));
      })), it.rejectionMapper = function(i, a) {
        return !i || i instanceof It || i instanceof TypeError || i instanceof SyntaxError || !i.name || !je[i.name] ? i : (a = new je[i.name](a || i.message, i), "stack" in i && A(a, "stack", { get: function() {
          return this.inner.stack;
        } }), a);
      }, Fc(ze), r(on, Object.freeze({ __proto__: null, Dexie: on, liveQuery: bu, Entity: Zc, cmp: At, PropModification: Mr, replacePrefix: function(i, a) {
        return new Mr({ replacePrefix: [i, a] });
      }, add: function(i) {
        return new Mr({ add: i });
      }, remove: function(i) {
        return new Mr({ remove: i });
      }, default: on, RangeSet: de, mergeRanges: zr, rangesOverlap: uu }), { default: on }), on;
    });
  }(bi)), bi.exports;
}
var rw = nw();
const Ya = /* @__PURE__ */ Tg(rw), Lf = Symbol.for("Dexie"), ji = globalThis[Lf] || (globalThis[Lf] = Ya);
if (Ya.semVer !== ji.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Ya.semVer} and ${ji.semVer}`);
const {
  liveQuery: dw,
  mergeRanges: hw,
  rangesOverlap: pw,
  RangeSet: gw,
  cmp: yw,
  Entity: ww,
  PropModification: mw,
  replacePrefix: bw,
  add: vw,
  remove: Ew
} = ji, Wn = new ji("arkade", { allowEmptyDB: !0 });
Wn.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const ow = {
  addOrUpdate: async (t) => {
    await Wn.vtxos.bulkPut(t);
  },
  deleteAll: async () => Wn.vtxos.clear(),
  getSpendableVtxos: async () => Wn.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await Wn.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  close: async () => Wn.close(),
  open: async () => {
    await Wn.open();
  }
}, iw = new tw(ow);
iw.start().catch(console.error);
const Hc = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(Hc)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== Hc)
          return caches.delete(n);
      })
    ))
  ), self.clients.claim();
});
async function sw(t) {
  const e = await caches.open(Hc);
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
  t.respondWith(sw(t.request));
});
