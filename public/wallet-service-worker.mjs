const fr = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function qi(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ao(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function ae(t, ...e) {
  if (!qi(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Ef(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  ao(t.outputLen), ao(t.blockLen);
}
function wi(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function zd(t, e) {
  ae(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function xr(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function Ds(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function Ze(t, e) {
  return t << 32 - e | t >>> e;
}
function ei(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
const xf = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Gd = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function gr(t) {
  if (ae(t), xf)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Gd[t[n]];
  return e;
}
const rn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function uu(t) {
  if (t >= rn._0 && t <= rn._9)
    return t - rn._0;
  if (t >= rn.A && t <= rn.F)
    return t - (rn.A - 10);
  if (t >= rn.a && t <= rn.f)
    return t - (rn.a - 10);
}
function mi(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (xf)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = uu(t.charCodeAt(s)), u = uu(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const l = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Sf(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function Fa(t) {
  return typeof t == "string" && (t = Sf(t)), ae(t), t;
}
function Re(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    ae(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
class Tf {
}
function kf(t) {
  const e = (r) => t().update(Fa(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function er(t = 32) {
  if (fr && typeof fr.getRandomValues == "function")
    return fr.getRandomValues(new Uint8Array(t));
  if (fr && typeof fr.randomBytes == "function")
    return Uint8Array.from(fr.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function Wd(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), c = Number(n >> o & s), u = Number(n & s), l = r ? 4 : 0, h = r ? 0 : 4;
  t.setUint32(e + l, c, r), t.setUint32(e + h, u, r);
}
function Yd(t, e, n) {
  return t & e ^ ~t & n;
}
function Zd(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class Af extends Tf {
  constructor(e, n, r, o) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(e), this.view = Ds(this.buffer);
  }
  update(e) {
    wi(this), e = Fa(e), ae(e);
    const { view: n, buffer: r, blockLen: o } = this, s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const l = Ds(e);
        for (; o <= s - c; c += o)
          this.process(l, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    wi(this), zd(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, xr(this.buffer.subarray(c)), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let y = c; y < o; y++)
      n[y] = 0;
    Wd(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = Ds(e), l = this.outputLen;
    if (l % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const h = l / 4, g = this.get();
    if (h > g.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let y = 0; y < h; y++)
      u.setUint32(4 * y, g[y], s);
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
    return e.destroyed = c, e.finished = s, e.length = o, e.pos = u, o % n && e.buffer.set(r), e;
  }
  clone() {
    return this._cloneInto();
  }
}
const Sn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Xd = /* @__PURE__ */ Uint32Array.from([
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
]), Tn = /* @__PURE__ */ new Uint32Array(64);
class Qd extends Af {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = Sn[0] | 0, this.B = Sn[1] | 0, this.C = Sn[2] | 0, this.D = Sn[3] | 0, this.E = Sn[4] | 0, this.F = Sn[5] | 0, this.G = Sn[6] | 0, this.H = Sn[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: o, E: s, F: c, G: u, H: l } = this;
    return [e, n, r, o, s, c, u, l];
  }
  // prettier-ignore
  set(e, n, r, o, s, c, u, l) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = s | 0, this.F = c | 0, this.G = u | 0, this.H = l | 0;
  }
  process(e, n) {
    for (let y = 0; y < 16; y++, n += 4)
      Tn[y] = e.getUint32(n, !1);
    for (let y = 16; y < 64; y++) {
      const w = Tn[y - 15], b = Tn[y - 2], E = Ze(w, 7) ^ Ze(w, 18) ^ w >>> 3, T = Ze(b, 17) ^ Ze(b, 19) ^ b >>> 10;
      Tn[y] = T + Tn[y - 7] + E + Tn[y - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: l, G: h, H: g } = this;
    for (let y = 0; y < 64; y++) {
      const w = Ze(u, 6) ^ Ze(u, 11) ^ Ze(u, 25), b = g + w + Yd(u, l, h) + Xd[y] + Tn[y] | 0, T = (Ze(r, 2) ^ Ze(r, 13) ^ Ze(r, 22)) + Zd(r, o, s) | 0;
      g = h, h = l, l = u, u = c + b | 0, c = s, s = o, o = r, r = b + T | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, c = c + this.D | 0, u = u + this.E | 0, l = l + this.F | 0, h = h + this.G | 0, g = g + this.H | 0, this.set(r, o, s, c, u, l, h, g);
  }
  roundClean() {
    xr(Tn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), xr(this.buffer);
  }
}
const Xt = /* @__PURE__ */ kf(() => new Qd());
class If extends Tf {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Ef(e);
    const r = Fa(n);
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
    this.oHash.update(s), xr(s);
  }
  update(e) {
    return wi(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    wi(this), ae(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const ja = (t, e, n) => new If(t, e).update(n).digest();
ja.create = (t, e) => new If(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const qa = /* @__PURE__ */ BigInt(0), la = /* @__PURE__ */ BigInt(1);
function bi(t, e = "") {
  if (typeof t != "boolean") {
    const n = e && `"${e}"`;
    throw new Error(n + "expected boolean, got type=" + typeof t);
  }
  return t;
}
function qn(t, e, n = "") {
  const r = qi(t), o = t?.length, s = e !== void 0;
  if (!r || s && o !== e) {
    const c = n && `"${n}" `, u = s ? ` of length ${e}` : "", l = r ? `length=${o}` : `type=${typeof t}`;
    throw new Error(c + "expected Uint8Array" + u + ", got " + l);
  }
  return t;
}
function ni(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Bf(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? qa : BigInt("0x" + t);
}
function He(t) {
  return Bf(gr(t));
}
function _f(t) {
  return ae(t), Bf(gr(Uint8Array.from(t).reverse()));
}
function Jn(t, e) {
  return mi(t.toString(16).padStart(e * 2, "0"));
}
function Nf(t, e) {
  return Jn(t, e).reverse();
}
function Yt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = mi(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (qi(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function co(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const Ms = (t) => typeof t == "bigint" && qa <= t;
function da(t, e, n) {
  return Ms(t) && Ms(e) && Ms(n) && e <= t && t < n;
}
function yr(t, e, n, r) {
  if (!da(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Uf(t) {
  let e;
  for (e = 0; t > qa; t >>= la, e += 1)
    ;
  return e;
}
const Eo = (t) => (la << BigInt(t)) - la;
function Jd(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (b) => new Uint8Array(b), o = (b) => Uint8Array.of(b);
  let s = r(t), c = r(t), u = 0;
  const l = () => {
    s.fill(1), c.fill(0), u = 0;
  }, h = (...b) => n(c, s, ...b), g = (b = r(0)) => {
    c = h(o(0), b), s = h(), b.length !== 0 && (c = h(o(1), b), s = h());
  }, y = () => {
    if (u++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let b = 0;
    const E = [];
    for (; b < e; ) {
      s = h();
      const T = s.slice();
      E.push(T), b += s.length;
    }
    return Re(...E);
  };
  return (b, E) => {
    l(), g(b);
    let T;
    for (; !(T = E(y())); )
      g();
    return l(), T;
  };
}
function za(t, e, n = {}) {
  if (!t || typeof t != "object")
    throw new Error("expected valid options object");
  function r(o, s, c) {
    const u = t[o];
    if (c && u === void 0)
      return;
    const l = typeof u;
    if (l !== s || u === null)
      throw new Error(`param "${o}" is invalid: expected ${s}, got ${l}`);
  }
  Object.entries(e).forEach(([o, s]) => r(o, s, !1)), Object.entries(n).forEach(([o, s]) => r(o, s, !0));
}
function fu(t) {
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
const xe = BigInt(0), me = BigInt(1), zn = /* @__PURE__ */ BigInt(2), Cf = /* @__PURE__ */ BigInt(3), Of = /* @__PURE__ */ BigInt(4), Rf = /* @__PURE__ */ BigInt(5), th = /* @__PURE__ */ BigInt(7), $f = /* @__PURE__ */ BigInt(8), eh = /* @__PURE__ */ BigInt(9), Pf = /* @__PURE__ */ BigInt(16);
function Ne(t, e) {
  const n = t % e;
  return n >= xe ? n : e + n;
}
function Ce(t, e, n) {
  let r = t;
  for (; e-- > xe; )
    r *= r, r %= n;
  return r;
}
function lu(t, e) {
  if (t === xe)
    throw new Error("invert: expected non-zero number");
  if (e <= xe)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = Ne(t, e), r = e, o = xe, s = me;
  for (; n !== xe; ) {
    const u = r / n, l = r % n, h = o - s * u;
    r = n, n = l, o = s, s = h;
  }
  if (r !== me)
    throw new Error("invert: does not exist");
  return Ne(o, e);
}
function Ga(t, e, n) {
  if (!t.eql(t.sqr(e), n))
    throw new Error("Cannot find square root");
}
function Lf(t, e) {
  const n = (t.ORDER + me) / Of, r = t.pow(e, n);
  return Ga(t, r, e), r;
}
function nh(t, e) {
  const n = (t.ORDER - Rf) / $f, r = t.mul(e, zn), o = t.pow(r, n), s = t.mul(e, o), c = t.mul(t.mul(s, zn), o), u = t.mul(s, t.sub(c, t.ONE));
  return Ga(t, u, e), u;
}
function rh(t) {
  const e = xo(t), n = Kf(t), r = n(e, e.neg(e.ONE)), o = n(e, r), s = n(e, e.neg(r)), c = (t + th) / Pf;
  return (u, l) => {
    let h = u.pow(l, c), g = u.mul(h, r);
    const y = u.mul(h, o), w = u.mul(h, s), b = u.eql(u.sqr(g), l), E = u.eql(u.sqr(y), l);
    h = u.cmov(h, g, b), g = u.cmov(w, y, E);
    const T = u.eql(u.sqr(g), l), L = u.cmov(h, g, T);
    return Ga(u, L, l), L;
  };
}
function Kf(t) {
  if (t < Cf)
    throw new Error("sqrt is not defined for small field");
  let e = t - me, n = 0;
  for (; e % zn === xe; )
    e /= zn, n++;
  let r = zn;
  const o = xo(t);
  for (; du(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Lf;
  let s = o.pow(r, e);
  const c = (e + me) / zn;
  return function(l, h) {
    if (l.is0(h))
      return h;
    if (du(l, h) !== 1)
      throw new Error("Cannot find square root");
    let g = n, y = l.mul(l.ONE, s), w = l.pow(h, e), b = l.pow(h, c);
    for (; !l.eql(w, l.ONE); ) {
      if (l.is0(w))
        return l.ZERO;
      let E = 1, T = l.sqr(w);
      for (; !l.eql(T, l.ONE); )
        if (E++, T = l.sqr(T), E === g)
          throw new Error("Cannot find square root");
      const L = me << BigInt(g - E - 1), G = l.pow(y, L);
      g = E, y = l.sqr(G), w = l.mul(w, y), b = l.mul(b, G);
    }
    return b;
  };
}
function oh(t) {
  return t % Of === Cf ? Lf : t % $f === Rf ? nh : t % Pf === eh ? rh(t) : Kf(t);
}
const ih = [
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
function sh(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = ih.reduce((r, o) => (r[o] = "function", r), e);
  return za(t, n), t;
}
function ah(t, e, n) {
  if (n < xe)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === xe)
    return t.ONE;
  if (n === me)
    return e;
  let r = t.ONE, o = e;
  for (; n > xe; )
    n & me && (r = t.mul(r, o)), o = t.sqr(o), n >>= me;
  return r;
}
function Df(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), o = e.reduce((c, u, l) => t.is0(u) ? c : (r[l] = c, t.mul(c, u)), t.ONE), s = t.inv(o);
  return e.reduceRight((c, u, l) => t.is0(u) ? c : (r[l] = t.mul(c, r[l]), t.mul(c, u)), s), r;
}
function du(t, e) {
  const n = (t.ORDER - me) / zn, r = t.pow(e, n), o = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!o && !s && !c)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Mf(t, e) {
  e !== void 0 && ao(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function xo(t, e, n = !1, r = {}) {
  if (t <= xe)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  let o, s, c = !1, u;
  if (typeof e == "object" && e != null) {
    if (r.sqrt || n)
      throw new Error("cannot specify opts in two arguments");
    const w = e;
    w.BITS && (o = w.BITS), w.sqrt && (s = w.sqrt), typeof w.isLE == "boolean" && (n = w.isLE), typeof w.modFromBytes == "boolean" && (c = w.modFromBytes), u = w.allowedLengths;
  } else
    typeof e == "number" && (o = e), r.sqrt && (s = r.sqrt);
  const { nBitLength: l, nByteLength: h } = Mf(t, o);
  if (h > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let g;
  const y = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: l,
    BYTES: h,
    MASK: Eo(l),
    ZERO: xe,
    ONE: me,
    allowedLengths: u,
    create: (w) => Ne(w, t),
    isValid: (w) => {
      if (typeof w != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof w);
      return xe <= w && w < t;
    },
    is0: (w) => w === xe,
    // is valid and invertible
    isValidNot0: (w) => !y.is0(w) && y.isValid(w),
    isOdd: (w) => (w & me) === me,
    neg: (w) => Ne(-w, t),
    eql: (w, b) => w === b,
    sqr: (w) => Ne(w * w, t),
    add: (w, b) => Ne(w + b, t),
    sub: (w, b) => Ne(w - b, t),
    mul: (w, b) => Ne(w * b, t),
    pow: (w, b) => ah(y, w, b),
    div: (w, b) => Ne(w * lu(b, t), t),
    // Same as above, but doesn't normalize
    sqrN: (w) => w * w,
    addN: (w, b) => w + b,
    subN: (w, b) => w - b,
    mulN: (w, b) => w * b,
    inv: (w) => lu(w, t),
    sqrt: s || ((w) => (g || (g = oh(t)), g(y, w))),
    toBytes: (w) => n ? Nf(w, h) : Jn(w, h),
    fromBytes: (w, b = !0) => {
      if (u) {
        if (!u.includes(w.length) || w.length > h)
          throw new Error("Field.fromBytes: expected " + u + " bytes, got " + w.length);
        const T = new Uint8Array(h);
        T.set(w, n ? 0 : T.length - w.length), w = T;
      }
      if (w.length !== h)
        throw new Error("Field.fromBytes: expected " + h + " bytes, got " + w.length);
      let E = n ? _f(w) : He(w);
      if (c && (E = Ne(E, t)), !b && !y.isValid(E))
        throw new Error("invalid field element: outside of range 0..ORDER");
      return E;
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (w) => Df(y, w),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (w, b, E) => E ? b : w
  });
  return Object.freeze(y);
}
function Vf(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Hf(t) {
  const e = Vf(t);
  return e + Math.ceil(e / 2);
}
function Ff(t, e, n = !1) {
  const r = t.length, o = Vf(e), s = Hf(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? _f(t) : He(t), u = Ne(c, e - me) + me;
  return n ? Nf(u, o) : Jn(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Sr = BigInt(0), Gn = BigInt(1);
function vi(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Vs(t, e) {
  const n = Df(t.Fp, e.map((r) => r.Z));
  return e.map((r, o) => t.fromAffine(r.toAffine(n[o])));
}
function jf(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Hs(t, e) {
  jf(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), o = 2 ** t, s = Eo(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: c };
}
function hu(t, e, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: c } = n;
  let u = Number(t & o), l = t >> c;
  u > r && (u -= s, l += Gn);
  const h = e * r, g = h + Math.abs(u) - 1, y = u === 0, w = u < 0, b = e % 2 !== 0;
  return { nextN: l, offset: g, isZero: y, isNeg: w, isNegF: b, offsetF: h };
}
function ch(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function uh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Fs = /* @__PURE__ */ new WeakMap(), qf = /* @__PURE__ */ new WeakMap();
function js(t) {
  return qf.get(t) || 1;
}
function pu(t) {
  if (t !== Sr)
    throw new Error("invalid wNAF");
}
let fh = class {
  // Parametrized with a given Point class (not individual point)
  constructor(e, n) {
    this.BASE = e.BASE, this.ZERO = e.ZERO, this.Fn = e.Fn, this.bits = n;
  }
  // non-const time multiplication ladder
  _unsafeLadder(e, n, r = this.ZERO) {
    let o = e;
    for (; n > Sr; )
      n & Gn && (r = r.add(o)), o = o.double(), n >>= Gn;
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
  precomputeWindow(e, n) {
    const { windows: r, windowSize: o } = Hs(n, this.bits), s = [];
    let c = e, u = c;
    for (let l = 0; l < r; l++) {
      u = c, s.push(u);
      for (let h = 1; h < o; h++)
        u = u.add(c), s.push(u);
      c = u.double();
    }
    return s;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(e, n, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let o = this.ZERO, s = this.BASE;
    const c = Hs(e, this.bits);
    for (let u = 0; u < c.windows; u++) {
      const { nextN: l, offset: h, isZero: g, isNeg: y, isNegF: w, offsetF: b } = hu(r, u, c);
      r = l, g ? s = s.add(vi(w, n[b])) : o = o.add(vi(y, n[h]));
    }
    return pu(r), { p: o, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(e, n, r, o = this.ZERO) {
    const s = Hs(e, this.bits);
    for (let c = 0; c < s.windows && r !== Sr; c++) {
      const { nextN: u, offset: l, isZero: h, isNeg: g } = hu(r, c, s);
      if (r = u, !h) {
        const y = n[l];
        o = o.add(g ? y.negate() : y);
      }
    }
    return pu(r), o;
  }
  getPrecomputes(e, n, r) {
    let o = Fs.get(n);
    return o || (o = this.precomputeWindow(n, e), e !== 1 && (typeof r == "function" && (o = r(o)), Fs.set(n, o))), o;
  }
  cached(e, n, r) {
    const o = js(e);
    return this.wNAF(o, this.getPrecomputes(o, e, r), n);
  }
  unsafe(e, n, r, o) {
    const s = js(e);
    return s === 1 ? this._unsafeLadder(e, n, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, e, r), n, o);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(e, n) {
    jf(n, this.bits), qf.set(e, n), Fs.delete(e);
  }
  hasCache(e) {
    return js(e) !== 1;
  }
};
function lh(t, e, n, r) {
  let o = e, s = t.ZERO, c = t.ZERO;
  for (; n > Sr || r > Sr; )
    n & Gn && (s = s.add(o)), r & Gn && (c = c.add(o)), o = o.double(), n >>= Gn, r >>= Gn;
  return { p1: s, p2: c };
}
function dh(t, e, n, r) {
  ch(n, t), uh(r, e);
  const o = n.length, s = r.length;
  if (o !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, u = Uf(BigInt(o));
  let l = 1;
  u > 12 ? l = u - 3 : u > 4 ? l = u - 2 : u > 0 && (l = 2);
  const h = Eo(l), g = new Array(Number(h) + 1).fill(c), y = Math.floor((e.BITS - 1) / l) * l;
  let w = c;
  for (let b = y; b >= 0; b -= l) {
    g.fill(c);
    for (let T = 0; T < s; T++) {
      const L = r[T], G = Number(L >> BigInt(b) & h);
      g[G] = g[G].add(n[T]);
    }
    let E = c;
    for (let T = g.length - 1, L = c; T > 0; T--)
      L = L.add(g[T]), E = E.add(L);
    if (w = w.add(E), b !== 0)
      for (let T = 0; T < l; T++)
        w = w.double();
  }
  return w;
}
function gu(t, e, n) {
  if (e) {
    if (e.ORDER !== t)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return sh(e), e;
  } else
    return xo(t, { isLE: n });
}
function hh(t, e, n = {}, r) {
  if (r === void 0 && (r = t === "edwards"), !e || typeof e != "object")
    throw new Error(`expected valid ${t} CURVE object`);
  for (const l of ["p", "n", "h"]) {
    const h = e[l];
    if (!(typeof h == "bigint" && h > Sr))
      throw new Error(`CURVE.${l} must be positive bigint`);
  }
  const o = gu(e.p, n.Fp, r), s = gu(e.n, n.Fn, r), u = ["Gx", "Gy", "a", "b"];
  for (const l of u)
    if (!o.isValid(e[l]))
      throw new Error(`CURVE.${l} must be valid field element of CURVE.Fp`);
  return e = Object.freeze(Object.assign({}, e)), { CURVE: e, Fp: o, Fn: s };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const yu = (t, e) => (t + (t >= 0 ? e : -e) / zf) / e;
function ph(t, e, n) {
  const [[r, o], [s, c]] = e, u = yu(c * t, n), l = yu(-o * t, n);
  let h = t - u * r - l * s, g = -u * o - l * c;
  const y = h < ln, w = g < ln;
  y && (h = -h), w && (g = -g);
  const b = Eo(Math.ceil(Uf(n) / 2)) + wr;
  if (h < ln || h >= b || g < ln || g >= b)
    throw new Error("splitScalar (endomorphism): failed, k=" + t);
  return { k1neg: y, k1: h, k2neg: w, k2: g };
}
function ha(t) {
  if (!["compact", "recovered", "der"].includes(t))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return t;
}
function qs(t, e) {
  const n = {};
  for (let r of Object.keys(e))
    n[r] = t[r] === void 0 ? e[r] : t[r];
  return bi(n.lowS, "lowS"), bi(n.prehash, "prehash"), n.format !== void 0 && ha(n.format), n;
}
let gh = class extends Error {
  constructor(e = "") {
    super(e);
  }
};
const cn = {
  // asn.1 DER encoding utils
  Err: gh,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = cn;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = ni(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? ni(o.length / 2 | 128) : "";
      return ni(t) + s + o + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = cn;
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
        const l = o & 127;
        if (!l)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (l > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const h = e.subarray(r, r + l);
        if (h.length !== l)
          throw new n("tlv.decode: length bytes not complete");
        if (h[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const g of h)
          c = c << 8 | g;
        if (r += l, c < 128)
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
      const { Err: e } = cn;
      if (t < ln)
        throw new e("integer: negative integers are not allowed");
      let n = ni(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = cn;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return He(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = cn, o = Yt("signature", t), { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l } = r.decode(2, s), { v: h, l: g } = r.decode(2, l);
    if (g.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(h) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = cn, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
}, ln = BigInt(0), wr = BigInt(1), zf = BigInt(2), ri = BigInt(3), yh = BigInt(4);
function Wn(t, e) {
  const { BYTES: n } = t;
  let r;
  if (typeof e == "bigint")
    r = e;
  else {
    let o = Yt("private key", e);
    try {
      r = t.fromBytes(o);
    } catch {
      throw new Error(`invalid private key: expected ui8a of size ${n}, got ${typeof e}`);
    }
  }
  if (!t.isValidNot0(r))
    throw new Error("invalid private key: out of range [1..N-1]");
  return r;
}
function wh(t, e = {}) {
  const n = hh("weierstrass", t, e), { Fp: r, Fn: o } = n;
  let s = n.CURVE;
  const { h: c, n: u } = s;
  za(e, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    wrapPrivateKey: "boolean"
  });
  const { endo: l } = e;
  if (l && (!r.is0(s.a) || typeof l.beta != "bigint" || !Array.isArray(l.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const h = Wf(r, o);
  function g() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function y(Z, D, z) {
    const { x: N, y: P } = D.toAffine(), W = r.toBytes(N);
    if (bi(z, "isCompressed"), z) {
      g();
      const J = !r.isOdd(P);
      return Re(Gf(J), W);
    } else
      return Re(Uint8Array.of(4), W, r.toBytes(P));
  }
  function w(Z) {
    qn(Z, void 0, "Point");
    const { publicKey: D, publicKeyUncompressed: z } = h, N = Z.length, P = Z[0], W = Z.subarray(1);
    if (N === D && (P === 2 || P === 3)) {
      const J = r.fromBytes(W);
      if (!r.isValid(J))
        throw new Error("bad point: is not on curve, wrong x");
      const X = T(J);
      let Y;
      try {
        Y = r.sqrt(X);
      } catch (It) {
        const St = It instanceof Error ? ": " + It.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + St);
      }
      g();
      const ut = r.isOdd(Y);
      return (P & 1) === 1 !== ut && (Y = r.neg(Y)), { x: J, y: Y };
    } else if (N === z && P === 4) {
      const J = r.BYTES, X = r.fromBytes(W.subarray(0, J)), Y = r.fromBytes(W.subarray(J, J * 2));
      if (!L(X, Y))
        throw new Error("bad point: is not on curve");
      return { x: X, y: Y };
    } else
      throw new Error(`bad point: got length ${N}, expected compressed=${D} or uncompressed=${z}`);
  }
  const b = e.toBytes || y, E = e.fromBytes || w;
  function T(Z) {
    const D = r.sqr(Z), z = r.mul(D, Z);
    return r.add(r.add(z, r.mul(Z, s.a)), s.b);
  }
  function L(Z, D) {
    const z = r.sqr(D), N = T(Z);
    return r.eql(z, N);
  }
  if (!L(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const G = r.mul(r.pow(s.a, ri), yh), Q = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(G, Q)))
    throw new Error("bad curve params: a or b");
  function F(Z, D, z = !1) {
    if (!r.isValid(D) || z && r.is0(D))
      throw new Error(`bad point coordinate ${Z}`);
    return D;
  }
  function H(Z) {
    if (!(Z instanceof lt))
      throw new Error("ProjectivePoint expected");
  }
  function V(Z) {
    if (!l || !l.basises)
      throw new Error("no endo");
    return ph(Z, l.basises, o.ORDER);
  }
  const st = fu((Z, D) => {
    const { X: z, Y: N, Z: P } = Z;
    if (r.eql(P, r.ONE))
      return { x: z, y: N };
    const W = Z.is0();
    D == null && (D = W ? r.ONE : r.inv(P));
    const J = r.mul(z, D), X = r.mul(N, D), Y = r.mul(P, D);
    if (W)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(Y, r.ONE))
      throw new Error("invZ was invalid");
    return { x: J, y: X };
  }), A = fu((Z) => {
    if (Z.is0()) {
      if (e.allowInfinityPoint && !r.is0(Z.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: D, y: z } = Z.toAffine();
    if (!r.isValid(D) || !r.isValid(z))
      throw new Error("bad point: x or y not field elements");
    if (!L(D, z))
      throw new Error("bad point: equation left != right");
    if (!Z.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function yt(Z, D, z, N, P) {
    return z = new lt(r.mul(z.X, Z), z.Y, z.Z), D = vi(N, D), z = vi(P, z), D.add(z);
  }
  class lt {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(D, z, N) {
      this.X = F("x", D), this.Y = F("y", z, !0), this.Z = F("z", N), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(D) {
      const { x: z, y: N } = D || {};
      if (!D || !r.isValid(z) || !r.isValid(N))
        throw new Error("invalid affine point");
      if (D instanceof lt)
        throw new Error("projective point not allowed");
      return r.is0(z) && r.is0(N) ? lt.ZERO : new lt(z, N, r.ONE);
    }
    static fromBytes(D) {
      const z = lt.fromAffine(E(qn(D, void 0, "point")));
      return z.assertValidity(), z;
    }
    static fromHex(D) {
      return lt.fromBytes(Yt("pointHex", D));
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
    precompute(D = 8, z = !0) {
      return q.createCache(this, D), z || this.multiply(ri), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      A(this);
    }
    hasEvenY() {
      const { y: D } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(D);
    }
    /** Compare one point to another. */
    equals(D) {
      H(D);
      const { X: z, Y: N, Z: P } = this, { X: W, Y: J, Z: X } = D, Y = r.eql(r.mul(z, X), r.mul(W, P)), ut = r.eql(r.mul(N, X), r.mul(J, P));
      return Y && ut;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new lt(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: D, b: z } = s, N = r.mul(z, ri), { X: P, Y: W, Z: J } = this;
      let X = r.ZERO, Y = r.ZERO, ut = r.ZERO, pt = r.mul(P, P), It = r.mul(W, W), St = r.mul(J, J), wt = r.mul(P, W);
      return wt = r.add(wt, wt), ut = r.mul(P, J), ut = r.add(ut, ut), X = r.mul(D, ut), Y = r.mul(N, St), Y = r.add(X, Y), X = r.sub(It, Y), Y = r.add(It, Y), Y = r.mul(X, Y), X = r.mul(wt, X), ut = r.mul(N, ut), St = r.mul(D, St), wt = r.sub(pt, St), wt = r.mul(D, wt), wt = r.add(wt, ut), ut = r.add(pt, pt), pt = r.add(ut, pt), pt = r.add(pt, St), pt = r.mul(pt, wt), Y = r.add(Y, pt), St = r.mul(W, J), St = r.add(St, St), pt = r.mul(St, wt), X = r.sub(X, pt), ut = r.mul(St, It), ut = r.add(ut, ut), ut = r.add(ut, ut), new lt(X, Y, ut);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(D) {
      H(D);
      const { X: z, Y: N, Z: P } = this, { X: W, Y: J, Z: X } = D;
      let Y = r.ZERO, ut = r.ZERO, pt = r.ZERO;
      const It = s.a, St = r.mul(s.b, ri);
      let wt = r.mul(z, W), Bt = r.mul(N, J), Nt = r.mul(P, X), qt = r.add(z, N), ot = r.add(W, J);
      qt = r.mul(qt, ot), ot = r.add(wt, Bt), qt = r.sub(qt, ot), ot = r.add(z, P);
      let Ot = r.add(W, X);
      return ot = r.mul(ot, Ot), Ot = r.add(wt, Nt), ot = r.sub(ot, Ot), Ot = r.add(N, P), Y = r.add(J, X), Ot = r.mul(Ot, Y), Y = r.add(Bt, Nt), Ot = r.sub(Ot, Y), pt = r.mul(It, ot), Y = r.mul(St, Nt), pt = r.add(Y, pt), Y = r.sub(Bt, pt), pt = r.add(Bt, pt), ut = r.mul(Y, pt), Bt = r.add(wt, wt), Bt = r.add(Bt, wt), Nt = r.mul(It, Nt), ot = r.mul(St, ot), Bt = r.add(Bt, Nt), Nt = r.sub(wt, Nt), Nt = r.mul(It, Nt), ot = r.add(ot, Nt), wt = r.mul(Bt, ot), ut = r.add(ut, wt), wt = r.mul(Ot, ot), Y = r.mul(qt, Y), Y = r.sub(Y, wt), wt = r.mul(qt, Bt), pt = r.mul(Ot, pt), pt = r.add(pt, wt), new lt(Y, ut, pt);
    }
    subtract(D) {
      return this.add(D.negate());
    }
    is0() {
      return this.equals(lt.ZERO);
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
      const { endo: z } = e;
      if (!o.isValidNot0(D))
        throw new Error("invalid scalar: out of range");
      let N, P;
      const W = (J) => q.cached(this, J, (X) => Vs(lt, X));
      if (z) {
        const { k1neg: J, k1: X, k2neg: Y, k2: ut } = V(D), { p: pt, f: It } = W(X), { p: St, f: wt } = W(ut);
        P = It.add(wt), N = yt(z.beta, pt, St, J, Y);
      } else {
        const { p: J, f: X } = W(D);
        N = J, P = X;
      }
      return Vs(lt, [N, P])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(D) {
      const { endo: z } = e, N = this;
      if (!o.isValid(D))
        throw new Error("invalid scalar: out of range");
      if (D === ln || N.is0())
        return lt.ZERO;
      if (D === wr)
        return N;
      if (q.hasCache(this))
        return this.multiply(D);
      if (z) {
        const { k1neg: P, k1: W, k2neg: J, k2: X } = V(D), { p1: Y, p2: ut } = lh(lt, N, W, X);
        return yt(z.beta, Y, ut, P, J);
      } else
        return q.unsafe(N, D);
    }
    multiplyAndAddUnsafe(D, z, N) {
      const P = this.multiplyUnsafe(z).add(D.multiplyUnsafe(N));
      return P.is0() ? void 0 : P;
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(D) {
      return st(this, D);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: D } = e;
      return c === wr ? !0 : D ? D(lt, this) : q.unsafe(this, u).is0();
    }
    clearCofactor() {
      const { clearCofactor: D } = e;
      return c === wr ? this : D ? D(lt, this) : this.multiplyUnsafe(c);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(c).is0();
    }
    toBytes(D = !0) {
      return bi(D, "isCompressed"), this.assertValidity(), b(lt, this, D);
    }
    toHex(D = !0) {
      return gr(this.toBytes(D));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
    // TODO: remove
    get px() {
      return this.X;
    }
    get py() {
      return this.X;
    }
    get pz() {
      return this.Z;
    }
    toRawBytes(D = !0) {
      return this.toBytes(D);
    }
    _setWindowSize(D) {
      this.precompute(D);
    }
    static normalizeZ(D) {
      return Vs(lt, D);
    }
    static msm(D, z) {
      return dh(lt, o, D, z);
    }
    static fromPrivateKey(D) {
      return lt.BASE.multiply(Wn(o, D));
    }
  }
  lt.BASE = new lt(s.Gx, s.Gy, r.ONE), lt.ZERO = new lt(r.ZERO, r.ONE, r.ZERO), lt.Fp = r, lt.Fn = o;
  const xt = o.BITS, q = new fh(lt, e.endo ? Math.ceil(xt / 2) : xt);
  return lt.BASE.precompute(8), lt;
}
function Gf(t) {
  return Uint8Array.of(t ? 2 : 3);
}
function Wf(t, e) {
  return {
    secretKey: e.BYTES,
    publicKey: 1 + t.BYTES,
    publicKeyUncompressed: 1 + 2 * t.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * e.BYTES
  };
}
function mh(t, e = {}) {
  const { Fn: n } = t, r = e.randomBytes || er, o = Object.assign(Wf(t.Fp, n), { seed: Hf(n.ORDER) });
  function s(b) {
    try {
      return !!Wn(n, b);
    } catch {
      return !1;
    }
  }
  function c(b, E) {
    const { publicKey: T, publicKeyUncompressed: L } = o;
    try {
      const G = b.length;
      return E === !0 && G !== T || E === !1 && G !== L ? !1 : !!t.fromBytes(b);
    } catch {
      return !1;
    }
  }
  function u(b = r(o.seed)) {
    return Ff(qn(b, o.seed, "seed"), n.ORDER);
  }
  function l(b, E = !0) {
    return t.BASE.multiply(Wn(n, b)).toBytes(E);
  }
  function h(b) {
    const E = u(b);
    return { secretKey: E, publicKey: l(E) };
  }
  function g(b) {
    if (typeof b == "bigint")
      return !1;
    if (b instanceof t)
      return !0;
    const { secretKey: E, publicKey: T, publicKeyUncompressed: L } = o;
    if (n.allowedLengths || E === T)
      return;
    const G = Yt("key", b).length;
    return G === T || G === L;
  }
  function y(b, E, T = !0) {
    if (g(b) === !0)
      throw new Error("first arg must be private key");
    if (g(E) === !1)
      throw new Error("second arg must be public key");
    const L = Wn(n, b);
    return t.fromHex(E).multiply(L).toBytes(T);
  }
  return Object.freeze({ getPublicKey: l, getSharedSecret: y, keygen: h, Point: t, utils: {
    isValidSecretKey: s,
    isValidPublicKey: c,
    randomSecretKey: u,
    // TODO: remove
    isValidPrivateKey: s,
    randomPrivateKey: u,
    normPrivateKeyToScalar: (b) => Wn(n, b),
    precompute(b = 8, E = t.BASE) {
      return E.precompute(b, !1);
    }
  }, lengths: o });
}
function bh(t, e, n = {}) {
  Ef(e), za(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  });
  const r = n.randomBytes || er, o = n.hmac || ((z, ...N) => ja(e, z, Re(...N))), { Fp: s, Fn: c } = t, { ORDER: u, BITS: l } = c, { keygen: h, getPublicKey: g, getSharedSecret: y, utils: w, lengths: b } = mh(t, n), E = {
    prehash: !1,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !1,
    format: void 0,
    //'compact' as ECDSASigFormat,
    extraEntropy: !1
  }, T = "compact";
  function L(z) {
    const N = u >> wr;
    return z > N;
  }
  function G(z, N) {
    if (!c.isValidNot0(N))
      throw new Error(`invalid signature ${z}: out of range 1..Point.Fn.ORDER`);
    return N;
  }
  function Q(z, N) {
    ha(N);
    const P = b.signature, W = N === "compact" ? P : N === "recovered" ? P + 1 : void 0;
    return qn(z, W, `${N} signature`);
  }
  class F {
    constructor(N, P, W) {
      this.r = G("r", N), this.s = G("s", P), W != null && (this.recovery = W), Object.freeze(this);
    }
    static fromBytes(N, P = T) {
      Q(N, P);
      let W;
      if (P === "der") {
        const { r: ut, s: pt } = cn.toSig(qn(N));
        return new F(ut, pt);
      }
      P === "recovered" && (W = N[0], P = "compact", N = N.subarray(1));
      const J = c.BYTES, X = N.subarray(0, J), Y = N.subarray(J, J * 2);
      return new F(c.fromBytes(X), c.fromBytes(Y), W);
    }
    static fromHex(N, P) {
      return this.fromBytes(mi(N), P);
    }
    addRecoveryBit(N) {
      return new F(this.r, this.s, N);
    }
    recoverPublicKey(N) {
      const P = s.ORDER, { r: W, s: J, recovery: X } = this;
      if (X == null || ![0, 1, 2, 3].includes(X))
        throw new Error("recovery id invalid");
      if (u * zf < P && X > 1)
        throw new Error("recovery id is ambiguous for h>1 curve");
      const ut = X === 2 || X === 3 ? W + u : W;
      if (!s.isValid(ut))
        throw new Error("recovery id 2 or 3 invalid");
      const pt = s.toBytes(ut), It = t.fromBytes(Re(Gf((X & 1) === 0), pt)), St = c.inv(ut), wt = V(Yt("msgHash", N)), Bt = c.create(-wt * St), Nt = c.create(J * St), qt = t.BASE.multiplyUnsafe(Bt).add(It.multiplyUnsafe(Nt));
      if (qt.is0())
        throw new Error("point at infinify");
      return qt.assertValidity(), qt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return L(this.s);
    }
    toBytes(N = T) {
      if (ha(N), N === "der")
        return mi(cn.hexFromSig(this));
      const P = c.toBytes(this.r), W = c.toBytes(this.s);
      if (N === "recovered") {
        if (this.recovery == null)
          throw new Error("recovery bit must be present");
        return Re(Uint8Array.of(this.recovery), P, W);
      }
      return Re(P, W);
    }
    toHex(N) {
      return gr(this.toBytes(N));
    }
    // TODO: remove
    assertValidity() {
    }
    static fromCompact(N) {
      return F.fromBytes(Yt("sig", N), "compact");
    }
    static fromDER(N) {
      return F.fromBytes(Yt("sig", N), "der");
    }
    normalizeS() {
      return this.hasHighS() ? new F(this.r, c.neg(this.s), this.recovery) : this;
    }
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return gr(this.toBytes("der"));
    }
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return gr(this.toBytes("compact"));
    }
  }
  const H = n.bits2int || function(N) {
    if (N.length > 8192)
      throw new Error("input is too large");
    const P = He(N), W = N.length * 8 - l;
    return W > 0 ? P >> BigInt(W) : P;
  }, V = n.bits2int_modN || function(N) {
    return c.create(H(N));
  }, st = Eo(l);
  function A(z) {
    return yr("num < 2^" + l, z, ln, st), c.toBytes(z);
  }
  function yt(z, N) {
    return qn(z, void 0, "message"), N ? qn(e(z), void 0, "prehashed message") : z;
  }
  function lt(z, N, P) {
    if (["recovered", "canonical"].some((Bt) => Bt in P))
      throw new Error("sign() legacy options not supported");
    const { lowS: W, prehash: J, extraEntropy: X } = qs(P, E);
    z = yt(z, J);
    const Y = V(z), ut = Wn(c, N), pt = [A(ut), A(Y)];
    if (X != null && X !== !1) {
      const Bt = X === !0 ? r(b.secretKey) : X;
      pt.push(Yt("extraEntropy", Bt));
    }
    const It = Re(...pt), St = Y;
    function wt(Bt) {
      const Nt = H(Bt);
      if (!c.isValidNot0(Nt))
        return;
      const qt = c.inv(Nt), ot = t.BASE.multiply(Nt).toAffine(), Ot = c.create(ot.x);
      if (Ot === ln)
        return;
      const Ie = c.create(qt * c.create(St + Ot * ut));
      if (Ie === ln)
        return;
      let At = (ot.x === Ot ? 0 : 2) | Number(ot.y & wr), ue = Ie;
      return W && L(Ie) && (ue = c.neg(Ie), At ^= 1), new F(Ot, ue, At);
    }
    return { seed: It, k2sig: wt };
  }
  function xt(z, N, P = {}) {
    z = Yt("message", z);
    const { seed: W, k2sig: J } = lt(z, N, P);
    return Jd(e.outputLen, c.BYTES, o)(W, J);
  }
  function q(z) {
    let N;
    const P = typeof z == "string" || qi(z), W = !P && z !== null && typeof z == "object" && typeof z.r == "bigint" && typeof z.s == "bigint";
    if (!P && !W)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    if (W)
      N = new F(z.r, z.s);
    else if (P) {
      try {
        N = F.fromBytes(Yt("sig", z), "der");
      } catch (J) {
        if (!(J instanceof cn.Err))
          throw J;
      }
      if (!N)
        try {
          N = F.fromBytes(Yt("sig", z), "compact");
        } catch {
          return !1;
        }
    }
    return N || !1;
  }
  function Z(z, N, P, W = {}) {
    const { lowS: J, prehash: X, format: Y } = qs(W, E);
    if (P = Yt("publicKey", P), N = yt(Yt("message", N), X), "strict" in W)
      throw new Error("options.strict was renamed to lowS");
    const ut = Y === void 0 ? q(z) : F.fromBytes(Yt("sig", z), Y);
    if (ut === !1)
      return !1;
    try {
      const pt = t.fromBytes(P);
      if (J && ut.hasHighS())
        return !1;
      const { r: It, s: St } = ut, wt = V(N), Bt = c.inv(St), Nt = c.create(wt * Bt), qt = c.create(It * Bt), ot = t.BASE.multiplyUnsafe(Nt).add(pt.multiplyUnsafe(qt));
      return ot.is0() ? !1 : c.create(ot.x) === It;
    } catch {
      return !1;
    }
  }
  function D(z, N, P = {}) {
    const { prehash: W } = qs(P, E);
    return N = yt(N, W), F.fromBytes(z, "recovered").recoverPublicKey(N).toBytes();
  }
  return Object.freeze({
    keygen: h,
    getPublicKey: g,
    getSharedSecret: y,
    utils: w,
    lengths: b,
    Point: t,
    sign: xt,
    verify: Z,
    recoverPublicKey: D,
    Signature: F,
    hash: e
  });
}
function vh(t) {
  const e = {
    a: t.a,
    b: t.b,
    p: t.Fp.ORDER,
    n: t.n,
    h: t.h,
    Gx: t.Gx,
    Gy: t.Gy
  }, n = t.Fp;
  let r = t.allowedPrivateKeyLengths ? Array.from(new Set(t.allowedPrivateKeyLengths.map((c) => Math.ceil(c / 2)))) : void 0;
  const o = xo(e.n, {
    BITS: t.nBitLength,
    allowedLengths: r,
    modFromBytes: t.wrapPrivateKey
  }), s = {
    Fp: n,
    Fn: o,
    allowInfinityPoint: t.allowInfinityPoint,
    endo: t.endo,
    isTorsionFree: t.isTorsionFree,
    clearCofactor: t.clearCofactor,
    fromBytes: t.fromBytes,
    toBytes: t.toBytes
  };
  return { CURVE: e, curveOpts: s };
}
function Eh(t) {
  const { CURVE: e, curveOpts: n } = vh(t), r = {
    hmac: t.hmac,
    randomBytes: t.randomBytes,
    lowS: t.lowS,
    bits2int: t.bits2int,
    bits2int_modN: t.bits2int_modN
  };
  return { CURVE: e, curveOpts: n, hash: t.hash, ecdsaOpts: r };
}
function xh(t, e) {
  const n = e.Point;
  return Object.assign({}, e, {
    ProjectivePoint: n,
    CURVE: Object.assign({}, t, Mf(n.Fn.ORDER, n.Fn.BITS))
  });
}
function Sh(t) {
  const { CURVE: e, curveOpts: n, hash: r, ecdsaOpts: o } = Eh(t), s = wh(e, n), c = bh(s, r, o);
  return xh(t, c);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Th(t, e) {
  const n = (r) => Sh({ ...t, hash: r });
  return { ...n(e), create: n };
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
}, kh = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, Ah = /* @__PURE__ */ BigInt(0), wu = /* @__PURE__ */ BigInt(1), pa = /* @__PURE__ */ BigInt(2);
function Ih(t) {
  const e = Tr.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), l = BigInt(88), h = t * t * t % e, g = h * h * t % e, y = Ce(g, n, e) * g % e, w = Ce(y, n, e) * g % e, b = Ce(w, pa, e) * h % e, E = Ce(b, o, e) * b % e, T = Ce(E, s, e) * E % e, L = Ce(T, u, e) * T % e, G = Ce(L, l, e) * L % e, Q = Ce(G, u, e) * T % e, F = Ce(Q, n, e) * g % e, H = Ce(F, c, e) * E % e, V = Ce(H, r, e) * h % e, st = Ce(V, pa, e);
  if (!Ei.eql(Ei.sqr(st), t))
    throw new Error("Cannot find square root");
  return st;
}
const Ei = xo(Tr.p, { sqrt: Ih }), hn = Th({ ...Tr, Fp: Ei, lowS: !0, endo: kh }, Xt), mu = {};
function xi(t, ...e) {
  let n = mu[t];
  if (n === void 0) {
    const r = Xt(Sf(t));
    n = Re(r, r), mu[t] = n;
  }
  return Xt(Re(n, ...e));
}
const Wa = (t) => t.toBytes(!0).slice(1), Or = hn.Point, Ya = (t) => t % pa === Ah;
function ga(t) {
  const { Fn: e, BASE: n } = Or, r = Wn(e, t), o = n.multiply(r);
  return { scalar: Ya(o.y) ? r : e.neg(r), bytes: Wa(o) };
}
function Yf(t) {
  const e = Ei;
  if (!e.isValidNot0(t))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = e.create(t * t), r = e.create(n * t + BigInt(7));
  let o = e.sqrt(r);
  Ya(o) || (o = e.neg(o));
  const s = Or.fromAffine({ x: t, y: o });
  return s.assertValidity(), s;
}
const eo = He;
function Zf(...t) {
  return Or.Fn.create(eo(xi("BIP0340/challenge", ...t)));
}
function bu(t) {
  return ga(t).bytes;
}
function Bh(t, e, n = er(32)) {
  const { Fn: r } = Or, o = Yt("message", t), { bytes: s, scalar: c } = ga(e), u = Yt("auxRand", n, 32), l = r.toBytes(c ^ eo(xi("BIP0340/aux", u))), h = xi("BIP0340/nonce", l, s, o), { bytes: g, scalar: y } = ga(h), w = Zf(g, s, o), b = new Uint8Array(64);
  if (b.set(g, 0), b.set(r.toBytes(r.create(y + w * c)), 32), !Xf(b, o, s))
    throw new Error("sign: Invalid signature produced");
  return b;
}
function Xf(t, e, n) {
  const { Fn: r, BASE: o } = Or, s = Yt("signature", t, 64), c = Yt("message", e), u = Yt("publicKey", n, 32);
  try {
    const l = Yf(eo(u)), h = eo(s.subarray(0, 32));
    if (!da(h, wu, Tr.p))
      return !1;
    const g = eo(s.subarray(32, 64));
    if (!da(g, wu, Tr.n))
      return !1;
    const y = Zf(r.toBytes(h), Wa(l), c), w = o.multiplyUnsafe(g).add(l.multiplyUnsafe(r.neg(y))), { x: b, y: E } = w.toAffine();
    return !(w.is0() || !Ya(E) || b !== h);
  } catch {
    return !1;
  }
}
const Qe = /* @__PURE__ */ (() => {
  const n = (o = er(48)) => Ff(o, Tr.n);
  hn.utils.randomSecretKey;
  function r(o) {
    const s = n(o);
    return { secretKey: s, publicKey: bu(s) };
  }
  return {
    keygen: r,
    getPublicKey: bu,
    sign: Bh,
    verify: Xf,
    Point: Or,
    utils: {
      randomSecretKey: n,
      randomPrivateKey: n,
      taggedHash: xi,
      // TODO: remove
      lift_x: Yf,
      pointToBytes: Wa,
      numberToBytesBE: Jn,
      bytesToNumberBE: He,
      mod: Ne
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), _h = /* @__PURE__ */ Uint8Array.from([
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
]), Qf = Uint8Array.from(new Array(16).fill(0).map((t, e) => e)), Nh = Qf.map((t) => (9 * t + 5) % 16), Jf = /* @__PURE__ */ (() => {
  const n = [[Qf], [Nh]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => _h[s]));
  return n;
})(), tl = Jf[0], el = Jf[1], nl = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => Uint8Array.from(t)), Uh = /* @__PURE__ */ tl.map((t, e) => t.map((n) => nl[e][n])), Ch = /* @__PURE__ */ el.map((t, e) => t.map((n) => nl[e][n])), Oh = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Rh = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function vu(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const oi = /* @__PURE__ */ new Uint32Array(16);
class $h extends Af {
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
    for (let b = 0; b < 16; b++, n += 4)
      oi[b] = e.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, c = s, u = this.h2 | 0, l = u, h = this.h3 | 0, g = h, y = this.h4 | 0, w = y;
    for (let b = 0; b < 5; b++) {
      const E = 4 - b, T = Oh[b], L = Rh[b], G = tl[b], Q = el[b], F = Uh[b], H = Ch[b];
      for (let V = 0; V < 16; V++) {
        const st = ei(r + vu(b, s, u, h) + oi[G[V]] + T, F[V]) + y | 0;
        r = y, y = h, h = ei(u, 10) | 0, u = s, s = st;
      }
      for (let V = 0; V < 16; V++) {
        const st = ei(o + vu(E, c, l, g) + oi[Q[V]] + L, H[V]) + w | 0;
        o = w, w = g, g = ei(l, 10) | 0, l = c, c = st;
      }
    }
    this.set(this.h1 + u + g | 0, this.h2 + h + w | 0, this.h3 + y + o | 0, this.h4 + r + c | 0, this.h0 + s + l | 0);
  }
  roundClean() {
    xr(oi);
  }
  destroy() {
    this.destroyed = !0, xr(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Ph = /* @__PURE__ */ kf(() => new $h());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function kr(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function rl(t, ...e) {
  if (!kr(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function ol(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Za(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Bn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function Rr(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Si(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Ti(t, e) {
  if (!ol(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Xa(t, e) {
  if (!ol(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function So(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function zi(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Ti("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (Si(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (Si(o), o.map((s) => {
      Bn("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Gi(t = "") {
  return Bn("join", t), {
    encode: (e) => (Ti("join.decode", e), e.join(t)),
    decode: (e) => (Bn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Lh(t, e = "=") {
  return Rr(t), Bn("padding", e), {
    encode(n) {
      for (Ti("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Ti("padding.decode", n);
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
function Kh(t) {
  return Za(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Eu(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Si(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (Rr(u), u < 0 || u >= e)
      throw new Error(`invalid integer: ${u}`);
    return u;
  }), c = s.length;
  for (; ; ) {
    let u = 0, l = !0;
    for (let h = r; h < c; h++) {
      const g = s[h], y = e * u, w = y + g;
      if (!Number.isSafeInteger(w) || y / e !== u || w - g !== y)
        throw new Error("convertRadix: carry overflow");
      const b = w / n;
      u = w % n;
      const E = Math.floor(b);
      if (s[h] = E, !Number.isSafeInteger(E) || E * n + u !== w)
        throw new Error("convertRadix: carry overflow");
      if (l)
        E ? l = !1 : r = h;
      else continue;
    }
    if (o.push(u), l)
      break;
  }
  for (let u = 0; u < t.length - 1 && t[u] === 0; u++)
    o.push(0);
  return o.reverse();
}
const il = (t, e) => e === 0 ? t : il(e, t % e), ki = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - il(t, e)), di = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function ya(t, e, n, r) {
  if (Si(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ki(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ ki(e, n)}`);
  let o = 0, s = 0;
  const c = di[e], u = di[n] - 1, l = [];
  for (const h of t) {
    if (Rr(h), h >= c)
      throw new Error(`convertRadix2: invalid data word=${h} from=${e}`);
    if (o = o << e | h, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      l.push((o >> s - n & u) >>> 0);
    const g = di[s];
    if (g === void 0)
      throw new Error("invalid carry");
    o &= g - 1;
  }
  if (o = o << n - s & u, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && s > 0 && l.push(o >>> 0), l;
}
// @__NO_SIDE_EFFECTS__
function Dh(t) {
  Rr(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!kr(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Eu(Array.from(n), e, t);
    },
    decode: (n) => (Xa("radix.decode", n), Uint8Array.from(Eu(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function Qa(t, e = !1) {
  if (Rr(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ki(8, t) > 32 || /* @__PURE__ */ ki(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!kr(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ya(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Xa("radix2.decode", n), Uint8Array.from(ya(n, t, 8, e)))
  };
}
function xu(t) {
  return Za(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Mh(t, e) {
  return Rr(t), Za(e), {
    encode(n) {
      if (!kr(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), o = new Uint8Array(n.length + t);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!kr(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), o = n.slice(-t), s = e(r).slice(0, t);
      for (let c = 0; c < t; c++)
        if (s[c] !== o[c])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Vh = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Hh = (t, e) => {
  Bn("base64", t);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (t.length > 0 && !n.test(t))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(t, { alphabet: r, lastChunkHandling: "strict" });
}, Ee = Vh ? {
  encode(t) {
    return rl(t), t.toBase64();
  },
  decode(t) {
    return Hh(t);
  }
} : /* @__PURE__ */ So(/* @__PURE__ */ Qa(6), /* @__PURE__ */ zi("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ Lh(6), /* @__PURE__ */ Gi("")), Fh = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ So(/* @__PURE__ */ Dh(58), /* @__PURE__ */ zi(t), /* @__PURE__ */ Gi("")), wa = /* @__PURE__ */ Fh("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), jh = (t) => /* @__PURE__ */ So(Mh(4, (e) => t(t(e))), wa), ma = /* @__PURE__ */ So(/* @__PURE__ */ zi("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Gi("")), Su = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Wr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Su.length; r++)
    (e >> r & 1) === 1 && (n ^= Su[r]);
  return n;
}
function Tu(t, e, n = 1) {
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
  return o ^= n, ma.encode(ya([o % di[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function sl(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Qa(5), r = n.decode, o = n.encode, s = xu(r);
  function c(y, w, b = 90) {
    Bn("bech32.encode prefix", y), kr(w) && (w = Array.from(w)), Xa("bech32.encode", w);
    const E = y.length;
    if (E === 0)
      throw new TypeError(`Invalid prefix length ${E}`);
    const T = E + 7 + w.length;
    if (b !== !1 && T > b)
      throw new TypeError(`Length ${T} exceeds limit ${b}`);
    const L = y.toLowerCase(), G = Tu(L, w, e);
    return `${L}1${ma.encode(w)}${G}`;
  }
  function u(y, w = 90) {
    Bn("bech32.decode input", y);
    const b = y.length;
    if (b < 8 || w !== !1 && b > w)
      throw new TypeError(`invalid string length: ${b} (${y}). Expected (8..${w})`);
    const E = y.toLowerCase();
    if (y !== E && y !== y.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const T = E.lastIndexOf("1");
    if (T === 0 || T === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const L = E.slice(0, T), G = E.slice(T + 1);
    if (G.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const Q = ma.decode(G).slice(0, -6), F = Tu(L, Q, e);
    if (!G.endsWith(F))
      throw new Error(`Invalid checksum in ${y}: expected "${F}"`);
    return { prefix: L, words: Q };
  }
  const l = xu(u);
  function h(y) {
    const { prefix: w, words: b } = u(y, !1);
    return { prefix: w, words: b, bytes: r(b) };
  }
  function g(y, w) {
    return c(y, o(w));
  }
  return {
    encode: c,
    decode: u,
    encodeFromBytes: g,
    decodeToBytes: h,
    decodeUnsafe: l,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: o
  };
}
const ba = /* @__PURE__ */ sl("bech32"), dr = /* @__PURE__ */ sl("bech32m"), qh = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, zh = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Gh = {
  encode(t) {
    return rl(t), t.toHex();
  },
  decode(t) {
    return Bn("hex", t), Uint8Array.fromHex(t);
  }
}, rt = zh ? Gh : /* @__PURE__ */ So(/* @__PURE__ */ Qa(4), /* @__PURE__ */ zi("0123456789abcdef"), /* @__PURE__ */ Gi(""), /* @__PURE__ */ Kh((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Ht = /* @__PURE__ */ new Uint8Array(), al = /* @__PURE__ */ new Uint8Array([0]);
function Ar(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function $e(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Wh(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    if (!$e(o))
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
const cl = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function To(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function Je(t) {
  return Number.isSafeInteger(t);
}
const Ja = {
  equalBytes: Ar,
  isBytes: $e,
  concatBytes: Wh
}, ul = (t) => {
  if (t !== null && typeof t != "string" && !Fe(t) && !$e(t) && !Je(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (Fe(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = pn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (Fe(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = pn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, ne = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(ne.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (ne.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${ne.len(e)}`);
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
    ne.checkLen(t, e);
    const { FULL_MASK: r, BITS: o } = ne, s = o - e % o, c = s ? r >>> s << s : r, u = [];
    for (let l = 0; l < t.length; l++) {
      let h = t[l];
      if (n && (h = ~h), l === t.length - 1 && (h &= c), h !== 0)
        for (let g = 0; g < o; g++) {
          const y = 1 << o - g - 1;
          h & y && u.push(l * o + g);
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
  rangeDebug: (t, e, n = !1) => `[${ne.range(ne.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, o = !0) => {
    ne.chunkLen(e, n, r);
    const { FULL_MASK: s, BITS: c } = ne, u = n % c ? Math.floor(n / c) : void 0, l = n + r, h = l % c ? Math.floor(l / c) : void 0;
    if (u !== void 0 && u === h)
      return ne.set(t, u, s >>> c - r << c - r - n, o);
    if (u !== void 0 && !ne.set(t, u, s >>> n % c, o))
      return !1;
    const g = u !== void 0 ? u + 1 : n / c, y = h !== void 0 ? h : l / c;
    for (let w = g; w < y; w++)
      if (!ne.set(t, w, s, o))
        return !1;
    return !(h !== void 0 && u !== h && !ne.set(t, h, s << c - l % c, o));
  }
}, pn = {
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
    const r = new Error(`${t}(${pn.path(e)}): ${typeof n == "string" ? n : n.message}`);
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
class tc {
  constructor(e, n = {}, r = [], o = void 0, s = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = cl(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = ne.create(this.data.length), ne.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : ne.setRange(this.bs, this.data.length, e, n, !1);
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
    return pn.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${rt.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = ne.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = ne.range(e).map(({ pos: r, length: o }) => `(${r}/${o})[${rt.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${rt.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return pn.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new tc(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!$e(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (Ar(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class Yh {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = cl(this.viewBuf);
  }
  pushObj(e, n) {
    return pn.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!Je(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return pn.err("Reader", this.stack, e);
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
const va = (t) => Uint8Array.from(t).reverse();
function Zh(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function fl(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new Yh();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new tc(e, n), o = t.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function ke(t, e) {
  if (!Fe(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return fl({
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
const Ae = (t) => {
  const e = fl(t);
  return t.validate ? ke(e, t.validate) : e;
}, Wi = (t) => To(t) && typeof t.decode == "function" && typeof t.encode == "function";
function Fe(t) {
  return To(t) && Wi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || Je(t.size));
}
function Xh() {
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
      if (!To(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Qh = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!Je(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function Jh(t) {
  if (!To(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!Je(e) || !(e in t))
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
function tp(t, e = !1) {
  if (!Je(t))
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
      let u = o.slice(0, s), l = o.slice(s, c + 1);
      return u || (u = "0"), r < 0n && (u = "-" + u), l ? `${u}.${l}` : u;
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
      const c = r.slice(0, s), u = r.slice(s + 1).replace(/0+$/, ""), l = BigInt(c) * n;
      if (!e && u.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const h = Math.min(u.length, t), g = BigInt(u.slice(0, h)) * 10n ** BigInt(t - h), y = l + g;
      return o ? -y : y;
    }
  };
}
function ep(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!Wi(e))
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
const ll = (t) => {
  if (!Wi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, Yi = { dict: Xh, numberBigint: Qh, tsEnum: Jh, decimal: tp, match: ep, reverse: ll }, ec = (t, e = !1, n = !1, r = !0) => {
  if (!Je(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(t), s = 2n ** (8n * o - 1n);
  return Ae({
    size: r ? t : void 0,
    encodeStream: (c, u) => {
      n && u < 0 && (u = u | s);
      const l = [];
      for (let g = 0; g < t; g++)
        l.push(Number(u & 255n)), u >>= 8n;
      let h = new Uint8Array(l).reverse();
      if (!r) {
        let g = 0;
        for (g = 0; g < h.length && h[g] === 0; g++)
          ;
        h = h.subarray(g);
      }
      c.bytes(e ? h.reverse() : h);
    },
    decodeStream: (c) => {
      const u = c.bytes(r ? t : Math.min(t, c.leftBytes)), l = e ? u : va(u);
      let h = 0n;
      for (let g = 0; g < l.length; g++)
        h |= BigInt(l[g]) << 8n * BigInt(g);
      return n && h & s && (h = (h ^ s) - s), h;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return Zh(c, 8n * o, !!n), c;
    }
  });
}, dl = /* @__PURE__ */ ec(32, !1), hi = /* @__PURE__ */ ec(8, !0), np = /* @__PURE__ */ ec(8, !0, !0), rp = (t, e) => Ae({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (o) => e.write(o, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), ko = (t, e, n) => {
  const r = t * 8, o = 2 ** (r - 1), s = (l) => {
    if (!Je(l))
      throw new Error(`sintView: value is not safe integer: ${l}`);
    if (l < -o || l >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${l} < ${o}`);
  }, c = 2 ** r, u = (l) => {
    if (!Je(l))
      throw new Error(`uintView: value is not safe integer: ${l}`);
    if (0 > l || l >= c)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${l} < ${c}`);
  };
  return rp(t, {
    write: n.write,
    read: n.read,
    validate: e ? s : u
  });
}, Ct = /* @__PURE__ */ ko(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), op = /* @__PURE__ */ ko(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), hr = /* @__PURE__ */ ko(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), ku = /* @__PURE__ */ ko(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), In = /* @__PURE__ */ ko(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Mt = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = ul(t), r = $e(t);
  return Ae({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(e ? va(s) : s), r && o.bytes(t);
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
      return e ? va(s) : s;
    },
    validate: (o) => {
      if (!$e(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function ip(t, e) {
  if (!Fe(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return _n(Mt(t), ll(e));
}
const nc = (t, e = !1) => ke(_n(Mt(t, e), qh), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), sp = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = _n(Mt(t, e.isLE), rt);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = _n(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function _n(t, e) {
  if (!Fe(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!Wi(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Ae({
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
const ap = (t, e = !1) => {
  if (!$e(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Ae({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = Ar(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function cp(t, e, n) {
  if (!Fe(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Ae({
    encodeStream: (r, o) => {
      pn.resolve(r.stack, t) && e.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!pn.resolve(r.stack, t), o)
        return e.decodeStream(r);
    }
  });
}
function rc(t, e, n = !0) {
  if (!Fe(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Ae({
    size: t.size,
    encodeStream: (r, o) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const o = t.decodeStream(r);
      if (n && typeof o != "object" && o !== e || $e(e) && !Ar(e, o))
        throw r.err(`magic: invalid value: ${o} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function hl(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!Je(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function oe(t) {
  if (!To(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!Fe(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Ae({
    size: hl(Object.values(t)),
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
function up(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!Fe(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Ae({
    size: hl(t),
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
  const n = ul(typeof t == "string" ? `../${t}` : t);
  return Ae({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (c) => {
        $e(t) || n.encodeStream(r, o.length);
        for (let u = 0; u < o.length; u++)
          c(`${u}`, () => {
            const l = o[u], h = r.pos;
            if (e.encodeStream(r, l), $e(t)) {
              if (t.length > s.pos - h)
                return;
              const g = s.finish(!1).subarray(h, s.pos);
              if (Ar(g.subarray(0, t.length), t))
                throw s.err(`array: inner element encoding same as separator. elm=${l} data=${g}`);
            }
          });
      }), $e(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (s(`${c}`, () => o.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if ($e(t))
          for (let c = 0; ; c++) {
            if (Ar(r.bytes(t.length, !0), t)) {
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
const Zi = hn.ProjectivePoint, Ai = hn.CURVE.n, Kt = Ja.isBytes, kn = Ja.concatBytes, Wt = Ja.equalBytes, pl = (t) => Ph(Xt(t)), he = (...t) => Xt(Xt(kn(...t))), gl = Qe.utils.randomPrivateKey, oc = Qe.getPublicKey, fp = hn.getPublicKey, Au = (t) => t.r < Ai / 2n;
function lp(t, e, n = !1) {
  let r = hn.sign(t, e);
  if (n && !Au(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !Au(r); )
      if (o.set(Ct.encode(s++)), r = hn.sign(t, e, { extraEntropy: o }), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Iu = Qe.sign, ic = Qe.utils.taggedHash;
var we;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(we || (we = {}));
function Ir(t, e) {
  const n = t.length;
  if (e === we.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Zi.fromHex(t), t;
  } else if (e === we.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Qe.utils.lift_x(Qe.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function yl(t, e) {
  const n = Qe.utils, r = n.taggedHash("TapTweak", t, e), o = n.bytesToNumberBE(r);
  if (o >= Ai)
    throw new Error("tweak higher than curve order");
  return o;
}
function dp(t, e = Uint8Array.of()) {
  const n = Qe.utils, r = n.bytesToNumberBE(t), o = Zi.fromPrivateKey(r), s = o.hasEvenY() ? r : n.mod(-r, Ai), c = n.pointToBytes(o), u = yl(c, e);
  return n.numberToBytesBE(n.mod(s + u, Ai), 32);
}
function Ea(t, e) {
  const n = Qe.utils, r = yl(t, e), s = n.lift_x(n.bytesToNumberBE(t)).add(Zi.fromPrivateKey(r)), c = s.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(s), c];
}
const sc = Xt(Zi.BASE.toRawBytes(!1)), Br = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, ii = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Ii(t, e) {
  if (!Kt(t) || !Kt(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
var zt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(zt || (zt = {}));
function ac(t = 6, e = !1) {
  return Ae({
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
function hp(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Kt(t))
    try {
      const r = ac(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const Et = Ae({
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
      if (typeof n == "number" && (n = ac().encode(BigInt(n))), !Kt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < zt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(zt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(zt.PUSHDATA2), t.bytes(ku.encode(r))) : (t.byte(zt.PUSHDATA4), t.bytes(Ct.encode(r))), t.bytes(n);
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
          r = In.decodeStream(t);
        else if (n === zt.PUSHDATA2)
          r = ku.decodeStream(t);
        else if (n === zt.PUSHDATA4)
          r = Ct.decodeStream(t);
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
}), Bu = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Xi = Ae({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, o, s] of Object.values(Bu))
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
    const [n, r, o] = Bu[e];
    let s = 0n;
    for (let c = 0; c < r; c++)
      s |= BigInt(t.byte()) << 8n * BigInt(c);
    if (s < o)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), je = _n(Xi, Yi.numberBigint), De = Mt(Xi), cc = Te(je, De), Bi = (t) => Te(Xi, t), wl = oe({
  txid: Mt(32, !0),
  // hash(prev_tx),
  index: Ct,
  // output number of previous tx
  finalScriptSig: De,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Ct
  // ?
}), Yn = oe({ amount: hi, script: De }), pp = oe({
  version: hr,
  segwitFlag: ap(new Uint8Array([0, 1])),
  inputs: Bi(wl),
  outputs: Bi(Yn),
  witnesses: cp("segwitFlag", Te("inputs/length", cc)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Ct
});
function gp(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const mr = ke(pp, gp), Jr = oe({
  version: hr,
  inputs: Bi(wl),
  outputs: Bi(Yn),
  lockTime: Ct
}), xa = ke(Mt(null), (t) => Ir(t, we.ecdsa)), _i = ke(Mt(32), (t) => Ir(t, we.schnorr)), _u = ke(Mt(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), Qi = oe({
  fingerprint: op,
  path: Te(null, Ct)
}), ml = oe({
  hashes: Te(je, Mt(32)),
  der: Qi
}), yp = Mt(78), wp = oe({ pubKey: _i, leafHash: Mt(32) }), mp = oe({
  version: In,
  // With parity :(
  internalKey: Mt(32),
  merklePath: Te(null, Mt(32))
}), dn = ke(mp, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), bp = Te(null, oe({
  depth: In,
  version: In,
  script: De
})), Gt = Mt(null), Nu = Mt(20), Yr = Mt(32), uc = {
  unsignedTx: [0, !1, Jr, [0], [0], !1],
  xpub: [1, yp, Qi, [], [0, 2], !1],
  txVersion: [2, !1, Ct, [2], [2], !1],
  fallbackLocktime: [3, !1, Ct, [], [2], !1],
  inputCount: [4, !1, je, [2], [2], !1],
  outputCount: [5, !1, je, [2], [2], !1],
  txModifiable: [6, !1, In, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Ct, [], [0, 2], !1],
  proprietary: [252, Gt, Gt, [], [0, 2], !1]
}, Ji = {
  nonWitnessUtxo: [0, !1, mr, [], [0, 2], !1],
  witnessUtxo: [1, !1, Yn, [], [0, 2], !1],
  partialSig: [2, xa, Gt, [], [0, 2], !1],
  sighashType: [3, !1, Ct, [], [0, 2], !1],
  redeemScript: [4, !1, Gt, [], [0, 2], !1],
  witnessScript: [5, !1, Gt, [], [0, 2], !1],
  bip32Derivation: [6, xa, Qi, [], [0, 2], !1],
  finalScriptSig: [7, !1, Gt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, cc, [], [0, 2], !1],
  porCommitment: [9, !1, Gt, [], [0, 2], !1],
  ripemd160: [10, Nu, Gt, [], [0, 2], !1],
  sha256: [11, Yr, Gt, [], [0, 2], !1],
  hash160: [12, Nu, Gt, [], [0, 2], !1],
  hash256: [13, Yr, Gt, [], [0, 2], !1],
  txid: [14, !1, Yr, [2], [2], !0],
  index: [15, !1, Ct, [2], [2], !0],
  sequence: [16, !1, Ct, [], [2], !0],
  requiredTimeLocktime: [17, !1, Ct, [], [2], !1],
  requiredHeightLocktime: [18, !1, Ct, [], [2], !1],
  tapKeySig: [19, !1, _u, [], [0, 2], !1],
  tapScriptSig: [20, wp, _u, [], [0, 2], !1],
  tapLeafScript: [21, dn, Gt, [], [0, 2], !1],
  tapBip32Derivation: [22, Yr, ml, [], [0, 2], !1],
  tapInternalKey: [23, !1, _i, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Yr, [], [0, 2], !1],
  proprietary: [252, Gt, Gt, [], [0, 2], !1]
}, vp = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Ep = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Ni = {
  redeemScript: [0, !1, Gt, [], [0, 2], !1],
  witnessScript: [1, !1, Gt, [], [0, 2], !1],
  bip32Derivation: [2, xa, Qi, [], [0, 2], !1],
  amount: [3, !1, np, [2], [2], !0],
  script: [4, !1, Gt, [2], [2], !0],
  tapInternalKey: [5, !1, _i, [], [0, 2], !1],
  tapTree: [6, !1, bp, [], [0, 2], !1],
  tapBip32Derivation: [7, _i, ml, [], [0, 2], !1],
  proprietary: [252, Gt, Gt, [], [0, 2], !1]
}, xp = [], Uu = Te(al, oe({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: ip(je, oe({ type: je, key: Mt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Mt(je)
}));
function Sa(t) {
  const [e, n, r, o, s, c] = t;
  return { type: e, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: c };
}
oe({ type: je, key: Mt(null) });
function fc(t) {
  const e = {};
  for (const n in t) {
    const [r, o, s] = t[n];
    e[r] = [n, o, s];
  }
  return Ae({
    encodeStream: (n, r) => {
      let o = [];
      for (const s in t) {
        const c = r[s];
        if (c === void 0)
          continue;
        const [u, l, h] = t[s];
        if (!l)
          o.push({ key: { type: u, key: Ht }, value: h.encode(c) });
        else {
          const g = c.map(([y, w]) => [
            l.encode(y),
            h.encode(w)
          ]);
          g.sort((y, w) => Ii(y[0], w[0]));
          for (const [y, w] of g)
            o.push({ key: { key: y, type: u }, value: w });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, c) => Ii(s[0].key, c[0].key));
        for (const [s, c] of r.unknown)
          o.push({ key: s, value: c });
      }
      Uu.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Uu.decodeStream(n), o = {}, s = {};
      for (const c of r) {
        let u = "unknown", l = c.key.key, h = c.value;
        if (e[c.key.type]) {
          const [g, y, w] = e[c.key.type];
          if (u = g, !y && l.length)
            throw new Error(`PSBT: Non-empty key for ${u} (key=${rt.encode(l)} value=${rt.encode(h)}`);
          if (l = y ? y.decode(l) : void 0, h = w.decode(h), !y) {
            if (o[u])
              throw new Error(`PSBT: Same keys: ${u} (key=${l} value=${h})`);
            o[u] = h, s[u] = !0;
            continue;
          }
        } else
          l = { type: c.key.type, key: c.key.key };
        if (s[u])
          throw new Error(`PSBT: Key type with empty key and no key=${u} val=${h}`);
        o[u] || (o[u] = []), o[u].push([l, h]);
      }
      return o;
    }
  });
}
const lc = ke(fc(Ji), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      Ir(e, we.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Ir(e, we.ecdsa);
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
}), dc = ke(fc(Ni), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Ir(e, we.ecdsa);
  return t;
}), bl = ke(fc(uc), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Sp = oe({
  magic: rc(nc(new Uint8Array([255])), "psbt"),
  global: bl,
  inputs: Te("global/unsignedTx/inputs/length", lc),
  outputs: Te(null, dc)
}), Tp = oe({
  magic: rc(nc(new Uint8Array([255])), "psbt"),
  global: bl,
  inputs: Te("global/inputCount", lc),
  outputs: Te("global/outputCount", dc)
});
oe({
  magic: rc(nc(new Uint8Array([255])), "psbt"),
  items: Te(null, _n(Te(al, up([sp(je), Mt(Xi)])), Yi.dict()))
});
function zs(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: o } = Sa(e[r]);
    if (!o.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: o } = Sa(e[r]);
    if (o.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Cu(t, e, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!e[s])
        continue;
      const { allowInc: c, silentIgnore: u } = Sa(e[s]);
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
function vl(t) {
  const e = t && t.global && t.global.version || 0;
  zs(e, uc, t.global);
  for (const c of t.inputs)
    zs(e, Ji, c);
  for (const c of t.outputs)
    zs(e, Ni, c);
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
function Ta(t, e, n, r, o) {
  const s = { ...n, ...e };
  for (const c in t) {
    const u = c, [l, h, g] = t[u], y = r && !r.includes(c);
    if (e[c] === void 0 && c in e) {
      if (y)
        throw new Error(`Cannot remove signed field=${c}`);
      delete s[c];
    } else if (h) {
      const w = n && n[c] ? n[c] : [];
      let b = e[u];
      if (b) {
        if (!Array.isArray(b))
          throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
        b = b.map((L) => {
          if (L.length !== 2)
            throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
          return [
            typeof L[0] == "string" ? h.decode(rt.decode(L[0])) : L[0],
            typeof L[1] == "string" ? g.decode(rt.decode(L[1])) : L[1]
          ];
        });
        const E = {}, T = (L, G, Q) => {
          if (E[L] === void 0) {
            E[L] = [G, Q];
            return;
          }
          const F = rt.encode(g.encode(E[L][1])), H = rt.encode(g.encode(Q));
          if (F !== H)
            throw new Error(`keyMap(${u}): same key=${L} oldVal=${F} newVal=${H}`);
        };
        for (const [L, G] of w) {
          const Q = rt.encode(h.encode(L));
          T(Q, L, G);
        }
        for (const [L, G] of b) {
          const Q = rt.encode(h.encode(L));
          if (G === void 0) {
            if (y)
              throw new Error(`Cannot remove signed field=${u}/${L}`);
            delete E[Q];
          } else
            T(Q, L, G);
        }
        s[u] = Object.values(E);
      }
    } else if (typeof s[c] == "string")
      s[c] = g.decode(rt.decode(s[c]));
    else if (y && c in e && n && n[c] !== void 0 && !Wt(g.encode(e[c]), g.encode(n[c])))
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
const Ou = ke(Sp, vl), Ru = ke(Tp, vl), kp = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Kt(t[1]) || rt.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: Et.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, rt.decode("4e73")];
  }
};
function pr(t, e) {
  try {
    return Ir(t, e), !0;
  } catch {
    return !1;
  }
}
const Ap = {
  encode(t) {
    if (!(t.length !== 2 || !Kt(t[0]) || !pr(t[0], we.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Ip = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Kt(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Bp = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Kt(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, _p = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Kt(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Np = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Kt(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Up = {
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
        if (!Kt(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Cp = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Kt(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Op = {
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
      if (!Kt(o))
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
}, Rp = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = hp(t[e - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < e - 1; o++) {
        const s = t[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Kt(s))
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
}, $p = {
  encode(t) {
    return { type: "unknown", script: Et.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? Et.decode(t.script) : void 0
}, Pp = [
  kp,
  Ap,
  Ip,
  Bp,
  _p,
  Np,
  Up,
  Cp,
  Op,
  Rp,
  $p
], Lp = _n(Et, Yi.match(Pp)), Qt = ke(Lp, (t) => {
  if (t.type === "pk" && !pr(t.pubkey, we.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Kt(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Kt(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Kt(t.pubkey) || !pr(t.pubkey, we.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!pr(n, we.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!pr(e, we.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function $u(t, e) {
  if (!Wt(t.hash, Xt(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = Qt.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function El(t, e, n) {
  if (t) {
    const r = Qt.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!Wt(r.hash, pl(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = Qt.decode(e);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && $u(r, n);
  }
  if (e) {
    const r = Qt.decode(e);
    r.type === "wsh" && n && $u(r, n);
  }
}
function Kp(t) {
  const e = {};
  for (const n of t) {
    const r = rt.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(rt.encode)}`);
    e[r] = !0;
  }
}
function Dp(t, e, n = !1, r) {
  const o = Qt.decode(t);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const c of s.pubkeys) {
      if (Wt(c, sc))
        throw new Error("Unspendable taproot key in leaf script");
      if (Wt(c, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function xl(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((c, u) => (u.weight || 1) - (c.weight || 1));
    const r = e.pop(), o = e.pop(), s = (o?.weight || 1) + (r?.weight || 1);
    e.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [o?.childs || o, r?.childs || r]
    });
  }
  const n = e[0];
  return n?.childs || n;
}
function ka(t, e = []) {
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
    left: ka(t.left, [t.right.hash, ...e]),
    right: ka(t.right, [t.left.hash, ...e])
  };
}
function Aa(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...Aa(t.left), ...Aa(t.right)];
}
function Ia(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: l, script: h } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !Wt(t.tapMerkleRoot, Ht))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const g = typeof h == "string" ? rt.decode(h) : h;
    if (!Kt(g))
      throw new Error(`checkScript: wrong script type=${g}`);
    return Dp(g, e, n), {
      type: "leaf",
      version: l,
      script: g,
      hash: no(g, l)
    };
  }
  if (t.length !== 2 && (t = xl(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Ia(t[0], e, n), s = Ia(t[1], e, n);
  let [c, u] = [o.hash, s.hash];
  return Ii(u, c) === -1 && ([c, u] = [u, c]), { type: "branch", left: o, right: s, hash: ic("TapBranch", c, u) };
}
const Ui = 192, no = (t, e = Ui) => ic("TapLeaf", new Uint8Array([e]), De.encode(t));
function Mp(t, e, n = Br, r = !1, o) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof t == "string" ? rt.decode(t) : t || sc;
  if (!pr(s, we.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (e) {
    let c = ka(Ia(e, s, r));
    const u = c.hash, [l, h] = Ea(s, u), g = Aa(c).map((y) => ({
      ...y,
      controlBlock: dn.encode({
        version: (y.version || Ui) + h,
        internalKey: s,
        merklePath: y.path
      })
    }));
    return {
      type: "tr",
      script: Qt.encode({ type: "tr", pubkey: l }),
      address: tr(n).encode({ type: "tr", pubkey: l }),
      // For tests
      tweakedPubkey: l,
      // PSBT stuff
      tapInternalKey: s,
      leaves: g,
      tapLeafScript: g.map((y) => [
        dn.decode(y.controlBlock),
        kn(y.script, new Uint8Array([y.version || Ui]))
      ]),
      tapMerkleRoot: u
    };
  } else {
    const c = Ea(s, Ht)[0];
    return {
      type: "tr",
      script: Qt.encode({ type: "tr", pubkey: c }),
      address: tr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Vp(t, e, n = !1) {
  return n || Kp(e), {
    type: "tr_ms",
    script: Qt.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const Sl = jh(Xt);
function Tl(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Gs(t, e, n = Br) {
  Tl(t, e);
  const r = t === 0 ? ba : dr;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Pu(t, e) {
  return Sl.encode(kn(Uint8Array.from(e), t));
}
function tr(t = Br) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return Gs(0, e.hash, t);
      if (n === "wsh")
        return Gs(0, e.hash, t);
      if (n === "tr")
        return Gs(1, e.pubkey, t);
      if (n === "pkh")
        return Pu(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Pu(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = ba.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = dr.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, c = ba.fromWords(s);
        if (Tl(o, c), o === 0 && c.length === 32)
          return { type: "wsh", hash: c };
        if (o === 0 && c.length === 20)
          return { type: "wpkh", hash: c };
        if (o === 1 && c.length === 32)
          return { type: "tr", pubkey: c };
        throw new Error("Unknown witness program");
      }
      const n = Sl.decode(e);
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
const si = new Uint8Array(32), Hp = {
  amount: 0xffffffffffffffffn,
  script: Ht
}, Fp = (t) => Math.ceil(t / 4), jp = 8, qp = 2, Hn = 0, hc = 4294967295;
Yi.decimal(jp);
const ro = (t, e) => t === void 0 ? e : t;
function Ci(t) {
  if (Array.isArray(t))
    return t.map((e) => Ci(e));
  if (Kt(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Ci(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Lt;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Lt || (Lt = {}));
var gn;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(gn || (gn = {}));
function zp(t, e, n, r = Ht) {
  return Wt(n, e) && (t = dp(t, r), e = oc(t)), { privKey: t, pubKey: e };
}
function Fn(t) {
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
    sequence: ro(t.sequence, hc),
    finalScriptSig: ro(t.finalScriptSig, Ht)
  };
}
function Ws(t) {
  for (const e in t) {
    const n = e;
    vp.includes(n) || delete t[n];
  }
}
const Ys = oe({ txid: Mt(32, !0), index: Ct });
function Gp(t) {
  if (typeof t != "number" || typeof gn[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Lu(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Lt.ANYONECANPAY),
    isNone: e === Lt.NONE,
    isSingle: e === Lt.SINGLE
  };
}
function Wp(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: ro(t.version, qp),
    lockTime: ro(t.lockTime, 0),
    PSBTVersion: ro(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Ct.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
function Ku(t) {
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!Wt(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (t.txid) {
      if (t.nonWitnessUtxo.outputs.length - 1 < t.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = ce.fromRaw(mr.encode(t.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = rt.encode(t.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return t;
}
function pi(t) {
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
function Du(t, e, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: c } = t;
  typeof s == "string" && (s = rt.decode(s)), Kt(s) && (s = mr.decode(s)), !("nonWitnessUtxo" in t) && s === void 0 && (s = e?.nonWitnessUtxo), typeof c == "string" && (c = rt.decode(c)), c === void 0 && (c = e?.txid);
  let u = { ...e, ...t, nonWitnessUtxo: s, txid: c };
  !("nonWitnessUtxo" in t) && u.nonWitnessUtxo === void 0 && delete u.nonWitnessUtxo, u.sequence === void 0 && (u.sequence = hc), u.tapMerkleRoot === null && delete u.tapMerkleRoot, u = Ta(Ji, u, e, n, o), lc.encode(u);
  let l;
  return u.nonWitnessUtxo && u.index !== void 0 ? l = u.nonWitnessUtxo.outputs[u.index] : u.witnessUtxo && (l = u.witnessUtxo), l && !r && El(l && l.script, u.redeemScript, u.witnessScript), u;
}
function Mu(t, e = !1) {
  let n = "legacy", r = Lt.ALL;
  const o = pi(t), s = Qt.decode(o.script);
  let c = s.type, u = s;
  const l = [s];
  if (s.type === "tr")
    return r = Lt.DEFAULT, {
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
      let w = Qt.decode(t.redeemScript);
      (w.type === "wpkh" || w.type === "wsh") && (n = "segwit"), l.push(w), u = w, c += `-${w.type}`;
    }
    if (u.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let w = Qt.decode(t.witnessScript);
      w.type === "wsh" && (n = "segwit"), l.push(w), u = w, c += `-${w.type}`;
    }
    const h = l[l.length - 1];
    if (h.type === "sh" || h.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const g = Qt.encode(h), y = {
      type: c,
      txType: n,
      last: h,
      lastScript: g,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return y;
  }
}
class ce {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = Wp(e);
    n.lockTime !== Hn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = mr.decode(e), o = new ce({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Ou.decode(e);
    } catch (y) {
      try {
        r = Ru.decode(e);
      } catch {
        throw y;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, c = o === 0 ? s?.version : r.global.txVersion, u = o === 0 ? s?.lockTime : r.global.fallbackLocktime, l = new ce({ ...n, version: c, lockTime: u, PSBTVersion: o }), h = o === 0 ? s?.inputs.length : r.global.inputCount;
    l.inputs = r.inputs.slice(0, h).map((y, w) => Ku({
      finalScriptSig: Ht,
      ...r.global.unsignedTx?.inputs[w],
      ...y
    }));
    const g = o === 0 ? s?.outputs.length : r.global.outputCount;
    return l.outputs = r.outputs.slice(0, g).map((y, w) => ({
      ...y,
      ...r.global.unsignedTx?.outputs[w]
    })), l.global = { ...r.global, txVersion: c }, u !== Hn && (l.global.fallbackLocktime = u), l;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((s) => Ku(Cu(e, Ji, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => Cu(e, Ni, s)), o = { ...this.global };
    return e === 0 ? (o.unsignedTx = Jr.decode(Jr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Zr).map((s) => ({
        ...s,
        finalScriptSig: Ht
      })),
      outputs: this.outputs.map(Fn)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = e, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Hn && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Ou : Ru).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Hn, n = 0, r = Hn, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (e = Math.max(e, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? e : r !== Hn ? r : this.global.fallbackLocktime || Hn;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? Lt.DEFAULT : n, o = r === Lt.DEFAULT ? Lt.ALL : r & 3;
    return { sigInputs: r & Lt.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: u, sigOutputs: l } = this.inputSighash(s);
      if (u === Lt.ANYONECANPAY ? r.push(s) : e = !1, l === Lt.ALL)
        n = !1;
      else if (l === Lt.SINGLE)
        o.push(s);
      else if (l !== Lt.NONE) throw new Error(`Wrong signature hash output type: ${l}`);
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
    const n = this.outputs.map(Fn);
    e += 4 * je.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * De.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * je.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * De.encode(r.finalScriptSig || Ht).length, this.hasWitnesses && r.finalScriptWitness && (e += cc.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return Fp(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return mr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Zr).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Ht
      })),
      outputs: this.outputs.map(Fn),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return rt.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return rt.encode(he(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return rt.encode(he(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Ci(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Du(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(e)) && (o = Ep);
    }
    this.inputs[e] = Du(n, this.inputs[e], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Ci(this.outputs[e]);
  }
  getOutputAddress(e, n = Br) {
    const r = this.getOutput(e);
    if (r.script)
      return tr(n).encode(Qt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: o, script: s } = e;
    if (o === void 0 && (o = n?.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = rt.decode(s)), s === void 0 && (s = n?.script);
    let c = { ...n, ...e, amount: o, script: s };
    if (c.amount === void 0 && delete c.amount, c = Ta(Ni, c, n, r, this.opts.allowUnknown), dc.encode(c), c.script && !this.opts.allowUnknownOutputs && Qt.decode(c.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || El(c.script, c.redeemScript, c.witnessScript), c;
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
      (!s.addOutput || s.outputs.includes(e)) && (o = xp);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], o);
  }
  addOutputAddress(e, n, r = Br) {
    return this.addOutput({ script: Qt.encode(tr(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const o = pi(r);
      if (!o)
        throw new Error("Empty input amount");
      e += o.amount;
    }
    const n = this.outputs.map(Fn);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: o, isNone: s, isSingle: c } = Lu(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return dl.encode(1n);
    n = Et.encode(Et.decode(n).filter((g) => g !== "CODESEPARATOR"));
    let u = this.inputs.map(Zr).map((g, y) => ({
      ...g,
      finalScriptSig: y === e ? n : Ht
    }));
    o ? u = [u[e]] : (s || c) && (u = u.map((g, y) => ({
      ...g,
      sequence: y === e ? g.sequence : 0
    })));
    let l = this.outputs.map(Fn);
    s ? l = [] : c && (l = l.slice(0, e).fill(Hp).concat([l[e]]));
    const h = mr.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: u,
      outputs: l
    });
    return he(h, hr.encode(r));
  }
  preimageWitnessV0(e, n, r, o) {
    const { isAny: s, isNone: c, isSingle: u } = Lu(r);
    let l = si, h = si, g = si;
    const y = this.inputs.map(Zr), w = this.outputs.map(Fn);
    s || (l = he(...y.map(Ys.encode))), !s && !u && !c && (h = he(...y.map((E) => Ct.encode(E.sequence)))), !u && !c ? g = he(...w.map(Yn.encode)) : u && e < w.length && (g = he(Yn.encode(w[e])));
    const b = y[e];
    return he(hr.encode(this.version), l, h, Mt(32, !0).encode(b.txid), Ct.encode(b.index), De.encode(n), hi.encode(o), Ct.encode(b.sequence), g, Ct.encode(this.lockTime), Ct.encode(r));
  }
  preimageWitnessV1(e, n, r, o, s = -1, c, u = 192, l) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const h = [
      In.encode(0),
      In.encode(r),
      // U8 sigHash
      hr.encode(this.version),
      Ct.encode(this.lockTime)
    ], g = r === Lt.DEFAULT ? Lt.ALL : r & 3, y = r & Lt.ANYONECANPAY, w = this.inputs.map(Zr), b = this.outputs.map(Fn);
    y !== Lt.ANYONECANPAY && h.push(...[
      w.map(Ys.encode),
      o.map(hi.encode),
      n.map(De.encode),
      w.map((T) => Ct.encode(T.sequence))
    ].map((T) => Xt(kn(...T)))), g === Lt.ALL && h.push(Xt(kn(...b.map(Yn.encode))));
    const E = (l ? 1 : 0) | (c ? 2 : 0);
    if (h.push(new Uint8Array([E])), y === Lt.ANYONECANPAY) {
      const T = w[e];
      h.push(Ys.encode(T), hi.encode(o[e]), De.encode(n[e]), Ct.encode(T.sequence));
    } else
      h.push(Ct.encode(e));
    return E & 1 && h.push(Xt(De.encode(l || Ht))), g === Lt.SINGLE && h.push(e < b.length ? Xt(Yn.encode(b[e])) : si), c && h.push(no(c, u), In.encode(0), hr.encode(s)), ic("TapSighash", ...h);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], c = Mu(s, this.opts.allowLegacyWitnessUtxo);
    if (!Kt(e)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const g = s.bip32Derivation.filter((w) => w[1].fingerprint == e.fingerprint).map(([w, { path: b }]) => {
        let E = e;
        for (const T of b)
          E = E.deriveChild(T);
        if (!Wt(E.publicKey, w))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!E.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return E;
      });
      if (!g.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let y = !1;
      for (const w of g)
        this.signIdx(w.privateKey, n) && (y = !0);
      return y;
    }
    r ? r.forEach(Gp) : r = [c.defaultSighash];
    const u = c.sighash;
    if (!r.includes(u))
      throw new Error(`Input with not allowed sigHash=${u}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: l } = this.inputSighash(n);
    if (l === Lt.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const h = pi(s);
    if (c.txType === "taproot") {
      const g = this.inputs.map(pi), y = g.map((L) => L.script), w = g.map((L) => L.amount);
      let b = !1, E = oc(e), T = s.tapMerkleRoot || Ht;
      if (s.tapInternalKey) {
        const { pubKey: L, privKey: G } = zp(e, E, s.tapInternalKey, T), [Q, F] = Ea(s.tapInternalKey, T);
        if (Wt(Q, L)) {
          const H = this.preimageWitnessV1(n, y, u, w), V = kn(Iu(H, G, o), u !== Lt.DEFAULT ? new Uint8Array([u]) : Ht);
          this.updateInput(n, { tapKeySig: V }, !0), b = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [L, G] of s.tapLeafScript) {
          const Q = G.subarray(0, -1), F = Et.decode(Q), H = G[G.length - 1], V = no(Q, H);
          if (F.findIndex((lt) => Kt(lt) && Wt(lt, E)) === -1)
            continue;
          const A = this.preimageWitnessV1(n, y, u, w, void 0, Q, H), yt = kn(Iu(A, e, o), u !== Lt.DEFAULT ? new Uint8Array([u]) : Ht);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: E, leafHash: V }, yt]] }, !0), b = !0;
        }
      }
      if (!b)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const g = fp(e);
      let y = !1;
      const w = pl(g);
      for (const T of Et.decode(c.lastScript))
        Kt(T) && (Wt(T, g) || Wt(T, w)) && (y = !0);
      if (!y)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let b;
      if (c.txType === "legacy")
        b = this.preimageLegacy(n, c.lastScript, u);
      else if (c.txType === "segwit") {
        let T = c.lastScript;
        c.last.type === "wpkh" && (T = Qt.encode({ type: "pkh", hash: c.last.hash })), b = this.preimageWitnessV0(n, T, u, h.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const E = lp(b, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[g, kn(E, new Uint8Array([u]))]]
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
    const n = this.inputs[e], r = Mu(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const l = n.tapLeafScript.sort((h, g) => dn.encode(h[0]).length - dn.encode(g[0]).length);
        for (const [h, g] of l) {
          const y = g.slice(0, -1), w = g[g.length - 1], b = Qt.decode(y), E = no(y, w), T = n.tapScriptSig.filter((G) => Wt(G[0].leafHash, E));
          let L = [];
          if (b.type === "tr_ms") {
            const G = b.m, Q = b.pubkeys;
            let F = 0;
            for (const H of Q) {
              const V = T.findIndex((st) => Wt(st[0].pubKey, H));
              if (F === G || V === -1) {
                L.push(Ht);
                continue;
              }
              L.push(T[V][1]), F++;
            }
            if (F !== G)
              continue;
          } else if (b.type === "tr_ns") {
            for (const G of b.pubkeys) {
              const Q = T.findIndex((F) => Wt(F[0].pubKey, G));
              Q !== -1 && L.push(T[Q][1]);
            }
            if (L.length !== b.pubkeys.length)
              continue;
          } else if (b.type === "unknown" && this.opts.allowUnknownInputs) {
            const G = Et.decode(y);
            if (L = T.map(([{ pubKey: Q }, F]) => {
              const H = G.findIndex((V) => Kt(V) && Wt(V, Q));
              if (H === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: F, pos: H };
            }).sort((Q, F) => Q.pos - F.pos).map((Q) => Q.signature), !L.length)
              continue;
          } else {
            const G = this.opts.customScripts;
            if (G)
              for (const Q of G) {
                if (!Q.finalizeTaproot)
                  continue;
                const F = Et.decode(y), H = Q.encode(F);
                if (H === void 0)
                  continue;
                const V = Q.finalizeTaproot(y, H, T);
                if (V) {
                  n.finalScriptWitness = V.concat(dn.encode(h)), n.finalScriptSig = Ht, Ws(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = L.reverse().concat([y, dn.encode(h)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Ht, Ws(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = Ht, s = [];
    if (r.last.type === "ms") {
      const l = r.last.m, h = r.last.pubkeys;
      let g = [];
      for (const y of h) {
        const w = n.partialSig.find((b) => Wt(y, b[0]));
        w && g.push(w[1]);
      }
      if (g = g.slice(0, l), g.length !== l)
        throw new Error(`Multisig: wrong signatures count, m=${l} n=${h.length} signatures=${g.length}`);
      o = Et.encode([0, ...g]);
    } else if (r.last.type === "pk")
      o = Et.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = Et.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = Ht, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let c, u;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = Et.decode(o).map((l) => {
      if (l === 0)
        return Ht;
      if (Kt(l))
        return l;
      throw new Error(`Wrong witness op=${l}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (u = s), r.type.startsWith("sh-wsh-") ? c = Et.encode([Et.encode([0, Xt(r.lastScript)])]) : r.type.startsWith("sh-") ? c = Et.encode([...Et.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (c = o), !c && !u)
      throw new Error("Unknown error finalizing input");
    c && (n.finalScriptSig = c), u && (n.finalScriptWitness = u), Ws(n);
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
    const n = this.global.unsignedTx ? Jr.encode(this.global.unsignedTx) : Ht, r = e.global.unsignedTx ? Jr.encode(e.global.unsignedTx) : Ht;
    if (!Wt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ta(uc, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, e.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, e.outputs[o], !0);
    return this;
  }
  clone() {
    return ce.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class kl extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: Al, pointToBytes: ai } = Qe.utils, Nn = hn.ProjectivePoint, tn = 33, Ba = new Uint8Array(tn), An = hn.CURVE.n, Vu = _n(Mt(33), {
  decode: (t) => pc(t) ? Ba : t.toRawBytes(!0),
  encode: (t) => co(t, Ba) ? Nn.ZERO : Nn.fromHex(t)
}), Hu = ke(dl, (t) => (yr("n", t, 1n, An), t)), gi = oe({ R1: Vu, R2: Vu }), Il = oe({ k1: Hu, k2: Hu, publicKey: Mt(tn) });
function Fu(t, ...e) {
}
function Me(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => ae(n, ...e));
}
function ju(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Ve = (t) => Ne(t, An), Oi = (t, ...e) => Ve(He(Al(t, ...e))), Xr = (t, e) => t.hasEvenY() ? e : Ve(-e);
function Zn(t) {
  return Nn.BASE.multiply(t);
}
function pc(t) {
  return t.equals(Nn.ZERO);
}
function _a(t) {
  return Me(t, tn), t.sort(Ii);
}
function Bl(t) {
  Me(t, tn);
  for (let e = 1; e < t.length; e++)
    if (!co(t[e], t[0]))
      return t[e];
  return Ba;
}
function _l(t) {
  return Me(t, tn), Al("KeyAgg list", ...t);
}
function Nl(t, e, n) {
  return ae(t, tn), ae(e, tn), co(t, e) ? 1n : Oi("KeyAgg coefficient", n, t);
}
function Na(t, e = [], n = []) {
  if (Me(t, tn), Me(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Bl(t), o = _l(t);
  let s = Nn.ZERO;
  for (let l = 0; l < t.length; l++) {
    let h;
    try {
      h = Nn.fromHex(t[l]);
    } catch {
      throw new kl(l, "pubkey");
    }
    s = s.add(h.multiply(Nl(t[l], r, o)));
  }
  let c = 1n, u = 0n;
  for (let l = 0; l < e.length; l++) {
    const h = n[l] && !s.hasEvenY() ? Ve(-1n) : 1n, g = He(e[l]);
    if (yr("tweak", g, 0n, An), s = s.multiply(h).add(Zn(g)), pc(s))
      throw new Error("The result of tweaking cannot be infinity");
    c = Ve(h * c), u = Ve(g + h * u);
  }
  return { aggPublicKey: s, gAcc: c, tweakAcc: u };
}
const qu = (t, e, n, r, o, s) => Oi("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, o, Jn(s.length, 4), s, new Uint8Array([r]));
function Yp(t, e, n = new Uint8Array(0), r, o = new Uint8Array(0), s = er(32)) {
  ae(t, tn), Fu(e, 32), ae(n, 0, 32), Fu(), ae(o), ae(s, 32);
  const c = new Uint8Array([0]), u = qu(s, t, n, 0, c, o), l = qu(s, t, n, 1, c, o);
  return {
    secret: Il.encode({ k1: u, k2: l, publicKey: t }),
    public: gi.encode({ R1: Zn(u), R2: Zn(l) })
  };
}
class Zp {
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
    if (Me(n, 33), Me(o, 32), ju(s), ae(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: u, tweakAcc: l } = Na(n, o, s), { R1: h, R2: g } = gi.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = u, this.tweakAcc = l, this.b = Oi("MuSig/noncecoef", e, ai(c), r);
    const y = h.add(g.multiply(this.b));
    this.R = pc(y) ? Nn.BASE : y, this.e = Oi("BIP0340/challenge", ai(this.R), ai(c), r), this.tweaks = o, this.isXonly = s, this.L = _l(n), this.secondKey = Bl(n);
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
    return Nl(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: o, gAcc: s, b: c, R: u, e: l } = this, h = He(e);
    if (h >= An)
      return !1;
    const { R1: g, R2: y } = gi.decode(n), w = g.add(y.multiply(c)), b = u.hasEvenY() ? w : w.negate(), E = Nn.fromHex(r), T = this.getSessionKeyAggCoeff(E), L = Ve(Xr(o, 1n) * s), G = Zn(h), Q = b.add(E.multiply(Ve(l * T * L)));
    return G.equals(Q);
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
    if (ae(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: c, R: u, e: l } = this, { k1: h, k2: g, publicKey: y } = Il.decode(e);
    e.fill(0, 0, 64), yr("k1", h, 0n, An), yr("k2", g, 0n, An);
    const w = Xr(u, h), b = Xr(u, g), E = He(n);
    yr("d_", E, 1n, An);
    const T = Zn(E), L = T.toRawBytes(!0);
    if (!co(L, y))
      throw new Error("Public key does not match nonceGen argument");
    const G = this.getSessionKeyAggCoeff(T), Q = Xr(o, 1n), F = Ve(Q * s * E), H = Ve(w + c * b + l * G * F), V = Jn(H, 32);
    if (!r) {
      const st = gi.encode({
        R1: Zn(h),
        R2: Zn(g)
      });
      if (!this.partialSigVerifyInternal(V, st, L))
        throw new Error("Partial signature verification failed");
    }
    return V;
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
    if (ae(e, 32), Me(n, 66), Me(o, tn), Me(s, 32), ju(c), ao(r), n.length !== o.length)
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
    Me(e, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let c = 0n;
    for (let l = 0; l < e.length; l++) {
      const h = He(e[l]);
      if (h >= An)
        throw new kl(l, "psig");
      c = Ve(c + h);
    }
    const u = Xr(n, 1n);
    return c = Ve(c + s * u * r), Re(ai(o), Jn(c, 32));
  }
}
function Xp(t) {
  const e = Yp(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gc = /* @__PURE__ */ BigInt(0), Ua = /* @__PURE__ */ BigInt(1);
function Ao(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function yc(t) {
  if (!Ao(t))
    throw new Error("Uint8Array expected");
}
function uo(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function ci(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Ul(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? gc : BigInt("0x" + t);
}
const Cl = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), Qp = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function fo(t) {
  if (yc(t), Cl)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Qp[t[n]];
  return e;
}
const on = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function zu(t) {
  if (t >= on._0 && t <= on._9)
    return t - on._0;
  if (t >= on.A && t <= on.F)
    return t - (on.A - 10);
  if (t >= on.a && t <= on.f)
    return t - (on.a - 10);
}
function Ri(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (Cl)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = zu(t.charCodeAt(s)), u = zu(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const l = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Xe(t) {
  return Ul(fo(t));
}
function Ol(t) {
  return yc(t), Ul(fo(Uint8Array.from(t).reverse()));
}
function nr(t, e) {
  return Ri(t.toString(16).padStart(e * 2, "0"));
}
function Rl(t, e) {
  return nr(t, e).reverse();
}
function ie(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Ri(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (Ao(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function _r(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    yc(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
const Zs = (t) => typeof t == "bigint" && gc <= t;
function lo(t, e, n) {
  return Zs(t) && Zs(e) && Zs(n) && e <= t && t < n;
}
function Qn(t, e, n, r) {
  if (!lo(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Jp(t) {
  let e;
  for (e = 0; t > gc; t >>= Ua, e += 1)
    ;
  return e;
}
const ts = (t) => (Ua << BigInt(t)) - Ua, Xs = (t) => new Uint8Array(t), Gu = (t) => Uint8Array.from(t);
function tg(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Xs(t), o = Xs(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...y) => n(o, r, ...y), l = (y = Xs(0)) => {
    o = u(Gu([0]), y), r = u(), y.length !== 0 && (o = u(Gu([1]), y), r = u());
  }, h = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let y = 0;
    const w = [];
    for (; y < e; ) {
      r = u();
      const b = r.slice();
      w.push(b), y += r.length;
    }
    return _r(...w);
  };
  return (y, w) => {
    c(), l(y);
    let b;
    for (; !(b = w(h())); )
      l();
    return c(), b;
  };
}
const eg = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Ao(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function es(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = eg[s];
    if (typeof u != "function")
      throw new Error("invalid validator function");
    const l = t[o];
    if (!(c && l === void 0) && !u(l, t))
      throw new Error("param " + String(o) + " is invalid. Expected " + s + ", got " + l);
  };
  for (const [o, s] of Object.entries(e))
    r(o, s, !1);
  for (const [o, s] of Object.entries(n))
    r(o, s, !0);
  return t;
}
function Wu(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const s = t(n, ...r);
    return e.set(n, s), s;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const wc = 2n ** 256n, br = wc - 0x1000003d1n, $l = wc - 0x14551231950b75fc4402da1732fc9bebfn, ng = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, rg = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, mc = {
  n: $l,
  a: 0n,
  b: 7n
}, oo = 32, Yu = (t) => gt(gt(t * t) * t + mc.b), pe = (t = "") => {
  throw new Error(t);
}, ns = (t) => typeof t == "bigint", Pl = (t) => typeof t == "string", Qs = (t) => ns(t) && 0n < t && t < br, Ll = (t) => ns(t) && 0n < t && t < $l, og = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", Ca = (t, e) => (
  // assert is Uint8Array (of specific length)
  !og(t) || typeof e == "number" && e > 0 && t.length !== e ? pe("Uint8Array expected") : t
), Kl = (t) => new Uint8Array(t), Dl = (t, e) => Ca(Pl(t) ? bc(t) : Kl(Ca(t)), e), gt = (t, e = br) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, Zu = (t) => t instanceof Nr ? t : pe("Point expected");
let Nr = class lr {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? to : new lr(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Dl(e);
    let n;
    const r = e[0], o = e.subarray(1), s = Qu(o, 0, oo), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      Qs(s) || pe("Point hex invalid: x not FE");
      let u = ag(Yu(s));
      const l = (u & 1n) === 1n;
      (r & 1) === 1 !== l && (u = gt(-u)), n = new lr(s, u, 1n);
    }
    return c === 65 && r === 4 && (n = new lr(s, Qu(o, oo, 2 * oo), 1n)), n ? n.ok() : pe("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return io.mul(cg(e));
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Zu(e), l = gt(n * u), h = gt(s * o), g = gt(r * u), y = gt(c * o);
    return l === h && g === y;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new lr(this.px, gt(-this.py), this.pz);
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Zu(e), { a: l, b: h } = mc;
    let g = 0n, y = 0n, w = 0n;
    const b = gt(h * 3n);
    let E = gt(n * s), T = gt(r * c), L = gt(o * u), G = gt(n + r), Q = gt(s + c);
    G = gt(G * Q), Q = gt(E + T), G = gt(G - Q), Q = gt(n + o);
    let F = gt(s + u);
    return Q = gt(Q * F), F = gt(E + L), Q = gt(Q - F), F = gt(r + o), g = gt(c + u), F = gt(F * g), g = gt(T + L), F = gt(F - g), w = gt(l * Q), g = gt(b * L), w = gt(g + w), g = gt(T - w), w = gt(T + w), y = gt(g * w), T = gt(E + E), T = gt(T + E), L = gt(l * L), Q = gt(b * Q), T = gt(T + L), L = gt(E - L), L = gt(l * L), Q = gt(Q + L), E = gt(T * Q), y = gt(y + E), E = gt(F * Q), g = gt(G * g), g = gt(g - E), E = gt(G * T), w = gt(F * w), w = gt(w + E), new lr(g, y, w);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return to;
    if (Ll(e) || pe("scalar invalid"), this.equals(io))
      return fg(e).p;
    let r = to, o = io;
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
    if (this.equals(to))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const o = sg(r, br);
    return gt(r * o) !== 1n && pe("inverse invalid"), { x: gt(e * o), y: gt(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!Qs(e) || !Qs(n)) && pe("Point invalid: x or y"), gt(n * n) === Yu(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : pe("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Ju(n) + (e ? "" : Ju(r));
  }
  toRawBytes(e = !0) {
    return bc(this.toHex(e));
  }
};
Nr.BASE = new Nr(ng, rg, 1n);
Nr.ZERO = new Nr(0n, 1n, 0n);
const { BASE: io, ZERO: to } = Nr, Ml = (t, e) => t.toString(16).padStart(e, "0"), Vl = (t) => Array.from(Ca(t)).map((e) => Ml(e, 2)).join(""), sn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Xu = (t) => {
  if (t >= sn._0 && t <= sn._9)
    return t - sn._0;
  if (t >= sn.A && t <= sn.F)
    return t - (sn.A - 10);
  if (t >= sn.a && t <= sn.f)
    return t - (sn.a - 10);
}, bc = (t) => {
  const e = "hex invalid";
  if (!Pl(t))
    return pe(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return pe(e);
  const o = Kl(r);
  for (let s = 0, c = 0; s < r; s++, c += 2) {
    const u = Xu(t.charCodeAt(c)), l = Xu(t.charCodeAt(c + 1));
    if (u === void 0 || l === void 0)
      return pe(e);
    o[s] = u * 16 + l;
  }
  return o;
}, Hl = (t) => BigInt("0x" + (Vl(t) || "0")), Qu = (t, e, n) => Hl(t.slice(e, n)), ig = (t) => ns(t) && t >= 0n && t < wc ? bc(Ml(t, 2 * oo)) : pe("bigint expected"), Ju = (t) => Vl(ig(t)), sg = (t, e) => {
  (t === 0n || e <= 0n) && pe("no inverse n=" + t + " mod=" + e);
  let n = gt(t, e), r = e, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const c = r / n, u = r % n, l = o - s * c;
    r = n, n = u, o = s, s = l;
  }
  return r === 1n ? gt(o, e) : pe("no inverse");
}, ag = (t) => {
  let e = 1n;
  for (let n = t, r = (br + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % br), n = n * n % br;
  return gt(e * e) === t ? e : pe("sqrt invalid");
}, cg = (t) => (ns(t) || (t = Hl(Dl(t, oo))), Ll(t) ? t : pe("private key invalid 3")), jn = 8, ug = () => {
  const t = [], e = 256 / jn + 1;
  let n = io, r = n;
  for (let o = 0; o < e; o++) {
    r = n, t.push(r);
    for (let s = 1; s < 2 ** (jn - 1); s++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let tf;
const fg = (t) => {
  const e = tf || (tf = ug()), n = (g, y) => {
    let w = y.negate();
    return g ? w : y;
  };
  let r = to, o = io;
  const s = 1 + 256 / jn, c = 2 ** (jn - 1), u = BigInt(2 ** jn - 1), l = 2 ** jn, h = BigInt(jn);
  for (let g = 0; g < s; g++) {
    const y = g * c;
    let w = Number(t & u);
    t >>= h, w > c && (w -= l, t += 1n);
    const b = y, E = y + Math.abs(w) - 1, T = g % 2 !== 0, L = w < 0;
    w === 0 ? o = o.add(n(T, e[b])) : r = r.add(n(L, e[E]));
  }
  return { p: r, f: o };
};
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Se = BigInt(0), be = BigInt(1), Xn = /* @__PURE__ */ BigInt(2), lg = /* @__PURE__ */ BigInt(3), Fl = /* @__PURE__ */ BigInt(4), jl = /* @__PURE__ */ BigInt(5), ql = /* @__PURE__ */ BigInt(8);
function se(t, e) {
  const n = t % e;
  return n >= Se ? n : e + n;
}
function Oe(t, e, n) {
  let r = t;
  for (; e-- > Se; )
    r *= r, r %= n;
  return r;
}
function Oa(t, e) {
  if (t === Se)
    throw new Error("invert: expected non-zero number");
  if (e <= Se)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = se(t, e), r = e, o = Se, s = be;
  for (; n !== Se; ) {
    const u = r / n, l = r % n, h = o - s * u;
    r = n, n = l, o = s, s = h;
  }
  if (r !== be)
    throw new Error("invert: does not exist");
  return se(o, e);
}
function zl(t, e) {
  const n = (t.ORDER + be) / Fl, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function dg(t, e) {
  const n = (t.ORDER - jl) / ql, r = t.mul(e, Xn), o = t.pow(r, n), s = t.mul(e, o), c = t.mul(t.mul(s, Xn), o), u = t.mul(s, t.sub(c, t.ONE));
  if (!t.eql(t.sqr(u), e))
    throw new Error("Cannot find square root");
  return u;
}
function hg(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - be, n = 0;
  for (; e % Xn === Se; )
    e /= Xn, n++;
  let r = Xn;
  const o = vc(t);
  for (; ef(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return zl;
  let s = o.pow(r, e);
  const c = (e + be) / Xn;
  return function(l, h) {
    if (l.is0(h))
      return h;
    if (ef(l, h) !== 1)
      throw new Error("Cannot find square root");
    let g = n, y = l.mul(l.ONE, s), w = l.pow(h, e), b = l.pow(h, c);
    for (; !l.eql(w, l.ONE); ) {
      if (l.is0(w))
        return l.ZERO;
      let E = 1, T = l.sqr(w);
      for (; !l.eql(T, l.ONE); )
        if (E++, T = l.sqr(T), E === g)
          throw new Error("Cannot find square root");
      const L = be << BigInt(g - E - 1), G = l.pow(y, L);
      g = E, y = l.sqr(G), w = l.mul(w, y), b = l.mul(b, G);
    }
    return b;
  };
}
function pg(t) {
  return t % Fl === lg ? zl : t % ql === jl ? dg : hg(t);
}
const gg = [
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
function yg(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = gg.reduce((r, o) => (r[o] = "function", r), e);
  return es(t, n);
}
function wg(t, e, n) {
  if (n < Se)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Se)
    return t.ONE;
  if (n === be)
    return e;
  let r = t.ONE, o = e;
  for (; n > Se; )
    n & be && (r = t.mul(r, o)), o = t.sqr(o), n >>= be;
  return r;
}
function Gl(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), o = e.reduce((c, u, l) => t.is0(u) ? c : (r[l] = c, t.mul(c, u)), t.ONE), s = t.inv(o);
  return e.reduceRight((c, u, l) => t.is0(u) ? c : (r[l] = t.mul(c, r[l]), t.mul(c, u)), s), r;
}
function ef(t, e) {
  const n = (t.ORDER - be) / Xn, r = t.pow(e, n), o = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!o && !s && !c)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Wl(t, e) {
  e !== void 0 && ao(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function vc(t, e, n = !1, r = {}) {
  if (t <= Se)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: s } = Wl(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const u = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: o,
    BYTES: s,
    MASK: ts(o),
    ZERO: Se,
    ONE: be,
    create: (l) => se(l, t),
    isValid: (l) => {
      if (typeof l != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof l);
      return Se <= l && l < t;
    },
    is0: (l) => l === Se,
    isOdd: (l) => (l & be) === be,
    neg: (l) => se(-l, t),
    eql: (l, h) => l === h,
    sqr: (l) => se(l * l, t),
    add: (l, h) => se(l + h, t),
    sub: (l, h) => se(l - h, t),
    mul: (l, h) => se(l * h, t),
    pow: (l, h) => wg(u, l, h),
    div: (l, h) => se(l * Oa(h, t), t),
    // Same as above, but doesn't normalize
    sqrN: (l) => l * l,
    addN: (l, h) => l + h,
    subN: (l, h) => l - h,
    mulN: (l, h) => l * h,
    inv: (l) => Oa(l, t),
    sqrt: r.sqrt || ((l) => (c || (c = pg(t)), c(u, l))),
    toBytes: (l) => n ? Rl(l, s) : nr(l, s),
    fromBytes: (l) => {
      if (l.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + l.length);
      return n ? Ol(l) : Xe(l);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (l) => Gl(u, l),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (l, h, g) => g ? h : l
  });
  return Object.freeze(u);
}
function Yl(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Zl(t) {
  const e = Yl(t);
  return e + Math.ceil(e / 2);
}
function mg(t, e, n = !1) {
  const r = t.length, o = Yl(e), s = Zl(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? Ol(t) : Xe(t), u = se(c, e - be) + be;
  return n ? Rl(u, o) : nr(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const nf = BigInt(0), Ra = BigInt(1);
function Js(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Xl(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function ta(t, e) {
  Xl(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), o = 2 ** t, s = ts(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: c };
}
function rf(t, e, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: c } = n;
  let u = Number(t & o), l = t >> c;
  u > r && (u -= s, l += Ra);
  const h = e * r, g = h + Math.abs(u) - 1, y = u === 0, w = u < 0, b = e % 2 !== 0;
  return { nextN: l, offset: g, isZero: y, isNeg: w, isNegF: b, offsetF: h };
}
function bg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function vg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const ea = /* @__PURE__ */ new WeakMap(), Ql = /* @__PURE__ */ new WeakMap();
function na(t) {
  return Ql.get(t) || 1;
}
function Eg(t, e) {
  return {
    constTimeNegate: Js,
    hasPrecomputes(n) {
      return na(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > nf; )
        r & Ra && (o = o.add(s)), s = s.double(), r >>= Ra;
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
      const { windows: o, windowSize: s } = ta(r, e), c = [];
      let u = n, l = u;
      for (let h = 0; h < o; h++) {
        l = u, c.push(l);
        for (let g = 1; g < s; g++)
          l = l.add(u), c.push(l);
        u = l.double();
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
      const u = ta(n, e);
      for (let l = 0; l < u.windows; l++) {
        const { nextN: h, offset: g, isZero: y, isNeg: w, isNegF: b, offsetF: E } = rf(o, l, u);
        o = h, y ? c = c.add(Js(b, r[E])) : s = s.add(Js(w, r[g]));
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
      const c = ta(n, e);
      for (let u = 0; u < c.windows && o !== nf; u++) {
        const { nextN: l, offset: h, isZero: g, isNeg: y } = rf(o, u, c);
        if (o = l, !g) {
          const w = r[h];
          s = s.add(y ? w.negate() : w);
        }
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = ea.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && ea.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = na(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = na(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Xl(r, e), Ql.set(n, r), ea.delete(n);
    }
  };
}
function xg(t, e, n, r) {
  bg(n, t), vg(r, e);
  const o = n.length, s = r.length;
  if (o !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, u = Jp(BigInt(o));
  let l = 1;
  u > 12 ? l = u - 3 : u > 4 ? l = u - 2 : u > 0 && (l = 2);
  const h = ts(l), g = new Array(Number(h) + 1).fill(c), y = Math.floor((e.BITS - 1) / l) * l;
  let w = c;
  for (let b = y; b >= 0; b -= l) {
    g.fill(c);
    for (let T = 0; T < s; T++) {
      const L = r[T], G = Number(L >> BigInt(b) & h);
      g[G] = g[G].add(n[T]);
    }
    let E = c;
    for (let T = g.length - 1, L = c; T > 0; T--)
      L = L.add(g[T]), E = E.add(L);
    if (w = w.add(E), b !== 0)
      for (let T = 0; T < l; T++)
        w = w.double();
  }
  return w;
}
function Jl(t) {
  return yg(t.Fp), es(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Wl(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function of(t) {
  t.lowS !== void 0 && uo("lowS", t.lowS), t.prehash !== void 0 && uo("prehash", t.prehash);
}
function Sg(t) {
  const e = Jl(t);
  es(e, {
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
  const { endo: n, Fp: r, a: o } = e;
  if (n) {
    if (!r.eql(o, r.ZERO))
      throw new Error("invalid endo: CURVE.a must be 0");
    if (typeof n != "object" || typeof n.beta != "bigint" || typeof n.splitScalar != "function")
      throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  }
  return Object.freeze({ ...e });
}
class Tg extends Error {
  constructor(e = "") {
    super(e);
  }
}
const un = {
  // asn.1 DER encoding utils
  Err: Tg,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = un;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = ci(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? ci(o.length / 2 | 128) : "";
      return ci(t) + s + o + e;
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
        const l = o & 127;
        if (!l)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (l > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const h = e.subarray(r, r + l);
        if (h.length !== l)
          throw new n("tlv.decode: length bytes not complete");
        if (h[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const g of h)
          c = c << 8 | g;
        if (r += l, c < 128)
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
      if (t < fn)
        throw new e("integer: negative integers are not allowed");
      let n = ci(t);
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
      return Xe(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = un, o = ie("signature", t), { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l } = r.decode(2, s), { v: h, l: g } = r.decode(2, l);
    if (g.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(h) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = un, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
};
function ra(t, e) {
  return fo(nr(t, e));
}
const fn = BigInt(0), re = BigInt(1);
BigInt(2);
const oa = BigInt(3), kg = BigInt(4);
function Ag(t) {
  const e = Sg(t), { Fp: n } = e, r = vc(e.n, e.nBitLength), o = e.toBytes || ((F, H, V) => {
    const st = H.toAffine();
    return _r(Uint8Array.from([4]), n.toBytes(st.x), n.toBytes(st.y));
  }), s = e.fromBytes || ((F) => {
    const H = F.subarray(1), V = n.fromBytes(H.subarray(0, n.BYTES)), st = n.fromBytes(H.subarray(n.BYTES, 2 * n.BYTES));
    return { x: V, y: st };
  });
  function c(F) {
    const { a: H, b: V } = e, st = n.sqr(F), A = n.mul(st, F);
    return n.add(n.add(A, n.mul(F, H)), V);
  }
  function u(F, H) {
    const V = n.sqr(H), st = c(F);
    return n.eql(V, st);
  }
  if (!u(e.Gx, e.Gy))
    throw new Error("bad curve params: generator point");
  const l = n.mul(n.pow(e.a, oa), kg), h = n.mul(n.sqr(e.b), BigInt(27));
  if (n.is0(n.add(l, h)))
    throw new Error("bad curve params: a or b");
  function g(F) {
    return lo(F, re, e.n);
  }
  function y(F) {
    const { allowedPrivateKeyLengths: H, nByteLength: V, wrapPrivateKey: st, n: A } = e;
    if (H && typeof F != "bigint") {
      if (Ao(F) && (F = fo(F)), typeof F != "string" || !H.includes(F.length))
        throw new Error("invalid private key");
      F = F.padStart(V * 2, "0");
    }
    let yt;
    try {
      yt = typeof F == "bigint" ? F : Xe(ie("private key", F, V));
    } catch {
      throw new Error("invalid private key, expected hex or " + V + " bytes, got " + typeof F);
    }
    return st && (yt = se(yt, A)), Qn("private key", yt, re, A), yt;
  }
  function w(F) {
    if (!(F instanceof T))
      throw new Error("ProjectivePoint expected");
  }
  const b = Wu((F, H) => {
    const { px: V, py: st, pz: A } = F;
    if (n.eql(A, n.ONE))
      return { x: V, y: st };
    const yt = F.is0();
    H == null && (H = yt ? n.ONE : n.inv(A));
    const lt = n.mul(V, H), xt = n.mul(st, H), q = n.mul(A, H);
    if (yt)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(q, n.ONE))
      throw new Error("invZ was invalid");
    return { x: lt, y: xt };
  }), E = Wu((F) => {
    if (F.is0()) {
      if (e.allowInfinityPoint && !n.is0(F.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: H, y: V } = F.toAffine();
    if (!n.isValid(H) || !n.isValid(V))
      throw new Error("bad point: x or y not FE");
    if (!u(H, V))
      throw new Error("bad point: equation left != right");
    if (!F.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class T {
    constructor(H, V, st) {
      if (H == null || !n.isValid(H))
        throw new Error("x required");
      if (V == null || !n.isValid(V) || n.is0(V))
        throw new Error("y required");
      if (st == null || !n.isValid(st))
        throw new Error("z required");
      this.px = H, this.py = V, this.pz = st, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(H) {
      const { x: V, y: st } = H || {};
      if (!H || !n.isValid(V) || !n.isValid(st))
        throw new Error("invalid affine point");
      if (H instanceof T)
        throw new Error("projective point not allowed");
      const A = (yt) => n.eql(yt, n.ZERO);
      return A(V) && A(st) ? T.ZERO : new T(V, st, n.ONE);
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
    static normalizeZ(H) {
      const V = Gl(n, H.map((st) => st.pz));
      return H.map((st, A) => st.toAffine(V[A])).map(T.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(H) {
      const V = T.fromAffine(s(ie("pointHex", H)));
      return V.assertValidity(), V;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(H) {
      return T.BASE.multiply(y(H));
    }
    // Multiscalar Multiplication
    static msm(H, V) {
      return xg(T, r, H, V);
    }
    // "Private method", don't use it directly
    _setWindowSize(H) {
      Q.setWindowSize(this, H);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      E(this);
    }
    hasEvenY() {
      const { y: H } = this.toAffine();
      if (n.isOdd)
        return !n.isOdd(H);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(H) {
      w(H);
      const { px: V, py: st, pz: A } = this, { px: yt, py: lt, pz: xt } = H, q = n.eql(n.mul(V, xt), n.mul(yt, A)), Z = n.eql(n.mul(st, xt), n.mul(lt, A));
      return q && Z;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new T(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: H, b: V } = e, st = n.mul(V, oa), { px: A, py: yt, pz: lt } = this;
      let xt = n.ZERO, q = n.ZERO, Z = n.ZERO, D = n.mul(A, A), z = n.mul(yt, yt), N = n.mul(lt, lt), P = n.mul(A, yt);
      return P = n.add(P, P), Z = n.mul(A, lt), Z = n.add(Z, Z), xt = n.mul(H, Z), q = n.mul(st, N), q = n.add(xt, q), xt = n.sub(z, q), q = n.add(z, q), q = n.mul(xt, q), xt = n.mul(P, xt), Z = n.mul(st, Z), N = n.mul(H, N), P = n.sub(D, N), P = n.mul(H, P), P = n.add(P, Z), Z = n.add(D, D), D = n.add(Z, D), D = n.add(D, N), D = n.mul(D, P), q = n.add(q, D), N = n.mul(yt, lt), N = n.add(N, N), D = n.mul(N, P), xt = n.sub(xt, D), Z = n.mul(N, z), Z = n.add(Z, Z), Z = n.add(Z, Z), new T(xt, q, Z);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(H) {
      w(H);
      const { px: V, py: st, pz: A } = this, { px: yt, py: lt, pz: xt } = H;
      let q = n.ZERO, Z = n.ZERO, D = n.ZERO;
      const z = e.a, N = n.mul(e.b, oa);
      let P = n.mul(V, yt), W = n.mul(st, lt), J = n.mul(A, xt), X = n.add(V, st), Y = n.add(yt, lt);
      X = n.mul(X, Y), Y = n.add(P, W), X = n.sub(X, Y), Y = n.add(V, A);
      let ut = n.add(yt, xt);
      return Y = n.mul(Y, ut), ut = n.add(P, J), Y = n.sub(Y, ut), ut = n.add(st, A), q = n.add(lt, xt), ut = n.mul(ut, q), q = n.add(W, J), ut = n.sub(ut, q), D = n.mul(z, Y), q = n.mul(N, J), D = n.add(q, D), q = n.sub(W, D), D = n.add(W, D), Z = n.mul(q, D), W = n.add(P, P), W = n.add(W, P), J = n.mul(z, J), Y = n.mul(N, Y), W = n.add(W, J), J = n.sub(P, J), J = n.mul(z, J), Y = n.add(Y, J), P = n.mul(W, Y), Z = n.add(Z, P), P = n.mul(ut, Y), q = n.mul(X, q), q = n.sub(q, P), P = n.mul(X, W), D = n.mul(ut, D), D = n.add(D, P), new T(q, Z, D);
    }
    subtract(H) {
      return this.add(H.negate());
    }
    is0() {
      return this.equals(T.ZERO);
    }
    wNAF(H) {
      return Q.wNAFCached(this, H, T.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(H) {
      const { endo: V, n: st } = e;
      Qn("scalar", H, fn, st);
      const A = T.ZERO;
      if (H === fn)
        return A;
      if (this.is0() || H === re)
        return this;
      if (!V || Q.hasPrecomputes(this))
        return Q.wNAFCachedUnsafe(this, H, T.normalizeZ);
      let { k1neg: yt, k1: lt, k2neg: xt, k2: q } = V.splitScalar(H), Z = A, D = A, z = this;
      for (; lt > fn || q > fn; )
        lt & re && (Z = Z.add(z)), q & re && (D = D.add(z)), z = z.double(), lt >>= re, q >>= re;
      return yt && (Z = Z.negate()), xt && (D = D.negate()), D = new T(n.mul(D.px, V.beta), D.py, D.pz), Z.add(D);
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
    multiply(H) {
      const { endo: V, n: st } = e;
      Qn("scalar", H, re, st);
      let A, yt;
      if (V) {
        const { k1neg: lt, k1: xt, k2neg: q, k2: Z } = V.splitScalar(H);
        let { p: D, f: z } = this.wNAF(xt), { p: N, f: P } = this.wNAF(Z);
        D = Q.constTimeNegate(lt, D), N = Q.constTimeNegate(q, N), N = new T(n.mul(N.px, V.beta), N.py, N.pz), A = D.add(N), yt = z.add(P);
      } else {
        const { p: lt, f: xt } = this.wNAF(H);
        A = lt, yt = xt;
      }
      return T.normalizeZ([A, yt])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(H, V, st) {
      const A = T.BASE, yt = (xt, q) => q === fn || q === re || !xt.equals(A) ? xt.multiplyUnsafe(q) : xt.multiply(q), lt = yt(this, V).add(yt(H, st));
      return lt.is0() ? void 0 : lt;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(H) {
      return b(this, H);
    }
    isTorsionFree() {
      const { h: H, isTorsionFree: V } = e;
      if (H === re)
        return !0;
      if (V)
        return V(T, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: H, clearCofactor: V } = e;
      return H === re ? this : V ? V(T, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(H = !0) {
      return uo("isCompressed", H), this.assertValidity(), o(T, this, H);
    }
    toHex(H = !0) {
      return uo("isCompressed", H), fo(this.toRawBytes(H));
    }
  }
  T.BASE = new T(e.Gx, e.Gy, n.ONE), T.ZERO = new T(n.ZERO, n.ONE, n.ZERO);
  const { endo: L, nBitLength: G } = e, Q = Eg(T, L ? Math.ceil(G / 2) : G);
  return {
    CURVE: e,
    ProjectivePoint: T,
    normPrivateKeyToScalar: y,
    weierstrassEquation: c,
    isWithinCurveOrder: g
  };
}
function Ig(t) {
  const e = Jl(t);
  return es(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Bg(t) {
  const e = Ig(t), { Fp: n, n: r, nByteLength: o, nBitLength: s } = e, c = n.BYTES + 1, u = 2 * n.BYTES + 1;
  function l(N) {
    return se(N, r);
  }
  function h(N) {
    return Oa(N, r);
  }
  const { ProjectivePoint: g, normPrivateKeyToScalar: y, weierstrassEquation: w, isWithinCurveOrder: b } = Ag({
    ...e,
    toBytes(N, P, W) {
      const J = P.toAffine(), X = n.toBytes(J.x), Y = _r;
      return uo("isCompressed", W), W ? Y(Uint8Array.from([P.hasEvenY() ? 2 : 3]), X) : Y(Uint8Array.from([4]), X, n.toBytes(J.y));
    },
    fromBytes(N) {
      const P = N.length, W = N[0], J = N.subarray(1);
      if (P === c && (W === 2 || W === 3)) {
        const X = Xe(J);
        if (!lo(X, re, n.ORDER))
          throw new Error("Point is not on curve");
        const Y = w(X);
        let ut;
        try {
          ut = n.sqrt(Y);
        } catch (St) {
          const wt = St instanceof Error ? ": " + St.message : "";
          throw new Error("Point is not on curve" + wt);
        }
        const pt = (ut & re) === re;
        return (W & 1) === 1 !== pt && (ut = n.neg(ut)), { x: X, y: ut };
      } else if (P === u && W === 4) {
        const X = n.fromBytes(J.subarray(0, n.BYTES)), Y = n.fromBytes(J.subarray(n.BYTES, 2 * n.BYTES));
        return { x: X, y: Y };
      } else {
        const X = c, Y = u;
        throw new Error("invalid Point, expected length of " + X + ", or uncompressed " + Y + ", got " + P);
      }
    }
  });
  function E(N) {
    const P = r >> re;
    return N > P;
  }
  function T(N) {
    return E(N) ? l(-N) : N;
  }
  const L = (N, P, W) => Xe(N.slice(P, W));
  class G {
    constructor(P, W, J) {
      Qn("r", P, re, r), Qn("s", W, re, r), this.r = P, this.s = W, J != null && (this.recovery = J), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(P) {
      const W = o;
      return P = ie("compactSignature", P, W * 2), new G(L(P, 0, W), L(P, W, 2 * W));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(P) {
      const { r: W, s: J } = un.toSig(ie("DER", P));
      return new G(W, J);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(P) {
      return new G(this.r, this.s, P);
    }
    recoverPublicKey(P) {
      const { r: W, s: J, recovery: X } = this, Y = A(ie("msgHash", P));
      if (X == null || ![0, 1, 2, 3].includes(X))
        throw new Error("recovery id invalid");
      const ut = X === 2 || X === 3 ? W + e.n : W;
      if (ut >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const pt = (X & 1) === 0 ? "02" : "03", It = g.fromHex(pt + ra(ut, n.BYTES)), St = h(ut), wt = l(-Y * St), Bt = l(J * St), Nt = g.BASE.multiplyAndAddUnsafe(It, wt, Bt);
      if (!Nt)
        throw new Error("point at infinify");
      return Nt.assertValidity(), Nt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return E(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new G(this.r, l(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Ri(this.toDERHex());
    }
    toDERHex() {
      return un.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Ri(this.toCompactHex());
    }
    toCompactHex() {
      const P = o;
      return ra(this.r, P) + ra(this.s, P);
    }
  }
  const Q = {
    isValidPrivateKey(N) {
      try {
        return y(N), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: y,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const N = Zl(e.n);
      return mg(e.randomBytes(N), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(N = 8, P = g.BASE) {
      return P._setWindowSize(N), P.multiply(BigInt(3)), P;
    }
  };
  function F(N, P = !0) {
    return g.fromPrivateKey(N).toRawBytes(P);
  }
  function H(N) {
    if (typeof N == "bigint")
      return !1;
    if (N instanceof g)
      return !0;
    const W = ie("key", N).length, J = n.BYTES, X = J + 1, Y = 2 * J + 1;
    if (!(e.allowedPrivateKeyLengths || o === X))
      return W === X || W === Y;
  }
  function V(N, P, W = !0) {
    if (H(N) === !0)
      throw new Error("first arg must be private key");
    if (H(P) === !1)
      throw new Error("second arg must be public key");
    return g.fromHex(P).multiply(y(N)).toRawBytes(W);
  }
  const st = e.bits2int || function(N) {
    if (N.length > 8192)
      throw new Error("input is too large");
    const P = Xe(N), W = N.length * 8 - s;
    return W > 0 ? P >> BigInt(W) : P;
  }, A = e.bits2int_modN || function(N) {
    return l(st(N));
  }, yt = ts(s);
  function lt(N) {
    return Qn("num < 2^" + s, N, fn, yt), nr(N, o);
  }
  function xt(N, P, W = q) {
    if (["recovered", "canonical"].some((ot) => ot in W))
      throw new Error("sign() legacy options not supported");
    const { hash: J, randomBytes: X } = e;
    let { lowS: Y, prehash: ut, extraEntropy: pt } = W;
    Y == null && (Y = !0), N = ie("msgHash", N), of(W), ut && (N = ie("prehashed msgHash", J(N)));
    const It = A(N), St = y(P), wt = [lt(St), lt(It)];
    if (pt != null && pt !== !1) {
      const ot = pt === !0 ? X(n.BYTES) : pt;
      wt.push(ie("extraEntropy", ot));
    }
    const Bt = _r(...wt), Nt = It;
    function qt(ot) {
      const Ot = st(ot);
      if (!b(Ot))
        return;
      const Ie = h(Ot), At = g.BASE.multiply(Ot).toAffine(), ue = l(At.x);
      if (ue === fn)
        return;
      const Un = l(Ie * l(Nt + ue * St));
      if (Un === fn)
        return;
      let ve = (At.x === ue ? 0 : 2) | Number(At.y & re), Bo = Un;
      return Y && E(Un) && (Bo = T(Un), ve ^= 1), new G(ue, Bo, ve);
    }
    return { seed: Bt, k2sig: qt };
  }
  const q = { lowS: e.lowS, prehash: !1 }, Z = { lowS: e.lowS, prehash: !1 };
  function D(N, P, W = q) {
    const { seed: J, k2sig: X } = xt(N, P, W), Y = e;
    return tg(Y.hash.outputLen, Y.nByteLength, Y.hmac)(J, X);
  }
  g.BASE._setWindowSize(8);
  function z(N, P, W, J = Z) {
    const X = N;
    P = ie("msgHash", P), W = ie("publicKey", W);
    const { lowS: Y, prehash: ut, format: pt } = J;
    if (of(J), "strict" in J)
      throw new Error("options.strict was renamed to lowS");
    if (pt !== void 0 && pt !== "compact" && pt !== "der")
      throw new Error("format must be compact or der");
    const It = typeof X == "string" || Ao(X), St = !It && !pt && typeof X == "object" && X !== null && typeof X.r == "bigint" && typeof X.s == "bigint";
    if (!It && !St)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let wt, Bt;
    try {
      if (St && (wt = new G(X.r, X.s)), It) {
        try {
          pt !== "compact" && (wt = G.fromDER(X));
        } catch (ve) {
          if (!(ve instanceof un.Err))
            throw ve;
        }
        !wt && pt !== "der" && (wt = G.fromCompact(X));
      }
      Bt = g.fromHex(W);
    } catch {
      return !1;
    }
    if (!wt || Y && wt.hasHighS())
      return !1;
    ut && (P = e.hash(P));
    const { r: Nt, s: qt } = wt, ot = A(P), Ot = h(qt), Ie = l(ot * Ot), At = l(Nt * Ot), ue = g.BASE.multiplyAndAddUnsafe(Bt, Ie, At)?.toAffine();
    return ue ? l(ue.x) === Nt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: F,
    getSharedSecret: V,
    sign: D,
    verify: z,
    ProjectivePoint: g,
    Signature: G,
    utils: Q
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function _g(t) {
  return {
    hash: t,
    hmac: (e, ...n) => ja(t, e, Re(...n)),
    randomBytes: er
  };
}
function Ng(t, e) {
  const n = (r) => Bg({ ...t, ..._g(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Io = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), $i = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Ec = BigInt(0), ho = BigInt(1), Pi = BigInt(2), sf = (t, e) => (t + e / Pi) / e;
function td(t) {
  const e = Io, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), l = BigInt(88), h = t * t * t % e, g = h * h * t % e, y = Oe(g, n, e) * g % e, w = Oe(y, n, e) * g % e, b = Oe(w, Pi, e) * h % e, E = Oe(b, o, e) * b % e, T = Oe(E, s, e) * E % e, L = Oe(T, u, e) * T % e, G = Oe(L, l, e) * L % e, Q = Oe(G, u, e) * T % e, F = Oe(Q, n, e) * g % e, H = Oe(F, c, e) * E % e, V = Oe(H, r, e) * h % e, st = Oe(V, Pi, e);
  if (!$a.eql($a.sqr(st), t))
    throw new Error("Cannot find square root");
  return st;
}
const $a = vc(Io, void 0, void 0, { sqrt: td }), po = Ng({
  a: Ec,
  b: BigInt(7),
  Fp: $a,
  n: $i,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = $i, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -ho * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = sf(s * t, e), l = sf(-r * t, e);
      let h = se(t - u * n - l * o, e), g = se(-u * r - l * s, e);
      const y = h > c, w = g > c;
      if (y && (h = e - h), w && (g = e - g), h > c || g > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: y, k1: h, k2neg: w, k2: g };
    }
  }
}, Xt), af = {};
function Li(t, ...e) {
  let n = af[t];
  if (n === void 0) {
    const r = Xt(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = _r(r, r), af[t] = n;
  }
  return Xt(_r(n, ...e));
}
const xc = (t) => t.toRawBytes(!0).slice(1), Pa = (t) => nr(t, 32), ia = (t) => se(t, Io), go = (t) => se(t, $i), Sc = po.ProjectivePoint, Ug = (t, e, n) => Sc.BASE.multiplyAndAddUnsafe(t, e, n);
function La(t) {
  let e = po.utils.normPrivateKeyToScalar(t), n = Sc.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : go(-e), bytes: xc(n) };
}
function ed(t) {
  Qn("x", t, ho, Io);
  const e = ia(t * t), n = ia(e * t + BigInt(7));
  let r = td(n);
  r % Pi !== Ec && (r = ia(-r));
  const o = new Sc(t, r, ho);
  return o.assertValidity(), o;
}
const vr = Xe;
function nd(...t) {
  return go(vr(Li("BIP0340/challenge", ...t)));
}
function Cg(t) {
  return La(t).bytes;
}
function Og(t, e, n = er(32)) {
  const r = ie("message", t), { bytes: o, scalar: s } = La(e), c = ie("auxRand", n, 32), u = Pa(s ^ vr(Li("BIP0340/aux", c))), l = Li("BIP0340/nonce", u, o, r), h = go(vr(l));
  if (h === Ec)
    throw new Error("sign failed: k is zero");
  const { bytes: g, scalar: y } = La(h), w = nd(g, o, r), b = new Uint8Array(64);
  if (b.set(g, 0), b.set(Pa(go(y + w * s)), 32), !rd(b, r, o))
    throw new Error("sign: Invalid signature produced");
  return b;
}
function rd(t, e, n) {
  const r = ie("signature", t, 64), o = ie("message", e), s = ie("publicKey", n, 32);
  try {
    const c = ed(vr(s)), u = vr(r.subarray(0, 32));
    if (!lo(u, ho, Io))
      return !1;
    const l = vr(r.subarray(32, 64));
    if (!lo(l, ho, $i))
      return !1;
    const h = nd(Pa(u), xc(c), o), g = Ug(c, l, go(-h));
    return !(!g || !g.hasEvenY() || g.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const Tc = {
  getPublicKey: Cg,
  sign: Og,
  verify: rd,
  utils: {
    randomPrivateKey: po.utils.randomPrivateKey,
    lift_x: ed,
    pointToBytes: xc,
    numberToBytesBE: nr,
    bytesToNumberBE: Xe,
    taggedHash: Li,
    mod: se
  }
};
function kc(t, e, n = {}) {
  t = _a(t);
  const { aggPublicKey: r } = Na(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const o = Tc.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Na(t, [o], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: s.toRawBytes(!0)
  };
}
class ui extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Ac {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new ui("Invalid s length");
    if (n.length !== 33)
      throw new ui("Invalid R length");
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
      throw new ui("Invalid partial signature length");
    if (Xe(e) >= mc.n)
      throw new ui("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Ac(e, r);
  }
}
function Rg(t, e, n, r, o, s) {
  let c;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: h } = kc(_a(r));
    c = Tc.utils.taggedHash("TapTweak", h.subarray(1), s.taprootTweak);
  }
  const l = new Zp(n, _a(r), o, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return Ac.decode(l);
}
var $g = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Pg(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var sa, cf;
function Lg() {
  if (cf) return sa;
  cf = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, o = 1 << 22, s = r, c = 1 << n, u = r << n;
  function l(g) {
    return g & e ? {} : g & o ? {
      seconds: (g & r) << n
    } : {
      blocks: g & r
    };
  }
  function h({ blocks: g, seconds: y }) {
    if (g !== void 0 && y !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (g === void 0 && y === void 0) return t;
    if (y !== void 0) {
      if (!Number.isFinite(y)) throw new TypeError("Expected Number seconds");
      if (y > u) throw new TypeError("Expected Number seconds <= " + u);
      if (y % c !== 0) throw new TypeError("Expected Number seconds as a multiple of " + c);
      return o | y >> n;
    }
    if (!Number.isFinite(g)) throw new TypeError("Expected Number blocks");
    if (g > r) throw new TypeError("Expected Number blocks <= " + s);
    return g;
  }
  return sa = { decode: l, encode: h }, sa;
}
var Ka = Lg(), qe;
(function(t) {
  t.VtxoTaprootTree = "taptree", t.VtxoTreeExpiry = "expiry", t.Cosigner = "cosigner", t.ConditionWitness = "condition";
})(qe || (qe = {}));
const od = 255;
function Kg(t, e, n, r) {
  t.updateInput(e, {
    unknown: [
      ...t.getInput(e)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function id(t, e, n) {
  const r = t.getInput(e)?.unknown ?? [], o = [];
  for (const s of r) {
    const c = n.decode(s);
    c && o.push(c);
  }
  return o;
}
const Dg = {
  key: qe.VtxoTaprootTree,
  encode: (t) => [
    {
      type: od,
      key: Ic[qe.VtxoTaprootTree]
    },
    t
  ],
  decode: (t) => ad(() => cd(t[0], qe.VtxoTaprootTree) ? t[1] : null)
};
qe.ConditionWitness;
const sd = {
  key: qe.Cosigner,
  encode: (t) => [
    {
      type: od,
      key: new Uint8Array([
        ...Ic[qe.Cosigner],
        t.index
      ])
    },
    t.key
  ],
  decode: (t) => ad(() => cd(t[0], qe.Cosigner) ? {
    index: t[0].key[t[0].key.length - 1],
    key: t[1]
  } : null)
};
qe.VtxoTreeExpiry;
const Ic = Object.fromEntries(Object.values(qe).map((t) => [
  t,
  new TextEncoder().encode(t)
])), ad = (t) => {
  try {
    return t();
  } catch {
    return null;
  }
};
function cd(t, e) {
  const n = rt.encode(Ic[e]);
  return rt.encode(new Uint8Array([t.type, ...t.key])).includes(n);
}
const aa = new Error("missing vtxo graph");
class yo {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = gl();
    return new yo(e);
  }
  init(e, n, r) {
    this.graph = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return po.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.graph)
      throw aa;
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
      throw aa;
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
      throw aa;
    const e = /* @__PURE__ */ new Map(), n = po.getPublicKey(this.secretKey);
    for (const r of this.graph) {
      const o = Xp(n);
      e.set(r.txid, o);
    }
    return e;
  }
  signPartial(e) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw yo.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(e.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(e.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], c = id(e.root, 0, sd).map((h) => h.key), { finalKey: u } = kc(c, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let h = 0; h < e.root.inputsLength; h++) {
      const g = Mg(u, this.graph, this.rootSharedOutputAmount, e.root);
      o.push(g.amount), s.push(g.script);
    }
    const l = e.root.preimageWitnessV1(
      0,
      // always first input
      s,
      gn.DEFAULT,
      o
    );
    return Rg(n.secNonce, this.secretKey, r.pubNonce, c, l, {
      taprootTweak: this.scriptRoot
    });
  }
}
yo.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Mg(t, e, n, r) {
  const o = Et.encode(["OP_1", t.slice(1)]);
  if (rt.encode(he(r.toBytes(!0)).reverse()) === e.txid)
    return {
      amount: n,
      script: o
    };
  const c = r.getInput(0);
  if (!c.txid)
    throw new Error("missing parent input txid");
  const u = rt.encode(new Uint8Array(c.txid)), l = e.find(u);
  if (!l)
    throw new Error("parent  tx not found");
  if (c.index === void 0)
    throw new Error("missing input index");
  const h = l.root.getOutput(c.index);
  if (!h)
    throw new Error("parent output not found");
  if (!h.amount)
    throw new Error("parent output amount not found");
  return {
    amount: h.amount,
    script: o
  };
}
const uf = new Uint8Array(32).fill(0), ff = Object.values(gn).filter((t) => typeof t == "number");
class Ki {
  constructor(e) {
    this.key = e || gl();
  }
  static fromPrivateKey(e) {
    return new Ki(e);
  }
  static fromHex(e) {
    return new Ki(rt.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, ff, uf))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, ff, uf))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  xOnlyPublicKey() {
    return oc(this.key);
  }
  signerSession() {
    return yo.random();
  }
}
class Ur {
  constructor(e, n, r, o = 0) {
    if (this.serverPubKey = e, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, e.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + e.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(e) {
    const n = dr.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(dr.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), c = r.slice(33, 65);
    return new Ur(s, c, n.prefix, o);
  }
  encode() {
    const e = new Uint8Array(65);
    e[0] = this.version, e.set(this.serverPubKey, 1), e.set(this.vtxoTaprootKey, 33);
    const n = dr.toWords(e);
    return dr.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return Et.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return Et.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const Di = ac(void 0, !0);
var Jt;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(Jt || (Jt = {}));
function ud(t) {
  const e = [
    ze,
    Pe,
    wo,
    Mi,
    mo
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${rt.encode(t)} is not a valid tapscript`);
}
var ze;
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
        type: Jt.Multisig,
        params: u,
        script: Vp(u.pubkeys.length, u.pubkeys).script
      };
    const l = [];
    for (let h = 0; h < u.pubkeys.length; h++)
      l.push(u.pubkeys[h]), h < u.pubkeys.length - 1 ? l.push("CHECKSIGVERIFY") : l.push("CHECKSIG");
    return {
      type: Jt.Multisig,
      params: u,
      script: Et.encode(l)
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
    const l = Et.decode(u), h = [];
    let g = !1;
    for (let w = 0; w < l.length; w++) {
      const b = l[w];
      if (typeof b != "string" && typeof b != "number") {
        if (b.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${b.length}`);
        if (h.push(b), w + 1 >= l.length || l[w + 1] !== "CHECKSIGADD" && l[w + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        w++;
        continue;
      }
      if (w === l.length - 1) {
        if (b !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        g = !0;
      }
    }
    if (!g)
      throw new Error("Missing NUMEQUAL operation");
    if (h.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const y = n({
      pubkeys: h,
      type: e.CHECKSIGADD
    });
    if (rt.encode(y.script) !== rt.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.Multisig,
      params: { pubkeys: h, type: e.CHECKSIGADD },
      script: u
    };
  }
  function s(u) {
    const l = Et.decode(u), h = [];
    for (let y = 0; y < l.length; y++) {
      const w = l[y];
      if (typeof w != "string" && typeof w != "number") {
        if (w.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${w.length}`);
        if (h.push(w), y + 1 >= l.length)
          throw new Error("Unexpected end of script");
        const b = l[y + 1];
        if (b !== "CHECKSIGVERIFY" && b !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (y === l.length - 2 && b !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        y++;
        continue;
      }
    }
    if (h.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const g = n({ pubkeys: h, type: e.CHECKSIG });
    if (rt.encode(g.script) !== rt.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.Multisig,
      params: { pubkeys: h, type: e.CHECKSIG },
      script: u
    };
  }
  function c(u) {
    return u.type === Jt.Multisig;
  }
  t.is = c;
})(ze || (ze = {}));
var Pe;
(function(t) {
  function e(o) {
    for (const h of o.pubkeys)
      if (h.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
    const s = Di.encode(BigInt(Ka.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), c = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], u = ze.encode(o), l = new Uint8Array([
      ...Et.encode(c),
      ...u.script
    ]);
    return {
      type: Jt.CSVMultisig,
      params: o,
      script: l
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = Et.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const u = new Uint8Array(Et.encode(s.slice(3)));
    let l;
    try {
      l = ze.decode(u);
    } catch (b) {
      throw new Error(`Invalid multisig script: ${b instanceof Error ? b.message : String(b)}`);
    }
    const h = Number(Di.decode(c)), g = Ka.decode(h), y = g.blocks !== void 0 ? { type: "blocks", value: BigInt(g.blocks) } : { type: "seconds", value: BigInt(g.seconds) }, w = e({
      timelock: y,
      ...l.params
    });
    if (rt.encode(w.script) !== rt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.CSVMultisig,
      params: {
        timelock: y,
        ...l.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Jt.CSVMultisig;
  }
  t.is = r;
})(Pe || (Pe = {}));
var wo;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...Et.encode(["VERIFY"]),
      ...Pe.encode(o).script
    ]);
    return {
      type: Jt.ConditionCSVMultisig,
      params: o,
      script: s
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = Et.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let y = s.length - 1; y >= 0; y--)
      s[y] === "VERIFY" && (c = y);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const u = new Uint8Array(Et.encode(s.slice(0, c))), l = new Uint8Array(Et.encode(s.slice(c + 1)));
    let h;
    try {
      h = Pe.decode(l);
    } catch (y) {
      throw new Error(`Invalid CSV multisig script: ${y instanceof Error ? y.message : String(y)}`);
    }
    const g = e({
      conditionScript: u,
      ...h.params
    });
    if (rt.encode(g.script) !== rt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.ConditionCSVMultisig,
      params: {
        conditionScript: u,
        ...h.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Jt.ConditionCSVMultisig;
  }
  t.is = r;
})(wo || (wo = {}));
var Mi;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...Et.encode(["VERIFY"]),
      ...ze.encode(o).script
    ]);
    return {
      type: Jt.ConditionMultisig,
      params: o,
      script: s
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = Et.decode(o);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let c = -1;
    for (let y = s.length - 1; y >= 0; y--)
      s[y] === "VERIFY" && (c = y);
    if (c === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const u = new Uint8Array(Et.encode(s.slice(0, c))), l = new Uint8Array(Et.encode(s.slice(c + 1)));
    let h;
    try {
      h = ze.decode(l);
    } catch (y) {
      throw new Error(`Invalid multisig script: ${y instanceof Error ? y.message : String(y)}`);
    }
    const g = e({
      conditionScript: u,
      ...h.params
    });
    if (rt.encode(g.script) !== rt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.ConditionMultisig,
      params: {
        conditionScript: u,
        ...h.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Jt.ConditionMultisig;
  }
  t.is = r;
})(Mi || (Mi = {}));
var mo;
(function(t) {
  function e(o) {
    const s = Di.encode(o.absoluteTimelock), c = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], u = Et.encode(c), l = new Uint8Array([
      ...u,
      ...ze.encode(o).script
    ]);
    return {
      type: Jt.CLTVMultisig,
      params: o,
      script: l
    };
  }
  t.encode = e;
  function n(o) {
    if (o.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = Et.decode(o);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const c = s[0];
    if (typeof c == "string" || typeof c == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const u = new Uint8Array(Et.encode(s.slice(3)));
    let l;
    try {
      l = ze.decode(u);
    } catch (y) {
      throw new Error(`Invalid multisig script: ${y instanceof Error ? y.message : String(y)}`);
    }
    const h = Di.decode(c), g = e({
      absoluteTimelock: h,
      ...l.params
    });
    if (rt.encode(g.script) !== rt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Jt.CLTVMultisig,
      params: {
        absoluteTimelock: h,
        ...l.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Jt.CLTVMultisig;
  }
  t.is = r;
})(mo || (mo = {}));
function so(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Le {
  static decode(e) {
    const n = Vg(e);
    return new Le(n);
  }
  constructor(e) {
    this.scripts = e;
    const n = xl(e.map((o) => ({ script: o, leafVersion: Ui }))), r = Mp(sc, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return Hg(this.scripts);
  }
  address(e, n) {
    return new Ur(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return Et.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return tr(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => rt.encode(so(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
  exitPaths() {
    const e = [];
    for (const n of this.leaves)
      try {
        const r = Pe.decode(so(n));
        e.push(r);
        continue;
      } catch {
        try {
          const o = wo.decode(so(n));
          e.push(o);
        } catch {
          continue;
        }
      }
    return e;
  }
}
function Vg(t) {
  let e = 0;
  const n = [], [r, o] = lf(t, e);
  e += o;
  for (let s = 0; s < r; s++) {
    e += 1, e += 1;
    const [c, u] = lf(t, e);
    e += u;
    const l = t.slice(e, e + c);
    n.push(l), e += c;
  }
  return n;
}
function lf(t, e) {
  const n = t[e];
  return n < 253 ? [n, 1] : n === 253 ? [new DataView(t.buffer).getUint16(e + 1, !0), 3] : n === 254 ? [new DataView(t.buffer).getUint32(e + 1, !0), 5] : [Number(new DataView(t.buffer).getBigUint64(e + 1, !0)), 9];
}
function Hg(t) {
  const e = [];
  e.push(df(t.length));
  for (const s of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(df(s.length)), e.push(s);
  const n = e.reduce((s, c) => s + c.length, 0), r = new Uint8Array(n);
  let o = 0;
  for (const s of e)
    r.set(s, o), o += s.length;
  return r;
}
function df(t) {
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
var hf;
(function(t) {
  class e extends Le {
    constructor(o) {
      n(o);
      const { sender: s, receiver: c, server: u, preimageHash: l, refundLocktime: h, unilateralClaimDelay: g, unilateralRefundDelay: y, unilateralRefundWithoutReceiverDelay: w } = o, b = Fg(l), E = Mi.encode({
        conditionScript: b,
        pubkeys: [c, u]
      }).script, T = ze.encode({
        pubkeys: [s, c, u]
      }).script, L = mo.encode({
        absoluteTimelock: h,
        pubkeys: [s, u]
      }).script, G = wo.encode({
        conditionScript: b,
        timelock: g,
        pubkeys: [c]
      }).script, Q = Pe.encode({
        timelock: y,
        pubkeys: [s, c]
      }).script, F = Pe.encode({
        timelock: w,
        pubkeys: [s]
      }).script;
      super([
        E,
        T,
        L,
        G,
        Q,
        F
      ]), this.options = o, this.claimScript = rt.encode(E), this.refundScript = rt.encode(T), this.refundWithoutReceiverScript = rt.encode(L), this.unilateralClaimScript = rt.encode(G), this.unilateralRefundScript = rt.encode(Q), this.unilateralRefundWithoutReceiverScript = rt.encode(F);
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
  function n(r) {
    const { sender: o, receiver: s, server: c, preimageHash: u, refundLocktime: l, unilateralClaimDelay: h, unilateralRefundDelay: g, unilateralRefundWithoutReceiverDelay: y } = r;
    if (!u || u.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!s || s.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!c || c.length !== 32)
      throw new Error("Invalid public key length (server)");
    if (typeof l != "bigint" || l <= 0n)
      throw new Error("refund locktime must be greater than 0");
    if (!h || typeof h.value != "bigint" || h.value <= 0n)
      throw new Error("unilateral claim delay must greater than 0");
    if (h.type === "seconds" && h.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (h.type === "seconds" && h.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!g || typeof g.value != "bigint" || g.value <= 0n)
      throw new Error("unilateral refund delay must greater than 0");
    if (g.type === "seconds" && g.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (g.type === "seconds" && g.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!y || typeof y.value != "bigint" || y.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (y.type === "seconds" && y.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (y.type === "seconds" && y.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(hf || (hf = {}));
function Fg(t) {
  return Et.encode(["HASH160", t, "EQUAL"]);
}
var Vi;
(function(t) {
  class e extends Le {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, u = ze.encode({
        pubkeys: [o, s]
      }).script, l = Pe.encode({
        timelock: c,
        pubkeys: [o]
      }).script;
      super([u, l]), this.options = r, this.forfeitScript = rt.encode(u), this.exitScript = rt.encode(l);
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
})(Vi || (Vi = {}));
var bo;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(bo || (bo = {}));
function vo(t) {
  return t.spentBy === void 0 || t.spentBy === "";
}
function jg(t) {
  return t.virtualStatus.state === "swept" && vo(t);
}
function fd(t, e) {
  return t.value < e;
}
function ld(t, e, n) {
  const r = [];
  let o = [...e];
  for (const c of [...t, ...e]) {
    if (c.virtualStatus.state !== "preconfirmed" && c.virtualStatus.commitmentTxIds && c.virtualStatus.commitmentTxIds.some((b) => n.has(b)))
      continue;
    const u = qg(o, c);
    o = pf(o, u);
    const l = fi(u);
    if (c.value <= l)
      continue;
    const h = zg(o, c);
    o = pf(o, h);
    const g = fi(h);
    if (c.value <= g)
      continue;
    const y = {
      commitmentTxid: c.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let w = c.virtualStatus.state !== "preconfirmed";
    c.virtualStatus.state === "preconfirmed" && (y.arkTxid = c.txid, c.spentBy && (w = !0)), r.push({
      key: y,
      amount: c.value - l - g,
      type: bo.TxReceived,
      createdAt: c.createdAt.getTime(),
      settled: w
    });
  }
  const s = /* @__PURE__ */ new Map();
  for (const c of e) {
    if (c.settledBy) {
      s.has(c.settledBy) || s.set(c.settledBy, []);
      const l = s.get(c.settledBy);
      s.set(c.settledBy, [...l, c]);
    }
    if (!c.arkTxId)
      continue;
    s.has(c.arkTxId) || s.set(c.arkTxId, []);
    const u = s.get(c.arkTxId);
    s.set(c.arkTxId, [...u, c]);
  }
  for (const [c, u] of s) {
    const l = Gg([...t, ...e], c), h = fi(l), g = fi(u);
    if (g <= h)
      continue;
    const y = Wg(l, u), w = {
      commitmentTxid: y.virtualStatus.commitmentTxIds?.[0] || "",
      boardingTxid: "",
      arkTxid: ""
    };
    y.virtualStatus.state === "preconfirmed" && (w.arkTxid = y.txid), r.push({
      key: w,
      amount: g - h,
      type: bo.TxSent,
      createdAt: y.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function qg(t, e) {
  return e.virtualStatus.state === "preconfirmed" ? [] : t.filter((n) => n.settledBy ? e.virtualStatus.commitmentTxIds?.includes(n.settledBy) ?? !1 : !1);
}
function zg(t, e) {
  return t.filter((n) => n.arkTxId ? n.arkTxId === e.txid : !1);
}
function Gg(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "preconfirmed" && n.virtualStatus.commitmentTxIds?.includes(e) ? !0 : n.txid === e);
}
function fi(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function Wg(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function pf(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const Yg = (t) => Zg[t], Zg = {
  bitcoin: Qr(Br, "ark"),
  testnet: Qr(ii, "tark"),
  signet: Qr(ii, "tark"),
  mutinynet: Qr(ii, "tark"),
  regtest: Qr({
    ...ii,
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
const Xg = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Qg {
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
    const o = await fetch(`${this.baseUrl}/tx/${e}/status`);
    if (!o.ok)
      throw new Error(`Failed to get transaction status: ${o.statusText}`);
    const s = await o.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(e, n) {
    let r = null;
    const o = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      const h = () => Promise.all(e.map((w) => this.getTransactions(w))).then((w) => w.flat()), g = await h(), y = (w) => `${w.txid}_${w.status.block_time}`;
      r = setInterval(async () => {
        try {
          const w = await h(), b = new Set(g.map(y)), E = w.filter((T) => !b.has(y(T)));
          E.length > 0 && (g.push(...E), n(E));
        } catch (w) {
          console.error("Error in polling mechanism:", w);
        }
      }, 5e3);
    };
    let c = null;
    try {
      c = new WebSocket(o), c.addEventListener("open", () => {
        const l = {
          "track-addresses": e
        };
        c.send(JSON.stringify(l));
      }), c.addEventListener("message", (l) => {
        try {
          const h = [], g = JSON.parse(l.data.toString());
          if (!g["multi-address-transactions"])
            return;
          const y = g["multi-address-transactions"];
          for (const w in y)
            for (const b of [
              "mempool",
              "confirmed",
              "removed"
            ])
              y[w][b] && h.push(...y[w][b].filter(ty));
          h.length > 0 && n(h);
        } catch (h) {
          console.error("Failed to process WebSocket message:", h);
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
    if (!Jg(n))
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
      const o = await r.text();
      throw new Error(`Failed to broadcast package: ${o}`);
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
function Jg(t) {
  return Array.isArray(t) && t.every((e) => {
    e && typeof e == "object" && typeof e.id == "string" && e.id.length > 0 && typeof e.height == "number" && e.height >= 0 && typeof e.mediantime == "number" && e.mediantime > 0;
  });
}
const ty = (t) => typeof t.txid == "string" && Array.isArray(t.vout) && t.vout.every((e) => typeof e.scriptpubkey_address == "string" && typeof e.value == "string") && typeof t.status == "object" && typeof t.status.confirmed == "boolean" && typeof t.status.block_time == "number";
var Rt;
(function(t) {
  t.BatchStarted = "batch_started", t.BatchFinalization = "batch_finalization", t.BatchFinalized = "batch_finalized", t.BatchFailed = "batch_failed", t.TreeSigningStarted = "tree_signing_started", t.TreeNoncesAggregated = "tree_nonces_aggregated", t.TreeTx = "tree_tx", t.TreeSignature = "tree_signature";
})(Rt || (Rt = {}));
class dd {
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
    const r = `${this.serverUrl}/v1/tx/submit`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: e,
        checkpointTxs: n
      })
    });
    if (!o.ok) {
      const c = await o.text();
      try {
        const u = JSON.parse(c);
        throw new Error(`Failed to submit virtual transaction: ${u.message || u.error || c}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${c}`);
      }
    }
    const s = await o.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(e, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: e,
        finalCheckpointTxs: n
      })
    });
    if (!o.ok) {
      const s = await o.text();
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
      const o = await r.text();
      throw new Error(`Failed to delete intent: ${o}`);
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
      const o = await r.text();
      throw new Error(`Failed to confirm registration: ${o}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const o = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: e,
        pubkey: n,
        treeNonces: ey(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree nonces: ${c}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const o = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: e,
        pubkey: n,
        treeSignatures: ny(r)
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to submit tree signatures: ${c}`);
    }
  }
  async submitSignedForfeitTxs(e, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, o = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: e,
        signedCommitmentTx: n
      })
    });
    if (!o.ok)
      throw new Error(`Failed to submit forfeit transactions: ${o.statusText}`);
  }
  async *getEventStream(e, n) {
    const r = `${this.serverUrl}/v1/batch/events`, o = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !e?.aborted; )
      try {
        const s = await fetch(r + o, {
          headers: {
            Accept: "application/json"
          },
          signal: e
        });
        if (!s.ok)
          throw new Error(`Unexpected status ${s.status} when fetching event stream`);
        if (!s.body)
          throw new Error("Response body is null");
        const c = s.body.getReader(), u = new TextDecoder();
        let l = "";
        for (; !e?.aborted; ) {
          const { done: h, value: g } = await c.read();
          if (h)
            break;
          l += u.decode(g, { stream: !0 });
          const y = l.split(`
`);
          for (let w = 0; w < y.length - 1; w++) {
            const b = y[w].trim();
            if (b)
              try {
                const E = JSON.parse(b), T = this.parseSettlementEvent(E.result);
                T && (yield T);
              } catch (E) {
                throw console.error("Failed to parse event:", E), E;
              }
          }
          l = y[y.length - 1];
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (Da(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", s), s;
      }
  }
  async *getTransactionsStream(e) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !e?.aborted; )
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
        const o = r.body.getReader(), s = new TextDecoder();
        let c = "";
        for (; !e?.aborted; ) {
          const { done: u, value: l } = await o.read();
          if (u)
            break;
          c += s.decode(l, { stream: !0 });
          const h = c.split(`
`);
          for (let g = 0; g < h.length - 1; g++) {
            const y = h[g].trim();
            if (!y)
              continue;
            const w = JSON.parse(y), b = this.parseTransactionNotification(w.result);
            b && (yield b);
          }
          c = h[h.length - 1];
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (Da(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Address subscription error:", r), r;
      }
  }
  parseSettlementEvent(e) {
    if (e.batchStarted)
      return {
        type: Rt.BatchStarted,
        id: e.batchStarted.id,
        intentIdHashes: e.batchStarted.intentIdHashes,
        batchExpiry: BigInt(e.batchStarted.batchExpiry)
      };
    if (e.batchFinalization)
      return {
        type: Rt.BatchFinalization,
        id: e.batchFinalization.id,
        commitmentTx: e.batchFinalization.commitmentTx
      };
    if (e.batchFinalized)
      return {
        type: Rt.BatchFinalized,
        id: e.batchFinalized.id,
        commitmentTxid: e.batchFinalized.commitmentTxid
      };
    if (e.batchFailed)
      return {
        type: Rt.BatchFailed,
        id: e.batchFailed.id,
        reason: e.batchFailed.reason
      };
    if (e.treeSigningStarted)
      return {
        type: Rt.TreeSigningStarted,
        id: e.treeSigningStarted.id,
        cosignersPublicKeys: e.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: e.treeSigningStarted.unsignedCommitmentTx
      };
    if (e.treeNoncesAggregated)
      return {
        type: Rt.TreeNoncesAggregated,
        id: e.treeNoncesAggregated.id,
        treeNonces: ry(e.treeNoncesAggregated.treeNonces)
      };
    if (e.treeTx) {
      const n = Object.fromEntries(Object.entries(e.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: Rt.TreeTx,
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
      type: Rt.TreeSignature,
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
        spentVtxos: e.commitmentTx.spentVtxos.map(li),
        spendableVtxos: e.commitmentTx.spendableVtxos.map(li),
        checkpointTxs: e.commitmentTx.checkpointTxs
      }
    } : e.arkTx ? {
      arkTx: {
        txid: e.arkTx.txid,
        tx: e.arkTx.tx,
        spentVtxos: e.arkTx.spentVtxos.map(li),
        spendableVtxos: e.arkTx.spendableVtxos.map(li),
        checkpointTxs: e.arkTx.checkpointTxs
      }
    } : (console.warn("Unknown transaction notification type:", e), null);
  }
}
function ey(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = rt.encode(r.pubNonce);
  return JSON.stringify(e);
}
function ny(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = rt.encode(r.encode());
  return JSON.stringify(e);
}
function ry(t) {
  const e = JSON.parse(t);
  return new Map(Object.entries(e).map(([n, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [n, { pubNonce: rt.decode(r) }];
  }));
}
function Da(t) {
  const e = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return e(t) || e(t.cause);
}
function li(t) {
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
const oy = 0n, iy = new Uint8Array([81, 2, 78, 115]), Bc = {
  script: iy,
  amount: oy
};
rt.encode(Bc.script);
function sy(t, e, n) {
  const r = new ce({
    version: 3,
    lockTime: n
  });
  let o = 0n;
  for (const s of t) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    o += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: e,
    amount: o
  }), r.addOutput(Bc), r;
}
const ay = new Error("invalid settlement transaction outputs"), cy = new Error("empty tree"), uy = new Error("invalid number of inputs"), ca = new Error("wrong settlement txid"), fy = new Error("invalid amount"), ly = new Error("no leaves"), dy = new Error("invalid taproot script"), gf = new Error("invalid round transaction outputs"), hy = new Error("wrong commitment txid"), py = new Error("missing cosigners public keys"), ua = 0, yf = 1;
function gy(t, e) {
  if (e.validate(), e.root.inputsLength !== 1)
    throw uy;
  const n = e.root.getInput(0), r = ce.fromPSBT(Ee.decode(t));
  if (r.outputsLength <= yf)
    throw ay;
  const o = rt.encode(he(r.toBytes(!0)).reverse());
  if (!n.txid || rt.encode(n.txid) !== o || n.index !== yf)
    throw ca;
}
function yy(t, e, n) {
  if (e.outputsLength < ua + 1)
    throw gf;
  const r = e.getOutput(ua)?.amount;
  if (!r)
    throw gf;
  if (!t.root)
    throw cy;
  const o = t.root.getInput(0), s = rt.encode(he(e.toBytes(!0)).reverse());
  if (!o.txid || rt.encode(o.txid) !== s || o.index !== ua)
    throw hy;
  let c = 0n;
  for (let l = 0; l < t.root.outputsLength; l++) {
    const h = t.root.getOutput(l);
    h?.amount && (c += h.amount);
  }
  if (c !== r)
    throw fy;
  if (t.leaves().length === 0)
    throw ly;
  t.validate();
  for (const l of t)
    for (const [h, g] of l.children) {
      const y = l.root.getOutput(h);
      if (!y?.script)
        throw new Error(`parent output ${h} not found`);
      const w = y.script.slice(2);
      if (w.length !== 32)
        throw new Error(`parent output ${h} has invalid script`);
      const b = id(g.root, 0, sd);
      if (b.length === 0)
        throw py;
      const E = b.map((L) => L.key), { finalKey: T } = kc(E, !0, {
        taprootTweak: n
      });
      if (!T || rt.encode(T.slice(1)) !== rt.encode(w))
        throw dy;
    }
}
function wy(t, e, n) {
  const r = t.map((s) => my(s, n));
  return {
    arkTx: hd(r.map((s) => s.input), e),
    checkpoints: r.map((s) => s.tx)
  };
}
function hd(t, e) {
  let n = 0n;
  for (const o of t) {
    const s = ud(so(o.tapLeafScript));
    if (mo.is(s)) {
      if (n !== 0n && wf(n) !== wf(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new ce({
    version: 3,
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    lockTime: Number(n)
  });
  for (const [o, s] of t.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? hc - 1 : void 0,
      witnessUtxo: {
        script: Le.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Kg(r, o, Dg, s.tapTree);
  for (const o of e)
    r.addOutput(o);
  return r.addOutput(Bc), r;
}
function my(t, e) {
  const n = ud(t.checkpointTapLeafScript ?? so(t.tapLeafScript)), r = new Le([
    e.script,
    n.script
  ]), o = hd([t], [
    {
      amount: BigInt(t.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(rt.encode(n.script)), c = {
    txid: rt.encode(he(o.toBytes(!0)).reverse()),
    vout: 0,
    value: t.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: o,
    input: c
  };
}
const by = 500000000n;
function wf(t) {
  return t >= by;
}
class Zt {
  constructor(e, n, r = Zt.DefaultHRP) {
    this.preimage = e, this.value = n, this.HRP = r, this.vout = 0;
    const o = Xt(this.preimage);
    this.vtxoScript = new Le([xy(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = rt.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const e = new Uint8Array(Zt.Length);
    return e.set(this.preimage, 0), vy(e, this.value, this.preimage.length), e;
  }
  static decode(e, n = Zt.DefaultHRP) {
    if (e.length !== Zt.Length)
      throw new Error(`invalid data length: expected ${Zt.Length} bytes, got ${e.length}`);
    const r = e.subarray(0, Zt.PreimageLength), o = Ey(e, Zt.PreimageLength);
    return new Zt(r, o, n);
  }
  static fromString(e, n = Zt.DefaultHRP) {
    if (e = e.trim(), !e.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${e}')`);
    const r = e.slice(n.length), o = wa.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return Zt.decode(o, n);
  }
  toString() {
    return this.HRP + wa.encode(this.encode());
  }
}
Zt.DefaultHRP = "arknote";
Zt.PreimageLength = 32;
Zt.ValueLength = 4;
Zt.Length = Zt.PreimageLength + Zt.ValueLength;
Zt.FakeOutpointIndex = 0;
function vy(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function Ey(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
function xy(t) {
  return Et.encode(["SHA256", t, "EQUAL"]);
}
class _c extends Error {
  constructor(e) {
    super(e), this.name = "BIP322Error";
  }
}
const Sy = new _c("missing inputs"), Hi = new _c("missing data"), Ty = new _c("missing witness utxo");
var Fi;
(function(t) {
  function e(r, o, s = []) {
    if (o.length == 0)
      throw Sy;
    Ny(o), Cy(s);
    const c = Oy(r, o[0].witnessUtxo.script);
    return Ry(c, o, s);
  }
  t.create = e;
  function n(r, o = (s) => s.finalize()) {
    return o(r), Ee.encode(r.extract());
  }
  t.signature = n;
})(Fi || (Fi = {}));
const ky = new Uint8Array([zt.RETURN]), Ay = new Uint8Array(32).fill(0), Iy = 4294967295, By = "BIP0322-signed-message";
function _y(t) {
  if (t.index === void 0 || t.txid === void 0)
    throw Hi;
  if (t.witnessUtxo === void 0)
    throw Ty;
  return !0;
}
function Ny(t) {
  return t.forEach(_y), !0;
}
function Uy(t) {
  if (t.amount === void 0 || t.script === void 0)
    throw Hi;
  return !0;
}
function Cy(t) {
  return t.forEach(Uy), !0;
}
function Oy(t, e) {
  const n = $y(t), r = new ce({
    version: 0,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
  });
  return r.addInput({
    txid: Ay,
    // zero hash
    index: Iy,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: e
  }), r.updateInput(0, {
    finalScriptSig: Et.encode(["OP_0", n])
  }), r;
}
function Ry(t, e, n) {
  const r = e[0], o = new ce({
    version: 2,
    allowUnknownOutputs: n.length === 0,
    allowUnknown: !0,
    allowUnknownInputs: !0,
    lockTime: 0
  });
  o.addInput({
    ...r,
    txid: t.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: gn.ALL
  });
  for (const s of e)
    o.addInput({
      ...s,
      sighashType: gn.ALL
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: ky
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function $y(t) {
  return Tc.utils.taggedHash(By, new TextEncoder().encode(t));
}
var Ma;
(function(t) {
  t[t.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", t[t.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", t[t.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Ma || (Ma = {}));
var Er;
(function(t) {
  t.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", t.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", t.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", t.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", t.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Er || (Er = {}));
class pd {
  constructor(e) {
    this.serverUrl = e;
  }
  async getVtxoTree(e, n) {
    let r = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/tree`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isVtxoTreeResponse(c))
      throw new Error("Invalid vtxo tree data received");
    return c.vtxoTree.forEach((u) => {
      u.children = Object.fromEntries(Object.entries(u.children).map(([l, h]) => [
        Number(l),
        h
      ]));
    }), c;
  }
  async getVtxoTreeLeaves(e, n) {
    let r = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/tree/leaves`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isVtxoTreeLeavesResponse(c))
      throw new Error("Invalid vtxos tree leaves data received");
    return c;
  }
  async getBatchSweepTransactions(e) {
    const n = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Ke.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(e) {
    const n = `${this.serverUrl}/v1/commitmentTx/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Ke.isCommitmentTx(o))
      throw new Error("Invalid commitment tx data received");
    return o;
  }
  async getCommitmentTxConnectors(e, n) {
    let r = `${this.serverUrl}/v1/commitmentTx/${e}/connectors`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isConnectorsResponse(c))
      throw new Error("Invalid commitment tx connectors data received");
    return c.connectors.forEach((u) => {
      u.children = Object.fromEntries(Object.entries(u.children).map(([l, h]) => [
        Number(l),
        h
      ]));
    }), c;
  }
  async getCommitmentTxForfeitTxs(e, n) {
    let r = `${this.serverUrl}/v1/commitmentTx/${e}/forfeitTxs`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isForfeitTxsResponse(c))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return c;
  }
  async *getSubscription(e, n) {
    const r = `${this.serverUrl}/v1/script/subscription/${e}`;
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
          const { done: l, value: h } = await s.read();
          if (l)
            break;
          u += c.decode(h, { stream: !0 });
          const g = u.split(`
`);
          for (let y = 0; y < g.length - 1; y++) {
            const w = g[y].trim();
            if (!w)
              continue;
            const b = JSON.parse(w);
            "result" in b && (yield {
              txid: b.result.txid,
              scripts: b.result.scripts || [],
              newVtxos: (b.result.newVtxos || []).map(fa),
              spentVtxos: (b.result.spentVtxos || []).map(fa),
              tx: b.result.tx,
              checkpointTxs: b.result.checkpointTxs
            });
          }
          u = g[g.length - 1];
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if (Da(o)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", o), o;
      }
  }
  async getVirtualTxs(e, n) {
    let r = `${this.serverUrl}/v1/virtualTx/${e.join(",")}`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isVirtualTxsResponse(c))
      throw new Error("Invalid virtual txs data received");
    return c;
  }
  async getVtxoChain(e, n) {
    let r = `${this.serverUrl}/v1/vtxo/${e.txid}/${e.vout}/chain`;
    const o = new URLSearchParams();
    n && (n.pageIndex !== void 0 && o.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && o.append("page.size", n.pageSize.toString())), o.toString() && (r += "?" + o.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const c = await s.json();
    if (!Ke.isVtxoChainResponse(c))
      throw new Error("Invalid vtxo chain data received");
    return c;
  }
  async getVtxos(e) {
    if (e?.scripts && e?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!e?.scripts && !e?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/vtxos`;
    const r = new URLSearchParams();
    e?.scripts && e.scripts.length > 0 && e.scripts.forEach((c) => {
      r.append("scripts", c);
    }), e?.outpoints && e.outpoints.length > 0 && e.outpoints.forEach((c) => {
      r.append("outpoints", `${c.txid}:${c.vout}`);
    }), e && (e.spendableOnly !== void 0 && r.append("spendableOnly", e.spendableOnly.toString()), e.spentOnly !== void 0 && r.append("spentOnly", e.spentOnly.toString()), e.recoverableOnly !== void 0 && r.append("recoverableOnly", e.recoverableOnly.toString()), e.pageIndex !== void 0 && r.append("page.index", e.pageIndex.toString()), e.pageSize !== void 0 && r.append("page.size", e.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const o = await fetch(n);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const s = await o.json();
    if (!Ke.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(fa),
      page: s.page
    };
  }
  async subscribeForScripts(e, n) {
    const r = `${this.serverUrl}/v1/script/subscribe`, o = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: e, subscriptionId: n })
    });
    if (!o.ok) {
      const c = await o.text();
      throw new Error(`Failed to subscribe to scripts: ${c}`);
    }
    const s = await o.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(e, n) {
    const r = `${this.serverUrl}/v1/script/unsubscribe`, o = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: e, scripts: n })
    });
    if (!o.ok) {
      const s = await o.text();
      throw new Error(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function fa(t) {
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
var Ke;
(function(t) {
  function e(A) {
    return typeof A == "object" && typeof A.totalOutputAmount == "string" && typeof A.totalOutputVtxos == "number" && typeof A.expiresAt == "string" && typeof A.swept == "boolean";
  }
  function n(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.expiresAt == "string" && Object.values(Er).includes(A.type) && Array.isArray(A.spends) && A.spends.every((yt) => typeof yt == "string");
  }
  function r(A) {
    return typeof A == "object" && typeof A.startedAt == "string" && typeof A.endedAt == "string" && typeof A.totalInputAmount == "string" && typeof A.totalInputVtxos == "number" && typeof A.totalOutputAmount == "string" && typeof A.totalOutputVtxos == "number" && typeof A.batches == "object" && Object.values(A.batches).every(e);
  }
  t.isCommitmentTx = r;
  function o(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.vout == "number";
  }
  t.isOutpoint = o;
  function s(A) {
    return Array.isArray(A) && A.every(o);
  }
  t.isOutpointArray = s;
  function c(A) {
    return typeof A == "object" && typeof A.txid == "string" && typeof A.children == "object" && Object.values(A.children).every(g) && Object.keys(A.children).every((yt) => Number.isInteger(Number(yt)));
  }
  function u(A) {
    return Array.isArray(A) && A.every(c);
  }
  t.isTxsArray = u;
  function l(A) {
    return typeof A == "object" && typeof A.amount == "string" && typeof A.createdAt == "string" && typeof A.isSettled == "boolean" && typeof A.settledBy == "string" && Object.values(Ma).includes(A.type) && (!A.commitmentTxid && typeof A.virtualTxid == "string" || typeof A.commitmentTxid == "string" && !A.virtualTxid);
  }
  function h(A) {
    return Array.isArray(A) && A.every(l);
  }
  t.isTxHistoryRecordArray = h;
  function g(A) {
    return typeof A == "string" && A.length === 64;
  }
  function y(A) {
    return Array.isArray(A) && A.every(g);
  }
  t.isTxidArray = y;
  function w(A) {
    return typeof A == "object" && o(A.outpoint) && typeof A.createdAt == "string" && typeof A.expiresAt == "string" && typeof A.amount == "string" && typeof A.script == "string" && typeof A.isPreconfirmed == "boolean" && typeof A.isSwept == "boolean" && typeof A.isUnrolled == "boolean" && typeof A.isSpent == "boolean" && (!A.spentBy || typeof A.spentBy == "string") && (!A.settledBy || typeof A.settledBy == "string") && (!A.arkTxid || typeof A.arkTxid == "string") && Array.isArray(A.commitmentTxids) && A.commitmentTxids.every(g);
  }
  function b(A) {
    return typeof A == "object" && typeof A.current == "number" && typeof A.next == "number" && typeof A.total == "number";
  }
  function E(A) {
    return typeof A == "object" && Array.isArray(A.vtxoTree) && A.vtxoTree.every(c) && (!A.page || b(A.page));
  }
  t.isVtxoTreeResponse = E;
  function T(A) {
    return typeof A == "object" && Array.isArray(A.leaves) && A.leaves.every(o) && (!A.page || b(A.page));
  }
  t.isVtxoTreeLeavesResponse = T;
  function L(A) {
    return typeof A == "object" && Array.isArray(A.connectors) && A.connectors.every(c) && (!A.page || b(A.page));
  }
  t.isConnectorsResponse = L;
  function G(A) {
    return typeof A == "object" && Array.isArray(A.txids) && A.txids.every(g) && (!A.page || b(A.page));
  }
  t.isForfeitTxsResponse = G;
  function Q(A) {
    return typeof A == "object" && Array.isArray(A.sweptBy) && A.sweptBy.every(g);
  }
  t.isSweptCommitmentTxResponse = Q;
  function F(A) {
    return typeof A == "object" && Array.isArray(A.sweptBy) && A.sweptBy.every(g);
  }
  t.isBatchSweepTransactionsResponse = F;
  function H(A) {
    return typeof A == "object" && Array.isArray(A.txs) && A.txs.every((yt) => typeof yt == "string") && (!A.page || b(A.page));
  }
  t.isVirtualTxsResponse = H;
  function V(A) {
    return typeof A == "object" && Array.isArray(A.chain) && A.chain.every(n) && (!A.page || b(A.page));
  }
  t.isVtxoChainResponse = V;
  function st(A) {
    return typeof A == "object" && Array.isArray(A.vtxos) && A.vtxos.every(w) && (!A.page || b(A.page));
  }
  t.isVtxosResponse = st;
})(Ke || (Ke = {}));
class Va {
  constructor(e, n = /* @__PURE__ */ new Map()) {
    this.root = e, this.children = n;
  }
  static create(e) {
    if (e.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of e) {
      const c = Ly(s), u = rt.encode(he(c.tx.toBytes(!0)).reverse());
      n.set(u, c);
    }
    const r = [];
    for (const [s] of n) {
      let c = !1;
      for (const [u, l] of n)
        if (u !== s && (c = Py(l, s), c))
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
    const o = gd(r[0], n);
    if (!o)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (o.nbOfNodes() !== e.length)
      throw new Error(`number of chunks (${e.length}) is not equal to the number of nodes in the graph (${o.nbOfNodes()})`);
    return o;
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
    for (const [r, o] of this.children) {
      if (r >= e)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${e})`);
      o.validate();
      const s = o.root.getInput(0), c = rt.encode(he(this.root.toBytes(!0)).reverse());
      if (!s.txid || rt.encode(s.txid) !== c || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let u = 0n;
      for (let h = 0; h < o.root.outputsLength; h++) {
        const g = o.root.getOutput(h);
        g?.amount && (u += g.amount);
      }
      const l = this.root.getOutput(r);
      if (!l?.amount)
        throw new Error(`parent output ${r} has no amount`);
      if (u !== l.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${u} != ${l.amount}`);
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
    return rt.encode(he(this.root.toBytes(!0)).reverse());
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
function Py(t, e) {
  return Object.values(t.children).includes(e);
}
function gd(t, e) {
  const n = e.get(t);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, c] of Object.entries(n.children)) {
    const u = parseInt(s), l = gd(c, e);
    l && o.set(u, l);
  }
  return new Va(r, o);
}
function Ly(t) {
  return { tx: ce.fromPSBT(Ee.decode(t.tx)), children: t.children };
}
class Cr {
  constructor(e, n, r, o, s, c, u, l, h, g, y, w) {
    this.identity = e, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = c, this.arkServerPublicKey = u, this.offchainTapscript = l, this.boardingTapscript = h, this.serverUnrollScript = g, this.forfeitOutputScript = y, this.dustAmount = w;
  }
  static async create(e) {
    const n = e.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = new dd(e.arkServerUrl), o = new pd(e.arkServerUrl), s = await r.getInfo(), c = Yg(s.network), u = new Qg(e.esploraUrl || Xg[s.network]), l = {
      value: s.unilateralExitDelay,
      type: s.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, h = {
      value: s.boardingExitDelay,
      type: s.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, g = rt.decode(s.signerPubkey).slice(1), y = new Vi.Script({
      pubKey: n,
      serverPubKey: g,
      csvTimelock: l
    }), w = new Vi.Script({
      pubKey: n,
      serverPubKey: g,
      csvTimelock: h
    }), b = y, E = Pe.encode({
      timelock: l,
      pubkeys: [g]
    }), T = tr(c).decode(s.forfeitAddress), L = Qt.encode(T);
    return new Cr(e.identity, c, s.network, u, r, o, g, b, w, E, L, s.dust);
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
    let r = 0, o = 0;
    for (const g of e)
      g.status.confirmed ? r += g.value : o += g.value;
    let s = 0, c = 0, u = 0;
    s = n.filter((g) => g.virtualStatus.state === "settled").reduce((g, y) => g + y.value, 0), c = n.filter((g) => g.virtualStatus.state === "preconfirmed").reduce((g, y) => g + y.value, 0), u = n.filter((g) => vo(g) && g.virtualStatus.state === "swept").reduce((g, y) => g + y.value, 0);
    const l = r + o, h = s + c + u;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: o,
        total: l
      },
      settled: s,
      preconfirmed: c,
      available: s + c,
      recoverable: u,
      total: l + h
    };
  }
  async getVtxos(e) {
    const n = await this.getVirtualCoins(e), r = this.offchainTapscript.encode(), o = this.offchainTapscript.forfeit(), s = this.offchainTapscript.exit();
    return n.map((c) => ({
      ...c,
      forfeitTapLeafScript: o,
      intentTapLeafScript: s,
      tapTree: r
    }));
  }
  async getVirtualCoins(e = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [rt.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({
      scripts: n,
      spendableOnly: !0
    })).vtxos;
    if (e.withRecoverable) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        recoverableOnly: !0
      });
      o.push(...s.vtxos);
    }
    if (e.withUnrolled) {
      const s = await this.indexerProvider.getVtxos({
        scripts: n,
        spentOnly: !0
      });
      o.push(...s.vtxos.filter((c) => c.isUnrolled));
    }
    return o;
  }
  async getTransactionHistory() {
    if (!this.indexerProvider)
      return [];
    const e = await this.indexerProvider.getVtxos({
      scripts: [rt.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const l of e.vtxos)
      vo(l) ? o.push(l) : s.push(l);
    const c = ld(o, s, r), u = [...n, ...c];
    return u.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (l, h) => l.createdAt === 0 ? -1 : h.createdAt === 0 ? 1 : h.createdAt - l.createdAt
    ), u;
  }
  async getBoardingTxs() {
    const e = await this.getBoardingAddress(), n = await this.onchainProvider.getTransactions(e), r = [], o = /* @__PURE__ */ new Set();
    for (const u of n)
      for (let l = 0; l < u.vout.length; l++) {
        const h = u.vout[l];
        if (h.scriptpubkey_address === e) {
          const y = (await this.onchainProvider.getTxOutspends(u.txid))[l];
          y?.spent && o.add(y.txid), r.push({
            txid: u.txid,
            vout: l,
            value: Number(h.value),
            status: {
              confirmed: u.status.confirmed,
              block_time: u.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: y?.spent ? "spent" : "settled",
              commitmentTxIds: y?.spent ? [y.txid] : void 0
            },
            createdAt: u.status.confirmed ? new Date(u.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], c = [];
    for (const u of r) {
      const l = {
        key: {
          boardingTxid: u.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: u.value,
        type: bo.TxReceived,
        settled: u.virtualStatus.state === "spent",
        createdAt: u.status.block_time ? new Date(u.status.block_time * 1e3).getTime() : 0
      };
      u.status.block_time ? c.push(l) : s.push(l);
    }
    return {
      boardingTxs: [...s, ...c],
      commitmentsToIgnore: o
    };
  }
  async getBoardingUtxos() {
    const e = await this.getBoardingAddress(), n = await this.onchainProvider.getCoins(e), r = this.boardingTapscript.encode(), o = this.boardingTapscript.forfeit(), s = this.boardingTapscript.exit();
    return n.map((c) => ({
      ...c,
      forfeitTapLeafScript: o,
      intentTapLeafScript: s,
      tapTree: r
    }));
  }
  async sendBitcoin(e) {
    if (e.amount <= 0)
      throw new Error("Amount must be positive");
    if (!My(e.address))
      throw new Error("Invalid Ark address " + e.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Vy(n, e.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = Ur.decode(e.address), u = [
      {
        script: BigInt(e.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(e.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const E = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      u.push({
        script: E,
        amount: BigInt(r.changeAmount)
      });
    }
    const l = this.offchainTapscript.encode();
    let h = wy(r.inputs.map((E) => ({
      ...E,
      tapLeafScript: o,
      tapTree: l
    })), u, this.serverUnrollScript);
    const g = await this.identity.sign(h.arkTx), { arkTxid: y, signedCheckpointTxs: w } = await this.arkProvider.submitTx(Ee.encode(g.toPSBT()), h.checkpoints.map((E) => Ee.encode(E.toPSBT()))), b = await Promise.all(w.map(async (E) => {
      const T = ce.fromPSBT(Ee.decode(E)), L = await this.identity.sign(T);
      return Ee.encode(L.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(y, b), y;
  }
  async settle(e, n) {
    if (e?.inputs) {
      for (const w of e.inputs)
        if (typeof w == "string")
          try {
            Zt.fromString(w);
          } catch {
            throw new Error(`Invalid arknote "${w}"`);
          }
    }
    if (!e) {
      let w = 0;
      const b = await this.getBoardingUtxos();
      w += b.reduce((L, G) => L + G.value, 0);
      const E = await this.getVtxos();
      w += E.reduce((L, G) => L + G.value, 0);
      const T = [...b, ...E];
      if (T.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: T,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(w)
          }
        ]
      };
    }
    const r = [], o = [];
    let s = !1;
    for (const [w, b] of e.outputs.entries()) {
      let E;
      try {
        E = Ur.decode(b.address).pkScript, s = !0;
      } catch {
        const T = tr(this.network).decode(b.address);
        E = Qt.encode(T), r.push(w);
      }
      o.push({
        amount: b.amount,
        script: E
      });
    }
    let c;
    const u = [];
    s && (c = this.identity.signerSession(), u.push(rt.encode(c.getPublicKey())));
    const [l, h] = await Promise.all([
      this.makeRegisterIntentSignature(e.inputs, o, r, u),
      this.makeDeleteIntentSignature(e.inputs)
    ]), g = await this.arkProvider.registerIntent(l), y = new AbortController();
    try {
      let w;
      const b = [
        ...u,
        ...e.inputs.map((V) => `${V.txid}:${V.vout}`)
      ], E = this.arkProvider.getEventStream(y.signal, b);
      let T, L;
      const G = [], Q = [];
      let F, H;
      for await (const V of E)
        switch (n && n(V), V.type) {
          // the settlement failed
          case Rt.BatchFailed:
            if (V.id === T)
              throw new Error(V.reason);
            break;
          case Rt.BatchStarted:
            if (w !== void 0)
              continue;
            const st = await this.handleBatchStartedEvent(V, g, this.arkServerPublicKey, this.forfeitOutputScript);
            st.skip || (w = V.type, L = st.sweepTapTreeRoot, T = st.roundId, s || (w = Rt.TreeNoncesAggregated));
            break;
          case Rt.TreeTx:
            if (w !== Rt.BatchStarted && w !== Rt.TreeNoncesAggregated)
              continue;
            if (V.batchIndex === 0)
              G.push(V.chunk);
            else if (V.batchIndex === 1)
              Q.push(V.chunk);
            else
              throw new Error(`Invalid batch index: ${V.batchIndex}`);
            break;
          case Rt.TreeSignature:
            if (w !== Rt.TreeNoncesAggregated || !s)
              continue;
            if (!F)
              throw new Error("Vtxo graph not set, something went wrong");
            if (V.batchIndex === 0) {
              const A = rt.decode(V.signature);
              F.update(V.txid, (yt) => {
                yt.updateInput(0, {
                  tapKeySig: A
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case Rt.TreeSigningStarted:
            if (w !== Rt.BatchStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              if (!L)
                throw new Error("Sweep tap tree root not set");
              if (G.length === 0)
                throw new Error("unsigned vtxo graph not received");
              F = Va.create(G), await this.handleSettlementSigningEvent(V, L, c, F);
            }
            w = V.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case Rt.TreeNoncesAggregated:
            if (w !== Rt.TreeSigningStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              await this.handleSettlementSigningNoncesGeneratedEvent(V, c);
            }
            w = V.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case Rt.BatchFinalization:
            if (w !== Rt.TreeNoncesAggregated)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            Q.length > 0 && (H = Va.create(Q), gy(V.commitmentTx, H)), await this.handleSettlementFinalizationEvent(V, e.inputs, this.forfeitOutputScript, H), w = V.type;
            break;
          // the settlement is done, last event to be received
          case Rt.BatchFinalized:
            if (w !== Rt.BatchFinalization)
              continue;
            return y.abort(), V.commitmentTxid;
        }
    } catch (w) {
      y.abort();
      try {
        await this.arkProvider.deleteIntent(h);
      } catch {
      }
      throw w;
    }
    throw new Error("Settlement failed");
  }
  async notifyIncomingFunds(e) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, s;
    if (this.onchainProvider && r && (o = await this.onchainProvider.watchAddresses([r], (u) => {
      const l = u.map((h) => {
        const g = h.vout.findIndex((y) => y.scriptpubkey_address === r);
        return g === -1 ? (console.warn(`No vout found for address ${r} in transaction ${h.txid}`), null) : {
          txid: h.txid,
          vout: g,
          value: Number(h.vout[g].value),
          status: h.status
        };
      }).filter((h) => h !== null);
      e({
        type: "utxo",
        coins: l
      });
    })), this.indexerProvider && n) {
      const u = this.offchainTapscript, l = await this.indexerProvider.subscribeForScripts([
        rt.encode(u.pkScript)
      ]), h = new AbortController(), g = this.indexerProvider.getSubscription(l, h.signal);
      s = async () => {
        h.abort(), await this.indexerProvider?.unsubscribeForScripts(l);
      }, (async () => {
        try {
          for await (const y of g)
            y.newVtxos?.length > 0 && e({
              type: "vtxo",
              vtxos: y.newVtxos
            });
        } catch (y) {
          console.error("Subscription error:", y);
        }
      })();
    }
    return () => {
      o?.(), s?.();
    };
  }
  async handleBatchStartedEvent(e, n, r, o) {
    const s = new TextEncoder().encode(n), c = Xt(s), u = rt.encode(new Uint8Array(c));
    let l = !0;
    for (const y of e.intentIdHashes)
      if (y === u) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), l = !1;
      }
    if (l)
      return { skip: l };
    const h = Pe.encode({
      timelock: {
        value: e.batchExpiry,
        type: e.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, g = no(h);
    return {
      roundId: e.id,
      sweepTapTreeRoot: g,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r, o) {
    const s = ce.fromPSBT(Ee.decode(e.unsignedCommitmentTx));
    yy(o, s, n);
    const c = s.getOutput(0);
    if (!c?.amount)
      throw new Error("Shared output not found");
    r.init(o, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, rt.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, rt.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r, o) {
    const s = [], c = await this.getVirtualCoins();
    let u = ce.fromPSBT(Ee.decode(e.commitmentTx)), l = !1, h = 0;
    const g = o?.leaves() || [];
    for (const y of n) {
      const w = c.find((F) => F.txid === y.txid && F.vout === y.vout);
      if (!w) {
        l = !0;
        const F = [];
        for (let H = 0; H < u.inputsLength; H++) {
          const V = u.getInput(H);
          if (!V.txid || V.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          rt.encode(V.txid) === y.txid && V.index === y.vout && (u.updateInput(H, {
            tapLeafScript: [y.forfeitTapLeafScript]
          }), F.push(H));
        }
        u = await this.identity.sign(u, F);
        continue;
      }
      if (jg(w) || fd(w, this.dustAmount))
        continue;
      if (g.length === 0)
        throw new Error("connectors not received");
      if (h >= g.length)
        throw new Error("not enough connectors received");
      const b = g[h], E = rt.encode(he(b.toBytes(!0)).reverse()), T = b.getOutput(0);
      if (!T)
        throw new Error("connector output not found");
      const L = T.amount, G = T.script;
      if (!L || !G)
        throw new Error("invalid connector output");
      h++;
      let Q = sy([
        {
          txid: y.txid,
          index: y.vout,
          witnessUtxo: {
            amount: BigInt(w.value),
            script: Le.decode(y.tapTree).pkScript
          },
          sighashType: gn.DEFAULT,
          tapLeafScript: [y.forfeitTapLeafScript]
        },
        {
          txid: E,
          index: 0,
          witnessUtxo: {
            amount: L,
            script: G
          }
        }
      ], r);
      Q = await this.identity.sign(Q, [0]), s.push(Ee.encode(Q.toPSBT()));
    }
    (s.length > 0 || l) && await this.arkProvider.submitSignedForfeitTxs(s, l ? Ee.encode(u.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(e, n, r, o) {
    const s = Math.floor(Date.now() / 1e3), { inputs: c, inputTapTrees: u, finalizer: l } = this.prepareBIP322Inputs(e), h = {
      type: "register",
      input_tap_trees: u,
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 120,
      // valid for 2 minutes
      cosigners_public_keys: o
    }, g = JSON.stringify(h, null, 0);
    return {
      signature: await this.makeBIP322Signature(g, c, l, n),
      message: g
    };
  }
  async makeDeleteIntentSignature(e) {
    const n = Math.floor(Date.now() / 1e3), { inputs: r, finalizer: o } = this.prepareBIP322Inputs(e), s = {
      type: "delete",
      expire_at: n + 120
      // valid for 2 minutes
    }, c = JSON.stringify(s, null, 0);
    return {
      signature: await this.makeBIP322Signature(c, r, o),
      message: c
    };
  }
  prepareBIP322Inputs(e) {
    const n = [], r = [], o = [];
    for (const s of e) {
      const c = Le.decode(s.tapTree), u = Dy(s);
      n.push({
        txid: rt.decode(s.txid),
        index: s.vout,
        witnessUtxo: {
          amount: BigInt(s.value),
          script: c.pkScript
        },
        sequence: u,
        tapLeafScript: [s.intentTapLeafScript]
      }), r.push(rt.encode(s.tapTree)), o.push(s.extraWitness || []);
    }
    return {
      inputs: n,
      inputTapTrees: r,
      finalizer: Ky(o)
    };
  }
  async makeBIP322Signature(e, n, r, o) {
    const s = Fi.create(e, n, o), c = await this.identity.sign(s);
    return Fi.signature(c, r);
  }
}
Cr.MIN_FEE_RATE = 1;
function Ky(t) {
  return function(e) {
    for (let n = 0; n < e.inputsLength; n++) {
      try {
        e.finalizeIdx(n);
      } catch (s) {
        if (s instanceof Error && s.message.includes("finalize/taproot: empty witness")) {
          const c = e.getInput(n).tapLeafScript;
          if (!c || c.length <= 0)
            throw s;
          const [u, l] = c[0], h = l.slice(0, -1);
          e.updateInput(n, {
            finalScriptWitness: [
              h,
              dn.encode(u)
            ]
          });
        }
      }
      const r = e.getInput(n).finalScriptWitness;
      if (!r)
        throw new Error("input not finalized");
      const o = t[n === 0 ? 0 : n - 1];
      o && o.length > 0 && e.updateInput(n, {
        finalScriptWitness: [...o, ...r]
      });
    }
  };
}
function Dy(t) {
  let e;
  try {
    const n = t.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = Pe.decode(r).params;
    e = Ka.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return e;
}
function My(t) {
  try {
    return Ur.decode(t), !0;
  } catch {
    return !1;
  }
}
function Vy(t, e) {
  const n = [...t].sort((c, u) => {
    const l = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, h = u.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return l !== h ? l - h : u.value - c.value;
  }), r = [];
  let o = 0;
  for (const c of n)
    if (r.push(c), o += c.value, o >= e)
      break;
  if (o === e)
    return { inputs: r, changeAmount: 0n };
  if (o < e)
    throw new Error("Insufficient funds");
  const s = BigInt(o - e);
  return {
    inputs: r,
    changeAmount: s
  };
}
var mt;
(function(t) {
  t.walletInitialized = (q) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: q
  });
  function e(q, Z) {
    return {
      type: "ERROR",
      success: !1,
      message: Z,
      id: q
    };
  }
  t.error = e;
  function n(q, Z) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: Z,
      id: q
    };
  }
  t.settleEvent = n;
  function r(q, Z) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: Z,
      id: q
    };
  }
  t.settleSuccess = r;
  function o(q) {
    return q.type === "SETTLE_SUCCESS" && q.success;
  }
  t.isSettleSuccess = o;
  function s(q) {
    return q.type === "ADDRESS" && q.success === !0;
  }
  t.isAddress = s;
  function c(q) {
    return q.type === "BOARDING_ADDRESS" && q.success === !0;
  }
  t.isBoardingAddress = c;
  function u(q, Z) {
    return {
      type: "ADDRESS",
      success: !0,
      address: Z,
      id: q
    };
  }
  t.address = u;
  function l(q, Z) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: Z,
      id: q
    };
  }
  t.boardingAddress = l;
  function h(q) {
    return q.type === "BALANCE" && q.success === !0;
  }
  t.isBalance = h;
  function g(q, Z) {
    return {
      type: "BALANCE",
      success: !0,
      balance: Z,
      id: q
    };
  }
  t.balance = g;
  function y(q) {
    return q.type === "VTXOS" && q.success === !0;
  }
  t.isVtxos = y;
  function w(q, Z) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: Z,
      id: q
    };
  }
  t.vtxos = w;
  function b(q) {
    return q.type === "VIRTUAL_COINS" && q.success === !0;
  }
  t.isVirtualCoins = b;
  function E(q, Z) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: Z,
      id: q
    };
  }
  t.virtualCoins = E;
  function T(q) {
    return q.type === "BOARDING_UTXOS" && q.success === !0;
  }
  t.isBoardingUtxos = T;
  function L(q, Z) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: Z,
      id: q
    };
  }
  t.boardingUtxos = L;
  function G(q) {
    return q.type === "SEND_BITCOIN_SUCCESS" && q.success === !0;
  }
  t.isSendBitcoinSuccess = G;
  function Q(q, Z) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: Z,
      id: q
    };
  }
  t.sendBitcoinSuccess = Q;
  function F(q) {
    return q.type === "TRANSACTION_HISTORY" && q.success === !0;
  }
  t.isTransactionHistory = F;
  function H(q, Z) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: Z,
      id: q
    };
  }
  t.transactionHistory = H;
  function V(q) {
    return q.type === "WALLET_STATUS" && q.success === !0;
  }
  t.isWalletStatus = V;
  function st(q, Z, D) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: Z,
        xOnlyPublicKey: D
      },
      id: q
    };
  }
  t.walletStatus = st;
  function A(q) {
    return q.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = A;
  function yt(q, Z) {
    return {
      type: "CLEAR_RESPONSE",
      success: Z,
      id: q
    };
  }
  t.clearResponse = yt;
  function lt(q, Z) {
    return {
      type: "SIGN_SUCCESS",
      success: !0,
      tx: Z,
      id: q
    };
  }
  t.signSuccess = lt;
  function xt(q) {
    return q.type === "SIGN_SUCCESS" && q.success === !0;
  }
  t.isSignSuccess = xt;
})(mt || (mt = {}));
class $t {
  constructor(e, n, r, o, s, c) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = s, this.outputSize = c;
  }
  static create() {
    return new $t(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += $t.INPUT_SIZE, this;
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += $t.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += $t.INPUT_SIZE + $t.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const o = 1 + $t.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + o, this.inputSize += $t.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += $t.OUTPUT_SIZE + $t.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += $t.OUTPUT_SIZE + $t.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (c) => c < 253 ? 1 : c < 65535 ? 3 : c < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let s = ($t.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * $t.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += $t.WITNESS_HEADER_SIZE + this.inputWitnessSize), Hy(s);
  }
}
$t.P2PKH_SCRIPT_SIG_SIZE = 108;
$t.INPUT_SIZE = 41;
$t.BASE_CONTROL_BLOCK_SIZE = 33;
$t.OUTPUT_SIZE = 9;
$t.P2WKH_OUTPUT_SIZE = 22;
$t.BASE_TX_SIZE = 10;
$t.WITNESS_HEADER_SIZE = 2;
$t.WITNESS_SCALE_FACTOR = 4;
$t.P2TR_OUTPUT_SIZE = 34;
const Hy = (t) => {
  const e = BigInt(Math.ceil(t / $t.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
};
var ye;
(function(t) {
  function e(E) {
    return typeof E == "object" && E !== null && "type" in E;
  }
  t.isBase = e;
  function n(E) {
    return E.type === "INIT_WALLET" && "privateKey" in E && typeof E.privateKey == "string" && "arkServerUrl" in E && typeof E.arkServerUrl == "string" && ("arkServerPublicKey" in E ? typeof E.arkServerPublicKey == "string" || E.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(E) {
    return E.type === "SETTLE";
  }
  t.isSettle = r;
  function o(E) {
    return E.type === "GET_ADDRESS";
  }
  t.isGetAddress = o;
  function s(E) {
    return E.type === "GET_BOARDING_ADDRESS";
  }
  t.isGetBoardingAddress = s;
  function c(E) {
    return E.type === "GET_BALANCE";
  }
  t.isGetBalance = c;
  function u(E) {
    return E.type === "GET_VTXOS";
  }
  t.isGetVtxos = u;
  function l(E) {
    return E.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = l;
  function h(E) {
    return E.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = h;
  function g(E) {
    return E.type === "SEND_BITCOIN" && "params" in E && E.params !== null && typeof E.params == "object" && "address" in E.params && typeof E.params.address == "string" && "amount" in E.params && typeof E.params.amount == "number";
  }
  t.isSendBitcoin = g;
  function y(E) {
    return E.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = y;
  function w(E) {
    return E.type === "GET_STATUS";
  }
  t.isGetStatus = w;
  function b(E) {
    return E.type === "SIGN" && "tx" in E && typeof E.tx == "string" && ("inputIndexes" in E && E.inputIndexes != null ? Array.isArray(E.inputIndexes) && E.inputIndexes.every((T) => typeof T == "number") : !0);
  }
  t.isSign = b;
})(ye || (ye = {}));
class Vt {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase(Vt.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const o = indexedDB.deleteDatabase(Vt.DB_NAME);
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
      const r = indexedDB.open(Vt.DB_NAME, Vt.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (o) => {
        const s = o.target.result;
        if (!s.objectStoreNames.contains(Vt.STORE_NAME)) {
          const c = s.createObjectStore(Vt.STORE_NAME, {
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
      const s = this.db.transaction(Vt.STORE_NAME, "readwrite").objectStore(Vt.STORE_NAME), c = e.map((u) => new Promise((l, h) => {
        const g = s.put(u);
        g.onsuccess = () => l(), g.onerror = () => h(g.error);
      }));
      Promise.all(c).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Vt.STORE_NAME, "readwrite").objectStore(Vt.STORE_NAME).clear();
      s.onsuccess = () => e(), s.onerror = () => n(s.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Vt.STORE_NAME, "readonly").objectStore(Vt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSweptVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Vt.STORE_NAME, "readonly").objectStore(Vt.STORE_NAME).index("state").getAll(IDBKeyRange.only("swept"));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSpentVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Vt.STORE_NAME, "readonly").objectStore(Vt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.lowerBound("", !0));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Vt.STORE_NAME, "readonly").objectStore(Vt.STORE_NAME).index("spentBy"), c = s.getAll(IDBKeyRange.only("")), u = s.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((l, h) => {
          c.onsuccess = () => {
            l(c.result);
          }, c.onerror = () => h(c.error);
        }),
        new Promise((l, h) => {
          u.onsuccess = () => {
            l(u.result);
          }, u.onerror = () => h(u.error);
        })
      ]).then(([l, h]) => {
        e({
          spendable: l,
          spent: h
        });
      }).catch(n);
    });
  }
}
Vt.DB_NAME = "wallet-db";
Vt.STORE_NAME = "vtxos";
Vt.DB_VERSION = 1;
class Fy {
  constructor(e = new Vt(), n = () => {
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
  async reload() {
    this.vtxoSubscription && this.vtxoSubscription.abort(), await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider || !this.indexerProvider || !this.wallet.offchainTapscript || !this.wallet.boardingTapscript)
      return;
    await this.vtxoRepository.open();
    const e = this.wallet.offchainTapscript.encode(), n = this.wallet.offchainTapscript.forfeit(), r = this.wallet.offchainTapscript.exit(), o = rt.encode(this.wallet.offchainTapscript.pkScript), c = (await this.indexerProvider.getVtxos({
      scripts: [o]
    })).vtxos.map((u) => ({
      ...u,
      forfeitTapLeafScript: n,
      intentTapLeafScript: r,
      tapTree: e
    }));
    await this.vtxoRepository.addOrUpdate(c), this.processVtxoSubscription({
      script: o,
      vtxoScript: this.wallet.offchainTapscript
    });
  }
  async processVtxoSubscription({ script: e, vtxoScript: n }) {
    try {
      const r = n.forfeit(), o = n.exit(), s = new AbortController(), c = await this.indexerProvider.subscribeForScripts([e]), u = this.indexerProvider.getSubscription(c, s.signal);
      this.vtxoSubscription = s;
      const l = n.encode();
      for await (const h of u) {
        const g = [...h.newVtxos, ...h.spentVtxos];
        if (g.length === 0)
          continue;
        const y = g.map((w) => ({
          ...w,
          forfeitTapLeafScript: r,
          intentTapLeafScript: o,
          tapTree: l
        }));
        await this.vtxoRepository.addOrUpdate(y);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    this.clear(), ye.isBase(e.data) && e.source?.postMessage(mt.clearResponse(e.data.id, !0));
  }
  async handleInitWallet(e) {
    const n = e.data;
    if (!ye.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), e.source?.postMessage(mt.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new dd(n.arkServerUrl), this.indexerProvider = new pd(n.arkServerUrl), this.wallet = await Cr.create({
        identity: Ki.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), e.source?.postMessage(mt.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (r) {
      console.error("Error initializing wallet:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleSettle(e) {
    const n = e.data;
    if (!ye.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), e.source?.postMessage(mt.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.wallet.settle(n.params, (o) => {
        e.source?.postMessage(mt.settleEvent(n.id, o));
      });
      e.source?.postMessage(mt.settleSuccess(n.id, r));
    } catch (r) {
      console.error("Error settling:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleSendBitcoin(e) {
    const n = e.data;
    if (!ye.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), e.source?.postMessage(mt.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.sendBitcoin(n.params);
      e.source?.postMessage(mt.sendBitcoinSuccess(n.id, r));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetAddress(e) {
    const n = e.data;
    if (!ye.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getAddress();
      e.source?.postMessage(mt.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetBoardingAddress(e) {
    const n = e.data;
    if (!ye.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingAddress();
      e.source?.postMessage(mt.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetBalance(e) {
    const n = e.data;
    if (!ye.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, o, s] = await Promise.all([
        this.wallet.getBoardingUtxos(),
        this.vtxoRepository.getSpendableVtxos(),
        this.vtxoRepository.getSweptVtxos()
      ]);
      let c = 0, u = 0;
      for (const b of r)
        b.status.confirmed ? c += b.value : u += b.value;
      let l = 0, h = 0, g = 0;
      for (const b of o)
        b.virtualStatus.state === "settled" ? l += b.value : b.virtualStatus.state === "preconfirmed" && (h += b.value);
      for (const b of s)
        vo(b) && (g += b.value);
      const y = c + u, w = l + h + g;
      e.source?.postMessage(mt.balance(n.id, {
        boarding: {
          confirmed: c,
          unconfirmed: u,
          total: y
        },
        settled: l,
        preconfirmed: h,
        available: l + h,
        recoverable: g,
        total: y + w
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetVtxos(e) {
    const n = e.data;
    if (!ye.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      let r = await this.vtxoRepository.getSpendableVtxos();
      if (!n.filter?.withRecoverable) {
        if (!this.wallet)
          throw new Error("Wallet not initialized");
        r = r.filter((o) => !fd(o, this.wallet.dustAmount));
      }
      if (n.filter?.withRecoverable) {
        const o = await this.vtxoRepository.getSweptVtxos();
        r.push(...o.filter(vo));
      }
      e.source?.postMessage(mt.vtxos(n.id, r));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetBoardingUtxos(e) {
    const n = e.data;
    if (!ye.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.wallet.getBoardingUtxos();
      e.source?.postMessage(mt.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetTransactionHistory(e) {
    const n = e.data;
    if (!ye.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: r, commitmentsToIgnore: o } = await this.wallet.getBoardingTxs(), { spendable: s, spent: c } = await this.vtxoRepository.getAllVtxos(), u = ld(s, c, o), l = [...r, ...u];
      l.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (h, g) => h.createdAt === 0 ? -1 : g.createdAt === 0 ? 1 : g.createdAt - h.createdAt
      ), e.source?.postMessage(mt.transactionHistory(n.id, l));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleGetStatus(e) {
    const n = e.data;
    if (!ye.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), e.source?.postMessage(mt.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    e.source?.postMessage(mt.walletStatus(n.id, this.wallet !== void 0, this.wallet?.identity.xOnlyPublicKey()));
  }
  async handleSign(e) {
    const n = e.data;
    if (!ye.isSign(n)) {
      console.error("Invalid SIGN message format", n), e.source?.postMessage(mt.error(n.id, "Invalid SIGN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), e.source?.postMessage(mt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = ce.fromPSBT(Ee.decode(n.tx), {
        allowUnknown: !0,
        allowUnknownInputs: !0
      }), o = await this.wallet.identity.sign(r, n.inputIndexes);
      e.source?.postMessage(mt.signSuccess(n.id, Ee.encode(o.toPSBT())));
    } catch (r) {
      console.error("Error signing:", r);
      const o = r instanceof Error ? r.message : "Unknown error occurred";
      e.source?.postMessage(mt.error(n.id, o));
    }
  }
  async handleMessage(e) {
    this.messageCallback(e);
    const n = e.data;
    if (!ye.isBase(n)) {
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
        e.source?.postMessage(mt.error(n.id, "Unknown message type"));
    }
  }
}
var mf;
(function(t) {
  let e;
  (function(o) {
    o[o.UNROLL = 0] = "UNROLL", o[o.WAIT = 1] = "WAIT", o[o.DONE = 2] = "DONE";
  })(e = t.StepType || (t.StepType = {}));
  class n {
    constructor(s, c, u, l) {
      this.toUnroll = s, this.bumper = c, this.explorer = u, this.indexer = l;
    }
    static async create(s, c, u, l) {
      const { chain: h } = await l.getVtxoChain(s);
      return new n({ ...s, chain: h }, c, u, l);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const c = this.toUnroll.chain;
      for (let h = c.length - 1; h >= 0; h--) {
        const g = c[h];
        if (!(g.type === Er.COMMITMENT || g.type === Er.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(g.txid)).confirmed)
              return {
                type: e.WAIT,
                txid: g.txid,
                do: zy(this.explorer, g.txid)
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
      const u = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (u.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const l = ce.fromPSBT(Ee.decode(u.txs[0]), {
        allowUnknownInputs: !0
      });
      if (s.type === Er.TREE) {
        const h = l.getInput(0);
        if (!h)
          throw new Error("Input not found");
        const g = h.tapKeySig;
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
        do: qy(this.bumper, this.explorer, l)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await jy(1e3);
        const c = await this.next();
        await c.do(), yield c, s = c.type;
      } while (s !== e.DONE);
    }
  }
  t.Session = n;
  async function r(o, s, c) {
    const u = await o.onchainProvider.getChainTip();
    let l = await o.getVtxos({ withUnrolled: !0 });
    if (l = l.filter((L) => s.includes(L.txid)), l.length === 0)
      throw new Error("No vtxos to complete unroll");
    const h = [];
    let g = 0n;
    const y = $t.create();
    for (const L of l) {
      if (!L.isUnrolled)
        throw new Error(`Vtxo ${L.txid}:${L.vout} is not fully unrolled, use unroll first`);
      const G = await o.onchainProvider.getTxStatus(L.txid);
      if (!G.confirmed)
        throw new Error(`tx ${L.txid} is not confirmed`);
      const Q = Gy({ height: G.blockHeight, time: G.blockTime }, u, L);
      if (!Q)
        throw new Error(`no available exit path found for vtxo ${L.txid}:${L.vout}`);
      const F = Le.decode(L.tapTree).findLeaf(rt.encode(Q.script));
      if (!F)
        throw new Error(`spending leaf not found for vtxo ${L.txid}:${L.vout}`);
      g += BigInt(L.value), h.push({
        txid: L.txid,
        index: L.vout,
        tapLeafScript: [F],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(L.value),
          script: Le.decode(L.tapTree).pkScript
        },
        sighashType: gn.DEFAULT
      }), y.addTapscriptInput(64, F[1].length, dn.encode(F[0]).length);
    }
    const w = new ce({ allowUnknownInputs: !0, version: 2 });
    for (const L of h)
      w.addInput(L);
    y.addP2TROutput();
    let b = await o.onchainProvider.getFeeRate();
    (!b || b < Cr.MIN_FEE_RATE) && (b = Cr.MIN_FEE_RATE);
    const E = y.vsize().fee(BigInt(b));
    if (E > g)
      throw new Error("fee amount is greater than the total amount");
    w.addOutputAddress(c, g - E);
    const T = await o.identity.sign(w);
    return T.finalize(), await o.onchainProvider.broadcastTransaction(T.hex), T.id;
  }
  t.completeUnroll = r;
})(mf || (mf = {}));
function jy(t) {
  return new Promise((e) => setTimeout(e, t));
}
function qy(t, e, n) {
  return async () => {
    const [r, o] = await t.bumpP2A(n);
    await e.broadcastTransaction(r, o);
  };
}
function zy(t, e) {
  return () => new Promise((n, r) => {
    const o = setInterval(async () => {
      try {
        (await t.getTxStatus(e)).confirmed && (clearInterval(o), n());
      } catch (s) {
        clearInterval(o), r(s);
      }
    }, 5e3);
  });
}
function Gy(t, e, n) {
  const r = Le.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (e.height >= t.height + Number(o.params.timelock.value))
        return o;
    } else if (e.time >= t.time + Number(o.params.timelock.value))
      return o;
}
var yi = { exports: {} }, Wy = yi.exports, bf;
function Yy() {
  return bf || (bf = 1, (function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(Wy, function() {
      var n = function(i, a) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(f, d) {
          f.__proto__ = d;
        } || function(f, d) {
          for (var p in d) Object.prototype.hasOwnProperty.call(d, p) && (f[p] = d[p]);
        })(i, a);
      }, r = function() {
        return (r = Object.assign || function(i) {
          for (var a, f = 1, d = arguments.length; f < d; f++) for (var p in a = arguments[f]) Object.prototype.hasOwnProperty.call(a, p) && (i[p] = a[p]);
          return i;
        }).apply(this, arguments);
      };
      function o(i, a, f) {
        for (var d, p = 0, m = a.length; p < m; p++) !d && p in a || ((d = d || Array.prototype.slice.call(a, 0, p))[p] = a[p]);
        return i.concat(d || Array.prototype.slice.call(a));
      }
      var s = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : $g, c = Object.keys, u = Array.isArray;
      function l(i, a) {
        return typeof a != "object" || c(a).forEach(function(f) {
          i[f] = a[f];
        }), i;
      }
      typeof Promise > "u" || s.Promise || (s.Promise = Promise);
      var h = Object.getPrototypeOf, g = {}.hasOwnProperty;
      function y(i, a) {
        return g.call(i, a);
      }
      function w(i, a) {
        typeof a == "function" && (a = a(h(i))), (typeof Reflect > "u" ? c : Reflect.ownKeys)(a).forEach(function(f) {
          E(i, f, a[f]);
        });
      }
      var b = Object.defineProperty;
      function E(i, a, f, d) {
        b(i, a, l(f && y(f, "get") && typeof f.get == "function" ? { get: f.get, set: f.set, configurable: !0 } : { value: f, configurable: !0, writable: !0 }, d));
      }
      function T(i) {
        return { from: function(a) {
          return i.prototype = Object.create(a.prototype), E(i.prototype, "constructor", i), { extend: w.bind(null, i.prototype) };
        } };
      }
      var L = Object.getOwnPropertyDescriptor, G = [].slice;
      function Q(i, a, f) {
        return G.call(i, a, f);
      }
      function F(i, a) {
        return a(i);
      }
      function H(i) {
        if (!i) throw new Error("Assertion Failed");
      }
      function V(i) {
        s.setImmediate ? setImmediate(i) : setTimeout(i, 0);
      }
      function st(i, a) {
        if (typeof a == "string" && y(i, a)) return i[a];
        if (!a) return i;
        if (typeof a != "string") {
          for (var f = [], d = 0, p = a.length; d < p; ++d) {
            var m = st(i, a[d]);
            f.push(m);
          }
          return f;
        }
        var v = a.indexOf(".");
        if (v !== -1) {
          var x = i[a.substr(0, v)];
          return x == null ? void 0 : st(x, a.substr(v + 1));
        }
      }
      function A(i, a, f) {
        if (i && a !== void 0 && !("isFrozen" in Object && Object.isFrozen(i))) if (typeof a != "string" && "length" in a) {
          H(typeof f != "string" && "length" in f);
          for (var d = 0, p = a.length; d < p; ++d) A(i, a[d], f[d]);
        } else {
          var m, v, x = a.indexOf(".");
          x !== -1 ? (m = a.substr(0, x), (v = a.substr(x + 1)) === "" ? f === void 0 ? u(i) && !isNaN(parseInt(m)) ? i.splice(m, 1) : delete i[m] : i[m] = f : A(x = !(x = i[m]) || !y(i, m) ? i[m] = {} : x, v, f)) : f === void 0 ? u(i) && !isNaN(parseInt(a)) ? i.splice(a, 1) : delete i[a] : i[a] = f;
        }
      }
      function yt(i) {
        var a, f = {};
        for (a in i) y(i, a) && (f[a] = i[a]);
        return f;
      }
      var lt = [].concat;
      function xt(i) {
        return lt.apply([], i);
      }
      var Cn = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(xt([8, 16, 32, 64].map(function(i) {
        return ["Int", "Uint", "Float"].map(function(a) {
          return a + i + "Array";
        });
      }))).filter(function(i) {
        return s[i];
      }), q = new Set(Cn.map(function(i) {
        return s[i];
      })), Z = null;
      function D(i) {
        return Z = /* @__PURE__ */ new WeakMap(), i = (function a(f) {
          if (!f || typeof f != "object") return f;
          var d = Z.get(f);
          if (d) return d;
          if (u(f)) {
            d = [], Z.set(f, d);
            for (var p = 0, m = f.length; p < m; ++p) d.push(a(f[p]));
          } else if (q.has(f.constructor)) d = f;
          else {
            var v, x = h(f);
            for (v in d = x === Object.prototype ? {} : Object.create(x), Z.set(f, d), f) y(f, v) && (d[v] = a(f[v]));
          }
          return d;
        })(i), Z = null, i;
      }
      var z = {}.toString;
      function N(i) {
        return z.call(i).slice(8, -1);
      }
      var P = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", W = typeof P == "symbol" ? function(i) {
        var a;
        return i != null && (a = i[P]) && a.apply(i);
      } : function() {
        return null;
      };
      function J(i, a) {
        return a = i.indexOf(a), 0 <= a && i.splice(a, 1), 0 <= a;
      }
      var X = {};
      function Y(i) {
        var a, f, d, p;
        if (arguments.length === 1) {
          if (u(i)) return i.slice();
          if (this === X && typeof i == "string") return [i];
          if (p = W(i)) {
            for (f = []; !(d = p.next()).done; ) f.push(d.value);
            return f;
          }
          if (i == null) return [i];
          if (typeof (a = i.length) != "number") return [i];
          for (f = new Array(a); a--; ) f[a] = i[a];
          return f;
        }
        for (a = arguments.length, f = new Array(a); a--; ) f[a] = arguments[a];
        return f;
      }
      var ut = typeof Symbol < "u" ? function(i) {
        return i[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, Pr = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], Ue = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Pr), pt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function It(i, a) {
        this.name = i, this.message = a;
      }
      function St(i, a) {
        return i + ". Errors: " + Object.keys(a).map(function(f) {
          return a[f].toString();
        }).filter(function(f, d, p) {
          return p.indexOf(f) === d;
        }).join(`
`);
      }
      function wt(i, a, f, d) {
        this.failures = a, this.failedKeys = d, this.successCount = f, this.message = St(i, a);
      }
      function Bt(i, a) {
        this.name = "BulkError", this.failures = Object.keys(a).map(function(f) {
          return a[f];
        }), this.failuresByPos = a, this.message = St(i, this.failures);
      }
      T(It).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), T(wt).from(It), T(Bt).from(It);
      var Nt = Ue.reduce(function(i, a) {
        return i[a] = a + "Error", i;
      }, {}), qt = It, ot = Ue.reduce(function(i, a) {
        var f = a + "Error";
        function d(p, m) {
          this.name = f, p ? typeof p == "string" ? (this.message = "".concat(p).concat(m ? `
 ` + m : ""), this.inner = m || null) : typeof p == "object" && (this.message = "".concat(p.name, " ").concat(p.message), this.inner = p) : (this.message = pt[a] || f, this.inner = null);
        }
        return T(d).from(qt), i[a] = d, i;
      }, {});
      ot.Syntax = SyntaxError, ot.Type = TypeError, ot.Range = RangeError;
      var Ot = Pr.reduce(function(i, a) {
        return i[a + "Error"] = ot[a], i;
      }, {}), Ie = Ue.reduce(function(i, a) {
        return ["Syntax", "Type", "Range"].indexOf(a) === -1 && (i[a + "Error"] = ot[a]), i;
      }, {});
      function At() {
      }
      function ue(i) {
        return i;
      }
      function Un(i, a) {
        return i == null || i === ue ? a : function(f) {
          return a(i(f));
        };
      }
      function ve(i, a) {
        return function() {
          i.apply(this, arguments), a.apply(this, arguments);
        };
      }
      function Bo(i, a) {
        return i === At ? a : function() {
          var f = i.apply(this, arguments);
          f !== void 0 && (arguments[0] = f);
          var d = this.onsuccess, p = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var m = a.apply(this, arguments);
          return d && (this.onsuccess = this.onsuccess ? ve(d, this.onsuccess) : d), p && (this.onerror = this.onerror ? ve(p, this.onerror) : p), m !== void 0 ? m : f;
        };
      }
      function md(i, a) {
        return i === At ? a : function() {
          i.apply(this, arguments);
          var f = this.onsuccess, d = this.onerror;
          this.onsuccess = this.onerror = null, a.apply(this, arguments), f && (this.onsuccess = this.onsuccess ? ve(f, this.onsuccess) : f), d && (this.onerror = this.onerror ? ve(d, this.onerror) : d);
        };
      }
      function bd(i, a) {
        return i === At ? a : function(f) {
          var d = i.apply(this, arguments);
          l(f, d);
          var p = this.onsuccess, m = this.onerror;
          return this.onsuccess = null, this.onerror = null, f = a.apply(this, arguments), p && (this.onsuccess = this.onsuccess ? ve(p, this.onsuccess) : p), m && (this.onerror = this.onerror ? ve(m, this.onerror) : m), d === void 0 ? f === void 0 ? void 0 : f : l(d, f);
        };
      }
      function vd(i, a) {
        return i === At ? a : function() {
          return a.apply(this, arguments) !== !1 && i.apply(this, arguments);
        };
      }
      function rs(i, a) {
        return i === At ? a : function() {
          var f = i.apply(this, arguments);
          if (f && typeof f.then == "function") {
            for (var d = this, p = arguments.length, m = new Array(p); p--; ) m[p] = arguments[p];
            return f.then(function() {
              return a.apply(d, m);
            });
          }
          return a.apply(this, arguments);
        };
      }
      Ie.ModifyError = wt, Ie.DexieError = It, Ie.BulkError = Bt;
      var Ge = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Nc(i) {
        Ge = i;
      }
      var $r = {}, Uc = 100, Cn = typeof Promise > "u" ? [] : (function() {
        var i = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [i, h(i), i];
        var a = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [a, h(a), i];
      })(), Pr = Cn[0], Ue = Cn[1], Cn = Cn[2], Ue = Ue && Ue.then, On = Pr && Pr.constructor, os = !!Cn, Lr = function(i, a) {
        Kr.push([i, a]), _o && (queueMicrotask(xd), _o = !1);
      }, is = !0, _o = !0, Rn = [], No = [], ss = ue, yn = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: At, pgp: !1, env: {}, finalize: At }, ht = yn, Kr = [], $n = 0, Uo = [];
      function ft(i) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var a = this._PSD = ht;
        if (typeof i != "function") {
          if (i !== $r) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && cs(this, this._value));
        }
        this._state = null, this._value = null, ++a.ref, (function f(d, p) {
          try {
            p(function(m) {
              if (d._state === null) {
                if (m === d) throw new TypeError("A promise cannot be resolved with itself.");
                var v = d._lib && rr();
                m && typeof m.then == "function" ? f(d, function(x, k) {
                  m instanceof ft ? m._then(x, k) : m.then(x, k);
                }) : (d._state = !0, d._value = m, Oc(d)), v && or();
              }
            }, cs.bind(null, d));
          } catch (m) {
            cs(d, m);
          }
        })(this, i);
      }
      var as = { get: function() {
        var i = ht, a = $o;
        function f(d, p) {
          var m = this, v = !i.global && (i !== ht || a !== $o), x = v && !mn(), k = new ft(function(B, C) {
            us(m, new Cc($c(d, i, v, x), $c(p, i, v, x), B, C, i));
          });
          return this._consoleTask && (k._consoleTask = this._consoleTask), k;
        }
        return f.prototype = $r, f;
      }, set: function(i) {
        E(this, "then", i && i.prototype === $r ? as : { get: function() {
          return i;
        }, set: as.set });
      } };
      function Cc(i, a, f, d, p) {
        this.onFulfilled = typeof i == "function" ? i : null, this.onRejected = typeof a == "function" ? a : null, this.resolve = f, this.reject = d, this.psd = p;
      }
      function cs(i, a) {
        var f, d;
        No.push(a), i._state === null && (f = i._lib && rr(), a = ss(a), i._state = !1, i._value = a, d = i, Rn.some(function(p) {
          return p._value === d._value;
        }) || Rn.push(d), Oc(i), f && or());
      }
      function Oc(i) {
        var a = i._listeners;
        i._listeners = [];
        for (var f = 0, d = a.length; f < d; ++f) us(i, a[f]);
        var p = i._PSD;
        --p.ref || p.finalize(), $n === 0 && (++$n, Lr(function() {
          --$n == 0 && fs();
        }, []));
      }
      function us(i, a) {
        if (i._state !== null) {
          var f = i._state ? a.onFulfilled : a.onRejected;
          if (f === null) return (i._state ? a.resolve : a.reject)(i._value);
          ++a.psd.ref, ++$n, Lr(Ed, [f, i, a]);
        } else i._listeners.push(a);
      }
      function Ed(i, a, f) {
        try {
          var d, p = a._value;
          !a._state && No.length && (No = []), d = Ge && a._consoleTask ? a._consoleTask.run(function() {
            return i(p);
          }) : i(p), a._state || No.indexOf(p) !== -1 || (function(m) {
            for (var v = Rn.length; v; ) if (Rn[--v]._value === m._value) return Rn.splice(v, 1);
          })(a), f.resolve(d);
        } catch (m) {
          f.reject(m);
        } finally {
          --$n == 0 && fs(), --f.psd.ref || f.psd.finalize();
        }
      }
      function xd() {
        Pn(yn, function() {
          rr() && or();
        });
      }
      function rr() {
        var i = is;
        return _o = is = !1, i;
      }
      function or() {
        var i, a, f;
        do
          for (; 0 < Kr.length; ) for (i = Kr, Kr = [], f = i.length, a = 0; a < f; ++a) {
            var d = i[a];
            d[0].apply(null, d[1]);
          }
        while (0 < Kr.length);
        _o = is = !0;
      }
      function fs() {
        var i = Rn;
        Rn = [], i.forEach(function(d) {
          d._PSD.onunhandled.call(null, d._value, d);
        });
        for (var a = Uo.slice(0), f = a.length; f; ) a[--f]();
      }
      function Co(i) {
        return new ft($r, !1, i);
      }
      function Dt(i, a) {
        var f = ht;
        return function() {
          var d = rr(), p = ht;
          try {
            return bn(f, !0), i.apply(this, arguments);
          } catch (m) {
            a && a(m);
          } finally {
            bn(p, !1), d && or();
          }
        };
      }
      w(ft.prototype, { then: as, _then: function(i, a) {
        us(this, new Cc(null, null, i, a, ht));
      }, catch: function(i) {
        if (arguments.length === 1) return this.then(null, i);
        var a = i, f = arguments[1];
        return typeof a == "function" ? this.then(null, function(d) {
          return (d instanceof a ? f : Co)(d);
        }) : this.then(null, function(d) {
          return (d && d.name === a ? f : Co)(d);
        });
      }, finally: function(i) {
        return this.then(function(a) {
          return ft.resolve(i()).then(function() {
            return a;
          });
        }, function(a) {
          return ft.resolve(i()).then(function() {
            return Co(a);
          });
        });
      }, timeout: function(i, a) {
        var f = this;
        return i < 1 / 0 ? new ft(function(d, p) {
          var m = setTimeout(function() {
            return p(new ot.Timeout(a));
          }, i);
          f.then(d, p).finally(clearTimeout.bind(null, m));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && E(ft.prototype, Symbol.toStringTag, "Dexie.Promise"), yn.env = Rc(), w(ft, { all: function() {
        var i = Y.apply(null, arguments).map(Po);
        return new ft(function(a, f) {
          i.length === 0 && a([]);
          var d = i.length;
          i.forEach(function(p, m) {
            return ft.resolve(p).then(function(v) {
              i[m] = v, --d || a(i);
            }, f);
          });
        });
      }, resolve: function(i) {
        return i instanceof ft ? i : i && typeof i.then == "function" ? new ft(function(a, f) {
          i.then(a, f);
        }) : new ft($r, !0, i);
      }, reject: Co, race: function() {
        var i = Y.apply(null, arguments).map(Po);
        return new ft(function(a, f) {
          i.map(function(d) {
            return ft.resolve(d).then(a, f);
          });
        });
      }, PSD: { get: function() {
        return ht;
      }, set: function(i) {
        return ht = i;
      } }, totalEchoes: { get: function() {
        return $o;
      } }, newPSD: wn, usePSD: Pn, scheduler: { get: function() {
        return Lr;
      }, set: function(i) {
        Lr = i;
      } }, rejectionMapper: { get: function() {
        return ss;
      }, set: function(i) {
        ss = i;
      } }, follow: function(i, a) {
        return new ft(function(f, d) {
          return wn(function(p, m) {
            var v = ht;
            v.unhandleds = [], v.onunhandled = m, v.finalize = ve(function() {
              var x, k = this;
              x = function() {
                k.unhandleds.length === 0 ? p() : m(k.unhandleds[0]);
              }, Uo.push(function B() {
                x(), Uo.splice(Uo.indexOf(B), 1);
              }), ++$n, Lr(function() {
                --$n == 0 && fs();
              }, []);
            }, v.finalize), i();
          }, a, f, d);
        });
      } }), On && (On.allSettled && E(ft, "allSettled", function() {
        var i = Y.apply(null, arguments).map(Po);
        return new ft(function(a) {
          i.length === 0 && a([]);
          var f = i.length, d = new Array(f);
          i.forEach(function(p, m) {
            return ft.resolve(p).then(function(v) {
              return d[m] = { status: "fulfilled", value: v };
            }, function(v) {
              return d[m] = { status: "rejected", reason: v };
            }).then(function() {
              return --f || a(d);
            });
          });
        });
      }), On.any && typeof AggregateError < "u" && E(ft, "any", function() {
        var i = Y.apply(null, arguments).map(Po);
        return new ft(function(a, f) {
          i.length === 0 && f(new AggregateError([]));
          var d = i.length, p = new Array(d);
          i.forEach(function(m, v) {
            return ft.resolve(m).then(function(x) {
              return a(x);
            }, function(x) {
              p[v] = x, --d || f(new AggregateError(p));
            });
          });
        });
      }), On.withResolvers && (ft.withResolvers = On.withResolvers));
      var te = { awaits: 0, echoes: 0, id: 0 }, Sd = 0, Oo = [], Ro = 0, $o = 0, Td = 0;
      function wn(i, a, f, d) {
        var p = ht, m = Object.create(p);
        return m.parent = p, m.ref = 0, m.global = !1, m.id = ++Td, yn.env, m.env = os ? { Promise: ft, PromiseProp: { value: ft, configurable: !0, writable: !0 }, all: ft.all, race: ft.race, allSettled: ft.allSettled, any: ft.any, resolve: ft.resolve, reject: ft.reject } : {}, a && l(m, a), ++p.ref, m.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, d = Pn(m, i, f, d), m.ref === 0 && m.finalize(), d;
      }
      function ir() {
        return te.id || (te.id = ++Sd), ++te.awaits, te.echoes += Uc, te.id;
      }
      function mn() {
        return !!te.awaits && (--te.awaits == 0 && (te.id = 0), te.echoes = te.awaits * Uc, !0);
      }
      function Po(i) {
        return te.echoes && i && i.constructor === On ? (ir(), i.then(function(a) {
          return mn(), a;
        }, function(a) {
          return mn(), Ft(a);
        })) : i;
      }
      function kd() {
        var i = Oo[Oo.length - 1];
        Oo.pop(), bn(i, !1);
      }
      function bn(i, a) {
        var f, d = ht;
        (a ? !te.echoes || Ro++ && i === ht : !Ro || --Ro && i === ht) || queueMicrotask(a ? (function(p) {
          ++$o, te.echoes && --te.echoes != 0 || (te.echoes = te.awaits = te.id = 0), Oo.push(ht), bn(p, !0);
        }).bind(null, i) : kd), i !== ht && (ht = i, d === yn && (yn.env = Rc()), os && (f = yn.env.Promise, a = i.env, (d.global || i.global) && (Object.defineProperty(s, "Promise", a.PromiseProp), f.all = a.all, f.race = a.race, f.resolve = a.resolve, f.reject = a.reject, a.allSettled && (f.allSettled = a.allSettled), a.any && (f.any = a.any))));
      }
      function Rc() {
        var i = s.Promise;
        return os ? { Promise: i, PromiseProp: Object.getOwnPropertyDescriptor(s, "Promise"), all: i.all, race: i.race, allSettled: i.allSettled, any: i.any, resolve: i.resolve, reject: i.reject } : {};
      }
      function Pn(i, a, f, d, p) {
        var m = ht;
        try {
          return bn(i, !0), a(f, d, p);
        } finally {
          bn(m, !1);
        }
      }
      function $c(i, a, f, d) {
        return typeof i != "function" ? i : function() {
          var p = ht;
          f && ir(), bn(a, !0);
          try {
            return i.apply(this, arguments);
          } finally {
            bn(p, !1), d && queueMicrotask(mn);
          }
        };
      }
      function ls(i) {
        Promise === On && te.echoes === 0 ? Ro === 0 ? i() : enqueueNativeMicroTask(i) : setTimeout(i, 0);
      }
      ("" + Ue).indexOf("[native code]") === -1 && (ir = mn = At);
      var Ft = ft.reject, Ln = "￿", en = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Pc = "String expected.", sr = [], Lo = "__dbnames", ds = "readonly", hs = "readwrite";
      function Kn(i, a) {
        return i ? a ? function() {
          return i.apply(this, arguments) && a.apply(this, arguments);
        } : i : a;
      }
      var Lc = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function Ko(i) {
        return typeof i != "string" || /\./.test(i) ? function(a) {
          return a;
        } : function(a) {
          return a[i] === void 0 && i in a && delete (a = D(a))[i], a;
        };
      }
      function Kc() {
        throw ot.Type();
      }
      function _t(i, a) {
        try {
          var f = Dc(i), d = Dc(a);
          if (f !== d) return f === "Array" ? 1 : d === "Array" ? -1 : f === "binary" ? 1 : d === "binary" ? -1 : f === "string" ? 1 : d === "string" ? -1 : f === "Date" ? 1 : d !== "Date" ? NaN : -1;
          switch (f) {
            case "number":
            case "Date":
            case "string":
              return a < i ? 1 : i < a ? -1 : 0;
            case "binary":
              return (function(p, m) {
                for (var v = p.length, x = m.length, k = v < x ? v : x, B = 0; B < k; ++B) if (p[B] !== m[B]) return p[B] < m[B] ? -1 : 1;
                return v === x ? 0 : v < x ? -1 : 1;
              })(Mc(i), Mc(a));
            case "Array":
              return (function(p, m) {
                for (var v = p.length, x = m.length, k = v < x ? v : x, B = 0; B < k; ++B) {
                  var C = _t(p[B], m[B]);
                  if (C !== 0) return C;
                }
                return v === x ? 0 : v < x ? -1 : 1;
              })(i, a);
          }
        } catch {
        }
        return NaN;
      }
      function Dc(i) {
        var a = typeof i;
        return a != "object" ? a : ArrayBuffer.isView(i) ? "binary" : (i = N(i), i === "ArrayBuffer" ? "binary" : i);
      }
      function Mc(i) {
        return i instanceof Uint8Array ? i : ArrayBuffer.isView(i) ? new Uint8Array(i.buffer, i.byteOffset, i.byteLength) : new Uint8Array(i);
      }
      var Vc = (Pt.prototype._trans = function(i, a, f) {
        var d = this._tx || ht.trans, p = this.name, m = Ge && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(i === "readonly" ? "read" : "write", " ").concat(this.name));
        function v(B, C, S) {
          if (!S.schema[p]) throw new ot.NotFound("Table " + p + " not part of transaction");
          return a(S.idbtrans, S);
        }
        var x = rr();
        try {
          var k = d && d.db._novip === this.db._novip ? d === ht.trans ? d._promise(i, v, f) : wn(function() {
            return d._promise(i, v, f);
          }, { trans: d, transless: ht.transless || ht }) : (function B(C, S, R, I) {
            if (C.idbdb && (C._state.openComplete || ht.letThrough || C._vip)) {
              var U = C._createTransaction(S, R, C._dbSchema);
              try {
                U.create(), C._state.PR1398_maxLoop = 3;
              } catch (O) {
                return O.name === Nt.InvalidState && C.isOpen() && 0 < --C._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), C.close({ disableAutoOpen: !1 }), C.open().then(function() {
                  return B(C, S, R, I);
                })) : Ft(O);
              }
              return U._promise(S, function(O, _) {
                return wn(function() {
                  return ht.trans = U, I(O, _, U);
                });
              }).then(function(O) {
                if (S === "readwrite") try {
                  U.idbtrans.commit();
                } catch {
                }
                return S === "readonly" ? O : U._completion.then(function() {
                  return O;
                });
              });
            }
            if (C._state.openComplete) return Ft(new ot.DatabaseClosed(C._state.dbOpenError));
            if (!C._state.isBeingOpened) {
              if (!C._state.autoOpen) return Ft(new ot.DatabaseClosed());
              C.open().catch(At);
            }
            return C._state.dbReadyPromise.then(function() {
              return B(C, S, R, I);
            });
          })(this.db, i, [this.name], v);
          return m && (k._consoleTask = m, k = k.catch(function(B) {
            return console.trace(B), Ft(B);
          })), k;
        } finally {
          x && or();
        }
      }, Pt.prototype.get = function(i, a) {
        var f = this;
        return i && i.constructor === Object ? this.where(i).first(a) : i == null ? Ft(new ot.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(d) {
          return f.core.get({ trans: d, key: i }).then(function(p) {
            return f.hook.reading.fire(p);
          });
        }).then(a);
      }, Pt.prototype.where = function(i) {
        if (typeof i == "string") return new this.db.WhereClause(this, i);
        if (u(i)) return new this.db.WhereClause(this, "[".concat(i.join("+"), "]"));
        var a = c(i);
        if (a.length === 1) return this.where(a[0]).equals(i[a[0]]);
        var f = this.schema.indexes.concat(this.schema.primKey).filter(function(x) {
          if (x.compound && a.every(function(B) {
            return 0 <= x.keyPath.indexOf(B);
          })) {
            for (var k = 0; k < a.length; ++k) if (a.indexOf(x.keyPath[k]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(x, k) {
          return x.keyPath.length - k.keyPath.length;
        })[0];
        if (f && this.db._maxKey !== Ln) {
          var m = f.keyPath.slice(0, a.length);
          return this.where(m).equals(m.map(function(k) {
            return i[k];
          }));
        }
        !f && Ge && console.warn("The query ".concat(JSON.stringify(i), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(a.join("+"), "]"));
        var d = this.schema.idxByName;
        function p(x, k) {
          return _t(x, k) === 0;
        }
        var v = a.reduce(function(S, k) {
          var B = S[0], C = S[1], S = d[k], R = i[k];
          return [B || S, B || !S ? Kn(C, S && S.multi ? function(I) {
            return I = st(I, k), u(I) && I.some(function(U) {
              return p(R, U);
            });
          } : function(I) {
            return p(R, st(I, k));
          }) : C];
        }, [null, null]), m = v[0], v = v[1];
        return m ? this.where(m.name).equals(i[m.keyPath]).filter(v) : f ? this.filter(v) : this.where(a).equals("");
      }, Pt.prototype.filter = function(i) {
        return this.toCollection().and(i);
      }, Pt.prototype.count = function(i) {
        return this.toCollection().count(i);
      }, Pt.prototype.offset = function(i) {
        return this.toCollection().offset(i);
      }, Pt.prototype.limit = function(i) {
        return this.toCollection().limit(i);
      }, Pt.prototype.each = function(i) {
        return this.toCollection().each(i);
      }, Pt.prototype.toArray = function(i) {
        return this.toCollection().toArray(i);
      }, Pt.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, Pt.prototype.orderBy = function(i) {
        return new this.db.Collection(new this.db.WhereClause(this, u(i) ? "[".concat(i.join("+"), "]") : i));
      }, Pt.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, Pt.prototype.mapToClass = function(i) {
        var a, f = this.db, d = this.name;
        function p() {
          return a !== null && a.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = i).prototype instanceof Kc && ((function(k, B) {
          if (typeof B != "function" && B !== null) throw new TypeError("Class extends value " + String(B) + " is not a constructor or null");
          function C() {
            this.constructor = k;
          }
          n(k, B), k.prototype = B === null ? Object.create(B) : (C.prototype = B.prototype, new C());
        })(p, a = i), Object.defineProperty(p.prototype, "db", { get: function() {
          return f;
        }, enumerable: !1, configurable: !0 }), p.prototype.table = function() {
          return d;
        }, i = p);
        for (var m = /* @__PURE__ */ new Set(), v = i.prototype; v; v = h(v)) Object.getOwnPropertyNames(v).forEach(function(k) {
          return m.add(k);
        });
        function x(k) {
          if (!k) return k;
          var B, C = Object.create(i.prototype);
          for (B in k) if (!m.has(B)) try {
            C[B] = k[B];
          } catch {
          }
          return C;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = x, this.hook("reading", x), i;
      }, Pt.prototype.defineClass = function() {
        return this.mapToClass(function(i) {
          l(this, i);
        });
      }, Pt.prototype.add = function(i, a) {
        var f = this, d = this.schema.primKey, p = d.auto, m = d.keyPath, v = i;
        return m && p && (v = Ko(m)(i)), this._trans("readwrite", function(x) {
          return f.core.mutate({ trans: x, type: "add", keys: a != null ? [a] : null, values: [v] });
        }).then(function(x) {
          return x.numFailures ? ft.reject(x.failures[0]) : x.lastResult;
        }).then(function(x) {
          if (m) try {
            A(i, m, x);
          } catch {
          }
          return x;
        });
      }, Pt.prototype.update = function(i, a) {
        return typeof i != "object" || u(i) ? this.where(":id").equals(i).modify(a) : (i = st(i, this.schema.primKey.keyPath), i === void 0 ? Ft(new ot.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(i).modify(a));
      }, Pt.prototype.put = function(i, a) {
        var f = this, d = this.schema.primKey, p = d.auto, m = d.keyPath, v = i;
        return m && p && (v = Ko(m)(i)), this._trans("readwrite", function(x) {
          return f.core.mutate({ trans: x, type: "put", values: [v], keys: a != null ? [a] : null });
        }).then(function(x) {
          return x.numFailures ? ft.reject(x.failures[0]) : x.lastResult;
        }).then(function(x) {
          if (m) try {
            A(i, m, x);
          } catch {
          }
          return x;
        });
      }, Pt.prototype.delete = function(i) {
        var a = this;
        return this._trans("readwrite", function(f) {
          return a.core.mutate({ trans: f, type: "delete", keys: [i] });
        }).then(function(f) {
          return f.numFailures ? ft.reject(f.failures[0]) : void 0;
        });
      }, Pt.prototype.clear = function() {
        var i = this;
        return this._trans("readwrite", function(a) {
          return i.core.mutate({ trans: a, type: "deleteRange", range: Lc });
        }).then(function(a) {
          return a.numFailures ? ft.reject(a.failures[0]) : void 0;
        });
      }, Pt.prototype.bulkGet = function(i) {
        var a = this;
        return this._trans("readonly", function(f) {
          return a.core.getMany({ keys: i, trans: f }).then(function(d) {
            return d.map(function(p) {
              return a.hook.reading.fire(p);
            });
          });
        });
      }, Pt.prototype.bulkAdd = function(i, a, f) {
        var d = this, p = Array.isArray(a) ? a : void 0, m = (f = f || (p ? void 0 : a)) ? f.allKeys : void 0;
        return this._trans("readwrite", function(v) {
          var B = d.schema.primKey, x = B.auto, B = B.keyPath;
          if (B && p) throw new ot.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (p && p.length !== i.length) throw new ot.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, B = B && x ? i.map(Ko(B)) : i;
          return d.core.mutate({ trans: v, type: "add", keys: p, values: B, wantResults: m }).then(function(U) {
            var S = U.numFailures, R = U.results, I = U.lastResult, U = U.failures;
            if (S === 0) return m ? R : I;
            throw new Bt("".concat(d.name, ".bulkAdd(): ").concat(S, " of ").concat(k, " operations failed"), U);
          });
        });
      }, Pt.prototype.bulkPut = function(i, a, f) {
        var d = this, p = Array.isArray(a) ? a : void 0, m = (f = f || (p ? void 0 : a)) ? f.allKeys : void 0;
        return this._trans("readwrite", function(v) {
          var B = d.schema.primKey, x = B.auto, B = B.keyPath;
          if (B && p) throw new ot.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (p && p.length !== i.length) throw new ot.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, B = B && x ? i.map(Ko(B)) : i;
          return d.core.mutate({ trans: v, type: "put", keys: p, values: B, wantResults: m }).then(function(U) {
            var S = U.numFailures, R = U.results, I = U.lastResult, U = U.failures;
            if (S === 0) return m ? R : I;
            throw new Bt("".concat(d.name, ".bulkPut(): ").concat(S, " of ").concat(k, " operations failed"), U);
          });
        });
      }, Pt.prototype.bulkUpdate = function(i) {
        var a = this, f = this.core, d = i.map(function(v) {
          return v.key;
        }), p = i.map(function(v) {
          return v.changes;
        }), m = [];
        return this._trans("readwrite", function(v) {
          return f.getMany({ trans: v, keys: d, cache: "clone" }).then(function(x) {
            var k = [], B = [];
            i.forEach(function(S, R) {
              var I = S.key, U = S.changes, O = x[R];
              if (O) {
                for (var _ = 0, $ = Object.keys(U); _ < $.length; _++) {
                  var K = $[_], M = U[K];
                  if (K === a.schema.primKey.keyPath) {
                    if (_t(M, I) !== 0) throw new ot.Constraint("Cannot update primary key in bulkUpdate()");
                  } else A(O, K, M);
                }
                m.push(R), k.push(I), B.push(O);
              }
            });
            var C = k.length;
            return f.mutate({ trans: v, type: "put", keys: k, values: B, updates: { keys: d, changeSpecs: p } }).then(function(S) {
              var R = S.numFailures, I = S.failures;
              if (R === 0) return C;
              for (var U = 0, O = Object.keys(I); U < O.length; U++) {
                var _, $ = O[U], K = m[Number($)];
                K != null && (_ = I[$], delete I[$], I[K] = _);
              }
              throw new Bt("".concat(a.name, ".bulkUpdate(): ").concat(R, " of ").concat(C, " operations failed"), I);
            });
          });
        });
      }, Pt.prototype.bulkDelete = function(i) {
        var a = this, f = i.length;
        return this._trans("readwrite", function(d) {
          return a.core.mutate({ trans: d, type: "delete", keys: i });
        }).then(function(v) {
          var p = v.numFailures, m = v.lastResult, v = v.failures;
          if (p === 0) return m;
          throw new Bt("".concat(a.name, ".bulkDelete(): ").concat(p, " of ").concat(f, " operations failed"), v);
        });
      }, Pt);
      function Pt() {
      }
      function Dr(i) {
        function a(v, x) {
          if (x) {
            for (var k = arguments.length, B = new Array(k - 1); --k; ) B[k - 1] = arguments[k];
            return f[v].subscribe.apply(null, B), i;
          }
          if (typeof v == "string") return f[v];
        }
        var f = {};
        a.addEventType = m;
        for (var d = 1, p = arguments.length; d < p; ++d) m(arguments[d]);
        return a;
        function m(v, x, k) {
          if (typeof v != "object") {
            var B;
            x = x || vd;
            var C = { subscribers: [], fire: k = k || At, subscribe: function(S) {
              C.subscribers.indexOf(S) === -1 && (C.subscribers.push(S), C.fire = x(C.fire, S));
            }, unsubscribe: function(S) {
              C.subscribers = C.subscribers.filter(function(R) {
                return R !== S;
              }), C.fire = C.subscribers.reduce(x, k);
            } };
            return f[v] = a[v] = C;
          }
          c(B = v).forEach(function(S) {
            var R = B[S];
            if (u(R)) m(S, B[S][0], B[S][1]);
            else {
              if (R !== "asap") throw new ot.InvalidArgument("Invalid event config");
              var I = m(S, ue, function() {
                for (var U = arguments.length, O = new Array(U); U--; ) O[U] = arguments[U];
                I.subscribers.forEach(function(_) {
                  V(function() {
                    _.apply(null, O);
                  });
                });
              });
            }
          });
        }
      }
      function Mr(i, a) {
        return T(a).from({ prototype: i }), a;
      }
      function ar(i, a) {
        return !(i.filter || i.algorithm || i.or) && (a ? i.justLimit : !i.replayFilter);
      }
      function ps(i, a) {
        i.filter = Kn(i.filter, a);
      }
      function gs(i, a, f) {
        var d = i.replayFilter;
        i.replayFilter = d ? function() {
          return Kn(d(), a());
        } : a, i.justLimit = f && !d;
      }
      function Do(i, a) {
        if (i.isPrimKey) return a.primaryKey;
        var f = a.getIndexByKeyPath(i.index);
        if (!f) throw new ot.Schema("KeyPath " + i.index + " on object store " + a.name + " is not indexed");
        return f;
      }
      function Hc(i, a, f) {
        var d = Do(i, a.schema);
        return a.openCursor({ trans: f, values: !i.keysOnly, reverse: i.dir === "prev", unique: !!i.unique, query: { index: d, range: i.range } });
      }
      function Mo(i, a, f, d) {
        var p = i.replayFilter ? Kn(i.filter, i.replayFilter()) : i.filter;
        if (i.or) {
          var m = {}, v = function(x, k, B) {
            var C, S;
            p && !p(k, B, function(R) {
              return k.stop(R);
            }, function(R) {
              return k.fail(R);
            }) || ((S = "" + (C = k.primaryKey)) == "[object ArrayBuffer]" && (S = "" + new Uint8Array(C)), y(m, S) || (m[S] = !0, a(x, k, B)));
          };
          return Promise.all([i.or._iterate(v, f), Fc(Hc(i, d, f), i.algorithm, v, !i.keysOnly && i.valueMapper)]);
        }
        return Fc(Hc(i, d, f), Kn(i.algorithm, p), a, !i.keysOnly && i.valueMapper);
      }
      function Fc(i, a, f, d) {
        var p = Dt(d ? function(m, v, x) {
          return f(d(m), v, x);
        } : f);
        return i.then(function(m) {
          if (m) return m.start(function() {
            var v = function() {
              return m.continue();
            };
            a && !a(m, function(x) {
              return v = x;
            }, function(x) {
              m.stop(x), v = At;
            }, function(x) {
              m.fail(x), v = At;
            }) || p(m.value, m, function(x) {
              return v = x;
            }), v();
          });
        });
      }
      var Vr = (jc.prototype.execute = function(i) {
        var a = this["@@propmod"];
        if (a.add !== void 0) {
          var f = a.add;
          if (u(f)) return o(o([], u(i) ? i : [], !0), f).sort();
          if (typeof f == "number") return (Number(i) || 0) + f;
          if (typeof f == "bigint") try {
            return BigInt(i) + f;
          } catch {
            return BigInt(0) + f;
          }
          throw new TypeError("Invalid term ".concat(f));
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
        return f = (f = a.replacePrefix) === null || f === void 0 ? void 0 : f[0], f && typeof i == "string" && i.startsWith(f) ? a.replacePrefix[1] + i.substring(f.length) : i;
      }, jc);
      function jc(i) {
        this["@@propmod"] = i;
      }
      var Ad = (Ut.prototype._read = function(i, a) {
        var f = this._ctx;
        return f.error ? f.table._trans(null, Ft.bind(null, f.error)) : f.table._trans("readonly", i).then(a);
      }, Ut.prototype._write = function(i) {
        var a = this._ctx;
        return a.error ? a.table._trans(null, Ft.bind(null, a.error)) : a.table._trans("readwrite", i, "locked");
      }, Ut.prototype._addAlgorithm = function(i) {
        var a = this._ctx;
        a.algorithm = Kn(a.algorithm, i);
      }, Ut.prototype._iterate = function(i, a) {
        return Mo(this._ctx, i, a, this._ctx.table.core);
      }, Ut.prototype.clone = function(i) {
        var a = Object.create(this.constructor.prototype), f = Object.create(this._ctx);
        return i && l(f, i), a._ctx = f, a;
      }, Ut.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, Ut.prototype.each = function(i) {
        var a = this._ctx;
        return this._read(function(f) {
          return Mo(a, i, f, a.table.core);
        });
      }, Ut.prototype.count = function(i) {
        var a = this;
        return this._read(function(f) {
          var d = a._ctx, p = d.table.core;
          if (ar(d, !0)) return p.count({ trans: f, query: { index: Do(d, p.schema), range: d.range } }).then(function(v) {
            return Math.min(v, d.limit);
          });
          var m = 0;
          return Mo(d, function() {
            return ++m, !1;
          }, f, p).then(function() {
            return m;
          });
        }).then(i);
      }, Ut.prototype.sortBy = function(i, a) {
        var f = i.split(".").reverse(), d = f[0], p = f.length - 1;
        function m(k, B) {
          return B ? m(k[f[B]], B - 1) : k[d];
        }
        var v = this._ctx.dir === "next" ? 1 : -1;
        function x(k, B) {
          return _t(m(k, p), m(B, p)) * v;
        }
        return this.toArray(function(k) {
          return k.sort(x);
        }).then(a);
      }, Ut.prototype.toArray = function(i) {
        var a = this;
        return this._read(function(f) {
          var d = a._ctx;
          if (d.dir === "next" && ar(d, !0) && 0 < d.limit) {
            var p = d.valueMapper, m = Do(d, d.table.core.schema);
            return d.table.core.query({ trans: f, limit: d.limit, values: !0, query: { index: m, range: d.range } }).then(function(x) {
              return x = x.result, p ? x.map(p) : x;
            });
          }
          var v = [];
          return Mo(d, function(x) {
            return v.push(x);
          }, f, d.table.core).then(function() {
            return v;
          });
        }, i);
      }, Ut.prototype.offset = function(i) {
        var a = this._ctx;
        return i <= 0 || (a.offset += i, ar(a) ? gs(a, function() {
          var f = i;
          return function(d, p) {
            return f === 0 || (f === 1 ? --f : p(function() {
              d.advance(f), f = 0;
            }), !1);
          };
        }) : gs(a, function() {
          var f = i;
          return function() {
            return --f < 0;
          };
        })), this;
      }, Ut.prototype.limit = function(i) {
        return this._ctx.limit = Math.min(this._ctx.limit, i), gs(this._ctx, function() {
          var a = i;
          return function(f, d, p) {
            return --a <= 0 && d(p), 0 <= a;
          };
        }, !0), this;
      }, Ut.prototype.until = function(i, a) {
        return ps(this._ctx, function(f, d, p) {
          return !i(f.value) || (d(p), a);
        }), this;
      }, Ut.prototype.first = function(i) {
        return this.limit(1).toArray(function(a) {
          return a[0];
        }).then(i);
      }, Ut.prototype.last = function(i) {
        return this.reverse().first(i);
      }, Ut.prototype.filter = function(i) {
        var a;
        return ps(this._ctx, function(f) {
          return i(f.value);
        }), (a = this._ctx).isMatch = Kn(a.isMatch, i), this;
      }, Ut.prototype.and = function(i) {
        return this.filter(i);
      }, Ut.prototype.or = function(i) {
        return new this.db.WhereClause(this._ctx.table, i, this);
      }, Ut.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, Ut.prototype.desc = function() {
        return this.reverse();
      }, Ut.prototype.eachKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(f, d) {
          i(d.key, d);
        });
      }, Ut.prototype.eachUniqueKey = function(i) {
        return this._ctx.unique = "unique", this.eachKey(i);
      }, Ut.prototype.eachPrimaryKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(f, d) {
          i(d.primaryKey, d);
        });
      }, Ut.prototype.keys = function(i) {
        var a = this._ctx;
        a.keysOnly = !a.isMatch;
        var f = [];
        return this.each(function(d, p) {
          f.push(p.key);
        }).then(function() {
          return f;
        }).then(i);
      }, Ut.prototype.primaryKeys = function(i) {
        var a = this._ctx;
        if (a.dir === "next" && ar(a, !0) && 0 < a.limit) return this._read(function(d) {
          var p = Do(a, a.table.core.schema);
          return a.table.core.query({ trans: d, values: !1, limit: a.limit, query: { index: p, range: a.range } });
        }).then(function(d) {
          return d.result;
        }).then(i);
        a.keysOnly = !a.isMatch;
        var f = [];
        return this.each(function(d, p) {
          f.push(p.primaryKey);
        }).then(function() {
          return f;
        }).then(i);
      }, Ut.prototype.uniqueKeys = function(i) {
        return this._ctx.unique = "unique", this.keys(i);
      }, Ut.prototype.firstKey = function(i) {
        return this.limit(1).keys(function(a) {
          return a[0];
        }).then(i);
      }, Ut.prototype.lastKey = function(i) {
        return this.reverse().firstKey(i);
      }, Ut.prototype.distinct = function() {
        var i = this._ctx, i = i.index && i.table.schema.idxByName[i.index];
        if (!i || !i.multi) return this;
        var a = {};
        return ps(this._ctx, function(p) {
          var d = p.primaryKey.toString(), p = y(a, d);
          return a[d] = !0, !p;
        }), this;
      }, Ut.prototype.modify = function(i) {
        var a = this, f = this._ctx;
        return this._write(function(d) {
          var p, m, v;
          v = typeof i == "function" ? i : (p = c(i), m = p.length, function(_) {
            for (var $ = !1, K = 0; K < m; ++K) {
              var M = p[K], j = i[M], tt = st(_, M);
              j instanceof Vr ? (A(_, M, j.execute(tt)), $ = !0) : tt !== j && (A(_, M, j), $ = !0);
            }
            return $;
          });
          var x = f.table.core, S = x.schema.primaryKey, k = S.outbound, B = S.extractKey, C = 200, S = a.db._options.modifyChunkSize;
          S && (C = typeof S == "object" ? S[x.name] || S["*"] || 200 : S);
          function R(_, M) {
            var K = M.failures, M = M.numFailures;
            U += _ - M;
            for (var j = 0, tt = c(K); j < tt.length; j++) {
              var at = tt[j];
              I.push(K[at]);
            }
          }
          var I = [], U = 0, O = [];
          return a.clone().primaryKeys().then(function(_) {
            function $(M) {
              var j = Math.min(C, _.length - M);
              return x.getMany({ trans: d, keys: _.slice(M, M + j), cache: "immutable" }).then(function(tt) {
                for (var at = [], et = [], nt = k ? [] : null, ct = [], it = 0; it < j; ++it) {
                  var dt = tt[it], vt = { value: D(dt), primKey: _[M + it] };
                  v.call(vt, vt.value, vt) !== !1 && (vt.value == null ? ct.push(_[M + it]) : k || _t(B(dt), B(vt.value)) === 0 ? (et.push(vt.value), k && nt.push(_[M + it])) : (ct.push(_[M + it]), at.push(vt.value)));
                }
                return Promise.resolve(0 < at.length && x.mutate({ trans: d, type: "add", values: at }).then(function(Tt) {
                  for (var kt in Tt.failures) ct.splice(parseInt(kt), 1);
                  R(at.length, Tt);
                })).then(function() {
                  return (0 < et.length || K && typeof i == "object") && x.mutate({ trans: d, type: "put", keys: nt, values: et, criteria: K, changeSpec: typeof i != "function" && i, isAdditionalChunk: 0 < M }).then(function(Tt) {
                    return R(et.length, Tt);
                  });
                }).then(function() {
                  return (0 < ct.length || K && i === ys) && x.mutate({ trans: d, type: "delete", keys: ct, criteria: K, isAdditionalChunk: 0 < M }).then(function(Tt) {
                    return R(ct.length, Tt);
                  });
                }).then(function() {
                  return _.length > M + j && $(M + C);
                });
              });
            }
            var K = ar(f) && f.limit === 1 / 0 && (typeof i != "function" || i === ys) && { index: f.index, range: f.range };
            return $(0).then(function() {
              if (0 < I.length) throw new wt("Error modifying one or more objects", I, U, O);
              return _.length;
            });
          });
        });
      }, Ut.prototype.delete = function() {
        var i = this._ctx, a = i.range;
        return ar(i) && (i.isPrimKey || a.type === 3) ? this._write(function(f) {
          var d = i.table.core.schema.primaryKey, p = a;
          return i.table.core.count({ trans: f, query: { index: d, range: p } }).then(function(m) {
            return i.table.core.mutate({ trans: f, type: "deleteRange", range: p }).then(function(v) {
              var x = v.failures;
              if (v.lastResult, v.results, v = v.numFailures, v) throw new wt("Could not delete some values", Object.keys(x).map(function(k) {
                return x[k];
              }), m - v);
              return m - v;
            });
          });
        }) : this.modify(ys);
      }, Ut);
      function Ut() {
      }
      var ys = function(i, a) {
        return a.value = null;
      };
      function Id(i, a) {
        return i < a ? -1 : i === a ? 0 : 1;
      }
      function Bd(i, a) {
        return a < i ? -1 : i === a ? 0 : 1;
      }
      function Be(i, a, f) {
        return i = i instanceof zc ? new i.Collection(i) : i, i._ctx.error = new (f || TypeError)(a), i;
      }
      function cr(i) {
        return new i.Collection(i, function() {
          return qc("");
        }).limit(0);
      }
      function Vo(i, a, f, d) {
        var p, m, v, x, k, B, C, S = f.length;
        if (!f.every(function(U) {
          return typeof U == "string";
        })) return Be(i, Pc);
        function R(U) {
          p = U === "next" ? function(_) {
            return _.toUpperCase();
          } : function(_) {
            return _.toLowerCase();
          }, m = U === "next" ? function(_) {
            return _.toLowerCase();
          } : function(_) {
            return _.toUpperCase();
          }, v = U === "next" ? Id : Bd;
          var O = f.map(function(_) {
            return { lower: m(_), upper: p(_) };
          }).sort(function(_, $) {
            return v(_.lower, $.lower);
          });
          x = O.map(function(_) {
            return _.upper;
          }), k = O.map(function(_) {
            return _.lower;
          }), C = (B = U) === "next" ? "" : d;
        }
        R("next"), i = new i.Collection(i, function() {
          return vn(x[0], k[S - 1] + d);
        }), i._ondirectionchange = function(U) {
          R(U);
        };
        var I = 0;
        return i._addAlgorithm(function(U, O, _) {
          var $ = U.key;
          if (typeof $ != "string") return !1;
          var K = m($);
          if (a(K, k, I)) return !0;
          for (var M = null, j = I; j < S; ++j) {
            var tt = (function(at, et, nt, ct, it, dt) {
              for (var vt = Math.min(at.length, ct.length), Tt = -1, kt = 0; kt < vt; ++kt) {
                var _e = et[kt];
                if (_e !== ct[kt]) return it(at[kt], nt[kt]) < 0 ? at.substr(0, kt) + nt[kt] + nt.substr(kt + 1) : it(at[kt], ct[kt]) < 0 ? at.substr(0, kt) + ct[kt] + nt.substr(kt + 1) : 0 <= Tt ? at.substr(0, Tt) + et[Tt] + nt.substr(Tt + 1) : null;
                it(at[kt], _e) < 0 && (Tt = kt);
              }
              return vt < ct.length && dt === "next" ? at + nt.substr(at.length) : vt < at.length && dt === "prev" ? at.substr(0, nt.length) : Tt < 0 ? null : at.substr(0, Tt) + ct[Tt] + nt.substr(Tt + 1);
            })($, K, x[j], k[j], v, B);
            tt === null && M === null ? I = j + 1 : (M === null || 0 < v(M, tt)) && (M = tt);
          }
          return O(M !== null ? function() {
            U.continue(M + C);
          } : _), !1;
        }), i;
      }
      function vn(i, a, f, d) {
        return { type: 2, lower: i, upper: a, lowerOpen: f, upperOpen: d };
      }
      function qc(i) {
        return { type: 1, lower: i, upper: i };
      }
      var zc = (Object.defineProperty(ee.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), ee.prototype.between = function(i, a, f, d) {
        f = f !== !1, d = d === !0;
        try {
          return 0 < this._cmp(i, a) || this._cmp(i, a) === 0 && (f || d) && (!f || !d) ? cr(this) : new this.Collection(this, function() {
            return vn(i, a, !f, !d);
          });
        } catch {
          return Be(this, en);
        }
      }, ee.prototype.equals = function(i) {
        return i == null ? Be(this, en) : new this.Collection(this, function() {
          return qc(i);
        });
      }, ee.prototype.above = function(i) {
        return i == null ? Be(this, en) : new this.Collection(this, function() {
          return vn(i, void 0, !0);
        });
      }, ee.prototype.aboveOrEqual = function(i) {
        return i == null ? Be(this, en) : new this.Collection(this, function() {
          return vn(i, void 0, !1);
        });
      }, ee.prototype.below = function(i) {
        return i == null ? Be(this, en) : new this.Collection(this, function() {
          return vn(void 0, i, !1, !0);
        });
      }, ee.prototype.belowOrEqual = function(i) {
        return i == null ? Be(this, en) : new this.Collection(this, function() {
          return vn(void 0, i);
        });
      }, ee.prototype.startsWith = function(i) {
        return typeof i != "string" ? Be(this, Pc) : this.between(i, i + Ln, !0, !0);
      }, ee.prototype.startsWithIgnoreCase = function(i) {
        return i === "" ? this.startsWith(i) : Vo(this, function(a, f) {
          return a.indexOf(f[0]) === 0;
        }, [i], Ln);
      }, ee.prototype.equalsIgnoreCase = function(i) {
        return Vo(this, function(a, f) {
          return a === f[0];
        }, [i], "");
      }, ee.prototype.anyOfIgnoreCase = function() {
        var i = Y.apply(X, arguments);
        return i.length === 0 ? cr(this) : Vo(this, function(a, f) {
          return f.indexOf(a) !== -1;
        }, i, "");
      }, ee.prototype.startsWithAnyOfIgnoreCase = function() {
        var i = Y.apply(X, arguments);
        return i.length === 0 ? cr(this) : Vo(this, function(a, f) {
          return f.some(function(d) {
            return a.indexOf(d) === 0;
          });
        }, i, Ln);
      }, ee.prototype.anyOf = function() {
        var i = this, a = Y.apply(X, arguments), f = this._cmp;
        try {
          a.sort(f);
        } catch {
          return Be(this, en);
        }
        if (a.length === 0) return cr(this);
        var d = new this.Collection(this, function() {
          return vn(a[0], a[a.length - 1]);
        });
        d._ondirectionchange = function(m) {
          f = m === "next" ? i._ascending : i._descending, a.sort(f);
        };
        var p = 0;
        return d._addAlgorithm(function(m, v, x) {
          for (var k = m.key; 0 < f(k, a[p]); ) if (++p === a.length) return v(x), !1;
          return f(k, a[p]) === 0 || (v(function() {
            m.continue(a[p]);
          }), !1);
        }), d;
      }, ee.prototype.notEqual = function(i) {
        return this.inAnyRange([[-1 / 0, i], [i, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, ee.prototype.noneOf = function() {
        var i = Y.apply(X, arguments);
        if (i.length === 0) return new this.Collection(this);
        try {
          i.sort(this._ascending);
        } catch {
          return Be(this, en);
        }
        var a = i.reduce(function(f, d) {
          return f ? f.concat([[f[f.length - 1][1], d]]) : [[-1 / 0, d]];
        }, null);
        return a.push([i[i.length - 1], this.db._maxKey]), this.inAnyRange(a, { includeLowers: !1, includeUppers: !1 });
      }, ee.prototype.inAnyRange = function($, a) {
        var f = this, d = this._cmp, p = this._ascending, m = this._descending, v = this._min, x = this._max;
        if ($.length === 0) return cr(this);
        if (!$.every(function(K) {
          return K[0] !== void 0 && K[1] !== void 0 && p(K[0], K[1]) <= 0;
        })) return Be(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", ot.InvalidArgument);
        var k = !a || a.includeLowers !== !1, B = a && a.includeUppers === !0, C, S = p;
        function R(K, M) {
          return S(K[0], M[0]);
        }
        try {
          (C = $.reduce(function(K, M) {
            for (var j = 0, tt = K.length; j < tt; ++j) {
              var at = K[j];
              if (d(M[0], at[1]) < 0 && 0 < d(M[1], at[0])) {
                at[0] = v(at[0], M[0]), at[1] = x(at[1], M[1]);
                break;
              }
            }
            return j === tt && K.push(M), K;
          }, [])).sort(R);
        } catch {
          return Be(this, en);
        }
        var I = 0, U = B ? function(K) {
          return 0 < p(K, C[I][1]);
        } : function(K) {
          return 0 <= p(K, C[I][1]);
        }, O = k ? function(K) {
          return 0 < m(K, C[I][0]);
        } : function(K) {
          return 0 <= m(K, C[I][0]);
        }, _ = U, $ = new this.Collection(this, function() {
          return vn(C[0][0], C[C.length - 1][1], !k, !B);
        });
        return $._ondirectionchange = function(K) {
          S = K === "next" ? (_ = U, p) : (_ = O, m), C.sort(R);
        }, $._addAlgorithm(function(K, M, j) {
          for (var tt, at = K.key; _(at); ) if (++I === C.length) return M(j), !1;
          return !U(tt = at) && !O(tt) || (f._cmp(at, C[I][1]) === 0 || f._cmp(at, C[I][0]) === 0 || M(function() {
            S === p ? K.continue(C[I][0]) : K.continue(C[I][1]);
          }), !1);
        }), $;
      }, ee.prototype.startsWithAnyOf = function() {
        var i = Y.apply(X, arguments);
        return i.every(function(a) {
          return typeof a == "string";
        }) ? i.length === 0 ? cr(this) : this.inAnyRange(i.map(function(a) {
          return [a, a + Ln];
        })) : Be(this, "startsWithAnyOf() only works with strings");
      }, ee);
      function ee() {
      }
      function We(i) {
        return Dt(function(a) {
          return Hr(a), i(a.target.error), !1;
        });
      }
      function Hr(i) {
        i.stopPropagation && i.stopPropagation(), i.preventDefault && i.preventDefault();
      }
      var Fr = "storagemutated", ws = "x-storagemutated-1", En = Dr(null, Fr), _d = (Ye.prototype._lock = function() {
        return H(!ht.global), ++this._reculock, this._reculock !== 1 || ht.global || (ht.lockOwnerFor = this), this;
      }, Ye.prototype._unlock = function() {
        if (H(!ht.global), --this._reculock == 0) for (ht.global || (ht.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var i = this._blockedFuncs.shift();
          try {
            Pn(i[1], i[0]);
          } catch {
          }
        }
        return this;
      }, Ye.prototype._locked = function() {
        return this._reculock && ht.lockOwnerFor !== this;
      }, Ye.prototype.create = function(i) {
        var a = this;
        if (!this.mode) return this;
        var f = this.db.idbdb, d = this.db._state.dbOpenError;
        if (H(!this.idbtrans), !i && !f) switch (d && d.name) {
          case "DatabaseClosedError":
            throw new ot.DatabaseClosed(d);
          case "MissingAPIError":
            throw new ot.MissingAPI(d.message, d);
          default:
            throw new ot.OpenFailed(d);
        }
        if (!this.active) throw new ot.TransactionInactive();
        return H(this._completion._state === null), (i = this.idbtrans = i || (this.db.core || f).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Dt(function(p) {
          Hr(p), a._reject(i.error);
        }), i.onabort = Dt(function(p) {
          Hr(p), a.active && a._reject(new ot.Abort(i.error)), a.active = !1, a.on("abort").fire(p);
        }), i.oncomplete = Dt(function() {
          a.active = !1, a._resolve(), "mutatedParts" in i && En.storagemutated.fire(i.mutatedParts);
        }), this;
      }, Ye.prototype._promise = function(i, a, f) {
        var d = this;
        if (i === "readwrite" && this.mode !== "readwrite") return Ft(new ot.ReadOnly("Transaction is readonly"));
        if (!this.active) return Ft(new ot.TransactionInactive());
        if (this._locked()) return new ft(function(m, v) {
          d._blockedFuncs.push([function() {
            d._promise(i, a, f).then(m, v);
          }, ht]);
        });
        if (f) return wn(function() {
          var m = new ft(function(v, x) {
            d._lock();
            var k = a(v, x, d);
            k && k.then && k.then(v, x);
          });
          return m.finally(function() {
            return d._unlock();
          }), m._lib = !0, m;
        });
        var p = new ft(function(m, v) {
          var x = a(m, v, d);
          x && x.then && x.then(m, v);
        });
        return p._lib = !0, p;
      }, Ye.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, Ye.prototype.waitFor = function(i) {
        var a, f = this._root(), d = ft.resolve(i);
        f._waitingFor ? f._waitingFor = f._waitingFor.then(function() {
          return d;
        }) : (f._waitingFor = d, f._waitingQueue = [], a = f.idbtrans.objectStore(f.storeNames[0]), (function m() {
          for (++f._spinCount; f._waitingQueue.length; ) f._waitingQueue.shift()();
          f._waitingFor && (a.get(-1 / 0).onsuccess = m);
        })());
        var p = f._waitingFor;
        return new ft(function(m, v) {
          d.then(function(x) {
            return f._waitingQueue.push(Dt(m.bind(null, x)));
          }, function(x) {
            return f._waitingQueue.push(Dt(v.bind(null, x)));
          }).finally(function() {
            f._waitingFor === p && (f._waitingFor = null);
          });
        });
      }, Ye.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new ot.Abort()));
      }, Ye.prototype.table = function(i) {
        var a = this._memoizedTables || (this._memoizedTables = {});
        if (y(a, i)) return a[i];
        var f = this.schema[i];
        if (!f) throw new ot.NotFound("Table " + i + " not part of transaction");
        return f = new this.db.Table(i, f, this), f.core = this.db.core.table(i), a[i] = f;
      }, Ye);
      function Ye() {
      }
      function ms(i, a, f, d, p, m, v) {
        return { name: i, keyPath: a, unique: f, multi: d, auto: p, compound: m, src: (f && !v ? "&" : "") + (d ? "*" : "") + (p ? "++" : "") + Gc(a) };
      }
      function Gc(i) {
        return typeof i == "string" ? i : i ? "[" + [].join.call(i, "+") + "]" : "";
      }
      function bs(i, a, f) {
        return { name: i, primKey: a, indexes: f, mappedClass: null, idxByName: (d = function(p) {
          return [p.name, p];
        }, f.reduce(function(p, m, v) {
          return v = d(m, v), v && (p[v[0]] = v[1]), p;
        }, {})) };
        var d;
      }
      var jr = function(i) {
        try {
          return i.only([[]]), jr = function() {
            return [[]];
          }, [[]];
        } catch {
          return jr = function() {
            return Ln;
          }, Ln;
        }
      };
      function vs(i) {
        return i == null ? function() {
        } : typeof i == "string" ? (a = i).split(".").length === 1 ? function(f) {
          return f[a];
        } : function(f) {
          return st(f, a);
        } : function(f) {
          return st(f, i);
        };
        var a;
      }
      function Wc(i) {
        return [].slice.call(i);
      }
      var Nd = 0;
      function qr(i) {
        return i == null ? ":id" : typeof i == "string" ? i : "[".concat(i.join("+"), "]");
      }
      function Ud(i, a, k) {
        function d(_) {
          if (_.type === 3) return null;
          if (_.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var I = _.lower, U = _.upper, O = _.lowerOpen, _ = _.upperOpen;
          return I === void 0 ? U === void 0 ? null : a.upperBound(U, !!_) : U === void 0 ? a.lowerBound(I, !!O) : a.bound(I, U, !!O, !!_);
        }
        function p(R) {
          var I, U = R.name;
          return { name: U, schema: R, mutate: function(O) {
            var _ = O.trans, $ = O.type, K = O.keys, M = O.values, j = O.range;
            return new Promise(function(tt, at) {
              tt = Dt(tt);
              var et = _.objectStore(U), nt = et.keyPath == null, ct = $ === "put" || $ === "add";
              if (!ct && $ !== "delete" && $ !== "deleteRange") throw new Error("Invalid operation type: " + $);
              var it, dt = (K || M || { length: 1 }).length;
              if (K && M && K.length !== M.length) throw new Error("Given keys array must have same length as given values array.");
              if (dt === 0) return tt({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function vt(ge) {
                ++_e, Hr(ge);
              }
              var Tt = [], kt = [], _e = 0;
              if ($ === "deleteRange") {
                if (j.type === 4) return tt({ numFailures: _e, failures: kt, results: [], lastResult: void 0 });
                j.type === 3 ? Tt.push(it = et.clear()) : Tt.push(it = et.delete(d(j)));
              } else {
                var nt = ct ? nt ? [M, K] : [M, null] : [K, null], bt = nt[0], le = nt[1];
                if (ct) for (var de = 0; de < dt; ++de) Tt.push(it = le && le[de] !== void 0 ? et[$](bt[de], le[de]) : et[$](bt[de])), it.onerror = vt;
                else for (de = 0; de < dt; ++de) Tt.push(it = et[$](bt[de])), it.onerror = vt;
              }
              function ti(ge) {
                ge = ge.target.result, Tt.forEach(function(Vn, Ks) {
                  return Vn.error != null && (kt[Ks] = Vn.error);
                }), tt({ numFailures: _e, failures: kt, results: $ === "delete" ? K : Tt.map(function(Vn) {
                  return Vn.result;
                }), lastResult: ge });
              }
              it.onerror = function(ge) {
                vt(ge), ti(ge);
              }, it.onsuccess = ti;
            });
          }, getMany: function(O) {
            var _ = O.trans, $ = O.keys;
            return new Promise(function(K, M) {
              K = Dt(K);
              for (var j, tt = _.objectStore(U), at = $.length, et = new Array(at), nt = 0, ct = 0, it = function(Tt) {
                Tt = Tt.target, et[Tt._pos] = Tt.result, ++ct === nt && K(et);
              }, dt = We(M), vt = 0; vt < at; ++vt) $[vt] != null && ((j = tt.get($[vt]))._pos = vt, j.onsuccess = it, j.onerror = dt, ++nt);
              nt === 0 && K(et);
            });
          }, get: function(O) {
            var _ = O.trans, $ = O.key;
            return new Promise(function(K, M) {
              K = Dt(K);
              var j = _.objectStore(U).get($);
              j.onsuccess = function(tt) {
                return K(tt.target.result);
              }, j.onerror = We(M);
            });
          }, query: (I = B, function(O) {
            return new Promise(function(_, $) {
              _ = Dt(_);
              var K, M, j, nt = O.trans, tt = O.values, at = O.limit, it = O.query, et = at === 1 / 0 ? void 0 : at, ct = it.index, it = it.range, nt = nt.objectStore(U), ct = ct.isPrimaryKey ? nt : nt.index(ct.name), it = d(it);
              if (at === 0) return _({ result: [] });
              I ? ((et = tt ? ct.getAll(it, et) : ct.getAllKeys(it, et)).onsuccess = function(dt) {
                return _({ result: dt.target.result });
              }, et.onerror = We($)) : (K = 0, M = !tt && "openKeyCursor" in ct ? ct.openKeyCursor(it) : ct.openCursor(it), j = [], M.onsuccess = function(dt) {
                var vt = M.result;
                return vt ? (j.push(tt ? vt.value : vt.primaryKey), ++K === at ? _({ result: j }) : void vt.continue()) : _({ result: j });
              }, M.onerror = We($));
            });
          }), openCursor: function(O) {
            var _ = O.trans, $ = O.values, K = O.query, M = O.reverse, j = O.unique;
            return new Promise(function(tt, at) {
              tt = Dt(tt);
              var ct = K.index, et = K.range, nt = _.objectStore(U), nt = ct.isPrimaryKey ? nt : nt.index(ct.name), ct = M ? j ? "prevunique" : "prev" : j ? "nextunique" : "next", it = !$ && "openKeyCursor" in nt ? nt.openKeyCursor(d(et), ct) : nt.openCursor(d(et), ct);
              it.onerror = We(at), it.onsuccess = Dt(function(dt) {
                var vt, Tt, kt, _e, bt = it.result;
                bt ? (bt.___id = ++Nd, bt.done = !1, vt = bt.continue.bind(bt), Tt = (Tt = bt.continuePrimaryKey) && Tt.bind(bt), kt = bt.advance.bind(bt), _e = function() {
                  throw new Error("Cursor not stopped");
                }, bt.trans = _, bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = function() {
                  throw new Error("Cursor not started");
                }, bt.fail = Dt(at), bt.next = function() {
                  var le = this, de = 1;
                  return this.start(function() {
                    return de-- ? le.continue() : le.stop();
                  }).then(function() {
                    return le;
                  });
                }, bt.start = function(le) {
                  function de() {
                    if (it.result) try {
                      le();
                    } catch (ge) {
                      bt.fail(ge);
                    }
                    else bt.done = !0, bt.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, bt.stop();
                  }
                  var ti = new Promise(function(ge, Vn) {
                    ge = Dt(ge), it.onerror = We(Vn), bt.fail = Vn, bt.stop = function(Ks) {
                      bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = _e, ge(Ks);
                    };
                  });
                  return it.onsuccess = Dt(function(ge) {
                    it.onsuccess = de, de();
                  }), bt.continue = vt, bt.continuePrimaryKey = Tt, bt.advance = kt, de(), ti;
                }, tt(bt)) : tt(null);
              }, at);
            });
          }, count: function(O) {
            var _ = O.query, $ = O.trans, K = _.index, M = _.range;
            return new Promise(function(j, tt) {
              var at = $.objectStore(U), et = K.isPrimaryKey ? at : at.index(K.name), at = d(M), et = at ? et.count(at) : et.count();
              et.onsuccess = Dt(function(nt) {
                return j(nt.target.result);
              }), et.onerror = We(tt);
            });
          } };
        }
        var m, v, x, C = (v = k, x = Wc((m = i).objectStoreNames), { schema: { name: m.name, tables: x.map(function(R) {
          return v.objectStore(R);
        }).map(function(R) {
          var I = R.keyPath, _ = R.autoIncrement, U = u(I), O = {}, _ = { name: R.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: I == null, compound: U, keyPath: I, autoIncrement: _, unique: !0, extractKey: vs(I) }, indexes: Wc(R.indexNames).map(function($) {
            return R.index($);
          }).map(function(j) {
            var K = j.name, M = j.unique, tt = j.multiEntry, j = j.keyPath, tt = { name: K, compound: u(j), keyPath: j, unique: M, multiEntry: tt, extractKey: vs(j) };
            return O[qr(j)] = tt;
          }), getIndexByKeyPath: function($) {
            return O[qr($)];
          } };
          return O[":id"] = _.primaryKey, I != null && (O[qr(I)] = _.primaryKey), _;
        }) }, hasGetAll: 0 < x.length && "getAll" in v.objectStore(x[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), k = C.schema, B = C.hasGetAll, C = k.tables.map(p), S = {};
        return C.forEach(function(R) {
          return S[R.name] = R;
        }), { stack: "dbcore", transaction: i.transaction.bind(i), table: function(R) {
          if (!S[R]) throw new Error("Table '".concat(R, "' not found"));
          return S[R];
        }, MIN_KEY: -1 / 0, MAX_KEY: jr(a), schema: k };
      }
      function Cd(i, a, f, d) {
        var p = f.IDBKeyRange;
        return f.indexedDB, { dbcore: (d = Ud(a, p, d), i.dbcore.reduce(function(m, v) {
          return v = v.create, r(r({}, m), v(m));
        }, d)) };
      }
      function Ho(i, d) {
        var f = d.db, d = Cd(i._middlewares, f, i._deps, d);
        i.core = d.dbcore, i.tables.forEach(function(p) {
          var m = p.name;
          i.core.schema.tables.some(function(v) {
            return v.name === m;
          }) && (p.core = i.core.table(m), i[m] instanceof i.Table && (i[m].core = p.core));
        });
      }
      function Fo(i, a, f, d) {
        f.forEach(function(p) {
          var m = d[p];
          a.forEach(function(v) {
            var x = (function k(B, C) {
              return L(B, C) || (B = h(B)) && k(B, C);
            })(v, p);
            (!x || "value" in x && x.value === void 0) && (v === i.Transaction.prototype || v instanceof i.Transaction ? E(v, p, { get: function() {
              return this.table(p);
            }, set: function(k) {
              b(this, p, { value: k, writable: !0, configurable: !0, enumerable: !0 });
            } }) : v[p] = new i.Table(p, m));
          });
        });
      }
      function Es(i, a) {
        a.forEach(function(f) {
          for (var d in f) f[d] instanceof i.Table && delete f[d];
        });
      }
      function Od(i, a) {
        return i._cfg.version - a._cfg.version;
      }
      function Rd(i, a, f, d) {
        var p = i._dbSchema;
        f.objectStoreNames.contains("$meta") && !p.$meta && (p.$meta = bs("$meta", Zc("")[0], []), i._storeNames.push("$meta"));
        var m = i._createTransaction("readwrite", i._storeNames, p);
        m.create(f), m._completion.catch(d);
        var v = m._reject.bind(m), x = ht.transless || ht;
        wn(function() {
          return ht.trans = m, ht.transless = x, a !== 0 ? (Ho(i, f), B = a, ((k = m).storeNames.includes("$meta") ? k.table("$meta").get("version").then(function(C) {
            return C ?? B;
          }) : ft.resolve(B)).then(function(C) {
            return R = C, I = m, U = f, O = [], C = (S = i)._versions, _ = S._dbSchema = qo(0, S.idbdb, U), (C = C.filter(function($) {
              return $._cfg.version >= R;
            })).length !== 0 ? (C.forEach(function($) {
              O.push(function() {
                var K = _, M = $._cfg.dbschema;
                zo(S, K, U), zo(S, M, U), _ = S._dbSchema = M;
                var j = xs(K, M);
                j.add.forEach(function(ct) {
                  Ss(U, ct[0], ct[1].primKey, ct[1].indexes);
                }), j.change.forEach(function(ct) {
                  if (ct.recreate) throw new ot.Upgrade("Not yet support for changing primary key");
                  var it = U.objectStore(ct.name);
                  ct.add.forEach(function(dt) {
                    return jo(it, dt);
                  }), ct.change.forEach(function(dt) {
                    it.deleteIndex(dt.name), jo(it, dt);
                  }), ct.del.forEach(function(dt) {
                    return it.deleteIndex(dt);
                  });
                });
                var tt = $._cfg.contentUpgrade;
                if (tt && $._cfg.version > R) {
                  Ho(S, U), I._memoizedTables = {};
                  var at = yt(M);
                  j.del.forEach(function(ct) {
                    at[ct] = K[ct];
                  }), Es(S, [S.Transaction.prototype]), Fo(S, [S.Transaction.prototype], c(at), at), I.schema = at;
                  var et, nt = ut(tt);
                  return nt && ir(), j = ft.follow(function() {
                    var ct;
                    (et = tt(I)) && nt && (ct = mn.bind(null, null), et.then(ct, ct));
                  }), et && typeof et.then == "function" ? ft.resolve(et) : j.then(function() {
                    return et;
                  });
                }
              }), O.push(function(K) {
                var M, j, tt = $._cfg.dbschema;
                M = tt, j = K, [].slice.call(j.db.objectStoreNames).forEach(function(at) {
                  return M[at] == null && j.db.deleteObjectStore(at);
                }), Es(S, [S.Transaction.prototype]), Fo(S, [S.Transaction.prototype], S._storeNames, S._dbSchema), I.schema = S._dbSchema;
              }), O.push(function(K) {
                S.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(S.idbdb.version / 10) === $._cfg.version ? (S.idbdb.deleteObjectStore("$meta"), delete S._dbSchema.$meta, S._storeNames = S._storeNames.filter(function(M) {
                  return M !== "$meta";
                })) : K.objectStore("$meta").put($._cfg.version, "version"));
              });
            }), (function $() {
              return O.length ? ft.resolve(O.shift()(I.idbtrans)).then($) : ft.resolve();
            })().then(function() {
              Yc(_, U);
            })) : ft.resolve();
            var S, R, I, U, O, _;
          }).catch(v)) : (c(p).forEach(function(C) {
            Ss(f, C, p[C].primKey, p[C].indexes);
          }), Ho(i, f), void ft.follow(function() {
            return i.on.populate.fire(m);
          }).catch(v));
          var k, B;
        });
      }
      function $d(i, a) {
        Yc(i._dbSchema, a), a.db.version % 10 != 0 || a.objectStoreNames.contains("$meta") || a.db.createObjectStore("$meta").add(Math.ceil(a.db.version / 10 - 1), "version");
        var f = qo(0, i.idbdb, a);
        zo(i, i._dbSchema, a);
        for (var d = 0, p = xs(f, i._dbSchema).change; d < p.length; d++) {
          var m = (function(v) {
            if (v.change.length || v.recreate) return console.warn("Unable to patch indexes of table ".concat(v.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var x = a.objectStore(v.name);
            v.add.forEach(function(k) {
              Ge && console.debug("Dexie upgrade patch: Creating missing index ".concat(v.name, ".").concat(k.src)), jo(x, k);
            });
          })(p[d]);
          if (typeof m == "object") return m.value;
        }
      }
      function xs(i, a) {
        var f, d = { del: [], add: [], change: [] };
        for (f in i) a[f] || d.del.push(f);
        for (f in a) {
          var p = i[f], m = a[f];
          if (p) {
            var v = { name: f, def: m, recreate: !1, del: [], add: [], change: [] };
            if ("" + (p.primKey.keyPath || "") != "" + (m.primKey.keyPath || "") || p.primKey.auto !== m.primKey.auto) v.recreate = !0, d.change.push(v);
            else {
              var x = p.idxByName, k = m.idxByName, B = void 0;
              for (B in x) k[B] || v.del.push(B);
              for (B in k) {
                var C = x[B], S = k[B];
                C ? C.src !== S.src && v.change.push(S) : v.add.push(S);
              }
              (0 < v.del.length || 0 < v.add.length || 0 < v.change.length) && d.change.push(v);
            }
          } else d.add.push([f, m]);
        }
        return d;
      }
      function Ss(i, a, f, d) {
        var p = i.db.createObjectStore(a, f.keyPath ? { keyPath: f.keyPath, autoIncrement: f.auto } : { autoIncrement: f.auto });
        return d.forEach(function(m) {
          return jo(p, m);
        }), p;
      }
      function Yc(i, a) {
        c(i).forEach(function(f) {
          a.db.objectStoreNames.contains(f) || (Ge && console.debug("Dexie: Creating missing table", f), Ss(a, f, i[f].primKey, i[f].indexes));
        });
      }
      function jo(i, a) {
        i.createIndex(a.name, a.keyPath, { unique: a.unique, multiEntry: a.multi });
      }
      function qo(i, a, f) {
        var d = {};
        return Q(a.objectStoreNames, 0).forEach(function(p) {
          for (var m = f.objectStore(p), v = ms(Gc(B = m.keyPath), B || "", !0, !1, !!m.autoIncrement, B && typeof B != "string", !0), x = [], k = 0; k < m.indexNames.length; ++k) {
            var C = m.index(m.indexNames[k]), B = C.keyPath, C = ms(C.name, B, !!C.unique, !!C.multiEntry, !1, B && typeof B != "string", !1);
            x.push(C);
          }
          d[p] = bs(p, v, x);
        }), d;
      }
      function zo(i, a, f) {
        for (var d = f.db.objectStoreNames, p = 0; p < d.length; ++p) {
          var m = d[p], v = f.objectStore(m);
          i._hasGetAll = "getAll" in v;
          for (var x = 0; x < v.indexNames.length; ++x) {
            var k = v.indexNames[x], B = v.index(k).keyPath, C = typeof B == "string" ? B : "[" + Q(B).join("+") + "]";
            !a[m] || (B = a[m].idxByName[C]) && (B.name = k, delete a[m].idxByName[C], a[m].idxByName[k] = B);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && s.WorkerGlobalScope && s instanceof s.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (i._hasGetAll = !1);
      }
      function Zc(i) {
        return i.split(",").map(function(a, f) {
          var d = (a = a.trim()).replace(/([&*]|\+\+)/g, ""), p = /^\[/.test(d) ? d.match(/^\[(.*)\]$/)[1].split("+") : d;
          return ms(d, p || null, /\&/.test(a), /\*/.test(a), /\+\+/.test(a), u(p), f === 0);
        });
      }
      var Pd = (Go.prototype._parseStoresSpec = function(i, a) {
        c(i).forEach(function(f) {
          if (i[f] !== null) {
            var d = Zc(i[f]), p = d.shift();
            if (p.unique = !0, p.multi) throw new ot.Schema("Primary key cannot be multi-valued");
            d.forEach(function(m) {
              if (m.auto) throw new ot.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!m.keyPath) throw new ot.Schema("Index must have a name and cannot be an empty string");
            }), a[f] = bs(f, p, d);
          }
        });
      }, Go.prototype.stores = function(f) {
        var a = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? l(this._cfg.storesSource, f) : f;
        var f = a._versions, d = {}, p = {};
        return f.forEach(function(m) {
          l(d, m._cfg.storesSource), p = m._cfg.dbschema = {}, m._parseStoresSpec(d, p);
        }), a._dbSchema = p, Es(a, [a._allTables, a, a.Transaction.prototype]), Fo(a, [a._allTables, a, a.Transaction.prototype, this._cfg.tables], c(p), p), a._storeNames = c(p), this;
      }, Go.prototype.upgrade = function(i) {
        return this._cfg.contentUpgrade = rs(this._cfg.contentUpgrade || At, i), this;
      }, Go);
      function Go() {
      }
      function Ts(i, a) {
        var f = i._dbNamesDB;
        return f || (f = i._dbNamesDB = new nn(Lo, { addons: [], indexedDB: i, IDBKeyRange: a })).version(1).stores({ dbnames: "name" }), f.table("dbnames");
      }
      function ks(i) {
        return i && typeof i.databases == "function";
      }
      function As(i) {
        return wn(function() {
          return ht.letThrough = !0, i();
        });
      }
      function Is(i) {
        return !("from" in i);
      }
      var fe = function(i, a) {
        if (!this) {
          var f = new fe();
          return i && "d" in i && l(f, i), f;
        }
        l(this, arguments.length ? { d: 1, from: i, to: 1 < arguments.length ? a : i } : { d: 0 });
      };
      function zr(i, a, f) {
        var d = _t(a, f);
        if (!isNaN(d)) {
          if (0 < d) throw RangeError();
          if (Is(i)) return l(i, { from: a, to: f, d: 1 });
          var p = i.l, d = i.r;
          if (_t(f, i.from) < 0) return p ? zr(p, a, f) : i.l = { from: a, to: f, d: 1, l: null, r: null }, Qc(i);
          if (0 < _t(a, i.to)) return d ? zr(d, a, f) : i.r = { from: a, to: f, d: 1, l: null, r: null }, Qc(i);
          _t(a, i.from) < 0 && (i.from = a, i.l = null, i.d = d ? d.d + 1 : 1), 0 < _t(f, i.to) && (i.to = f, i.r = null, i.d = i.l ? i.l.d + 1 : 1), f = !i.r, p && !i.l && Gr(i, p), d && f && Gr(i, d);
        }
      }
      function Gr(i, a) {
        Is(a) || (function f(d, k) {
          var m = k.from, v = k.to, x = k.l, k = k.r;
          zr(d, m, v), x && f(d, x), k && f(d, k);
        })(i, a);
      }
      function Xc(i, a) {
        var f = Wo(a), d = f.next();
        if (d.done) return !1;
        for (var p = d.value, m = Wo(i), v = m.next(p.from), x = v.value; !d.done && !v.done; ) {
          if (_t(x.from, p.to) <= 0 && 0 <= _t(x.to, p.from)) return !0;
          _t(p.from, x.from) < 0 ? p = (d = f.next(x.from)).value : x = (v = m.next(p.from)).value;
        }
        return !1;
      }
      function Wo(i) {
        var a = Is(i) ? null : { s: 0, n: i };
        return { next: function(f) {
          for (var d = 0 < arguments.length; a; ) switch (a.s) {
            case 0:
              if (a.s = 1, d) for (; a.n.l && _t(f, a.n.from) < 0; ) a = { up: a, n: a.n.l, s: 1 };
              else for (; a.n.l; ) a = { up: a, n: a.n.l, s: 1 };
            case 1:
              if (a.s = 2, !d || _t(f, a.n.to) <= 0) return { value: a.n, done: !1 };
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
      function Qc(i) {
        var a, f, d = (((a = i.r) === null || a === void 0 ? void 0 : a.d) || 0) - (((f = i.l) === null || f === void 0 ? void 0 : f.d) || 0), p = 1 < d ? "r" : d < -1 ? "l" : "";
        p && (a = p == "r" ? "l" : "r", f = r({}, i), d = i[p], i.from = d.from, i.to = d.to, i[p] = d[p], f[p] = d[a], (i[a] = f).d = Jc(f)), i.d = Jc(i);
      }
      function Jc(f) {
        var a = f.r, f = f.l;
        return (a ? f ? Math.max(a.d, f.d) : a.d : f ? f.d : 0) + 1;
      }
      function Yo(i, a) {
        return c(a).forEach(function(f) {
          i[f] ? Gr(i[f], a[f]) : i[f] = (function d(p) {
            var m, v, x = {};
            for (m in p) y(p, m) && (v = p[m], x[m] = !v || typeof v != "object" || q.has(v.constructor) ? v : d(v));
            return x;
          })(a[f]);
        }), i;
      }
      function Bs(i, a) {
        return i.all || a.all || Object.keys(i).some(function(f) {
          return a[f] && Xc(a[f], i[f]);
        });
      }
      w(fe.prototype, ((Ue = { add: function(i) {
        return Gr(this, i), this;
      }, addKey: function(i) {
        return zr(this, i, i), this;
      }, addKeys: function(i) {
        var a = this;
        return i.forEach(function(f) {
          return zr(a, f, f);
        }), this;
      }, hasKey: function(i) {
        var a = Wo(this).next(i).value;
        return a && _t(a.from, i) <= 0 && 0 <= _t(a.to, i);
      } })[P] = function() {
        return Wo(this);
      }, Ue));
      var Dn = {}, _s = {}, Ns = !1;
      function Zo(i) {
        Yo(_s, i), Ns || (Ns = !0, setTimeout(function() {
          Ns = !1, Us(_s, !(_s = {}));
        }, 0));
      }
      function Us(i, a) {
        a === void 0 && (a = !1);
        var f = /* @__PURE__ */ new Set();
        if (i.all) for (var d = 0, p = Object.values(Dn); d < p.length; d++) tu(v = p[d], i, f, a);
        else for (var m in i) {
          var v, x = /^idb\:\/\/(.*)\/(.*)\//.exec(m);
          x && (m = x[1], x = x[2], (v = Dn["idb://".concat(m, "/").concat(x)]) && tu(v, i, f, a));
        }
        f.forEach(function(k) {
          return k();
        });
      }
      function tu(i, a, f, d) {
        for (var p = [], m = 0, v = Object.entries(i.queries.query); m < v.length; m++) {
          for (var x = v[m], k = x[0], B = [], C = 0, S = x[1]; C < S.length; C++) {
            var R = S[C];
            Bs(a, R.obsSet) ? R.subscribers.forEach(function(_) {
              return f.add(_);
            }) : d && B.push(R);
          }
          d && p.push([k, B]);
        }
        if (d) for (var I = 0, U = p; I < U.length; I++) {
          var O = U[I], k = O[0], B = O[1];
          i.queries.query[k] = B;
        }
      }
      function Ld(i) {
        var a = i._state, f = i._deps.indexedDB;
        if (a.isBeingOpened || i.idbdb) return a.dbReadyPromise.then(function() {
          return a.dbOpenError ? Ft(a.dbOpenError) : i;
        });
        a.isBeingOpened = !0, a.dbOpenError = null, a.openComplete = !1;
        var d = a.openCanceller, p = Math.round(10 * i.verno), m = !1;
        function v() {
          if (a.openCanceller !== d) throw new ot.DatabaseClosed("db.open() was cancelled");
        }
        function x() {
          return new ft(function(R, I) {
            if (v(), !f) throw new ot.MissingAPI();
            var U = i.name, O = a.autoSchema || !p ? f.open(U) : f.open(U, p);
            if (!O) throw new ot.MissingAPI();
            O.onerror = We(I), O.onblocked = Dt(i._fireOnBlocked), O.onupgradeneeded = Dt(function(_) {
              var $;
              C = O.transaction, a.autoSchema && !i._options.allowEmptyDB ? (O.onerror = Hr, C.abort(), O.result.close(), ($ = f.deleteDatabase(U)).onsuccess = $.onerror = Dt(function() {
                I(new ot.NoSuchDatabase("Database ".concat(U, " doesnt exist")));
              })) : (C.onerror = We(I), _ = _.oldVersion > Math.pow(2, 62) ? 0 : _.oldVersion, S = _ < 1, i.idbdb = O.result, m && $d(i, C), Rd(i, _ / 10, C, I));
            }, I), O.onsuccess = Dt(function() {
              C = null;
              var _, $, K, M, j, tt = i.idbdb = O.result, at = Q(tt.objectStoreNames);
              if (0 < at.length) try {
                var et = tt.transaction((M = at).length === 1 ? M[0] : M, "readonly");
                if (a.autoSchema) $ = tt, K = et, (_ = i).verno = $.version / 10, K = _._dbSchema = qo(0, $, K), _._storeNames = Q($.objectStoreNames, 0), Fo(_, [_._allTables], c(K), K);
                else if (zo(i, i._dbSchema, et), ((j = xs(qo(0, (j = i).idbdb, et), j._dbSchema)).add.length || j.change.some(function(nt) {
                  return nt.add.length || nt.change.length;
                })) && !m) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), tt.close(), p = tt.version + 1, m = !0, R(x());
                Ho(i, et);
              } catch {
              }
              sr.push(i), tt.onversionchange = Dt(function(nt) {
                a.vcFired = !0, i.on("versionchange").fire(nt);
              }), tt.onclose = Dt(function(nt) {
                i.on("close").fire(nt);
              }), S && (j = i._deps, et = U, tt = j.indexedDB, j = j.IDBKeyRange, ks(tt) || et === Lo || Ts(tt, j).put({ name: et }).catch(At)), R();
            }, I);
          }).catch(function(R) {
            switch (R?.name) {
              case "UnknownError":
                if (0 < a.PR1398_maxLoop) return a.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), x();
                break;
              case "VersionError":
                if (0 < p) return p = 0, x();
            }
            return ft.reject(R);
          });
        }
        var k, B = a.dbReadyResolve, C = null, S = !1;
        return ft.race([d, (typeof navigator > "u" ? ft.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(R) {
          function I() {
            return indexedDB.databases().finally(R);
          }
          k = setInterval(I, 100), I();
        }).finally(function() {
          return clearInterval(k);
        }) : Promise.resolve()).then(x)]).then(function() {
          return v(), a.onReadyBeingFired = [], ft.resolve(As(function() {
            return i.on.ready.fire(i.vip);
          })).then(function R() {
            if (0 < a.onReadyBeingFired.length) {
              var I = a.onReadyBeingFired.reduce(rs, At);
              return a.onReadyBeingFired = [], ft.resolve(As(function() {
                return I(i.vip);
              })).then(R);
            }
          });
        }).finally(function() {
          a.openCanceller === d && (a.onReadyBeingFired = null, a.isBeingOpened = !1);
        }).catch(function(R) {
          a.dbOpenError = R;
          try {
            C && C.abort();
          } catch {
          }
          return d === a.openCanceller && i._close(), Ft(R);
        }).finally(function() {
          a.openComplete = !0, B();
        }).then(function() {
          var R;
          return S && (R = {}, i.tables.forEach(function(I) {
            I.schema.indexes.forEach(function(U) {
              U.name && (R["idb://".concat(i.name, "/").concat(I.name, "/").concat(U.name)] = new fe(-1 / 0, [[[]]]));
            }), R["idb://".concat(i.name, "/").concat(I.name, "/")] = R["idb://".concat(i.name, "/").concat(I.name, "/:dels")] = new fe(-1 / 0, [[[]]]);
          }), En(Fr).fire(R), Us(R, !0)), i;
        });
      }
      function Cs(i) {
        function a(m) {
          return i.next(m);
        }
        var f = p(a), d = p(function(m) {
          return i.throw(m);
        });
        function p(m) {
          return function(k) {
            var x = m(k), k = x.value;
            return x.done ? k : k && typeof k.then == "function" ? k.then(f, d) : u(k) ? Promise.all(k).then(f, d) : f(k);
          };
        }
        return p(a)();
      }
      function Xo(i, a, f) {
        for (var d = u(i) ? i.slice() : [i], p = 0; p < f; ++p) d.push(a);
        return d;
      }
      var Kd = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var f = i.table(a), d = f.schema, p = {}, m = [];
          function v(S, R, I) {
            var U = qr(S), O = p[U] = p[U] || [], _ = S == null ? 0 : typeof S == "string" ? 1 : S.length, $ = 0 < R, $ = r(r({}, I), { name: $ ? "".concat(U, "(virtual-from:").concat(I.name, ")") : I.name, lowLevelIndex: I, isVirtual: $, keyTail: R, keyLength: _, extractKey: vs(S), unique: !$ && I.unique });
            return O.push($), $.isPrimaryKey || m.push($), 1 < _ && v(_ === 2 ? S[0] : S.slice(0, _ - 1), R + 1, I), O.sort(function(K, M) {
              return K.keyTail - M.keyTail;
            }), $;
          }
          a = v(d.primaryKey.keyPath, 0, d.primaryKey), p[":id"] = [a];
          for (var x = 0, k = d.indexes; x < k.length; x++) {
            var B = k[x];
            v(B.keyPath, 0, B);
          }
          function C(S) {
            var R, I = S.query.index;
            return I.isVirtual ? r(r({}, S), { query: { index: I.lowLevelIndex, range: (R = S.query.range, I = I.keyTail, { type: R.type === 1 ? 2 : R.type, lower: Xo(R.lower, R.lowerOpen ? i.MAX_KEY : i.MIN_KEY, I), lowerOpen: !0, upper: Xo(R.upper, R.upperOpen ? i.MIN_KEY : i.MAX_KEY, I), upperOpen: !0 }) } }) : S;
          }
          return r(r({}, f), { schema: r(r({}, d), { primaryKey: a, indexes: m, getIndexByKeyPath: function(S) {
            return (S = p[qr(S)]) && S[0];
          } }), count: function(S) {
            return f.count(C(S));
          }, query: function(S) {
            return f.query(C(S));
          }, openCursor: function(S) {
            var R = S.query.index, I = R.keyTail, U = R.isVirtual, O = R.keyLength;
            return U ? f.openCursor(C(S)).then(function($) {
              return $ && _($);
            }) : f.openCursor(S);
            function _($) {
              return Object.create($, { continue: { value: function(K) {
                K != null ? $.continue(Xo(K, S.reverse ? i.MAX_KEY : i.MIN_KEY, I)) : S.unique ? $.continue($.key.slice(0, O).concat(S.reverse ? i.MIN_KEY : i.MAX_KEY, I)) : $.continue();
              } }, continuePrimaryKey: { value: function(K, M) {
                $.continuePrimaryKey(Xo(K, i.MAX_KEY, I), M);
              } }, primaryKey: { get: function() {
                return $.primaryKey;
              } }, key: { get: function() {
                var K = $.key;
                return O === 1 ? K[0] : K.slice(0, O);
              } }, value: { get: function() {
                return $.value;
              } } });
            }
          } });
        } });
      } };
      function Os(i, a, f, d) {
        return f = f || {}, d = d || "", c(i).forEach(function(p) {
          var m, v, x;
          y(a, p) ? (m = i[p], v = a[p], typeof m == "object" && typeof v == "object" && m && v ? (x = N(m)) !== N(v) ? f[d + p] = a[p] : x === "Object" ? Os(m, v, f, d + p + ".") : m !== v && (f[d + p] = a[p]) : m !== v && (f[d + p] = a[p])) : f[d + p] = void 0;
        }), c(a).forEach(function(p) {
          y(i, p) || (f[d + p] = a[p]);
        }), f;
      }
      function Rs(i, a) {
        return a.type === "delete" ? a.keys : a.keys || a.values.map(i.extractKey);
      }
      var Dd = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var f = i.table(a), d = f.schema.primaryKey;
          return r(r({}, f), { mutate: function(p) {
            var m = ht.trans, v = m.table(a).hook, x = v.deleting, k = v.creating, B = v.updating;
            switch (p.type) {
              case "add":
                if (k.fire === At) break;
                return m._promise("readwrite", function() {
                  return C(p);
                }, !0);
              case "put":
                if (k.fire === At && B.fire === At) break;
                return m._promise("readwrite", function() {
                  return C(p);
                }, !0);
              case "delete":
                if (x.fire === At) break;
                return m._promise("readwrite", function() {
                  return C(p);
                }, !0);
              case "deleteRange":
                if (x.fire === At) break;
                return m._promise("readwrite", function() {
                  return (function S(R, I, U) {
                    return f.query({ trans: R, values: !1, query: { index: d, range: I }, limit: U }).then(function(O) {
                      var _ = O.result;
                      return C({ type: "delete", keys: _, trans: R }).then(function($) {
                        return 0 < $.numFailures ? Promise.reject($.failures[0]) : _.length < U ? { failures: [], numFailures: 0, lastResult: void 0 } : S(R, r(r({}, I), { lower: _[_.length - 1], lowerOpen: !0 }), U);
                      });
                    });
                  })(p.trans, p.range, 1e4);
                }, !0);
            }
            return f.mutate(p);
            function C(S) {
              var R, I, U, O = ht.trans, _ = S.keys || Rs(d, S);
              if (!_) throw new Error("Keys missing");
              return (S = S.type === "add" || S.type === "put" ? r(r({}, S), { keys: _ }) : r({}, S)).type !== "delete" && (S.values = o([], S.values)), S.keys && (S.keys = o([], S.keys)), R = f, U = _, ((I = S).type === "add" ? Promise.resolve([]) : R.getMany({ trans: I.trans, keys: U, cache: "immutable" })).then(function($) {
                var K = _.map(function(M, j) {
                  var tt, at, et, nt = $[j], ct = { onerror: null, onsuccess: null };
                  return S.type === "delete" ? x.fire.call(ct, M, nt, O) : S.type === "add" || nt === void 0 ? (tt = k.fire.call(ct, M, S.values[j], O), M == null && tt != null && (S.keys[j] = M = tt, d.outbound || A(S.values[j], d.keyPath, M))) : (tt = Os(nt, S.values[j]), (at = B.fire.call(ct, tt, M, nt, O)) && (et = S.values[j], Object.keys(at).forEach(function(it) {
                    y(et, it) ? et[it] = at[it] : A(et, it, at[it]);
                  }))), ct;
                });
                return f.mutate(S).then(function(M) {
                  for (var j = M.failures, tt = M.results, at = M.numFailures, M = M.lastResult, et = 0; et < _.length; ++et) {
                    var nt = (tt || _)[et], ct = K[et];
                    nt == null ? ct.onerror && ct.onerror(j[et]) : ct.onsuccess && ct.onsuccess(S.type === "put" && $[et] ? S.values[et] : nt);
                  }
                  return { failures: j, results: tt, numFailures: at, lastResult: M };
                }).catch(function(M) {
                  return K.forEach(function(j) {
                    return j.onerror && j.onerror(M);
                  }), Promise.reject(M);
                });
              });
            }
          } });
        } });
      } };
      function eu(i, a, f) {
        try {
          if (!a || a.keys.length < i.length) return null;
          for (var d = [], p = 0, m = 0; p < a.keys.length && m < i.length; ++p) _t(a.keys[p], i[m]) === 0 && (d.push(f ? D(a.values[p]) : a.values[p]), ++m);
          return d.length === i.length ? d : null;
        } catch {
          return null;
        }
      }
      var Md = { stack: "dbcore", level: -1, create: function(i) {
        return { table: function(a) {
          var f = i.table(a);
          return r(r({}, f), { getMany: function(d) {
            if (!d.cache) return f.getMany(d);
            var p = eu(d.keys, d.trans._cache, d.cache === "clone");
            return p ? ft.resolve(p) : f.getMany(d).then(function(m) {
              return d.trans._cache = { keys: d.keys, values: d.cache === "clone" ? D(m) : m }, m;
            });
          }, mutate: function(d) {
            return d.type !== "add" && (d.trans._cache = null), f.mutate(d);
          } });
        } };
      } };
      function nu(i, a) {
        return i.trans.mode === "readonly" && !!i.subscr && !i.trans.explicit && i.trans.db._options.cache !== "disabled" && !a.schema.primaryKey.outbound;
      }
      function ru(i, a) {
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
      var Vd = { stack: "dbcore", level: 0, name: "Observability", create: function(i) {
        var a = i.schema.name, f = new fe(i.MIN_KEY, i.MAX_KEY);
        return r(r({}, i), { transaction: function(d, p, m) {
          if (ht.subscr && p !== "readonly") throw new ot.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(ht.querier));
          return i.transaction(d, p, m);
        }, table: function(d) {
          var p = i.table(d), m = p.schema, v = m.primaryKey, S = m.indexes, x = v.extractKey, k = v.outbound, B = v.autoIncrement && S.filter(function(I) {
            return I.compound && I.keyPath.includes(v.keyPath);
          }), C = r(r({}, p), { mutate: function(I) {
            function U(it) {
              return it = "idb://".concat(a, "/").concat(d, "/").concat(it), M[it] || (M[it] = new fe());
            }
            var O, _, $, K = I.trans, M = I.mutatedParts || (I.mutatedParts = {}), j = U(""), tt = U(":dels"), at = I.type, ct = I.type === "deleteRange" ? [I.range] : I.type === "delete" ? [I.keys] : I.values.length < 50 ? [Rs(v, I).filter(function(it) {
              return it;
            }), I.values] : [], et = ct[0], nt = ct[1], ct = I.trans._cache;
            return u(et) ? (j.addKeys(et), (ct = at === "delete" || et.length === nt.length ? eu(et, ct) : null) || tt.addKeys(et), (ct || nt) && (O = U, _ = ct, $ = nt, m.indexes.forEach(function(it) {
              var dt = O(it.name || "");
              function vt(kt) {
                return kt != null ? it.extractKey(kt) : null;
              }
              function Tt(kt) {
                return it.multiEntry && u(kt) ? kt.forEach(function(_e) {
                  return dt.addKey(_e);
                }) : dt.addKey(kt);
              }
              (_ || $).forEach(function(kt, le) {
                var bt = _ && vt(_[le]), le = $ && vt($[le]);
                _t(bt, le) !== 0 && (bt != null && Tt(bt), le != null && Tt(le));
              });
            }))) : et ? (nt = { from: (nt = et.lower) !== null && nt !== void 0 ? nt : i.MIN_KEY, to: (nt = et.upper) !== null && nt !== void 0 ? nt : i.MAX_KEY }, tt.add(nt), j.add(nt)) : (j.add(f), tt.add(f), m.indexes.forEach(function(it) {
              return U(it.name).add(f);
            })), p.mutate(I).then(function(it) {
              return !et || I.type !== "add" && I.type !== "put" || (j.addKeys(it.results), B && B.forEach(function(dt) {
                for (var vt = I.values.map(function(bt) {
                  return dt.extractKey(bt);
                }), Tt = dt.keyPath.findIndex(function(bt) {
                  return bt === v.keyPath;
                }), kt = 0, _e = it.results.length; kt < _e; ++kt) vt[kt][Tt] = it.results[kt];
                U(dt.name).addKeys(vt);
              })), K.mutatedParts = Yo(K.mutatedParts || {}, M), it;
            });
          } }), S = function(U) {
            var O = U.query, U = O.index, O = O.range;
            return [U, new fe((U = O.lower) !== null && U !== void 0 ? U : i.MIN_KEY, (O = O.upper) !== null && O !== void 0 ? O : i.MAX_KEY)];
          }, R = { get: function(I) {
            return [v, new fe(I.key)];
          }, getMany: function(I) {
            return [v, new fe().addKeys(I.keys)];
          }, count: S, query: S, openCursor: S };
          return c(R).forEach(function(I) {
            C[I] = function(U) {
              var O = ht.subscr, _ = !!O, $ = nu(ht, p) && ru(I, U) ? U.obsSet = {} : O;
              if (_) {
                var K = function(nt) {
                  return nt = "idb://".concat(a, "/").concat(d, "/").concat(nt), $[nt] || ($[nt] = new fe());
                }, M = K(""), j = K(":dels"), O = R[I](U), _ = O[0], O = O[1];
                if ((I === "query" && _.isPrimaryKey && !U.values ? j : K(_.name || "")).add(O), !_.isPrimaryKey) {
                  if (I !== "count") {
                    var tt = I === "query" && k && U.values && p.query(r(r({}, U), { values: !1 }));
                    return p[I].apply(this, arguments).then(function(nt) {
                      if (I === "query") {
                        if (k && U.values) return tt.then(function(vt) {
                          return vt = vt.result, M.addKeys(vt), nt;
                        });
                        var ct = U.values ? nt.result.map(x) : nt.result;
                        (U.values ? M : j).addKeys(ct);
                      } else if (I === "openCursor") {
                        var it = nt, dt = U.values;
                        return it && Object.create(it, { key: { get: function() {
                          return j.addKey(it.primaryKey), it.key;
                        } }, primaryKey: { get: function() {
                          var vt = it.primaryKey;
                          return j.addKey(vt), vt;
                        } }, value: { get: function() {
                          return dt && M.addKey(it.primaryKey), it.value;
                        } } });
                      }
                      return nt;
                    });
                  }
                  j.add(f);
                }
              }
              return p[I].apply(this, arguments);
            };
          }), C;
        } });
      } };
      function ou(i, a, f) {
        if (f.numFailures === 0) return a;
        if (a.type === "deleteRange") return null;
        var d = a.keys ? a.keys.length : "values" in a && a.values ? a.values.length : 1;
        return f.numFailures === d ? null : (a = r({}, a), u(a.keys) && (a.keys = a.keys.filter(function(p, m) {
          return !(m in f.failures);
        })), "values" in a && u(a.values) && (a.values = a.values.filter(function(p, m) {
          return !(m in f.failures);
        })), a);
      }
      function $s(i, a) {
        return f = i, ((d = a).lower === void 0 || (d.lowerOpen ? 0 < _t(f, d.lower) : 0 <= _t(f, d.lower))) && (i = i, (a = a).upper === void 0 || (a.upperOpen ? _t(i, a.upper) < 0 : _t(i, a.upper) <= 0));
        var f, d;
      }
      function iu(i, a, R, d, p, m) {
        if (!R || R.length === 0) return i;
        var v = a.query.index, x = v.multiEntry, k = a.query.range, B = d.schema.primaryKey.extractKey, C = v.extractKey, S = (v.lowLevelIndex || v).extractKey, R = R.reduce(function(I, U) {
          var O = I, _ = [];
          if (U.type === "add" || U.type === "put") for (var $ = new fe(), K = U.values.length - 1; 0 <= K; --K) {
            var M, j = U.values[K], tt = B(j);
            $.hasKey(tt) || (M = C(j), (x && u(M) ? M.some(function(it) {
              return $s(it, k);
            }) : $s(M, k)) && ($.addKey(tt), _.push(j)));
          }
          switch (U.type) {
            case "add":
              var at = new fe().addKeys(a.values ? I.map(function(dt) {
                return B(dt);
              }) : I), O = I.concat(a.values ? _.filter(function(dt) {
                return dt = B(dt), !at.hasKey(dt) && (at.addKey(dt), !0);
              }) : _.map(function(dt) {
                return B(dt);
              }).filter(function(dt) {
                return !at.hasKey(dt) && (at.addKey(dt), !0);
              }));
              break;
            case "put":
              var et = new fe().addKeys(U.values.map(function(dt) {
                return B(dt);
              }));
              O = I.filter(function(dt) {
                return !et.hasKey(a.values ? B(dt) : dt);
              }).concat(a.values ? _ : _.map(function(dt) {
                return B(dt);
              }));
              break;
            case "delete":
              var nt = new fe().addKeys(U.keys);
              O = I.filter(function(dt) {
                return !nt.hasKey(a.values ? B(dt) : dt);
              });
              break;
            case "deleteRange":
              var ct = U.range;
              O = I.filter(function(dt) {
                return !$s(B(dt), ct);
              });
          }
          return O;
        }, i);
        return R === i ? i : (R.sort(function(I, U) {
          return _t(S(I), S(U)) || _t(B(I), B(U));
        }), a.limit && a.limit < 1 / 0 && (R.length > a.limit ? R.length = a.limit : i.length === a.limit && R.length < a.limit && (p.dirty = !0)), m ? Object.freeze(R) : R);
      }
      function su(i, a) {
        return _t(i.lower, a.lower) === 0 && _t(i.upper, a.upper) === 0 && !!i.lowerOpen == !!a.lowerOpen && !!i.upperOpen == !!a.upperOpen;
      }
      function Hd(i, a) {
        return (function(f, d, p, m) {
          if (f === void 0) return d !== void 0 ? -1 : 0;
          if (d === void 0) return 1;
          if ((d = _t(f, d)) === 0) {
            if (p && m) return 0;
            if (p) return 1;
            if (m) return -1;
          }
          return d;
        })(i.lower, a.lower, i.lowerOpen, a.lowerOpen) <= 0 && 0 <= (function(f, d, p, m) {
          if (f === void 0) return d !== void 0 ? 1 : 0;
          if (d === void 0) return -1;
          if ((d = _t(f, d)) === 0) {
            if (p && m) return 0;
            if (p) return -1;
            if (m) return 1;
          }
          return d;
        })(i.upper, a.upper, i.upperOpen, a.upperOpen);
      }
      function Fd(i, a, f, d) {
        i.subscribers.add(f), d.addEventListener("abort", function() {
          var p, m;
          i.subscribers.delete(f), i.subscribers.size === 0 && (p = i, m = a, setTimeout(function() {
            p.subscribers.size === 0 && J(m, p);
          }, 3e3));
        });
      }
      var jd = { stack: "dbcore", level: 0, name: "Cache", create: function(i) {
        var a = i.schema.name;
        return r(r({}, i), { transaction: function(f, d, p) {
          var m, v, x = i.transaction(f, d, p);
          return d === "readwrite" && (v = (m = new AbortController()).signal, p = function(k) {
            return function() {
              if (m.abort(), d === "readwrite") {
                for (var B = /* @__PURE__ */ new Set(), C = 0, S = f; C < S.length; C++) {
                  var R = S[C], I = Dn["idb://".concat(a, "/").concat(R)];
                  if (I) {
                    var U = i.table(R), O = I.optimisticOps.filter(function(dt) {
                      return dt.trans === x;
                    });
                    if (x._explicit && k && x.mutatedParts) for (var _ = 0, $ = Object.values(I.queries.query); _ < $.length; _++) for (var K = 0, M = (at = $[_]).slice(); K < M.length; K++) Bs((et = M[K]).obsSet, x.mutatedParts) && (J(at, et), et.subscribers.forEach(function(dt) {
                      return B.add(dt);
                    }));
                    else if (0 < O.length) {
                      I.optimisticOps = I.optimisticOps.filter(function(dt) {
                        return dt.trans !== x;
                      });
                      for (var j = 0, tt = Object.values(I.queries.query); j < tt.length; j++) for (var at, et, nt, ct = 0, it = (at = tt[j]).slice(); ct < it.length; ct++) (et = it[ct]).res != null && x.mutatedParts && (k && !et.dirty ? (nt = Object.isFrozen(et.res), nt = iu(et.res, et.req, O, U, et, nt), et.dirty ? (J(at, et), et.subscribers.forEach(function(dt) {
                        return B.add(dt);
                      })) : nt !== et.res && (et.res = nt, et.promise = ft.resolve({ result: nt }))) : (et.dirty && J(at, et), et.subscribers.forEach(function(dt) {
                        return B.add(dt);
                      })));
                    }
                  }
                }
                B.forEach(function(dt) {
                  return dt();
                });
              }
            };
          }, x.addEventListener("abort", p(!1), { signal: v }), x.addEventListener("error", p(!1), { signal: v }), x.addEventListener("complete", p(!0), { signal: v })), x;
        }, table: function(f) {
          var d = i.table(f), p = d.schema.primaryKey;
          return r(r({}, d), { mutate: function(m) {
            var v = ht.trans;
            if (p.outbound || v.db._options.cache === "disabled" || v.explicit || v.idbtrans.mode !== "readwrite") return d.mutate(m);
            var x = Dn["idb://".concat(a, "/").concat(f)];
            return x ? (v = d.mutate(m), m.type !== "add" && m.type !== "put" || !(50 <= m.values.length || Rs(p, m).some(function(k) {
              return k == null;
            })) ? (x.optimisticOps.push(m), m.mutatedParts && Zo(m.mutatedParts), v.then(function(k) {
              0 < k.numFailures && (J(x.optimisticOps, m), (k = ou(0, m, k)) && x.optimisticOps.push(k), m.mutatedParts && Zo(m.mutatedParts));
            }), v.catch(function() {
              J(x.optimisticOps, m), m.mutatedParts && Zo(m.mutatedParts);
            })) : v.then(function(k) {
              var B = ou(0, r(r({}, m), { values: m.values.map(function(C, S) {
                var R;
                return k.failures[S] ? C : (C = (R = p.keyPath) !== null && R !== void 0 && R.includes(".") ? D(C) : r({}, C), A(C, p.keyPath, k.results[S]), C);
              }) }), k);
              x.optimisticOps.push(B), queueMicrotask(function() {
                return m.mutatedParts && Zo(m.mutatedParts);
              });
            }), v) : d.mutate(m);
          }, query: function(m) {
            if (!nu(ht, d) || !ru("query", m)) return d.query(m);
            var v = ((B = ht.trans) === null || B === void 0 ? void 0 : B.db._options.cache) === "immutable", S = ht, x = S.requery, k = S.signal, B = (function(U, O, _, $) {
              var K = Dn["idb://".concat(U, "/").concat(O)];
              if (!K) return [];
              if (!(O = K.queries[_])) return [null, !1, K, null];
              var M = O[($.query ? $.query.index.name : null) || ""];
              if (!M) return [null, !1, K, null];
              switch (_) {
                case "query":
                  var j = M.find(function(tt) {
                    return tt.req.limit === $.limit && tt.req.values === $.values && su(tt.req.query.range, $.query.range);
                  });
                  return j ? [j, !0, K, M] : [M.find(function(tt) {
                    return ("limit" in tt.req ? tt.req.limit : 1 / 0) >= $.limit && (!$.values || tt.req.values) && Hd(tt.req.query.range, $.query.range);
                  }), !1, K, M];
                case "count":
                  return j = M.find(function(tt) {
                    return su(tt.req.query.range, $.query.range);
                  }), [j, !!j, K, M];
              }
            })(a, f, "query", m), C = B[0], S = B[1], R = B[2], I = B[3];
            return C && S ? C.obsSet = m.obsSet : (S = d.query(m).then(function(U) {
              var O = U.result;
              if (C && (C.res = O), v) {
                for (var _ = 0, $ = O.length; _ < $; ++_) Object.freeze(O[_]);
                Object.freeze(O);
              } else U.result = D(O);
              return U;
            }).catch(function(U) {
              return I && C && J(I, C), Promise.reject(U);
            }), C = { obsSet: m.obsSet, promise: S, subscribers: /* @__PURE__ */ new Set(), type: "query", req: m, dirty: !1 }, I ? I.push(C) : (I = [C], (R = R || (Dn["idb://".concat(a, "/").concat(f)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[m.query.index.name || ""] = I)), Fd(C, I, x, k), C.promise.then(function(U) {
              return { result: iu(U.result, m, R?.optimisticOps, d, C, v) };
            });
          } });
        } });
      } };
      function Qo(i, a) {
        return new Proxy(i, { get: function(f, d, p) {
          return d === "db" ? a : Reflect.get(f, d, p);
        } });
      }
      var nn = (jt.prototype.version = function(i) {
        if (isNaN(i) || i < 0.1) throw new ot.Type("Given version is not a positive number");
        if (i = Math.round(10 * i) / 10, this.idbdb || this._state.isBeingOpened) throw new ot.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, i);
        var a = this._versions, f = a.filter(function(d) {
          return d._cfg.version === i;
        })[0];
        return f || (f = new this.Version(i), a.push(f), a.sort(Od), f.stores({}), this._state.autoSchema = !1, f);
      }, jt.prototype._whenReady = function(i) {
        var a = this;
        return this.idbdb && (this._state.openComplete || ht.letThrough || this._vip) ? i() : new ft(function(f, d) {
          if (a._state.openComplete) return d(new ot.DatabaseClosed(a._state.dbOpenError));
          if (!a._state.isBeingOpened) {
            if (!a._state.autoOpen) return void d(new ot.DatabaseClosed());
            a.open().catch(At);
          }
          a._state.dbReadyPromise.then(f, d);
        }).then(i);
      }, jt.prototype.use = function(i) {
        var a = i.stack, f = i.create, d = i.level, p = i.name;
        return p && this.unuse({ stack: a, name: p }), i = this._middlewares[a] || (this._middlewares[a] = []), i.push({ stack: a, create: f, level: d ?? 10, name: p }), i.sort(function(m, v) {
          return m.level - v.level;
        }), this;
      }, jt.prototype.unuse = function(i) {
        var a = i.stack, f = i.name, d = i.create;
        return a && this._middlewares[a] && (this._middlewares[a] = this._middlewares[a].filter(function(p) {
          return d ? p.create !== d : !!f && p.name !== f;
        })), this;
      }, jt.prototype.open = function() {
        var i = this;
        return Pn(yn, function() {
          return Ld(i);
        });
      }, jt.prototype._close = function() {
        var i = this._state, a = sr.indexOf(this);
        if (0 <= a && sr.splice(a, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        i.isBeingOpened || (i.dbReadyPromise = new ft(function(f) {
          i.dbReadyResolve = f;
        }), i.openCanceller = new ft(function(f, d) {
          i.cancelOpen = d;
        }));
      }, jt.prototype.close = function(f) {
        var a = (f === void 0 ? { disableAutoOpen: !0 } : f).disableAutoOpen, f = this._state;
        a ? (f.isBeingOpened && f.cancelOpen(new ot.DatabaseClosed()), this._close(), f.autoOpen = !1, f.dbOpenError = new ot.DatabaseClosed()) : (this._close(), f.autoOpen = this._options.autoOpen || f.isBeingOpened, f.openComplete = !1, f.dbOpenError = null);
      }, jt.prototype.delete = function(i) {
        var a = this;
        i === void 0 && (i = { disableAutoOpen: !0 });
        var f = 0 < arguments.length && typeof arguments[0] != "object", d = this._state;
        return new ft(function(p, m) {
          function v() {
            a.close(i);
            var x = a._deps.indexedDB.deleteDatabase(a.name);
            x.onsuccess = Dt(function() {
              var k, B, C;
              k = a._deps, B = a.name, C = k.indexedDB, k = k.IDBKeyRange, ks(C) || B === Lo || Ts(C, k).delete(B).catch(At), p();
            }), x.onerror = We(m), x.onblocked = a._fireOnBlocked;
          }
          if (f) throw new ot.InvalidArgument("Invalid closeOptions argument to db.delete()");
          d.isBeingOpened ? d.dbReadyPromise.then(v) : v();
        });
      }, jt.prototype.backendDB = function() {
        return this.idbdb;
      }, jt.prototype.isOpen = function() {
        return this.idbdb !== null;
      }, jt.prototype.hasBeenClosed = function() {
        var i = this._state.dbOpenError;
        return i && i.name === "DatabaseClosed";
      }, jt.prototype.hasFailed = function() {
        return this._state.dbOpenError !== null;
      }, jt.prototype.dynamicallyOpened = function() {
        return this._state.autoSchema;
      }, Object.defineProperty(jt.prototype, "tables", { get: function() {
        var i = this;
        return c(this._allTables).map(function(a) {
          return i._allTables[a];
        });
      }, enumerable: !1, configurable: !0 }), jt.prototype.transaction = function() {
        var i = (function(a, f, d) {
          var p = arguments.length;
          if (p < 2) throw new ot.InvalidArgument("Too few arguments");
          for (var m = new Array(p - 1); --p; ) m[p - 1] = arguments[p];
          return d = m.pop(), [a, xt(m), d];
        }).apply(this, arguments);
        return this._transaction.apply(this, i);
      }, jt.prototype._transaction = function(i, a, f) {
        var d = this, p = ht.trans;
        p && p.db === this && i.indexOf("!") === -1 || (p = null);
        var m, v, x = i.indexOf("?") !== -1;
        i = i.replace("!", "").replace("?", "");
        try {
          if (v = a.map(function(B) {
            if (B = B instanceof d.Table ? B.name : B, typeof B != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return B;
          }), i == "r" || i === ds) m = ds;
          else {
            if (i != "rw" && i != hs) throw new ot.InvalidArgument("Invalid transaction mode: " + i);
            m = hs;
          }
          if (p) {
            if (p.mode === ds && m === hs) {
              if (!x) throw new ot.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              p = null;
            }
            p && v.forEach(function(B) {
              if (p && p.storeNames.indexOf(B) === -1) {
                if (!x) throw new ot.SubTransaction("Table " + B + " not included in parent transaction.");
                p = null;
              }
            }), x && p && !p.active && (p = null);
          }
        } catch (B) {
          return p ? p._promise(null, function(C, S) {
            S(B);
          }) : Ft(B);
        }
        var k = (function B(C, S, R, I, U) {
          return ft.resolve().then(function() {
            var O = ht.transless || ht, _ = C._createTransaction(S, R, C._dbSchema, I);
            if (_.explicit = !0, O = { trans: _, transless: O }, I) _.idbtrans = I.idbtrans;
            else try {
              _.create(), _.idbtrans._explicit = !0, C._state.PR1398_maxLoop = 3;
            } catch (M) {
              return M.name === Nt.InvalidState && C.isOpen() && 0 < --C._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), C.close({ disableAutoOpen: !1 }), C.open().then(function() {
                return B(C, S, R, null, U);
              })) : Ft(M);
            }
            var $, K = ut(U);
            return K && ir(), O = ft.follow(function() {
              var M;
              ($ = U.call(_, _)) && (K ? (M = mn.bind(null, null), $.then(M, M)) : typeof $.next == "function" && typeof $.throw == "function" && ($ = Cs($)));
            }, O), ($ && typeof $.then == "function" ? ft.resolve($).then(function(M) {
              return _.active ? M : Ft(new ot.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : O.then(function() {
              return $;
            })).then(function(M) {
              return I && _._resolve(), _._completion.then(function() {
                return M;
              });
            }).catch(function(M) {
              return _._reject(M), Ft(M);
            });
          });
        }).bind(null, this, m, v, p, f);
        return p ? p._promise(m, k, "lock") : ht.trans ? Pn(ht.transless, function() {
          return d._whenReady(k);
        }) : this._whenReady(k);
      }, jt.prototype.table = function(i) {
        if (!y(this._allTables, i)) throw new ot.InvalidTable("Table ".concat(i, " does not exist"));
        return this._allTables[i];
      }, jt);
      function jt(i, a) {
        var f = this;
        this._middlewares = {}, this.verno = 0;
        var d = jt.dependencies;
        this._options = a = r({ addons: jt.addons, autoOpen: !0, indexedDB: d.indexedDB, IDBKeyRange: d.IDBKeyRange, cache: "cloned" }, a), this._deps = { indexedDB: a.indexedDB, IDBKeyRange: a.IDBKeyRange }, d = a.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var p, m, v, x, k, B = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: At, dbReadyPromise: null, cancelOpen: At, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: a.autoOpen };
        B.dbReadyPromise = new ft(function(S) {
          B.dbReadyResolve = S;
        }), B.openCanceller = new ft(function(S, R) {
          B.cancelOpen = R;
        }), this._state = B, this.name = i, this.on = Dr(this, "populate", "blocked", "versionchange", "close", { ready: [rs, At] }), this.on.ready.subscribe = F(this.on.ready.subscribe, function(S) {
          return function(R, I) {
            jt.vip(function() {
              var U, O = f._state;
              O.openComplete ? (O.dbOpenError || ft.resolve().then(R), I && S(R)) : O.onReadyBeingFired ? (O.onReadyBeingFired.push(R), I && S(R)) : (S(R), U = f, I || S(function _() {
                U.on.ready.unsubscribe(R), U.on.ready.unsubscribe(_);
              }));
            });
          };
        }), this.Collection = (p = this, Mr(Ad.prototype, function($, _) {
          this.db = p;
          var I = Lc, U = null;
          if (_) try {
            I = _();
          } catch (K) {
            U = K;
          }
          var O = $._ctx, _ = O.table, $ = _.hook.reading.fire;
          this._ctx = { table: _, index: O.index, isPrimKey: !O.index || _.schema.primKey.keyPath && O.index === _.schema.primKey.name, range: I, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: U, or: O.or, valueMapper: $ !== ue ? $ : null };
        })), this.Table = (m = this, Mr(Vc.prototype, function(S, R, I) {
          this.db = m, this._tx = I, this.name = S, this.schema = R, this.hook = m._allTables[S] ? m._allTables[S].hook : Dr(null, { creating: [Bo, At], reading: [Un, ue], updating: [bd, At], deleting: [md, At] });
        })), this.Transaction = (v = this, Mr(_d.prototype, function(S, R, I, U, O) {
          var _ = this;
          this.db = v, this.mode = S, this.storeNames = R, this.schema = I, this.chromeTransactionDurability = U, this.idbtrans = null, this.on = Dr(this, "complete", "error", "abort"), this.parent = O || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new ft(function($, K) {
            _._resolve = $, _._reject = K;
          }), this._completion.then(function() {
            _.active = !1, _.on.complete.fire();
          }, function($) {
            var K = _.active;
            return _.active = !1, _.on.error.fire($), _.parent ? _.parent._reject($) : K && _.idbtrans && _.idbtrans.abort(), Ft($);
          });
        })), this.Version = (x = this, Mr(Pd.prototype, function(S) {
          this.db = x, this._cfg = { version: S, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (k = this, Mr(zc.prototype, function(S, R, I) {
          if (this.db = k, this._ctx = { table: S, index: R === ":id" ? null : R, or: I }, this._cmp = this._ascending = _t, this._descending = function(U, O) {
            return _t(O, U);
          }, this._max = function(U, O) {
            return 0 < _t(U, O) ? U : O;
          }, this._min = function(U, O) {
            return _t(U, O) < 0 ? U : O;
          }, this._IDBKeyRange = k._deps.IDBKeyRange, !this._IDBKeyRange) throw new ot.MissingAPI();
        })), this.on("versionchange", function(S) {
          0 < S.newVersion ? console.warn("Another connection wants to upgrade database '".concat(f.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(f.name, "'. Closing db now to resume the delete request.")), f.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(S) {
          !S.newVersion || S.newVersion < S.oldVersion ? console.warn("Dexie.delete('".concat(f.name, "') was blocked")) : console.warn("Upgrade '".concat(f.name, "' blocked by other connection holding version ").concat(S.oldVersion / 10));
        }), this._maxKey = jr(a.IDBKeyRange), this._createTransaction = function(S, R, I, U) {
          return new f.Transaction(S, R, I, f._options.chromeTransactionDurability, U);
        }, this._fireOnBlocked = function(S) {
          f.on("blocked").fire(S), sr.filter(function(R) {
            return R.name === f.name && R !== f && !R._state.vcFired;
          }).map(function(R) {
            return R.on("versionchange").fire(S);
          });
        }, this.use(Md), this.use(jd), this.use(Vd), this.use(Kd), this.use(Dd);
        var C = new Proxy(this, { get: function(S, R, I) {
          if (R === "_vip") return !0;
          if (R === "table") return function(O) {
            return Qo(f.table(O), C);
          };
          var U = Reflect.get(S, R, I);
          return U instanceof Vc ? Qo(U, C) : R === "tables" ? U.map(function(O) {
            return Qo(O, C);
          }) : R === "_createTransaction" ? function() {
            return Qo(U.apply(this, arguments), C);
          } : U;
        } });
        this.vip = C, d.forEach(function(S) {
          return S(f);
        });
      }
      var Jo, Ue = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", qd = (Ps.prototype.subscribe = function(i, a, f) {
        return this._subscribe(i && typeof i != "function" ? i : { next: i, error: a, complete: f });
      }, Ps.prototype[Ue] = function() {
        return this;
      }, Ps);
      function Ps(i) {
        this._subscribe = i;
      }
      try {
        Jo = { indexedDB: s.indexedDB || s.mozIndexedDB || s.webkitIndexedDB || s.msIndexedDB, IDBKeyRange: s.IDBKeyRange || s.webkitIDBKeyRange };
      } catch {
        Jo = { indexedDB: null, IDBKeyRange: null };
      }
      function au(i) {
        var a, f = !1, d = new qd(function(p) {
          var m = ut(i), v, x = !1, k = {}, B = {}, C = { get closed() {
            return x;
          }, unsubscribe: function() {
            x || (x = !0, v && v.abort(), S && En.storagemutated.unsubscribe(I));
          } };
          p.start && p.start(C);
          var S = !1, R = function() {
            return ls(U);
          }, I = function(O) {
            Yo(k, O), Bs(B, k) && R();
          }, U = function() {
            var O, _, $;
            !x && Jo.indexedDB && (k = {}, O = {}, v && v.abort(), v = new AbortController(), $ = (function(K) {
              var M = rr();
              try {
                m && ir();
                var j = wn(i, K);
                return j = m ? j.finally(mn) : j;
              } finally {
                M && or();
              }
            })(_ = { subscr: O, signal: v.signal, requery: R, querier: i, trans: null }), Promise.resolve($).then(function(K) {
              f = !0, a = K, x || _.signal.aborted || (k = {}, (function(M) {
                for (var j in M) if (y(M, j)) return;
                return 1;
              })(B = O) || S || (En(Fr, I), S = !0), ls(function() {
                return !x && p.next && p.next(K);
              }));
            }, function(K) {
              f = !1, ["DatabaseClosedError", "AbortError"].includes(K?.name) || x || ls(function() {
                x || p.error && p.error(K);
              });
            }));
          };
          return setTimeout(R, 0), C;
        });
        return d.hasValue = function() {
          return f;
        }, d.getValue = function() {
          return a;
        }, d;
      }
      var Mn = nn;
      function Ls(i) {
        var a = xn;
        try {
          xn = !0, En.storagemutated.fire(i), Us(i, !0);
        } finally {
          xn = a;
        }
      }
      w(Mn, r(r({}, Ie), { delete: function(i) {
        return new Mn(i, { addons: [] }).delete();
      }, exists: function(i) {
        return new Mn(i, { addons: [] }).open().then(function(a) {
          return a.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(i) {
        try {
          return a = Mn.dependencies, f = a.indexedDB, a = a.IDBKeyRange, (ks(f) ? Promise.resolve(f.databases()).then(function(d) {
            return d.map(function(p) {
              return p.name;
            }).filter(function(p) {
              return p !== Lo;
            });
          }) : Ts(f, a).toCollection().primaryKeys()).then(i);
        } catch {
          return Ft(new ot.MissingAPI());
        }
        var a, f;
      }, defineClass: function() {
        return function(i) {
          l(this, i);
        };
      }, ignoreTransaction: function(i) {
        return ht.trans ? Pn(ht.transless, i) : i();
      }, vip: As, async: function(i) {
        return function() {
          try {
            var a = Cs(i.apply(this, arguments));
            return a && typeof a.then == "function" ? a : ft.resolve(a);
          } catch (f) {
            return Ft(f);
          }
        };
      }, spawn: function(i, a, f) {
        try {
          var d = Cs(i.apply(f, a || []));
          return d && typeof d.then == "function" ? d : ft.resolve(d);
        } catch (p) {
          return Ft(p);
        }
      }, currentTransaction: { get: function() {
        return ht.trans || null;
      } }, waitFor: function(i, a) {
        return a = ft.resolve(typeof i == "function" ? Mn.ignoreTransaction(i) : i).timeout(a || 6e4), ht.trans ? ht.trans.waitFor(a) : a;
      }, Promise: ft, debug: { get: function() {
        return Ge;
      }, set: function(i) {
        Nc(i);
      } }, derive: T, extend: l, props: w, override: F, Events: Dr, on: En, liveQuery: au, extendObservabilitySet: Yo, getByKeyPath: st, setByKeyPath: A, delByKeyPath: function(i, a) {
        typeof a == "string" ? A(i, a, void 0) : "length" in a && [].map.call(a, function(f) {
          A(i, f, void 0);
        });
      }, shallowClone: yt, deepClone: D, getObjectDiff: Os, cmp: _t, asap: V, minKey: -1 / 0, addons: [], connections: sr, errnames: Nt, dependencies: Jo, cache: Dn, semVer: "4.0.11", version: "4.0.11".split(".").map(function(i) {
        return parseInt(i);
      }).reduce(function(i, a, f) {
        return i + a / Math.pow(10, 2 * f);
      }) })), Mn.maxKey = jr(Mn.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (En(Fr, function(i) {
        xn || (i = new CustomEvent(ws, { detail: i }), xn = !0, dispatchEvent(i), xn = !1);
      }), addEventListener(ws, function(i) {
        i = i.detail, xn || Ls(i);
      }));
      var ur, xn = !1, cu = function() {
      };
      return typeof BroadcastChannel < "u" && ((cu = function() {
        (ur = new BroadcastChannel(ws)).onmessage = function(i) {
          return i.data && Ls(i.data);
        };
      })(), typeof ur.unref == "function" && ur.unref(), En(Fr, function(i) {
        xn || ur.postMessage(i);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(i) {
        if (!nn.disableBfCache && i.persisted) {
          Ge && console.debug("Dexie: handling persisted pagehide"), ur?.close();
          for (var a = 0, f = sr; a < f.length; a++) f[a].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(i) {
        !nn.disableBfCache && i.persisted && (Ge && console.debug("Dexie: handling persisted pageshow"), cu(), Ls({ all: new fe(-1 / 0, [[]]) }));
      })), ft.rejectionMapper = function(i, a) {
        return !i || i instanceof It || i instanceof TypeError || i instanceof SyntaxError || !i.name || !Ot[i.name] ? i : (a = new Ot[i.name](a || i.message, i), "stack" in i && E(a, "stack", { get: function() {
          return this.inner.stack;
        } }), a);
      }, Nc(Ge), r(nn, Object.freeze({ __proto__: null, Dexie: nn, liveQuery: au, Entity: Kc, cmp: _t, PropModification: Vr, replacePrefix: function(i, a) {
        return new Vr({ replacePrefix: [i, a] });
      }, add: function(i) {
        return new Vr({ add: i });
      }, remove: function(i) {
        return new Vr({ remove: i });
      }, default: nn, RangeSet: fe, mergeRanges: Gr, rangesOverlap: Xc }), { default: nn }), nn;
    });
  })(yi)), yi.exports;
}
var Zy = Yy();
const Ha = /* @__PURE__ */ Pg(Zy), vf = Symbol.for("Dexie"), ji = globalThis[vf] || (globalThis[vf] = Ha);
if (Ha.semVer !== ji.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Ha.semVer} and ${ji.semVer}`);
const {
  liveQuery: tw,
  mergeRanges: ew,
  rangesOverlap: nw,
  RangeSet: rw,
  cmp: ow,
  Entity: iw,
  PropModification: sw,
  replacePrefix: aw,
  add: cw,
  remove: uw
} = ji, an = new ji("arkade", { allowEmptyDB: !0 });
an.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const Xy = {
  addOrUpdate: async (t) => {
    await an.vtxos.bulkPut(t);
  },
  deleteAll: async () => an.vtxos.clear(),
  getSpendableVtxos: async () => an.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await an.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  getSpentVtxos: async () => an.vtxos.where("spentBy").notEqual("").toArray(),
  getSweptVtxos: async () => an.vtxos.where("virtualStatus.state").equals("swept").toArray(),
  close: async () => an.close(),
  open: async () => {
    await an.open();
  }
}, yd = new Fy(Xy);
yd.start().catch(console.error);
const wd = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(wd)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== wd)
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
self.addEventListener("message", (t) => {
  t.data && t.data.type === "RELOAD_WALLET" && t.waitUntil(yd.reload().catch(console.error));
});
