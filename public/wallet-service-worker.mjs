const ur = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ka(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function oo(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Zt(t, ...e) {
  if (!Ka(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function $d(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.createHasher");
  oo(t.outputLen), oo(t.blockLen);
}
function pi(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Pd(t, e) {
  Zt(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
function br(...t) {
  for (let e = 0; e < t.length; e++)
    t[e].fill(0);
}
function Ps(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function Ze(t, e) {
  return t << 32 - e | t >>> e;
}
function Qo(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
const mf = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Ld = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function io(t) {
  if (Zt(t), mf)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Ld[t[n]];
  return e;
}
const on = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function au(t) {
  if (t >= on._0 && t <= on._9)
    return t - on._0;
  if (t >= on.A && t <= on.F)
    return t - (on.A - 10);
  if (t >= on.a && t <= on.f)
    return t - (on.a - 10);
}
function Ma(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (mf)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = au(t.charCodeAt(s)), u = au(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const l = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Dd(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
function Va(t) {
  return typeof t == "string" && (t = Dd(t)), Zt(t), t;
}
function Ve(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Zt(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
class bf {
}
function vf(t) {
  const e = (r) => t().update(Va(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function vo(t = 32) {
  if (ur && typeof ur.getRandomValues == "function")
    return ur.getRandomValues(new Uint8Array(t));
  if (ur && typeof ur.randomBytes == "function")
    return Uint8Array.from(ur.randomBytes(t));
  throw new Error("crypto.getRandomValues must be defined");
}
function Kd(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), s = BigInt(4294967295), c = Number(n >> o & s), u = Number(n & s), l = r ? 4 : 0, p = r ? 0 : 4;
  t.setUint32(e + l, c, r), t.setUint32(e + p, u, r);
}
function Md(t, e, n) {
  return t & e ^ ~t & n;
}
function Vd(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
class Ef extends bf {
  constructor(e, n, r, o) {
    super(), this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.buffer = new Uint8Array(e), this.view = Ps(this.buffer);
  }
  update(e) {
    pi(this), e = Va(e), Zt(e);
    const { view: n, buffer: r, blockLen: o } = this, s = e.length;
    for (let c = 0; c < s; ) {
      const u = Math.min(o - this.pos, s - c);
      if (u === o) {
        const l = Ps(e);
        for (; o <= s - c; c += o)
          this.process(l, c);
        continue;
      }
      r.set(e.subarray(c, c + u), this.pos), this.pos += u, c += u, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    pi(this), Pd(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: s } = this;
    let { pos: c } = this;
    n[c++] = 128, br(this.buffer.subarray(c)), this.padOffset > o - c && (this.process(r, 0), c = 0);
    for (let y = c; y < o; y++)
      n[y] = 0;
    Kd(r, o - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const u = Ps(e), l = this.outputLen;
    if (l % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const p = l / 4, h = this.get();
    if (p > h.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let y = 0; y < p; y++)
      u.setUint32(4 * y, h[y], s);
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
const Tn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Hd = /* @__PURE__ */ Uint32Array.from([
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
]), kn = /* @__PURE__ */ new Uint32Array(64);
class jd extends Ef {
  constructor(e = 32) {
    super(64, e, 8, !1), this.A = Tn[0] | 0, this.B = Tn[1] | 0, this.C = Tn[2] | 0, this.D = Tn[3] | 0, this.E = Tn[4] | 0, this.F = Tn[5] | 0, this.G = Tn[6] | 0, this.H = Tn[7] | 0;
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
      kn[y] = e.getUint32(n, !1);
    for (let y = 16; y < 64; y++) {
      const m = kn[y - 15], v = kn[y - 2], S = Ze(m, 7) ^ Ze(m, 18) ^ m >>> 3, _ = Ze(v, 17) ^ Ze(v, 19) ^ v >>> 10;
      kn[y] = _ + kn[y - 7] + S + kn[y - 16] | 0;
    }
    let { A: r, B: o, C: s, D: c, E: u, F: l, G: p, H: h } = this;
    for (let y = 0; y < 64; y++) {
      const m = Ze(u, 6) ^ Ze(u, 11) ^ Ze(u, 25), v = h + m + Md(u, l, p) + Hd[y] + kn[y] | 0, _ = (Ze(r, 2) ^ Ze(r, 13) ^ Ze(r, 22)) + Vd(r, o, s) | 0;
      h = p, p = l, l = u, u = c + v | 0, c = s, s = o, o = r, r = v + _ | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, s = s + this.C | 0, c = c + this.D | 0, u = u + this.E | 0, l = l + this.F | 0, p = p + this.G | 0, h = h + this.H | 0, this.set(r, o, s, c, u, l, p, h);
  }
  roundClean() {
    br(kn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), br(this.buffer);
  }
}
const Gt = /* @__PURE__ */ vf(() => new jd());
class xf extends bf {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, $d(e);
    const r = Va(n);
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
    this.oHash.update(s), br(s);
  }
  update(e) {
    return pi(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    pi(this), Zt(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
const Ha = (t, e, n) => new xf(t, e).update(n).digest();
Ha.create = (t, e) => new xf(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ja = /* @__PURE__ */ BigInt(0), aa = /* @__PURE__ */ BigInt(1);
function gi(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function Jo(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Sf(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? ja : BigInt("0x" + t);
}
function He(t) {
  return Sf(io(t));
}
function Tf(t) {
  return Zt(t), Sf(io(Uint8Array.from(t).reverse()));
}
function _n(t, e) {
  return Ma(t.toString(16).padStart(e * 2, "0"));
}
function kf(t, e) {
  return _n(t, e).reverse();
}
function re(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Ma(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (Ka(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function so(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
const Ls = (t) => typeof t == "bigint" && ja <= t;
function ca(t, e, n) {
  return Ls(t) && Ls(e) && Ls(n) && e <= t && t < n;
}
function Qn(t, e, n, r) {
  if (!ca(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Fd(t) {
  let e;
  for (e = 0; t > ja; t >>= aa, e += 1)
    ;
  return e;
}
const Vi = (t) => (aa << BigInt(t)) - aa;
function qd(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (v) => new Uint8Array(v), o = (v) => Uint8Array.of(v);
  let s = r(t), c = r(t), u = 0;
  const l = () => {
    s.fill(1), c.fill(0), u = 0;
  }, p = (...v) => n(c, s, ...v), h = (v = r(0)) => {
    c = p(o(0), v), s = p(), v.length !== 0 && (c = p(o(1), v), s = p());
  }, y = () => {
    if (u++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let v = 0;
    const S = [];
    for (; v < e; ) {
      s = p();
      const _ = s.slice();
      S.push(_), v += s.length;
    }
    return Ve(...S);
  };
  return (v, S) => {
    l(), h(v);
    let _;
    for (; !(_ = S(y())); )
      h();
    return l(), _;
  };
}
function Fa(t, e, n = {}) {
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
function cu(t) {
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
const ve = BigInt(0), we = BigInt(1), Gn = /* @__PURE__ */ BigInt(2), zd = /* @__PURE__ */ BigInt(3), Af = /* @__PURE__ */ BigInt(4), If = /* @__PURE__ */ BigInt(5), Bf = /* @__PURE__ */ BigInt(8);
function le(t, e) {
  const n = t % e;
  return n >= ve ? n : e + n;
}
function Ce(t, e, n) {
  let r = t;
  for (; e-- > ve; )
    r *= r, r %= n;
  return r;
}
function uu(t, e) {
  if (t === ve)
    throw new Error("invert: expected non-zero number");
  if (e <= ve)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = le(t, e), r = e, o = ve, s = we;
  for (; n !== ve; ) {
    const u = r / n, l = r % n, p = o - s * u;
    r = n, n = l, o = s, s = p;
  }
  if (r !== we)
    throw new Error("invert: does not exist");
  return le(o, e);
}
function _f(t, e) {
  const n = (t.ORDER + we) / Af, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function Gd(t, e) {
  const n = (t.ORDER - If) / Bf, r = t.mul(e, Gn), o = t.pow(r, n), s = t.mul(e, o), c = t.mul(t.mul(s, Gn), o), u = t.mul(s, t.sub(c, t.ONE));
  if (!t.eql(t.sqr(u), e))
    throw new Error("Cannot find square root");
  return u;
}
function Wd(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - we, n = 0;
  for (; e % Gn === ve; )
    e /= Gn, n++;
  let r = Gn;
  const o = Hi(t);
  for (; fu(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return _f;
  let s = o.pow(r, e);
  const c = (e + we) / Gn;
  return function(l, p) {
    if (l.is0(p))
      return p;
    if (fu(l, p) !== 1)
      throw new Error("Cannot find square root");
    let h = n, y = l.mul(l.ONE, s), m = l.pow(p, e), v = l.pow(p, c);
    for (; !l.eql(m, l.ONE); ) {
      if (l.is0(m))
        return l.ZERO;
      let S = 1, _ = l.sqr(m);
      for (; !l.eql(_, l.ONE); )
        if (S++, _ = l.sqr(_), S === h)
          throw new Error("Cannot find square root");
      const L = we << BigInt(h - S - 1), z = l.pow(y, L);
      h = S, y = l.sqr(z), m = l.mul(m, y), v = l.mul(v, z);
    }
    return v;
  };
}
function Yd(t) {
  return t % Af === zd ? _f : t % Bf === If ? Gd : Wd(t);
}
const Zd = [
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
function Xd(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Zd.reduce((r, o) => (r[o] = "function", r), e);
  return Fa(t, n), t;
}
function Qd(t, e, n) {
  if (n < ve)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ve)
    return t.ONE;
  if (n === we)
    return e;
  let r = t.ONE, o = e;
  for (; n > ve; )
    n & we && (r = t.mul(r, o)), o = t.sqr(o), n >>= we;
  return r;
}
function Nf(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), o = e.reduce((c, u, l) => t.is0(u) ? c : (r[l] = c, t.mul(c, u)), t.ONE), s = t.inv(o);
  return e.reduceRight((c, u, l) => t.is0(u) ? c : (r[l] = t.mul(c, r[l]), t.mul(c, u)), s), r;
}
function fu(t, e) {
  const n = (t.ORDER - we) / Gn, r = t.pow(e, n), o = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!o && !s && !c)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Jd(t, e) {
  e !== void 0 && oo(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Hi(t, e, n = !1, r = {}) {
  if (t <= ve)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  let o, s;
  if (typeof e == "object" && e != null) {
    if (r.sqrt || n)
      throw new Error("cannot specify opts in two arguments");
    const h = e;
    h.BITS && (o = h.BITS), h.sqrt && (s = h.sqrt), typeof h.isLE == "boolean" && (n = h.isLE);
  } else
    typeof e == "number" && (o = e), r.sqrt && (s = r.sqrt);
  const { nBitLength: c, nByteLength: u } = Jd(t, o);
  if (u > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let l;
  const p = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: c,
    BYTES: u,
    MASK: Vi(c),
    ZERO: ve,
    ONE: we,
    create: (h) => le(h, t),
    isValid: (h) => {
      if (typeof h != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof h);
      return ve <= h && h < t;
    },
    is0: (h) => h === ve,
    // is valid and invertible
    isValidNot0: (h) => !p.is0(h) && p.isValid(h),
    isOdd: (h) => (h & we) === we,
    neg: (h) => le(-h, t),
    eql: (h, y) => h === y,
    sqr: (h) => le(h * h, t),
    add: (h, y) => le(h + y, t),
    sub: (h, y) => le(h - y, t),
    mul: (h, y) => le(h * y, t),
    pow: (h, y) => Qd(p, h, y),
    div: (h, y) => le(h * uu(y, t), t),
    // Same as above, but doesn't normalize
    sqrN: (h) => h * h,
    addN: (h, y) => h + y,
    subN: (h, y) => h - y,
    mulN: (h, y) => h * y,
    inv: (h) => uu(h, t),
    sqrt: s || ((h) => (l || (l = Yd(t)), l(p, h))),
    toBytes: (h) => n ? kf(h, u) : _n(h, u),
    fromBytes: (h) => {
      if (h.length !== u)
        throw new Error("Field.fromBytes: expected " + u + " bytes, got " + h.length);
      return n ? Tf(h) : He(h);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (h) => Nf(p, h),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (h, y, m) => m ? y : h
  });
  return Object.freeze(p);
}
function Uf(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Cf(t) {
  const e = Uf(t);
  return e + Math.ceil(e / 2);
}
function th(t, e, n = !1) {
  const r = t.length, o = Uf(e), s = Cf(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? Tf(t) : He(t), u = le(c, e - we) + we;
  return n ? kf(u, o) : _n(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vr = BigInt(0), Wn = BigInt(1);
function Zr(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function eh(t, e, n) {
  const r = (c) => c.pz, o = Nf(t.Fp, n.map(r));
  return n.map((c, u) => c.toAffine(o[u])).map(t.fromAffine);
}
function Rf(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Ds(t, e) {
  Rf(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), o = 2 ** t, s = Vi(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: c };
}
function lu(t, e, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: c } = n;
  let u = Number(t & o), l = t >> c;
  u > r && (u -= s, l += Wn);
  const p = e * r, h = p + Math.abs(u) - 1, y = u === 0, m = u < 0, v = e % 2 !== 0;
  return { nextN: l, offset: h, isZero: y, isNeg: m, isNegF: v, offsetF: p };
}
function nh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function rh(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Ks = /* @__PURE__ */ new WeakMap(), Of = /* @__PURE__ */ new WeakMap();
function Ms(t) {
  return Of.get(t) || 1;
}
function du(t) {
  if (t !== vr)
    throw new Error("invalid wNAF");
}
function oh(t, e) {
  return {
    constTimeNegate: Zr,
    hasPrecomputes(n) {
      return Ms(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > vr; )
        r & Wn && (o = o.add(s)), s = s.double(), r >>= Wn;
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
      const { windows: o, windowSize: s } = Ds(r, e), c = [];
      let u = n, l = u;
      for (let p = 0; p < o; p++) {
        l = u, c.push(l);
        for (let h = 1; h < s; h++)
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
      const u = Ds(n, e);
      for (let l = 0; l < u.windows; l++) {
        const { nextN: p, offset: h, isZero: y, isNeg: m, isNegF: v, offsetF: S } = lu(o, l, u);
        o = p, y ? c = c.add(Zr(v, r[S])) : s = s.add(Zr(m, r[h]));
      }
      return du(o), { p: s, f: c };
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
      const c = Ds(n, e);
      for (let u = 0; u < c.windows && o !== vr; u++) {
        const { nextN: l, offset: p, isZero: h, isNeg: y } = lu(o, u, c);
        if (o = l, !h) {
          const m = r[p];
          s = s.add(y ? m.negate() : m);
        }
      }
      return du(o), s;
    },
    getPrecomputes(n, r, o) {
      let s = Ks.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && (typeof o == "function" && (s = o(s)), Ks.set(r, s))), s;
    },
    wNAFCached(n, r, o) {
      const s = Ms(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = Ms(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Rf(r, e), Of.set(n, r), Ks.delete(n);
    }
  };
}
function ih(t, e, n, r) {
  let o = e, s = t.ZERO, c = t.ZERO;
  for (; n > vr || r > vr; )
    n & Wn && (s = s.add(o)), r & Wn && (c = c.add(o)), o = o.double(), n >>= Wn, r >>= Wn;
  return { p1: s, p2: c };
}
function sh(t, e, n, r) {
  nh(n, t), rh(r, e);
  const o = n.length, s = r.length;
  if (o !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, u = Fd(BigInt(o));
  let l = 1;
  u > 12 ? l = u - 3 : u > 4 ? l = u - 2 : u > 0 && (l = 2);
  const p = Vi(l), h = new Array(Number(p) + 1).fill(c), y = Math.floor((e.BITS - 1) / l) * l;
  let m = c;
  for (let v = y; v >= 0; v -= l) {
    h.fill(c);
    for (let _ = 0; _ < s; _++) {
      const L = r[_], z = Number(L >> BigInt(v) & p);
      h[z] = h[z].add(n[_]);
    }
    let S = c;
    for (let _ = h.length - 1, L = c; _ > 0; _--)
      L = L.add(h[_]), S = S.add(L);
    if (m = m.add(S), v !== 0)
      for (let _ = 0; _ < l; _++)
        m = m.double();
  }
  return m;
}
function hu(t, e) {
  if (e) {
    if (e.ORDER !== t)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Xd(e), e;
  } else
    return Hi(t);
}
function ah(t, e, n = {}) {
  if (!e || typeof e != "object")
    throw new Error(`expected valid ${t} CURVE object`);
  for (const u of ["p", "n", "h"]) {
    const l = e[u];
    if (!(typeof l == "bigint" && l > vr))
      throw new Error(`CURVE.${u} must be positive bigint`);
  }
  const r = hu(e.p, n.Fp), o = hu(e.n, n.Fn), c = ["Gx", "Gy", "a", "b"];
  for (const u of c)
    if (!r.isValid(e[u]))
      throw new Error(`CURVE.${u} must be valid field element of CURVE.Fp`);
  return { Fp: r, Fn: o };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function pu(t) {
  t.lowS !== void 0 && gi("lowS", t.lowS), t.prehash !== void 0 && gi("prehash", t.prehash);
}
let ch = class extends Error {
  constructor(e = "") {
    super(e);
  }
};
const un = {
  // asn.1 DER encoding utils
  Err: ch,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = un;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = Jo(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Jo(o.length / 2 | 128) : "";
      return Jo(t) + s + o + e;
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
        const p = e.subarray(r, r + l);
        if (p.length !== l)
          throw new n("tlv.decode: length bytes not complete");
        if (p[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const h of p)
          c = c << 8 | h;
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
      if (t < Xr)
        throw new e("integer: negative integers are not allowed");
      let n = Jo(t);
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
      return He(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = un, o = re("signature", t), { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l } = r.decode(2, s), { v: p, l: h } = r.decode(2, l);
    if (h.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(p) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = un, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
}, Xr = BigInt(0), Qr = BigInt(1), uh = BigInt(2), ti = BigInt(3), fh = BigInt(4);
function lh(t, e, n) {
  function r(o) {
    const s = t.sqr(o), c = t.mul(s, o);
    return t.add(t.add(c, t.mul(o, e)), n);
  }
  return r;
}
function $f(t, e, n) {
  const { BYTES: r } = t;
  function o(s) {
    let c;
    if (typeof s == "bigint")
      c = s;
    else {
      let u = re("private key", s);
      if (e) {
        if (!e.includes(u.length * 2))
          throw new Error("invalid private key");
        const l = new Uint8Array(r);
        l.set(u, l.length - u.length), u = l;
      }
      try {
        c = t.fromBytes(u);
      } catch {
        throw new Error(`invalid private key: expected ui8a of size ${r}, got ${typeof s}`);
      }
    }
    if (n && (c = t.create(c)), !t.isValidNot0(c))
      throw new Error("invalid private key: out of range [1..N-1]");
    return c;
  }
  return o;
}
function dh(t, e = {}) {
  const { Fp: n, Fn: r } = ah("weierstrass", t, e), { h: o, n: s } = t;
  Fa(e, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object",
    wrapPrivateKey: "boolean"
  });
  const { endo: c } = e;
  if (c && (!n.is0(t.a) || typeof c.beta != "bigint" || typeof c.splitScalar != "function"))
    throw new Error('invalid endo: expected "beta": bigint and "splitScalar": function');
  function u() {
    if (!n.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function l(ut, F, X) {
    const { x: I, y: D } = F.toAffine(), G = n.toBytes(I);
    if (gi("isCompressed", X), X) {
      u();
      const dt = !n.isOdd(D);
      return Ve(Pf(dt), G);
    } else
      return Ve(Uint8Array.of(4), G, n.toBytes(D));
  }
  function p(ut) {
    Zt(ut);
    const F = n.BYTES, X = F + 1, I = 2 * F + 1, D = ut.length, G = ut[0], dt = ut.subarray(1);
    if (D === X && (G === 2 || G === 3)) {
      const j = n.fromBytes(dt);
      if (!n.isValid(j))
        throw new Error("bad point: is not on curve, wrong x");
      const V = m(j);
      let Y;
      try {
        Y = n.sqrt(V);
      } catch (at) {
        const ft = at instanceof Error ? ": " + at.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + ft);
      }
      u();
      const tt = n.isOdd(Y);
      return (G & 1) === 1 !== tt && (Y = n.neg(Y)), { x: j, y: Y };
    } else if (D === I && G === 4) {
      const j = n.fromBytes(dt.subarray(F * 0, F * 1)), V = n.fromBytes(dt.subarray(F * 1, F * 2));
      if (!v(j, V))
        throw new Error("bad point: is not on curve");
      return { x: j, y: V };
    } else
      throw new Error(`bad point: got length ${D}, expected compressed=${X} or uncompressed=${I}`);
  }
  const h = e.toBytes || l, y = e.fromBytes || p, m = lh(n, t.a, t.b);
  function v(ut, F) {
    const X = n.sqr(F), I = m(ut);
    return n.eql(X, I);
  }
  if (!v(t.Gx, t.Gy))
    throw new Error("bad curve params: generator point");
  const S = n.mul(n.pow(t.a, ti), fh), _ = n.mul(n.sqr(t.b), BigInt(27));
  if (n.is0(n.add(S, _)))
    throw new Error("bad curve params: a or b");
  function L(ut, F, X = !1) {
    if (!n.isValid(F) || X && n.is0(F))
      throw new Error(`bad point coordinate ${ut}`);
    return F;
  }
  function z(ut) {
    if (!(ut instanceof $))
      throw new Error("ProjectivePoint expected");
  }
  const Z = cu((ut, F) => {
    const { px: X, py: I, pz: D } = ut;
    if (n.eql(D, n.ONE))
      return { x: X, y: I };
    const G = ut.is0();
    F == null && (F = G ? n.ONE : n.inv(D));
    const dt = n.mul(X, F), j = n.mul(I, F), V = n.mul(D, F);
    if (G)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(V, n.ONE))
      throw new Error("invZ was invalid");
    return { x: dt, y: j };
  }), W = cu((ut) => {
    if (ut.is0()) {
      if (e.allowInfinityPoint && !n.is0(ut.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: F, y: X } = ut.toAffine();
    if (!n.isValid(F) || !n.isValid(X))
      throw new Error("bad point: x or y not field elements");
    if (!v(F, X))
      throw new Error("bad point: equation left != right");
    if (!ut.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function H(ut, F, X, I, D) {
    return X = new $(n.mul(X.px, ut), X.py, X.pz), F = Zr(I, F), X = Zr(D, X), F.add(X);
  }
  class $ {
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(F, X, I) {
      this.px = L("x", F), this.py = L("y", X, !0), this.pz = L("z", I), Object.freeze(this);
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(F) {
      const { x: X, y: I } = F || {};
      if (!F || !n.isValid(X) || !n.isValid(I))
        throw new Error("invalid affine point");
      if (F instanceof $)
        throw new Error("projective point not allowed");
      return n.is0(X) && n.is0(I) ? $.ZERO : new $(X, I, n.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static normalizeZ(F) {
      return eh($, "pz", F);
    }
    static fromBytes(F) {
      return Zt(F), $.fromHex(F);
    }
    /** Converts hash string or Uint8Array to Point. */
    static fromHex(F) {
      const X = $.fromAffine(y(re("pointHex", F)));
      return X.assertValidity(), X;
    }
    /** Multiplies generator point by privateKey. */
    static fromPrivateKey(F) {
      const X = $f(r, e.allowedPrivateKeyLengths, e.wrapPrivateKey);
      return $.BASE.multiply(X(F));
    }
    /** Multiscalar Multiplication */
    static msm(F, X) {
      return sh($, r, F, X);
    }
    /**
     *
     * @param windowSize
     * @param isLazy true will defer table computation until the first multiplication
     * @returns
     */
    precompute(F = 8, X = !0) {
      return T.setWindowSize(this, F), X || this.multiply(ti), this;
    }
    /** "Private method", don't use it directly */
    _setWindowSize(F) {
      this.precompute(F);
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      W(this);
    }
    hasEvenY() {
      const { y: F } = this.toAffine();
      if (!n.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !n.isOdd(F);
    }
    /** Compare one point to another. */
    equals(F) {
      z(F);
      const { px: X, py: I, pz: D } = this, { px: G, py: dt, pz: j } = F, V = n.eql(n.mul(X, j), n.mul(G, D)), Y = n.eql(n.mul(I, j), n.mul(dt, D));
      return V && Y;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new $(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: F, b: X } = t, I = n.mul(X, ti), { px: D, py: G, pz: dt } = this;
      let j = n.ZERO, V = n.ZERO, Y = n.ZERO, tt = n.mul(D, D), ht = n.mul(G, G), at = n.mul(dt, dt), ft = n.mul(D, G);
      return ft = n.add(ft, ft), Y = n.mul(D, dt), Y = n.add(Y, Y), j = n.mul(F, Y), V = n.mul(I, at), V = n.add(j, V), j = n.sub(ht, V), V = n.add(ht, V), V = n.mul(j, V), j = n.mul(ft, j), Y = n.mul(I, Y), at = n.mul(F, at), ft = n.sub(tt, at), ft = n.mul(F, ft), ft = n.add(ft, Y), Y = n.add(tt, tt), tt = n.add(Y, tt), tt = n.add(tt, at), tt = n.mul(tt, ft), V = n.add(V, tt), at = n.mul(G, dt), at = n.add(at, at), tt = n.mul(at, ft), j = n.sub(j, tt), Y = n.mul(at, ht), Y = n.add(Y, Y), Y = n.add(Y, Y), new $(j, V, Y);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(F) {
      z(F);
      const { px: X, py: I, pz: D } = this, { px: G, py: dt, pz: j } = F;
      let V = n.ZERO, Y = n.ZERO, tt = n.ZERO;
      const ht = t.a, at = n.mul(t.b, ti);
      let ft = n.mul(X, G), Tt = n.mul(I, dt), kt = n.mul(D, j), _t = n.add(X, I), mt = n.add(G, dt);
      _t = n.mul(_t, mt), mt = n.add(ft, Tt), _t = n.sub(_t, mt), mt = n.add(X, D);
      let Nt = n.add(G, j);
      return mt = n.mul(mt, Nt), Nt = n.add(ft, kt), mt = n.sub(mt, Nt), Nt = n.add(I, D), V = n.add(dt, j), Nt = n.mul(Nt, V), V = n.add(Tt, kt), Nt = n.sub(Nt, V), tt = n.mul(ht, mt), V = n.mul(at, kt), tt = n.add(V, tt), V = n.sub(Tt, tt), tt = n.add(Tt, tt), Y = n.mul(V, tt), Tt = n.add(ft, ft), Tt = n.add(Tt, ft), kt = n.mul(ht, kt), mt = n.mul(at, mt), Tt = n.add(Tt, kt), kt = n.sub(ft, kt), kt = n.mul(ht, kt), mt = n.add(mt, kt), ft = n.mul(Tt, mt), Y = n.add(Y, ft), ft = n.mul(Nt, mt), V = n.mul(_t, V), V = n.sub(V, ft), ft = n.mul(_t, Tt), tt = n.mul(Nt, tt), tt = n.add(tt, ft), new $(V, Y, tt);
    }
    subtract(F) {
      return this.add(F.negate());
    }
    is0() {
      return this.equals($.ZERO);
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
    multiply(F) {
      const { endo: X } = e;
      if (!r.isValidNot0(F))
        throw new Error("invalid scalar: out of range");
      let I, D;
      const G = (dt) => T.wNAFCached(this, dt, $.normalizeZ);
      if (X) {
        const { k1neg: dt, k1: j, k2neg: V, k2: Y } = X.splitScalar(F), { p: tt, f: ht } = G(j), { p: at, f: ft } = G(Y);
        D = ht.add(ft), I = H(X.beta, tt, at, dt, V);
      } else {
        const { p: dt, f: j } = G(F);
        I = dt, D = j;
      }
      return $.normalizeZ([I, D])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(F) {
      const { endo: X } = e, I = this;
      if (!r.isValid(F))
        throw new Error("invalid scalar: out of range");
      if (F === Xr || I.is0())
        return $.ZERO;
      if (F === Qr)
        return I;
      if (T.hasPrecomputes(this))
        return this.multiply(F);
      if (X) {
        const { k1neg: D, k1: G, k2neg: dt, k2: j } = X.splitScalar(F), { p1: V, p2: Y } = ih($, I, G, j);
        return H(X.beta, V, Y, D, dt);
      } else
        return T.wNAFCachedUnsafe(I, F);
    }
    multiplyAndAddUnsafe(F, X, I) {
      const D = this.multiplyUnsafe(X).add(F.multiplyUnsafe(I));
      return D.is0() ? void 0 : D;
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(F) {
      return Z(this, F);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: F } = e;
      return o === Qr ? !0 : F ? F($, this) : T.wNAFCachedUnsafe(this, s).is0();
    }
    clearCofactor() {
      const { clearCofactor: F } = e;
      return o === Qr ? this : F ? F($, this) : this.multiplyUnsafe(o);
    }
    toBytes(F = !0) {
      return gi("isCompressed", F), this.assertValidity(), h($, this, F);
    }
    /** @deprecated use `toBytes` */
    toRawBytes(F = !0) {
      return this.toBytes(F);
    }
    toHex(F = !0) {
      return io(this.toBytes(F));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  $.BASE = new $(t.Gx, t.Gy, n.ONE), $.ZERO = new $(n.ZERO, n.ONE, n.ZERO), $.Fp = n, $.Fn = r;
  const rt = r.BITS, T = oh($, e.endo ? Math.ceil(rt / 2) : rt);
  return $;
}
function Pf(t) {
  return Uint8Array.of(t ? 2 : 3);
}
function hh(t, e, n = {}) {
  Fa(e, { hash: "function" }, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  });
  const r = e.randomBytes || vo, o = e.hmac || ((I, ...D) => Ha(e.hash, I, Ve(...D))), { Fp: s, Fn: c } = t, { ORDER: u, BITS: l } = c;
  function p(I) {
    const D = u >> Qr;
    return I > D;
  }
  function h(I) {
    return p(I) ? c.neg(I) : I;
  }
  function y(I, D) {
    if (!c.isValidNot0(D))
      throw new Error(`invalid signature ${I}: out of range 1..CURVE.n`);
  }
  class m {
    constructor(D, G, dt) {
      y("r", D), y("s", G), this.r = D, this.s = G, dt != null && (this.recovery = dt), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(D) {
      const G = c.BYTES, dt = re("compactSignature", D, G * 2);
      return new m(c.fromBytes(dt.subarray(0, G)), c.fromBytes(dt.subarray(G, G * 2)));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(D) {
      const { r: G, s: dt } = un.toSig(re("DER", D));
      return new m(G, dt);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(D) {
      return new m(this.r, this.s, D);
    }
    // ProjPointType<bigint>
    recoverPublicKey(D) {
      const G = s.ORDER, { r: dt, s: j, recovery: V } = this;
      if (V == null || ![0, 1, 2, 3].includes(V))
        throw new Error("recovery id invalid");
      if (u * uh < G && V > 1)
        throw new Error("recovery id is ambiguous for h>1 curve");
      const tt = V === 2 || V === 3 ? dt + u : dt;
      if (!s.isValid(tt))
        throw new Error("recovery id 2 or 3 invalid");
      const ht = s.toBytes(tt), at = t.fromHex(Ve(Pf((V & 1) === 0), ht)), ft = c.inv(tt), Tt = W(re("msgHash", D)), kt = c.create(-Tt * ft), _t = c.create(j * ft), mt = t.BASE.multiplyUnsafe(kt).add(at.multiplyUnsafe(_t));
      if (mt.is0())
        throw new Error("point at infinify");
      return mt.assertValidity(), mt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return p(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new m(this.r, c.neg(this.s), this.recovery) : this;
    }
    toBytes(D) {
      if (D === "compact")
        return Ve(c.toBytes(this.r), c.toBytes(this.s));
      if (D === "der")
        return Ma(un.hexFromSig(this));
      throw new Error("invalid format");
    }
    // DER-encoded
    toDERRawBytes() {
      return this.toBytes("der");
    }
    toDERHex() {
      return io(this.toBytes("der"));
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return this.toBytes("compact");
    }
    toCompactHex() {
      return io(this.toBytes("compact"));
    }
  }
  const v = $f(c, n.allowedPrivateKeyLengths, n.wrapPrivateKey), S = {
    isValidPrivateKey(I) {
      try {
        return v(I), !0;
      } catch {
        return !1;
      }
    },
    normPrivateKeyToScalar: v,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const I = u;
      return th(r(Cf(I)), I);
    },
    precompute(I = 8, D = t.BASE) {
      return D.precompute(I, !1);
    }
  };
  function _(I, D = !0) {
    return t.fromPrivateKey(I).toBytes(D);
  }
  function L(I) {
    if (typeof I == "bigint")
      return !1;
    if (I instanceof t)
      return !0;
    const G = re("key", I).length, dt = s.BYTES, j = dt + 1, V = 2 * dt + 1;
    if (!(n.allowedPrivateKeyLengths || c.BYTES === j))
      return G === j || G === V;
  }
  function z(I, D, G = !0) {
    if (L(I) === !0)
      throw new Error("first arg must be private key");
    if (L(D) === !1)
      throw new Error("second arg must be public key");
    return t.fromHex(D).multiply(v(I)).toBytes(G);
  }
  const Z = e.bits2int || function(I) {
    if (I.length > 8192)
      throw new Error("input is too large");
    const D = He(I), G = I.length * 8 - l;
    return G > 0 ? D >> BigInt(G) : D;
  }, W = e.bits2int_modN || function(I) {
    return c.create(Z(I));
  }, H = Vi(l);
  function $(I) {
    return Qn("num < 2^" + l, I, Xr, H), c.toBytes(I);
  }
  function rt(I, D, G = T) {
    if (["recovered", "canonical"].some((_t) => _t in G))
      throw new Error("sign() legacy options not supported");
    const { hash: dt } = e;
    let { lowS: j, prehash: V, extraEntropy: Y } = G;
    j == null && (j = !0), I = re("msgHash", I), pu(G), V && (I = re("prehashed msgHash", dt(I)));
    const tt = W(I), ht = v(D), at = [$(ht), $(tt)];
    if (Y != null && Y !== !1) {
      const _t = Y === !0 ? r(s.BYTES) : Y;
      at.push(re("extraEntropy", _t));
    }
    const ft = Ve(...at), Tt = tt;
    function kt(_t) {
      const mt = Z(_t);
      if (!c.isValidNot0(mt))
        return;
      const Nt = c.inv(mt), Xt = t.BASE.multiply(mt).toAffine(), Ne = c.create(Xt.x);
      if (Ne === Xr)
        return;
      const lt = c.create(Nt * c.create(Tt + Ne * ht));
      if (lt === Xr)
        return;
      let ke = (Xt.x === Ne ? 0 : 2) | Number(Xt.y & Qr), he = lt;
      return j && p(lt) && (he = h(lt), ke ^= 1), new m(Ne, he, ke);
    }
    return { seed: ft, k2sig: kt };
  }
  const T = { lowS: e.lowS, prehash: !1 }, ut = { lowS: e.lowS, prehash: !1 };
  function F(I, D, G = T) {
    const { seed: dt, k2sig: j } = rt(I, D, G);
    return qd(e.hash.outputLen, c.BYTES, o)(dt, j);
  }
  t.BASE.precompute(8);
  function X(I, D, G, dt = ut) {
    const j = I;
    D = re("msgHash", D), G = re("publicKey", G), pu(dt);
    const { lowS: V, prehash: Y, format: tt } = dt;
    if ("strict" in dt)
      throw new Error("options.strict was renamed to lowS");
    if (tt !== void 0 && !["compact", "der", "js"].includes(tt))
      throw new Error('format must be "compact", "der" or "js"');
    const ht = typeof j == "string" || Ka(j), at = !ht && !tt && typeof j == "object" && j !== null && typeof j.r == "bigint" && typeof j.s == "bigint";
    if (!ht && !at)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let ft, Tt;
    try {
      if (at)
        if (tt === void 0 || tt === "js")
          ft = new m(j.r, j.s);
        else
          throw new Error("invalid format");
      if (ht) {
        try {
          tt !== "compact" && (ft = m.fromDER(j));
        } catch (he) {
          if (!(he instanceof un.Err))
            throw he;
        }
        !ft && tt !== "der" && (ft = m.fromCompact(j));
      }
      Tt = t.fromHex(G);
    } catch {
      return !1;
    }
    if (!ft || V && ft.hasHighS())
      return !1;
    Y && (D = e.hash(D));
    const { r: kt, s: _t } = ft, mt = W(D), Nt = c.inv(_t), Xt = c.create(mt * Nt), Ne = c.create(kt * Nt), lt = t.BASE.multiplyUnsafe(Xt).add(Tt.multiplyUnsafe(Ne));
    return lt.is0() ? !1 : c.create(lt.x) === kt;
  }
  return Object.freeze({
    getPublicKey: _,
    getSharedSecret: z,
    sign: F,
    verify: X,
    utils: S,
    Point: t,
    Signature: m
  });
}
function ph(t) {
  const e = {
    a: t.a,
    b: t.b,
    p: t.Fp.ORDER,
    n: t.n,
    h: t.h,
    Gx: t.Gx,
    Gy: t.Gy
  }, n = t.Fp, r = Hi(e.n, t.nBitLength), o = {
    Fp: n,
    Fn: r,
    allowedPrivateKeyLengths: t.allowedPrivateKeyLengths,
    allowInfinityPoint: t.allowInfinityPoint,
    endo: t.endo,
    wrapPrivateKey: t.wrapPrivateKey,
    isTorsionFree: t.isTorsionFree,
    clearCofactor: t.clearCofactor,
    fromBytes: t.fromBytes,
    toBytes: t.toBytes
  };
  return { CURVE: e, curveOpts: o };
}
function gh(t) {
  const { CURVE: e, curveOpts: n } = ph(t), r = {
    hash: t.hash,
    hmac: t.hmac,
    randomBytes: t.randomBytes,
    lowS: t.lowS,
    bits2int: t.bits2int,
    bits2int_modN: t.bits2int_modN
  };
  return { CURVE: e, curveOpts: n, ecdsaOpts: r };
}
function yh(t, e) {
  return Object.assign({}, e, {
    ProjectivePoint: e.Point,
    CURVE: t
  });
}
function wh(t) {
  const { CURVE: e, curveOpts: n, ecdsaOpts: r } = gh(t), o = dh(e, n), s = hh(o, r, n);
  return yh(t, s);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function mh(t, e) {
  const n = (r) => wh({ ...t, hash: r });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hn = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Lf = BigInt(0), yi = BigInt(1), wi = BigInt(2), gu = (t, e) => (t + e / wi) / e;
function Df(t) {
  const e = hn.p, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), l = BigInt(88), p = t * t * t % e, h = p * p * t % e, y = Ce(h, n, e) * h % e, m = Ce(y, n, e) * h % e, v = Ce(m, wi, e) * p % e, S = Ce(v, o, e) * v % e, _ = Ce(S, s, e) * S % e, L = Ce(_, u, e) * _ % e, z = Ce(L, l, e) * L % e, Z = Ce(z, u, e) * _ % e, W = Ce(Z, n, e) * h % e, H = Ce(W, c, e) * S % e, $ = Ce(H, r, e) * p % e, rt = Ce($, wi, e);
  if (!ua.eql(ua.sqr(rt), t))
    throw new Error("Cannot find square root");
  return rt;
}
const ua = Hi(hn.p, void 0, void 0, { sqrt: Df }), Qe = mh({
  ...hn,
  Fp: ua,
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = hn.n, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -yi * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = gu(s * t, e), l = gu(-r * t, e);
      let p = le(t - u * n - l * o, e), h = le(-u * r - l * s, e);
      const y = p > c, m = h > c;
      if (y && (p = e - p), m && (h = e - h), p > c || h > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: y, k1: p, k2neg: m, k2: h };
    }
  }
}, Gt), yu = {};
function mi(t, ...e) {
  let n = yu[t];
  if (n === void 0) {
    const r = Gt(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = Ve(r, r), yu[t] = n;
  }
  return Gt(Ve(n, ...e));
}
const qa = (t) => t.toBytes(!0).slice(1), fa = (t) => _n(t, 32), Vs = (t) => le(t, hn.p), ao = (t) => le(t, hn.n), za = Qe.Point, Ga = (t) => t % wi === Lf;
function la(t) {
  let e = Qe.utils.normPrivateKeyToScalar(t), n = za.fromPrivateKey(e);
  return { scalar: Ga(n.y) ? e : ao(-e), bytes: qa(n) };
}
function Kf(t) {
  Qn("x", t, yi, hn.p);
  const e = Vs(t * t), n = Vs(e * t + BigInt(7));
  let r = Df(n);
  Ga(r) || (r = Vs(-r));
  const o = za.fromAffine({ x: t, y: r });
  return o.assertValidity(), o;
}
const pr = He;
function Mf(...t) {
  return ao(pr(mi("BIP0340/challenge", ...t)));
}
function bh(t) {
  return la(t).bytes;
}
function vh(t, e, n = vo(32)) {
  const r = re("message", t), { bytes: o, scalar: s } = la(e), c = re("auxRand", n, 32), u = fa(s ^ pr(mi("BIP0340/aux", c))), l = mi("BIP0340/nonce", u, o, r), p = ao(pr(l));
  if (p === Lf)
    throw new Error("sign failed: k is zero");
  const { bytes: h, scalar: y } = la(p), m = Mf(h, o, r), v = new Uint8Array(64);
  if (v.set(h, 0), v.set(fa(ao(y + m * s)), 32), !Vf(v, r, o))
    throw new Error("sign: Invalid signature produced");
  return v;
}
function Vf(t, e, n) {
  const r = re("signature", t, 64), o = re("message", e), s = re("publicKey", n, 32);
  try {
    const c = Kf(pr(s)), u = pr(r.subarray(0, 32));
    if (!ca(u, yi, hn.p))
      return !1;
    const l = pr(r.subarray(32, 64));
    if (!ca(l, yi, hn.n))
      return !1;
    const p = Mf(fa(u), qa(c), o), h = za.BASE.multiplyUnsafe(l).add(c.multiplyUnsafe(ao(-p))), { x: y, y: m } = h.toAffine();
    return !(h.is0() || !Ga(m) || y !== u);
  } catch {
    return !1;
  }
}
const Je = {
  getPublicKey: bh,
  sign: vh,
  verify: Vf,
  utils: {
    randomPrivateKey: Qe.utils.randomPrivateKey,
    lift_x: Kf,
    pointToBytes: qa,
    numberToBytesBE: _n,
    bytesToNumberBE: He,
    taggedHash: mi,
    mod: le
  }
}, Eh = /* @__PURE__ */ Uint8Array.from([
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
]), Hf = Uint8Array.from(new Array(16).fill(0).map((t, e) => e)), xh = Hf.map((t) => (9 * t + 5) % 16), jf = /* @__PURE__ */ (() => {
  const n = [[Hf], [xh]];
  for (let r = 0; r < 4; r++)
    for (let o of n)
      o.push(o[r].map((s) => Eh[s]));
  return n;
})(), Ff = jf[0], qf = jf[1], zf = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => Uint8Array.from(t)), Sh = /* @__PURE__ */ Ff.map((t, e) => t.map((n) => zf[e][n])), Th = /* @__PURE__ */ qf.map((t, e) => t.map((n) => zf[e][n])), kh = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Ah = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function wu(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const ei = /* @__PURE__ */ new Uint32Array(16);
class Ih extends Ef {
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
    for (let v = 0; v < 16; v++, n += 4)
      ei[v] = e.getUint32(n, !0);
    let r = this.h0 | 0, o = r, s = this.h1 | 0, c = s, u = this.h2 | 0, l = u, p = this.h3 | 0, h = p, y = this.h4 | 0, m = y;
    for (let v = 0; v < 5; v++) {
      const S = 4 - v, _ = kh[v], L = Ah[v], z = Ff[v], Z = qf[v], W = Sh[v], H = Th[v];
      for (let $ = 0; $ < 16; $++) {
        const rt = Qo(r + wu(v, s, u, p) + ei[z[$]] + _, W[$]) + y | 0;
        r = y, y = p, p = Qo(u, 10) | 0, u = s, s = rt;
      }
      for (let $ = 0; $ < 16; $++) {
        const rt = Qo(o + wu(S, c, l, h) + ei[Z[$]] + L, H[$]) + m | 0;
        o = m, m = h, h = Qo(l, 10) | 0, l = c, c = rt;
      }
    }
    this.set(this.h1 + u + h | 0, this.h2 + p + m | 0, this.h3 + y + o | 0, this.h4 + r + c | 0, this.h0 + s + l | 0);
  }
  roundClean() {
    br(ei);
  }
  destroy() {
    this.destroyed = !0, br(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const Bh = /* @__PURE__ */ vf(() => new Ih());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Er(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Gf(t, ...e) {
  if (!Er(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Wf(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Wa(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Nn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function _r(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function bi(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function vi(t, e) {
  if (!Wf(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Ya(t, e) {
  if (!Wf(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Eo(...t) {
  const e = (s) => s, n = (s, c) => (u) => s(c(u)), r = t.map((s) => s.encode).reduceRight(n, e), o = t.map((s) => s.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function ji(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  vi("alphabet", e);
  const r = new Map(e.map((o, s) => [o, s]));
  return {
    encode: (o) => (bi(o), o.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${t}`);
      return e[s];
    })),
    decode: (o) => (bi(o), o.map((s) => {
      Nn("alphabet.decode", s);
      const c = r.get(s);
      if (c === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${t}`);
      return c;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function Fi(t = "") {
  return Nn("join", t), {
    encode: (e) => (vi("join.decode", e), e.join(t)),
    decode: (e) => (Nn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function _h(t, e = "=") {
  return _r(t), Nn("padding", e), {
    encode(n) {
      for (vi("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      vi("padding.decode", n);
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
function Nh(t) {
  return Wa(t), { encode: (e) => e, decode: (e) => t(e) };
}
function mu(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (bi(t), !t.length)
    return [];
  let r = 0;
  const o = [], s = Array.from(t, (u) => {
    if (_r(u), u < 0 || u >= e)
      throw new Error(`invalid integer: ${u}`);
    return u;
  }), c = s.length;
  for (; ; ) {
    let u = 0, l = !0;
    for (let p = r; p < c; p++) {
      const h = s[p], y = e * u, m = y + h;
      if (!Number.isSafeInteger(m) || y / e !== u || m - h !== y)
        throw new Error("convertRadix: carry overflow");
      const v = m / n;
      u = m % n;
      const S = Math.floor(v);
      if (s[p] = S, !Number.isSafeInteger(S) || S * n + u !== m)
        throw new Error("convertRadix: carry overflow");
      if (l)
        S ? l = !1 : r = p;
      else continue;
    }
    if (o.push(u), l)
      break;
  }
  for (let u = 0; u < t.length - 1 && t[u] === 0; u++)
    o.push(0);
  return o.reverse();
}
const Yf = (t, e) => e === 0 ? t : Yf(e, t % e), Ei = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Yf(t, e)), ui = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function da(t, e, n, r) {
  if (bi(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ei(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Ei(e, n)}`);
  let o = 0, s = 0;
  const c = ui[e], u = ui[n] - 1, l = [];
  for (const p of t) {
    if (_r(p), p >= c)
      throw new Error(`convertRadix2: invalid data word=${p} from=${e}`);
    if (o = o << e | p, s + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${e}`);
    for (s += e; s >= n; s -= n)
      l.push((o >> s - n & u) >>> 0);
    const h = ui[s];
    if (h === void 0)
      throw new Error("invalid carry");
    o &= h - 1;
  }
  if (o = o << n - s & u, !r && s >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && s > 0 && l.push(o >>> 0), l;
}
// @__NO_SIDE_EFFECTS__
function Uh(t) {
  _r(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Er(n))
        throw new Error("radix.encode input should be Uint8Array");
      return mu(Array.from(n), e, t);
    },
    decode: (n) => (Ya("radix.decode", n), Uint8Array.from(mu(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function Za(t, e = !1) {
  if (_r(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ei(8, t) > 32 || /* @__PURE__ */ Ei(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Er(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return da(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Ya("radix2.decode", n), Uint8Array.from(da(n, t, 8, e)))
  };
}
function bu(t) {
  return Wa(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Ch(t, e) {
  return _r(t), Wa(e), {
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
const Rh = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", Oh = (t, e) => {
  Nn("base64", t);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (t.length > 0 && !n.test(t))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(t, { alphabet: r, lastChunkHandling: "strict" });
}, be = Rh ? {
  encode(t) {
    return Gf(t), t.toBase64();
  },
  decode(t) {
    return Oh(t);
  }
} : /* @__PURE__ */ Eo(/* @__PURE__ */ Za(6), /* @__PURE__ */ ji("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ _h(6), /* @__PURE__ */ Fi("")), $h = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Eo(/* @__PURE__ */ Uh(58), /* @__PURE__ */ ji(t), /* @__PURE__ */ Fi("")), ha = /* @__PURE__ */ $h("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Ph = (t) => /* @__PURE__ */ Eo(Ch(4, (e) => t(t(e))), ha), pa = /* @__PURE__ */ Eo(/* @__PURE__ */ ji("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ Fi("")), vu = [996825010, 642813549, 513874426, 1027748829, 705979059];
function jr(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < vu.length; r++)
    (e >> r & 1) === 1 && (n ^= vu[r]);
  return n;
}
function Eu(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let s = 0; s < r; s++) {
    const c = t.charCodeAt(s);
    if (c < 33 || c > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = jr(o) ^ c >> 5;
  }
  o = jr(o);
  for (let s = 0; s < r; s++)
    o = jr(o) ^ t.charCodeAt(s) & 31;
  for (let s of e)
    o = jr(o) ^ s;
  for (let s = 0; s < 6; s++)
    o = jr(o);
  return o ^= n, pa.encode(da([o % ui[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Zf(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Za(5), r = n.decode, o = n.encode, s = bu(r);
  function c(y, m, v = 90) {
    Nn("bech32.encode prefix", y), Er(m) && (m = Array.from(m)), Ya("bech32.encode", m);
    const S = y.length;
    if (S === 0)
      throw new TypeError(`Invalid prefix length ${S}`);
    const _ = S + 7 + m.length;
    if (v !== !1 && _ > v)
      throw new TypeError(`Length ${_} exceeds limit ${v}`);
    const L = y.toLowerCase(), z = Eu(L, m, e);
    return `${L}1${pa.encode(m)}${z}`;
  }
  function u(y, m = 90) {
    Nn("bech32.decode input", y);
    const v = y.length;
    if (v < 8 || m !== !1 && v > m)
      throw new TypeError(`invalid string length: ${v} (${y}). Expected (8..${m})`);
    const S = y.toLowerCase();
    if (y !== S && y !== y.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const _ = S.lastIndexOf("1");
    if (_ === 0 || _ === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const L = S.slice(0, _), z = S.slice(_ + 1);
    if (z.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const Z = pa.decode(z).slice(0, -6), W = Eu(L, Z, e);
    if (!z.endsWith(W))
      throw new Error(`Invalid checksum in ${y}: expected "${W}"`);
    return { prefix: L, words: Z };
  }
  const l = bu(u);
  function p(y) {
    const { prefix: m, words: v } = u(y, !1);
    return { prefix: m, words: v, bytes: r(v) };
  }
  function h(y, m) {
    return c(y, o(m));
  }
  return {
    encode: c,
    decode: u,
    encodeFromBytes: h,
    decodeToBytes: p,
    decodeUnsafe: l,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: o
  };
}
const ga = /* @__PURE__ */ Zf("bech32"), lr = /* @__PURE__ */ Zf("bech32m"), Lh = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, Dh = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", Kh = {
  encode(t) {
    return Gf(t), t.toHex();
  },
  decode(t) {
    return Nn("hex", t), Uint8Array.fromHex(t);
  }
}, nt = Dh ? Kh : /* @__PURE__ */ Eo(/* @__PURE__ */ Za(4), /* @__PURE__ */ ji("0123456789abcdef"), /* @__PURE__ */ Fi(""), /* @__PURE__ */ Nh((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Mt = /* @__PURE__ */ new Uint8Array(), Xf = /* @__PURE__ */ new Uint8Array([0]);
function xr(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Oe(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Mh(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    if (!Oe(o))
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
const Qf = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function xo(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function tn(t) {
  return Number.isSafeInteger(t);
}
const Xa = {
  equalBytes: xr,
  isBytes: Oe,
  concatBytes: Mh
}, Jf = (t) => {
  if (t !== null && typeof t != "string" && !je(t) && !Oe(t) && !tn(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (je(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = pn.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (je(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = pn.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
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
    for (let l = 0; l < t.length; l++) {
      let p = t[l];
      if (n && (p = ~p), l === t.length - 1 && (p &= c), p !== 0)
        for (let h = 0; h < o; h++) {
          const y = 1 << o - h - 1;
          p & y && u.push(l * o + h);
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
    const { FULL_MASK: s, BITS: c } = te, u = n % c ? Math.floor(n / c) : void 0, l = n + r, p = l % c ? Math.floor(l / c) : void 0;
    if (u !== void 0 && u === p)
      return te.set(t, u, s >>> c - r << c - r - n, o);
    if (u !== void 0 && !te.set(t, u, s >>> n % c, o))
      return !1;
    const h = u !== void 0 ? u + 1 : n / c, y = p !== void 0 ? p : l / c;
    for (let m = h; m < y; m++)
      if (!te.set(t, m, s, o))
        return !1;
    return !(p !== void 0 && u !== p && !te.set(t, p, s << c - l % c, o));
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
class Qa {
  constructor(e, n = {}, r = [], o = void 0, s = 0) {
    this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.data = e, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = s, this.view = Qf(e);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${nt.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = te.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = te.range(e).map(({ pos: r, length: o }) => `(${r}/${o})[${nt.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${nt.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return pn.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Qa(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Oe(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (xr(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class Vh {
  constructor(e = []) {
    this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.stack = e, this.view = Qf(this.viewBuf);
  }
  pushObj(e, n) {
    return pn.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!tn(e) || e > 8)
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
const ya = (t) => Uint8Array.from(t).reverse();
function Hh(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function tl(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new Vh();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new Qa(e, n), o = t.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function Se(t, e) {
  if (!je(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return tl({
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
const Te = (t) => {
  const e = tl(t);
  return t.validate ? Se(e, t.validate) : e;
}, qi = (t) => xo(t) && typeof t.decode == "function" && typeof t.encode == "function";
function je(t) {
  return xo(t) && qi(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || tn(t.size));
}
function jh() {
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
      if (!xo(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Fh = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!tn(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function qh(t) {
  if (!xo(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!tn(e) || !(e in t))
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
function zh(t, e = !1) {
  if (!tn(t))
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
      const p = Math.min(u.length, t), h = BigInt(u.slice(0, p)) * 10n ** BigInt(t - p), y = l + h;
      return o ? -y : y;
    }
  };
}
function Gh(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!qi(e))
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
const el = (t) => {
  if (!qi(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, zi = { dict: jh, numberBigint: Fh, tsEnum: qh, decimal: zh, match: Gh, reverse: el }, Ja = (t, e = !1, n = !1, r = !0) => {
  if (!tn(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(t), s = 2n ** (8n * o - 1n);
  return Te({
    size: r ? t : void 0,
    encodeStream: (c, u) => {
      n && u < 0 && (u = u | s);
      const l = [];
      for (let h = 0; h < t; h++)
        l.push(Number(u & 255n)), u >>= 8n;
      let p = new Uint8Array(l).reverse();
      if (!r) {
        let h = 0;
        for (h = 0; h < p.length && p[h] === 0; h++)
          ;
        p = p.subarray(h);
      }
      c.bytes(e ? p.reverse() : p);
    },
    decodeStream: (c) => {
      const u = c.bytes(r ? t : Math.min(t, c.leftBytes)), l = e ? u : ya(u);
      let p = 0n;
      for (let h = 0; h < l.length; h++)
        p |= BigInt(l[h]) << 8n * BigInt(h);
      return n && p & s && (p = (p ^ s) - s), p;
    },
    validate: (c) => {
      if (typeof c != "bigint")
        throw new Error(`bigint: invalid value: ${c}`);
      return Hh(c, 8n * o, !!n), c;
    }
  });
}, nl = /* @__PURE__ */ Ja(32, !1), fi = /* @__PURE__ */ Ja(8, !0), Wh = /* @__PURE__ */ Ja(8, !0, !0), Yh = (t, e) => Te({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (o) => e.write(o, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), So = (t, e, n) => {
  const r = t * 8, o = 2 ** (r - 1), s = (l) => {
    if (!tn(l))
      throw new Error(`sintView: value is not safe integer: ${l}`);
    if (l < -o || l >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${l} < ${o}`);
  }, c = 2 ** r, u = (l) => {
    if (!tn(l))
      throw new Error(`uintView: value is not safe integer: ${l}`);
    if (0 > l || l >= c)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${l} < ${c}`);
  };
  return Yh(t, {
    write: n.write,
    read: n.read,
    validate: e ? s : u
  });
}, Ut = /* @__PURE__ */ So(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), Zh = /* @__PURE__ */ So(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), dr = /* @__PURE__ */ So(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), xu = /* @__PURE__ */ So(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), Bn = /* @__PURE__ */ So(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), Dt = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = Jf(t), r = Oe(t);
  return Te({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (o, s) => {
      r || n.encodeStream(o, s.length), o.bytes(e ? ya(s) : s), r && o.bytes(t);
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
      return e ? ya(s) : s;
    },
    validate: (o) => {
      if (!Oe(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function Xh(t, e) {
  if (!je(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Un(Dt(t), el(e));
}
const tc = (t, e = !1) => Se(Un(Dt(t, e), Lh), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Qh = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = Un(Dt(t, e.isLE), nt);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Un(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function Un(t, e) {
  if (!je(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!qi(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Te({
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
const Jh = (t, e = !1) => {
  if (!Oe(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Te({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = xr(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function tp(t, e, n) {
  if (!je(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Te({
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
function ec(t, e, n = !0) {
  if (!je(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Te({
    size: t.size,
    encodeStream: (r, o) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const o = t.decodeStream(r);
      if (n && typeof o != "object" && o !== e || Oe(e) && !xr(e, o))
        throw r.err(`magic: invalid value: ${o} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function rl(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!tn(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function ne(t) {
  if (!xo(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!je(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Te({
    size: rl(Object.values(t)),
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
function ep(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!je(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Te({
    size: rl(t),
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
function xe(t, e) {
  if (!je(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = Jf(typeof t == "string" ? `../${t}` : t);
  return Te({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, o) => {
      const s = r;
      s.pushObj(o, (c) => {
        Oe(t) || n.encodeStream(r, o.length);
        for (let u = 0; u < o.length; u++)
          c(`${u}`, () => {
            const l = o[u], p = r.pos;
            if (e.encodeStream(r, l), Oe(t)) {
              if (t.length > s.pos - p)
                return;
              const h = s.finish(!1).subarray(p, s.pos);
              if (xr(h.subarray(0, t.length), t))
                throw s.err(`array: inner element encoding same as separator. elm=${l} data=${h}`);
            }
          });
      }), Oe(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (s) => {
        if (t === null)
          for (let c = 0; !r.isEnd() && (s(`${c}`, () => o.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); c++)
            ;
        else if (Oe(t))
          for (let c = 0; ; c++) {
            if (xr(r.bytes(t.length, !0), t)) {
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
const Gi = Qe.ProjectivePoint, xi = Qe.CURVE.n, Pt = Xa.isBytes, An = Xa.concatBytes, qt = Xa.equalBytes, ol = (t) => Bh(Gt(t)), fe = (...t) => Gt(Gt(An(...t))), il = Je.utils.randomPrivateKey, nc = Je.getPublicKey, np = Qe.getPublicKey, Su = (t) => t.r < xi / 2n;
function rp(t, e, n = !1) {
  let r = Qe.sign(t, e);
  if (n && !Su(r)) {
    const o = new Uint8Array(32);
    let s = 0;
    for (; !Su(r); )
      if (o.set(Ut.encode(s++)), r = Qe.sign(t, e, { extraEntropy: o }), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Tu = Je.sign, rc = Je.utils.taggedHash;
var ye;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(ye || (ye = {}));
function Sr(t, e) {
  const n = t.length;
  if (e === ye.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Gi.fromHex(t), t;
  } else if (e === ye.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Je.utils.lift_x(Je.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function sl(t, e) {
  const n = Je.utils, r = n.taggedHash("TapTweak", t, e), o = n.bytesToNumberBE(r);
  if (o >= xi)
    throw new Error("tweak higher than curve order");
  return o;
}
function op(t, e = Uint8Array.of()) {
  const n = Je.utils, r = n.bytesToNumberBE(t), o = Gi.fromPrivateKey(r), s = o.hasEvenY() ? r : n.mod(-r, xi), c = n.pointToBytes(o), u = sl(c, e);
  return n.numberToBytesBE(n.mod(s + u, xi), 32);
}
function wa(t, e) {
  const n = Je.utils, r = sl(t, e), s = n.lift_x(n.bytesToNumberBE(t)).add(Gi.fromPrivateKey(r)), c = s.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(s), c];
}
const oc = Gt(Gi.BASE.toRawBytes(!1)), Tr = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, ni = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Si(t, e) {
  if (!Pt(t) || !Pt(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
var jt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(jt || (jt = {}));
function ic(t = 6, e = !1) {
  return Te({
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
function ip(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (Pt(t))
    try {
      const r = ic(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const Et = Te({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (jt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(jt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(jt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = ic().encode(BigInt(n))), !Pt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < jt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(jt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(jt.PUSHDATA2), t.bytes(xu.encode(r))) : (t.byte(jt.PUSHDATA4), t.bytes(Ut.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (jt.OP_0 < n && n <= jt.PUSHDATA4) {
        let r;
        if (n < jt.PUSHDATA1)
          r = n;
        else if (n === jt.PUSHDATA1)
          r = Bn.decodeStream(t);
        else if (n === jt.PUSHDATA2)
          r = xu.decodeStream(t);
        else if (n === jt.PUSHDATA4)
          r = Ut.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (jt.OP_1 <= n && n <= jt.OP_16)
        e.push(n - (jt.OP_1 - 1));
      else {
        const r = jt[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), ku = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Wi = Te({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, o, s] of Object.values(ku))
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
    const [n, r, o] = ku[e];
    let s = 0n;
    for (let c = 0; c < r; c++)
      s |= BigInt(t.byte()) << 8n * BigInt(c);
    if (s < o)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), Fe = Un(Wi, zi.numberBigint), De = Dt(Wi), sc = xe(Fe, De), Ti = (t) => xe(Wi, t), al = ne({
  txid: Dt(32, !0),
  // hash(prev_tx),
  index: Ut,
  // output number of previous tx
  finalScriptSig: De,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: Ut
  // ?
}), Yn = ne({ amount: fi, script: De }), sp = ne({
  version: dr,
  segwitFlag: Jh(new Uint8Array([0, 1])),
  inputs: Ti(al),
  outputs: Ti(Yn),
  witnesses: tp("segwitFlag", xe("inputs/length", sc)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: Ut
});
function ap(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const gr = Se(sp, ap), Wr = ne({
  version: dr,
  inputs: Ti(al),
  outputs: Ti(Yn),
  lockTime: Ut
}), ma = Se(Dt(null), (t) => Sr(t, ye.ecdsa)), ki = Se(Dt(32), (t) => Sr(t, ye.schnorr)), Au = Se(Dt(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), Yi = ne({
  fingerprint: Zh,
  path: xe(null, Ut)
}), cl = ne({
  hashes: xe(Fe, Dt(32)),
  der: Yi
}), cp = Dt(78), up = ne({ pubKey: ki, leafHash: Dt(32) }), fp = ne({
  version: Bn,
  // With parity :(
  internalKey: Dt(32),
  merklePath: xe(null, Dt(32))
}), dn = Se(fp, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), lp = xe(null, ne({
  depth: Bn,
  version: Bn,
  script: De
})), Ft = Dt(null), Iu = Dt(20), Fr = Dt(32), ac = {
  unsignedTx: [0, !1, Wr, [0], [0], !1],
  xpub: [1, cp, Yi, [], [0, 2], !1],
  txVersion: [2, !1, Ut, [2], [2], !1],
  fallbackLocktime: [3, !1, Ut, [], [2], !1],
  inputCount: [4, !1, Fe, [2], [2], !1],
  outputCount: [5, !1, Fe, [2], [2], !1],
  txModifiable: [6, !1, Bn, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, Ut, [], [0, 2], !1],
  proprietary: [252, Ft, Ft, [], [0, 2], !1]
}, Zi = {
  nonWitnessUtxo: [0, !1, gr, [], [0, 2], !1],
  witnessUtxo: [1, !1, Yn, [], [0, 2], !1],
  partialSig: [2, ma, Ft, [], [0, 2], !1],
  sighashType: [3, !1, Ut, [], [0, 2], !1],
  redeemScript: [4, !1, Ft, [], [0, 2], !1],
  witnessScript: [5, !1, Ft, [], [0, 2], !1],
  bip32Derivation: [6, ma, Yi, [], [0, 2], !1],
  finalScriptSig: [7, !1, Ft, [], [0, 2], !1],
  finalScriptWitness: [8, !1, sc, [], [0, 2], !1],
  porCommitment: [9, !1, Ft, [], [0, 2], !1],
  ripemd160: [10, Iu, Ft, [], [0, 2], !1],
  sha256: [11, Fr, Ft, [], [0, 2], !1],
  hash160: [12, Iu, Ft, [], [0, 2], !1],
  hash256: [13, Fr, Ft, [], [0, 2], !1],
  txid: [14, !1, Fr, [2], [2], !0],
  index: [15, !1, Ut, [2], [2], !0],
  sequence: [16, !1, Ut, [], [2], !0],
  requiredTimeLocktime: [17, !1, Ut, [], [2], !1],
  requiredHeightLocktime: [18, !1, Ut, [], [2], !1],
  tapKeySig: [19, !1, Au, [], [0, 2], !1],
  tapScriptSig: [20, up, Au, [], [0, 2], !1],
  tapLeafScript: [21, dn, Ft, [], [0, 2], !1],
  tapBip32Derivation: [22, Fr, cl, [], [0, 2], !1],
  tapInternalKey: [23, !1, ki, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, Fr, [], [0, 2], !1],
  proprietary: [252, Ft, Ft, [], [0, 2], !1]
}, dp = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], hp = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Ai = {
  redeemScript: [0, !1, Ft, [], [0, 2], !1],
  witnessScript: [1, !1, Ft, [], [0, 2], !1],
  bip32Derivation: [2, ma, Yi, [], [0, 2], !1],
  amount: [3, !1, Wh, [2], [2], !0],
  script: [4, !1, Ft, [2], [2], !0],
  tapInternalKey: [5, !1, ki, [], [0, 2], !1],
  tapTree: [6, !1, lp, [], [0, 2], !1],
  tapBip32Derivation: [7, ki, cl, [], [0, 2], !1],
  proprietary: [252, Ft, Ft, [], [0, 2], !1]
}, pp = [], Bu = xe(Xf, ne({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Xh(Fe, ne({ type: Fe, key: Dt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Dt(Fe)
}));
function ba(t) {
  const [e, n, r, o, s, c] = t;
  return { type: e, kc: n, vc: r, reqInc: o, allowInc: s, silentIgnore: c };
}
ne({ type: Fe, key: Dt(null) });
function cc(t) {
  const e = {};
  for (const n in t) {
    const [r, o, s] = t[n];
    e[r] = [n, o, s];
  }
  return Te({
    encodeStream: (n, r) => {
      let o = [];
      for (const s in t) {
        const c = r[s];
        if (c === void 0)
          continue;
        const [u, l, p] = t[s];
        if (!l)
          o.push({ key: { type: u, key: Mt }, value: p.encode(c) });
        else {
          const h = c.map(([y, m]) => [
            l.encode(y),
            p.encode(m)
          ]);
          h.sort((y, m) => Si(y[0], m[0]));
          for (const [y, m] of h)
            o.push({ key: { key: y, type: u }, value: m });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, c) => Si(s[0].key, c[0].key));
        for (const [s, c] of r.unknown)
          o.push({ key: s, value: c });
      }
      Bu.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = Bu.decodeStream(n), o = {}, s = {};
      for (const c of r) {
        let u = "unknown", l = c.key.key, p = c.value;
        if (e[c.key.type]) {
          const [h, y, m] = e[c.key.type];
          if (u = h, !y && l.length)
            throw new Error(`PSBT: Non-empty key for ${u} (key=${nt.encode(l)} value=${nt.encode(p)}`);
          if (l = y ? y.decode(l) : void 0, p = m.decode(p), !y) {
            if (o[u])
              throw new Error(`PSBT: Same keys: ${u} (key=${l} value=${p})`);
            o[u] = p, s[u] = !0;
            continue;
          }
        } else
          l = { type: c.key.type, key: c.key.key };
        if (s[u])
          throw new Error(`PSBT: Key type with empty key and no key=${u} val=${p}`);
        o[u] || (o[u] = []), o[u].push([l, p]);
      }
      return o;
    }
  });
}
const uc = Se(cc(Zi), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      Sr(e, ye.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Sr(e, ye.ecdsa);
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
}), fc = Se(cc(Ai), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      Sr(e, ye.ecdsa);
  return t;
}), ul = Se(cc(ac), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), gp = ne({
  magic: ec(tc(new Uint8Array([255])), "psbt"),
  global: ul,
  inputs: xe("global/unsignedTx/inputs/length", uc),
  outputs: xe(null, fc)
}), yp = ne({
  magic: ec(tc(new Uint8Array([255])), "psbt"),
  global: ul,
  inputs: xe("global/inputCount", uc),
  outputs: xe("global/outputCount", fc)
});
ne({
  magic: ec(tc(new Uint8Array([255])), "psbt"),
  items: xe(null, Un(xe(Xf, ep([Qh(Fe), Dt(Wi)])), zi.dict()))
});
function Hs(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: o } = ba(e[r]);
    if (!o.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: o } = ba(e[r]);
    if (o.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function _u(t, e, n) {
  const r = {};
  for (const o in n) {
    const s = o;
    if (s !== "unknown") {
      if (!e[s])
        continue;
      const { allowInc: c, silentIgnore: u } = ba(e[s]);
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
function fl(t) {
  const e = t && t.global && t.global.version || 0;
  Hs(e, ac, t.global);
  for (const c of t.inputs)
    Hs(e, Zi, c);
  for (const c of t.outputs)
    Hs(e, Ai, c);
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
function va(t, e, n, r, o) {
  const s = { ...n, ...e };
  for (const c in t) {
    const u = c, [l, p, h] = t[u], y = r && !r.includes(c);
    if (e[c] === void 0 && c in e) {
      if (y)
        throw new Error(`Cannot remove signed field=${c}`);
      delete s[c];
    } else if (p) {
      const m = n && n[c] ? n[c] : [];
      let v = e[u];
      if (v) {
        if (!Array.isArray(v))
          throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
        v = v.map((L) => {
          if (L.length !== 2)
            throw new Error(`keyMap(${c}): KV pairs should be [k, v][]`);
          return [
            typeof L[0] == "string" ? p.decode(nt.decode(L[0])) : L[0],
            typeof L[1] == "string" ? h.decode(nt.decode(L[1])) : L[1]
          ];
        });
        const S = {}, _ = (L, z, Z) => {
          if (S[L] === void 0) {
            S[L] = [z, Z];
            return;
          }
          const W = nt.encode(h.encode(S[L][1])), H = nt.encode(h.encode(Z));
          if (W !== H)
            throw new Error(`keyMap(${u}): same key=${L} oldVal=${W} newVal=${H}`);
        };
        for (const [L, z] of m) {
          const Z = nt.encode(p.encode(L));
          _(Z, L, z);
        }
        for (const [L, z] of v) {
          const Z = nt.encode(p.encode(L));
          if (z === void 0) {
            if (y)
              throw new Error(`Cannot remove signed field=${u}/${L}`);
            delete S[Z];
          } else
            _(Z, L, z);
        }
        s[u] = Object.values(S);
      }
    } else if (typeof s[c] == "string")
      s[c] = h.decode(nt.decode(s[c]));
    else if (y && c in e && n && n[c] !== void 0 && !qt(h.encode(e[c]), h.encode(n[c])))
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
const Nu = Se(gp, fl), Uu = Se(yp, fl), wp = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Pt(t[1]) || nt.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: Et.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, nt.decode("4e73")];
  }
};
function hr(t, e) {
  try {
    return Sr(t, e), !0;
  } catch {
    return !1;
  }
}
const mp = {
  encode(t) {
    if (!(t.length !== 2 || !Pt(t[0]) || !hr(t[0], ye.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, bp = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !Pt(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, vp = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !Pt(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, Ep = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Pt(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, xp = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !Pt(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Sp = {
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
        if (!Pt(s))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, Tp = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !Pt(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, kp = {
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
      if (!Pt(o))
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
}, Ap = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = ip(t[e - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < e - 1; o++) {
        const s = t[o];
        if (o & 1) {
          if (s !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!Pt(s))
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
}, Ip = {
  encode(t) {
    return { type: "unknown", script: Et.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? Et.decode(t.script) : void 0
}, Bp = [
  wp,
  mp,
  bp,
  vp,
  Ep,
  xp,
  Sp,
  Tp,
  kp,
  Ap,
  Ip
], _p = Un(Et, zi.match(Bp)), Wt = Se(_p, (t) => {
  if (t.type === "pk" && !hr(t.pubkey, ye.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!Pt(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!Pt(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!Pt(t.pubkey) || !hr(t.pubkey, ye.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!hr(n, ye.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!hr(e, ye.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function Cu(t, e) {
  if (!qt(t.hash, Gt(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = Wt.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function ll(t, e, n) {
  if (t) {
    const r = Wt.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!qt(r.hash, ol(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = Wt.decode(e);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Cu(r, n);
  }
  if (e) {
    const r = Wt.decode(e);
    r.type === "wsh" && n && Cu(r, n);
  }
}
function Np(t) {
  const e = {};
  for (const n of t) {
    const r = nt.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(nt.encode)}`);
    e[r] = !0;
  }
}
function Up(t, e, n = !1, r) {
  const o = Wt.decode(t);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const s = o;
  if (!n && s.pubkeys)
    for (const c of s.pubkeys) {
      if (qt(c, oc))
        throw new Error("Unspendable taproot key in leaf script");
      if (qt(c, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function dl(t) {
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
function Ea(t, e = []) {
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
    left: Ea(t.left, [t.right.hash, ...e]),
    right: Ea(t.right, [t.left.hash, ...e])
  };
}
function xa(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...xa(t.left), ...xa(t.right)];
}
function Sa(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: l, script: p } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !qt(t.tapMerkleRoot, Mt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const h = typeof p == "string" ? nt.decode(p) : p;
    if (!Pt(h))
      throw new Error(`checkScript: wrong script type=${h}`);
    return Up(h, e, n), {
      type: "leaf",
      version: l,
      script: h,
      hash: Jr(h, l)
    };
  }
  if (t.length !== 2 && (t = dl(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Sa(t[0], e, n), s = Sa(t[1], e, n);
  let [c, u] = [o.hash, s.hash];
  return Si(u, c) === -1 && ([c, u] = [u, c]), { type: "branch", left: o, right: s, hash: rc("TapBranch", c, u) };
}
const Ii = 192, Jr = (t, e = Ii) => rc("TapLeaf", new Uint8Array([e]), De.encode(t));
function Cp(t, e, n = Tr, r = !1, o) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof t == "string" ? nt.decode(t) : t || oc;
  if (!hr(s, ye.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (e) {
    let c = Ea(Sa(e, s, r));
    const u = c.hash, [l, p] = wa(s, u), h = xa(c).map((y) => ({
      ...y,
      controlBlock: dn.encode({
        version: (y.version || Ii) + p,
        internalKey: s,
        merklePath: y.path
      })
    }));
    return {
      type: "tr",
      script: Wt.encode({ type: "tr", pubkey: l }),
      address: tr(n).encode({ type: "tr", pubkey: l }),
      // For tests
      tweakedPubkey: l,
      // PSBT stuff
      tapInternalKey: s,
      leaves: h,
      tapLeafScript: h.map((y) => [
        dn.decode(y.controlBlock),
        An(y.script, new Uint8Array([y.version || Ii]))
      ]),
      tapMerkleRoot: u
    };
  } else {
    const c = wa(s, Mt)[0];
    return {
      type: "tr",
      script: Wt.encode({ type: "tr", pubkey: c }),
      address: tr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function Rp(t, e, n = !1) {
  return n || Np(e), {
    type: "tr_ms",
    script: Wt.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const hl = Ph(Gt);
function pl(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function js(t, e, n = Tr) {
  pl(t, e);
  const r = t === 0 ? ga : lr;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Ru(t, e) {
  return hl.encode(An(Uint8Array.from(e), t));
}
function tr(t = Tr) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return js(0, e.hash, t);
      if (n === "wsh")
        return js(0, e.hash, t);
      if (n === "tr")
        return js(1, e.pubkey, t);
      if (n === "pkh")
        return Ru(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Ru(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = ga.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = lr.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...s] = r.words, c = ga.fromWords(s);
        if (pl(o, c), o === 0 && c.length === 32)
          return { type: "wsh", hash: c };
        if (o === 0 && c.length === 20)
          return { type: "wpkh", hash: c };
        if (o === 1 && c.length === 32)
          return { type: "tr", pubkey: c };
        throw new Error("Unknown witness program");
      }
      const n = hl.decode(e);
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
const ri = new Uint8Array(32), Op = {
  amount: 0xffffffffffffffffn,
  script: Mt
}, $p = (t) => Math.ceil(t / 4), Pp = 8, Lp = 2, Fn = 0, lc = 4294967295;
zi.decimal(Pp);
const to = (t, e) => t === void 0 ? e : t;
function Bi(t) {
  if (Array.isArray(t))
    return t.map((e) => Bi(e));
  if (Pt(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Bi(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var $t;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})($t || ($t = {}));
var gn;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(gn || (gn = {}));
function Dp(t, e, n, r = Mt) {
  return qt(n, e) && (t = op(t, r), e = nc(t)), { privKey: t, pubKey: e };
}
function qn(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function qr(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: to(t.sequence, lc),
    finalScriptSig: to(t.finalScriptSig, Mt)
  };
}
function Fs(t) {
  for (const e in t) {
    const n = e;
    dp.includes(n) || delete t[n];
  }
}
const qs = ne({ txid: Dt(32, !0), index: Ut });
function Kp(t) {
  if (typeof t != "number" || typeof gn[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Ou(t) {
  const e = t & 31;
  return {
    isAny: !!(t & $t.ANYONECANPAY),
    isNone: e === $t.NONE,
    isSingle: e === $t.SINGLE
  };
}
function Mp(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: to(t.version, Lp),
    lockTime: to(t.lockTime, 0),
    PSBTVersion: to(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (Ut.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
function $u(t) {
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!qt(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (t.txid) {
      if (t.nonWitnessUtxo.outputs.length - 1 < t.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const o = se.fromRaw(gr.encode(t.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = nt.encode(t.txid);
      if (o.isFinal && o.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${o.id}`);
    }
  }
  return t;
}
function li(t) {
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
function Pu(t, e, n, r = !1, o = !1) {
  let { nonWitnessUtxo: s, txid: c } = t;
  typeof s == "string" && (s = nt.decode(s)), Pt(s) && (s = gr.decode(s)), !("nonWitnessUtxo" in t) && s === void 0 && (s = e == null ? void 0 : e.nonWitnessUtxo), typeof c == "string" && (c = nt.decode(c)), c === void 0 && (c = e == null ? void 0 : e.txid);
  let u = { ...e, ...t, nonWitnessUtxo: s, txid: c };
  !("nonWitnessUtxo" in t) && u.nonWitnessUtxo === void 0 && delete u.nonWitnessUtxo, u.sequence === void 0 && (u.sequence = lc), u.tapMerkleRoot === null && delete u.tapMerkleRoot, u = va(Zi, u, e, n, o), uc.encode(u);
  let l;
  return u.nonWitnessUtxo && u.index !== void 0 ? l = u.nonWitnessUtxo.outputs[u.index] : u.witnessUtxo && (l = u.witnessUtxo), l && !r && ll(l && l.script, u.redeemScript, u.witnessScript), u;
}
function Lu(t, e = !1) {
  let n = "legacy", r = $t.ALL;
  const o = li(t), s = Wt.decode(o.script);
  let c = s.type, u = s;
  const l = [s];
  if (s.type === "tr")
    return r = $t.DEFAULT, {
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
      let m = Wt.decode(t.redeemScript);
      (m.type === "wpkh" || m.type === "wsh") && (n = "segwit"), l.push(m), u = m, c += `-${m.type}`;
    }
    if (u.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let m = Wt.decode(t.witnessScript);
      m.type === "wsh" && (n = "segwit"), l.push(m), u = m, c += `-${m.type}`;
    }
    const p = l[l.length - 1];
    if (p.type === "sh" || p.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const h = Wt.encode(p), y = {
      type: c,
      txType: n,
      last: p,
      lastScript: h,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return y;
  }
}
class se {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = Mp(e);
    n.lockTime !== Fn && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = gr.decode(e), o = new se({ ...n, version: r.version, lockTime: r.lockTime });
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
      r = Nu.decode(e);
    } catch (y) {
      try {
        r = Uu.decode(e);
      } catch {
        throw y;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const s = r.global.unsignedTx, c = o === 0 ? s == null ? void 0 : s.version : r.global.txVersion, u = o === 0 ? s == null ? void 0 : s.lockTime : r.global.fallbackLocktime, l = new se({ ...n, version: c, lockTime: u, PSBTVersion: o }), p = o === 0 ? s == null ? void 0 : s.inputs.length : r.global.inputCount;
    l.inputs = r.inputs.slice(0, p).map((y, m) => {
      var v;
      return $u({
        finalScriptSig: Mt,
        ...(v = r.global.unsignedTx) == null ? void 0 : v.inputs[m],
        ...y
      });
    });
    const h = o === 0 ? s == null ? void 0 : s.outputs.length : r.global.outputCount;
    return l.outputs = r.outputs.slice(0, h).map((y, m) => {
      var v;
      return {
        ...y,
        ...(v = r.global.unsignedTx) == null ? void 0 : v.outputs[m]
      };
    }), l.global = { ...r.global, txVersion: c }, u !== Fn && (l.global.fallbackLocktime = u), l;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((s) => $u(_u(e, Zi, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => _u(e, Ai, s)), o = { ...this.global };
    return e === 0 ? (o.unsignedTx = Wr.decode(Wr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(qr).map((s) => ({
        ...s,
        finalScriptSig: Mt
      })),
      outputs: this.outputs.map(qn)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = e, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Fn && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Nu : Uu).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Fn, n = 0, r = Fn, o = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (e = Math.max(e, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), o++);
    return n && n >= o ? e : r !== Fn ? r : this.global.fallbackLocktime || Fn;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? $t.DEFAULT : n, o = r === $t.DEFAULT ? $t.ALL : r & 3;
    return { sigInputs: r & $t.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], o = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: u, sigOutputs: l } = this.inputSighash(s);
      if (u === $t.ANYONECANPAY ? r.push(s) : e = !1, l === $t.ALL)
        n = !1;
      else if (l === $t.SINGLE)
        o.push(s);
      else if (l !== $t.NONE) throw new Error(`Wrong signature hash output type: ${l}`);
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
    const n = this.outputs.map(qn);
    e += 4 * Fe.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * De.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Fe.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * De.encode(r.finalScriptSig || Mt).length, this.hasWitnesses && r.finalScriptWitness && (e += sc.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return $p(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return gr.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(qr).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Mt
      })),
      outputs: this.outputs.map(qn),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return nt.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return nt.encode(fe(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return nt.encode(fe(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Bi(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Pu(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let o;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(e)) && (o = hp);
    }
    this.inputs[e] = Pu(n, this.inputs[e], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Bi(this.outputs[e]);
  }
  getOutputAddress(e, n = Tr) {
    const r = this.getOutput(e);
    if (r.script)
      return tr(n).encode(Wt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: o, script: s } = e;
    if (o === void 0 && (o = n == null ? void 0 : n.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof s == "string" && (s = nt.decode(s)), s === void 0 && (s = n == null ? void 0 : n.script);
    let c = { ...n, ...e, amount: o, script: s };
    if (c.amount === void 0 && delete c.amount, c = va(Ai, c, n, r, this.opts.allowUnknown), fc.encode(c), c.script && !this.opts.allowUnknownOutputs && Wt.decode(c.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || ll(c.script, c.redeemScript, c.witnessScript), c;
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
      (!s.addOutput || s.outputs.includes(e)) && (o = pp);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], o);
  }
  addOutputAddress(e, n, r = Tr) {
    return this.addOutput({ script: Wt.encode(tr(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const o = li(r);
      if (!o)
        throw new Error("Empty input amount");
      e += o.amount;
    }
    const n = this.outputs.map(qn);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: o, isNone: s, isSingle: c } = Ou(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (c && e >= this.outputs.length || e >= this.inputs.length)
      return nl.encode(1n);
    n = Et.encode(Et.decode(n).filter((h) => h !== "CODESEPARATOR"));
    let u = this.inputs.map(qr).map((h, y) => ({
      ...h,
      finalScriptSig: y === e ? n : Mt
    }));
    o ? u = [u[e]] : (s || c) && (u = u.map((h, y) => ({
      ...h,
      sequence: y === e ? h.sequence : 0
    })));
    let l = this.outputs.map(qn);
    s ? l = [] : c && (l = l.slice(0, e).fill(Op).concat([l[e]]));
    const p = gr.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: u,
      outputs: l
    });
    return fe(p, dr.encode(r));
  }
  preimageWitnessV0(e, n, r, o) {
    const { isAny: s, isNone: c, isSingle: u } = Ou(r);
    let l = ri, p = ri, h = ri;
    const y = this.inputs.map(qr), m = this.outputs.map(qn);
    s || (l = fe(...y.map(qs.encode))), !s && !u && !c && (p = fe(...y.map((S) => Ut.encode(S.sequence)))), !u && !c ? h = fe(...m.map(Yn.encode)) : u && e < m.length && (h = fe(Yn.encode(m[e])));
    const v = y[e];
    return fe(dr.encode(this.version), l, p, Dt(32, !0).encode(v.txid), Ut.encode(v.index), De.encode(n), fi.encode(o), Ut.encode(v.sequence), h, Ut.encode(this.lockTime), Ut.encode(r));
  }
  preimageWitnessV1(e, n, r, o, s = -1, c, u = 192, l) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const p = [
      Bn.encode(0),
      Bn.encode(r),
      // U8 sigHash
      dr.encode(this.version),
      Ut.encode(this.lockTime)
    ], h = r === $t.DEFAULT ? $t.ALL : r & 3, y = r & $t.ANYONECANPAY, m = this.inputs.map(qr), v = this.outputs.map(qn);
    y !== $t.ANYONECANPAY && p.push(...[
      m.map(qs.encode),
      o.map(fi.encode),
      n.map(De.encode),
      m.map((_) => Ut.encode(_.sequence))
    ].map((_) => Gt(An(..._)))), h === $t.ALL && p.push(Gt(An(...v.map(Yn.encode))));
    const S = (l ? 1 : 0) | (c ? 2 : 0);
    if (p.push(new Uint8Array([S])), y === $t.ANYONECANPAY) {
      const _ = m[e];
      p.push(qs.encode(_), fi.encode(o[e]), De.encode(n[e]), Ut.encode(_.sequence));
    } else
      p.push(Ut.encode(e));
    return S & 1 && p.push(Gt(De.encode(l || Mt))), h === $t.SINGLE && p.push(e < v.length ? Gt(Yn.encode(v[e])) : ri), c && p.push(Jr(c, u), Bn.encode(0), dr.encode(s)), rc("TapSighash", ...p);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, o) {
    this.checkInputIdx(n);
    const s = this.inputs[n], c = Lu(s, this.opts.allowLegacyWitnessUtxo);
    if (!Pt(e)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const h = s.bip32Derivation.filter((m) => m[1].fingerprint == e.fingerprint).map(([m, { path: v }]) => {
        let S = e;
        for (const _ of v)
          S = S.deriveChild(_);
        if (!qt(S.publicKey, m))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!S.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return S;
      });
      if (!h.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let y = !1;
      for (const m of h)
        this.signIdx(m.privateKey, n) && (y = !0);
      return y;
    }
    r ? r.forEach(Kp) : r = [c.defaultSighash];
    const u = c.sighash;
    if (!r.includes(u))
      throw new Error(`Input with not allowed sigHash=${u}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: l } = this.inputSighash(n);
    if (l === $t.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const p = li(s);
    if (c.txType === "taproot") {
      const h = this.inputs.map(li), y = h.map((L) => L.script), m = h.map((L) => L.amount);
      let v = !1, S = nc(e), _ = s.tapMerkleRoot || Mt;
      if (s.tapInternalKey) {
        const { pubKey: L, privKey: z } = Dp(e, S, s.tapInternalKey, _), [Z, W] = wa(s.tapInternalKey, _);
        if (qt(Z, L)) {
          const H = this.preimageWitnessV1(n, y, u, m), $ = An(Tu(H, z, o), u !== $t.DEFAULT ? new Uint8Array([u]) : Mt);
          this.updateInput(n, { tapKeySig: $ }, !0), v = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [L, z] of s.tapLeafScript) {
          const Z = z.subarray(0, -1), W = Et.decode(Z), H = z[z.length - 1], $ = Jr(Z, H);
          if (W.findIndex((F) => Pt(F) && qt(F, S)) === -1)
            continue;
          const T = this.preimageWitnessV1(n, y, u, m, void 0, Z, H), ut = An(Tu(T, e, o), u !== $t.DEFAULT ? new Uint8Array([u]) : Mt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: S, leafHash: $ }, ut]] }, !0), v = !0;
        }
      }
      if (!v)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const h = np(e);
      let y = !1;
      const m = ol(h);
      for (const _ of Et.decode(c.lastScript))
        Pt(_) && (qt(_, h) || qt(_, m)) && (y = !0);
      if (!y)
        throw new Error(`Input script doesn't have pubKey: ${c.lastScript}`);
      let v;
      if (c.txType === "legacy")
        v = this.preimageLegacy(n, c.lastScript, u);
      else if (c.txType === "segwit") {
        let _ = c.lastScript;
        c.last.type === "wpkh" && (_ = Wt.encode({ type: "pkh", hash: c.last.hash })), v = this.preimageWitnessV0(n, _, u, p.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${c.txType}`);
      const S = rp(v, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[h, An(S, new Uint8Array([u]))]]
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
    const n = this.inputs[e], r = Lu(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const l = n.tapLeafScript.sort((p, h) => dn.encode(p[0]).length - dn.encode(h[0]).length);
        for (const [p, h] of l) {
          const y = h.slice(0, -1), m = h[h.length - 1], v = Wt.decode(y), S = Jr(y, m), _ = n.tapScriptSig.filter((z) => qt(z[0].leafHash, S));
          let L = [];
          if (v.type === "tr_ms") {
            const z = v.m, Z = v.pubkeys;
            let W = 0;
            for (const H of Z) {
              const $ = _.findIndex((rt) => qt(rt[0].pubKey, H));
              if (W === z || $ === -1) {
                L.push(Mt);
                continue;
              }
              L.push(_[$][1]), W++;
            }
            if (W !== z)
              continue;
          } else if (v.type === "tr_ns") {
            for (const z of v.pubkeys) {
              const Z = _.findIndex((W) => qt(W[0].pubKey, z));
              Z !== -1 && L.push(_[Z][1]);
            }
            if (L.length !== v.pubkeys.length)
              continue;
          } else if (v.type === "unknown" && this.opts.allowUnknownInputs) {
            const z = Et.decode(y);
            if (L = _.map(([{ pubKey: Z }, W]) => {
              const H = z.findIndex(($) => Pt($) && qt($, Z));
              if (H === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: W, pos: H };
            }).sort((Z, W) => Z.pos - W.pos).map((Z) => Z.signature), !L.length)
              continue;
          } else {
            const z = this.opts.customScripts;
            if (z)
              for (const Z of z) {
                if (!Z.finalizeTaproot)
                  continue;
                const W = Et.decode(y), H = Z.encode(W);
                if (H === void 0)
                  continue;
                const $ = Z.finalizeTaproot(y, H, _);
                if ($) {
                  n.finalScriptWitness = $.concat(dn.encode(p)), n.finalScriptSig = Mt, Fs(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = L.reverse().concat([y, dn.encode(p)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Mt, Fs(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = Mt, s = [];
    if (r.last.type === "ms") {
      const l = r.last.m, p = r.last.pubkeys;
      let h = [];
      for (const y of p) {
        const m = n.partialSig.find((v) => qt(y, v[0]));
        m && h.push(m[1]);
      }
      if (h = h.slice(0, l), h.length !== l)
        throw new Error(`Multisig: wrong signatures count, m=${l} n=${p.length} signatures=${h.length}`);
      o = Et.encode([0, ...h]);
    } else if (r.last.type === "pk")
      o = Et.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = Et.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = Mt, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let c, u;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (s = Et.decode(o).map((l) => {
      if (l === 0)
        return Mt;
      if (Pt(l))
        return l;
      throw new Error(`Wrong witness op=${l}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (u = s), r.type.startsWith("sh-wsh-") ? c = Et.encode([Et.encode([0, Gt(r.lastScript)])]) : r.type.startsWith("sh-") ? c = Et.encode([...Et.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (c = o), !c && !u)
      throw new Error("Unknown error finalizing input");
    c && (n.finalScriptSig = c), u && (n.finalScriptWitness = u), Fs(n);
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
    const n = this.global.unsignedTx ? Wr.encode(this.global.unsignedTx) : Mt, r = e.global.unsignedTx ? Wr.encode(e.global.unsignedTx) : Mt;
    if (!qt(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = va(ac, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, e.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, e.outputs[o], !0);
    return this;
  }
  clone() {
    return se.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
class gl extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: yl, pointToBytes: oi } = Je.utils, Cn = Qe.ProjectivePoint, en = 33, Ta = new Uint8Array(en), In = Qe.CURVE.n, Du = Un(Dt(33), {
  decode: (t) => dc(t) ? Ta : t.toRawBytes(!0),
  encode: (t) => so(t, Ta) ? Cn.ZERO : Cn.fromHex(t)
}), Ku = Se(nl, (t) => (Qn("n", t, 1n, In), t)), di = ne({ R1: Du, R2: Du }), wl = ne({ k1: Ku, k2: Ku, publicKey: Dt(en) });
function Mu(t, ...e) {
}
function Ke(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Zt(n, ...e));
}
function Vu(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Me = (t) => le(t, In), _i = (t, ...e) => Me(He(yl(t, ...e))), zr = (t, e) => t.hasEvenY() ? e : Me(-e);
function Zn(t) {
  return Cn.BASE.multiply(t);
}
function dc(t) {
  return t.equals(Cn.ZERO);
}
function ka(t) {
  return Ke(t, en), t.sort(Si);
}
function ml(t) {
  Ke(t, en);
  for (let e = 1; e < t.length; e++)
    if (!so(t[e], t[0]))
      return t[e];
  return Ta;
}
function bl(t) {
  return Ke(t, en), yl("KeyAgg list", ...t);
}
function vl(t, e, n) {
  return Zt(t, en), Zt(e, en), so(t, e) ? 1n : _i("KeyAgg coefficient", n, t);
}
function Aa(t, e = [], n = []) {
  if (Ke(t, en), Ke(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = ml(t), o = bl(t);
  let s = Cn.ZERO;
  for (let l = 0; l < t.length; l++) {
    let p;
    try {
      p = Cn.fromHex(t[l]);
    } catch {
      throw new gl(l, "pubkey");
    }
    s = s.add(p.multiply(vl(t[l], r, o)));
  }
  let c = 1n, u = 0n;
  for (let l = 0; l < e.length; l++) {
    const p = n[l] && !s.hasEvenY() ? Me(-1n) : 1n, h = He(e[l]);
    if (Qn("tweak", h, 0n, In), s = s.multiply(p).add(Zn(h)), dc(s))
      throw new Error("The result of tweaking cannot be infinity");
    c = Me(p * c), u = Me(h + p * u);
  }
  return { aggPublicKey: s, gAcc: c, tweakAcc: u };
}
const Hu = (t, e, n, r, o, s) => _i("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, o, _n(s.length, 4), s, new Uint8Array([r]));
function Vp(t, e, n = new Uint8Array(0), r, o = new Uint8Array(0), s = vo(32)) {
  Zt(t, en), Mu(e, 32), Zt(n, 0, 32), Mu(), Zt(o), Zt(s, 32);
  const c = new Uint8Array([0]), u = Hu(s, t, n, 0, c, o), l = Hu(s, t, n, 1, c, o);
  return {
    secret: wl.encode({ k1: u, k2: l, publicKey: t }),
    public: di.encode({ R1: Zn(u), R2: Zn(l) })
  };
}
class Hp {
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
    if (Ke(n, 33), Ke(o, 32), Vu(s), Zt(r), o.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: c, gAcc: u, tweakAcc: l } = Aa(n, o, s), { R1: p, R2: h } = di.decode(e);
    this.publicKeys = n, this.Q = c, this.gAcc = u, this.tweakAcc = l, this.b = _i("MuSig/noncecoef", e, oi(c), r);
    const y = p.add(h.multiply(this.b));
    this.R = dc(y) ? Cn.BASE : y, this.e = _i("BIP0340/challenge", oi(this.R), oi(c), r), this.tweaks = o, this.isXonly = s, this.L = bl(n), this.secondKey = ml(n);
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
    if (!n.some((s) => so(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return vl(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: o, gAcc: s, b: c, R: u, e: l } = this, p = He(e);
    if (p >= In)
      return !1;
    const { R1: h, R2: y } = di.decode(n), m = h.add(y.multiply(c)), v = u.hasEvenY() ? m : m.negate(), S = Cn.fromHex(r), _ = this.getSessionKeyAggCoeff(S), L = Me(zr(o, 1n) * s), z = Zn(p), Z = v.add(S.multiply(Me(l * _ * L)));
    return z.equals(Z);
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
    if (Zt(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: s, b: c, R: u, e: l } = this, { k1: p, k2: h, publicKey: y } = wl.decode(e);
    e.fill(0, 0, 64), Qn("k1", p, 0n, In), Qn("k2", h, 0n, In);
    const m = zr(u, p), v = zr(u, h), S = He(n);
    Qn("d_", S, 1n, In);
    const _ = Zn(S), L = _.toRawBytes(!0);
    if (!so(L, y))
      throw new Error("Public key does not match nonceGen argument");
    const z = this.getSessionKeyAggCoeff(_), Z = zr(o, 1n), W = Me(Z * s * S), H = Me(m + c * v + l * z * W), $ = _n(H, 32);
    if (!r) {
      const rt = di.encode({
        R1: Zn(p),
        R2: Zn(h)
      });
      if (!this.partialSigVerifyInternal($, rt, L))
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
  partialSigVerify(e, n, r) {
    const { publicKeys: o, tweaks: s, isXonly: c } = this;
    if (Zt(e, 32), Ke(n, 66), Ke(o, en), Ke(s, 32), Vu(c), oo(r), n.length !== o.length)
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
    Ke(e, 32);
    const { Q: n, tweakAcc: r, R: o, e: s } = this;
    let c = 0n;
    for (let l = 0; l < e.length; l++) {
      const p = He(e[l]);
      if (p >= In)
        throw new gl(l, "psig");
      c = Me(c + p);
    }
    const u = zr(n, 1n);
    return c = Me(c + s * u * r), Ve(oi(o), _n(c, 32));
  }
}
function jp(t) {
  const e = Vp(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hc = /* @__PURE__ */ BigInt(0), Ia = /* @__PURE__ */ BigInt(1);
function To(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function pc(t) {
  if (!To(t))
    throw new Error("Uint8Array expected");
}
function co(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
function ii(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function El(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? hc : BigInt("0x" + t);
}
const xl = (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function"
), Fp = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function uo(t) {
  if (pc(t), xl)
    return t.toHex();
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Fp[t[n]];
  return e;
}
const sn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function ju(t) {
  if (t >= sn._0 && t <= sn._9)
    return t - sn._0;
  if (t >= sn.A && t <= sn.F)
    return t - (sn.A - 10);
  if (t >= sn.a && t <= sn.f)
    return t - (sn.a - 10);
}
function Ni(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  if (xl)
    return Uint8Array.fromHex(t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, s = 0; o < n; o++, s += 2) {
    const c = ju(t.charCodeAt(s)), u = ju(t.charCodeAt(s + 1));
    if (c === void 0 || u === void 0) {
      const l = t[s] + t[s + 1];
      throw new Error('hex string expected, got non-hex character "' + l + '" at index ' + s);
    }
    r[o] = c * 16 + u;
  }
  return r;
}
function Xe(t) {
  return El(uo(t));
}
function Sl(t) {
  return pc(t), El(uo(Uint8Array.from(t).reverse()));
}
function er(t, e) {
  return Ni(t.toString(16).padStart(e * 2, "0"));
}
function Tl(t, e) {
  return er(t, e).reverse();
}
function oe(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Ni(e);
    } catch (s) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + s);
    }
  else if (To(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function kr(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    pc(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const s = t[r];
    n.set(s, o), o += s.length;
  }
  return n;
}
const zs = (t) => typeof t == "bigint" && hc <= t;
function fo(t, e, n) {
  return zs(t) && zs(e) && zs(n) && e <= t && t < n;
}
function Jn(t, e, n, r) {
  if (!fo(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function qp(t) {
  let e;
  for (e = 0; t > hc; t >>= Ia, e += 1)
    ;
  return e;
}
const Xi = (t) => (Ia << BigInt(t)) - Ia, Gs = (t) => new Uint8Array(t), Fu = (t) => Uint8Array.from(t);
function zp(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Gs(t), o = Gs(t), s = 0;
  const c = () => {
    r.fill(1), o.fill(0), s = 0;
  }, u = (...y) => n(o, r, ...y), l = (y = Gs(0)) => {
    o = u(Fu([0]), y), r = u(), y.length !== 0 && (o = u(Fu([1]), y), r = u());
  }, p = () => {
    if (s++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let y = 0;
    const m = [];
    for (; y < e; ) {
      r = u();
      const v = r.slice();
      m.push(v), y += r.length;
    }
    return kr(...m);
  };
  return (y, m) => {
    c(), l(y);
    let v;
    for (; !(v = m(p())); )
      l();
    return c(), v;
  };
}
const Gp = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || To(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Qi(t, e, n = {}) {
  const r = (o, s, c) => {
    const u = Gp[s];
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
function qu(t) {
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
const gc = 2n ** 256n, yr = gc - 0x1000003d1n, kl = gc - 0x14551231950b75fc4402da1732fc9bebfn, Wp = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, Yp = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, yc = {
  n: kl,
  a: 0n,
  b: 7n
}, eo = 32, zu = (t) => yt(yt(t * t) * t + yc.b), de = (t = "") => {
  throw new Error(t);
}, Ji = (t) => typeof t == "bigint", Al = (t) => typeof t == "string", Ws = (t) => Ji(t) && 0n < t && t < yr, Il = (t) => Ji(t) && 0n < t && t < kl, Zp = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", Ba = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Zp(t) || typeof e == "number" && e > 0 && t.length !== e ? de("Uint8Array expected") : t
), Bl = (t) => new Uint8Array(t), _l = (t, e) => Ba(Al(t) ? wc(t) : Bl(Ba(t)), e), yt = (t, e = yr) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, Gu = (t) => t instanceof Ar ? t : de("Point expected");
let Ar = class fr {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? Yr : new fr(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = _l(e);
    let n;
    const r = e[0], o = e.subarray(1), s = Yu(o, 0, eo), c = e.length;
    if (c === 33 && [2, 3].includes(r)) {
      Ws(s) || de("Point hex invalid: x not FE");
      let u = Jp(zu(s));
      const l = (u & 1n) === 1n;
      (r & 1) === 1 !== l && (u = yt(-u)), n = new fr(s, u, 1n);
    }
    return c === 65 && r === 4 && (n = new fr(s, Yu(o, eo, 2 * eo), 1n)), n ? n.ok() : de("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return no.mul(tg(e));
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Gu(e), l = yt(n * u), p = yt(s * o), h = yt(r * u), y = yt(c * o);
    return l === p && h === y;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new fr(this.px, yt(-this.py), this.pz);
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
    const { px: n, py: r, pz: o } = this, { px: s, py: c, pz: u } = Gu(e), { a: l, b: p } = yc;
    let h = 0n, y = 0n, m = 0n;
    const v = yt(p * 3n);
    let S = yt(n * s), _ = yt(r * c), L = yt(o * u), z = yt(n + r), Z = yt(s + c);
    z = yt(z * Z), Z = yt(S + _), z = yt(z - Z), Z = yt(n + o);
    let W = yt(s + u);
    return Z = yt(Z * W), W = yt(S + L), Z = yt(Z - W), W = yt(r + o), h = yt(c + u), W = yt(W * h), h = yt(_ + L), W = yt(W - h), m = yt(l * Z), h = yt(v * L), m = yt(h + m), h = yt(_ - m), m = yt(_ + m), y = yt(h * m), _ = yt(S + S), _ = yt(_ + S), L = yt(l * L), Z = yt(v * Z), _ = yt(_ + L), L = yt(S - L), L = yt(l * L), Z = yt(Z + L), S = yt(_ * Z), y = yt(y + S), S = yt(W * Z), h = yt(z * h), h = yt(h - S), S = yt(z * _), m = yt(W * m), m = yt(m + S), new fr(h, y, m);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return Yr;
    if (Il(e) || de("scalar invalid"), this.equals(no))
      return ng(e).p;
    let r = Yr, o = no;
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
    if (this.equals(Yr))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const o = Qp(r, yr);
    return yt(r * o) !== 1n && de("inverse invalid"), { x: yt(e * o), y: yt(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!Ws(e) || !Ws(n)) && de("Point invalid: x or y"), yt(n * n) === zu(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : de("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + Zu(n) + (e ? "" : Zu(r));
  }
  toRawBytes(e = !0) {
    return wc(this.toHex(e));
  }
};
Ar.BASE = new Ar(Wp, Yp, 1n);
Ar.ZERO = new Ar(0n, 1n, 0n);
const { BASE: no, ZERO: Yr } = Ar, Nl = (t, e) => t.toString(16).padStart(e, "0"), Ul = (t) => Array.from(Ba(t)).map((e) => Nl(e, 2)).join(""), an = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Wu = (t) => {
  if (t >= an._0 && t <= an._9)
    return t - an._0;
  if (t >= an.A && t <= an.F)
    return t - (an.A - 10);
  if (t >= an.a && t <= an.f)
    return t - (an.a - 10);
}, wc = (t) => {
  const e = "hex invalid";
  if (!Al(t))
    return de(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return de(e);
  const o = Bl(r);
  for (let s = 0, c = 0; s < r; s++, c += 2) {
    const u = Wu(t.charCodeAt(c)), l = Wu(t.charCodeAt(c + 1));
    if (u === void 0 || l === void 0)
      return de(e);
    o[s] = u * 16 + l;
  }
  return o;
}, Cl = (t) => BigInt("0x" + (Ul(t) || "0")), Yu = (t, e, n) => Cl(t.slice(e, n)), Xp = (t) => Ji(t) && t >= 0n && t < gc ? wc(Nl(t, 2 * eo)) : de("bigint expected"), Zu = (t) => Ul(Xp(t)), Qp = (t, e) => {
  (t === 0n || e <= 0n) && de("no inverse n=" + t + " mod=" + e);
  let n = yt(t, e), r = e, o = 0n, s = 1n;
  for (; n !== 0n; ) {
    const c = r / n, u = r % n, l = o - s * c;
    r = n, n = u, o = s, s = l;
  }
  return r === 1n ? yt(o, e) : de("no inverse");
}, Jp = (t) => {
  let e = 1n;
  for (let n = t, r = (yr + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % yr), n = n * n % yr;
  return yt(e * e) === t ? e : de("sqrt invalid");
}, tg = (t) => (Ji(t) || (t = Cl(_l(t, eo))), Il(t) ? t : de("private key invalid 3")), zn = 8, eg = () => {
  const t = [], e = 256 / zn + 1;
  let n = no, r = n;
  for (let o = 0; o < e; o++) {
    r = n, t.push(r);
    for (let s = 1; s < 2 ** (zn - 1); s++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let Xu;
const ng = (t) => {
  const e = Xu || (Xu = eg()), n = (h, y) => {
    let m = y.negate();
    return h ? m : y;
  };
  let r = Yr, o = no;
  const s = 1 + 256 / zn, c = 2 ** (zn - 1), u = BigInt(2 ** zn - 1), l = 2 ** zn, p = BigInt(zn);
  for (let h = 0; h < s; h++) {
    const y = h * c;
    let m = Number(t & u);
    t >>= p, m > c && (m -= l, t += 1n);
    const v = y, S = y + Math.abs(m) - 1, _ = h % 2 !== 0, L = m < 0;
    m === 0 ? o = o.add(n(_, e[v])) : r = r.add(n(L, e[S]));
  }
  return { p: r, f: o };
};
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ee = BigInt(0), me = BigInt(1), Xn = /* @__PURE__ */ BigInt(2), rg = /* @__PURE__ */ BigInt(3), Rl = /* @__PURE__ */ BigInt(4), Ol = /* @__PURE__ */ BigInt(5), $l = /* @__PURE__ */ BigInt(8);
function ie(t, e) {
  const n = t % e;
  return n >= Ee ? n : e + n;
}
function Re(t, e, n) {
  let r = t;
  for (; e-- > Ee; )
    r *= r, r %= n;
  return r;
}
function _a(t, e) {
  if (t === Ee)
    throw new Error("invert: expected non-zero number");
  if (e <= Ee)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = ie(t, e), r = e, o = Ee, s = me;
  for (; n !== Ee; ) {
    const u = r / n, l = r % n, p = o - s * u;
    r = n, n = l, o = s, s = p;
  }
  if (r !== me)
    throw new Error("invert: does not exist");
  return ie(o, e);
}
function Pl(t, e) {
  const n = (t.ORDER + me) / Rl, r = t.pow(e, n);
  if (!t.eql(t.sqr(r), e))
    throw new Error("Cannot find square root");
  return r;
}
function og(t, e) {
  const n = (t.ORDER - Ol) / $l, r = t.mul(e, Xn), o = t.pow(r, n), s = t.mul(e, o), c = t.mul(t.mul(s, Xn), o), u = t.mul(s, t.sub(c, t.ONE));
  if (!t.eql(t.sqr(u), e))
    throw new Error("Cannot find square root");
  return u;
}
function ig(t) {
  if (t < BigInt(3))
    throw new Error("sqrt is not defined for small field");
  let e = t - me, n = 0;
  for (; e % Xn === Ee; )
    e /= Xn, n++;
  let r = Xn;
  const o = mc(t);
  for (; Qu(o, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Pl;
  let s = o.pow(r, e);
  const c = (e + me) / Xn;
  return function(l, p) {
    if (l.is0(p))
      return p;
    if (Qu(l, p) !== 1)
      throw new Error("Cannot find square root");
    let h = n, y = l.mul(l.ONE, s), m = l.pow(p, e), v = l.pow(p, c);
    for (; !l.eql(m, l.ONE); ) {
      if (l.is0(m))
        return l.ZERO;
      let S = 1, _ = l.sqr(m);
      for (; !l.eql(_, l.ONE); )
        if (S++, _ = l.sqr(_), S === h)
          throw new Error("Cannot find square root");
      const L = me << BigInt(h - S - 1), z = l.pow(y, L);
      h = S, y = l.sqr(z), m = l.mul(m, y), v = l.mul(v, z);
    }
    return v;
  };
}
function sg(t) {
  return t % Rl === rg ? Pl : t % $l === Ol ? og : ig(t);
}
const ag = [
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
function cg(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = ag.reduce((r, o) => (r[o] = "function", r), e);
  return Qi(t, n);
}
function ug(t, e, n) {
  if (n < Ee)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Ee)
    return t.ONE;
  if (n === me)
    return e;
  let r = t.ONE, o = e;
  for (; n > Ee; )
    n & me && (r = t.mul(r, o)), o = t.sqr(o), n >>= me;
  return r;
}
function Ll(t, e, n = !1) {
  const r = new Array(e.length).fill(n ? t.ZERO : void 0), o = e.reduce((c, u, l) => t.is0(u) ? c : (r[l] = c, t.mul(c, u)), t.ONE), s = t.inv(o);
  return e.reduceRight((c, u, l) => t.is0(u) ? c : (r[l] = t.mul(c, r[l]), t.mul(c, u)), s), r;
}
function Qu(t, e) {
  const n = (t.ORDER - me) / Xn, r = t.pow(e, n), o = t.eql(r, t.ONE), s = t.eql(r, t.ZERO), c = t.eql(r, t.neg(t.ONE));
  if (!o && !s && !c)
    throw new Error("invalid Legendre symbol result");
  return o ? 1 : s ? 0 : -1;
}
function Dl(t, e) {
  e !== void 0 && oo(e);
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function mc(t, e, n = !1, r = {}) {
  if (t <= Ee)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: s } = Dl(t, e);
  if (s > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let c;
  const u = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: o,
    BYTES: s,
    MASK: Xi(o),
    ZERO: Ee,
    ONE: me,
    create: (l) => ie(l, t),
    isValid: (l) => {
      if (typeof l != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof l);
      return Ee <= l && l < t;
    },
    is0: (l) => l === Ee,
    isOdd: (l) => (l & me) === me,
    neg: (l) => ie(-l, t),
    eql: (l, p) => l === p,
    sqr: (l) => ie(l * l, t),
    add: (l, p) => ie(l + p, t),
    sub: (l, p) => ie(l - p, t),
    mul: (l, p) => ie(l * p, t),
    pow: (l, p) => ug(u, l, p),
    div: (l, p) => ie(l * _a(p, t), t),
    // Same as above, but doesn't normalize
    sqrN: (l) => l * l,
    addN: (l, p) => l + p,
    subN: (l, p) => l - p,
    mulN: (l, p) => l * p,
    inv: (l) => _a(l, t),
    sqrt: r.sqrt || ((l) => (c || (c = sg(t)), c(u, l))),
    toBytes: (l) => n ? Tl(l, s) : er(l, s),
    fromBytes: (l) => {
      if (l.length !== s)
        throw new Error("Field.fromBytes: expected " + s + " bytes, got " + l.length);
      return n ? Sl(l) : Xe(l);
    },
    // TODO: we don't need it here, move out to separate fn
    invertBatch: (l) => Ll(u, l),
    // We can't move this out because Fp6, Fp12 implement it
    // and it's unclear what to return in there.
    cmov: (l, p, h) => h ? p : l
  });
  return Object.freeze(u);
}
function Kl(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function Ml(t) {
  const e = Kl(t);
  return e + Math.ceil(e / 2);
}
function fg(t, e, n = !1) {
  const r = t.length, o = Kl(e), s = Ml(e);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const c = n ? Sl(t) : Xe(t), u = ie(c, e - me) + me;
  return n ? Tl(u, o) : er(u, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ju = BigInt(0), Na = BigInt(1);
function Ys(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function Vl(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Zs(t, e) {
  Vl(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1), o = 2 ** t, s = Xi(t), c = BigInt(t);
  return { windows: n, windowSize: r, mask: s, maxNumber: o, shiftBy: c };
}
function tf(t, e, n) {
  const { windowSize: r, mask: o, maxNumber: s, shiftBy: c } = n;
  let u = Number(t & o), l = t >> c;
  u > r && (u -= s, l += Na);
  const p = e * r, h = p + Math.abs(u) - 1, y = u === 0, m = u < 0, v = e % 2 !== 0;
  return { nextN: l, offset: h, isZero: y, isNeg: m, isNegF: v, offsetF: p };
}
function lg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function dg(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Xs = /* @__PURE__ */ new WeakMap(), Hl = /* @__PURE__ */ new WeakMap();
function Qs(t) {
  return Hl.get(t) || 1;
}
function hg(t, e) {
  return {
    constTimeNegate: Ys,
    hasPrecomputes(n) {
      return Qs(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let s = n;
      for (; r > Ju; )
        r & Na && (o = o.add(s)), s = s.double(), r >>= Na;
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
      const { windows: o, windowSize: s } = Zs(r, e), c = [];
      let u = n, l = u;
      for (let p = 0; p < o; p++) {
        l = u, c.push(l);
        for (let h = 1; h < s; h++)
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
      const u = Zs(n, e);
      for (let l = 0; l < u.windows; l++) {
        const { nextN: p, offset: h, isZero: y, isNeg: m, isNegF: v, offsetF: S } = tf(o, l, u);
        o = p, y ? c = c.add(Ys(v, r[S])) : s = s.add(Ys(m, r[h]));
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
      const c = Zs(n, e);
      for (let u = 0; u < c.windows && o !== Ju; u++) {
        const { nextN: l, offset: p, isZero: h, isNeg: y } = tf(o, u, c);
        if (o = l, !h) {
          const m = r[p];
          s = s.add(y ? m.negate() : m);
        }
      }
      return s;
    },
    getPrecomputes(n, r, o) {
      let s = Xs.get(r);
      return s || (s = this.precomputeWindow(r, n), n !== 1 && Xs.set(r, o(s))), s;
    },
    wNAFCached(n, r, o) {
      const s = Qs(n);
      return this.wNAF(s, this.getPrecomputes(s, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, s) {
      const c = Qs(n);
      return c === 1 ? this.unsafeLadder(n, r, s) : this.wNAFUnsafe(c, this.getPrecomputes(c, n, o), r, s);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      Vl(r, e), Hl.set(n, r), Xs.delete(n);
    }
  };
}
function pg(t, e, n, r) {
  lg(n, t), dg(r, e);
  const o = n.length, s = r.length;
  if (o !== s)
    throw new Error("arrays of points and scalars must have equal length");
  const c = t.ZERO, u = qp(BigInt(o));
  let l = 1;
  u > 12 ? l = u - 3 : u > 4 ? l = u - 2 : u > 0 && (l = 2);
  const p = Xi(l), h = new Array(Number(p) + 1).fill(c), y = Math.floor((e.BITS - 1) / l) * l;
  let m = c;
  for (let v = y; v >= 0; v -= l) {
    h.fill(c);
    for (let _ = 0; _ < s; _++) {
      const L = r[_], z = Number(L >> BigInt(v) & p);
      h[z] = h[z].add(n[_]);
    }
    let S = c;
    for (let _ = h.length - 1, L = c; _ > 0; _--)
      L = L.add(h[_]), S = S.add(L);
    if (m = m.add(S), v !== 0)
      for (let _ = 0; _ < l; _++)
        m = m.double();
  }
  return m;
}
function jl(t) {
  return cg(t.Fp), Qi(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Dl(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function ef(t) {
  t.lowS !== void 0 && co("lowS", t.lowS), t.prehash !== void 0 && co("prehash", t.prehash);
}
function gg(t) {
  const e = jl(t);
  Qi(e, {
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
class yg extends Error {
  constructor(e = "") {
    super(e);
  }
}
const fn = {
  // asn.1 DER encoding utils
  Err: yg,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = fn;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = ii(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? ii(o.length / 2 | 128) : "";
      return ii(t) + s + o + e;
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
        const l = o & 127;
        if (!l)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (l > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const p = e.subarray(r, r + l);
        if (p.length !== l)
          throw new n("tlv.decode: length bytes not complete");
        if (p[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const h of p)
          c = c << 8 | h;
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
      const { Err: e } = fn;
      if (t < ln)
        throw new e("integer: negative integers are not allowed");
      let n = ii(t);
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
      return Xe(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = fn, o = oe("signature", t), { v: s, l: c } = r.decode(48, o);
    if (c.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: u, l } = r.decode(2, s), { v: p, l: h } = r.decode(2, l);
    if (h.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(u), s: n.decode(p) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = fn, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), s = r + o;
    return e.encode(48, s);
  }
};
function Js(t, e) {
  return uo(er(t, e));
}
const ln = BigInt(0), ee = BigInt(1);
BigInt(2);
const ta = BigInt(3), wg = BigInt(4);
function mg(t) {
  const e = gg(t), { Fp: n } = e, r = mc(e.n, e.nBitLength), o = e.toBytes || ((W, H, $) => {
    const rt = H.toAffine();
    return kr(Uint8Array.from([4]), n.toBytes(rt.x), n.toBytes(rt.y));
  }), s = e.fromBytes || ((W) => {
    const H = W.subarray(1), $ = n.fromBytes(H.subarray(0, n.BYTES)), rt = n.fromBytes(H.subarray(n.BYTES, 2 * n.BYTES));
    return { x: $, y: rt };
  });
  function c(W) {
    const { a: H, b: $ } = e, rt = n.sqr(W), T = n.mul(rt, W);
    return n.add(n.add(T, n.mul(W, H)), $);
  }
  function u(W, H) {
    const $ = n.sqr(H), rt = c(W);
    return n.eql($, rt);
  }
  if (!u(e.Gx, e.Gy))
    throw new Error("bad curve params: generator point");
  const l = n.mul(n.pow(e.a, ta), wg), p = n.mul(n.sqr(e.b), BigInt(27));
  if (n.is0(n.add(l, p)))
    throw new Error("bad curve params: a or b");
  function h(W) {
    return fo(W, ee, e.n);
  }
  function y(W) {
    const { allowedPrivateKeyLengths: H, nByteLength: $, wrapPrivateKey: rt, n: T } = e;
    if (H && typeof W != "bigint") {
      if (To(W) && (W = uo(W)), typeof W != "string" || !H.includes(W.length))
        throw new Error("invalid private key");
      W = W.padStart($ * 2, "0");
    }
    let ut;
    try {
      ut = typeof W == "bigint" ? W : Xe(oe("private key", W, $));
    } catch {
      throw new Error("invalid private key, expected hex or " + $ + " bytes, got " + typeof W);
    }
    return rt && (ut = ie(ut, T)), Jn("private key", ut, ee, T), ut;
  }
  function m(W) {
    if (!(W instanceof _))
      throw new Error("ProjectivePoint expected");
  }
  const v = qu((W, H) => {
    const { px: $, py: rt, pz: T } = W;
    if (n.eql(T, n.ONE))
      return { x: $, y: rt };
    const ut = W.is0();
    H == null && (H = ut ? n.ONE : n.inv(T));
    const F = n.mul($, H), X = n.mul(rt, H), I = n.mul(T, H);
    if (ut)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(I, n.ONE))
      throw new Error("invZ was invalid");
    return { x: F, y: X };
  }), S = qu((W) => {
    if (W.is0()) {
      if (e.allowInfinityPoint && !n.is0(W.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: H, y: $ } = W.toAffine();
    if (!n.isValid(H) || !n.isValid($))
      throw new Error("bad point: x or y not FE");
    if (!u(H, $))
      throw new Error("bad point: equation left != right");
    if (!W.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class _ {
    constructor(H, $, rt) {
      if (H == null || !n.isValid(H))
        throw new Error("x required");
      if ($ == null || !n.isValid($) || n.is0($))
        throw new Error("y required");
      if (rt == null || !n.isValid(rt))
        throw new Error("z required");
      this.px = H, this.py = $, this.pz = rt, Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(H) {
      const { x: $, y: rt } = H || {};
      if (!H || !n.isValid($) || !n.isValid(rt))
        throw new Error("invalid affine point");
      if (H instanceof _)
        throw new Error("projective point not allowed");
      const T = (ut) => n.eql(ut, n.ZERO);
      return T($) && T(rt) ? _.ZERO : new _($, rt, n.ONE);
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
      const $ = Ll(n, H.map((rt) => rt.pz));
      return H.map((rt, T) => rt.toAffine($[T])).map(_.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(H) {
      const $ = _.fromAffine(s(oe("pointHex", H)));
      return $.assertValidity(), $;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(H) {
      return _.BASE.multiply(y(H));
    }
    // Multiscalar Multiplication
    static msm(H, $) {
      return pg(_, r, H, $);
    }
    // "Private method", don't use it directly
    _setWindowSize(H) {
      Z.setWindowSize(this, H);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      S(this);
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
      m(H);
      const { px: $, py: rt, pz: T } = this, { px: ut, py: F, pz: X } = H, I = n.eql(n.mul($, X), n.mul(ut, T)), D = n.eql(n.mul(rt, X), n.mul(F, T));
      return I && D;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new _(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: H, b: $ } = e, rt = n.mul($, ta), { px: T, py: ut, pz: F } = this;
      let X = n.ZERO, I = n.ZERO, D = n.ZERO, G = n.mul(T, T), dt = n.mul(ut, ut), j = n.mul(F, F), V = n.mul(T, ut);
      return V = n.add(V, V), D = n.mul(T, F), D = n.add(D, D), X = n.mul(H, D), I = n.mul(rt, j), I = n.add(X, I), X = n.sub(dt, I), I = n.add(dt, I), I = n.mul(X, I), X = n.mul(V, X), D = n.mul(rt, D), j = n.mul(H, j), V = n.sub(G, j), V = n.mul(H, V), V = n.add(V, D), D = n.add(G, G), G = n.add(D, G), G = n.add(G, j), G = n.mul(G, V), I = n.add(I, G), j = n.mul(ut, F), j = n.add(j, j), G = n.mul(j, V), X = n.sub(X, G), D = n.mul(j, dt), D = n.add(D, D), D = n.add(D, D), new _(X, I, D);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(H) {
      m(H);
      const { px: $, py: rt, pz: T } = this, { px: ut, py: F, pz: X } = H;
      let I = n.ZERO, D = n.ZERO, G = n.ZERO;
      const dt = e.a, j = n.mul(e.b, ta);
      let V = n.mul($, ut), Y = n.mul(rt, F), tt = n.mul(T, X), ht = n.add($, rt), at = n.add(ut, F);
      ht = n.mul(ht, at), at = n.add(V, Y), ht = n.sub(ht, at), at = n.add($, T);
      let ft = n.add(ut, X);
      return at = n.mul(at, ft), ft = n.add(V, tt), at = n.sub(at, ft), ft = n.add(rt, T), I = n.add(F, X), ft = n.mul(ft, I), I = n.add(Y, tt), ft = n.sub(ft, I), G = n.mul(dt, at), I = n.mul(j, tt), G = n.add(I, G), I = n.sub(Y, G), G = n.add(Y, G), D = n.mul(I, G), Y = n.add(V, V), Y = n.add(Y, V), tt = n.mul(dt, tt), at = n.mul(j, at), Y = n.add(Y, tt), tt = n.sub(V, tt), tt = n.mul(dt, tt), at = n.add(at, tt), V = n.mul(Y, at), D = n.add(D, V), V = n.mul(ft, at), I = n.mul(ht, I), I = n.sub(I, V), V = n.mul(ht, Y), G = n.mul(ft, G), G = n.add(G, V), new _(I, D, G);
    }
    subtract(H) {
      return this.add(H.negate());
    }
    is0() {
      return this.equals(_.ZERO);
    }
    wNAF(H) {
      return Z.wNAFCached(this, H, _.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(H) {
      const { endo: $, n: rt } = e;
      Jn("scalar", H, ln, rt);
      const T = _.ZERO;
      if (H === ln)
        return T;
      if (this.is0() || H === ee)
        return this;
      if (!$ || Z.hasPrecomputes(this))
        return Z.wNAFCachedUnsafe(this, H, _.normalizeZ);
      let { k1neg: ut, k1: F, k2neg: X, k2: I } = $.splitScalar(H), D = T, G = T, dt = this;
      for (; F > ln || I > ln; )
        F & ee && (D = D.add(dt)), I & ee && (G = G.add(dt)), dt = dt.double(), F >>= ee, I >>= ee;
      return ut && (D = D.negate()), X && (G = G.negate()), G = new _(n.mul(G.px, $.beta), G.py, G.pz), D.add(G);
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
      const { endo: $, n: rt } = e;
      Jn("scalar", H, ee, rt);
      let T, ut;
      if ($) {
        const { k1neg: F, k1: X, k2neg: I, k2: D } = $.splitScalar(H);
        let { p: G, f: dt } = this.wNAF(X), { p: j, f: V } = this.wNAF(D);
        G = Z.constTimeNegate(F, G), j = Z.constTimeNegate(I, j), j = new _(n.mul(j.px, $.beta), j.py, j.pz), T = G.add(j), ut = dt.add(V);
      } else {
        const { p: F, f: X } = this.wNAF(H);
        T = F, ut = X;
      }
      return _.normalizeZ([T, ut])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(H, $, rt) {
      const T = _.BASE, ut = (X, I) => I === ln || I === ee || !X.equals(T) ? X.multiplyUnsafe(I) : X.multiply(I), F = ut(this, $).add(ut(H, rt));
      return F.is0() ? void 0 : F;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(H) {
      return v(this, H);
    }
    isTorsionFree() {
      const { h: H, isTorsionFree: $ } = e;
      if (H === ee)
        return !0;
      if ($)
        return $(_, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: H, clearCofactor: $ } = e;
      return H === ee ? this : $ ? $(_, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(H = !0) {
      return co("isCompressed", H), this.assertValidity(), o(_, this, H);
    }
    toHex(H = !0) {
      return co("isCompressed", H), uo(this.toRawBytes(H));
    }
  }
  _.BASE = new _(e.Gx, e.Gy, n.ONE), _.ZERO = new _(n.ZERO, n.ONE, n.ZERO);
  const { endo: L, nBitLength: z } = e, Z = hg(_, L ? Math.ceil(z / 2) : z);
  return {
    CURVE: e,
    ProjectivePoint: _,
    normPrivateKeyToScalar: y,
    weierstrassEquation: c,
    isWithinCurveOrder: h
  };
}
function bg(t) {
  const e = jl(t);
  return Qi(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function vg(t) {
  const e = bg(t), { Fp: n, n: r, nByteLength: o, nBitLength: s } = e, c = n.BYTES + 1, u = 2 * n.BYTES + 1;
  function l(j) {
    return ie(j, r);
  }
  function p(j) {
    return _a(j, r);
  }
  const { ProjectivePoint: h, normPrivateKeyToScalar: y, weierstrassEquation: m, isWithinCurveOrder: v } = mg({
    ...e,
    toBytes(j, V, Y) {
      const tt = V.toAffine(), ht = n.toBytes(tt.x), at = kr;
      return co("isCompressed", Y), Y ? at(Uint8Array.from([V.hasEvenY() ? 2 : 3]), ht) : at(Uint8Array.from([4]), ht, n.toBytes(tt.y));
    },
    fromBytes(j) {
      const V = j.length, Y = j[0], tt = j.subarray(1);
      if (V === c && (Y === 2 || Y === 3)) {
        const ht = Xe(tt);
        if (!fo(ht, ee, n.ORDER))
          throw new Error("Point is not on curve");
        const at = m(ht);
        let ft;
        try {
          ft = n.sqrt(at);
        } catch (_t) {
          const mt = _t instanceof Error ? ": " + _t.message : "";
          throw new Error("Point is not on curve" + mt);
        }
        const Tt = (ft & ee) === ee;
        return (Y & 1) === 1 !== Tt && (ft = n.neg(ft)), { x: ht, y: ft };
      } else if (V === u && Y === 4) {
        const ht = n.fromBytes(tt.subarray(0, n.BYTES)), at = n.fromBytes(tt.subarray(n.BYTES, 2 * n.BYTES));
        return { x: ht, y: at };
      } else {
        const ht = c, at = u;
        throw new Error("invalid Point, expected length of " + ht + ", or uncompressed " + at + ", got " + V);
      }
    }
  });
  function S(j) {
    const V = r >> ee;
    return j > V;
  }
  function _(j) {
    return S(j) ? l(-j) : j;
  }
  const L = (j, V, Y) => Xe(j.slice(V, Y));
  class z {
    constructor(V, Y, tt) {
      Jn("r", V, ee, r), Jn("s", Y, ee, r), this.r = V, this.s = Y, tt != null && (this.recovery = tt), Object.freeze(this);
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(V) {
      const Y = o;
      return V = oe("compactSignature", V, Y * 2), new z(L(V, 0, Y), L(V, Y, 2 * Y));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(V) {
      const { r: Y, s: tt } = fn.toSig(oe("DER", V));
      return new z(Y, tt);
    }
    /**
     * @todo remove
     * @deprecated
     */
    assertValidity() {
    }
    addRecoveryBit(V) {
      return new z(this.r, this.s, V);
    }
    recoverPublicKey(V) {
      const { r: Y, s: tt, recovery: ht } = this, at = T(oe("msgHash", V));
      if (ht == null || ![0, 1, 2, 3].includes(ht))
        throw new Error("recovery id invalid");
      const ft = ht === 2 || ht === 3 ? Y + e.n : Y;
      if (ft >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const Tt = (ht & 1) === 0 ? "02" : "03", kt = h.fromHex(Tt + Js(ft, n.BYTES)), _t = p(ft), mt = l(-at * _t), Nt = l(tt * _t), Xt = h.BASE.multiplyAndAddUnsafe(kt, mt, Nt);
      if (!Xt)
        throw new Error("point at infinify");
      return Xt.assertValidity(), Xt;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return S(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new z(this.r, l(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return Ni(this.toDERHex());
    }
    toDERHex() {
      return fn.hexFromSig(this);
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Ni(this.toCompactHex());
    }
    toCompactHex() {
      const V = o;
      return Js(this.r, V) + Js(this.s, V);
    }
  }
  const Z = {
    isValidPrivateKey(j) {
      try {
        return y(j), !0;
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
      const j = Ml(e.n);
      return fg(e.randomBytes(j), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(j = 8, V = h.BASE) {
      return V._setWindowSize(j), V.multiply(BigInt(3)), V;
    }
  };
  function W(j, V = !0) {
    return h.fromPrivateKey(j).toRawBytes(V);
  }
  function H(j) {
    if (typeof j == "bigint")
      return !1;
    if (j instanceof h)
      return !0;
    const Y = oe("key", j).length, tt = n.BYTES, ht = tt + 1, at = 2 * tt + 1;
    if (!(e.allowedPrivateKeyLengths || o === ht))
      return Y === ht || Y === at;
  }
  function $(j, V, Y = !0) {
    if (H(j) === !0)
      throw new Error("first arg must be private key");
    if (H(V) === !1)
      throw new Error("second arg must be public key");
    return h.fromHex(V).multiply(y(j)).toRawBytes(Y);
  }
  const rt = e.bits2int || function(j) {
    if (j.length > 8192)
      throw new Error("input is too large");
    const V = Xe(j), Y = j.length * 8 - s;
    return Y > 0 ? V >> BigInt(Y) : V;
  }, T = e.bits2int_modN || function(j) {
    return l(rt(j));
  }, ut = Xi(s);
  function F(j) {
    return Jn("num < 2^" + s, j, ln, ut), er(j, o);
  }
  function X(j, V, Y = I) {
    if (["recovered", "canonical"].some((lt) => lt in Y))
      throw new Error("sign() legacy options not supported");
    const { hash: tt, randomBytes: ht } = e;
    let { lowS: at, prehash: ft, extraEntropy: Tt } = Y;
    at == null && (at = !0), j = oe("msgHash", j), ef(Y), ft && (j = oe("prehashed msgHash", tt(j)));
    const kt = T(j), _t = y(V), mt = [F(_t), F(kt)];
    if (Tt != null && Tt !== !1) {
      const lt = Tt === !0 ? ht(n.BYTES) : Tt;
      mt.push(oe("extraEntropy", lt));
    }
    const Nt = kr(...mt), Xt = kt;
    function Ne(lt) {
      const ke = rt(lt);
      if (!v(ke))
        return;
      const he = p(ke), It = h.BASE.multiply(ke).toAffine(), Ae = l(It.x);
      if (Ae === ln)
        return;
      const Rn = l(he * l(Xt + Ae * _t));
      if (Rn === ln)
        return;
      let Ie = (It.x === Ae ? 0 : 2) | Number(It.y & ee), yn = Rn;
      return at && S(Rn) && (yn = _(Rn), Ie ^= 1), new z(Ae, yn, Ie);
    }
    return { seed: Nt, k2sig: Ne };
  }
  const I = { lowS: e.lowS, prehash: !1 }, D = { lowS: e.lowS, prehash: !1 };
  function G(j, V, Y = I) {
    const { seed: tt, k2sig: ht } = X(j, V, Y), at = e;
    return zp(at.hash.outputLen, at.nByteLength, at.hmac)(tt, ht);
  }
  h.BASE._setWindowSize(8);
  function dt(j, V, Y, tt = D) {
    var Ie;
    const ht = j;
    V = oe("msgHash", V), Y = oe("publicKey", Y);
    const { lowS: at, prehash: ft, format: Tt } = tt;
    if (ef(tt), "strict" in tt)
      throw new Error("options.strict was renamed to lowS");
    if (Tt !== void 0 && Tt !== "compact" && Tt !== "der")
      throw new Error("format must be compact or der");
    const kt = typeof ht == "string" || To(ht), _t = !kt && !Tt && typeof ht == "object" && ht !== null && typeof ht.r == "bigint" && typeof ht.s == "bigint";
    if (!kt && !_t)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let mt, Nt;
    try {
      if (_t && (mt = new z(ht.r, ht.s)), kt) {
        try {
          Tt !== "compact" && (mt = z.fromDER(ht));
        } catch (yn) {
          if (!(yn instanceof fn.Err))
            throw yn;
        }
        !mt && Tt !== "der" && (mt = z.fromCompact(ht));
      }
      Nt = h.fromHex(Y);
    } catch {
      return !1;
    }
    if (!mt || at && mt.hasHighS())
      return !1;
    ft && (V = e.hash(V));
    const { r: Xt, s: Ne } = mt, lt = T(V), ke = p(Ne), he = l(lt * ke), It = l(Xt * ke), Ae = (Ie = h.BASE.multiplyAndAddUnsafe(Nt, he, It)) == null ? void 0 : Ie.toAffine();
    return Ae ? l(Ae.x) === Xt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: W,
    getSharedSecret: $,
    sign: G,
    verify: dt,
    ProjectivePoint: h,
    Signature: z,
    utils: Z
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Eg(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Ha(t, e, Ve(...n)),
    randomBytes: vo
  };
}
function xg(t, e) {
  const n = (r) => vg({ ...t, ...Eg(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ko = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Ui = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), bc = BigInt(0), lo = BigInt(1), Ci = BigInt(2), nf = (t, e) => (t + e / Ci) / e;
function Fl(t) {
  const e = ko, n = BigInt(3), r = BigInt(6), o = BigInt(11), s = BigInt(22), c = BigInt(23), u = BigInt(44), l = BigInt(88), p = t * t * t % e, h = p * p * t % e, y = Re(h, n, e) * h % e, m = Re(y, n, e) * h % e, v = Re(m, Ci, e) * p % e, S = Re(v, o, e) * v % e, _ = Re(S, s, e) * S % e, L = Re(_, u, e) * _ % e, z = Re(L, l, e) * L % e, Z = Re(z, u, e) * _ % e, W = Re(Z, n, e) * h % e, H = Re(W, c, e) * S % e, $ = Re(H, r, e) * p % e, rt = Re($, Ci, e);
  if (!Ua.eql(Ua.sqr(rt), t))
    throw new Error("Cannot find square root");
  return rt;
}
const Ua = mc(ko, void 0, void 0, { sqrt: Fl }), ho = xg({
  a: bc,
  b: BigInt(7),
  Fp: Ua,
  n: Ui,
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  lowS: !0,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (t) => {
      const e = Ui, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -lo * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), s = n, c = BigInt("0x100000000000000000000000000000000"), u = nf(s * t, e), l = nf(-r * t, e);
      let p = ie(t - u * n - l * o, e), h = ie(-u * r - l * s, e);
      const y = p > c, m = h > c;
      if (y && (p = e - p), m && (h = e - h), p > c || h > c)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: y, k1: p, k2neg: m, k2: h };
    }
  }
}, Gt), rf = {};
function Ri(t, ...e) {
  let n = rf[t];
  if (n === void 0) {
    const r = Gt(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = kr(r, r), rf[t] = n;
  }
  return Gt(kr(n, ...e));
}
const vc = (t) => t.toRawBytes(!0).slice(1), Ca = (t) => er(t, 32), ea = (t) => ie(t, ko), po = (t) => ie(t, Ui), Ec = ho.ProjectivePoint, Sg = (t, e, n) => Ec.BASE.multiplyAndAddUnsafe(t, e, n);
function Ra(t) {
  let e = ho.utils.normPrivateKeyToScalar(t), n = Ec.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : po(-e), bytes: vc(n) };
}
function ql(t) {
  Jn("x", t, lo, ko);
  const e = ea(t * t), n = ea(e * t + BigInt(7));
  let r = Fl(n);
  r % Ci !== bc && (r = ea(-r));
  const o = new Ec(t, r, lo);
  return o.assertValidity(), o;
}
const wr = Xe;
function zl(...t) {
  return po(wr(Ri("BIP0340/challenge", ...t)));
}
function Tg(t) {
  return Ra(t).bytes;
}
function kg(t, e, n = vo(32)) {
  const r = oe("message", t), { bytes: o, scalar: s } = Ra(e), c = oe("auxRand", n, 32), u = Ca(s ^ wr(Ri("BIP0340/aux", c))), l = Ri("BIP0340/nonce", u, o, r), p = po(wr(l));
  if (p === bc)
    throw new Error("sign failed: k is zero");
  const { bytes: h, scalar: y } = Ra(p), m = zl(h, o, r), v = new Uint8Array(64);
  if (v.set(h, 0), v.set(Ca(po(y + m * s)), 32), !Gl(v, r, o))
    throw new Error("sign: Invalid signature produced");
  return v;
}
function Gl(t, e, n) {
  const r = oe("signature", t, 64), o = oe("message", e), s = oe("publicKey", n, 32);
  try {
    const c = ql(wr(s)), u = wr(r.subarray(0, 32));
    if (!fo(u, lo, ko))
      return !1;
    const l = wr(r.subarray(32, 64));
    if (!fo(l, lo, Ui))
      return !1;
    const p = zl(Ca(u), vc(c), o), h = Sg(c, l, po(-p));
    return !(!h || !h.hasEvenY() || h.toAffine().x !== u);
  } catch {
    return !1;
  }
}
const xc = {
  getPublicKey: Tg,
  sign: kg,
  verify: Gl,
  utils: {
    randomPrivateKey: ho.utils.randomPrivateKey,
    lift_x: ql,
    pointToBytes: vc,
    numberToBytesBE: er,
    bytesToNumberBE: Xe,
    taggedHash: Ri,
    mod: ie
  }
};
function Sc(t, e, n = {}) {
  t = ka(t);
  const { aggPublicKey: r } = Aa(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const o = xc.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Aa(t, [o], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: s.toRawBytes(!0)
  };
}
class si extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Tc {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new si("Invalid s length");
    if (n.length !== 33)
      throw new si("Invalid R length");
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
      throw new si("Invalid partial signature length");
    if (Xe(e) >= yc.n)
      throw new si("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Tc(e, r);
  }
}
function Ag(t, e, n, r, o, s) {
  let c;
  if ((s == null ? void 0 : s.taprootTweak) !== void 0) {
    const { preTweakedKey: p } = Sc(ka(r));
    c = xc.utils.taggedHash("TapTweak", p.subarray(1), s.taprootTweak);
  }
  const l = new Hp(n, ka(r), o, c ? [c] : void 0, c ? [!0] : void 0).sign(t, e);
  return Tc.decode(l);
}
var Ig = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Bg(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var na, of;
function _g() {
  if (of) return na;
  of = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, o = 1 << 22, s = r, c = 1 << n, u = r << n;
  function l(h) {
    return h & e ? {} : h & o ? {
      seconds: (h & r) << n
    } : {
      blocks: h & r
    };
  }
  function p({ blocks: h, seconds: y }) {
    if (h !== void 0 && y !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (h === void 0 && y === void 0) return t;
    if (y !== void 0) {
      if (!Number.isFinite(y)) throw new TypeError("Expected Number seconds");
      if (y > u) throw new TypeError("Expected Number seconds <= " + u);
      if (y % c !== 0) throw new TypeError("Expected Number seconds as a multiple of " + c);
      return o | y >> n;
    }
    if (!Number.isFinite(h)) throw new TypeError("Expected Number blocks");
    if (h > r) throw new TypeError("Expected Number blocks <= " + s);
    return h;
  }
  return na = { decode: l, encode: p }, na;
}
var Oa = _g(), qe;
(function(t) {
  t.VtxoTaprootTree = "taptree", t.VtxoTreeExpiry = "expiry", t.Cosigner = "cosigner", t.ConditionWitness = "condition";
})(qe || (qe = {}));
const Wl = 255;
function Ng(t, e, n, r) {
  var o;
  t.updateInput(e, {
    unknown: [
      ...((o = t.getInput(e)) == null ? void 0 : o.unknown) ?? [],
      n.encode(r)
    ]
  });
}
function Yl(t, e, n) {
  var s;
  const r = ((s = t.getInput(e)) == null ? void 0 : s.unknown) ?? [], o = [];
  for (const c of r) {
    const u = n.decode(c);
    u && o.push(u);
  }
  return o;
}
const Ug = {
  key: qe.VtxoTaprootTree,
  encode: (t) => [
    {
      type: Wl,
      key: kc[qe.VtxoTaprootTree]
    },
    t
  ],
  decode: (t) => Xl(() => Ql(t[0], qe.VtxoTaprootTree) ? t[1] : null)
};
qe.ConditionWitness;
const Zl = {
  key: qe.Cosigner,
  encode: (t) => [
    {
      type: Wl,
      key: new Uint8Array([
        ...kc[qe.Cosigner],
        t.index
      ])
    },
    t.key
  ],
  decode: (t) => Xl(() => Ql(t[0], qe.Cosigner) ? {
    index: t[0].key[t[0].key.length - 1],
    key: t[1]
  } : null)
};
qe.VtxoTreeExpiry;
const kc = Object.fromEntries(Object.values(qe).map((t) => [
  t,
  new TextEncoder().encode(t)
])), Xl = (t) => {
  try {
    return t();
  } catch {
    return null;
  }
};
function Ql(t, e) {
  const n = nt.encode(kc[e]);
  return nt.encode(new Uint8Array([t.type, ...t.key])).includes(n);
}
const ra = new Error("missing vtxo graph");
class go {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = il();
    return new go(e);
  }
  init(e, n, r) {
    this.graph = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return ho.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.graph)
      throw ra;
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
      throw ra;
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
      throw ra;
    const e = /* @__PURE__ */ new Map(), n = ho.getPublicKey(this.secretKey);
    for (const r of this.graph) {
      const o = jp(n);
      e.set(r.txid, o);
    }
    return e;
  }
  signPartial(e) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw go.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(e.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(e.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const o = [], s = [], c = Yl(e.root, 0, Zl).map((p) => p.key), { finalKey: u } = Sc(c, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let p = 0; p < e.root.inputsLength; p++) {
      const h = Cg(u, this.graph, this.rootSharedOutputAmount, e.root);
      o.push(h.amount), s.push(h.script);
    }
    const l = e.root.preimageWitnessV1(
      0,
      // always first input
      s,
      gn.DEFAULT,
      o
    );
    return Ag(n.secNonce, this.secretKey, r.pubNonce, c, l, {
      taprootTweak: this.scriptRoot
    });
  }
}
go.NOT_INITIALIZED = new Error("session not initialized, call init method");
function Cg(t, e, n, r) {
  const o = Et.encode(["OP_1", t.slice(1)]);
  if (nt.encode(fe(r.toBytes(!0)).reverse()) === e.txid)
    return {
      amount: n,
      script: o
    };
  const c = r.getInput(0);
  if (!c.txid)
    throw new Error("missing parent input txid");
  const u = nt.encode(new Uint8Array(c.txid)), l = e.find(u);
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
    script: o
  };
}
const sf = new Uint8Array(32).fill(0), af = Object.values(gn).filter((t) => typeof t == "number");
class Oi {
  constructor(e) {
    this.key = e || il();
  }
  static fromPrivateKey(e) {
    return new Oi(e);
  }
  static fromHex(e) {
    return new Oi(nt.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, af, sf))
          throw new Error("Failed to sign transaction");
      } catch (o) {
        if (!(o instanceof Error && o.message.includes("No inputs signed"))) throw o;
      }
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, af, sf))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  xOnlyPublicKey() {
    return nc(this.key);
  }
  signerSession() {
    return go.random();
  }
}
class Ir {
  constructor(e, n, r, o = 0) {
    if (this.serverPubKey = e, this.vtxoTaprootKey = n, this.hrp = r, this.version = o, e.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + e.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(e) {
    const n = lr.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(lr.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const o = r[0], s = r.slice(1, 33), c = r.slice(33, 65);
    return new Ir(s, c, n.prefix, o);
  }
  encode() {
    const e = new Uint8Array(65);
    e[0] = this.version, e.set(this.serverPubKey, 1), e.set(this.vtxoTaprootKey, 33);
    const n = lr.toWords(e);
    return lr.encode(this.hrp, n, 1023);
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
const $i = ic(void 0, !0);
var Yt;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(Yt || (Yt = {}));
function Jl(t) {
  const e = [
    ze,
    $e,
    yo,
    Pi,
    wo
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${nt.encode(t)} is not a valid tapscript`);
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
    for (const p of u.pubkeys)
      if (p.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
    if (u.type || (u.type = e.CHECKSIG), u.type === e.CHECKSIGADD)
      return {
        type: Yt.Multisig,
        params: u,
        script: Rp(u.pubkeys.length, u.pubkeys).script
      };
    const l = [];
    for (let p = 0; p < u.pubkeys.length; p++)
      l.push(u.pubkeys[p]), p < u.pubkeys.length - 1 ? l.push("CHECKSIGVERIFY") : l.push("CHECKSIG");
    return {
      type: Yt.Multisig,
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
      } catch (p) {
        throw new Error(`Failed to decode script: ${p instanceof Error ? p.message : String(p)}`);
      }
    }
  }
  t.decode = r;
  function o(u) {
    const l = Et.decode(u), p = [];
    let h = !1;
    for (let m = 0; m < l.length; m++) {
      const v = l[m];
      if (typeof v != "string" && typeof v != "number") {
        if (v.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${v.length}`);
        if (p.push(v), m + 1 >= l.length || l[m + 1] !== "CHECKSIGADD" && l[m + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        m++;
        continue;
      }
      if (m === l.length - 1) {
        if (v !== "NUMEQUAL")
          throw new Error("Expected NUMEQUAL at end of script");
        h = !0;
      }
    }
    if (!h)
      throw new Error("Missing NUMEQUAL operation");
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const y = n({
      pubkeys: p,
      type: e.CHECKSIGADD
    });
    if (nt.encode(y.script) !== nt.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.Multisig,
      params: { pubkeys: p, type: e.CHECKSIGADD },
      script: u
    };
  }
  function s(u) {
    const l = Et.decode(u), p = [];
    for (let y = 0; y < l.length; y++) {
      const m = l[y];
      if (typeof m != "string" && typeof m != "number") {
        if (m.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${m.length}`);
        if (p.push(m), y + 1 >= l.length)
          throw new Error("Unexpected end of script");
        const v = l[y + 1];
        if (v !== "CHECKSIGVERIFY" && v !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (y === l.length - 2 && v !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        y++;
        continue;
      }
    }
    if (p.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const h = n({ pubkeys: p, type: e.CHECKSIG });
    if (nt.encode(h.script) !== nt.encode(u))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.Multisig,
      params: { pubkeys: p, type: e.CHECKSIG },
      script: u
    };
  }
  function c(u) {
    return u.type === Yt.Multisig;
  }
  t.is = c;
})(ze || (ze = {}));
var $e;
(function(t) {
  function e(o) {
    for (const p of o.pubkeys)
      if (p.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
    const s = $i.encode(BigInt(Oa.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) }))), c = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], u = ze.encode(o), l = new Uint8Array([
      ...Et.encode(c),
      ...u.script
    ]);
    return {
      type: Yt.CSVMultisig,
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
    } catch (v) {
      throw new Error(`Invalid multisig script: ${v instanceof Error ? v.message : String(v)}`);
    }
    const p = Number($i.decode(c)), h = Oa.decode(p), y = h.blocks !== void 0 ? { type: "blocks", value: BigInt(h.blocks) } : { type: "seconds", value: BigInt(h.seconds) }, m = e({
      timelock: y,
      ...l.params
    });
    if (nt.encode(m.script) !== nt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.CSVMultisig,
      params: {
        timelock: y,
        ...l.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Yt.CSVMultisig;
  }
  t.is = r;
})($e || ($e = {}));
var yo;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...Et.encode(["VERIFY"]),
      ...$e.encode(o).script
    ]);
    return {
      type: Yt.ConditionCSVMultisig,
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
    let p;
    try {
      p = $e.decode(l);
    } catch (y) {
      throw new Error(`Invalid CSV multisig script: ${y instanceof Error ? y.message : String(y)}`);
    }
    const h = e({
      conditionScript: u,
      ...p.params
    });
    if (nt.encode(h.script) !== nt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.ConditionCSVMultisig,
      params: {
        conditionScript: u,
        ...p.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Yt.ConditionCSVMultisig;
  }
  t.is = r;
})(yo || (yo = {}));
var Pi;
(function(t) {
  function e(o) {
    const s = new Uint8Array([
      ...o.conditionScript,
      ...Et.encode(["VERIFY"]),
      ...ze.encode(o).script
    ]);
    return {
      type: Yt.ConditionMultisig,
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
    let p;
    try {
      p = ze.decode(l);
    } catch (y) {
      throw new Error(`Invalid multisig script: ${y instanceof Error ? y.message : String(y)}`);
    }
    const h = e({
      conditionScript: u,
      ...p.params
    });
    if (nt.encode(h.script) !== nt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.ConditionMultisig,
      params: {
        conditionScript: u,
        ...p.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Yt.ConditionMultisig;
  }
  t.is = r;
})(Pi || (Pi = {}));
var wo;
(function(t) {
  function e(o) {
    const s = $i.encode(o.absoluteTimelock), c = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], u = Et.encode(c), l = new Uint8Array([
      ...u,
      ...ze.encode(o).script
    ]);
    return {
      type: Yt.CLTVMultisig,
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
    const p = $i.decode(c), h = e({
      absoluteTimelock: p,
      ...l.params
    });
    if (nt.encode(h.script) !== nt.encode(o))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Yt.CLTVMultisig,
      params: {
        absoluteTimelock: p,
        ...l.params
      },
      script: o
    };
  }
  t.decode = n;
  function r(o) {
    return o.type === Yt.CLTVMultisig;
  }
  t.is = r;
})(wo || (wo = {}));
function ro(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Pe {
  static decode(e) {
    const n = Rg(e);
    return new Pe(n);
  }
  constructor(e) {
    this.scripts = e;
    const n = dl(e.map((o) => ({ script: o, leafVersion: Ii }))), r = Cp(oc, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return Og(this.scripts);
  }
  address(e, n) {
    return new Ir(n, this.tweakedPublicKey, e);
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
    const n = this.leaves.find((r) => nt.encode(ro(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
  exitPaths() {
    const e = [];
    for (const n of this.leaves)
      try {
        const r = $e.decode(ro(n));
        e.push(r);
        continue;
      } catch {
        try {
          const o = yo.decode(ro(n));
          e.push(o);
        } catch {
          continue;
        }
      }
    return e;
  }
}
function Rg(t) {
  let e = 0;
  const n = [], [r, o] = cf(t, e);
  e += o;
  for (let s = 0; s < r; s++) {
    e += 1, e += 1;
    const [c, u] = cf(t, e);
    e += u;
    const l = t.slice(e, e + c);
    n.push(l), e += c;
  }
  return n;
}
function cf(t, e) {
  const n = t[e];
  return n < 253 ? [n, 1] : n === 253 ? [new DataView(t.buffer).getUint16(e + 1, !0), 3] : n === 254 ? [new DataView(t.buffer).getUint32(e + 1, !0), 5] : [Number(new DataView(t.buffer).getBigUint64(e + 1, !0)), 9];
}
function Og(t) {
  const e = [];
  e.push(uf(t.length));
  for (const s of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(uf(s.length)), e.push(s);
  const n = e.reduce((s, c) => s + c.length, 0), r = new Uint8Array(n);
  let o = 0;
  for (const s of e)
    r.set(s, o), o += s.length;
  return r;
}
function uf(t) {
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
var ff;
(function(t) {
  class e extends Pe {
    constructor(r) {
      const { sender: o, receiver: s, server: c, preimageHash: u, refundLocktime: l, unilateralClaimDelay: p, unilateralRefundDelay: h, unilateralRefundWithoutReceiverDelay: y } = r, m = $g(u), v = Pi.encode({
        conditionScript: m,
        pubkeys: [s, c]
      }).script, S = ze.encode({
        pubkeys: [o, s, c]
      }).script, _ = wo.encode({
        absoluteTimelock: l,
        pubkeys: [o, c]
      }).script, L = yo.encode({
        conditionScript: m,
        timelock: p,
        pubkeys: [s]
      }).script, z = $e.encode({
        timelock: h,
        pubkeys: [o, s]
      }).script, Z = $e.encode({
        timelock: y,
        pubkeys: [o]
      }).script;
      super([
        v,
        S,
        _,
        L,
        z,
        Z
      ]), this.options = r, this.claimScript = nt.encode(v), this.refundScript = nt.encode(S), this.refundWithoutReceiverScript = nt.encode(_), this.unilateralClaimScript = nt.encode(L), this.unilateralRefundScript = nt.encode(z), this.unilateralRefundWithoutReceiverScript = nt.encode(Z);
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
})(ff || (ff = {}));
function $g(t) {
  return Et.encode(["HASH160", t, "EQUAL"]);
}
var Li;
(function(t) {
  class e extends Pe {
    constructor(r) {
      const { pubKey: o, serverPubKey: s, csvTimelock: c = e.DEFAULT_TIMELOCK } = r, u = ze.encode({
        pubkeys: [o, s]
      }).script, l = $e.encode({
        timelock: c,
        pubkeys: [o]
      }).script;
      super([u, l]), this.options = r, this.forfeitScript = nt.encode(u), this.exitScript = nt.encode(l);
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
})(Li || (Li = {}));
var mo;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(mo || (mo = {}));
function bo(t) {
  return t.spentBy === void 0 || t.spentBy === "";
}
function Pg(t) {
  return t.virtualStatus.state === "swept" && bo(t);
}
function td(t, e) {
  return t.value < e;
}
function ed(t, e, n) {
  var c;
  const r = [];
  let o = [...e];
  for (const u of [...t, ...e]) {
    if (u.virtualStatus.state !== "preconfirmed" && u.virtualStatus.commitmentTxIds && u.virtualStatus.commitmentTxIds.some((S) => n.has(S)))
      continue;
    const l = Lg(o, u);
    o = lf(o, l);
    const p = ai(l);
    if (u.value <= p)
      continue;
    const h = Dg(o, u);
    o = lf(o, h);
    const y = ai(h);
    if (u.value <= y)
      continue;
    const m = {
      commitmentTxid: u.spentBy || "",
      boardingTxid: "",
      arkTxid: ""
    };
    let v = u.virtualStatus.state !== "preconfirmed";
    u.virtualStatus.state === "preconfirmed" && (m.arkTxid = u.txid, u.spentBy && (v = !0)), r.push({
      key: m,
      amount: u.value - p - y,
      type: mo.TxReceived,
      createdAt: u.createdAt.getTime(),
      settled: v
    });
  }
  const s = /* @__PURE__ */ new Map();
  for (const u of e) {
    if (u.settledBy) {
      s.has(u.settledBy) || s.set(u.settledBy, []);
      const p = s.get(u.settledBy);
      s.set(u.settledBy, [...p, u]);
    }
    if (!u.arkTxId)
      continue;
    s.has(u.arkTxId) || s.set(u.arkTxId, []);
    const l = s.get(u.arkTxId);
    s.set(u.arkTxId, [...l, u]);
  }
  for (const [u, l] of s) {
    const p = Kg([...t, ...e], u), h = ai(p), y = ai(l);
    if (y <= h)
      continue;
    const m = Mg(p, l), v = {
      commitmentTxid: ((c = m.virtualStatus.commitmentTxIds) == null ? void 0 : c[0]) || "",
      boardingTxid: "",
      arkTxid: ""
    };
    m.virtualStatus.state === "preconfirmed" && (v.arkTxid = m.txid), r.push({
      key: v,
      amount: y - h,
      type: mo.TxSent,
      createdAt: m.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Lg(t, e) {
  return e.virtualStatus.state === "preconfirmed" ? [] : t.filter((n) => {
    var r;
    return n.settledBy ? ((r = e.virtualStatus.commitmentTxIds) == null ? void 0 : r.includes(n.settledBy)) ?? !1 : !1;
  });
}
function Dg(t, e) {
  return t.filter((n) => n.arkTxId ? n.arkTxId === e.txid : !1);
}
function Kg(t, e) {
  return t.filter((n) => {
    var r;
    return n.virtualStatus.state !== "preconfirmed" && ((r = n.virtualStatus.commitmentTxIds) != null && r.includes(e)) ? !0 : n.txid === e;
  });
}
function ai(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function Mg(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function lf(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
const Vg = (t) => Hg[t], Hg = {
  bitcoin: Gr(Tr, "ark"),
  testnet: Gr(ni, "tark"),
  signet: Gr(ni, "tark"),
  mutinynet: Gr(ni, "tark"),
  regtest: Gr({
    ...ni,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function Gr(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const jg = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class Fg {
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
      const p = () => Promise.all(e.map((m) => this.getTransactions(m))).then((m) => m.flat()), h = await p(), y = (m) => `${m.txid}_${m.status.block_time}`;
      r = setInterval(async () => {
        try {
          const m = await p(), v = new Set(h.map(y)), S = m.filter((_) => !v.has(y(_)));
          S.length > 0 && (h.push(...S), n(S));
        } catch (m) {
          console.error("Error in polling mechanism:", m);
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
          const p = [], h = JSON.parse(l.data.toString());
          if (!h["multi-address-transactions"])
            return;
          const y = h["multi-address-transactions"];
          for (const m in y)
            for (const v of [
              "mempool",
              "confirmed",
              "removed"
            ])
              y[m][v] && p.push(...y[m][v].filter(zg));
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
    if (!qg(n))
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
function qg(t) {
  return Array.isArray(t) && t.every((e) => {
    e && typeof e == "object" && typeof e.id == "string" && e.id.length > 0 && typeof e.height == "number" && e.height >= 0 && typeof e.mediantime == "number" && e.mediantime > 0;
  });
}
const zg = (t) => typeof t.txid == "string" && Array.isArray(t.vout) && t.vout.every((e) => typeof e.scriptpubkey_address == "string" && typeof e.value == "string") && typeof t.status == "object" && typeof t.status.confirmed == "boolean" && typeof t.status.block_time == "number";
var Ct;
(function(t) {
  t.BatchStarted = "batch_started", t.BatchFinalization = "batch_finalization", t.BatchFinalized = "batch_finalized", t.BatchFailed = "batch_failed", t.TreeSigningStarted = "tree_signing_started", t.TreeNoncesAggregated = "tree_nonces_aggregated", t.TreeTx = "tree_tx", t.TreeSignature = "tree_signature";
})(Ct || (Ct = {}));
class nd {
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
        treeNonces: Gg(r)
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
        treeSignatures: Wg(r)
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
    for (; !(e != null && e.aborted); )
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
        for (; !(e != null && e.aborted); ) {
          const { done: p, value: h } = await c.read();
          if (p)
            break;
          l += u.decode(h, { stream: !0 });
          const y = l.split(`
`);
          for (let m = 0; m < y.length - 1; m++) {
            const v = y[m].trim();
            if (v)
              try {
                const S = JSON.parse(v), _ = this.parseSettlementEvent(S.result);
                _ && (yield _);
              } catch (S) {
                throw console.error("Failed to parse event:", S), S;
              }
          }
          l = y[y.length - 1];
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if ($a(s)) {
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
        const o = r.body.getReader(), s = new TextDecoder();
        let c = "";
        for (; !(e != null && e.aborted); ) {
          const { done: u, value: l } = await o.read();
          if (u)
            break;
          c += s.decode(l, { stream: !0 });
          const p = c.split(`
`);
          for (let h = 0; h < p.length - 1; h++) {
            const y = p[h].trim();
            if (!y)
              continue;
            const m = JSON.parse(y), v = this.parseTransactionNotification(m.result);
            v && (yield v);
          }
          c = p[p.length - 1];
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if ($a(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Address subscription error:", r), r;
      }
  }
  parseSettlementEvent(e) {
    if (e.batchStarted)
      return {
        type: Ct.BatchStarted,
        id: e.batchStarted.id,
        intentIdHashes: e.batchStarted.intentIdHashes,
        batchExpiry: BigInt(e.batchStarted.batchExpiry)
      };
    if (e.batchFinalization)
      return {
        type: Ct.BatchFinalization,
        id: e.batchFinalization.id,
        commitmentTx: e.batchFinalization.commitmentTx
      };
    if (e.batchFinalized)
      return {
        type: Ct.BatchFinalized,
        id: e.batchFinalized.id,
        commitmentTxid: e.batchFinalized.commitmentTxid
      };
    if (e.batchFailed)
      return {
        type: Ct.BatchFailed,
        id: e.batchFailed.id,
        reason: e.batchFailed.reason
      };
    if (e.treeSigningStarted)
      return {
        type: Ct.TreeSigningStarted,
        id: e.treeSigningStarted.id,
        cosignersPublicKeys: e.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: e.treeSigningStarted.unsignedCommitmentTx
      };
    if (e.treeNoncesAggregated)
      return {
        type: Ct.TreeNoncesAggregated,
        id: e.treeNoncesAggregated.id,
        treeNonces: Yg(e.treeNoncesAggregated.treeNonces)
      };
    if (e.treeTx) {
      const n = Object.fromEntries(Object.entries(e.treeTx.children).map(([r, o]) => [parseInt(r), o]));
      return {
        type: Ct.TreeTx,
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
      type: Ct.TreeSignature,
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
        spentVtxos: e.commitmentTx.spentVtxos.map(ci),
        spendableVtxos: e.commitmentTx.spendableVtxos.map(ci),
        checkpointTxs: e.commitmentTx.checkpointTxs
      }
    } : e.arkTx ? {
      arkTx: {
        txid: e.arkTx.txid,
        tx: e.arkTx.tx,
        spentVtxos: e.arkTx.spentVtxos.map(ci),
        spendableVtxos: e.arkTx.spendableVtxos.map(ci),
        checkpointTxs: e.arkTx.checkpointTxs
      }
    } : (console.warn("Unknown transaction notification type:", e), null);
  }
}
function Gg(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = nt.encode(r.pubNonce);
  return JSON.stringify(e);
}
function Wg(t) {
  const e = {};
  for (const [n, r] of t)
    e[n] = nt.encode(r.encode());
  return JSON.stringify(e);
}
function Yg(t) {
  const e = JSON.parse(t);
  return new Map(Object.entries(e).map(([n, r]) => {
    if (typeof r != "string")
      throw new Error("invalid nonce");
    return [n, { pubNonce: nt.decode(r) }];
  }));
}
function $a(t) {
  const e = (n) => n instanceof Error && (n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT");
  return e(t) || e(t.cause);
}
function ci(t) {
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
const Zg = 0n, Xg = new Uint8Array([81, 2, 78, 115]), Ac = {
  script: Xg,
  amount: Zg
};
nt.encode(Ac.script);
function Qg(t, e, n) {
  const r = new se({
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
  }), r.addOutput(Ac), r;
}
const Jg = new Error("invalid settlement transaction outputs"), ty = new Error("empty tree"), ey = new Error("invalid number of inputs"), oa = new Error("wrong settlement txid"), ny = new Error("invalid amount"), ry = new Error("no leaves"), oy = new Error("invalid taproot script"), df = new Error("invalid round transaction outputs"), iy = new Error("wrong commitment txid"), sy = new Error("missing cosigners public keys"), ia = 0, hf = 1;
function ay(t, e) {
  if (e.validate(), e.root.inputsLength !== 1)
    throw ey;
  const n = e.root.getInput(0), r = se.fromPSBT(be.decode(t));
  if (r.outputsLength <= hf)
    throw Jg;
  const o = nt.encode(fe(r.toBytes(!0)).reverse());
  if (!n.txid || nt.encode(n.txid) !== o || n.index !== hf)
    throw oa;
}
function cy(t, e, n) {
  var l;
  if (e.outputsLength < ia + 1)
    throw df;
  const r = (l = e.getOutput(ia)) == null ? void 0 : l.amount;
  if (!r)
    throw df;
  if (!t.root)
    throw ty;
  const o = t.root.getInput(0), s = nt.encode(fe(e.toBytes(!0)).reverse());
  if (!o.txid || nt.encode(o.txid) !== s || o.index !== ia)
    throw iy;
  let c = 0n;
  for (let p = 0; p < t.root.outputsLength; p++) {
    const h = t.root.getOutput(p);
    h != null && h.amount && (c += h.amount);
  }
  if (c !== r)
    throw ny;
  if (t.leaves().length === 0)
    throw ry;
  t.validate();
  for (const p of t)
    for (const [h, y] of p.children) {
      const m = p.root.getOutput(h);
      if (!(m != null && m.script))
        throw new Error(`parent output ${h} not found`);
      const v = m.script.slice(2);
      if (v.length !== 32)
        throw new Error(`parent output ${h} has invalid script`);
      const S = Yl(y.root, 0, Zl);
      if (S.length === 0)
        throw sy;
      const _ = S.map((z) => z.key), { finalKey: L } = Sc(_, !0, {
        taprootTweak: n
      });
      if (!L || nt.encode(L.slice(1)) !== nt.encode(v))
        throw oy;
    }
}
function uy(t, e, n) {
  const r = t.map((s) => fy(s, n));
  return {
    arkTx: rd(r.map((s) => s.input), e),
    checkpoints: r.map((s) => s.tx)
  };
}
function rd(t, e) {
  let n = 0n;
  for (const o of t) {
    const s = Jl(ro(o.tapLeafScript));
    if (wo.is(s)) {
      if (n !== 0n && pf(n) !== pf(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new se({
    version: 3,
    allowUnknown: !0,
    allowUnknownOutputs: !0,
    lockTime: Number(n)
  });
  for (const [o, s] of t.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? lc - 1 : void 0,
      witnessUtxo: {
        script: Pe.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Ng(r, o, Ug, s.tapTree);
  for (const o of e)
    r.addOutput(o);
  return r.addOutput(Ac), r;
}
function fy(t, e) {
  const n = Jl(t.checkpointTapLeafScript ?? ro(t.tapLeafScript)), r = new Pe([
    e.script,
    n.script
  ]), o = rd([t], [
    {
      amount: BigInt(t.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(nt.encode(n.script)), c = {
    txid: nt.encode(fe(o.toBytes(!0)).reverse()),
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
const ly = 500000000n;
function pf(t) {
  return t >= ly;
}
class zt {
  constructor(e, n, r = zt.DefaultHRP) {
    this.preimage = e, this.value = n, this.HRP = r, this.vout = 0;
    const o = Gt(this.preimage);
    this.vtxoScript = new Pe([py(o)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = nt.encode(new Uint8Array(o).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const e = new Uint8Array(zt.Length);
    return e.set(this.preimage, 0), dy(e, this.value, this.preimage.length), e;
  }
  static decode(e, n = zt.DefaultHRP) {
    if (e.length !== zt.Length)
      throw new Error(`invalid data length: expected ${zt.Length} bytes, got ${e.length}`);
    const r = e.subarray(0, zt.PreimageLength), o = hy(e, zt.PreimageLength);
    return new zt(r, o, n);
  }
  static fromString(e, n = zt.DefaultHRP) {
    if (e = e.trim(), !e.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${e}')`);
    const r = e.slice(n.length), o = ha.decode(r);
    if (o.length === 0)
      throw new Error("failed to decode base58 string");
    return zt.decode(o, n);
  }
  toString() {
    return this.HRP + ha.encode(this.encode());
  }
}
zt.DefaultHRP = "arknote";
zt.PreimageLength = 32;
zt.ValueLength = 4;
zt.Length = zt.PreimageLength + zt.ValueLength;
zt.FakeOutpointIndex = 0;
function dy(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function hy(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
function py(t) {
  return Et.encode(["SHA256", t, "EQUAL"]);
}
class Ic extends Error {
  constructor(e) {
    super(e), this.name = "BIP322Error";
  }
}
const gy = new Ic("missing inputs"), Di = new Ic("missing data"), yy = new Ic("missing witness utxo");
var Ki;
(function(t) {
  function e(r, o, s = []) {
    if (o.length == 0)
      throw gy;
    xy(o), Ty(s);
    const c = ky(r, o[0].witnessUtxo.script);
    return Ay(c, o, s);
  }
  t.create = e;
  function n(r, o = (s) => s.finalize()) {
    return o(r), be.encode(r.extract());
  }
  t.signature = n;
})(Ki || (Ki = {}));
const wy = new Uint8Array([jt.RETURN]), my = new Uint8Array(32).fill(0), by = 4294967295, vy = "BIP0322-signed-message";
function Ey(t) {
  if (t.index === void 0 || t.txid === void 0)
    throw Di;
  if (t.witnessUtxo === void 0)
    throw yy;
  return !0;
}
function xy(t) {
  return t.forEach(Ey), !0;
}
function Sy(t) {
  if (t.amount === void 0 || t.script === void 0)
    throw Di;
  return !0;
}
function Ty(t) {
  return t.forEach(Sy), !0;
}
function ky(t, e) {
  const n = Iy(t), r = new se({
    version: 0,
    allowUnknownOutputs: !0,
    allowUnknown: !0,
    allowUnknownInputs: !0
  });
  return r.addInput({
    txid: my,
    // zero hash
    index: by,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: e
  }), r.updateInput(0, {
    finalScriptSig: Et.encode(["OP_0", n])
  }), r;
}
function Ay(t, e, n) {
  const r = e[0], o = new se({
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
      script: wy
    }
  ]);
  for (const s of n)
    o.addOutput({
      amount: s.amount,
      script: s.script
    });
  return o;
}
function Iy(t) {
  return xc.utils.taggedHash(vy, new TextEncoder().encode(t));
}
var Pa;
(function(t) {
  t[t.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", t[t.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", t[t.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Pa || (Pa = {}));
var mr;
(function(t) {
  t.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", t.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", t.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", t.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", t.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(mr || (mr = {}));
class od {
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
    if (!Le.isVtxoTreeResponse(c))
      throw new Error("Invalid vtxo tree data received");
    return c.vtxoTree.forEach((u) => {
      u.children = Object.fromEntries(Object.entries(u.children).map(([l, p]) => [
        Number(l),
        p
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
    if (!Le.isVtxoTreeLeavesResponse(c))
      throw new Error("Invalid vtxos tree leaves data received");
    return c;
  }
  async getBatchSweepTransactions(e) {
    const n = `${this.serverUrl}/v1/batch/${e.txid}/${e.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const o = await r.json();
    if (!Le.isBatchSweepTransactionsResponse(o))
      throw new Error("Invalid batch sweep transactions data received");
    return o;
  }
  async getCommitmentTx(e) {
    const n = `${this.serverUrl}/v1/commitmentTx/${e}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const o = await r.json();
    if (!Le.isCommitmentTx(o))
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
    if (!Le.isConnectorsResponse(c))
      throw new Error("Invalid commitment tx connectors data received");
    return c.connectors.forEach((u) => {
      u.children = Object.fromEntries(Object.entries(u.children).map(([l, p]) => [
        Number(l),
        p
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
    if (!Le.isForfeitTxsResponse(c))
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
          const { done: l, value: p } = await s.read();
          if (l)
            break;
          u += c.decode(p, { stream: !0 });
          const h = u.split(`
`);
          for (let y = 0; y < h.length - 1; y++) {
            const m = h[y].trim();
            if (!m)
              continue;
            const v = JSON.parse(m);
            "result" in v && (yield {
              txid: v.result.txid,
              scripts: v.result.scripts || [],
              newVtxos: (v.result.newVtxos || []).map(sa),
              spentVtxos: (v.result.spentVtxos || []).map(sa),
              tx: v.result.tx,
              checkpointTxs: v.result.checkpointTxs
            });
          }
          u = h[h.length - 1];
        }
      } catch (o) {
        if (o instanceof Error && o.name === "AbortError")
          break;
        if ($a(o)) {
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
    if (!Le.isVirtualTxsResponse(c))
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
    if (!Le.isVtxoChainResponse(c))
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
    const o = await fetch(n);
    if (!o.ok)
      throw new Error(`Failed to fetch vtxos: ${o.statusText}`);
    const s = await o.json();
    if (!Le.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(sa),
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
function sa(t) {
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
var Le;
(function(t) {
  function e(T) {
    return typeof T == "object" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.expiresAt == "string" && typeof T.swept == "boolean";
  }
  function n(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.expiresAt == "string" && Object.values(mr).includes(T.type) && Array.isArray(T.spends) && T.spends.every((ut) => typeof ut == "string");
  }
  function r(T) {
    return typeof T == "object" && typeof T.startedAt == "string" && typeof T.endedAt == "string" && typeof T.totalInputAmount == "string" && typeof T.totalInputVtxos == "number" && typeof T.totalOutputAmount == "string" && typeof T.totalOutputVtxos == "number" && typeof T.batches == "object" && Object.values(T.batches).every(e);
  }
  t.isCommitmentTx = r;
  function o(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.vout == "number";
  }
  t.isOutpoint = o;
  function s(T) {
    return Array.isArray(T) && T.every(o);
  }
  t.isOutpointArray = s;
  function c(T) {
    return typeof T == "object" && typeof T.txid == "string" && typeof T.children == "object" && Object.values(T.children).every(h) && Object.keys(T.children).every((ut) => Number.isInteger(Number(ut)));
  }
  function u(T) {
    return Array.isArray(T) && T.every(c);
  }
  t.isTxsArray = u;
  function l(T) {
    return typeof T == "object" && typeof T.amount == "string" && typeof T.createdAt == "string" && typeof T.isSettled == "boolean" && typeof T.settledBy == "string" && Object.values(Pa).includes(T.type) && (!T.commitmentTxid && typeof T.virtualTxid == "string" || typeof T.commitmentTxid == "string" && !T.virtualTxid);
  }
  function p(T) {
    return Array.isArray(T) && T.every(l);
  }
  t.isTxHistoryRecordArray = p;
  function h(T) {
    return typeof T == "string" && T.length === 64;
  }
  function y(T) {
    return Array.isArray(T) && T.every(h);
  }
  t.isTxidArray = y;
  function m(T) {
    return typeof T == "object" && o(T.outpoint) && typeof T.createdAt == "string" && typeof T.expiresAt == "string" && typeof T.amount == "string" && typeof T.script == "string" && typeof T.isPreconfirmed == "boolean" && typeof T.isSwept == "boolean" && typeof T.isUnrolled == "boolean" && typeof T.isSpent == "boolean" && (!T.spentBy || typeof T.spentBy == "string") && (!T.settledBy || typeof T.settledBy == "string") && (!T.arkTxid || typeof T.arkTxid == "string") && Array.isArray(T.commitmentTxids) && T.commitmentTxids.every(h);
  }
  function v(T) {
    return typeof T == "object" && typeof T.current == "number" && typeof T.next == "number" && typeof T.total == "number";
  }
  function S(T) {
    return typeof T == "object" && Array.isArray(T.vtxoTree) && T.vtxoTree.every(c) && (!T.page || v(T.page));
  }
  t.isVtxoTreeResponse = S;
  function _(T) {
    return typeof T == "object" && Array.isArray(T.leaves) && T.leaves.every(o) && (!T.page || v(T.page));
  }
  t.isVtxoTreeLeavesResponse = _;
  function L(T) {
    return typeof T == "object" && Array.isArray(T.connectors) && T.connectors.every(c) && (!T.page || v(T.page));
  }
  t.isConnectorsResponse = L;
  function z(T) {
    return typeof T == "object" && Array.isArray(T.txids) && T.txids.every(h) && (!T.page || v(T.page));
  }
  t.isForfeitTxsResponse = z;
  function Z(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(h);
  }
  t.isSweptCommitmentTxResponse = Z;
  function W(T) {
    return typeof T == "object" && Array.isArray(T.sweptBy) && T.sweptBy.every(h);
  }
  t.isBatchSweepTransactionsResponse = W;
  function H(T) {
    return typeof T == "object" && Array.isArray(T.txs) && T.txs.every((ut) => typeof ut == "string") && (!T.page || v(T.page));
  }
  t.isVirtualTxsResponse = H;
  function $(T) {
    return typeof T == "object" && Array.isArray(T.chain) && T.chain.every(n) && (!T.page || v(T.page));
  }
  t.isVtxoChainResponse = $;
  function rt(T) {
    return typeof T == "object" && Array.isArray(T.vtxos) && T.vtxos.every(m) && (!T.page || v(T.page));
  }
  t.isVtxosResponse = rt;
})(Le || (Le = {}));
class La {
  constructor(e, n = /* @__PURE__ */ new Map()) {
    this.root = e, this.children = n;
  }
  static create(e) {
    if (e.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of e) {
      const c = _y(s), u = nt.encode(fe(c.tx.toBytes(!0)).reverse());
      n.set(u, c);
    }
    const r = [];
    for (const [s] of n) {
      let c = !1;
      for (const [u, l] of n)
        if (u !== s && (c = By(l, s), c))
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
    const o = id(r[0], n);
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
      const s = o.root.getInput(0), c = nt.encode(fe(this.root.toBytes(!0)).reverse());
      if (!s.txid || nt.encode(s.txid) !== c || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let u = 0n;
      for (let p = 0; p < o.root.outputsLength; p++) {
        const h = o.root.getOutput(p);
        h != null && h.amount && (u += h.amount);
      }
      const l = this.root.getOutput(r);
      if (!(l != null && l.amount))
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
    return nt.encode(fe(this.root.toBytes(!0)).reverse());
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
function By(t, e) {
  return Object.values(t.children).includes(e);
}
function id(t, e) {
  const n = e.get(t);
  if (!n)
    return null;
  const r = n.tx, o = /* @__PURE__ */ new Map();
  for (const [s, c] of Object.entries(n.children)) {
    const u = parseInt(s), l = id(c, e);
    l && o.set(u, l);
  }
  return new La(r, o);
}
function _y(t) {
  return { tx: se.fromPSBT(be.decode(t.tx)), children: t.children };
}
class Br {
  constructor(e, n, r, o, s, c, u, l, p, h, y, m) {
    this.identity = e, this.network = n, this.networkName = r, this.onchainProvider = o, this.arkProvider = s, this.indexerProvider = c, this.arkServerPublicKey = u, this.offchainTapscript = l, this.boardingTapscript = p, this.serverUnrollScript = h, this.forfeitOutputScript = y, this.dustAmount = m;
  }
  static async create(e) {
    const n = e.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = new nd(e.arkServerUrl), o = new od(e.arkServerUrl), s = await r.getInfo(), c = Vg(s.network), u = new Fg(e.esploraUrl || jg[s.network]), l = {
      value: s.unilateralExitDelay,
      type: s.unilateralExitDelay < 512n ? "blocks" : "seconds"
    }, p = {
      value: s.boardingExitDelay,
      type: s.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, h = nt.decode(s.signerPubkey).slice(1), y = new Li.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: l
    }), m = new Li.Script({
      pubKey: n,
      serverPubKey: h,
      csvTimelock: p
    }), v = y, S = $e.encode({
      timelock: l,
      pubkeys: [h]
    }), _ = tr(c).decode(s.forfeitAddress), L = Wt.encode(_);
    return new Br(e.identity, c, s.network, u, r, o, h, v, m, S, L, s.dust);
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
    for (const h of e)
      h.status.confirmed ? r += h.value : o += h.value;
    let s = 0, c = 0, u = 0;
    s = n.filter((h) => h.virtualStatus.state === "settled").reduce((h, y) => h + y.value, 0), c = n.filter((h) => h.virtualStatus.state === "preconfirmed").reduce((h, y) => h + y.value, 0), u = n.filter((h) => bo(h) && h.virtualStatus.state === "swept").reduce((h, y) => h + y.value, 0);
    const l = r + o, p = s + c + u;
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
      total: l + p
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
    const n = [nt.encode(this.offchainTapscript.pkScript)], o = (await this.indexerProvider.getVtxos({
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
      scripts: [nt.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), o = [], s = [];
    for (const l of e.vtxos)
      bo(l) ? o.push(l) : s.push(l);
    const c = ed(o, s, r), u = [...n, ...c];
    return u.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (l, p) => l.createdAt === 0 ? -1 : p.createdAt === 0 ? 1 : p.createdAt - l.createdAt
    ), u;
  }
  async getBoardingTxs() {
    const e = await this.getBoardingAddress(), n = await this.onchainProvider.getTransactions(e), r = [], o = /* @__PURE__ */ new Set();
    for (const u of n)
      for (let l = 0; l < u.vout.length; l++) {
        const p = u.vout[l];
        if (p.scriptpubkey_address === e) {
          const y = (await this.onchainProvider.getTxOutspends(u.txid))[l];
          y != null && y.spent && o.add(y.txid), r.push({
            txid: u.txid,
            vout: l,
            value: Number(p.value),
            status: {
              confirmed: u.status.confirmed,
              block_time: u.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: y != null && y.spent ? "spent" : "settled",
              commitmentTxIds: y != null && y.spent ? [y.txid] : void 0
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
        type: mo.TxReceived,
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
    if (!Cy(e.address))
      throw new Error("Invalid Ark address " + e.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    }), r = Ry(n, e.amount), o = this.offchainTapscript.forfeit();
    if (!o)
      throw new Error("Selected leaf not found");
    const s = Ir.decode(e.address), u = [
      {
        script: BigInt(e.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(e.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const S = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      u.push({
        script: S,
        amount: BigInt(r.changeAmount)
      });
    }
    const l = this.offchainTapscript.encode();
    let p = uy(r.inputs.map((S) => ({
      ...S,
      tapLeafScript: o,
      tapTree: l
    })), u, this.serverUnrollScript);
    const h = await this.identity.sign(p.arkTx), { arkTxid: y, signedCheckpointTxs: m } = await this.arkProvider.submitTx(be.encode(h.toPSBT()), p.checkpoints.map((S) => be.encode(S.toPSBT()))), v = await Promise.all(m.map(async (S) => {
      const _ = se.fromPSBT(be.decode(S)), L = await this.identity.sign(_);
      return be.encode(L.toPSBT());
    }));
    return await this.arkProvider.finalizeTx(y, v), y;
  }
  async settle(e, n) {
    if (e != null && e.inputs) {
      for (const m of e.inputs)
        if (typeof m == "string")
          try {
            zt.fromString(m);
          } catch {
            throw new Error(`Invalid arknote "${m}"`);
          }
    }
    if (!e) {
      let m = 0;
      const v = await this.getBoardingUtxos();
      m += v.reduce((L, z) => L + z.value, 0);
      const S = await this.getVtxos();
      m += S.reduce((L, z) => L + z.value, 0);
      const _ = [...v, ...S];
      if (_.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: _,
        outputs: [
          {
            address: await this.getAddress(),
            amount: BigInt(m)
          }
        ]
      };
    }
    const r = [], o = [];
    let s = !1;
    for (const [m, v] of e.outputs.entries()) {
      let S;
      try {
        S = Ir.decode(v.address).pkScript, s = !0;
      } catch {
        const _ = tr(this.network).decode(v.address);
        S = Wt.encode(_), r.push(m);
      }
      o.push({
        amount: v.amount,
        script: S
      });
    }
    let c;
    const u = [];
    s && (c = this.identity.signerSession(), u.push(nt.encode(c.getPublicKey())));
    const [l, p] = await Promise.all([
      this.makeRegisterIntentSignature(e.inputs, o, r, u),
      this.makeDeleteIntentSignature(e.inputs)
    ]), h = await this.arkProvider.registerIntent(l), y = new AbortController();
    try {
      let m;
      const v = [
        ...u,
        ...e.inputs.map(($) => `${$.txid}:${$.vout}`)
      ], S = this.arkProvider.getEventStream(y.signal, v);
      let _, L;
      const z = [], Z = [];
      let W, H;
      for await (const $ of S)
        switch (n && n($), $.type) {
          // the settlement failed
          case Ct.BatchFailed:
            if ($.id === _)
              throw new Error($.reason);
            break;
          case Ct.BatchStarted:
            if (m !== void 0)
              continue;
            const rt = await this.handleBatchStartedEvent($, h, this.arkServerPublicKey, this.forfeitOutputScript);
            rt.skip || (m = $.type, L = rt.sweepTapTreeRoot, _ = rt.roundId, s || (m = Ct.TreeNoncesAggregated));
            break;
          case Ct.TreeTx:
            if (m !== Ct.BatchStarted && m !== Ct.TreeNoncesAggregated)
              continue;
            if ($.batchIndex === 0)
              z.push($.chunk);
            else if ($.batchIndex === 1)
              Z.push($.chunk);
            else
              throw new Error(`Invalid batch index: ${$.batchIndex}`);
            break;
          case Ct.TreeSignature:
            if (m !== Ct.TreeNoncesAggregated || !s)
              continue;
            if (!W)
              throw new Error("Vtxo graph not set, something went wrong");
            if ($.batchIndex === 0) {
              const T = nt.decode($.signature);
              W.update($.txid, (ut) => {
                ut.updateInput(0, {
                  tapKeySig: T
                });
              });
            }
            break;
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case Ct.TreeSigningStarted:
            if (m !== Ct.BatchStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              if (!L)
                throw new Error("Sweep tap tree root not set");
              if (z.length === 0)
                throw new Error("unsigned vtxo graph not received");
              W = La.create(z), await this.handleSettlementSigningEvent($, L, c, W);
            }
            m = $.type;
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case Ct.TreeNoncesAggregated:
            if (m !== Ct.TreeSigningStarted)
              continue;
            if (s) {
              if (!c)
                throw new Error("Signing session not set");
              await this.handleSettlementSigningNoncesGeneratedEvent($, c);
            }
            m = $.type;
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case Ct.BatchFinalization:
            if (m !== Ct.TreeNoncesAggregated)
              continue;
            if (!this.forfeitOutputScript)
              throw new Error("Forfeit output script not set");
            Z.length > 0 && (H = La.create(Z), ay($.commitmentTx, H)), await this.handleSettlementFinalizationEvent($, e.inputs, this.forfeitOutputScript, H), m = $.type;
            break;
          // the settlement is done, last event to be received
          case Ct.BatchFinalized:
            if (m !== Ct.BatchFinalization)
              continue;
            return y.abort(), $.commitmentTxid;
        }
    } catch (m) {
      y.abort();
      try {
        await this.arkProvider.deleteIntent(p);
      } catch {
      }
      throw m;
    }
    throw new Error("Settlement failed");
  }
  async notifyIncomingFunds(e) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let o, s;
    if (this.onchainProvider && r && (o = await this.onchainProvider.watchAddresses([r], (u) => {
      const l = u.map((p) => {
        const h = p.vout.findIndex((y) => y.scriptpubkey_address === r);
        return h === -1 ? (console.warn(`No vout found for address ${r} in transaction ${p.txid}`), null) : {
          txid: p.txid,
          vout: h,
          value: Number(p.vout[h].value),
          status: p.status
        };
      }).filter((p) => p !== null);
      e({
        type: "utxo",
        coins: l
      });
    })), this.indexerProvider && n) {
      const u = this.offchainTapscript, l = await this.indexerProvider.subscribeForScripts([
        nt.encode(u.pkScript)
      ]), p = new AbortController(), h = this.indexerProvider.getSubscription(l, p.signal);
      s = async () => {
        var y;
        p.abort(), await ((y = this.indexerProvider) == null ? void 0 : y.unsubscribeForScripts(l));
      }, (async () => {
        var y;
        try {
          for await (const m of h)
            ((y = m.newVtxos) == null ? void 0 : y.length) > 0 && e({
              type: "vtxo",
              vtxos: m.newVtxos
            });
        } catch (m) {
          console.error("Subscription error:", m);
        }
      })();
    }
    return () => {
      o == null || o(), s == null || s();
    };
  }
  async handleBatchStartedEvent(e, n, r, o) {
    const s = new TextEncoder().encode(n), c = Gt(s), u = nt.encode(new Uint8Array(c));
    let l = !0;
    for (const y of e.intentIdHashes)
      if (y === u) {
        if (!this.arkProvider)
          throw new Error("Ark provider not configured");
        await this.arkProvider.confirmRegistration(n), l = !1;
      }
    if (l)
      return { skip: l };
    const p = $e.encode({
      timelock: {
        value: e.batchExpiry,
        type: e.batchExpiry >= 512n ? "seconds" : "blocks"
      },
      pubkeys: [r]
    }).script, h = Jr(p);
    return {
      roundId: e.id,
      sweepTapTreeRoot: h,
      forfeitOutputScript: o,
      skip: !1
    };
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r, o) {
    const s = se.fromPSBT(be.decode(e.unsignedCommitmentTx));
    cy(o, s, n);
    const c = s.getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(o, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, nt.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, nt.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r, o) {
    const s = [], c = await this.getVirtualCoins();
    let u = se.fromPSBT(be.decode(e.commitmentTx)), l = !1, p = 0;
    const h = (o == null ? void 0 : o.leaves()) || [];
    for (const y of n) {
      const m = c.find((W) => W.txid === y.txid && W.vout === y.vout);
      if (!m) {
        l = !0;
        const W = [];
        for (let H = 0; H < u.inputsLength; H++) {
          const $ = u.getInput(H);
          if (!$.txid || $.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          nt.encode($.txid) === y.txid && $.index === y.vout && (u.updateInput(H, {
            tapLeafScript: [y.forfeitTapLeafScript]
          }), W.push(H));
        }
        u = await this.identity.sign(u, W);
        continue;
      }
      if (Pg(m) || td(m, this.dustAmount))
        continue;
      if (h.length === 0)
        throw new Error("connectors not received");
      if (p >= h.length)
        throw new Error("not enough connectors received");
      const v = h[p], S = nt.encode(fe(v.toBytes(!0)).reverse()), _ = v.getOutput(0);
      if (!_)
        throw new Error("connector output not found");
      const L = _.amount, z = _.script;
      if (!L || !z)
        throw new Error("invalid connector output");
      p++;
      let Z = Qg([
        {
          txid: y.txid,
          index: y.vout,
          witnessUtxo: {
            amount: BigInt(m.value),
            script: Pe.decode(y.tapTree).pkScript
          },
          sighashType: gn.DEFAULT,
          tapLeafScript: [y.forfeitTapLeafScript]
        },
        {
          txid: S,
          index: 0,
          witnessUtxo: {
            amount: L,
            script: z
          }
        }
      ], r);
      Z = await this.identity.sign(Z, [0]), s.push(be.encode(Z.toPSBT()));
    }
    (s.length > 0 || l) && await this.arkProvider.submitSignedForfeitTxs(s, l ? be.encode(u.toPSBT()) : void 0);
  }
  async makeRegisterIntentSignature(e, n, r, o) {
    const s = Math.floor(Date.now() / 1e3), { inputs: c, inputTapTrees: u, finalizer: l } = this.prepareBIP322Inputs(e), p = {
      type: "register",
      input_tap_trees: u,
      onchain_output_indexes: r,
      valid_at: s,
      expire_at: s + 2 * 60,
      // valid for 2 minutes
      cosigners_public_keys: o
    }, h = JSON.stringify(p, null, 0);
    return {
      signature: await this.makeBIP322Signature(h, c, l, n),
      message: h
    };
  }
  async makeDeleteIntentSignature(e) {
    const n = Math.floor(Date.now() / 1e3), { inputs: r, finalizer: o } = this.prepareBIP322Inputs(e), s = {
      type: "delete",
      expire_at: n + 2 * 60
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
      const c = Pe.decode(s.tapTree), u = Uy(s);
      n.push({
        txid: nt.decode(s.txid),
        index: s.vout,
        witnessUtxo: {
          amount: BigInt(s.value),
          script: c.pkScript
        },
        sequence: u,
        tapLeafScript: [s.intentTapLeafScript]
      }), r.push(nt.encode(s.tapTree)), o.push(s.extraWitness || []);
    }
    return {
      inputs: n,
      inputTapTrees: r,
      finalizer: Ny(o)
    };
  }
  async makeBIP322Signature(e, n, r, o) {
    const s = Ki.create(e, n, o), c = await this.identity.sign(s);
    return Ki.signature(c, r);
  }
}
Br.MIN_FEE_RATE = 1;
function Ny(t) {
  return function(e) {
    for (let n = 0; n < e.inputsLength; n++) {
      try {
        e.finalizeIdx(n);
      } catch (s) {
        if (s instanceof Error && s.message.includes("finalize/taproot: empty witness")) {
          const c = e.getInput(n).tapLeafScript;
          if (!c || c.length <= 0)
            throw s;
          const [u, l] = c[0], p = l.slice(0, -1);
          e.updateInput(n, {
            finalScriptWitness: [
              p,
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
function Uy(t) {
  let e;
  try {
    const n = t.intentTapLeafScript[1], r = n.subarray(0, n.length - 1), o = $e.decode(r).params;
    e = Oa.encode(o.timelock.type === "blocks" ? { blocks: Number(o.timelock.value) } : { seconds: Number(o.timelock.value) });
  } catch {
  }
  return e;
}
function Cy(t) {
  try {
    return Ir.decode(t), !0;
  } catch {
    return !1;
  }
}
function Ry(t, e) {
  const n = [...t].sort((c, u) => {
    const l = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, p = u.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return l !== p ? l - p : u.value - c.value;
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
var wt;
(function(t) {
  t.walletInitialized = (I) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: I
  });
  function e(I, D) {
    return {
      type: "ERROR",
      success: !1,
      message: D,
      id: I
    };
  }
  t.error = e;
  function n(I, D) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: D,
      id: I
    };
  }
  t.settleEvent = n;
  function r(I, D) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: D,
      id: I
    };
  }
  t.settleSuccess = r;
  function o(I) {
    return I.type === "SETTLE_SUCCESS" && I.success;
  }
  t.isSettleSuccess = o;
  function s(I) {
    return I.type === "ADDRESS" && I.success === !0;
  }
  t.isAddress = s;
  function c(I) {
    return I.type === "BOARDING_ADDRESS" && I.success === !0;
  }
  t.isBoardingAddress = c;
  function u(I, D) {
    return {
      type: "ADDRESS",
      success: !0,
      address: D,
      id: I
    };
  }
  t.address = u;
  function l(I, D) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: D,
      id: I
    };
  }
  t.boardingAddress = l;
  function p(I) {
    return I.type === "BALANCE" && I.success === !0;
  }
  t.isBalance = p;
  function h(I, D) {
    return {
      type: "BALANCE",
      success: !0,
      balance: D,
      id: I
    };
  }
  t.balance = h;
  function y(I) {
    return I.type === "VTXOS" && I.success === !0;
  }
  t.isVtxos = y;
  function m(I, D) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: D,
      id: I
    };
  }
  t.vtxos = m;
  function v(I) {
    return I.type === "VIRTUAL_COINS" && I.success === !0;
  }
  t.isVirtualCoins = v;
  function S(I, D) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: D,
      id: I
    };
  }
  t.virtualCoins = S;
  function _(I) {
    return I.type === "BOARDING_UTXOS" && I.success === !0;
  }
  t.isBoardingUtxos = _;
  function L(I, D) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: D,
      id: I
    };
  }
  t.boardingUtxos = L;
  function z(I) {
    return I.type === "SEND_BITCOIN_SUCCESS" && I.success === !0;
  }
  t.isSendBitcoinSuccess = z;
  function Z(I, D) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: D,
      id: I
    };
  }
  t.sendBitcoinSuccess = Z;
  function W(I) {
    return I.type === "TRANSACTION_HISTORY" && I.success === !0;
  }
  t.isTransactionHistory = W;
  function H(I, D) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: D,
      id: I
    };
  }
  t.transactionHistory = H;
  function $(I) {
    return I.type === "WALLET_STATUS" && I.success === !0;
  }
  t.isWalletStatus = $;
  function rt(I, D) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: D
      },
      id: I
    };
  }
  t.walletStatus = rt;
  function T(I) {
    return I.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = T;
  function ut(I, D) {
    return {
      type: "CLEAR_RESPONSE",
      success: D,
      id: I
    };
  }
  t.clearResponse = ut;
  function F(I, D) {
    return {
      type: "SIGN_SUCCESS",
      success: !0,
      tx: D,
      id: I
    };
  }
  t.signSuccess = F;
  function X(I) {
    return I.type === "SIGN_SUCCESS" && I.success === !0;
  }
  t.isSignSuccess = X;
})(wt || (wt = {}));
class Rt {
  constructor(e, n, r, o, s, c) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = s, this.outputSize = c;
  }
  static create() {
    return new Rt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += Rt.INPUT_SIZE, this;
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Rt.INPUT_SIZE + Rt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const o = 1 + Rt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + o, this.inputSize += Rt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Rt.OUTPUT_SIZE + Rt.P2WKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += Rt.OUTPUT_SIZE + Rt.P2TR_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (c) => c < 253 ? 1 : c < 65535 ? 3 : c < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let s = (Rt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Rt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (s += Rt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Oy(s);
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
Rt.P2TR_OUTPUT_SIZE = 34;
const Oy = (t) => {
  const e = BigInt(Math.ceil(t / Rt.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
};
var ge;
(function(t) {
  function e(S) {
    return typeof S == "object" && S !== null && "type" in S;
  }
  t.isBase = e;
  function n(S) {
    return S.type === "INIT_WALLET" && "privateKey" in S && typeof S.privateKey == "string" && "arkServerUrl" in S && typeof S.arkServerUrl == "string" && ("arkServerPublicKey" in S ? typeof S.arkServerPublicKey == "string" || S.arkServerPublicKey === void 0 : !0);
  }
  t.isInitWallet = n;
  function r(S) {
    return S.type === "SETTLE";
  }
  t.isSettle = r;
  function o(S) {
    return S.type === "GET_ADDRESS";
  }
  t.isGetAddress = o;
  function s(S) {
    return S.type === "GET_BOARDING_ADDRESS";
  }
  t.isGetBoardingAddress = s;
  function c(S) {
    return S.type === "GET_BALANCE";
  }
  t.isGetBalance = c;
  function u(S) {
    return S.type === "GET_VTXOS";
  }
  t.isGetVtxos = u;
  function l(S) {
    return S.type === "GET_VIRTUAL_COINS";
  }
  t.isGetVirtualCoins = l;
  function p(S) {
    return S.type === "GET_BOARDING_UTXOS";
  }
  t.isGetBoardingUtxos = p;
  function h(S) {
    return S.type === "SEND_BITCOIN" && "params" in S && S.params !== null && typeof S.params == "object" && "address" in S.params && typeof S.params.address == "string" && "amount" in S.params && typeof S.params.amount == "number";
  }
  t.isSendBitcoin = h;
  function y(S) {
    return S.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = y;
  function m(S) {
    return S.type === "GET_STATUS";
  }
  t.isGetStatus = m;
  function v(S) {
    return S.type === "SIGN" && "tx" in S && typeof S.tx == "string" && ("inputIndexes" in S && S.inputIndexes !== void 0 ? Array.isArray(S.inputIndexes) && S.inputIndexes.every((_) => typeof _ == "number") : !0);
  }
  t.isSign = v;
})(ge || (ge = {}));
class Kt {
  constructor() {
    this.db = null;
  }
  static delete() {
    return new Promise((e, n) => {
      try {
        const r = indexedDB.deleteDatabase(Kt.DB_NAME);
        r.onblocked = () => {
          setTimeout(() => {
            const o = indexedDB.deleteDatabase(Kt.DB_NAME);
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
      const r = indexedDB.open(Kt.DB_NAME, Kt.DB_VERSION);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (o) => {
        const s = o.target.result;
        if (!s.objectStoreNames.contains(Kt.STORE_NAME)) {
          const c = s.createObjectStore(Kt.STORE_NAME, {
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
      const s = this.db.transaction(Kt.STORE_NAME, "readwrite").objectStore(Kt.STORE_NAME), c = e.map((u) => new Promise((l, p) => {
        const h = s.put(u);
        h.onsuccess = () => l(), h.onerror = () => p(h.error);
      }));
      Promise.all(c).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Kt.STORE_NAME, "readwrite").objectStore(Kt.STORE_NAME).clear();
      s.onsuccess = () => e(), s.onerror = () => n(s.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Kt.STORE_NAME, "readonly").objectStore(Kt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.only(""));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSweptVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Kt.STORE_NAME, "readonly").objectStore(Kt.STORE_NAME).index("state").getAll(IDBKeyRange.only("swept"));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getSpentVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const c = this.db.transaction(Kt.STORE_NAME, "readonly").objectStore(Kt.STORE_NAME).index("spentBy").getAll(IDBKeyRange.lowerBound("", !0));
      c.onsuccess = () => {
        e(c.result);
      }, c.onerror = () => n(c.error);
    });
  }
  async getAllVtxos() {
    if (!this.db)
      throw new Error("Database not opened");
    return new Promise((e, n) => {
      const s = this.db.transaction(Kt.STORE_NAME, "readonly").objectStore(Kt.STORE_NAME).index("spentBy"), c = s.getAll(IDBKeyRange.only("")), u = s.getAll(IDBKeyRange.lowerBound("", !0));
      Promise.all([
        new Promise((l, p) => {
          c.onsuccess = () => {
            l(c.result);
          }, c.onerror = () => p(c.error);
        }),
        new Promise((l, p) => {
          u.onsuccess = () => {
            l(u.result);
          }, u.onerror = () => p(u.error);
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
Kt.DB_NAME = "wallet-db";
Kt.STORE_NAME = "vtxos";
Kt.DB_VERSION = 1;
class $y {
  constructor(e = new Kt(), n = () => {
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
    const e = this.wallet.offchainTapscript.encode(), n = this.wallet.offchainTapscript.forfeit(), r = this.wallet.offchainTapscript.exit(), o = nt.encode(this.wallet.offchainTapscript.pkScript), c = (await this.indexerProvider.getVtxos({
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
      for await (const p of u) {
        const h = [...p.newVtxos, ...p.spentVtxos];
        if (h.length === 0)
          continue;
        const y = h.map((m) => ({
          ...m,
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
    var n;
    this.clear(), ge.isBase(e.data) && ((n = e.source) == null || n.postMessage(wt.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, o, s;
    const n = e.data;
    if (!ge.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new nd(n.arkServerUrl), this.indexerProvider = new od(n.arkServerUrl), this.wallet = await Br.create({
        identity: Oi.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (o = e.source) == null || o.postMessage(wt.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (c) {
      console.error("Error initializing wallet:", c);
      const u = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(wt.error(n.id, u));
    }
  }
  async handleSettle(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
        return;
      }
      const u = await this.wallet.settle(n.params, (l) => {
        var p;
        (p = e.source) == null || p.postMessage(wt.settleEvent(n.id, l));
      });
      (s = e.source) == null || s.postMessage(wt.settleSuccess(n.id, u));
    } catch (u) {
      console.error("Error settling:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleSendBitcoin(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.sendBitcoin(n.params);
      (s = e.source) == null || s.postMessage(wt.sendBitcoinSuccess(n.id, u));
    } catch (u) {
      console.error("Error sending bitcoin:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetAddress(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getAddress();
      (s = e.source) == null || s.postMessage(wt.address(n.id, u));
    } catch (u) {
      console.error("Error getting address:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetBoardingAddress(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getBoardingAddress();
      (s = e.source) == null || s.postMessage(wt.boardingAddress(n.id, u));
    } catch (u) {
      console.error("Error getting boarding address:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetBalance(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [u, l, p] = await Promise.all([
        this.wallet.getBoardingUtxos(),
        this.vtxoRepository.getSpendableVtxos(),
        this.vtxoRepository.getSweptVtxos()
      ]);
      let h = 0, y = 0;
      for (const z of u)
        z.status.confirmed ? h += z.value : y += z.value;
      let m = 0, v = 0, S = 0;
      for (const z of l)
        z.virtualStatus.state === "settled" ? m += z.value : z.virtualStatus.state === "preconfirmed" && (v += z.value);
      for (const z of p)
        bo(z) && (S += z.value);
      const _ = h + y, L = m + v + S;
      (s = e.source) == null || s.postMessage(wt.balance(n.id, {
        boarding: {
          confirmed: h,
          unconfirmed: y,
          total: _
        },
        settled: m,
        preconfirmed: v,
        available: m + v,
        recoverable: S,
        total: _ + L
      }));
    } catch (u) {
      console.error("Error getting balance:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetVtxos(e) {
    var r, o, s, c, u, l;
    const n = e.data;
    if (!ge.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      let p = await this.vtxoRepository.getSpendableVtxos();
      if (!((s = n.filter) != null && s.withRecoverable)) {
        if (!this.wallet)
          throw new Error("Wallet not initialized");
        p = p.filter((h) => !td(h, this.wallet.dustAmount));
      }
      if ((c = n.filter) != null && c.withRecoverable) {
        const h = await this.vtxoRepository.getSweptVtxos();
        p.push(...h.filter(bo));
      }
      (u = e.source) == null || u.postMessage(wt.vtxos(n.id, p));
    } catch (p) {
      console.error("Error getting vtxos:", p);
      const h = p instanceof Error ? p.message : "Unknown error occurred";
      (l = e.source) == null || l.postMessage(wt.error(n.id, h));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = await this.wallet.getBoardingUtxos();
      (s = e.source) == null || s.postMessage(wt.boardingUtxos(n.id, u));
    } catch (u) {
      console.error("Error getting boarding utxos:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: u, commitmentsToIgnore: l } = await this.wallet.getBoardingTxs(), { spendable: p, spent: h } = await this.vtxoRepository.getAllVtxos(), y = ed(p, h, l), m = [...u, ...y];
      m.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (v, S) => v.createdAt === 0 ? -1 : S.createdAt === 0 ? 1 : S.createdAt - v.createdAt
      ), (s = e.source) == null || s.postMessage(wt.transactionHistory(n.id, m));
    } catch (u) {
      console.error("Error getting transaction history:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleGetStatus(e) {
    var r, o;
    const n = e.data;
    if (!ge.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (o = e.source) == null || o.postMessage(wt.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleSign(e) {
    var r, o, s, c;
    const n = e.data;
    if (!ge.isSign(n)) {
      console.error("Invalid SIGN message format", n), (r = e.source) == null || r.postMessage(wt.error(n.id, "Invalid SIGN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(wt.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const u = se.fromPSBT(be.decode(n.tx)), l = await this.wallet.identity.sign(u, n.inputIndexes);
      (s = e.source) == null || s.postMessage(wt.signSuccess(n.id, be.encode(l.toPSBT())));
    } catch (u) {
      console.error("Error signing:", u);
      const l = u instanceof Error ? u.message : "Unknown error occurred";
      (c = e.source) == null || c.postMessage(wt.error(n.id, l));
    }
  }
  async handleMessage(e) {
    var r;
    this.messageCallback(e);
    const n = e.data;
    if (!ge.isBase(n)) {
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
        (r = e.source) == null || r.postMessage(wt.error(n.id, "Unknown message type"));
    }
  }
}
var gf;
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
      const { chain: p } = await l.getVtxoChain(s);
      return new n({ ...s, chain: p }, c, u, l);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const c = this.toUnroll.chain;
      for (let p = c.length - 1; p >= 0; p--) {
        const h = c[p];
        if (!(h.type === mr.COMMITMENT || h.type === mr.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(h.txid)).confirmed)
              return {
                type: e.WAIT,
                txid: h.txid,
                do: Dy(this.explorer, h.txid)
              };
          } catch {
            s = h;
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
      const l = se.fromPSBT(be.decode(u.txs[0]), {
        allowUnknownInputs: !0
      });
      if (s.type === mr.TREE) {
        const p = l.getInput(0);
        if (!p)
          throw new Error("Input not found");
        const h = p.tapKeySig;
        if (!h)
          throw new Error("Tap key sig not found");
        l.updateInput(0, {
          finalScriptWitness: [h]
        });
      } else
        l.finalize();
      return {
        type: e.UNROLL,
        tx: l,
        do: Ly(this.bumper, this.explorer, l)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await Py(1e3);
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
    const p = [];
    let h = 0n;
    const y = Rt.create();
    for (const L of l) {
      if (!L.isUnrolled)
        throw new Error(`Vtxo ${L.txid}:${L.vout} is not fully unrolled, use unroll first`);
      const z = await o.onchainProvider.getTxStatus(L.txid);
      if (!z.confirmed)
        throw new Error(`tx ${L.txid} is not confirmed`);
      const Z = Ky({ height: z.blockHeight, time: z.blockTime }, u, L);
      if (!Z)
        throw new Error(`no available exit path found for vtxo ${L.txid}:${L.vout}`);
      const W = Pe.decode(L.tapTree).findLeaf(nt.encode(Z.script));
      if (!W)
        throw new Error(`spending leaf not found for vtxo ${L.txid}:${L.vout}`);
      h += BigInt(L.value), p.push({
        txid: L.txid,
        index: L.vout,
        tapLeafScript: [W],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(L.value),
          script: Pe.decode(L.tapTree).pkScript
        },
        sighashType: gn.DEFAULT
      }), y.addTapscriptInput(64, W[1].length, dn.encode(W[0]).length);
    }
    const m = new se({ allowUnknownInputs: !0, version: 2 });
    for (const L of p)
      m.addInput(L);
    y.addP2TROutput();
    let v = await o.onchainProvider.getFeeRate();
    (!v || v < Br.MIN_FEE_RATE) && (v = Br.MIN_FEE_RATE);
    const S = y.vsize().fee(BigInt(v));
    if (S > h)
      throw new Error("fee amount is greater than the total amount");
    m.addOutputAddress(c, h - S);
    const _ = await o.identity.sign(m);
    return _.finalize(), await o.onchainProvider.broadcastTransaction(_.hex), _.id;
  }
  t.completeUnroll = r;
})(gf || (gf = {}));
function Py(t) {
  return new Promise((e) => setTimeout(e, t));
}
function Ly(t, e, n) {
  return async () => {
    const [r, o] = await t.bumpP2A(n);
    await e.broadcastTransaction(r, o);
  };
}
function Dy(t, e) {
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
function Ky(t, e, n) {
  const r = Pe.decode(n.tapTree).exitPaths();
  for (const o of r)
    if (o.params.timelock.type === "blocks") {
      if (e.height >= t.height + Number(o.params.timelock.value))
        return o;
    } else if (e.time >= t.time + Number(o.params.timelock.value))
      return o;
}
var hi = { exports: {} }, My = hi.exports, yf;
function Vy() {
  return yf || (yf = 1, function(t, e) {
    (function(n, r) {
      t.exports = r();
    })(My, function() {
      var n = function(i, a) {
        return (n = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(f, d) {
          f.__proto__ = d;
        } || function(f, d) {
          for (var g in d) Object.prototype.hasOwnProperty.call(d, g) && (f[g] = d[g]);
        })(i, a);
      }, r = function() {
        return (r = Object.assign || function(i) {
          for (var a, f = 1, d = arguments.length; f < d; f++) for (var g in a = arguments[f]) Object.prototype.hasOwnProperty.call(a, g) && (i[g] = a[g]);
          return i;
        }).apply(this, arguments);
      };
      function o(i, a, f) {
        for (var d, g = 0, w = a.length; g < w; g++) !d && g in a || ((d = d || Array.prototype.slice.call(a, 0, g))[g] = a[g]);
        return i.concat(d || Array.prototype.slice.call(a));
      }
      var s = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : Ig, c = Object.keys, u = Array.isArray;
      function l(i, a) {
        return typeof a != "object" || c(a).forEach(function(f) {
          i[f] = a[f];
        }), i;
      }
      typeof Promise > "u" || s.Promise || (s.Promise = Promise);
      var p = Object.getPrototypeOf, h = {}.hasOwnProperty;
      function y(i, a) {
        return h.call(i, a);
      }
      function m(i, a) {
        typeof a == "function" && (a = a(p(i))), (typeof Reflect > "u" ? c : Reflect.ownKeys)(a).forEach(function(f) {
          S(i, f, a[f]);
        });
      }
      var v = Object.defineProperty;
      function S(i, a, f, d) {
        v(i, a, l(f && y(f, "get") && typeof f.get == "function" ? { get: f.get, set: f.set, configurable: !0 } : { value: f, configurable: !0, writable: !0 }, d));
      }
      function _(i) {
        return { from: function(a) {
          return i.prototype = Object.create(a.prototype), S(i.prototype, "constructor", i), { extend: m.bind(null, i.prototype) };
        } };
      }
      var L = Object.getOwnPropertyDescriptor, z = [].slice;
      function Z(i, a, f) {
        return z.call(i, a, f);
      }
      function W(i, a) {
        return a(i);
      }
      function H(i) {
        if (!i) throw new Error("Assertion Failed");
      }
      function $(i) {
        s.setImmediate ? setImmediate(i) : setTimeout(i, 0);
      }
      function rt(i, a) {
        if (typeof a == "string" && y(i, a)) return i[a];
        if (!a) return i;
        if (typeof a != "string") {
          for (var f = [], d = 0, g = a.length; d < g; ++d) {
            var w = rt(i, a[d]);
            f.push(w);
          }
          return f;
        }
        var b = a.indexOf(".");
        if (b !== -1) {
          var E = i[a.substr(0, b)];
          return E == null ? void 0 : rt(E, a.substr(b + 1));
        }
      }
      function T(i, a, f) {
        if (i && a !== void 0 && !("isFrozen" in Object && Object.isFrozen(i))) if (typeof a != "string" && "length" in a) {
          H(typeof f != "string" && "length" in f);
          for (var d = 0, g = a.length; d < g; ++d) T(i, a[d], f[d]);
        } else {
          var w, b, E = a.indexOf(".");
          E !== -1 ? (w = a.substr(0, E), (b = a.substr(E + 1)) === "" ? f === void 0 ? u(i) && !isNaN(parseInt(w)) ? i.splice(w, 1) : delete i[w] : i[w] = f : T(E = !(E = i[w]) || !y(i, w) ? i[w] = {} : E, b, f)) : f === void 0 ? u(i) && !isNaN(parseInt(a)) ? i.splice(a, 1) : delete i[a] : i[a] = f;
        }
      }
      function ut(i) {
        var a, f = {};
        for (a in i) y(i, a) && (f[a] = i[a]);
        return f;
      }
      var F = [].concat;
      function X(i) {
        return F.apply([], i);
      }
      var On = "BigUint64Array,BigInt64Array,Array,Boolean,String,Date,RegExp,Blob,File,FileList,FileSystemFileHandle,FileSystemDirectoryHandle,ArrayBuffer,DataView,Uint8ClampedArray,ImageBitmap,ImageData,Map,Set,CryptoKey".split(",").concat(X([8, 16, 32, 64].map(function(i) {
        return ["Int", "Uint", "Float"].map(function(a) {
          return a + i + "Array";
        });
      }))).filter(function(i) {
        return s[i];
      }), I = new Set(On.map(function(i) {
        return s[i];
      })), D = null;
      function G(i) {
        return D = /* @__PURE__ */ new WeakMap(), i = function a(f) {
          if (!f || typeof f != "object") return f;
          var d = D.get(f);
          if (d) return d;
          if (u(f)) {
            d = [], D.set(f, d);
            for (var g = 0, w = f.length; g < w; ++g) d.push(a(f[g]));
          } else if (I.has(f.constructor)) d = f;
          else {
            var b, E = p(f);
            for (b in d = E === Object.prototype ? {} : Object.create(E), D.set(f, d), f) y(f, b) && (d[b] = a(f[b]));
          }
          return d;
        }(i), D = null, i;
      }
      var dt = {}.toString;
      function j(i) {
        return dt.call(i).slice(8, -1);
      }
      var V = typeof Symbol < "u" ? Symbol.iterator : "@@iterator", Y = typeof V == "symbol" ? function(i) {
        var a;
        return i != null && (a = i[V]) && a.apply(i);
      } : function() {
        return null;
      };
      function tt(i, a) {
        return a = i.indexOf(a), 0 <= a && i.splice(a, 1), 0 <= a;
      }
      var ht = {};
      function at(i) {
        var a, f, d, g;
        if (arguments.length === 1) {
          if (u(i)) return i.slice();
          if (this === ht && typeof i == "string") return [i];
          if (g = Y(i)) {
            for (f = []; !(d = g.next()).done; ) f.push(d.value);
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
      var ft = typeof Symbol < "u" ? function(i) {
        return i[Symbol.toStringTag] === "AsyncFunction";
      } : function() {
        return !1;
      }, Ur = ["Unknown", "Constraint", "Data", "TransactionInactive", "ReadOnly", "Version", "NotFound", "InvalidState", "InvalidAccess", "Abort", "Timeout", "QuotaExceeded", "Syntax", "DataClone"], Ue = ["Modify", "Bulk", "OpenFailed", "VersionChange", "Schema", "Upgrade", "InvalidTable", "MissingAPI", "NoSuchDatabase", "InvalidArgument", "SubTransaction", "Unsupported", "Internal", "DatabaseClosed", "PrematureCommit", "ForeignAwait"].concat(Ur), Tt = { VersionChanged: "Database version changed by other database connection", DatabaseClosed: "Database has been closed", Abort: "Transaction aborted", TransactionInactive: "Transaction has already completed or failed", MissingAPI: "IndexedDB API missing. Please visit https://tinyurl.com/y2uuvskb" };
      function kt(i, a) {
        this.name = i, this.message = a;
      }
      function _t(i, a) {
        return i + ". Errors: " + Object.keys(a).map(function(f) {
          return a[f].toString();
        }).filter(function(f, d, g) {
          return g.indexOf(f) === d;
        }).join(`
`);
      }
      function mt(i, a, f, d) {
        this.failures = a, this.failedKeys = d, this.successCount = f, this.message = _t(i, a);
      }
      function Nt(i, a) {
        this.name = "BulkError", this.failures = Object.keys(a).map(function(f) {
          return a[f];
        }), this.failuresByPos = a, this.message = _t(i, this.failures);
      }
      _(kt).from(Error).extend({ toString: function() {
        return this.name + ": " + this.message;
      } }), _(mt).from(kt), _(Nt).from(kt);
      var Xt = Ue.reduce(function(i, a) {
        return i[a] = a + "Error", i;
      }, {}), Ne = kt, lt = Ue.reduce(function(i, a) {
        var f = a + "Error";
        function d(g, w) {
          this.name = f, g ? typeof g == "string" ? (this.message = "".concat(g).concat(w ? `
 ` + w : ""), this.inner = w || null) : typeof g == "object" && (this.message = "".concat(g.name, " ").concat(g.message), this.inner = g) : (this.message = Tt[a] || f, this.inner = null);
        }
        return _(d).from(Ne), i[a] = d, i;
      }, {});
      lt.Syntax = SyntaxError, lt.Type = TypeError, lt.Range = RangeError;
      var ke = Ur.reduce(function(i, a) {
        return i[a + "Error"] = lt[a], i;
      }, {}), he = Ue.reduce(function(i, a) {
        return ["Syntax", "Type", "Range"].indexOf(a) === -1 && (i[a + "Error"] = lt[a]), i;
      }, {});
      function It() {
      }
      function Ae(i) {
        return i;
      }
      function Rn(i, a) {
        return i == null || i === Ae ? a : function(f) {
          return a(i(f));
        };
      }
      function Ie(i, a) {
        return function() {
          i.apply(this, arguments), a.apply(this, arguments);
        };
      }
      function yn(i, a) {
        return i === It ? a : function() {
          var f = i.apply(this, arguments);
          f !== void 0 && (arguments[0] = f);
          var d = this.onsuccess, g = this.onerror;
          this.onsuccess = null, this.onerror = null;
          var w = a.apply(this, arguments);
          return d && (this.onsuccess = this.onsuccess ? Ie(d, this.onsuccess) : d), g && (this.onerror = this.onerror ? Ie(g, this.onerror) : g), w !== void 0 ? w : f;
        };
      }
      function ad(i, a) {
        return i === It ? a : function() {
          i.apply(this, arguments);
          var f = this.onsuccess, d = this.onerror;
          this.onsuccess = this.onerror = null, a.apply(this, arguments), f && (this.onsuccess = this.onsuccess ? Ie(f, this.onsuccess) : f), d && (this.onerror = this.onerror ? Ie(d, this.onerror) : d);
        };
      }
      function cd(i, a) {
        return i === It ? a : function(f) {
          var d = i.apply(this, arguments);
          l(f, d);
          var g = this.onsuccess, w = this.onerror;
          return this.onsuccess = null, this.onerror = null, f = a.apply(this, arguments), g && (this.onsuccess = this.onsuccess ? Ie(g, this.onsuccess) : g), w && (this.onerror = this.onerror ? Ie(w, this.onerror) : w), d === void 0 ? f === void 0 ? void 0 : f : l(d, f);
        };
      }
      function ud(i, a) {
        return i === It ? a : function() {
          return a.apply(this, arguments) !== !1 && i.apply(this, arguments);
        };
      }
      function ts(i, a) {
        return i === It ? a : function() {
          var f = i.apply(this, arguments);
          if (f && typeof f.then == "function") {
            for (var d = this, g = arguments.length, w = new Array(g); g--; ) w[g] = arguments[g];
            return f.then(function() {
              return a.apply(d, w);
            });
          }
          return a.apply(this, arguments);
        };
      }
      he.ModifyError = mt, he.DexieError = kt, he.BulkError = Nt;
      var Ge = typeof location < "u" && /^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);
      function Bc(i) {
        Ge = i;
      }
      var Nr = {}, _c = 100, On = typeof Promise > "u" ? [] : function() {
        var i = Promise.resolve();
        if (typeof crypto > "u" || !crypto.subtle) return [i, p(i), i];
        var a = crypto.subtle.digest("SHA-512", new Uint8Array([0]));
        return [a, p(a), i];
      }(), Ur = On[0], Ue = On[1], On = On[2], Ue = Ue && Ue.then, $n = Ur && Ur.constructor, es = !!On, Cr = function(i, a) {
        Rr.push([i, a]), Ao && (queueMicrotask(ld), Ao = !1);
      }, ns = !0, Ao = !0, Pn = [], Io = [], rs = Ae, wn = { id: "global", global: !0, ref: 0, unhandleds: [], onunhandled: It, pgp: !1, env: {}, finalize: It }, gt = wn, Rr = [], Ln = 0, Bo = [];
      function ct(i) {
        if (typeof this != "object") throw new TypeError("Promises must be constructed via new");
        this._listeners = [], this._lib = !1;
        var a = this._PSD = gt;
        if (typeof i != "function") {
          if (i !== Nr) throw new TypeError("Not a function");
          return this._state = arguments[1], this._value = arguments[2], void (this._state === !1 && is(this, this._value));
        }
        this._state = null, this._value = null, ++a.ref, function f(d, g) {
          try {
            g(function(w) {
              if (d._state === null) {
                if (w === d) throw new TypeError("A promise cannot be resolved with itself.");
                var b = d._lib && nr();
                w && typeof w.then == "function" ? f(d, function(E, k) {
                  w instanceof ct ? w._then(E, k) : w.then(E, k);
                }) : (d._state = !0, d._value = w, Uc(d)), b && rr();
              }
            }, is.bind(null, d));
          } catch (w) {
            is(d, w);
          }
        }(this, i);
      }
      var os = { get: function() {
        var i = gt, a = Co;
        function f(d, g) {
          var w = this, b = !i.global && (i !== gt || a !== Co), E = b && !bn(), k = new ct(function(B, C) {
            ss(w, new Nc(Rc(d, i, b, E), Rc(g, i, b, E), B, C, i));
          });
          return this._consoleTask && (k._consoleTask = this._consoleTask), k;
        }
        return f.prototype = Nr, f;
      }, set: function(i) {
        S(this, "then", i && i.prototype === Nr ? os : { get: function() {
          return i;
        }, set: os.set });
      } };
      function Nc(i, a, f, d, g) {
        this.onFulfilled = typeof i == "function" ? i : null, this.onRejected = typeof a == "function" ? a : null, this.resolve = f, this.reject = d, this.psd = g;
      }
      function is(i, a) {
        var f, d;
        Io.push(a), i._state === null && (f = i._lib && nr(), a = rs(a), i._state = !1, i._value = a, d = i, Pn.some(function(g) {
          return g._value === d._value;
        }) || Pn.push(d), Uc(i), f && rr());
      }
      function Uc(i) {
        var a = i._listeners;
        i._listeners = [];
        for (var f = 0, d = a.length; f < d; ++f) ss(i, a[f]);
        var g = i._PSD;
        --g.ref || g.finalize(), Ln === 0 && (++Ln, Cr(function() {
          --Ln == 0 && as();
        }, []));
      }
      function ss(i, a) {
        if (i._state !== null) {
          var f = i._state ? a.onFulfilled : a.onRejected;
          if (f === null) return (i._state ? a.resolve : a.reject)(i._value);
          ++a.psd.ref, ++Ln, Cr(fd, [f, i, a]);
        } else i._listeners.push(a);
      }
      function fd(i, a, f) {
        try {
          var d, g = a._value;
          !a._state && Io.length && (Io = []), d = Ge && a._consoleTask ? a._consoleTask.run(function() {
            return i(g);
          }) : i(g), a._state || Io.indexOf(g) !== -1 || function(w) {
            for (var b = Pn.length; b; ) if (Pn[--b]._value === w._value) return Pn.splice(b, 1);
          }(a), f.resolve(d);
        } catch (w) {
          f.reject(w);
        } finally {
          --Ln == 0 && as(), --f.psd.ref || f.psd.finalize();
        }
      }
      function ld() {
        Dn(wn, function() {
          nr() && rr();
        });
      }
      function nr() {
        var i = ns;
        return Ao = ns = !1, i;
      }
      function rr() {
        var i, a, f;
        do
          for (; 0 < Rr.length; ) for (i = Rr, Rr = [], f = i.length, a = 0; a < f; ++a) {
            var d = i[a];
            d[0].apply(null, d[1]);
          }
        while (0 < Rr.length);
        Ao = ns = !0;
      }
      function as() {
        var i = Pn;
        Pn = [], i.forEach(function(d) {
          d._PSD.onunhandled.call(null, d._value, d);
        });
        for (var a = Bo.slice(0), f = a.length; f; ) a[--f]();
      }
      function _o(i) {
        return new ct(Nr, !1, i);
      }
      function Lt(i, a) {
        var f = gt;
        return function() {
          var d = nr(), g = gt;
          try {
            return vn(f, !0), i.apply(this, arguments);
          } catch (w) {
            a && a(w);
          } finally {
            vn(g, !1), d && rr();
          }
        };
      }
      m(ct.prototype, { then: os, _then: function(i, a) {
        ss(this, new Nc(null, null, i, a, gt));
      }, catch: function(i) {
        if (arguments.length === 1) return this.then(null, i);
        var a = i, f = arguments[1];
        return typeof a == "function" ? this.then(null, function(d) {
          return (d instanceof a ? f : _o)(d);
        }) : this.then(null, function(d) {
          return (d && d.name === a ? f : _o)(d);
        });
      }, finally: function(i) {
        return this.then(function(a) {
          return ct.resolve(i()).then(function() {
            return a;
          });
        }, function(a) {
          return ct.resolve(i()).then(function() {
            return _o(a);
          });
        });
      }, timeout: function(i, a) {
        var f = this;
        return i < 1 / 0 ? new ct(function(d, g) {
          var w = setTimeout(function() {
            return g(new lt.Timeout(a));
          }, i);
          f.then(d, g).finally(clearTimeout.bind(null, w));
        }) : this;
      } }), typeof Symbol < "u" && Symbol.toStringTag && S(ct.prototype, Symbol.toStringTag, "Dexie.Promise"), wn.env = Cc(), m(ct, { all: function() {
        var i = at.apply(null, arguments).map(Ro);
        return new ct(function(a, f) {
          i.length === 0 && a([]);
          var d = i.length;
          i.forEach(function(g, w) {
            return ct.resolve(g).then(function(b) {
              i[w] = b, --d || a(i);
            }, f);
          });
        });
      }, resolve: function(i) {
        return i instanceof ct ? i : i && typeof i.then == "function" ? new ct(function(a, f) {
          i.then(a, f);
        }) : new ct(Nr, !0, i);
      }, reject: _o, race: function() {
        var i = at.apply(null, arguments).map(Ro);
        return new ct(function(a, f) {
          i.map(function(d) {
            return ct.resolve(d).then(a, f);
          });
        });
      }, PSD: { get: function() {
        return gt;
      }, set: function(i) {
        return gt = i;
      } }, totalEchoes: { get: function() {
        return Co;
      } }, newPSD: mn, usePSD: Dn, scheduler: { get: function() {
        return Cr;
      }, set: function(i) {
        Cr = i;
      } }, rejectionMapper: { get: function() {
        return rs;
      }, set: function(i) {
        rs = i;
      } }, follow: function(i, a) {
        return new ct(function(f, d) {
          return mn(function(g, w) {
            var b = gt;
            b.unhandleds = [], b.onunhandled = w, b.finalize = Ie(function() {
              var E, k = this;
              E = function() {
                k.unhandleds.length === 0 ? g() : w(k.unhandleds[0]);
              }, Bo.push(function B() {
                E(), Bo.splice(Bo.indexOf(B), 1);
              }), ++Ln, Cr(function() {
                --Ln == 0 && as();
              }, []);
            }, b.finalize), i();
          }, a, f, d);
        });
      } }), $n && ($n.allSettled && S(ct, "allSettled", function() {
        var i = at.apply(null, arguments).map(Ro);
        return new ct(function(a) {
          i.length === 0 && a([]);
          var f = i.length, d = new Array(f);
          i.forEach(function(g, w) {
            return ct.resolve(g).then(function(b) {
              return d[w] = { status: "fulfilled", value: b };
            }, function(b) {
              return d[w] = { status: "rejected", reason: b };
            }).then(function() {
              return --f || a(d);
            });
          });
        });
      }), $n.any && typeof AggregateError < "u" && S(ct, "any", function() {
        var i = at.apply(null, arguments).map(Ro);
        return new ct(function(a, f) {
          i.length === 0 && f(new AggregateError([]));
          var d = i.length, g = new Array(d);
          i.forEach(function(w, b) {
            return ct.resolve(w).then(function(E) {
              return a(E);
            }, function(E) {
              g[b] = E, --d || f(new AggregateError(g));
            });
          });
        });
      }), $n.withResolvers && (ct.withResolvers = $n.withResolvers));
      var Qt = { awaits: 0, echoes: 0, id: 0 }, dd = 0, No = [], Uo = 0, Co = 0, hd = 0;
      function mn(i, a, f, d) {
        var g = gt, w = Object.create(g);
        return w.parent = g, w.ref = 0, w.global = !1, w.id = ++hd, wn.env, w.env = es ? { Promise: ct, PromiseProp: { value: ct, configurable: !0, writable: !0 }, all: ct.all, race: ct.race, allSettled: ct.allSettled, any: ct.any, resolve: ct.resolve, reject: ct.reject } : {}, a && l(w, a), ++g.ref, w.finalize = function() {
          --this.parent.ref || this.parent.finalize();
        }, d = Dn(w, i, f, d), w.ref === 0 && w.finalize(), d;
      }
      function or() {
        return Qt.id || (Qt.id = ++dd), ++Qt.awaits, Qt.echoes += _c, Qt.id;
      }
      function bn() {
        return !!Qt.awaits && (--Qt.awaits == 0 && (Qt.id = 0), Qt.echoes = Qt.awaits * _c, !0);
      }
      function Ro(i) {
        return Qt.echoes && i && i.constructor === $n ? (or(), i.then(function(a) {
          return bn(), a;
        }, function(a) {
          return bn(), Vt(a);
        })) : i;
      }
      function pd() {
        var i = No[No.length - 1];
        No.pop(), vn(i, !1);
      }
      function vn(i, a) {
        var f, d = gt;
        (a ? !Qt.echoes || Uo++ && i === gt : !Uo || --Uo && i === gt) || queueMicrotask(a ? (function(g) {
          ++Co, Qt.echoes && --Qt.echoes != 0 || (Qt.echoes = Qt.awaits = Qt.id = 0), No.push(gt), vn(g, !0);
        }).bind(null, i) : pd), i !== gt && (gt = i, d === wn && (wn.env = Cc()), es && (f = wn.env.Promise, a = i.env, (d.global || i.global) && (Object.defineProperty(s, "Promise", a.PromiseProp), f.all = a.all, f.race = a.race, f.resolve = a.resolve, f.reject = a.reject, a.allSettled && (f.allSettled = a.allSettled), a.any && (f.any = a.any))));
      }
      function Cc() {
        var i = s.Promise;
        return es ? { Promise: i, PromiseProp: Object.getOwnPropertyDescriptor(s, "Promise"), all: i.all, race: i.race, allSettled: i.allSettled, any: i.any, resolve: i.resolve, reject: i.reject } : {};
      }
      function Dn(i, a, f, d, g) {
        var w = gt;
        try {
          return vn(i, !0), a(f, d, g);
        } finally {
          vn(w, !1);
        }
      }
      function Rc(i, a, f, d) {
        return typeof i != "function" ? i : function() {
          var g = gt;
          f && or(), vn(a, !0);
          try {
            return i.apply(this, arguments);
          } finally {
            vn(g, !1), d && queueMicrotask(bn);
          }
        };
      }
      function cs(i) {
        Promise === $n && Qt.echoes === 0 ? Uo === 0 ? i() : enqueueNativeMicroTask(i) : setTimeout(i, 0);
      }
      ("" + Ue).indexOf("[native code]") === -1 && (or = bn = It);
      var Vt = ct.reject, Kn = "￿", nn = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.", Oc = "String expected.", ir = [], Oo = "__dbnames", us = "readonly", fs = "readwrite";
      function Mn(i, a) {
        return i ? a ? function() {
          return i.apply(this, arguments) && a.apply(this, arguments);
        } : i : a;
      }
      var $c = { type: 3, lower: -1 / 0, lowerOpen: !1, upper: [[]], upperOpen: !1 };
      function $o(i) {
        return typeof i != "string" || /\./.test(i) ? function(a) {
          return a;
        } : function(a) {
          return a[i] === void 0 && i in a && delete (a = G(a))[i], a;
        };
      }
      function Pc() {
        throw lt.Type();
      }
      function At(i, a) {
        try {
          var f = Lc(i), d = Lc(a);
          if (f !== d) return f === "Array" ? 1 : d === "Array" ? -1 : f === "binary" ? 1 : d === "binary" ? -1 : f === "string" ? 1 : d === "string" ? -1 : f === "Date" ? 1 : d !== "Date" ? NaN : -1;
          switch (f) {
            case "number":
            case "Date":
            case "string":
              return a < i ? 1 : i < a ? -1 : 0;
            case "binary":
              return function(g, w) {
                for (var b = g.length, E = w.length, k = b < E ? b : E, B = 0; B < k; ++B) if (g[B] !== w[B]) return g[B] < w[B] ? -1 : 1;
                return b === E ? 0 : b < E ? -1 : 1;
              }(Dc(i), Dc(a));
            case "Array":
              return function(g, w) {
                for (var b = g.length, E = w.length, k = b < E ? b : E, B = 0; B < k; ++B) {
                  var C = At(g[B], w[B]);
                  if (C !== 0) return C;
                }
                return b === E ? 0 : b < E ? -1 : 1;
              }(i, a);
          }
        } catch {
        }
        return NaN;
      }
      function Lc(i) {
        var a = typeof i;
        return a != "object" ? a : ArrayBuffer.isView(i) ? "binary" : (i = j(i), i === "ArrayBuffer" ? "binary" : i);
      }
      function Dc(i) {
        return i instanceof Uint8Array ? i : ArrayBuffer.isView(i) ? new Uint8Array(i.buffer, i.byteOffset, i.byteLength) : new Uint8Array(i);
      }
      var Kc = (Ot.prototype._trans = function(i, a, f) {
        var d = this._tx || gt.trans, g = this.name, w = Ge && typeof console < "u" && console.createTask && console.createTask("Dexie: ".concat(i === "readonly" ? "read" : "write", " ").concat(this.name));
        function b(B, C, x) {
          if (!x.schema[g]) throw new lt.NotFound("Table " + g + " not part of transaction");
          return a(x.idbtrans, x);
        }
        var E = nr();
        try {
          var k = d && d.db._novip === this.db._novip ? d === gt.trans ? d._promise(i, b, f) : mn(function() {
            return d._promise(i, b, f);
          }, { trans: d, transless: gt.transless || gt }) : function B(C, x, O, A) {
            if (C.idbdb && (C._state.openComplete || gt.letThrough || C._vip)) {
              var U = C._createTransaction(x, O, C._dbSchema);
              try {
                U.create(), C._state.PR1398_maxLoop = 3;
              } catch (R) {
                return R.name === Xt.InvalidState && C.isOpen() && 0 < --C._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), C.close({ disableAutoOpen: !1 }), C.open().then(function() {
                  return B(C, x, O, A);
                })) : Vt(R);
              }
              return U._promise(x, function(R, N) {
                return mn(function() {
                  return gt.trans = U, A(R, N, U);
                });
              }).then(function(R) {
                if (x === "readwrite") try {
                  U.idbtrans.commit();
                } catch {
                }
                return x === "readonly" ? R : U._completion.then(function() {
                  return R;
                });
              });
            }
            if (C._state.openComplete) return Vt(new lt.DatabaseClosed(C._state.dbOpenError));
            if (!C._state.isBeingOpened) {
              if (!C._state.autoOpen) return Vt(new lt.DatabaseClosed());
              C.open().catch(It);
            }
            return C._state.dbReadyPromise.then(function() {
              return B(C, x, O, A);
            });
          }(this.db, i, [this.name], b);
          return w && (k._consoleTask = w, k = k.catch(function(B) {
            return console.trace(B), Vt(B);
          })), k;
        } finally {
          E && rr();
        }
      }, Ot.prototype.get = function(i, a) {
        var f = this;
        return i && i.constructor === Object ? this.where(i).first(a) : i == null ? Vt(new lt.Type("Invalid argument to Table.get()")) : this._trans("readonly", function(d) {
          return f.core.get({ trans: d, key: i }).then(function(g) {
            return f.hook.reading.fire(g);
          });
        }).then(a);
      }, Ot.prototype.where = function(i) {
        if (typeof i == "string") return new this.db.WhereClause(this, i);
        if (u(i)) return new this.db.WhereClause(this, "[".concat(i.join("+"), "]"));
        var a = c(i);
        if (a.length === 1) return this.where(a[0]).equals(i[a[0]]);
        var f = this.schema.indexes.concat(this.schema.primKey).filter(function(E) {
          if (E.compound && a.every(function(B) {
            return 0 <= E.keyPath.indexOf(B);
          })) {
            for (var k = 0; k < a.length; ++k) if (a.indexOf(E.keyPath[k]) === -1) return !1;
            return !0;
          }
          return !1;
        }).sort(function(E, k) {
          return E.keyPath.length - k.keyPath.length;
        })[0];
        if (f && this.db._maxKey !== Kn) {
          var w = f.keyPath.slice(0, a.length);
          return this.where(w).equals(w.map(function(k) {
            return i[k];
          }));
        }
        !f && Ge && console.warn("The query ".concat(JSON.stringify(i), " on ").concat(this.name, " would benefit from a ") + "compound index [".concat(a.join("+"), "]"));
        var d = this.schema.idxByName;
        function g(E, k) {
          return At(E, k) === 0;
        }
        var b = a.reduce(function(x, k) {
          var B = x[0], C = x[1], x = d[k], O = i[k];
          return [B || x, B || !x ? Mn(C, x && x.multi ? function(A) {
            return A = rt(A, k), u(A) && A.some(function(U) {
              return g(O, U);
            });
          } : function(A) {
            return g(O, rt(A, k));
          }) : C];
        }, [null, null]), w = b[0], b = b[1];
        return w ? this.where(w.name).equals(i[w.keyPath]).filter(b) : f ? this.filter(b) : this.where(a).equals("");
      }, Ot.prototype.filter = function(i) {
        return this.toCollection().and(i);
      }, Ot.prototype.count = function(i) {
        return this.toCollection().count(i);
      }, Ot.prototype.offset = function(i) {
        return this.toCollection().offset(i);
      }, Ot.prototype.limit = function(i) {
        return this.toCollection().limit(i);
      }, Ot.prototype.each = function(i) {
        return this.toCollection().each(i);
      }, Ot.prototype.toArray = function(i) {
        return this.toCollection().toArray(i);
      }, Ot.prototype.toCollection = function() {
        return new this.db.Collection(new this.db.WhereClause(this));
      }, Ot.prototype.orderBy = function(i) {
        return new this.db.Collection(new this.db.WhereClause(this, u(i) ? "[".concat(i.join("+"), "]") : i));
      }, Ot.prototype.reverse = function() {
        return this.toCollection().reverse();
      }, Ot.prototype.mapToClass = function(i) {
        var a, f = this.db, d = this.name;
        function g() {
          return a !== null && a.apply(this, arguments) || this;
        }
        (this.schema.mappedClass = i).prototype instanceof Pc && (function(k, B) {
          if (typeof B != "function" && B !== null) throw new TypeError("Class extends value " + String(B) + " is not a constructor or null");
          function C() {
            this.constructor = k;
          }
          n(k, B), k.prototype = B === null ? Object.create(B) : (C.prototype = B.prototype, new C());
        }(g, a = i), Object.defineProperty(g.prototype, "db", { get: function() {
          return f;
        }, enumerable: !1, configurable: !0 }), g.prototype.table = function() {
          return d;
        }, i = g);
        for (var w = /* @__PURE__ */ new Set(), b = i.prototype; b; b = p(b)) Object.getOwnPropertyNames(b).forEach(function(k) {
          return w.add(k);
        });
        function E(k) {
          if (!k) return k;
          var B, C = Object.create(i.prototype);
          for (B in k) if (!w.has(B)) try {
            C[B] = k[B];
          } catch {
          }
          return C;
        }
        return this.schema.readHook && this.hook.reading.unsubscribe(this.schema.readHook), this.schema.readHook = E, this.hook("reading", E), i;
      }, Ot.prototype.defineClass = function() {
        return this.mapToClass(function(i) {
          l(this, i);
        });
      }, Ot.prototype.add = function(i, a) {
        var f = this, d = this.schema.primKey, g = d.auto, w = d.keyPath, b = i;
        return w && g && (b = $o(w)(i)), this._trans("readwrite", function(E) {
          return f.core.mutate({ trans: E, type: "add", keys: a != null ? [a] : null, values: [b] });
        }).then(function(E) {
          return E.numFailures ? ct.reject(E.failures[0]) : E.lastResult;
        }).then(function(E) {
          if (w) try {
            T(i, w, E);
          } catch {
          }
          return E;
        });
      }, Ot.prototype.update = function(i, a) {
        return typeof i != "object" || u(i) ? this.where(":id").equals(i).modify(a) : (i = rt(i, this.schema.primKey.keyPath), i === void 0 ? Vt(new lt.InvalidArgument("Given object does not contain its primary key")) : this.where(":id").equals(i).modify(a));
      }, Ot.prototype.put = function(i, a) {
        var f = this, d = this.schema.primKey, g = d.auto, w = d.keyPath, b = i;
        return w && g && (b = $o(w)(i)), this._trans("readwrite", function(E) {
          return f.core.mutate({ trans: E, type: "put", values: [b], keys: a != null ? [a] : null });
        }).then(function(E) {
          return E.numFailures ? ct.reject(E.failures[0]) : E.lastResult;
        }).then(function(E) {
          if (w) try {
            T(i, w, E);
          } catch {
          }
          return E;
        });
      }, Ot.prototype.delete = function(i) {
        var a = this;
        return this._trans("readwrite", function(f) {
          return a.core.mutate({ trans: f, type: "delete", keys: [i] });
        }).then(function(f) {
          return f.numFailures ? ct.reject(f.failures[0]) : void 0;
        });
      }, Ot.prototype.clear = function() {
        var i = this;
        return this._trans("readwrite", function(a) {
          return i.core.mutate({ trans: a, type: "deleteRange", range: $c });
        }).then(function(a) {
          return a.numFailures ? ct.reject(a.failures[0]) : void 0;
        });
      }, Ot.prototype.bulkGet = function(i) {
        var a = this;
        return this._trans("readonly", function(f) {
          return a.core.getMany({ keys: i, trans: f }).then(function(d) {
            return d.map(function(g) {
              return a.hook.reading.fire(g);
            });
          });
        });
      }, Ot.prototype.bulkAdd = function(i, a, f) {
        var d = this, g = Array.isArray(a) ? a : void 0, w = (f = f || (g ? void 0 : a)) ? f.allKeys : void 0;
        return this._trans("readwrite", function(b) {
          var B = d.schema.primKey, E = B.auto, B = B.keyPath;
          if (B && g) throw new lt.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
          if (g && g.length !== i.length) throw new lt.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, B = B && E ? i.map($o(B)) : i;
          return d.core.mutate({ trans: b, type: "add", keys: g, values: B, wantResults: w }).then(function(U) {
            var x = U.numFailures, O = U.results, A = U.lastResult, U = U.failures;
            if (x === 0) return w ? O : A;
            throw new Nt("".concat(d.name, ".bulkAdd(): ").concat(x, " of ").concat(k, " operations failed"), U);
          });
        });
      }, Ot.prototype.bulkPut = function(i, a, f) {
        var d = this, g = Array.isArray(a) ? a : void 0, w = (f = f || (g ? void 0 : a)) ? f.allKeys : void 0;
        return this._trans("readwrite", function(b) {
          var B = d.schema.primKey, E = B.auto, B = B.keyPath;
          if (B && g) throw new lt.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
          if (g && g.length !== i.length) throw new lt.InvalidArgument("Arguments objects and keys must have the same length");
          var k = i.length, B = B && E ? i.map($o(B)) : i;
          return d.core.mutate({ trans: b, type: "put", keys: g, values: B, wantResults: w }).then(function(U) {
            var x = U.numFailures, O = U.results, A = U.lastResult, U = U.failures;
            if (x === 0) return w ? O : A;
            throw new Nt("".concat(d.name, ".bulkPut(): ").concat(x, " of ").concat(k, " operations failed"), U);
          });
        });
      }, Ot.prototype.bulkUpdate = function(i) {
        var a = this, f = this.core, d = i.map(function(b) {
          return b.key;
        }), g = i.map(function(b) {
          return b.changes;
        }), w = [];
        return this._trans("readwrite", function(b) {
          return f.getMany({ trans: b, keys: d, cache: "clone" }).then(function(E) {
            var k = [], B = [];
            i.forEach(function(x, O) {
              var A = x.key, U = x.changes, R = E[O];
              if (R) {
                for (var N = 0, P = Object.keys(U); N < P.length; N++) {
                  var K = P[N], M = U[K];
                  if (K === a.schema.primKey.keyPath) {
                    if (At(M, A) !== 0) throw new lt.Constraint("Cannot update primary key in bulkUpdate()");
                  } else T(R, K, M);
                }
                w.push(O), k.push(A), B.push(R);
              }
            });
            var C = k.length;
            return f.mutate({ trans: b, type: "put", keys: k, values: B, updates: { keys: d, changeSpecs: g } }).then(function(x) {
              var O = x.numFailures, A = x.failures;
              if (O === 0) return C;
              for (var U = 0, R = Object.keys(A); U < R.length; U++) {
                var N, P = R[U], K = w[Number(P)];
                K != null && (N = A[P], delete A[P], A[K] = N);
              }
              throw new Nt("".concat(a.name, ".bulkUpdate(): ").concat(O, " of ").concat(C, " operations failed"), A);
            });
          });
        });
      }, Ot.prototype.bulkDelete = function(i) {
        var a = this, f = i.length;
        return this._trans("readwrite", function(d) {
          return a.core.mutate({ trans: d, type: "delete", keys: i });
        }).then(function(b) {
          var g = b.numFailures, w = b.lastResult, b = b.failures;
          if (g === 0) return w;
          throw new Nt("".concat(a.name, ".bulkDelete(): ").concat(g, " of ").concat(f, " operations failed"), b);
        });
      }, Ot);
      function Ot() {
      }
      function Or(i) {
        function a(b, E) {
          if (E) {
            for (var k = arguments.length, B = new Array(k - 1); --k; ) B[k - 1] = arguments[k];
            return f[b].subscribe.apply(null, B), i;
          }
          if (typeof b == "string") return f[b];
        }
        var f = {};
        a.addEventType = w;
        for (var d = 1, g = arguments.length; d < g; ++d) w(arguments[d]);
        return a;
        function w(b, E, k) {
          if (typeof b != "object") {
            var B;
            E = E || ud;
            var C = { subscribers: [], fire: k = k || It, subscribe: function(x) {
              C.subscribers.indexOf(x) === -1 && (C.subscribers.push(x), C.fire = E(C.fire, x));
            }, unsubscribe: function(x) {
              C.subscribers = C.subscribers.filter(function(O) {
                return O !== x;
              }), C.fire = C.subscribers.reduce(E, k);
            } };
            return f[b] = a[b] = C;
          }
          c(B = b).forEach(function(x) {
            var O = B[x];
            if (u(O)) w(x, B[x][0], B[x][1]);
            else {
              if (O !== "asap") throw new lt.InvalidArgument("Invalid event config");
              var A = w(x, Ae, function() {
                for (var U = arguments.length, R = new Array(U); U--; ) R[U] = arguments[U];
                A.subscribers.forEach(function(N) {
                  $(function() {
                    N.apply(null, R);
                  });
                });
              });
            }
          });
        }
      }
      function $r(i, a) {
        return _(a).from({ prototype: i }), a;
      }
      function sr(i, a) {
        return !(i.filter || i.algorithm || i.or) && (a ? i.justLimit : !i.replayFilter);
      }
      function ls(i, a) {
        i.filter = Mn(i.filter, a);
      }
      function ds(i, a, f) {
        var d = i.replayFilter;
        i.replayFilter = d ? function() {
          return Mn(d(), a());
        } : a, i.justLimit = f && !d;
      }
      function Po(i, a) {
        if (i.isPrimKey) return a.primaryKey;
        var f = a.getIndexByKeyPath(i.index);
        if (!f) throw new lt.Schema("KeyPath " + i.index + " on object store " + a.name + " is not indexed");
        return f;
      }
      function Mc(i, a, f) {
        var d = Po(i, a.schema);
        return a.openCursor({ trans: f, values: !i.keysOnly, reverse: i.dir === "prev", unique: !!i.unique, query: { index: d, range: i.range } });
      }
      function Lo(i, a, f, d) {
        var g = i.replayFilter ? Mn(i.filter, i.replayFilter()) : i.filter;
        if (i.or) {
          var w = {}, b = function(E, k, B) {
            var C, x;
            g && !g(k, B, function(O) {
              return k.stop(O);
            }, function(O) {
              return k.fail(O);
            }) || ((x = "" + (C = k.primaryKey)) == "[object ArrayBuffer]" && (x = "" + new Uint8Array(C)), y(w, x) || (w[x] = !0, a(E, k, B)));
          };
          return Promise.all([i.or._iterate(b, f), Vc(Mc(i, d, f), i.algorithm, b, !i.keysOnly && i.valueMapper)]);
        }
        return Vc(Mc(i, d, f), Mn(i.algorithm, g), a, !i.keysOnly && i.valueMapper);
      }
      function Vc(i, a, f, d) {
        var g = Lt(d ? function(w, b, E) {
          return f(d(w), b, E);
        } : f);
        return i.then(function(w) {
          if (w) return w.start(function() {
            var b = function() {
              return w.continue();
            };
            a && !a(w, function(E) {
              return b = E;
            }, function(E) {
              w.stop(E), b = It;
            }, function(E) {
              w.fail(E), b = It;
            }) || g(w.value, w, function(E) {
              return b = E;
            }), b();
          });
        });
      }
      var Pr = (Hc.prototype.execute = function(i) {
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
          if (u(d)) return u(i) ? i.filter(function(g) {
            return !d.includes(g);
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
      }, Hc);
      function Hc(i) {
        this["@@propmod"] = i;
      }
      var gd = (Bt.prototype._read = function(i, a) {
        var f = this._ctx;
        return f.error ? f.table._trans(null, Vt.bind(null, f.error)) : f.table._trans("readonly", i).then(a);
      }, Bt.prototype._write = function(i) {
        var a = this._ctx;
        return a.error ? a.table._trans(null, Vt.bind(null, a.error)) : a.table._trans("readwrite", i, "locked");
      }, Bt.prototype._addAlgorithm = function(i) {
        var a = this._ctx;
        a.algorithm = Mn(a.algorithm, i);
      }, Bt.prototype._iterate = function(i, a) {
        return Lo(this._ctx, i, a, this._ctx.table.core);
      }, Bt.prototype.clone = function(i) {
        var a = Object.create(this.constructor.prototype), f = Object.create(this._ctx);
        return i && l(f, i), a._ctx = f, a;
      }, Bt.prototype.raw = function() {
        return this._ctx.valueMapper = null, this;
      }, Bt.prototype.each = function(i) {
        var a = this._ctx;
        return this._read(function(f) {
          return Lo(a, i, f, a.table.core);
        });
      }, Bt.prototype.count = function(i) {
        var a = this;
        return this._read(function(f) {
          var d = a._ctx, g = d.table.core;
          if (sr(d, !0)) return g.count({ trans: f, query: { index: Po(d, g.schema), range: d.range } }).then(function(b) {
            return Math.min(b, d.limit);
          });
          var w = 0;
          return Lo(d, function() {
            return ++w, !1;
          }, f, g).then(function() {
            return w;
          });
        }).then(i);
      }, Bt.prototype.sortBy = function(i, a) {
        var f = i.split(".").reverse(), d = f[0], g = f.length - 1;
        function w(k, B) {
          return B ? w(k[f[B]], B - 1) : k[d];
        }
        var b = this._ctx.dir === "next" ? 1 : -1;
        function E(k, B) {
          return At(w(k, g), w(B, g)) * b;
        }
        return this.toArray(function(k) {
          return k.sort(E);
        }).then(a);
      }, Bt.prototype.toArray = function(i) {
        var a = this;
        return this._read(function(f) {
          var d = a._ctx;
          if (d.dir === "next" && sr(d, !0) && 0 < d.limit) {
            var g = d.valueMapper, w = Po(d, d.table.core.schema);
            return d.table.core.query({ trans: f, limit: d.limit, values: !0, query: { index: w, range: d.range } }).then(function(E) {
              return E = E.result, g ? E.map(g) : E;
            });
          }
          var b = [];
          return Lo(d, function(E) {
            return b.push(E);
          }, f, d.table.core).then(function() {
            return b;
          });
        }, i);
      }, Bt.prototype.offset = function(i) {
        var a = this._ctx;
        return i <= 0 || (a.offset += i, sr(a) ? ds(a, function() {
          var f = i;
          return function(d, g) {
            return f === 0 || (f === 1 ? --f : g(function() {
              d.advance(f), f = 0;
            }), !1);
          };
        }) : ds(a, function() {
          var f = i;
          return function() {
            return --f < 0;
          };
        })), this;
      }, Bt.prototype.limit = function(i) {
        return this._ctx.limit = Math.min(this._ctx.limit, i), ds(this._ctx, function() {
          var a = i;
          return function(f, d, g) {
            return --a <= 0 && d(g), 0 <= a;
          };
        }, !0), this;
      }, Bt.prototype.until = function(i, a) {
        return ls(this._ctx, function(f, d, g) {
          return !i(f.value) || (d(g), a);
        }), this;
      }, Bt.prototype.first = function(i) {
        return this.limit(1).toArray(function(a) {
          return a[0];
        }).then(i);
      }, Bt.prototype.last = function(i) {
        return this.reverse().first(i);
      }, Bt.prototype.filter = function(i) {
        var a;
        return ls(this._ctx, function(f) {
          return i(f.value);
        }), (a = this._ctx).isMatch = Mn(a.isMatch, i), this;
      }, Bt.prototype.and = function(i) {
        return this.filter(i);
      }, Bt.prototype.or = function(i) {
        return new this.db.WhereClause(this._ctx.table, i, this);
      }, Bt.prototype.reverse = function() {
        return this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev", this._ondirectionchange && this._ondirectionchange(this._ctx.dir), this;
      }, Bt.prototype.desc = function() {
        return this.reverse();
      }, Bt.prototype.eachKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(f, d) {
          i(d.key, d);
        });
      }, Bt.prototype.eachUniqueKey = function(i) {
        return this._ctx.unique = "unique", this.eachKey(i);
      }, Bt.prototype.eachPrimaryKey = function(i) {
        var a = this._ctx;
        return a.keysOnly = !a.isMatch, this.each(function(f, d) {
          i(d.primaryKey, d);
        });
      }, Bt.prototype.keys = function(i) {
        var a = this._ctx;
        a.keysOnly = !a.isMatch;
        var f = [];
        return this.each(function(d, g) {
          f.push(g.key);
        }).then(function() {
          return f;
        }).then(i);
      }, Bt.prototype.primaryKeys = function(i) {
        var a = this._ctx;
        if (a.dir === "next" && sr(a, !0) && 0 < a.limit) return this._read(function(d) {
          var g = Po(a, a.table.core.schema);
          return a.table.core.query({ trans: d, values: !1, limit: a.limit, query: { index: g, range: a.range } });
        }).then(function(d) {
          return d.result;
        }).then(i);
        a.keysOnly = !a.isMatch;
        var f = [];
        return this.each(function(d, g) {
          f.push(g.primaryKey);
        }).then(function() {
          return f;
        }).then(i);
      }, Bt.prototype.uniqueKeys = function(i) {
        return this._ctx.unique = "unique", this.keys(i);
      }, Bt.prototype.firstKey = function(i) {
        return this.limit(1).keys(function(a) {
          return a[0];
        }).then(i);
      }, Bt.prototype.lastKey = function(i) {
        return this.reverse().firstKey(i);
      }, Bt.prototype.distinct = function() {
        var i = this._ctx, i = i.index && i.table.schema.idxByName[i.index];
        if (!i || !i.multi) return this;
        var a = {};
        return ls(this._ctx, function(g) {
          var d = g.primaryKey.toString(), g = y(a, d);
          return a[d] = !0, !g;
        }), this;
      }, Bt.prototype.modify = function(i) {
        var a = this, f = this._ctx;
        return this._write(function(d) {
          var g, w, b;
          b = typeof i == "function" ? i : (g = c(i), w = g.length, function(N) {
            for (var P = !1, K = 0; K < w; ++K) {
              var M = g[K], q = i[M], Q = rt(N, M);
              q instanceof Pr ? (T(N, M, q.execute(Q)), P = !0) : Q !== q && (T(N, M, q), P = !0);
            }
            return P;
          });
          var E = f.table.core, x = E.schema.primaryKey, k = x.outbound, B = x.extractKey, C = 200, x = a.db._options.modifyChunkSize;
          x && (C = typeof x == "object" ? x[E.name] || x["*"] || 200 : x);
          function O(N, M) {
            var K = M.failures, M = M.numFailures;
            U += N - M;
            for (var q = 0, Q = c(K); q < Q.length; q++) {
              var it = Q[q];
              A.push(K[it]);
            }
          }
          var A = [], U = 0, R = [];
          return a.clone().primaryKeys().then(function(N) {
            function P(M) {
              var q = Math.min(C, N.length - M);
              return E.getMany({ trans: d, keys: N.slice(M, M + q), cache: "immutable" }).then(function(Q) {
                for (var it = [], J = [], et = k ? [] : null, st = [], ot = 0; ot < q; ++ot) {
                  var pt = Q[ot], vt = { value: G(pt), primKey: N[M + ot] };
                  b.call(vt, vt.value, vt) !== !1 && (vt.value == null ? st.push(N[M + ot]) : k || At(B(pt), B(vt.value)) === 0 ? (J.push(vt.value), k && et.push(N[M + ot])) : (st.push(N[M + ot]), it.push(vt.value)));
                }
                return Promise.resolve(0 < it.length && E.mutate({ trans: d, type: "add", values: it }).then(function(xt) {
                  for (var St in xt.failures) st.splice(parseInt(St), 1);
                  O(it.length, xt);
                })).then(function() {
                  return (0 < J.length || K && typeof i == "object") && E.mutate({ trans: d, type: "put", keys: et, values: J, criteria: K, changeSpec: typeof i != "function" && i, isAdditionalChunk: 0 < M }).then(function(xt) {
                    return O(J.length, xt);
                  });
                }).then(function() {
                  return (0 < st.length || K && i === hs) && E.mutate({ trans: d, type: "delete", keys: st, criteria: K, isAdditionalChunk: 0 < M }).then(function(xt) {
                    return O(st.length, xt);
                  });
                }).then(function() {
                  return N.length > M + q && P(M + C);
                });
              });
            }
            var K = sr(f) && f.limit === 1 / 0 && (typeof i != "function" || i === hs) && { index: f.index, range: f.range };
            return P(0).then(function() {
              if (0 < A.length) throw new mt("Error modifying one or more objects", A, U, R);
              return N.length;
            });
          });
        });
      }, Bt.prototype.delete = function() {
        var i = this._ctx, a = i.range;
        return sr(i) && (i.isPrimKey || a.type === 3) ? this._write(function(f) {
          var d = i.table.core.schema.primaryKey, g = a;
          return i.table.core.count({ trans: f, query: { index: d, range: g } }).then(function(w) {
            return i.table.core.mutate({ trans: f, type: "deleteRange", range: g }).then(function(b) {
              var E = b.failures;
              if (b.lastResult, b.results, b = b.numFailures, b) throw new mt("Could not delete some values", Object.keys(E).map(function(k) {
                return E[k];
              }), w - b);
              return w - b;
            });
          });
        }) : this.modify(hs);
      }, Bt);
      function Bt() {
      }
      var hs = function(i, a) {
        return a.value = null;
      };
      function yd(i, a) {
        return i < a ? -1 : i === a ? 0 : 1;
      }
      function wd(i, a) {
        return a < i ? -1 : i === a ? 0 : 1;
      }
      function Be(i, a, f) {
        return i = i instanceof Fc ? new i.Collection(i) : i, i._ctx.error = new (f || TypeError)(a), i;
      }
      function ar(i) {
        return new i.Collection(i, function() {
          return jc("");
        }).limit(0);
      }
      function Do(i, a, f, d) {
        var g, w, b, E, k, B, C, x = f.length;
        if (!f.every(function(U) {
          return typeof U == "string";
        })) return Be(i, Oc);
        function O(U) {
          g = U === "next" ? function(N) {
            return N.toUpperCase();
          } : function(N) {
            return N.toLowerCase();
          }, w = U === "next" ? function(N) {
            return N.toLowerCase();
          } : function(N) {
            return N.toUpperCase();
          }, b = U === "next" ? yd : wd;
          var R = f.map(function(N) {
            return { lower: w(N), upper: g(N) };
          }).sort(function(N, P) {
            return b(N.lower, P.lower);
          });
          E = R.map(function(N) {
            return N.upper;
          }), k = R.map(function(N) {
            return N.lower;
          }), C = (B = U) === "next" ? "" : d;
        }
        O("next"), i = new i.Collection(i, function() {
          return En(E[0], k[x - 1] + d);
        }), i._ondirectionchange = function(U) {
          O(U);
        };
        var A = 0;
        return i._addAlgorithm(function(U, R, N) {
          var P = U.key;
          if (typeof P != "string") return !1;
          var K = w(P);
          if (a(K, k, A)) return !0;
          for (var M = null, q = A; q < x; ++q) {
            var Q = function(it, J, et, st, ot, pt) {
              for (var vt = Math.min(it.length, st.length), xt = -1, St = 0; St < vt; ++St) {
                var _e = J[St];
                if (_e !== st[St]) return ot(it[St], et[St]) < 0 ? it.substr(0, St) + et[St] + et.substr(St + 1) : ot(it[St], st[St]) < 0 ? it.substr(0, St) + st[St] + et.substr(St + 1) : 0 <= xt ? it.substr(0, xt) + J[xt] + et.substr(xt + 1) : null;
                ot(it[St], _e) < 0 && (xt = St);
              }
              return vt < st.length && pt === "next" ? it + et.substr(it.length) : vt < it.length && pt === "prev" ? it.substr(0, et.length) : xt < 0 ? null : it.substr(0, xt) + st[xt] + et.substr(xt + 1);
            }(P, K, E[q], k[q], b, B);
            Q === null && M === null ? A = q + 1 : (M === null || 0 < b(M, Q)) && (M = Q);
          }
          return R(M !== null ? function() {
            U.continue(M + C);
          } : N), !1;
        }), i;
      }
      function En(i, a, f, d) {
        return { type: 2, lower: i, upper: a, lowerOpen: f, upperOpen: d };
      }
      function jc(i) {
        return { type: 1, lower: i, upper: i };
      }
      var Fc = (Object.defineProperty(Jt.prototype, "Collection", { get: function() {
        return this._ctx.table.db.Collection;
      }, enumerable: !1, configurable: !0 }), Jt.prototype.between = function(i, a, f, d) {
        f = f !== !1, d = d === !0;
        try {
          return 0 < this._cmp(i, a) || this._cmp(i, a) === 0 && (f || d) && (!f || !d) ? ar(this) : new this.Collection(this, function() {
            return En(i, a, !f, !d);
          });
        } catch {
          return Be(this, nn);
        }
      }, Jt.prototype.equals = function(i) {
        return i == null ? Be(this, nn) : new this.Collection(this, function() {
          return jc(i);
        });
      }, Jt.prototype.above = function(i) {
        return i == null ? Be(this, nn) : new this.Collection(this, function() {
          return En(i, void 0, !0);
        });
      }, Jt.prototype.aboveOrEqual = function(i) {
        return i == null ? Be(this, nn) : new this.Collection(this, function() {
          return En(i, void 0, !1);
        });
      }, Jt.prototype.below = function(i) {
        return i == null ? Be(this, nn) : new this.Collection(this, function() {
          return En(void 0, i, !1, !0);
        });
      }, Jt.prototype.belowOrEqual = function(i) {
        return i == null ? Be(this, nn) : new this.Collection(this, function() {
          return En(void 0, i);
        });
      }, Jt.prototype.startsWith = function(i) {
        return typeof i != "string" ? Be(this, Oc) : this.between(i, i + Kn, !0, !0);
      }, Jt.prototype.startsWithIgnoreCase = function(i) {
        return i === "" ? this.startsWith(i) : Do(this, function(a, f) {
          return a.indexOf(f[0]) === 0;
        }, [i], Kn);
      }, Jt.prototype.equalsIgnoreCase = function(i) {
        return Do(this, function(a, f) {
          return a === f[0];
        }, [i], "");
      }, Jt.prototype.anyOfIgnoreCase = function() {
        var i = at.apply(ht, arguments);
        return i.length === 0 ? ar(this) : Do(this, function(a, f) {
          return f.indexOf(a) !== -1;
        }, i, "");
      }, Jt.prototype.startsWithAnyOfIgnoreCase = function() {
        var i = at.apply(ht, arguments);
        return i.length === 0 ? ar(this) : Do(this, function(a, f) {
          return f.some(function(d) {
            return a.indexOf(d) === 0;
          });
        }, i, Kn);
      }, Jt.prototype.anyOf = function() {
        var i = this, a = at.apply(ht, arguments), f = this._cmp;
        try {
          a.sort(f);
        } catch {
          return Be(this, nn);
        }
        if (a.length === 0) return ar(this);
        var d = new this.Collection(this, function() {
          return En(a[0], a[a.length - 1]);
        });
        d._ondirectionchange = function(w) {
          f = w === "next" ? i._ascending : i._descending, a.sort(f);
        };
        var g = 0;
        return d._addAlgorithm(function(w, b, E) {
          for (var k = w.key; 0 < f(k, a[g]); ) if (++g === a.length) return b(E), !1;
          return f(k, a[g]) === 0 || (b(function() {
            w.continue(a[g]);
          }), !1);
        }), d;
      }, Jt.prototype.notEqual = function(i) {
        return this.inAnyRange([[-1 / 0, i], [i, this.db._maxKey]], { includeLowers: !1, includeUppers: !1 });
      }, Jt.prototype.noneOf = function() {
        var i = at.apply(ht, arguments);
        if (i.length === 0) return new this.Collection(this);
        try {
          i.sort(this._ascending);
        } catch {
          return Be(this, nn);
        }
        var a = i.reduce(function(f, d) {
          return f ? f.concat([[f[f.length - 1][1], d]]) : [[-1 / 0, d]];
        }, null);
        return a.push([i[i.length - 1], this.db._maxKey]), this.inAnyRange(a, { includeLowers: !1, includeUppers: !1 });
      }, Jt.prototype.inAnyRange = function(P, a) {
        var f = this, d = this._cmp, g = this._ascending, w = this._descending, b = this._min, E = this._max;
        if (P.length === 0) return ar(this);
        if (!P.every(function(K) {
          return K[0] !== void 0 && K[1] !== void 0 && g(K[0], K[1]) <= 0;
        })) return Be(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", lt.InvalidArgument);
        var k = !a || a.includeLowers !== !1, B = a && a.includeUppers === !0, C, x = g;
        function O(K, M) {
          return x(K[0], M[0]);
        }
        try {
          (C = P.reduce(function(K, M) {
            for (var q = 0, Q = K.length; q < Q; ++q) {
              var it = K[q];
              if (d(M[0], it[1]) < 0 && 0 < d(M[1], it[0])) {
                it[0] = b(it[0], M[0]), it[1] = E(it[1], M[1]);
                break;
              }
            }
            return q === Q && K.push(M), K;
          }, [])).sort(O);
        } catch {
          return Be(this, nn);
        }
        var A = 0, U = B ? function(K) {
          return 0 < g(K, C[A][1]);
        } : function(K) {
          return 0 <= g(K, C[A][1]);
        }, R = k ? function(K) {
          return 0 < w(K, C[A][0]);
        } : function(K) {
          return 0 <= w(K, C[A][0]);
        }, N = U, P = new this.Collection(this, function() {
          return En(C[0][0], C[C.length - 1][1], !k, !B);
        });
        return P._ondirectionchange = function(K) {
          x = K === "next" ? (N = U, g) : (N = R, w), C.sort(O);
        }, P._addAlgorithm(function(K, M, q) {
          for (var Q, it = K.key; N(it); ) if (++A === C.length) return M(q), !1;
          return !U(Q = it) && !R(Q) || (f._cmp(it, C[A][1]) === 0 || f._cmp(it, C[A][0]) === 0 || M(function() {
            x === g ? K.continue(C[A][0]) : K.continue(C[A][1]);
          }), !1);
        }), P;
      }, Jt.prototype.startsWithAnyOf = function() {
        var i = at.apply(ht, arguments);
        return i.every(function(a) {
          return typeof a == "string";
        }) ? i.length === 0 ? ar(this) : this.inAnyRange(i.map(function(a) {
          return [a, a + Kn];
        })) : Be(this, "startsWithAnyOf() only works with strings");
      }, Jt);
      function Jt() {
      }
      function We(i) {
        return Lt(function(a) {
          return Lr(a), i(a.target.error), !1;
        });
      }
      function Lr(i) {
        i.stopPropagation && i.stopPropagation(), i.preventDefault && i.preventDefault();
      }
      var Dr = "storagemutated", ps = "x-storagemutated-1", xn = Or(null, Dr), md = (Ye.prototype._lock = function() {
        return H(!gt.global), ++this._reculock, this._reculock !== 1 || gt.global || (gt.lockOwnerFor = this), this;
      }, Ye.prototype._unlock = function() {
        if (H(!gt.global), --this._reculock == 0) for (gt.global || (gt.lockOwnerFor = null); 0 < this._blockedFuncs.length && !this._locked(); ) {
          var i = this._blockedFuncs.shift();
          try {
            Dn(i[1], i[0]);
          } catch {
          }
        }
        return this;
      }, Ye.prototype._locked = function() {
        return this._reculock && gt.lockOwnerFor !== this;
      }, Ye.prototype.create = function(i) {
        var a = this;
        if (!this.mode) return this;
        var f = this.db.idbdb, d = this.db._state.dbOpenError;
        if (H(!this.idbtrans), !i && !f) switch (d && d.name) {
          case "DatabaseClosedError":
            throw new lt.DatabaseClosed(d);
          case "MissingAPIError":
            throw new lt.MissingAPI(d.message, d);
          default:
            throw new lt.OpenFailed(d);
        }
        if (!this.active) throw new lt.TransactionInactive();
        return H(this._completion._state === null), (i = this.idbtrans = i || (this.db.core || f).transaction(this.storeNames, this.mode, { durability: this.chromeTransactionDurability })).onerror = Lt(function(g) {
          Lr(g), a._reject(i.error);
        }), i.onabort = Lt(function(g) {
          Lr(g), a.active && a._reject(new lt.Abort(i.error)), a.active = !1, a.on("abort").fire(g);
        }), i.oncomplete = Lt(function() {
          a.active = !1, a._resolve(), "mutatedParts" in i && xn.storagemutated.fire(i.mutatedParts);
        }), this;
      }, Ye.prototype._promise = function(i, a, f) {
        var d = this;
        if (i === "readwrite" && this.mode !== "readwrite") return Vt(new lt.ReadOnly("Transaction is readonly"));
        if (!this.active) return Vt(new lt.TransactionInactive());
        if (this._locked()) return new ct(function(w, b) {
          d._blockedFuncs.push([function() {
            d._promise(i, a, f).then(w, b);
          }, gt]);
        });
        if (f) return mn(function() {
          var w = new ct(function(b, E) {
            d._lock();
            var k = a(b, E, d);
            k && k.then && k.then(b, E);
          });
          return w.finally(function() {
            return d._unlock();
          }), w._lib = !0, w;
        });
        var g = new ct(function(w, b) {
          var E = a(w, b, d);
          E && E.then && E.then(w, b);
        });
        return g._lib = !0, g;
      }, Ye.prototype._root = function() {
        return this.parent ? this.parent._root() : this;
      }, Ye.prototype.waitFor = function(i) {
        var a, f = this._root(), d = ct.resolve(i);
        f._waitingFor ? f._waitingFor = f._waitingFor.then(function() {
          return d;
        }) : (f._waitingFor = d, f._waitingQueue = [], a = f.idbtrans.objectStore(f.storeNames[0]), function w() {
          for (++f._spinCount; f._waitingQueue.length; ) f._waitingQueue.shift()();
          f._waitingFor && (a.get(-1 / 0).onsuccess = w);
        }());
        var g = f._waitingFor;
        return new ct(function(w, b) {
          d.then(function(E) {
            return f._waitingQueue.push(Lt(w.bind(null, E)));
          }, function(E) {
            return f._waitingQueue.push(Lt(b.bind(null, E)));
          }).finally(function() {
            f._waitingFor === g && (f._waitingFor = null);
          });
        });
      }, Ye.prototype.abort = function() {
        this.active && (this.active = !1, this.idbtrans && this.idbtrans.abort(), this._reject(new lt.Abort()));
      }, Ye.prototype.table = function(i) {
        var a = this._memoizedTables || (this._memoizedTables = {});
        if (y(a, i)) return a[i];
        var f = this.schema[i];
        if (!f) throw new lt.NotFound("Table " + i + " not part of transaction");
        return f = new this.db.Table(i, f, this), f.core = this.db.core.table(i), a[i] = f;
      }, Ye);
      function Ye() {
      }
      function gs(i, a, f, d, g, w, b) {
        return { name: i, keyPath: a, unique: f, multi: d, auto: g, compound: w, src: (f && !b ? "&" : "") + (d ? "*" : "") + (g ? "++" : "") + qc(a) };
      }
      function qc(i) {
        return typeof i == "string" ? i : i ? "[" + [].join.call(i, "+") + "]" : "";
      }
      function ys(i, a, f) {
        return { name: i, primKey: a, indexes: f, mappedClass: null, idxByName: (d = function(g) {
          return [g.name, g];
        }, f.reduce(function(g, w, b) {
          return b = d(w, b), b && (g[b[0]] = b[1]), g;
        }, {})) };
        var d;
      }
      var Kr = function(i) {
        try {
          return i.only([[]]), Kr = function() {
            return [[]];
          }, [[]];
        } catch {
          return Kr = function() {
            return Kn;
          }, Kn;
        }
      };
      function ws(i) {
        return i == null ? function() {
        } : typeof i == "string" ? (a = i).split(".").length === 1 ? function(f) {
          return f[a];
        } : function(f) {
          return rt(f, a);
        } : function(f) {
          return rt(f, i);
        };
        var a;
      }
      function zc(i) {
        return [].slice.call(i);
      }
      var bd = 0;
      function Mr(i) {
        return i == null ? ":id" : typeof i == "string" ? i : "[".concat(i.join("+"), "]");
      }
      function vd(i, a, k) {
        function d(N) {
          if (N.type === 3) return null;
          if (N.type === 4) throw new Error("Cannot convert never type to IDBKeyRange");
          var A = N.lower, U = N.upper, R = N.lowerOpen, N = N.upperOpen;
          return A === void 0 ? U === void 0 ? null : a.upperBound(U, !!N) : U === void 0 ? a.lowerBound(A, !!R) : a.bound(A, U, !!R, !!N);
        }
        function g(O) {
          var A, U = O.name;
          return { name: U, schema: O, mutate: function(R) {
            var N = R.trans, P = R.type, K = R.keys, M = R.values, q = R.range;
            return new Promise(function(Q, it) {
              Q = Lt(Q);
              var J = N.objectStore(U), et = J.keyPath == null, st = P === "put" || P === "add";
              if (!st && P !== "delete" && P !== "deleteRange") throw new Error("Invalid operation type: " + P);
              var ot, pt = (K || M || { length: 1 }).length;
              if (K && M && K.length !== M.length) throw new Error("Given keys array must have same length as given values array.");
              if (pt === 0) return Q({ numFailures: 0, failures: {}, results: [], lastResult: void 0 });
              function vt(pe) {
                ++_e, Lr(pe);
              }
              var xt = [], St = [], _e = 0;
              if (P === "deleteRange") {
                if (q.type === 4) return Q({ numFailures: _e, failures: St, results: [], lastResult: void 0 });
                q.type === 3 ? xt.push(ot = J.clear()) : xt.push(ot = J.delete(d(q)));
              } else {
                var et = st ? et ? [M, K] : [M, null] : [K, null], bt = et[0], ce = et[1];
                if (st) for (var ue = 0; ue < pt; ++ue) xt.push(ot = ce && ce[ue] !== void 0 ? J[P](bt[ue], ce[ue]) : J[P](bt[ue])), ot.onerror = vt;
                else for (ue = 0; ue < pt; ++ue) xt.push(ot = J[P](bt[ue])), ot.onerror = vt;
              }
              function Xo(pe) {
                pe = pe.target.result, xt.forEach(function(jn, $s) {
                  return jn.error != null && (St[$s] = jn.error);
                }), Q({ numFailures: _e, failures: St, results: P === "delete" ? K : xt.map(function(jn) {
                  return jn.result;
                }), lastResult: pe });
              }
              ot.onerror = function(pe) {
                vt(pe), Xo(pe);
              }, ot.onsuccess = Xo;
            });
          }, getMany: function(R) {
            var N = R.trans, P = R.keys;
            return new Promise(function(K, M) {
              K = Lt(K);
              for (var q, Q = N.objectStore(U), it = P.length, J = new Array(it), et = 0, st = 0, ot = function(xt) {
                xt = xt.target, J[xt._pos] = xt.result, ++st === et && K(J);
              }, pt = We(M), vt = 0; vt < it; ++vt) P[vt] != null && ((q = Q.get(P[vt]))._pos = vt, q.onsuccess = ot, q.onerror = pt, ++et);
              et === 0 && K(J);
            });
          }, get: function(R) {
            var N = R.trans, P = R.key;
            return new Promise(function(K, M) {
              K = Lt(K);
              var q = N.objectStore(U).get(P);
              q.onsuccess = function(Q) {
                return K(Q.target.result);
              }, q.onerror = We(M);
            });
          }, query: (A = B, function(R) {
            return new Promise(function(N, P) {
              N = Lt(N);
              var K, M, q, et = R.trans, Q = R.values, it = R.limit, ot = R.query, J = it === 1 / 0 ? void 0 : it, st = ot.index, ot = ot.range, et = et.objectStore(U), st = st.isPrimaryKey ? et : et.index(st.name), ot = d(ot);
              if (it === 0) return N({ result: [] });
              A ? ((J = Q ? st.getAll(ot, J) : st.getAllKeys(ot, J)).onsuccess = function(pt) {
                return N({ result: pt.target.result });
              }, J.onerror = We(P)) : (K = 0, M = !Q && "openKeyCursor" in st ? st.openKeyCursor(ot) : st.openCursor(ot), q = [], M.onsuccess = function(pt) {
                var vt = M.result;
                return vt ? (q.push(Q ? vt.value : vt.primaryKey), ++K === it ? N({ result: q }) : void vt.continue()) : N({ result: q });
              }, M.onerror = We(P));
            });
          }), openCursor: function(R) {
            var N = R.trans, P = R.values, K = R.query, M = R.reverse, q = R.unique;
            return new Promise(function(Q, it) {
              Q = Lt(Q);
              var st = K.index, J = K.range, et = N.objectStore(U), et = st.isPrimaryKey ? et : et.index(st.name), st = M ? q ? "prevunique" : "prev" : q ? "nextunique" : "next", ot = !P && "openKeyCursor" in et ? et.openKeyCursor(d(J), st) : et.openCursor(d(J), st);
              ot.onerror = We(it), ot.onsuccess = Lt(function(pt) {
                var vt, xt, St, _e, bt = ot.result;
                bt ? (bt.___id = ++bd, bt.done = !1, vt = bt.continue.bind(bt), xt = (xt = bt.continuePrimaryKey) && xt.bind(bt), St = bt.advance.bind(bt), _e = function() {
                  throw new Error("Cursor not stopped");
                }, bt.trans = N, bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = function() {
                  throw new Error("Cursor not started");
                }, bt.fail = Lt(it), bt.next = function() {
                  var ce = this, ue = 1;
                  return this.start(function() {
                    return ue-- ? ce.continue() : ce.stop();
                  }).then(function() {
                    return ce;
                  });
                }, bt.start = function(ce) {
                  function ue() {
                    if (ot.result) try {
                      ce();
                    } catch (pe) {
                      bt.fail(pe);
                    }
                    else bt.done = !0, bt.start = function() {
                      throw new Error("Cursor behind last entry");
                    }, bt.stop();
                  }
                  var Xo = new Promise(function(pe, jn) {
                    pe = Lt(pe), ot.onerror = We(jn), bt.fail = jn, bt.stop = function($s) {
                      bt.stop = bt.continue = bt.continuePrimaryKey = bt.advance = _e, pe($s);
                    };
                  });
                  return ot.onsuccess = Lt(function(pe) {
                    ot.onsuccess = ue, ue();
                  }), bt.continue = vt, bt.continuePrimaryKey = xt, bt.advance = St, ue(), Xo;
                }, Q(bt)) : Q(null);
              }, it);
            });
          }, count: function(R) {
            var N = R.query, P = R.trans, K = N.index, M = N.range;
            return new Promise(function(q, Q) {
              var it = P.objectStore(U), J = K.isPrimaryKey ? it : it.index(K.name), it = d(M), J = it ? J.count(it) : J.count();
              J.onsuccess = Lt(function(et) {
                return q(et.target.result);
              }), J.onerror = We(Q);
            });
          } };
        }
        var w, b, E, C = (b = k, E = zc((w = i).objectStoreNames), { schema: { name: w.name, tables: E.map(function(O) {
          return b.objectStore(O);
        }).map(function(O) {
          var A = O.keyPath, N = O.autoIncrement, U = u(A), R = {}, N = { name: O.name, primaryKey: { name: null, isPrimaryKey: !0, outbound: A == null, compound: U, keyPath: A, autoIncrement: N, unique: !0, extractKey: ws(A) }, indexes: zc(O.indexNames).map(function(P) {
            return O.index(P);
          }).map(function(q) {
            var K = q.name, M = q.unique, Q = q.multiEntry, q = q.keyPath, Q = { name: K, compound: u(q), keyPath: q, unique: M, multiEntry: Q, extractKey: ws(q) };
            return R[Mr(q)] = Q;
          }), getIndexByKeyPath: function(P) {
            return R[Mr(P)];
          } };
          return R[":id"] = N.primaryKey, A != null && (R[Mr(A)] = N.primaryKey), N;
        }) }, hasGetAll: 0 < E.length && "getAll" in b.objectStore(E[0]) && !(typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604) }), k = C.schema, B = C.hasGetAll, C = k.tables.map(g), x = {};
        return C.forEach(function(O) {
          return x[O.name] = O;
        }), { stack: "dbcore", transaction: i.transaction.bind(i), table: function(O) {
          if (!x[O]) throw new Error("Table '".concat(O, "' not found"));
          return x[O];
        }, MIN_KEY: -1 / 0, MAX_KEY: Kr(a), schema: k };
      }
      function Ed(i, a, f, d) {
        var g = f.IDBKeyRange;
        return f.indexedDB, { dbcore: (d = vd(a, g, d), i.dbcore.reduce(function(w, b) {
          return b = b.create, r(r({}, w), b(w));
        }, d)) };
      }
      function Ko(i, d) {
        var f = d.db, d = Ed(i._middlewares, f, i._deps, d);
        i.core = d.dbcore, i.tables.forEach(function(g) {
          var w = g.name;
          i.core.schema.tables.some(function(b) {
            return b.name === w;
          }) && (g.core = i.core.table(w), i[w] instanceof i.Table && (i[w].core = g.core));
        });
      }
      function Mo(i, a, f, d) {
        f.forEach(function(g) {
          var w = d[g];
          a.forEach(function(b) {
            var E = function k(B, C) {
              return L(B, C) || (B = p(B)) && k(B, C);
            }(b, g);
            (!E || "value" in E && E.value === void 0) && (b === i.Transaction.prototype || b instanceof i.Transaction ? S(b, g, { get: function() {
              return this.table(g);
            }, set: function(k) {
              v(this, g, { value: k, writable: !0, configurable: !0, enumerable: !0 });
            } }) : b[g] = new i.Table(g, w));
          });
        });
      }
      function ms(i, a) {
        a.forEach(function(f) {
          for (var d in f) f[d] instanceof i.Table && delete f[d];
        });
      }
      function xd(i, a) {
        return i._cfg.version - a._cfg.version;
      }
      function Sd(i, a, f, d) {
        var g = i._dbSchema;
        f.objectStoreNames.contains("$meta") && !g.$meta && (g.$meta = ys("$meta", Wc("")[0], []), i._storeNames.push("$meta"));
        var w = i._createTransaction("readwrite", i._storeNames, g);
        w.create(f), w._completion.catch(d);
        var b = w._reject.bind(w), E = gt.transless || gt;
        mn(function() {
          return gt.trans = w, gt.transless = E, a !== 0 ? (Ko(i, f), B = a, ((k = w).storeNames.includes("$meta") ? k.table("$meta").get("version").then(function(C) {
            return C ?? B;
          }) : ct.resolve(B)).then(function(C) {
            return O = C, A = w, U = f, R = [], C = (x = i)._versions, N = x._dbSchema = Ho(0, x.idbdb, U), (C = C.filter(function(P) {
              return P._cfg.version >= O;
            })).length !== 0 ? (C.forEach(function(P) {
              R.push(function() {
                var K = N, M = P._cfg.dbschema;
                jo(x, K, U), jo(x, M, U), N = x._dbSchema = M;
                var q = bs(K, M);
                q.add.forEach(function(st) {
                  vs(U, st[0], st[1].primKey, st[1].indexes);
                }), q.change.forEach(function(st) {
                  if (st.recreate) throw new lt.Upgrade("Not yet support for changing primary key");
                  var ot = U.objectStore(st.name);
                  st.add.forEach(function(pt) {
                    return Vo(ot, pt);
                  }), st.change.forEach(function(pt) {
                    ot.deleteIndex(pt.name), Vo(ot, pt);
                  }), st.del.forEach(function(pt) {
                    return ot.deleteIndex(pt);
                  });
                });
                var Q = P._cfg.contentUpgrade;
                if (Q && P._cfg.version > O) {
                  Ko(x, U), A._memoizedTables = {};
                  var it = ut(M);
                  q.del.forEach(function(st) {
                    it[st] = K[st];
                  }), ms(x, [x.Transaction.prototype]), Mo(x, [x.Transaction.prototype], c(it), it), A.schema = it;
                  var J, et = ft(Q);
                  return et && or(), q = ct.follow(function() {
                    var st;
                    (J = Q(A)) && et && (st = bn.bind(null, null), J.then(st, st));
                  }), J && typeof J.then == "function" ? ct.resolve(J) : q.then(function() {
                    return J;
                  });
                }
              }), R.push(function(K) {
                var M, q, Q = P._cfg.dbschema;
                M = Q, q = K, [].slice.call(q.db.objectStoreNames).forEach(function(it) {
                  return M[it] == null && q.db.deleteObjectStore(it);
                }), ms(x, [x.Transaction.prototype]), Mo(x, [x.Transaction.prototype], x._storeNames, x._dbSchema), A.schema = x._dbSchema;
              }), R.push(function(K) {
                x.idbdb.objectStoreNames.contains("$meta") && (Math.ceil(x.idbdb.version / 10) === P._cfg.version ? (x.idbdb.deleteObjectStore("$meta"), delete x._dbSchema.$meta, x._storeNames = x._storeNames.filter(function(M) {
                  return M !== "$meta";
                })) : K.objectStore("$meta").put(P._cfg.version, "version"));
              });
            }), function P() {
              return R.length ? ct.resolve(R.shift()(A.idbtrans)).then(P) : ct.resolve();
            }().then(function() {
              Gc(N, U);
            })) : ct.resolve();
            var x, O, A, U, R, N;
          }).catch(b)) : (c(g).forEach(function(C) {
            vs(f, C, g[C].primKey, g[C].indexes);
          }), Ko(i, f), void ct.follow(function() {
            return i.on.populate.fire(w);
          }).catch(b));
          var k, B;
        });
      }
      function Td(i, a) {
        Gc(i._dbSchema, a), a.db.version % 10 != 0 || a.objectStoreNames.contains("$meta") || a.db.createObjectStore("$meta").add(Math.ceil(a.db.version / 10 - 1), "version");
        var f = Ho(0, i.idbdb, a);
        jo(i, i._dbSchema, a);
        for (var d = 0, g = bs(f, i._dbSchema).change; d < g.length; d++) {
          var w = function(b) {
            if (b.change.length || b.recreate) return console.warn("Unable to patch indexes of table ".concat(b.name, " because it has changes on the type of index or primary key.")), { value: void 0 };
            var E = a.objectStore(b.name);
            b.add.forEach(function(k) {
              Ge && console.debug("Dexie upgrade patch: Creating missing index ".concat(b.name, ".").concat(k.src)), Vo(E, k);
            });
          }(g[d]);
          if (typeof w == "object") return w.value;
        }
      }
      function bs(i, a) {
        var f, d = { del: [], add: [], change: [] };
        for (f in i) a[f] || d.del.push(f);
        for (f in a) {
          var g = i[f], w = a[f];
          if (g) {
            var b = { name: f, def: w, recreate: !1, del: [], add: [], change: [] };
            if ("" + (g.primKey.keyPath || "") != "" + (w.primKey.keyPath || "") || g.primKey.auto !== w.primKey.auto) b.recreate = !0, d.change.push(b);
            else {
              var E = g.idxByName, k = w.idxByName, B = void 0;
              for (B in E) k[B] || b.del.push(B);
              for (B in k) {
                var C = E[B], x = k[B];
                C ? C.src !== x.src && b.change.push(x) : b.add.push(x);
              }
              (0 < b.del.length || 0 < b.add.length || 0 < b.change.length) && d.change.push(b);
            }
          } else d.add.push([f, w]);
        }
        return d;
      }
      function vs(i, a, f, d) {
        var g = i.db.createObjectStore(a, f.keyPath ? { keyPath: f.keyPath, autoIncrement: f.auto } : { autoIncrement: f.auto });
        return d.forEach(function(w) {
          return Vo(g, w);
        }), g;
      }
      function Gc(i, a) {
        c(i).forEach(function(f) {
          a.db.objectStoreNames.contains(f) || (Ge && console.debug("Dexie: Creating missing table", f), vs(a, f, i[f].primKey, i[f].indexes));
        });
      }
      function Vo(i, a) {
        i.createIndex(a.name, a.keyPath, { unique: a.unique, multiEntry: a.multi });
      }
      function Ho(i, a, f) {
        var d = {};
        return Z(a.objectStoreNames, 0).forEach(function(g) {
          for (var w = f.objectStore(g), b = gs(qc(B = w.keyPath), B || "", !0, !1, !!w.autoIncrement, B && typeof B != "string", !0), E = [], k = 0; k < w.indexNames.length; ++k) {
            var C = w.index(w.indexNames[k]), B = C.keyPath, C = gs(C.name, B, !!C.unique, !!C.multiEntry, !1, B && typeof B != "string", !1);
            E.push(C);
          }
          d[g] = ys(g, b, E);
        }), d;
      }
      function jo(i, a, f) {
        for (var d = f.db.objectStoreNames, g = 0; g < d.length; ++g) {
          var w = d[g], b = f.objectStore(w);
          i._hasGetAll = "getAll" in b;
          for (var E = 0; E < b.indexNames.length; ++E) {
            var k = b.indexNames[E], B = b.index(k).keyPath, C = typeof B == "string" ? B : "[" + Z(B).join("+") + "]";
            !a[w] || (B = a[w].idxByName[C]) && (B.name = k, delete a[w].idxByName[C], a[w].idxByName[k] = B);
          }
        }
        typeof navigator < "u" && /Safari/.test(navigator.userAgent) && !/(Chrome\/|Edge\/)/.test(navigator.userAgent) && s.WorkerGlobalScope && s instanceof s.WorkerGlobalScope && [].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1] < 604 && (i._hasGetAll = !1);
      }
      function Wc(i) {
        return i.split(",").map(function(a, f) {
          var d = (a = a.trim()).replace(/([&*]|\+\+)/g, ""), g = /^\[/.test(d) ? d.match(/^\[(.*)\]$/)[1].split("+") : d;
          return gs(d, g || null, /\&/.test(a), /\*/.test(a), /\+\+/.test(a), u(g), f === 0);
        });
      }
      var kd = (Fo.prototype._parseStoresSpec = function(i, a) {
        c(i).forEach(function(f) {
          if (i[f] !== null) {
            var d = Wc(i[f]), g = d.shift();
            if (g.unique = !0, g.multi) throw new lt.Schema("Primary key cannot be multi-valued");
            d.forEach(function(w) {
              if (w.auto) throw new lt.Schema("Only primary key can be marked as autoIncrement (++)");
              if (!w.keyPath) throw new lt.Schema("Index must have a name and cannot be an empty string");
            }), a[f] = ys(f, g, d);
          }
        });
      }, Fo.prototype.stores = function(f) {
        var a = this.db;
        this._cfg.storesSource = this._cfg.storesSource ? l(this._cfg.storesSource, f) : f;
        var f = a._versions, d = {}, g = {};
        return f.forEach(function(w) {
          l(d, w._cfg.storesSource), g = w._cfg.dbschema = {}, w._parseStoresSpec(d, g);
        }), a._dbSchema = g, ms(a, [a._allTables, a, a.Transaction.prototype]), Mo(a, [a._allTables, a, a.Transaction.prototype, this._cfg.tables], c(g), g), a._storeNames = c(g), this;
      }, Fo.prototype.upgrade = function(i) {
        return this._cfg.contentUpgrade = ts(this._cfg.contentUpgrade || It, i), this;
      }, Fo);
      function Fo() {
      }
      function Es(i, a) {
        var f = i._dbNamesDB;
        return f || (f = i._dbNamesDB = new rn(Oo, { addons: [], indexedDB: i, IDBKeyRange: a })).version(1).stores({ dbnames: "name" }), f.table("dbnames");
      }
      function xs(i) {
        return i && typeof i.databases == "function";
      }
      function Ss(i) {
        return mn(function() {
          return gt.letThrough = !0, i();
        });
      }
      function Ts(i) {
        return !("from" in i);
      }
      var ae = function(i, a) {
        if (!this) {
          var f = new ae();
          return i && "d" in i && l(f, i), f;
        }
        l(this, arguments.length ? { d: 1, from: i, to: 1 < arguments.length ? a : i } : { d: 0 });
      };
      function Vr(i, a, f) {
        var d = At(a, f);
        if (!isNaN(d)) {
          if (0 < d) throw RangeError();
          if (Ts(i)) return l(i, { from: a, to: f, d: 1 });
          var g = i.l, d = i.r;
          if (At(f, i.from) < 0) return g ? Vr(g, a, f) : i.l = { from: a, to: f, d: 1, l: null, r: null }, Zc(i);
          if (0 < At(a, i.to)) return d ? Vr(d, a, f) : i.r = { from: a, to: f, d: 1, l: null, r: null }, Zc(i);
          At(a, i.from) < 0 && (i.from = a, i.l = null, i.d = d ? d.d + 1 : 1), 0 < At(f, i.to) && (i.to = f, i.r = null, i.d = i.l ? i.l.d + 1 : 1), f = !i.r, g && !i.l && Hr(i, g), d && f && Hr(i, d);
        }
      }
      function Hr(i, a) {
        Ts(a) || function f(d, k) {
          var w = k.from, b = k.to, E = k.l, k = k.r;
          Vr(d, w, b), E && f(d, E), k && f(d, k);
        }(i, a);
      }
      function Yc(i, a) {
        var f = qo(a), d = f.next();
        if (d.done) return !1;
        for (var g = d.value, w = qo(i), b = w.next(g.from), E = b.value; !d.done && !b.done; ) {
          if (At(E.from, g.to) <= 0 && 0 <= At(E.to, g.from)) return !0;
          At(g.from, E.from) < 0 ? g = (d = f.next(E.from)).value : E = (b = w.next(g.from)).value;
        }
        return !1;
      }
      function qo(i) {
        var a = Ts(i) ? null : { s: 0, n: i };
        return { next: function(f) {
          for (var d = 0 < arguments.length; a; ) switch (a.s) {
            case 0:
              if (a.s = 1, d) for (; a.n.l && At(f, a.n.from) < 0; ) a = { up: a, n: a.n.l, s: 1 };
              else for (; a.n.l; ) a = { up: a, n: a.n.l, s: 1 };
            case 1:
              if (a.s = 2, !d || At(f, a.n.to) <= 0) return { value: a.n, done: !1 };
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
      function Zc(i) {
        var a, f, d = (((a = i.r) === null || a === void 0 ? void 0 : a.d) || 0) - (((f = i.l) === null || f === void 0 ? void 0 : f.d) || 0), g = 1 < d ? "r" : d < -1 ? "l" : "";
        g && (a = g == "r" ? "l" : "r", f = r({}, i), d = i[g], i.from = d.from, i.to = d.to, i[g] = d[g], f[g] = d[a], (i[a] = f).d = Xc(f)), i.d = Xc(i);
      }
      function Xc(f) {
        var a = f.r, f = f.l;
        return (a ? f ? Math.max(a.d, f.d) : a.d : f ? f.d : 0) + 1;
      }
      function zo(i, a) {
        return c(a).forEach(function(f) {
          i[f] ? Hr(i[f], a[f]) : i[f] = function d(g) {
            var w, b, E = {};
            for (w in g) y(g, w) && (b = g[w], E[w] = !b || typeof b != "object" || I.has(b.constructor) ? b : d(b));
            return E;
          }(a[f]);
        }), i;
      }
      function ks(i, a) {
        return i.all || a.all || Object.keys(i).some(function(f) {
          return a[f] && Yc(a[f], i[f]);
        });
      }
      m(ae.prototype, ((Ue = { add: function(i) {
        return Hr(this, i), this;
      }, addKey: function(i) {
        return Vr(this, i, i), this;
      }, addKeys: function(i) {
        var a = this;
        return i.forEach(function(f) {
          return Vr(a, f, f);
        }), this;
      }, hasKey: function(i) {
        var a = qo(this).next(i).value;
        return a && At(a.from, i) <= 0 && 0 <= At(a.to, i);
      } })[V] = function() {
        return qo(this);
      }, Ue));
      var Vn = {}, As = {}, Is = !1;
      function Go(i) {
        zo(As, i), Is || (Is = !0, setTimeout(function() {
          Is = !1, Bs(As, !(As = {}));
        }, 0));
      }
      function Bs(i, a) {
        a === void 0 && (a = !1);
        var f = /* @__PURE__ */ new Set();
        if (i.all) for (var d = 0, g = Object.values(Vn); d < g.length; d++) Qc(b = g[d], i, f, a);
        else for (var w in i) {
          var b, E = /^idb\:\/\/(.*)\/(.*)\//.exec(w);
          E && (w = E[1], E = E[2], (b = Vn["idb://".concat(w, "/").concat(E)]) && Qc(b, i, f, a));
        }
        f.forEach(function(k) {
          return k();
        });
      }
      function Qc(i, a, f, d) {
        for (var g = [], w = 0, b = Object.entries(i.queries.query); w < b.length; w++) {
          for (var E = b[w], k = E[0], B = [], C = 0, x = E[1]; C < x.length; C++) {
            var O = x[C];
            ks(a, O.obsSet) ? O.subscribers.forEach(function(N) {
              return f.add(N);
            }) : d && B.push(O);
          }
          d && g.push([k, B]);
        }
        if (d) for (var A = 0, U = g; A < U.length; A++) {
          var R = U[A], k = R[0], B = R[1];
          i.queries.query[k] = B;
        }
      }
      function Ad(i) {
        var a = i._state, f = i._deps.indexedDB;
        if (a.isBeingOpened || i.idbdb) return a.dbReadyPromise.then(function() {
          return a.dbOpenError ? Vt(a.dbOpenError) : i;
        });
        a.isBeingOpened = !0, a.dbOpenError = null, a.openComplete = !1;
        var d = a.openCanceller, g = Math.round(10 * i.verno), w = !1;
        function b() {
          if (a.openCanceller !== d) throw new lt.DatabaseClosed("db.open() was cancelled");
        }
        function E() {
          return new ct(function(O, A) {
            if (b(), !f) throw new lt.MissingAPI();
            var U = i.name, R = a.autoSchema || !g ? f.open(U) : f.open(U, g);
            if (!R) throw new lt.MissingAPI();
            R.onerror = We(A), R.onblocked = Lt(i._fireOnBlocked), R.onupgradeneeded = Lt(function(N) {
              var P;
              C = R.transaction, a.autoSchema && !i._options.allowEmptyDB ? (R.onerror = Lr, C.abort(), R.result.close(), (P = f.deleteDatabase(U)).onsuccess = P.onerror = Lt(function() {
                A(new lt.NoSuchDatabase("Database ".concat(U, " doesnt exist")));
              })) : (C.onerror = We(A), N = N.oldVersion > Math.pow(2, 62) ? 0 : N.oldVersion, x = N < 1, i.idbdb = R.result, w && Td(i, C), Sd(i, N / 10, C, A));
            }, A), R.onsuccess = Lt(function() {
              C = null;
              var N, P, K, M, q, Q = i.idbdb = R.result, it = Z(Q.objectStoreNames);
              if (0 < it.length) try {
                var J = Q.transaction((M = it).length === 1 ? M[0] : M, "readonly");
                if (a.autoSchema) P = Q, K = J, (N = i).verno = P.version / 10, K = N._dbSchema = Ho(0, P, K), N._storeNames = Z(P.objectStoreNames, 0), Mo(N, [N._allTables], c(K), K);
                else if (jo(i, i._dbSchema, J), ((q = bs(Ho(0, (q = i).idbdb, J), q._dbSchema)).add.length || q.change.some(function(et) {
                  return et.add.length || et.change.length;
                })) && !w) return console.warn("Dexie SchemaDiff: Schema was extended without increasing the number passed to db.version(). Dexie will add missing parts and increment native version number to workaround this."), Q.close(), g = Q.version + 1, w = !0, O(E());
                Ko(i, J);
              } catch {
              }
              ir.push(i), Q.onversionchange = Lt(function(et) {
                a.vcFired = !0, i.on("versionchange").fire(et);
              }), Q.onclose = Lt(function(et) {
                i.on("close").fire(et);
              }), x && (q = i._deps, J = U, Q = q.indexedDB, q = q.IDBKeyRange, xs(Q) || J === Oo || Es(Q, q).put({ name: J }).catch(It)), O();
            }, A);
          }).catch(function(O) {
            switch (O == null ? void 0 : O.name) {
              case "UnknownError":
                if (0 < a.PR1398_maxLoop) return a.PR1398_maxLoop--, console.warn("Dexie: Workaround for Chrome UnknownError on open()"), E();
                break;
              case "VersionError":
                if (0 < g) return g = 0, E();
            }
            return ct.reject(O);
          });
        }
        var k, B = a.dbReadyResolve, C = null, x = !1;
        return ct.race([d, (typeof navigator > "u" ? ct.resolve() : !navigator.userAgentData && /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) && indexedDB.databases ? new Promise(function(O) {
          function A() {
            return indexedDB.databases().finally(O);
          }
          k = setInterval(A, 100), A();
        }).finally(function() {
          return clearInterval(k);
        }) : Promise.resolve()).then(E)]).then(function() {
          return b(), a.onReadyBeingFired = [], ct.resolve(Ss(function() {
            return i.on.ready.fire(i.vip);
          })).then(function O() {
            if (0 < a.onReadyBeingFired.length) {
              var A = a.onReadyBeingFired.reduce(ts, It);
              return a.onReadyBeingFired = [], ct.resolve(Ss(function() {
                return A(i.vip);
              })).then(O);
            }
          });
        }).finally(function() {
          a.openCanceller === d && (a.onReadyBeingFired = null, a.isBeingOpened = !1);
        }).catch(function(O) {
          a.dbOpenError = O;
          try {
            C && C.abort();
          } catch {
          }
          return d === a.openCanceller && i._close(), Vt(O);
        }).finally(function() {
          a.openComplete = !0, B();
        }).then(function() {
          var O;
          return x && (O = {}, i.tables.forEach(function(A) {
            A.schema.indexes.forEach(function(U) {
              U.name && (O["idb://".concat(i.name, "/").concat(A.name, "/").concat(U.name)] = new ae(-1 / 0, [[[]]]));
            }), O["idb://".concat(i.name, "/").concat(A.name, "/")] = O["idb://".concat(i.name, "/").concat(A.name, "/:dels")] = new ae(-1 / 0, [[[]]]);
          }), xn(Dr).fire(O), Bs(O, !0)), i;
        });
      }
      function _s(i) {
        function a(w) {
          return i.next(w);
        }
        var f = g(a), d = g(function(w) {
          return i.throw(w);
        });
        function g(w) {
          return function(k) {
            var E = w(k), k = E.value;
            return E.done ? k : k && typeof k.then == "function" ? k.then(f, d) : u(k) ? Promise.all(k).then(f, d) : f(k);
          };
        }
        return g(a)();
      }
      function Wo(i, a, f) {
        for (var d = u(i) ? i.slice() : [i], g = 0; g < f; ++g) d.push(a);
        return d;
      }
      var Id = { stack: "dbcore", name: "VirtualIndexMiddleware", level: 1, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var f = i.table(a), d = f.schema, g = {}, w = [];
          function b(x, O, A) {
            var U = Mr(x), R = g[U] = g[U] || [], N = x == null ? 0 : typeof x == "string" ? 1 : x.length, P = 0 < O, P = r(r({}, A), { name: P ? "".concat(U, "(virtual-from:").concat(A.name, ")") : A.name, lowLevelIndex: A, isVirtual: P, keyTail: O, keyLength: N, extractKey: ws(x), unique: !P && A.unique });
            return R.push(P), P.isPrimaryKey || w.push(P), 1 < N && b(N === 2 ? x[0] : x.slice(0, N - 1), O + 1, A), R.sort(function(K, M) {
              return K.keyTail - M.keyTail;
            }), P;
          }
          a = b(d.primaryKey.keyPath, 0, d.primaryKey), g[":id"] = [a];
          for (var E = 0, k = d.indexes; E < k.length; E++) {
            var B = k[E];
            b(B.keyPath, 0, B);
          }
          function C(x) {
            var O, A = x.query.index;
            return A.isVirtual ? r(r({}, x), { query: { index: A.lowLevelIndex, range: (O = x.query.range, A = A.keyTail, { type: O.type === 1 ? 2 : O.type, lower: Wo(O.lower, O.lowerOpen ? i.MAX_KEY : i.MIN_KEY, A), lowerOpen: !0, upper: Wo(O.upper, O.upperOpen ? i.MIN_KEY : i.MAX_KEY, A), upperOpen: !0 }) } }) : x;
          }
          return r(r({}, f), { schema: r(r({}, d), { primaryKey: a, indexes: w, getIndexByKeyPath: function(x) {
            return (x = g[Mr(x)]) && x[0];
          } }), count: function(x) {
            return f.count(C(x));
          }, query: function(x) {
            return f.query(C(x));
          }, openCursor: function(x) {
            var O = x.query.index, A = O.keyTail, U = O.isVirtual, R = O.keyLength;
            return U ? f.openCursor(C(x)).then(function(P) {
              return P && N(P);
            }) : f.openCursor(x);
            function N(P) {
              return Object.create(P, { continue: { value: function(K) {
                K != null ? P.continue(Wo(K, x.reverse ? i.MAX_KEY : i.MIN_KEY, A)) : x.unique ? P.continue(P.key.slice(0, R).concat(x.reverse ? i.MIN_KEY : i.MAX_KEY, A)) : P.continue();
              } }, continuePrimaryKey: { value: function(K, M) {
                P.continuePrimaryKey(Wo(K, i.MAX_KEY, A), M);
              } }, primaryKey: { get: function() {
                return P.primaryKey;
              } }, key: { get: function() {
                var K = P.key;
                return R === 1 ? K[0] : K.slice(0, R);
              } }, value: { get: function() {
                return P.value;
              } } });
            }
          } });
        } });
      } };
      function Ns(i, a, f, d) {
        return f = f || {}, d = d || "", c(i).forEach(function(g) {
          var w, b, E;
          y(a, g) ? (w = i[g], b = a[g], typeof w == "object" && typeof b == "object" && w && b ? (E = j(w)) !== j(b) ? f[d + g] = a[g] : E === "Object" ? Ns(w, b, f, d + g + ".") : w !== b && (f[d + g] = a[g]) : w !== b && (f[d + g] = a[g])) : f[d + g] = void 0;
        }), c(a).forEach(function(g) {
          y(i, g) || (f[d + g] = a[g]);
        }), f;
      }
      function Us(i, a) {
        return a.type === "delete" ? a.keys : a.keys || a.values.map(i.extractKey);
      }
      var Bd = { stack: "dbcore", name: "HooksMiddleware", level: 2, create: function(i) {
        return r(r({}, i), { table: function(a) {
          var f = i.table(a), d = f.schema.primaryKey;
          return r(r({}, f), { mutate: function(g) {
            var w = gt.trans, b = w.table(a).hook, E = b.deleting, k = b.creating, B = b.updating;
            switch (g.type) {
              case "add":
                if (k.fire === It) break;
                return w._promise("readwrite", function() {
                  return C(g);
                }, !0);
              case "put":
                if (k.fire === It && B.fire === It) break;
                return w._promise("readwrite", function() {
                  return C(g);
                }, !0);
              case "delete":
                if (E.fire === It) break;
                return w._promise("readwrite", function() {
                  return C(g);
                }, !0);
              case "deleteRange":
                if (E.fire === It) break;
                return w._promise("readwrite", function() {
                  return function x(O, A, U) {
                    return f.query({ trans: O, values: !1, query: { index: d, range: A }, limit: U }).then(function(R) {
                      var N = R.result;
                      return C({ type: "delete", keys: N, trans: O }).then(function(P) {
                        return 0 < P.numFailures ? Promise.reject(P.failures[0]) : N.length < U ? { failures: [], numFailures: 0, lastResult: void 0 } : x(O, r(r({}, A), { lower: N[N.length - 1], lowerOpen: !0 }), U);
                      });
                    });
                  }(g.trans, g.range, 1e4);
                }, !0);
            }
            return f.mutate(g);
            function C(x) {
              var O, A, U, R = gt.trans, N = x.keys || Us(d, x);
              if (!N) throw new Error("Keys missing");
              return (x = x.type === "add" || x.type === "put" ? r(r({}, x), { keys: N }) : r({}, x)).type !== "delete" && (x.values = o([], x.values)), x.keys && (x.keys = o([], x.keys)), O = f, U = N, ((A = x).type === "add" ? Promise.resolve([]) : O.getMany({ trans: A.trans, keys: U, cache: "immutable" })).then(function(P) {
                var K = N.map(function(M, q) {
                  var Q, it, J, et = P[q], st = { onerror: null, onsuccess: null };
                  return x.type === "delete" ? E.fire.call(st, M, et, R) : x.type === "add" || et === void 0 ? (Q = k.fire.call(st, M, x.values[q], R), M == null && Q != null && (x.keys[q] = M = Q, d.outbound || T(x.values[q], d.keyPath, M))) : (Q = Ns(et, x.values[q]), (it = B.fire.call(st, Q, M, et, R)) && (J = x.values[q], Object.keys(it).forEach(function(ot) {
                    y(J, ot) ? J[ot] = it[ot] : T(J, ot, it[ot]);
                  }))), st;
                });
                return f.mutate(x).then(function(M) {
                  for (var q = M.failures, Q = M.results, it = M.numFailures, M = M.lastResult, J = 0; J < N.length; ++J) {
                    var et = (Q || N)[J], st = K[J];
                    et == null ? st.onerror && st.onerror(q[J]) : st.onsuccess && st.onsuccess(x.type === "put" && P[J] ? x.values[J] : et);
                  }
                  return { failures: q, results: Q, numFailures: it, lastResult: M };
                }).catch(function(M) {
                  return K.forEach(function(q) {
                    return q.onerror && q.onerror(M);
                  }), Promise.reject(M);
                });
              });
            }
          } });
        } });
      } };
      function Jc(i, a, f) {
        try {
          if (!a || a.keys.length < i.length) return null;
          for (var d = [], g = 0, w = 0; g < a.keys.length && w < i.length; ++g) At(a.keys[g], i[w]) === 0 && (d.push(f ? G(a.values[g]) : a.values[g]), ++w);
          return d.length === i.length ? d : null;
        } catch {
          return null;
        }
      }
      var _d = { stack: "dbcore", level: -1, create: function(i) {
        return { table: function(a) {
          var f = i.table(a);
          return r(r({}, f), { getMany: function(d) {
            if (!d.cache) return f.getMany(d);
            var g = Jc(d.keys, d.trans._cache, d.cache === "clone");
            return g ? ct.resolve(g) : f.getMany(d).then(function(w) {
              return d.trans._cache = { keys: d.keys, values: d.cache === "clone" ? G(w) : w }, w;
            });
          }, mutate: function(d) {
            return d.type !== "add" && (d.trans._cache = null), f.mutate(d);
          } });
        } };
      } };
      function tu(i, a) {
        return i.trans.mode === "readonly" && !!i.subscr && !i.trans.explicit && i.trans.db._options.cache !== "disabled" && !a.schema.primaryKey.outbound;
      }
      function eu(i, a) {
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
      var Nd = { stack: "dbcore", level: 0, name: "Observability", create: function(i) {
        var a = i.schema.name, f = new ae(i.MIN_KEY, i.MAX_KEY);
        return r(r({}, i), { transaction: function(d, g, w) {
          if (gt.subscr && g !== "readonly") throw new lt.ReadOnly("Readwrite transaction in liveQuery context. Querier source: ".concat(gt.querier));
          return i.transaction(d, g, w);
        }, table: function(d) {
          var g = i.table(d), w = g.schema, b = w.primaryKey, x = w.indexes, E = b.extractKey, k = b.outbound, B = b.autoIncrement && x.filter(function(A) {
            return A.compound && A.keyPath.includes(b.keyPath);
          }), C = r(r({}, g), { mutate: function(A) {
            function U(ot) {
              return ot = "idb://".concat(a, "/").concat(d, "/").concat(ot), M[ot] || (M[ot] = new ae());
            }
            var R, N, P, K = A.trans, M = A.mutatedParts || (A.mutatedParts = {}), q = U(""), Q = U(":dels"), it = A.type, st = A.type === "deleteRange" ? [A.range] : A.type === "delete" ? [A.keys] : A.values.length < 50 ? [Us(b, A).filter(function(ot) {
              return ot;
            }), A.values] : [], J = st[0], et = st[1], st = A.trans._cache;
            return u(J) ? (q.addKeys(J), (st = it === "delete" || J.length === et.length ? Jc(J, st) : null) || Q.addKeys(J), (st || et) && (R = U, N = st, P = et, w.indexes.forEach(function(ot) {
              var pt = R(ot.name || "");
              function vt(St) {
                return St != null ? ot.extractKey(St) : null;
              }
              function xt(St) {
                return ot.multiEntry && u(St) ? St.forEach(function(_e) {
                  return pt.addKey(_e);
                }) : pt.addKey(St);
              }
              (N || P).forEach(function(St, ce) {
                var bt = N && vt(N[ce]), ce = P && vt(P[ce]);
                At(bt, ce) !== 0 && (bt != null && xt(bt), ce != null && xt(ce));
              });
            }))) : J ? (et = { from: (et = J.lower) !== null && et !== void 0 ? et : i.MIN_KEY, to: (et = J.upper) !== null && et !== void 0 ? et : i.MAX_KEY }, Q.add(et), q.add(et)) : (q.add(f), Q.add(f), w.indexes.forEach(function(ot) {
              return U(ot.name).add(f);
            })), g.mutate(A).then(function(ot) {
              return !J || A.type !== "add" && A.type !== "put" || (q.addKeys(ot.results), B && B.forEach(function(pt) {
                for (var vt = A.values.map(function(bt) {
                  return pt.extractKey(bt);
                }), xt = pt.keyPath.findIndex(function(bt) {
                  return bt === b.keyPath;
                }), St = 0, _e = ot.results.length; St < _e; ++St) vt[St][xt] = ot.results[St];
                U(pt.name).addKeys(vt);
              })), K.mutatedParts = zo(K.mutatedParts || {}, M), ot;
            });
          } }), x = function(U) {
            var R = U.query, U = R.index, R = R.range;
            return [U, new ae((U = R.lower) !== null && U !== void 0 ? U : i.MIN_KEY, (R = R.upper) !== null && R !== void 0 ? R : i.MAX_KEY)];
          }, O = { get: function(A) {
            return [b, new ae(A.key)];
          }, getMany: function(A) {
            return [b, new ae().addKeys(A.keys)];
          }, count: x, query: x, openCursor: x };
          return c(O).forEach(function(A) {
            C[A] = function(U) {
              var R = gt.subscr, N = !!R, P = tu(gt, g) && eu(A, U) ? U.obsSet = {} : R;
              if (N) {
                var K = function(et) {
                  return et = "idb://".concat(a, "/").concat(d, "/").concat(et), P[et] || (P[et] = new ae());
                }, M = K(""), q = K(":dels"), R = O[A](U), N = R[0], R = R[1];
                if ((A === "query" && N.isPrimaryKey && !U.values ? q : K(N.name || "")).add(R), !N.isPrimaryKey) {
                  if (A !== "count") {
                    var Q = A === "query" && k && U.values && g.query(r(r({}, U), { values: !1 }));
                    return g[A].apply(this, arguments).then(function(et) {
                      if (A === "query") {
                        if (k && U.values) return Q.then(function(vt) {
                          return vt = vt.result, M.addKeys(vt), et;
                        });
                        var st = U.values ? et.result.map(E) : et.result;
                        (U.values ? M : q).addKeys(st);
                      } else if (A === "openCursor") {
                        var ot = et, pt = U.values;
                        return ot && Object.create(ot, { key: { get: function() {
                          return q.addKey(ot.primaryKey), ot.key;
                        } }, primaryKey: { get: function() {
                          var vt = ot.primaryKey;
                          return q.addKey(vt), vt;
                        } }, value: { get: function() {
                          return pt && M.addKey(ot.primaryKey), ot.value;
                        } } });
                      }
                      return et;
                    });
                  }
                  q.add(f);
                }
              }
              return g[A].apply(this, arguments);
            };
          }), C;
        } });
      } };
      function nu(i, a, f) {
        if (f.numFailures === 0) return a;
        if (a.type === "deleteRange") return null;
        var d = a.keys ? a.keys.length : "values" in a && a.values ? a.values.length : 1;
        return f.numFailures === d ? null : (a = r({}, a), u(a.keys) && (a.keys = a.keys.filter(function(g, w) {
          return !(w in f.failures);
        })), "values" in a && u(a.values) && (a.values = a.values.filter(function(g, w) {
          return !(w in f.failures);
        })), a);
      }
      function Cs(i, a) {
        return f = i, ((d = a).lower === void 0 || (d.lowerOpen ? 0 < At(f, d.lower) : 0 <= At(f, d.lower))) && (i = i, (a = a).upper === void 0 || (a.upperOpen ? At(i, a.upper) < 0 : At(i, a.upper) <= 0));
        var f, d;
      }
      function ru(i, a, O, d, g, w) {
        if (!O || O.length === 0) return i;
        var b = a.query.index, E = b.multiEntry, k = a.query.range, B = d.schema.primaryKey.extractKey, C = b.extractKey, x = (b.lowLevelIndex || b).extractKey, O = O.reduce(function(A, U) {
          var R = A, N = [];
          if (U.type === "add" || U.type === "put") for (var P = new ae(), K = U.values.length - 1; 0 <= K; --K) {
            var M, q = U.values[K], Q = B(q);
            P.hasKey(Q) || (M = C(q), (E && u(M) ? M.some(function(ot) {
              return Cs(ot, k);
            }) : Cs(M, k)) && (P.addKey(Q), N.push(q)));
          }
          switch (U.type) {
            case "add":
              var it = new ae().addKeys(a.values ? A.map(function(pt) {
                return B(pt);
              }) : A), R = A.concat(a.values ? N.filter(function(pt) {
                return pt = B(pt), !it.hasKey(pt) && (it.addKey(pt), !0);
              }) : N.map(function(pt) {
                return B(pt);
              }).filter(function(pt) {
                return !it.hasKey(pt) && (it.addKey(pt), !0);
              }));
              break;
            case "put":
              var J = new ae().addKeys(U.values.map(function(pt) {
                return B(pt);
              }));
              R = A.filter(function(pt) {
                return !J.hasKey(a.values ? B(pt) : pt);
              }).concat(a.values ? N : N.map(function(pt) {
                return B(pt);
              }));
              break;
            case "delete":
              var et = new ae().addKeys(U.keys);
              R = A.filter(function(pt) {
                return !et.hasKey(a.values ? B(pt) : pt);
              });
              break;
            case "deleteRange":
              var st = U.range;
              R = A.filter(function(pt) {
                return !Cs(B(pt), st);
              });
          }
          return R;
        }, i);
        return O === i ? i : (O.sort(function(A, U) {
          return At(x(A), x(U)) || At(B(A), B(U));
        }), a.limit && a.limit < 1 / 0 && (O.length > a.limit ? O.length = a.limit : i.length === a.limit && O.length < a.limit && (g.dirty = !0)), w ? Object.freeze(O) : O);
      }
      function ou(i, a) {
        return At(i.lower, a.lower) === 0 && At(i.upper, a.upper) === 0 && !!i.lowerOpen == !!a.lowerOpen && !!i.upperOpen == !!a.upperOpen;
      }
      function Ud(i, a) {
        return function(f, d, g, w) {
          if (f === void 0) return d !== void 0 ? -1 : 0;
          if (d === void 0) return 1;
          if ((d = At(f, d)) === 0) {
            if (g && w) return 0;
            if (g) return 1;
            if (w) return -1;
          }
          return d;
        }(i.lower, a.lower, i.lowerOpen, a.lowerOpen) <= 0 && 0 <= function(f, d, g, w) {
          if (f === void 0) return d !== void 0 ? 1 : 0;
          if (d === void 0) return -1;
          if ((d = At(f, d)) === 0) {
            if (g && w) return 0;
            if (g) return -1;
            if (w) return 1;
          }
          return d;
        }(i.upper, a.upper, i.upperOpen, a.upperOpen);
      }
      function Cd(i, a, f, d) {
        i.subscribers.add(f), d.addEventListener("abort", function() {
          var g, w;
          i.subscribers.delete(f), i.subscribers.size === 0 && (g = i, w = a, setTimeout(function() {
            g.subscribers.size === 0 && tt(w, g);
          }, 3e3));
        });
      }
      var Rd = { stack: "dbcore", level: 0, name: "Cache", create: function(i) {
        var a = i.schema.name;
        return r(r({}, i), { transaction: function(f, d, g) {
          var w, b, E = i.transaction(f, d, g);
          return d === "readwrite" && (b = (w = new AbortController()).signal, g = function(k) {
            return function() {
              if (w.abort(), d === "readwrite") {
                for (var B = /* @__PURE__ */ new Set(), C = 0, x = f; C < x.length; C++) {
                  var O = x[C], A = Vn["idb://".concat(a, "/").concat(O)];
                  if (A) {
                    var U = i.table(O), R = A.optimisticOps.filter(function(pt) {
                      return pt.trans === E;
                    });
                    if (E._explicit && k && E.mutatedParts) for (var N = 0, P = Object.values(A.queries.query); N < P.length; N++) for (var K = 0, M = (it = P[N]).slice(); K < M.length; K++) ks((J = M[K]).obsSet, E.mutatedParts) && (tt(it, J), J.subscribers.forEach(function(pt) {
                      return B.add(pt);
                    }));
                    else if (0 < R.length) {
                      A.optimisticOps = A.optimisticOps.filter(function(pt) {
                        return pt.trans !== E;
                      });
                      for (var q = 0, Q = Object.values(A.queries.query); q < Q.length; q++) for (var it, J, et, st = 0, ot = (it = Q[q]).slice(); st < ot.length; st++) (J = ot[st]).res != null && E.mutatedParts && (k && !J.dirty ? (et = Object.isFrozen(J.res), et = ru(J.res, J.req, R, U, J, et), J.dirty ? (tt(it, J), J.subscribers.forEach(function(pt) {
                        return B.add(pt);
                      })) : et !== J.res && (J.res = et, J.promise = ct.resolve({ result: et }))) : (J.dirty && tt(it, J), J.subscribers.forEach(function(pt) {
                        return B.add(pt);
                      })));
                    }
                  }
                }
                B.forEach(function(pt) {
                  return pt();
                });
              }
            };
          }, E.addEventListener("abort", g(!1), { signal: b }), E.addEventListener("error", g(!1), { signal: b }), E.addEventListener("complete", g(!0), { signal: b })), E;
        }, table: function(f) {
          var d = i.table(f), g = d.schema.primaryKey;
          return r(r({}, d), { mutate: function(w) {
            var b = gt.trans;
            if (g.outbound || b.db._options.cache === "disabled" || b.explicit || b.idbtrans.mode !== "readwrite") return d.mutate(w);
            var E = Vn["idb://".concat(a, "/").concat(f)];
            return E ? (b = d.mutate(w), w.type !== "add" && w.type !== "put" || !(50 <= w.values.length || Us(g, w).some(function(k) {
              return k == null;
            })) ? (E.optimisticOps.push(w), w.mutatedParts && Go(w.mutatedParts), b.then(function(k) {
              0 < k.numFailures && (tt(E.optimisticOps, w), (k = nu(0, w, k)) && E.optimisticOps.push(k), w.mutatedParts && Go(w.mutatedParts));
            }), b.catch(function() {
              tt(E.optimisticOps, w), w.mutatedParts && Go(w.mutatedParts);
            })) : b.then(function(k) {
              var B = nu(0, r(r({}, w), { values: w.values.map(function(C, x) {
                var O;
                return k.failures[x] ? C : (C = (O = g.keyPath) !== null && O !== void 0 && O.includes(".") ? G(C) : r({}, C), T(C, g.keyPath, k.results[x]), C);
              }) }), k);
              E.optimisticOps.push(B), queueMicrotask(function() {
                return w.mutatedParts && Go(w.mutatedParts);
              });
            }), b) : d.mutate(w);
          }, query: function(w) {
            if (!tu(gt, d) || !eu("query", w)) return d.query(w);
            var b = ((B = gt.trans) === null || B === void 0 ? void 0 : B.db._options.cache) === "immutable", x = gt, E = x.requery, k = x.signal, B = function(U, R, N, P) {
              var K = Vn["idb://".concat(U, "/").concat(R)];
              if (!K) return [];
              if (!(R = K.queries[N])) return [null, !1, K, null];
              var M = R[(P.query ? P.query.index.name : null) || ""];
              if (!M) return [null, !1, K, null];
              switch (N) {
                case "query":
                  var q = M.find(function(Q) {
                    return Q.req.limit === P.limit && Q.req.values === P.values && ou(Q.req.query.range, P.query.range);
                  });
                  return q ? [q, !0, K, M] : [M.find(function(Q) {
                    return ("limit" in Q.req ? Q.req.limit : 1 / 0) >= P.limit && (!P.values || Q.req.values) && Ud(Q.req.query.range, P.query.range);
                  }), !1, K, M];
                case "count":
                  return q = M.find(function(Q) {
                    return ou(Q.req.query.range, P.query.range);
                  }), [q, !!q, K, M];
              }
            }(a, f, "query", w), C = B[0], x = B[1], O = B[2], A = B[3];
            return C && x ? C.obsSet = w.obsSet : (x = d.query(w).then(function(U) {
              var R = U.result;
              if (C && (C.res = R), b) {
                for (var N = 0, P = R.length; N < P; ++N) Object.freeze(R[N]);
                Object.freeze(R);
              } else U.result = G(R);
              return U;
            }).catch(function(U) {
              return A && C && tt(A, C), Promise.reject(U);
            }), C = { obsSet: w.obsSet, promise: x, subscribers: /* @__PURE__ */ new Set(), type: "query", req: w, dirty: !1 }, A ? A.push(C) : (A = [C], (O = O || (Vn["idb://".concat(a, "/").concat(f)] = { queries: { query: {}, count: {} }, objs: /* @__PURE__ */ new Map(), optimisticOps: [], unsignaledParts: {} })).queries.query[w.query.index.name || ""] = A)), Cd(C, A, E, k), C.promise.then(function(U) {
              return { result: ru(U.result, w, O == null ? void 0 : O.optimisticOps, d, C, b) };
            });
          } });
        } });
      } };
      function Yo(i, a) {
        return new Proxy(i, { get: function(f, d, g) {
          return d === "db" ? a : Reflect.get(f, d, g);
        } });
      }
      var rn = (Ht.prototype.version = function(i) {
        if (isNaN(i) || i < 0.1) throw new lt.Type("Given version is not a positive number");
        if (i = Math.round(10 * i) / 10, this.idbdb || this._state.isBeingOpened) throw new lt.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, i);
        var a = this._versions, f = a.filter(function(d) {
          return d._cfg.version === i;
        })[0];
        return f || (f = new this.Version(i), a.push(f), a.sort(xd), f.stores({}), this._state.autoSchema = !1, f);
      }, Ht.prototype._whenReady = function(i) {
        var a = this;
        return this.idbdb && (this._state.openComplete || gt.letThrough || this._vip) ? i() : new ct(function(f, d) {
          if (a._state.openComplete) return d(new lt.DatabaseClosed(a._state.dbOpenError));
          if (!a._state.isBeingOpened) {
            if (!a._state.autoOpen) return void d(new lt.DatabaseClosed());
            a.open().catch(It);
          }
          a._state.dbReadyPromise.then(f, d);
        }).then(i);
      }, Ht.prototype.use = function(i) {
        var a = i.stack, f = i.create, d = i.level, g = i.name;
        return g && this.unuse({ stack: a, name: g }), i = this._middlewares[a] || (this._middlewares[a] = []), i.push({ stack: a, create: f, level: d ?? 10, name: g }), i.sort(function(w, b) {
          return w.level - b.level;
        }), this;
      }, Ht.prototype.unuse = function(i) {
        var a = i.stack, f = i.name, d = i.create;
        return a && this._middlewares[a] && (this._middlewares[a] = this._middlewares[a].filter(function(g) {
          return d ? g.create !== d : !!f && g.name !== f;
        })), this;
      }, Ht.prototype.open = function() {
        var i = this;
        return Dn(wn, function() {
          return Ad(i);
        });
      }, Ht.prototype._close = function() {
        var i = this._state, a = ir.indexOf(this);
        if (0 <= a && ir.splice(a, 1), this.idbdb) {
          try {
            this.idbdb.close();
          } catch {
          }
          this.idbdb = null;
        }
        i.isBeingOpened || (i.dbReadyPromise = new ct(function(f) {
          i.dbReadyResolve = f;
        }), i.openCanceller = new ct(function(f, d) {
          i.cancelOpen = d;
        }));
      }, Ht.prototype.close = function(f) {
        var a = (f === void 0 ? { disableAutoOpen: !0 } : f).disableAutoOpen, f = this._state;
        a ? (f.isBeingOpened && f.cancelOpen(new lt.DatabaseClosed()), this._close(), f.autoOpen = !1, f.dbOpenError = new lt.DatabaseClosed()) : (this._close(), f.autoOpen = this._options.autoOpen || f.isBeingOpened, f.openComplete = !1, f.dbOpenError = null);
      }, Ht.prototype.delete = function(i) {
        var a = this;
        i === void 0 && (i = { disableAutoOpen: !0 });
        var f = 0 < arguments.length && typeof arguments[0] != "object", d = this._state;
        return new ct(function(g, w) {
          function b() {
            a.close(i);
            var E = a._deps.indexedDB.deleteDatabase(a.name);
            E.onsuccess = Lt(function() {
              var k, B, C;
              k = a._deps, B = a.name, C = k.indexedDB, k = k.IDBKeyRange, xs(C) || B === Oo || Es(C, k).delete(B).catch(It), g();
            }), E.onerror = We(w), E.onblocked = a._fireOnBlocked;
          }
          if (f) throw new lt.InvalidArgument("Invalid closeOptions argument to db.delete()");
          d.isBeingOpened ? d.dbReadyPromise.then(b) : b();
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
        var i = (function(a, f, d) {
          var g = arguments.length;
          if (g < 2) throw new lt.InvalidArgument("Too few arguments");
          for (var w = new Array(g - 1); --g; ) w[g - 1] = arguments[g];
          return d = w.pop(), [a, X(w), d];
        }).apply(this, arguments);
        return this._transaction.apply(this, i);
      }, Ht.prototype._transaction = function(i, a, f) {
        var d = this, g = gt.trans;
        g && g.db === this && i.indexOf("!") === -1 || (g = null);
        var w, b, E = i.indexOf("?") !== -1;
        i = i.replace("!", "").replace("?", "");
        try {
          if (b = a.map(function(B) {
            if (B = B instanceof d.Table ? B.name : B, typeof B != "string") throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
            return B;
          }), i == "r" || i === us) w = us;
          else {
            if (i != "rw" && i != fs) throw new lt.InvalidArgument("Invalid transaction mode: " + i);
            w = fs;
          }
          if (g) {
            if (g.mode === us && w === fs) {
              if (!E) throw new lt.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
              g = null;
            }
            g && b.forEach(function(B) {
              if (g && g.storeNames.indexOf(B) === -1) {
                if (!E) throw new lt.SubTransaction("Table " + B + " not included in parent transaction.");
                g = null;
              }
            }), E && g && !g.active && (g = null);
          }
        } catch (B) {
          return g ? g._promise(null, function(C, x) {
            x(B);
          }) : Vt(B);
        }
        var k = (function B(C, x, O, A, U) {
          return ct.resolve().then(function() {
            var R = gt.transless || gt, N = C._createTransaction(x, O, C._dbSchema, A);
            if (N.explicit = !0, R = { trans: N, transless: R }, A) N.idbtrans = A.idbtrans;
            else try {
              N.create(), N.idbtrans._explicit = !0, C._state.PR1398_maxLoop = 3;
            } catch (M) {
              return M.name === Xt.InvalidState && C.isOpen() && 0 < --C._state.PR1398_maxLoop ? (console.warn("Dexie: Need to reopen db"), C.close({ disableAutoOpen: !1 }), C.open().then(function() {
                return B(C, x, O, null, U);
              })) : Vt(M);
            }
            var P, K = ft(U);
            return K && or(), R = ct.follow(function() {
              var M;
              (P = U.call(N, N)) && (K ? (M = bn.bind(null, null), P.then(M, M)) : typeof P.next == "function" && typeof P.throw == "function" && (P = _s(P)));
            }, R), (P && typeof P.then == "function" ? ct.resolve(P).then(function(M) {
              return N.active ? M : Vt(new lt.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"));
            }) : R.then(function() {
              return P;
            })).then(function(M) {
              return A && N._resolve(), N._completion.then(function() {
                return M;
              });
            }).catch(function(M) {
              return N._reject(M), Vt(M);
            });
          });
        }).bind(null, this, w, b, g, f);
        return g ? g._promise(w, k, "lock") : gt.trans ? Dn(gt.transless, function() {
          return d._whenReady(k);
        }) : this._whenReady(k);
      }, Ht.prototype.table = function(i) {
        if (!y(this._allTables, i)) throw new lt.InvalidTable("Table ".concat(i, " does not exist"));
        return this._allTables[i];
      }, Ht);
      function Ht(i, a) {
        var f = this;
        this._middlewares = {}, this.verno = 0;
        var d = Ht.dependencies;
        this._options = a = r({ addons: Ht.addons, autoOpen: !0, indexedDB: d.indexedDB, IDBKeyRange: d.IDBKeyRange, cache: "cloned" }, a), this._deps = { indexedDB: a.indexedDB, IDBKeyRange: a.IDBKeyRange }, d = a.addons, this._dbSchema = {}, this._versions = [], this._storeNames = [], this._allTables = {}, this.idbdb = null, this._novip = this;
        var g, w, b, E, k, B = { dbOpenError: null, isBeingOpened: !1, onReadyBeingFired: null, openComplete: !1, dbReadyResolve: It, dbReadyPromise: null, cancelOpen: It, openCanceller: null, autoSchema: !0, PR1398_maxLoop: 3, autoOpen: a.autoOpen };
        B.dbReadyPromise = new ct(function(x) {
          B.dbReadyResolve = x;
        }), B.openCanceller = new ct(function(x, O) {
          B.cancelOpen = O;
        }), this._state = B, this.name = i, this.on = Or(this, "populate", "blocked", "versionchange", "close", { ready: [ts, It] }), this.on.ready.subscribe = W(this.on.ready.subscribe, function(x) {
          return function(O, A) {
            Ht.vip(function() {
              var U, R = f._state;
              R.openComplete ? (R.dbOpenError || ct.resolve().then(O), A && x(O)) : R.onReadyBeingFired ? (R.onReadyBeingFired.push(O), A && x(O)) : (x(O), U = f, A || x(function N() {
                U.on.ready.unsubscribe(O), U.on.ready.unsubscribe(N);
              }));
            });
          };
        }), this.Collection = (g = this, $r(gd.prototype, function(P, N) {
          this.db = g;
          var A = $c, U = null;
          if (N) try {
            A = N();
          } catch (K) {
            U = K;
          }
          var R = P._ctx, N = R.table, P = N.hook.reading.fire;
          this._ctx = { table: N, index: R.index, isPrimKey: !R.index || N.schema.primKey.keyPath && R.index === N.schema.primKey.name, range: A, keysOnly: !1, dir: "next", unique: "", algorithm: null, filter: null, replayFilter: null, justLimit: !0, isMatch: null, offset: 0, limit: 1 / 0, error: U, or: R.or, valueMapper: P !== Ae ? P : null };
        })), this.Table = (w = this, $r(Kc.prototype, function(x, O, A) {
          this.db = w, this._tx = A, this.name = x, this.schema = O, this.hook = w._allTables[x] ? w._allTables[x].hook : Or(null, { creating: [yn, It], reading: [Rn, Ae], updating: [cd, It], deleting: [ad, It] });
        })), this.Transaction = (b = this, $r(md.prototype, function(x, O, A, U, R) {
          var N = this;
          this.db = b, this.mode = x, this.storeNames = O, this.schema = A, this.chromeTransactionDurability = U, this.idbtrans = null, this.on = Or(this, "complete", "error", "abort"), this.parent = R || null, this.active = !0, this._reculock = 0, this._blockedFuncs = [], this._resolve = null, this._reject = null, this._waitingFor = null, this._waitingQueue = null, this._spinCount = 0, this._completion = new ct(function(P, K) {
            N._resolve = P, N._reject = K;
          }), this._completion.then(function() {
            N.active = !1, N.on.complete.fire();
          }, function(P) {
            var K = N.active;
            return N.active = !1, N.on.error.fire(P), N.parent ? N.parent._reject(P) : K && N.idbtrans && N.idbtrans.abort(), Vt(P);
          });
        })), this.Version = (E = this, $r(kd.prototype, function(x) {
          this.db = E, this._cfg = { version: x, storesSource: null, dbschema: {}, tables: {}, contentUpgrade: null };
        })), this.WhereClause = (k = this, $r(Fc.prototype, function(x, O, A) {
          if (this.db = k, this._ctx = { table: x, index: O === ":id" ? null : O, or: A }, this._cmp = this._ascending = At, this._descending = function(U, R) {
            return At(R, U);
          }, this._max = function(U, R) {
            return 0 < At(U, R) ? U : R;
          }, this._min = function(U, R) {
            return At(U, R) < 0 ? U : R;
          }, this._IDBKeyRange = k._deps.IDBKeyRange, !this._IDBKeyRange) throw new lt.MissingAPI();
        })), this.on("versionchange", function(x) {
          0 < x.newVersion ? console.warn("Another connection wants to upgrade database '".concat(f.name, "'. Closing db now to resume the upgrade.")) : console.warn("Another connection wants to delete database '".concat(f.name, "'. Closing db now to resume the delete request.")), f.close({ disableAutoOpen: !1 });
        }), this.on("blocked", function(x) {
          !x.newVersion || x.newVersion < x.oldVersion ? console.warn("Dexie.delete('".concat(f.name, "') was blocked")) : console.warn("Upgrade '".concat(f.name, "' blocked by other connection holding version ").concat(x.oldVersion / 10));
        }), this._maxKey = Kr(a.IDBKeyRange), this._createTransaction = function(x, O, A, U) {
          return new f.Transaction(x, O, A, f._options.chromeTransactionDurability, U);
        }, this._fireOnBlocked = function(x) {
          f.on("blocked").fire(x), ir.filter(function(O) {
            return O.name === f.name && O !== f && !O._state.vcFired;
          }).map(function(O) {
            return O.on("versionchange").fire(x);
          });
        }, this.use(_d), this.use(Rd), this.use(Nd), this.use(Id), this.use(Bd);
        var C = new Proxy(this, { get: function(x, O, A) {
          if (O === "_vip") return !0;
          if (O === "table") return function(R) {
            return Yo(f.table(R), C);
          };
          var U = Reflect.get(x, O, A);
          return U instanceof Kc ? Yo(U, C) : O === "tables" ? U.map(function(R) {
            return Yo(R, C);
          }) : O === "_createTransaction" ? function() {
            return Yo(U.apply(this, arguments), C);
          } : U;
        } });
        this.vip = C, d.forEach(function(x) {
          return x(f);
        });
      }
      var Zo, Ue = typeof Symbol < "u" && "observable" in Symbol ? Symbol.observable : "@@observable", Od = (Rs.prototype.subscribe = function(i, a, f) {
        return this._subscribe(i && typeof i != "function" ? i : { next: i, error: a, complete: f });
      }, Rs.prototype[Ue] = function() {
        return this;
      }, Rs);
      function Rs(i) {
        this._subscribe = i;
      }
      try {
        Zo = { indexedDB: s.indexedDB || s.mozIndexedDB || s.webkitIndexedDB || s.msIndexedDB, IDBKeyRange: s.IDBKeyRange || s.webkitIDBKeyRange };
      } catch {
        Zo = { indexedDB: null, IDBKeyRange: null };
      }
      function iu(i) {
        var a, f = !1, d = new Od(function(g) {
          var w = ft(i), b, E = !1, k = {}, B = {}, C = { get closed() {
            return E;
          }, unsubscribe: function() {
            E || (E = !0, b && b.abort(), x && xn.storagemutated.unsubscribe(A));
          } };
          g.start && g.start(C);
          var x = !1, O = function() {
            return cs(U);
          }, A = function(R) {
            zo(k, R), ks(B, k) && O();
          }, U = function() {
            var R, N, P;
            !E && Zo.indexedDB && (k = {}, R = {}, b && b.abort(), b = new AbortController(), P = function(K) {
              var M = nr();
              try {
                w && or();
                var q = mn(i, K);
                return q = w ? q.finally(bn) : q;
              } finally {
                M && rr();
              }
            }(N = { subscr: R, signal: b.signal, requery: O, querier: i, trans: null }), Promise.resolve(P).then(function(K) {
              f = !0, a = K, E || N.signal.aborted || (k = {}, function(M) {
                for (var q in M) if (y(M, q)) return;
                return 1;
              }(B = R) || x || (xn(Dr, A), x = !0), cs(function() {
                return !E && g.next && g.next(K);
              }));
            }, function(K) {
              f = !1, ["DatabaseClosedError", "AbortError"].includes(K == null ? void 0 : K.name) || E || cs(function() {
                E || g.error && g.error(K);
              });
            }));
          };
          return setTimeout(O, 0), C;
        });
        return d.hasValue = function() {
          return f;
        }, d.getValue = function() {
          return a;
        }, d;
      }
      var Hn = rn;
      function Os(i) {
        var a = Sn;
        try {
          Sn = !0, xn.storagemutated.fire(i), Bs(i, !0);
        } finally {
          Sn = a;
        }
      }
      m(Hn, r(r({}, he), { delete: function(i) {
        return new Hn(i, { addons: [] }).delete();
      }, exists: function(i) {
        return new Hn(i, { addons: [] }).open().then(function(a) {
          return a.close(), !0;
        }).catch("NoSuchDatabaseError", function() {
          return !1;
        });
      }, getDatabaseNames: function(i) {
        try {
          return a = Hn.dependencies, f = a.indexedDB, a = a.IDBKeyRange, (xs(f) ? Promise.resolve(f.databases()).then(function(d) {
            return d.map(function(g) {
              return g.name;
            }).filter(function(g) {
              return g !== Oo;
            });
          }) : Es(f, a).toCollection().primaryKeys()).then(i);
        } catch {
          return Vt(new lt.MissingAPI());
        }
        var a, f;
      }, defineClass: function() {
        return function(i) {
          l(this, i);
        };
      }, ignoreTransaction: function(i) {
        return gt.trans ? Dn(gt.transless, i) : i();
      }, vip: Ss, async: function(i) {
        return function() {
          try {
            var a = _s(i.apply(this, arguments));
            return a && typeof a.then == "function" ? a : ct.resolve(a);
          } catch (f) {
            return Vt(f);
          }
        };
      }, spawn: function(i, a, f) {
        try {
          var d = _s(i.apply(f, a || []));
          return d && typeof d.then == "function" ? d : ct.resolve(d);
        } catch (g) {
          return Vt(g);
        }
      }, currentTransaction: { get: function() {
        return gt.trans || null;
      } }, waitFor: function(i, a) {
        return a = ct.resolve(typeof i == "function" ? Hn.ignoreTransaction(i) : i).timeout(a || 6e4), gt.trans ? gt.trans.waitFor(a) : a;
      }, Promise: ct, debug: { get: function() {
        return Ge;
      }, set: function(i) {
        Bc(i);
      } }, derive: _, extend: l, props: m, override: W, Events: Or, on: xn, liveQuery: iu, extendObservabilitySet: zo, getByKeyPath: rt, setByKeyPath: T, delByKeyPath: function(i, a) {
        typeof a == "string" ? T(i, a, void 0) : "length" in a && [].map.call(a, function(f) {
          T(i, f, void 0);
        });
      }, shallowClone: ut, deepClone: G, getObjectDiff: Ns, cmp: At, asap: $, minKey: -1 / 0, addons: [], connections: ir, errnames: Xt, dependencies: Zo, cache: Vn, semVer: "4.0.11", version: "4.0.11".split(".").map(function(i) {
        return parseInt(i);
      }).reduce(function(i, a, f) {
        return i + a / Math.pow(10, 2 * f);
      }) })), Hn.maxKey = Kr(Hn.dependencies.IDBKeyRange), typeof dispatchEvent < "u" && typeof addEventListener < "u" && (xn(Dr, function(i) {
        Sn || (i = new CustomEvent(ps, { detail: i }), Sn = !0, dispatchEvent(i), Sn = !1);
      }), addEventListener(ps, function(i) {
        i = i.detail, Sn || Os(i);
      }));
      var cr, Sn = !1, su = function() {
      };
      return typeof BroadcastChannel < "u" && ((su = function() {
        (cr = new BroadcastChannel(ps)).onmessage = function(i) {
          return i.data && Os(i.data);
        };
      })(), typeof cr.unref == "function" && cr.unref(), xn(Dr, function(i) {
        Sn || cr.postMessage(i);
      })), typeof addEventListener < "u" && (addEventListener("pagehide", function(i) {
        if (!rn.disableBfCache && i.persisted) {
          Ge && console.debug("Dexie: handling persisted pagehide"), cr != null && cr.close();
          for (var a = 0, f = ir; a < f.length; a++) f[a].close({ disableAutoOpen: !1 });
        }
      }), addEventListener("pageshow", function(i) {
        !rn.disableBfCache && i.persisted && (Ge && console.debug("Dexie: handling persisted pageshow"), su(), Os({ all: new ae(-1 / 0, [[]]) }));
      })), ct.rejectionMapper = function(i, a) {
        return !i || i instanceof kt || i instanceof TypeError || i instanceof SyntaxError || !i.name || !ke[i.name] ? i : (a = new ke[i.name](a || i.message, i), "stack" in i && S(a, "stack", { get: function() {
          return this.inner.stack;
        } }), a);
      }, Bc(Ge), r(rn, Object.freeze({ __proto__: null, Dexie: rn, liveQuery: iu, Entity: Pc, cmp: At, PropModification: Pr, replacePrefix: function(i, a) {
        return new Pr({ replacePrefix: [i, a] });
      }, add: function(i) {
        return new Pr({ add: i });
      }, remove: function(i) {
        return new Pr({ remove: i });
      }, default: rn, RangeSet: ae, mergeRanges: Hr, rangesOverlap: Yc }), { default: rn }), rn;
    });
  }(hi)), hi.exports;
}
var Hy = Vy();
const Da = /* @__PURE__ */ Bg(Hy), wf = Symbol.for("Dexie"), Mi = globalThis[wf] || (globalThis[wf] = Da);
if (Da.semVer !== Mi.semVer)
  throw new Error(`Two different versions of Dexie loaded in the same app: ${Da.semVer} and ${Mi.semVer}`);
const {
  liveQuery: zy,
  mergeRanges: Gy,
  rangesOverlap: Wy,
  RangeSet: Yy,
  cmp: Zy,
  Entity: Xy,
  PropModification: Qy,
  replacePrefix: Jy,
  add: tw,
  remove: ew
} = Mi, cn = new Mi("arkade", { allowEmptyDB: !0 });
cn.version(1).stores({
  vtxos: "[txid+vout], virtualStatus.state, spentBy"
});
const jy = {
  addOrUpdate: async (t) => {
    await cn.vtxos.bulkPut(t);
  },
  deleteAll: async () => cn.vtxos.clear(),
  getSpendableVtxos: async () => cn.vtxos.where("spentBy").equals("").toArray(),
  getAllVtxos: async () => {
    const t = await cn.vtxos.toArray();
    return {
      spendable: t.filter((e) => e.spentBy === void 0 || e.spentBy === ""),
      spent: t.filter((e) => e.spentBy !== void 0 && e.spentBy !== "")
    };
  },
  getSpentVtxos: async () => cn.vtxos.where("spentBy").notEqual("").toArray(),
  getSweptVtxos: async () => cn.vtxos.where("virtualStatus.state").equals("swept").toArray(),
  close: async () => cn.close(),
  open: async () => {
    await cn.open();
  }
}, Fy = new $y(jy);
Fy.start().catch(console.error);
const sd = "arkade-cache-v1";
self.addEventListener("install", (t) => {
  t.waitUntil(caches.open(sd)), self.skipWaiting();
});
self.addEventListener("activate", (t) => {
  t.waitUntil(
    caches.keys().then((e) => Promise.all(
      e.map((n) => {
        if (n !== sd)
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
