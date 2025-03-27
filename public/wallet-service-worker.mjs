function fo(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Aa(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function At(t, ...e) {
  if (!Aa(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function va(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  fo(t.outputLen), fo(t.blockLen);
}
function rr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Ba(t, e) {
  At(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const Ve = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Vr(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function jt(t, e) {
  return t << 32 - e | t >>> e;
}
function Mn(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function Ia(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Go(t) {
  return typeof t == "string" && (t = Ia(t)), At(t), t;
}
function ka(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    At(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const i = t[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
let zs = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function Gs(t) {
  const e = (r) => t().update(Go(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Wo(t = 32) {
  if (Ve && typeof Ve.getRandomValues == "function")
    return Ve.getRandomValues(new Uint8Array(t));
  if (Ve && typeof Ve.randomBytes == "function")
    return Ve.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Na(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), i = BigInt(4294967295), s = Number(n >> o & i), c = Number(n & i), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
function Ua(t, e, n) {
  return t & e ^ ~t & n;
}
function $a(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
let Ws = class extends zs {
  constructor(e, n, r, o) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Vr(this.buffer);
  }
  update(e) {
    rr(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = Go(e);
    const i = e.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = Vr(e);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    rr(this), Ba(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > o - s && (this.process(r, 0), s = 0);
    for (let d = s; d < o; d++)
      n[d] = 0;
    Na(r, o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const c = Vr(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: i, destroyed: s, pos: c } = this;
    return e.length = o, e.pos = c, e.finished = i, e.destroyed = s, o % n && e.buffer.set(r), e;
  }
};
const La = /* @__PURE__ */ new Uint32Array([
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
]), de = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), le = /* @__PURE__ */ new Uint32Array(64);
let Ca = class extends Ws {
  constructor() {
    super(64, 32, 8, !1), this.A = de[0] | 0, this.B = de[1] | 0, this.C = de[2] | 0, this.D = de[3] | 0, this.E = de[4] | 0, this.F = de[5] | 0, this.G = de[6] | 0, this.H = de[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: o, E: i, F: s, G: c, H: a } = this;
    return [e, n, r, o, i, s, c, a];
  }
  // prettier-ignore
  set(e, n, r, o, i, s, c, a) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(e, n) {
    for (let d = 0; d < 16; d++, n += 4)
      le[d] = e.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = le[d - 15], h = le[d - 2], b = jt(l, 7) ^ jt(l, 18) ^ l >>> 3, w = jt(h, 17) ^ jt(h, 19) ^ h >>> 10;
      le[d] = w + le[d - 7] + b + le[d - 16] | 0;
    }
    let { A: r, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = jt(c, 6) ^ jt(c, 11) ^ jt(c, 25), h = f + l + Ua(c, a, u) + La[d] + le[d] | 0, w = (jt(r, 2) ^ jt(r, 13) ^ jt(r, 22)) + $a(r, o, i) | 0;
      f = u, u = a, a = c, c = s + h | 0, s = i, i = o, o = r, r = h + w | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, i, s, c, a, u, f);
  }
  roundClean() {
    le.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const Tt = /* @__PURE__ */ Gs(() => new Ca());
let qs = class extends zs {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, va(e);
    const r = Go(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o = this.blockLen, i = new Uint8Array(o);
    i.set(r.length > o ? e.create().update(r).digest() : r);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = e.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), i.fill(0);
  }
  update(e) {
    return rr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    rr(this), At(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return e = e, e.finished = o, e.destroyed = i, e.blockLen = s, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const js = (t, e, n) => new qs(t, e).update(n).digest();
js.create = (t, e) => new qs(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ar = /* @__PURE__ */ BigInt(0), vr = /* @__PURE__ */ BigInt(1), Ra = /* @__PURE__ */ BigInt(2);
function _e(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Cn(t) {
  if (!_e(t))
    throw new Error("Uint8Array expected");
}
function Xe(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const _a = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function Qe(t) {
  Cn(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += _a[t[n]];
  return e;
}
function Me(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function qo(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Ar : BigInt("0x" + t);
}
const ee = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Hi(t) {
  if (t >= ee._0 && t <= ee._9)
    return t - ee._0;
  if (t >= ee.A && t <= ee.F)
    return t - (ee.A - 10);
  if (t >= ee.a && t <= ee.f)
    return t - (ee.a - 10);
}
function Je(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const s = Hi(t.charCodeAt(i)), c = Hi(t.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = t[i] + t[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    r[o] = s * 16 + c;
  }
  return r;
}
function vt(t) {
  return qo(Qe(t));
}
function jo(t) {
  return Cn(t), qo(Qe(Uint8Array.from(t).reverse()));
}
function qt(t, e) {
  return Je(t.toString(16).padStart(e * 2, "0"));
}
function Yo(t, e) {
  return qt(t, e).reverse();
}
function Oa(t) {
  return Je(Me(t));
}
function gt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Je(e);
    } catch (i) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + i);
    }
  else if (_e(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function Ee(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Cn(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const i = t[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
function tn(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function Ha(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const Kr = (t) => typeof t == "bigint" && Ar <= t;
function en(t, e, n) {
  return Kr(t) && Kr(e) && Kr(n) && e <= t && t < n;
}
function Ct(t, e, n, r) {
  if (!en(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Ys(t) {
  let e;
  for (e = 0; t > Ar; t >>= vr, e += 1)
    ;
  return e;
}
function Pa(t, e) {
  return t >> BigInt(e) & vr;
}
function Va(t, e, n) {
  return t | (n ? vr : Ar) << BigInt(e);
}
const Zo = (t) => (Ra << BigInt(t - 1)) - vr, Dr = (t) => new Uint8Array(t), Pi = (t) => Uint8Array.from(t);
function Zs(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Dr(t), o = Dr(t), i = 0;
  const s = () => {
    r.fill(1), o.fill(0), i = 0;
  }, c = (...d) => n(o, r, ...d), a = (d = Dr()) => {
    o = c(Pi([0]), d), r = c(), d.length !== 0 && (o = c(Pi([1]), d), r = c());
  }, u = () => {
    if (i++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let d = 0;
    const l = [];
    for (; d < e; ) {
      r = c();
      const h = r.slice();
      l.push(h), d += r.length;
    }
    return Ee(...l);
  };
  return (d, l) => {
    s(), a(d);
    let h;
    for (; !(h = l(u())); )
      a();
    return s(), h;
  };
}
const Ka = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || _e(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Rn(t, e, n = {}) {
  const r = (o, i, s) => {
    const c = Ka[i];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const a = t[o];
    if (!(s && a === void 0) && !c(a, t))
      throw new Error("param " + String(o) + " is invalid. Expected " + i + ", got " + a);
  };
  for (const [o, i] of Object.entries(e))
    r(o, i, !1);
  for (const [o, i] of Object.entries(n))
    r(o, i, !0);
  return t;
}
const Da = () => {
  throw new Error("not implemented");
};
function lo(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const i = t(n, ...r);
    return e.set(n, i), i;
  };
}
const Ma = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Ct,
  abool: Xe,
  abytes: Cn,
  bitGet: Pa,
  bitLen: Ys,
  bitMask: Zo,
  bitSet: Va,
  bytesToHex: Qe,
  bytesToNumberBE: vt,
  bytesToNumberLE: jo,
  concatBytes: Ee,
  createHmacDrbg: Zs,
  ensureBytes: gt,
  equalBytes: tn,
  hexToBytes: Je,
  hexToNumber: qo,
  inRange: en,
  isBytes: _e,
  memoized: lo,
  notImplemented: Da,
  numberToBytesBE: qt,
  numberToBytesLE: Yo,
  numberToHexUnpadded: Me,
  numberToVarBytesBE: Oa,
  utf8ToBytes: Ha,
  validateObject: Rn
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ut = BigInt(0), Q = BigInt(1), Ne = /* @__PURE__ */ BigInt(2), Fa = /* @__PURE__ */ BigInt(3), ho = /* @__PURE__ */ BigInt(4), Vi = /* @__PURE__ */ BigInt(5), Ki = /* @__PURE__ */ BigInt(8);
function at(t, e) {
  const n = t % e;
  return n >= ut ? n : e + n;
}
function za(t, e, n) {
  if (e < ut)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= ut)
    throw new Error("invalid modulus");
  if (n === Q)
    return ut;
  let r = Q;
  for (; e > ut; )
    e & Q && (r = r * t % n), t = t * t % n, e >>= Q;
  return r;
}
function Rt(t, e, n) {
  let r = t;
  for (; e-- > ut; )
    r *= r, r %= n;
  return r;
}
function po(t, e) {
  if (t === ut)
    throw new Error("invert: expected non-zero number");
  if (e <= ut)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = at(t, e), r = e, o = ut, i = Q;
  for (; n !== ut; ) {
    const c = r / n, a = r % n, u = o - i * c;
    r = n, n = a, o = i, i = u;
  }
  if (r !== Q)
    throw new Error("invert: does not exist");
  return at(o, e);
}
function Ga(t) {
  const e = (t - Q) / Ne;
  let n, r, o;
  for (n = t - Q, r = 0; n % Ne === ut; n /= Ne, r++)
    ;
  for (o = Ne; o < t && za(o, e, t) !== t - Q; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + Q) / ho;
    return function(a, u) {
      const f = a.pow(u, s);
      if (!a.eql(a.sqr(f), u))
        throw new Error("Cannot find square root");
      return f;
    };
  }
  const i = (n + Q) / Ne;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, f = c.pow(c.mul(c.ONE, o), n), d = c.pow(a, i), l = c.pow(a, n);
    for (; !c.eql(l, c.ONE); ) {
      if (c.eql(l, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(l); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const b = c.pow(f, Q << BigInt(u - h - 1));
      f = c.sqr(b), d = c.mul(d, b), l = c.mul(l, f), u = h;
    }
    return d;
  };
}
function Wa(t) {
  if (t % ho === Fa) {
    const e = (t + Q) / ho;
    return function(r, o) {
      const i = r.pow(o, e);
      if (!r.eql(r.sqr(i), o))
        throw new Error("Cannot find square root");
      return i;
    };
  }
  if (t % Ki === Vi) {
    const e = (t - Vi) / Ki;
    return function(r, o) {
      const i = r.mul(o, Ne), s = r.pow(i, e), c = r.mul(o, s), a = r.mul(r.mul(c, Ne), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), o))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return Ga(t);
}
const qa = [
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
function ja(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = qa.reduce((r, o) => (r[o] = "function", r), e);
  return Rn(t, n);
}
function Ya(t, e, n) {
  if (n < ut)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ut)
    return t.ONE;
  if (n === Q)
    return e;
  let r = t.ONE, o = e;
  for (; n > ut; )
    n & Q && (r = t.mul(r, o)), o = t.sqr(o), n >>= Q;
  return r;
}
function Za(t, e) {
  const n = new Array(e.length), r = e.reduce((i, s, c) => t.is0(s) ? i : (n[c] = i, t.mul(i, s)), t.ONE), o = t.inv(r);
  return e.reduceRight((i, s, c) => t.is0(s) ? i : (n[c] = t.mul(i, n[c]), t.mul(i, s)), o), n;
}
function Xs(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Qs(t, e, n = !1, r = {}) {
  if (t <= ut)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: i } = Xs(t, e);
  if (i > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: o,
    BYTES: i,
    MASK: Zo(o),
    ZERO: ut,
    ONE: Q,
    create: (a) => at(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return ut <= a && a < t;
    },
    is0: (a) => a === ut,
    isOdd: (a) => (a & Q) === Q,
    neg: (a) => at(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => at(a * a, t),
    add: (a, u) => at(a + u, t),
    sub: (a, u) => at(a - u, t),
    mul: (a, u) => at(a * u, t),
    pow: (a, u) => Ya(c, a, u),
    div: (a, u) => at(a * po(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => po(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = Wa(t)), s(c, a))),
    invertBatch: (a) => Za(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, f) => f ? u : a,
    toBytes: (a) => n ? Yo(a, i) : qt(a, i),
    fromBytes: (a) => {
      if (a.length !== i)
        throw new Error("Field.fromBytes: expected " + i + " bytes, got " + a.length);
      return n ? jo(a) : vt(a);
    }
  });
  return Object.freeze(c);
}
function Js(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function tc(t) {
  const e = Js(t);
  return e + Math.ceil(e / 2);
}
function Xa(t, e, n = !1) {
  const r = t.length, o = Js(e), i = tc(e);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const s = n ? jo(t) : vt(t), c = at(s, e - Q) + Q;
  return n ? Yo(c, o) : qt(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Di = BigInt(0), Fn = BigInt(1);
function Mr(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function ec(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Fr(t, e) {
  ec(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function Qa(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Ja(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const zr = /* @__PURE__ */ new WeakMap(), nc = /* @__PURE__ */ new WeakMap();
function Gr(t) {
  return nc.get(t) || 1;
}
function tu(t, e) {
  return {
    constTimeNegate: Mr,
    hasPrecomputes(n) {
      return Gr(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let i = n;
      for (; r > Di; )
        r & Fn && (o = o.add(i)), i = i.double(), r >>= Fn;
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
      const { windows: o, windowSize: i } = Fr(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < o; u++) {
        a = c, s.push(a);
        for (let f = 1; f < i; f++)
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
    wNAF(n, r, o) {
      const { windows: i, windowSize: s } = Fr(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), f = 2 ** n, d = BigInt(n);
      for (let l = 0; l < i; l++) {
        const h = l * s;
        let b = Number(o & u);
        o >>= d, b > s && (b -= f, o += Fn);
        const w = h, p = h + Math.abs(b) - 1, g = l % 2 !== 0, y = b < 0;
        b === 0 ? a = a.add(Mr(g, r[w])) : c = c.add(Mr(y, r[p]));
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
    wNAFUnsafe(n, r, o, i = t.ZERO) {
      const { windows: s, windowSize: c } = Fr(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, f = BigInt(n);
      for (let d = 0; d < s; d++) {
        const l = d * c;
        if (o === Di)
          break;
        let h = Number(o & a);
        if (o >>= f, h > c && (h -= u, o += Fn), h === 0)
          continue;
        let b = r[l + Math.abs(h) - 1];
        h < 0 && (b = b.negate()), i = i.add(b);
      }
      return i;
    },
    getPrecomputes(n, r, o) {
      let i = zr.get(r);
      return i || (i = this.precomputeWindow(r, n), n !== 1 && zr.set(r, o(i))), i;
    },
    wNAFCached(n, r, o) {
      const i = Gr(n);
      return this.wNAF(i, this.getPrecomputes(i, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, i) {
      const s = Gr(n);
      return s === 1 ? this.unsafeLadder(n, r, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, o), r, i);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      ec(r, e), nc.set(n, r), zr.delete(n);
    }
  };
}
function eu(t, e, n, r) {
  if (Qa(n, t), Ja(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, i = Ys(BigInt(n.length)), s = i > 12 ? i - 3 : i > 4 ? i - 2 : i ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(o), u = Math.floor((e.BITS - 1) / s) * s;
  let f = o;
  for (let d = u; d >= 0; d -= s) {
    a.fill(o);
    for (let h = 0; h < r.length; h++) {
      const b = r[h], w = Number(b >> BigInt(d) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let l = o;
    for (let h = a.length - 1, b = o; h > 0; h--)
      b = b.add(a[h]), l = l.add(b);
    if (f = f.add(l), d !== 0)
      for (let h = 0; h < s; h++)
        f = f.double();
  }
  return f;
}
function rc(t) {
  return ja(t.Fp), Rn(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Xs(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Mi(t) {
  t.lowS !== void 0 && Xe("lowS", t.lowS), t.prehash !== void 0 && Xe("prehash", t.prehash);
}
function nu(t) {
  const e = rc(t);
  Rn(e, {
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
const { bytesToNumberBE: ru, hexToBytes: ou } = Ma;
class iu extends Error {
  constructor(e = "") {
    super(e);
  }
}
const oe = {
  // asn.1 DER encoding utils
  Err: iu,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = oe;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = Me(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? Me(o.length / 2 | 128) : "";
      return Me(t) + i + o + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = oe;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const o = e[r++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
      else {
        const a = o & 127;
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
      const { Err: e } = oe;
      if (t < se)
        throw new e("integer: negative integers are not allowed");
      let n = Me(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = oe;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return ru(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = oe, o = typeof t == "string" ? ou(t) : t;
    Cn(o);
    const { v: i, l: s } = r.decode(48, o);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, i), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = oe, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), i = r + o;
    return e.encode(48, i);
  }
}, se = BigInt(0), st = BigInt(1);
BigInt(2);
const Fi = BigInt(3);
BigInt(4);
function su(t) {
  const e = nu(t), { Fp: n } = e, r = Qs(e.n, e.nBitLength), o = e.toBytes || ((w, p, g) => {
    const y = p.toAffine();
    return Ee(Uint8Array.from([4]), n.toBytes(y.x), n.toBytes(y.y));
  }), i = e.fromBytes || ((w) => {
    const p = w.subarray(1), g = n.fromBytes(p.subarray(0, n.BYTES)), y = n.fromBytes(p.subarray(n.BYTES, 2 * n.BYTES));
    return { x: g, y };
  });
  function s(w) {
    const { a: p, b: g } = e, y = n.sqr(w), E = n.mul(y, w);
    return n.add(n.add(E, n.mul(w, p)), g);
  }
  if (!n.eql(n.sqr(e.Gy), s(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(w) {
    return en(w, st, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: y, n: E } = e;
    if (p && typeof w != "bigint") {
      if (_e(w) && (w = Qe(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let A;
    try {
      A = typeof w == "bigint" ? w : vt(gt("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return y && (A = at(A, E)), Ct("private key", A, st, E), A;
  }
  function u(w) {
    if (!(w instanceof l))
      throw new Error("ProjectivePoint expected");
  }
  const f = lo((w, p) => {
    const { px: g, py: y, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y };
    const A = w.is0();
    p == null && (p = A ? n.ONE : n.inv(E));
    const v = n.mul(g, p), B = n.mul(y, p), m = n.mul(E, p);
    if (A)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(m, n.ONE))
      throw new Error("invZ was invalid");
    return { x: v, y: B };
  }), d = lo((w) => {
    if (w.is0()) {
      if (e.allowInfinityPoint && !n.is0(w.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: p, y: g } = w.toAffine();
    if (!n.isValid(p) || !n.isValid(g))
      throw new Error("bad point: x or y not FE");
    const y = n.sqr(g), E = s(p);
    if (!n.eql(y, E))
      throw new Error("bad point: equation left != right");
    if (!w.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class l {
    constructor(p, g, y) {
      if (this.px = p, this.py = g, this.pz = y, p == null || !n.isValid(p))
        throw new Error("x required");
      if (g == null || !n.isValid(g))
        throw new Error("y required");
      if (y == null || !n.isValid(y))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x: g, y } = p || {};
      if (!p || !n.isValid(g) || !n.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof l)
        throw new Error("projective point not allowed");
      const E = (A) => n.eql(A, n.ZERO);
      return E(g) && E(y) ? l.ZERO : new l(g, y, n.ONE);
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
      const g = n.invertBatch(p.map((y) => y.pz));
      return p.map((y, E) => y.toAffine(g[E])).map(l.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(p) {
      const g = l.fromAffine(i(gt("pointHex", p)));
      return g.assertValidity(), g;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return l.BASE.multiply(a(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return eu(l, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      b.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      d(this);
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
      const { px: g, py: y, pz: E } = this, { px: A, py: v, pz: B } = p, m = n.eql(n.mul(g, B), n.mul(A, E)), k = n.eql(n.mul(y, B), n.mul(v, E));
      return m && k;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new l(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: p, b: g } = e, y = n.mul(g, Fi), { px: E, py: A, pz: v } = this;
      let B = n.ZERO, m = n.ZERO, k = n.ZERO, I = n.mul(E, E), O = n.mul(A, A), C = n.mul(v, v), $ = n.mul(E, A);
      return $ = n.add($, $), k = n.mul(E, v), k = n.add(k, k), B = n.mul(p, k), m = n.mul(y, C), m = n.add(B, m), B = n.sub(O, m), m = n.add(O, m), m = n.mul(B, m), B = n.mul($, B), k = n.mul(y, k), C = n.mul(p, C), $ = n.sub(I, C), $ = n.mul(p, $), $ = n.add($, k), k = n.add(I, I), I = n.add(k, I), I = n.add(I, C), I = n.mul(I, $), m = n.add(m, I), C = n.mul(A, v), C = n.add(C, C), I = n.mul(C, $), B = n.sub(B, I), k = n.mul(C, O), k = n.add(k, k), k = n.add(k, k), new l(B, m, k);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: y, pz: E } = this, { px: A, py: v, pz: B } = p;
      let m = n.ZERO, k = n.ZERO, I = n.ZERO;
      const O = e.a, C = n.mul(e.b, Fi);
      let $ = n.mul(g, A), D = n.mul(y, v), x = n.mul(E, B), S = n.add(g, y), T = n.add(A, v);
      S = n.mul(S, T), T = n.add($, D), S = n.sub(S, T), T = n.add(g, E);
      let N = n.add(A, B);
      return T = n.mul(T, N), N = n.add($, x), T = n.sub(T, N), N = n.add(y, E), m = n.add(v, B), N = n.mul(N, m), m = n.add(D, x), N = n.sub(N, m), I = n.mul(O, T), m = n.mul(C, x), I = n.add(m, I), m = n.sub(D, I), I = n.add(D, I), k = n.mul(m, I), D = n.add($, $), D = n.add(D, $), x = n.mul(O, x), T = n.mul(C, T), D = n.add(D, x), x = n.sub($, x), x = n.mul(O, x), T = n.add(T, x), $ = n.mul(D, T), k = n.add(k, $), $ = n.mul(N, T), m = n.mul(S, m), m = n.sub(m, $), $ = n.mul(S, D), I = n.mul(N, I), I = n.add(I, $), new l(m, k, I);
    }
    subtract(p) {
      return this.add(p.negate());
    }
    is0() {
      return this.equals(l.ZERO);
    }
    wNAF(p) {
      return b.wNAFCached(this, p, l.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(p) {
      const { endo: g, n: y } = e;
      Ct("scalar", p, se, y);
      const E = l.ZERO;
      if (p === se)
        return E;
      if (this.is0() || p === st)
        return this;
      if (!g || b.hasPrecomputes(this))
        return b.wNAFCachedUnsafe(this, p, l.normalizeZ);
      let { k1neg: A, k1: v, k2neg: B, k2: m } = g.splitScalar(p), k = E, I = E, O = this;
      for (; v > se || m > se; )
        v & st && (k = k.add(O)), m & st && (I = I.add(O)), O = O.double(), v >>= st, m >>= st;
      return A && (k = k.negate()), B && (I = I.negate()), I = new l(n.mul(I.px, g.beta), I.py, I.pz), k.add(I);
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
      const { endo: g, n: y } = e;
      Ct("scalar", p, st, y);
      let E, A;
      if (g) {
        const { k1neg: v, k1: B, k2neg: m, k2: k } = g.splitScalar(p);
        let { p: I, f: O } = this.wNAF(B), { p: C, f: $ } = this.wNAF(k);
        I = b.constTimeNegate(v, I), C = b.constTimeNegate(m, C), C = new l(n.mul(C.px, g.beta), C.py, C.pz), E = I.add(C), A = O.add($);
      } else {
        const { p: v, f: B } = this.wNAF(p);
        E = v, A = B;
      }
      return l.normalizeZ([E, A])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, y) {
      const E = l.BASE, A = (B, m) => m === se || m === st || !B.equals(E) ? B.multiplyUnsafe(m) : B.multiply(m), v = A(this, g).add(A(p, y));
      return v.is0() ? void 0 : v;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return f(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = e;
      if (p === st)
        return !0;
      if (g)
        return g(l, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = e;
      return p === st ? this : g ? g(l, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(p = !0) {
      return Xe("isCompressed", p), this.assertValidity(), o(l, this, p);
    }
    toHex(p = !0) {
      return Xe("isCompressed", p), Qe(this.toRawBytes(p));
    }
  }
  l.BASE = new l(e.Gx, e.Gy, n.ONE), l.ZERO = new l(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, b = tu(l, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: l,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function cu(t) {
  const e = rc(t);
  return Rn(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function au(t) {
  const e = cu(t), { Fp: n, n: r } = e, o = n.BYTES + 1, i = 2 * n.BYTES + 1;
  function s(x) {
    return at(x, r);
  }
  function c(x) {
    return po(x, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: f, isWithinCurveOrder: d } = su({
    ...e,
    toBytes(x, S, T) {
      const N = S.toAffine(), U = n.toBytes(N.x), _ = Ee;
      return Xe("isCompressed", T), T ? _(Uint8Array.from([S.hasEvenY() ? 2 : 3]), U) : _(Uint8Array.from([4]), U, n.toBytes(N.y));
    },
    fromBytes(x) {
      const S = x.length, T = x[0], N = x.subarray(1);
      if (S === o && (T === 2 || T === 3)) {
        const U = vt(N);
        if (!en(U, st, n.ORDER))
          throw new Error("Point is not on curve");
        const _ = f(U);
        let V;
        try {
          V = n.sqrt(_);
        } catch (j) {
          const K = j instanceof Error ? ": " + j.message : "";
          throw new Error("Point is not on curve" + K);
        }
        const P = (V & st) === st;
        return (T & 1) === 1 !== P && (V = n.neg(V)), { x: U, y: V };
      } else if (S === i && T === 4) {
        const U = n.fromBytes(N.subarray(0, n.BYTES)), _ = n.fromBytes(N.subarray(n.BYTES, 2 * n.BYTES));
        return { x: U, y: _ };
      } else {
        const U = o, _ = i;
        throw new Error("invalid Point, expected length of " + U + ", or uncompressed " + _ + ", got " + S);
      }
    }
  }), l = (x) => Qe(qt(x, e.nByteLength));
  function h(x) {
    const S = r >> st;
    return x > S;
  }
  function b(x) {
    return h(x) ? s(-x) : x;
  }
  const w = (x, S, T) => vt(x.slice(S, T));
  class p {
    constructor(S, T, N) {
      this.r = S, this.s = T, this.recovery = N, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(S) {
      const T = e.nByteLength;
      return S = gt("compactSignature", S, T * 2), new p(w(S, 0, T), w(S, T, 2 * T));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(S) {
      const { r: T, s: N } = oe.toSig(gt("DER", S));
      return new p(T, N);
    }
    assertValidity() {
      Ct("r", this.r, st, r), Ct("s", this.s, st, r);
    }
    addRecoveryBit(S) {
      return new p(this.r, this.s, S);
    }
    recoverPublicKey(S) {
      const { r: T, s: N, recovery: U } = this, _ = B(gt("msgHash", S));
      if (U == null || ![0, 1, 2, 3].includes(U))
        throw new Error("recovery id invalid");
      const V = U === 2 || U === 3 ? T + e.n : T;
      if (V >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const P = (U & 1) === 0 ? "02" : "03", et = a.fromHex(P + l(V)), j = c(V), K = s(-_ * j), Nt = s(N * j), lt = a.BASE.multiplyAndAddUnsafe(et, K, Nt);
      if (!lt)
        throw new Error("point at infinify");
      return lt.assertValidity(), lt;
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
      return Je(this.toDERHex());
    }
    toDERHex() {
      return oe.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Je(this.toCompactHex());
    }
    toCompactHex() {
      return l(this.r) + l(this.s);
    }
  }
  const g = {
    isValidPrivateKey(x) {
      try {
        return u(x), !0;
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
      const x = tc(e.n);
      return Xa(e.randomBytes(x), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(x = 8, S = a.BASE) {
      return S._setWindowSize(x), S.multiply(BigInt(3)), S;
    }
  };
  function y(x, S = !0) {
    return a.fromPrivateKey(x).toRawBytes(S);
  }
  function E(x) {
    const S = _e(x), T = typeof x == "string", N = (S || T) && x.length;
    return S ? N === o || N === i : T ? N === 2 * o || N === 2 * i : x instanceof a;
  }
  function A(x, S, T = !0) {
    if (E(x))
      throw new Error("first arg must be private key");
    if (!E(S))
      throw new Error("second arg must be public key");
    return a.fromHex(S).multiply(u(x)).toRawBytes(T);
  }
  const v = e.bits2int || function(x) {
    if (x.length > 8192)
      throw new Error("input is too large");
    const S = vt(x), T = x.length * 8 - e.nBitLength;
    return T > 0 ? S >> BigInt(T) : S;
  }, B = e.bits2int_modN || function(x) {
    return s(v(x));
  }, m = Zo(e.nBitLength);
  function k(x) {
    return Ct("num < 2^" + e.nBitLength, x, se, m), qt(x, e.nByteLength);
  }
  function I(x, S, T = O) {
    if (["recovered", "canonical"].some((mt) => mt in T))
      throw new Error("sign() legacy options not supported");
    const { hash: N, randomBytes: U } = e;
    let { lowS: _, prehash: V, extraEntropy: P } = T;
    _ == null && (_ = !0), x = gt("msgHash", x), Mi(T), V && (x = gt("prehashed msgHash", N(x)));
    const et = B(x), j = u(S), K = [k(j), k(et)];
    if (P != null && P !== !1) {
      const mt = P === !0 ? U(n.BYTES) : P;
      K.push(gt("extraEntropy", mt));
    }
    const Nt = Ee(...K), lt = et;
    function ve(mt) {
      const Ut = v(mt);
      if (!d(Ut))
        return;
      const Be = c(Ut), Pt = a.BASE.multiply(Ut).toAffine(), Et = s(Pt.x);
      if (Et === se)
        return;
      const Vt = s(Be * s(lt + Et * j));
      if (Vt === se)
        return;
      let Kt = (Pt.x === Et ? 0 : 2) | Number(Pt.y & st), $t = Vt;
      return _ && h(Vt) && ($t = b(Vt), Kt ^= 1), new p(Et, $t, Kt);
    }
    return { seed: Nt, k2sig: ve };
  }
  const O = { lowS: e.lowS, prehash: !1 }, C = { lowS: e.lowS, prehash: !1 };
  function $(x, S, T = O) {
    const { seed: N, k2sig: U } = I(x, S, T), _ = e;
    return Zs(_.hash.outputLen, _.nByteLength, _.hmac)(N, U);
  }
  a.BASE._setWindowSize(8);
  function D(x, S, T, N = C) {
    var Kt;
    const U = x;
    S = gt("msgHash", S), T = gt("publicKey", T);
    const { lowS: _, prehash: V, format: P } = N;
    if (Mi(N), "strict" in N)
      throw new Error("options.strict was renamed to lowS");
    if (P !== void 0 && P !== "compact" && P !== "der")
      throw new Error("format must be compact or der");
    const et = typeof U == "string" || _e(U), j = !et && !P && typeof U == "object" && U !== null && typeof U.r == "bigint" && typeof U.s == "bigint";
    if (!et && !j)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let K, Nt;
    try {
      if (j && (K = new p(U.r, U.s)), et) {
        try {
          P !== "compact" && (K = p.fromDER(U));
        } catch ($t) {
          if (!($t instanceof oe.Err))
            throw $t;
        }
        !K && P !== "der" && (K = p.fromCompact(U));
      }
      Nt = a.fromHex(T);
    } catch {
      return !1;
    }
    if (!K || _ && K.hasHighS())
      return !1;
    V && (S = e.hash(S));
    const { r: lt, s: ve } = K, mt = B(S), Ut = c(ve), Be = s(mt * Ut), Pt = s(lt * Ut), Et = (Kt = a.BASE.multiplyAndAddUnsafe(Nt, Be, Pt)) == null ? void 0 : Kt.toAffine();
    return Et ? s(Et.x) === lt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: y,
    getSharedSecret: A,
    sign: $,
    verify: D,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function uu(t) {
  return {
    hash: t,
    hmac: (e, ...n) => js(t, e, ka(...n)),
    randomBytes: Wo
  };
}
function fu(t, e) {
  const n = (r) => au({ ...t, ...uu(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _n = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), or = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Tn = BigInt(1), ir = BigInt(2), zi = (t, e) => (t + e / ir) / e;
function oc(t) {
  const e = _n, n = BigInt(3), r = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, f = u * u * t % e, d = Rt(f, n, e) * f % e, l = Rt(d, n, e) * f % e, h = Rt(l, ir, e) * u % e, b = Rt(h, o, e) * h % e, w = Rt(b, i, e) * b % e, p = Rt(w, c, e) * w % e, g = Rt(p, a, e) * p % e, y = Rt(g, c, e) * w % e, E = Rt(y, n, e) * f % e, A = Rt(E, s, e) * b % e, v = Rt(A, r, e) * u % e, B = Rt(v, ir, e);
  if (!wo.eql(wo.sqr(B), t))
    throw new Error("Cannot find square root");
  return B;
}
const wo = Qs(_n, void 0, void 0, { sqrt: oc }), Xt = fu({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: wo,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: or,
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
      const e = or, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Tn * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), i = n, s = BigInt("0x100000000000000000000000000000000"), c = zi(i * t, e), a = zi(-r * t, e);
      let u = at(t - c * n - a * o, e), f = at(-c * r - a * i, e);
      const d = u > s, l = f > s;
      if (d && (u = e - u), l && (f = e - f), u > s || f > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: d, k1: u, k2neg: l, k2: f };
    }
  }
}, Tt), ic = BigInt(0), Gi = {};
function sr(t, ...e) {
  let n = Gi[t];
  if (n === void 0) {
    const r = Tt(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = Ee(r, r), Gi[t] = n;
  }
  return Tt(Ee(n, ...e));
}
const Xo = (t) => t.toRawBytes(!0).slice(1), go = (t) => qt(t, 32), Wr = (t) => at(t, _n), An = (t) => at(t, or), Qo = Xt.ProjectivePoint, du = (t, e, n) => Qo.BASE.multiplyAndAddUnsafe(t, e, n);
function yo(t) {
  let e = Xt.utils.normPrivateKeyToScalar(t), n = Qo.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : An(-e), bytes: Xo(n) };
}
function sc(t) {
  Ct("x", t, Tn, _n);
  const e = Wr(t * t), n = Wr(e * t + BigInt(7));
  let r = oc(n);
  r % ir !== ic && (r = Wr(-r));
  const o = new Qo(t, r, Tn);
  return o.assertValidity(), o;
}
const We = vt;
function cc(...t) {
  return An(We(sr("BIP0340/challenge", ...t)));
}
function lu(t) {
  return yo(t).bytes;
}
function hu(t, e, n = Wo(32)) {
  const r = gt("message", t), { bytes: o, scalar: i } = yo(e), s = gt("auxRand", n, 32), c = go(i ^ We(sr("BIP0340/aux", s))), a = sr("BIP0340/nonce", c, o, r), u = An(We(a));
  if (u === ic)
    throw new Error("sign failed: k is zero");
  const { bytes: f, scalar: d } = yo(u), l = cc(f, o, r), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(go(An(d + l * i)), 32), !ac(h, r, o))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function ac(t, e, n) {
  const r = gt("signature", t, 64), o = gt("message", e), i = gt("publicKey", n, 32);
  try {
    const s = sc(We(i)), c = We(r.subarray(0, 32));
    if (!en(c, Tn, _n))
      return !1;
    const a = We(r.subarray(32, 64));
    if (!en(a, Tn, or))
      return !1;
    const u = cc(go(c), Xo(s), o), f = du(s, a, An(-u));
    return !(!f || !f.hasEvenY() || f.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const Qt = {
  getPublicKey: lu,
  sign: hu,
  verify: ac,
  utils: {
    randomPrivateKey: Xt.utils.randomPrivateKey,
    lift_x: sc,
    pointToBytes: Xo,
    numberToBytesBE: qt,
    bytesToNumberBE: vt,
    taggedHash: sr,
    mod: at
  }
}, pu = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), uc = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), wu = /* @__PURE__ */ uc.map((t) => (9 * t + 5) % 16);
let Jo = [uc], ti = [wu];
for (let t = 0; t < 4; t++)
  for (let e of [Jo, ti])
    e.push(e[t].map((n) => pu[n]));
const fc = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), gu = /* @__PURE__ */ Jo.map((t, e) => t.map((n) => fc[e][n])), yu = /* @__PURE__ */ ti.map((t, e) => t.map((n) => fc[e][n])), bu = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), mu = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Wi(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const zn = /* @__PURE__ */ new Uint32Array(16);
class Eu extends Ws {
  constructor() {
    super(64, 20, 8, !0), this.h0 = 1732584193, this.h1 = -271733879, this.h2 = -1732584194, this.h3 = 271733878, this.h4 = -1009589776;
  }
  get() {
    const { h0: e, h1: n, h2: r, h3: o, h4: i } = this;
    return [e, n, r, o, i];
  }
  set(e, n, r, o, i) {
    this.h0 = e | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = o | 0, this.h4 = i | 0;
  }
  process(e, n) {
    for (let h = 0; h < 16; h++, n += 4)
      zn[h] = e.getUint32(n, !0);
    let r = this.h0 | 0, o = r, i = this.h1 | 0, s = i, c = this.h2 | 0, a = c, u = this.h3 | 0, f = u, d = this.h4 | 0, l = d;
    for (let h = 0; h < 5; h++) {
      const b = 4 - h, w = bu[h], p = mu[h], g = Jo[h], y = ti[h], E = gu[h], A = yu[h];
      for (let v = 0; v < 16; v++) {
        const B = Mn(r + Wi(h, i, c, u) + zn[g[v]] + w, E[v]) + d | 0;
        r = d, d = u, u = Mn(c, 10) | 0, c = i, i = B;
      }
      for (let v = 0; v < 16; v++) {
        const B = Mn(o + Wi(b, s, a, f) + zn[y[v]] + p, A[v]) + l | 0;
        o = l, l = f, f = Mn(a, 10) | 0, a = s, s = B;
      }
    }
    this.set(this.h1 + c + f | 0, this.h2 + u + l | 0, this.h3 + d + o | 0, this.h4 + r + s | 0, this.h0 + i + a | 0);
  }
  roundClean() {
    zn.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const xu = /* @__PURE__ */ Gs(() => new Eu());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vn(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function dc(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function ei(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Bn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function On(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function cr(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function lc(t, e) {
  if (!dc(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function ni(t, e) {
  if (!dc(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function Br(...t) {
  const e = (i) => i, n = (i, s) => (c) => i(s(c)), r = t.map((i) => i.encode).reduceRight(n, e), o = t.map((i) => i.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function ri(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  lc("alphabet", e);
  const r = new Map(e.map((o, i) => [o, i]));
  return {
    encode: (o) => (cr(o), o.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${t}`);
      return e[i];
    })),
    decode: (o) => (cr(o), o.map((i) => {
      Bn("alphabet.decode", i);
      const s = r.get(i);
      if (s === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function oi(t = "") {
  return Bn("join", t), {
    encode: (e) => (lc("join.decode", e), e.join(t)),
    decode: (e) => (Bn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Su(t) {
  return ei(t), { encode: (e) => e, decode: (e) => t(e) };
}
function qi(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (cr(t), !t.length)
    return [];
  let r = 0;
  const o = [], i = Array.from(t, (c) => {
    if (On(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = i.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const f = i[u], d = e * c, l = d + f;
      if (!Number.isSafeInteger(l) || d / e !== c || l - f !== d)
        throw new Error("convertRadix: carry overflow");
      const h = l / n;
      c = l % n;
      const b = Math.floor(h);
      if (i[u] = b, !Number.isSafeInteger(b) || b * n + c !== l)
        throw new Error("convertRadix: carry overflow");
      if (a)
        b ? a = !1 : r = u;
      else continue;
    }
    if (o.push(c), a)
      break;
  }
  for (let c = 0; c < t.length - 1 && t[c] === 0; c++)
    o.push(0);
  return o.reverse();
}
const hc = (t, e) => e === 0 ? t : hc(e, t % e), ar = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - hc(t, e)), Qn = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function bo(t, e, n, r) {
  if (cr(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ar(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ ar(e, n)}`);
  let o = 0, i = 0;
  const s = Qn[e], c = Qn[n] - 1, a = [];
  for (const u of t) {
    if (On(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (o = o << e | u, i + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${e}`);
    for (i += e; i >= n; i -= n)
      a.push((o >> i - n & c) >>> 0);
    const f = Qn[i];
    if (f === void 0)
      throw new Error("invalid carry");
    o &= f - 1;
  }
  if (o = o << n - i & c, !r && i >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && i > 0 && a.push(o >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Tu(t) {
  On(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!vn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return qi(Array.from(n), e, t);
    },
    decode: (n) => (ni("radix.decode", n), Uint8Array.from(qi(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function pc(t, e = !1) {
  if (On(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ar(8, t) > 32 || /* @__PURE__ */ ar(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!vn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return bo(Array.from(n), 8, t, !e);
    },
    decode: (n) => (ni("radix2.decode", n), Uint8Array.from(bo(n, t, 8, e)))
  };
}
function ji(t) {
  return ei(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Au(t, e) {
  return On(t), ei(e), {
    encode(n) {
      if (!vn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), o = new Uint8Array(n.length + t);
      return o.set(n), o.set(r, n.length), o;
    },
    decode(n) {
      if (!vn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), o = n.slice(-t), i = e(r).slice(0, t);
      for (let s = 0; s < t; s++)
        if (i[s] !== o[s])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const vu = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ Br(/* @__PURE__ */ Tu(58), /* @__PURE__ */ ri(t), /* @__PURE__ */ oi("")), Bu = /* @__PURE__ */ vu("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Iu = (t) => /* @__PURE__ */ Br(Au(4, (e) => t(t(e))), Bu), mo = /* @__PURE__ */ Br(/* @__PURE__ */ ri("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ oi("")), Yi = [996825010, 642813549, 513874426, 1027748829, 705979059];
function ln(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Yi.length; r++)
    (e >> r & 1) === 1 && (n ^= Yi[r]);
  return n;
}
function Zi(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let i = 0; i < r; i++) {
    const s = t.charCodeAt(i);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = ln(o) ^ s >> 5;
  }
  o = ln(o);
  for (let i = 0; i < r; i++)
    o = ln(o) ^ t.charCodeAt(i) & 31;
  for (let i of e)
    o = ln(o) ^ i;
  for (let i = 0; i < 6; i++)
    o = ln(o);
  return o ^= n, mo.encode(bo([o % Qn[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function wc(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ pc(5), r = n.decode, o = n.encode, i = ji(r);
  function s(d, l, h = 90) {
    Bn("bech32.encode prefix", d), vn(l) && (l = Array.from(l)), ni("bech32.encode", l);
    const b = d.length;
    if (b === 0)
      throw new TypeError(`Invalid prefix length ${b}`);
    const w = b + 7 + l.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = d.toLowerCase(), g = Zi(p, l, e);
    return `${p}1${mo.encode(l)}${g}`;
  }
  function c(d, l = 90) {
    Bn("bech32.decode input", d);
    const h = d.length;
    if (h < 8 || l !== !1 && h > l)
      throw new TypeError(`invalid string length: ${h} (${d}). Expected (8..${l})`);
    const b = d.toLowerCase();
    if (d !== b && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = b.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = b.slice(0, w), g = b.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const y = mo.decode(g).slice(0, -6), E = Zi(p, y, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${d}: expected "${E}"`);
    return { prefix: p, words: y };
  }
  const a = ji(c);
  function u(d) {
    const { prefix: l, words: h } = c(d, !1);
    return { prefix: l, words: h, bytes: r(h) };
  }
  function f(d, l) {
    return s(d, o(l));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: i,
    toWords: o
  };
}
const Eo = /* @__PURE__ */ wc("bech32"), gc = /* @__PURE__ */ wc("bech32m"), ku = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, F = /* @__PURE__ */ Br(/* @__PURE__ */ pc(4), /* @__PURE__ */ ri("0123456789abcdef"), /* @__PURE__ */ oi(""), /* @__PURE__ */ Su((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), Y = /* @__PURE__ */ new Uint8Array(), yc = /* @__PURE__ */ new Uint8Array([0]);
function nn(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Ht(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Nu(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    if (!Ht(o))
      throw new Error("Uint8Array expected");
    e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const i = t[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
const bc = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function Hn(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function Jt(t) {
  return Number.isSafeInteger(t);
}
const ii = {
  equalBytes: nn,
  isBytes: Ht,
  concatBytes: Nu
}, mc = (t) => {
  if (t !== null && typeof t != "string" && !Gt(t) && !Ht(t) && !Jt(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (Gt(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = fe.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (Gt(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = fe.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, it = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(it.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (it.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${it.len(e)}`);
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
    it.checkLen(t, e);
    const { FULL_MASK: r, BITS: o } = it, i = o - e % o, s = i ? r >>> i << i : r, c = [];
    for (let a = 0; a < t.length; a++) {
      let u = t[a];
      if (n && (u = ~u), a === t.length - 1 && (u &= s), u !== 0)
        for (let f = 0; f < o; f++) {
          const d = 1 << o - f - 1;
          u & d && c.push(a * o + f);
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
  rangeDebug: (t, e, n = !1) => `[${it.range(it.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, o = !0) => {
    it.chunkLen(e, n, r);
    const { FULL_MASK: i, BITS: s } = it, c = n % s ? Math.floor(n / s) : void 0, a = n + r, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return it.set(t, c, i >>> s - r << s - r - n, o);
    if (c !== void 0 && !it.set(t, c, i >>> n % s, o))
      return !1;
    const f = c !== void 0 ? c + 1 : n / s, d = u !== void 0 ? u : a / s;
    for (let l = f; l < d; l++)
      if (!it.set(t, l, i, o))
        return !1;
    return !(u !== void 0 && c !== u && !it.set(t, u, i << s - a % s, o));
  }
}, fe = {
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
    t.push(r), n((o, i) => {
      r.field = o, i(), r.field = void 0;
    }), t.pop();
  },
  path: (t) => {
    const e = [];
    for (const n of t)
      n.field !== void 0 && e.push(n.field);
    return e.join("/");
  },
  err: (t, e, n) => {
    const r = new Error(`${t}(${fe.path(e)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (t, e) => {
    const n = e.split("/"), r = t.map((s) => s.obj);
    let o = 0;
    for (; o < n.length && n[o] === ".."; o++)
      r.pop();
    let i = r.pop();
    for (; o < n.length; o++) {
      if (!i || i[n[o]] === void 0)
        return;
      i = i[n[o]];
    }
    return i;
  }
};
class si {
  constructor(e, n = {}, r = [], o = void 0, i = 0) {
    this.data = e, this.opts = n, this.stack = r, this.parent = o, this.parentOffset = i, this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.view = bc(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = it.create(this.data.length), it.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : it.setRange(this.bs, this.data.length, e, n, !1);
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
    return fe.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${F.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = it.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = it.range(e).map(({ pos: r, length: o }) => `(${r}/${o})[${F.encode(this.data.subarray(r, r + o))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${F.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return fe.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new si(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Ht(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (nn(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class Uu {
  constructor(e = []) {
    this.stack = e, this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.view = bc(this.viewBuf);
  }
  pushObj(e, n) {
    return fe.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!Jt(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return fe.err("Reader", this.stack, e);
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
    const n = this.buffers.concat(this.ptrs.map((i) => i.buffer)), r = n.map((i) => i.length).reduce((i, s) => i + s, 0), o = new Uint8Array(r);
    for (let i = 0, s = 0; i < n.length; i++) {
      const c = n[i];
      o.set(c, s), s += c.length;
    }
    for (let i = this.pos, s = 0; s < this.ptrs.length; s++) {
      const c = this.ptrs[s];
      o.set(c.ptr.encode(i), c.pos), i += c.buffer.length;
    }
    if (e) {
      this.buffers = [];
      for (const i of this.ptrs)
        i.buffer.fill(0);
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
const xo = (t) => Uint8Array.from(t).reverse();
function $u(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function Ec(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new Uu();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new si(e, n), o = t.decodeStream(r);
      return r.finish(), o;
    }
  };
}
function It(t, e) {
  if (!Gt(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return Ec({
    size: t.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = e(r);
      } catch (i) {
        throw n.err(i);
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
const kt = (t) => {
  const e = Ec(t);
  return t.validate ? It(e, t.validate) : e;
}, Ir = (t) => Hn(t) && typeof t.decode == "function" && typeof t.encode == "function";
function Gt(t) {
  return Hn(t) && Ir(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || Jt(t.size));
}
function Lu() {
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
      if (!Hn(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Cu = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!Jt(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function Ru(t) {
  if (!Hn(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!Jt(e) || !(e in t))
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
function _u(t, e = !1) {
  if (!Jt(t))
    throw new Error(`decimal/precision: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof e}`);
  const n = 10n ** BigInt(t);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let o = (r < 0n ? -r : r).toString(10), i = o.length - t;
      i < 0 && (o = o.padStart(o.length - i, "0"), i = 0);
      let s = o.length - 1;
      for (; s >= i && o[s] === "0"; s--)
        ;
      let c = o.slice(0, i), a = o.slice(i, s + 1);
      return c || (c = "0"), r < 0n && (c = "-" + c), a ? `${c}.${a}` : c;
    },
    decode: (r) => {
      if (typeof r != "string")
        throw new Error(`expected string, got ${typeof r}`);
      if (r === "-0")
        throw new Error("negative zero is not allowed");
      let o = !1;
      if (r.startsWith("-") && (o = !0, r = r.slice(1)), !/^(0|[1-9]\d*)(\.\d+)?$/.test(r))
        throw new Error(`wrong string value=${r}`);
      let i = r.indexOf(".");
      i = i === -1 ? r.length : i;
      const s = r.slice(0, i), c = r.slice(i + 1).replace(/0+$/, ""), a = BigInt(s) * n;
      if (!e && c.length > t)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${t})`);
      const u = Math.min(c.length, t), f = BigInt(c.slice(0, u)) * 10n ** BigInt(t - u), d = a + f;
      return o ? -d : d;
    }
  };
}
function Ou(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!Ir(e))
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
const xc = (t) => {
  if (!Ir(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, kr = { dict: Lu, numberBigint: Cu, tsEnum: Ru, decimal: _u, match: Ou, reverse: xc }, ci = (t, e = !1, n = !1, r = !0) => {
  if (!Jt(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const o = BigInt(t), i = 2n ** (8n * o - 1n);
  return kt({
    size: r ? t : void 0,
    encodeStream: (s, c) => {
      n && c < 0 && (c = c | i);
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
      const c = s.bytes(r ? t : Math.min(t, s.leftBytes)), a = e ? c : xo(c);
      let u = 0n;
      for (let f = 0; f < a.length; f++)
        u |= BigInt(a[f]) << 8n * BigInt(f);
      return n && u & i && (u = (u ^ i) - i), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return $u(s, 8n * o, !!n), s;
    }
  });
}, Sc = /* @__PURE__ */ ci(32, !1), Jn = /* @__PURE__ */ ci(8, !0), Hu = /* @__PURE__ */ ci(8, !0, !0), Pu = (t, e) => kt({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (o) => e.write(o, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), Pn = (t, e, n) => {
  const r = t * 8, o = 2 ** (r - 1), i = (a) => {
    if (!Jt(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -o || a >= o)
      throw new Error(`sintView: value out of bounds. Expected ${-o} <= ${a} < ${o}`);
  }, s = 2 ** r, c = (a) => {
    if (!Jt(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return Pu(t, {
    write: n.write,
    read: n.read,
    validate: e ? i : c
  });
}, M = /* @__PURE__ */ Pn(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), Vu = /* @__PURE__ */ Pn(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), Fe = /* @__PURE__ */ Pn(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), Xi = /* @__PURE__ */ Pn(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), be = /* @__PURE__ */ Pn(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), q = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = mc(t), r = Ht(t);
  return kt({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (o, i) => {
      r || n.encodeStream(o, i.length), o.bytes(e ? xo(i) : i), r && o.bytes(t);
    },
    decodeStream: (o) => {
      let i;
      if (r) {
        const s = o.find(t);
        if (!s)
          throw o.err("bytes: cannot find terminator");
        i = o.bytes(s - o.pos), o.bytes(t.length);
      } else
        i = o.bytes(t === null ? o.leftBytes : n.decodeStream(o));
      return e ? xo(i) : i;
    },
    validate: (o) => {
      if (!Ht(o))
        throw new Error(`bytes: invalid value ${o}`);
      return o;
    }
  });
};
function Ku(t, e) {
  if (!Gt(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return xe(q(t), xc(e));
}
const ai = (t, e = !1) => It(xe(q(t, e), ku), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), Du = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = xe(q(t, e.isLE), F);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = xe(n, {
    encode: (o) => `0x${o}`,
    decode: (o) => {
      if (!o.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return o.slice(2);
    }
  })), n;
};
function xe(t, e) {
  if (!Gt(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!Ir(e))
    throw new Error(`apply: invalid base value ${t}`);
  return kt({
    size: t.size,
    encodeStream: (n, r) => {
      let o;
      try {
        o = e.decode(r);
      } catch (i) {
        throw n.err("" + i);
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
const Mu = (t, e = !1) => {
  if (!Ht(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return kt({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = nn(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function Fu(t, e, n) {
  if (!Gt(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return kt({
    encodeStream: (r, o) => {
      fe.resolve(r.stack, t) && e.encodeStream(r, o);
    },
    decodeStream: (r) => {
      let o = !1;
      if (o = !!fe.resolve(r.stack, t), o)
        return e.decodeStream(r);
    }
  });
}
function ui(t, e, n = !0) {
  if (!Gt(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return kt({
    size: t.size,
    encodeStream: (r, o) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const o = t.decodeStream(r);
      if (n && typeof o != "object" && o !== e || Ht(e) && !nn(e, o))
        throw r.err(`magic: invalid value: ${o} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Tc(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!Jt(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function dt(t) {
  if (!Hn(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!Gt(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return kt({
    size: Tc(Object.values(t)),
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
function zu(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!Gt(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return kt({
    size: Tc(t),
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
function Bt(t, e) {
  if (!Gt(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = mc(typeof t == "string" ? `../${t}` : t);
  return kt({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, o) => {
      const i = r;
      i.pushObj(o, (s) => {
        Ht(t) || n.encodeStream(r, o.length);
        for (let c = 0; c < o.length; c++)
          s(`${c}`, () => {
            const a = o[c], u = r.pos;
            if (e.encodeStream(r, a), Ht(t)) {
              if (t.length > i.pos - u)
                return;
              const f = i.finish(!1).subarray(u, i.pos);
              if (nn(f.subarray(0, t.length), t))
                throw i.err(`array: inner element encoding same as separator. elm=${a} data=${f}`);
            }
          });
      }), Ht(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const o = [];
      return r.pushObj(o, (i) => {
        if (t === null)
          for (let s = 0; !r.isEnd() && (i(`${s}`, () => o.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); s++)
            ;
        else if (Ht(t))
          for (let s = 0; ; s++) {
            if (nn(r.bytes(t.length, !0), t)) {
              r.bytes(t.length);
              break;
            }
            i(`${s}`, () => o.push(e.decodeStream(r)));
          }
        else {
          let s;
          i("arrayLen", () => s = n.decodeStream(r));
          for (let c = 0; c < s; c++)
            i(`${c}`, () => o.push(e.decodeStream(r)));
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
const Nr = Xt.ProjectivePoint, ur = Xt.CURVE.n, G = ii.isBytes, we = ii.concatBytes, ot = ii.equalBytes, Ac = (t) => xu(Tt(t)), Ot = (...t) => Tt(Tt(we(...t))), vc = Qt.utils.randomPrivateKey, fi = Qt.getPublicKey, Gu = Xt.getPublicKey, Qi = (t) => t.r < ur / 2n;
function Wu(t, e, n = !1) {
  let r = Xt.sign(t, e);
  if (n && !Qi(r)) {
    const o = new Uint8Array(32);
    let i = 0;
    for (; !Qi(r); )
      if (o.set(M.encode(i++)), r = Xt.sign(t, e, { extraEntropy: o }), i > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Ji = Qt.sign, di = Qt.utils.taggedHash;
var St;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})(St || (St = {}));
function rn(t, e) {
  const n = t.length;
  if (e === St.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Nr.fromHex(t), t;
  } else if (e === St.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Qt.utils.lift_x(Qt.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function Bc(t, e) {
  const n = Qt.utils, r = n.taggedHash("TapTweak", t, e), o = n.bytesToNumberBE(r);
  if (o >= ur)
    throw new Error("tweak higher than curve order");
  return o;
}
function qu(t, e = new Uint8Array()) {
  const n = Qt.utils, r = n.bytesToNumberBE(t), o = Nr.fromPrivateKey(r), i = o.hasEvenY() ? r : n.mod(-r, ur), s = n.pointToBytes(o), c = Bc(s, e);
  return n.numberToBytesBE(n.mod(i + c, ur), 32);
}
function Ic(t, e) {
  const n = Qt.utils, r = Bc(t, e), i = n.lift_x(n.bytesToNumberBE(t)).add(Nr.fromPrivateKey(r)), s = i.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(i), s];
}
const dn = Tt(Nr.BASE.toRawBytes(!1)), Oe = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Gn = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function fr(t, e) {
  if (!G(t) || !G(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function kc(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Nc(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Uc(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function on(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function li(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function So(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function dr(t, e) {
  if (!Nc(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function $c(t, e) {
  if (!Nc(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function hi(...t) {
  const e = (i) => i, n = (i, s) => (c) => i(s(c)), r = t.map((i) => i.encode).reduceRight(n, e), o = t.map((i) => i.decode).reduce(n, e);
  return { encode: r, decode: o };
}
// @__NO_SIDE_EFFECTS__
function pi(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  dr("alphabet", e);
  const r = new Map(e.map((o, i) => [o, i]));
  return {
    encode: (o) => (So(o), o.map((i) => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${t}`);
      return e[i];
    })),
    decode: (o) => (So(o), o.map((i) => {
      on("alphabet.decode", i);
      const s = r.get(i);
      if (s === void 0)
        throw new Error(`Unknown letter: "${i}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function wi(t = "") {
  return on("join", t), {
    encode: (e) => (dr("join.decode", e), e.join(t)),
    decode: (e) => (on("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function ju(t, e = "=") {
  return li(t), on("padding", e), {
    encode(n) {
      for (dr("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      dr("padding.decode", n);
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
function Yu(t) {
  return Uc(t), { encode: (e) => e, decode: (e) => t(e) };
}
const Lc = (t, e) => e === 0 ? t : Lc(e, t % e), lr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - Lc(t, e)), tr = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function To(t, e, n, r) {
  if (So(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ lr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ lr(e, n)}`);
  let o = 0, i = 0;
  const s = tr[e], c = tr[n] - 1, a = [];
  for (const u of t) {
    if (li(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (o = o << e | u, i + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${i} from=${e}`);
    for (i += e; i >= n; i -= n)
      a.push((o >> i - n & c) >>> 0);
    const f = tr[i];
    if (f === void 0)
      throw new Error("invalid carry");
    o &= f - 1;
  }
  if (o = o << n - i & c, !r && i >= e)
    throw new Error("Excess padding");
  if (!r && o > 0)
    throw new Error(`Non-zero padding: ${o}`);
  return r && i > 0 && a.push(o >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function gi(t, e = !1) {
  if (li(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ lr(8, t) > 32 || /* @__PURE__ */ lr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!kc(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return To(Array.from(n), 8, t, !e);
    },
    decode: (n) => ($c("radix2.decode", n), Uint8Array.from(To(n, t, 8, e)))
  };
}
function ts(t) {
  return Uc(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const xt = /* @__PURE__ */ hi(/* @__PURE__ */ gi(6), /* @__PURE__ */ pi("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ ju(6), /* @__PURE__ */ wi("")), Ao = /* @__PURE__ */ hi(/* @__PURE__ */ pi("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ wi("")), es = [996825010, 642813549, 513874426, 1027748829, 705979059];
function hn(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < es.length; r++)
    (e >> r & 1) === 1 && (n ^= es[r]);
  return n;
}
function ns(t, e, n = 1) {
  const r = t.length;
  let o = 1;
  for (let i = 0; i < r; i++) {
    const s = t.charCodeAt(i);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${t})`);
    o = hn(o) ^ s >> 5;
  }
  o = hn(o);
  for (let i = 0; i < r; i++)
    o = hn(o) ^ t.charCodeAt(i) & 31;
  for (let i of e)
    o = hn(o) ^ i;
  for (let i = 0; i < 6; i++)
    o = hn(o);
  return o ^= n, Ao.encode(To([o % tr[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Zu(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ gi(5), r = n.decode, o = n.encode, i = ts(r);
  function s(d, l, h = 90) {
    on("bech32.encode prefix", d), kc(l) && (l = Array.from(l)), $c("bech32.encode", l);
    const b = d.length;
    if (b === 0)
      throw new TypeError(`Invalid prefix length ${b}`);
    const w = b + 7 + l.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = d.toLowerCase(), g = ns(p, l, e);
    return `${p}1${Ao.encode(l)}${g}`;
  }
  function c(d, l = 90) {
    on("bech32.decode input", d);
    const h = d.length;
    if (h < 8 || l !== !1 && h > l)
      throw new TypeError(`invalid string length: ${h} (${d}). Expected (8..${l})`);
    const b = d.toLowerCase();
    if (d !== b && d !== d.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = b.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = b.slice(0, w), g = b.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const y = Ao.decode(g).slice(0, -6), E = ns(p, y, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${d}: expected "${E}"`);
    return { prefix: p, words: y };
  }
  const a = ts(c);
  function u(d) {
    const { prefix: l, words: h } = c(d, !1);
    return { prefix: l, words: h, bytes: r(h) };
  }
  function f(d, l) {
    return s(d, o(l));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: f,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: i,
    toWords: o
  };
}
const Wn = /* @__PURE__ */ Zu("bech32m"), H = /* @__PURE__ */ hi(/* @__PURE__ */ gi(4), /* @__PURE__ */ pi("0123456789abcdef"), /* @__PURE__ */ wi(""), /* @__PURE__ */ Yu((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class Cc extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: Rc, pointToBytes: qn } = Qt.utils, Se = Xt.ProjectivePoint, te = 33, vo = new Uint8Array(te), ge = Xt.CURVE.n, rs = xe(q(33), {
  decode: (t) => yi(t) ? vo : t.toRawBytes(!0),
  encode: (t) => tn(t, vo) ? Se.ZERO : Se.fromHex(t)
}), os = It(Sc, (t) => (Ct("n", t, 1n, ge), t)), er = dt({ R1: rs, R2: rs }), _c = dt({ k1: os, k2: os, publicKey: q(te) });
function is(t, ...e) {
}
function Dt(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => At(n, ...e));
}
function ss(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Mt = (t) => at(t, ge), hr = (t, ...e) => Mt(vt(Rc(t, ...e))), pn = (t, e) => t.hasEvenY() ? e : Mt(-e);
function Le(t) {
  return Se.BASE.multiply(t);
}
function yi(t) {
  return t.equals(Se.ZERO);
}
function Bo(t) {
  return Dt(t, te), t.sort(fr);
}
function Oc(t) {
  Dt(t, te);
  for (let e = 1; e < t.length; e++)
    if (!tn(t[e], t[0]))
      return t[e];
  return vo;
}
function Hc(t) {
  return Dt(t, te), Rc("KeyAgg list", ...t);
}
function Pc(t, e, n) {
  return At(t, te), At(e, te), tn(t, e) ? 1n : hr("KeyAgg coefficient", n, t);
}
function Io(t, e = [], n = []) {
  if (Dt(t, te), Dt(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Oc(t), o = Hc(t);
  let i = Se.ZERO;
  for (let a = 0; a < t.length; a++) {
    let u;
    try {
      u = Se.fromHex(t[a]);
    } catch {
      throw new Cc(a, "pubkey");
    }
    i = i.add(u.multiply(Pc(t[a], r, o)));
  }
  let s = 1n, c = 0n;
  for (let a = 0; a < e.length; a++) {
    const u = n[a] && !i.hasEvenY() ? Mt(-1n) : 1n, f = vt(e[a]);
    if (Ct("tweak", f, 0n, ge), i = i.multiply(u).add(Le(f)), yi(i))
      throw new Error("The result of tweaking cannot be infinity");
    s = Mt(u * s), c = Mt(f + u * c);
  }
  return { aggPublicKey: i, gAcc: s, tweakAcc: c };
}
const cs = (t, e, n, r, o, i) => hr("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, o, qt(i.length, 4), i, new Uint8Array([r]));
function Xu(t, e, n = new Uint8Array(0), r, o = new Uint8Array(0), i = Wo(32)) {
  At(t, te), is(e, 32), At(n, 0, 32), is(), At(o), At(i, 32);
  const s = new Uint8Array([0]), c = cs(i, t, n, 0, s, o), a = cs(i, t, n, 1, s, o);
  return {
    secret: _c.encode({ k1: c, k2: a, publicKey: t }),
    public: er.encode({ R1: Le(c), R2: Le(a) })
  };
}
class Qu {
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
  constructor(e, n, r, o = [], i = []) {
    if (Dt(n, 33), Dt(o, 32), ss(i), At(r), o.length !== i.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = Io(n, o, i), { R1: u, R2: f } = er.decode(e);
    this.publicKeys = n, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = hr("MuSig/noncecoef", e, qn(s), r);
    const d = u.add(f.multiply(this.b));
    this.R = yi(d) ? Se.BASE : d, this.e = hr("BIP0340/challenge", qn(this.R), qn(s), r), this.tweaks = o, this.isXonly = i, this.L = Hc(n), this.secondKey = Oc(n);
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
    if (!n.some((i) => tn(i, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Pc(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, u = vt(e);
    if (u >= ge)
      return !1;
    const { R1: f, R2: d } = er.decode(n), l = f.add(d.multiply(s)), h = c.hasEvenY() ? l : l.negate(), b = Se.fromHex(r), w = this.getSessionKeyAggCoeff(b), p = Mt(pn(o, 1n) * i), g = Le(u), y = h.add(b.multiply(Mt(a * w * p)));
    return g.equals(y);
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
    if (At(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: o, gAcc: i, b: s, R: c, e: a } = this, { k1: u, k2: f, publicKey: d } = _c.decode(e);
    e.fill(0, 0, 64), Ct("k1", u, 0n, ge), Ct("k2", f, 0n, ge);
    const l = pn(c, u), h = pn(c, f), b = vt(n);
    Ct("d_", b, 1n, ge);
    const w = Le(b), p = w.toRawBytes(!0);
    if (!tn(p, d))
      throw new Error("Public key does not match nonceGen argument");
    const g = this.getSessionKeyAggCoeff(w), y = pn(o, 1n), E = Mt(y * i * b), A = Mt(l + s * h + a * g * E), v = qt(A, 32);
    if (!r) {
      const B = er.encode({
        R1: Le(u),
        R2: Le(f)
      });
      if (!this.partialSigVerifyInternal(v, B, p))
        throw new Error("Partial signature verification failed");
    }
    return v;
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
    const { publicKeys: o, tweaks: i, isXonly: s } = this;
    if (At(e, 32), Dt(n, 66), Dt(o, te), Dt(i, 32), ss(s), fo(r), n.length !== o.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (i.length !== s.length)
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
    Dt(e, 32);
    const { Q: n, tweakAcc: r, R: o, e: i } = this;
    let s = 0n;
    for (let a = 0; a < e.length; a++) {
      const u = vt(e[a]);
      if (u >= ge)
        throw new Cc(a, "psig");
      s = Mt(s + u);
    }
    const c = pn(n, 1n);
    return s = Mt(s + i * c * r), Ee(qn(o), qt(s, 32));
  }
}
function Ju(t) {
  const e = Xu(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Ur = /* @__PURE__ */ BigInt(0), $r = /* @__PURE__ */ BigInt(1), tf = /* @__PURE__ */ BigInt(2);
function He(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Vn(t) {
  if (!He(t))
    throw new Error("Uint8Array expected");
}
function sn(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const ef = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function cn(t) {
  Vn(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += ef[t[n]];
  return e;
}
function ze(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function bi(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? Ur : BigInt("0x" + t);
}
const ne = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function as(t) {
  if (t >= ne._0 && t <= ne._9)
    return t - ne._0;
  if (t >= ne.A && t <= ne.F)
    return t - (ne.A - 10);
  if (t >= ne.a && t <= ne.f)
    return t - (ne.a - 10);
}
function an(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let o = 0, i = 0; o < n; o++, i += 2) {
    const s = as(t.charCodeAt(i)), c = as(t.charCodeAt(i + 1));
    if (s === void 0 || c === void 0) {
      const a = t[i] + t[i + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + i);
    }
    r[o] = s * 16 + c;
  }
  return r;
}
function Zt(t) {
  return bi(cn(t));
}
function mi(t) {
  return Vn(t), bi(cn(Uint8Array.from(t).reverse()));
}
function Te(t, e) {
  return an(t.toString(16).padStart(e * 2, "0"));
}
function Ei(t, e) {
  return Te(t, e).reverse();
}
function nf(t) {
  return an(ze(t));
}
function yt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = an(e);
    } catch (i) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + i);
    }
  else if (He(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const o = r.length;
  if (typeof n == "number" && o !== n)
    throw new Error(t + " of length " + n + " expected, got " + o);
  return r;
}
function Pe(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Vn(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const i = t[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
function rf(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function of(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const qr = (t) => typeof t == "bigint" && Ur <= t;
function un(t, e, n) {
  return qr(t) && qr(e) && qr(n) && e <= t && t < n;
}
function me(t, e, n, r) {
  if (!un(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Vc(t) {
  let e;
  for (e = 0; t > Ur; t >>= $r, e += 1)
    ;
  return e;
}
function sf(t, e) {
  return t >> BigInt(e) & $r;
}
function cf(t, e, n) {
  return t | (n ? $r : Ur) << BigInt(e);
}
const xi = (t) => (tf << BigInt(t - 1)) - $r, jr = (t) => new Uint8Array(t), us = (t) => Uint8Array.from(t);
function Kc(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = jr(t), o = jr(t), i = 0;
  const s = () => {
    r.fill(1), o.fill(0), i = 0;
  }, c = (...d) => n(o, r, ...d), a = (d = jr()) => {
    o = c(us([0]), d), r = c(), d.length !== 0 && (o = c(us([1]), d), r = c());
  }, u = () => {
    if (i++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let d = 0;
    const l = [];
    for (; d < e; ) {
      r = c();
      const h = r.slice();
      l.push(h), d += r.length;
    }
    return Pe(...l);
  };
  return (d, l) => {
    s(), a(d);
    let h;
    for (; !(h = l(u())); )
      a();
    return s(), h;
  };
}
const af = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || He(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function Kn(t, e, n = {}) {
  const r = (o, i, s) => {
    const c = af[i];
    if (typeof c != "function")
      throw new Error("invalid validator function");
    const a = t[o];
    if (!(s && a === void 0) && !c(a, t))
      throw new Error("param " + String(o) + " is invalid. Expected " + i + ", got " + a);
  };
  for (const [o, i] of Object.entries(e))
    r(o, i, !1);
  for (const [o, i] of Object.entries(n))
    r(o, i, !0);
  return t;
}
const uf = () => {
  throw new Error("not implemented");
};
function ko(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const o = e.get(n);
    if (o !== void 0)
      return o;
    const i = t(n, ...r);
    return e.set(n, i), i;
  };
}
const ff = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: me,
  abool: sn,
  abytes: Vn,
  bitGet: sf,
  bitLen: Vc,
  bitMask: xi,
  bitSet: cf,
  bytesToHex: cn,
  bytesToNumberBE: Zt,
  bytesToNumberLE: mi,
  concatBytes: Pe,
  createHmacDrbg: Kc,
  ensureBytes: yt,
  equalBytes: rf,
  hexToBytes: an,
  hexToNumber: bi,
  inRange: un,
  isBytes: He,
  memoized: ko,
  notImplemented: uf,
  numberToBytesBE: Te,
  numberToBytesLE: Ei,
  numberToHexUnpadded: ze,
  numberToVarBytesBE: nf,
  utf8ToBytes: of,
  validateObject: Kn
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const Si = 2n ** 256n, qe = Si - 0x1000003d1n, Dc = Si - 0x14551231950b75fc4402da1732fc9bebfn, df = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, lf = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, Ti = {
  n: Dc,
  a: 0n,
  b: 7n
}, mn = 32, fs = (t) => L(L(t * t) * t + Ti.b), bt = (t = "") => {
  throw new Error(t);
}, Lr = (t) => typeof t == "bigint", Mc = (t) => typeof t == "string", Yr = (t) => Lr(t) && 0n < t && t < qe, Fc = (t) => Lr(t) && 0n < t && t < Dc, hf = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", No = (t, e) => (
  // assert is Uint8Array (of specific length)
  !hf(t) || typeof e == "number" && e > 0 && t.length !== e ? bt("Uint8Array expected") : t
), zc = (t) => new Uint8Array(t), Gc = (t, e) => No(Mc(t) ? Ai(t) : zc(No(t)), e), L = (t, e = qe) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, ds = (t) => t instanceof fn ? t : bt("Point expected");
let fn = class De {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? yn : new De(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = Gc(e);
    let n;
    const r = e[0], o = e.subarray(1), i = hs(o, 0, mn), s = e.length;
    if (s === 33 && [2, 3].includes(r)) {
      Yr(i) || bt("Point hex invalid: x not FE");
      let c = gf(fs(i));
      const a = (c & 1n) === 1n;
      (r & 1) === 1 !== a && (c = L(-c)), n = new De(i, c, 1n);
    }
    return s === 65 && r === 4 && (n = new De(i, hs(o, mn, 2 * mn), 1n)), n ? n.ok() : bt("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return En.mul(yf(e));
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
    const { px: n, py: r, pz: o } = this, { px: i, py: s, pz: c } = ds(e), a = L(n * c), u = L(i * o), f = L(r * c), d = L(s * o);
    return a === u && f === d;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new De(this.px, L(-this.py), this.pz);
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
    const { px: n, py: r, pz: o } = this, { px: i, py: s, pz: c } = ds(e), { a, b: u } = Ti;
    let f = 0n, d = 0n, l = 0n;
    const h = L(u * 3n);
    let b = L(n * i), w = L(r * s), p = L(o * c), g = L(n + r), y = L(i + s);
    g = L(g * y), y = L(b + w), g = L(g - y), y = L(n + o);
    let E = L(i + c);
    return y = L(y * E), E = L(b + p), y = L(y - E), E = L(r + o), f = L(s + c), E = L(E * f), f = L(w + p), E = L(E - f), l = L(a * y), f = L(h * p), l = L(f + l), f = L(w - l), l = L(w + l), d = L(f * l), w = L(b + b), w = L(w + b), p = L(a * p), y = L(h * y), w = L(w + p), p = L(b - p), p = L(a * p), y = L(y + p), b = L(w * y), d = L(d + b), b = L(E * y), f = L(g * f), f = L(f - b), b = L(g * w), l = L(E * l), l = L(l + b), new De(f, d, l);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return yn;
    if (Fc(e) || bt("scalar invalid"), this.equals(En))
      return mf(e).p;
    let r = yn, o = En;
    for (let i = this; e > 0n; i = i.double(), e >>= 1n)
      e & 1n ? r = r.add(i) : n && (o = o.add(i));
    return r;
  }
  mulAddQUns(e, n, r) {
    return this.mul(n, !1).add(e.mul(r, !1)).ok();
  }
  // to private keys. Doesn't use Shamir trick
  /** Convert point to 2d xy affine point. (x, y, z) ∋ (x=x/z, y=y/z) */
  toAffine() {
    const { px: e, py: n, pz: r } = this;
    if (this.equals(yn))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const o = wf(r, qe);
    return L(r * o) !== 1n && bt("inverse invalid"), { x: L(e * o), y: L(n * o) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!Yr(e) || !Yr(n)) && bt("Point invalid: x or y"), L(n * n) === fs(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : bt("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + ps(n) + (e ? "" : ps(r));
  }
  toRawBytes(e = !0) {
    return Ai(this.toHex(e));
  }
};
fn.BASE = new fn(df, lf, 1n);
fn.ZERO = new fn(0n, 1n, 0n);
const { BASE: En, ZERO: yn } = fn, Wc = (t, e) => t.toString(16).padStart(e, "0"), qc = (t) => Array.from(No(t)).map((e) => Wc(e, 2)).join(""), re = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, ls = (t) => {
  if (t >= re._0 && t <= re._9)
    return t - re._0;
  if (t >= re.A && t <= re.F)
    return t - (re.A - 10);
  if (t >= re.a && t <= re.f)
    return t - (re.a - 10);
}, Ai = (t) => {
  const e = "hex invalid";
  if (!Mc(t))
    return bt(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return bt(e);
  const o = zc(r);
  for (let i = 0, s = 0; i < r; i++, s += 2) {
    const c = ls(t.charCodeAt(s)), a = ls(t.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return bt(e);
    o[i] = c * 16 + a;
  }
  return o;
}, jc = (t) => BigInt("0x" + (qc(t) || "0")), hs = (t, e, n) => jc(t.slice(e, n)), pf = (t) => Lr(t) && t >= 0n && t < Si ? Ai(Wc(t, 2 * mn)) : bt("bigint expected"), ps = (t) => qc(pf(t)), wf = (t, e) => {
  (t === 0n || e <= 0n) && bt("no inverse n=" + t + " mod=" + e);
  let n = L(t, e), r = e, o = 0n, i = 1n;
  for (; n !== 0n; ) {
    const s = r / n, c = r % n, a = o - i * s;
    r = n, n = c, o = i, i = a;
  }
  return r === 1n ? L(o, e) : bt("no inverse");
}, gf = (t) => {
  let e = 1n;
  for (let n = t, r = (qe + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % qe), n = n * n % qe;
  return L(e * e) === t ? e : bt("sqrt invalid");
}, yf = (t) => (Lr(t) || (t = jc(Gc(t, mn))), Fc(t) ? t : bt("private key invalid 3")), Ue = 8, bf = () => {
  const t = [], e = 256 / Ue + 1;
  let n = En, r = n;
  for (let o = 0; o < e; o++) {
    r = n, t.push(r);
    for (let i = 1; i < 2 ** (Ue - 1); i++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let ws;
const mf = (t) => {
  const e = ws || (ws = bf()), n = (f, d) => {
    let l = d.negate();
    return f ? l : d;
  };
  let r = yn, o = En;
  const i = 1 + 256 / Ue, s = 2 ** (Ue - 1), c = BigInt(2 ** Ue - 1), a = 2 ** Ue, u = BigInt(Ue);
  for (let f = 0; f < i; f++) {
    const d = f * s;
    let l = Number(t & c);
    t >>= u, l > s && (l -= a, t += 1n);
    const h = d, b = d + Math.abs(l) - 1, w = f % 2 !== 0, p = l < 0;
    l === 0 ? o = o.add(n(w, e[h])) : r = r.add(n(p, e[b]));
  }
  return { p: r, f: o };
};
function gs(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Ef(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Cr(t, ...e) {
  if (!Ef(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function xf(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  gs(t.outputLen), gs(t.blockLen);
}
function pr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Sf(t, e) {
  Cr(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const Ke = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Zr = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), Yt = (t, e) => t << 32 - e | t >>> e;
function Tf(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function vi(t) {
  return typeof t == "string" && (t = Tf(t)), Cr(t), t;
}
function Af(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const o = t[r];
    Cr(o), e += o.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, o = 0; r < t.length; r++) {
    const i = t[r];
    n.set(i, o), o += i.length;
  }
  return n;
}
class Yc {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function vf(t) {
  const e = (r) => t().update(vi(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Zc(t = 32) {
  if (Ke && typeof Ke.getRandomValues == "function")
    return Ke.getRandomValues(new Uint8Array(t));
  if (Ke && typeof Ke.randomBytes == "function")
    return Ke.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Bf(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const o = BigInt(32), i = BigInt(4294967295), s = Number(n >> o & i), c = Number(n & i), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
const If = (t, e, n) => t & e ^ ~t & n, kf = (t, e, n) => t & e ^ t & n ^ e & n;
class Nf extends Yc {
  constructor(e, n, r, o) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = o, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Zr(this.buffer);
  }
  update(e) {
    pr(this);
    const { view: n, buffer: r, blockLen: o } = this;
    e = vi(e);
    const i = e.length;
    for (let s = 0; s < i; ) {
      const c = Math.min(o - this.pos, i - s);
      if (c === o) {
        const a = Zr(e);
        for (; o <= i - s; s += o)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === o && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    pr(this), Sf(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: o, isLE: i } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > o - s && (this.process(r, 0), s = 0);
    for (let d = s; d < o; d++)
      n[d] = 0;
    Bf(r, o - 8, BigInt(this.length * 8), i), this.process(r, 0);
    const c = Zr(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, f = this.get();
    if (u > f.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let d = 0; d < u; d++)
      c.setUint32(4 * d, f[d], i);
  }
  digest() {
    const { buffer: e, outputLen: n } = this;
    this.digestInto(e);
    const r = e.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(e) {
    e || (e = new this.constructor()), e.set(...this.get());
    const { blockLen: n, buffer: r, length: o, finished: i, destroyed: s, pos: c } = this;
    return e.length = o, e.pos = c, e.finished = i, e.destroyed = s, o % n && e.buffer.set(r), e;
  }
}
const Uf = /* @__PURE__ */ new Uint32Array([
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
]), he = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), pe = /* @__PURE__ */ new Uint32Array(64);
class $f extends Nf {
  constructor() {
    super(64, 32, 8, !1), this.A = he[0] | 0, this.B = he[1] | 0, this.C = he[2] | 0, this.D = he[3] | 0, this.E = he[4] | 0, this.F = he[5] | 0, this.G = he[6] | 0, this.H = he[7] | 0;
  }
  get() {
    const { A: e, B: n, C: r, D: o, E: i, F: s, G: c, H: a } = this;
    return [e, n, r, o, i, s, c, a];
  }
  // prettier-ignore
  set(e, n, r, o, i, s, c, a) {
    this.A = e | 0, this.B = n | 0, this.C = r | 0, this.D = o | 0, this.E = i | 0, this.F = s | 0, this.G = c | 0, this.H = a | 0;
  }
  process(e, n) {
    for (let d = 0; d < 16; d++, n += 4)
      pe[d] = e.getUint32(n, !1);
    for (let d = 16; d < 64; d++) {
      const l = pe[d - 15], h = pe[d - 2], b = Yt(l, 7) ^ Yt(l, 18) ^ l >>> 3, w = Yt(h, 17) ^ Yt(h, 19) ^ h >>> 10;
      pe[d] = w + pe[d - 7] + b + pe[d - 16] | 0;
    }
    let { A: r, B: o, C: i, D: s, E: c, F: a, G: u, H: f } = this;
    for (let d = 0; d < 64; d++) {
      const l = Yt(c, 6) ^ Yt(c, 11) ^ Yt(c, 25), h = f + l + If(c, a, u) + Uf[d] + pe[d] | 0, w = (Yt(r, 2) ^ Yt(r, 13) ^ Yt(r, 22)) + kf(r, o, i) | 0;
      f = u, u = a, a = c, c = s + h | 0, s = i, i = o, o = r, r = h + w | 0;
    }
    r = r + this.A | 0, o = o + this.B | 0, i = i + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, f = f + this.H | 0, this.set(r, o, i, s, c, a, u, f);
  }
  roundClean() {
    pe.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const Uo = /* @__PURE__ */ vf(() => new $f());
class Xc extends Yc {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, xf(e);
    const r = vi(n);
    if (this.iHash = e.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const o = this.blockLen, i = new Uint8Array(o);
    i.set(r.length > o ? e.create().update(r).digest() : r);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = e.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), i.fill(0);
  }
  update(e) {
    return pr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    pr(this), Cr(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
  }
  digest() {
    const e = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(e), e;
  }
  _cloneInto(e) {
    e || (e = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash: n, iHash: r, finished: o, destroyed: i, blockLen: s, outputLen: c } = this;
    return e = e, e.finished = o, e.destroyed = i, e.blockLen = s, e.outputLen = c, e.oHash = n._cloneInto(e.oHash), e.iHash = r._cloneInto(e.iHash), e;
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const Qc = (t, e, n) => new Xc(t, e).update(n).digest();
Qc.create = (t, e) => new Xc(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ft = BigInt(0), J = BigInt(1), $e = /* @__PURE__ */ BigInt(2), Lf = /* @__PURE__ */ BigInt(3), $o = /* @__PURE__ */ BigInt(4), ys = /* @__PURE__ */ BigInt(5), bs = /* @__PURE__ */ BigInt(8);
function ht(t, e) {
  const n = t % e;
  return n >= ft ? n : e + n;
}
function Cf(t, e, n) {
  if (e < ft)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= ft)
    throw new Error("invalid modulus");
  if (n === J)
    return ft;
  let r = J;
  for (; e > ft; )
    e & J && (r = r * t % n), t = t * t % n, e >>= J;
  return r;
}
function _t(t, e, n) {
  let r = t;
  for (; e-- > ft; )
    r *= r, r %= n;
  return r;
}
function Lo(t, e) {
  if (t === ft)
    throw new Error("invert: expected non-zero number");
  if (e <= ft)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = ht(t, e), r = e, o = ft, i = J;
  for (; n !== ft; ) {
    const c = r / n, a = r % n, u = o - i * c;
    r = n, n = a, o = i, i = u;
  }
  if (r !== J)
    throw new Error("invert: does not exist");
  return ht(o, e);
}
function Rf(t) {
  const e = (t - J) / $e;
  let n, r, o;
  for (n = t - J, r = 0; n % $e === ft; n /= $e, r++)
    ;
  for (o = $e; o < t && Cf(o, e, t) !== t - J; o++)
    if (o > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + J) / $o;
    return function(a, u) {
      const f = a.pow(u, s);
      if (!a.eql(a.sqr(f), u))
        throw new Error("Cannot find square root");
      return f;
    };
  }
  const i = (n + J) / $e;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, f = c.pow(c.mul(c.ONE, o), n), d = c.pow(a, i), l = c.pow(a, n);
    for (; !c.eql(l, c.ONE); ) {
      if (c.eql(l, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(l); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const b = c.pow(f, J << BigInt(u - h - 1));
      f = c.sqr(b), d = c.mul(d, b), l = c.mul(l, f), u = h;
    }
    return d;
  };
}
function _f(t) {
  if (t % $o === Lf) {
    const e = (t + J) / $o;
    return function(r, o) {
      const i = r.pow(o, e);
      if (!r.eql(r.sqr(i), o))
        throw new Error("Cannot find square root");
      return i;
    };
  }
  if (t % bs === ys) {
    const e = (t - ys) / bs;
    return function(r, o) {
      const i = r.mul(o, $e), s = r.pow(i, e), c = r.mul(o, s), a = r.mul(r.mul(c, $e), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), o))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return Rf(t);
}
const Of = [
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
function Hf(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Of.reduce((r, o) => (r[o] = "function", r), e);
  return Kn(t, n);
}
function Pf(t, e, n) {
  if (n < ft)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ft)
    return t.ONE;
  if (n === J)
    return e;
  let r = t.ONE, o = e;
  for (; n > ft; )
    n & J && (r = t.mul(r, o)), o = t.sqr(o), n >>= J;
  return r;
}
function Vf(t, e) {
  const n = new Array(e.length), r = e.reduce((i, s, c) => t.is0(s) ? i : (n[c] = i, t.mul(i, s)), t.ONE), o = t.inv(r);
  return e.reduceRight((i, s, c) => t.is0(s) ? i : (n[c] = t.mul(i, n[c]), t.mul(i, s)), o), n;
}
function Jc(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function ta(t, e, n = !1, r = {}) {
  if (t <= ft)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: o, nByteLength: i } = Jc(t, e);
  if (i > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    BITS: o,
    BYTES: i,
    MASK: xi(o),
    ZERO: ft,
    ONE: J,
    create: (a) => ht(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return ft <= a && a < t;
    },
    is0: (a) => a === ft,
    isOdd: (a) => (a & J) === J,
    neg: (a) => ht(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => ht(a * a, t),
    add: (a, u) => ht(a + u, t),
    sub: (a, u) => ht(a - u, t),
    mul: (a, u) => ht(a * u, t),
    pow: (a, u) => Pf(c, a, u),
    div: (a, u) => ht(a * Lo(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => Lo(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = _f(t)), s(c, a))),
    invertBatch: (a) => Vf(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, f) => f ? u : a,
    toBytes: (a) => n ? Ei(a, i) : Te(a, i),
    fromBytes: (a) => {
      if (a.length !== i)
        throw new Error("Field.fromBytes: expected " + i + " bytes, got " + a.length);
      return n ? mi(a) : Zt(a);
    }
  });
  return Object.freeze(c);
}
function ea(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function na(t) {
  const e = ea(t);
  return e + Math.ceil(e / 2);
}
function Kf(t, e, n = !1) {
  const r = t.length, o = ea(e), i = na(e);
  if (r < 16 || r < i || r > 1024)
    throw new Error("expected " + i + "-1024 bytes of input, got " + r);
  const s = n ? Zt(t) : mi(t), c = ht(s, e - J) + J;
  return n ? Ei(c, o) : Te(c, o);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ms = BigInt(0), jn = BigInt(1);
function Xr(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function ra(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Qr(t, e) {
  ra(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function Df(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function Mf(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Jr = /* @__PURE__ */ new WeakMap(), oa = /* @__PURE__ */ new WeakMap();
function to(t) {
  return oa.get(t) || 1;
}
function Ff(t, e) {
  return {
    constTimeNegate: Xr,
    hasPrecomputes(n) {
      return to(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, o = t.ZERO) {
      let i = n;
      for (; r > ms; )
        r & jn && (o = o.add(i)), i = i.double(), r >>= jn;
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
      const { windows: o, windowSize: i } = Qr(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < o; u++) {
        a = c, s.push(a);
        for (let f = 1; f < i; f++)
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
    wNAF(n, r, o) {
      const { windows: i, windowSize: s } = Qr(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), f = 2 ** n, d = BigInt(n);
      for (let l = 0; l < i; l++) {
        const h = l * s;
        let b = Number(o & u);
        o >>= d, b > s && (b -= f, o += jn);
        const w = h, p = h + Math.abs(b) - 1, g = l % 2 !== 0, y = b < 0;
        b === 0 ? a = a.add(Xr(g, r[w])) : c = c.add(Xr(y, r[p]));
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
    wNAFUnsafe(n, r, o, i = t.ZERO) {
      const { windows: s, windowSize: c } = Qr(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, f = BigInt(n);
      for (let d = 0; d < s; d++) {
        const l = d * c;
        if (o === ms)
          break;
        let h = Number(o & a);
        if (o >>= f, h > c && (h -= u, o += jn), h === 0)
          continue;
        let b = r[l + Math.abs(h) - 1];
        h < 0 && (b = b.negate()), i = i.add(b);
      }
      return i;
    },
    getPrecomputes(n, r, o) {
      let i = Jr.get(r);
      return i || (i = this.precomputeWindow(r, n), n !== 1 && Jr.set(r, o(i))), i;
    },
    wNAFCached(n, r, o) {
      const i = to(n);
      return this.wNAF(i, this.getPrecomputes(i, n, o), r);
    },
    wNAFCachedUnsafe(n, r, o, i) {
      const s = to(n);
      return s === 1 ? this.unsafeLadder(n, r, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, o), r, i);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      ra(r, e), oa.set(n, r), Jr.delete(n);
    }
  };
}
function zf(t, e, n, r) {
  if (Df(n, t), Mf(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const o = t.ZERO, i = Vc(BigInt(n.length)), s = i > 12 ? i - 3 : i > 4 ? i - 2 : i ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(o), u = Math.floor((e.BITS - 1) / s) * s;
  let f = o;
  for (let d = u; d >= 0; d -= s) {
    a.fill(o);
    for (let h = 0; h < r.length; h++) {
      const b = r[h], w = Number(b >> BigInt(d) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let l = o;
    for (let h = a.length - 1, b = o; h > 0; h--)
      b = b.add(a[h]), l = l.add(b);
    if (f = f.add(l), d !== 0)
      for (let h = 0; h < s; h++)
        f = f.double();
  }
  return f;
}
function ia(t) {
  return Hf(t.Fp), Kn(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Jc(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Es(t) {
  t.lowS !== void 0 && sn("lowS", t.lowS), t.prehash !== void 0 && sn("prehash", t.prehash);
}
function Gf(t) {
  const e = ia(t);
  Kn(e, {
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
const { bytesToNumberBE: Wf, hexToBytes: qf } = ff, ie = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = ie;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = e.length / 2, o = ze(r);
      if (o.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const i = r > 127 ? ze(o.length / 2 | 128) : "";
      return ze(t) + i + o + e;
    },
    // v - value, l - left bytes (unparsed)
    decode(t, e) {
      const { Err: n } = ie;
      let r = 0;
      if (t < 0 || t > 256)
        throw new n("tlv.encode: wrong tag");
      if (e.length < 2 || e[r++] !== t)
        throw new n("tlv.decode: wrong tlv");
      const o = e[r++], i = !!(o & 128);
      let s = 0;
      if (!i)
        s = o;
      else {
        const a = o & 127;
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
      const { Err: e } = ie;
      if (t < ce)
        throw new e("integer: negative integers are not allowed");
      let n = ze(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = ie;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return Wf(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = ie, o = typeof t == "string" ? qf(t) : t;
    Vn(o);
    const { v: i, l: s } = r.decode(48, o);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, i), { v: u, l: f } = r.decode(2, a);
    if (f.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = ie, r = e.encode(2, n.encode(t.r)), o = e.encode(2, n.encode(t.s)), i = r + o;
    return e.encode(48, i);
  }
}, ce = BigInt(0), ct = BigInt(1);
BigInt(2);
const xs = BigInt(3);
BigInt(4);
function jf(t) {
  const e = Gf(t), { Fp: n } = e, r = ta(e.n, e.nBitLength), o = e.toBytes || ((w, p, g) => {
    const y = p.toAffine();
    return Pe(Uint8Array.from([4]), n.toBytes(y.x), n.toBytes(y.y));
  }), i = e.fromBytes || ((w) => {
    const p = w.subarray(1), g = n.fromBytes(p.subarray(0, n.BYTES)), y = n.fromBytes(p.subarray(n.BYTES, 2 * n.BYTES));
    return { x: g, y };
  });
  function s(w) {
    const { a: p, b: g } = e, y = n.sqr(w), E = n.mul(y, w);
    return n.add(n.add(E, n.mul(w, p)), g);
  }
  if (!n.eql(n.sqr(e.Gy), s(e.Gx)))
    throw new Error("bad generator point: equation left != right");
  function c(w) {
    return un(w, ct, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: y, n: E } = e;
    if (p && typeof w != "bigint") {
      if (He(w) && (w = cn(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let A;
    try {
      A = typeof w == "bigint" ? w : Zt(yt("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return y && (A = ht(A, E)), me("private key", A, ct, E), A;
  }
  function u(w) {
    if (!(w instanceof l))
      throw new Error("ProjectivePoint expected");
  }
  const f = ko((w, p) => {
    const { px: g, py: y, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y };
    const A = w.is0();
    p == null && (p = A ? n.ONE : n.inv(E));
    const v = n.mul(g, p), B = n.mul(y, p), m = n.mul(E, p);
    if (A)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(m, n.ONE))
      throw new Error("invZ was invalid");
    return { x: v, y: B };
  }), d = ko((w) => {
    if (w.is0()) {
      if (e.allowInfinityPoint && !n.is0(w.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x: p, y: g } = w.toAffine();
    if (!n.isValid(p) || !n.isValid(g))
      throw new Error("bad point: x or y not FE");
    const y = n.sqr(g), E = s(p);
    if (!n.eql(y, E))
      throw new Error("bad point: equation left != right");
    if (!w.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  class l {
    constructor(p, g, y) {
      if (this.px = p, this.py = g, this.pz = y, p == null || !n.isValid(p))
        throw new Error("x required");
      if (g == null || !n.isValid(g))
        throw new Error("y required");
      if (y == null || !n.isValid(y))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x: g, y } = p || {};
      if (!p || !n.isValid(g) || !n.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof l)
        throw new Error("projective point not allowed");
      const E = (A) => n.eql(A, n.ZERO);
      return E(g) && E(y) ? l.ZERO : new l(g, y, n.ONE);
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
      const g = n.invertBatch(p.map((y) => y.pz));
      return p.map((y, E) => y.toAffine(g[E])).map(l.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(p) {
      const g = l.fromAffine(i(yt("pointHex", p)));
      return g.assertValidity(), g;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return l.BASE.multiply(a(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return zf(l, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      b.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      d(this);
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
      const { px: g, py: y, pz: E } = this, { px: A, py: v, pz: B } = p, m = n.eql(n.mul(g, B), n.mul(A, E)), k = n.eql(n.mul(y, B), n.mul(v, E));
      return m && k;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new l(this.px, n.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: p, b: g } = e, y = n.mul(g, xs), { px: E, py: A, pz: v } = this;
      let B = n.ZERO, m = n.ZERO, k = n.ZERO, I = n.mul(E, E), O = n.mul(A, A), C = n.mul(v, v), $ = n.mul(E, A);
      return $ = n.add($, $), k = n.mul(E, v), k = n.add(k, k), B = n.mul(p, k), m = n.mul(y, C), m = n.add(B, m), B = n.sub(O, m), m = n.add(O, m), m = n.mul(B, m), B = n.mul($, B), k = n.mul(y, k), C = n.mul(p, C), $ = n.sub(I, C), $ = n.mul(p, $), $ = n.add($, k), k = n.add(I, I), I = n.add(k, I), I = n.add(I, C), I = n.mul(I, $), m = n.add(m, I), C = n.mul(A, v), C = n.add(C, C), I = n.mul(C, $), B = n.sub(B, I), k = n.mul(C, O), k = n.add(k, k), k = n.add(k, k), new l(B, m, k);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: y, pz: E } = this, { px: A, py: v, pz: B } = p;
      let m = n.ZERO, k = n.ZERO, I = n.ZERO;
      const O = e.a, C = n.mul(e.b, xs);
      let $ = n.mul(g, A), D = n.mul(y, v), x = n.mul(E, B), S = n.add(g, y), T = n.add(A, v);
      S = n.mul(S, T), T = n.add($, D), S = n.sub(S, T), T = n.add(g, E);
      let N = n.add(A, B);
      return T = n.mul(T, N), N = n.add($, x), T = n.sub(T, N), N = n.add(y, E), m = n.add(v, B), N = n.mul(N, m), m = n.add(D, x), N = n.sub(N, m), I = n.mul(O, T), m = n.mul(C, x), I = n.add(m, I), m = n.sub(D, I), I = n.add(D, I), k = n.mul(m, I), D = n.add($, $), D = n.add(D, $), x = n.mul(O, x), T = n.mul(C, T), D = n.add(D, x), x = n.sub($, x), x = n.mul(O, x), T = n.add(T, x), $ = n.mul(D, T), k = n.add(k, $), $ = n.mul(N, T), m = n.mul(S, m), m = n.sub(m, $), $ = n.mul(S, D), I = n.mul(N, I), I = n.add(I, $), new l(m, k, I);
    }
    subtract(p) {
      return this.add(p.negate());
    }
    is0() {
      return this.equals(l.ZERO);
    }
    wNAF(p) {
      return b.wNAFCached(this, p, l.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(p) {
      const { endo: g, n: y } = e;
      me("scalar", p, ce, y);
      const E = l.ZERO;
      if (p === ce)
        return E;
      if (this.is0() || p === ct)
        return this;
      if (!g || b.hasPrecomputes(this))
        return b.wNAFCachedUnsafe(this, p, l.normalizeZ);
      let { k1neg: A, k1: v, k2neg: B, k2: m } = g.splitScalar(p), k = E, I = E, O = this;
      for (; v > ce || m > ce; )
        v & ct && (k = k.add(O)), m & ct && (I = I.add(O)), O = O.double(), v >>= ct, m >>= ct;
      return A && (k = k.negate()), B && (I = I.negate()), I = new l(n.mul(I.px, g.beta), I.py, I.pz), k.add(I);
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
      const { endo: g, n: y } = e;
      me("scalar", p, ct, y);
      let E, A;
      if (g) {
        const { k1neg: v, k1: B, k2neg: m, k2: k } = g.splitScalar(p);
        let { p: I, f: O } = this.wNAF(B), { p: C, f: $ } = this.wNAF(k);
        I = b.constTimeNegate(v, I), C = b.constTimeNegate(m, C), C = new l(n.mul(C.px, g.beta), C.py, C.pz), E = I.add(C), A = O.add($);
      } else {
        const { p: v, f: B } = this.wNAF(p);
        E = v, A = B;
      }
      return l.normalizeZ([E, A])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, y) {
      const E = l.BASE, A = (B, m) => m === ce || m === ct || !B.equals(E) ? B.multiplyUnsafe(m) : B.multiply(m), v = A(this, g).add(A(p, y));
      return v.is0() ? void 0 : v;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return f(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = e;
      if (p === ct)
        return !0;
      if (g)
        return g(l, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = e;
      return p === ct ? this : g ? g(l, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(p = !0) {
      return sn("isCompressed", p), this.assertValidity(), o(l, this, p);
    }
    toHex(p = !0) {
      return sn("isCompressed", p), cn(this.toRawBytes(p));
    }
  }
  l.BASE = new l(e.Gx, e.Gy, n.ONE), l.ZERO = new l(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, b = Ff(l, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: l,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function Yf(t) {
  const e = ia(t);
  return Kn(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function Zf(t) {
  const e = Yf(t), { Fp: n, n: r } = e, o = n.BYTES + 1, i = 2 * n.BYTES + 1;
  function s(x) {
    return ht(x, r);
  }
  function c(x) {
    return Lo(x, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: f, isWithinCurveOrder: d } = jf({
    ...e,
    toBytes(x, S, T) {
      const N = S.toAffine(), U = n.toBytes(N.x), _ = Pe;
      return sn("isCompressed", T), T ? _(Uint8Array.from([S.hasEvenY() ? 2 : 3]), U) : _(Uint8Array.from([4]), U, n.toBytes(N.y));
    },
    fromBytes(x) {
      const S = x.length, T = x[0], N = x.subarray(1);
      if (S === o && (T === 2 || T === 3)) {
        const U = Zt(N);
        if (!un(U, ct, n.ORDER))
          throw new Error("Point is not on curve");
        const _ = f(U);
        let V;
        try {
          V = n.sqrt(_);
        } catch (j) {
          const K = j instanceof Error ? ": " + j.message : "";
          throw new Error("Point is not on curve" + K);
        }
        const P = (V & ct) === ct;
        return (T & 1) === 1 !== P && (V = n.neg(V)), { x: U, y: V };
      } else if (S === i && T === 4) {
        const U = n.fromBytes(N.subarray(0, n.BYTES)), _ = n.fromBytes(N.subarray(n.BYTES, 2 * n.BYTES));
        return { x: U, y: _ };
      } else {
        const U = o, _ = i;
        throw new Error("invalid Point, expected length of " + U + ", or uncompressed " + _ + ", got " + S);
      }
    }
  }), l = (x) => cn(Te(x, e.nByteLength));
  function h(x) {
    const S = r >> ct;
    return x > S;
  }
  function b(x) {
    return h(x) ? s(-x) : x;
  }
  const w = (x, S, T) => Zt(x.slice(S, T));
  class p {
    constructor(S, T, N) {
      this.r = S, this.s = T, this.recovery = N, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(S) {
      const T = e.nByteLength;
      return S = yt("compactSignature", S, T * 2), new p(w(S, 0, T), w(S, T, 2 * T));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(S) {
      const { r: T, s: N } = ie.toSig(yt("DER", S));
      return new p(T, N);
    }
    assertValidity() {
      me("r", this.r, ct, r), me("s", this.s, ct, r);
    }
    addRecoveryBit(S) {
      return new p(this.r, this.s, S);
    }
    recoverPublicKey(S) {
      const { r: T, s: N, recovery: U } = this, _ = B(yt("msgHash", S));
      if (U == null || ![0, 1, 2, 3].includes(U))
        throw new Error("recovery id invalid");
      const V = U === 2 || U === 3 ? T + e.n : T;
      if (V >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const P = (U & 1) === 0 ? "02" : "03", et = a.fromHex(P + l(V)), j = c(V), K = s(-_ * j), Nt = s(N * j), lt = a.BASE.multiplyAndAddUnsafe(et, K, Nt);
      if (!lt)
        throw new Error("point at infinify");
      return lt.assertValidity(), lt;
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
      return an(this.toDERHex());
    }
    toDERHex() {
      return ie.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return an(this.toCompactHex());
    }
    toCompactHex() {
      return l(this.r) + l(this.s);
    }
  }
  const g = {
    isValidPrivateKey(x) {
      try {
        return u(x), !0;
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
      const x = na(e.n);
      return Kf(e.randomBytes(x), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(x = 8, S = a.BASE) {
      return S._setWindowSize(x), S.multiply(BigInt(3)), S;
    }
  };
  function y(x, S = !0) {
    return a.fromPrivateKey(x).toRawBytes(S);
  }
  function E(x) {
    const S = He(x), T = typeof x == "string", N = (S || T) && x.length;
    return S ? N === o || N === i : T ? N === 2 * o || N === 2 * i : x instanceof a;
  }
  function A(x, S, T = !0) {
    if (E(x))
      throw new Error("first arg must be private key");
    if (!E(S))
      throw new Error("second arg must be public key");
    return a.fromHex(S).multiply(u(x)).toRawBytes(T);
  }
  const v = e.bits2int || function(x) {
    if (x.length > 8192)
      throw new Error("input is too large");
    const S = Zt(x), T = x.length * 8 - e.nBitLength;
    return T > 0 ? S >> BigInt(T) : S;
  }, B = e.bits2int_modN || function(x) {
    return s(v(x));
  }, m = xi(e.nBitLength);
  function k(x) {
    return me("num < 2^" + e.nBitLength, x, ce, m), Te(x, e.nByteLength);
  }
  function I(x, S, T = O) {
    if (["recovered", "canonical"].some((mt) => mt in T))
      throw new Error("sign() legacy options not supported");
    const { hash: N, randomBytes: U } = e;
    let { lowS: _, prehash: V, extraEntropy: P } = T;
    _ == null && (_ = !0), x = yt("msgHash", x), Es(T), V && (x = yt("prehashed msgHash", N(x)));
    const et = B(x), j = u(S), K = [k(j), k(et)];
    if (P != null && P !== !1) {
      const mt = P === !0 ? U(n.BYTES) : P;
      K.push(yt("extraEntropy", mt));
    }
    const Nt = Pe(...K), lt = et;
    function ve(mt) {
      const Ut = v(mt);
      if (!d(Ut))
        return;
      const Be = c(Ut), Pt = a.BASE.multiply(Ut).toAffine(), Et = s(Pt.x);
      if (Et === ce)
        return;
      const Vt = s(Be * s(lt + Et * j));
      if (Vt === ce)
        return;
      let Kt = (Pt.x === Et ? 0 : 2) | Number(Pt.y & ct), $t = Vt;
      return _ && h(Vt) && ($t = b(Vt), Kt ^= 1), new p(Et, $t, Kt);
    }
    return { seed: Nt, k2sig: ve };
  }
  const O = { lowS: e.lowS, prehash: !1 }, C = { lowS: e.lowS, prehash: !1 };
  function $(x, S, T = O) {
    const { seed: N, k2sig: U } = I(x, S, T), _ = e;
    return Kc(_.hash.outputLen, _.nByteLength, _.hmac)(N, U);
  }
  a.BASE._setWindowSize(8);
  function D(x, S, T, N = C) {
    var Kt;
    const U = x;
    S = yt("msgHash", S), T = yt("publicKey", T);
    const { lowS: _, prehash: V, format: P } = N;
    if (Es(N), "strict" in N)
      throw new Error("options.strict was renamed to lowS");
    if (P !== void 0 && P !== "compact" && P !== "der")
      throw new Error("format must be compact or der");
    const et = typeof U == "string" || He(U), j = !et && !P && typeof U == "object" && U !== null && typeof U.r == "bigint" && typeof U.s == "bigint";
    if (!et && !j)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let K, Nt;
    try {
      if (j && (K = new p(U.r, U.s)), et) {
        try {
          P !== "compact" && (K = p.fromDER(U));
        } catch ($t) {
          if (!($t instanceof ie.Err))
            throw $t;
        }
        !K && P !== "der" && (K = p.fromCompact(U));
      }
      Nt = a.fromHex(T);
    } catch {
      return !1;
    }
    if (!K || _ && K.hasHighS())
      return !1;
    V && (S = e.hash(S));
    const { r: lt, s: ve } = K, mt = B(S), Ut = c(ve), Be = s(mt * Ut), Pt = s(lt * Ut), Et = (Kt = a.BASE.multiplyAndAddUnsafe(Nt, Be, Pt)) == null ? void 0 : Kt.toAffine();
    return Et ? s(Et.x) === lt : !1;
  }
  return {
    CURVE: e,
    getPublicKey: y,
    getSharedSecret: A,
    sign: $,
    verify: D,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Xf(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Qc(t, e, Af(...n)),
    randomBytes: Zc
  };
}
function Qf(t, e) {
  const n = (r) => Zf({ ...t, ...Xf(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Dn = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), wr = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), In = BigInt(1), gr = BigInt(2), Ss = (t, e) => (t + e / gr) / e;
function sa(t) {
  const e = Dn, n = BigInt(3), r = BigInt(6), o = BigInt(11), i = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, f = u * u * t % e, d = _t(f, n, e) * f % e, l = _t(d, n, e) * f % e, h = _t(l, gr, e) * u % e, b = _t(h, o, e) * h % e, w = _t(b, i, e) * b % e, p = _t(w, c, e) * w % e, g = _t(p, a, e) * p % e, y = _t(g, c, e) * w % e, E = _t(y, n, e) * f % e, A = _t(E, s, e) * b % e, v = _t(A, r, e) * u % e, B = _t(v, gr, e);
  if (!Co.eql(Co.sqr(B), t))
    throw new Error("Cannot find square root");
  return B;
}
const Co = ta(Dn, void 0, void 0, { sqrt: sa }), kn = Qf({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: Co,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: wr,
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
      const e = wr, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -In * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), o = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), i = n, s = BigInt("0x100000000000000000000000000000000"), c = Ss(i * t, e), a = Ss(-r * t, e);
      let u = ht(t - c * n - a * o, e), f = ht(-c * r - a * i, e);
      const d = u > s, l = f > s;
      if (d && (u = e - u), l && (f = e - f), u > s || f > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: d, k1: u, k2neg: l, k2: f };
    }
  }
}, Uo), ca = BigInt(0), Ts = {};
function yr(t, ...e) {
  let n = Ts[t];
  if (n === void 0) {
    const r = Uo(Uint8Array.from(t, (o) => o.charCodeAt(0)));
    n = Pe(r, r), Ts[t] = n;
  }
  return Uo(Pe(n, ...e));
}
const Bi = (t) => t.toRawBytes(!0).slice(1), Ro = (t) => Te(t, 32), eo = (t) => ht(t, Dn), Nn = (t) => ht(t, wr), Ii = kn.ProjectivePoint, Jf = (t, e, n) => Ii.BASE.multiplyAndAddUnsafe(t, e, n);
function _o(t) {
  let e = kn.utils.normPrivateKeyToScalar(t), n = Ii.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Nn(-e), bytes: Bi(n) };
}
function aa(t) {
  me("x", t, In, Dn);
  const e = eo(t * t), n = eo(e * t + BigInt(7));
  let r = sa(n);
  r % gr !== ca && (r = eo(-r));
  const o = new Ii(t, r, In);
  return o.assertValidity(), o;
}
const je = Zt;
function ua(...t) {
  return Nn(je(yr("BIP0340/challenge", ...t)));
}
function td(t) {
  return _o(t).bytes;
}
function ed(t, e, n = Zc(32)) {
  const r = yt("message", t), { bytes: o, scalar: i } = _o(e), s = yt("auxRand", n, 32), c = Ro(i ^ je(yr("BIP0340/aux", s))), a = yr("BIP0340/nonce", c, o, r), u = Nn(je(a));
  if (u === ca)
    throw new Error("sign failed: k is zero");
  const { bytes: f, scalar: d } = _o(u), l = ua(f, o, r), h = new Uint8Array(64);
  if (h.set(f, 0), h.set(Ro(Nn(d + l * i)), 32), !fa(h, r, o))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function fa(t, e, n) {
  const r = yt("signature", t, 64), o = yt("message", e), i = yt("publicKey", n, 32);
  try {
    const s = aa(je(i)), c = je(r.subarray(0, 32));
    if (!un(c, In, Dn))
      return !1;
    const a = je(r.subarray(32, 64));
    if (!un(a, In, wr))
      return !1;
    const u = ua(Ro(c), Bi(s), o), f = Jf(s, a, Nn(-u));
    return !(!f || !f.hasEvenY() || f.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const da = {
  getPublicKey: td,
  sign: ed,
  verify: fa,
  utils: {
    randomPrivateKey: kn.utils.randomPrivateKey,
    lift_x: aa,
    pointToBytes: Bi,
    numberToBytesBE: Te,
    bytesToNumberBE: Zt,
    taggedHash: yr,
    mod: ht
  }
};
function ki(t, e, n = {}) {
  t = Bo(t);
  const { aggPublicKey: r } = Io(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const o = da.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: i } = Io(t, [o], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: i.toRawBytes(!0)
  };
}
class Yn extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Ni {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new Yn("Invalid s length");
    if (n.length !== 33)
      throw new Yn("Invalid R length");
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
      throw new Yn("Invalid partial signature length");
    if (Zt(e) >= Ti.n)
      throw new Yn("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Ni(e, r);
  }
}
function nd(t, e, n, r, o, i) {
  let s;
  if ((i == null ? void 0 : i.taprootTweak) !== void 0) {
    const { preTweakedKey: u } = ki(Bo(r));
    s = da.utils.taggedHash("TapTweak", u.subarray(1), i.taprootTweak);
  }
  const a = new Qu(n, Bo(r), o, s ? [s] : void 0, s ? [!0] : void 0).sign(t, e);
  return Ni.decode(a);
}
var no, As;
function rd() {
  if (As) return no;
  As = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, o = 1 << 22, i = r, s = 1 << n, c = r << n;
  function a(f) {
    return f & e ? {} : f & o ? {
      seconds: (f & r) << n
    } : {
      blocks: f & r
    };
  }
  function u({ blocks: f, seconds: d }) {
    if (f !== void 0 && d !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (f === void 0 && d === void 0) return t;
    if (d !== void 0) {
      if (!Number.isFinite(d)) throw new TypeError("Expected Number seconds");
      if (d > c) throw new TypeError("Expected Number seconds <= " + c);
      if (d % s !== 0) throw new TypeError("Expected Number seconds as a multiple of " + s);
      return o | d >> n;
    }
    if (!Number.isFinite(f)) throw new TypeError("Expected Number blocks");
    if (f > r) throw new TypeError("Expected Number blocks <= " + i);
    return f;
  }
  return no = { decode: a, encode: u }, no;
}
var od = rd(), nt;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(nt || (nt = {}));
function Ui(t = 6, e = !1) {
  return kt({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const o = r < 0, i = BigInt(r), s = [];
      for (let c = o ? -i : i; c; c >>= 8n)
        s.push(Number(c & 0xffn));
      s[s.length - 1] >= 128 ? s.push(o ? 128 : 0) : o && (s[s.length - 1] |= 128), n.bytes(new Uint8Array(s));
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
      let o = 0, i = 0n;
      for (let s = 0; s < r; ++s)
        o = n.byte(), i |= BigInt(o) << 8n * BigInt(s);
      return o >= 128 && (i &= 2n ** BigInt(r * 8) - 1n >> 1n, i = -i), i;
    }
  });
}
function id(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (G(t))
    try {
      const r = Ui(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const X = kt({
  encodeStream: (t, e) => {
    for (let n of e) {
      if (typeof n == "string") {
        if (nt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        t.byte(nt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          t.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          t.byte(nt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Ui().encode(BigInt(n))), !G(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < nt.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(nt.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(nt.PUSHDATA2), t.bytes(Xi.encode(r))) : (t.byte(nt.PUSHDATA4), t.bytes(M.encode(r))), t.bytes(n);
    }
  },
  decodeStream: (t) => {
    const e = [];
    for (; !t.isEnd(); ) {
      const n = t.byte();
      if (nt.OP_0 < n && n <= nt.PUSHDATA4) {
        let r;
        if (n < nt.PUSHDATA1)
          r = n;
        else if (n === nt.PUSHDATA1)
          r = be.decodeStream(t);
        else if (n === nt.PUSHDATA2)
          r = Xi.decodeStream(t);
        else if (n === nt.PUSHDATA4)
          r = M.decodeStream(t);
        else
          throw new Error("Should be not possible");
        e.push(t.bytes(r));
      } else if (n === 0)
        e.push(0);
      else if (nt.OP_1 <= n && n <= nt.OP_16)
        e.push(n - (nt.OP_1 - 1));
      else {
        const r = nt[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        e.push(r);
      }
    }
    return e;
  }
}), vs = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Rr = kt({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, o, i] of Object.values(vs))
      if (!(o > e || e > i)) {
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
    const [n, r, o] = vs[e];
    let i = 0n;
    for (let s = 0; s < r; s++)
      i |= BigInt(t.byte()) << 8n * BigInt(s);
    if (i < o)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return i;
  }
}), Wt = xe(Rr, kr.numberBigint), Ft = q(Rr), $i = Bt(Wt, Ft), br = (t) => Bt(Rr, t), la = dt({
  txid: q(32, !0),
  // hash(prev_tx),
  index: M,
  // output number of previous tx
  finalScriptSig: Ft,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: M
  // ?
}), Ce = dt({ amount: Jn, script: Ft }), sd = dt({
  version: Fe,
  segwitFlag: Mu(new Uint8Array([0, 1])),
  inputs: br(la),
  outputs: br(Ce),
  witnesses: Fu("segwitFlag", Bt("inputs/length", $i)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: M
});
function cd(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const Ye = It(sd, cd), bn = dt({
  version: Fe,
  inputs: br(la),
  outputs: br(Ce),
  lockTime: M
});
function nr(t) {
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
function Bs(t, e, n, r = !1, o = !1) {
  let { nonWitnessUtxo: i, txid: s } = t;
  typeof i == "string" && (i = F.decode(i)), G(i) && (i = Ye.decode(i)), !("nonWitnessUtxo" in t) && i === void 0 && (i = e == null ? void 0 : e.nonWitnessUtxo), typeof s == "string" && (s = F.decode(s)), s === void 0 && (s = e == null ? void 0 : e.txid);
  let c = { ...e, ...t, nonWitnessUtxo: i, txid: s };
  !("nonWitnessUtxo" in t) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = ha), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = Po(Or, c, e, n, o), Ri.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && ya(a && a.script, c.redeemScript, c.witnessScript), c;
}
function Is(t, e = !1) {
  let n = "legacy", r = z.ALL;
  const o = nr(t), i = pt.decode(o.script);
  let s = i.type, c = i;
  const a = [i];
  if (i.type === "tr")
    return r = z.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: i,
      lastScript: o.script,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
  {
    if ((i.type === "wpkh" || i.type === "wsh") && (n = "segwit"), i.type === "sh") {
      if (!t.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let l = pt.decode(t.redeemScript);
      (l.type === "wpkh" || l.type === "wsh") && (n = "segwit"), a.push(l), c = l, s += `-${l.type}`;
    }
    if (c.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let l = pt.decode(t.witnessScript);
      l.type === "wsh" && (n = "segwit"), a.push(l), c = l, s += `-${l.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const f = pt.encode(u), d = {
      type: s,
      txType: n,
      last: u,
      lastScript: f,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return d;
  }
}
const ad = (t) => Math.ceil(t / 4), Zn = new Uint8Array(32), ud = {
  amount: 0xffffffffffffffffn,
  script: Y
}, fd = 8, dd = 2, Ie = 0, ha = 4294967295;
kr.decimal(fd);
const xn = (t, e) => t === void 0 ? e : t;
function mr(t) {
  if (Array.isArray(t))
    return t.map((e) => mr(e));
  if (G(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, mr(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var z;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(z || (z = {}));
var Un;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(Un || (Un = {}));
function ld(t, e, n, r = Y) {
  return ot(n, e) && (t = qu(t, r), e = fi(t)), { privKey: t, pubKey: e };
}
function ke(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function wn(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: xn(t.sequence, ha),
    finalScriptSig: xn(t.finalScriptSig, Y)
  };
}
function ro(t) {
  for (const e in t) {
    const n = e;
    md.includes(n) || delete t[n];
  }
}
const oo = dt({ txid: q(32, !0), index: M });
function hd(t) {
  if (typeof t != "number" || typeof Un[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function ks(t) {
  const e = t & 31;
  return {
    isAny: !!(t & z.ANYONECANPAY),
    isNone: e === z.NONE,
    isSingle: e === z.SINGLE
  };
}
function pd(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: xn(t.version, dd),
    lockTime: xn(t.lockTime, 0),
    PSBTVersion: xn(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (M.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
class tt {
  constructor(e = {}) {
    this.global = {}, this.inputs = [], this.outputs = [];
    const n = this.opts = pd(e);
    n.lockTime !== Ie && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(e, n = {}) {
    const r = Ye.decode(e), o = new tt({ ...n, version: r.version, lockTime: r.lockTime });
    for (const i of r.outputs)
      o.addOutput(i);
    if (o.outputs = r.outputs, o.inputs = r.inputs, r.witnesses)
      for (let i = 0; i < r.witnesses.length; i++)
        o.inputs[i].finalScriptWitness = r.witnesses[i];
    return o;
  }
  // PSBT
  static fromPSBT(e, n = {}) {
    let r;
    try {
      r = Cs.decode(e);
    } catch (d) {
      try {
        r = Rs.decode(e);
      } catch {
        throw d;
      }
    }
    const o = r.global.version || 0;
    if (o !== 0 && o !== 2)
      throw new Error(`Wrong PSBT version=${o}`);
    const i = r.global.unsignedTx, s = o === 0 ? i == null ? void 0 : i.version : r.global.txVersion, c = o === 0 ? i == null ? void 0 : i.lockTime : r.global.fallbackLocktime, a = new tt({ ...n, version: s, lockTime: c, PSBTVersion: o }), u = o === 0 ? i == null ? void 0 : i.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((d, l) => {
      var h;
      return {
        finalScriptSig: Y,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.inputs[l],
        ...d
      };
    });
    const f = o === 0 ? i == null ? void 0 : i.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, f).map((d, l) => {
      var h;
      return {
        ...d,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.outputs[l]
      };
    }), a.global = { ...r.global, txVersion: s }, c !== Ie && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((i) => Ls(e, Or, i));
    for (const i of n)
      i.partialSig && !i.partialSig.length && delete i.partialSig, i.finalScriptSig && !i.finalScriptSig.length && delete i.finalScriptSig, i.finalScriptWitness && !i.finalScriptWitness.length && delete i.finalScriptWitness;
    const r = this.outputs.map((i) => Ls(e, xr, i)), o = { ...this.global };
    return e === 0 ? (o.unsignedTx = bn.decode(bn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(wn).map((i) => ({
        ...i,
        finalScriptSig: Y
      })),
      outputs: this.outputs.map(ke)
    })), delete o.fallbackLocktime, delete o.txVersion) : (o.version = e, o.txVersion = this.version, o.inputCount = this.inputs.length, o.outputCount = this.outputs.length, o.fallbackLocktime && o.fallbackLocktime === Ie && delete o.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Cs : Rs).encode({
      global: o,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Ie, n = 0, r = Ie, o = 0;
    for (const i of this.inputs)
      i.requiredHeightLocktime && (e = Math.max(e, i.requiredHeightLocktime), n++), i.requiredTimeLocktime && (r = Math.max(r, i.requiredTimeLocktime), o++);
    return n && n >= o ? e : r !== Ie ? r : this.global.fallbackLocktime || Ie;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? z.DEFAULT : n, o = r === z.DEFAULT ? z.ALL : r & 3;
    return { sigInputs: r & z.ANYONECANPAY, sigOutputs: o };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], o = [];
    for (let i = 0; i < this.inputs.length; i++) {
      if (this.inputStatus(i) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(i);
      if (c === z.ANYONECANPAY ? r.push(i) : e = !1, a === z.ALL)
        n = !1;
      else if (a === z.SINGLE)
        o.push(i);
      else if (a !== z.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(ke);
    e += 4 * Wt.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Ft.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * Wt.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Ft.encode(r.finalScriptSig || Y).length, this.hasWitnesses && r.finalScriptWitness && (e += $i.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return ad(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return Ye.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(wn).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || Y
      })),
      outputs: this.outputs.map(ke),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return F.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return F.encode(Ot(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return F.encode(Ot(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), mr(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Bs(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let o;
    if (!r) {
      const i = this.signStatus();
      (!i.addInput || i.inputs.includes(e)) && (o = Ed);
    }
    this.inputs[e] = Bs(n, this.inputs[e], o, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), mr(this.outputs[e]);
  }
  getOutputAddress(e, n = Oe) {
    const r = this.getOutput(e);
    if (r.script)
      return Sr(n).encode(pt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: o, script: i } = e;
    if (o === void 0 && (o = n == null ? void 0 : n.amount), typeof o != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${o} of type ${typeof o}`);
    typeof i == "string" && (i = F.decode(i)), i === void 0 && (i = n == null ? void 0 : n.script);
    let s = { ...n, ...e, amount: o, script: i };
    if (s.amount === void 0 && delete s.amount, s = Po(xr, s, n, r, this.opts.allowUnknown), _i.encode(s), s.script && !this.opts.allowUnknownOutputs && pt.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || ya(s.script, s.redeemScript, s.witnessScript), s;
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
      const i = this.signStatus();
      (!i.addOutput || i.outputs.includes(e)) && (o = xd);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], o);
  }
  addOutputAddress(e, n, r = Oe) {
    return this.addOutput({ script: pt.encode(Sr(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const o = nr(r);
      if (!o)
        throw new Error("Empty input amount");
      e += o.amount;
    }
    const n = this.outputs.map(ke);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: o, isNone: i, isSingle: s } = ks(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (s && e >= this.outputs.length || e >= this.inputs.length)
      return Sc.encode(1n);
    n = X.encode(X.decode(n).filter((f) => f !== "CODESEPARATOR"));
    let c = this.inputs.map(wn).map((f, d) => ({
      ...f,
      finalScriptSig: d === e ? n : Y
    }));
    o ? c = [c[e]] : (i || s) && (c = c.map((f, d) => ({
      ...f,
      sequence: d === e ? f.sequence : 0
    })));
    let a = this.outputs.map(ke);
    i ? a = [] : s && (a = a.slice(0, e).fill(ud).concat([a[e]]));
    const u = Ye.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return Ot(u, Fe.encode(r));
  }
  preimageWitnessV0(e, n, r, o) {
    const { isAny: i, isNone: s, isSingle: c } = ks(r);
    let a = Zn, u = Zn, f = Zn;
    const d = this.inputs.map(wn), l = this.outputs.map(ke);
    i || (a = Ot(...d.map(oo.encode))), !i && !c && !s && (u = Ot(...d.map((b) => M.encode(b.sequence)))), !c && !s ? f = Ot(...l.map(Ce.encode)) : c && e < l.length && (f = Ot(Ce.encode(l[e])));
    const h = d[e];
    return Ot(Fe.encode(this.version), a, u, q(32, !0).encode(h.txid), M.encode(h.index), Ft.encode(n), Jn.encode(o), M.encode(h.sequence), f, M.encode(this.lockTime), M.encode(r));
  }
  preimageWitnessV1(e, n, r, o, i = -1, s, c = 192, a) {
    if (!Array.isArray(o) || this.inputs.length !== o.length)
      throw new Error(`Invalid amounts array=${o}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      be.encode(0),
      be.encode(r),
      // U8 sigHash
      Fe.encode(this.version),
      M.encode(this.lockTime)
    ], f = r === z.DEFAULT ? z.ALL : r & 3, d = r & z.ANYONECANPAY, l = this.inputs.map(wn), h = this.outputs.map(ke);
    d !== z.ANYONECANPAY && u.push(...[
      l.map(oo.encode),
      o.map(Jn.encode),
      n.map(Ft.encode),
      l.map((w) => M.encode(w.sequence))
    ].map((w) => Tt(we(...w)))), f === z.ALL && u.push(Tt(we(...h.map(Ce.encode))));
    const b = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([b])), d === z.ANYONECANPAY) {
      const w = l[e];
      u.push(oo.encode(w), Jn.encode(o[e]), Ft.encode(n[e]), M.encode(w.sequence));
    } else
      u.push(M.encode(e));
    return b & 1 && u.push(Tt(Ft.encode(a || Y))), f === z.SINGLE && u.push(e < h.length ? Tt(Ce.encode(h[e])) : Zn), s && u.push(Ze(s, c), be.encode(0), Fe.encode(i)), di("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, o) {
    this.checkInputIdx(n);
    const i = this.inputs[n], s = Is(i, this.opts.allowLegacyWitnessUtxo);
    if (!G(e)) {
      if (!i.bip32Derivation || !i.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const f = i.bip32Derivation.filter((l) => l[1].fingerprint == e.fingerprint).map(([l, { path: h }]) => {
        let b = e;
        for (const w of h)
          b = b.deriveChild(w);
        if (!ot(b.publicKey, l))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!b.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return b;
      });
      if (!f.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let d = !1;
      for (const l of f)
        this.signIdx(l.privateKey, n) && (d = !0);
      return d;
    }
    r ? r.forEach(hd) : r = [s.defaultSighash];
    const c = s.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === z.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = nr(i);
    if (s.txType === "taproot") {
      const f = this.inputs.map(nr), d = f.map((p) => p.script), l = f.map((p) => p.amount);
      let h = !1, b = fi(e), w = i.tapMerkleRoot || Y;
      if (i.tapInternalKey) {
        const { pubKey: p, privKey: g } = ld(e, b, i.tapInternalKey, w), [y, E] = Ic(i.tapInternalKey, w);
        if (ot(y, p)) {
          const A = this.preimageWitnessV1(n, d, c, l), v = we(Ji(A, g, o), c !== z.DEFAULT ? new Uint8Array([c]) : Y);
          this.updateInput(n, { tapKeySig: v }, !0), h = !0;
        }
      }
      if (i.tapLeafScript) {
        i.tapScriptSig = i.tapScriptSig || [];
        for (const [p, g] of i.tapLeafScript) {
          const y = g.subarray(0, -1), E = X.decode(y), A = g[g.length - 1], v = Ze(y, A);
          if (E.findIndex((I) => G(I) && ot(I, b)) === -1)
            continue;
          const m = this.preimageWitnessV1(n, d, c, l, void 0, y, A), k = we(Ji(m, e, o), c !== z.DEFAULT ? new Uint8Array([c]) : Y);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: b, leafHash: v }, k]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const f = Gu(e);
      let d = !1;
      const l = Ac(f);
      for (const w of X.decode(s.lastScript))
        G(w) && (ot(w, f) || ot(w, l)) && (d = !0);
      if (!d)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let h;
      if (s.txType === "legacy")
        h = this.preimageLegacy(n, s.lastScript, c);
      else if (s.txType === "segwit") {
        let w = s.lastScript;
        s.last.type === "wpkh" && (w = pt.encode({ type: "pkh", hash: s.last.hash })), h = this.preimageWitnessV0(n, w, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const b = Wu(h, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[f, we(b, new Uint8Array([c]))]]
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
    for (let i = 0; i < this.inputs.length; i++)
      try {
        this.signIdx(e, i, n, r) && o++;
      } catch {
      }
    if (!o)
      throw new Error("No inputs signed");
    return o;
  }
  finalizeIdx(e) {
    if (this.checkInputIdx(e), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[e], r = Is(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, f) => ye.encode(u[0]).length - ye.encode(f[0]).length);
        for (const [u, f] of a) {
          const d = f.slice(0, -1), l = f[f.length - 1], h = pt.decode(d), b = Ze(d, l), w = n.tapScriptSig.filter((g) => ot(g[0].leafHash, b));
          let p = [];
          if (h.type === "tr_ms") {
            const g = h.m, y = h.pubkeys;
            let E = 0;
            for (const A of y) {
              const v = w.findIndex((B) => ot(B[0].pubKey, A));
              if (E === g || v === -1) {
                p.push(Y);
                continue;
              }
              p.push(w[v][1]), E++;
            }
            if (E !== g)
              continue;
          } else if (h.type === "tr_ns") {
            for (const g of h.pubkeys) {
              const y = w.findIndex((E) => ot(E[0].pubKey, g));
              y !== -1 && p.push(w[y][1]);
            }
            if (p.length !== h.pubkeys.length)
              continue;
          } else if (h.type === "unknown" && this.opts.allowUnknownInputs) {
            const g = X.decode(d);
            if (p = w.map(([{ pubKey: y }, E]) => {
              const A = g.findIndex((v) => G(v) && ot(v, y));
              if (A === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: E, pos: A };
            }).sort((y, E) => y.pos - E.pos).map((y) => y.signature), !p.length)
              continue;
          } else {
            const g = this.opts.customScripts;
            if (g)
              for (const y of g) {
                if (!y.finalizeTaproot)
                  continue;
                const E = X.decode(d), A = y.encode(E);
                if (A === void 0)
                  continue;
                const v = y.finalizeTaproot(d, A, w);
                if (v) {
                  n.finalScriptWitness = v.concat(ye.encode(u)), n.finalScriptSig = Y, ro(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = p.reverse().concat([d, ye.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = Y, ro(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let o = Y, i = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let f = [];
      for (const d of u) {
        const l = n.partialSig.find((h) => ot(d, h[0]));
        l && f.push(l[1]);
      }
      if (f = f.slice(0, a), f.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${f.length}`);
      o = X.encode([0, ...f]);
    } else if (r.last.type === "pk")
      o = X.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      o = X.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      o = Y, i = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (r.type.includes("wsh-") && (o.length && r.lastScript.length && (i = X.decode(o).map((a) => {
      if (a === 0)
        return Y;
      if (G(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), i = i.concat(r.lastScript)), r.txType === "segwit" && (c = i), r.type.startsWith("sh-wsh-") ? s = X.encode([X.encode([0, Tt(r.lastScript)])]) : r.type.startsWith("sh-") ? s = X.encode([...X.decode(o), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (s = o), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (n.finalScriptSig = s), c && (n.finalScriptWitness = c), ro(n);
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
    const n = this.global.unsignedTx ? bn.encode(this.global.unsignedTx) : Y, r = e.global.unsignedTx ? bn.encode(e.global.unsignedTx) : Y;
    if (!ot(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Po(Li, this.global, e.global, void 0, this.opts.allowUnknown);
    for (let o = 0; o < this.inputs.length; o++)
      this.updateInput(o, e.inputs[o], !0);
    for (let o = 0; o < this.outputs.length; o++)
      this.updateOutput(o, e.outputs[o], !0);
    return this;
  }
  clone() {
    return tt.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}
const Oo = It(q(null), (t) => rn(t, St.ecdsa)), Er = It(q(32), (t) => rn(t, St.schnorr)), Ns = It(q(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), _r = dt({
  fingerprint: Vu,
  path: Bt(null, M)
}), pa = dt({
  hashes: Bt(Wt, q(32)),
  der: _r
}), wd = q(78), gd = dt({ pubKey: Er, leafHash: q(32) }), yd = dt({
  version: be,
  // With parity :(
  internalKey: q(32),
  merklePath: Bt(null, q(32))
}), ye = It(yd, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), bd = Bt(null, dt({
  depth: be,
  version: be,
  script: Ft
})), rt = q(null), Us = q(20), gn = q(32), Li = {
  unsignedTx: [0, !1, bn, [0], [0], !1],
  xpub: [1, wd, _r, [], [0, 2], !1],
  txVersion: [2, !1, M, [2], [2], !1],
  fallbackLocktime: [3, !1, M, [], [2], !1],
  inputCount: [4, !1, Wt, [2], [2], !1],
  outputCount: [5, !1, Wt, [2], [2], !1],
  txModifiable: [6, !1, be, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, M, [], [0, 2], !1],
  proprietary: [252, rt, rt, [], [0, 2], !1]
}, Or = {
  nonWitnessUtxo: [0, !1, Ye, [], [0, 2], !1],
  witnessUtxo: [1, !1, Ce, [], [0, 2], !1],
  partialSig: [2, Oo, rt, [], [0, 2], !1],
  sighashType: [3, !1, M, [], [0, 2], !1],
  redeemScript: [4, !1, rt, [], [0, 2], !1],
  witnessScript: [5, !1, rt, [], [0, 2], !1],
  bip32Derivation: [6, Oo, _r, [], [0, 2], !1],
  finalScriptSig: [7, !1, rt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, $i, [], [0, 2], !1],
  porCommitment: [9, !1, rt, [], [0, 2], !1],
  ripemd160: [10, Us, rt, [], [0, 2], !1],
  sha256: [11, gn, rt, [], [0, 2], !1],
  hash160: [12, Us, rt, [], [0, 2], !1],
  hash256: [13, gn, rt, [], [0, 2], !1],
  txid: [14, !1, gn, [2], [2], !0],
  index: [15, !1, M, [2], [2], !0],
  sequence: [16, !1, M, [], [2], !0],
  requiredTimeLocktime: [17, !1, M, [], [2], !1],
  requiredHeightLocktime: [18, !1, M, [], [2], !1],
  tapKeySig: [19, !1, Ns, [], [0, 2], !1],
  tapScriptSig: [20, gd, Ns, [], [0, 2], !1],
  tapLeafScript: [21, ye, rt, [], [0, 2], !1],
  tapBip32Derivation: [22, gn, pa, [], [0, 2], !1],
  tapInternalKey: [23, !1, Er, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, gn, [], [0, 2], !1],
  proprietary: [252, rt, rt, [], [0, 2], !1]
}, md = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Ed = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], xr = {
  redeemScript: [0, !1, rt, [], [0, 2], !1],
  witnessScript: [1, !1, rt, [], [0, 2], !1],
  bip32Derivation: [2, Oo, _r, [], [0, 2], !1],
  amount: [3, !1, Hu, [2], [2], !0],
  script: [4, !1, rt, [2], [2], !0],
  tapInternalKey: [5, !1, Er, [], [0, 2], !1],
  tapTree: [6, !1, bd, [], [0, 2], !1],
  tapBip32Derivation: [7, Er, pa, [], [0, 2], !1],
  proprietary: [252, rt, rt, [], [0, 2], !1]
}, xd = [], $s = Bt(yc, dt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: Ku(Wt, dt({ type: Wt, key: q(null) })),
  //  <value> := <valuelen> <valuedata>
  value: q(Wt)
}));
function Ho(t) {
  const [e, n, r, o, i, s] = t;
  return { type: e, kc: n, vc: r, reqInc: o, allowInc: i, silentIgnore: s };
}
dt({ type: Wt, key: q(null) });
function Ci(t) {
  const e = {};
  for (const n in t) {
    const [r, o, i] = t[n];
    e[r] = [n, o, i];
  }
  return kt({
    encodeStream: (n, r) => {
      let o = [];
      for (const i in t) {
        const s = r[i];
        if (s === void 0)
          continue;
        const [c, a, u] = t[i];
        if (!a)
          o.push({ key: { type: c, key: Y }, value: u.encode(s) });
        else {
          const f = s.map(([d, l]) => [
            a.encode(d),
            u.encode(l)
          ]);
          f.sort((d, l) => fr(d[0], l[0]));
          for (const [d, l] of f)
            o.push({ key: { key: d, type: c }, value: l });
        }
      }
      if (r.unknown) {
        r.unknown.sort((i, s) => fr(i[0].key, s[0].key));
        for (const [i, s] of r.unknown)
          o.push({ key: i, value: s });
      }
      $s.encodeStream(n, o);
    },
    decodeStream: (n) => {
      const r = $s.decodeStream(n), o = {}, i = {};
      for (const s of r) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (e[s.key.type]) {
          const [f, d, l] = e[s.key.type];
          if (c = f, !d && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${F.encode(a)} value=${F.encode(u)}`);
          if (a = d ? d.decode(a) : void 0, u = l.decode(u), !d) {
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
const Ri = It(Ci(Or), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      rn(e, St.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      rn(e, St.ecdsa);
  if (t.requiredTimeLocktime !== void 0 && t.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${t.requiredTimeLocktime}`);
  if (t.requiredHeightLocktime !== void 0 && (t.requiredHeightLocktime <= 0 || t.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${t.requiredHeightLocktime}`);
  if (t.nonWitnessUtxo && t.index !== void 0) {
    const e = t.nonWitnessUtxo.outputs.length - 1;
    if (t.index > e)
      throw new Error(`validateInput: index(${t.index}) not in nonWitnessUtxo`);
    const n = t.nonWitnessUtxo.outputs[t.index];
    if (t.witnessUtxo && (!ot(t.witnessUtxo.script, n.script) || t.witnessUtxo.amount !== n.amount))
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
    const n = tt.fromRaw(Ye.encode(t.nonWitnessUtxo), {
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    }), r = F.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), _i = It(Ci(xr), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      rn(e, St.ecdsa);
  return t;
}), wa = It(Ci(Li), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Sd = dt({
  magic: ui(ai(new Uint8Array([255])), "psbt"),
  global: wa,
  inputs: Bt("global/unsignedTx/inputs/length", Ri),
  outputs: Bt(null, _i)
}), Td = dt({
  magic: ui(ai(new Uint8Array([255])), "psbt"),
  global: wa,
  inputs: Bt("global/inputCount", Ri),
  outputs: Bt("global/outputCount", _i)
});
dt({
  magic: ui(ai(new Uint8Array([255])), "psbt"),
  items: Bt(null, xe(Bt(yc, zu([Du(Wt), q(Rr)])), kr.dict()))
});
function io(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: o } = Ho(e[r]);
    if (!o.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: o } = Ho(e[r]);
    if (o.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Ls(t, e, n) {
  const r = {};
  for (const o in n) {
    const i = o;
    if (i !== "unknown") {
      if (!e[i])
        continue;
      const { allowInc: s, silentIgnore: c } = Ho(e[i]);
      if (!s.includes(t)) {
        if (c)
          continue;
        throw new Error(`Failed to serialize in PSBTv${t}: ${i} but versions allows inclusion=${s}`);
      }
    }
    r[i] = n[i];
  }
  return r;
}
function ga(t) {
  const e = t && t.global && t.global.version || 0;
  io(e, Li, t.global);
  for (const s of t.inputs)
    io(e, Or, s);
  for (const s of t.outputs)
    io(e, xr, s);
  const n = e ? t.global.inputCount : t.global.unsignedTx.inputs.length;
  if (t.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = t.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const o = e ? t.global.outputCount : t.global.unsignedTx.outputs.length;
  if (t.outputs.length < o)
    throw new Error("Not outputs inputs");
  const i = t.outputs.slice(o);
  if (i.length > 1 || i.length && Object.keys(i[0]).length)
    throw new Error(`Unexpected outputs left in tx=${i}`);
  return t;
}
function Po(t, e, n, r, o) {
  const i = { ...n, ...e };
  for (const s in t) {
    const c = s, [a, u, f] = t[c], d = r && !r.includes(s);
    if (e[s] === void 0 && s in e) {
      if (d)
        throw new Error(`Cannot remove signed field=${s}`);
      delete i[s];
    } else if (u) {
      const l = n && n[s] ? n[s] : [];
      let h = e[c];
      if (h) {
        if (!Array.isArray(h))
          throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
        h = h.map((p) => {
          if (p.length !== 2)
            throw new Error(`keyMap(${s}): KV pairs should be [k, v][]`);
          return [
            typeof p[0] == "string" ? u.decode(F.decode(p[0])) : p[0],
            typeof p[1] == "string" ? f.decode(F.decode(p[1])) : p[1]
          ];
        });
        const b = {}, w = (p, g, y) => {
          if (b[p] === void 0) {
            b[p] = [g, y];
            return;
          }
          const E = F.encode(f.encode(b[p][1])), A = F.encode(f.encode(y));
          if (E !== A)
            throw new Error(`keyMap(${c}): same key=${p} oldVal=${E} newVal=${A}`);
        };
        for (const [p, g] of l) {
          const y = F.encode(u.encode(p));
          w(y, p, g);
        }
        for (const [p, g] of h) {
          const y = F.encode(u.encode(p));
          if (g === void 0) {
            if (d)
              throw new Error(`Cannot remove signed field=${c}/${p}`);
            delete b[y];
          } else
            w(y, p, g);
        }
        i[c] = Object.values(b);
      }
    } else if (typeof i[s] == "string")
      i[s] = f.decode(F.decode(i[s]));
    else if (d && s in e && n && n[s] !== void 0 && !ot(f.encode(e[s]), f.encode(n[s])))
      throw new Error(`Cannot change signed field=${s}`);
  }
  for (const s in i)
    if (!t[s]) {
      if (o && s === "unknown")
        continue;
      delete i[s];
    }
  return i;
}
const Cs = It(Sd, ga), Rs = It(Td, ga), Ad = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !G(t[1]) || F.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: X.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, F.decode("4e73")];
  }
};
function Ge(t, e) {
  try {
    return rn(t, e), !0;
  } catch {
    return !1;
  }
}
const vd = {
  encode(t) {
    if (!(t.length !== 2 || !G(t[0]) || !Ge(t[0], St.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Bd = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !G(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Id = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !G(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, kd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !G(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Nd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !G(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, Ud = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "CHECKMULTISIG")
      return;
    const n = t[0], r = t[e - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const o = t.slice(1, -2);
    if (r === o.length) {
      for (const i of o)
        if (!G(i))
          return;
      return { type: "ms", m: n, pubkeys: o };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, $d = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !G(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Ld = {
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
      if (!G(o))
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
}, Cd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = id(t[e - 1]);
    if (typeof r == "number") {
      for (let o = 0; o < e - 1; o++) {
        const i = t[o];
        if (o & 1) {
          if (i !== (o === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!G(i))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(i);
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
}, Rd = {
  encode(t) {
    return { type: "unknown", script: X.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? X.decode(t.script) : void 0
}, _d = [
  Ad,
  vd,
  Bd,
  Id,
  kd,
  Nd,
  Ud,
  $d,
  Ld,
  Cd,
  Rd
], Od = xe(X, kr.match(_d)), pt = It(Od, (t) => {
  if (t.type === "pk" && !Ge(t.pubkey, St.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!G(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!G(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!G(t.pubkey) || !Ge(t.pubkey, St.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!Ge(n, St.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!Ge(e, St.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function _s(t, e) {
  if (!ot(t.hash, Tt(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = pt.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function ya(t, e, n) {
  if (t) {
    const r = pt.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!ot(r.hash, Ac(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const o = pt.decode(e);
      if (o.type === "tr" || o.type === "tr_ns" || o.type === "tr_ms")
        throw new Error(`checkScript: P2${o.type} cannot be wrapped in P2SH`);
      if (o.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && _s(r, n);
  }
  if (e) {
    const r = pt.decode(e);
    r.type === "wsh" && n && _s(r, n);
  }
}
function Hd(t) {
  const e = {};
  for (const n of t) {
    const r = F.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(F.encode)}`);
    e[r] = !0;
  }
}
function Pd(t, e, n = !1, r) {
  const o = pt.decode(t);
  if (o.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(o.type))
    throw new Error(`P2TR: invalid leaf script=${o.type}`);
  const i = o;
  if (!n && i.pubkeys)
    for (const s of i.pubkeys) {
      if (ot(s, dn))
        throw new Error("Unspendable taproot key in leaf script");
      if (ot(s, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Hr(t) {
  const e = Array.from(t);
  for (; e.length >= 2; ) {
    e.sort((s, c) => (c.weight || 1) - (s.weight || 1));
    const r = e.pop(), o = e.pop(), i = ((o == null ? void 0 : o.weight) || 1) + ((r == null ? void 0 : r.weight) || 1);
    e.push({
      weight: i,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [(o == null ? void 0 : o.childs) || o, (r == null ? void 0 : r.childs) || r]
    });
  }
  const n = e[0];
  return (n == null ? void 0 : n.childs) || n;
}
function Vo(t, e = []) {
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
    left: Vo(t.left, [t.right.hash, ...e]),
    right: Vo(t.right, [t.left.hash, ...e])
  };
}
function Ko(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...Ko(t.left), ...Ko(t.right)];
}
function Do(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: a, script: u } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !ot(t.tapMerkleRoot, Y))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const f = typeof u == "string" ? F.decode(u) : u;
    if (!G(f))
      throw new Error(`checkScript: wrong script type=${f}`);
    return Pd(f, e, n), {
      type: "leaf",
      version: a,
      script: f,
      hash: Ze(f, a)
    };
  }
  if (t.length !== 2 && (t = Hr(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const o = Do(t[0], e, n), i = Do(t[1], e, n);
  let [s, c] = [o.hash, i.hash];
  return fr(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: o, right: i, hash: di("TapBranch", s, c) };
}
const Ae = 192, Ze = (t, e = Ae) => di("TapLeaf", new Uint8Array([e]), Ft.encode(t));
function Pr(t, e, n = Oe, r = !1, o) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const i = typeof t == "string" ? F.decode(t) : t || dn;
  if (!Ge(i, St.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let s = e ? Vo(Do(e, i, r)) : void 0;
  const c = s ? s.hash : void 0, [a, u] = Ic(i, c || Y);
  let f;
  s && (f = Ko(s).map((h) => ({
    ...h,
    controlBlock: ye.encode({
      version: (h.version || Ae) + u,
      internalKey: i,
      merklePath: h.path
    })
  })));
  let d;
  f && (d = f.map((h) => [
    ye.decode(h.controlBlock),
    we(h.script, new Uint8Array([h.version || Ae]))
  ]));
  const l = {
    type: "tr",
    script: pt.encode({ type: "tr", pubkey: a }),
    address: Sr(n).encode({ type: "tr", pubkey: a }),
    // For tests
    tweakedPubkey: a,
    // PSBT stuff
    tapInternalKey: i
  };
  return f && (l.leaves = f), d && (l.tapLeafScript = d), c && (l.tapMerkleRoot = c), l;
}
function Vd(t, e, n = !1) {
  return n || Hd(e), {
    type: "tr_ms",
    script: pt.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const ba = Iu(Tt);
function ma(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function so(t, e, n = Oe) {
  ma(t, e);
  const r = t === 0 ? Eo : gc;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Os(t, e) {
  return ba.encode(we(Uint8Array.from(e), t));
}
function Sr(t = Oe) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return so(0, e.hash, t);
      if (n === "wsh")
        return so(0, e.hash, t);
      if (n === "tr")
        return so(1, e.pubkey, t);
      if (n === "pkh")
        return Os(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Os(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = Eo.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = gc.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [o, ...i] = r.words, s = Eo.fromWords(i);
        if (ma(o, s), o === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (o === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (o === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const n = ba.decode(e);
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
class W extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const Kd = new W("leaf not found in tx tree"), Dd = new W("parent not found");
class Md {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new W("empty vtxo tree");
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
    const n = [], o = this.leaves().find((s) => s.txid === e);
    if (!o)
      throw Kd;
    n.push(o);
    const i = this.root().txid;
    for (; n[0].txid !== i; ) {
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
    throw Dd;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = tt.fromPSBT(xt.decode(n.tx)), o = H.encode(Ot(r.toBytes(!0)).reverse());
        if (o !== n.txid)
          throw new W(`node ${n.txid} has txid ${n.txid}, but computed txid is ${o}`);
        try {
          this.findParent(n);
        } catch (i) {
          throw new W(`node ${n.txid} has no parent: ${i instanceof Error ? i.message : String(i)}`);
        }
      }
  }
}
const co = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function Fd(t) {
  if (t.length < co.length)
    return !1;
  for (let e = 0; e < co.length; e++)
    if (t[e] !== co[e])
      return !1;
  return !0;
}
function Ea(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    Fd(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const ao = new Error("missing vtxo tree");
class $n {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = vc();
    return new $n(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return kn.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw ao;
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
      throw ao;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], o = this.tree.levels[n];
      for (let i = 0; i < o.length; i++) {
        const s = o[i], c = tt.fromPSBT(xt.decode(s.tx)), a = this.signPartial(c, n, i);
        a ? r.push(a) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw ao;
    const e = [], n = kn.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const o = [];
      for (let i = 0; i < r.length; i++) {
        const s = Ju(n);
        o.push(s);
      }
      e.push(o);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw $n.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const o = this.myNonces[n][r];
    if (!o)
      return null;
    const i = this.aggregateNonces[n][r];
    if (!i)
      throw new Error("missing aggregate nonce");
    const s = [], c = [], a = Ea(e), { finalKey: u } = ki(a, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let d = 0; d < e.inputsLength; d++) {
      const l = zd(u, this.tree, this.rootSharedOutputAmount, e);
      s.push(l.amount), c.push(l.script);
    }
    const f = e.preimageWitnessV1(
      0,
      // always first input
      c,
      Un.DEFAULT,
      s
    );
    return nd(o.secNonce, this.secretKey, i.pubNonce, a, f, {
      taprootTweak: this.scriptRoot
    });
  }
}
$n.NOT_INITIALIZED = new Error("session not initialized, call init method");
function zd(t, e, n, r) {
  const o = X.encode(["OP_1", t.slice(1)]), i = e.levels[0][0];
  if (!i)
    throw new Error("empty vtxo tree");
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing input txid");
  const c = H.encode(s.txid);
  if (i.parentTxid === c)
    return {
      amount: n,
      script: o
    };
  let a = null;
  for (const d of e.levels) {
    for (const l of d)
      if (l.txid === c) {
        a = l;
        break;
      }
    if (a)
      break;
  }
  if (!a)
    throw new Error("parent tx not found");
  const u = tt.fromPSBT(xt.decode(a.tx));
  if (!s.index)
    throw new Error("missing input index");
  const f = u.getOutput(s.index);
  if (!f)
    throw new Error("parent output not found");
  if (!f.amount)
    throw new Error("parent output amount not found");
  return {
    amount: f.amount,
    script: o
  };
}
const Hs = new Uint8Array(32).fill(0);
class Tr {
  constructor(e) {
    this.key = e || vc();
  }
  static fromPrivateKey(e) {
    return new Tr(e);
  }
  static fromHex(e) {
    return new Tr(H.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, Hs))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const o of n)
      if (!r.signIdx(this.key, o, void 0, Hs))
        throw new Error(`Failed to sign input #${o}`);
    return r;
  }
  xOnlyPublicKey() {
    return fi(this.key);
  }
  signerSession() {
    return $n.random();
  }
}
const Gd = (t) => ue[t], ue = {
  bitcoin: Oe,
  testnet: Gn,
  signet: Gn,
  mutinynet: {
    ...Gn
  },
  regtest: {
    ...Gn,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }
};
class zt {
  /**
   * Get network from HRP prefix
   */
  static networkFromPrefix(e) {
    switch (e) {
      case "ark":
        return ue.bitcoin;
      case "tark":
        return ue.testnet;
      // Both testnet and regtest use tark
      default:
        throw new Error("Invalid Ark address format");
    }
  }
  /**
   * Get HRP prefix from network
   */
  static prefixFromNetwork(e) {
    return e === ue.bitcoin ? "ark" : "tark";
  }
  constructor(e, n, r = ue.testnet) {
    if (!zt.VALID_NETWORKS.includes(r))
      throw new Error("Invalid network");
    this.network = r, this.serverPubKey = new Uint8Array(e), this.tweakedPubKey = new Uint8Array(n);
  }
  static fromTapscripts(e, n, r) {
    const o = Hr(n.map((s) => ({ script: H.decode(s) }))), i = Pr(dn, o, void 0, !0);
    return new zt(e, i.tweakedPubkey, r);
  }
  static decode(e) {
    const n = Wn.decode(e, 1023), r = new Uint8Array(Wn.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const o = r.slice(0, 32), i = r.slice(32, 64), s = zt.networkFromPrefix(n.prefix);
    return new zt(o, i, s);
  }
  /**
   * Get the HRP for this address
   */
  get hrp() {
    return zt.prefixFromNetwork(this.network);
  }
  encode() {
    if (!this.serverPubKey)
      throw new Error("missing Server public key");
    if (!this.tweakedPubKey)
      throw new Error("missing Tweaked public key");
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = Wn.toWords(e);
    return Wn.encode(this.hrp, n, 1023);
  }
  get script() {
    return X.encode(["OP_1", this.tweakedPubKey]);
  }
}
zt.VALID_NETWORKS = [
  ue.bitcoin,
  ue.testnet,
  ue.mutinynet,
  ue.regtest
];
var Ps;
(function(t) {
  t[t.FORFEIT = 0] = "FORFEIT", t[t.EXIT = 1] = "EXIT";
})(Ps || (Ps = {}));
class Re {
  constructor(e, n = Oe) {
    const { pubKey: r, serverPubKey: o, csvTimelock: i = Re.DEFAULT_TIMELOCK } = e;
    this.pubKey = r, this.serverPubKey = o, this.csvTimelock = i, this.forfeitScript = Vd(2, [
      this.pubKey,
      this.serverPubKey
    ]).script, this.exitScript = xa(this.csvTimelock, this.pubKey);
    const s = Hr([
      { script: this.forfeitScript, leafVersion: Ae },
      { script: this.exitScript, leafVersion: Ae }
    ]);
    this.p2tr = Pr(dn, s, n, !0);
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
    return new Re({ pubKey: e, serverPubKey: n }, r);
  }
  /**
   * Create a boarding VTXO tapscript with longer timelock
   */
  static createBoarding(e, n, r, o) {
    return new Re({
      pubKey: e,
      serverPubKey: n,
      csvTimelock: r
    }, o);
  }
}
Re.DEFAULT_TIMELOCK = {
  value: 144n,
  type: "blocks"
};
function xa(t, e) {
  if (e.length !== 32)
    throw new Error("Invalid pubkey length");
  const n = Ui().encode(BigInt(od.encode(t.type === "blocks" ? { blocks: Number(t.value) } : { seconds: Number(t.value) })));
  return X.encode([
    n,
    "CHECKSEQUENCEVERIFY",
    "DROP",
    e,
    "CHECKSIG"
  ]);
}
var Ln;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(Ln || (Ln = {}));
function Wd(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function qd(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function jd(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function Xn(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function Yd(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function Zd(t, e, n) {
  const r = [];
  let o = [...e];
  for (const s of [...t, ...e]) {
    if (s.virtualStatus.state !== "pending" && n.has(s.virtualStatus.batchTxID || ""))
      continue;
    const c = Wd(o, s);
    o = Vs(o, c);
    const a = Xn(c);
    if (s.value <= a)
      continue;
    const u = qd(o, s);
    o = Vs(o, u);
    const f = Xn(u);
    if (s.value <= f)
      continue;
    const d = {
      roundTxid: s.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let l = s.virtualStatus.state !== "pending";
    s.virtualStatus.state === "pending" && (d.redeemTxid = s.txid, s.spentBy && (l = !0)), r.push({
      key: d,
      amount: s.value - a - f,
      type: Ln.TxReceived,
      createdAt: s.createdAt.getTime(),
      settled: l
    });
  }
  const i = /* @__PURE__ */ new Map();
  for (const s of e) {
    if (!s.spentBy)
      continue;
    i.has(s.spentBy) || i.set(s.spentBy, []);
    const c = i.get(s.spentBy);
    i.set(s.spentBy, [...c, s]);
  }
  for (const [s, c] of i) {
    const a = jd([...t, ...e], s), u = Xn(a), f = Xn(c);
    if (f <= u)
      continue;
    const d = Yd(a, c), l = {
      roundTxid: d.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    d.virtualStatus.state === "pending" && (l.redeemTxid = d.txid), r.push({
      key: l,
      amount: f - u,
      type: Ln.TxSent,
      createdAt: d.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function Vs(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var Mo;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(Mo || (Mo = {}));
class Ks {
  static create(e) {
    const { address: n, ...r } = e, o = {};
    for (const [s, c] of Object.entries(r))
      if (c !== void 0)
        if (s === "amount") {
          if (!isFinite(c)) {
            console.warn("Invalid amount");
            continue;
          }
          if (c < 0)
            continue;
          o[s] = c;
        } else s === "ark" ? typeof c == "string" && (c.startsWith("ark") || c.startsWith("tark")) ? o[s] = c : console.warn("Invalid ARK address format") : s === "sp" ? typeof c == "string" && c.startsWith("sp") ? o[s] = c : console.warn("Invalid Silent Payment address format") : (typeof c == "string" || typeof c == "number") && (o[s] = c);
    const i = Object.keys(o).length > 0 ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(o).map(([s, c]) => [
      s,
      String(c)
    ]))).toString() : "";
    return `bitcoin:${n ? n.toLowerCase() : ""}${i}`;
  }
  static parse(e) {
    if (!e.toLowerCase().startsWith("bitcoin:"))
      throw new Error(Mo.INVALID_URI);
    const n = e.slice(e.toLowerCase().indexOf("bitcoin:") + 8), [r, o] = n.split("?"), i = {};
    if (r && (i.address = r.toLowerCase()), o) {
      const s = new URLSearchParams(o);
      for (const [c, a] of s.entries())
        if (a)
          if (c === "amount") {
            const u = Number(a);
            if (!isFinite(u) || u < 0)
              continue;
            i[c] = u;
          } else c === "ark" ? a.startsWith("ark") || a.startsWith("tark") ? i[c] = a : console.warn("Invalid ARK address format") : c === "sp" ? a.startsWith("sp") ? i[c] = a : console.warn("Invalid Silent Payment address format") : i[c] = a;
    }
    return {
      originalString: e,
      params: i
    };
  }
}
function Xd(t, e) {
  const n = [...t].sort((s, c) => c.value - s.value), r = [];
  let o = 0;
  for (const s of n)
    if (r.push(s), o += s.value, o >= e)
      break;
  if (o < e)
    return { inputs: null, changeAmount: 0 };
  const i = o - e;
  return {
    inputs: r,
    changeAmount: i
  };
}
function Qd(t, e) {
  const n = [...t].sort((s, c) => {
    const a = s.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = c.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return a !== u ? a - u : c.value - s.value;
  }), r = [];
  let o = 0;
  for (const s of n)
    if (r.push(s), o += s.value, o >= e)
      break;
  if (o < e)
    return { inputs: null, changeAmount: 0 };
  const i = o - e;
  return {
    inputs: r,
    changeAmount: i
  };
}
const Jd = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class tl {
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
var wt;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(wt || (wt = {}));
class el {
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
    const o = await r.json(), i = (s) => ({
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
      spendableVtxos: [...o.spendableVtxos || []].map(i),
      spentVtxos: [...o.spentVtxos || []].map(i)
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
      const i = await r.text();
      try {
        const s = JSON.parse(i);
        throw new Error(`Failed to submit virtual transaction: ${s.message || s.error || i}`);
      } catch {
        throw new Error(`Failed to submit virtual transaction: ${i}`);
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
          const i = o.body.getReader(), s = new TextDecoder();
          let c = "";
          for (; !r.signal.aborted; ) {
            const { done: a, value: u } = await i.read();
            if (a)
              break;
            c += s.decode(u, { stream: !0 });
            const f = c.split(`
`);
            for (let d = 0; d < f.length - 1; d++) {
              const l = f[d].trim();
              if (l)
                try {
                  const h = JSON.parse(l);
                  e(h);
                } catch (h) {
                  console.error("Failed to parse event:", h);
                }
            }
            c = f[f.length - 1];
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
    for (const c of e)
      typeof c == "string" ? o.push(c) : r.push({
        outpoint: {
          txid: c.outpoint.txid,
          vout: c.outpoint.vout
        },
        tapscripts: {
          scripts: c.tapscripts
        }
      });
    const i = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: r,
        notes: o
      })
    });
    if (!i.ok) {
      const c = await i.text();
      throw new Error(`Failed to register inputs: ${c}`);
    }
    return { requestId: (await i.json()).requestId };
  }
  async registerOutputsForNextRound(e, n, r, o = !1) {
    const i = `${this.serverUrl}/v1/round/registerOutputs`, s = await fetch(i, {
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
          signingAll: o
        }
      })
    });
    if (!s.ok) {
      const c = await s.text();
      throw new Error(`Failed to register outputs: ${c}`);
    }
  }
  async submitTreeNonces(e, n, r) {
    const o = `${this.serverUrl}/v1/round/tree/submitNonces`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeNonces: ol(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Failed to submit tree nonces: ${s}`);
    }
  }
  async submitTreeSignatures(e, n, r) {
    const o = `${this.serverUrl}/v1/round/tree/submitSignatures`, i = await fetch(o, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roundId: e,
        pubkey: n,
        treeSignatures: il(r)
      })
    });
    if (!i.ok) {
      const s = await i.text();
      throw new Error(`Failed to submit tree signatures: ${s}`);
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
        const r = n.body.getReader(), o = new TextDecoder();
        let i = "";
        for (; ; ) {
          const { done: s, value: c } = await r.read();
          if (s)
            break;
          i += o.decode(c, { stream: !0 });
          const a = i.split(`
`);
          for (let u = 0; u < a.length - 1; u++) {
            const f = a[u].trim();
            if (f)
              try {
                const d = JSON.parse(f), l = this.parseSettlementEvent(d.result);
                l && (yield l);
              } catch (d) {
                throw console.error("Failed to parse event:", d), d;
              }
          }
          i = a[a.length - 1];
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
    return e.levels.forEach((r) => r.nodes.forEach((o) => {
      o.parentTxid && n.add(o.parentTxid);
    })), new Md(e.levels.map((r) => r.nodes.map((o) => ({
      txid: o.txid,
      tx: o.tx,
      parentTxid: o.parentTxid,
      leaf: !n.has(o.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: wt.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: wt.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: wt.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: wt.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: wt.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: rl(H.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function Sa(t) {
  let e = 4;
  for (const i of t) {
    e += 4;
    for (const s of i)
      e += 1, e += s.length;
  }
  const n = new ArrayBuffer(e), r = new DataView(n);
  let o = 0;
  r.setUint32(o, t.length, !0), o += 4;
  for (const i of t) {
    r.setUint32(o, i.length, !0), o += 4;
    for (const s of i) {
      const c = s.length > 0;
      r.setInt8(o, c ? 1 : 0), o += 1, c && (new Uint8Array(n).set(s, o), o += s.length);
    }
  }
  return new Uint8Array(n);
}
function nl(t, e) {
  const n = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let r = 0;
  const o = n.getUint32(r, !0);
  r += 4;
  const i = [];
  for (let s = 0; s < o; s++) {
    const c = n.getUint32(r, !0);
    r += 4;
    const a = [];
    for (let u = 0; u < c; u++) {
      const f = n.getUint8(r) === 1;
      if (r += 1, f) {
        const d = new Uint8Array(t.buffer, t.byteOffset + r, e);
        a.push(new Uint8Array(d)), r += e;
      } else
        a.push(new Uint8Array());
    }
    i.push(a);
  }
  return i;
}
function rl(t) {
  return nl(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function ol(t) {
  return H.encode(Sa(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function il(t) {
  return H.encode(Sa(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function sl({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: o, vtxoScript: i, connectorScript: s, serverScript: c, txLocktime: a }) {
  const u = new tt({
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
      script: i,
      amount: n
    },
    sequence: a ? 4294967294 : 4294967295,
    // MAX_SEQUENCE - 1 if locktime is set
    sighashType: Un.DEFAULT
  });
  const f = BigInt(n) + BigInt(r) - BigInt(o);
  return u.addOutput({
    script: c,
    amount: f
  }), u;
}
class Z {
  constructor(e, n, r, o, i, s) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = o, this.inputWitnessSize = i, this.outputSize = s;
  }
  static create() {
    return new Z(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += Z.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Z.INPUT_SIZE + Z.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const o = 1 + Z.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + o, this.inputSize += Z.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += Z.OUTPUT_SIZE + Z.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let i = (Z.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * Z.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += Z.WITNESS_HEADER_SIZE + this.inputWitnessSize), cl(i);
  }
}
Z.P2PKH_SCRIPT_SIG_SIZE = 108;
Z.INPUT_SIZE = 41;
Z.BASE_CONTROL_BLOCK_SIZE = 33;
Z.OUTPUT_SIZE = 9;
Z.P2WKH_OUTPUT_SIZE = 22;
Z.BASE_TX_SIZE = 10;
Z.WITNESS_HEADER_SIZE = 2;
Z.WITNESS_SCALE_FACTOR = 4;
const cl = (t) => {
  const e = BigInt(Math.ceil(t / Z.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, al = new W("invalid settlement transaction"), Fo = new W("invalid settlement transaction outputs"), Ta = new W("empty tree"), ul = new W("invalid root level"), Oi = new W("invalid number of inputs"), Sn = new W("wrong settlement txid"), zo = new W("invalid amount"), fl = new W("no leaves"), dl = new W("node transaction empty"), ll = new W("node txid empty"), hl = new W("node parent txid empty"), pl = new W("node txid different"), Ds = new W("parent txid input mismatch"), wl = new W("leaf node has children"), Ms = new W("invalid taproot script"), gl = new W("invalid internal key");
new W("invalid control block");
const yl = new W("invalid root transaction"), bl = new W("invalid node transaction"), uo = 0, Fs = 1;
function ml(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw Ta;
  const r = tt.fromPSBT(xt.decode(n.tx));
  if (r.inputsLength !== 1)
    throw Oi;
  const o = r.getInput(0), i = tt.fromPSBT(xt.decode(t));
  if (i.outputsLength <= Fs)
    throw Fo;
  const s = H.encode(Ot(i.toBytes(!0)).reverse());
  if (!o.txid || H.encode(o.txid) !== s || o.index !== Fs)
    throw Sn;
}
function El(t, e, n) {
  e.validate();
  let r;
  try {
    r = tt.fromPSBT(xt.decode(t));
  } catch {
    throw al;
  }
  if (r.outputsLength <= uo)
    throw Fo;
  const o = r.getOutput(uo);
  if (!(o != null && o.amount))
    throw Fo;
  const i = o.amount;
  if (e.numberOfNodes() === 0)
    throw Ta;
  if (e.levels[0].length !== 1)
    throw ul;
  const c = e.levels[0][0];
  let a;
  try {
    a = tt.fromPSBT(xt.decode(c.tx));
  } catch {
    throw yl;
  }
  if (a.inputsLength !== 1)
    throw Oi;
  const u = a.getInput(0);
  if (!u.txid || u.index === void 0)
    throw Sn;
  const f = H.encode(Ot(r.toBytes(!0)).reverse());
  if (H.encode(u.txid) !== f || u.index !== uo)
    throw Sn;
  let d = 0n;
  for (let l = 0; l < a.outputsLength; l++) {
    const h = a.getOutput(l);
    h != null && h.amount && (d += h.amount);
  }
  if (d >= i)
    throw zo;
  if (e.leaves().length === 0)
    throw fl;
  for (const l of e.levels)
    for (const h of l)
      xl(e, h, n);
}
function xl(t, e, n) {
  if (!e.tx)
    throw dl;
  if (!e.txid)
    throw ll;
  if (!e.parentTxid)
    throw hl;
  let r;
  try {
    r = tt.fromPSBT(xt.decode(e.tx));
  } catch {
    throw bl;
  }
  if (H.encode(Ot(r.toBytes(!0)).reverse()) !== e.txid)
    throw pl;
  if (r.inputsLength !== 1)
    throw Oi;
  const i = r.getInput(0);
  if (!i.txid || H.encode(i.txid) !== e.parentTxid)
    throw Ds;
  const s = t.children(e.txid);
  if (e.leaf && s.length >= 1)
    throw wl;
  for (let c = 0; c < s.length; c++) {
    const a = s[c], u = tt.fromPSBT(xt.decode(a.tx)), f = r.getOutput(c);
    if (!(f != null && f.script))
      throw Ms;
    const d = f.script.slice(2);
    if (d.length !== 32)
      throw Ms;
    const l = Ea(u), { finalKey: h } = ki(l, !0, {
      taprootTweak: n
    });
    if (H.encode(h) !== H.encode(d.slice(2)))
      throw gl;
    let b = 0n;
    for (let w = 0; w < u.outputsLength; w++) {
      const p = u.getOutput(w);
      p != null && p.amount && (b += p.amount);
    }
    if (!f.amount || b >= f.amount)
      throw zo;
  }
}
class ae {
  constructor(e, n, r, o, i, s, c, a) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = o, this.arkProvider = i, this.offchainAddress = s, this.boardingAddress = c, this.offchainTapscript = a;
  }
  static async create(e) {
    const n = Gd(e.network), r = new tl(e.esploraUrl || Jd[e.network]), o = e.identity.xOnlyPublicKey();
    if (!o)
      throw new Error("Invalid configured public key");
    let i;
    e.arkServerUrl && (i = new el(e.arkServerUrl));
    const s = Pr(o, void 0, n);
    if (i) {
      let c = e.arkServerPublicKey, a = e.boardingTimelock;
      if (!c || !a) {
        const w = await i.getInfo();
        c = w.pubkey, a = {
          value: w.unilateralExitDelay,
          type: w.unilateralExitDelay < 512 ? "blocks" : "seconds"
        };
      }
      const u = H.decode(c).slice(1), f = Re.createBareVtxo(o, u, n), d = Re.createBoarding(o, u, a, n), l = {
        address: new zt(u, f.toP2TR().tweakedPubkey, n).encode(),
        scripts: {
          exit: [H.encode(f.getExitScript())],
          forfeit: [H.encode(f.getForfeitScript())]
        }
      }, h = {
        address: d.toP2TR().address,
        scripts: {
          exit: [H.encode(d.getExitScript())],
          forfeit: [H.encode(d.getForfeitScript())]
        }
      }, b = f;
      return new ae(e.identity, n, r, s, i, l, h, b);
    }
    return new ae(e.identity, n, r, s);
  }
  get onchainAddress() {
    return this.onchainP2TR.address || "";
  }
  getAddress() {
    const e = {
      onchain: this.onchainAddress,
      bip21: Ks.create({
        address: this.onchainAddress
      })
    };
    return this.arkProvider && this.offchainAddress && (e.offchain = this.offchainAddress, e.bip21 = Ks.create({
      address: this.onchainP2TR.address,
      ark: this.offchainAddress.address
    }), e.boarding = this.boardingAddress), Promise.resolve(e);
  }
  async getBalance() {
    const e = await this.getCoins(), n = e.filter((u) => u.status.confirmed).reduce((u, f) => u + f.value, 0), r = e.filter((u) => !u.status.confirmed).reduce((u, f) => u + f.value, 0), o = n + r;
    let i = 0, s = 0, c = 0;
    if (this.arkProvider) {
      const u = await this.getVirtualCoins();
      i = u.filter((f) => f.virtualStatus.state === "settled").reduce((f, d) => f + d.value, 0), s = u.filter((f) => f.virtualStatus.state === "pending").reduce((f, d) => f + d.value, 0), c = u.filter((f) => f.virtualStatus.state === "swept").reduce((f, d) => f + d.value, 0);
    }
    const a = i + s;
    return {
      onchain: {
        confirmed: n,
        unconfirmed: r,
        total: o
      },
      offchain: {
        swept: c,
        settled: i,
        pending: s,
        total: a
      },
      total: o + a
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
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.address), { boardingTxs: r, roundsToIgnore: o } = await this.getBoardingTxs(), i = Zd(e, n, o), s = [...r, ...i];
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
    const o = [], i = [];
    for (const s of n) {
      const c = {
        key: {
          boardingTxid: s.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: s.value,
        type: Ln.TxReceived,
        settled: s.virtualStatus.state === "swept",
        createdAt: s.status.block_time ? new Date(s.status.block_time * 1e3).getTime() : 0
      };
      s.status.block_time ? i.push(c) : o.push(c);
    }
    return {
      boardingTxs: [...o, ...i],
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
    if (e.amount < ae.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return zt.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || ae.FEE_RATE, o = Math.ceil(174 * r), i = e.amount + o, s = Xd(n, i);
    if (!s.inputs)
      throw new Error("Insufficient funds");
    let c = new tt();
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
    const r = await this.getVirtualCoins(), o = n ? 0 : Math.ceil(174 * (e.feeRate || ae.FEE_RATE)), i = e.amount + o, s = Qd(r, i);
    if (!s || !s.inputs)
      throw new Error("Insufficient funds");
    let c = new tt({
      allowUnknownOutputs: !0,
      disableScriptCheck: !0,
      allowUnknownInputs: !0
    });
    for (const d of s.inputs) {
      const l = this.offchainTapscript.toP2TR(), h = H.encode(this.offchainTapscript.getForfeitScript()), b = (f = l.leaves) == null ? void 0 : f.find((w) => H.encode(w.script) === h);
      if (!b)
        throw new Error("Selected leaf not found");
      c.addInput({
        txid: d.txid,
        index: d.vout,
        witnessUtxo: {
          script: l.script,
          amount: BigInt(d.value)
        },
        tapInternalKey: void 0,
        tapLeafScript: [
          [
            {
              version: Ae,
              internalKey: dn,
              merklePath: b.path
            },
            new Uint8Array([
              ...b.script,
              Ae
            ])
          ]
        ]
      });
    }
    const a = zt.decode(e.address);
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
    return this.arkProvider.submitVirtualTx(xt.encode(u));
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let w = 0;
      const p = await this.getBoardingUtxos();
      w += p.reduce((E, A) => E + A.value, 0);
      const g = await this.getVtxos();
      w += g.reduce((E, A) => E + A.value, 0);
      const y = [...p, ...g];
      if (y.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: y,
        outputs: [
          {
            address: this.offchainAddress.address,
            amount: BigInt(w)
          }
        ]
      };
    }
    const { requestId: r } = await this.arkProvider.registerInputsForNextRound(e.inputs), o = e.outputs.some((w) => this.isOffchainSuitable(w.address));
    let i;
    const s = [];
    o && (i = this.identity.signerSession(), s.push(H.encode(i.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, s);
    const c = setInterval(() => {
      var w;
      (w = this.arkProvider) == null || w.ping(r).catch(u);
    }, 1e3);
    let a = !0;
    const u = () => {
      a && (a = !1, clearInterval(c));
    }, f = this.arkProvider.getEventStream();
    let d;
    o || (d = wt.SigningNoncesGenerated);
    const l = await this.arkProvider.getInfo(), h = xa({
      value: l.batchExpiry,
      type: l.batchExpiry >= 512n ? "seconds" : "blocks"
    }, H.decode(l.pubkey).slice(1)), b = Ze(h);
    for await (const w of f) {
      switch (n && n(w), w.type) {
        // the settlement failed
        case wt.Failed:
          if (d === void 0)
            continue;
          throw u(), new Error(w.reason);
        // the server has started the signing process of the vtxo tree transactions
        // the server expects the partial musig2 nonces for each tx
        case wt.SigningStart:
          if (d !== void 0)
            continue;
          if (u(), o) {
            if (!i)
              throw new Error("Signing session not found");
            await this.handleSettlementSigningEvent(w, b, i);
          }
          break;
        // the musig2 nonces of the vtxo tree transactions are generated
        // the server expects now the partial musig2 signatures
        case wt.SigningNoncesGenerated:
          if (d !== wt.SigningStart)
            continue;
          if (u(), o) {
            if (!i)
              throw new Error("Signing session not found");
            await this.handleSettlementSigningNoncesGeneratedEvent(w, i);
          }
          break;
        // the vtxo tree is signed, craft, sign and submit forfeit transactions
        // if any boarding utxos are involved, the settlement tx is also signed
        case wt.Finalization:
          if (d !== wt.SigningNoncesGenerated)
            continue;
          u(), await this.handleSettlementFinalizationEvent(w, e.inputs, l);
          break;
        // the settlement is done, last event to be received
        case wt.Finalized:
          if (d !== wt.Finalization)
            continue;
          return w.roundTxid;
      }
      d = w.type;
    }
    throw new Error("Settlement failed");
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const o = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    El(e.unsignedSettlementTx, o, n);
    const i = xt.decode(e.unsignedSettlementTx), c = tt.fromPSBT(i).getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(o, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, H.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, H.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const o = Sr(this.network).decode(r.forfeitAddress), i = pt.encode(o), s = [], c = await this.getVirtualCoins();
    let a = tt.fromPSBT(xt.decode(e.roundTx)), u = !1, f = !1;
    for (const d of n) {
      if (typeof d == "string")
        continue;
      const l = Sl(d, this.network), h = c.find((A) => A.txid === d.outpoint.txid && A.vout === d.outpoint.vout);
      if (!h) {
        u = !0;
        const A = [];
        for (let v = 0; v < a.inputsLength; v++) {
          const B = a.getInput(v);
          if (!B.txid || B.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          H.encode(B.txid) === d.outpoint.txid && B.index === d.outpoint.vout && (a.updateInput(v, {
            tapLeafScript: [l]
          }), A.push(v));
        }
        a = await this.identity.sign(a, A);
        continue;
      }
      f || (ml(e.roundTx, e.connectors), f = !0);
      const b = ye.encode(l[0]), w = Z.create().addKeySpendInput().addTapscriptInput(
        64 * 2,
        // TODO: handle conditional script
        l[1].length,
        b.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), p = e.connectors.leaves(), g = e.connectorsIndex.get(`${h.txid}:${h.vout}`);
      if (!g)
        throw new Error("Connector outpoint not found");
      let y;
      for (const A of p)
        if (A.txid === g.txid)
          try {
            y = tt.fromPSBT(xt.decode(A.tx)).getOutput(g.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!y || !y.amount || !y.script)
        throw new Error("Connector output not found");
      let E = sl({
        connectorInput: g,
        connectorAmount: y.amount,
        feeAmount: w,
        serverScript: i,
        connectorScript: y.script,
        vtxoAmount: BigInt(h.value),
        vtxoInput: d.outpoint,
        vtxoScript: zt.fromTapscripts(H.decode(r.pubkey), d.tapscripts, this.network).script
      });
      E.updateInput(1, {
        tapLeafScript: [l]
      }), E = await this.identity.sign(E, [1]), s.push(xt.encode(E.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(s, u ? xt.encode(a.toPSBT()) : void 0);
  }
}
ae.DUST_AMOUNT = BigInt(546);
ae.FEE_RATE = 1;
function Sl(t, e) {
  var s;
  const n = Ze(H.decode(t.forfeitScript), Ae), r = Hr(t.tapscripts.map((c) => ({
    script: H.decode(c)
  }))), o = Pr(dn, r, e, !0);
  if (!o.leaves || !o.tapLeafScript)
    throw new Error("invalid vtxo tapscripts");
  const i = (s = o.leaves) == null ? void 0 : s.findIndex((c) => H.encode(c.hash) === H.encode(n));
  if (i === -1 || i === void 0)
    throw new Error("forfeit tapscript not found in vtxo tapscripts");
  return o.tapLeafScript[i];
}
var R;
(function(t) {
  t.walletInitialized = {
    type: "WALLET_INITIALIZED",
    success: !0
  };
  function e(m) {
    return {
      type: "ERROR",
      success: !1,
      message: m
    };
  }
  t.error = e;
  function n(m) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: m
    };
  }
  t.settleEvent = n;
  function r(m) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: m
    };
  }
  t.settleSuccess = r;
  function o(m) {
    return m.type === "SETTLE_SUCCESS" && m.success;
  }
  t.isSettleSuccess = o;
  function i(m) {
    return m.type === "ADDRESS" && m.success === !0;
  }
  t.isAddress = i;
  function s(m) {
    return {
      type: "ADDRESS",
      success: !0,
      address: m
    };
  }
  t.address = s;
  function c(m) {
    return m.type === "BALANCE" && m.success === !0;
  }
  t.isBalance = c;
  function a(m) {
    return {
      type: "BALANCE",
      success: !0,
      balance: m
    };
  }
  t.balance = a;
  function u(m) {
    return m.type === "COINS" && m.success === !0;
  }
  t.isCoins = u;
  function f(m) {
    return {
      type: "COINS",
      success: !0,
      coins: m
    };
  }
  t.coins = f;
  function d(m) {
    return m.type === "VTXOS" && m.success === !0;
  }
  t.isVtxos = d;
  function l(m) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: m
    };
  }
  t.vtxos = l;
  function h(m) {
    return m.type === "VIRTUAL_COINS" && m.success === !0;
  }
  t.isVirtualCoins = h;
  function b(m) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: m
    };
  }
  t.virtualCoins = b;
  function w(m) {
    return m.type === "BOARDING_UTXOS" && m.success === !0;
  }
  t.isBoardingUtxos = w;
  function p(m) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: m
    };
  }
  t.boardingUtxos = p;
  function g(m) {
    return m.type === "SEND_BITCOIN_SUCCESS" && m.success === !0;
  }
  t.isSendBitcoinSuccess = g;
  function y(m) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: m
    };
  }
  t.sendBitcoinSuccess = y;
  function E(m) {
    return m.type === "TRANSACTION_HISTORY" && m.success === !0;
  }
  t.isTransactionHistory = E;
  function A(m) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: m
    };
  }
  t.transactionHistory = A;
  function v(m) {
    return m.type === "WALLET_STATUS" && m.success === !0;
  }
  t.isWalletStatus = v;
  function B(m) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: m
      }
    };
  }
  t.walletStatus = B;
})(R || (R = {}));
var Lt;
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
  function o(h) {
    return h.type === "GET_ADDRESS";
  }
  t.isGetAddress = o;
  function i(h) {
    return h.type === "GET_BALANCE";
  }
  t.isGetBalance = i;
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
  function d(h) {
    return h.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = d;
  function l(h) {
    return h.type === "GET_STATUS";
  }
  t.isGetStatus = l;
})(Lt || (Lt = {}));
class Tl {
  async start() {
    self.addEventListener("message", async (e) => {
      await this.handleMessage(e);
    });
  }
  async handleInitWallet(e) {
    var r, o, i;
    const n = e.data;
    if (!Lt.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.wallet = await ae.create({
        network: n.network,
        identity: Tr.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (o = e.source) == null || o.postMessage(R.walletInitialized);
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const c = s instanceof Error ? s.message : "Unknown error occurred";
      (i = e.source) == null || i.postMessage(R.error(c));
    }
  }
  async handleSettle(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
        return;
      }
      const c = await this.wallet.settle(n.params, (a) => {
        var u;
        (u = e.source) == null || u.postMessage(R.settleEvent(a));
      });
      (i = e.source) == null || i.postMessage(R.settleSuccess(c));
    } catch (c) {
      console.error("Error settling:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleSendBitcoin(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (i = e.source) == null || i.postMessage(R.sendBitcoinSuccess(c));
    } catch (c) {
      console.error("Error sending bitcoin:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetAddress(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getAddress();
      (i = e.source) == null || i.postMessage(R.address(c));
    } catch (c) {
      console.error("Error getting address:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetBalance(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBalance();
      (i = e.source) == null || i.postMessage(R.balance(c));
    } catch (c) {
      console.error("Error getting balance:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetCoins(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins();
      (i = e.source) == null || i.postMessage(R.coins(c));
    } catch (c) {
      console.error("Error getting coins:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetVtxos(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getVtxos();
      (i = e.source) == null || i.postMessage(R.vtxos(c));
    } catch (c) {
      console.error("Error getting vtxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBoardingUtxos();
      (i = e.source) == null || i.postMessage(R.boardingUtxos(c));
    } catch (c) {
      console.error("Error getting boarding utxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, o, i, s;
    const n = e.data;
    if (!Lt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (o = e.source) == null || o.postMessage(R.error("Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getTransactionHistory();
      (i = e.source) == null || i.postMessage(R.transactionHistory(c));
    } catch (c) {
      console.error("Error getting transaction history:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(R.error(a));
    }
  }
  async handleGetStatus(e) {
    var r, o;
    const n = e.data;
    if (!Lt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(R.error("Invalid GET_STATUS message format"));
      return;
    }
    (o = e.source) == null || o.postMessage(R.walletStatus(this.wallet !== void 0));
  }
  async handleMessage(e) {
    var r, o;
    const n = e.data;
    if (!Lt.isBase(n)) {
      (r = e.source) == null || r.postMessage(R.error("Invalid message format"));
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
        (o = e.source) == null || o.postMessage(R.error("Unknown message type"));
    }
  }
}
const Al = new Tl();
Al.start().catch(console.error);
