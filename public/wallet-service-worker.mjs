const Zn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ul(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Fo(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function ue(t, ...e) {
  if (!ul(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function fl(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  Fo(t.outputLen), Fo(t.blockLen);
}
function Ho(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function ll(t, e) {
  ue(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function or(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function os(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function qe(t, e) {
  return t << 32 - e | t >>> e;
}
function _o(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function dl(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function Xs(t) {
  return typeof t == "string" && (t = dl(t)), ue(t), t;
}
function hl(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ue(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
class fu {
}
function lu(t) {
  const e = (r) => t().update(Xs(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Qs(t = 32) {
  if (Zn && typeof Zn.getRandomValues == "function")
    return Zn.getRandomValues(new Uint8Array(t));
  if (Zn && typeof Zn.randomBytes == "function")
    return Uint8Array.from(Zn.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function pl(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), s = BigInt(4294967295), c = Number(n >> i & s), f = Number(n & s), l = r ? 4 : 0, p = r ? 0 : 4;
  t.setUint32(e + l, c, r), t.setUint32(e + p, f, r);
}
function gl(t, e, n) {
  return t & e ^ ~t & n;
}
function yl(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class du extends fu {
  constructor(e, n, r, i) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(e), this.view = os(this.buffer);
  }
  update(e) {
    Ho(this), e = Xs(e), ue(e);
    const { view: n, buffer: r, blockLen: i } = this, s = e.length;
    for (let c = 0; c < s; ) {
      const f = Math.min(i - this.pos, s - c);
      if (f === i) {
        const l = os(e);
        for (; i <= s - c; c += i)
          this.process(l, c);
        continue;
      }
      r.set(e.subarray(c, c + f), this.pos), this.pos += f, c += f, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Ho(this), ll(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, or(this.buffer.subarray(c)), this.padOffset > i - c && (this.process(r, 0), c = 0);
    for (let w = c; w < i; w++)
      n[w] = 0;
    pl(r, i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const f = os(e), l = this.outputLen;
    if (l % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const p = l / 4, g = this.get();
    if (p > g.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let w = 0; w < p; w++)
      f.setUint32(4 * w, g[w], s);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: c, pos: f } = this;
    return e.destroyed = c, e.finished = s, e.length = i, e.pos = f, i % n && e.buffer.set(r), e;
  }
  clone() {
    return this._cloneInto();
  }
}
const yn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), wl = /* @__PURE__ */ Uint32Array.from([
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
]), wn = /* @__PURE__ */ new Uint32Array(64);
class ml extends du {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = yn[0] | 0, this.B = yn[1] | 0, this.C = yn[2] | 0, this.D = yn[3] | 0, this.E = yn[4] | 0, this.F = yn[5] | 0, this.G = yn[6] | 0, this.H = yn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: i, E: s, F: c, G: f, H: l } = this;
    return [e, n, r, i, s, c, f, l];
  }
  // prettier-ignore
  set(e, n, r, i, s, c, f, l) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = c | 0, this.G = f | 0, this.H = l | 0;
  }
  process(e, n) {
    for (let w = 0; w < 16; w++, n += 4)
      wn[w] = e.getUint32(n, !1);
    for (let w = 16; w < 64; w++) {
      const b = wn[w - 15], E = wn[w - 2], k = qe(b, 7) ^ qe(b, 18) ^ b >>> 3, O = qe(E, 17) ^ qe(E, 19) ^ E >>> 10;
      wn[w] = O + wn[w - 7] + k + wn[w - 16] | 0;
    }
    let { A: r, B: i, C: s, D: c, E: f, F: l, G: p, H: g } = this;
    for (let w = 0; w < 64; w++) {
      const b = qe(f, 6) ^ qe(f, 11) ^ qe(f, 25), E = g + b + gl(f, l, p) + wl[w] + wn[w] | 0, O = (qe(r, 2) ^ qe(r, 13) ^ qe(r, 22)) + yl(r, i, s) | 0;
      g = p, p = l, l = f, f = c + E | 0, c = s, s = i, i = r, r = E + O | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, c = c + this.D | 0, f = f + this.E | 0, l = l + this.F | 0, p = p + this.G | 0, g = g + this.H | 0, this.set(r, i, s, c, f, l, p, g);
  }
  roundClean() {
    or(wn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), or(this.buffer);
  }
}
const se = /* @__PURE__ */ lu(() => new ml());
class hu extends fu {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, fl(e);
    const r = Xs(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const i = this.blockLen, s = new Uint8Array(i);
    s.set(r.length > i ? e.create().update(r).digest() : r);
    for (let c = 0; c < s.length; c++)
      s[c] ^= 54;
    this.iHash.update(s), this.oHash = e.create();
    for (let c = 0; c < s.length; c++)
      s[c] ^= 106;
    this.oHash.update(s), or(s);
  }
  update(e) {
    return Ho(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Ho(this), ue(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: c, outputLen: f } = this;
    return e = e, e.finished = i, e.destroyed = s, e.blockLen = c, e.outputLen = f, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const pu = (t, e, n) => new hu(t, e).update(n).digest();
pu.create = (t, e) => new hu(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Js = /* @__PURE__ */ BigInt(0), Ts = /* @__PURE__ */ BigInt(1);
function Zr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ta(t) {
  if (!Zr(t))
    throw new Error("Uint8Array expected");
}
function Kr(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function Bo(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function gu(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Js : BigInt("0x" + t);
}
const yu = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), bl = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Mr(t) {
  if (ta(t), yu)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += bl[t[n]];
  return e;
}
const Qe = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function fc(t) {
  if (t >= Qe._0 && t <= Qe._9)
    return t - Qe._0;
  if (t >= Qe.A && t <= Qe.F)
    return t - (Qe.A - 10);
  if (t >= Qe.a && t <= Qe.f)
    return t - (Qe.a - 10);
}
function jo(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (yu)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const c = fc(t.charCodeAt(s)), f = fc(t.charCodeAt(s + 1));
    if (c === void 0 || f === void 0) {
      const l = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + s);
    }
    r[i] = c * 16 + f;
  }
  return r;
}
function le(t) {
  return gu(Mr(t));
}
function wu(t) {
  return ta(t), gu(Mr(Uint8Array.from(t).reverse()));
}
function ze(t, e) {
  return jo(t.toString(16).padStart(e * 2, "0"));
}
function mu(t, e) {
  return ze(t, e).reverse();
}
function Qt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = jo(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (Zr(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function Vn(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    ta(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Vr(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const is = (t) => typeof t == "bigint" && Js <= t;
function Fr(t, e, n) {
  return is(t) && is(e) && is(n) && e <= t && t < n;
}
function Ne(t, e, n, r) {
  if (!Fr(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function vl(t) {
  let e;
  for (e = 0; t > Js; t >>= Ts, e += 1)
    ;
  return e;
}
const li = (t) => (Ts << BigInt(t)) - Ts, ss = (t) => new Uint8Array(t), lc = (t) => Uint8Array.from(t);
function xl(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = ss(t), i = ss(t), s = 0;
  const c = () => {
    r.fill(1), i.fill(0), s = 0;
  }, f = (...w) => n(i, r, ...w), l = (w = ss(0)) => {
    i = f(lc([0]), w), r = f(), w.length !== 0 && (i = f(lc([1]), w), r = f());
  }, p = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let w = 0;
    const b = [];
    for (; w < e; ) {
      r = f();
      const E = r.slice();
      b.push(E), w += r.length;
    }
    return Vn(...b);
  };
  return (w, b) => {
    c(), l(w);
    let E;
    for (; !(E = b(p())); )
      l();
    return c(), E;
  };
}
const El = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Zr(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function di(t, e, n = {}) {
  const r = (i, s, c) => {
    const f = El[s];
    if (typeof f != "function")
      throw new Error("invalid validator function");
    const l = t[i];
    if (!(c && l === void 0) && !f(l, t))
      throw new Error("param " + String(i) + " is invalid. Expected " + s + ", got " + l);
  };
  for (const [i, s] of Object.entries(e))
    r(i, s, !1);
  for (const [i, s] of Object.entries(n))
    r(i, s, !0);
  return t;
}
function dc(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ge = BigInt(0), de = BigInt(1), Dn = /* @__PURE__ */ BigInt(2), Sl = /* @__PURE__ */ BigInt(3), bu = /* @__PURE__ */ BigInt(4), vu = /* @__PURE__ */ BigInt(5), xu = /* @__PURE__ */ BigInt(8);
function Yt(t, e) {
  const n = t % e;
  return n >= ge ? n : e + n;
}
function Ie(t, e, n) {
  let r = t;
  for (; e-- > ge; )
    r *= r, r %= n;
  return r;
}
function ks(t, e) {
  if (t === ge)
    throw new Error("invert: expected non-zero number");
  if (e <= ge)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = Yt(t, e), r = e, i = ge, s = de;
  for (; n !== ge; ) {
    const f = r / n, l = r % n, p = i - s * f;
    r = n, n = l, i = s, s = p;
  }
  if (r !== de)
    throw new Error("invert: does not exist");
  return Yt(i, e);
}
function Eu(t, e) {
  const n = (t.ORDER + de) / bu, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function Tl(t, e) {
  const n = (t.ORDER - vu) / xu, r = t.mul(e, Dn), i = t.pow(r, n), s = t.mul(e, i), c = t.mul(t.mul(s, Dn), i), f = t.mul(s, t.sub(c, t.ONE));
  if (!t.eql(t.sqr(f), e))
    throw new Error("Cannot find square root");
  return f;
}
function kl(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - de, n = 0;
  for (; e % Dn === ge; )
    e /= Dn, n++;
  let r = Dn;
  const i = ea(t);
  for (; hc(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Eu;
  let s = i.pow(r, e);
  const c = (e + de) / Dn;
  return function(l, p) {
    if (l.is0(p))
      return p;
    if (hc(l, p) !== 1)
      throw new Error("Cannot find square root");
    let g = n, w = l.mul(l.ONE, s), b = l.pow(p, e), E = l.pow(p, c);
    for (; !l.eql(b, l.ONE); ) {
      if (l.is0(b))
        return l.ZERO;
      let k = 1, O = l.sqr(b);
      for (; !l.eql(O, l.ONE); )
        if (k++, O = l.sqr(O), k === g)
          throw new Error("Cannot find square root");
      const $ = de << BigInt(g - k - 1), F = l.pow(w, $);
      g = k, w = l.sqr(F), b = l.mul(b, w), E = l.mul(E, F);
    }
    return E;
  };
}
function Al(t) {
  return t % bu === Sl ? Eu : t % xu === vu ? Tl : kl(t);
}
const Il = [
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
function _l(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Il.reduce((r, i) => (r[i] = "function", r), e);
  return di(t, n);
}
function Bl(t, e, n) {
  if (n < ge)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ge)
    return t.ONE;
  if (n === de)
    return e;
  let r = t.ONE, i = e;
  for (; n > ge; )
    n & de && (r = t.mul(r, i)), i = t.sqr(i), n >>= de;
  return r;
}
function Su(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), i = e.reduce((c, f, l) => t.is0(f) ? c : (r[l] = c, t.mul(c, f)), t.ONE), s = t.inv(i);
  return e.reduceRight((c, f, l) => t.is0(f) ? c : (r[l] = t.mul(c, r[l]), t.mul(c, f)), s), r;
}
function hc(t, e) {
  const n = (t.ORDER - de) / Dn, r = t.pow(e, n), i = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!i && !s && !c)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function Tu(t, e) {
  e !== void 0 && Fo(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function ea(t, e, n = !1, r = {}) {
  if (t <= ge)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: s } = Tu(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const f = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: s,
    MASK: li(i),
    ZERO: ge,
    ONE: de,
    create: (l) => Yt(l, t),
    isValid: (l) => {
      if (typeof l != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof l);
      return ge <= l && l < t;
    },
    is0: (l) => l === ge,
    isOdd: (l) => (l & de) === de,
    neg: (l) => Yt(-l, t),
    eql: (l, p) => l === p,
    sqr: (l) => Yt(l * l, t),
    add: (l, p) => Yt(l + p, t),
    sub: (l, p) => Yt(l - p, t),
    mul: (l, p) => Yt(l * p, t),
    pow: (l, p) => Bl(f, l, p),
    div: (l, p) => Yt(l * ks(p, t), t),
    // Same as above, but doesn't normalize
    sqrN: (l) => l * l,
    addN: (l, p) => l + p,
    subN: (l, p) => l - p,
    mulN: (l, p) => l * p,
    inv: (l) => ks(l, t),
    sqrt: r.sqrt || ((l) => (c || (c = Al(t)), c(f, l))),
    toBytes: (l) => n ? mu(l, s) : ze(l, s),
    fromBytes: (l) => {
      if (l.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + l.length);
      return n ? wu(l) : le(l);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (l) => Su(f, l),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (l, p, g) => g ? p : l
  });
  return Object.freeze(f);
}
function ku(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Au(t) {
  const e = ku(t);
  return e + Math.ceil(e / 2);
}
function Nl(t, e, n = !1) {
  const r = t.length, i = ku(e), s = Au(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? wu(t) : le(t), f = Yt(c, e - de) + de;
  return n ? mu(f, i) : ze(f, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pc = BigInt(0), As = BigInt(1);
function as(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Iu(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function cs(t, e) {
  Iu(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), i = 2 ** t, s = li(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: c };
}
function gc(t, e, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: c } = n;
  let f = Number(t & i), l = t >> c;
  f > r && (f -= s, l += As);
  const p = e * r, g = p + Math.abs(f) - 1, w = f === 0, b = f < 0, E = e % 2 !== 0;
  return { nextN: l, offset: g, isZero: w, isNeg: b, isNegF: E, offsetF: p };
}
function Cl(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Ul(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const us = /* @__PURE__ */ new WeakMap(), _u = /* @__PURE__ */ new WeakMap();
function fs(t) {
  return _u.get(t) || 1;
}
function Ol(t, e) {
  return {
    constTimeNegate: as,
    hasPrecomputes(n) {
      return fs(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let s = n;
      for (; r > pc; )
        r & As && (i = i.add(s)), s = s.double(), r >>= As;
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
      const { windows: i, windowSize: s } = cs(r, e), c = [];
      let f = n, l = f;
      for (let p = 0; p < i; p++) {
        l = f, c.push(l);
        for (let g = 1; g < s; g++)
          l = l.add(f), c.push(l);
        f = l.double();
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
      let s = t.ZERO, c = t.BASE;
      const f = cs(n, e);
      for (let l = 0; l < f.windows; l++) {
        const { nextN: p, offset: g, isZero: w, isNeg: b, isNegF: E, offsetF: k } = gc(i, l, f);
        i = p, w ? c = c.add(as(E, r[k])) : s = s.add(as(b, r[g]));
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
    wNAFUnsafe(n, r, i, s = t.ZERO) {
      const c = cs(n, e);
      for (let f = 0; f < c.windows && i !== pc; f++) {
        const { nextN: l, offset: p, isZero: g, isNeg: w } = gc(i, f, c);
        if (i = l, !g) {
          const b = r[p];
          s = s.add(w ? b.negate() : b);
        }
      }
      return s;
    },
    getPrecomputes(n, r, i) {
      let s = us.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && us.set(r, i(s))), s;
    },
    wNAFCached(n, r, i) {
      const s = fs(n);
      return this.wNAF(s, this.getPrecomputes(s, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, s) {
      const c = fs(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, i), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Iu(r, e), _u.set(n, r), us.delete(n);
    }
  };
}
function Rl(t, e, n, r) {
  Cl(n, t), Ul(r, e);
  const i = n.length, s = r.length;
  if (i !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, f = vl(BigInt(i));
  let l = 1;
  f > 12 ? l = f - 3 : f > 4 ? l = f - 2 : f > 0 && (l = 2);
  const p = li(l), g = new Array(Number(p) + 1).fill(c), w = Math.floor((e.BITS - 1) / l) * l;
  let b = c;
  for (let E = w; E >= 0; E -= l) {
    g.fill(c);
    for (let O = 0; O < s; O++) {
      const $ = r[O], F = Number($ >> BigInt(E) & p);
      g[F] = g[F].add(n[O]);
    }
    let k = c;
    for (let O = g.length - 1, $ = c; O > 0; O--)
      $ = $.add(g[O]), k = k.add($);
    if (b = b.add(k), E !== 0)
      for (let O = 0; O < l; O++)
        b = b.double();
  }
  return b;
}
function Bu(t) {
  return _l(t.Fp), di(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Tu(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function yc(t) {
  t.lowS !== void 0 && Kr("lowS", t.lowS), t.prehash !== void 0 && Kr("prehash", t.prehash);
}
function Pl(t) {
  const e = Bu(t);
  di(e, {
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
class Ll extends Error {
  constructor(e = "") {
    super(e);
  }
}
const en = {
  // asn.1 DER encoding utils
  Err: Ll,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = en;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, i = Bo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Bo(i.length / 2 | 128) : "";
      return Bo(t) + s + i + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = en;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const i = e[r++], s = !!(i & 128);
      let c = 0;
      if (!s)
        c = i;
      else {
        const l = i & 127;
        if (!l)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (l > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const p = e.subarray(r, r + l);
        if (p.length !== l)
          throw new n("tlv.decode: length bytes not complete");
        if (p[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const g of p)
          c = c << 8 | g;
        if (r += l, c < 128)
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
      const { Err: e } = en;
      if (t < nn)
        throw new e("integer: negative integers are not allowed");
      let n = Bo(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = en;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return le(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = en, i = Qt("signature", t), { v: s, l: c } = r.decode(48, i);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: f, l } = r.decode(2, s), { v: p, l: g } = r.decode(2, l);
    if (g.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(f), s: n.decode(p) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = en, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), s = r + i;
    return e.encode(48, s);
  }
};
function ls(t, e) {
  return Mr(ze(t, e));
}
const nn = BigInt(0), Gt = BigInt(1);
BigInt(2);
const ds = BigInt(3), $l = BigInt(4);
function Dl(t) {
  const e = Pl(t), { Fp: n } = e, r = ea(e.n, e.nBitLength), i = e.toBytes || ((H, D, K) => {
    const tt = D.toAffine();
    return Vn(Uint8Array.from([4]), n.toBytes(tt.x), n.toBytes(tt.y));
  }), s = e.fromBytes || ((H) => {
    const D = H.subarray(1), K = n.fromBytes(D.subarray(0, n.BYTES)), tt = n.fromBytes(D.subarray(n.BYTES, 2 * n.BYTES));
    return { x: K, y: tt };
  });
  function c(H) {
    const { a: D, b: K } = e, tt = n.sqr(H), A = n.mul(tt, H);
    return n.add(n.add(A, n.mul(H, D)), K);
  }
  function f(H, D) {
    const K = n.sqr(D), tt = c(H);
    return n.eql(K, tt);
  }
  if (!f(e.Gx, e.Gy))
    throw new Error("bad curve params: generator point");
  const l = n.mul(n.pow(e.a, ds), $l), p = n.mul(n.sqr(e.b), BigInt(27));
  if (n.is0(n.add(l, p)))
    throw new Error("bad curve params: a or b");
  function g(H) {
    return Fr(H, Gt, e.n);
  }
  function w(H) {
    const { allowedPrivateKeyLengths: D, nByteLength: K, wrapPrivateKey: tt, n: A } = e;
    if (D && typeof H != "bigint") {
      if (Zr(H) && (H = Mr(H)), typeof H != "string" || !D.includes(H.length))
        throw new Error("invalid private key");
      H = H.padStart(K * 2, "0");
    }
    let lt;
    try {
      lt = typeof H == "bigint" ? H : le(Qt("private key", H, K));
    } catch {
      throw new Error("invalid private key, expected hex or " + K + " bytes, got " + typeof H);
    }
    return tt && (lt = Yt(lt, A)), Ne("private key", lt, Gt, A), lt;
  }
  function b(H) {
    if (!(H instanceof O))
      throw new Error("ProjectivePoint expected");
  }
  const E = dc((H, D) => {
    const { px: K, py: tt, pz: A } = H;
    if (n.eql(A, n.ONE))
      return { x: K, y: tt };
    const lt = H.is0();
    D == null && (D = lt ? n.ONE : n.inv(A));
    const xt = n.mul(K, D), bt = n.mul(tt, D), V = n.mul(A, D);
    if (lt)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(V, n.ONE))
      throw new Error("invZ was invalid");
    return { x: xt, y: bt };
  }), k = dc((H) => {
    if (H.is0()) {
      if (e.allowInfinityPoint && !n.is0(H.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: D, y: K } = H.toAffine();
    if (!n.isValid(D) || !n.isValid(K))
      throw new Error("bad point: x or y not FE");
    if (!f(D, K))
      throw new Error("bad point: equation left != right");
    if (!H.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class O {
    constructor(D, K, tt) {
      if (D == null || !n.isValid(D))
        throw new Error("x required");
      if (K == null || !n.isValid(K) || n.is0(K))
        throw new Error("y required");
      if (tt == null || !n.isValid(tt))
        throw new Error("z required");
      this.px = D, this.py = K, this.pz = tt, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(D) {
      const { x: K, y: tt } = D || {};
      if (!D || !n.isValid(K) || !n.isValid(tt))
        throw new Error("invalid affine point");
      if (D instanceof O)
        throw new Error("projective point not allowed");
      const A = (lt) => n.eql(lt, n.ZERO);
      return A(K) && A(tt) ? O.ZERO : new O(K, tt, n.ONE);
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
    static normalizeZ(D) {
      const K = Su(n, D.map((tt) => tt.pz));
      return D.map((tt, A) => tt.toAffine(K[A])).map(O.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(D) {
      const K = O.fromAffine(s(Qt("pointHex", D)));
      return K.assertValidity(), K;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(D) {
      return O.BASE.multiply(w(D));
    }
    // Multiscalar Multiplication
    static msm(D, K) {
      return Rl(O, r, D, K);
    }
    // "Private method", don't use it directly
    _setWindowSize(D) {
      z.setWindowSize(this, D);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      k(this);
    }
    hasEvenY() {
      const { y: D } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(D);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(D) {
      b(D);
      const { px: K, py: tt, pz: A } = this, { px: lt, py: xt, pz: bt } = D, V = n.eql(n.mul(K, bt), n.mul(lt, A)), nt = n.eql(n.mul(tt, bt), n.mul(xt, A));
      return V && nt;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new O(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: D, b: K } = e, tt = n.mul(K, ds), { px: A, py: lt, pz: xt } = this;
      let bt = n.ZERO, V = n.ZERO, nt = n.ZERO, ct = n.mul(A, A), jt = n.mul(lt, lt), Q = n.mul(xt, xt), Y = n.mul(A, lt);
      return Y = n.add(Y, Y), nt = n.mul(A, xt), nt = n.add(nt, nt), bt = n.mul(D, nt), V = n.mul(tt, Q), V = n.add(bt, V), bt = n.sub(jt, V), V = n.add(jt, V), V = n.mul(bt, V), bt = n.mul(Y, bt), nt = n.mul(tt, nt), Q = n.mul(D, Q), Y = n.sub(ct, Q), Y = n.mul(D, Y), Y = n.add(Y, nt), nt = n.add(ct, ct), ct = n.add(nt, ct), ct = n.add(ct, Q), ct = n.mul(ct, Y), V = n.add(V, ct), Q = n.mul(lt, xt), Q = n.add(Q, Q), ct = n.mul(Q, Y), bt = n.sub(bt, ct), nt = n.mul(Q, jt), nt = n.add(nt, nt), nt = n.add(nt, nt), new O(bt, V, nt);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(D) {
      b(D);
      const { px: K, py: tt, pz: A } = this, { px: lt, py: xt, pz: bt } = D;
      let V = n.ZERO, nt = n.ZERO, ct = n.ZERO;
      const jt = e.a, Q = n.mul(e.b, ds);
      let Y = n.mul(K, lt), at = n.mul(tt, xt), ht = n.mul(A, bt), ut = n.add(K, tt), ft = n.add(lt, xt);
      ut = n.mul(ut, ft), ft = n.add(Y, at), ut = n.sub(ut, ft), ft = n.add(K, A);
      let Tt = n.add(lt, bt);
      return ft = n.mul(ft, Tt), Tt = n.add(Y, ht), ft = n.sub(ft, Tt), Tt = n.add(tt, A), V = n.add(xt, bt), Tt = n.mul(Tt, V), V = n.add(at, ht), Tt = n.sub(Tt, V), ct = n.mul(jt, ft), V = n.mul(Q, ht), ct = n.add(V, ct), V = n.sub(at, ct), ct = n.add(at, ct), nt = n.mul(V, ct), at = n.add(Y, Y), at = n.add(at, Y), ht = n.mul(jt, ht), ft = n.mul(Q, ft), at = n.add(at, ht), ht = n.sub(Y, ht), ht = n.mul(jt, ht), ft = n.add(ft, ht), Y = n.mul(at, ft), nt = n.add(nt, Y), Y = n.mul(Tt, ft), V = n.mul(ut, V), V = n.sub(V, Y), Y = n.mul(ut, at), ct = n.mul(Tt, ct), ct = n.add(ct, Y), new O(V, nt, ct);
    }
    subtract(D) {
      return this.add(D.negate());
    }
    is0() {
      return this.equals(O.ZERO);
    }
    wNAF(D) {
      return z.wNAFCached(this, D, O.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(D) {
      const { endo: K, n: tt } = e;
      Ne("scalar", D, nn, tt);
      const A = O.ZERO;
      if (D === nn)
        return A;
      if (this.is0() || D === Gt)
        return this;
      if (!K || z.hasPrecomputes(this))
        return z.wNAFCachedUnsafe(this, D, O.normalizeZ);
      let { k1neg: lt, k1: xt, k2neg: bt, k2: V } = K.splitScalar(D), nt = A, ct = A, jt = this;
      for (; xt > nn || V > nn; )
        xt & Gt && (nt = nt.add(jt)), V & Gt && (ct = ct.add(jt)), jt = jt.double(), xt >>= Gt, V >>= Gt;
      return lt && (nt = nt.negate()), bt && (ct = ct.negate()), ct = new O(n.mul(ct.px, K.beta), ct.py, ct.pz), nt.add(ct);
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
    multiply(D) {
      const { endo: K, n: tt } = e;
      Ne("scalar", D, Gt, tt);
      let A, lt;
      if (K) {
        const { k1neg: xt, k1: bt, k2neg: V, k2: nt } = K.splitScalar(D);
        let { p: ct, f: jt } = this.wNAF(bt), { p: Q, f: Y } = this.wNAF(nt);
        ct = z.constTimeNegate(xt, ct), Q = z.constTimeNegate(V, Q), Q = new O(n.mul(Q.px, K.beta), Q.py, Q.pz), A = ct.add(Q), lt = jt.add(Y);
      } else {
        const { p: xt, f: bt } = this.wNAF(D);
        A = xt, lt = bt;
      }
      return O.normalizeZ([A, lt])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(D, K, tt) {
      const A = O.BASE, lt = (bt, V) => V === nn || V === Gt || !bt.equals(A) ? bt.multiplyUnsafe(V) : bt.multiply(V), xt = lt(this, K).add(lt(D, tt));
      return xt.is0() ? void 0 : xt;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(D) {
      return E(this, D);
    }
    isTorsionFree() {
      const { h: D, isTorsionFree: K } = e;
      if (D === Gt)
        return !0;
      if (K)
        return K(O, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: D, clearCofactor: K } = e;
      return D === Gt ? this : K ? K(O, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(D = !0) {
      return Kr("isCompressed", D), this.assertValidity(), i(O, this, D);
    }
    toHex(D = !0) {
      return Kr("isCompressed", D), Mr(this.toRawBytes(D));
    }
  }
  O.BASE = new O(e.Gx, e.Gy, n.ONE), O.ZERO = new O(n.ZERO, n.ONE, n.ZERO);
  const { endo: $, nBitLength: F } = e, z = Ol(O, $ ? Math.ceil(F / 2) : F);
  return {
    CURVE: e,
    ProjectivePoint: O,
    normPrivateKeyToScalar: w,
    weierstrassEquation: c,
    isWithinCurveOrder: g
  };
}
function Kl(t) {
  const e = Bu(t);
  return di(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Ml(t) {
  const e = Kl(t), { Fp: n, n: r, nByteLength: i, nBitLength: s } = e, c = n.BYTES + 1, f = 2 * n.BYTES + 1;
  function l(Q) {
    return Yt(Q, r);
  }
  function p(Q) {
    return ks(Q, r);
  }
  const { ProjectivePoint: g, normPrivateKeyToScalar: w, weierstrassEquation: b, isWithinCurveOrder: E } = Dl({
    ...e,
    toBytes(Q, Y, at) {
      const ht = Y.toAffine(), ut = n.toBytes(ht.x), ft = Vn;
      return Kr("isCompressed", at), at ? ft(Uint8Array.from([Y.hasEvenY() ? 2 : 3]), ut) : ft(Uint8Array.from([4]), ut, n.toBytes(ht.y));
    },
    fromBytes(Q) {
      const Y = Q.length, at = Q[0], ht = Q.subarray(1);
      if (Y === c && (at === 2 || at === 3)) {
        const ut = le(ht);
        if (!Fr(ut, Gt, n.ORDER))
          throw new Error("Point is not on curve");
        const ft = b(ut);
        let Tt;
        try {
          Tt = n.sqrt(ft);
        } catch (he) {
          const Dt = he instanceof Error ? ": " + he.message : "";
          throw new Error("Point is not on curve" + Dt);
        }
        const Xt = (Tt & Gt) === Gt;
        return (at & 1) === 1 !== Xt && (Tt = n.neg(Tt)), { x: ut, y: Tt };
      } else if (Y === f && at === 4) {
        const ut = n.fromBytes(ht.subarray(0, n.BYTES)), ft = n.fromBytes(ht.subarray(n.BYTES, 2 * n.BYTES));
        return { x: ut, y: ft };
      } else {
        const ut = c, ft = f;
        throw new Error("invalid Point, expected length of " + ut + ", or uncompressed " + ft + ", got " + Y);
      }
    }
  });
  function k(Q) {
    const Y = r >> Gt;
    return Q > Y;
  }
  function O(Q) {
    return k(Q) ? l(-Q) : Q;
  }
  const $ = (Q, Y, at) => le(Q.slice(Y, at));
  class F {
    constructor(Y, at, ht) {
      Ne("r", Y, Gt, r), Ne("s", at, Gt, r), this.r = Y, this.s = at, ht != null && (this.recovery = ht), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(Y) {
      const at = i;
      return Y = Qt("compactSignature", Y, at * 2), new F($(Y, 0, at), $(Y, at, 2 * at));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(Y) {
      const { r: at, s: ht } = en.toSig(Qt("DER", Y));
      return new F(at, ht);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(Y) {
      return new F(this.r, this.s, Y);
    }
    recoverPublicKey(Y) {
      const { r: at, s: ht, recovery: ut } = this, ft = A(Qt("msgHash", Y));
      if (ut == null || ![0, 1, 2, 3].includes(ut))
        throw new Error("recovery id invalid");
      const Tt = ut === 2 || ut === 3 ? at + e.n : at;
      if (Tt >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const Xt = (ut & 1) === 0 ? "02" : "03", te = g.fromHex(Xt + ls(Tt, n.BYTES)), he = p(Tt), Dt = l(-ft * he), be = l(ht * he), ke = g.BASE.multiplyAndAddUnsafe(te, Dt, be);
      if (!ke)
        throw new Error("point at infinify");
      return ke.assertValidity(), ke;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return k(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new F(this.r, l(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return jo(this.toDERHex());
    }
    toDERHex() {
      return en.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return jo(this.toCompactHex());
    }
    toCompactHex() {
      const Y = i;
      return ls(this.r, Y) + ls(this.s, Y);
    }
  }
  const z = {
    isValidPrivateKey(Q) {
      try {
        return w(Q), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: w,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const Q = Au(e.n);
      return Nl(e.randomBytes(Q), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(Q = 8, Y = g.BASE) {
      return Y._setWindowSize(Q), Y.multiply(BigInt(3)), Y;
    }
  };
  function H(Q, Y = !0) {
    return g.fromPrivateKey(Q).toRawBytes(Y);
  }
  function D(Q) {
    if (typeof Q == "bigint")
      return !1;
    if (Q instanceof g)
      return !0;
    const at = Qt("key", Q).length, ht = n.BYTES, ut = ht + 1, ft = 2 * ht + 1;
    if (!(e.allowedPrivateKeyLengths || i === ut))
      return at === ut || at === ft;
  }
  function K(Q, Y, at = !0) {
    if (D(Q) === !0)
      throw new Error("first arg must be private key");
    if (D(Y) === !1)
      throw new Error("second arg must be public key");
    return g.fromHex(Y).multiply(w(Q)).toRawBytes(at);
  }
  const tt = e.bits2int || function(Q) {
    if (Q.length > 8192)
      throw new Error("input is too large");
    const Y = le(Q), at = Q.length * 8 - s;
    return at > 0 ? Y >> BigInt(at) : Y;
  }, A = e.bits2int_modN || function(Q) {
    return l(tt(Q));
  }, lt = li(s);
  function xt(Q) {
    return Ne("num < 2^" + s, Q, nn, lt), ze(Q, i);
  }
  function bt(Q, Y, at = V) {
    if (["recovered", "canonical"].some((ot) => ot in at))
      throw new Error("sign() legacy options not supported");
    const { hash: ht, randomBytes: ut } = e;
    let { lowS: ft, prehash: Tt, extraEntropy: Xt } = at;
    ft == null && (ft = !0), Q = Qt("msgHash", Q), yc(at), Tt && (Q = Qt("prehashed msgHash", ht(Q)));
    const te = A(Q), he = w(Y), Dt = [xt(he), xt(te)];
    if (Xt != null && Xt !== !1) {
      const ot = Xt === !0 ? ut(n.BYTES) : Xt;
      Dt.push(Qt("extraEntropy", ot));
    }
    const be = Vn(...Dt), ke = te;
    function hr(ot) {
      const Ye = tt(ot);
      if (!E(Ye))
        return;
      const an = p(Ye), Et = g.BASE.multiply(Ye).toAffine(), ve = l(Et.x);
      if (ve === nn)
        return;
      const Tn = l(an * l(ke + ve * he));
      if (Tn === nn)
        return;
      let xe = (Et.x === ve ? 0 : 2) | Number(Et.y & Gt), cn = Tn;
      return ft && k(Tn) && (cn = O(Tn), xe ^= 1), new F(ve, cn, xe);
    }
    return { seed: be, k2sig: hr };
  }
  const V = { lowS: e.lowS, prehash: !1 }, nt = { lowS: e.lowS, prehash: !1 };
  function ct(Q, Y, at = V) {
    const { seed: ht, k2sig: ut } = bt(Q, Y, at), ft = e;
    return xl(ft.hash.outputLen, ft.nByteLength, ft.hmac)(ht, ut);
  }
  g.BASE._setWindowSize(8);
  function jt(Q, Y, at, ht = nt) {
    var xe;
    const ut = Q;
    Y = Qt("msgHash", Y), at = Qt("publicKey", at);
    const { lowS: ft, prehash: Tt, format: Xt } = ht;
    if (yc(ht), "strict" in ht)
      throw new Error("options.strict was renamed to lowS");
    if (Xt !== void 0 && Xt !== "compact" && Xt !== "der")
      throw new Error("format must be compact or der");
    const te = typeof ut == "string" || Zr(ut), he = !te && !Xt && typeof ut == "object" && ut !== null && typeof ut.r == "bigint" && typeof ut.s == "bigint";
    if (!te && !he)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let Dt, be;
    try {
      if (he && (Dt = new F(ut.r, ut.s)), te) {
        try {
          Xt !== "compact" && (Dt = F.fromDER(ut));
        } catch (cn) {
          if (!(cn instanceof en.Err))
            throw cn;
        }
        !Dt && Xt !== "der" && (Dt = F.fromCompact(ut));
      }
      be = g.fromHex(at);
    } catch {
      return !1;
    }
    if (!Dt || ft && Dt.hasHighS())
      return !1;
    Tt && (Y = e.hash(Y));
    const { r: ke, s: hr } = Dt, ot = A(Y), Ye = p(hr), an = l(ot * Ye), Et = l(ke * Ye), ve = (xe = g.BASE.multiplyAndAddUnsafe(be, an, Et)) == null ? void 0 : xe.toAffine();
    return ve ? l(ve.x) === ke : !1;
  }
  return {
    CURVE: e,
    getPublicKey: H,
    getSharedSecret: K,
    sign: ct,
    verify: jt,
    ProjectivePoint: g,
    Signature: F,
    utils: z
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Vl(t) {
  return {
    hash: t,
    hmac: (e, ...n) => pu(t, e, hl(...n)),
    randomBytes: Qs
  };
}
function Fl(t, e) {
  const n = (r) => Ml({ ...t, ...Vl(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Xr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), qo = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), na = BigInt(0), Hr = BigInt(1), zo = BigInt(2), wc = (t, e) => (t + e / zo) / e;
function Nu(t) {
  const e = Xr, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), c = BigInt(23), f = BigInt(44), l = BigInt(88), p = t * t * t % e, g = p * p * t % e, w = Ie(g, n, e) * g % e, b = Ie(w, n, e) * g % e, E = Ie(b, zo, e) * p % e, k = Ie(E, i, e) * E % e, O = Ie(k, s, e) * k % e, $ = Ie(O, f, e) * O % e, F = Ie($, l, e) * $ % e, z = Ie(F, f, e) * O % e, H = Ie(z, n, e) * g % e, D = Ie(H, c, e) * k % e, K = Ie(D, r, e) * p % e, tt = Ie(K, zo, e);
  if (!Is.eql(Is.sqr(tt), t))
    throw new Error("Cannot find square root");
  return tt;
}
const Is = ea(Xr, void 0, void 0, { sqrt: Nu }), Ce = Fl({
  a: na,
  b: BigInt(7),
  Fp: Is,
  n: qo,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = qo, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Hr * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), f = wc(s * t, e), l = wc(-r * t, e);
      let p = Yt(t - f * n - l * i, e), g = Yt(-f * r - l * s, e);
      const w = p > c, b = g > c;
      if (w && (p = e - p), b && (g = e - g), p > c || g > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: w, k1: p, k2neg: b, k2: g };
    }
  }
}, se), mc = {};
function Wo(t, ...e) {
  let n = mc[t];
  if (n === void 0) {
    const r = se(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = Vn(r, r), mc[t] = n;
  }
  return se(Vn(n, ...e));
}
const ra = (t) => t.toRawBytes(!0).slice(1), _s = (t) => ze(t, 32), hs = (t) => Yt(t, Xr), jr = (t) => Yt(t, qo), oa = Ce.ProjectivePoint, Hl = (t, e, n) => oa.BASE.multiplyAndAddUnsafe(t, e, n);
function Bs(t) {
  let e = Ce.utils.normPrivateKeyToScalar(t), n = oa.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : jr(-e), bytes: ra(n) };
}
function Cu(t) {
  Ne("x", t, Hr, Xr);
  const e = hs(t * t), n = hs(e * t + BigInt(7));
  let r = Nu(n);
  r % zo !== na && (r = hs(-r));
  const i = new oa(t, r, Hr);
  return i.assertValidity(), i;
}
const tr = le;
function Uu(...t) {
  return jr(tr(Wo("BIP0340/challenge", ...t)));
}
function jl(t) {
  return Bs(t).bytes;
}
function ql(t, e, n = Qs(32)) {
  const r = Qt("message", t), { bytes: i, scalar: s } = Bs(e), c = Qt("auxRand", n, 32), f = _s(s ^ tr(Wo("BIP0340/aux", c))), l = Wo("BIP0340/nonce", f, i, r), p = jr(tr(l));
  if (p === na)
    throw new Error("sign failed: k is zero");
  const { bytes: g, scalar: w } = Bs(p), b = Uu(g, i, r), E = new Uint8Array(64);
  if (E.set(g, 0), E.set(_s(jr(w + b * s)), 32), !Ou(E, r, i))
    throw new Error("sign: Invalid signature produced");
  return E;
}
function Ou(t, e, n) {
  const r = Qt("signature", t, 64), i = Qt("message", e), s = Qt("publicKey", n, 32);
  try {
    const c = Cu(tr(s)), f = tr(r.subarray(0, 32));
    if (!Fr(f, Hr, Xr))
      return !1;
    const l = tr(r.subarray(32, 64));
    if (!Fr(l, Hr, qo))
      return !1;
    const p = Uu(_s(f), ra(c), i), g = Hl(c, l, jr(-p));
    return !(!g || !g.hasEvenY() || g.toAffine().x !== f);
  } catch {
    return !1;
  }
}
const Te = {
  getPublicKey: jl,
  sign: ql,
  verify: Ou,
  utils: {
    randomPrivateKey: Ce.utils.randomPrivateKey,
    lift_x: Cu,
    pointToBytes: ra,
    numberToBytesBE: ze,
    bytesToNumberBE: le,
    taggedHash: Wo,
    mod: Yt
  }
}, zl = /* @__PURE__ */ Uint8Array.from([
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
]), Ru = Uint8Array.from(new Array(16).fill(0).map((t, e) => e)), Wl = Ru.map((t) => (9 * t + 5) % 16), Pu = /* @__PURE__ */ (() => {
  const n = [[Ru], [Wl]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => zl[s]));
  return n;
})(), Lu = Pu[0], $u = Pu[1], Du = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => Uint8Array.from(t)), Gl = /* @__PURE__ */ Lu.map((t, e) => t.map((n) => Du[e][n])), Yl = /* @__PURE__ */ $u.map((t, e) => t.map((n) => Du[e][n])), Zl = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Xl = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function bc(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const No = /* @__PURE__ */ new Uint32Array(16);
class Ql extends du {
  constructor() {
    super(64, 20, 8, !0), this.h0 = 1732584193, this.h1 = -271733879, this.h2 = -1732584194, this.h3 = 271733878, this.h4 = -1009589776;
  }
  get() {
    const { h0: e, h1: n, h2: r, h3: i, h4: s } = this;
    return [e, n, r, i, s];
  }
  set(e, n, r, i, s) {
    this.h0 = e | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = s | 0;
  }
  process(e, n) {
    for (let E = 0; E < 16; E++, n += 4)
      No[E] = e.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, c = s, f = this.h2 | 0, l = f, p = this.h3 | 0, g = p, w = this.h4 | 0, b = w;
    for (let E = 0; E < 5; E++) {
      const k = 4 - E, O = Zl[E], $ = Xl[E], F = Lu[E], z = $u[E], H = Gl[E], D = Yl[E];
      for (let K = 0; K < 16; K++) {
        const tt = _o(r + bc(E, s, f, p) + No[F[K]] + O, H[K]) + w | 0;
        r = w, w = p, p = _o(f, 10) | 0, f = s, s = tt;
      }
      for (let K = 0; K < 16; K++) {
        const tt = _o(i + bc(k, c, l, g) + No[z[K]] + $, D[K]) + b | 0;
        i = b, b = g, g = _o(l, 10) | 0, l = c, c = tt;
      }
    }
    this.set(this.h1 + f + g | 0, this.h2 + p + b | 0, this.h3 + w + i | 0, this.h4 + r + c | 0, this.h0 + s + l | 0);
  }
  roundClean() {
    or(No);
  }
  destroy() {
    this.destroyed = !0, or(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Jl = /* @__PURE__ */ lu(() => new Ql());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ir(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Ku(t, ...e) {
  if (!ir(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Mu(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function ia(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function xn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function dr(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Go(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Yo(t, e) {
  if (!Mu(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function sa(t, e) {
  if (!Mu(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Qr(...t) {
  const e = (s) => s, n = (s, c) => (f) => s(c(f)), r = t.map((s) => s.encode).reduceRight(n, e), i = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function hi(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Yo("alphabet", e);
  const r = new Map(e.map((i, s) => [i, s]));
  return {
    encode: (i) => (Go(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (i) => (Go(i), i.map((s) => {
      xn("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function pi(t = "") {
  return xn("join", t), {
    encode: (e) => (Yo("join.decode", e), e.join(t)),
    decode: (e) => (xn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function td(t, e = "=") {
  return dr(t), xn("padding", e), {
    encode(n) {
      for (Yo("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Yo("padding.decode", n);
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
function ed(t) {
  return ia(t), { encode: (e) => e, decode: (e) => t(e) };
}
function vc(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Go(t), !t.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(t, (f) => {
    if (dr(f), f < 0 || f >= e)
      throw new Error(`invalid integer: ${f}`);
    return f;
  }), c = s.length;
  for (; ; ) {
    let f = 0, l = !0;
    for (let p = r; p < c; p++) {
      const g = s[p], w = e * f, b = w + g;
      if (!Number.isSafeInteger(b) || w / e !== f || b - g !== w)
        throw new Error("convertRadix: carry overflow");
      const E = b / n;
      f = b % n;
      const k = Math.floor(E);
      if (s[p] = k, !Number.isSafeInteger(k) || k * n + f !== b)
        throw new Error("convertRadix: carry overflow");
      if (l)
        k ? l = !1 : r = p;
      else continue;
    }
    if (i.push(f), l)
      break;
  }
  for (let f = 0; f < t.length - 1 && t[f] === 0; f++)
    i.push(0);
  return i.reverse();
}
const Vu = (t, e) => e === 0 ? t : Vu(e, t % e), Zo = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Vu(t, e)), $o = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function Ns(t, e, n, r) {
  if (Go(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Zo(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Zo(e, n)}`);
  let i = 0, s = 0;
  const c = $o[e], f = $o[n] - 1, l = [];
  for (const p of t) {
    if (dr(p), p >= c)
      throw new Error(`convertRadix2: invalid data word=${p} from=${e}`);
    if (i = i << e | p, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      l.push((i >> s - n & f) >>> 0);
    const g = $o[s];
    if (g === void 0)
      throw new Error("invalid carry");
    i &= g - 1;
  }
  if (i = i << n - s & f, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && l.push(i >>> 0), l;
}
// @__NO_SIDE_EFFECTS__
function nd(t) {
  dr(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!ir(n))
        throw new Error("radix.encode input should be Uint8Array");
      return vc(Array.from(n), e, t);
    },
    decode: (n) => (sa("radix.decode", n), Uint8Array.from(vc(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function aa(t, e = !1) {
  if (dr(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Zo(8, t) > 32 || /* @__PURE__ */ Zo(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!ir(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return Ns(Array.from(n), 8, t, !e);
    },
    decode: (n) => (sa("radix2.decode", n), Uint8Array.from(Ns(n, t, 8, e)))
  };
}
function xc(t) {
  return ia(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function rd(t, e) {
  return dr(t), ia(e), {
    encode(n) {
      if (!ir(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), i = new Uint8Array(n.length + t);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!ir(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), i = n.slice(-t), s = e(r).slice(0, t);
      for (let c = 0; c < t; c++)
        if (s[c] !== i[c])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const od = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", id = (t, e) => {
  xn("base64", t);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (t.length > 0 && !n.test(t))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(t, { alphabet: r, lastChunkHandling: "strict" });
}, pe = od ? {
  encode(t) {
    return Ku(t), t.toBase64();
  },
  decode(t) {
    return id(t);
  }
} : /* @__PURE__ */ Qr(/* @__PURE__ */ aa(6), /* @__PURE__ */ hi("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ td(6), /* @__PURE__ */ pi("")), sd = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Qr(/* @__PURE__ */ nd(58), /* @__PURE__ */ hi(t), /* @__PURE__ */ pi("")), Cs = /* @__PURE__ */ sd("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), ad = (t) => /* @__PURE__ */ Qr(rd(4, (e) => t(t(e))), Cs), Us = /* @__PURE__ */ Qr(/* @__PURE__ */ hi("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ pi("")), Ec = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Ir(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Ec.length; r++)
    (e >> r & 1) === 1 && (n ^= Ec[r]);
  return n;
}
function Sc(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = Ir(i) ^ c >> 5;
  }
  i = Ir(i);
  for (let s = 0; s < r; s++)
    i = Ir(i) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    i = Ir(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = Ir(i);
  return i ^= n, Us.encode(Ns([i % $o[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Fu(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ aa(5), r = n.decode, i = n.encode, s = xc(r);
  function c(w, b, E = 90) {
    xn("bech32.encode prefix", w), ir(b) && (b = Array.from(b)), sa("bech32.encode", b);
    const k = w.length;
    if (k === 0)
      throw new TypeError(`Invalid prefix length ${k}`);
    const O = k + 7 + b.length;
    if (E !== !1 && O > E)
      throw new TypeError(`Length ${O} exceeds limit ${E}`);
    const $ = w.toLowerCase(), F = Sc($, b, e);
    return `${$}1${Us.encode(b)}${F}`;
  }
  function f(w, b = 90) {
    xn("bech32.decode input", w);
    const E = w.length;
    if (E < 8 || b !== !1 && E > b)
      throw new TypeError(`invalid string length: ${E} (${w}). Expected (8..${b})`);
    const k = w.toLowerCase();
    if (w !== k && w !== w.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const O = k.lastIndexOf("1");
    if (O === 0 || O === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const $ = k.slice(0, O), F = k.slice(O + 1);
    if (F.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const z = Us.decode(F).slice(0, -6), H = Sc($, z, e);
    if (!F.endsWith(H))
      throw new Error(`Invalid checksum in ${w}: expected "${H}"`);
    return { prefix: $, words: z };
  }
  const l = xc(f);
  function p(w) {
    const { prefix: b, words: E } = f(w, !1);
    return { prefix: b, words: E, bytes: r(E) };
  }
  function g(w, b) {
    return c(w, i(b));
  }
  return {
    encode: c,
    decode: f,
    encodeFromBytes: g,
    decodeToBytes: p,
    decodeUnsafe: l,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: i
  };
}
const Os = /* @__PURE__ */ Fu("bech32"), Xn = /* @__PURE__ */ Fu("bech32m"), cd = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, ud = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", fd = {
  encode(t) {
    return Ku(t), t.toHex();
  },
  decode(t) {
    return xn("hex", t), Uint8Array.fromHex(t);
  }
}, G = ud ? fd : /* @__PURE__ */ Qr(/* @__PURE__ */ aa(4), /* @__PURE__ */ hi("0123456789abcdef"), /* @__PURE__ */ pi(""), /* @__PURE__ */ ed((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Rt = /* @__PURE__ */ new Uint8Array(), Hu = /* @__PURE__ */ new Uint8Array([0]);
function sr(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Be(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ld(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (!Be(i))
      throw new Error("Uint8Array expected");
    e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
const ju = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function Jr(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function We(t) {
  return Number.isSafeInteger(t);
}
const ca = {
  equalBytes: sr,
  isBytes: Be,
  concatBytes: ld
}, qu = (t) => {
  if (t !== null && typeof t != "string" && !De(t) && !Be(t) && !We(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (De(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = on.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (De(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = on.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, Wt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(Wt.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (Wt.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${Wt.len(e)}`);
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
    Wt.checkLen(t, e);
    const { FULL_MASK: r, BITS: i } = Wt, s = i - e % i, c = s ? r >>> s << s : r, f = [];
    for (let l = 0; l < t.length; l++) {
      let p = t[l];
      if (n && (p = ~p), l === t.length - 1 && (p &= c), p !== 0)
        for (let g = 0; g < i; g++) {
          const w = 1 << i - g - 1;
          p & w && f.push(l * i + g);
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
  rangeDebug: (t, e, n = !1) => `[${Wt.range(Wt.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, i = !0) => {
    Wt.chunkLen(e, n, r);
    const { FULL_MASK: s, BITS: c } = Wt, f = n % c ? Math.floor(n / c) : void 0, l = n + r, p = l % c ? Math.floor(l / c) : void 0;
    if (f !== void 0 && f === p)
      return Wt.set(t, f, s >>> c - r << c - r - n, i);
    if (f !== void 0 && !Wt.set(t, f, s >>> n % c, i))
      return !1;
    const g = f !== void 0 ? f + 1 : n / c, w = p !== void 0 ? p : l / c;
    for (let b = g; b < w; b++)
      if (!Wt.set(t, b, s, i))
        return !1;
    return !(p !== void 0 && f !== p && !Wt.set(t, p, s << c - l % c, i));
  }
}, on = {
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
    t.push(r), n((i, s) => {
      r.field = i, s(), r.field = void 0;
    }), t.pop();
  },
  path: (t) => {
    const e = [];
    for (const n of t)
      n.field !== void 0 && e.push(n.field);
    return e.join("/");
  },
  err: (t, e, n) => {
    const r = new Error(`${t}(${on.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((c) => c.obj);
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
class ua {
  constructor(e, n = {}, r = [], i = void 0, s = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = ju(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = Wt.create(this.data.length), Wt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : Wt.setRange(this.bs, this.data.length, e, n, !1);
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
    return on.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${G.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = Wt.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = Wt.range(e).map(({ pos: r, length: i }) => `(${r}/${i})[${G.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${G.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return on.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new ua(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Be(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (sr(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class dd {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = ju(this.viewBuf);
  }
  pushObj(e, n) {
    return on.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!We(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return on.err("Reader", this.stack, e);
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
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, c) => s + c, 0), i = new Uint8Array(r);
    for (let s = 0, c = 0; s < n.length; s++) {
      const f = n[s];
      i.set(f, c), c += f.length;
    }
    for (let s = this.pos, c = 0; c < this.ptrs.length; c++) {
      const f = this.ptrs[c];
      i.set(f.ptr.encode(s), f.pos), s += f.buffer.length;
    }
    if (e) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
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
const Rs = (t) => Uint8Array.from(t).reverse();
function hd(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function zu(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new dd();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new ua(e, n), i = t.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function we(t, e) {
  if (!De(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return zu({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e(r);
      } catch (s) {
        throw n.err(s);
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
const me = (t) => {
  const e = zu(t);
  return t.validate ? we(e, t.validate) : e;
}, gi = (t) => Jr(t) && typeof t.decode == "function" && typeof t.encode == "function";
function De(t) {
  return Jr(t) && gi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || We(t.size));
}
function pd() {
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
      if (!Jr(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const gd = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!We(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function yd(t) {
  if (!Jr(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!We(e) || !(e in t))
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
function wd(t, e = !1) {
  if (!We(t))
    throw new Error(`decimal/precision: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof e}`);
  const n = 10n ** BigInt(t);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), s = i.length - t;
      s < 0 && (i = i.padStart(i.length - s, "0"), s = 0);
      let c = i.length - 1;
      for (; c >= s && i[c] === "0"; c--)
        ;
      let f = i.slice(0, s), l = i.slice(s, c + 1);
      return f || (f = "0"), r < 0n && (f = "-" + f), l ? `${f}.${l}` : f;
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
      const c = r.slice(0, s), f = r.slice(s + 1).replace(/0+$/, ""), l = BigInt(c) * n;
      if (!e && f.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const p = Math.min(f.length, t), g = BigInt(f.slice(0, p)) * 10n ** BigInt(t - p), w = l + g;
      return i ? -w : w;
    }
  };
}
function md(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!gi(e))
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
const Wu = (t) => {
  if (!gi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, yi = { dict: pd, numberBigint: gd, tsEnum: yd, decimal: wd, match: md, reverse: Wu }, fa = (t, e = !1, n = !1, r = !0) => {
  if (!We(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(t), s = 2n ** (8n * i - 1n);
  return me({
    size: r ? t : void 0,
    encodeStream: (c, f) => {
      n && f < 0 && (f = f | s);
      const l = [];
      for (let g = 0; g < t; g++)
        l.push(Number(f & 255n)), f >>= 8n;
      let p = new Uint8Array(l).reverse();
      if (!r) {
        let g = 0;
        for (g = 0; g < p.length && p[g] === 0; g++)
          ;
        p = p.subarray(g);
      }
      c.bytes(e ? p.reverse() : p);
    },
    decodeStream: (c) => {
      const f = c.bytes(r ? t : Math.min(t, c.leftBytes)), l = e ? f : Rs(f);
      let p = 0n;
      for (let g = 0; g < l.length; g++)
        p |= BigInt(l[g]) << 8n * BigInt(g);
      return n && p & s && (p = (p ^ s) - s), p;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return hd(c, 8n * i, !!n), c;
    }
  });
}, Gu = /* @__PURE__ */ fa(32, !1), Do = /* @__PURE__ */ fa(8, !0), bd = /* @__PURE__ */ fa(8, !0, !0), vd = (t, e) => me({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (i) => e.write(i, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), to = (t, e, n) => {
  const r = t * 8, i = 2 ** (r - 1), s = (l) => {
    if (!We(l))
      throw new Error(`sintView: value is not safe integer: ${l}`);
    if (l < -i || l >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${l} < ${i}`);
  }, c = 2 ** r, f = (l) => {
    if (!We(l))
      throw new Error(`uintView: value is not safe integer: ${l}`);
    if (0 > l || l >= c)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${l} < ${c}`);
  };
  return vd(t, {
    write: n.write,
    read: n.read,
    validate: e ? s : f
  });
}, kt = /* @__PURE__ */ to(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), xd = /* @__PURE__ */ to(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), Qn = /* @__PURE__ */ to(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), Tc = /* @__PURE__ */ to(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), vn = /* @__PURE__ */ to(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Ut = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = qu(t), r = Be(t);
  return me({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(e ? Rs(s) : s), r && i.bytes(t);
    },
    decodeStream: (i) => {
      let s;
      if (r) {
        const c = i.find(t);
        if (!c)
          throw i.err("bytes: cannot find terminator");
        s = i.bytes(c - i.pos), i.bytes(t.length);
      } else
        s = i.bytes(t === null ? i.leftBytes : n.decodeStream(i));
      return e ? Rs(s) : s;
    },
    validate: (i) => {
      if (!Be(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function Ed(t, e) {
  if (!De(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return En(Ut(t), Wu(e));
}
const la = (t, e = !1) => we(En(Ut(t, e), cd), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Sd = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = En(Ut(t, e.isLE), G);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = En(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function En(t, e) {
  if (!De(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!gi(e))
    throw new Error(`apply: invalid base value ${t}`);
  return me({
    size: t.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = e.decode(r);
      } catch (s) {
        throw n.err("" + s);
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
const Td = (t, e = !1) => {
  if (!Be(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return me({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = sr(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function kd(t, e, n) {
  if (!De(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return me({
    encodeStream: (r, i) => {
      on.resolve(r.stack, t) && e.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!on.resolve(r.stack, t), i)
        return e.decodeStream(r);
    }
  });
}
function da(t, e, n = !0) {
  if (!De(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return me({
    size: t.size,
    encodeStream: (r, i) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const i = t.decodeStream(r);
      if (n && typeof i != "object" && i !== e || Be(e) && !sr(e, i))
        throw r.err(`magic: invalid value: ${i} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Yu(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!We(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function Zt(t) {
  if (!Jr(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!De(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return me({
    size: Yu(Object.values(t)),
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
function Ad(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!De(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return me({
    size: Yu(t),
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
  if (!De(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = qu(typeof t == "string" ? `../${t}` : t);
  return me({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (c) => {
        Be(t) || n.encodeStream(r, i.length);
        for (let f = 0; f < i.length; f++)
          c(`${f}`, () => {
            const l = i[f], p = r.pos;
            if (e.encodeStream(r, l), Be(t)) {
              if (t.length > s.pos - p)
                return;
              const g = s.finish(!1).subarray(p, s.pos);
              if (sr(g.subarray(0, t.length), t))
                throw s.err(`array: inner element encoding same as separator. elm=${l} data=${g}`);
            }
          });
      }), Be(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (s(`${c}`, () => i.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if (Be(t))
          for (let c = 0; ; c++) {
            if (sr(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            s(`${c}`, () => i.push(e.decodeStream(r)));
          }
        else {
          let c;
          s("arrayLen", () => c = n.decodeStream(r));
          for (let f = 0; f < c; f++)
            s(`${f}`, () => i.push(e.decodeStream(r)));
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
const wi = Ce.ProjectivePoint, Xo = Ce.CURVE.n, Nt = ca.isBytes, mn = ca.concatBytes, Mt = ca.equalBytes, Zu = (t) => Jl(se(t)), oe = (...t) => se(se(mn(...t))), Xu = Te.utils.randomPrivateKey, ha = Te.getPublicKey, Id = Ce.getPublicKey, kc = (t) => t.r < Xo / 2n;
function _d(t, e, n = !1) {
  let r = Ce.sign(t, e);
  if (n && !kc(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !kc(r); )
      if (i.set(kt.encode(s++)), r = Ce.sign(t, e, { extraEntropy: i }), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Ac = Te.sign, pa = Te.utils.taggedHash;
var fe;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(fe || (fe = {}));
function ar(t, e) {
  const n = t.length;
  if (e === fe.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return wi.fromHex(t), t;
  } else if (e === fe.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Te.utils.lift_x(Te.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function Qu(t, e) {
  const n = Te.utils, r = n.taggedHash("TapTweak", t, e), i = n.bytesToNumberBE(r);
  if (i >= Xo)
    throw new Error("tweak higher than curve order");
  return i;
}
function Bd(t, e = Uint8Array.of()) {
  const n = Te.utils, r = n.bytesToNumberBE(t), i = wi.fromPrivateKey(r), s = i.hasEvenY() ? r : n.mod(-r, Xo), c = n.pointToBytes(i), f = Qu(c, e);
  return n.numberToBytesBE(n.mod(s + f, Xo), 32);
}
function Ps(t, e) {
  const n = Te.utils, r = Qu(t, e), s = n.lift_x(n.bytesToNumberBE(t)).add(wi.fromPrivateKey(r)), c = s.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(s), c];
}
const ga = se(wi.BASE.toRawBytes(!1)), cr = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Co = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Qo(t, e) {
  if (!Nt(t) || !Nt(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
var $t;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})($t || ($t = {}));
function ur(t = 6, e = !1) {
  return me({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, s = BigInt(r), c = [];
      for (let f = i ? -s : s; f; f >>= 8n)
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
      let i = 0, s = 0n;
      for (let c = 0; c < r; ++c)
        i = n.byte(), s |= BigInt(i) << 8n * BigInt(c);
      return i >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function Nd(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Nt(t))
    try {
      const r = ur(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const yt = me({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if ($t[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte($t[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte($t.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = ur().encode(BigInt(n))), !Nt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < $t.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte($t.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte($t.PUSHDATA2), t.bytes(Tc.encode(r))) : (t.byte($t.PUSHDATA4), t.bytes(kt.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if ($t.OP_0 < n && n <= $t.PUSHDATA4) {
        let r;
        if (n < $t.PUSHDATA1)
          r = n;
        else if (n === $t.PUSHDATA1)
          r = vn.decodeStream(t);
        else if (n === $t.PUSHDATA2)
          r = Tc.decodeStream(t);
        else if (n === $t.PUSHDATA4)
          r = kt.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if ($t.OP_1 <= n && n <= $t.OP_16)
        e.push(n - ($t.OP_1 - 1));
      else {
        const r = $t[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), Ic = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, mi = me({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, i, s] of Object.values(Ic))
      if (!(i > e || e > s)) {
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
    const [n, r, i] = Ic[e];
    let s = 0n;
    for (let c = 0; c < r; c++)
      s |= BigInt(t.byte()) << 8n * BigInt(c);
    if (s < i)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Ke = En(mi, yi.numberBigint), Pe = Ut(mi), ya = ye(Ke, Pe), Jo = (t) => ye(mi, t), Ju = Zt({
  txid: Ut(32, !0),
  // hash(prev_tx),
  index: kt,
  // output number of previous tx
  finalScriptSig: Pe,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: kt
  // ?
}), Kn = Zt({ amount: Do, script: Pe }), Cd = Zt({
  version: Qn,
  segwitFlag: Td(new Uint8Array([0, 1])),
  inputs: Jo(Ju),
  outputs: Jo(Kn),
  witnesses: kd("segwitFlag", ye("inputs/length", ya)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: kt
});
function Ud(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const er = we(Cd, Ud), Ur = Zt({
  version: Qn,
  inputs: Jo(Ju),
  outputs: Jo(Kn),
  lockTime: kt
}), Ls = we(Ut(null), (t) => ar(t, fe.ecdsa)), ti = we(Ut(32), (t) => ar(t, fe.schnorr)), _c = we(Ut(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), bi = Zt({
  fingerprint: xd,
  path: ye(null, kt)
}), tf = Zt({
  hashes: ye(Ke, Ut(32)),
  der: bi
}), Od = Ut(78), Rd = Zt({ pubKey: ti, leafHash: Ut(32) }), Pd = Zt({
  version: vn,
  // With parity :(
  internalKey: Ut(32),
  merklePath: ye(null, Ut(32))
}), rn = we(Pd, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), Ld = ye(null, Zt({
  depth: vn,
  version: vn,
  script: Pe
})), Kt = Ut(null), Bc = Ut(20), _r = Ut(32), wa = {
  unsignedTx: [0, !1, Ur, [0], [0], !1],
  xpub: [1, Od, bi, [], [0, 2], !1],
  txVersion: [2, !1, kt, [2], [2], !1],
  fallbackLocktime: [3, !1, kt, [], [2], !1],
  inputCount: [4, !1, Ke, [2], [2], !1],
  outputCount: [5, !1, Ke, [2], [2], !1],
  txModifiable: [6, !1, vn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, kt, [], [0, 2], !1],
  proprietary: [252, Kt, Kt, [], [0, 2], !1]
}, vi = {
  nonWitnessUtxo: [0, !1, er, [], [0, 2], !1],
  witnessUtxo: [1, !1, Kn, [], [0, 2], !1],
  partialSig: [2, Ls, Kt, [], [0, 2], !1],
  sighashType: [3, !1, kt, [], [0, 2], !1],
  redeemScript: [4, !1, Kt, [], [0, 2], !1],
  witnessScript: [5, !1, Kt, [], [0, 2], !1],
  bip32Derivation: [6, Ls, bi, [], [0, 2], !1],
  finalScriptSig: [7, !1, Kt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, ya, [], [0, 2], !1],
  porCommitment: [9, !1, Kt, [], [0, 2], !1],
  ripemd160: [10, Bc, Kt, [], [0, 2], !1],
  sha256: [11, _r, Kt, [], [0, 2], !1],
  hash160: [12, Bc, Kt, [], [0, 2], !1],
  hash256: [13, _r, Kt, [], [0, 2], !1],
  txid: [14, !1, _r, [2], [2], !0],
  index: [15, !1, kt, [2], [2], !0],
  sequence: [16, !1, kt, [], [2], !0],
  requiredTimeLocktime: [17, !1, kt, [], [2], !1],
  requiredHeightLocktime: [18, !1, kt, [], [2], !1],
  tapKeySig: [19, !1, _c, [], [0, 2], !1],
  tapScriptSig: [20, Rd, _c, [], [0, 2], !1],
  tapLeafScript: [21, rn, Kt, [], [0, 2], !1],
  tapBip32Derivation: [22, _r, tf, [], [0, 2], !1],
  tapInternalKey: [23, !1, ti, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, _r, [], [0, 2], !1],
  proprietary: [252, Kt, Kt, [], [0, 2], !1]
}, $d = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Dd = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], ei = {
  redeemScript: [0, !1, Kt, [], [0, 2], !1],
  witnessScript: [1, !1, Kt, [], [0, 2], !1],
  bip32Derivation: [2, Ls, bi, [], [0, 2], !1],
  amount: [3, !1, bd, [2], [2], !0],
  script: [4, !1, Kt, [2], [2], !0],
  tapInternalKey: [5, !1, ti, [], [0, 2], !1],
  tapTree: [6, !1, Ld, [], [0, 2], !1],
  tapBip32Derivation: [7, ti, tf, [], [0, 2], !1],
  proprietary: [252, Kt, Kt, [], [0, 2], !1]
}, Kd = [], Nc = ye(Hu, Zt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Ed(Ke, Zt({ type: Ke, key: Ut(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Ut(Ke)
}));
function $s(t) {
  const [e, n, r, i, s, c] = t;
  return { type: e, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: c };
}
Zt({ type: Ke, key: Ut(null) });
function ma(t) {
  const e = {};
  for (const n in t) {
    const [r, i, s] = t[n];
    e[r] = [n, i, s];
  }
  return me({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in t) {
        const c = r[s];
        if (c === void 0)
          continue;
        const [f, l, p] = t[s];
        if (!l)
          i.push({ key: { type: f, key: Rt }, value: p.encode(c) });
        else {
          const g = c.map(([w, b]) => [
            l.encode(w),
            p.encode(b)
          ]);
          g.sort((w, b) => Qo(w[0], b[0]));
          for (const [w, b] of g)
            i.push({ key: { key: w, type: f }, value: b });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, c) => Qo(s[0].key, c[0].key));
        for (const [s, c] of r.unknown)
          i.push({ key: s, value: c });
      }
      Nc.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = Nc.decodeStream(n), i = {}, s = {};
      for (const c of r) {
        let f = "unknown", l = c.key.key, p = c.value;
        if (e[c.key.type]) {
          const [g, w, b] = e[c.key.type];
          if (f = g, !w && l.length)
            throw new Error(`PSBT: Non-empty key for ${f} (key=${G.encode(l)} value=${G.encode(p)}`);
          if (l = w ? w.decode(l) : void 0, p = b.decode(p), !w) {
            if (i[f])
              throw new Error(`PSBT: Same keys: ${f} (key=${l} value=${p})`);
            i[f] = p, s[f] = !0;
            continue;
          }
        } else
          l = { type: c.key.type, key: c.key.key };
        if (s[f])
          throw new Error(`PSBT: Key type with empty key and no key=${f} val=${p}`);
        i[f] || (i[f] = []), i[f].push([l, p]);
      }
      return i;
    }
  });
}
const ba = we(ma(vi), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      ar(e, fe.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      ar(e, fe.ecdsa);
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
}), va = we(ma(ei), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      ar(e, fe.ecdsa);
  return t;
}), ef = we(ma(wa), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Md = Zt({
  magic: da(la(new Uint8Array([255])), "psbt"),
  global: ef,
  inputs: ye("global/unsignedTx/inputs/length", ba),
  outputs: ye(null, va)
}), Vd = Zt({
  magic: da(la(new Uint8Array([255])), "psbt"),
  global: ef,
  inputs: ye("global/inputCount", ba),
  outputs: ye("global/outputCount", va)
});
Zt({
  magic: da(la(new Uint8Array([255])), "psbt"),
  items: ye(null, En(ye(Hu, Ad([Sd(Ke), Ut(mi)])), yi.dict()))
});
function ps(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: i } = $s(e[r]);
    if (!i.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: i } = $s(e[r]);
    if (i.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Cc(t, e, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!e[s])
        continue;
      const { allowInc: c, silentIgnore: f } = $s(e[s]);
      if (!c.includes(t)) {
        if (f)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${s} but versions allows inclusion=${c}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function nf(t) {
  const e = t && t.global && t.global.version || 0;
  ps(e, wa, t.global);
  for (const c of t.inputs)
    ps(e, vi, c);
  for (const c of t.outputs)
    ps(e, ei, c);
  const n = e ? t.global.inputCount : t.global.unsignedTx.inputs.length;
  if (t.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = t.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = e ? t.global.outputCount : t.global.unsignedTx.outputs.length;
  if (t.outputs.length < i)
    throw new Error("Not outputs inputs");
  const s = t.outputs.slice(i);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return t;
}
function Ds(t, e, n, r, i) {
  const s = { ...n, ...e };
  for (const c in t) {
    const f = c, [l, p, g] = t[f], w = r && !r.includes(c);
    if (e[c] === void 0 && c in e) {
      if (w)
        throw new Error(`Cannot remove signed field=${c}`);
      delete s[c];
    } else if (p) {
      const b = n && n[c] ? n[c] : [];
      let E = e[f];
      if (E) {
        if (!Array.isArray(E))
          throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
        E = E.map(($) => {
          if ($.length !== 2)
            throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
          return [
            typeof $[0] == "string" ? p.decode(G.decode($[0])) : $[0],
            typeof $[1] == "string" ? g.decode(G.decode($[1])) : $[1]
          ];
        });
        const k = {}, O = ($, F, z) => {
          if (k[$] === void 0) {
            k[$] = [F, z];
            return;
          }
          const H = G.encode(g.encode(k[$][1])), D = G.encode(g.encode(z));
          if (H !== D)
            throw new Error(`keyMap(${f}): same key=${$} oldVal=${H} newVal=${D}`);
        };
        for (const [$, F] of b) {
          const z = G.encode(p.encode($));
          O(z, $, F);
        }
        for (const [$, F] of E) {
          const z = G.encode(p.encode($));
          if (F === void 0) {
            if (w)
              throw new Error(`Cannot remove signed field=${f}/${$}`);
            delete k[z];
          } else
            O(z, $, F);
        }
        s[f] = Object.values(k);
      }
    } else if (typeof s[c] == "string")
      s[c] = g.decode(G.decode(s[c]));
    else if (w && c in e && n && n[c] !== void 0 && !Mt(g.encode(e[c]), g.encode(n[c])))
      throw new Error(`Cannot change signed field=${c}`);
  }
  for (const c in s)
    if (!t[c]) {
      if (i && c === "unknown")
        continue;
      delete s[c];
    }
  return s;
}
const Uc = we(Md, nf), Oc = we(Vd, nf), Fd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Nt(t[1]) || G.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: yt.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, G.decode("4e73")];
  }
};
function Jn(t, e) {
  try {
    return ar(t, e), !0;
  } catch {
    return !1;
  }
}
const Hd = {
  encode(t) {
    if (!(t.length !== 2 || !Nt(t[0]) || !Jn(t[0], fe.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, jd = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Nt(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, qd = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Nt(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, zd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Nt(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Wd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Nt(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Gd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKMULTISIG")
      return;
    const n = t[0], r = t[e - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = t.slice(1, -2);
    if (r === i.length) {
      for (const s of i)
        if (!Nt(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Yd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Nt(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Zd = {
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
      if (!Nt(i))
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
}, Xd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Nd(t[e - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < e - 1; i++) {
        const s = t[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Nt(s))
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
}, Qd = {
  encode(t) {
    return { type: "unknown", script: yt.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? yt.decode(t.script) : void 0
}, Jd = [
  Fd,
  Hd,
  jd,
  qd,
  zd,
  Wd,
  Gd,
  Yd,
  Zd,
  Xd,
  Qd
], th = En(yt, yi.match(Jd)), Ft = we(th, (t) => {
  if (t.type === "pk" && !Jn(t.pubkey, fe.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Nt(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Nt(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Nt(t.pubkey) || !Jn(t.pubkey, fe.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!Jn(n, fe.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!Jn(e, fe.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function Rc(t, e) {
  if (!Mt(t.hash, se(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = Ft.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function rf(t, e, n) {
  if (t) {
    const r = Ft.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!Mt(r.hash, Zu(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = Ft.decode(e);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Rc(r, n);
  }
  if (e) {
    const r = Ft.decode(e);
    r.type === "wsh" && n && Rc(r, n);
  }
}
function eh(t) {
  const e = {};
  for (const n of t) {
    const r = G.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(G.encode)}`);
    e[r] = !0;
  }
}
function nh(t, e, n = !1, r) {
  const i = Ft.decode(t);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const c of s.pubkeys) {
      if (Mt(c, ga))
        throw new Error("Unspendable taproot key in leaf script");
      if (Mt(c, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function of(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((c, f) => (f.weight || 1) - (c.weight || 1));
    const r = e.pop(), i = e.pop(), s = ((i == null ? void 0 : i.weight) || 1) + ((r == null ? void 0 : r.weight) || 1);
    e.push({
      weight: s,
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
function Ms(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...Ms(t.left), ...Ms(t.right)];
}
function Vs(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: l, script: p } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !Mt(t.tapMerkleRoot, Rt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const g = typeof p == "string" ? G.decode(p) : p;
    if (!Nt(g))
      throw new Error(`checkScript: wrong script type=${g}`);
    return nh(g, e, n), {
      type: "leaf",
      version: l,
      script: g,
      hash: Rr(g, l)
    };
  }
  if (t.length !== 2 && (t = of(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = Vs(t[0], e, n), s = Vs(t[1], e, n);
  let [c, f] = [i.hash, s.hash];
  return Qo(f, c) === -1 && ([c, f] = [f, c]), { type: "branch", left: i, right: s, hash: pa("TapBranch", c, f) };
}
const ni = 192, Rr = (t, e = ni) => pa("TapLeaf", new Uint8Array([e]), Pe.encode(t));
function rh(t, e, n = cr, r = !1, i) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof t == "string" ? G.decode(t) : t || ga;
  if (!Jn(s, fe.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (e) {
    let c = Ks(Vs(e, s, r));
    const f = c.hash, [l, p] = Ps(s, f), g = Ms(c).map((w) => ({
      ...w,
      controlBlock: rn.encode({
        version: (w.version || ni) + p,
        internalKey: s,
        merklePath: w.path
      })
    }));
    return {
      type: "tr",
      script: Ft.encode({ type: "tr", pubkey: l }),
      address: Fn(n).encode({ type: "tr", pubkey: l }),
      // For tests
      tweakedPubkey: l,
      // PSBT stuff
      tapInternalKey: s,
      leaves: g,
      tapLeafScript: g.map((w) => [
        rn.decode(w.controlBlock),
        mn(w.script, new Uint8Array([w.version || ni]))
      ]),
      tapMerkleRoot: f
    };
  } else {
    const c = Ps(s, Rt)[0];
    return {
      type: "tr",
      script: Ft.encode({ type: "tr", pubkey: c }),
      address: Fn(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function oh(t, e, n = !1) {
  return n || eh(e), {
    type: "tr_ms",
    script: Ft.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const sf = ad(se);
function af(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function gs(t, e, n = cr) {
  af(t, e);
  const r = t === 0 ? Os : Xn;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Pc(t, e) {
  return sf.encode(mn(Uint8Array.from(e), t));
}
function Fn(t = cr) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return gs(0, e.hash, t);
      if (n === "wsh")
        return gs(0, e.hash, t);
      if (n === "tr")
        return gs(1, e.pubkey, t);
      if (n === "pkh")
        return Pc(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Pc(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Os.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = Xn.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, c = Os.fromWords(s);
        if (af(i, c), i === 0 && c.length === 32)
          return { type: "wsh", hash: c };
        if (i === 0 && c.length === 20)
          return { type: "wpkh", hash: c };
        if (i === 1 && c.length === 32)
          return { type: "tr", pubkey: c };
        throw new Error("Unknown witness program");
      }
      const n = sf.decode(e);
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
const Uo = new Uint8Array(32), ih = {
  amount: 0xffffffffffffffffn,
  script: Rt
}, sh = (t) => Math.ceil(t / 4), ah = 8, ch = 2, Pn = 0, xa = 4294967295;
yi.decimal(ah);
const Pr = (t, e) => t === void 0 ? e : t;
function ri(t) {
  if (Array.isArray(t))
    return t.map((e) => ri(e));
  if (Nt(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, ri(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Bt;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Bt || (Bt = {}));
var sn;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(sn || (sn = {}));
function uh(t, e, n, r = Rt) {
  return Mt(n, e) && (t = Bd(t, r), e = ha(t)), { privKey: t, pubKey: e };
}
function Ln(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function Br(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: Pr(t.sequence, xa),
    finalScriptSig: Pr(t.finalScriptSig, Rt)
  };
}
function ys(t) {
  for (const e in t) {
    const n = e;
    $d.includes(n) || delete t[n];
  }
}
const ws = Zt({ txid: Ut(32, !0), index: kt });
function fh(t) {
  if (typeof t != "number" || typeof sn[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Lc(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Bt.ANYONECANPAY),
    isNone: e === Bt.NONE,
    isSingle: e === Bt.SINGLE
  };
}
function lh(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: Pr(t.version, ch),
    lockTime: Pr(t.lockTime, 0),
    PSBTVersion: Pr(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (kt.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
function $c(t) {
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!Mt(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (t.txid) {
      if (t.nonWitnessUtxo.outputs.length - 1 < t.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Jt.fromRaw(er.encode(t.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = G.encode(t.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
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
function Dc(t, e, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: c } = t;
  typeof s == "string" && (s = G.decode(s)), Nt(s) && (s = er.decode(s)), !("nonWitnessUtxo" in t) && s === void 0 && (s = e == null ? void 0 : e.nonWitnessUtxo), typeof c == "string" && (c = G.decode(c)), c === void 0 && (c = e == null ? void 0 : e.txid);
  let f = { ...e, ...t, nonWitnessUtxo: s, txid: c };
  !("nonWitnessUtxo" in t) && f.nonWitnessUtxo === void 0 && delete f.nonWitnessUtxo, f.sequence === void 0 && (f.sequence = xa), f.tapMerkleRoot === null && delete f.tapMerkleRoot, f = Ds(vi, f, e, n, i), ba.encode(f);
  let l;
  return f.nonWitnessUtxo && f.index !== void 0 ? l = f.nonWitnessUtxo.outputs[f.index] : f.witnessUtxo && (l = f.witnessUtxo), l && !r && rf(l && l.script, f.redeemScript, f.witnessScript), f;
}
function Kc(t, e = !1) {
  let n = "legacy", r = Bt.ALL;
  const i = Ko(t), s = Ft.decode(i.script);
  let c = s.type, f = s;
  const l = [s];
  if (s.type === "tr")
    return r = Bt.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: i.script,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!t.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let b = Ft.decode(t.redeemScript);
      (b.type === "wpkh" || b.type === "wsh") && (n = "segwit"), l.push(b), f = b, c += `-${b.type}`;
    }
    if (f.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let b = Ft.decode(t.witnessScript);
      b.type === "wsh" && (n = "segwit"), l.push(b), f = b, c += `-${b.type}`;
    }
    const p = l[l.length - 1];
    if (p.type === "sh" || p.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const g = Ft.encode(p), w = {
      type: c,
      txType: n,
      last: p,
      lastScript: g,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return w;
  }
}
class Jt {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = lh(e);
    n.lockTime !== Pn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = er.decode(e), i = new Jt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      i.addOutput(s);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        i.inputs[s].finalScriptWitness = r.witnesses[s];
    return i;
  }
  // PSBT
  static fromPSBT(e, n = {}) {
    let r;
    try {
      r = Uc.decode(e);
    } catch (w) {
      try {
        r = Oc.decode(e);
      } catch {
        throw w;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, c = i === 0 ? s == null ? void 0 : s.version : r.global.txVersion, f = i === 0 ? s == null ? void 0 : s.lockTime : r.global.fallbackLocktime, l = new Jt({ ...n, version: c, lockTime: f, PSBTVersion: i }), p = i === 0 ? s == null ? void 0 : s.inputs.length : r.global.inputCount;
    l.inputs = r.inputs.slice(0, p).map((w, b) => {
      var E;
      return $c({
        finalScriptSig: Rt,
        ...(E = r.global.unsignedTx) == null ? void 0 : E.inputs[b],
        ...w
      });
    });
    const g = i === 0 ? s == null ? void 0 : s.outputs.length : r.global.outputCount;
    return l.outputs = r.outputs.slice(0, g).map((w, b) => {
      var E;
      return {
        ...w,
        ...(E = r.global.unsignedTx) == null ? void 0 : E.outputs[b]
      };
    }), l.global = { ...r.global, txVersion: c }, f !== Pn && (l.global.fallbackLocktime = f), l;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((s) => $c(Cc(e, vi, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Cc(e, ei, s)), i = { ...this.global };
    return e === 0 ? (i.unsignedTx = Ur.decode(Ur.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Br).map((s) => ({
        ...s,
        finalScriptSig: Rt
      })),
      outputs: this.outputs.map(Ln)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = e, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Pn && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Uc : Oc).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Pn, n = 0, r = Pn, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (e = Math.max(e, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? e : r !== Pn ? r : this.global.fallbackLocktime || Pn;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? Bt.DEFAULT : n, i = r === Bt.DEFAULT ? Bt.ALL : r & 3;
    return { sigInputs: r & Bt.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: f, sigOutputs: l } = this.inputSighash(s);
      if (f === Bt.ANYONECANPAY ? r.push(s) : e = !1, l === Bt.ALL)
        n = !1;
      else if (l === Bt.SINGLE)
        i.push(s);
      else if (l !== Bt.NONE) throw new Error(`Wrong signature hash output type: ${l}`);
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
    const n = this.outputs.map(Ln);
    e += 4 * Ke.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Pe.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Ke.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Pe.encode(r.finalScriptSig || Rt).length, this.hasWitnesses && r.finalScriptWitness && (e += ya.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return sh(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return er.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Br).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Rt
      })),
      outputs: this.outputs.map(Ln),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return G.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return G.encode(oe(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return G.encode(oe(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), ri(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Dc(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(e)) && (i = Dd);
    }
    this.inputs[e] = Dc(n, this.inputs[e], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), ri(this.outputs[e]);
  }
  getOutputAddress(e, n = cr) {
    const r = this.getOutput(e);
    if (r.script)
      return Fn(n).encode(Ft.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: i, script: s } = e;
    if (i === void 0 && (i = n == null ? void 0 : n.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = G.decode(s)), s === void 0 && (s = n == null ? void 0 : n.script);
    let c = { ...n, ...e, amount: i, script: s };
    if (c.amount === void 0 && delete c.amount, c = Ds(ei, c, n, r, this.opts.allowUnknown), va.encode(c), c.script && !this.opts.allowUnknownOutputs && Ft.decode(c.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || rf(c.script, c.redeemScript, c.witnessScript), c;
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
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(e)) && (i = Kd);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], i);
  }
  addOutputAddress(e, n, r = cr) {
    return this.addOutput({ script: Ft.encode(Fn(r).decode(e)), amount: n });
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
    const n = this.outputs.map(Ln);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: i, isNone: s, isSingle: c } = Lc(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return Gu.encode(1n);
    n = yt.encode(yt.decode(n).filter((g) => g !== "CODESEPARATOR"));
    let f = this.inputs.map(Br).map((g, w) => ({
      ...g,
      finalScriptSig: w === e ? n : Rt
    }));
    i ? f = [f[e]] : (s || c) && (f = f.map((g, w) => ({
      ...g,
      sequence: w === e ? g.sequence : 0
    })));
    let l = this.outputs.map(Ln);
    s ? l = [] : c && (l = l.slice(0, e).fill(ih).concat([l[e]]));
    const p = er.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: f,
      outputs: l
    });
    return oe(p, Qn.encode(r));
  }
  preimageWitnessV0(e, n, r, i) {
    const { isAny: s, isNone: c, isSingle: f } = Lc(r);
    let l = Uo, p = Uo, g = Uo;
    const w = this.inputs.map(Br), b = this.outputs.map(Ln);
    s || (l = oe(...w.map(ws.encode))), !s && !f && !c && (p = oe(...w.map((k) => kt.encode(k.sequence)))), !f && !c ? g = oe(...b.map(Kn.encode)) : f && e < b.length && (g = oe(Kn.encode(b[e])));
    const E = w[e];
    return oe(Qn.encode(this.version), l, p, Ut(32, !0).encode(E.txid), kt.encode(E.index), Pe.encode(n), Do.encode(i), kt.encode(E.sequence), g, kt.encode(this.lockTime), kt.encode(r));
  }
  preimageWitnessV1(e, n, r, i, s = -1, c, f = 192, l) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const p = [
      vn.encode(0),
      vn.encode(r),
      // U8 sigHash
      Qn.encode(this.version),
      kt.encode(this.lockTime)
    ], g = r === Bt.DEFAULT ? Bt.ALL : r & 3, w = r & Bt.ANYONECANPAY, b = this.inputs.map(Br), E = this.outputs.map(Ln);
    w !== Bt.ANYONECANPAY && p.push(...[
      b.map(ws.encode),
      i.map(Do.encode),
      n.map(Pe.encode),
      b.map((O) => kt.encode(O.sequence))
    ].map((O) => se(mn(...O)))), g === Bt.ALL && p.push(se(mn(...E.map(Kn.encode))));
    const k = (l ? 1 : 0) | (c ? 2 : 0);
    if (p.push(new Uint8Array([k])), w === Bt.ANYONECANPAY) {
      const O = b[e];
      p.push(ws.encode(O), Do.encode(i[e]), Pe.encode(n[e]), kt.encode(O.sequence));
    } else
      p.push(kt.encode(e));
    return k & 1 && p.push(se(Pe.encode(l || Rt))), g === Bt.SINGLE && p.push(e < E.length ? se(Kn.encode(E[e])) : Uo), c && p.push(Rr(c, f), vn.encode(0), Qn.encode(s)), pa("TapSighash", ...p);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], c = Kc(s, this.opts.allowLegacyWitnessUtxo);
    if (!Nt(e)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const g = s.bip32Derivation.filter((b) => b[1].fingerprint == e.fingerprint).map(([b, { path: E }]) => {
        let k = e;
        for (const O of E)
          k = k.deriveChild(O);
        if (!Mt(k.publicKey, b))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!k.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return k;
      });
      if (!g.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let w = !1;
      for (const b of g)
        this.signIdx(b.privateKey, n) && (w = !0);
      return w;
    }
    r ? r.forEach(fh) : r = [c.defaultSighash];
    const f = c.sighash;
    if (!r.includes(f))
      throw new Error(`Input with not allowed sigHash=${f}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: l } = this.inputSighash(n);
    if (l === Bt.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const p = Ko(s);
    if (c.txType === "taproot") {
      const g = this.inputs.map(Ko), w = g.map(($) => $.script), b = g.map(($) => $.amount);
      let E = !1, k = ha(e), O = s.tapMerkleRoot || Rt;
      if (s.tapInternalKey) {
        const { pubKey: $, privKey: F } = uh(e, k, s.tapInternalKey, O), [z, H] = Ps(s.tapInternalKey, O);
        if (Mt(z, $)) {
          const D = this.preimageWitnessV1(n, w, f, b), K = mn(Ac(D, F, i), f !== Bt.DEFAULT ? new Uint8Array([f]) : Rt);
          this.updateInput(n, { tapKeySig: K }, !0), E = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [$, F] of s.tapLeafScript) {
          const z = F.subarray(0, -1), H = yt.decode(z), D = F[F.length - 1], K = Rr(z, D);
          if (H.findIndex((xt) => Nt(xt) && Mt(xt, k)) === -1)
            continue;
          const A = this.preimageWitnessV1(n, w, f, b, void 0, z, D), lt = mn(Ac(A, e, i), f !== Bt.DEFAULT ? new Uint8Array([f]) : Rt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: k, leafHash: K }, lt]] }, !0), E = !0;
        }
      }
      if (!E)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const g = Id(e);
      let w = !1;
      const b = Zu(g);
      for (const O of yt.decode(c.lastScript))
        Nt(O) && (Mt(O, g) || Mt(O, b)) && (w = !0);
      if (!w)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let E;
      if (c.txType === "legacy")
        E = this.preimageLegacy(n, c.lastScript, f);
      else if (c.txType === "segwit") {
        let O = c.lastScript;
        c.last.type === "wpkh" && (O = Ft.encode({ type: "pkh", hash: c.last.hash })), E = this.preimageWitnessV0(n, O, f, p.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const k = _d(E, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[g, mn(k, new Uint8Array([f]))]]
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
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(e, s, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(e) {
    if (this.checkInputIdx(e), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[e], r = Kc(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const l = n.tapLeafScript.sort((p, g) => rn.encode(p[0]).length - rn.encode(g[0]).length);
        for (const [p, g] of l) {
          const w = g.slice(0, -1), b = g[g.length - 1], E = Ft.decode(w), k = Rr(w, b), O = n.tapScriptSig.filter((F) => Mt(F[0].leafHash, k));
          let $ = [];
          if (E.type === "tr_ms") {
            const F = E.m, z = E.pubkeys;
            let H = 0;
            for (const D of z) {
              const K = O.findIndex((tt) => Mt(tt[0].pubKey, D));
              if (H === F || K === -1) {
                $.push(Rt);
                continue;
              }
              $.push(O[K][1]), H++;
            }
            if (H !== F)
              continue;
          } else if (E.type === "tr_ns") {
            for (const F of E.pubkeys) {
              const z = O.findIndex((H) => Mt(H[0].pubKey, F));
              z !== -1 && $.push(O[z][1]);
            }
            if ($.length !== E.pubkeys.length)
              continue;
          } else if (E.type === "unknown" && this.opts.allowUnknownInputs) {
            const F = yt.decode(w);
            if ($ = O.map(([{ pubKey: z }, H]) => {
              const D = F.findIndex((K) => Nt(K) && Mt(K, z));
              if (D === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: H, pos: D };
            }).sort((z, H) => z.pos - H.pos).map((z) => z.signature), !$.length)
              continue;
          } else {
            const F = this.opts.customScripts;
            if (F)
              for (const z of F) {
                if (!z.finalizeTaproot)
                  continue;
                const H = yt.decode(w), D = z.encode(H);
                if (D === void 0)
                  continue;
                const K = z.finalizeTaproot(w, D, O);
                if (K) {
                  n.finalScriptWitness = K.concat(rn.encode(p)), n.finalScriptSig = Rt, ys(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = $.reverse().concat([w, rn.encode(p)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Rt, ys(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = Rt, s = [];
    if (r.last.type === "ms") {
      const l = r.last.m, p = r.last.pubkeys;
      let g = [];
      for (const w of p) {
        const b = n.partialSig.find((E) => Mt(w, E[0]));
        b && g.push(b[1]);
      }
      if (g = g.slice(0, l), g.length !== l)
        throw new Error(`Multisig: wrong signatures count, m=${l} n=${p.length} signatures=${g.length}`);
      i = yt.encode([0, ...g]);
    } else if (r.last.type === "pk")
      i = yt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = yt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = Rt, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let c, f;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = yt.decode(i).map((l) => {
      if (l === 0)
        return Rt;
      if (Nt(l))
        return l;
      throw new Error(`Wrong witness op=${l}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (f = s), r.type.startsWith("sh-wsh-") ? c = yt.encode([yt.encode([0, se(r.lastScript)])]) : r.type.startsWith("sh-") ? c = yt.encode([...yt.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (c = i), !c && !f)
      throw new Error("Unknown error finalizing input");
    c && (n.finalScriptSig = c), f && (n.finalScriptWitness = f), ys(n);
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
    const n = this.global.unsignedTx ? Ur.encode(this.global.unsignedTx) : Rt, r = e.global.unsignedTx ? Ur.encode(e.global.unsignedTx) : Rt;
    if (!Mt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ds(wa, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, e.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, e.outputs[i], !0);
    return this;
  }
  clone() {
    return Jt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class cf extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: uf, pointToBytes: Oo } = Te.utils, Sn = Ce.ProjectivePoint, Ge = 33, Fs = new Uint8Array(Ge), bn = Ce.CURVE.n, Mc = En(Ut(33), {
  decode: (t) => Ea(t) ? Fs : t.toRawBytes(!0),
  encode: (t) => Vr(t, Fs) ? Sn.ZERO : Sn.fromHex(t)
}), Vc = we(Gu, (t) => (Ne("n", t, 1n, bn), t)), Mo = Zt({ R1: Mc, R2: Mc }), ff = Zt({ k1: Vc, k2: Vc, publicKey: Ut(Ge) });
function Fc(t, ...e) {
}
function Le(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => ue(n, ...e));
}
function Hc(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const $e = (t) => Yt(t, bn), oi = (t, ...e) => $e(le(uf(t, ...e))), Nr = (t, e) => t.hasEvenY() ? e : $e(-e);
function Mn(t) {
  return Sn.BASE.multiply(t);
}
function Ea(t) {
  return t.equals(Sn.ZERO);
}
function Hs(t) {
  return Le(t, Ge), t.sort(Qo);
}
function lf(t) {
  Le(t, Ge);
  for (let e = 1; e < t.length; e++)
    if (!Vr(t[e], t[0]))
      return t[e];
  return Fs;
}
function df(t) {
  return Le(t, Ge), uf("KeyAgg list", ...t);
}
function hf(t, e, n) {
  return ue(t, Ge), ue(e, Ge), Vr(t, e) ? 1n : oi("KeyAgg coefficient", n, t);
}
function js(t, e = [], n = []) {
  if (Le(t, Ge), Le(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = lf(t), i = df(t);
  let s = Sn.ZERO;
  for (let l = 0; l < t.length; l++) {
    let p;
    try {
      p = Sn.fromHex(t[l]);
    } catch {
      throw new cf(l, "pubkey");
    }
    s = s.add(p.multiply(hf(t[l], r, i)));
  }
  let c = 1n, f = 0n;
  for (let l = 0; l < e.length; l++) {
    const p = n[l] && !s.hasEvenY() ? $e(-1n) : 1n, g = le(e[l]);
    if (Ne("tweak", g, 0n, bn), s = s.multiply(p).add(Mn(g)), Ea(s))
      throw new Error("The result of tweaking cannot be infinity");
    c = $e(p * c), f = $e(g + p * f);
  }
  return { aggPublicKey: s, gAcc: c, tweakAcc: f };
}
const jc = (t, e, n, r, i, s) => oi("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, i, ze(s.length, 4), s, new Uint8Array([r]));
function dh(t, e, n = new Uint8Array(0), r, i = new Uint8Array(0), s = Qs(32)) {
  ue(t, Ge), Fc(e, 32), ue(n, 0, 32), Fc(), ue(i), ue(s, 32);
  const c = new Uint8Array([0]), f = jc(s, t, n, 0, c, i), l = jc(s, t, n, 1, c, i);
  return {
    secret: ff.encode({ k1: f, k2: l, publicKey: t }),
    public: Mo.encode({ R1: Mn(f), R2: Mn(l) })
  };
}
class hh {
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
  constructor(e, n, r, i = [], s = []) {
    if (Le(n, 33), Le(i, 32), Hc(s), ue(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: f, tweakAcc: l } = js(n, i, s), { R1: p, R2: g } = Mo.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = f, this.tweakAcc = l, this.b = oi("MuSig/noncecoef", e, Oo(c), r);
    const w = p.add(g.multiply(this.b));
    this.R = Ea(w) ? Sn.BASE : w, this.e = oi("BIP0340/challenge", Oo(this.R), Oo(c), r), this.tweaks = i, this.isXonly = s, this.L = df(n), this.secondKey = lf(n);
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
    if (!n.some((s) => Vr(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return hf(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: i, gAcc: s, b: c, R: f, e: l } = this, p = le(e);
    if (p >= bn)
      return !1;
    const { R1: g, R2: w } = Mo.decode(n), b = g.add(w.multiply(c)), E = f.hasEvenY() ? b : b.negate(), k = Sn.fromHex(r), O = this.getSessionKeyAggCoeff(k), $ = $e(Nr(i, 1n) * s), F = Mn(p), z = E.add(k.multiply($e(l * O * $)));
    return F.equals(z);
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
    if (ue(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: c, R: f, e: l } = this, { k1: p, k2: g, publicKey: w } = ff.decode(e);
    e.fill(0, 0, 64), Ne("k1", p, 0n, bn), Ne("k2", g, 0n, bn);
    const b = Nr(f, p), E = Nr(f, g), k = le(n);
    Ne("d_", k, 1n, bn);
    const O = Mn(k), $ = O.toRawBytes(!0);
    if (!Vr($, w))
      throw new Error("Public key does not match nonceGen argument");
    const F = this.getSessionKeyAggCoeff(O), z = Nr(i, 1n), H = $e(z * s * k), D = $e(b + c * E + l * F * H), K = ze(D, 32);
    if (!r) {
      const tt = Mo.encode({
        R1: Mn(p),
        R2: Mn(g)
      });
      if (!this.partialSigVerifyInternal(K, tt, $))
        throw new Error("Partial signature verification failed");
    }
    return K;
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
    const { publicKeys: i, tweaks: s, isXonly: c } = this;
    if (ue(e, 32), Le(n, 66), Le(i, Ge), Le(s, 32), Hc(c), Fo(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (s.length !== c.length)
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
    Le(e, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let c = 0n;
    for (let l = 0; l < e.length; l++) {
      const p = le(e[l]);
      if (p >= bn)
        throw new cf(l, "psig");
      c = $e(c + p);
    }
    const f = Nr(n, 1n);
    return c = $e(c + s * f * r), Vn(Oo(i), ze(c, 32));
  }
}
function ph(t) {
  const e = dh(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Sa = 2n ** 256n, nr = Sa - 0x1000003d1n, pf = Sa - 0x14551231950b75fc4402da1732fc9bebfn, gh = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, yh = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, Ta = {
  n: pf,
  a: 0n,
  b: 7n
}, Lr = 32, qc = (t) => st(st(t * t) * t + Ta.b), ie = (t = "") => {
  throw new Error(t);
}, xi = (t) => typeof t == "bigint", gf = (t) => typeof t == "string", ms = (t) => xi(t) && 0n < t && t < nr, yf = (t) => xi(t) && 0n < t && t < pf, wh = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", qs = (t, e) => (
  // assert is Uint8Array (of specific length)
  !wh(t) || typeof e == "number" && e > 0 && t.length !== e ? ie("Uint8Array expected") : t
), wf = (t) => new Uint8Array(t), mf = (t, e) => qs(gf(t) ? ka(t) : wf(qs(t)), e), st = (t, e = nr) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, zc = (t) => t instanceof _e ? t : ie("Point expected");
class _e {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? Or : new _e(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = mf(e);
    let n;
    const r = e[0], i = e.subarray(1), s = Gc(i, 0, Lr), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      ms(s) || ie("Point hex invalid: x not FE");
      let f = vh(qc(s));
      const l = (f & 1n) === 1n;
      (r & 1) === 1 !== l && (f = st(-f)), n = new _e(s, f, 1n);
    }
    return c === 65 && r === 4 && (n = new _e(s, Gc(i, Lr, 2 * Lr), 1n)), n ? n.ok() : ie("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return $r.mul(xh(e));
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
    const { px: n, py: r, pz: i } = this, { px: s, py: c, pz: f } = zc(e), l = st(n * f), p = st(s * i), g = st(r * f), w = st(c * i);
    return l === p && g === w;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new _e(this.px, st(-this.py), this.pz);
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
    const { px: n, py: r, pz: i } = this, { px: s, py: c, pz: f } = zc(e), { a: l, b: p } = Ta;
    let g = 0n, w = 0n, b = 0n;
    const E = st(p * 3n);
    let k = st(n * s), O = st(r * c), $ = st(i * f), F = st(n + r), z = st(s + c);
    F = st(F * z), z = st(k + O), F = st(F - z), z = st(n + i);
    let H = st(s + f);
    return z = st(z * H), H = st(k + $), z = st(z - H), H = st(r + i), g = st(c + f), H = st(H * g), g = st(O + $), H = st(H - g), b = st(l * z), g = st(E * $), b = st(g + b), g = st(O - b), b = st(O + b), w = st(g * b), O = st(k + k), O = st(O + k), $ = st(l * $), z = st(E * z), O = st(O + $), $ = st(k - $), $ = st(l * $), z = st(z + $), k = st(O * z), w = st(w + k), k = st(H * z), g = st(F * g), g = st(g - k), k = st(F * O), b = st(H * b), b = st(b + k), new _e(g, w, b);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return Or;
    if (yf(e) || ie("scalar invalid"), this.equals($r))
      return Sh(e).p;
    let r = Or, i = $r;
    for (let s = this; e > 0n; s = s.double(), e >>= 1n)
      e & 1n ? r = r.add(s) : n && (i = i.add(s));
    return r;
  }
  mulAddQUns(e, n, r) {
    return this.mul(n, !1).add(e.mul(r, !1)).ok();
  }
  // to private keys. Doesn't use Shamir trick
  /** Convert point to 2d xy affine point. (x, y, z) ∋ (x=x/z, y=y/z) */
  toAffine() {
    const { px: e, py: n, pz: r } = this;
    if (this.equals(Or))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const i = bh(r, nr);
    return st(r * i) !== 1n && ie("inverse invalid"), { x: st(e * i), y: st(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!ms(e) || !ms(n)) && ie("Point invalid: x or y"), st(n * n) === qc(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : ie("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Yc(n) + (e ? "" : Yc(r));
  }
  toRawBytes(e = !0) {
    return ka(this.toHex(e));
  }
}
_e.BASE = new _e(gh, yh, 1n);
_e.ZERO = new _e(0n, 1n, 0n);
const { BASE: $r, ZERO: Or } = _e, bf = (t, e) => t.toString(16).padStart(e, "0"), vf = (t) => Array.from(qs(t)).map((e) => bf(e, 2)).join(""), Je = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Wc = (t) => {
  if (t >= Je._0 && t <= Je._9)
    return t - Je._0;
  if (t >= Je.A && t <= Je.F)
    return t - (Je.A - 10);
  if (t >= Je.a && t <= Je.f)
    return t - (Je.a - 10);
}, ka = (t) => {
  const e = "hex invalid";
  if (!gf(t))
    return ie(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return ie(e);
  const i = wf(r);
  for (let s = 0, c = 0; s < r; s++, c += 2) {
    const f = Wc(t.charCodeAt(c)), l = Wc(t.charCodeAt(c + 1));
    if (f === void 0 || l === void 0)
      return ie(e);
    i[s] = f * 16 + l;
  }
  return i;
}, xf = (t) => BigInt("0x" + (vf(t) || "0")), Gc = (t, e, n) => xf(t.slice(e, n)), mh = (t) => xi(t) && t >= 0n && t < Sa ? ka(bf(t, 2 * Lr)) : ie("bigint expected"), Yc = (t) => vf(mh(t)), bh = (t, e) => {
  (t === 0n || e <= 0n) && ie("no inverse n=" + t + " mod=" + e);
  let n = st(t, e), r = e, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const c = r / n, f = r % n, l = i - s * c;
    r = n, n = f, i = s, s = l;
  }
  return r === 1n ? st(i, e) : ie("no inverse");
}, vh = (t) => {
  let e = 1n;
  for (let n = t, r = (nr + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % nr), n = n * n % nr;
  return st(e * e) === t ? e : ie("sqrt invalid");
}, xh = (t) => (xi(t) || (t = xf(mf(t, Lr))), yf(t) ? t : ie("private key invalid 3")), $n = 8, Eh = () => {
  const t = [], e = 256 / $n + 1;
  let n = $r, r = n;
  for (let i = 0; i < e; i++) {
    r = n, t.push(r);
    for (let s = 1; s < 2 ** ($n - 1); s++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let Zc;
const Sh = (t) => {
  const e = Zc || (Zc = Eh()), n = (g, w) => {
    let b = w.negate();
    return g ? b : w;
  };
  let r = Or, i = $r;
  const s = 1 + 256 / $n, c = 2 ** ($n - 1), f = BigInt(2 ** $n - 1), l = 2 ** $n, p = BigInt($n);
  for (let g = 0; g < s; g++) {
    const w = g * c;
    let b = Number(t & f);
    t >>= p, b > c && (b -= l, t += 1n);
    const E = w, k = w + Math.abs(b) - 1, O = g % 2 !== 0, $ = b < 0;
    b === 0 ? i = i.add(n(O, e[E])) : r = r.add(n($, e[k]));
  }
  return { p: r, f: i };
};
function Aa(t, e, n = {}) {
  t = Hs(t);
  const { aggPublicKey: r } = js(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const i = Te.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = js(t, [i], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: s.toRawBytes(!0)
  };
}
class Ro extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Ia {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new Ro("Invalid s length");
    if (n.length !== 33)
      throw new Ro("Invalid R length");
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
      throw new Ro("Invalid partial signature length");
    if (le(e) >= Ta.n)
      throw new Ro("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Ia(e, r);
  }
}
function Th(t, e, n, r, i, s) {
  let c;
  if ((s == null ? void 0 : s.taprootTweak) !== void 0) {
    const { preTweakedKey: p } = Aa(Hs(r));
    c = Te.utils.taggedHash("TapTweak", p.subarray(1), s.taprootTweak);
  }
  const l = new hh(n, Hs(r), i, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return Ia.decode(l);
}
var kh = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ah(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var bs, Xc;
function Ih() {
  if (Xc) return bs;
  Xc = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, i = 1 << 22, s = r, c = 1 << n, f = r << n;
  function l(g) {
    return g & e ? {} : g & i ? {
      seconds: (g & r) << n
    } : {
      blocks: g & r
    };
  }
  function p({ blocks: g, seconds: w }) {
    if (g !== void 0 && w !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (g === void 0 && w === void 0) return t;
    if (w !== void 0) {
      if (!Number.isFinite(w)) throw new TypeError("Expected Number seconds");
      if (w > f) throw new TypeError("Expected Number seconds <= " + f);
      if (w % c !== 0) throw new TypeError("Expected Number seconds as a multiple of " + c);
      return i | w >> n;
    }
    if (!Number.isFinite(g)) throw new TypeError("Expected Number blocks");
    if (g > r) throw new TypeError("Expected Number blocks <= " + s);
    return g;
  }
  return bs = { decode: l, encode: p }, bs;
}
var zs = Ih(), Me;
(function(t) {
  t.VtxoTaprootTree = "taptree", t.VtxoTreeExpiry = "expiry", t.Cosigner = "cosigner", t.ConditionWitness = "condition";
})(Me || (Me = {}));
const Ef = 255;
function _h(t, e, n, r) {
  var i;
  t.updateInput(e, {
    unknown: [
      ...((i = t.getInput(e)) == null ? void 0 : i.unknown) ?? [],
      n.encode(r)
    ]
  });
}
function Sf(t, e, n) {
  var s;
  const r = ((s = t.getInput(e)) == null ? void 0 : s.unknown) ?? [], i = [];
  for (const c of r) {
    const f = n.decode(c);
    f && i.push(f);
  }
  return i;
}
const Bh = {
  key: Me.VtxoTaprootTree,
  encode: (t) => [
    {
      type: Ef,
      key: _a[Me.VtxoTaprootTree]
    },
    t
  ],
  decode: (t) => kf(() => Af(t[0], Me.VtxoTaprootTree) ? t[1] : null)
};
Me.ConditionWitness;
const Tf = {
  key: Me.Cosigner,
  encode: (t) => [
    {
      type: Ef,
      key: new Uint8Array([
        ..._a[Me.Cosigner],
        t.index
      ])
    },
    t.key
  ],
  decode: (t) => kf(() => Af(t[0], Me.Cosigner) ? {
    index: t[0].key[t[0].key.length - 1],
    key: t[1]
  } : null)
};
Me.VtxoTreeExpiry;
const _a = Object.fromEntries(Object.values(Me).map((t) => [
  t,
  new TextEncoder().encode(t)
])), kf = (t) => {
  try {
    return t();
  } catch {
    return null;
  }
};
function Af(t, e) {
  const n = G.encode(_a[e]);
  return G.encode(new Uint8Array([t.type, ...t.key])).includes(n);
}
const vs = new Error("missing vtxo graph");
class qr {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = Xu();
    return new qr(e);
  }
  init(e, n, r) {
    this.graph = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return Ce.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.graph)
      throw vs;
    this.myNonces || (this.myNonces = this.generateNonces());
    const e = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      e.set(n, { pubNonce: r.pubNonce });
    return e;
  }
  setAggregatedNonces(e) {
    if (this.aggregateNonces)
      throw new Error("nonces already set");
    this.aggregateNonces = e;
  }
  sign() {
    if (!this.graph)
      throw vs;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = /* @__PURE__ */ new Map();
    for (const n of this.graph) {
      const r = this.signPartial(n);
      e.set(n.txid, r);
    }
    return e;
  }
  generateNonces() {
    if (!this.graph)
      throw vs;
    const e = /* @__PURE__ */ new Map(), n = Ce.getPublicKey(this.secretKey);
    for (const r of this.graph) {
      const i = ph(n);
      e.set(r.txid, i);
    }
    return e;
  }
  signPartial(e) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw qr.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(e.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(e.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], c = Sf(e.root, 0, Tf).map((p) => p.key), { finalKey: f } = Aa(c, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let p = 0; p < e.root.inputsLength; p++) {
      const g = Nh(f, this.graph, this.rootSharedOutputAmount, e.root);
      i.push(g.amount), s.push(g.script);
    }
    const l = e.root.preimageWitnessV1(
      0,
      // always first input
      s,
      sn.DEFAULT,
      i
    );
    return Th(n.secNonce, this.secretKey, r.pubNonce, c, l, {
      taprootTweak: this.scriptRoot
    });
  }
}
qr.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Nh(t, e, n, r) {
  const i = yt.encode(["OP_1", t.slice(1)]);
  if (G.encode(oe(r.toBytes(!0)).reverse()) === e.txid)
    return {
      amount: n,
      script: i
    };
  const c = r.getInput(0);
  if (!c.txid)
    throw new Error("missing parent input txid");
  const f = G.encode(new Uint8Array(c.txid)), l = e.find(f);
  if (!l)
    throw new Error("parent  tx not found");
  if (c.index === void 0)
    throw new Error("missing input index");
  const p = l.root.getOutput(c.index);
  if (!p)
    throw new Error("parent output not found");
  if (!p.amount)
    throw new Error("parent output amount not found");
  return {
    amount: p.amount,
    script: i
  };
}
const Qc = new Uint8Array(32).fill(0), Jc = Object.values(sn).filter((t) => typeof t == "number");
class ii {
  constructor(e) {
    this.key = e || Xu();
  }
  static fromPrivateKey(e) {
    return new ii(e);
  }
  static fromHex(e) {
    return new ii(G.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, Jc, Qc))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, Jc, Qc))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  xOnlyPublicKey() {
    return ha(this.key);
  }
  signerSession() {
    return qr.random();
  }
}
class fr {
  constructor(e, n, r, i = 0) {
    if (this.serverPubKey = e, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, e.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + e.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(e) {
    const n = Xn.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Xn.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), c = r.slice(33, 65);
    return new fr(s, c, n.prefix, i);
  }
  encode() {
    const e = new Uint8Array(65);
    e[0] = this.version, e.set(this.serverPubKey, 1), e.set(this.vtxoTaprootKey, 33);
    const n = Xn.toWords(e);
    return Xn.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return yt.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return yt.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
var Ht;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(Ht || (Ht = {}));
function If(t) {
  const e = [
    Ve,
    Ue,
    zr,
    si,
    Wr
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${G.encode(t)} is not a valid tapscript`);
}
var Ve;
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
        type: Ht.Multisig,
        params: f,
        script: oh(f.pubkeys.length, f.pubkeys).script
      };
    const l = [];
    for (let p = 0; p < f.pubkeys.length; p++)
      l.push(f.pubkeys[p]), p < f.pubkeys.length - 1 ? l.push("CHECKSIGVERIFY") : l.push("CHECKSIG");
    return {
      type: Ht.Multisig,
      params: f,
      script: yt.encode(l)
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
        return s(f);
      } catch (p) {
        throw new Error(`Failed to decode script: ${p instanceof Error ? p.message : String(p)}`);
      }
    }
  }
  t.decode = r;
  function i(f) {
    const l = yt.decode(f), p = [];
    let g = !1;
    for (let b = 0; b < l.length; b++) {
      const E = l[b];
      if (typeof E != "string" && typeof E != "number") {
        if (E.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${E.length}`);
        if (p.push(E), b + 1 >= l.length || l[b + 1] !== "CHECKSIGADD" && l[b + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        b++;
        continue;
      }
      if (b === l.length - 1) {
        if (E !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        g = !0;
      }
    }
    if (!g)
      throw new Error("Missing NUMEQUAL operation");
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const w = n({
      pubkeys: p,
      type: e.CHECKSIGADD
    });
    if (G.encode(w.script) !== G.encode(f))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.Multisig,
      params: { pubkeys: p, type: e.CHECKSIGADD },
      script: f
    };
  }
  function s(f) {
    const l = yt.decode(f), p = [];
    for (let w = 0; w < l.length; w++) {
      const b = l[w];
      if (typeof b != "string" && typeof b != "number") {
        if (b.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${b.length}`);
        if (p.push(b), w + 1 >= l.length)
          throw new Error("Unexpected end of script");
        const E = l[w + 1];
        if (E !== "CHECKSIGVERIFY" && E !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (w === l.length - 2 && E !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        w++;
        continue;
      }
    }
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const g = n({ pubkeys: p, type: e.CHECKSIG });
    if (G.encode(g.script) !== G.encode(f))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.Multisig,
      params: { pubkeys: p, type: e.CHECKSIG },
      script: f
    };
  }
  function c(f) {
    return f.type === Ht.Multisig;
  }
  t.is = c;
})(Ve || (Ve = {}));
var Ue;
(function(t) {
  function e(i) {
    for (const p of i.pubkeys)
      if (p.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
    const c = [ur().encode(BigInt(zs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], f = Ve.encode(i), l = new Uint8Array([
      ...yt.encode(c),
      ...f.script
    ]);
    return {
      type: Ht.CSVMultisig,
      params: i,
      script: l
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = yt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const f = new Uint8Array(yt.encode(s.slice(3)));
    let l;
    try {
      l = Ve.decode(f);
    } catch (E) {
      throw new Error(`Invalid multisig script: ${E instanceof Error ? E.message : String(E)}`);
    }
    const p = Number(ur().decode(c)), g = zs.decode(p), w = g.blocks !== void 0 ? { type: "blocks", value: BigInt(g.blocks) } : { type: "seconds", value: BigInt(g.seconds) }, b = e({
      timelock: w,
      ...l.params
    });
    if (G.encode(b.script) !== G.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.CSVMultisig,
      params: {
        timelock: w,
        ...l.params
      },
      script: i
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Ht.CSVMultisig;
  }
  t.is = r;
})(Ue || (Ue = {}));
var zr;
(function(t) {
  function e(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...yt.encode(["VERIFY"]),
      ...Ue.encode(i).script
    ]);
    return {
      type: Ht.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = yt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let w = s.length - 1; w >= 0; w--)
      s[w] === "VERIFY" && (c = w);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const f = new Uint8Array(yt.encode(s.slice(0, c))), l = new Uint8Array(yt.encode(s.slice(c + 1)));
    let p;
    try {
      p = Ue.decode(l);
    } catch (w) {
      throw new Error(`Invalid CSV multisig script: ${w instanceof Error ? w.message : String(w)}`);
    }
    const g = e({
      conditionScript: f,
      ...p.params
    });
    if (G.encode(g.script) !== G.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.ConditionCSVMultisig,
      params: {
        conditionScript: f,
        ...p.params
      },
      script: i
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Ht.ConditionCSVMultisig;
  }
  t.is = r;
})(zr || (zr = {}));
var si;
(function(t) {
  function e(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...yt.encode(["VERIFY"]),
      ...Ve.encode(i).script
    ]);
    return {
      type: Ht.ConditionMultisig,
      params: i,
      script: s
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = yt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let w = s.length - 1; w >= 0; w--)
      s[w] === "VERIFY" && (c = w);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const f = new Uint8Array(yt.encode(s.slice(0, c))), l = new Uint8Array(yt.encode(s.slice(c + 1)));
    let p;
    try {
      p = Ve.decode(l);
    } catch (w) {
      throw new Error(`Invalid multisig script: ${w instanceof Error ? w.message : String(w)}`);
    }
    const g = e({
      conditionScript: f,
      ...p.params
    });
    if (G.encode(g.script) !== G.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.ConditionMultisig,
      params: {
        conditionScript: f,
        ...p.params
      },
      script: i
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Ht.ConditionMultisig;
  }
  t.is = r;
})(si || (si = {}));
var Wr;
(function(t) {
  function e(i) {
    const c = [ur().encode(i.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], f = yt.encode(c), l = new Uint8Array([
      ...f,
      ...Ve.encode(i).script
    ]);
    return {
      type: Ht.CLTVMultisig,
      params: i,
      script: l
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = yt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const f = new Uint8Array(yt.encode(s.slice(3)));
    let l;
    try {
      l = Ve.decode(f);
    } catch (w) {
      throw new Error(`Invalid multisig script: ${w instanceof Error ? w.message : String(w)}`);
    }
    const p = ur().decode(c), g = e({
      absoluteTimelock: p,
      ...l.params
    });
    if (G.encode(g.script) !== G.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Ht.CLTVMultisig,
      params: {
        absoluteTimelock: p,
        ...l.params
      },
      script: i
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === Ht.CLTVMultisig;
  }
  t.is = r;
})(Wr || (Wr = {}));
function Dr(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Oe {
  static decode(e) {
    const n = Ch(e);
    return new Oe(n);
  }
  constructor(e) {
    this.scripts = e;
    const n = of(e.map((i) => ({ script: i, leafVersion: ni }))), r = rh(ga, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return Uh(this.scripts);
  }
  address(e, n) {
    return new fr(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return yt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return Fn(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => G.encode(Dr(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
  exitPaths() {
    const e = [];
    for (const n of this.leaves)
      try {
        const r = Ue.decode(Dr(n));
        e.push(r);
        continue;
      } catch {
        try {
          const i = zr.decode(Dr(n));
          e.push(i);
        } catch {
          continue;
        }
      }
    return e;
  }
}
function Ch(t) {
  let e = 0;
  const n = [], [r, i] = tu(t, e);
  e += i;
  for (let s = 0; s < r; s++) {
    e += 1, e += 1;
    const [c, f] = tu(t, e);
    e += f;
    const l = t.slice(e, e + c);
    n.push(l), e += c;
  }
  return n;
}
function tu(t, e) {
  const n = t[e];
  return n < 253 ? [n, 1] : n === 253 ? [new DataView(t.buffer).getUint16(e + 1, !0), 3] : n === 254 ? [new DataView(t.buffer).getUint32(e + 1, !0), 5] : [Number(new DataView(t.buffer).getBigUint64(e + 1, !0)), 9];
}
function Uh(t) {
  const e = [];
  e.push(eu(t.length));
  for (const s of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(eu(s.length)), e.push(s);
  const n = e.reduce((s, c) => s + c.length, 0), r = new Uint8Array(n);
  let i = 0;
  for (const s of e)
    r.set(s, i), i += s.length;
  return r;
}
function eu(t) {
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
var nu;
(function(t) {
  class e extends Oe {
    constructor(r) {
      const { sender: i, receiver: s, server: c, preimageHash: f, refundLocktime: l, unilateralClaimDelay: p, unilateralRefundDelay: g, unilateralRefundWithoutReceiverDelay: w } = r, b = Oh(f), E = si.encode({
        conditionScript: b,
        pubkeys: [s, c]
      }).script, k = Ve.encode({
        pubkeys: [i, s, c]
      }).script, O = Wr.encode({
        absoluteTimelock: l,
        pubkeys: [i, c]
      }).script, $ = zr.encode({
        conditionScript: b,
        timelock: p,
        pubkeys: [s]
      }).script, F = Ue.encode({
        timelock: g,
        pubkeys: [i, s]
      }).script, z = Ue.encode({
        timelock: w,
        pubkeys: [i]
      }).script;
      super([
        E,
        k,
        O,
        $,
        F,
        z
      ]), this.options = r, this.claimScript = G.encode(E), this.refundScript = G.encode(k), this.refundWithoutReceiverScript = G.encode(O), this.unilateralClaimScript = G.encode($), this.unilateralRefundScript = G.encode(F), this.unilateralRefundWithoutReceiverScript = G.encode(z);
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
})(nu || (nu = {}));
function Oh(t) {
  return yt.encode(["HASH160", t, "EQUAL"]);
}
var ai;
(function(t) {
  class e extends Oe {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, f = Ve.encode({
        pubkeys: [i, s]
      }).script, l = Ue.encode({
        timelock: c,
        pubkeys: [i]
      }).script;
      super([f, l]), this.options = r, this.forfeitScript = G.encode(f), this.exitScript = G.encode(l);
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
})(ai || (ai = {}));
var Gr;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(Gr || (Gr = {}));
function Yr(t) {
  return t.spentBy === void 0 || t.spentBy === "";
}
function Rh(t) {
  return t.virtualStatus.state === "swept" && Yr(t);
}
function _f(t, e) {
  return t.value < e;
}
function Bf(t, e, n) {
  var c;
  const r = [];
  let i = [...e];
  for (const f of [...t, ...e]) {
    if (f.virtualStatus.state !== "preconfirmed" && f.virtualStatus.commitmentTxIds && f.virtualStatus.commitmentTxIds.some((k) => n.has(k)))
      continue;
    const l = Ph(i, f);
    i = ru(i, l);
    const p = Po(l);
    if (f.value <= p)
      continue;
    const g = Lh(i, f);
    i = ru(i, g);
    const w = Po(g);
    if (f.value <= w)
      continue;
    const b = {
      commitmentTxid: f.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let E = f.virtualStatus.state !== "preconfirmed";
    f.virtualStatus.state === "preconfirmed" && (b.arkTxid = f.txid, f.spentBy && (E = !0)), r.push({
      key: b,
      amount: f.value - p - w,
      type: Gr.TxReceived,
      createdAt: f.createdAt.getTime(),
      settled: E
    });
  }
  const s = /* @__PURE__ */ new Map();
  for (const f of e) {
    if (f.settledBy) {
      s.has(f.settledBy) || s.set(f.settledBy, []);
      const p = s.get(f.settledBy);
      s.set(f.settledBy, [...p, f]);
    }
    if (!f.arkTxId)
      continue;
    s.has(f.arkTxId) || s.set(f.arkTxId, []);
    const l = s.get(f.arkTxId);
    s.set(f.arkTxId, [...l, f]);
  }
  for (const [f, l] of s) {
    const p = $h([...t, ...e], f), g = Po(p), w = Po(l);
    if (w <= g)
      continue;
    const b = Dh(p, l), E = {
      commitmentTxid: ((c = b.virtualStatus.commitmentTxIds) == null ? void 0 : c[0]) || "",
      boardingTxid: "",
      arkTxid: ""
    };
    b.virtualStatus.state === "preconfirmed" && (E.arkTxid = b.txid), r.push({
      key: E,
      amount: w - g,
      type: Gr.TxSent,
      createdAt: b.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Ph(t, e) {
  return e.virtualStatus.state === "preconfirmed" ? [] : t.filter((n) => {
    var r;
    return n.settledBy ? ((r = e.virtualStatus.commitmentTxIds) == null ? void 0 : r.includes(n.settledBy)) ?? !1 : !1;
  });
}
function Lh(t, e) {
  return t.filter((n) => n.arkTxId ? n.arkTxId === e.txid : !1);
}
function $h(t, e) {
  return t.filter((n) => {
    var r;
    return n.virtualStatus.state !== "preconfirmed" && ((r = n.virtualStatus.commitmentTxIds) != null && r.includes(e)) ? !0 : n.txid === e;
  });
}
function Po(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function Dh(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function ru(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const Kh = (t) => Mh[t], Mh = {
  bitcoin: Cr(cr, "ark"),
  testnet: Cr(Co, "tark"),
  signet: Cr(Co, "tark"),
  mutinynet: Cr(Co, "tark"),
  regtest: Cr({
    ...Co,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Cr(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const Vh = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Fh {
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
    const e = await fetch(`${this.baseUrl}/fee-estimates`);
    if (!e.ok)
      throw new Error(`Failed to fetch fee rate: ${e.statusText}`);
    return (await e.json())[1] ?? void 0;
  }
  async broadcastTransaction(...e) {
    switch (e.length) {
      case 1:
        return this.broadcastTx(e[0]);
      case 2:
        return this.broadcastPackage(e[0], e[1]);
      default:
        throw new Error("Only 1 or 1C1P package can be broadcast");
    }
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
    const n = await fetch(`${this.baseUrl}/tx/${e}`);
    if (!n.ok)
      throw new Error(n.statusText);
    if (!(await n.json()).status.confirmed)
      return { confirmed: !1 };
    const i = await fetch(`${this.baseUrl}/tx/${e}/status`);
    if (!i.ok)
      throw new Error(`Failed to get transaction status: ${i.statusText}`);
    const s = await i.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(e, n) {
    let r = null;
    const i = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      const p = () => Promise.all(e.map((b) => this.getTransactions(b))).then((b) => b.flat()), g = await p(), w = (b) => `${b.txid}_${b.status.block_time}`;
      r = setInterval(async () => {
        try {
          const b = await p(), E = new Set(g.map(w)), k = b.filter((O) => !E.has(w(O)));
          k.length > 0 && (g.push(...k), n(k));
        } catch (b) {
          console.error("Error in polling mechanism:", b);
        }
      }, 5e3);
    };
    let c = null;
    try {
      c = new WebSocket(i), c.addEventListener("open", () => {
        const l = {
          "track-addresses": e
        };
        c.send(JSON.stringify(l));
      }), c.addEventListener("message", (l) => {
        try {
          const p = [], g = JSON.parse(l.data.toString());
          if (!g["multi-address-transactions"])
            return;
          const w = g["multi-address-transactions"];
          for (const b in w)
            for (const E of [
              "mempool",
              "confirmed",
              "removed"
            ])
              w[b][E] && p.push(...w[b][E].filter(jh));
          p.length > 0 && n(p);
        } catch (p) {
          console.error("Failed to process WebSocket message:", p);
        }
      }), c.addEventListener("error", async () => {
        await s();
      });
    } catch {
      r && clearInterval(r), await s();
    }
    return () => {
      c && c.readyState === WebSocket.OPEN && c.close(), r && clearInterval(r);
    };
  }
  async getChainTip() {
    const e = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!e.ok)
      throw new Error(`Failed to get chain tip: ${e.statusText}`);
    const n = await e.json();
    if (!Hh(n))
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
  async broadcastPackage(e, n) {
    const r = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([e, n])
    });
    if (!r.ok) {
      const i = await r.text();
      throw new Error(`Failed to broadcast package: ${i}`);
    }
    return r.json();
  }
  async broadcastTx(e) {
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
}
function Hh(t) {
  return Array.isArray(t) && t.every((e) => {
    e && typeof e == "object" && typeof e.id == "string" && e.id.length > 0 && typeof e.height == "number" && e.height >= 0 && typeof e.mediantime == "number" && e.mediantime > 0;
  });
}
const jh = (t) => typeof t.txid == "string" && Array.isArray(t.vout) && t.vout.every((e) => typeof e.scriptpubkey_address == "string" && typeof e.value == "string") && typeof t.status == "object" && typeof t.status.confirmed == "boolean" && typeof t.status.block_time == "number";
var At;
(function(t) {
  t.BatchStarted = "batch_started", t.BatchFinalization = "batch_finalization", t.BatchFinalized = "batch_finalized", t.BatchFailed = "batch_failed", t.TreeSigningStarted = "tree_signing_started", t.TreeNoncesAggregated = "tree_nonces_aggregated", t.TreeTx = "tree_tx", t.TreeSignature = "tree_signature";
})(At || (At = {}));
class Nf {
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
      vtxoTreeExpiry: BigInt(r.vtxoTreeExpiry ?? 0),
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      roundInterval: BigInt(r.roundInterval ?? 0),
      dust: BigInt(r.dust ?? 0),
      utxoMinAmount: BigInt(r.utxoMinAmount ?? 0),
      utxoMaxAmount: BigInt(r.utxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(r.vtxoMinAmount ?? 0),
      vtxoMaxAmount: BigInt(r.vtxoMaxAmount ?? -1),
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      marketHour: "marketHour" in r && r.marketHour != null ? {
        nextStartTime: BigInt(r.marketHour.nextStartTime ?? 0),
        nextEndTime: BigInt(r.marketHour.nextEndTime ?? 0),
        period: BigInt(r.marketHour.period ?? 0),
        roundInterval: BigInt(r.marketHour.roundInterval ?? 0)
      } : void 0
    };
  }
  async submitTx(e, n) {
    const r = `${this.serverUrl}/v1/tx/submit`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: e,
        checkpointTxs: n
      })
    });
    if (!i.ok) {
      const c = await i.text();
      try {
        const f = JSON.parse(c);
        throw new Error(`Failed to submit virtual transaction: ${f.message || f.error || c}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${c}`);
      }
    }
    const s = await i.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(e, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: e,
        finalCheckpointTxs: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Failed to finalize offchain transaction: ${s}`);
    }
  }
  async registerIntent(e) {
    const n = `${this.serverUrl}/v1/batch/registerIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          signature: e.signature,
          message: e.message
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      throw new Error(`Failed to register intent: ${s}`);
    }
    return (await r.json()).intentId;
  }
  async deleteIntent(e) {
    const n = `${this.serverUrl}/v1/batch/deleteIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        proof: {
          signature: e.signature,
          message: e.message
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      throw new Error(`Failed to delete intent: ${i}`);
    }
  }
  async confirmRegistration(e) {
    const n = `${this.serverUrl}/v1/batch/ack`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: e
      })
    });
    if (!r.ok) {
      const i = await r.text();
      throw new Error(`Failed to confirm registration: ${i}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: e,
        pubkey: n,
        treeNonces: qh(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree nonces: ${c}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: e,
        pubkey: n,
        treeSignatures: zh(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree signatures: ${c}`);
    }
  }
  async submitSignedForfeitTxs(e, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: e,
        signedCommitmentTx: n
      })
    });
    if (!i.ok)
      throw new Error(`Failed to submit forfeit transactions: ${i.statusText}`);
  }
  async *getEventStream(e, n) {
    const r = `${this.serverUrl}/v1/batch/events`, i = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !(e != null && e.aborted); )
      try {
        const s = await fetch(r + i, {
          headers: {
            Accept: "application/json"
          },
          signal: e
        });
        if (!s.ok)
          throw new Error(`Unexpected status ${s.status} when fetching event stream`);
        if (!s.body)
          throw new Error("Response body is null");
        const c = s.body.getReader(), f = new TextDecoder();
        let l = "";
        for (; !(e != null && e.aborted); ) {
          const { done: p, value: g } = await c.read();
          if (p)
            break;
          l += f.decode(g, { stream: !0 });
          const w = l.split(`
`);
          for (let b = 0; b < w.length - 1; b++) {
            const E = w[b].trim();
            if (E)
              try {
                const k = JSON.parse(E), O = this.parseSettlementEvent(k.result);
                O && (yield O);
              } catch (k) {
                throw console.error("Failed to parse event:", k), k;
              }
          }
          l = w[w.length - 1];
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (Ws(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", s), s;
      }
  }
  async *getTransactionsStream(e) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !(e != null && e.aborted); )
      try {
        const r = await fetch(n, {
          headers: {
            Accept: "application/json"
          },
          signal: e
        });
        if (!r.ok)
          throw new Error(`Unexpected status ${r.status} when fetching transaction stream`);
        if (!r.body)
          throw new Error("Response body is null");
        const i = r.body.getReader(), s = new TextDecoder();
        let c = "";
        for (; !(e != null && e.aborted); ) {
          const { done: f, value: l } = await i.read();
          if (f)
            break;
          c += s.decode(l, { stream: !0 });
          const p = c.split(`
`);
          for (let g = 0; g < p.length - 1; g++) {
            const w = p[g].trim();
            if (!w)
              continue;
            const b = JSON.parse(w), E = this.parseTransactionNotification(b.result);
            E && (yield E);
          }
          c = p[p.length - 1];
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (Ws(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Address subscription error:", r), r;
      }
  }
  parseSettlementEvent(e) {
    if (e.batchStarted)
      return {
        type: At.BatchStarted,
        id: e.batchStarted.id,
        intentIdHashes: e.batchStarted.intentIdHashes,
        batchExpiry: BigInt(e.batchStarted.batchExpiry)
      };
    if (e.batchFinalization)
      return {
        type: At.BatchFinalization,
        id: e.batchFinalization.id,
        commitmentTx: e.batchFinalization.commitmentTx
      };
    if (e.batchFinalized)
      return {
        type: At.BatchFinalized,
        id: e.batchFinalized.id,
        commitmentTxid: e.batchFinalized.commitmentTxid
      };
    if (e.batchFailed)
      return {
        type: At.BatchFailed,
        id: e.batchFailed.id,
        reason: e.batchFailed.reason
      };
    if (e.treeSigningStarted)
      return {
        type: At.TreeSigningStarted,
        id: e.treeSigningStarted.id,
        cosignersPublicKeys: e.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: e.treeSigningStarted.unsignedCommitmentTx
      };
    if (e.treeNoncesAggregated)
      return {
        type: At.TreeNoncesAggregated,
        id: e.treeNoncesAggregated.id,
        treeNonces: Wh(e.treeNoncesAggregated.treeNonces)
      };
    if (e.treeTx) {
      const n = Object.fromEntries(Object.entries(e.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: At.TreeTx,
        id: e.treeTx.id,
        topic: e.treeTx.topic,
        batchIndex: e.treeTx.batchIndex,
        chunk: {
          txid: e.treeTx.txid,
          tx: e.treeTx.tx,
          children: n
        }
      };
    }
    return e.treeSignature ? {
      type: At.TreeSignature,
      id: e.treeSignature.id,
      topic: e.treeSignature.topic,
      batchIndex: e.treeSignature.batchIndex,
      txid: e.treeSignature.txid,
      signature: e.treeSignature.signature
    } : (console.warn("Unknown event type:", e), null);
  }
  parseTransactionNotification(e) {
    return e.commitmentTx ? {
      commitmentTx: {
        txid: e.commitmentTx.txid,
        tx: e.commitmentTx.tx,
        spentVtxos: e.commitmentTx.spentVtxos.map(Lo),
        spendableVtxos: e.commitmentTx.spendableVtxos.map(Lo),
        checkpointTxs: e.commitmentTx.checkpointTxs
      }
    } : e.arkTx ? {
      arkTx: {
        txid: e.arkTx.txid,
        tx: e.arkTx.tx,
        spentVtxos: e.arkTx.spentVtxos.map(Lo),
        spendableVtxos: e.arkTx.spendableVtxos.map(Lo),
        checkpointTxs: e.arkTx.checkpointTxs
      }
    } : (console.warn("Unknown transaction notification type:", e), null);
  }
}
function qh(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = G.encode(r.pubNonce);
  return JSON.stringify(e);
}
function zh(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = G.encode(r.encode());
  return JSON.stringify(e);
}
function Wh(t) {
  const e = JSON.parse(t);
  return new Map(Object.entries(e).map(([n, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [n, { pubNonce: G.decode(r) }];
  }));
}
function Ws(t) {
  const e = (n) => n instanceof Error && (n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT");
  return e(t) || e(t.cause);
}
function Lo(t) {
  return {
    outpoint: {
      txid: t.outpoint.txid,
      vout: t.outpoint.vout
    },
    amount: t.amount,
    script: t.script,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    commitmentTxids: t.commitmentTxids,
    isPreconfirmed: t.isPreconfirmed,
    isSwept: t.isSwept,
    isUnrolled: t.isUnrolled,
    isSpent: t.isSpent,
    spentBy: t.spentBy,
    settledBy: t.settledBy,
    arkTxid: t.arkTxid
  };
}
const Gh = 0n, Yh = new Uint8Array([81, 2, 78, 115]), Ba = {
  script: Yh,
  amount: Gh
};
G.encode(Ba.script);
function Zh(t, e, n) {
  const r = new Jt({
    version: 3,
    lockTime: n
  });
  let i = 0n;
  for (const s of t) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    i += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: e,
    amount: i
  }), r.addOutput(Ba), r;
}
const Xh = new Error("invalid settlement transaction outputs"), Qh = new Error("empty tree"), Jh = new Error("invalid number of inputs"), xs = new Error("wrong settlement txid"), tp = new Error("invalid amount"), ep = new Error("no leaves"), np = new Error("invalid taproot script"), ou = new Error("invalid round transaction outputs"), rp = new Error("wrong commitment txid"), op = new Error("missing cosigners public keys"), Es = 0, iu = 1;
function ip(t, e) {
  if (e.validate(), e.root.inputsLength !== 1)
    throw Jh;
  const n = e.root.getInput(0), r = Jt.fromPSBT(pe.decode(t));
  if (r.outputsLength <= iu)
    throw Xh;
  const i = G.encode(oe(r.toBytes(!0)).reverse());
  if (!n.txid || G.encode(n.txid) !== i || n.index !== iu)
    throw xs;
}
function sp(t, e, n) {
  var l;
  if (e.outputsLength < Es + 1)
    throw ou;
  const r = (l = e.getOutput(Es)) == null ? void 0 : l.amount;
  if (!r)
    throw ou;
  if (!t.root)
    throw Qh;
  const i = t.root.getInput(0), s = G.encode(oe(e.toBytes(!0)).reverse());
  if (!i.txid || G.encode(i.txid) !== s || i.index !== Es)
    throw rp;
  let c = 0n;
  for (let p = 0; p < t.root.outputsLength; p++) {
    const g = t.root.getOutput(p);
    g != null && g.amount && (c += g.amount);
  }
  if (c !== r)
    throw tp;
  if (t.leaves().length === 0)
    throw ep;
  t.validate();
  for (const p of t)
    for (const [g, w] of p.children) {
      const b = p.root.getOutput(g);
      if (!(b != null && b.script))
        throw new Error(`parent output ${g} not found`);
      const E = b.script.slice(2);
      if (E.length !== 32)
        throw new Error(`parent output ${g} has invalid script`);
      const k = Sf(w.root, 0, Tf);
      if (k.length === 0)
        throw op;
      const O = k.map((F) => F.key), { finalKey: $ } = Aa(O, !0, {
        taprootTweak: n
      });
      if (!$ || G.encode($.slice(1)) !== G.encode(E))
        throw np;
    }
}
function ap(t, e, n) {
  const r = t.map((s) => cp(s, n));
  return {
    arkTx: Cf(r.map((s) => s.input), e),
    checkpoints: r.map((s) => s.tx)
  };
}
function Cf(t, e) {
  let n = 0n;
  for (const i of t) {
    const s = If(Dr(i.tapLeafScript));
    if (Wr.is(s)) {
      if (n !== 0n && su(n) !== su(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new Jt({
    version: 3,
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    lockTime: Number(n)
  });
  for (const [i, s] of t.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? xa - 1 : void 0,
      witnessUtxo: {
        script: Oe.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), _h(r, i, Bh, s.tapTree);
  for (const i of e)
    r.addOutput(i);
  return r.addOutput(Ba), r;
}
function cp(t, e) {
  const n = If(t.checkpointTapLeafScript ?? Dr(t.tapLeafScript)), r = new Oe([
    e.script,
    n.script
  ]), i = Cf([t], [
    {
      amount: BigInt(t.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(G.encode(n.script)), c = {
    txid: G.encode(oe(i.toBytes(!0)).reverse()),
    vout: 0,
    value: t.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: i,
    input: c
  };
}
const up = 500000000n;
function su(t) {
  return t >= up;
}
class Vt {
  constructor(e, n, r = Vt.DefaultHRP) {
    this.preimage = e, this.value = n, this.HRP = r, this.vout = 0;
    const i = se(this.preimage);
    this.vtxoScript = new Oe([dp(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = G.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const e = new Uint8Array(Vt.Length);
    return e.set(this.preimage, 0), fp(e, this.value, this.preimage.length), e;
  }
  static decode(e, n = Vt.DefaultHRP) {
    if (e.length !== Vt.Length)
      throw new Error(`invalid data length: expected ${Vt.Length} bytes, got ${e.length}`);
    const r = e.subarray(0, Vt.PreimageLength), i = lp(e, Vt.PreimageLength);
    return new Vt(r, i, n);
  }
  static fromString(e, n = Vt.DefaultHRP) {
    if (e = e.trim(), !e.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${e}')`);
    const r = e.slice(n.length), i = Cs.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return Vt.decode(i, n);
  }
  toString() {
    return this.HRP + Cs.encode(this.encode());
  }
}
Vt.DefaultHRP = "arknote";
Vt.PreimageLength = 32;
Vt.ValueLength = 4;
Vt.Length = Vt.PreimageLength + Vt.ValueLength;
Vt.FakeOutpointIndex = 0;
function fp(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function lp(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
function dp(t) {
  return yt.encode(["SHA256", t, "EQUAL"]);
}
class Na extends Error {
  constructor(e) {
    super(e), this.name = "BIP322Error";
  }
}
const hp = new Na("missing inputs"), ci = new Na("missing data"), pp = new Na("missing witness utxo");
var ui;
(function(t) {
  function e(r, i, s = []) {
    if (i.length == 0)
      throw hp;
    vp(i), Ep(s);
    const c = Sp(r, i[0].witnessUtxo.script);
    return Tp(c, i, s);
  }
  t.create = e;
  function n(r, i = (s) => s.finalize()) {
    return i(r), pe.encode(r.extract());
  }
  t.signature = n;
})(ui || (ui = {}));
const gp = new Uint8Array([$t.RETURN]), yp = new Uint8Array(32).fill(0), wp = 4294967295, mp = "BIP0322-signed-message";
function bp(t) {
  if (t.index === void 0 || t.txid === void 0)
    throw ci;
  if (t.witnessUtxo === void 0)
    throw pp;
  return !0;
}
function vp(t) {
  return t.forEach(bp), !0;
}
function xp(t) {
  if (t.amount === void 0 || t.script === void 0)
    throw ci;
  return !0;
}
function Ep(t) {
  return t.forEach(xp), !0;
}
function Sp(t, e) {
  const n = kp(t), r = new Jt({
    version: 0,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
  });
  return r.addInput({
    txid: yp,
    // zero hash
    index: wp,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: e
  }), r.updateInput(0, {
    finalScriptSig: yt.encode(["OP_0", n])
  }), r;
}
function Tp(t, e, n) {
  const r = e[0], i = new Jt({
    version: 2,
    allowUnknownOutputs: n.length === 0,
    allowUnknown: !0,
    allowUnknownInputs: !0,
    lockTime: 0
  });
  i.addInput({
    ...r,
    txid: t.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: sn.ALL
  });
  for (const s of e)
    i.addInput({
      ...s,
      sighashType: sn.ALL
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: gp
    }
  ]);
  for (const s of n)
    i.addOutput({
      amount: s.amount,
      script: s.script
    });
  return i;
}
function kp(t) {
  return Te.utils.taggedHash(mp, new TextEncoder().encode(t));
}
var Gs;
(function(t) {
  t[t.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", t[t.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", t[t.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Gs || (Gs = {}));
var rr;
(function(t) {
  t.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", t.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", t.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", t.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", t.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(rr || (rr = {}));
class Uf {
  constructor(e) {
    this.serverUrl = e;
  }
  async getVtxoTree(e, n) {
    let r = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/tree`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isVtxoTreeResponse(c))
      throw new Error("Invalid vtxo tree data received");
    return c.vtxoTree.forEach((f) => {
      f.children = Object.fromEntries(Object.entries(f.children).map(([l, p]) => [
        Number(l),
        p
      ]));
    }), c;
  }
  async getVtxoTreeLeaves(e, n) {
    let r = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/tree/leaves`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isVtxoTreeLeavesResponse(c))
      throw new Error("Invalid vtxos tree leaves data received");
    return c;
  }
  async getBatchSweepTransactions(e) {
    const n = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!Re.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(e) {
    const n = `${this.serverUrl}/v1/commitmentTx/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!Re.isCommitmentTx(i))
      throw new Error("Invalid commitment tx data received");
    return i;
  }
  async getCommitmentTxConnectors(e, n) {
    let r = `${this.serverUrl}/v1/commitmentTx/${e}/connectors`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isConnectorsResponse(c))
      throw new Error("Invalid commitment tx connectors data received");
    return c.connectors.forEach((f) => {
      f.children = Object.fromEntries(Object.entries(f.children).map(([l, p]) => [
        Number(l),
        p
      ]));
    }), c;
  }
  async getCommitmentTxForfeitTxs(e, n) {
    let r = `${this.serverUrl}/v1/commitmentTx/${e}/forfeitTxs`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isForfeitTxsResponse(c))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return c;
  }
  async *getSubscription(e, n) {
    const r = `${this.serverUrl}/v1/script/subscription/${e}`;
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
        const s = i.body.getReader(), c = new TextDecoder();
        let f = "";
        for (; !n.aborted; ) {
          const { done: l, value: p } = await s.read();
          if (l)
            break;
          f += c.decode(p, { stream: !0 });
          const g = f.split(`
`);
          for (let w = 0; w < g.length - 1; w++) {
            const b = g[w].trim();
            if (!b)
              continue;
            const E = JSON.parse(b);
            "result" in E && (yield {
              txid: E.result.txid,
              scripts: E.result.scripts || [],
              newVtxos: (E.result.newVtxos || []).map(Ss),
              spentVtxos: (E.result.spentVtxos || []).map(Ss),
              tx: E.result.tx,
              checkpointTxs: E.result.checkpointTxs
            });
          }
          f = g[g.length - 1];
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (Ws(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", i), i;
      }
  }
  async getVirtualTxs(e, n) {
    let r = `${this.serverUrl}/v1/virtualTx/${e.join(",")}`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isVirtualTxsResponse(c))
      throw new Error("Invalid virtual txs data received");
    return c;
  }
  async getVtxoChain(e, n) {
    let r = `${this.serverUrl}/v1/vtxo/${e.txid}/${e.vout}/chain`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const c = await s.json();
    if (!Re.isVtxoChainResponse(c))
      throw new Error("Invalid vtxo chain data received");
    return c;
  }
  async getVtxos(e) {
    if (e != null && e.scripts && (e != null && e.outpoints))
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!(e != null && e.scripts) && !(e != null && e.outpoints))
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/vtxos`;
    const r = new URLSearchParams();
    e != null && e.scripts && e.scripts.length > 0 && e.scripts.forEach((c) => {
      r.append("scripts", c);
    }), e != null && e.outpoints && e.outpoints.length > 0 && e.outpoints.forEach((c) => {
      r.append("outpoints", `${c.txid}:${c.vout}`);
    }), e && (e.spendableOnly !== void 0 && r.append("spendableOnly", e.spendableOnly.toString()), e.spentOnly !== void 0 && r.append("spentOnly", e.spentOnly.toString()), e.recoverableOnly !== void 0 && r.append("recoverableOnly", e.recoverableOnly.toString()), e.pageIndex !== void 0 && r.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && r.append("page.size", e.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxos: ${i.statusText}`);
    const s = await i.json();
    if (!Re.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Ss),
      page: s.page
    };
  }
  async subscribeForScripts(e, n) {
    const r = `${this.serverUrl}/v1/script/subscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: e, subscriptionId: n })
    });
    if (!i.ok) {
      const c = await i.text();
      throw new Error(`Failed to subscribe to scripts: ${c}`);
    }
    const s = await i.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(e, n) {
    const r = `${this.serverUrl}/v1/script/unsubscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: e, scripts: n })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function Ss(t) {
  return {
    txid: t.outpoint.txid,
    vout: t.outpoint.vout,
    value: Number(t.amount),
    status: {
      confirmed: !t.isSwept && !t.isPreconfirmed
    },
    virtualStatus: {
      state: t.isSwept ? "swept" : t.isPreconfirmed ? "preconfirmed" : "settled",
      commitmentTxIds: t.commitmentTxids,
      batchExpiry: t.expiresAt ? Number(t.expiresAt) * 1e3 : void 0
    },
    spentBy: t.spentBy ?? "",
    settledBy: t.settledBy,
    arkTxId: t.arkTxid,
    createdAt: new Date(Number(t.createdAt) * 1e3),
    isUnrolled: t.isUnrolled
  };
}
var Re;
(function(t) {
  function e(A) {
    return typeof A == "object" && typeof A.totalOutputAmount == "string" && typeof A.totalOutputVtxos == "number" && typeof A.expiresAt == "string" && typeof A.swept == "boolean";
  }
  function n(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.expiresAt == "string" && Object.values(rr).includes(A.type) && Array.isArray(A.spends) && A.spends.every((lt) => typeof lt == "string");
  }
  function r(A) {
    return typeof A == "object" && typeof A.startedAt == "string" && typeof A.endedAt == "string" && typeof A.totalInputAmount == "string" && typeof A.totalInputVtxos == "number" && typeof A.totalOutputAmount == "string" && typeof A.totalOutputVtxos == "number" && typeof A.batches == "object" && Object.values(A.batches).every(e);
  }
  t.isCommitmentTx = r;
  function i(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.vout == "number";
  }
  t.isOutpoint = i;
  function s(A) {
    return Array.isArray(A) && A.every(i);
  }
  t.isOutpointArray = s;
  function c(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.children == "object" && Object.values(A.children).every(g) && Object.keys(A.children).every((lt) => Number.isInteger(Number(lt)));
  }
  function f(A) {
    return Array.isArray(A) && A.every(c);
  }
  t.isTxsArray = f;
  function l(A) {
    return typeof A == "object" && typeof A.amount == "string" && typeof A.createdAt == "string" && typeof A.isSettled == "boolean" && typeof A.settledBy == "string" && Object.values(Gs).includes(A.type) && (!A.commitmentTxid && typeof A.virtualTxid == "string" || typeof A.commitmentTxid == "string" && !A.virtualTxid);
  }
  function p(A) {
    return Array.isArray(A) && A.every(l);
  }
  t.isTxHistoryRecordArray = p;
  function g(A) {
    return typeof A == "string" && A.length === 64;
  }
  function w(A) {
    return Array.isArray(A) && A.every(g);
  }
  t.isTxidArray = w;
  function b(A) {
    return typeof A == "object" && i(A.outpoint) && typeof A.createdAt == "string" && typeof A.expiresAt == "string" && typeof A.amount == "string" && typeof A.script == "string" && typeof A.isPreconfirmed == "boolean" && typeof A.isSwept == "boolean" && typeof A.isUnrolled == "boolean" && typeof A.isSpent == "boolean" && (!A.spentBy || typeof A.spentBy == "string") && (!A.settledBy || typeof A.settledBy == "string") && (!A.arkTxid || typeof A.arkTxid == "string") && Array.isArray(A.commitmentTxids) && A.commitmentTxids.every(g);
  }
  function E(A) {
    return typeof A == "object" && typeof A.current == "number" && typeof A.next == "number" && typeof A.total == "number";
  }
  function k(A) {
    return typeof A == "object" && Array.isArray(A.vtxoTree) && A.vtxoTree.every(c) && (!A.page || E(A.page));
  }
  t.isVtxoTreeResponse = k;
  function O(A) {
    return typeof A == "object" && Array.isArray(A.leaves) && A.leaves.every(i) && (!A.page || E(A.page));
  }
  t.isVtxoTreeLeavesResponse = O;
  function $(A) {
    return typeof A == "object" && Array.isArray(A.connectors) && A.connectors.every(c) && (!A.page || E(A.page));
  }
  t.isConnectorsResponse = $;
  function F(A) {
    return typeof A == "object" && Array.isArray(A.txids) && A.txids.every(g) && (!A.page || E(A.page));
  }
  t.isForfeitTxsResponse = F;
  function z(A) {
    return typeof A == "object" && Array.isArray(A.sweptBy) && A.sweptBy.every(g);
  }
  t.isSweptCommitmentTxResponse = z;
  function H(A) {
    return typeof A == "object" && Array.isArray(A.sweptBy) && A.sweptBy.every(g);
  }
  t.isBatchSweepTransactionsResponse = H;
  function D(A) {
    return typeof A == "object" && Array.isArray(A.txs) && A.txs.every((lt) => typeof lt == "string") && (!A.page || E(A.page));
  }
  t.isVirtualTxsResponse = D;
  function K(A) {
    return typeof A == "object" && Array.isArray(A.chain) && A.chain.every(n) && (!A.page || E(A.page));
  }
  t.isVtxoChainResponse = K;
  function tt(A) {
    return typeof A == "object" && Array.isArray(A.vtxos) && A.vtxos.every(b) && (!A.page || E(A.page));
  }
  t.isVtxosResponse = tt;
})(Re || (Re = {}));
class Ys {
  constructor(e, n = /* @__PURE__ */ new Map()) {
    this.root = e, this.children = n;
  }
  static create(e) {
    if (e.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of e) {
      const c = Ip(s), f = G.encode(oe(c.tx.toBytes(!0)).reverse());
      n.set(f, c);
    }
    const r = [];
    for (const [s] of n) {
      let c = !1;
      for (const [f, l] of n)
        if (f !== s && (c = Ap(l, s), c))
          break;
      if (!c) {
        r.push(s);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const i = Of(r[0], n);
    if (!i)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (i.nbOfNodes() !== e.length)
      throw new Error(`number of chunks (${e.length}) is not equal to the number of nodes in the graph (${i.nbOfNodes()})`);
    return i;
  }
  nbOfNodes() {
    let e = 1;
    for (const n of this.children.values())
      e += n.nbOfNodes();
    return e;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const e = this.root.outputsLength, n = this.root.inputsLength;
    if (n !== 1)
      throw new Error(`unexpected number of inputs: ${n}, expected 1`);
    if (this.children.size > e - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${e - 1}`);
    for (const [r, i] of this.children) {
      if (r >= e)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${e})`);
      i.validate();
      const s = i.root.getInput(0), c = G.encode(oe(this.root.toBytes(!0)).reverse());
      if (!s.txid || G.encode(s.txid) !== c || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let f = 0n;
      for (let p = 0; p < i.root.outputsLength; p++) {
        const g = i.root.getOutput(p);
        g != null && g.amount && (f += g.amount);
      }
      const l = this.root.getOutput(r);
      if (!(l != null && l.amount))
        throw new Error(`parent output ${r} has no amount`);
      if (f !== l.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${f} != ${l.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const e = [];
    for (const n of this.children.values())
      e.push(...n.leaves());
    return e;
  }
  get txid() {
    return G.encode(oe(this.root.toBytes(!0)).reverse());
  }
  find(e) {
    if (e === this.txid)
      return this;
    for (const n of this.children.values()) {
      const r = n.find(e);
      if (r)
        return r;
    }
    return null;
  }
  update(e, n) {
    if (e === this.txid) {
      n(this.root);
      return;
    }
    for (const r of this.children.values())
      try {
        r.update(e, n);
        return;
      } catch {
        continue;
      }
    throw new Error(`tx not found: ${e}`);
  }
  *[Symbol.iterator]() {
    yield this;
    for (const e of this.children.values())
      yield* e;
  }
}
function Ap(t, e) {
  return Object.values(t.children).includes(e);
}
function Of(t, e) {
  const n = e.get(t);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, c] of Object.entries(n.children)) {
    const f = parseInt(s), l = Of(c, e);
    l && i.set(f, l);
  }
  return new Ys(r, i);
}
function Ip(t) {
  return { tx: Jt.fromPSBT(pe.decode(t.tx)), children: t.children };
}
class lr {
  constructor(e, n, r, i, s, c, f, l, p, g, w, b) {
    this.identity = e, this.network = n, this.networkName = r, this.onchainProvider = i, this.arkProvider = s, this.indexerProvider = c, this.arkServerPublicKey = f, this.offchainTapscript = l, this.boardingTapscript = p, this.serverUnrollScript = g, this.forfeitOutputScript = w, this.dustAmount = b;
  }
  static async create(e) {
    const n = e.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = new Nf(e.arkServerUrl), i = new Uf(e.arkServerUrl), s = await r.getInfo(), c = Kh(s.network), f = new Fh(e.esploraUrl || Vh[s.network]), l = {
      value: s.unilateralExitDelay,
      type: s.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, p = {
      value: s.boardingExitDelay,
      type: s.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, g = G.decode(s.signerPubkey).slice(1), w = new ai.Script({
      pubKey: n,
      serverPubKey: g,
      csvTimelock: l
    }), b = new ai.Script({
      pubKey: n,
      serverPubKey: g,
      csvTimelock: p
    }), E = w, k = Ue.encode({
      timelock: l,
      pubkeys: [g]
    }), O = Fn(c).decode(s.forfeitAddress), $ = Ft.encode(O);
    return new lr(e.identity, c, s.network, f, r, i, g, E, b, k, $, s.dust);
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
    const [e, n] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let r = 0, i = 0;
    for (const g of e)
      g.status.confirmed ? r += g.value : i += g.value;
    let s = 0, c = 0, f = 0;
    s = n.filter((g) => g.virtualStatus.state === "settled").reduce((g, w) => g + w.value, 0), c = n.filter((g) => g.virtualStatus.state === "preconfirmed").reduce((g, w) => g + w.value, 0), f = n.filter((g) => Yr(g) && g.virtualStatus.state === "swept").reduce((g, w) => g + w.value, 0);
    const l = r + i, p = s + c + f;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: i,
        total: l
      },
      settled: s,
      preconfirmed: c,
      available: s + c,
      recoverable: f,
      total: l + p
    };
  }
  async getVtxos(e) {
    const n = await this.getVirtualCoins(e), r = this.offchainTapscript.encode(), i = this.offchainTapscript.forfeit(), s = this.offchainTapscript.exit();
    return n.map((c) => ({
      ...c,
      forfeitTapLeafScript: i,
      intentTapLeafScript: s,
      tapTree: r
    }));
  }
  async getVirtualCoins(e = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [G.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({
      scripts: n,
      spendableOnly: !0
    })).vtxos;
    if (e.withRecoverable) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        recoverableOnly: !0
      });
      i.push(...s.vtxos);
    }
    if (e.withUnrolled) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        spentOnly: !0
      });
      i.push(...s.vtxos.filter((c) => c.isUnrolled));
    }
    return i;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const e = await this.indexerProvider.getVtxos({
      scripts: [G.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = [], s = [];
    for (const l of e.vtxos)
      Yr(l) ? i.push(l) : s.push(l);
    const c = Bf(i, s, r), f = [...n, ...c];
    return f.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (l, p) => l.createdAt === 0 ? -1 : p.createdAt === 0 ? 1 : p.createdAt - l.createdAt
    ), f;
  }
  async getBoardingTxs() {
    const e = await this.getBoardingAddress(), n = await this.onchainProvider.getTransactions(e), r = [], i = /* @__PURE__ */ new Set();
    for (const f of n)
      for (let l = 0; l < f.vout.length; l++) {
        const p = f.vout[l];
        if (p.scriptpubkey_address === e) {
          const w = (await this.onchainProvider.getTxOutspends(f.txid))[l];
          w != null && w.spent && i.add(w.txid), r.push({
            txid: f.txid,
            vout: l,
            value: Number(p.value),
            status: {
              confirmed: f.status.confirmed,
              block_time: f.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: w != null && w.spent ? "spent" : "settled",
              commitmentTxIds: w != null && w.spent ? [w.txid] : void 0
            },
            createdAt: f.status.confirmed ? new Date(f.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], c = [];
    for (const f of r) {
      const l = {
        key: {
          boardingTxid: f.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: f.value,
        type: Gr.TxReceived,
        settled: f.virtualStatus.state === "spent",
        createdAt: f.status.block_time ? new Date(f.status.block_time * 1e3).getTime() : 0
      };
      f.status.block_time ? c.push(l) : s.push(l);
    }
    return {
      boardingTxs: [...s, ...c],
      commitmentsToIgnore: i
    };
  }
  async getBoardingUtxos() {
    const e = await this.getBoardingAddress(), n = await this.onchainProvider.getCoins(e), r = this.boardingTapscript.encode(), i = this.boardingTapscript.forfeit(), s = this.boardingTapscript.exit();
    return n.map((c) => ({
      ...c,
      forfeitTapLeafScript: i,
      intentTapLeafScript: s,
      tapTree: r
    }));
  }
  async sendBitcoin(e) {
    if (e.amount <= 0)
      throw new Error("Amount must be positive");
    if (!Np(e.address))
      throw new Error("Invalid Ark address " + e.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Cp(n, e.amount), i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = fr.decode(e.address), f = [
      {
        script: BigInt(e.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(e.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const k = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      f.push({
        script: k,
        amount: BigInt(r.changeAmount)
      });
    }
    const l = this.offchainTapscript.encode();
    let p = ap(r.inputs.map((k) => ({
      ...k,
      tapLeafScript: i,
      tapTree: l
    })), f, this.serverUnrollScript);
    const g = await this.identity.sign(p.arkTx), { arkTxid: w, signedCheckpointTxs: b } = await this.arkProvider.submitTx(pe.encode(g.toPSBT()), p.checkpoints.map((k) => pe.encode(k.toPSBT()))), E = await Promise.all(b.map(async (k) => {
      const O = Jt.fromPSBT(pe.decode(k)), $ = await this.identity.sign(O);
      return pe.encode($.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(w, E), w;
  }
  async settle(e, n) {
    if (e != null && e.inputs) {
      for (const b of e.inputs)
        if (typeof b == "string")
          try {
            Vt.fromString(b);
          } catch {
            throw new Error(`Invalid arknote "${b}"`);
          }
    }
    if (!e) {
      let b = 0;
      const E = await this.getBoardingUtxos();
      b += E.reduce(($, F) => $ + F.value, 0);
      const k = await this.getVtxos();
      b += k.reduce(($, F) => $ + F.value, 0);
      const O = [...E, ...k];
      if (O.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: O,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(b)
          }
        ]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [b, E] of e.outputs.entries()) {
      let k;
      try {
        k = fr.decode(E.address).pkScript, s = !0;
      } catch {
        const O = Fn(this.network).decode(E.address);
        k = Ft.encode(O), r.push(b);
      }
      i.push({
        amount: E.amount,
        script: k
      });
    }
    let c;
    const f = [];
    s && (c = this.identity.signerSession(), f.push(G.encode(c.getPublicKey())));
    const [l, p] = await Promise.all([
      this.makeRegisterIntentSignature(e.inputs, i, r, f),
      this.makeDeleteIntentSignature(e.inputs)
    ]), g = await this.arkProvider.registerIntent(l), w = new AbortController();
    try {
      let b;
      const E = [
        ...f,
        ...e.inputs.map((K) => `${K.txid}:${K.vout}`)
      ], k = this.arkProvider.getEventStream(w.signal, E);
      let O, $;
      const F = [], z = [];
      let H, D;
      for await (const K of k)
        switch (n && n(K), K.type) {
          // the settlement failed
          case At.BatchFailed:
            if (K.id === O)
              throw new Error(K.reason);
            break;
          case At.BatchStarted:
            if (b !== void 0)
              continue;
            const tt = await this.handleBatchStartedEvent(K, g, this.arkServerPublicKey, this.forfeitOutputScript);
            tt.skip || (b = K.type, $ = tt.sweepTapTreeRoot, O = tt.roundId, s || (b = At.TreeNoncesAggregated));
            break;
          case At.TreeTx:
            if (b !== At.BatchStarted && b !== At.TreeNoncesAggregated)
              continue;
            if (K.batchIndex === 0)
              F.push(K.chunk);
            else if (K.batchIndex === 1)
              z.push(K.chunk);
            else
              throw new Error(`Invalid batch index: ${K.batchIndex}`);
            break;
          case At.TreeSignature:
            if (b !== At.TreeNoncesAggregated || !s)
              continue;
            if (!H)
              throw new Error("Vtxo graph not set, something went wrong");
            if (K.batchIndex === 0) {
              const A = G.decode(K.signature);
              H.update(K.txid, (lt) => {
                lt.updateInput(0, {
                  tapKeySig: A
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case At.TreeSigningStarted:
            if (b !== At.BatchStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              if (!$)
                throw new Error("Sweep tap tree root not set");
              if (F.length === 0)
                throw new Error("unsigned vtxo graph not received");
              H = Ys.create(F), await this.handleSettlementSigningEvent(K, $, c, H);
            }
            b = K.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case At.TreeNoncesAggregated:
            if (b !== At.TreeSigningStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              await this.handleSettlementSigningNoncesGeneratedEvent(K, c);
            }
            b = K.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case At.BatchFinalization:
            if (b !== At.TreeNoncesAggregated)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            z.length > 0 && (D = Ys.create(z), ip(K.commitmentTx, D)), await this.handleSettlementFinalizationEvent(K, e.inputs, this.forfeitOutputScript, D), b = K.type;
            break;
          // the settlement is done, last event to be received
          case At.BatchFinalized:
            if (b !== At.BatchFinalization)
              continue;
            return w.abort(), K.commitmentTxid;
        }
    } catch (b) {
      w.abort();
      try {
        await this.arkProvider.deleteIntent(p);
      } catch {
      }
      throw b;
    }
    throw new Error("Settlement failed");
  }
  async notifyIncomingFunds(e) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r && (i = await this.onchainProvider.watchAddresses([r], (f) => {
      const l = f.map((p) => {
        const g = p.vout.findIndex((w) => w.scriptpubkey_address === r);
        return g === -1 ? (console.warn(`No vout found for address ${r} in transaction ${p.txid}`), null) : {
          txid: p.txid,
          vout: g,
          value: Number(p.vout[g].value),
          status: p.status
        };
      }).filter((p) => p !== null);
      e({
        type: "utxo",
        coins: l
      });
    })), this.indexerProvider && n) {
      const f = this.offchainTapscript, l = await this.indexerProvider.subscribeForScripts([
        G.encode(f.pkScript)
      ]), p = new AbortController(), g = this.indexerProvider.getSubscription(l, p.signal);
      s = async () => {
        var w;
        p.abort(), await ((w = this.indexerProvider) == null ? void 0 : w.unsubscribeForScripts(l));
      }, (async () => {
        var w;
        try {
          for await (const b of g)
            ((w = b.newVtxos) == null ? void 0 : w.length) > 0 && e({
              type: "vtxo",
              vtxos: b.newVtxos
            });
        } catch (b) {
          console.error("Subscription error:", b);
        }
      })();
    }
    return () => {
      i == null || i(), s == null || s();
    };
  }
  async handleBatchStartedEvent(e, n, r, i) {
    const s = new TextEncoder().encode(n), c = se(s), f = G.encode(new Uint8Array(c));
    let l = !0;
    for (const w of e.intentIdHashes)
      if (w === f) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), l = !1;
      }
    if (l)
      return { skip: l };
    const p = Ue.encode({
      timelock: {
        value: e.batchExpiry,
        type: e.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, g = Rr(p);
    return {
      roundId: e.id,
      sweepTapTreeRoot: g,
      forfeitOutputScript: i,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r, i) {
    const s = Jt.fromPSBT(pe.decode(e.unsignedCommitmentTx));
    sp(i, s, n);
    const c = s.getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(i, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, G.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, G.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r, i) {
    const s = [], c = await this.getVirtualCoins();
    let f = Jt.fromPSBT(pe.decode(e.commitmentTx)), l = !1, p = 0;
    const g = (i == null ? void 0 : i.leaves()) || [];
    for (const w of n) {
      const b = c.find((H) => H.txid === w.txid && H.vout === w.vout);
      if (!b) {
        l = !0;
        const H = [];
        for (let D = 0; D < f.inputsLength; D++) {
          const K = f.getInput(D);
          if (!K.txid || K.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          G.encode(K.txid) === w.txid && K.index === w.vout && (f.updateInput(D, {
            tapLeafScript: [w.forfeitTapLeafScript]
          }), H.push(D));
        }
        f = await this.identity.sign(f, H);
        continue;
      }
      if (Rh(b) || _f(b, this.dustAmount))
        continue;
      if (g.length === 0)
        throw new Error("connectors not received");
      if (p >= g.length)
        throw new Error("not enough connectors received");
      const E = g[p], k = G.encode(oe(E.toBytes(!0)).reverse()), O = E.getOutput(0);
      if (!O)
        throw new Error("connector output not found");
      const $ = O.amount, F = O.script;
      if (!$ || !F)
        throw new Error("invalid connector output");
      p++;
      let z = Zh([
        {
          txid: w.txid,
          index: w.vout,
          witnessUtxo: {
            amount: BigInt(b.value),
            script: Oe.decode(w.tapTree).pkScript
          },
          sighashType: sn.DEFAULT,
          tapLeafScript: [w.forfeitTapLeafScript]
        },
        {
          txid: k,
          index: 0,
          witnessUtxo: {
            amount: $,
            script: F
          }
        }
      ], r);
      z = await this.identity.sign(z, [0]), s.push(pe.encode(z.toPSBT()));
    }
    (s.length > 0 || l) && await this.arkProvider.submitSignedForfeitTxs(s, l ? pe.encode(f.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(e, n, r, i) {
    const s = Math.floor(Date.now() / 1e3), { inputs: c, inputTapTrees: f, finalizer: l } = this.prepareBIP322Inputs(e), p = {
      type: "register",
      input_tap_trees: f,
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 2 * 60,
      // valid for 2 minutes
      cosigners_public_keys: i
    }, g = JSON.stringify(p, null, 0);
    return {
      signature: await this.makeBIP322Signature(g, c, l, n),
      message: g
    };
  }
  async makeDeleteIntentSignature(e) {
    const n = Math.floor(Date.now() / 1e3), { inputs: r, finalizer: i } = this.prepareBIP322Inputs(e), s = {
      type: "delete",
      expire_at: n + 2 * 60
      // valid for 2 minutes
    }, c = JSON.stringify(s, null, 0);
    return {
      signature: await this.makeBIP322Signature(c, r, i),
      message: c
    };
  }
  prepareBIP322Inputs(e) {
    const n = [], r = [], i = [];
    for (const s of e) {
      const c = Oe.decode(s.tapTree), f = Bp(s);
      n.push({
        txid: G.decode(s.txid),
        index: s.vout,
        witnessUtxo: {
          amount: BigInt(s.value),
          script: c.pkScript
        },
        sequence: f,
        tapLeafScript: [s.intentTapLeafScript]
      }), r.push(G.encode(s.tapTree)), i.push(s.extraWitness || []);
    }
    return {
      inputs: n,
      inputTapTrees: r,
      finalizer: _p(i)
    };
  }
  async makeBIP322Signature(e, n, r, i) {
    const s = ui.create(e, n, i), c = await this.identity.sign(s);
    return ui.signature(c, r);
  }
}
lr.MIN_FEE_RATE = 1;
function _p(t) {
  return function(e) {
    for (let n = 0; n < e.inputsLength; n++) {
      try {
        e.finalizeIdx(n);
      } catch (s) {
        if (s instanceof Error && s.message.includes("finalize/taproot: empty witness")) {
          const c = e.getInput(n).tapLeafScript;
          if (!c || c.length <= 0)
            throw s;
          const [f, l] = c[0], p = l.slice(0, -1);
          e.updateInput(n, {
            finalScriptWitness: [
              p,
              rn.encode(f)
            ]
          });
        }
      }
      const r = e.getInput(n).finalScriptWitness;
      if (!r)
        throw new Error("input not finalized");
      const i = t[n === 0 ? 0 : n - 1];
      i && i.length > 0 && e.updateInput(n, {
        finalScriptWitness: [...i, ...r]
      });
    }
  };
}
function Bp(t) {
  let e;
  try {
    const n = t.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), i = Ue.decode(r).params;
    e = zs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
  } catch {
  }
  return e;
}
function Np(t) {
  try {
    return fr.decode(t), !0;
  } catch {
    return !1;
  }
}
function Cp(t, e) {
  const n = [...t].sort((c, f) => {
    const l = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, p = f.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return l !== p ? l - p : f.value - c.value;
  }), r = [];
  let i = 0;
  for (const c of n)
    if (r.push(c), i += c.value, i >= e)
      break;
  if (i === e)
    return { inputs: r, changeAmount: 0n };
  if (i < e)
    throw new Error("Insufficient funds");
  const s = BigInt(i - e);
  return {
    inputs: r,
    changeAmount: s
  };
}
var dt;
(function(t) {
  t.walletInitialized = (V) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: V
  });
  function e(V, nt) {
    return {
      type: "ERROR",
      success: !1,
      message: nt,
      id: V
    };
  }
  t.error = e;
  function n(V, nt) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: nt,
      id: V
    };
  }
  t.settleEvent = n;
  function r(V, nt) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: nt,
      id: V
    };
  }
  t.settleSuccess = r;
  function i(V) {
    return V.type === "SETTLE_SUCCESS" && V.success;
  }
  t.isSettleSuccess = i;
  function s(V) {
    return V.type === "ADDRESS" && V.success === !0;
  }
  t.isAddress = s;
  function c(V) {
    return V.type === "BOARDING_ADDRESS" && V.success === !0;
  }
  t.isBoardingAddress = c;
  function f(V, nt) {
    return {
      type: "ADDRESS",
      success: !0,
      address: nt,
      id: V
    };
  }
  t.address = f;
  function l(V, nt) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: nt,
      id: V
    };
  }
  t.boardingAddress = l;
  function p(V) {
    return V.type === "BALANCE" && V.success === !0;
  }
  t.isBalance = p;
  function g(V, nt) {
    return {
      type: "BALANCE",
      success: !0,
      balance: nt,
      id: V
    };
  }
  t.balance = g;
  function w(V) {
    return V.type === "VTXOS" && V.success === !0;
  }
  t.isVtxos = w;
  function b(V, nt) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: nt,
      id: V
    };
  }
  t.vtxos = b;
  function E(V) {
    return V.type === "VIRTUAL_COINS" && V.success === !0;
  }
  t.isVirtualCoins = E;
  function k(V, nt) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: nt,
      id: V
    };
  }
  t.virtualCoins = k;
  function O(V) {
    return V.type === "BOARDING_UTXOS" && V.success === !0;
  }
  t.isBoardingUtxos = O;
  function $(V, nt) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: nt,
      id: V
    };
  }
  t.boardingUtxos = $;
  function F(V) {
    return V.type === "SEND_BITCOIN_SUCCESS" && V.success === !0;
  }
  t.isSendBitcoinSuccess = F;
  function z(V, nt) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: nt,
      id: V
    };
  }
  t.sendBitcoinSuccess = z;
  function H(V) {
    return V.type === "TRANSACTION_HISTORY" && V.success === !0;
  }
  t.isTransactionHistory = H;
  function D(V, nt) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: nt,
      id: V
    };
  }
  t.transactionHistory = D;
  function K(V) {
    return V.type === "WALLET_STATUS" && V.success === !0;
  }
  t.isWalletStatus = K;
  function tt(V, nt) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: nt
      },
      id: V
    };
  }
  t.walletStatus = tt;
  function A(V) {
    return V.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = A;
  function lt(V, nt) {
    return {
      type: "CLEAR_RESPONSE",
      success: nt,
      id: V
    };
  }
  t.clearResponse = lt;
  function xt(V, nt) {
    return {
      type: "SIGN_SUCCESS",
      success: !0,
      tx: nt,
      id: V
    };
  }
  t.signSuccess = xt;
  function bt(V) {
    return V.type === "SIGN_SUCCESS" && V.success === !0;
  }
  t.isSignSuccess = bt;
})(dt || (dt = {}));
class It {
  constructor(e, n, r, i, s, c) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = c;
  }
  static create() {
    return new It(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += It.INPUT_SIZE, this;
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += It.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += It.INPUT_SIZE + It.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const i = 1 + It.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + i, this.inputSize += It.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += It.OUTPUT_SIZE + It.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += It.OUTPUT_SIZE + It.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (c) => c < 253 ? 1 : c < 65535 ? 3 : c < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let s = (It.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * It.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += It.WITNESS_HEADER_SIZE + this.inputWitnessSize), Up(s);
  }
}
It.P2PKH_SCRIPT_SIG_SIZE = 108;
It.INPUT_SIZE = 41;
It.BASE_CONTROL_BLOCK_SIZE = 33;
It.OUTPUT_SIZE = 9;
It.P2WKH_OUTPUT_SIZE = 22;
It.BASE_TX_SIZE = 10;
It.WITNESS_HEADER_SIZE = 2;
It.WITNESS_SCALE_FACTOR = 4;
It.P2TR_OUTPUT_SIZE = 34;
const Up = (t) => {
  const e = BigInt(Math.ceil(t / It.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
};
var ce;
(function(t) {
  function e(k) {
    return typeof k == "object" && k !== null && "type" in k;
  }
  t.isBase = e;
  function n(k) {
    return k.type === "INIT_WALLET" && "privateKey" in k && typeof k.privateKey == "string" && "arkServerUrl" in k && typeof k.arkServerUrl == "string" && ("arkServerPublicKey" in k ? typeof k.arkServerPublicKey == "string" || k.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(k) {
    return k.type === "SETTLE";
  }
  t.isSettle = r;
  function i(k) {
    return k.type === "GET_ADDRESS";
  }
  t.isGetAddress = i;
  function s(k) {
    return k.type === "GET_BOARDING_ADDRESS";
  }
  t.isGetBoardingAddress = s;
  function c(k) {
    return k.type === "GET_BALANCE";
  }
  t.isGetBalance = c;
  function f(k) {
    return k.type === "GET_VTXOS";
  }
  t.isGetVtxos = f;
  function l(k) {
    return k.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = l;
  function p(k) {
    return k.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = p;
  function g(k) {
    return k.type === "SEND_BITCOIN" && "params" in k && k.params !== null && typeof k.params == "object" && "address" in k.params && typeof k.params.address == "string" && "amount" in k.params && typeof k.params.amount == "number";
  }
  t.isSendBitcoin = g;
  function w(k) {
    return k.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = w;
  function b(k) {
    return k.type === "GET_STATUS";
  }
  t.isGetStatus = b;
  function E(k) {
    return k.type === "SIGN" && "tx" in k && typeof k.tx == "string" && ("inputIndexes" in k ? Array.isArray(k.inputIndexes) && k.inputIndexes.every((O) => typeof O == "number") : !0);
  }
  t.isSign = E;
})(ce || (ce = {}));
class Ot {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase(Ot.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const i = indexedDB.deleteDatabase(Ot.DB_NAME);
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
      const r = indexedDB.open(Ot.DB_NAME, Ot.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (i) => {
        const s = i.target.result;
        if (!s.objectStoreNames.contains(Ot.STORE_NAME)) {
          const c = s.createObjectStore(Ot.STORE_NAME, {
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
      const s = this.db.transaction(Ot.STORE_NAME, "readwrite").objectStore(Ot.STORE_NAME), c = e.map((f) => new Promise((l, p) => {
        const g = s.put(f);
        g.onsuccess = () => l(), g.onerror = () => p(g.error);
      }));
      Promise.all(c).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Ot.STORE_NAME, "readwrite").objectStore(Ot.STORE_NAME).clear();
      s.onsuccess = () => e(), s.onerror = () => n(s.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Ot.STORE_NAME, "readonly").objectStore(Ot.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSweptVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Ot.STORE_NAME, "readonly").objectStore(Ot.STORE_NAME).index("state").getAll(IDBKeyRange.only("swept"));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSpentVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Ot.STORE_NAME, "readonly").objectStore(Ot.STORE_NAME).index("spentBy").getAll(IDBKeyRange.lowerBound("", !0));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Ot.STORE_NAME, "readonly").objectStore(Ot.STORE_NAME).index("spentBy"), c = s.getAll(IDBKeyRange.only("")), f = s.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((l, p) => {
          c.onsuccess = () => {
            l(c.result);
          }, c.onerror = () => p(c.error);
        }),
        new Promise((l, p) => {
          f.onsuccess = () => {
            l(f.result);
          }, f.onerror = () => p(f.error);
        })
      ]).then(([l, p]) => {
        e({
          spendable: l,
          spent: p
        });
      }).catch(n);
    });
  }
}
Ot.DB_NAME = "wallet-db";
Ot.STORE_NAME = "vtxos";
Ot.DB_VERSION = 1;
class Op {
  constructor(e = new Ot(), n = () => {
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
    this.vtxoSubscription && this.vtxoSubscription.abort(), await this.vtxoRepository.close(), this.wallet = void 0, this.arkProvider = void 0, this.indexerProvider = void 0, this.vtxoSubscription = void 0;
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    await this.vtxoRepository.open();
    const e = this.wallet.offchainTapscript.encode(), n = this.wallet.offchainTapscript.forfeit(), r = this.wallet.offchainTapscript.exit(), i = G.encode(this.wallet.offchainTapscript.pkScript), c = (await this.indexerProvider.getVtxos({
      scripts: [i]
    })).vtxos.map((f) => ({
      ...f,
      forfeitTapLeafScript: n,
      intentTapLeafScript: r,
      tapTree: e
    }));
    await this.vtxoRepository.addOrUpdate(c), this.processVtxoSubscription({
      script: i,
      vtxoScript: this.wallet.offchainTapscript
    });
  }
  async processVtxoSubscription({ script: e, vtxoScript: n }) {
    try {
      const r = n.forfeit(), i = n.exit(), s = new AbortController(), c = await this.indexerProvider.subscribeForScripts([e]), f = this.indexerProvider.getSubscription(c, s.signal);
      this.vtxoSubscription = s;
      const l = n.encode();
      for await (const p of f) {
        const g = [...p.newVtxos, ...p.spentVtxos];
        if (g.length === 0)
          continue;
        const w = g.map((b) => ({
          ...b,
          forfeitTapLeafScript: r,
          intentTapLeafScript: i,
          tapTree: l
        }));
        await this.vtxoRepository.addOrUpdate(w);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    var n;
    this.clear(), ce.isBase(e.data) && ((n = e.source) == null || n.postMessage(dt.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, i, s;
    const n = e.data;
    if (!ce.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new Nf(n.arkServerUrl), this.indexerProvider = new Uf(n.arkServerUrl), this.wallet = await lr.create({
        identity: ii.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (i = e.source) == null || i.postMessage(dt.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (c) {
      console.error("Error initializing wallet:", c);
      const f = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(dt.error(n.id, f));
    }
  }
  async handleSettle(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
        return;
      }
      const f = await this.wallet.settle(n.params, (l) => {
        var p;
        (p = e.source) == null || p.postMessage(dt.settleEvent(n.id, l));
      });
      (s = e.source) == null || s.postMessage(dt.settleSuccess(n.id, f));
    } catch (f) {
      console.error("Error settling:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleSendBitcoin(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.sendBitcoin(n.params);
      (s = e.source) == null || s.postMessage(dt.sendBitcoinSuccess(n.id, f));
    } catch (f) {
      console.error("Error sending bitcoin:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetAddress(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getAddress();
      (s = e.source) == null || s.postMessage(dt.address(n.id, f));
    } catch (f) {
      console.error("Error getting address:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetBoardingAddress(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getBoardingAddress();
      (s = e.source) == null || s.postMessage(dt.boardingAddress(n.id, f));
    } catch (f) {
      console.error("Error getting boarding address:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetBalance(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [f, l, p] = await Promise.all([
        this.wallet.getBoardingUtxos(),
        this.vtxoRepository.getSpendableVtxos(),
        this.vtxoRepository.getSweptVtxos()
      ]);
      let g = 0, w = 0;
      for (const F of f)
        F.status.confirmed ? g += F.value : w += F.value;
      let b = 0, E = 0, k = 0;
      for (const F of l)
        F.virtualStatus.state === "settled" ? b += F.value : F.virtualStatus.state === "preconfirmed" && (E += F.value);
      for (const F of p)
        Yr(F) && (k += F.value);
      const O = g + w, $ = b + E + k;
      (s = e.source) == null || s.postMessage(dt.balance(n.id, {
        boarding: {
          confirmed: g,
          unconfirmed: w,
          total: O
        },
        settled: b,
        preconfirmed: E,
        available: b + E,
        recoverable: k,
        total: O + $
      }));
    } catch (f) {
      console.error("Error getting balance:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetVtxos(e) {
    var r, i, s, c, f, l;
    const n = e.data;
    if (!ce.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      let p = await this.vtxoRepository.getSpendableVtxos();
      if (!((s = n.filter) != null && s.withRecoverable)) {
        if (!this.wallet)
          throw new Error("Wallet not initialized");
        p = p.filter((g) => !_f(g, this.wallet.dustAmount));
      }
      if ((c = n.filter) != null && c.withRecoverable) {
        const g = await this.vtxoRepository.getSweptVtxos();
        p.push(...g.filter(Yr));
      }
      (f = e.source) == null || f.postMessage(dt.vtxos(n.id, p));
    } catch (p) {
      console.error("Error getting vtxos:", p);
      const g = p instanceof Error ? p.message : "Unknown error occurred";
      (l = e.source) == null || l.postMessage(dt.error(n.id, g));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = await this.wallet.getBoardingUtxos();
      (s = e.source) == null || s.postMessage(dt.boardingUtxos(n.id, f));
    } catch (f) {
      console.error("Error getting boarding utxos:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: f, commitmentsToIgnore: l } = await this.wallet.getBoardingTxs(), { spendable: p, spent: g } = await this.vtxoRepository.getAllVtxos(), w = Bf(p, g, l), b = [...f, ...w];
      b.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (E, k) => E.createdAt === 0 ? -1 : k.createdAt === 0 ? 1 : k.createdAt - E.createdAt
      ), (s = e.source) == null || s.postMessage(dt.transactionHistory(n.id, b));
    } catch (f) {
      console.error("Error getting transaction history:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleGetStatus(e) {
    var r, i;
    const n = e.data;
    if (!ce.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (i = e.source) == null || i.postMessage(dt.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleSign(e) {
    var r, i, s, c;
    const n = e.data;
    if (!ce.isSign(n)) {
      console.error("Invalid SIGN message format", n), (r = e.source) == null || r.postMessage(dt.error(n.id, "Invalid SIGN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(dt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const f = Jt.fromPSBT(pe.decode(n.tx)), l = await this.wallet.identity.sign(f, n.inputIndexes);
      (s = e.source) == null || s.postMessage(dt.signSuccess(n.id, pe.encode(l.toPSBT())));
    } catch (f) {
      console.error("Error signing:", f);
      const l = f instanceof Error ? f.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(dt.error(n.id, l));
    }
  }
  async handleMessage(e) {
    var r;
    this.messageCallback(e);
    const n = e.data;
    if (!ce.isBase(n)) {
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
      case "GET_BOARDING_ADDRESS": {
        await this.handleGetBoardingAddress(e);
        break;
      }
      case "GET_BALANCE": {
        await this.handleGetBalance(e);
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
      case "SIGN": {
        await this.handleSign(e);
        break;
      }
      default:
        (r = e.source) == null || r.postMessage(dt.error(n.id, "Unknown message type"));
    }
  }
}
var au;
(function(t) {
  let e;
  (function(i) {
    i[i.UNROLL = 0] = "UNROLL", i[i.WAIT = 1] = "WAIT", i[i.DONE = 2] = "DONE";
  })(e = t.StepType || (t.StepType = {}));
  class n {
    constructor(s, c, f, l) {
      this.toUnroll = s, this.bumper = c, this.explorer = f, this.indexer = l;
    }
    static async create(s, c, f, l) {
      const { chain: p } = await l.getVtxoChain(s);
      return new n({ ...s, chain: p }, c, f, l);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const c = this.toUnroll.chain;
      for (let p = c.length - 1; p >= 0; p--) {
        const g = c[p];
        if (!(g.type === rr.COMMITMENT || g.type === rr.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(g.txid)).confirmed)
              return {
                type: e.WAIT,
                txid: g.txid,
                do: Lp(this.explorer, g.txid)
              };
          } catch {
            s = g;
            break;
          }
      }
      if (!s)
        return {
          type: e.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const f = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (f.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const l = Jt.fromPSBT(pe.decode(f.txs[0]), {
        allowUnknownInputs: !0
      });
      if (s.type === rr.TREE) {
        const p = l.getInput(0);
        if (!p)
          throw new Error("Input not found");
        const g = p.tapKeySig;
        if (!g)
          throw new Error("Tap key sig not found");
        l.updateInput(0, {
          finalScriptWitness: [g]
        });
      } else
        l.finalize();
      return {
        type: e.UNROLL,
        tx: l,
        do: Pp(this.bumper, this.explorer, l)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Rp(1e3);
        const c = await this.next();
        await c.do(), yield c, s = c.type;
      } while (s !== e.DONE);
    }
  }
  t.Session = n;
  async function r(i, s, c) {
    const f = await i.onchainProvider.getChainTip();
    let l = await i.getVtxos({ withUnrolled: !0 });
    if (l = l.filter(($) => s.includes($.txid)), l.length === 0)
      throw new Error("No vtxos to complete unroll");
    const p = [];
    let g = 0n;
    const w = It.create();
    for (const $ of l) {
      if (!$.isUnrolled)
        throw new Error(`Vtxo ${$.txid}:${$.vout} is not fully unrolled, use unroll first`);
      const F = await i.onchainProvider.getTxStatus($.txid);
      if (!F.confirmed)
        throw new Error(`tx ${$.txid} is not confirmed`);
      const z = $p({ height: F.blockHeight, time: F.blockTime }, f, $);
      if (!z)
        throw new Error(`no available exit path found for vtxo ${$.txid}:${$.vout}`);
      const H = Oe.decode($.tapTree).findLeaf(G.encode(z.script));
      if (!H)
        throw new Error(`spending leaf not found for vtxo ${$.txid}:${$.vout}`);
      g += BigInt($.value), p.push({
        txid: $.txid,
        index: $.vout,
        tapLeafScript: [H],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt($.value),
          script: Oe.decode($.tapTree).pkScript
        },
        sighashType: sn.DEFAULT
      }), w.addTapscriptInput(64, H[1].length, rn.encode(H[0]).length);
    }
    const b = new Jt({ allowUnknownInputs: !0, version: 2 });
    for (const $ of p)
      b.addInput($);
    w.addP2TROutput();
    let E = await i.onchainProvider.getFeeRate();
    (!E || E < lr.MIN_FEE_RATE) && (E = lr.MIN_FEE_RATE);
    const k = w.vsize().fee(BigInt(E));
    if (k > g)
      throw new Error("fee amount is greater than the total amount");
    b.addOutputAddress(c, g - k);
    const O = await i.identity.sign(b);
    return O.finalize(), await i.onchainProvider.broadcastTransaction(O.hex), O.id;
  }
  t.completeUnroll = r;
})(au || (au = {}));
function Rp(t) {
  return new Promise((e) => setTimeout(e, t));
}
function Pp(t, e, n) {
  return async () => {
    const [r, i] = await t.bumpP2A(n);
    await e.broadcastTransaction(r, i);
  };
}
function Lp(t, e) {
  return () => new Promise((n, r) => {
    const i = setInterval(async () => {
      try {
        (await t.getTxStatus(e)).confirmed && (clearInterval(i), n());
      } catch (s) {
        clearInterval(i), r(s);
      }
    }, 5e3);
  });
}
function $p(t, e, n) {
  const r = Oe.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (e.height >= t.height + Number(i.params.timelock.value))
        return i;
    } else if (e.time >= t.time + Number(i.params.timelock.value))
      return i;
}
var Vo = { exports: {} }, Dp = Vo.exports, cu;
function Kp() {
  return cu || (cu = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(Dp, function() {
      var n = function(o, a) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(u, d) {
          u.__proto__ = d;
        } || function(u, d) {
          for (var h in d) Object.prototype.hasOwnProperty.call(d, h) && (u[h] = d[h]);
        })(o, a);
      }, r = function() {
        return (r = Object.assign || function(o) {
          for (var a, u = 1, d = arguments.length; u < d; u++) for (var h in a = arguments[u]) Object.prototype.hasOwnProperty.call(a, h) && (o[h] = a[h]);
          return o;
        }).apply(this, arguments);
      };
      function i(o, a, u) {
        for (var d, h = 0, y = a.length; h < y; h++) !d && h in a || ((d = d || Array.prototype.slice.call(a, 0, h))[h] = a[h]);
        return o.concat(d || Array.prototype.slice.call(a));
      }
      var s = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : kh, c = Object.keys, f = Array.isArray;
      function l(o, a) {
        return typeof a != "object" || c(a).forEach(function(u) {
          o[u] = a[u];
        }), o;
      }
      typeof Promise > "u" || s.Promise || (s.Promise = Promise);
      var p = Object.getPrototypeOf, g = {}.hasOwnProperty;
      function w(o, a) {
        return g.call(o, a);
      }
      function b(o, a) {
        typeof a == "function" && (a = a(p(o))), (typeof Reflect > "u" ? c : Reflect.ownKeys)(a).forEach(function(u) {
          k(o, u, a[u]);
        });
      }
      var E = Object.defineProperty;
      function k(o, a, u, d) {
        E(o, a, l(u && w(u, "get") && typeof u.get == "function" ? { get: u.get, set: u.set, configurable: !0 } : { value: u, configurable: !0, writable: !0 }, d));
      }
      function O(o) {
        return { from: function(a) {
          return o.prototype = Object.create(a.prototype), k(o.prototype, "constructor", o), { extend: b.bind(null, o.prototype) };
        } };
      }
      var $ = Object.getOwnPropertyDescriptor, F = [].slice;
      function z(o, a, u) {
        return F.call(o, a, u);
      }
      function H(o, a) {
        return a(o);
      }
      function D(o) {
        if (!o) throw new Error("Assertion Failed");
      }
      function K(o) {
        s.setImmediate ? setImmediate(o) : setTimeout(o, 0);
      }
      function tt(o, a) {
        if (typeof a == "string" && w(o, a)) return o[a];
        if (!a) return o;
        if (typeof a != "string") {
          for (var u = [], d = 0, h = a.length; d < h; ++d) {
            var y = tt(o, a[d]);
            u.push(y);
          }
          return u;
        }
        var m = a.indexOf(".");
        if (m !== -1) {
          var v = o[a.substr(0, m)];
          return v == null ? void 0 : tt(v, a.substr(m + 1));
        }
      }
      function A(o, a, u) {
        if (o && a !== void 0 && !("isFrozen" in Object && Object.isFrozen(o))) if (typeof a != "string" && "length" in a) {
          D(typeof u != "string" && "length" in u);
          for (var d = 0, h = a.length; d < h; ++d) A(o, a[d], u[d]);
        } else {
          var y, m, v = a.indexOf(".");
          v !== -1 ? (y = a.substr(0, v), (m = a.substr(v + 1)) === "" ? u === void 0 ? f(o) && !isNaN(parseInt(y)) ? o.splice(y, 1) : delete o[y] : o[y] = u : A(v = !(v = o[y]) || !w(o, y) ? o[y] = {} : v, m, u)) : u === void 0 ? f(o) && !isNaN(parseInt(a)) ? o.splice(a, 1) : delete o[a] : o[a] = u;
        }
      }
      function lt(o) {
        var a, u = {};
        for (a in o) w(o, a) && (u[a] = o[a]);
        return u;
      }
      var xt = [].concat;
      function bt(o) {
        return xt.apply([], o);
      }
      var kn = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(bt([8, 16, 32, 64].map(function(o) {
        return ["Int", "Uint", "Float"].map(function(a) {
          return a + o + "Array";
        });
      }))).filter(function(o) {
        return s[o];
      }), V = new Set(kn.map(function(o) {
        return s[o];
      })), nt = null;
      function ct(o) {
        return nt = /* @__PURE__ */ new WeakMap(), o = function a(u) {
          if (!u || typeof u != "object") return u;
          var d = nt.get(u);
          if (d) return d;
          if (f(u)) {
            d = [], nt.set(u, d);
            for (var h = 0, y = u.length; h < y; ++h) d.push(a(u[h]));
          } else if (V.has(u.constructor)) d = u;
          else {
            var m, v = p(u);
            for (m in d = v === Object.prototype ? {} : Object.create(v), nt.set(u, d), u) w(u, m) && (d[m] = a(u[m]));
          }
          return d;
        }(o), nt = null, o;
      }
      var jt = {}.toString;
      function Q(o) {
        return jt.call(o).slice(8, -1);
      }
      var Y = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", at = typeof Y == "symbol" ? function(o) {
        var a;
        return o != null && (a = o[Y]) && a.apply(o);
      } : function() {
        return null;
      };
      function ht(o, a) {
        return a = o.indexOf(a), 0 <= a && o.splice(a, 1), 0 <= a;
      }
      var ut = {};
      function ft(o) {
        var a, u, d, h;
        if (arguments.length === 1) {
          if (f(o)) return o.slice();
          if (this === ut && typeof o == "string") return [o];
          if (h = at(o)) {
            for (u = []; !(d = h.next()).done; ) u.push(d.value);
            return u;
          }
          if (o == null) return [o];
          if (typeof (a = o.length) != "number") return [o];
          for (u = new Array(a); a--; ) u[a] = o[a];
          return u;
        }
        for (a = arguments.length, u = new Array(a); a--; ) u[a] = arguments[a];
        return u;
      }
      var Tt = typeof Symbol < "u" ? function(o) {
        return o[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, gr = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], Ae = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(gr), Xt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function te(o, a) {
        this.name = o, this.message = a;
      }
      function he(o, a) {
        return o + ". Errors: " + Object.keys(a).map(function(u) {
          return a[u].toString();
        }).filter(function(u, d, h) {
          return h.indexOf(u) === d;
        }).join(`
`);
      }
      function Dt(o, a, u, d) {
        this.failures = a, this.failedKeys = d, this.successCount = u, this.message = he(o, a);
      }
      function be(o, a) {
        this.name = "BulkError", this.failures = Object.keys(a).map(function(u) {
          return a[u];
        }), this.failuresByPos = a, this.message = he(o, this.failures);
      }
      O(te).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), O(Dt).from(te), O(be).from(te);
      var ke = Ae.reduce(function(o, a) {
        return o[a] = a + "Error", o;
      }, {}), hr = te, ot = Ae.reduce(function(o, a) {
        var u = a + "Error";
        function d(h, y) {
          this.name = u, h ? typeof h == "string" ? (this.message = "".concat(h).concat(y ? `
 ` + y : ""), this.inner = y || null) : typeof h == "object" && (this.message = "".concat(h.name, " ").concat(h.message), this.inner = h) : (this.message = Xt[a] || u, this.inner = null);
        }
        return O(d).from(hr), o[a] = d, o;
      }, {});
      ot.Syntax = SyntaxError, ot.Type = TypeError, ot.Range = RangeError;
      var Ye = gr.reduce(function(o, a) {
        return o[a + "Error"] = ot[a], o;
      }, {}), an = Ae.reduce(function(o, a) {
        return ["Syntax", "Type", "Range"].indexOf(a) === -1 && (o[a + "Error"] = ot[a]), o;
      }, {});
      function Et() {
      }
      function ve(o) {
        return o;
      }
      function Tn(o, a) {
        return o == null || o === ve ? a : function(u) {
          return a(o(u));
        };
      }
      function xe(o, a) {
        return function() {
          o.apply(this, arguments), a.apply(this, arguments);
        };
      }
      function cn(o, a) {
        return o === Et ? a : function() {
          var u = o.apply(this, arguments);
          u !== void 0 && (arguments[0] = u);
          var d = this.onsuccess, h = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var y = a.apply(this, arguments);
          return d && (this.onsuccess = this.onsuccess ? xe(d, this.onsuccess) : d), h && (this.onerror = this.onerror ? xe(h, this.onerror) : h), y !== void 0 ? y : u;
        };
      }
      function Pf(o, a) {
        return o === Et ? a : function() {
          o.apply(this, arguments);
          var u = this.onsuccess, d = this.onerror;
          this.onsuccess = this.onerror = null, a.apply(this, arguments), u && (this.onsuccess = this.onsuccess ? xe(u, this.onsuccess) : u), d && (this.onerror = this.onerror ? xe(d, this.onerror) : d);
        };
      }
      function Lf(o, a) {
        return o === Et ? a : function(u) {
          var d = o.apply(this, arguments);
          l(u, d);
          var h = this.onsuccess, y = this.onerror;
          return this.onsuccess = null, this.onerror = null, u = a.apply(this, arguments), h && (this.onsuccess = this.onsuccess ? xe(h, this.onsuccess) : h), y && (this.onerror = this.onerror ? xe(y, this.onerror) : y), d === void 0 ? u === void 0 ? void 0 : u : l(d, u);
        };
      }
      function $f(o, a) {
        return o === Et ? a : function() {
          return a.apply(this, arguments) !== !1 && o.apply(this, arguments);
        };
      }
      function Ei(o, a) {
        return o === Et ? a : function() {
          var u = o.apply(this, arguments);
          if (u && typeof u.then == "function") {
            for (var d = this, h = arguments.length, y = new Array(h); h--; ) y[h] = arguments[h];
            return u.then(function() {
              return a.apply(d, y);
            });
          }
          return a.apply(this, arguments);
        };
      }
      an.ModifyError = Dt, an.DexieError = te, an.BulkError = be;
      var Fe = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Ca(o) {
        Fe = o;
      }
      var pr = {}, Ua = 100, kn = typeof Promise > "u" ? [] : function() {
        var o = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [o, p(o), o];
        var a = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [a, p(a), o];
      }(), gr = kn[0], Ae = kn[1], kn = kn[2], Ae = Ae && Ae.then, An = gr && gr.constructor, Si = !!kn, yr = function(o, a) {
        wr.push([o, a]), eo && (queueMicrotask(Kf), eo = !1);
      }, Ti = !0, eo = !0, In = [], no = [], ki = ve, un = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: Et, pgp: !1, env: {}, finalize: Et }, it = un, wr = [], _n = 0, ro = [];
      function et(o) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var a = this._PSD = it;
        if (typeof o != "function") {
          if (o !== pr) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && Ii(this, this._value));
        }
        this._state = null, this._value = null, ++a.ref, function u(d, h) {
          try {
            h(function(y) {
              if (d._state === null) {
                if (y === d) throw new TypeError("A promise cannot be resolved with itself.");
                var m = d._lib && Hn();
                y && typeof y.then == "function" ? u(d, function(v, S) {
                  y instanceof et ? y._then(v, S) : y.then(v, S);
                }) : (d._state = !0, d._value = y, Ra(d)), m && jn();
              }
            }, Ii.bind(null, d));
          } catch (y) {
            Ii(d, y);
          }
        }(this, o);
      }
      var Ai = { get: function() {
        var o = it, a = ao;
        function u(d, h) {
          var y = this, m = !o.global && (o !== it || a !== ao), v = m && !ln(), S = new et(function(I, N) {
            _i(y, new Oa(La(d, o, m, v), La(h, o, m, v), I, N, o));
          });
          return this._consoleTask && (S._consoleTask = this._consoleTask), S;
        }
        return u.prototype = pr, u;
      }, set: function(o) {
        k(this, "then", o && o.prototype === pr ? Ai : { get: function() {
          return o;
        }, set: Ai.set });
      } };
      function Oa(o, a, u, d, h) {
        this.onFulfilled = typeof o == "function" ? o : null, this.onRejected = typeof a == "function" ? a : null, this.resolve = u, this.reject = d, this.psd = h;
      }
      function Ii(o, a) {
        var u, d;
        no.push(a), o._state === null && (u = o._lib && Hn(), a = ki(a), o._state = !1, o._value = a, d = o, In.some(function(h) {
          return h._value === d._value;
        }) || In.push(d), Ra(o), u && jn());
      }
      function Ra(o) {
        var a = o._listeners;
        o._listeners = [];
        for (var u = 0, d = a.length; u < d; ++u) _i(o, a[u]);
        var h = o._PSD;
        --h.ref || h.finalize(), _n === 0 && (++_n, yr(function() {
          --_n == 0 && Bi();
        }, []));
      }
      function _i(o, a) {
        if (o._state !== null) {
          var u = o._state ? a.onFulfilled : a.onRejected;
          if (u === null) return (o._state ? a.resolve : a.reject)(o._value);
          ++a.psd.ref, ++_n, yr(Df, [u, o, a]);
        } else o._listeners.push(a);
      }
      function Df(o, a, u) {
        try {
          var d, h = a._value;
          !a._state && no.length && (no = []), d = Fe && a._consoleTask ? a._consoleTask.run(function() {
            return o(h);
          }) : o(h), a._state || no.indexOf(h) !== -1 || function(y) {
            for (var m = In.length; m; ) if (In[--m]._value === y._value) return In.splice(m, 1);
          }(a), u.resolve(d);
        } catch (y) {
          u.reject(y);
        } finally {
          --_n == 0 && Bi(), --u.psd.ref || u.psd.finalize();
        }
      }
      function Kf() {
        Bn(un, function() {
          Hn() && jn();
        });
      }
      function Hn() {
        var o = Ti;
        return eo = Ti = !1, o;
      }
      function jn() {
        var o, a, u;
        do
          for (; 0 < wr.length; ) for (o = wr, wr = [], u = o.length, a = 0; a < u; ++a) {
            var d = o[a];
            d[0].apply(null, d[1]);
          }
        while (0 < wr.length);
        eo = Ti = !0;
      }
      function Bi() {
        var o = In;
        In = [], o.forEach(function(d) {
          d._PSD.onunhandled.call(null, d._value, d);
        });
        for (var a = ro.slice(0), u = a.length; u; ) a[--u]();
      }
      function oo(o) {
        return new et(pr, !1, o);
      }
      function Ct(o, a) {
        var u = it;
        return function() {
          var d = Hn(), h = it;
          try {
            return dn(u, !0), o.apply(this, arguments);
          } catch (y) {
            a && a(y);
          } finally {
            dn(h, !1), d && jn();
          }
        };
      }
      b(et.prototype, { then: Ai, _then: function(o, a) {
        _i(this, new Oa(null, null, o, a, it));
      }, catch: function(o) {
        if (arguments.length === 1) return this.then(null, o);
        var a = o, u = arguments[1];
        return typeof a == "function" ? this.then(null, function(d) {
          return (d instanceof a ? u : oo)(d);
        }) : this.then(null, function(d) {
          return (d && d.name === a ? u : oo)(d);
        });
      }, finally: function(o) {
        return this.then(function(a) {
          return et.resolve(o()).then(function() {
            return a;
          });
        }, function(a) {
          return et.resolve(o()).then(function() {
            return oo(a);
          });
        });
      }, timeout: function(o, a) {
        var u = this;
        return o < 1 / 0 ? new et(function(d, h) {
          var y = setTimeout(function() {
            return h(new ot.Timeout(a));
          }, o);
          u.then(d, h).finally(clearTimeout.bind(null, y));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && k(et.prototype, Symbol.toStringTag, "Dexie.Promise"), un.env = Pa(), b(et, { all: function() {
        var o = ft.apply(null, arguments).map(co);
        return new et(function(a, u) {
          o.length === 0 && a([]);
          var d = o.length;
          o.forEach(function(h, y) {
            return et.resolve(h).then(function(m) {
              o[y] = m, --d || a(o);
            }, u);
          });
        });
      }, resolve: function(o) {
        return o instanceof et ? o : o && typeof o.then == "function" ? new et(function(a, u) {
          o.then(a, u);
        }) : new et(pr, !0, o);
      }, reject: oo, race: function() {
        var o = ft.apply(null, arguments).map(co);
        return new et(function(a, u) {
          o.map(function(d) {
            return et.resolve(d).then(a, u);
          });
        });
      }, PSD: { get: function() {
        return it;
      }, set: function(o) {
        return it = o;
      } }, totalEchoes: { get: function() {
        return ao;
      } }, newPSD: fn, usePSD: Bn, scheduler: { get: function() {
        return yr;
      }, set: function(o) {
        yr = o;
      } }, rejectionMapper: { get: function() {
        return ki;
      }, set: function(o) {
        ki = o;
      } }, follow: function(o, a) {
        return new et(function(u, d) {
          return fn(function(h, y) {
            var m = it;
            m.unhandleds = [], m.onunhandled = y, m.finalize = xe(function() {
              var v, S = this;
              v = function() {
                S.unhandleds.length === 0 ? h() : y(S.unhandleds[0]);
              }, ro.push(function I() {
                v(), ro.splice(ro.indexOf(I), 1);
              }), ++_n, yr(function() {
                --_n == 0 && Bi();
              }, []);
            }, m.finalize), o();
          }, a, u, d);
        });
      } }), An && (An.allSettled && k(et, "allSettled", function() {
        var o = ft.apply(null, arguments).map(co);
        return new et(function(a) {
          o.length === 0 && a([]);
          var u = o.length, d = new Array(u);
          o.forEach(function(h, y) {
            return et.resolve(h).then(function(m) {
              return d[y] = { status: "fulfilled", value: m };
            }, function(m) {
              return d[y] = { status: "rejected", reason: m };
            }).then(function() {
              return --u || a(d);
            });
          });
        });
      }), An.any && typeof AggregateError < "u" && k(et, "any", function() {
        var o = ft.apply(null, arguments).map(co);
        return new et(function(a, u) {
          o.length === 0 && u(new AggregateError([]));
          var d = o.length, h = new Array(d);
          o.forEach(function(y, m) {
            return et.resolve(y).then(function(v) {
              return a(v);
            }, function(v) {
              h[m] = v, --d || u(new AggregateError(h));
            });
          });
        });
      }), An.withResolvers && (et.withResolvers = An.withResolvers));
      var qt = { awaits: 0, echoes: 0, id: 0 }, Mf = 0, io = [], so = 0, ao = 0, Vf = 0;
      function fn(o, a, u, d) {
        var h = it, y = Object.create(h);
        return y.parent = h, y.ref = 0, y.global = !1, y.id = ++Vf, un.env, y.env = Si ? { Promise: et, PromiseProp: { value: et, configurable: !0, writable: !0 }, all: et.all, race: et.race, allSettled: et.allSettled, any: et.any, resolve: et.resolve, reject: et.reject } : {}, a && l(y, a), ++h.ref, y.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, d = Bn(y, o, u, d), y.ref === 0 && y.finalize(), d;
      }
      function qn() {
        return qt.id || (qt.id = ++Mf), ++qt.awaits, qt.echoes += Ua, qt.id;
      }
      function ln() {
        return !!qt.awaits && (--qt.awaits == 0 && (qt.id = 0), qt.echoes = qt.awaits * Ua, !0);
      }
      function co(o) {
        return qt.echoes && o && o.constructor === An ? (qn(), o.then(function(a) {
          return ln(), a;
        }, function(a) {
          return ln(), Pt(a);
        })) : o;
      }
      function Ff() {
        var o = io[io.length - 1];
        io.pop(), dn(o, !1);
      }
      function dn(o, a) {
        var u, d = it;
        (a ? !qt.echoes || so++ && o === it : !so || --so && o === it) || queueMicrotask(a ? (function(h) {
          ++ao, qt.echoes && --qt.echoes != 0 || (qt.echoes = qt.awaits = qt.id = 0), io.push(it), dn(h, !0);
        }).bind(null, o) : Ff), o !== it && (it = o, d === un && (un.env = Pa()), Si && (u = un.env.Promise, a = o.env, (d.global || o.global) && (Object.defineProperty(s, "Promise", a.PromiseProp), u.all = a.all, u.race = a.race, u.resolve = a.resolve, u.reject = a.reject, a.allSettled && (u.allSettled = a.allSettled), a.any && (u.any = a.any))));
      }
      function Pa() {
        var o = s.Promise;
        return Si ? { Promise: o, PromiseProp: Object.getOwnPropertyDescriptor(s, "Promise"), all: o.all, race: o.race, allSettled: o.allSettled, any: o.any, resolve: o.resolve, reject: o.reject } : {};
      }
      function Bn(o, a, u, d, h) {
        var y = it;
        try {
          return dn(o, !0), a(u, d, h);
        } finally {
          dn(y, !1);
        }
      }
      function La(o, a, u, d) {
        return typeof o != "function" ? o : function() {
          var h = it;
          u && qn(), dn(a, !0);
          try {
            return o.apply(this, arguments);
          } finally {
            dn(h, !1), d && queueMicrotask(ln);
          }
        };
      }
      function Ni(o) {
        Promise === An && qt.echoes === 0 ? so === 0 ? o() : enqueueNativeMicroTask(o) : setTimeout(o, 0);
      }
      ("" + Ae).indexOf("[native code]") === -1 && (qn = ln = Et);
      var Pt = et.reject, Nn = "￿", Ze = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", $a = "String expected.", zn = [], uo = "__dbnames", Ci = "readonly", Ui = "readwrite";
      function Cn(o, a) {
        return o ? a ? function() {
          return o.apply(this, arguments) && a.apply(this, arguments);
        } : o : a;
      }
      var Da = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function fo(o) {
        return typeof o != "string" || /\./.test(o) ? function(a) {
          return a;
        } : function(a) {
          return a[o] === void 0 && o in a && delete (a = ct(a))[o], a;
        };
      }
      function Ka() {
        throw ot.Type();
      }
      function vt(o, a) {
        try {
          var u = Ma(o), d = Ma(a);
          if (u !== d) return u === "Array" ? 1 : d === "Array" ? -1 : u === "binary" ? 1 : d === "binary" ? -1 : u === "string" ? 1 : d === "string" ? -1 : u === "Date" ? 1 : d !== "Date" ? NaN : -1;
          switch (u) {
            case "number":
            case "Date":
            case "string":
              return a < o ? 1 : o < a ? -1 : 0;
            case "binary":
              return function(h, y) {
                for (var m = h.length, v = y.length, S = m < v ? m : v, I = 0; I < S; ++I) if (h[I] !== y[I]) return h[I] < y[I] ? -1 : 1;
                return m === v ? 0 : m < v ? -1 : 1;
              }(Va(o), Va(a));
            case "Array":
              return function(h, y) {
                for (var m = h.length, v = y.length, S = m < v ? m : v, I = 0; I < S; ++I) {
                  var N = vt(h[I], y[I]);
                  if (N !== 0) return N;
                }
                return m === v ? 0 : m < v ? -1 : 1;
              }(o, a);
          }
        } catch {
        }
        return NaN;
      }
      function Ma(o) {
        var a = typeof o;
        return a != "object" ? a : ArrayBuffer.isView(o) ? "binary" : (o = Q(o), o === "ArrayBuffer" ? "binary" : o);
      }
      function Va(o) {
        return o instanceof Uint8Array ? o : ArrayBuffer.isView(o) ? new Uint8Array(o.buffer, o.byteOffset, o.byteLength) : new Uint8Array(o);
      }
      var Fa = (_t.prototype._trans = function(o, a, u) {
        var d = this._tx || it.trans, h = this.name, y = Fe && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(o === "readonly" ? "read" : "write", " ").concat(this.name));
        function m(I, N, x) {
          if (!x.schema[h]) throw new ot.NotFound("Table " + h + " not part of transaction");
          return a(x.idbtrans, x);
        }
        var v = Hn();
        try {
          var S = d && d.db._novip === this.db._novip ? d === it.trans ? d._promise(o, m, u) : fn(function() {
            return d._promise(o, m, u);
          }, { trans: d, transless: it.transless || it }) : function I(N, x, U, T) {
            if (N.idbdb && (N._state.openComplete || it.letThrough || N._vip)) {
              var B = N._createTransaction(x, U, N._dbSchema);
              try {
                B.create(), N._state.PR1398_maxLoop = 3;
              } catch (C) {
                return C.name === ke.InvalidState && N.isOpen() && 0 < --N._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), N.close({ disableAutoOpen: !1 }), N.open().then(function() {
                  return I(N, x, U, T);
                })) : Pt(C);
              }
              return B._promise(x, function(C, _) {
                return fn(function() {
                  return it.trans = B, T(C, _, B);
                });
              }).then(function(C) {
                if (x === "readwrite") try {
                  B.idbtrans.commit();
                } catch {
                }
                return x === "readonly" ? C : B._completion.then(function() {
                  return C;
                });
              });
            }
            if (N._state.openComplete) return Pt(new ot.DatabaseClosed(N._state.dbOpenError));
            if (!N._state.isBeingOpened) {
              if (!N._state.autoOpen) return Pt(new ot.DatabaseClosed());
              N.open().catch(Et);
            }
            return N._state.dbReadyPromise.then(function() {
              return I(N, x, U, T);
            });
          }(this.db, o, [this.name], m);
          return y && (S._consoleTask = y, S = S.catch(function(I) {
            return console.trace(I), Pt(I);
          })), S;
        } finally {
          v && jn();
        }
      }, _t.prototype.get = function(o, a) {
        var u = this;
        return o && o.constructor === Object ? this.where(o).first(a) : o == null ? Pt(new ot.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(d) {
          return u.core.get({ trans: d, key: o }).then(function(h) {
            return u.hook.reading.fire(h);
          });
        }).then(a);
      }, _t.prototype.where = function(o) {
        if (typeof o == "string") return new this.db.WhereClause(this, o);
        if (f(o)) return new this.db.WhereClause(this, "[".concat(o.join("+"), "]"));
        var a = c(o);
        if (a.length === 1) return this.where(a[0]).equals(o[a[0]]);
        var u = this.schema.indexes.concat(this.schema.primKey).filter(function(v) {
          if (v.compound && a.every(function(I) {
            return 0 <= v.keyPath.indexOf(I);
          })) {
            for (var S = 0; S < a.length; ++S) if (a.indexOf(v.keyPath[S]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(v, S) {
          return v.keyPath.length - S.keyPath.length;
        })[0];
        if (u && this.db._maxKey !== Nn) {
          var y = u.keyPath.slice(0, a.length);
          return this.where(y).equals(y.map(function(S) {
            return o[S];
          }));
        }
        !u && Fe && console.warn("The query ".concat(JSON.stringify(o), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(a.join("+"), "]"));
        var d = this.schema.idxByName;
        function h(v, S) {
          return vt(v, S) === 0;
        }
        var m = a.reduce(function(x, S) {
          var I = x[0], N = x[1], x = d[S], U = o[S];
          return [I || x, I || !x ? Cn(N, x && x.multi ? function(T) {
            return T = tt(T, S), f(T) && T.some(function(B) {
              return h(U, B);
            });
          } : function(T) {
            return h(U, tt(T, S));
          }) : N];
        }, [null, null]), y = m[0], m = m[1];
        return y ? this.where(y.name).equals(o[y.keyPath]).filter(m) : u ? this.filter(m) : this.where(a).equals("");
      }, _t.prototype.filter = function(o) {
        return this.toCollection().and(o);
      }, _t.prototype.count = function(o) {
        return this.toCollection().count(o);
      }, _t.prototype.offset = function(o) {
        return this.toCollection().offset(o);
      }, _t.prototype.limit = function(o) {
        return this.toCollection().limit(o);
      }, _t.prototype.each = function(o) {
        return this.toCollection().each(o);
      }, _t.prototype.toArray = function(o) {
        return this.toCollection().toArray(o);
      }, _t.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, _t.prototype.orderBy = function(o) {
        return new this.db.Collection(new this.db.WhereClause(this, f(o) ? "[".concat(o.join("+"), "]") : o));
      }, _t.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, _t.prototype.mapToClass = function(o) {
        var a, u = this.db, d = this.name;
        function h() {
          return a !== null && a.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = o).prototype instanceof Ka && (function(S, I) {
          if (typeof I != "function" && I !== null) throw new TypeError("Class extends value " + String(I) + " is not a constructor or null");
          function N() {
            this.constructor = S;
          }
          n(S, I), S.prototype = I === null ? Object.create(I) : (N.prototype = I.prototype, new N());
        }(h, a = o), Object.defineProperty(h.prototype, "db", { get: function() {
          return u;
        }, enumerable: !1, configurable: !0 }), h.prototype.table = function() {
          return d;
        }, o = h);
        for (var y = /* @__PURE__ */ new Set(), m = o.prototype; m; m = p(m)) Object.getOwnPropertyNames(m).forEach(function(S) {
          return y.add(S);
        });
        function v(S) {
          if (!S) return S;
          var I, N = Object.create(o.prototype);
          for (I in S) if (!y.has(I)) try {
            N[I] = S[I];
          } catch {
          }
          return N;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = v, this.hook("reading", v), o;
      }, _t.prototype.defineClass = function() {
        return this.mapToClass(function(o) {
          l(this, o);
        });
      }, _t.prototype.add = function(o, a) {
        var u = this, d = this.schema.primKey, h = d.auto, y = d.keyPath, m = o;
        return y && h && (m = fo(y)(o)), this._trans("readwrite", function(v) {
          return u.core.mutate({ trans: v, type: "add", keys: a != null ? [a] : null, values: [m] });
        }).then(function(v) {
          return v.numFailures ? et.reject(v.failures[0]) : v.lastResult;
        }).then(function(v) {
          if (y) try {
            A(o, y, v);
          } catch {
          }
          return v;
        });
      }, _t.prototype.update = function(o, a) {
        return typeof o != "object" || f(o) ? this.where(":id").equals(o).modify(a) : (o = tt(o, this.schema.primKey.keyPath), o === void 0 ? Pt(new ot.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(o).modify(a));
      }, _t.prototype.put = function(o, a) {
        var u = this, d = this.schema.primKey, h = d.auto, y = d.keyPath, m = o;
        return y && h && (m = fo(y)(o)), this._trans("readwrite", function(v) {
          return u.core.mutate({ trans: v, type: "put", values: [m], keys: a != null ? [a] : null });
        }).then(function(v) {
          return v.numFailures ? et.reject(v.failures[0]) : v.lastResult;
        }).then(function(v) {
          if (y) try {
            A(o, y, v);
          } catch {
          }
          return v;
        });
      }, _t.prototype.delete = function(o) {
        var a = this;
        return this._trans("readwrite", function(u) {
          return a.core.mutate({ trans: u, type: "delete", keys: [o] });
        }).then(function(u) {
          return u.numFailures ? et.reject(u.failures[0]) : void 0;
        });
      }, _t.prototype.clear = function() {
        var o = this;
        return this._trans("readwrite", function(a) {
          return o.core.mutate({ trans: a, type: "deleteRange", range: Da });
        }).then(function(a) {
          return a.numFailures ? et.reject(a.failures[0]) : void 0;
        });
      }, _t.prototype.bulkGet = function(o) {
        var a = this;
        return this._trans("readonly", function(u) {
          return a.core.getMany({ keys: o, trans: u }).then(function(d) {
            return d.map(function(h) {
              return a.hook.reading.fire(h);
            });
          });
        });
      }, _t.prototype.bulkAdd = function(o, a, u) {
        var d = this, h = Array.isArray(a) ? a : void 0, y = (u = u || (h ? void 0 : a)) ? u.allKeys : void 0;
        return this._trans("readwrite", function(m) {
          var I = d.schema.primKey, v = I.auto, I = I.keyPath;
          if (I && h) throw new ot.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (h && h.length !== o.length) throw new ot.InvalidArgument("Arguments objects and keys must have the same length");
          var S = o.length, I = I && v ? o.map(fo(I)) : o;
          return d.core.mutate({ trans: m, type: "add", keys: h, values: I, wantResults: y }).then(function(B) {
            var x = B.numFailures, U = B.results, T = B.lastResult, B = B.failures;
            if (x === 0) return y ? U : T;
            throw new be("".concat(d.name, ".bulkAdd(): ").concat(x, " of ").concat(S, " operations failed"), B);
          });
        });
      }, _t.prototype.bulkPut = function(o, a, u) {
        var d = this, h = Array.isArray(a) ? a : void 0, y = (u = u || (h ? void 0 : a)) ? u.allKeys : void 0;
        return this._trans("readwrite", function(m) {
          var I = d.schema.primKey, v = I.auto, I = I.keyPath;
          if (I && h) throw new ot.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (h && h.length !== o.length) throw new ot.InvalidArgument("Arguments objects and keys must have the same length");
          var S = o.length, I = I && v ? o.map(fo(I)) : o;
          return d.core.mutate({ trans: m, type: "put", keys: h, values: I, wantResults: y }).then(function(B) {
            var x = B.numFailures, U = B.results, T = B.lastResult, B = B.failures;
            if (x === 0) return y ? U : T;
            throw new be("".concat(d.name, ".bulkPut(): ").concat(x, " of ").concat(S, " operations failed"), B);
          });
        });
      }, _t.prototype.bulkUpdate = function(o) {
        var a = this, u = this.core, d = o.map(function(m) {
          return m.key;
        }), h = o.map(function(m) {
          return m.changes;
        }), y = [];
        return this._trans("readwrite", function(m) {
          return u.getMany({ trans: m, keys: d, cache: "clone" }).then(function(v) {
            var S = [], I = [];
            o.forEach(function(x, U) {
              var T = x.key, B = x.changes, C = v[U];
              if (C) {
                for (var _ = 0, R = Object.keys(B); _ < R.length; _++) {
                  var P = R[_], L = B[P];
                  if (P === a.schema.primKey.keyPath) {
                    if (vt(L, T) !== 0) throw new ot.Constraint("Cannot update primary key in bulkUpdate()");
                  } else A(C, P, L);
                }
                y.push(U), S.push(T), I.push(C);
              }
            });
            var N = S.length;
            return u.mutate({ trans: m, type: "put", keys: S, values: I, updates: { keys: d, changeSpecs: h } }).then(function(x) {
              var U = x.numFailures, T = x.failures;
              if (U === 0) return N;
              for (var B = 0, C = Object.keys(T); B < C.length; B++) {
                var _, R = C[B], P = y[Number(R)];
                P != null && (_ = T[R], delete T[R], T[P] = _);
              }
              throw new be("".concat(a.name, ".bulkUpdate(): ").concat(U, " of ").concat(N, " operations failed"), T);
            });
          });
        });
      }, _t.prototype.bulkDelete = function(o) {
        var a = this, u = o.length;
        return this._trans("readwrite", function(d) {
          return a.core.mutate({ trans: d, type: "delete", keys: o });
        }).then(function(m) {
          var h = m.numFailures, y = m.lastResult, m = m.failures;
          if (h === 0) return y;
          throw new be("".concat(a.name, ".bulkDelete(): ").concat(h, " of ").concat(u, " operations failed"), m);
        });
      }, _t);
      function _t() {
      }
      function mr(o) {
        function a(m, v) {
          if (v) {
            for (var S = arguments.length, I = new Array(S - 1); --S; ) I[S - 1] = arguments[S];
            return u[m].subscribe.apply(null, I), o;
          }
          if (typeof m == "string") return u[m];
        }
        var u = {};
        a.addEventType = y;
        for (var d = 1, h = arguments.length; d < h; ++d) y(arguments[d]);
        return a;
        function y(m, v, S) {
          if (typeof m != "object") {
            var I;
            v = v || $f;
            var N = { subscribers: [], fire: S = S || Et, subscribe: function(x) {
              N.subscribers.indexOf(x) === -1 && (N.subscribers.push(x), N.fire = v(N.fire, x));
            }, unsubscribe: function(x) {
              N.subscribers = N.subscribers.filter(function(U) {
                return U !== x;
              }), N.fire = N.subscribers.reduce(v, S);
            } };
            return u[m] = a[m] = N;
          }
          c(I = m).forEach(function(x) {
            var U = I[x];
            if (f(U)) y(x, I[x][0], I[x][1]);
            else {
              if (U !== "asap") throw new ot.InvalidArgument("Invalid event config");
              var T = y(x, ve, function() {
                for (var B = arguments.length, C = new Array(B); B--; ) C[B] = arguments[B];
                T.subscribers.forEach(function(_) {
                  K(function() {
                    _.apply(null, C);
                  });
                });
              });
            }
          });
        }
      }
      function br(o, a) {
        return O(a).from({ prototype: o }), a;
      }
      function Wn(o, a) {
        return !(o.filter || o.algorithm || o.or) && (a ? o.justLimit : !o.replayFilter);
      }
      function Oi(o, a) {
        o.filter = Cn(o.filter, a);
      }
      function Ri(o, a, u) {
        var d = o.replayFilter;
        o.replayFilter = d ? function() {
          return Cn(d(), a());
        } : a, o.justLimit = u && !d;
      }
      function lo(o, a) {
        if (o.isPrimKey) return a.primaryKey;
        var u = a.getIndexByKeyPath(o.index);
        if (!u) throw new ot.Schema("KeyPath " + o.index + " on object store " + a.name + " is not indexed");
        return u;
      }
      function Ha(o, a, u) {
        var d = lo(o, a.schema);
        return a.openCursor({ trans: u, values: !o.keysOnly, reverse: o.dir === "prev", unique: !!o.unique, query: { index: d, range: o.range } });
      }
      function ho(o, a, u, d) {
        var h = o.replayFilter ? Cn(o.filter, o.replayFilter()) : o.filter;
        if (o.or) {
          var y = {}, m = function(v, S, I) {
            var N, x;
            h && !h(S, I, function(U) {
              return S.stop(U);
            }, function(U) {
              return S.fail(U);
            }) || ((x = "" + (N = S.primaryKey)) == "[object ArrayBuffer]" && (x = "" + new Uint8Array(N)), w(y, x) || (y[x] = !0, a(v, S, I)));
          };
          return Promise.all([o.or._iterate(m, u), ja(Ha(o, d, u), o.algorithm, m, !o.keysOnly && o.valueMapper)]);
        }
        return ja(Ha(o, d, u), Cn(o.algorithm, h), a, !o.keysOnly && o.valueMapper);
      }
      function ja(o, a, u, d) {
        var h = Ct(d ? function(y, m, v) {
          return u(d(y), m, v);
        } : u);
        return o.then(function(y) {
          if (y) return y.start(function() {
            var m = function() {
              return y.continue();
            };
            a && !a(y, function(v) {
              return m = v;
            }, function(v) {
              y.stop(v), m = Et;
            }, function(v) {
              y.fail(v), m = Et;
            }) || h(y.value, y, function(v) {
              return m = v;
            }), m();
          });
        });
      }
      var vr = (qa.prototype.execute = function(o) {
        var a = this["@@propmod"];
        if (a.add !== void 0) {
          var u = a.add;
          if (f(u)) return i(i([], f(o) ? o : [], !0), u).sort();
          if (typeof u == "number") return (Number(o) || 0) + u;
          if (typeof u == "bigint") try {
            return BigInt(o) + u;
          } catch {
            return BigInt(0) + u;
          }
          throw new TypeError("Invalid term ".concat(u));
        }
        if (a.remove !== void 0) {
          var d = a.remove;
          if (f(d)) return f(o) ? o.filter(function(h) {
            return !d.includes(h);
          }).sort() : [];
          if (typeof d == "number") return Number(o) - d;
          if (typeof d == "bigint") try {
            return BigInt(o) - d;
          } catch {
            return BigInt(0) - d;
          }
          throw new TypeError("Invalid subtrahend ".concat(d));
        }
        return u = (u = a.replacePrefix) === null || u === void 0 ? void 0 : u[0], u && typeof o == "string" && o.startsWith(u) ? a.replacePrefix[1] + o.substring(u.length) : o;
      }, qa);
      function qa(o) {
        this["@@propmod"] = o;
      }
      var Hf = (St.prototype._read = function(o, a) {
        var u = this._ctx;
        return u.error ? u.table._trans(null, Pt.bind(null, u.error)) : u.table._trans("readonly", o).then(a);
      }, St.prototype._write = function(o) {
        var a = this._ctx;
        return a.error ? a.table._trans(null, Pt.bind(null, a.error)) : a.table._trans("readwrite", o, "locked");
      }, St.prototype._addAlgorithm = function(o) {
        var a = this._ctx;
        a.algorithm = Cn(a.algorithm, o);
      }, St.prototype._iterate = function(o, a) {
        return ho(this._ctx, o, a, this._ctx.table.core);
      }, St.prototype.clone = function(o) {
        var a = Object.create(this.constructor.prototype), u = Object.create(this._ctx);
        return o && l(u, o), a._ctx = u, a;
      }, St.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, St.prototype.each = function(o) {
        var a = this._ctx;
        return this._read(function(u) {
          return ho(a, o, u, a.table.core);
        });
      }, St.prototype.count = function(o) {
        var a = this;
        return this._read(function(u) {
          var d = a._ctx, h = d.table.core;
          if (Wn(d, !0)) return h.count({ trans: u, query: { index: lo(d, h.schema), range: d.range } }).then(function(m) {
            return Math.min(m, d.limit);
          });
          var y = 0;
          return ho(d, function() {
            return ++y, !1;
          }, u, h).then(function() {
            return y;
          });
        }).then(o);
      }, St.prototype.sortBy = function(o, a) {
        var u = o.split(".").reverse(), d = u[0], h = u.length - 1;
        function y(S, I) {
          return I ? y(S[u[I]], I - 1) : S[d];
        }
        var m = this._ctx.dir === "next" ? 1 : -1;
        function v(S, I) {
          return vt(y(S, h), y(I, h)) * m;
        }
        return this.toArray(function(S) {
          return S.sort(v);
        }).then(a);
      }, St.prototype.toArray = function(o) {
        var a = this;
        return this._read(function(u) {
          var d = a._ctx;
          if (d.dir === "next" && Wn(d, !0) && 0 < d.limit) {
            var h = d.valueMapper, y = lo(d, d.table.core.schema);
            return d.table.core.query({ trans: u, limit: d.limit, values: !0, query: { index: y, range: d.range } }).then(function(v) {
              return v = v.result, h ? v.map(h) : v;
            });
          }
          var m = [];
          return ho(d, function(v) {
            return m.push(v);
          }, u, d.table.core).then(function() {
            return m;
          });
        }, o);
      }, St.prototype.offset = function(o) {
        var a = this._ctx;
        return o <= 0 || (a.offset += o, Wn(a) ? Ri(a, function() {
          var u = o;
          return function(d, h) {
            return u === 0 || (u === 1 ? --u : h(function() {
              d.advance(u), u = 0;
            }), !1);
          };
        }) : Ri(a, function() {
          var u = o;
          return function() {
            return --u < 0;
          };
        })), this;
      }, St.prototype.limit = function(o) {
        return this._ctx.limit = Math.min(this._ctx.limit, o), Ri(this._ctx, function() {
          var a = o;
          return function(u, d, h) {
            return --a <= 0 && d(h), 0 <= a;
          };
        }, !0), this;
      }, St.prototype.until = function(o, a) {
        return Oi(this._ctx, function(u, d, h) {
          return !o(u.value) || (d(h), a);
        }), this;
      }, St.prototype.first = function(o) {
        return this.limit(1).toArray(function(a) {
          return a[0];
        }).then(o);
      }, St.prototype.last = function(o) {
        return this.reverse().first(o);
      }, St.prototype.filter = function(o) {
        var a;
        return Oi(this._ctx, function(u) {
          return o(u.value);
        }), (a = this._ctx).isMatch = Cn(a.isMatch, o), this;
      }, St.prototype.and = function(o) {
        return this.filter(o);
      }, St.prototype.or = function(o) {
        return new this.db.WhereClause(this._ctx.table, o, this);
      }, St.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, St.prototype.desc = function() {
        return this.reverse();
      }, St.prototype.eachKey = function(o) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(u, d) {
          o(d.key, d);
        });
      }, St.prototype.eachUniqueKey = function(o) {
        return this._ctx.unique = "unique", this.eachKey(o);
      }, St.prototype.eachPrimaryKey = function(o) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(u, d) {
          o(d.primaryKey, d);
        });
      }, St.prototype.keys = function(o) {
        var a = this._ctx;
        a.keysOnly = !a.isMatch;
        var u = [];
        return this.each(function(d, h) {
          u.push(h.key);
        }).then(function() {
          return u;
        }).then(o);
      }, St.prototype.primaryKeys = function(o) {
        var a = this._ctx;
        if (a.dir === "next" && Wn(a, !0) && 0 < a.limit) return this._read(function(d) {
          var h = lo(a, a.table.core.schema);
          return a.table.core.query({ trans: d, values: !1, limit: a.limit, query: { index: h, range: a.range } });
        }).then(function(d) {
          return d.result;
        }).then(o);
        a.keysOnly = !a.isMatch;
        var u = [];
        return this.each(function(d, h) {
          u.push(h.primaryKey);
        }).then(function() {
          return u;
        }).then(o);
      }, St.prototype.uniqueKeys = function(o) {
        return this._ctx.unique = "unique", this.keys(o);
      }, St.prototype.firstKey = function(o) {
        return this.limit(1).keys(function(a) {
          return a[0];
        }).then(o);
      }, St.prototype.lastKey = function(o) {
        return this.reverse().firstKey(o);
      }, St.prototype.distinct = function() {
        var o = this._ctx, o = o.index && o.table.schema.idxByName[o.index];
        if (!o || !o.multi) return this;
        var a = {};
        return Oi(this._ctx, function(h) {
          var d = h.primaryKey.toString(), h = w(a, d);
          return a[d] = !0, !h;
        }), this;
      }, St.prototype.modify = function(o) {
        var a = this, u = this._ctx;
        return this._write(function(d) {
          var h, y, m;
          m = typeof o == "function" ? o : (h = c(o), y = h.length, function(_) {
            for (var R = !1, P = 0; P < y; ++P) {
              var L = h[P], M = o[L], j = tt(_, L);
              M instanceof vr ? (A(_, L, M.execute(j)), R = !0) : j !== M && (A(_, L, M), R = !0);
            }
            return R;
          });
          var v = u.table.core, x = v.schema.primaryKey, S = x.outbound, I = x.extractKey, N = 200, x = a.db._options.modifyChunkSize;
          x && (N = typeof x == "object" ? x[v.name] || x["*"] || 200 : x);
          function U(_, L) {
            var P = L.failures, L = L.numFailures;
            B += _ - L;
            for (var M = 0, j = c(P); M < j.length; M++) {
              var X = j[M];
              T.push(P[X]);
            }
          }
          var T = [], B = 0, C = [];
          return a.clone().primaryKeys().then(function(_) {
            function R(L) {
              var M = Math.min(N, _.length - L);
              return v.getMany({ trans: d, keys: _.slice(L, L + M), cache: "immutable" }).then(function(j) {
                for (var X = [], q = [], W = S ? [] : null, J = [], Z = 0; Z < M; ++Z) {
                  var rt = j[Z], gt = { value: ct(rt), primKey: _[L + Z] };
                  m.call(gt, gt.value, gt) !== !1 && (gt.value == null ? J.push(_[L + Z]) : S || vt(I(rt), I(gt.value)) === 0 ? (q.push(gt.value), S && W.push(_[L + Z])) : (J.push(_[L + Z]), X.push(gt.value)));
                }
                return Promise.resolve(0 < X.length && v.mutate({ trans: d, type: "add", values: X }).then(function(wt) {
                  for (var mt in wt.failures) J.splice(parseInt(mt), 1);
                  U(X.length, wt);
                })).then(function() {
                  return (0 < q.length || P && typeof o == "object") && v.mutate({ trans: d, type: "put", keys: W, values: q, criteria: P, changeSpec: typeof o != "function" && o, isAdditionalChunk: 0 < L }).then(function(wt) {
                    return U(q.length, wt);
                  });
                }).then(function() {
                  return (0 < J.length || P && o === Pi) && v.mutate({ trans: d, type: "delete", keys: J, criteria: P, isAdditionalChunk: 0 < L }).then(function(wt) {
                    return U(J.length, wt);
                  });
                }).then(function() {
                  return _.length > L + M && R(L + N);
                });
              });
            }
            var P = Wn(u) && u.limit === 1 / 0 && (typeof o != "function" || o === Pi) && { index: u.index, range: u.range };
            return R(0).then(function() {
              if (0 < T.length) throw new Dt("Error modifying one or more objects", T, B, C);
              return _.length;
            });
          });
        });
      }, St.prototype.delete = function() {
        var o = this._ctx, a = o.range;
        return Wn(o) && (o.isPrimKey || a.type === 3) ? this._write(function(u) {
          var d = o.table.core.schema.primaryKey, h = a;
          return o.table.core.count({ trans: u, query: { index: d, range: h } }).then(function(y) {
            return o.table.core.mutate({ trans: u, type: "deleteRange", range: h }).then(function(m) {
              var v = m.failures;
              if (m.lastResult, m.results, m = m.numFailures, m) throw new Dt("Could not delete some values", Object.keys(v).map(function(S) {
                return v[S];
              }), y - m);
              return y - m;
            });
          });
        }) : this.modify(Pi);
      }, St);
      function St() {
      }
      var Pi = function(o, a) {
        return a.value = null;
      };
      function jf(o, a) {
        return o < a ? -1 : o === a ? 0 : 1;
      }
      function qf(o, a) {
        return a < o ? -1 : o === a ? 0 : 1;
      }
      function Ee(o, a, u) {
        return o = o instanceof Wa ? new o.Collection(o) : o, o._ctx.error = new (u || TypeError)(a), o;
      }
      function Gn(o) {
        return new o.Collection(o, function() {
          return za("");
        }).limit(0);
      }
      function po(o, a, u, d) {
        var h, y, m, v, S, I, N, x = u.length;
        if (!u.every(function(B) {
          return typeof B == "string";
        })) return Ee(o, $a);
        function U(B) {
          h = B === "next" ? function(_) {
            return _.toUpperCase();
          } : function(_) {
            return _.toLowerCase();
          }, y = B === "next" ? function(_) {
            return _.toLowerCase();
          } : function(_) {
            return _.toUpperCase();
          }, m = B === "next" ? jf : qf;
          var C = u.map(function(_) {
            return { lower: y(_), upper: h(_) };
          }).sort(function(_, R) {
            return m(_.lower, R.lower);
          });
          v = C.map(function(_) {
            return _.upper;
          }), S = C.map(function(_) {
            return _.lower;
          }), N = (I = B) === "next" ? "" : d;
        }
        U("next"), o = new o.Collection(o, function() {
          return hn(v[0], S[x - 1] + d);
        }), o._ondirectionchange = function(B) {
          U(B);
        };
        var T = 0;
        return o._addAlgorithm(function(B, C, _) {
          var R = B.key;
          if (typeof R != "string") return !1;
          var P = y(R);
          if (a(P, S, T)) return !0;
          for (var L = null, M = T; M < x; ++M) {
            var j = function(X, q, W, J, Z, rt) {
              for (var gt = Math.min(X.length, J.length), wt = -1, mt = 0; mt < gt; ++mt) {
                var Se = q[mt];
                if (Se !== J[mt]) return Z(X[mt], W[mt]) < 0 ? X.substr(0, mt) + W[mt] + W.substr(mt + 1) : Z(X[mt], J[mt]) < 0 ? X.substr(0, mt) + J[mt] + W.substr(mt + 1) : 0 <= wt ? X.substr(0, wt) + q[wt] + W.substr(wt + 1) : null;
                Z(X[mt], Se) < 0 && (wt = mt);
              }
              return gt < J.length && rt === "next" ? X + W.substr(X.length) : gt < X.length && rt === "prev" ? X.substr(0, W.length) : wt < 0 ? null : X.substr(0, wt) + J[wt] + W.substr(wt + 1);
            }(R, P, v[M], S[M], m, I);
            j === null && L === null ? T = M + 1 : (L === null || 0 < m(L, j)) && (L = j);
          }
          return C(L !== null ? function() {
            B.continue(L + N);
          } : _), !1;
        }), o;
      }
      function hn(o, a, u, d) {
        return { type: 2, lower: o, upper: a, lowerOpen: u, upperOpen: d };
      }
      function za(o) {
        return { type: 1, lower: o, upper: o };
      }
      var Wa = (Object.defineProperty(zt.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), zt.prototype.between = function(o, a, u, d) {
        u = u !== !1, d = d === !0;
        try {
          return 0 < this._cmp(o, a) || this._cmp(o, a) === 0 && (u || d) && (!u || !d) ? Gn(this) : new this.Collection(this, function() {
            return hn(o, a, !u, !d);
          });
        } catch {
          return Ee(this, Ze);
        }
      }, zt.prototype.equals = function(o) {
        return o == null ? Ee(this, Ze) : new this.Collection(this, function() {
          return za(o);
        });
      }, zt.prototype.above = function(o) {
        return o == null ? Ee(this, Ze) : new this.Collection(this, function() {
          return hn(o, void 0, !0);
        });
      }, zt.prototype.aboveOrEqual = function(o) {
        return o == null ? Ee(this, Ze) : new this.Collection(this, function() {
          return hn(o, void 0, !1);
        });
      }, zt.prototype.below = function(o) {
        return o == null ? Ee(this, Ze) : new this.Collection(this, function() {
          return hn(void 0, o, !1, !0);
        });
      }, zt.prototype.belowOrEqual = function(o) {
        return o == null ? Ee(this, Ze) : new this.Collection(this, function() {
          return hn(void 0, o);
        });
      }, zt.prototype.startsWith = function(o) {
        return typeof o != "string" ? Ee(this, $a) : this.between(o, o + Nn, !0, !0);
      }, zt.prototype.startsWithIgnoreCase = function(o) {
        return o === "" ? this.startsWith(o) : po(this, function(a, u) {
          return a.indexOf(u[0]) === 0;
        }, [o], Nn);
      }, zt.prototype.equalsIgnoreCase = function(o) {
        return po(this, function(a, u) {
          return a === u[0];
        }, [o], "");
      }, zt.prototype.anyOfIgnoreCase = function() {
        var o = ft.apply(ut, arguments);
        return o.length === 0 ? Gn(this) : po(this, function(a, u) {
          return u.indexOf(a) !== -1;
        }, o, "");
      }, zt.prototype.startsWithAnyOfIgnoreCase = function() {
        var o = ft.apply(ut, arguments);
        return o.length === 0 ? Gn(this) : po(this, function(a, u) {
          return u.some(function(d) {
            return a.indexOf(d) === 0;
          });
        }, o, Nn);
      }, zt.prototype.anyOf = function() {
        var o = this, a = ft.apply(ut, arguments), u = this._cmp;
        try {
          a.sort(u);
        } catch {
          return Ee(this, Ze);
        }
        if (a.length === 0) return Gn(this);
        var d = new this.Collection(this, function() {
          return hn(a[0], a[a.length - 1]);
        });
        d._ondirectionchange = function(y) {
          u = y === "next" ? o._ascending : o._descending, a.sort(u);
        };
        var h = 0;
        return d._addAlgorithm(function(y, m, v) {
          for (var S = y.key; 0 < u(S, a[h]); ) if (++h === a.length) return m(v), !1;
          return u(S, a[h]) === 0 || (m(function() {
            y.continue(a[h]);
          }), !1);
        }), d;
      }, zt.prototype.notEqual = function(o) {
        return this.inAnyRange([[-1 / 0, o], [o, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, zt.prototype.noneOf = function() {
        var o = ft.apply(ut, arguments);
        if (o.length === 0) return new this.Collection(this);
        try {
          o.sort(this._ascending);
        } catch {
          return Ee(this, Ze);
        }
        var a = o.reduce(function(u, d) {
          return u ? u.concat([[u[u.length - 1][1], d]]) : [[-1 / 0, d]];
        }, null);
        return a.push([o[o.length - 1], this.db._maxKey]), this.inAnyRange(a, { includeLowers: !1, includeUppers: !1 });
      }, zt.prototype.inAnyRange = function(R, a) {
        var u = this, d = this._cmp, h = this._ascending, y = this._descending, m = this._min, v = this._max;
        if (R.length === 0) return Gn(this);
        if (!R.every(function(P) {
          return P[0] !== void 0 && P[1] !== void 0 && h(P[0], P[1]) <= 0;
        })) return Ee(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", ot.InvalidArgument);
        var S = !a || a.includeLowers !== !1, I = a && a.includeUppers === !0, N, x = h;
        function U(P, L) {
          return x(P[0], L[0]);
        }
        try {
          (N = R.reduce(function(P, L) {
            for (var M = 0, j = P.length; M < j; ++M) {
              var X = P[M];
              if (d(L[0], X[1]) < 0 && 0 < d(L[1], X[0])) {
                X[0] = m(X[0], L[0]), X[1] = v(X[1], L[1]);
                break;
              }
            }
            return M === j && P.push(L), P;
          }, [])).sort(U);
        } catch {
          return Ee(this, Ze);
        }
        var T = 0, B = I ? function(P) {
          return 0 < h(P, N[T][1]);
        } : function(P) {
          return 0 <= h(P, N[T][1]);
        }, C = S ? function(P) {
          return 0 < y(P, N[T][0]);
        } : function(P) {
          return 0 <= y(P, N[T][0]);
        }, _ = B, R = new this.Collection(this, function() {
          return hn(N[0][0], N[N.length - 1][1], !S, !I);
        });
        return R._ondirectionchange = function(P) {
          x = P === "next" ? (_ = B, h) : (_ = C, y), N.sort(U);
        }, R._addAlgorithm(function(P, L, M) {
          for (var j, X = P.key; _(X); ) if (++T === N.length) return L(M), !1;
          return !B(j = X) && !C(j) || (u._cmp(X, N[T][1]) === 0 || u._cmp(X, N[T][0]) === 0 || L(function() {
            x === h ? P.continue(N[T][0]) : P.continue(N[T][1]);
          }), !1);
        }), R;
      }, zt.prototype.startsWithAnyOf = function() {
        var o = ft.apply(ut, arguments);
        return o.every(function(a) {
          return typeof a == "string";
        }) ? o.length === 0 ? Gn(this) : this.inAnyRange(o.map(function(a) {
          return [a, a + Nn];
        })) : Ee(this, "startsWithAnyOf() only works with strings");
      }, zt);
      function zt() {
      }
      function He(o) {
        return Ct(function(a) {
          return xr(a), o(a.target.error), !1;
        });
      }
      function xr(o) {
        o.stopPropagation && o.stopPropagation(), o.preventDefault && o.preventDefault();
      }
      var Er = "storagemutated", Li = "x-storagemutated-1", pn = mr(null, Er), zf = (je.prototype._lock = function() {
        return D(!it.global), ++this._reculock, this._reculock !== 1 || it.global || (it.lockOwnerFor = this), this;
      }, je.prototype._unlock = function() {
        if (D(!it.global), --this._reculock == 0) for (it.global || (it.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var o = this._blockedFuncs.shift();
          try {
            Bn(o[1], o[0]);
          } catch {
          }
        }
        return this;
      }, je.prototype._locked = function() {
        return this._reculock && it.lockOwnerFor !== this;
      }, je.prototype.create = function(o) {
        var a = this;
        if (!this.mode) return this;
        var u = this.db.idbdb, d = this.db._state.dbOpenError;
        if (D(!this.idbtrans), !o && !u) switch (d && d.name) {
          case "DatabaseClosedError":
            throw new ot.DatabaseClosed(d);
          case "MissingAPIError":
            throw new ot.MissingAPI(d.message, d);
          default:
            throw new ot.OpenFailed(d);
        }
        if (!this.active) throw new ot.TransactionInactive();
        return D(this._completion._state === null), (o = this.idbtrans = o || (this.db.core || u).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Ct(function(h) {
          xr(h), a._reject(o.error);
        }), o.onabort = Ct(function(h) {
          xr(h), a.active && a._reject(new ot.Abort(o.error)), a.active = !1, a.on("abort").fire(h);
        }), o.oncomplete = Ct(function() {
          a.active = !1, a._resolve(), "mutatedParts" in o && pn.storagemutated.fire(o.mutatedParts);
        }), this;
      }, je.prototype._promise = function(o, a, u) {
        var d = this;
        if (o === "readwrite" && this.mode !== "readwrite") return Pt(new ot.ReadOnly("Transaction is readonly"));
        if (!this.active) return Pt(new ot.TransactionInactive());
        if (this._locked()) return new et(function(y, m) {
          d._blockedFuncs.push([function() {
            d._promise(o, a, u).then(y, m);
          }, it]);
        });
        if (u) return fn(function() {
          var y = new et(function(m, v) {
            d._lock();
            var S = a(m, v, d);
            S && S.then && S.then(m, v);
          });
          return y.finally(function() {
            return d._unlock();
          }), y._lib = !0, y;
        });
        var h = new et(function(y, m) {
          var v = a(y, m, d);
          v && v.then && v.then(y, m);
        });
        return h._lib = !0, h;
      }, je.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, je.prototype.waitFor = function(o) {
        var a, u = this._root(), d = et.resolve(o);
        u._waitingFor ? u._waitingFor = u._waitingFor.then(function() {
          return d;
        }) : (u._waitingFor = d, u._waitingQueue = [], a = u.idbtrans.objectStore(u.storeNames[0]), function y() {
          for (++u._spinCount; u._waitingQueue.length; ) u._waitingQueue.shift()();
          u._waitingFor && (a.get(-1 / 0).onsuccess = y);
        }());
        var h = u._waitingFor;
        return new et(function(y, m) {
          d.then(function(v) {
            return u._waitingQueue.push(Ct(y.bind(null, v)));
          }, function(v) {
            return u._waitingQueue.push(Ct(m.bind(null, v)));
          }).finally(function() {
            u._waitingFor === h && (u._waitingFor = null);
          });
        });
      }, je.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new ot.Abort()));
      }, je.prototype.table = function(o) {
        var a = this._memoizedTables || (this._memoizedTables = {});
        if (w(a, o)) return a[o];
        var u = this.schema[o];
        if (!u) throw new ot.NotFound("Table " + o + " not part of transaction");
        return u = new this.db.Table(o, u, this), u.core = this.db.core.table(o), a[o] = u;
      }, je);
      function je() {
      }
      function $i(o, a, u, d, h, y, m) {
        return { name: o, keyPath: a, unique: u, multi: d, auto: h, compound: y, src: (u && !m ? "&" : "") + (d ? "*" : "") + (h ? "++" : "") + Ga(a) };
      }
      function Ga(o) {
        return typeof o == "string" ? o : o ? "[" + [].join.call(o, "+") + "]" : "";
      }
      function Di(o, a, u) {
        return { name: o, primKey: a, indexes: u, mappedClass: null, idxByName: (d = function(h) {
          return [h.name, h];
        }, u.reduce(function(h, y, m) {
          return m = d(y, m), m && (h[m[0]] = m[1]), h;
        }, {})) };
        var d;
      }
      var Sr = function(o) {
        try {
          return o.only([[]]), Sr = function() {
            return [[]];
          }, [[]];
        } catch {
          return Sr = function() {
            return Nn;
          }, Nn;
        }
      };
      function Ki(o) {
        return o == null ? function() {
        } : typeof o == "string" ? (a = o).split(".").length === 1 ? function(u) {
          return u[a];
        } : function(u) {
          return tt(u, a);
        } : function(u) {
          return tt(u, o);
        };
        var a;
      }
      function Ya(o) {
        return [].slice.call(o);
      }
      var Wf = 0;
      function Tr(o) {
        return o == null ? ":id" : typeof o == "string" ? o : "[".concat(o.join("+"), "]");
      }
      function Gf(o, a, S) {
        function d(_) {
          if (_.type === 3) return null;
          if (_.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var T = _.lower, B = _.upper, C = _.lowerOpen, _ = _.upperOpen;
          return T === void 0 ? B === void 0 ? null : a.upperBound(B, !!_) : B === void 0 ? a.lowerBound(T, !!C) : a.bound(T, B, !!C, !!_);
        }
        function h(U) {
          var T, B = U.name;
          return { name: B, schema: U, mutate: function(C) {
            var _ = C.trans, R = C.type, P = C.keys, L = C.values, M = C.range;
            return new Promise(function(j, X) {
              j = Ct(j);
              var q = _.objectStore(B), W = q.keyPath == null, J = R === "put" || R === "add";
              if (!J && R !== "delete" && R !== "deleteRange") throw new Error("Invalid operation type: " + R);
              var Z, rt = (P || L || { length: 1 }).length;
              if (P && L && P.length !== L.length) throw new Error("Given keys array must have same length as given values array.");
              if (rt === 0) return j({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function gt(ae) {
                ++Se, xr(ae);
              }
              var wt = [], mt = [], Se = 0;
              if (R === "deleteRange") {
                if (M.type === 4) return j({ numFailures: Se, failures: mt, results: [], lastResult: void 0 });
                M.type === 3 ? wt.push(Z = q.clear()) : wt.push(Z = q.delete(d(M)));
              } else {
                var W = J ? W ? [L, P] : [L, null] : [P, null], pt = W[0], ne = W[1];
                if (J) for (var re = 0; re < rt; ++re) wt.push(Z = ne && ne[re] !== void 0 ? q[R](pt[re], ne[re]) : q[R](pt[re])), Z.onerror = gt;
                else for (re = 0; re < rt; ++re) wt.push(Z = q[R](pt[re])), Z.onerror = gt;
              }
              function Io(ae) {
                ae = ae.target.result, wt.forEach(function(Rn, rs) {
                  return Rn.error != null && (mt[rs] = Rn.error);
                }), j({ numFailures: Se, failures: mt, results: R === "delete" ? P : wt.map(function(Rn) {
                  return Rn.result;
                }), lastResult: ae });
              }
              Z.onerror = function(ae) {
                gt(ae), Io(ae);
              }, Z.onsuccess = Io;
            });
          }, getMany: function(C) {
            var _ = C.trans, R = C.keys;
            return new Promise(function(P, L) {
              P = Ct(P);
              for (var M, j = _.objectStore(B), X = R.length, q = new Array(X), W = 0, J = 0, Z = function(wt) {
                wt = wt.target, q[wt._pos] = wt.result, ++J === W && P(q);
              }, rt = He(L), gt = 0; gt < X; ++gt) R[gt] != null && ((M = j.get(R[gt]))._pos = gt, M.onsuccess = Z, M.onerror = rt, ++W);
              W === 0 && P(q);
            });
          }, get: function(C) {
            var _ = C.trans, R = C.key;
            return new Promise(function(P, L) {
              P = Ct(P);
              var M = _.objectStore(B).get(R);
              M.onsuccess = function(j) {
                return P(j.target.result);
              }, M.onerror = He(L);
            });
          }, query: (T = I, function(C) {
            return new Promise(function(_, R) {
              _ = Ct(_);
              var P, L, M, W = C.trans, j = C.values, X = C.limit, Z = C.query, q = X === 1 / 0 ? void 0 : X, J = Z.index, Z = Z.range, W = W.objectStore(B), J = J.isPrimaryKey ? W : W.index(J.name), Z = d(Z);
              if (X === 0) return _({ result: [] });
              T ? ((q = j ? J.getAll(Z, q) : J.getAllKeys(Z, q)).onsuccess = function(rt) {
                return _({ result: rt.target.result });
              }, q.onerror = He(R)) : (P = 0, L = !j && "openKeyCursor" in J ? J.openKeyCursor(Z) : J.openCursor(Z), M = [], L.onsuccess = function(rt) {
                var gt = L.result;
                return gt ? (M.push(j ? gt.value : gt.primaryKey), ++P === X ? _({ result: M }) : void gt.continue()) : _({ result: M });
              }, L.onerror = He(R));
            });
          }), openCursor: function(C) {
            var _ = C.trans, R = C.values, P = C.query, L = C.reverse, M = C.unique;
            return new Promise(function(j, X) {
              j = Ct(j);
              var J = P.index, q = P.range, W = _.objectStore(B), W = J.isPrimaryKey ? W : W.index(J.name), J = L ? M ? "prevunique" : "prev" : M ? "nextunique" : "next", Z = !R && "openKeyCursor" in W ? W.openKeyCursor(d(q), J) : W.openCursor(d(q), J);
              Z.onerror = He(X), Z.onsuccess = Ct(function(rt) {
                var gt, wt, mt, Se, pt = Z.result;
                pt ? (pt.___id = ++Wf, pt.done = !1, gt = pt.continue.bind(pt), wt = (wt = pt.continuePrimaryKey) && wt.bind(pt), mt = pt.advance.bind(pt), Se = function() {
                  throw new Error("Cursor not stopped");
                }, pt.trans = _, pt.stop = pt.continue = pt.continuePrimaryKey = pt.advance = function() {
                  throw new Error("Cursor not started");
                }, pt.fail = Ct(X), pt.next = function() {
                  var ne = this, re = 1;
                  return this.start(function() {
                    return re-- ? ne.continue() : ne.stop();
                  }).then(function() {
                    return ne;
                  });
                }, pt.start = function(ne) {
                  function re() {
                    if (Z.result) try {
                      ne();
                    } catch (ae) {
                      pt.fail(ae);
                    }
                    else pt.done = !0, pt.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, pt.stop();
                  }
                  var Io = new Promise(function(ae, Rn) {
                    ae = Ct(ae), Z.onerror = He(Rn), pt.fail = Rn, pt.stop = function(rs) {
                      pt.stop = pt.continue = pt.continuePrimaryKey = pt.advance = Se, ae(rs);
                    };
                  });
                  return Z.onsuccess = Ct(function(ae) {
                    Z.onsuccess = re, re();
                  }), pt.continue = gt, pt.continuePrimaryKey = wt, pt.advance = mt, re(), Io;
                }, j(pt)) : j(null);
              }, X);
            });
          }, count: function(C) {
            var _ = C.query, R = C.trans, P = _.index, L = _.range;
            return new Promise(function(M, j) {
              var X = R.objectStore(B), q = P.isPrimaryKey ? X : X.index(P.name), X = d(L), q = X ? q.count(X) : q.count();
              q.onsuccess = Ct(function(W) {
                return M(W.target.result);
              }), q.onerror = He(j);
            });
          } };
        }
        var y, m, v, N = (m = S, v = Ya((y = o).objectStoreNames), { schema: { name: y.name, tables: v.map(function(U) {
          return m.objectStore(U);
        }).map(function(U) {
          var T = U.keyPath, _ = U.autoIncrement, B = f(T), C = {}, _ = { name: U.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: T == null, compound: B, keyPath: T, autoIncrement: _, unique: !0, extractKey: Ki(T) }, indexes: Ya(U.indexNames).map(function(R) {
            return U.index(R);
          }).map(function(M) {
            var P = M.name, L = M.unique, j = M.multiEntry, M = M.keyPath, j = { name: P, compound: f(M), keyPath: M, unique: L, multiEntry: j, extractKey: Ki(M) };
            return C[Tr(M)] = j;
          }), getIndexByKeyPath: function(R) {
            return C[Tr(R)];
          } };
          return C[":id"] = _.primaryKey, T != null && (C[Tr(T)] = _.primaryKey), _;
        }) }, hasGetAll: 0 < v.length && "getAll" in m.objectStore(v[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), S = N.schema, I = N.hasGetAll, N = S.tables.map(h), x = {};
        return N.forEach(function(U) {
          return x[U.name] = U;
        }), { stack: "dbcore", transaction: o.transaction.bind(o), table: function(U) {
          if (!x[U]) throw new Error("Table '".concat(U, "' not found"));
          return x[U];
        }, MIN_KEY: -1 / 0, MAX_KEY: Sr(a), schema: S };
      }
      function Yf(o, a, u, d) {
        var h = u.IDBKeyRange;
        return u.indexedDB, { dbcore: (d = Gf(a, h, d), o.dbcore.reduce(function(y, m) {
          return m = m.create, r(r({}, y), m(y));
        }, d)) };
      }
      function go(o, d) {
        var u = d.db, d = Yf(o._middlewares, u, o._deps, d);
        o.core = d.dbcore, o.tables.forEach(function(h) {
          var y = h.name;
          o.core.schema.tables.some(function(m) {
            return m.name === y;
          }) && (h.core = o.core.table(y), o[y] instanceof o.Table && (o[y].core = h.core));
        });
      }
      function yo(o, a, u, d) {
        u.forEach(function(h) {
          var y = d[h];
          a.forEach(function(m) {
            var v = function S(I, N) {
              return $(I, N) || (I = p(I)) && S(I, N);
            }(m, h);
            (!v || "value" in v && v.value === void 0) && (m === o.Transaction.prototype || m instanceof o.Transaction ? k(m, h, { get: function() {
              return this.table(h);
            }, set: function(S) {
              E(this, h, { value: S, writable: !0, configurable: !0, enumerable: !0 });
            } }) : m[h] = new o.Table(h, y));
          });
        });
      }
      function Mi(o, a) {
        a.forEach(function(u) {
          for (var d in u) u[d] instanceof o.Table && delete u[d];
        });
      }
      function Zf(o, a) {
        return o._cfg.version - a._cfg.version;
      }
      function Xf(o, a, u, d) {
        var h = o._dbSchema;
        u.objectStoreNames.contains("$meta") && !h.$meta && (h.$meta = Di("$meta", Xa("")[0], []), o._storeNames.push("$meta"));
        var y = o._createTransaction("readwrite", o._storeNames, h);
        y.create(u), y._completion.catch(d);
        var m = y._reject.bind(y), v = it.transless || it;
        fn(function() {
          return it.trans = y, it.transless = v, a !== 0 ? (go(o, u), I = a, ((S = y).storeNames.includes("$meta") ? S.table("$meta").get("version").then(function(N) {
            return N ?? I;
          }) : et.resolve(I)).then(function(N) {
            return U = N, T = y, B = u, C = [], N = (x = o)._versions, _ = x._dbSchema = mo(0, x.idbdb, B), (N = N.filter(function(R) {
              return R._cfg.version >= U;
            })).length !== 0 ? (N.forEach(function(R) {
              C.push(function() {
                var P = _, L = R._cfg.dbschema;
                bo(x, P, B), bo(x, L, B), _ = x._dbSchema = L;
                var M = Vi(P, L);
                M.add.forEach(function(J) {
                  Fi(B, J[0], J[1].primKey, J[1].indexes);
                }), M.change.forEach(function(J) {
                  if (J.recreate) throw new ot.Upgrade("Not yet support for changing primary key");
                  var Z = B.objectStore(J.name);
                  J.add.forEach(function(rt) {
                    return wo(Z, rt);
                  }), J.change.forEach(function(rt) {
                    Z.deleteIndex(rt.name), wo(Z, rt);
                  }), J.del.forEach(function(rt) {
                    return Z.deleteIndex(rt);
                  });
                });
                var j = R._cfg.contentUpgrade;
                if (j && R._cfg.version > U) {
                  go(x, B), T._memoizedTables = {};
                  var X = lt(L);
                  M.del.forEach(function(J) {
                    X[J] = P[J];
                  }), Mi(x, [x.Transaction.prototype]), yo(x, [x.Transaction.prototype], c(X), X), T.schema = X;
                  var q, W = Tt(j);
                  return W && qn(), M = et.follow(function() {
                    var J;
                    (q = j(T)) && W && (J = ln.bind(null, null), q.then(J, J));
                  }), q && typeof q.then == "function" ? et.resolve(q) : M.then(function() {
                    return q;
                  });
                }
              }), C.push(function(P) {
                var L, M, j = R._cfg.dbschema;
                L = j, M = P, [].slice.call(M.db.objectStoreNames).forEach(function(X) {
                  return L[X] == null && M.db.deleteObjectStore(X);
                }), Mi(x, [x.Transaction.prototype]), yo(x, [x.Transaction.prototype], x._storeNames, x._dbSchema), T.schema = x._dbSchema;
              }), C.push(function(P) {
                x.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(x.idbdb.version / 10) === R._cfg.version ? (x.idbdb.deleteObjectStore("$meta"), delete x._dbSchema.$meta, x._storeNames = x._storeNames.filter(function(L) {
                  return L !== "$meta";
                })) : P.objectStore("$meta").put(R._cfg.version, "version"));
              });
            }), function R() {
              return C.length ? et.resolve(C.shift()(T.idbtrans)).then(R) : et.resolve();
            }().then(function() {
              Za(_, B);
            })) : et.resolve();
            var x, U, T, B, C, _;
          }).catch(m)) : (c(h).forEach(function(N) {
            Fi(u, N, h[N].primKey, h[N].indexes);
          }), go(o, u), void et.follow(function() {
            return o.on.populate.fire(y);
          }).catch(m));
          var S, I;
        });
      }
      function Qf(o, a) {
        Za(o._dbSchema, a), a.db.version % 10 != 0 || a.objectStoreNames.contains("$meta") || a.db.createObjectStore("$meta").add(Math.ceil(a.db.version / 10 - 1), "version");
        var u = mo(0, o.idbdb, a);
        bo(o, o._dbSchema, a);
        for (var d = 0, h = Vi(u, o._dbSchema).change; d < h.length; d++) {
          var y = function(m) {
            if (m.change.length || m.recreate) return console.warn("Unable to patch indexes of table ".concat(m.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var v = a.objectStore(m.name);
            m.add.forEach(function(S) {
              Fe && console.debug("Dexie upgrade patch: Creating missing index ".concat(m.name, ".").concat(S.src)), wo(v, S);
            });
          }(h[d]);
          if (typeof y == "object") return y.value;
        }
      }
      function Vi(o, a) {
        var u, d = { del: [], add: [], change: [] };
        for (u in o) a[u] || d.del.push(u);
        for (u in a) {
          var h = o[u], y = a[u];
          if (h) {
            var m = { name: u, def: y, recreate: !1, del: [], add: [], change: [] };
            if ("" + (h.primKey.keyPath || "") != "" + (y.primKey.keyPath || "") || h.primKey.auto !== y.primKey.auto) m.recreate = !0, d.change.push(m);
            else {
              var v = h.idxByName, S = y.idxByName, I = void 0;
              for (I in v) S[I] || m.del.push(I);
              for (I in S) {
                var N = v[I], x = S[I];
                N ? N.src !== x.src && m.change.push(x) : m.add.push(x);
              }
              (0 < m.del.length || 0 < m.add.length || 0 < m.change.length) && d.change.push(m);
            }
          } else d.add.push([u, y]);
        }
        return d;
      }
      function Fi(o, a, u, d) {
        var h = o.db.createObjectStore(a, u.keyPath ? { keyPath: u.keyPath, autoIncrement: u.auto } : { autoIncrement: u.auto });
        return d.forEach(function(y) {
          return wo(h, y);
        }), h;
      }
      function Za(o, a) {
        c(o).forEach(function(u) {
          a.db.objectStoreNames.contains(u) || (Fe && console.debug("Dexie: Creating missing table", u), Fi(a, u, o[u].primKey, o[u].indexes));
        });
      }
      function wo(o, a) {
        o.createIndex(a.name, a.keyPath, { unique: a.unique, multiEntry: a.multi });
      }
      function mo(o, a, u) {
        var d = {};
        return z(a.objectStoreNames, 0).forEach(function(h) {
          for (var y = u.objectStore(h), m = $i(Ga(I = y.keyPath), I || "", !0, !1, !!y.autoIncrement, I && typeof I != "string", !0), v = [], S = 0; S < y.indexNames.length; ++S) {
            var N = y.index(y.indexNames[S]), I = N.keyPath, N = $i(N.name, I, !!N.unique, !!N.multiEntry, !1, I && typeof I != "string", !1);
            v.push(N);
          }
          d[h] = Di(h, m, v);
        }), d;
      }
      function bo(o, a, u) {
        for (var d = u.db.objectStoreNames, h = 0; h < d.length; ++h) {
          var y = d[h], m = u.objectStore(y);
          o._hasGetAll = "getAll" in m;
          for (var v = 0; v < m.indexNames.length; ++v) {
            var S = m.indexNames[v], I = m.index(S).keyPath, N = typeof I == "string" ? I : "[" + z(I).join("+") + "]";
            !a[y] || (I = a[y].idxByName[N]) && (I.name = S, delete a[y].idxByName[N], a[y].idxByName[S] = I);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && s.WorkerGlobalScope && s instanceof s.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (o._hasGetAll = !1);
      }
      function Xa(o) {
        return o.split(",").map(function(a, u) {
          var d = (a = a.trim()).replace(/([&*]|\+\+)/g, ""), h = /^\[/.test(d) ? d.match(/^\[(.*)\]$/)[1].split("+") : d;
          return $i(d, h || null, /\&/.test(a), /\*/.test(a), /\+\+/.test(a), f(h), u === 0);
        });
      }
      var Jf = (vo.prototype._parseStoresSpec = function(o, a) {
        c(o).forEach(function(u) {
          if (o[u] !== null) {
            var d = Xa(o[u]), h = d.shift();
            if (h.unique = !0, h.multi) throw new ot.Schema("Primary key cannot be multi-valued");
            d.forEach(function(y) {
              if (y.auto) throw new ot.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!y.keyPath) throw new ot.Schema("Index must have a name and cannot be an empty string");
            }), a[u] = Di(u, h, d);
          }
        });
      }, vo.prototype.stores = function(u) {
        var a = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? l(this._cfg.storesSource, u) : u;
        var u = a._versions, d = {}, h = {};
        return u.forEach(function(y) {
          l(d, y._cfg.storesSource), h = y._cfg.dbschema = {}, y._parseStoresSpec(d, h);
        }), a._dbSchema = h, Mi(a, [a._allTables, a, a.Transaction.prototype]), yo(a, [a._allTables, a, a.Transaction.prototype, this._cfg.tables], c(h), h), a._storeNames = c(h), this;
      }, vo.prototype.upgrade = function(o) {
        return this._cfg.contentUpgrade = Ei(this._cfg.contentUpgrade || Et, o), this;
      }, vo);
      function vo() {
      }
      function Hi(o, a) {
        var u = o._dbNamesDB;
        return u || (u = o._dbNamesDB = new Xe(uo, { addons: [], indexedDB: o, IDBKeyRange: a })).version(1).stores({ dbnames: "name" }), u.table("dbnames");
      }
      function ji(o) {
        return o && typeof o.databases == "function";
      }
      function qi(o) {
        return fn(function() {
          return it.letThrough = !0, o();
        });
      }
      function zi(o) {
        return !("from" in o);
      }
      var ee = function(o, a) {
        if (!this) {
          var u = new ee();
          return o && "d" in o && l(u, o), u;
        }
        l(this, arguments.length ? { d: 1, from: o, to: 1 < arguments.length ? a : o } : { d: 0 });
      };
      function kr(o, a, u) {
        var d = vt(a, u);
        if (!isNaN(d)) {
          if (0 < d) throw RangeError();
          if (zi(o)) return l(o, { from: a, to: u, d: 1 });
          var h = o.l, d = o.r;
          if (vt(u, o.from) < 0) return h ? kr(h, a, u) : o.l = { from: a, to: u, d: 1, l: null, r: null }, Ja(o);
          if (0 < vt(a, o.to)) return d ? kr(d, a, u) : o.r = { from: a, to: u, d: 1, l: null, r: null }, Ja(o);
          vt(a, o.from) < 0 && (o.from = a, o.l = null, o.d = d ? d.d + 1 : 1), 0 < vt(u, o.to) && (o.to = u, o.r = null, o.d = o.l ? o.l.d + 1 : 1), u = !o.r, h && !o.l && Ar(o, h), d && u && Ar(o, d);
        }
      }
      function Ar(o, a) {
        zi(a) || function u(d, S) {
          var y = S.from, m = S.to, v = S.l, S = S.r;
          kr(d, y, m), v && u(d, v), S && u(d, S);
        }(o, a);
      }
      function Qa(o, a) {
        var u = xo(a), d = u.next();
        if (d.done) return !1;
        for (var h = d.value, y = xo(o), m = y.next(h.from), v = m.value; !d.done && !m.done; ) {
          if (vt(v.from, h.to) <= 0 && 0 <= vt(v.to, h.from)) return !0;
          vt(h.from, v.from) < 0 ? h = (d = u.next(v.from)).value : v = (m = y.next(h.from)).value;
        }
        return !1;
      }
      function xo(o) {
        var a = zi(o) ? null : { s: 0, n: o };
        return { next: function(u) {
          for (var d = 0 < arguments.length; a; ) switch (a.s) {
            case 0:
              if (a.s = 1, d) for (; a.n.l && vt(u, a.n.from) < 0; ) a = { up: a, n: a.n.l, s: 1 };
              else for (; a.n.l; ) a = { up: a, n: a.n.l, s: 1 };
            case 1:
              if (a.s = 2, !d || vt(u, a.n.to) <= 0) return { value: a.n, done: !1 };
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
      function Ja(o) {
        var a, u, d = (((a = o.r) === null || a === void 0 ? void 0 : a.d) || 0) - (((u = o.l) === null || u === void 0 ? void 0 : u.d) || 0), h = 1 < d ? "r" : d < -1 ? "l" : "";
        h && (a = h == "r" ? "l" : "r", u = r({}, o), d = o[h], o.from = d.from, o.to = d.to, o[h] = d[h], u[h] = d[a], (o[a] = u).d = tc(u)), o.d = tc(o);
      }
      function tc(u) {
        var a = u.r, u = u.l;
        return (a ? u ? Math.max(a.d, u.d) : a.d : u ? u.d : 0) + 1;
      }
      function Eo(o, a) {
        return c(a).forEach(function(u) {
          o[u] ? Ar(o[u], a[u]) : o[u] = function d(h) {
            var y, m, v = {};
            for (y in h) w(h, y) && (m = h[y], v[y] = !m || typeof m != "object" || V.has(m.constructor) ? m : d(m));
            return v;
          }(a[u]);
        }), o;
      }
      function Wi(o, a) {
        return o.all || a.all || Object.keys(o).some(function(u) {
          return a[u] && Qa(a[u], o[u]);
        });
      }
      b(ee.prototype, ((Ae = { add: function(o) {
        return Ar(this, o), this;
      }, addKey: function(o) {
        return kr(this, o, o), this;
      }, addKeys: function(o) {
        var a = this;
        return o.forEach(function(u) {
          return kr(a, u, u);
        }), this;
      }, hasKey: function(o) {
        var a = xo(this).next(o).value;
        return a && vt(a.from, o) <= 0 && 0 <= vt(a.to, o);
      } })[Y] = function() {
        return xo(this);
      }, Ae));
      var Un = {}, Gi = {}, Yi = !1;
      function So(o) {
        Eo(Gi, o), Yi || (Yi = !0, setTimeout(function() {
          Yi = !1, Zi(Gi, !(Gi = {}));
        }, 0));
      }
      function Zi(o, a) {
        a === void 0 && (a = !1);
        var u = /* @__PURE__ */ new Set();
        if (o.all) for (var d = 0, h = Object.values(Un); d < h.length; d++) ec(m = h[d], o, u, a);
        else for (var y in o) {
          var m, v = /^idb\:\/\/(.*)\/(.*)\//.exec(y);
          v && (y = v[1], v = v[2], (m = Un["idb://".concat(y, "/").concat(v)]) && ec(m, o, u, a));
        }
        u.forEach(function(S) {
          return S();
        });
      }
      function ec(o, a, u, d) {
        for (var h = [], y = 0, m = Object.entries(o.queries.query); y < m.length; y++) {
          for (var v = m[y], S = v[0], I = [], N = 0, x = v[1]; N < x.length; N++) {
            var U = x[N];
            Wi(a, U.obsSet) ? U.subscribers.forEach(function(_) {
              return u.add(_);
            }) : d && I.push(U);
          }
          d && h.push([S, I]);
        }
        if (d) for (var T = 0, B = h; T < B.length; T++) {
          var C = B[T], S = C[0], I = C[1];
          o.queries.query[S] = I;
        }
      }
      function tl(o) {
        var a = o._state, u = o._deps.indexedDB;
        if (a.isBeingOpened || o.idbdb) return a.dbReadyPromise.then(function() {
          return a.dbOpenError ? Pt(a.dbOpenError) : o;
        });
        a.isBeingOpened = !0, a.dbOpenError = null, a.openComplete = !1;
        var d = a.openCanceller, h = Math.round(10 * o.verno), y = !1;
        function m() {
          if (a.openCanceller !== d) throw new ot.DatabaseClosed("db.open() was cancelled");
        }
        function v() {
          return new et(function(U, T) {
            if (m(), !u) throw new ot.MissingAPI();
            var B = o.name, C = a.autoSchema || !h ? u.open(B) : u.open(B, h);
            if (!C) throw new ot.MissingAPI();
            C.onerror = He(T), C.onblocked = Ct(o._fireOnBlocked), C.onupgradeneeded = Ct(function(_) {
              var R;
              N = C.transaction, a.autoSchema && !o._options.allowEmptyDB ? (C.onerror = xr, N.abort(), C.result.close(), (R = u.deleteDatabase(B)).onsuccess = R.onerror = Ct(function() {
                T(new ot.NoSuchDatabase("Database ".concat(B, " doesnt exist")));
              })) : (N.onerror = He(T), _ = _.oldVersion > Math.pow(2, 62) ? 0 : _.oldVersion, x = _ < 1, o.idbdb = C.result, y && Qf(o, N), Xf(o, _ / 10, N, T));
            }, T), C.onsuccess = Ct(function() {
              N = null;
              var _, R, P, L, M, j = o.idbdb = C.result, X = z(j.objectStoreNames);
              if (0 < X.length) try {
                var q = j.transaction((L = X).length === 1 ? L[0] : L, "readonly");
                if (a.autoSchema) R = j, P = q, (_ = o).verno = R.version / 10, P = _._dbSchema = mo(0, R, P), _._storeNames = z(R.objectStoreNames, 0), yo(_, [_._allTables], c(P), P);
                else if (bo(o, o._dbSchema, q), ((M = Vi(mo(0, (M = o).idbdb, q), M._dbSchema)).add.length || M.change.some(function(W) {
                  return W.add.length || W.change.length;
                })) && !y) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), j.close(), h = j.version + 1, y = !0, U(v());
                go(o, q);
              } catch {
              }
              zn.push(o), j.onversionchange = Ct(function(W) {
                a.vcFired = !0, o.on("versionchange").fire(W);
              }), j.onclose = Ct(function(W) {
                o.on("close").fire(W);
              }), x && (M = o._deps, q = B, j = M.indexedDB, M = M.IDBKeyRange, ji(j) || q === uo || Hi(j, M).put({ name: q }).catch(Et)), U();
            }, T);
          }).catch(function(U) {
            switch (U == null ? void 0 : U.name) {
              case "UnknownError":
                if (0 < a.PR1398_maxLoop) return a.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), v();
                break;
              case "VersionError":
                if (0 < h) return h = 0, v();
            }
            return et.reject(U);
          });
        }
        var S, I = a.dbReadyResolve, N = null, x = !1;
        return et.race([d, (typeof navigator > "u" ? et.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(U) {
          function T() {
            return indexedDB.databases().finally(U);
          }
          S = setInterval(T, 100), T();
        }).finally(function() {
          return clearInterval(S);
        }) : Promise.resolve()).then(v)]).then(function() {
          return m(), a.onReadyBeingFired = [], et.resolve(qi(function() {
            return o.on.ready.fire(o.vip);
          })).then(function U() {
            if (0 < a.onReadyBeingFired.length) {
              var T = a.onReadyBeingFired.reduce(Ei, Et);
              return a.onReadyBeingFired = [], et.resolve(qi(function() {
                return T(o.vip);
              })).then(U);
            }
          });
        }).finally(function() {
          a.openCanceller === d && (a.onReadyBeingFired = null, a.isBeingOpened = !1);
        }).catch(function(U) {
          a.dbOpenError = U;
          try {
            N && N.abort();
          } catch {
          }
          return d === a.openCanceller && o._close(), Pt(U);
        }).finally(function() {
          a.openComplete = !0, I();
        }).then(function() {
          var U;
          return x && (U = {}, o.tables.forEach(function(T) {
            T.schema.indexes.forEach(function(B) {
              B.name && (U["idb://".concat(o.name, "/").concat(T.name, "/").concat(B.name)] = new ee(-1 / 0, [[[]]]));
            }), U["idb://".concat(o.name, "/").concat(T.name, "/")] = U["idb://".concat(o.name, "/").concat(T.name, "/:dels")] = new ee(-1 / 0, [[[]]]);
          }), pn(Er).fire(U), Zi(U, !0)), o;
        });
      }
      function Xi(o) {
        function a(y) {
          return o.next(y);
        }
        var u = h(a), d = h(function(y) {
          return o.throw(y);
        });
        function h(y) {
          return function(S) {
            var v = y(S), S = v.value;
            return v.done ? S : S && typeof S.then == "function" ? S.then(u, d) : f(S) ? Promise.all(S).then(u, d) : u(S);
          };
        }
        return h(a)();
      }
      function To(o, a, u) {
        for (var d = f(o) ? o.slice() : [o], h = 0; h < u; ++h) d.push(a);
        return d;
      }
      var el = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(o) {
        return r(r({}, o), { table: function(a) {
          var u = o.table(a), d = u.schema, h = {}, y = [];
          function m(x, U, T) {
            var B = Tr(x), C = h[B] = h[B] || [], _ = x == null ? 0 : typeof x == "string" ? 1 : x.length, R = 0 < U, R = r(r({}, T), { name: R ? "".concat(B, "(virtual-from:").concat(T.name, ")") : T.name, lowLevelIndex: T, isVirtual: R, keyTail: U, keyLength: _, extractKey: Ki(x), unique: !R && T.unique });
            return C.push(R), R.isPrimaryKey || y.push(R), 1 < _ && m(_ === 2 ? x[0] : x.slice(0, _ - 1), U + 1, T), C.sort(function(P, L) {
              return P.keyTail - L.keyTail;
            }), R;
          }
          a = m(d.primaryKey.keyPath, 0, d.primaryKey), h[":id"] = [a];
          for (var v = 0, S = d.indexes; v < S.length; v++) {
            var I = S[v];
            m(I.keyPath, 0, I);
          }
          function N(x) {
            var U, T = x.query.index;
            return T.isVirtual ? r(r({}, x), { query: { index: T.lowLevelIndex, range: (U = x.query.range, T = T.keyTail, { type: U.type === 1 ? 2 : U.type, lower: To(U.lower, U.lowerOpen ? o.MAX_KEY : o.MIN_KEY, T), lowerOpen: !0, upper: To(U.upper, U.upperOpen ? o.MIN_KEY : o.MAX_KEY, T), upperOpen: !0 }) } }) : x;
          }
          return r(r({}, u), { schema: r(r({}, d), { primaryKey: a, indexes: y, getIndexByKeyPath: function(x) {
            return (x = h[Tr(x)]) && x[0];
          } }), count: function(x) {
            return u.count(N(x));
          }, query: function(x) {
            return u.query(N(x));
          }, openCursor: function(x) {
            var U = x.query.index, T = U.keyTail, B = U.isVirtual, C = U.keyLength;
            return B ? u.openCursor(N(x)).then(function(R) {
              return R && _(R);
            }) : u.openCursor(x);
            function _(R) {
              return Object.create(R, { continue: { value: function(P) {
                P != null ? R.continue(To(P, x.reverse ? o.MAX_KEY : o.MIN_KEY, T)) : x.unique ? R.continue(R.key.slice(0, C).concat(x.reverse ? o.MIN_KEY : o.MAX_KEY, T)) : R.continue();
              } }, continuePrimaryKey: { value: function(P, L) {
                R.continuePrimaryKey(To(P, o.MAX_KEY, T), L);
              } }, primaryKey: { get: function() {
                return R.primaryKey;
              } }, key: { get: function() {
                var P = R.key;
                return C === 1 ? P[0] : P.slice(0, C);
              } }, value: { get: function() {
                return R.value;
              } } });
            }
          } });
        } });
      } };
      function Qi(o, a, u, d) {
        return u = u || {}, d = d || "", c(o).forEach(function(h) {
          var y, m, v;
          w(a, h) ? (y = o[h], m = a[h], typeof y == "object" && typeof m == "object" && y && m ? (v = Q(y)) !== Q(m) ? u[d + h] = a[h] : v === "Object" ? Qi(y, m, u, d + h + ".") : y !== m && (u[d + h] = a[h]) : y !== m && (u[d + h] = a[h])) : u[d + h] = void 0;
        }), c(a).forEach(function(h) {
          w(o, h) || (u[d + h] = a[h]);
        }), u;
      }
      function Ji(o, a) {
        return a.type === "delete" ? a.keys : a.keys || a.values.map(o.extractKey);
      }
      var nl = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(o) {
        return r(r({}, o), { table: function(a) {
          var u = o.table(a), d = u.schema.primaryKey;
          return r(r({}, u), { mutate: function(h) {
            var y = it.trans, m = y.table(a).hook, v = m.deleting, S = m.creating, I = m.updating;
            switch (h.type) {
              case "add":
                if (S.fire === Et) break;
                return y._promise("readwrite", function() {
                  return N(h);
                }, !0);
              case "put":
                if (S.fire === Et && I.fire === Et) break;
                return y._promise("readwrite", function() {
                  return N(h);
                }, !0);
              case "delete":
                if (v.fire === Et) break;
                return y._promise("readwrite", function() {
                  return N(h);
                }, !0);
              case "deleteRange":
                if (v.fire === Et) break;
                return y._promise("readwrite", function() {
                  return function x(U, T, B) {
                    return u.query({ trans: U, values: !1, query: { index: d, range: T }, limit: B }).then(function(C) {
                      var _ = C.result;
                      return N({ type: "delete", keys: _, trans: U }).then(function(R) {
                        return 0 < R.numFailures ? Promise.reject(R.failures[0]) : _.length < B ? { failures: [], numFailures: 0, lastResult: void 0 } : x(U, r(r({}, T), { lower: _[_.length - 1], lowerOpen: !0 }), B);
                      });
                    });
                  }(h.trans, h.range, 1e4);
                }, !0);
            }
            return u.mutate(h);
            function N(x) {
              var U, T, B, C = it.trans, _ = x.keys || Ji(d, x);
              if (!_) throw new Error("Keys missing");
              return (x = x.type === "add" || x.type === "put" ? r(r({}, x), { keys: _ }) : r({}, x)).type !== "delete" && (x.values = i([], x.values)), x.keys && (x.keys = i([], x.keys)), U = u, B = _, ((T = x).type === "add" ? Promise.resolve([]) : U.getMany({ trans: T.trans, keys: B, cache: "immutable" })).then(function(R) {
                var P = _.map(function(L, M) {
                  var j, X, q, W = R[M], J = { onerror: null, onsuccess: null };
                  return x.type === "delete" ? v.fire.call(J, L, W, C) : x.type === "add" || W === void 0 ? (j = S.fire.call(J, L, x.values[M], C), L == null && j != null && (x.keys[M] = L = j, d.outbound || A(x.values[M], d.keyPath, L))) : (j = Qi(W, x.values[M]), (X = I.fire.call(J, j, L, W, C)) && (q = x.values[M], Object.keys(X).forEach(function(Z) {
                    w(q, Z) ? q[Z] = X[Z] : A(q, Z, X[Z]);
                  }))), J;
                });
                return u.mutate(x).then(function(L) {
                  for (var M = L.failures, j = L.results, X = L.numFailures, L = L.lastResult, q = 0; q < _.length; ++q) {
                    var W = (j || _)[q], J = P[q];
                    W == null ? J.onerror && J.onerror(M[q]) : J.onsuccess && J.onsuccess(x.type === "put" && R[q] ? x.values[q] : W);
                  }
                  return { failures: M, results: j, numFailures: X, lastResult: L };
                }).catch(function(L) {
                  return P.forEach(function(M) {
                    return M.onerror && M.onerror(L);
                  }), Promise.reject(L);
                });
              });
            }
          } });
        } });
      } };
      function nc(o, a, u) {
        try {
          if (!a || a.keys.length < o.length) return null;
          for (var d = [], h = 0, y = 0; h < a.keys.length && y < o.length; ++h) vt(a.keys[h], o[y]) === 0 && (d.push(u ? ct(a.values[h]) : a.values[h]), ++y);
          return d.length === o.length ? d : null;
        } catch {
          return null;
        }
      }
      var rl = { stack: "dbcore", level: -1, create: function(o) {
        return { table: function(a) {
          var u = o.table(a);
          return r(r({}, u), { getMany: function(d) {
            if (!d.cache) return u.getMany(d);
            var h = nc(d.keys, d.trans._cache, d.cache === "clone");
            return h ? et.resolve(h) : u.getMany(d).then(function(y) {
              return d.trans._cache = { keys: d.keys, values: d.cache === "clone" ? ct(y) : y }, y;
            });
          }, mutate: function(d) {
            return d.type !== "add" && (d.trans._cache = null), u.mutate(d);
          } });
        } };
      } };
      function rc(o, a) {
        return o.trans.mode === "readonly" && !!o.subscr && !o.trans.explicit && o.trans.db._options.cache !== "disabled" && !a.schema.primaryKey.outbound;
      }
      function oc(o, a) {
        switch (o) {
          case "query":
            return a.values && !a.unique;
          case "get":
          case "getMany":
          case "count":
          case "openCursor":
            return !1;
        }
      }
      var ol = { stack: "dbcore", level: 0, name: "Observability", create: function(o) {
        var a = o.schema.name, u = new ee(o.MIN_KEY, o.MAX_KEY);
        return r(r({}, o), { transaction: function(d, h, y) {
          if (it.subscr && h !== "readonly") throw new ot.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(it.querier));
          return o.transaction(d, h, y);
        }, table: function(d) {
          var h = o.table(d), y = h.schema, m = y.primaryKey, x = y.indexes, v = m.extractKey, S = m.outbound, I = m.autoIncrement && x.filter(function(T) {
            return T.compound && T.keyPath.includes(m.keyPath);
          }), N = r(r({}, h), { mutate: function(T) {
            function B(Z) {
              return Z = "idb://".concat(a, "/").concat(d, "/").concat(Z), L[Z] || (L[Z] = new ee());
            }
            var C, _, R, P = T.trans, L = T.mutatedParts || (T.mutatedParts = {}), M = B(""), j = B(":dels"), X = T.type, J = T.type === "deleteRange" ? [T.range] : T.type === "delete" ? [T.keys] : T.values.length < 50 ? [Ji(m, T).filter(function(Z) {
              return Z;
            }), T.values] : [], q = J[0], W = J[1], J = T.trans._cache;
            return f(q) ? (M.addKeys(q), (J = X === "delete" || q.length === W.length ? nc(q, J) : null) || j.addKeys(q), (J || W) && (C = B, _ = J, R = W, y.indexes.forEach(function(Z) {
              var rt = C(Z.name || "");
              function gt(mt) {
                return mt != null ? Z.extractKey(mt) : null;
              }
              function wt(mt) {
                return Z.multiEntry && f(mt) ? mt.forEach(function(Se) {
                  return rt.addKey(Se);
                }) : rt.addKey(mt);
              }
              (_ || R).forEach(function(mt, ne) {
                var pt = _ && gt(_[ne]), ne = R && gt(R[ne]);
                vt(pt, ne) !== 0 && (pt != null && wt(pt), ne != null && wt(ne));
              });
            }))) : q ? (W = { from: (W = q.lower) !== null && W !== void 0 ? W : o.MIN_KEY, to: (W = q.upper) !== null && W !== void 0 ? W : o.MAX_KEY }, j.add(W), M.add(W)) : (M.add(u), j.add(u), y.indexes.forEach(function(Z) {
              return B(Z.name).add(u);
            })), h.mutate(T).then(function(Z) {
              return !q || T.type !== "add" && T.type !== "put" || (M.addKeys(Z.results), I && I.forEach(function(rt) {
                for (var gt = T.values.map(function(pt) {
                  return rt.extractKey(pt);
                }), wt = rt.keyPath.findIndex(function(pt) {
                  return pt === m.keyPath;
                }), mt = 0, Se = Z.results.length; mt < Se; ++mt) gt[mt][wt] = Z.results[mt];
                B(rt.name).addKeys(gt);
              })), P.mutatedParts = Eo(P.mutatedParts || {}, L), Z;
            });
          } }), x = function(B) {
            var C = B.query, B = C.index, C = C.range;
            return [B, new ee((B = C.lower) !== null && B !== void 0 ? B : o.MIN_KEY, (C = C.upper) !== null && C !== void 0 ? C : o.MAX_KEY)];
          }, U = { get: function(T) {
            return [m, new ee(T.key)];
          }, getMany: function(T) {
            return [m, new ee().addKeys(T.keys)];
          }, count: x, query: x, openCursor: x };
          return c(U).forEach(function(T) {
            N[T] = function(B) {
              var C = it.subscr, _ = !!C, R = rc(it, h) && oc(T, B) ? B.obsSet = {} : C;
              if (_) {
                var P = function(W) {
                  return W = "idb://".concat(a, "/").concat(d, "/").concat(W), R[W] || (R[W] = new ee());
                }, L = P(""), M = P(":dels"), C = U[T](B), _ = C[0], C = C[1];
                if ((T === "query" && _.isPrimaryKey && !B.values ? M : P(_.name || "")).add(C), !_.isPrimaryKey) {
                  if (T !== "count") {
                    var j = T === "query" && S && B.values && h.query(r(r({}, B), { values: !1 }));
                    return h[T].apply(this, arguments).then(function(W) {
                      if (T === "query") {
                        if (S && B.values) return j.then(function(gt) {
                          return gt = gt.result, L.addKeys(gt), W;
                        });
                        var J = B.values ? W.result.map(v) : W.result;
                        (B.values ? L : M).addKeys(J);
                      } else if (T === "openCursor") {
                        var Z = W, rt = B.values;
                        return Z && Object.create(Z, { key: { get: function() {
                          return M.addKey(Z.primaryKey), Z.key;
                        } }, primaryKey: { get: function() {
                          var gt = Z.primaryKey;
                          return M.addKey(gt), gt;
                        } }, value: { get: function() {
                          return rt && L.addKey(Z.primaryKey), Z.value;
                        } } });
                      }
                      return W;
                    });
                  }
                  M.add(u);
                }
              }
              return h[T].apply(this, arguments);
            };
          }), N;
        } });
      } };
      function ic(o, a, u) {
        if (u.numFailures === 0) return a;
        if (a.type === "deleteRange") return null;
        var d = a.keys ? a.keys.length : "values" in a && a.values ? a.values.length : 1;
        return u.numFailures === d ? null : (a = r({}, a), f(a.keys) && (a.keys = a.keys.filter(function(h, y) {
          return !(y in u.failures);
        })), "values" in a && f(a.values) && (a.values = a.values.filter(function(h, y) {
          return !(y in u.failures);
        })), a);
      }
      function ts(o, a) {
        return u = o, ((d = a).lower === void 0 || (d.lowerOpen ? 0 < vt(u, d.lower) : 0 <= vt(u, d.lower))) && (o = o, (a = a).upper === void 0 || (a.upperOpen ? vt(o, a.upper) < 0 : vt(o, a.upper) <= 0));
        var u, d;
      }
      function sc(o, a, U, d, h, y) {
        if (!U || U.length === 0) return o;
        var m = a.query.index, v = m.multiEntry, S = a.query.range, I = d.schema.primaryKey.extractKey, N = m.extractKey, x = (m.lowLevelIndex || m).extractKey, U = U.reduce(function(T, B) {
          var C = T, _ = [];
          if (B.type === "add" || B.type === "put") for (var R = new ee(), P = B.values.length - 1; 0 <= P; --P) {
            var L, M = B.values[P], j = I(M);
            R.hasKey(j) || (L = N(M), (v && f(L) ? L.some(function(Z) {
              return ts(Z, S);
            }) : ts(L, S)) && (R.addKey(j), _.push(M)));
          }
          switch (B.type) {
            case "add":
              var X = new ee().addKeys(a.values ? T.map(function(rt) {
                return I(rt);
              }) : T), C = T.concat(a.values ? _.filter(function(rt) {
                return rt = I(rt), !X.hasKey(rt) && (X.addKey(rt), !0);
              }) : _.map(function(rt) {
                return I(rt);
              }).filter(function(rt) {
                return !X.hasKey(rt) && (X.addKey(rt), !0);
              }));
              break;
            case "put":
              var q = new ee().addKeys(B.values.map(function(rt) {
                return I(rt);
              }));
              C = T.filter(function(rt) {
                return !q.hasKey(a.values ? I(rt) : rt);
              }).concat(a.values ? _ : _.map(function(rt) {
                return I(rt);
              }));
              break;
            case "delete":
              var W = new ee().addKeys(B.keys);
              C = T.filter(function(rt) {
                return !W.hasKey(a.values ? I(rt) : rt);
              });
              break;
            case "deleteRange":
              var J = B.range;
              C = T.filter(function(rt) {
                return !ts(I(rt), J);
              });
          }
          return C;
        }, o);
        return U === o ? o : (U.sort(function(T, B) {
          return vt(x(T), x(B)) || vt(I(T), I(B));
        }), a.limit && a.limit < 1 / 0 && (U.length > a.limit ? U.length = a.limit : o.length === a.limit && U.length < a.limit && (h.dirty = !0)), y ? Object.freeze(U) : U);
      }
      function ac(o, a) {
        return vt(o.lower, a.lower) === 0 && vt(o.upper, a.upper) === 0 && !!o.lowerOpen == !!a.lowerOpen && !!o.upperOpen == !!a.upperOpen;
      }
      function il(o, a) {
        return function(u, d, h, y) {
          if (u === void 0) return d !== void 0 ? -1 : 0;
          if (d === void 0) return 1;
          if ((d = vt(u, d)) === 0) {
            if (h && y) return 0;
            if (h) return 1;
            if (y) return -1;
          }
          return d;
        }(o.lower, a.lower, o.lowerOpen, a.lowerOpen) <= 0 && 0 <= function(u, d, h, y) {
          if (u === void 0) return d !== void 0 ? 1 : 0;
          if (d === void 0) return -1;
          if ((d = vt(u, d)) === 0) {
            if (h && y) return 0;
            if (h) return -1;
            if (y) return 1;
          }
          return d;
        }(o.upper, a.upper, o.upperOpen, a.upperOpen);
      }
      function sl(o, a, u, d) {
        o.subscribers.add(u), d.addEventListener("abort", function() {
          var h, y;
          o.subscribers.delete(u), o.subscribers.size === 0 && (h = o, y = a, setTimeout(function() {
            h.subscribers.size === 0 && ht(y, h);
          }, 3e3));
        });
      }
      var al = { stack: "dbcore", level: 0, name: "Cache", create: function(o) {
        var a = o.schema.name;
        return r(r({}, o), { transaction: function(u, d, h) {
          var y, m, v = o.transaction(u, d, h);
          return d === "readwrite" && (m = (y = new AbortController()).signal, h = function(S) {
            return function() {
              if (y.abort(), d === "readwrite") {
                for (var I = /* @__PURE__ */ new Set(), N = 0, x = u; N < x.length; N++) {
                  var U = x[N], T = Un["idb://".concat(a, "/").concat(U)];
                  if (T) {
                    var B = o.table(U), C = T.optimisticOps.filter(function(rt) {
                      return rt.trans === v;
                    });
                    if (v._explicit && S && v.mutatedParts) for (var _ = 0, R = Object.values(T.queries.query); _ < R.length; _++) for (var P = 0, L = (X = R[_]).slice(); P < L.length; P++) Wi((q = L[P]).obsSet, v.mutatedParts) && (ht(X, q), q.subscribers.forEach(function(rt) {
                      return I.add(rt);
                    }));
                    else if (0 < C.length) {
                      T.optimisticOps = T.optimisticOps.filter(function(rt) {
                        return rt.trans !== v;
                      });
                      for (var M = 0, j = Object.values(T.queries.query); M < j.length; M++) for (var X, q, W, J = 0, Z = (X = j[M]).slice(); J < Z.length; J++) (q = Z[J]).res != null && v.mutatedParts && (S && !q.dirty ? (W = Object.isFrozen(q.res), W = sc(q.res, q.req, C, B, q, W), q.dirty ? (ht(X, q), q.subscribers.forEach(function(rt) {
                        return I.add(rt);
                      })) : W !== q.res && (q.res = W, q.promise = et.resolve({ result: W }))) : (q.dirty && ht(X, q), q.subscribers.forEach(function(rt) {
                        return I.add(rt);
                      })));
                    }
                  }
                }
                I.forEach(function(rt) {
                  return rt();
                });
              }
            };
          }, v.addEventListener("abort", h(!1), { signal: m }), v.addEventListener("error", h(!1), { signal: m }), v.addEventListener("complete", h(!0), { signal: m })), v;
        }, table: function(u) {
          var d = o.table(u), h = d.schema.primaryKey;
          return r(r({}, d), { mutate: function(y) {
            var m = it.trans;
            if (h.outbound || m.db._options.cache === "disabled" || m.explicit || m.idbtrans.mode !== "readwrite") return d.mutate(y);
            var v = Un["idb://".concat(a, "/").concat(u)];
            return v ? (m = d.mutate(y), y.type !== "add" && y.type !== "put" || !(50 <= y.values.length || Ji(h, y).some(function(S) {
              return S == null;
            })) ? (v.optimisticOps.push(y), y.mutatedParts && So(y.mutatedParts), m.then(function(S) {
              0 < S.numFailures && (ht(v.optimisticOps, y), (S = ic(0, y, S)) && v.optimisticOps.push(S), y.mutatedParts && So(y.mutatedParts));
            }), m.catch(function() {
              ht(v.optimisticOps, y), y.mutatedParts && So(y.mutatedParts);
            })) : m.then(function(S) {
              var I = ic(0, r(r({}, y), { values: y.values.map(function(N, x) {
                var U;
                return S.failures[x] ? N : (N = (U = h.keyPath) !== null && U !== void 0 && U.includes(".") ? ct(N) : r({}, N), A(N, h.keyPath, S.results[x]), N);
              }) }), S);
              v.optimisticOps.push(I), queueMicrotask(function() {
                return y.mutatedParts && So(y.mutatedParts);
              });
            }), m) : d.mutate(y);
          }, query: function(y) {
            if (!rc(it, d) || !oc("query", y)) return d.query(y);
            var m = ((I = it.trans) === null || I === void 0 ? void 0 : I.db._options.cache) === "immutable", x = it, v = x.requery, S = x.signal, I = function(B, C, _, R) {
              var P = Un["idb://".concat(B, "/").concat(C)];
              if (!P) return [];
              if (!(C = P.queries[_])) return [null, !1, P, null];
              var L = C[(R.query ? R.query.index.name : null) || ""];
              if (!L) return [null, !1, P, null];
              switch (_) {
                case "query":
                  var M = L.find(function(j) {
                    return j.req.limit === R.limit && j.req.values === R.values && ac(j.req.query.range, R.query.range);
                  });
                  return M ? [M, !0, P, L] : [L.find(function(j) {
                    return ("limit" in j.req ? j.req.limit : 1 / 0) >= R.limit && (!R.values || j.req.values) && il(j.req.query.range, R.query.range);
                  }), !1, P, L];
                case "count":
                  return M = L.find(function(j) {
                    return ac(j.req.query.range, R.query.range);
                  }), [M, !!M, P, L];
              }
            }(a, u, "query", y), N = I[0], x = I[1], U = I[2], T = I[3];
            return N && x ? N.obsSet = y.obsSet : (x = d.query(y).then(function(B) {
              var C = B.result;
              if (N && (N.res = C), m) {
                for (var _ = 0, R = C.length; _ < R; ++_) Object.freeze(C[_]);
                Object.freeze(C);
              } else B.result = ct(C);
              return B;
            }).catch(function(B) {
              return T && N && ht(T, N), Promise.reject(B);
            }), N = { obsSet: y.obsSet, promise: x, subscribers: /* @__PURE__ */ new Set(), type: "query", req: y, dirty: !1 }, T ? T.push(N) : (T = [N], (U = U || (Un["idb://".concat(a, "/").concat(u)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[y.query.index.name || ""] = T)), sl(N, T, v, S), N.promise.then(function(B) {
              return { result: sc(B.result, y, U == null ? void 0 : U.optimisticOps, d, N, m) };
            });
          } });
        } });
      } };
      function ko(o, a) {
        return new Proxy(o, { get: function(u, d, h) {
          return d === "db" ? a : Reflect.get(u, d, h);
        } });
      }
      var Xe = (Lt.prototype.version = function(o) {
        if (isNaN(o) || o < 0.1) throw new ot.Type("Given version is not a positive number");
        if (o = Math.round(10 * o) / 10, this.idbdb || this._state.isBeingOpened) throw new ot.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, o);
        var a = this._versions, u = a.filter(function(d) {
          return d._cfg.version === o;
        })[0];
        return u || (u = new this.Version(o), a.push(u), a.sort(Zf), u.stores({}), this._state.autoSchema = !1, u);
      }, Lt.prototype._whenReady = function(o) {
        var a = this;
        return this.idbdb && (this._state.openComplete || it.letThrough || this._vip) ? o() : new et(function(u, d) {
          if (a._state.openComplete) return d(new ot.DatabaseClosed(a._state.dbOpenError));
          if (!a._state.isBeingOpened) {
            if (!a._state.autoOpen) return void d(new ot.DatabaseClosed());
            a.open().catch(Et);
          }
          a._state.dbReadyPromise.then(u, d);
        }).then(o);
      }, Lt.prototype.use = function(o) {
        var a = o.stack, u = o.create, d = o.level, h = o.name;
        return h && this.unuse({ stack: a, name: h }), o = this._middlewares[a] || (this._middlewares[a] = []), o.push({ stack: a, create: u, level: d ?? 10, name: h }), o.sort(function(y, m) {
          return y.level - m.level;
        }), this;
      }, Lt.prototype.unuse = function(o) {
        var a = o.stack, u = o.name, d = o.create;
        return a && this._middlewares[a] && (this._middlewares[a] = this._middlewares[a].filter(function(h) {
          return d ? h.create !== d : !!u && h.name !== u;
        })), this;
      }, Lt.prototype.open = function() {
        var o = this;
        return Bn(un, function() {
          return tl(o);
        });
      }, Lt.prototype._close = function() {
        var o = this._state, a = zn.indexOf(this);
        if (0 <= a && zn.splice(a, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        o.isBeingOpened || (o.dbReadyPromise = new et(function(u) {
          o.dbReadyResolve = u;
        }), o.openCanceller = new et(function(u, d) {
          o.cancelOpen = d;
        }));
      }, Lt.prototype.close = function(u) {
        var a = (u === void 0 ? { disableAutoOpen: !0 } : u).disableAutoOpen, u = this._state;
        a ? (u.isBeingOpened && u.cancelOpen(new ot.DatabaseClosed()), this._close(), u.autoOpen = !1, u.dbOpenError = new ot.DatabaseClosed()) : (this._close(), u.autoOpen = this._options.autoOpen || u.isBeingOpened, u.openComplete = !1, u.dbOpenError = null);
      }, Lt.prototype.delete = function(o) {
        var a = this;
        o === void 0 && (o = { disableAutoOpen: !0 });
        var u = 0 < arguments.length && typeof arguments[0] != "object", d = this._state;
        return new et(function(h, y) {
          function m() {
            a.close(o);
            var v = a._deps.indexedDB.deleteDatabase(a.name);
            v.onsuccess = Ct(function() {
              var S, I, N;
              S = a._deps, I = a.name, N = S.indexedDB, S = S.IDBKeyRange, ji(N) || I === uo || Hi(N, S).delete(I).catch(Et), h();
            }), v.onerror = He(y), v.onblocked = a._fireOnBlocked;
          }
          if (u) throw new ot.InvalidArgument("Invalid closeOptions argument to db.delete()");
          d.isBeingOpened ? d.dbReadyPromise.then(m) : m();
        });
      }, Lt.prototype.backendDB = function() {
        return this.idbdb;
      }, Lt.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, Lt.prototype.hasBeenClosed = function() {
        var o = this._state.dbOpenError;
        return o && o.name === "DatabaseClosed";
      }, Lt.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, Lt.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(Lt.prototype, "tables", { get: function() {
        var o = this;
        return c(this._allTables).map(function(a) {
          return o._allTables[a];
        });
      }, enumerable: !1, configurable: !0 }), Lt.prototype.transaction = function() {
        var o = (function(a, u, d) {
          var h = arguments.length;
          if (h < 2) throw new ot.InvalidArgument("Too few arguments");
          for (var y = new Array(h - 1); --h; ) y[h - 1] = arguments[h];
          return d = y.pop(), [a, bt(y), d];
        }).apply(this, arguments);
        return this._transaction.apply(this, o);
      }, Lt.prototype._transaction = function(o, a, u) {
        var d = this, h = it.trans;
        h && h.db === this && o.indexOf("!") === -1 || (h = null);
        var y, m, v = o.indexOf("?") !== -1;
        o = o.replace("!", "").replace("?", "");
        try {
          if (m = a.map(function(I) {
            if (I = I instanceof d.Table ? I.name : I, typeof I != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return I;
          }), o == "r" || o === Ci) y = Ci;
          else {
            if (o != "rw" && o != Ui) throw new ot.InvalidArgument("Invalid transaction mode: " + o);
            y = Ui;
          }
          if (h) {
            if (h.mode === Ci && y === Ui) {
              if (!v) throw new ot.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              h = null;
            }
            h && m.forEach(function(I) {
              if (h && h.storeNames.indexOf(I) === -1) {
                if (!v) throw new ot.SubTransaction("Table " + I + " not included in parent transaction.");
                h = null;
              }
            }), v && h && !h.active && (h = null);
          }
        } catch (I) {
          return h ? h._promise(null, function(N, x) {
            x(I);
          }) : Pt(I);
        }
        var S = (function I(N, x, U, T, B) {
          return et.resolve().then(function() {
            var C = it.transless || it, _ = N._createTransaction(x, U, N._dbSchema, T);
            if (_.explicit = !0, C = { trans: _, transless: C }, T) _.idbtrans = T.idbtrans;
            else try {
              _.create(), _.idbtrans._explicit = !0, N._state.PR1398_maxLoop = 3;
            } catch (L) {
              return L.name === ke.InvalidState && N.isOpen() && 0 < --N._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), N.close({ disableAutoOpen: !1 }), N.open().then(function() {
                return I(N, x, U, null, B);
              })) : Pt(L);
            }
            var R, P = Tt(B);
            return P && qn(), C = et.follow(function() {
              var L;
              (R = B.call(_, _)) && (P ? (L = ln.bind(null, null), R.then(L, L)) : typeof R.next == "function" && typeof R.throw == "function" && (R = Xi(R)));
            }, C), (R && typeof R.then == "function" ? et.resolve(R).then(function(L) {
              return _.active ? L : Pt(new ot.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : C.then(function() {
              return R;
            })).then(function(L) {
              return T && _._resolve(), _._completion.then(function() {
                return L;
              });
            }).catch(function(L) {
              return _._reject(L), Pt(L);
            });
          });
        }).bind(null, this, y, m, h, u);
        return h ? h._promise(y, S, "lock") : it.trans ? Bn(it.transless, function() {
          return d._whenReady(S);
        }) : this._whenReady(S);
      }, Lt.prototype.table = function(o) {
        if (!w(this._allTables, o)) throw new ot.InvalidTable("Table ".concat(o, " does not exist"));
        return this._allTables[o];
      }, Lt);
      function Lt(o, a) {
        var u = this;
        this._middlewares = {}, this.verno = 0;
        var d = Lt.dependencies;
        this._options = a = r({ addons: Lt.addons, autoOpen: !0, indexedDB: d.indexedDB, IDBKeyRange: d.IDBKeyRange, cache: "cloned" }, a), this._deps = { indexedDB: a.indexedDB, IDBKeyRange: a.IDBKeyRange }, d = a.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var h, y, m, v, S, I = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: Et, dbReadyPromise: null, cancelOpen: Et, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: a.autoOpen };
        I.dbReadyPromise = new et(function(x) {
          I.dbReadyResolve = x;
        }), I.openCanceller = new et(function(x, U) {
          I.cancelOpen = U;
        }), this._state = I, this.name = o, this.on = mr(this, "populate", "blocked", "versionchange", "close", { ready: [Ei, Et] }), this.on.ready.subscribe = H(this.on.ready.subscribe, function(x) {
          return function(U, T) {
            Lt.vip(function() {
              var B, C = u._state;
              C.openComplete ? (C.dbOpenError || et.resolve().then(U), T && x(U)) : C.onReadyBeingFired ? (C.onReadyBeingFired.push(U), T && x(U)) : (x(U), B = u, T || x(function _() {
                B.on.ready.unsubscribe(U), B.on.ready.unsubscribe(_);
              }));
            });
          };
        }), this.Collection = (h = this, br(Hf.prototype, function(R, _) {
          this.db = h;
          var T = Da, B = null;
          if (_) try {
            T = _();
          } catch (P) {
            B = P;
          }
          var C = R._ctx, _ = C.table, R = _.hook.reading.fire;
          this._ctx = { table: _, index: C.index, isPrimKey: !C.index || _.schema.primKey.keyPath && C.index === _.schema.primKey.name, range: T, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: B, or: C.or, valueMapper: R !== ve ? R : null };
        })), this.Table = (y = this, br(Fa.prototype, function(x, U, T) {
          this.db = y, this._tx = T, this.name = x, this.schema = U, this.hook = y._allTables[x] ? y._allTables[x].hook : mr(null, { creating: [cn, Et], reading: [Tn, ve], updating: [Lf, Et], deleting: [Pf, Et] });
        })), this.Transaction = (m = this, br(zf.prototype, function(x, U, T, B, C) {
          var _ = this;
          this.db = m, this.mode = x, this.storeNames = U, this.schema = T, this.chromeTransactionDurability = B, this.idbtrans = null, this.on = mr(this, "complete", "error", "abort"), this.parent = C || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new et(function(R, P) {
            _._resolve = R, _._reject = P;
          }), this._completion.then(function() {
            _.active = !1, _.on.complete.fire();
          }, function(R) {
            var P = _.active;
            return _.active = !1, _.on.error.fire(R), _.parent ? _.parent._reject(R) : P && _.idbtrans && _.idbtrans.abort(), Pt(R);
          });
        })), this.Version = (v = this, br(Jf.prototype, function(x) {
          this.db = v, this._cfg = { version: x, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (S = this, br(Wa.prototype, function(x, U, T) {
          if (this.db = S, this._ctx = { table: x, index: U === ":id" ? null : U, or: T }, this._cmp = this._ascending = vt, this._descending = function(B, C) {
            return vt(C, B);
          }, this._max = function(B, C) {
            return 0 < vt(B, C) ? B : C;
          }, this._min = function(B, C) {
            return vt(B, C) < 0 ? B : C;
          }, this._IDBKeyRange = S._deps.IDBKeyRange, !this._IDBKeyRange) throw new ot.MissingAPI();
        })), this.on("versionchange", function(x) {
          0 < x.newVersion ? console.warn("Another connection wants to upgrade database '".concat(u.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(u.name, "'. Closing db now to resume the delete request.")), u.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(x) {
          !x.newVersion || x.newVersion < x.oldVersion ? console.warn("Dexie.delete('".concat(u.name, "') was blocked")) : console.warn("Upgrade '".concat(u.name, "' blocked by other connection holding version ").concat(x.oldVersion / 10));
        }), this._maxKey = Sr(a.IDBKeyRange), this._createTransaction = function(x, U, T, B) {
          return new u.Transaction(x, U, T, u._options.chromeTransactionDurability, B);
        }, this._fireOnBlocked = function(x) {
          u.on("blocked").fire(x), zn.filter(function(U) {
            return U.name === u.name && U !== u && !U._state.vcFired;
          }).map(function(U) {
            return U.on("versionchange").fire(x);
          });
        }, this.use(rl), this.use(al), this.use(ol), this.use(el), this.use(nl);
        var N = new Proxy(this, { get: function(x, U, T) {
          if (U === "_vip") return !0;
          if (U === "table") return function(C) {
            return ko(u.table(C), N);
          };
          var B = Reflect.get(x, U, T);
          return B instanceof Fa ? ko(B, N) : U === "tables" ? B.map(function(C) {
            return ko(C, N);
          }) : U === "_createTransaction" ? function() {
            return ko(B.apply(this, arguments), N);
          } : B;
        } });
        this.vip = N, d.forEach(function(x) {
          return x(u);
        });
      }
      var Ao, Ae = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", cl = (es.prototype.subscribe = function(o, a, u) {
        return this._subscribe(o && typeof o != "function" ? o : { next: o, error: a, complete: u });
      }, es.prototype[Ae] = function() {
        return this;
      }, es);
      function es(o) {
        this._subscribe = o;
      }
      try {
        Ao = { indexedDB: s.indexedDB || s.mozIndexedDB || s.webkitIndexedDB || s.msIndexedDB, IDBKeyRange: s.IDBKeyRange || s.webkitIDBKeyRange };
      } catch {
        Ao = { indexedDB: null, IDBKeyRange: null };
      }
      function cc(o) {
        var a, u = !1, d = new cl(function(h) {
          var y = Tt(o), m, v = !1, S = {}, I = {}, N = { get closed() {
            return v;
          }, unsubscribe: function() {
            v || (v = !0, m && m.abort(), x && pn.storagemutated.unsubscribe(T));
          } };
          h.start && h.start(N);
          var x = !1, U = function() {
            return Ni(B);
          }, T = function(C) {
            Eo(S, C), Wi(I, S) && U();
          }, B = function() {
            var C, _, R;
            !v && Ao.indexedDB && (S = {}, C = {}, m && m.abort(), m = new AbortController(), R = function(P) {
              var L = Hn();
              try {
                y && qn();
                var M = fn(o, P);
                return M = y ? M.finally(ln) : M;
              } finally {
                L && jn();
              }
            }(_ = { subscr: C, signal: m.signal, requery: U, querier: o, trans: null }), Promise.resolve(R).then(function(P) {
              u = !0, a = P, v || _.signal.aborted || (S = {}, function(L) {
                for (var M in L) if (w(L, M)) return;
                return 1;
              }(I = C) || x || (pn(Er, T), x = !0), Ni(function() {
                return !v && h.next && h.next(P);
              }));
            }, function(P) {
              u = !1, ["DatabaseClosedError", "AbortError"].includes(P == null ? void 0 : P.name) || v || Ni(function() {
                v || h.error && h.error(P);
              });
            }));
          };
          return setTimeout(U, 0), N;
        });
        return d.hasValue = function() {
          return u;
        }, d.getValue = function() {
          return a;
        }, d;
      }
      var On = Xe;
      function ns(o) {
        var a = gn;
        try {
          gn = !0, pn.storagemutated.fire(o), Zi(o, !0);
        } finally {
          gn = a;
        }
      }
      b(On, r(r({}, an), { delete: function(o) {
        return new On(o, { addons: [] }).delete();
      }, exists: function(o) {
        return new On(o, { addons: [] }).open().then(function(a) {
          return a.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(o) {
        try {
          return a = On.dependencies, u = a.indexedDB, a = a.IDBKeyRange, (ji(u) ? Promise.resolve(u.databases()).then(function(d) {
            return d.map(function(h) {
              return h.name;
            }).filter(function(h) {
              return h !== uo;
            });
          }) : Hi(u, a).toCollection().primaryKeys()).then(o);
        } catch {
          return Pt(new ot.MissingAPI());
        }
        var a, u;
      }, defineClass: function() {
        return function(o) {
          l(this, o);
        };
      }, ignoreTransaction: function(o) {
        return it.trans ? Bn(it.transless, o) : o();
      }, vip: qi, async: function(o) {
        return function() {
          try {
            var a = Xi(o.apply(this, arguments));
            return a && typeof a.then == "function" ? a : et.resolve(a);
          } catch (u) {
            return Pt(u);
          }
        };
      }, spawn: function(o, a, u) {
        try {
          var d = Xi(o.apply(u, a || []));
          return d && typeof d.then == "function" ? d : et.resolve(d);
        } catch (h) {
          return Pt(h);
        }
      }, currentTransaction: { get: function() {
        return it.trans || null;
      } }, waitFor: function(o, a) {
        return a = et.resolve(typeof o == "function" ? On.ignoreTransaction(o) : o).timeout(a || 6e4), it.trans ? it.trans.waitFor(a) : a;
      }, Promise: et, debug: { get: function() {
        return Fe;
      }, set: function(o) {
        Ca(o);
      } }, derive: O, extend: l, props: b, override: H, Events: mr, on: pn, liveQuery: cc, extendObservabilitySet: Eo, getByKeyPath: tt, setByKeyPath: A, delByKeyPath: function(o, a) {
        typeof a == "string" ? A(o, a, void 0) : "length" in a && [].map.call(a, function(u) {
          A(o, u, void 0);
        });
      }, shallowClone: lt, deepClone: ct, getObjectDiff: Qi, cmp: vt, asap: K, minKey: -1 / 0, addons: [], connections: zn, errnames: ke, dependencies: Ao, cache: Un, semVer: "4.0.11", version: "4.0.11".split(".").map(function(o) {
        return parseInt(o);
      }).reduce(function(o, a, u) {
        return o + a / Math.pow(10, 2 * u);
      }) })), On.maxKey = Sr(On.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (pn(Er, function(o) {
        gn || (o = new CustomEvent(Li, { detail: o }), gn = !0, dispatchEvent(o), gn = !1);
      }), addEventListener(Li, function(o) {
        o = o.detail, gn || ns(o);
      }));
      var Yn, gn = !1, uc = function() {
      };
      return typeof BroadcastChannel < "u" && ((uc = function() {
        (Yn = new BroadcastChannel(Li)).onmessage = function(o) {
          return o.data && ns(o.data);
        };
      })(), typeof Yn.unref == "function" && Yn.unref(), pn(Er, function(o) {
        gn || Yn.postMessage(o);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(o) {
        if (!Xe.disableBfCache && o.persisted) {
          Fe && console.debug("Dexie: handling persisted pagehide"), Yn != null && Yn.close();
          for (var a = 0, u = zn; a < u.length; a++) u[a].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(o) {
        !Xe.disableBfCache && o.persisted && (Fe && console.debug("Dexie: handling persisted pageshow"), uc(), ns({ all: new ee(-1 / 0, [[]]) }));
      })), et.rejectionMapper = function(o, a) {
        return !o || o instanceof te || o instanceof TypeError || o instanceof SyntaxError || !o.name || !Ye[o.name] ? o : (a = new Ye[o.name](a || o.message, o), "stack" in o && k(a, "stack", { get: function() {
          return this.inner.stack;
        } }), a);
      }, Ca(Fe), r(Xe, Object.freeze({ __proto__: null, Dexie: Xe, liveQuery: cc, Entity: Ka, cmp: vt, PropModification: vr, replacePrefix: function(o, a) {
        return new vr({ replacePrefix: [o, a] });
      }, add: function(o) {
        return new vr({ add: o });
      }, remove: function(o) {
        return new vr({ remove: o });
      }, default: Xe, RangeSet: ee, mergeRanges: Ar, rangesOverlap: Qa }), { default: Xe }), Xe;
    });
  }(Vo)), Vo.exports;
}
var Mp = Kp();
const Zs = /* @__PURE__ */ Ah(Mp), uu = Symbol.for("Dexie"), fi = globalThis[uu] || (globalThis[uu] = Zs);
if (Zs.semVer !== fi.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Zs.semVer} and ${fi.semVer}`);
const {
  liveQuery: Hp,
  mergeRanges: jp,
  rangesOverlap: qp,
  RangeSet: zp,
  cmp: Wp,
  Entity: Gp,
  PropModification: Yp,
  replacePrefix: Zp,
  add: Xp,
  remove: Qp
} = fi, tn = new fi("arkade", { allowEmptyDB: !0 });
tn.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const Vp = {
  addOrUpdate: async (t) => {
    await tn.vtxos.bulkPut(t);
  },
  deleteAll: async () => tn.vtxos.clear(),
  getSpendableVtxos: async () => tn.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await tn.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  getSpentVtxos: async () => tn.vtxos.where("spentBy").notEqual("").toArray(),
  getSweptVtxos: async () => tn.vtxos.where("virtualStatus.state").equals("swept").toArray(),
  close: async () => tn.close(),
  open: async () => {
    await tn.open();
  }
}, Fp = new Op(Vp);
Fp.start().catch(console.error);
const Rf = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(Rf)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== Rf)
          return caches.delete(n);
      })
    ))
  ), self.clients.matchAll({
    includeUncontrolled: !0,
    type: "window"
  }).then((e) => {
    e.forEach((n) => {
      n.postMessage({ type: "RELOAD_PAGE" });
    });
  }), self.clients.claim();
});
