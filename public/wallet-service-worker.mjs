function Xi(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function Pu(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Rt(t, ...e) {
  if (!Pu(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Hu(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  Xi(t.outputLen), Xi(t.blockLen);
}
function Lr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Vu(t, e) {
  Rt(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const nn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ii(t) {
  return new DataView(t.buffer, t.byteOffset, t.byteLength);
}
function oe(t, e) {
  return t << 32 - e | t >>> e;
}
function wr(t, e) {
  return t << e | t >>> 32 - e >>> 0;
}
function Mu(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function Oo(t) {
  return typeof t == "string" && (t = Mu(t)), Rt(t), t;
}
function Du(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    Rt(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
let zc = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function Gc(t) {
  const e = (r) => t().update(Oo(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function Po(t = 32) {
  if (nn && typeof nn.getRandomValues == "function")
    return nn.getRandomValues(new Uint8Array(t));
  if (nn && typeof nn.randomBytes == "function")
    return nn.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Fu(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), s = Number(n >> i & o), c = Number(n & o), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
function Ku(t, e, n) {
  return t & e ^ ~t & n;
}
function qu(t, e, n) {
  return t & e ^ t & n ^ e & n;
}
let Wc = class extends zc {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Ii(this.buffer);
  }
  update(e) {
    Lr(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = Oo(e);
    const o = e.length;
    for (let s = 0; s < o; ) {
      const c = Math.min(i - this.pos, o - s);
      if (c === i) {
        const a = Ii(e);
        for (; i <= o - s; s += i)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    Lr(this), Vu(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > i - s && (this.process(r, 0), s = 0);
    for (let f = s; f < i; f++)
      n[f] = 0;
    Fu(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = Ii(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      c.setUint32(4 * f, l[f], o);
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
const zu = /* @__PURE__ */ new Uint32Array([
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
]), ke = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Be = /* @__PURE__ */ new Uint32Array(64);
let Gu = class extends Wc {
  constructor() {
    super(64, 32, 8, !1), this.A = ke[0] | 0, this.B = ke[1] | 0, this.C = ke[2] | 0, this.D = ke[3] | 0, this.E = ke[4] | 0, this.F = ke[5] | 0, this.G = ke[6] | 0, this.H = ke[7] | 0;
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
    for (let f = 0; f < 16; f++, n += 4)
      Be[f] = e.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const d = Be[f - 15], h = Be[f - 2], y = oe(d, 7) ^ oe(d, 18) ^ d >>> 3, w = oe(h, 17) ^ oe(h, 19) ^ h >>> 10;
      Be[f] = w + Be[f - 7] + y + Be[f - 16] | 0;
    }
    let { A: r, B: i, C: o, D: s, E: c, F: a, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const d = oe(c, 6) ^ oe(c, 11) ^ oe(c, 25), h = l + d + Ku(c, a, u) + zu[f] + Be[f] | 0, w = (oe(r, 2) ^ oe(r, 13) ^ oe(r, 22)) + qu(r, i, o) | 0;
      l = u, u = a, a = c, c = s + h | 0, s = o, o = i, i = r, r = h + w | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, o, s, c, a, u, l);
  }
  roundClean() {
    Be.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
};
const Lt = /* @__PURE__ */ Gc(() => new Gu());
let Yc = class extends zc {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Hu(e);
    const r = Oo(n);
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
    return Lr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    Lr(this), Rt(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
const jc = (t, e, n) => new Yc(t, e).update(n).digest();
jc.create = (t, e) => new Yc(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const si = /* @__PURE__ */ BigInt(0), ci = /* @__PURE__ */ BigInt(1), Wu = /* @__PURE__ */ BigInt(2);
function Je(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function ir(t) {
  if (!Je(t))
    throw new Error("Uint8Array expected");
}
function pn(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const Yu = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function wn(t) {
  ir(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += Yu[t[n]];
  return e;
}
function sn(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function Ho(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? si : BigInt("0x" + t);
}
const we = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Us(t) {
  if (t >= we._0 && t <= we._9)
    return t - we._0;
  if (t >= we.A && t <= we.F)
    return t - (we.A - 10);
  if (t >= we.a && t <= we.f)
    return t - (we.a - 10);
}
function gn(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const s = Us(t.charCodeAt(o)), c = Us(t.charCodeAt(o + 1));
    if (s === void 0 || c === void 0) {
      const a = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + o);
    }
    r[i] = s * 16 + c;
  }
  return r;
}
function _t(t) {
  return Ho(wn(t));
}
function Vo(t) {
  return ir(t), Ho(wn(Uint8Array.from(t).reverse()));
}
function re(t, e) {
  return gn(t.toString(16).padStart(e * 2, "0"));
}
function Mo(t, e) {
  return re(t, e).reverse();
}
function ju(t) {
  return gn(sn(t));
}
function At(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = gn(e);
    } catch (o) {
      throw new Error(t + " must be hex string or Uint8Array, cause: " + o);
    }
  else if (Je(e))
    r = Uint8Array.from(e);
  else
    throw new Error(t + " must be hex string or Uint8Array");
  const i = r.length;
  if (typeof n == "number" && i !== n)
    throw new Error(t + " of length " + n + " expected, got " + i);
  return r;
}
function He(...t) {
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
function yn(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function Zu(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const ki = (t) => typeof t == "bigint" && si <= t;
function mn(t, e, n) {
  return ki(t) && ki(e) && ki(n) && e <= t && t < n;
}
function Kt(t, e, n, r) {
  if (!mn(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Zc(t) {
  let e;
  for (e = 0; t > si; t >>= ci, e += 1)
    ;
  return e;
}
function Xu(t, e) {
  return t >> BigInt(e) & ci;
}
function Qu(t, e, n) {
  return t | (n ? ci : si) << BigInt(e);
}
const Do = (t) => (Wu << BigInt(t - 1)) - ci, Bi = (t) => new Uint8Array(t), $s = (t) => Uint8Array.from(t);
function Xc(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = Bi(t), i = Bi(t), o = 0;
  const s = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...f) => n(i, r, ...f), a = (f = Bi()) => {
    i = c($s([0]), f), r = c(), f.length !== 0 && (i = c($s([1]), f), r = c());
  }, u = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let f = 0;
    const d = [];
    for (; f < e; ) {
      r = c();
      const h = r.slice();
      d.push(h), f += r.length;
    }
    return He(...d);
  };
  return (f, d) => {
    s(), a(f);
    let h;
    for (; !(h = d(u())); )
      a();
    return s(), h;
  };
}
const Ju = {
  bigint: (t) => typeof t == "bigint",
  function: (t) => typeof t == "function",
  boolean: (t) => typeof t == "boolean",
  string: (t) => typeof t == "string",
  stringOrUint8Array: (t) => typeof t == "string" || Je(t),
  isSafeInteger: (t) => Number.isSafeInteger(t),
  array: (t) => Array.isArray(t),
  field: (t, e) => e.Fp.isValid(t),
  hash: (t) => typeof t == "function" && Number.isSafeInteger(t.outputLen)
};
function or(t, e, n = {}) {
  const r = (i, o, s) => {
    const c = Ju[o];
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
const tf = () => {
  throw new Error("not implemented");
};
function Qi(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
const ef = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Kt,
  abool: pn,
  abytes: ir,
  bitGet: Xu,
  bitLen: Zc,
  bitMask: Do,
  bitSet: Qu,
  bytesToHex: wn,
  bytesToNumberBE: _t,
  bytesToNumberLE: Vo,
  concatBytes: He,
  createHmacDrbg: Xc,
  ensureBytes: At,
  equalBytes: yn,
  hexToBytes: gn,
  hexToNumber: Ho,
  inRange: mn,
  isBytes: Je,
  memoized: Qi,
  notImplemented: tf,
  numberToBytesBE: re,
  numberToBytesLE: Mo,
  numberToHexUnpadded: sn,
  numberToVarBytesBE: ju,
  utf8ToBytes: Zu,
  validateObject: or
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const gt = BigInt(0), rt = BigInt(1), Ye = /* @__PURE__ */ BigInt(2), nf = /* @__PURE__ */ BigInt(3), Ji = /* @__PURE__ */ BigInt(4), Cs = /* @__PURE__ */ BigInt(5), Ls = /* @__PURE__ */ BigInt(8);
function wt(t, e) {
  const n = t % e;
  return n >= gt ? n : e + n;
}
function rf(t, e, n) {
  if (e < gt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= gt)
    throw new Error("invalid modulus");
  if (n === rt)
    return gt;
  let r = rt;
  for (; e > gt; )
    e & rt && (r = r * t % n), t = t * t % n, e >>= rt;
  return r;
}
function qt(t, e, n) {
  let r = t;
  for (; e-- > gt; )
    r *= r, r %= n;
  return r;
}
function to(t, e) {
  if (t === gt)
    throw new Error("invert: expected non-zero number");
  if (e <= gt)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = wt(t, e), r = e, i = gt, o = rt;
  for (; n !== gt; ) {
    const c = r / n, a = r % n, u = i - o * c;
    r = n, n = a, i = o, o = u;
  }
  if (r !== rt)
    throw new Error("invert: does not exist");
  return wt(i, e);
}
function of(t) {
  const e = (t - rt) / Ye;
  let n, r, i;
  for (n = t - rt, r = 0; n % Ye === gt; n /= Ye, r++)
    ;
  for (i = Ye; i < t && rf(i, e, t) !== t - rt; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + rt) / Ji;
    return function(a, u) {
      const l = a.pow(u, s);
      if (!a.eql(a.sqr(l), u))
        throw new Error("Cannot find square root");
      return l;
    };
  }
  const o = (n + rt) / Ye;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, l = c.pow(c.mul(c.ONE, i), n), f = c.pow(a, o), d = c.pow(a, n);
    for (; !c.eql(d, c.ONE); ) {
      if (c.eql(d, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(d); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const y = c.pow(l, rt << BigInt(u - h - 1));
      l = c.sqr(y), f = c.mul(f, y), d = c.mul(d, l), u = h;
    }
    return f;
  };
}
function sf(t) {
  if (t % Ji === nf) {
    const e = (t + rt) / Ji;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % Ls === Cs) {
    const e = (t - Cs) / Ls;
    return function(r, i) {
      const o = r.mul(i, Ye), s = r.pow(o, e), c = r.mul(i, s), a = r.mul(r.mul(c, Ye), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), i))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return of(t);
}
const cf = [
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
function af(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = cf.reduce((r, i) => (r[i] = "function", r), e);
  return or(t, n);
}
function uf(t, e, n) {
  if (n < gt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === gt)
    return t.ONE;
  if (n === rt)
    return e;
  let r = t.ONE, i = e;
  for (; n > gt; )
    n & rt && (r = t.mul(r, i)), i = t.sqr(i), n >>= rt;
  return r;
}
function ff(t, e) {
  const n = new Array(e.length), r = e.reduce((o, s, c) => t.is0(s) ? o : (n[c] = o, t.mul(o, s)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, s, c) => t.is0(s) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, s)), i), n;
}
function Qc(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Jc(t, e, n = !1, r = {}) {
  if (t <= gt)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = Qc(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    isLE: n,
    BITS: i,
    BYTES: o,
    MASK: Do(i),
    ZERO: gt,
    ONE: rt,
    create: (a) => wt(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return gt <= a && a < t;
    },
    is0: (a) => a === gt,
    isOdd: (a) => (a & rt) === rt,
    neg: (a) => wt(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => wt(a * a, t),
    add: (a, u) => wt(a + u, t),
    sub: (a, u) => wt(a - u, t),
    mul: (a, u) => wt(a * u, t),
    pow: (a, u) => uf(c, a, u),
    div: (a, u) => wt(a * to(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => to(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = sf(t)), s(c, a))),
    invertBatch: (a) => ff(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, l) => l ? u : a,
    toBytes: (a) => n ? Mo(a, o) : re(a, o),
    fromBytes: (a) => {
      if (a.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + a.length);
      return n ? Vo(a) : _t(a);
    }
  });
  return Object.freeze(c);
}
function ta(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function ea(t) {
  const e = ta(t);
  return e + Math.ceil(e / 2);
}
function lf(t, e, n = !1) {
  const r = t.length, i = ta(e), o = ea(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const s = n ? Vo(t) : _t(t), c = wt(s, e - rt) + rt;
  return n ? Mo(c, i) : re(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Rs = BigInt(0), gr = BigInt(1);
function Ni(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function na(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Ui(t, e) {
  na(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function df(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function hf(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const $i = /* @__PURE__ */ new WeakMap(), ra = /* @__PURE__ */ new WeakMap();
function Ci(t) {
  return ra.get(t) || 1;
}
function pf(t, e) {
  return {
    constTimeNegate: Ni,
    hasPrecomputes(n) {
      return Ci(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > Rs; )
        r & gr && (i = i.add(o)), o = o.double(), r >>= gr;
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
      const { windows: i, windowSize: o } = Ui(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < i; u++) {
        a = c, s.push(a);
        for (let l = 1; l < o; l++)
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
      const { windows: o, windowSize: s } = Ui(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), l = 2 ** n, f = BigInt(n);
      for (let d = 0; d < o; d++) {
        const h = d * s;
        let y = Number(i & u);
        i >>= f, y > s && (y -= l, i += gr);
        const w = h, p = h + Math.abs(y) - 1, g = d % 2 !== 0, m = y < 0;
        y === 0 ? a = a.add(Ni(g, r[w])) : c = c.add(Ni(m, r[p]));
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
      const { windows: s, windowSize: c } = Ui(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, l = BigInt(n);
      for (let f = 0; f < s; f++) {
        const d = f * c;
        if (i === Rs)
          break;
        let h = Number(i & a);
        if (i >>= l, h > c && (h -= u, i += gr), h === 0)
          continue;
        let y = r[d + Math.abs(h) - 1];
        h < 0 && (y = y.negate()), o = o.add(y);
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = $i.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && $i.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = Ci(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const s = Ci(n);
      return s === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      na(r, e), ra.set(n, r), $i.delete(n);
    }
  };
}
function wf(t, e, n, r) {
  if (df(n, t), hf(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = Zc(BigInt(n.length)), s = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(i), u = Math.floor((e.BITS - 1) / s) * s;
  let l = i;
  for (let f = u; f >= 0; f -= s) {
    a.fill(i);
    for (let h = 0; h < r.length; h++) {
      const y = r[h], w = Number(y >> BigInt(f) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let d = i;
    for (let h = a.length - 1, y = i; h > 0; h--)
      y = y.add(a[h]), d = d.add(y);
    if (l = l.add(d), f !== 0)
      for (let h = 0; h < s; h++)
        l = l.double();
  }
  return l;
}
function ia(t) {
  return af(t.Fp), or(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Qc(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function _s(t) {
  t.lowS !== void 0 && pn("lowS", t.lowS), t.prehash !== void 0 && pn("prehash", t.prehash);
}
function gf(t) {
  const e = ia(t);
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
const { bytesToNumberBE: yf, hexToBytes: mf } = ef;
class Ef extends Error {
  constructor(e = "") {
    super(e);
  }
}
const me = {
  // asn.1 DER encoding utils
  Err: Ef,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = me;
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
      const { Err: n } = me;
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
        for (const l of u)
          s = s << 8 | l;
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
      const { Err: e } = me;
      if (t < Se)
        throw new e("integer: negative integers are not allowed");
      let n = sn(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = me;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return yf(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = me, i = typeof t == "string" ? mf(t) : t;
    ir(i);
    const { v: o, l: s } = r.decode(48, i);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, o), { v: u, l } = r.decode(2, a);
    if (l.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = me, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, Se = BigInt(0), ht = BigInt(1);
BigInt(2);
const Os = BigInt(3);
BigInt(4);
function bf(t) {
  const e = gf(t), { Fp: n } = e, r = Jc(e.n, e.nBitLength), i = e.toBytes || ((w, p, g) => {
    const m = p.toAffine();
    return He(Uint8Array.from([4]), n.toBytes(m.x), n.toBytes(m.y));
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
    return mn(w, ht, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: m, n: E } = e;
    if (p && typeof w != "bigint") {
      if (Je(w) && (w = wn(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let A;
    try {
      A = typeof w == "bigint" ? w : _t(At("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return m && (A = wt(A, E)), Kt("private key", A, ht, E), A;
  }
  function u(w) {
    if (!(w instanceof d))
      throw new Error("ProjectivePoint expected");
  }
  const l = Qi((w, p) => {
    const { px: g, py: m, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y: m };
    const A = w.is0();
    p == null && (p = A ? n.ONE : n.inv(E));
    const I = n.mul(g, p), k = n.mul(m, p), B = n.mul(E, p);
    if (A)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(B, n.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), f = Qi((w) => {
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
      const E = (A) => n.eql(A, n.ZERO);
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
      const g = d.fromAffine(o(At("pointHex", p)));
      return g.assertValidity(), g;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(p) {
      return d.BASE.multiply(a(p));
    }
    // Multiscalar Multiplication
    static msm(p, g) {
      return wf(d, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      y.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      f(this);
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
      const { px: g, py: m, pz: E } = this, { px: A, py: I, pz: k } = p, B = n.eql(n.mul(g, k), n.mul(A, E)), N = n.eql(n.mul(m, k), n.mul(I, E));
      return B && N;
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
      const { a: p, b: g } = e, m = n.mul(g, Os), { px: E, py: A, pz: I } = this;
      let k = n.ZERO, B = n.ZERO, N = n.ZERO, b = n.mul(E, E), $ = n.mul(A, A), R = n.mul(I, I), L = n.mul(E, A);
      return L = n.add(L, L), N = n.mul(E, I), N = n.add(N, N), k = n.mul(p, N), B = n.mul(m, R), B = n.add(k, B), k = n.sub($, B), B = n.add($, B), B = n.mul(k, B), k = n.mul(L, k), N = n.mul(m, N), R = n.mul(p, R), L = n.sub(b, R), L = n.mul(p, L), L = n.add(L, N), N = n.add(b, b), b = n.add(N, b), b = n.add(b, R), b = n.mul(b, L), B = n.add(B, b), R = n.mul(A, I), R = n.add(R, R), b = n.mul(R, L), k = n.sub(k, b), N = n.mul(R, $), N = n.add(N, N), N = n.add(N, N), new d(k, B, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: A, py: I, pz: k } = p;
      let B = n.ZERO, N = n.ZERO, b = n.ZERO;
      const $ = e.a, R = n.mul(e.b, Os);
      let L = n.mul(g, A), F = n.mul(m, I), x = n.mul(E, k), v = n.add(g, m), S = n.add(A, I);
      v = n.mul(v, S), S = n.add(L, F), v = n.sub(v, S), S = n.add(g, E);
      let U = n.add(A, k);
      return S = n.mul(S, U), U = n.add(L, x), S = n.sub(S, U), U = n.add(m, E), B = n.add(I, k), U = n.mul(U, B), B = n.add(F, x), U = n.sub(U, B), b = n.mul($, S), B = n.mul(R, x), b = n.add(B, b), B = n.sub(F, b), b = n.add(F, b), N = n.mul(B, b), F = n.add(L, L), F = n.add(F, L), x = n.mul($, x), S = n.mul(R, S), F = n.add(F, x), x = n.sub(L, x), x = n.mul($, x), S = n.add(S, x), L = n.mul(F, S), N = n.add(N, L), L = n.mul(U, S), B = n.mul(v, B), B = n.sub(B, L), L = n.mul(v, F), b = n.mul(U, b), b = n.add(b, L), new d(B, N, b);
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
      Kt("scalar", p, Se, m);
      const E = d.ZERO;
      if (p === Se)
        return E;
      if (this.is0() || p === ht)
        return this;
      if (!g || y.hasPrecomputes(this))
        return y.wNAFCachedUnsafe(this, p, d.normalizeZ);
      let { k1neg: A, k1: I, k2neg: k, k2: B } = g.splitScalar(p), N = E, b = E, $ = this;
      for (; I > Se || B > Se; )
        I & ht && (N = N.add($)), B & ht && (b = b.add($)), $ = $.double(), I >>= ht, B >>= ht;
      return A && (N = N.negate()), k && (b = b.negate()), b = new d(n.mul(b.px, g.beta), b.py, b.pz), N.add(b);
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
      Kt("scalar", p, ht, m);
      let E, A;
      if (g) {
        const { k1neg: I, k1: k, k2neg: B, k2: N } = g.splitScalar(p);
        let { p: b, f: $ } = this.wNAF(k), { p: R, f: L } = this.wNAF(N);
        b = y.constTimeNegate(I, b), R = y.constTimeNegate(B, R), R = new d(n.mul(R.px, g.beta), R.py, R.pz), E = b.add(R), A = $.add(L);
      } else {
        const { p: I, f: k } = this.wNAF(p);
        E = I, A = k;
      }
      return d.normalizeZ([E, A])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, m) {
      const E = d.BASE, A = (k, B) => B === Se || B === ht || !k.equals(E) ? k.multiplyUnsafe(B) : k.multiply(B), I = A(this, g).add(A(p, m));
      return I.is0() ? void 0 : I;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return l(this, p);
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
      return pn("isCompressed", p), this.assertValidity(), i(d, this, p);
    }
    toHex(p = !0) {
      return pn("isCompressed", p), wn(this.toRawBytes(p));
    }
  }
  d.BASE = new d(e.Gx, e.Gy, n.ONE), d.ZERO = new d(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, y = pf(d, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: d,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function Sf(t) {
  const e = ia(t);
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
function xf(t) {
  const e = Sf(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function s(x) {
    return wt(x, r);
  }
  function c(x) {
    return to(x, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: l, isWithinCurveOrder: f } = bf({
    ...e,
    toBytes(x, v, S) {
      const U = v.toAffine(), C = n.toBytes(U.x), M = He;
      return pn("isCompressed", S), S ? M(Uint8Array.from([v.hasEvenY() ? 2 : 3]), C) : M(Uint8Array.from([4]), C, n.toBytes(U.y));
    },
    fromBytes(x) {
      const v = x.length, S = x[0], U = x.subarray(1);
      if (v === i && (S === 2 || S === 3)) {
        const C = _t(U);
        if (!mn(C, ht, n.ORDER))
          throw new Error("Point is not on curve");
        const M = l(C);
        let z;
        try {
          z = n.sqrt(M);
        } catch (tt) {
          const G = tt instanceof Error ? ": " + tt.message : "";
          throw new Error("Point is not on curve" + G);
        }
        const q = (z & ht) === ht;
        return (S & 1) === 1 !== q && (z = n.neg(z)), { x: C, y: z };
      } else if (v === o && S === 4) {
        const C = n.fromBytes(U.subarray(0, n.BYTES)), M = n.fromBytes(U.subarray(n.BYTES, 2 * n.BYTES));
        return { x: C, y: M };
      } else {
        const C = i, M = o;
        throw new Error("invalid Point, expected length of " + C + ", or uncompressed " + M + ", got " + v);
      }
    }
  }), d = (x) => wn(re(x, e.nByteLength));
  function h(x) {
    const v = r >> ht;
    return x > v;
  }
  function y(x) {
    return h(x) ? s(-x) : x;
  }
  const w = (x, v, S) => _t(x.slice(v, S));
  class p {
    constructor(v, S, U) {
      this.r = v, this.s = S, this.recovery = U, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(v) {
      const S = e.nByteLength;
      return v = At("compactSignature", v, S * 2), new p(w(v, 0, S), w(v, S, 2 * S));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(v) {
      const { r: S, s: U } = me.toSig(At("DER", v));
      return new p(S, U);
    }
    assertValidity() {
      Kt("r", this.r, ht, r), Kt("s", this.s, ht, r);
    }
    addRecoveryBit(v) {
      return new p(this.r, this.s, v);
    }
    recoverPublicKey(v) {
      const { r: S, s: U, recovery: C } = this, M = k(At("msgHash", v));
      if (C == null || ![0, 1, 2, 3].includes(C))
        throw new Error("recovery id invalid");
      const z = C === 2 || C === 3 ? S + e.n : S;
      if (z >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const q = (C & 1) === 0 ? "02" : "03", st = a.fromHex(q + d(z)), tt = c(z), G = s(-M * tt), Mt = s(U * tt), Et = a.BASE.multiplyAndAddUnsafe(st, G, Mt);
      if (!Et)
        throw new Error("point at infinify");
      return Et.assertValidity(), Et;
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
      return gn(this.toDERHex());
    }
    toDERHex() {
      return me.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return gn(this.toCompactHex());
    }
    toCompactHex() {
      return d(this.r) + d(this.s);
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
      const x = ea(e.n);
      return lf(e.randomBytes(x), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(x = 8, v = a.BASE) {
      return v._setWindowSize(x), v.multiply(BigInt(3)), v;
    }
  };
  function m(x, v = !0) {
    return a.fromPrivateKey(x).toRawBytes(v);
  }
  function E(x) {
    const v = Je(x), S = typeof x == "string", U = (v || S) && x.length;
    return v ? U === i || U === o : S ? U === 2 * i || U === 2 * o : x instanceof a;
  }
  function A(x, v, S = !0) {
    if (E(x))
      throw new Error("first arg must be private key");
    if (!E(v))
      throw new Error("second arg must be public key");
    return a.fromHex(v).multiply(u(x)).toRawBytes(S);
  }
  const I = e.bits2int || function(x) {
    if (x.length > 8192)
      throw new Error("input is too large");
    const v = _t(x), S = x.length * 8 - e.nBitLength;
    return S > 0 ? v >> BigInt(S) : v;
  }, k = e.bits2int_modN || function(x) {
    return s(I(x));
  }, B = Do(e.nBitLength);
  function N(x) {
    return Kt("num < 2^" + e.nBitLength, x, Se, B), re(x, e.nByteLength);
  }
  function b(x, v, S = $) {
    if (["recovered", "canonical"].some((Bt) => Bt in S))
      throw new Error("sign() legacy options not supported");
    const { hash: U, randomBytes: C } = e;
    let { lowS: M, prehash: z, extraEntropy: q } = S;
    M == null && (M = !0), x = At("msgHash", x), _s(S), z && (x = At("prehashed msgHash", U(x)));
    const st = k(x), tt = u(v), G = [N(tt), N(st)];
    if (q != null && q !== !1) {
      const Bt = q === !0 ? C(n.BYTES) : q;
      G.push(At("extraEntropy", Bt));
    }
    const Mt = He(...G), Et = st;
    function qe(Bt) {
      const Dt = I(Bt);
      if (!f(Dt))
        return;
      const ze = c(Dt), Yt = a.BASE.multiply(Dt).toAffine(), Nt = s(Yt.x);
      if (Nt === Se)
        return;
      const jt = s(ze * s(Et + Nt * tt));
      if (jt === Se)
        return;
      let Zt = (Yt.x === Nt ? 0 : 2) | Number(Yt.y & ht), Ft = jt;
      return M && h(jt) && (Ft = y(jt), Zt ^= 1), new p(Nt, Ft, Zt);
    }
    return { seed: Mt, k2sig: qe };
  }
  const $ = { lowS: e.lowS, prehash: !1 }, R = { lowS: e.lowS, prehash: !1 };
  function L(x, v, S = $) {
    const { seed: U, k2sig: C } = b(x, v, S), M = e;
    return Xc(M.hash.outputLen, M.nByteLength, M.hmac)(U, C);
  }
  a.BASE._setWindowSize(8);
  function F(x, v, S, U = R) {
    var Zt;
    const C = x;
    v = At("msgHash", v), S = At("publicKey", S);
    const { lowS: M, prehash: z, format: q } = U;
    if (_s(U), "strict" in U)
      throw new Error("options.strict was renamed to lowS");
    if (q !== void 0 && q !== "compact" && q !== "der")
      throw new Error("format must be compact or der");
    const st = typeof C == "string" || Je(C), tt = !st && !q && typeof C == "object" && C !== null && typeof C.r == "bigint" && typeof C.s == "bigint";
    if (!st && !tt)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let G, Mt;
    try {
      if (tt && (G = new p(C.r, C.s)), st) {
        try {
          q !== "compact" && (G = p.fromDER(C));
        } catch (Ft) {
          if (!(Ft instanceof me.Err))
            throw Ft;
        }
        !G && q !== "der" && (G = p.fromCompact(C));
      }
      Mt = a.fromHex(S);
    } catch {
      return !1;
    }
    if (!G || M && G.hasHighS())
      return !1;
    z && (v = e.hash(v));
    const { r: Et, s: qe } = G, Bt = k(v), Dt = c(qe), ze = s(Bt * Dt), Yt = s(Et * Dt), Nt = (Zt = a.BASE.multiplyAndAddUnsafe(Mt, ze, Yt)) == null ? void 0 : Zt.toAffine();
    return Nt ? s(Nt.x) === Et : !1;
  }
  return {
    CURVE: e,
    getPublicKey: m,
    getSharedSecret: A,
    sign: L,
    verify: F,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function vf(t) {
  return {
    hash: t,
    hmac: (e, ...n) => jc(t, e, Du(...n)),
    randomBytes: Po
  };
}
function Af(t, e) {
  const n = (r) => xf({ ...t, ...vf(r) });
  return { ...n(e), create: n };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const sr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Rr = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), qn = BigInt(1), _r = BigInt(2), Ps = (t, e) => (t + e / _r) / e;
function oa(t) {
  const e = sr, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, l = u * u * t % e, f = qt(l, n, e) * l % e, d = qt(f, n, e) * l % e, h = qt(d, _r, e) * u % e, y = qt(h, i, e) * h % e, w = qt(y, o, e) * y % e, p = qt(w, c, e) * w % e, g = qt(p, a, e) * p % e, m = qt(g, c, e) * w % e, E = qt(m, n, e) * l % e, A = qt(E, s, e) * y % e, I = qt(A, r, e) * u % e, k = qt(I, _r, e);
  if (!eo.eql(eo.sqr(k), t))
    throw new Error("Cannot find square root");
  return k;
}
const eo = Jc(sr, void 0, void 0, { sqrt: oa }), fe = Af({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: eo,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: Rr,
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
      const e = Rr, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -qn * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, s = BigInt("0x100000000000000000000000000000000"), c = Ps(o * t, e), a = Ps(-r * t, e);
      let u = wt(t - c * n - a * i, e), l = wt(-c * r - a * o, e);
      const f = u > s, d = l > s;
      if (f && (u = e - u), d && (l = e - l), u > s || l > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: f, k1: u, k2neg: d, k2: l };
    }
  }
}, Lt), sa = BigInt(0), Hs = {};
function Or(t, ...e) {
  let n = Hs[t];
  if (n === void 0) {
    const r = Lt(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = He(r, r), Hs[t] = n;
  }
  return Lt(He(n, ...e));
}
const Fo = (t) => t.toRawBytes(!0).slice(1), no = (t) => re(t, 32), Li = (t) => wt(t, sr), zn = (t) => wt(t, Rr), Ko = fe.ProjectivePoint, Tf = (t, e, n) => Ko.BASE.multiplyAndAddUnsafe(t, e, n);
function ro(t) {
  let e = fe.utils.normPrivateKeyToScalar(t), n = Ko.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : zn(-e), bytes: Fo(n) };
}
function ca(t) {
  Kt("x", t, qn, sr);
  const e = Li(t * t), n = Li(e * t + BigInt(7));
  let r = oa(n);
  r % _r !== sa && (r = Li(-r));
  const i = new Ko(t, r, qn);
  return i.assertValidity(), i;
}
const fn = _t;
function aa(...t) {
  return zn(fn(Or("BIP0340/challenge", ...t)));
}
function If(t) {
  return ro(t).bytes;
}
function kf(t, e, n = Po(32)) {
  const r = At("message", t), { bytes: i, scalar: o } = ro(e), s = At("auxRand", n, 32), c = no(o ^ fn(Or("BIP0340/aux", s))), a = Or("BIP0340/nonce", c, i, r), u = zn(fn(a));
  if (u === sa)
    throw new Error("sign failed: k is zero");
  const { bytes: l, scalar: f } = ro(u), d = aa(l, i, r), h = new Uint8Array(64);
  if (h.set(l, 0), h.set(no(zn(f + d * o)), 32), !ua(h, r, i))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function ua(t, e, n) {
  const r = At("signature", t, 64), i = At("message", e), o = At("publicKey", n, 32);
  try {
    const s = ca(fn(o)), c = fn(r.subarray(0, 32));
    if (!mn(c, qn, sr))
      return !1;
    const a = fn(r.subarray(32, 64));
    if (!mn(a, qn, Rr))
      return !1;
    const u = aa(no(c), Fo(s), i), l = Tf(s, a, zn(-u));
    return !(!l || !l.hasEvenY() || l.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const le = {
  getPublicKey: If,
  sign: kf,
  verify: ua,
  utils: {
    randomPrivateKey: fe.utils.randomPrivateKey,
    lift_x: ca,
    pointToBytes: Fo,
    numberToBytesBE: re,
    bytesToNumberBE: _t,
    taggedHash: Or,
    mod: wt
  }
}, Bf = /* @__PURE__ */ new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]), fa = /* @__PURE__ */ new Uint8Array(new Array(16).fill(0).map((t, e) => e)), Nf = /* @__PURE__ */ fa.map((t) => (9 * t + 5) % 16);
let qo = [fa], zo = [Nf];
for (let t = 0; t < 4; t++)
  for (let e of [qo, zo])
    e.push(e[t].map((n) => Bf[n]));
const la = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((t) => new Uint8Array(t)), Uf = /* @__PURE__ */ qo.map((t, e) => t.map((n) => la[e][n])), $f = /* @__PURE__ */ zo.map((t, e) => t.map((n) => la[e][n])), Cf = /* @__PURE__ */ new Uint32Array([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), Lf = /* @__PURE__ */ new Uint32Array([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Vs(t, e, n, r) {
  return t === 0 ? e ^ n ^ r : t === 1 ? e & n | ~e & r : t === 2 ? (e | ~n) ^ r : t === 3 ? e & r | n & ~r : e ^ (n | ~r);
}
const yr = /* @__PURE__ */ new Uint32Array(16);
class Rf extends Wc {
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
      yr[h] = e.getUint32(n, !0);
    let r = this.h0 | 0, i = r, o = this.h1 | 0, s = o, c = this.h2 | 0, a = c, u = this.h3 | 0, l = u, f = this.h4 | 0, d = f;
    for (let h = 0; h < 5; h++) {
      const y = 4 - h, w = Cf[h], p = Lf[h], g = qo[h], m = zo[h], E = Uf[h], A = $f[h];
      for (let I = 0; I < 16; I++) {
        const k = wr(r + Vs(h, o, c, u) + yr[g[I]] + w, E[I]) + f | 0;
        r = f, f = u, u = wr(c, 10) | 0, c = o, o = k;
      }
      for (let I = 0; I < 16; I++) {
        const k = wr(i + Vs(y, s, a, l) + yr[m[I]] + p, A[I]) + d | 0;
        i = d, d = l, l = wr(a, 10) | 0, a = s, s = k;
      }
    }
    this.set(this.h1 + c + l | 0, this.h2 + u + d | 0, this.h3 + f + i | 0, this.h4 + r + s | 0, this.h0 + o + a | 0);
  }
  roundClean() {
    yr.fill(0);
  }
  destroy() {
    this.destroyed = !0, this.buffer.fill(0), this.set(0, 0, 0, 0, 0);
  }
}
const _f = /* @__PURE__ */ Gc(() => new Rf());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Gn(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function da(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Go(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function Wn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function cr(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Pr(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function ha(t, e) {
  if (!da(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function Wo(t, e) {
  if (!da(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function ai(...t) {
  const e = (o) => o, n = (o, s) => (c) => o(s(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Yo(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  ha("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (Pr(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (Pr(i), i.map((o) => {
      Wn("alphabet.decode", o);
      const s = r.get(o);
      if (s === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function jo(t = "") {
  return Wn("join", t), {
    encode: (e) => (ha("join.decode", e), e.join(t)),
    decode: (e) => (Wn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function Of(t) {
  return Go(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Ms(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Pr(t), !t.length)
    return [];
  let r = 0;
  const i = [], o = Array.from(t, (c) => {
    if (cr(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = o.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const l = o[u], f = e * c, d = f + l;
      if (!Number.isSafeInteger(d) || f / e !== c || d - l !== f)
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
const pa = (t, e) => e === 0 ? t : pa(e, t % e), Hr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - pa(t, e)), Ir = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function io(t, e, n, r) {
  if (Pr(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Hr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Hr(e, n)}`);
  let i = 0, o = 0;
  const s = Ir[e], c = Ir[n] - 1, a = [];
  for (const u of t) {
    if (cr(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (i = i << e | u, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      a.push((i >> o - n & c) >>> 0);
    const l = Ir[o];
    if (l === void 0)
      throw new Error("invalid carry");
    i &= l - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && a.push(i >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function Pf(t) {
  cr(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!Gn(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ms(Array.from(n), e, t);
    },
    decode: (n) => (Wo("radix.decode", n), Uint8Array.from(Ms(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function wa(t, e = !1) {
  if (cr(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Hr(8, t) > 32 || /* @__PURE__ */ Hr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Gn(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return io(Array.from(n), 8, t, !e);
    },
    decode: (n) => (Wo("radix2.decode", n), Uint8Array.from(io(n, t, 8, e)))
  };
}
function Ds(t) {
  return Go(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
function Hf(t, e) {
  return cr(t), Go(e), {
    encode(n) {
      if (!Gn(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = e(n).slice(0, t), i = new Uint8Array(n.length + t);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Gn(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -t), i = n.slice(-t), o = e(r).slice(0, t);
      for (let s = 0; s < t; s++)
        if (o[s] !== i[s])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const Vf = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ ai(/* @__PURE__ */ Pf(58), /* @__PURE__ */ Yo(t), /* @__PURE__ */ jo("")), Mf = /* @__PURE__ */ Vf("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), Df = (t) => /* @__PURE__ */ ai(Hf(4, (e) => t(t(e))), Mf), oo = /* @__PURE__ */ ai(/* @__PURE__ */ Yo("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ jo("")), Fs = [996825010, 642813549, 513874426, 1027748829, 705979059];
function $n(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Fs.length; r++)
    (e >> r & 1) === 1 && (n ^= Fs[r]);
  return n;
}
function Ks(t, e, n = 1) {
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
  return i ^= n, oo.encode(io([i % Ir[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function ga(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ wa(5), r = n.decode, i = n.encode, o = Ds(r);
  function s(f, d, h = 90) {
    Wn("bech32.encode prefix", f), Gn(d) && (d = Array.from(d)), Wo("bech32.encode", d);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const w = y + 7 + d.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = f.toLowerCase(), g = Ks(p, d, e);
    return `${p}1${oo.encode(d)}${g}`;
  }
  function c(f, d = 90) {
    Wn("bech32.decode input", f);
    const h = f.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${f}). Expected (8..${d})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = y.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = y.slice(0, w), g = y.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const m = oo.decode(g).slice(0, -6), E = Ks(p, m, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${f}: expected "${E}"`);
    return { prefix: p, words: m };
  }
  const a = Ds(c);
  function u(f) {
    const { prefix: d, words: h } = c(f, !1);
    return { prefix: d, words: h, bytes: r(h) };
  }
  function l(f, d) {
    return s(f, i(d));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const so = /* @__PURE__ */ ga("bech32"), ya = /* @__PURE__ */ ga("bech32m"), Ff = {
  encode: (t) => new TextDecoder().decode(t),
  decode: (t) => new TextEncoder().encode(t)
}, j = /* @__PURE__ */ ai(/* @__PURE__ */ wa(4), /* @__PURE__ */ Yo("0123456789abcdef"), /* @__PURE__ */ jo(""), /* @__PURE__ */ Of((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
})), et = /* @__PURE__ */ new Uint8Array(), ma = /* @__PURE__ */ new Uint8Array([0]);
function En(t, e) {
  if (t.length !== e.length)
    return !1;
  for (let n = 0; n < t.length; n++)
    if (t[n] !== e[n])
      return !1;
  return !0;
}
function Wt(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Kf(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    if (!Wt(i))
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
const Ea = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength);
function ar(t) {
  return Object.prototype.toString.call(t) === "[object Object]";
}
function de(t) {
  return Number.isSafeInteger(t);
}
const Zo = {
  equalBytes: En,
  isBytes: Wt,
  concatBytes: Kf
}, ba = (t) => {
  if (t !== null && typeof t != "string" && !te(t) && !Wt(t) && !de(t))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${t} (${typeof t})`);
  return {
    encodeStream(e, n) {
      if (t === null)
        return;
      if (te(t))
        return t.encodeStream(e, n);
      let r;
      if (typeof t == "number" ? r = t : typeof t == "string" && (r = Te.resolve(e.stack, t)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw e.err(`Wrong length: ${r} len=${t} exp=${n} (${typeof n})`);
    },
    decodeStream(e) {
      let n;
      if (te(t) ? n = Number(t.decodeStream(e)) : typeof t == "number" ? n = t : typeof t == "string" && (n = Te.resolve(e.stack, t)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw e.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, dt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (t) => Math.ceil(t / 32),
  create: (t) => new Uint32Array(dt.len(t)),
  clean: (t) => t.fill(0),
  debug: (t) => Array.from(t).map((e) => (e >>> 0).toString(2).padStart(32, "0")),
  checkLen: (t, e) => {
    if (dt.len(e) !== t.length)
      throw new Error(`wrong length=${t.length}. Expected: ${dt.len(e)}`);
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
    dt.checkLen(t, e);
    const { FULL_MASK: r, BITS: i } = dt, o = i - e % i, s = o ? r >>> o << o : r, c = [];
    for (let a = 0; a < t.length; a++) {
      let u = t[a];
      if (n && (u = ~u), a === t.length - 1 && (u &= s), u !== 0)
        for (let l = 0; l < i; l++) {
          const f = 1 << i - l - 1;
          u & f && c.push(a * i + l);
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
  rangeDebug: (t, e, n = !1) => `[${dt.range(dt.indices(t, e, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (t, e, n, r, i = !0) => {
    dt.chunkLen(e, n, r);
    const { FULL_MASK: o, BITS: s } = dt, c = n % s ? Math.floor(n / s) : void 0, a = n + r, u = a % s ? Math.floor(a / s) : void 0;
    if (c !== void 0 && c === u)
      return dt.set(t, c, o >>> s - r << s - r - n, i);
    if (c !== void 0 && !dt.set(t, c, o >>> n % s, i))
      return !1;
    const l = c !== void 0 ? c + 1 : n / s, f = u !== void 0 ? u : a / s;
    for (let d = l; d < f; d++)
      if (!dt.set(t, d, o, i))
        return !1;
    return !(u !== void 0 && c !== u && !dt.set(t, u, o << s - a % s, i));
  }
}, Te = {
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
    const r = new Error(`${t}(${Te.path(e)}): ${typeof n == "string" ? n : n.message}`);
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
class Xo {
  constructor(e, n = {}, r = [], i = void 0, o = 0) {
    this.data = e, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = o, this.pos = 0, this.bitBuf = 0, this.bitPos = 0, this.view = Ea(e);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = dt.create(this.data.length), dt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(e, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + e, n) : !n || !this.bs ? !0 : dt.setRange(this.bs, this.data.length, e, n, !1);
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
    return Te.pushObj(this.stack, e, n);
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
        throw this.err(`${this.bitPos} bits left after unpack: ${j.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const e = dt.indices(this.bs, this.data.length, !0);
        if (e.length) {
          const n = dt.range(e).map(({ pos: r, length: i }) => `(${r}/${i})[${j.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${j.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(e) {
    return Te.err("Reader", this.stack, e);
  }
  offsetReader(e) {
    if (e > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Xo(this.absBytes(e), this.opts, this.stack, this, e);
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
    if (!Wt(e))
      throw this.err(`find: needle is not bytes! ${e}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!e.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(e[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < e.length)
        return;
      if (En(e, this.data.subarray(r, r + e.length)))
        return r;
    }
  }
}
class qf {
  constructor(e = []) {
    this.stack = e, this.pos = 0, this.buffers = [], this.ptrs = [], this.bitBuf = 0, this.bitPos = 0, this.viewBuf = new Uint8Array(8), this.finished = !1, this.view = Ea(this.viewBuf);
  }
  pushObj(e, n) {
    return Te.pushObj(this.stack, e, n);
  }
  writeView(e, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!de(e) || e > 8)
      throw new Error(`wrong writeView length=${e}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, e)), this.viewBuf.fill(0);
  }
  // User methods
  err(e) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Te.err("Reader", this.stack, e);
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
const co = (t) => Uint8Array.from(t).reverse();
function zf(t, e, n) {
  if (n) {
    const r = 2n ** (e - 1n);
    if (t < -r || t >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${t} < ${r}`);
  } else if (0n > t || t >= 2n ** e)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${t} < ${2n ** e}`);
}
function Sa(t) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: t.encodeStream,
    decodeStream: t.decodeStream,
    size: t.size,
    encode: (e) => {
      const n = new qf();
      return t.encodeStream(n, e), n.finish();
    },
    decode: (e, n = {}) => {
      const r = new Xo(e, n), i = t.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function Ht(t, e) {
  if (!te(t))
    throw new Error(`validate: invalid inner value ${t}`);
  if (typeof e != "function")
    throw new Error("validate: fn should be function");
  return Sa({
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
const Vt = (t) => {
  const e = Sa(t);
  return t.validate ? Ht(e, t.validate) : e;
}, ui = (t) => ar(t) && typeof t.decode == "function" && typeof t.encode == "function";
function te(t) {
  return ar(t) && ui(t) && typeof t.encodeStream == "function" && typeof t.decodeStream == "function" && (t.size === void 0 || de(t.size));
}
function Gf() {
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
      if (!ar(t))
        throw new Error(`expected plain object, got ${t}`);
      return Object.entries(t);
    }
  };
}
const Wf = {
  encode: (t) => {
    if (typeof t != "bigint")
      throw new Error(`expected bigint, got ${typeof t}`);
    if (t > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${t}`);
    return Number(t);
  },
  decode: (t) => {
    if (!de(t))
      throw new Error("element is not a safe integer");
    return BigInt(t);
  }
};
function Yf(t) {
  if (!ar(t))
    throw new Error("plain object expected");
  return {
    encode: (e) => {
      if (!de(e) || !(e in t))
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
function jf(t, e = !1) {
  if (!de(t))
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
      const u = Math.min(c.length, t), l = BigInt(c.slice(0, u)) * 10n ** BigInt(t - u), f = a + l;
      return i ? -f : f;
    }
  };
}
function Zf(t) {
  if (!Array.isArray(t))
    throw new Error(`expected array, got ${typeof t}`);
  for (const e of t)
    if (!ui(e))
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
const xa = (t) => {
  if (!ui(t))
    throw new Error("BaseCoder expected");
  return { encode: t.decode, decode: t.encode };
}, fi = { dict: Gf, numberBigint: Wf, tsEnum: Yf, decimal: jf, match: Zf, reverse: xa }, Qo = (t, e = !1, n = !1, r = !0) => {
  if (!de(t))
    throw new Error(`bigint/size: wrong value ${t}`);
  if (typeof e != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof e}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(t), o = 2n ** (8n * i - 1n);
  return Vt({
    size: r ? t : void 0,
    encodeStream: (s, c) => {
      n && c < 0 && (c = c | o);
      const a = [];
      for (let l = 0; l < t; l++)
        a.push(Number(c & 255n)), c >>= 8n;
      let u = new Uint8Array(a).reverse();
      if (!r) {
        let l = 0;
        for (l = 0; l < u.length && u[l] === 0; l++)
          ;
        u = u.subarray(l);
      }
      s.bytes(e ? u.reverse() : u);
    },
    decodeStream: (s) => {
      const c = s.bytes(r ? t : Math.min(t, s.leftBytes)), a = e ? c : co(c);
      let u = 0n;
      for (let l = 0; l < a.length; l++)
        u |= BigInt(a[l]) << 8n * BigInt(l);
      return n && u & o && (u = (u ^ o) - o), u;
    },
    validate: (s) => {
      if (typeof s != "bigint")
        throw new Error(`bigint: invalid value: ${s}`);
      return zf(s, 8n * i, !!n), s;
    }
  });
}, va = /* @__PURE__ */ Qo(32, !1), kr = /* @__PURE__ */ Qo(8, !0), Xf = /* @__PURE__ */ Qo(8, !0, !0), Qf = (t, e) => Vt({
  size: t,
  encodeStream: (n, r) => n.writeView(t, (i) => e.write(i, r)),
  decodeStream: (n) => n.readView(t, e.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return e.validate && e.validate(n), n;
  }
}), ur = (t, e, n) => {
  const r = t * 8, i = 2 ** (r - 1), o = (a) => {
    if (!de(a))
      throw new Error(`sintView: value is not safe integer: ${a}`);
    if (a < -i || a >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${a} < ${i}`);
  }, s = 2 ** r, c = (a) => {
    if (!de(a))
      throw new Error(`uintView: value is not safe integer: ${a}`);
    if (0 > a || a >= s)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${a} < ${s}`);
  };
  return Qf(t, {
    write: n.write,
    read: n.read,
    validate: e ? o : c
  });
}, W = /* @__PURE__ */ ur(4, !1, {
  read: (t, e) => t.getUint32(e, !0),
  write: (t, e) => t.setUint32(0, e, !0)
}), Jf = /* @__PURE__ */ ur(4, !1, {
  read: (t, e) => t.getUint32(e, !1),
  write: (t, e) => t.setUint32(0, e, !1)
}), cn = /* @__PURE__ */ ur(4, !0, {
  read: (t, e) => t.getInt32(e, !0),
  write: (t, e) => t.setInt32(0, e, !0)
}), qs = /* @__PURE__ */ ur(2, !1, {
  read: (t, e) => t.getUint16(e, !0),
  write: (t, e) => t.setUint16(0, e, !0)
}), Oe = /* @__PURE__ */ ur(1, !1, {
  read: (t, e) => t.getUint8(e),
  write: (t, e) => t.setUint8(0, e)
}), J = (t, e = !1) => {
  if (typeof e != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof e}`);
  const n = ba(t), r = Wt(t);
  return Vt({
    size: typeof t == "number" ? t : void 0,
    encodeStream: (i, o) => {
      r || n.encodeStream(i, o.length), i.bytes(e ? co(o) : o), r && i.bytes(t);
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
      return e ? co(o) : o;
    },
    validate: (i) => {
      if (!Wt(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function tl(t, e) {
  if (!te(e))
    throw new Error(`prefix: invalid inner value ${e}`);
  return Ve(J(t), xa(e));
}
const Jo = (t, e = !1) => Ht(Ve(J(t, e), Ff), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), el = (t, e = { isLE: !1, with0x: !1 }) => {
  let n = Ve(J(t, e.isLE), j);
  const r = e.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = Ve(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function Ve(t, e) {
  if (!te(t))
    throw new Error(`apply: invalid inner value ${t}`);
  if (!ui(e))
    throw new Error(`apply: invalid base value ${t}`);
  return Vt({
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
const nl = (t, e = !1) => {
  if (!Wt(t))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof t}`);
  if (typeof e != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof e}`);
  return Vt({
    size: t.length,
    encodeStream: (n, r) => {
      !!r !== e && n.bytes(t);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= t.length;
      return r && (r = En(n.bytes(t.length, !0), t), r && n.bytes(t.length)), r !== e;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function rl(t, e, n) {
  if (!te(e))
    throw new Error(`flagged: invalid inner value ${e}`);
  return Vt({
    encodeStream: (r, i) => {
      Te.resolve(r.stack, t) && e.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Te.resolve(r.stack, t), i)
        return e.decodeStream(r);
    }
  });
}
function ts(t, e, n = !0) {
  if (!te(t))
    throw new Error(`magic: invalid inner value ${t}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return Vt({
    size: t.size,
    encodeStream: (r, i) => t.encodeStream(r, e),
    decodeStream: (r) => {
      const i = t.decodeStream(r);
      if (n && typeof i != "object" && i !== e || Wt(e) && !En(e, i))
        throw r.err(`magic: invalid value: ${i} !== ${e}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Aa(t) {
  let e = 0;
  for (const n of t) {
    if (n.size === void 0)
      return;
    if (!de(n.size))
      throw new Error(`sizeof: wrong element size=${e}`);
    e += n.size;
  }
  return e;
}
function mt(t) {
  if (!ar(t))
    throw new Error(`struct: expected plain object, got ${t}`);
  for (const e in t)
    if (!te(t[e]))
      throw new Error(`struct: field ${e} is not CoderType`);
  return Vt({
    size: Aa(Object.values(t)),
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
function il(t) {
  if (!Array.isArray(t))
    throw new Error(`Packed.Tuple: got ${typeof t} instead of array`);
  for (let e = 0; e < t.length; e++)
    if (!te(t[e]))
      throw new Error(`tuple: field ${e} is not CoderType`);
  return Vt({
    size: Aa(t),
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
function Ot(t, e) {
  if (!te(e))
    throw new Error(`array: invalid inner value ${e}`);
  const n = ba(typeof t == "string" ? `../${t}` : t);
  return Vt({
    size: typeof t == "number" && e.size ? t * e.size : void 0,
    encodeStream: (r, i) => {
      const o = r;
      o.pushObj(i, (s) => {
        Wt(t) || n.encodeStream(r, i.length);
        for (let c = 0; c < i.length; c++)
          s(`${c}`, () => {
            const a = i[c], u = r.pos;
            if (e.encodeStream(r, a), Wt(t)) {
              if (t.length > o.pos - u)
                return;
              const l = o.finish(!1).subarray(u, o.pos);
              if (En(l.subarray(0, t.length), t))
                throw o.err(`array: inner element encoding same as separator. elm=${a} data=${l}`);
            }
          });
      }), Wt(t) && r.bytes(t);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (o) => {
        if (t === null)
          for (let s = 0; !r.isEnd() && (o(`${s}`, () => i.push(e.decodeStream(r))), !(e.size && r.leftBytes < e.size)); s++)
            ;
        else if (Wt(t))
          for (let s = 0; ; s++) {
            if (En(r.bytes(t.length, !0), t)) {
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
const li = fe.ProjectivePoint, Vr = fe.CURVE.n, X = Zo.isBytes, Ce = Zo.concatBytes, ut = Zo.equalBytes, Ta = (t) => _f(Lt(t)), Gt = (...t) => Lt(Lt(Ce(...t))), Ia = le.utils.randomPrivateKey, es = le.getPublicKey, ol = fe.getPublicKey, zs = (t) => t.r < Vr / 2n;
function sl(t, e, n = !1) {
  let r = fe.sign(t, e);
  if (n && !zs(r)) {
    const i = new Uint8Array(32);
    let o = 0;
    for (; !zs(r); )
      if (i.set(W.encode(o++)), r = fe.sign(t, e, { extraEntropy: i }), o > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toDERRawBytes();
}
const Gs = le.sign, ns = le.utils.taggedHash;
var $t;
(function(t) {
  t[t.ecdsa = 0] = "ecdsa", t[t.schnorr = 1] = "schnorr";
})($t || ($t = {}));
function bn(t, e) {
  const n = t.length;
  if (e === $t.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return li.fromHex(t), t;
  } else if (e === $t.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return le.utils.lift_x(le.utils.bytesToNumberBE(t)), t;
  } else
    throw new Error("Unknown key type");
}
function ka(t, e) {
  const n = le.utils, r = n.taggedHash("TapTweak", t, e), i = n.bytesToNumberBE(r);
  if (i >= Vr)
    throw new Error("tweak higher than curve order");
  return i;
}
function cl(t, e = new Uint8Array()) {
  const n = le.utils, r = n.bytesToNumberBE(t), i = li.fromPrivateKey(r), o = i.hasEvenY() ? r : n.mod(-r, Vr), s = n.pointToBytes(i), c = ka(s, e);
  return n.numberToBytesBE(n.mod(o + c, Vr), 32);
}
function Ba(t, e) {
  const n = le.utils, r = ka(t, e), o = n.lift_x(n.bytesToNumberBE(t)).add(li.fromPrivateKey(r)), s = o.hasEvenY() ? 0 : 1;
  return [n.pointToBytes(o), s];
}
const rs = Lt(li.BASE.toRawBytes(!1)), Sn = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, mr = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Mr(t, e) {
  if (!X(t) || !X(e))
    throw new Error(`cmp: wrong type a=${typeof t} b=${typeof e}`);
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r++)
    if (t[r] != e[r])
      return Math.sign(t[r] - e[r]);
  return Math.sign(t.length - e.length);
}
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function is(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function Na(t, e) {
  return Array.isArray(e) ? e.length === 0 ? !0 : t ? e.every((n) => typeof n == "string") : e.every((n) => Number.isSafeInteger(n)) : !1;
}
function Ua(t) {
  if (typeof t != "function")
    throw new Error("function expected");
  return !0;
}
function xn(t, e) {
  if (typeof e != "string")
    throw new Error(`${t}: string expected`);
  return !0;
}
function fr(t) {
  if (!Number.isSafeInteger(t))
    throw new Error(`invalid integer: ${t}`);
}
function Dr(t) {
  if (!Array.isArray(t))
    throw new Error("array expected");
}
function Fr(t, e) {
  if (!Na(!0, e))
    throw new Error(`${t}: array of strings expected`);
}
function os(t, e) {
  if (!Na(!1, e))
    throw new Error(`${t}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function di(...t) {
  const e = (o) => o, n = (o, s) => (c) => o(s(c)), r = t.map((o) => o.encode).reduceRight(n, e), i = t.map((o) => o.decode).reduce(n, e);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function hi(t) {
  const e = typeof t == "string" ? t.split("") : t, n = e.length;
  Fr("alphabet", e);
  const r = new Map(e.map((i, o) => [i, o]));
  return {
    encode: (i) => (Dr(i), i.map((o) => {
      if (!Number.isSafeInteger(o) || o < 0 || o >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${o}". Allowed: ${t}`);
      return e[o];
    })),
    decode: (i) => (Dr(i), i.map((o) => {
      xn("alphabet.decode", o);
      const s = r.get(o);
      if (s === void 0)
        throw new Error(`Unknown letter: "${o}". Allowed: ${t}`);
      return s;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function pi(t = "") {
  return xn("join", t), {
    encode: (e) => (Fr("join.decode", e), e.join(t)),
    decode: (e) => (xn("join.decode", e), e.split(t))
  };
}
// @__NO_SIDE_EFFECTS__
function al(t, e = "=") {
  return fr(t), xn("padding", e), {
    encode(n) {
      for (Fr("padding.encode", n); n.length * t % 8; )
        n.push(e);
      return n;
    },
    decode(n) {
      Fr("padding.decode", n);
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
function ul(t) {
  return Ua(t), { encode: (e) => e, decode: (e) => t(e) };
}
function Ws(t, e, n) {
  if (e < 2)
    throw new Error(`convertRadix: invalid from=${e}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Dr(t), !t.length)
    return [];
  let r = 0;
  const i = [], o = Array.from(t, (c) => {
    if (fr(c), c < 0 || c >= e)
      throw new Error(`invalid integer: ${c}`);
    return c;
  }), s = o.length;
  for (; ; ) {
    let c = 0, a = !0;
    for (let u = r; u < s; u++) {
      const l = o[u], f = e * c, d = f + l;
      if (!Number.isSafeInteger(d) || f / e !== c || d - l !== f)
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
const $a = (t, e) => e === 0 ? t : $a(e, t % e), Kr = /* @__NO_SIDE_EFFECTS__ */ (t, e) => t + (e - $a(t, e)), Br = /* @__PURE__ */ (() => {
  let t = [];
  for (let e = 0; e < 40; e++)
    t.push(2 ** e);
  return t;
})();
function ao(t, e, n, r) {
  if (Dr(t), e <= 0 || e > 32)
    throw new Error(`convertRadix2: wrong from=${e}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Kr(e, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${e} to=${n} carryBits=${/* @__PURE__ */ Kr(e, n)}`);
  let i = 0, o = 0;
  const s = Br[e], c = Br[n] - 1, a = [];
  for (const u of t) {
    if (fr(u), u >= s)
      throw new Error(`convertRadix2: invalid data word=${u} from=${e}`);
    if (i = i << e | u, o + e > 32)
      throw new Error(`convertRadix2: carry overflow pos=${o} from=${e}`);
    for (o += e; o >= n; o -= n)
      a.push((i >> o - n & c) >>> 0);
    const l = Br[o];
    if (l === void 0)
      throw new Error("invalid carry");
    i &= l - 1;
  }
  if (i = i << n - o & c, !r && o >= e)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && o > 0 && a.push(i >>> 0), a;
}
// @__NO_SIDE_EFFECTS__
function fl(t) {
  fr(t);
  const e = 2 ** 8;
  return {
    encode: (n) => {
      if (!is(n))
        throw new Error("radix.encode input should be Uint8Array");
      return Ws(Array.from(n), e, t);
    },
    decode: (n) => (os("radix.decode", n), Uint8Array.from(Ws(n, t, e)))
  };
}
// @__NO_SIDE_EFFECTS__
function ss(t, e = !1) {
  if (fr(t), t <= 0 || t > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Kr(8, t) > 32 || /* @__PURE__ */ Kr(t, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!is(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return ao(Array.from(n), 8, t, !e);
    },
    decode: (n) => (os("radix2.decode", n), Uint8Array.from(ao(n, t, 8, e)))
  };
}
function Ys(t) {
  return Ua(t), function(...e) {
    try {
      return t.apply(null, e);
    } catch {
    }
  };
}
const Ut = /* @__PURE__ */ di(/* @__PURE__ */ ss(6), /* @__PURE__ */ hi("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ al(6), /* @__PURE__ */ pi("")), ll = /* @__NO_SIDE_EFFECTS__ */ (t) => /* @__PURE__ */ di(/* @__PURE__ */ fl(58), /* @__PURE__ */ hi(t), /* @__PURE__ */ pi("")), js = /* @__PURE__ */ ll("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), uo = /* @__PURE__ */ di(/* @__PURE__ */ hi("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ pi("")), Zs = [996825010, 642813549, 513874426, 1027748829, 705979059];
function Cn(t) {
  const e = t >> 25;
  let n = (t & 33554431) << 5;
  for (let r = 0; r < Zs.length; r++)
    (e >> r & 1) === 1 && (n ^= Zs[r]);
  return n;
}
function Xs(t, e, n = 1) {
  const r = t.length;
  let i = 1;
  for (let o = 0; o < r; o++) {
    const s = t.charCodeAt(o);
    if (s < 33 || s > 126)
      throw new Error(`Invalid prefix (${t})`);
    i = Cn(i) ^ s >> 5;
  }
  i = Cn(i);
  for (let o = 0; o < r; o++)
    i = Cn(i) ^ t.charCodeAt(o) & 31;
  for (let o of e)
    i = Cn(i) ^ o;
  for (let o = 0; o < 6; o++)
    i = Cn(i);
  return i ^= n, uo.encode(ao([i % Br[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function dl(t) {
  const e = t === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ ss(5), r = n.decode, i = n.encode, o = Ys(r);
  function s(f, d, h = 90) {
    xn("bech32.encode prefix", f), is(d) && (d = Array.from(d)), os("bech32.encode", d);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const w = y + 7 + d.length;
    if (h !== !1 && w > h)
      throw new TypeError(`Length ${w} exceeds limit ${h}`);
    const p = f.toLowerCase(), g = Xs(p, d, e);
    return `${p}1${uo.encode(d)}${g}`;
  }
  function c(f, d = 90) {
    xn("bech32.decode input", f);
    const h = f.length;
    if (h < 8 || d !== !1 && h > d)
      throw new TypeError(`invalid string length: ${h} (${f}). Expected (8..${d})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const w = y.lastIndexOf("1");
    if (w === 0 || w === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const p = y.slice(0, w), g = y.slice(w + 1);
    if (g.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const m = uo.decode(g).slice(0, -6), E = Xs(p, m, e);
    if (!g.endsWith(E))
      throw new Error(`Invalid checksum in ${f}: expected "${E}"`);
    return { prefix: p, words: m };
  }
  const a = Ys(c);
  function u(f) {
    const { prefix: d, words: h } = c(f, !1);
    return { prefix: d, words: h, bytes: r(h) };
  }
  function l(f, d) {
    return s(f, i(d));
  }
  return {
    encode: s,
    decode: c,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: a,
    fromWords: r,
    fromWordsUnsafe: o,
    toWords: i
  };
}
const Er = /* @__PURE__ */ dl("bech32m"), K = /* @__PURE__ */ di(/* @__PURE__ */ ss(4), /* @__PURE__ */ hi("0123456789abcdef"), /* @__PURE__ */ pi(""), /* @__PURE__ */ ul((t) => {
  if (typeof t != "string" || t.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof t} with length ${t.length}`);
  return t.toLowerCase();
}));
class Ca extends Error {
  constructor(e, n) {
    super(n), this.idx = e;
  }
}
const { taggedHash: La, pointToBytes: br } = le.utils, Me = fe.ProjectivePoint, he = 33, fo = new Uint8Array(he), Le = fe.CURVE.n, Qs = Ve(J(33), {
  decode: (t) => cs(t) ? fo : t.toRawBytes(!0),
  encode: (t) => yn(t, fo) ? Me.ZERO : Me.fromHex(t)
}), Js = Ht(va, (t) => (Kt("n", t, 1n, Le), t)), Nr = mt({ R1: Qs, R2: Qs }), Ra = mt({ k1: Js, k2: Js, publicKey: J(he) });
function tc(t, ...e) {
}
function Xt(t, ...e) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((n) => Rt(n, ...e));
}
function ec(t) {
  if (!Array.isArray(t))
    throw new Error("expected array");
  t.forEach((e, n) => {
    if (typeof e != "boolean")
      throw new Error("expected boolean in xOnly array, got" + e + "(" + n + ")");
  });
}
const Qt = (t) => wt(t, Le), qr = (t, ...e) => Qt(_t(La(t, ...e))), Ln = (t, e) => t.hasEvenY() ? e : Qt(-e);
function Xe(t) {
  return Me.BASE.multiply(t);
}
function cs(t) {
  return t.equals(Me.ZERO);
}
function lo(t) {
  return Xt(t, he), t.sort(Mr);
}
function _a(t) {
  Xt(t, he);
  for (let e = 1; e < t.length; e++)
    if (!yn(t[e], t[0]))
      return t[e];
  return fo;
}
function Oa(t) {
  return Xt(t, he), La("KeyAgg list", ...t);
}
function Pa(t, e, n) {
  return Rt(t, he), Rt(e, he), yn(t, e) ? 1n : qr("KeyAgg coefficient", n, t);
}
function ho(t, e = [], n = []) {
  if (Xt(t, he), Xt(e, 32), e.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = _a(t), i = Oa(t);
  let o = Me.ZERO;
  for (let a = 0; a < t.length; a++) {
    let u;
    try {
      u = Me.fromHex(t[a]);
    } catch {
      throw new Ca(a, "pubkey");
    }
    o = o.add(u.multiply(Pa(t[a], r, i)));
  }
  let s = 1n, c = 0n;
  for (let a = 0; a < e.length; a++) {
    const u = n[a] && !o.hasEvenY() ? Qt(-1n) : 1n, l = _t(e[a]);
    if (Kt("tweak", l, 0n, Le), o = o.multiply(u).add(Xe(l)), cs(o))
      throw new Error("The result of tweaking cannot be infinity");
    s = Qt(u * s), c = Qt(l + u * c);
  }
  return { aggPublicKey: o, gAcc: s, tweakAcc: c };
}
const nc = (t, e, n, r, i, o) => qr("MuSig/nonce", t, new Uint8Array([e.length]), e, new Uint8Array([n.length]), n, i, re(o.length, 4), o, new Uint8Array([r]));
function hl(t, e, n = new Uint8Array(0), r, i = new Uint8Array(0), o = Po(32)) {
  Rt(t, he), tc(e, 32), Rt(n, 0, 32), tc(), Rt(i), Rt(o, 32);
  const s = new Uint8Array([0]), c = nc(o, t, n, 0, s, i), a = nc(o, t, n, 1, s, i);
  return {
    secret: Ra.encode({ k1: c, k2: a, publicKey: t }),
    public: Nr.encode({ R1: Xe(c), R2: Xe(a) })
  };
}
class pl {
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
    if (Xt(n, 33), Xt(i, 32), ec(o), Rt(r), i.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: s, gAcc: c, tweakAcc: a } = ho(n, i, o), { R1: u, R2: l } = Nr.decode(e);
    this.publicKeys = n, this.Q = s, this.gAcc = c, this.tweakAcc = a, this.b = qr("MuSig/noncecoef", e, br(s), r);
    const f = u.add(l.multiply(this.b));
    this.R = cs(f) ? Me.BASE : f, this.e = qr("BIP0340/challenge", br(this.R), br(s), r), this.tweaks = i, this.isXonly = o, this.L = Oa(n), this.secondKey = _a(n);
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
    if (!n.some((o) => yn(o, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return Pa(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(e, n, r) {
    const { Q: i, gAcc: o, b: s, R: c, e: a } = this, u = _t(e);
    if (u >= Le)
      return !1;
    const { R1: l, R2: f } = Nr.decode(n), d = l.add(f.multiply(s)), h = c.hasEvenY() ? d : d.negate(), y = Me.fromHex(r), w = this.getSessionKeyAggCoeff(y), p = Qt(Ln(i, 1n) * o), g = Xe(u), m = h.add(y.multiply(Qt(a * w * p)));
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
    if (Rt(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: o, b: s, R: c, e: a } = this, { k1: u, k2: l, publicKey: f } = Ra.decode(e);
    e.fill(0, 0, 64), Kt("k1", u, 0n, Le), Kt("k2", l, 0n, Le);
    const d = Ln(c, u), h = Ln(c, l), y = _t(n);
    Kt("d_", y, 1n, Le);
    const w = Xe(y), p = w.toRawBytes(!0);
    if (!yn(p, f))
      throw new Error("Public key does not match nonceGen argument");
    const g = this.getSessionKeyAggCoeff(w), m = Ln(i, 1n), E = Qt(m * o * y), A = Qt(d + s * h + a * g * E), I = re(A, 32);
    if (!r) {
      const k = Nr.encode({
        R1: Xe(u),
        R2: Xe(l)
      });
      if (!this.partialSigVerifyInternal(I, k, p))
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
    if (Rt(e, 32), Xt(n, 66), Xt(i, he), Xt(o, 32), ec(s), Xi(r), n.length !== i.length)
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
    Xt(e, 32);
    const { Q: n, tweakAcc: r, R: i, e: o } = this;
    let s = 0n;
    for (let a = 0; a < e.length; a++) {
      const u = _t(e[a]);
      if (u >= Le)
        throw new Ca(a, "psig");
      s = Qt(s + u);
    }
    const c = Ln(n, 1n);
    return s = Qt(s + o * c * r), He(br(i), re(s, 32));
  }
}
function wl(t) {
  const e = hl(t);
  return { secNonce: e.secret, pubNonce: e.public };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const wi = /* @__PURE__ */ BigInt(0), gi = /* @__PURE__ */ BigInt(1), gl = /* @__PURE__ */ BigInt(2);
function tn(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function lr(t) {
  if (!tn(t))
    throw new Error("Uint8Array expected");
}
function vn(t, e) {
  if (typeof e != "boolean")
    throw new Error(t + " boolean expected, got " + e);
}
const yl = /* @__PURE__ */ Array.from({ length: 256 }, (t, e) => e.toString(16).padStart(2, "0"));
function An(t) {
  lr(t);
  let e = "";
  for (let n = 0; n < t.length; n++)
    e += yl[t[n]];
  return e;
}
function an(t) {
  const e = t.toString(16);
  return e.length & 1 ? "0" + e : e;
}
function as(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  return t === "" ? wi : BigInt("0x" + t);
}
const ge = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function rc(t) {
  if (t >= ge._0 && t <= ge._9)
    return t - ge._0;
  if (t >= ge.A && t <= ge.F)
    return t - (ge.A - 10);
  if (t >= ge.a && t <= ge.f)
    return t - (ge.a - 10);
}
function Tn(t) {
  if (typeof t != "string")
    throw new Error("hex string expected, got " + typeof t);
  const e = t.length, n = e / 2;
  if (e % 2)
    throw new Error("hex string expected, got unpadded hex of length " + e);
  const r = new Uint8Array(n);
  for (let i = 0, o = 0; i < n; i++, o += 2) {
    const s = rc(t.charCodeAt(o)), c = rc(t.charCodeAt(o + 1));
    if (s === void 0 || c === void 0) {
      const a = t[o] + t[o + 1];
      throw new Error('hex string expected, got non-hex character "' + a + '" at index ' + o);
    }
    r[i] = s * 16 + c;
  }
  return r;
}
function ue(t) {
  return as(An(t));
}
function us(t) {
  return lr(t), as(An(Uint8Array.from(t).reverse()));
}
function De(t, e) {
  return Tn(t.toString(16).padStart(e * 2, "0"));
}
function fs(t, e) {
  return De(t, e).reverse();
}
function ml(t) {
  return Tn(an(t));
}
function Tt(t, e, n) {
  let r;
  if (typeof e == "string")
    try {
      r = Tn(e);
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
    lr(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
function El(t, e) {
  if (t.length !== e.length)
    return !1;
  let n = 0;
  for (let r = 0; r < t.length; r++)
    n |= t[r] ^ e[r];
  return n === 0;
}
function bl(t) {
  if (typeof t != "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(t));
}
const Ri = (t) => typeof t == "bigint" && wi <= t;
function In(t, e, n) {
  return Ri(t) && Ri(e) && Ri(n) && e <= t && t < n;
}
function Pe(t, e, n, r) {
  if (!In(e, n, r))
    throw new Error("expected valid " + t + ": " + n + " <= n < " + r + ", got " + e);
}
function Ha(t) {
  let e;
  for (e = 0; t > wi; t >>= gi, e += 1)
    ;
  return e;
}
function Sl(t, e) {
  return t >> BigInt(e) & gi;
}
function xl(t, e, n) {
  return t | (n ? gi : wi) << BigInt(e);
}
const ls = (t) => (gl << BigInt(t - 1)) - gi, _i = (t) => new Uint8Array(t), ic = (t) => Uint8Array.from(t);
function Va(t, e, n) {
  if (typeof t != "number" || t < 2)
    throw new Error("hashLen must be a number");
  if (typeof e != "number" || e < 2)
    throw new Error("qByteLen must be a number");
  if (typeof n != "function")
    throw new Error("hmacFn must be a function");
  let r = _i(t), i = _i(t), o = 0;
  const s = () => {
    r.fill(1), i.fill(0), o = 0;
  }, c = (...f) => n(i, r, ...f), a = (f = _i()) => {
    i = c(ic([0]), f), r = c(), f.length !== 0 && (i = c(ic([1]), f), r = c());
  }, u = () => {
    if (o++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let f = 0;
    const d = [];
    for (; f < e; ) {
      r = c();
      const h = r.slice();
      d.push(h), f += r.length;
    }
    return en(...d);
  };
  return (f, d) => {
    s(), a(f);
    let h;
    for (; !(h = d(u())); )
      a();
    return s(), h;
  };
}
const vl = {
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
function dr(t, e, n = {}) {
  const r = (i, o, s) => {
    const c = vl[o];
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
const Al = () => {
  throw new Error("not implemented");
};
function po(t) {
  const e = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = e.get(n);
    if (i !== void 0)
      return i;
    const o = t(n, ...r);
    return e.set(n, o), o;
  };
}
const Tl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  aInRange: Pe,
  abool: vn,
  abytes: lr,
  bitGet: Sl,
  bitLen: Ha,
  bitMask: ls,
  bitSet: xl,
  bytesToHex: An,
  bytesToNumberBE: ue,
  bytesToNumberLE: us,
  concatBytes: en,
  createHmacDrbg: Va,
  ensureBytes: Tt,
  equalBytes: El,
  hexToBytes: Tn,
  hexToNumber: as,
  inRange: In,
  isBytes: tn,
  memoized: po,
  notImplemented: Al,
  numberToBytesBE: De,
  numberToBytesLE: fs,
  numberToHexUnpadded: an,
  numberToVarBytesBE: ml,
  utf8ToBytes: bl,
  validateObject: dr
}, Symbol.toStringTag, { value: "Module" }));
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const ds = 2n ** 256n, ln = ds - 0x1000003d1n, Ma = ds - 0x14551231950b75fc4402da1732fc9bebfn, Il = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, kl = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, hs = {
  n: Ma,
  a: 0n,
  b: 7n
}, Vn = 32, oc = (t) => _(_(t * t) * t + hs.b), It = (t = "") => {
  throw new Error(t);
}, yi = (t) => typeof t == "bigint", Da = (t) => typeof t == "string", Oi = (t) => yi(t) && 0n < t && t < ln, Fa = (t) => yi(t) && 0n < t && t < Ma, Bl = (t) => t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array", wo = (t, e) => (
  // assert is Uint8Array (of specific length)
  !Bl(t) || typeof e == "number" && e > 0 && t.length !== e ? It("Uint8Array expected") : t
), Ka = (t) => new Uint8Array(t), qa = (t, e) => wo(Da(t) ? ps(t) : Ka(wo(t)), e), _ = (t, e = ln) => {
  const n = t % e;
  return n >= 0n ? n : e + n;
}, sc = (t) => t instanceof kn ? t : It("Point expected");
let kn = class on {
  constructor(e, n, r) {
    this.px = e, this.py = n, this.pz = r, Object.freeze(this);
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(e) {
    return e.x === 0n && e.y === 0n ? Pn : new on(e.x, e.y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromHex(e) {
    e = qa(e);
    let n;
    const r = e[0], i = e.subarray(1), o = ac(i, 0, Vn), s = e.length;
    if (s === 33 && [2, 3].includes(r)) {
      Oi(o) || It("Point hex invalid: x not FE");
      let c = $l(oc(o));
      const a = (c & 1n) === 1n;
      (r & 1) === 1 !== a && (c = _(-c)), n = new on(o, c, 1n);
    }
    return s === 65 && r === 4 && (n = new on(o, ac(i, Vn, 2 * Vn), 1n)), n ? n.ok() : It("Point invalid: not on curve");
  }
  /** Create point from a private key. */
  static fromPrivateKey(e) {
    return Mn.mul(Cl(e));
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
    const { px: n, py: r, pz: i } = this, { px: o, py: s, pz: c } = sc(e), a = _(n * c), u = _(o * i), l = _(r * c), f = _(s * i);
    return a === u && l === f;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new on(this.px, _(-this.py), this.pz);
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
    const { px: n, py: r, pz: i } = this, { px: o, py: s, pz: c } = sc(e), { a, b: u } = hs;
    let l = 0n, f = 0n, d = 0n;
    const h = _(u * 3n);
    let y = _(n * o), w = _(r * s), p = _(i * c), g = _(n + r), m = _(o + s);
    g = _(g * m), m = _(y + w), g = _(g - m), m = _(n + i);
    let E = _(o + c);
    return m = _(m * E), E = _(y + p), m = _(m - E), E = _(r + i), l = _(s + c), E = _(E * l), l = _(w + p), E = _(E - l), d = _(a * m), l = _(h * p), d = _(l + d), l = _(w - d), d = _(w + d), f = _(l * d), w = _(y + y), w = _(w + y), p = _(a * p), m = _(h * m), w = _(w + p), p = _(y - p), p = _(a * p), m = _(m + p), y = _(w * m), f = _(f + y), y = _(E * m), l = _(g * l), l = _(l - y), y = _(g * w), d = _(E * d), d = _(d + y), new on(l, f, d);
  }
  mul(e, n = !0) {
    if (!n && e === 0n)
      return Pn;
    if (Fa(e) || It("scalar invalid"), this.equals(Mn))
      return Rl(e).p;
    let r = Pn, i = Mn;
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
    if (this.equals(Pn))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: e, y: n };
    const i = Ul(r, ln);
    return _(r * i) !== 1n && It("inverse invalid"), { x: _(e * i), y: _(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: e, y: n } = this.aff();
    return (!Oi(e) || !Oi(n)) && It("Point invalid: x or y"), _(n * n) === oc(e) ? (
      // y² = x³ + ax + b, must be equal
      this
    ) : It("Point invalid: not on curve");
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
    return (e ? (r & 1n) === 0n ? "02" : "03" : "04") + uc(n) + (e ? "" : uc(r));
  }
  toRawBytes(e = !0) {
    return ps(this.toHex(e));
  }
};
kn.BASE = new kn(Il, kl, 1n);
kn.ZERO = new kn(0n, 1n, 0n);
const { BASE: Mn, ZERO: Pn } = kn, za = (t, e) => t.toString(16).padStart(e, "0"), Ga = (t) => Array.from(wo(t)).map((e) => za(e, 2)).join(""), ye = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, cc = (t) => {
  if (t >= ye._0 && t <= ye._9)
    return t - ye._0;
  if (t >= ye.A && t <= ye.F)
    return t - (ye.A - 10);
  if (t >= ye.a && t <= ye.f)
    return t - (ye.a - 10);
}, ps = (t) => {
  const e = "hex invalid";
  if (!Da(t))
    return It(e);
  const n = t.length, r = n / 2;
  if (n % 2)
    return It(e);
  const i = Ka(r);
  for (let o = 0, s = 0; o < r; o++, s += 2) {
    const c = cc(t.charCodeAt(s)), a = cc(t.charCodeAt(s + 1));
    if (c === void 0 || a === void 0)
      return It(e);
    i[o] = c * 16 + a;
  }
  return i;
}, Wa = (t) => BigInt("0x" + (Ga(t) || "0")), ac = (t, e, n) => Wa(t.slice(e, n)), Nl = (t) => yi(t) && t >= 0n && t < ds ? ps(za(t, 2 * Vn)) : It("bigint expected"), uc = (t) => Ga(Nl(t)), Ul = (t, e) => {
  (t === 0n || e <= 0n) && It("no inverse n=" + t + " mod=" + e);
  let n = _(t, e), r = e, i = 0n, o = 1n;
  for (; n !== 0n; ) {
    const s = r / n, c = r % n, a = i - o * s;
    r = n, n = c, i = o, o = a;
  }
  return r === 1n ? _(i, e) : It("no inverse");
}, $l = (t) => {
  let e = 1n;
  for (let n = t, r = (ln + 1n) / 4n; r > 0n; r >>= 1n)
    r & 1n && (e = e * n % ln), n = n * n % ln;
  return _(e * e) === t ? e : It("sqrt invalid");
}, Cl = (t) => (yi(t) || (t = Wa(qa(t, Vn))), Fa(t) ? t : It("private key invalid 3")), je = 8, Ll = () => {
  const t = [], e = 256 / je + 1;
  let n = Mn, r = n;
  for (let i = 0; i < e; i++) {
    r = n, t.push(r);
    for (let o = 1; o < 2 ** (je - 1); o++)
      r = r.add(n), t.push(r);
    n = r.double();
  }
  return t;
};
let fc;
const Rl = (t) => {
  const e = fc || (fc = Ll()), n = (l, f) => {
    let d = f.negate();
    return l ? d : f;
  };
  let r = Pn, i = Mn;
  const o = 1 + 256 / je, s = 2 ** (je - 1), c = BigInt(2 ** je - 1), a = 2 ** je, u = BigInt(je);
  for (let l = 0; l < o; l++) {
    const f = l * s;
    let d = Number(t & c);
    t >>= u, d > s && (d -= a, t += 1n);
    const h = f, y = f + Math.abs(d) - 1, w = l % 2 !== 0, p = d < 0;
    d === 0 ? i = i.add(n(w, e[h])) : r = r.add(n(p, e[y]));
  }
  return { p: r, f: i };
};
function lc(t) {
  if (!Number.isSafeInteger(t) || t < 0)
    throw new Error("positive integer expected, got " + t);
}
function _l(t) {
  return t instanceof Uint8Array || ArrayBuffer.isView(t) && t.constructor.name === "Uint8Array";
}
function mi(t, ...e) {
  if (!_l(t))
    throw new Error("Uint8Array expected");
  if (e.length > 0 && !e.includes(t.length))
    throw new Error("Uint8Array expected of length " + e + ", got length=" + t.length);
}
function Ol(t) {
  if (typeof t != "function" || typeof t.create != "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  lc(t.outputLen), lc(t.blockLen);
}
function zr(t, e = !0) {
  if (t.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (e && t.finished)
    throw new Error("Hash#digest() has already been called");
}
function Pl(t, e) {
  mi(t);
  const n = e.outputLen;
  if (t.length < n)
    throw new Error("digestInto() expects output buffer of length at least " + n);
}
const rn = typeof globalThis == "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Pi = (t) => new DataView(t.buffer, t.byteOffset, t.byteLength), se = (t, e) => t << 32 - e | t >>> e;
function Hl(t) {
  if (typeof t != "string")
    throw new Error("utf8ToBytes expected string, got " + typeof t);
  return new Uint8Array(new TextEncoder().encode(t));
}
function ws(t) {
  return typeof t == "string" && (t = Hl(t)), mi(t), t;
}
function Vl(...t) {
  let e = 0;
  for (let r = 0; r < t.length; r++) {
    const i = t[r];
    mi(i), e += i.length;
  }
  const n = new Uint8Array(e);
  for (let r = 0, i = 0; r < t.length; r++) {
    const o = t[r];
    n.set(o, i), i += o.length;
  }
  return n;
}
class Ya {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function Ml(t) {
  const e = (r) => t().update(ws(r)).digest(), n = t();
  return e.outputLen = n.outputLen, e.blockLen = n.blockLen, e.create = () => t(), e;
}
function ja(t = 32) {
  if (rn && typeof rn.getRandomValues == "function")
    return rn.getRandomValues(new Uint8Array(t));
  if (rn && typeof rn.randomBytes == "function")
    return rn.randomBytes(t);
  throw new Error("crypto.getRandomValues must be defined");
}
function Dl(t, e, n, r) {
  if (typeof t.setBigUint64 == "function")
    return t.setBigUint64(e, n, r);
  const i = BigInt(32), o = BigInt(4294967295), s = Number(n >> i & o), c = Number(n & o), a = r ? 4 : 0, u = r ? 0 : 4;
  t.setUint32(e + a, s, r), t.setUint32(e + u, c, r);
}
const Fl = (t, e, n) => t & e ^ ~t & n, Kl = (t, e, n) => t & e ^ t & n ^ e & n;
class ql extends Ya {
  constructor(e, n, r, i) {
    super(), this.blockLen = e, this.outputLen = n, this.padOffset = r, this.isLE = i, this.finished = !1, this.length = 0, this.pos = 0, this.destroyed = !1, this.buffer = new Uint8Array(e), this.view = Pi(this.buffer);
  }
  update(e) {
    zr(this);
    const { view: n, buffer: r, blockLen: i } = this;
    e = ws(e);
    const o = e.length;
    for (let s = 0; s < o; ) {
      const c = Math.min(i - this.pos, o - s);
      if (c === i) {
        const a = Pi(e);
        for (; i <= o - s; s += i)
          this.process(a, s);
        continue;
      }
      r.set(e.subarray(s, s + c), this.pos), this.pos += c, s += c, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += e.length, this.roundClean(), this;
  }
  digestInto(e) {
    zr(this), Pl(e, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: o } = this;
    let { pos: s } = this;
    n[s++] = 128, this.buffer.subarray(s).fill(0), this.padOffset > i - s && (this.process(r, 0), s = 0);
    for (let f = s; f < i; f++)
      n[f] = 0;
    Dl(r, i - 8, BigInt(this.length * 8), o), this.process(r, 0);
    const c = Pi(e), a = this.outputLen;
    if (a % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const u = a / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      c.setUint32(4 * f, l[f], o);
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
const zl = /* @__PURE__ */ new Uint32Array([
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
]), Ne = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Ue = /* @__PURE__ */ new Uint32Array(64);
class Gl extends ql {
  constructor() {
    super(64, 32, 8, !1), this.A = Ne[0] | 0, this.B = Ne[1] | 0, this.C = Ne[2] | 0, this.D = Ne[3] | 0, this.E = Ne[4] | 0, this.F = Ne[5] | 0, this.G = Ne[6] | 0, this.H = Ne[7] | 0;
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
    for (let f = 0; f < 16; f++, n += 4)
      Ue[f] = e.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const d = Ue[f - 15], h = Ue[f - 2], y = se(d, 7) ^ se(d, 18) ^ d >>> 3, w = se(h, 17) ^ se(h, 19) ^ h >>> 10;
      Ue[f] = w + Ue[f - 7] + y + Ue[f - 16] | 0;
    }
    let { A: r, B: i, C: o, D: s, E: c, F: a, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const d = se(c, 6) ^ se(c, 11) ^ se(c, 25), h = l + d + Fl(c, a, u) + zl[f] + Ue[f] | 0, w = (se(r, 2) ^ se(r, 13) ^ se(r, 22)) + Kl(r, i, o) | 0;
      l = u, u = a, a = c, c = s + h | 0, s = o, o = i, i = r, r = h + w | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, o = o + this.C | 0, s = s + this.D | 0, c = c + this.E | 0, a = a + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, o, s, c, a, u, l);
  }
  roundClean() {
    Ue.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), this.buffer.fill(0);
  }
}
const go = /* @__PURE__ */ Ml(() => new Gl());
class Za extends Ya {
  constructor(e, n) {
    super(), this.finished = !1, this.destroyed = !1, Ol(e);
    const r = ws(n);
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
    return zr(this), this.iHash.update(e), this;
  }
  digestInto(e) {
    zr(this), mi(e, this.outputLen), this.finished = !0, this.iHash.digestInto(e), this.oHash.update(e), this.oHash.digestInto(e), this.destroy();
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
const Xa = (t, e, n) => new Za(t, e).update(n).digest();
Xa.create = (t, e) => new Za(t, e);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const yt = BigInt(0), it = BigInt(1), Ze = /* @__PURE__ */ BigInt(2), Wl = /* @__PURE__ */ BigInt(3), yo = /* @__PURE__ */ BigInt(4), dc = /* @__PURE__ */ BigInt(5), hc = /* @__PURE__ */ BigInt(8);
function bt(t, e) {
  const n = t % e;
  return n >= yt ? n : e + n;
}
function Yl(t, e, n) {
  if (e < yt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n <= yt)
    throw new Error("invalid modulus");
  if (n === it)
    return yt;
  let r = it;
  for (; e > yt; )
    e & it && (r = r * t % n), t = t * t % n, e >>= it;
  return r;
}
function zt(t, e, n) {
  let r = t;
  for (; e-- > yt; )
    r *= r, r %= n;
  return r;
}
function mo(t, e) {
  if (t === yt)
    throw new Error("invert: expected non-zero number");
  if (e <= yt)
    throw new Error("invert: expected positive modulus, got " + e);
  let n = bt(t, e), r = e, i = yt, o = it;
  for (; n !== yt; ) {
    const c = r / n, a = r % n, u = i - o * c;
    r = n, n = a, i = o, o = u;
  }
  if (r !== it)
    throw new Error("invert: does not exist");
  return bt(i, e);
}
function jl(t) {
  const e = (t - it) / Ze;
  let n, r, i;
  for (n = t - it, r = 0; n % Ze === yt; n /= Ze, r++)
    ;
  for (i = Ze; i < t && Yl(i, e, t) !== t - it; i++)
    if (i > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  if (r === 1) {
    const s = (t + it) / yo;
    return function(a, u) {
      const l = a.pow(u, s);
      if (!a.eql(a.sqr(l), u))
        throw new Error("Cannot find square root");
      return l;
    };
  }
  const o = (n + it) / Ze;
  return function(c, a) {
    if (c.pow(a, e) === c.neg(c.ONE))
      throw new Error("Cannot find square root");
    let u = r, l = c.pow(c.mul(c.ONE, i), n), f = c.pow(a, o), d = c.pow(a, n);
    for (; !c.eql(d, c.ONE); ) {
      if (c.eql(d, c.ZERO))
        return c.ZERO;
      let h = 1;
      for (let w = c.sqr(d); h < u && !c.eql(w, c.ONE); h++)
        w = c.sqr(w);
      const y = c.pow(l, it << BigInt(u - h - 1));
      l = c.sqr(y), f = c.mul(f, y), d = c.mul(d, l), u = h;
    }
    return f;
  };
}
function Zl(t) {
  if (t % yo === Wl) {
    const e = (t + it) / yo;
    return function(r, i) {
      const o = r.pow(i, e);
      if (!r.eql(r.sqr(o), i))
        throw new Error("Cannot find square root");
      return o;
    };
  }
  if (t % hc === dc) {
    const e = (t - dc) / hc;
    return function(r, i) {
      const o = r.mul(i, Ze), s = r.pow(o, e), c = r.mul(i, s), a = r.mul(r.mul(c, Ze), s), u = r.mul(c, r.sub(a, r.ONE));
      if (!r.eql(r.sqr(u), i))
        throw new Error("Cannot find square root");
      return u;
    };
  }
  return jl(t);
}
const Xl = [
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
function Ql(t) {
  const e = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  }, n = Xl.reduce((r, i) => (r[i] = "function", r), e);
  return dr(t, n);
}
function Jl(t, e, n) {
  if (n < yt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === yt)
    return t.ONE;
  if (n === it)
    return e;
  let r = t.ONE, i = e;
  for (; n > yt; )
    n & it && (r = t.mul(r, i)), i = t.sqr(i), n >>= it;
  return r;
}
function td(t, e) {
  const n = new Array(e.length), r = e.reduce((o, s, c) => t.is0(s) ? o : (n[c] = o, t.mul(o, s)), t.ONE), i = t.inv(r);
  return e.reduceRight((o, s, c) => t.is0(s) ? o : (n[c] = t.mul(o, n[c]), t.mul(o, s)), i), n;
}
function Qa(t, e) {
  const n = e !== void 0 ? e : t.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
function Ja(t, e, n = !1, r = {}) {
  if (t <= yt)
    throw new Error("invalid field: expected ORDER > 0, got " + t);
  const { nBitLength: i, nByteLength: o } = Qa(t, e);
  if (o > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let s;
  const c = Object.freeze({
    ORDER: t,
    BITS: i,
    BYTES: o,
    MASK: ls(i),
    ZERO: yt,
    ONE: it,
    create: (a) => bt(a, t),
    isValid: (a) => {
      if (typeof a != "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof a);
      return yt <= a && a < t;
    },
    is0: (a) => a === yt,
    isOdd: (a) => (a & it) === it,
    neg: (a) => bt(-a, t),
    eql: (a, u) => a === u,
    sqr: (a) => bt(a * a, t),
    add: (a, u) => bt(a + u, t),
    sub: (a, u) => bt(a - u, t),
    mul: (a, u) => bt(a * u, t),
    pow: (a, u) => Jl(c, a, u),
    div: (a, u) => bt(a * mo(u, t), t),
    // Same as above, but doesn't normalize
    sqrN: (a) => a * a,
    addN: (a, u) => a + u,
    subN: (a, u) => a - u,
    mulN: (a, u) => a * u,
    inv: (a) => mo(a, t),
    sqrt: r.sqrt || ((a) => (s || (s = Zl(t)), s(c, a))),
    invertBatch: (a) => td(c, a),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, u, l) => l ? u : a,
    toBytes: (a) => n ? fs(a, o) : De(a, o),
    fromBytes: (a) => {
      if (a.length !== o)
        throw new Error("Field.fromBytes: expected " + o + " bytes, got " + a.length);
      return n ? us(a) : ue(a);
    }
  });
  return Object.freeze(c);
}
function tu(t) {
  if (typeof t != "bigint")
    throw new Error("field order must be bigint");
  const e = t.toString(2).length;
  return Math.ceil(e / 8);
}
function eu(t) {
  const e = tu(t);
  return e + Math.ceil(e / 2);
}
function ed(t, e, n = !1) {
  const r = t.length, i = tu(e), o = eu(e);
  if (r < 16 || r < o || r > 1024)
    throw new Error("expected " + o + "-1024 bytes of input, got " + r);
  const s = n ? ue(t) : us(t), c = bt(s, e - it) + it;
  return n ? fs(c, i) : De(c, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pc = BigInt(0), Sr = BigInt(1);
function Hi(t, e) {
  const n = e.negate();
  return t ? n : e;
}
function nu(t, e) {
  if (!Number.isSafeInteger(t) || t <= 0 || t > e)
    throw new Error("invalid window size, expected [1.." + e + "], got W=" + t);
}
function Vi(t, e) {
  nu(t, e);
  const n = Math.ceil(e / t) + 1, r = 2 ** (t - 1);
  return { windows: n, windowSize: r };
}
function nd(t, e) {
  if (!Array.isArray(t))
    throw new Error("array expected");
  t.forEach((n, r) => {
    if (!(n instanceof e))
      throw new Error("invalid point at index " + r);
  });
}
function rd(t, e) {
  if (!Array.isArray(t))
    throw new Error("array of scalars expected");
  t.forEach((n, r) => {
    if (!e.isValid(n))
      throw new Error("invalid scalar at index " + r);
  });
}
const Mi = /* @__PURE__ */ new WeakMap(), ru = /* @__PURE__ */ new WeakMap();
function Di(t) {
  return ru.get(t) || 1;
}
function id(t, e) {
  return {
    constTimeNegate: Hi,
    hasPrecomputes(n) {
      return Di(n) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(n, r, i = t.ZERO) {
      let o = n;
      for (; r > pc; )
        r & Sr && (i = i.add(o)), o = o.double(), r >>= Sr;
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
      const { windows: i, windowSize: o } = Vi(r, e), s = [];
      let c = n, a = c;
      for (let u = 0; u < i; u++) {
        a = c, s.push(a);
        for (let l = 1; l < o; l++)
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
      const { windows: o, windowSize: s } = Vi(n, e);
      let c = t.ZERO, a = t.BASE;
      const u = BigInt(2 ** n - 1), l = 2 ** n, f = BigInt(n);
      for (let d = 0; d < o; d++) {
        const h = d * s;
        let y = Number(i & u);
        i >>= f, y > s && (y -= l, i += Sr);
        const w = h, p = h + Math.abs(y) - 1, g = d % 2 !== 0, m = y < 0;
        y === 0 ? a = a.add(Hi(g, r[w])) : c = c.add(Hi(m, r[p]));
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
      const { windows: s, windowSize: c } = Vi(n, e), a = BigInt(2 ** n - 1), u = 2 ** n, l = BigInt(n);
      for (let f = 0; f < s; f++) {
        const d = f * c;
        if (i === pc)
          break;
        let h = Number(i & a);
        if (i >>= l, h > c && (h -= u, i += Sr), h === 0)
          continue;
        let y = r[d + Math.abs(h) - 1];
        h < 0 && (y = y.negate()), o = o.add(y);
      }
      return o;
    },
    getPrecomputes(n, r, i) {
      let o = Mi.get(r);
      return o || (o = this.precomputeWindow(r, n), n !== 1 && Mi.set(r, i(o))), o;
    },
    wNAFCached(n, r, i) {
      const o = Di(n);
      return this.wNAF(o, this.getPrecomputes(o, n, i), r);
    },
    wNAFCachedUnsafe(n, r, i, o) {
      const s = Di(n);
      return s === 1 ? this.unsafeLadder(n, r, o) : this.wNAFUnsafe(s, this.getPrecomputes(s, n, i), r, o);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(n, r) {
      nu(r, e), ru.set(n, r), Mi.delete(n);
    }
  };
}
function od(t, e, n, r) {
  if (nd(n, t), rd(r, e), n.length !== r.length)
    throw new Error("arrays of points and scalars must have equal length");
  const i = t.ZERO, o = Ha(BigInt(n.length)), s = o > 12 ? o - 3 : o > 4 ? o - 2 : o ? 2 : 1, c = (1 << s) - 1, a = new Array(c + 1).fill(i), u = Math.floor((e.BITS - 1) / s) * s;
  let l = i;
  for (let f = u; f >= 0; f -= s) {
    a.fill(i);
    for (let h = 0; h < r.length; h++) {
      const y = r[h], w = Number(y >> BigInt(f) & BigInt(c));
      a[w] = a[w].add(n[h]);
    }
    let d = i;
    for (let h = a.length - 1, y = i; h > 0; h--)
      y = y.add(a[h]), d = d.add(y);
    if (l = l.add(d), f !== 0)
      for (let h = 0; h < s; h++)
        l = l.double();
  }
  return l;
}
function iu(t) {
  return Ql(t.Fp), dr(t, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  }), Object.freeze({
    ...Qa(t.n, t.nBitLength),
    ...t,
    p: t.Fp.ORDER
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function wc(t) {
  t.lowS !== void 0 && vn("lowS", t.lowS), t.prehash !== void 0 && vn("prehash", t.prehash);
}
function sd(t) {
  const e = iu(t);
  dr(e, {
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
const { bytesToNumberBE: cd, hexToBytes: ad } = Tl, Ee = {
  // asn.1 DER encoding utils
  Err: class extends Error {
    constructor(e = "") {
      super(e);
    }
  },
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (t, e) => {
      const { Err: n } = Ee;
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
      const { Err: n } = Ee;
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
        for (const l of u)
          s = s << 8 | l;
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
      const { Err: e } = Ee;
      if (t < xe)
        throw new e("integer: negative integers are not allowed");
      let n = an(t);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new e("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(t) {
      const { Err: e } = Ee;
      if (t[0] & 128)
        throw new e("invalid signature integer: negative");
      if (t[0] === 0 && !(t[1] & 128))
        throw new e("invalid signature integer: unnecessary leading zero");
      return cd(t);
    }
  },
  toSig(t) {
    const { Err: e, _int: n, _tlv: r } = Ee, i = typeof t == "string" ? ad(t) : t;
    lr(i);
    const { v: o, l: s } = r.decode(48, i);
    if (s.length)
      throw new e("invalid signature: left bytes after parsing");
    const { v: c, l: a } = r.decode(2, o), { v: u, l } = r.decode(2, a);
    if (l.length)
      throw new e("invalid signature: left bytes after parsing");
    return { r: n.decode(c), s: n.decode(u) };
  },
  hexFromSig(t) {
    const { _tlv: e, _int: n } = Ee, r = e.encode(2, n.encode(t.r)), i = e.encode(2, n.encode(t.s)), o = r + i;
    return e.encode(48, o);
  }
}, xe = BigInt(0), pt = BigInt(1);
BigInt(2);
const gc = BigInt(3);
BigInt(4);
function ud(t) {
  const e = sd(t), { Fp: n } = e, r = Ja(e.n, e.nBitLength), i = e.toBytes || ((w, p, g) => {
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
    return In(w, pt, e.n);
  }
  function a(w) {
    const { allowedPrivateKeyLengths: p, nByteLength: g, wrapPrivateKey: m, n: E } = e;
    if (p && typeof w != "bigint") {
      if (tn(w) && (w = An(w)), typeof w != "string" || !p.includes(w.length))
        throw new Error("invalid private key");
      w = w.padStart(g * 2, "0");
    }
    let A;
    try {
      A = typeof w == "bigint" ? w : ue(Tt("private key", w, g));
    } catch {
      throw new Error("invalid private key, expected hex or " + g + " bytes, got " + typeof w);
    }
    return m && (A = bt(A, E)), Pe("private key", A, pt, E), A;
  }
  function u(w) {
    if (!(w instanceof d))
      throw new Error("ProjectivePoint expected");
  }
  const l = po((w, p) => {
    const { px: g, py: m, pz: E } = w;
    if (n.eql(E, n.ONE))
      return { x: g, y: m };
    const A = w.is0();
    p == null && (p = A ? n.ONE : n.inv(E));
    const I = n.mul(g, p), k = n.mul(m, p), B = n.mul(E, p);
    if (A)
      return { x: n.ZERO, y: n.ZERO };
    if (!n.eql(B, n.ONE))
      throw new Error("invZ was invalid");
    return { x: I, y: k };
  }), f = po((w) => {
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
      const E = (A) => n.eql(A, n.ZERO);
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
      return od(d, r, p, g);
    }
    // "Private method", don't use it directly
    _setWindowSize(p) {
      y.setWindowSize(this, p);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      f(this);
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
      const { px: g, py: m, pz: E } = this, { px: A, py: I, pz: k } = p, B = n.eql(n.mul(g, k), n.mul(A, E)), N = n.eql(n.mul(m, k), n.mul(I, E));
      return B && N;
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
      const { a: p, b: g } = e, m = n.mul(g, gc), { px: E, py: A, pz: I } = this;
      let k = n.ZERO, B = n.ZERO, N = n.ZERO, b = n.mul(E, E), $ = n.mul(A, A), R = n.mul(I, I), L = n.mul(E, A);
      return L = n.add(L, L), N = n.mul(E, I), N = n.add(N, N), k = n.mul(p, N), B = n.mul(m, R), B = n.add(k, B), k = n.sub($, B), B = n.add($, B), B = n.mul(k, B), k = n.mul(L, k), N = n.mul(m, N), R = n.mul(p, R), L = n.sub(b, R), L = n.mul(p, L), L = n.add(L, N), N = n.add(b, b), b = n.add(N, b), b = n.add(b, R), b = n.mul(b, L), B = n.add(B, b), R = n.mul(A, I), R = n.add(R, R), b = n.mul(R, L), k = n.sub(k, b), N = n.mul(R, $), N = n.add(N, N), N = n.add(N, N), new d(k, B, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(p) {
      u(p);
      const { px: g, py: m, pz: E } = this, { px: A, py: I, pz: k } = p;
      let B = n.ZERO, N = n.ZERO, b = n.ZERO;
      const $ = e.a, R = n.mul(e.b, gc);
      let L = n.mul(g, A), F = n.mul(m, I), x = n.mul(E, k), v = n.add(g, m), S = n.add(A, I);
      v = n.mul(v, S), S = n.add(L, F), v = n.sub(v, S), S = n.add(g, E);
      let U = n.add(A, k);
      return S = n.mul(S, U), U = n.add(L, x), S = n.sub(S, U), U = n.add(m, E), B = n.add(I, k), U = n.mul(U, B), B = n.add(F, x), U = n.sub(U, B), b = n.mul($, S), B = n.mul(R, x), b = n.add(B, b), B = n.sub(F, b), b = n.add(F, b), N = n.mul(B, b), F = n.add(L, L), F = n.add(F, L), x = n.mul($, x), S = n.mul(R, S), F = n.add(F, x), x = n.sub(L, x), x = n.mul($, x), S = n.add(S, x), L = n.mul(F, S), N = n.add(N, L), L = n.mul(U, S), B = n.mul(v, B), B = n.sub(B, L), L = n.mul(v, F), b = n.mul(U, b), b = n.add(b, L), new d(B, N, b);
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
      Pe("scalar", p, xe, m);
      const E = d.ZERO;
      if (p === xe)
        return E;
      if (this.is0() || p === pt)
        return this;
      if (!g || y.hasPrecomputes(this))
        return y.wNAFCachedUnsafe(this, p, d.normalizeZ);
      let { k1neg: A, k1: I, k2neg: k, k2: B } = g.splitScalar(p), N = E, b = E, $ = this;
      for (; I > xe || B > xe; )
        I & pt && (N = N.add($)), B & pt && (b = b.add($)), $ = $.double(), I >>= pt, B >>= pt;
      return A && (N = N.negate()), k && (b = b.negate()), b = new d(n.mul(b.px, g.beta), b.py, b.pz), N.add(b);
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
      Pe("scalar", p, pt, m);
      let E, A;
      if (g) {
        const { k1neg: I, k1: k, k2neg: B, k2: N } = g.splitScalar(p);
        let { p: b, f: $ } = this.wNAF(k), { p: R, f: L } = this.wNAF(N);
        b = y.constTimeNegate(I, b), R = y.constTimeNegate(B, R), R = new d(n.mul(R.px, g.beta), R.py, R.pz), E = b.add(R), A = $.add(L);
      } else {
        const { p: I, f: k } = this.wNAF(p);
        E = I, A = k;
      }
      return d.normalizeZ([E, A])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(p, g, m) {
      const E = d.BASE, A = (k, B) => B === xe || B === pt || !k.equals(E) ? k.multiplyUnsafe(B) : k.multiply(B), I = A(this, g).add(A(p, m));
      return I.is0() ? void 0 : I;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(p) {
      return l(this, p);
    }
    isTorsionFree() {
      const { h: p, isTorsionFree: g } = e;
      if (p === pt)
        return !0;
      if (g)
        return g(d, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: p, clearCofactor: g } = e;
      return p === pt ? this : g ? g(d, this) : this.multiplyUnsafe(e.h);
    }
    toRawBytes(p = !0) {
      return vn("isCompressed", p), this.assertValidity(), i(d, this, p);
    }
    toHex(p = !0) {
      return vn("isCompressed", p), An(this.toRawBytes(p));
    }
  }
  d.BASE = new d(e.Gx, e.Gy, n.ONE), d.ZERO = new d(n.ZERO, n.ONE, n.ZERO);
  const h = e.nBitLength, y = id(d, e.endo ? Math.ceil(h / 2) : h);
  return {
    CURVE: e,
    ProjectivePoint: d,
    normPrivateKeyToScalar: a,
    weierstrassEquation: s,
    isWithinCurveOrder: c
  };
}
function fd(t) {
  const e = iu(t);
  return dr(e, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  }), Object.freeze({ lowS: !0, ...e });
}
function ld(t) {
  const e = fd(t), { Fp: n, n: r } = e, i = n.BYTES + 1, o = 2 * n.BYTES + 1;
  function s(x) {
    return bt(x, r);
  }
  function c(x) {
    return mo(x, r);
  }
  const { ProjectivePoint: a, normPrivateKeyToScalar: u, weierstrassEquation: l, isWithinCurveOrder: f } = ud({
    ...e,
    toBytes(x, v, S) {
      const U = v.toAffine(), C = n.toBytes(U.x), M = en;
      return vn("isCompressed", S), S ? M(Uint8Array.from([v.hasEvenY() ? 2 : 3]), C) : M(Uint8Array.from([4]), C, n.toBytes(U.y));
    },
    fromBytes(x) {
      const v = x.length, S = x[0], U = x.subarray(1);
      if (v === i && (S === 2 || S === 3)) {
        const C = ue(U);
        if (!In(C, pt, n.ORDER))
          throw new Error("Point is not on curve");
        const M = l(C);
        let z;
        try {
          z = n.sqrt(M);
        } catch (tt) {
          const G = tt instanceof Error ? ": " + tt.message : "";
          throw new Error("Point is not on curve" + G);
        }
        const q = (z & pt) === pt;
        return (S & 1) === 1 !== q && (z = n.neg(z)), { x: C, y: z };
      } else if (v === o && S === 4) {
        const C = n.fromBytes(U.subarray(0, n.BYTES)), M = n.fromBytes(U.subarray(n.BYTES, 2 * n.BYTES));
        return { x: C, y: M };
      } else {
        const C = i, M = o;
        throw new Error("invalid Point, expected length of " + C + ", or uncompressed " + M + ", got " + v);
      }
    }
  }), d = (x) => An(De(x, e.nByteLength));
  function h(x) {
    const v = r >> pt;
    return x > v;
  }
  function y(x) {
    return h(x) ? s(-x) : x;
  }
  const w = (x, v, S) => ue(x.slice(v, S));
  class p {
    constructor(v, S, U) {
      this.r = v, this.s = S, this.recovery = U, this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(v) {
      const S = e.nByteLength;
      return v = Tt("compactSignature", v, S * 2), new p(w(v, 0, S), w(v, S, 2 * S));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(v) {
      const { r: S, s: U } = Ee.toSig(Tt("DER", v));
      return new p(S, U);
    }
    assertValidity() {
      Pe("r", this.r, pt, r), Pe("s", this.s, pt, r);
    }
    addRecoveryBit(v) {
      return new p(this.r, this.s, v);
    }
    recoverPublicKey(v) {
      const { r: S, s: U, recovery: C } = this, M = k(Tt("msgHash", v));
      if (C == null || ![0, 1, 2, 3].includes(C))
        throw new Error("recovery id invalid");
      const z = C === 2 || C === 3 ? S + e.n : S;
      if (z >= n.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const q = (C & 1) === 0 ? "02" : "03", st = a.fromHex(q + d(z)), tt = c(z), G = s(-M * tt), Mt = s(U * tt), Et = a.BASE.multiplyAndAddUnsafe(st, G, Mt);
      if (!Et)
        throw new Error("point at infinify");
      return Et.assertValidity(), Et;
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
      return Tn(this.toDERHex());
    }
    toDERHex() {
      return Ee.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return Tn(this.toCompactHex());
    }
    toCompactHex() {
      return d(this.r) + d(this.s);
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
      const x = eu(e.n);
      return ed(e.randomBytes(x), e.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(x = 8, v = a.BASE) {
      return v._setWindowSize(x), v.multiply(BigInt(3)), v;
    }
  };
  function m(x, v = !0) {
    return a.fromPrivateKey(x).toRawBytes(v);
  }
  function E(x) {
    const v = tn(x), S = typeof x == "string", U = (v || S) && x.length;
    return v ? U === i || U === o : S ? U === 2 * i || U === 2 * o : x instanceof a;
  }
  function A(x, v, S = !0) {
    if (E(x))
      throw new Error("first arg must be private key");
    if (!E(v))
      throw new Error("second arg must be public key");
    return a.fromHex(v).multiply(u(x)).toRawBytes(S);
  }
  const I = e.bits2int || function(x) {
    if (x.length > 8192)
      throw new Error("input is too large");
    const v = ue(x), S = x.length * 8 - e.nBitLength;
    return S > 0 ? v >> BigInt(S) : v;
  }, k = e.bits2int_modN || function(x) {
    return s(I(x));
  }, B = ls(e.nBitLength);
  function N(x) {
    return Pe("num < 2^" + e.nBitLength, x, xe, B), De(x, e.nByteLength);
  }
  function b(x, v, S = $) {
    if (["recovered", "canonical"].some((Bt) => Bt in S))
      throw new Error("sign() legacy options not supported");
    const { hash: U, randomBytes: C } = e;
    let { lowS: M, prehash: z, extraEntropy: q } = S;
    M == null && (M = !0), x = Tt("msgHash", x), wc(S), z && (x = Tt("prehashed msgHash", U(x)));
    const st = k(x), tt = u(v), G = [N(tt), N(st)];
    if (q != null && q !== !1) {
      const Bt = q === !0 ? C(n.BYTES) : q;
      G.push(Tt("extraEntropy", Bt));
    }
    const Mt = en(...G), Et = st;
    function qe(Bt) {
      const Dt = I(Bt);
      if (!f(Dt))
        return;
      const ze = c(Dt), Yt = a.BASE.multiply(Dt).toAffine(), Nt = s(Yt.x);
      if (Nt === xe)
        return;
      const jt = s(ze * s(Et + Nt * tt));
      if (jt === xe)
        return;
      let Zt = (Yt.x === Nt ? 0 : 2) | Number(Yt.y & pt), Ft = jt;
      return M && h(jt) && (Ft = y(jt), Zt ^= 1), new p(Nt, Ft, Zt);
    }
    return { seed: Mt, k2sig: qe };
  }
  const $ = { lowS: e.lowS, prehash: !1 }, R = { lowS: e.lowS, prehash: !1 };
  function L(x, v, S = $) {
    const { seed: U, k2sig: C } = b(x, v, S), M = e;
    return Va(M.hash.outputLen, M.nByteLength, M.hmac)(U, C);
  }
  a.BASE._setWindowSize(8);
  function F(x, v, S, U = R) {
    var Zt;
    const C = x;
    v = Tt("msgHash", v), S = Tt("publicKey", S);
    const { lowS: M, prehash: z, format: q } = U;
    if (wc(U), "strict" in U)
      throw new Error("options.strict was renamed to lowS");
    if (q !== void 0 && q !== "compact" && q !== "der")
      throw new Error("format must be compact or der");
    const st = typeof C == "string" || tn(C), tt = !st && !q && typeof C == "object" && C !== null && typeof C.r == "bigint" && typeof C.s == "bigint";
    if (!st && !tt)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let G, Mt;
    try {
      if (tt && (G = new p(C.r, C.s)), st) {
        try {
          q !== "compact" && (G = p.fromDER(C));
        } catch (Ft) {
          if (!(Ft instanceof Ee.Err))
            throw Ft;
        }
        !G && q !== "der" && (G = p.fromCompact(C));
      }
      Mt = a.fromHex(S);
    } catch {
      return !1;
    }
    if (!G || M && G.hasHighS())
      return !1;
    z && (v = e.hash(v));
    const { r: Et, s: qe } = G, Bt = k(v), Dt = c(qe), ze = s(Bt * Dt), Yt = s(Et * Dt), Nt = (Zt = a.BASE.multiplyAndAddUnsafe(Mt, ze, Yt)) == null ? void 0 : Zt.toAffine();
    return Nt ? s(Nt.x) === Et : !1;
  }
  return {
    CURVE: e,
    getPublicKey: m,
    getSharedSecret: A,
    sign: L,
    verify: F,
    ProjectivePoint: a,
    Signature: p,
    utils: g
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function dd(t) {
  return {
    hash: t,
    hmac: (e, ...n) => Xa(t, e, Vl(...n)),
    randomBytes: ja
  };
}
function hd(t, e) {
  const n = (r) => ld({ ...t, ...dd(r) });
  return Object.freeze({ ...n(e), create: n });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const hr = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"), Gr = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"), Yn = BigInt(1), Wr = BigInt(2), yc = (t, e) => (t + e / Wr) / e;
function ou(t) {
  const e = hr, n = BigInt(3), r = BigInt(6), i = BigInt(11), o = BigInt(22), s = BigInt(23), c = BigInt(44), a = BigInt(88), u = t * t * t % e, l = u * u * t % e, f = zt(l, n, e) * l % e, d = zt(f, n, e) * l % e, h = zt(d, Wr, e) * u % e, y = zt(h, i, e) * h % e, w = zt(y, o, e) * y % e, p = zt(w, c, e) * w % e, g = zt(p, a, e) * p % e, m = zt(g, c, e) * w % e, E = zt(m, n, e) * l % e, A = zt(E, s, e) * y % e, I = zt(A, r, e) * u % e, k = zt(I, Wr, e);
  if (!Eo.eql(Eo.sqr(k), t))
    throw new Error("Cannot find square root");
  return k;
}
const Eo = Ja(hr, void 0, void 0, { sqrt: ou }), jn = hd({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
  Fp: Eo,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: Gr,
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
      const e = Gr, n = BigInt("0x3086d221a7d46bcde86c90e49284eb15"), r = -Yn * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"), i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), o = n, s = BigInt("0x100000000000000000000000000000000"), c = yc(o * t, e), a = yc(-r * t, e);
      let u = bt(t - c * n - a * i, e), l = bt(-c * r - a * o, e);
      const f = u > s, d = l > s;
      if (f && (u = e - u), d && (l = e - l), u > s || l > s)
        throw new Error("splitScalar: Endomorphism failed, k=" + t);
      return { k1neg: f, k1: u, k2neg: d, k2: l };
    }
  }
}, go), su = BigInt(0), mc = {};
function Yr(t, ...e) {
  let n = mc[t];
  if (n === void 0) {
    const r = go(Uint8Array.from(t, (i) => i.charCodeAt(0)));
    n = en(r, r), mc[t] = n;
  }
  return go(en(n, ...e));
}
const gs = (t) => t.toRawBytes(!0).slice(1), bo = (t) => De(t, 32), Fi = (t) => bt(t, hr), Zn = (t) => bt(t, Gr), ys = jn.ProjectivePoint, pd = (t, e, n) => ys.BASE.multiplyAndAddUnsafe(t, e, n);
function So(t) {
  let e = jn.utils.normPrivateKeyToScalar(t), n = ys.fromPrivateKey(e);
  return { scalar: n.hasEvenY() ? e : Zn(-e), bytes: gs(n) };
}
function cu(t) {
  Pe("x", t, Yn, hr);
  const e = Fi(t * t), n = Fi(e * t + BigInt(7));
  let r = ou(n);
  r % Wr !== su && (r = Fi(-r));
  const i = new ys(t, r, Yn);
  return i.assertValidity(), i;
}
const dn = ue;
function au(...t) {
  return Zn(dn(Yr("BIP0340/challenge", ...t)));
}
function wd(t) {
  return So(t).bytes;
}
function gd(t, e, n = ja(32)) {
  const r = Tt("message", t), { bytes: i, scalar: o } = So(e), s = Tt("auxRand", n, 32), c = bo(o ^ dn(Yr("BIP0340/aux", s))), a = Yr("BIP0340/nonce", c, i, r), u = Zn(dn(a));
  if (u === su)
    throw new Error("sign failed: k is zero");
  const { bytes: l, scalar: f } = So(u), d = au(l, i, r), h = new Uint8Array(64);
  if (h.set(l, 0), h.set(bo(Zn(f + d * o)), 32), !uu(h, r, i))
    throw new Error("sign: Invalid signature produced");
  return h;
}
function uu(t, e, n) {
  const r = Tt("signature", t, 64), i = Tt("message", e), o = Tt("publicKey", n, 32);
  try {
    const s = cu(dn(o)), c = dn(r.subarray(0, 32));
    if (!In(c, Yn, hr))
      return !1;
    const a = dn(r.subarray(32, 64));
    if (!In(a, Yn, Gr))
      return !1;
    const u = au(bo(c), gs(s), i), l = pd(s, a, Zn(-u));
    return !(!l || !l.hasEvenY() || l.toAffine().x !== c);
  } catch {
    return !1;
  }
}
const fu = {
  getPublicKey: wd,
  sign: gd,
  verify: uu,
  utils: {
    randomPrivateKey: jn.utils.randomPrivateKey,
    lift_x: cu,
    pointToBytes: gs,
    numberToBytesBE: De,
    bytesToNumberBE: ue,
    taggedHash: Yr,
    mod: bt
  }
};
function ms(t, e, n = {}) {
  t = lo(t);
  const { aggPublicKey: r } = ho(t);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toRawBytes(!0),
      finalKey: r.toRawBytes(!0)
    };
  const i = fu.utils.taggedHash("TapTweak", r.toRawBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: o } = ho(t, [i], [!0]);
  return {
    preTweakedKey: r.toRawBytes(!0),
    finalKey: o.toRawBytes(!0)
  };
}
class xr extends Error {
  constructor(e) {
    super(e), this.name = "PartialSignatureError";
  }
}
class Es {
  constructor(e, n) {
    if (this.s = e, this.R = n, e.length !== 32)
      throw new xr("Invalid s length");
    if (n.length !== 33)
      throw new xr("Invalid R length");
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
      throw new xr("Invalid partial signature length");
    if (ue(e) >= hs.n)
      throw new xr("s value overflows curve order");
    const r = new Uint8Array(33);
    return new Es(e, r);
  }
}
function yd(t, e, n, r, i, o) {
  let s;
  if ((o == null ? void 0 : o.taprootTweak) !== void 0) {
    const { preTweakedKey: u } = ms(lo(r));
    s = fu.utils.taggedHash("TapTweak", u.subarray(1), o.taprootTweak);
  }
  const a = new pl(n, lo(r), i, s ? [s] : void 0, s ? [!0] : void 0).sign(t, e);
  return Es.decode(a);
}
var Ki, Ec;
function md() {
  if (Ec) return Ki;
  Ec = 1;
  const t = 4294967295, e = 1 << 31, n = 9, r = 65535, i = 1 << 22, o = r, s = 1 << n, c = r << n;
  function a(l) {
    return l & e ? {} : l & i ? {
      seconds: (l & r) << n
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: f }) {
    if (l !== void 0 && f !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && f === void 0) return t;
    if (f !== void 0) {
      if (!Number.isFinite(f)) throw new TypeError("Expected Number seconds");
      if (f > c) throw new TypeError("Expected Number seconds <= " + c);
      if (f % s !== 0) throw new TypeError("Expected Number seconds as a multiple of " + s);
      return i | f >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + o);
    return l;
  }
  return Ki = { decode: a, encode: u }, Ki;
}
var bc = md(), ct;
(function(t) {
  t[t.OP_0 = 0] = "OP_0", t[t.PUSHDATA1 = 76] = "PUSHDATA1", t[t.PUSHDATA2 = 77] = "PUSHDATA2", t[t.PUSHDATA4 = 78] = "PUSHDATA4", t[t["1NEGATE"] = 79] = "1NEGATE", t[t.RESERVED = 80] = "RESERVED", t[t.OP_1 = 81] = "OP_1", t[t.OP_2 = 82] = "OP_2", t[t.OP_3 = 83] = "OP_3", t[t.OP_4 = 84] = "OP_4", t[t.OP_5 = 85] = "OP_5", t[t.OP_6 = 86] = "OP_6", t[t.OP_7 = 87] = "OP_7", t[t.OP_8 = 88] = "OP_8", t[t.OP_9 = 89] = "OP_9", t[t.OP_10 = 90] = "OP_10", t[t.OP_11 = 91] = "OP_11", t[t.OP_12 = 92] = "OP_12", t[t.OP_13 = 93] = "OP_13", t[t.OP_14 = 94] = "OP_14", t[t.OP_15 = 95] = "OP_15", t[t.OP_16 = 96] = "OP_16", t[t.NOP = 97] = "NOP", t[t.VER = 98] = "VER", t[t.IF = 99] = "IF", t[t.NOTIF = 100] = "NOTIF", t[t.VERIF = 101] = "VERIF", t[t.VERNOTIF = 102] = "VERNOTIF", t[t.ELSE = 103] = "ELSE", t[t.ENDIF = 104] = "ENDIF", t[t.VERIFY = 105] = "VERIFY", t[t.RETURN = 106] = "RETURN", t[t.TOALTSTACK = 107] = "TOALTSTACK", t[t.FROMALTSTACK = 108] = "FROMALTSTACK", t[t["2DROP"] = 109] = "2DROP", t[t["2DUP"] = 110] = "2DUP", t[t["3DUP"] = 111] = "3DUP", t[t["2OVER"] = 112] = "2OVER", t[t["2ROT"] = 113] = "2ROT", t[t["2SWAP"] = 114] = "2SWAP", t[t.IFDUP = 115] = "IFDUP", t[t.DEPTH = 116] = "DEPTH", t[t.DROP = 117] = "DROP", t[t.DUP = 118] = "DUP", t[t.NIP = 119] = "NIP", t[t.OVER = 120] = "OVER", t[t.PICK = 121] = "PICK", t[t.ROLL = 122] = "ROLL", t[t.ROT = 123] = "ROT", t[t.SWAP = 124] = "SWAP", t[t.TUCK = 125] = "TUCK", t[t.CAT = 126] = "CAT", t[t.SUBSTR = 127] = "SUBSTR", t[t.LEFT = 128] = "LEFT", t[t.RIGHT = 129] = "RIGHT", t[t.SIZE = 130] = "SIZE", t[t.INVERT = 131] = "INVERT", t[t.AND = 132] = "AND", t[t.OR = 133] = "OR", t[t.XOR = 134] = "XOR", t[t.EQUAL = 135] = "EQUAL", t[t.EQUALVERIFY = 136] = "EQUALVERIFY", t[t.RESERVED1 = 137] = "RESERVED1", t[t.RESERVED2 = 138] = "RESERVED2", t[t["1ADD"] = 139] = "1ADD", t[t["1SUB"] = 140] = "1SUB", t[t["2MUL"] = 141] = "2MUL", t[t["2DIV"] = 142] = "2DIV", t[t.NEGATE = 143] = "NEGATE", t[t.ABS = 144] = "ABS", t[t.NOT = 145] = "NOT", t[t["0NOTEQUAL"] = 146] = "0NOTEQUAL", t[t.ADD = 147] = "ADD", t[t.SUB = 148] = "SUB", t[t.MUL = 149] = "MUL", t[t.DIV = 150] = "DIV", t[t.MOD = 151] = "MOD", t[t.LSHIFT = 152] = "LSHIFT", t[t.RSHIFT = 153] = "RSHIFT", t[t.BOOLAND = 154] = "BOOLAND", t[t.BOOLOR = 155] = "BOOLOR", t[t.NUMEQUAL = 156] = "NUMEQUAL", t[t.NUMEQUALVERIFY = 157] = "NUMEQUALVERIFY", t[t.NUMNOTEQUAL = 158] = "NUMNOTEQUAL", t[t.LESSTHAN = 159] = "LESSTHAN", t[t.GREATERTHAN = 160] = "GREATERTHAN", t[t.LESSTHANOREQUAL = 161] = "LESSTHANOREQUAL", t[t.GREATERTHANOREQUAL = 162] = "GREATERTHANOREQUAL", t[t.MIN = 163] = "MIN", t[t.MAX = 164] = "MAX", t[t.WITHIN = 165] = "WITHIN", t[t.RIPEMD160 = 166] = "RIPEMD160", t[t.SHA1 = 167] = "SHA1", t[t.SHA256 = 168] = "SHA256", t[t.HASH160 = 169] = "HASH160", t[t.HASH256 = 170] = "HASH256", t[t.CODESEPARATOR = 171] = "CODESEPARATOR", t[t.CHECKSIG = 172] = "CHECKSIG", t[t.CHECKSIGVERIFY = 173] = "CHECKSIGVERIFY", t[t.CHECKMULTISIG = 174] = "CHECKMULTISIG", t[t.CHECKMULTISIGVERIFY = 175] = "CHECKMULTISIGVERIFY", t[t.NOP1 = 176] = "NOP1", t[t.CHECKLOCKTIMEVERIFY = 177] = "CHECKLOCKTIMEVERIFY", t[t.CHECKSEQUENCEVERIFY = 178] = "CHECKSEQUENCEVERIFY", t[t.NOP4 = 179] = "NOP4", t[t.NOP5 = 180] = "NOP5", t[t.NOP6 = 181] = "NOP6", t[t.NOP7 = 182] = "NOP7", t[t.NOP8 = 183] = "NOP8", t[t.NOP9 = 184] = "NOP9", t[t.NOP10 = 185] = "NOP10", t[t.CHECKSIGADD = 186] = "CHECKSIGADD", t[t.INVALID = 255] = "INVALID";
})(ct || (ct = {}));
function Bn(t = 6, e = !1) {
  return Vt({
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
function Ed(t, e = 4, n = !0) {
  if (typeof t == "number")
    return t;
  if (X(t))
    try {
      const r = Bn(e, n).decode(t);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const D = Vt({
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
      if (typeof n == "number" && (n = Bn().encode(BigInt(n))), !X(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < ct.PUSHDATA1 ? t.byte(r) : r <= 255 ? (t.byte(ct.PUSHDATA1), t.byte(r)) : r <= 65535 ? (t.byte(ct.PUSHDATA2), t.bytes(qs.encode(r))) : (t.byte(ct.PUSHDATA4), t.bytes(W.encode(r))), t.bytes(n);
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
          r = Oe.decodeStream(t);
        else if (n === ct.PUSHDATA2)
          r = qs.decodeStream(t);
        else if (n === ct.PUSHDATA4)
          r = W.decodeStream(t);
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
}), Sc = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Ei = Vt({
  encodeStream: (t, e) => {
    if (typeof e == "number" && (e = BigInt(e)), 0n <= e && e <= 252n)
      return t.byte(Number(e));
    for (const [n, r, i, o] of Object.values(Sc))
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
    const [n, r, i] = Sc[e];
    let o = 0n;
    for (let s = 0; s < r; s++)
      o |= BigInt(t.byte()) << 8n * BigInt(s);
    if (o < i)
      throw t.err(`Wrong CompactSize(${8 * r})`);
    return o;
  }
}), ee = Ve(Ei, fi.numberBigint), Jt = J(Ei), bs = Ot(ee, Jt), jr = (t) => Ot(Ei, t), lu = mt({
  txid: J(32, !0),
  // hash(prev_tx),
  index: W,
  // output number of previous tx
  finalScriptSig: Jt,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: W
  // ?
}), Qe = mt({ amount: kr, script: Jt }), bd = mt({
  version: cn,
  segwitFlag: nl(new Uint8Array([0, 1])),
  inputs: jr(lu),
  outputs: jr(Qe),
  witnesses: rl("segwitFlag", Ot("inputs/length", bs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: W
});
function Sd(t) {
  if (t.segwitFlag && t.witnesses && !t.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return t;
}
const hn = Ht(bd, Sd), Hn = mt({
  version: cn,
  inputs: jr(lu),
  outputs: jr(Qe),
  lockTime: W
});
function Ur(t) {
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
function xc(t, e, n, r = !1, i = !1) {
  let { nonWitnessUtxo: o, txid: s } = t;
  typeof o == "string" && (o = j.decode(o)), X(o) && (o = hn.decode(o)), !("nonWitnessUtxo" in t) && o === void 0 && (o = e == null ? void 0 : e.nonWitnessUtxo), typeof s == "string" && (s = j.decode(s)), s === void 0 && (s = e == null ? void 0 : e.txid);
  let c = { ...e, ...t, nonWitnessUtxo: o, txid: s };
  !("nonWitnessUtxo" in t) && c.nonWitnessUtxo === void 0 && delete c.nonWitnessUtxo, c.sequence === void 0 && (c.sequence = Ss), c.tapMerkleRoot === null && delete c.tapMerkleRoot, c = Ao(Si, c, e, n, i), As.encode(c);
  let a;
  return c.nonWitnessUtxo && c.index !== void 0 ? a = c.nonWitnessUtxo.outputs[c.index] : c.witnessUtxo && (a = c.witnessUtxo), a && !r && wu(a && a.script, c.redeemScript, c.witnessScript), c;
}
function vc(t, e = !1) {
  let n = "legacy", r = Z.ALL;
  const i = Ur(t), o = St.decode(i.script);
  let s = o.type, c = o;
  const a = [o];
  if (o.type === "tr")
    return r = Z.DEFAULT, {
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
      let d = St.decode(t.redeemScript);
      (d.type === "wpkh" || d.type === "wsh") && (n = "segwit"), a.push(d), c = d, s += `-${d.type}`;
    }
    if (c.type === "wsh") {
      if (!t.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let d = St.decode(t.witnessScript);
      d.type === "wsh" && (n = "segwit"), a.push(d), c = d, s += `-${d.type}`;
    }
    const u = a[a.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = St.encode(u), f = {
      type: s,
      txType: n,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: t.sighashType || r
    };
    if (n === "legacy" && !e && !t.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return f;
  }
}
const xd = (t) => Math.ceil(t / 4), vr = new Uint8Array(32), vd = {
  amount: 0xffffffffffffffffn,
  script: et
}, Ad = 8, Td = 2, Ge = 0, Ss = 4294967295;
fi.decimal(Ad);
const Dn = (t, e) => t === void 0 ? e : t;
function Zr(t) {
  if (Array.isArray(t))
    return t.map((e) => Zr(e));
  if (X(t))
    return Uint8Array.from(t);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof t))
    return t;
  if (t === null)
    return t;
  if (typeof t == "object")
    return Object.fromEntries(Object.entries(t).map(([e, n]) => [e, Zr(n)]));
  throw new Error(`cloneDeep: unknown type=${t} (${typeof t})`);
}
var Z;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.ANYONECANPAY = 128] = "ANYONECANPAY";
})(Z || (Z = {}));
var Xn;
(function(t) {
  t[t.DEFAULT = 0] = "DEFAULT", t[t.ALL = 1] = "ALL", t[t.NONE = 2] = "NONE", t[t.SINGLE = 3] = "SINGLE", t[t.DEFAULT_ANYONECANPAY = 128] = "DEFAULT_ANYONECANPAY", t[t.ALL_ANYONECANPAY = 129] = "ALL_ANYONECANPAY", t[t.NONE_ANYONECANPAY = 130] = "NONE_ANYONECANPAY", t[t.SINGLE_ANYONECANPAY = 131] = "SINGLE_ANYONECANPAY";
})(Xn || (Xn = {}));
function Id(t, e, n, r = et) {
  return ut(n, e) && (t = cl(t, r), e = es(t)), { privKey: t, pubKey: e };
}
function We(t) {
  if (t.script === void 0 || t.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: t.script, amount: t.amount };
}
function Rn(t) {
  if (t.txid === void 0 || t.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: t.txid,
    index: t.index,
    sequence: Dn(t.sequence, Ss),
    finalScriptSig: Dn(t.finalScriptSig, et)
  };
}
function qi(t) {
  for (const e in t) {
    const n = e;
    Ld.includes(n) || delete t[n];
  }
}
const zi = mt({ txid: J(32, !0), index: W });
function kd(t) {
  if (typeof t != "number" || typeof Xn[t] != "string")
    throw new Error(`Invalid SigHash=${t}`);
  return t;
}
function Ac(t) {
  const e = t & 31;
  return {
    isAny: !!(t & Z.ANYONECANPAY),
    isNone: e === Z.NONE,
    isSingle: e === Z.SINGLE
  };
}
function Bd(t) {
  if (t !== void 0 && {}.toString.call(t) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${t}`);
  const e = {
    ...t,
    // Defaults
    version: Dn(t.version, Td),
    lockTime: Dn(t.lockTime, 0),
    PSBTVersion: Dn(t.PSBTVersion, 0)
  };
  if (typeof e.allowUnknowInput < "u" && (t.allowUnknownInputs = e.allowUnknowInput), typeof e.allowUnknowOutput < "u" && (t.allowUnknownOutputs = e.allowUnknowOutput), ![-1, 0, 1, 2, 3].includes(e.version))
    throw new Error(`Unknown version: ${e.version}`);
  if (typeof e.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (W.encode(e.lockTime), e.PSBTVersion !== 0 && e.PSBTVersion !== 2)
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
    const n = this.opts = Bd(e);
    n.lockTime !== Ge && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
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
      r = Nc.decode(e);
    } catch (f) {
      try {
        r = Uc.decode(e);
      } catch {
        throw f;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const o = r.global.unsignedTx, s = i === 0 ? o == null ? void 0 : o.version : r.global.txVersion, c = i === 0 ? o == null ? void 0 : o.lockTime : r.global.fallbackLocktime, a = new ot({ ...n, version: s, lockTime: c, PSBTVersion: i }), u = i === 0 ? o == null ? void 0 : o.inputs.length : r.global.inputCount;
    a.inputs = r.inputs.slice(0, u).map((f, d) => {
      var h;
      return {
        finalScriptSig: et,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.inputs[d],
        ...f
      };
    });
    const l = i === 0 ? o == null ? void 0 : o.outputs.length : r.global.outputCount;
    return a.outputs = r.outputs.slice(0, l).map((f, d) => {
      var h;
      return {
        ...f,
        ...(h = r.global.unsignedTx) == null ? void 0 : h.outputs[d]
      };
    }), a.global = { ...r.global, txVersion: s }, c !== Ge && (a.global.fallbackLocktime = c), a;
  }
  toPSBT(e = this.opts.PSBTVersion) {
    if (e !== 0 && e !== 2)
      throw new Error(`Wrong PSBT version=${e}`);
    const n = this.inputs.map((o) => Bc(e, Si, o));
    for (const o of n)
      o.partialSig && !o.partialSig.length && delete o.partialSig, o.finalScriptSig && !o.finalScriptSig.length && delete o.finalScriptSig, o.finalScriptWitness && !o.finalScriptWitness.length && delete o.finalScriptWitness;
    const r = this.outputs.map((o) => Bc(e, Qr, o)), i = { ...this.global };
    return e === 0 ? (i.unsignedTx = Hn.decode(Hn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Rn).map((o) => ({
        ...o,
        finalScriptSig: et
      })),
      outputs: this.outputs.map(We)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = e, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Ge && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (e === 0 ? Nc : Uc).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let e = Ge, n = 0, r = Ge, i = 0;
    for (const o of this.inputs)
      o.requiredHeightLocktime && (e = Math.max(e, o.requiredHeightLocktime), n++), o.requiredTimeLocktime && (r = Math.max(r, o.requiredTimeLocktime), i++);
    return n && n >= i ? e : r !== Ge ? r : this.global.fallbackLocktime || Ge;
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
    const n = this.inputs[e].sighashType, r = n === void 0 ? Z.DEFAULT : n, i = r === Z.DEFAULT ? Z.ALL : r & 3;
    return { sigInputs: r & Z.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let e = !0, n = !0, r = [], i = [];
    for (let o = 0; o < this.inputs.length; o++) {
      if (this.inputStatus(o) === "unsigned")
        continue;
      const { sigInputs: c, sigOutputs: a } = this.inputSighash(o);
      if (c === Z.ANYONECANPAY ? r.push(o) : e = !1, a === Z.ALL)
        n = !1;
      else if (a === Z.SINGLE)
        i.push(o);
      else if (a !== Z.NONE) throw new Error(`Wrong signature hash output type: ${a}`);
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
    const n = this.outputs.map(We);
    e += 4 * ee.encode(this.outputs.length).length;
    for (const r of n)
      e += 32 + 4 * Jt.encode(r.script).length;
    this.hasWitnesses && (e += 2), e += 4 * ee.encode(this.inputs.length).length;
    for (const r of this.inputs)
      e += 160 + 4 * Jt.encode(r.finalScriptSig || et).length, this.hasWitnesses && r.finalScriptWitness && (e += bs.encode(r.finalScriptWitness).length);
    return e;
  }
  get vsize() {
    return xd(this.weight);
  }
  toBytes(e = !1, n = !1) {
    return hn.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(Rn).map((r) => ({
        ...r,
        finalScriptSig: e && r.finalScriptSig || et
      })),
      outputs: this.outputs.map(We),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return j.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return j.encode(Gt(this.toBytes(!0)));
  }
  get id() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    return j.encode(Gt(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.inputs.length)
      throw new Error(`Wrong input index=${e}`);
  }
  getInput(e) {
    return this.checkInputIdx(e), Zr(this.inputs[e]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(e, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(xc(e, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(e, n, r = !1) {
    this.checkInputIdx(e);
    let i;
    if (!r) {
      const o = this.signStatus();
      (!o.addInput || o.inputs.includes(e)) && (i = Rd);
    }
    this.inputs[e] = xc(n, this.inputs[e], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(e) {
    if (!Number.isSafeInteger(e) || 0 > e || e >= this.outputs.length)
      throw new Error(`Wrong output index=${e}`);
  }
  getOutput(e) {
    return this.checkOutputIdx(e), Zr(this.outputs[e]);
  }
  getOutputAddress(e, n = Sn) {
    const r = this.getOutput(e);
    if (r.script)
      return Qn(n).encode(St.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(e, n, r) {
    let { amount: i, script: o } = e;
    if (i === void 0 && (i = n == null ? void 0 : n.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof o == "string" && (o = j.decode(o)), o === void 0 && (o = n == null ? void 0 : n.script);
    let s = { ...n, ...e, amount: i, script: o };
    if (s.amount === void 0 && delete s.amount, s = Ao(Qr, s, n, r, this.opts.allowUnknown), Ts.encode(s), s.script && !this.opts.allowUnknownOutputs && St.decode(s.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || wu(s.script, s.redeemScript, s.witnessScript), s;
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
      (!o.addOutput || o.outputs.includes(e)) && (i = _d);
    }
    this.outputs[e] = this.normalizeOutput(n, this.outputs[e], i);
  }
  addOutputAddress(e, n, r = Sn) {
    return this.addOutput({ script: St.encode(Qn(r).decode(e)), amount: n });
  }
  // Utils
  get fee() {
    let e = 0n;
    for (const r of this.inputs) {
      const i = Ur(r);
      if (!i)
        throw new Error("Empty input amount");
      e += i.amount;
    }
    const n = this.outputs.map(We);
    for (const r of n)
      e -= r.amount;
    return e;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(e, n, r) {
    const { isAny: i, isNone: o, isSingle: s } = Ac(r);
    if (e < 0 || !Number.isSafeInteger(e))
      throw new Error(`Invalid input idx=${e}`);
    if (s && e >= this.outputs.length || e >= this.inputs.length)
      return va.encode(1n);
    n = D.encode(D.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let c = this.inputs.map(Rn).map((l, f) => ({
      ...l,
      finalScriptSig: f === e ? n : et
    }));
    i ? c = [c[e]] : (o || s) && (c = c.map((l, f) => ({
      ...l,
      sequence: f === e ? l.sequence : 0
    })));
    let a = this.outputs.map(We);
    o ? a = [] : s && (a = a.slice(0, e).fill(vd).concat([a[e]]));
    const u = hn.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: c,
      outputs: a
    });
    return Gt(u, cn.encode(r));
  }
  preimageWitnessV0(e, n, r, i) {
    const { isAny: o, isNone: s, isSingle: c } = Ac(r);
    let a = vr, u = vr, l = vr;
    const f = this.inputs.map(Rn), d = this.outputs.map(We);
    o || (a = Gt(...f.map(zi.encode))), !o && !c && !s && (u = Gt(...f.map((y) => W.encode(y.sequence)))), !c && !s ? l = Gt(...d.map(Qe.encode)) : c && e < d.length && (l = Gt(Qe.encode(d[e])));
    const h = f[e];
    return Gt(cn.encode(this.version), a, u, J(32, !0).encode(h.txid), W.encode(h.index), Jt.encode(n), kr.encode(i), W.encode(h.sequence), l, W.encode(this.lockTime), W.encode(r));
  }
  preimageWitnessV1(e, n, r, i, o = -1, s, c = 192, a) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      Oe.encode(0),
      Oe.encode(r),
      // U8 sigHash
      cn.encode(this.version),
      W.encode(this.lockTime)
    ], l = r === Z.DEFAULT ? Z.ALL : r & 3, f = r & Z.ANYONECANPAY, d = this.inputs.map(Rn), h = this.outputs.map(We);
    f !== Z.ANYONECANPAY && u.push(...[
      d.map(zi.encode),
      i.map(kr.encode),
      n.map(Jt.encode),
      d.map((w) => W.encode(w.sequence))
    ].map((w) => Lt(Ce(...w)))), l === Z.ALL && u.push(Lt(Ce(...h.map(Qe.encode))));
    const y = (a ? 1 : 0) | (s ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === Z.ANYONECANPAY) {
      const w = d[e];
      u.push(zi.encode(w), kr.encode(i[e]), Jt.encode(n[e]), W.encode(w.sequence));
    } else
      u.push(W.encode(e));
    return y & 1 && u.push(Lt(Jt.encode(a || et))), l === Z.SINGLE && u.push(e < h.length ? Lt(Qe.encode(h[e])) : vr), s && u.push(Fn(s, c), Oe.encode(0), cn.encode(o)), ns("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(e, n, r, i) {
    this.checkInputIdx(n);
    const o = this.inputs[n], s = vc(o, this.opts.allowLegacyWitnessUtxo);
    if (!X(e)) {
      if (!o.bip32Derivation || !o.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = o.bip32Derivation.filter((d) => d[1].fingerprint == e.fingerprint).map(([d, { path: h }]) => {
        let y = e;
        for (const w of h)
          y = y.deriveChild(w);
        if (!ut(y.publicKey, d))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${e.fingerprint}`);
      let f = !1;
      for (const d of l)
        this.signIdx(d.privateKey, n) && (f = !0);
      return f;
    }
    r ? r.forEach(kd) : r = [s.defaultSighash];
    const c = s.sighash;
    if (!r.includes(c))
      throw new Error(`Input with not allowed sigHash=${c}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: a } = this.inputSighash(n);
    if (a === Z.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Ur(o);
    if (s.txType === "taproot") {
      const l = this.inputs.map(Ur), f = l.map((p) => p.script), d = l.map((p) => p.amount);
      let h = !1, y = es(e), w = o.tapMerkleRoot || et;
      if (o.tapInternalKey) {
        const { pubKey: p, privKey: g } = Id(e, y, o.tapInternalKey, w), [m, E] = Ba(o.tapInternalKey, w);
        if (ut(m, p)) {
          const A = this.preimageWitnessV1(n, f, c, d), I = Ce(Gs(A, g, i), c !== Z.DEFAULT ? new Uint8Array([c]) : et);
          this.updateInput(n, { tapKeySig: I }, !0), h = !0;
        }
      }
      if (o.tapLeafScript) {
        o.tapScriptSig = o.tapScriptSig || [];
        for (const [p, g] of o.tapLeafScript) {
          const m = g.subarray(0, -1), E = D.decode(m), A = g[g.length - 1], I = Fn(m, A);
          if (E.findIndex((b) => X(b) && ut(b, y)) === -1)
            continue;
          const B = this.preimageWitnessV1(n, f, c, d, void 0, m, A), N = Ce(Gs(B, e, i), c !== Z.DEFAULT ? new Uint8Array([c]) : et);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: I }, N]] }, !0), h = !0;
        }
      }
      if (!h)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = ol(e);
      let f = !1;
      const d = Ta(l);
      for (const w of D.decode(s.lastScript))
        X(w) && (ut(w, l) || ut(w, d)) && (f = !0);
      if (!f)
        throw new Error(`Input script doesn't have pubKey: ${s.lastScript}`);
      let h;
      if (s.txType === "legacy")
        h = this.preimageLegacy(n, s.lastScript, c);
      else if (s.txType === "segwit") {
        let w = s.lastScript;
        s.last.type === "wpkh" && (w = St.encode({ type: "pkh", hash: s.last.hash })), h = this.preimageWitnessV0(n, w, c, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${s.txType}`);
      const y = sl(h, e, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, Ce(y, new Uint8Array([c]))]]
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
    const n = this.inputs[e], r = vc(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const a = n.tapLeafScript.sort((u, l) => Re.encode(u[0]).length - Re.encode(l[0]).length);
        for (const [u, l] of a) {
          const f = l.slice(0, -1), d = l[l.length - 1], h = St.decode(f), y = Fn(f, d), w = n.tapScriptSig.filter((g) => ut(g[0].leafHash, y));
          let p = [];
          if (h.type === "tr_ms") {
            const g = h.m, m = h.pubkeys;
            let E = 0;
            for (const A of m) {
              const I = w.findIndex((k) => ut(k[0].pubKey, A));
              if (E === g || I === -1) {
                p.push(et);
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
            const g = D.decode(f);
            if (p = w.map(([{ pubKey: m }, E]) => {
              const A = g.findIndex((I) => X(I) && ut(I, m));
              if (A === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: E, pos: A };
            }).sort((m, E) => m.pos - E.pos).map((m) => m.signature), !p.length)
              continue;
          } else {
            const g = this.opts.customScripts;
            if (g)
              for (const m of g) {
                if (!m.finalizeTaproot)
                  continue;
                const E = D.decode(f), A = m.encode(E);
                if (A === void 0)
                  continue;
                const I = m.finalizeTaproot(f, A, w);
                if (I) {
                  n.finalScriptWitness = I.concat(Re.encode(u)), n.finalScriptSig = et, qi(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = p.reverse().concat([f, Re.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = et, qi(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = et, o = [];
    if (r.last.type === "ms") {
      const a = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const d = n.partialSig.find((h) => ut(f, h[0]));
        d && l.push(d[1]);
      }
      if (l = l.slice(0, a), l.length !== a)
        throw new Error(`Multisig: wrong signatures count, m=${a} n=${u.length} signatures=${l.length}`);
      i = D.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = D.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = D.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = et, o = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let s, c;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (o = D.decode(i).map((a) => {
      if (a === 0)
        return et;
      if (X(a))
        return a;
      throw new Error(`Wrong witness op=${a}`);
    })), o = o.concat(r.lastScript)), r.txType === "segwit" && (c = o), r.type.startsWith("sh-wsh-") ? s = D.encode([D.encode([0, Lt(r.lastScript)])]) : r.type.startsWith("sh-") ? s = D.encode([...D.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (s = i), !s && !c)
      throw new Error("Unknown error finalizing input");
    s && (n.finalScriptSig = s), c && (n.finalScriptWitness = c), qi(n);
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
    const n = this.global.unsignedTx ? Hn.encode(this.global.unsignedTx) : et, r = e.global.unsignedTx ? Hn.encode(e.global.unsignedTx) : et;
    if (!ut(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Ao(xs, this.global, e.global, void 0, this.opts.allowUnknown);
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
const xo = Ht(J(null), (t) => bn(t, $t.ecdsa)), Xr = Ht(J(32), (t) => bn(t, $t.schnorr)), Tc = Ht(J(null), (t) => {
  if (t.length !== 64 && t.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return t;
}), bi = mt({
  fingerprint: Jf,
  path: Ot(null, W)
}), du = mt({
  hashes: Ot(ee, J(32)),
  der: bi
}), Nd = J(78), Ud = mt({ pubKey: Xr, leafHash: J(32) }), $d = mt({
  version: Oe,
  // With parity :(
  internalKey: J(32),
  merklePath: Ot(null, J(32))
}), Re = Ht($d, (t) => {
  if (t.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return t;
}), Cd = Ot(null, mt({
  depth: Oe,
  version: Oe,
  script: Jt
})), at = J(null), Ic = J(20), _n = J(32), xs = {
  unsignedTx: [0, !1, Hn, [0], [0], !1],
  xpub: [1, Nd, bi, [], [0, 2], !1],
  txVersion: [2, !1, W, [2], [2], !1],
  fallbackLocktime: [3, !1, W, [], [2], !1],
  inputCount: [4, !1, ee, [2], [2], !1],
  outputCount: [5, !1, ee, [2], [2], !1],
  txModifiable: [6, !1, Oe, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, W, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, Si = {
  nonWitnessUtxo: [0, !1, hn, [], [0, 2], !1],
  witnessUtxo: [1, !1, Qe, [], [0, 2], !1],
  partialSig: [2, xo, at, [], [0, 2], !1],
  sighashType: [3, !1, W, [], [0, 2], !1],
  redeemScript: [4, !1, at, [], [0, 2], !1],
  witnessScript: [5, !1, at, [], [0, 2], !1],
  bip32Derivation: [6, xo, bi, [], [0, 2], !1],
  finalScriptSig: [7, !1, at, [], [0, 2], !1],
  finalScriptWitness: [8, !1, bs, [], [0, 2], !1],
  porCommitment: [9, !1, at, [], [0, 2], !1],
  ripemd160: [10, Ic, at, [], [0, 2], !1],
  sha256: [11, _n, at, [], [0, 2], !1],
  hash160: [12, Ic, at, [], [0, 2], !1],
  hash256: [13, _n, at, [], [0, 2], !1],
  txid: [14, !1, _n, [2], [2], !0],
  index: [15, !1, W, [2], [2], !0],
  sequence: [16, !1, W, [], [2], !0],
  requiredTimeLocktime: [17, !1, W, [], [2], !1],
  requiredHeightLocktime: [18, !1, W, [], [2], !1],
  tapKeySig: [19, !1, Tc, [], [0, 2], !1],
  tapScriptSig: [20, Ud, Tc, [], [0, 2], !1],
  tapLeafScript: [21, Re, at, [], [0, 2], !1],
  tapBip32Derivation: [22, _n, du, [], [0, 2], !1],
  tapInternalKey: [23, !1, Xr, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, _n, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, Ld = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], Rd = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Qr = {
  redeemScript: [0, !1, at, [], [0, 2], !1],
  witnessScript: [1, !1, at, [], [0, 2], !1],
  bip32Derivation: [2, xo, bi, [], [0, 2], !1],
  amount: [3, !1, Xf, [2], [2], !0],
  script: [4, !1, at, [2], [2], !0],
  tapInternalKey: [5, !1, Xr, [], [0, 2], !1],
  tapTree: [6, !1, Cd, [], [0, 2], !1],
  tapBip32Derivation: [7, Xr, du, [], [0, 2], !1],
  proprietary: [252, at, at, [], [0, 2], !1]
}, _d = [], kc = Ot(ma, mt({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: tl(ee, mt({ type: ee, key: J(null) })),
  //  <value> := <valuelen> <valuedata>
  value: J(ee)
}));
function vo(t) {
  const [e, n, r, i, o, s] = t;
  return { type: e, kc: n, vc: r, reqInc: i, allowInc: o, silentIgnore: s };
}
mt({ type: ee, key: J(null) });
function vs(t) {
  const e = {};
  for (const n in t) {
    const [r, i, o] = t[n];
    e[r] = [n, i, o];
  }
  return Vt({
    encodeStream: (n, r) => {
      let i = [];
      for (const o in t) {
        const s = r[o];
        if (s === void 0)
          continue;
        const [c, a, u] = t[o];
        if (!a)
          i.push({ key: { type: c, key: et }, value: u.encode(s) });
        else {
          const l = s.map(([f, d]) => [
            a.encode(f),
            u.encode(d)
          ]);
          l.sort((f, d) => Mr(f[0], d[0]));
          for (const [f, d] of l)
            i.push({ key: { key: f, type: c }, value: d });
        }
      }
      if (r.unknown) {
        r.unknown.sort((o, s) => Mr(o[0].key, s[0].key));
        for (const [o, s] of r.unknown)
          i.push({ key: o, value: s });
      }
      kc.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = kc.decodeStream(n), i = {}, o = {};
      for (const s of r) {
        let c = "unknown", a = s.key.key, u = s.value;
        if (e[s.key.type]) {
          const [l, f, d] = e[s.key.type];
          if (c = l, !f && a.length)
            throw new Error(`PSBT: Non-empty key for ${c} (key=${j.encode(a)} value=${j.encode(u)}`);
          if (a = f ? f.decode(a) : void 0, u = d.decode(u), !f) {
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
const As = Ht(vs(Si), (t) => {
  if (t.finalScriptWitness && !t.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (t.partialSig && !t.partialSig.length)
    throw new Error("Empty partialSig");
  if (t.partialSig)
    for (const [e] of t.partialSig)
      bn(e, $t.ecdsa);
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      bn(e, $t.ecdsa);
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
    }), r = j.encode(t.txid);
    if (n.isFinal && n.id !== r)
      throw new Error(`nonWitnessUtxo: wrong txid, exp=${r} got=${n.id}`);
  }
  return t;
}), Ts = Ht(vs(Qr), (t) => {
  if (t.bip32Derivation)
    for (const [e] of t.bip32Derivation)
      bn(e, $t.ecdsa);
  return t;
}), hu = Ht(vs(xs), (t) => {
  if ((t.version || 0) === 0) {
    if (!t.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of t.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return t;
}), Od = mt({
  magic: ts(Jo(new Uint8Array([255])), "psbt"),
  global: hu,
  inputs: Ot("global/unsignedTx/inputs/length", As),
  outputs: Ot(null, Ts)
}), Pd = mt({
  magic: ts(Jo(new Uint8Array([255])), "psbt"),
  global: hu,
  inputs: Ot("global/inputCount", As),
  outputs: Ot("global/outputCount", Ts)
});
mt({
  magic: ts(Jo(new Uint8Array([255])), "psbt"),
  items: Ot(null, Ve(Ot(ma, il([el(ee), J(Ei)])), fi.dict()))
});
function Gi(t, e, n) {
  for (const r in n) {
    if (r === "unknown" || !e[r])
      continue;
    const { allowInc: i } = vo(e[r]);
    if (!i.includes(t))
      throw new Error(`PSBTv${t}: field ${r} is not allowed`);
  }
  for (const r in e) {
    const { reqInc: i } = vo(e[r]);
    if (i.includes(t) && n[r] === void 0)
      throw new Error(`PSBTv${t}: missing required field ${r}`);
  }
}
function Bc(t, e, n) {
  const r = {};
  for (const i in n) {
    const o = i;
    if (o !== "unknown") {
      if (!e[o])
        continue;
      const { allowInc: s, silentIgnore: c } = vo(e[o]);
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
function pu(t) {
  const e = t && t.global && t.global.version || 0;
  Gi(e, xs, t.global);
  for (const s of t.inputs)
    Gi(e, Si, s);
  for (const s of t.outputs)
    Gi(e, Qr, s);
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
function Ao(t, e, n, r, i) {
  const o = { ...n, ...e };
  for (const s in t) {
    const c = s, [a, u, l] = t[c], f = r && !r.includes(s);
    if (e[s] === void 0 && s in e) {
      if (f)
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
            typeof p[0] == "string" ? u.decode(j.decode(p[0])) : p[0],
            typeof p[1] == "string" ? l.decode(j.decode(p[1])) : p[1]
          ];
        });
        const y = {}, w = (p, g, m) => {
          if (y[p] === void 0) {
            y[p] = [g, m];
            return;
          }
          const E = j.encode(l.encode(y[p][1])), A = j.encode(l.encode(m));
          if (E !== A)
            throw new Error(`keyMap(${c}): same key=${p} oldVal=${E} newVal=${A}`);
        };
        for (const [p, g] of d) {
          const m = j.encode(u.encode(p));
          w(m, p, g);
        }
        for (const [p, g] of h) {
          const m = j.encode(u.encode(p));
          if (g === void 0) {
            if (f)
              throw new Error(`Cannot remove signed field=${c}/${p}`);
            delete y[m];
          } else
            w(m, p, g);
        }
        o[c] = Object.values(y);
      }
    } else if (typeof o[s] == "string")
      o[s] = l.decode(j.decode(o[s]));
    else if (f && s in e && n && n[s] !== void 0 && !ut(l.encode(e[s]), l.encode(n[s])))
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
const Nc = Ht(Od, pu), Uc = Ht(Pd, pu), Hd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !X(t[1]) || j.encode(t[1]) !== "4e73"))
      return { type: "p2a", script: D.encode(t) };
  },
  decode: (t) => {
    if (t.type === "p2a")
      return [1, j.decode("4e73")];
  }
};
function un(t, e) {
  try {
    return bn(t, e), !0;
  } catch {
    return !1;
  }
}
const Vd = {
  encode(t) {
    if (!(t.length !== 2 || !X(t[0]) || !un(t[0], $t.ecdsa) || t[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: t[0] };
  },
  decode: (t) => t.type === "pk" ? [t.pubkey, "CHECKSIG"] : void 0
}, Md = {
  encode(t) {
    if (!(t.length !== 5 || t[0] !== "DUP" || t[1] !== "HASH160" || !X(t[2])) && !(t[3] !== "EQUALVERIFY" || t[4] !== "CHECKSIG"))
      return { type: "pkh", hash: t[2] };
  },
  decode: (t) => t.type === "pkh" ? ["DUP", "HASH160", t.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, Dd = {
  encode(t) {
    if (!(t.length !== 3 || t[0] !== "HASH160" || !X(t[1]) || t[2] !== "EQUAL"))
      return { type: "sh", hash: t[1] };
  },
  decode: (t) => t.type === "sh" ? ["HASH160", t.hash, "EQUAL"] : void 0
}, Fd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !X(t[1])) && t[1].length === 32)
      return { type: "wsh", hash: t[1] };
  },
  decode: (t) => t.type === "wsh" ? [0, t.hash] : void 0
}, Kd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 0 || !X(t[1])) && t[1].length === 20)
      return { type: "wpkh", hash: t[1] };
  },
  decode: (t) => t.type === "wpkh" ? [0, t.hash] : void 0
}, qd = {
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
        if (!X(o))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (t) => t.type === "ms" ? [t.m, ...t.pubkeys, t.pubkeys.length, "CHECKMULTISIG"] : void 0
}, zd = {
  encode(t) {
    if (!(t.length !== 2 || t[0] !== 1 || !X(t[1])))
      return { type: "tr", pubkey: t[1] };
  },
  decode: (t) => t.type === "tr" ? [1, t.pubkey] : void 0
}, Gd = {
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
      if (!X(i))
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
}, Wd = {
  encode(t) {
    const e = t.length - 1;
    if (t[e] !== "NUMEQUAL" || t[1] !== "CHECKSIG")
      return;
    const n = [], r = Ed(t[e - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < e - 1; i++) {
        const o = t[i];
        if (i & 1) {
          if (o !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!X(o))
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
}, Yd = {
  encode(t) {
    return { type: "unknown", script: D.encode(t) };
  },
  decode: (t) => t.type === "unknown" ? D.decode(t.script) : void 0
}, jd = [
  Hd,
  Vd,
  Md,
  Dd,
  Fd,
  Kd,
  qd,
  zd,
  Gd,
  Wd,
  Yd
], Zd = Ve(D, fi.match(jd)), St = Ht(Zd, (t) => {
  if (t.type === "pk" && !un(t.pubkey, $t.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((t.type === "pkh" || t.type === "sh" || t.type === "wpkh") && (!X(t.hash) || t.hash.length !== 20))
    throw new Error(`OutScript/${t.type}: wrong hash`);
  if (t.type === "wsh" && (!X(t.hash) || t.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (t.type === "tr" && (!X(t.pubkey) || !un(t.pubkey, $t.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((t.type === "ms" || t.type === "tr_ns" || t.type === "tr_ms") && !Array.isArray(t.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (t.type === "ms") {
    const e = t.pubkeys.length;
    for (const n of t.pubkeys)
      if (!un(n, $t.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (t.m <= 0 || e > 16 || t.m > e)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (t.type === "tr_ns" || t.type === "tr_ms") {
    for (const e of t.pubkeys)
      if (!un(e, $t.schnorr))
        throw new Error(`OutScript/${t.type}: wrong pubkey`);
  }
  if (t.type === "tr_ms") {
    const e = t.pubkeys.length;
    if (t.m <= 0 || e > 999 || t.m > e)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return t;
});
function $c(t, e) {
  if (!ut(t.hash, Lt(e)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = St.decode(e);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function wu(t, e, n) {
  if (t) {
    const r = St.decode(t);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && e) {
      if (!ut(r.hash, Ta(e)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = St.decode(e);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && $c(r, n);
  }
  if (e) {
    const r = St.decode(e);
    r.type === "wsh" && n && $c(r, n);
  }
}
function Xd(t) {
  const e = {};
  for (const n of t) {
    const r = j.encode(n);
    if (e[r])
      throw new Error(`Multisig: non-uniq pubkey: ${t.map(j.encode)}`);
    e[r] = !0;
  }
}
function Qd(t, e, n = !1, r) {
  const i = St.decode(t);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const o = i;
  if (!n && o.pubkeys)
    for (const s of o.pubkeys) {
      if (ut(s, rs))
        throw new Error("Unspendable taproot key in leaf script");
      if (ut(s, e))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function gu(t) {
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
function To(t, e = []) {
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
    left: To(t.left, [t.right.hash, ...e]),
    right: To(t.right, [t.left.hash, ...e])
  };
}
function Io(t) {
  if (!t)
    throw new Error("taprootAddPath: empty tree");
  if (t.type === "leaf")
    return [t];
  if (t.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${t}`);
  return [...Io(t.left), ...Io(t.right)];
}
function ko(t, e, n = !1, r) {
  if (!t)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(t) && t.length === 1 && (t = t[0]), !Array.isArray(t)) {
    const { leafVersion: a, script: u } = t;
    if (t.tapLeafScript || t.tapMerkleRoot && !ut(t.tapMerkleRoot, et))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? j.decode(u) : u;
    if (!X(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return Qd(l, e, n), {
      type: "leaf",
      version: a,
      script: l,
      hash: Fn(l, a)
    };
  }
  if (t.length !== 2 && (t = gu(t)), t.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = ko(t[0], e, n), o = ko(t[1], e, n);
  let [s, c] = [i.hash, o.hash];
  return Mr(c, s) === -1 && ([s, c] = [c, s]), { type: "branch", left: i, right: o, hash: ns("TapBranch", s, c) };
}
const Jr = 192, Fn = (t, e = Jr) => ns("TapLeaf", new Uint8Array([e]), Jt.encode(t));
function yu(t, e, n = Sn, r = !1, i) {
  if (!t && !e)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const o = typeof t == "string" ? j.decode(t) : t || rs;
  if (!un(o, $t.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  let s = e ? To(ko(e, o, r)) : void 0;
  const c = s ? s.hash : void 0, [a, u] = Ba(o, c || et);
  let l;
  s && (l = Io(s).map((h) => ({
    ...h,
    controlBlock: Re.encode({
      version: (h.version || Jr) + u,
      internalKey: o,
      merklePath: h.path
    })
  })));
  let f;
  l && (f = l.map((h) => [
    Re.decode(h.controlBlock),
    Ce(h.script, new Uint8Array([h.version || Jr]))
  ]));
  const d = {
    type: "tr",
    script: St.encode({ type: "tr", pubkey: a }),
    address: Qn(n).encode({ type: "tr", pubkey: a }),
    // For tests
    tweakedPubkey: a,
    // PSBT stuff
    tapInternalKey: o
  };
  return l && (d.leaves = l), f && (d.tapLeafScript = f), c && (d.tapMerkleRoot = c), d;
}
function Jd(t, e, n = !1) {
  return n || Xd(e), {
    type: "tr_ms",
    script: St.encode({ type: "tr_ms", pubkeys: e, m: t })
  };
}
const mu = Df(Lt);
function Eu(t, e) {
  if (e.length < 2 || e.length > 40)
    throw new Error("Witness: invalid length");
  if (t > 16)
    throw new Error("Witness: invalid version");
  if (t === 0 && !(e.length === 20 || e.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Wi(t, e, n = Sn) {
  Eu(t, e);
  const r = t === 0 ? so : ya;
  return r.encode(n.bech32, [t].concat(r.toWords(e)));
}
function Cc(t, e) {
  return mu.encode(Ce(Uint8Array.from(e), t));
}
function Qn(t = Sn) {
  return {
    encode(e) {
      const { type: n } = e;
      if (n === "wpkh")
        return Wi(0, e.hash, t);
      if (n === "wsh")
        return Wi(0, e.hash, t);
      if (n === "tr")
        return Wi(1, e.pubkey, t);
      if (n === "pkh")
        return Cc(e.hash, [t.pubKeyHash]);
      if (n === "sh")
        return Cc(e.hash, [t.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(e) {
      if (e.length < 14 || e.length > 74)
        throw new Error("Invalid address length");
      if (t.bech32 && e.toLowerCase().startsWith(`${t.bech32}1`)) {
        let r;
        try {
          if (r = so.decode(e), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ya.decode(e), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== t.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...o] = r.words, s = so.fromWords(o);
        if (Eu(i, s), i === 0 && s.length === 32)
          return { type: "wsh", hash: s };
        if (i === 0 && s.length === 20)
          return { type: "wpkh", hash: s };
        if (i === 1 && s.length === 32)
          return { type: "tr", pubkey: s };
        throw new Error("Unknown witness program");
      }
      const n = mu.decode(e);
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
class Q extends Error {
  constructor(e) {
    super(e), this.name = "TxTreeError";
  }
}
const th = new Q("leaf not found in tx tree"), eh = new Q("parent not found");
class nh {
  constructor(e) {
    this.tree = e;
  }
  get levels() {
    return this.tree;
  }
  // Returns the root node of the vtxo tree
  root() {
    if (this.tree.length <= 0 || this.tree[0].length <= 0)
      throw new Q("empty vtxo tree");
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
      throw th;
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
    throw eh;
  }
  // Validates that the tree is coherent by checking txids and parent relationships
  validate() {
    for (let e = 1; e < this.tree.length; e++)
      for (const n of this.tree[e]) {
        const r = ot.fromPSBT(Ut.decode(n.tx)), i = K.encode(Gt(r.toBytes(!0)).reverse());
        if (i !== n.txid)
          throw new Q(`node ${n.txid} has txid ${n.txid}, but computed txid is ${i}`);
        try {
          this.findParent(n);
        } catch (o) {
          throw new Q(`node ${n.txid} has no parent: ${o instanceof Error ? o.message : String(o)}`);
        }
      }
  }
}
const Yi = new Uint8Array("cosigner".split("").map((t) => t.charCodeAt(0)));
new Uint8Array("expiry".split("").map((t) => t.charCodeAt(0)));
function rh(t) {
  if (t.length < Yi.length)
    return !1;
  for (let e = 0; e < Yi.length; e++)
    if (t[e] !== Yi[e])
      return !1;
  return !0;
}
function bu(t) {
  const e = [], n = t.getInput(0);
  if (!n.unknown)
    return e;
  for (const r of n.unknown)
    rh(new Uint8Array([r[0].type, ...r[0].key])) && e.push(r[1]);
  return e;
}
const ji = new Error("missing vtxo tree");
class Jn {
  constructor(e) {
    this.secretKey = e, this.myNonces = null, this.aggregateNonces = null, this.tree = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const e = Ia();
    return new Jn(e);
  }
  init(e, n, r) {
    this.tree = e, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  getPublicKey() {
    return jn.getPublicKey(this.secretKey);
  }
  getNonces() {
    if (!this.tree)
      throw ji;
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
      throw ji;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const e = [];
    for (let n = 0; n < this.tree.levels.length; n++) {
      const r = [], i = this.tree.levels[n];
      for (let o = 0; o < i.length; o++) {
        const s = i[o], c = ot.fromPSBT(Ut.decode(s.tx)), a = this.signPartial(c, n, o);
        a ? r.push(a) : r.push(null);
      }
      e.push(r);
    }
    return e;
  }
  generateNonces() {
    if (!this.tree)
      throw ji;
    const e = [], n = jn.getPublicKey(this.secretKey);
    for (const r of this.tree.levels) {
      const i = [];
      for (let o = 0; o < r.length; o++) {
        const s = wl(n);
        i.push(s);
      }
      e.push(i);
    }
    return e;
  }
  signPartial(e, n, r) {
    if (!this.tree || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw Jn.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const i = this.myNonces[n][r];
    if (!i)
      return null;
    const o = this.aggregateNonces[n][r];
    if (!o)
      throw new Error("missing aggregate nonce");
    const s = [], c = [], a = bu(e), { finalKey: u } = ms(a, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let f = 0; f < e.inputsLength; f++) {
      const d = ih(u, this.tree, this.rootSharedOutputAmount, e);
      s.push(d.amount), c.push(d.script);
    }
    const l = e.preimageWitnessV1(
      0,
      // always first input
      c,
      Xn.DEFAULT,
      s
    );
    return yd(i.secNonce, this.secretKey, o.pubNonce, a, l, {
      taprootTweak: this.scriptRoot
    });
  }
}
Jn.NOT_INITIALIZED = new Error("session not initialized, call init method");
function ih(t, e, n, r) {
  const i = D.encode(["OP_1", t.slice(1)]), o = e.levels[0][0];
  if (!o)
    throw new Error("empty vtxo tree");
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing input txid");
  const c = K.encode(s.txid);
  if (o.parentTxid === c)
    return {
      amount: n,
      script: i
    };
  let a = null;
  for (const f of e.levels) {
    for (const d of f)
      if (d.txid === c) {
        a = d;
        break;
      }
    if (a)
      break;
  }
  if (!a)
    throw new Error("parent tx not found");
  const u = ot.fromPSBT(Ut.decode(a.tx));
  if (!s.index)
    throw new Error("missing input index");
  const l = u.getOutput(s.index);
  if (!l)
    throw new Error("parent output not found");
  if (!l.amount)
    throw new Error("parent output amount not found");
  return {
    amount: l.amount,
    script: i
  };
}
const Lc = new Uint8Array(32).fill(0);
class ti {
  constructor(e) {
    this.key = e || Ia();
  }
  static fromPrivateKey(e) {
    return new ti(e);
  }
  static fromHex(e) {
    return new ti(K.decode(e));
  }
  async sign(e, n) {
    const r = e.clone();
    if (!n) {
      if (!r.sign(this.key, void 0, Lc))
        throw new Error("Failed to sign transaction");
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, void 0, Lc))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  xOnlyPublicKey() {
    return es(this.key);
  }
  signerSession() {
    return Jn.random();
  }
}
class pr {
  constructor(e, n, r) {
    if (this.serverPubKey = e, this.tweakedPubKey = n, this.hrp = r, e.length !== 32)
      throw new Error("Invalid server public key length");
    if (n.length !== 32)
      throw new Error("Invalid tweaked public key length");
  }
  static decode(e) {
    const n = Er.decodeUnsafe(e, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(Er.fromWords(n.words));
    if (r.length !== 64)
      throw new Error("Invalid data length");
    const i = r.slice(0, 32), o = r.slice(32, 64);
    return new pr(i, o, n.prefix);
  }
  encode() {
    const e = new Uint8Array(64);
    e.set(this.serverPubKey, 0), e.set(this.tweakedPubKey, 32);
    const n = Er.toWords(e);
    return Er.encode(this.hrp, n, 1023);
  }
  get pkScript() {
    return D.encode(["OP_1", this.tweakedPubKey]);
  }
}
var lt;
(function(t) {
  t.Multisig = "multisig", t.CSVMultisig = "csv-multisig", t.ConditionCSVMultisig = "condition-csv-multisig", t.ConditionMultisig = "condition-multisig", t.CLTVMultisig = "cltv-multisig";
})(lt || (lt = {}));
function Su(t) {
  const e = [
    ie,
    Ie,
    ei,
    ni,
    tr
  ];
  for (const n of e)
    try {
      return n.decode(t);
    } catch {
      continue;
    }
  throw new Error("Failed to decode: script is not a valid tapscript");
}
var ie;
(function(t) {
  let e;
  (function(c) {
    c[c.CHECKSIG = 0] = "CHECKSIG", c[c.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(e = t.MultisigType || (t.MultisigType = {}));
  function n(c) {
    if (c.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of c.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (c.type || (c.type = e.CHECKSIG), c.type === e.CHECKSIGADD)
      return {
        type: lt.Multisig,
        params: c,
        script: Jd(c.pubkeys.length, c.pubkeys).script,
        witnessSize: () => c.pubkeys.length * 64
      };
    const a = [];
    for (let u = 0; u < c.pubkeys.length; u++)
      a.push(c.pubkeys[u]), u < c.pubkeys.length - 1 ? a.push("CHECKSIGVERIFY") : a.push("CHECKSIG");
    return {
      type: lt.Multisig,
      params: c,
      script: D.encode(a),
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
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  t.decode = r;
  function i(c) {
    const a = D.decode(c), u = [];
    let l = !1;
    for (let d = 0; d < a.length; d++) {
      const h = a[d];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), d + 1 >= a.length || a[d + 1] !== "CHECKSIGADD" && a[d + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        d++;
        continue;
      }
      if (d === a.length - 1) {
        if (h !== "NUMEQUAL")
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
      type: e.CHECKSIGADD
    });
    if (Buffer.compare(f.script, c) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.Multisig,
      params: { pubkeys: u, type: e.CHECKSIGADD },
      script: c,
      witnessSize: () => u.length * 64
    };
  }
  function o(c) {
    const a = D.decode(c), u = [];
    for (let f = 0; f < a.length; f++) {
      const d = a[f];
      if (typeof d != "string" && typeof d != "number") {
        if (d.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${d.length}`);
        if (u.push(d), f + 1 >= a.length)
          throw new Error("Unexpected end of script");
        const h = a[f + 1];
        if (h !== "CHECKSIGVERIFY" && h !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (f === a.length - 2 && h !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        f++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({ pubkeys: u, type: e.CHECKSIG });
    if (Buffer.compare(l.script, c) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.Multisig,
      params: { pubkeys: u, type: e.CHECKSIG },
      script: c,
      witnessSize: () => u.length * 64
    };
  }
  function s(c) {
    return c.type === lt.Multisig;
  }
  t.is = s;
})(ie || (ie = {}));
var Ie;
(function(t) {
  function e(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = [Bn().encode(BigInt(bc.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), "CHECKSEQUENCEVERIFY", "DROP"], c = ie.encode(i), a = new Uint8Array([
      ...D.encode(s),
      ...c.script
    ]);
    return {
      type: lt.CSVMultisig,
      params: i,
      script: a,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = D.decode(i);
    if (o.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = o[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected sequence number");
    if (o[1] !== "CHECKSEQUENCEVERIFY" || o[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const c = new Uint8Array(D.encode(o.slice(3)));
    let a;
    try {
      a = ie.decode(c);
    } catch (h) {
      throw new Error(`Invalid multisig script: ${h instanceof Error ? h.message : String(h)}`);
    }
    const u = Number(Bn().decode(s)), l = bc.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, d = e({
      timelock: f,
      ...a.params
    });
    if (Buffer.compare(d.script, i) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.CSVMultisig,
      params: {
        timelock: f,
        ...a.params
      },
      script: i,
      witnessSize: () => a.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === lt.CSVMultisig;
  }
  t.is = r;
})(Ie || (Ie = {}));
var ei;
(function(t) {
  function e(i) {
    const o = new Uint8Array([
      ...i.conditionScript,
      ...D.encode(["VERIFY"]),
      ...Ie.encode(i).script
    ]);
    return {
      type: lt.ConditionCSVMultisig,
      params: i,
      script: o,
      witnessSize: (s) => s + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = D.decode(i);
    if (o.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let f = o.length - 1; f >= 0; f--)
      o[f] === "VERIFY" && (s = f);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(o.slice(0, s))), a = new Uint8Array(D.encode(o.slice(s + 1)));
    let u;
    try {
      u = Ie.decode(a);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = e({
      conditionScript: c,
      ...u.params
    });
    if (Buffer.compare(l.script, i) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.ConditionCSVMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: i,
      witnessSize: (f) => f + u.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === lt.ConditionCSVMultisig;
  }
  t.is = r;
})(ei || (ei = {}));
var ni;
(function(t) {
  function e(i) {
    const o = new Uint8Array([
      ...i.conditionScript,
      ...D.encode(["VERIFY"]),
      ...ie.encode(i).script
    ]);
    return {
      type: lt.ConditionMultisig,
      params: i,
      script: o,
      witnessSize: (s) => s + i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = D.decode(i);
    if (o.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let s = -1;
    for (let f = o.length - 1; f >= 0; f--)
      o[f] === "VERIFY" && (s = f);
    if (s === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const c = new Uint8Array(D.encode(o.slice(0, s))), a = new Uint8Array(D.encode(o.slice(s + 1)));
    let u;
    try {
      u = ie.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = e({
      conditionScript: c,
      ...u.params
    });
    if (Buffer.compare(l.script, i) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.ConditionMultisig,
      params: {
        conditionScript: c,
        ...u.params
      },
      script: i,
      witnessSize: (f) => f + u.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === lt.ConditionMultisig;
  }
  t.is = r;
})(ni || (ni = {}));
var tr;
(function(t) {
  function e(i) {
    const s = [Bn().encode(i.absoluteTimelock), "CHECKLOCKTIMEVERIFY", "DROP"], c = D.encode(s), a = new Uint8Array([
      ...c,
      ...ie.encode(i).script
    ]);
    return {
      type: lt.CLTVMultisig,
      params: i,
      script: a,
      witnessSize: () => i.pubkeys.length * 64
    };
  }
  t.encode = e;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const o = D.decode(i);
    if (o.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const s = o[0];
    if (typeof s == "string" || typeof s == "number")
      throw new Error("Invalid script: expected locktime number");
    if (o[1] !== "CHECKLOCKTIMEVERIFY" || o[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const c = new Uint8Array(D.encode(o.slice(3)));
    let a;
    try {
      a = ie.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = Bn().decode(s), l = e({
      absoluteTimelock: u,
      ...a.params
    });
    if (Buffer.compare(l.script, i) !== 0)
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: lt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...a.params
      },
      script: i,
      witnessSize: () => a.params.pubkeys.length * 64
    };
  }
  t.decode = n;
  function r(i) {
    return i.type === lt.CLTVMultisig;
  }
  t.is = r;
})(tr || (tr = {}));
function Is(t) {
  return t[1].subarray(0, t[1].length - 1);
}
class Un {
  static decode(e) {
    return new Un(e.map(K.decode));
  }
  constructor(e) {
    this.scripts = e;
    const n = gu(e.map((i) => ({ script: i, leafVersion: Jr }))), r = yu(rs, n, void 0, !0);
    if (!r.tapLeafScript || r.tapLeafScript.length !== e.length)
      throw new Error("invalid scripts");
    this.leaves = r.tapLeafScript, this.tweakedPublicKey = r.tweakedPubkey;
  }
  encode() {
    return this.scripts.map(K.encode);
  }
  address(e, n) {
    return new pr(n, this.tweakedPublicKey, e);
  }
  get pkScript() {
    return D.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(e) {
    return Qn(e).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(e) {
    const n = this.leaves.find((r) => K.encode(Is(r)) === e);
    if (!n)
      throw new Error(`leaf '${e}' not found`);
    return n;
  }
}
var Rc;
(function(t) {
  class e extends Un {
    constructor(r) {
      const { sender: i, receiver: o, server: s, preimageHash: c, refundLocktime: a, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: f } = r, d = oh(c), h = ni.encode({
        conditionScript: d,
        pubkeys: [o, s]
      }).script, y = ie.encode({
        pubkeys: [i, o, s]
      }).script, w = tr.encode({
        absoluteTimelock: a,
        pubkeys: [i, s]
      }).script, p = ei.encode({
        conditionScript: d,
        timelock: u,
        pubkeys: [o]
      }).script, g = Ie.encode({
        timelock: l,
        pubkeys: [i, o]
      }).script, m = Ie.encode({
        timelock: f,
        pubkeys: [i]
      }).script;
      super([
        h,
        y,
        w,
        p,
        g,
        m
      ]), this.options = r, this.claimScript = K.encode(h), this.refundScript = K.encode(y), this.refundWithoutReceiverScript = K.encode(w), this.unilateralClaimScript = K.encode(p), this.unilateralRefundScript = K.encode(g), this.unilateralRefundWithoutReceiverScript = K.encode(m);
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
})(Rc || (Rc = {}));
function oh(t) {
  return D.encode(["HASH160", t, "EQUAL"]);
}
var er;
(function(t) {
  class e extends Un {
    constructor(r) {
      const { pubKey: i, serverPubKey: o, csvTimelock: s = e.DEFAULT_TIMELOCK } = r, c = ie.encode({
        pubkeys: [i, o]
      }).script, a = Ie.encode({
        timelock: s,
        pubkeys: [i]
      }).script;
      super([c, a]), this.options = r, this.forfeitScript = K.encode(c), this.exitScript = K.encode(a);
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
})(er || (er = {}));
var nr;
(function(t) {
  t.TxSent = "SENT", t.TxReceived = "RECEIVED";
})(nr || (nr = {}));
function sh(t, e) {
  return e.virtualStatus.state === "pending" ? [] : t.filter((n) => n.spentBy ? n.spentBy === e.virtualStatus.batchTxID : !1);
}
function ch(t, e) {
  return t.filter((n) => n.spentBy ? n.spentBy === e.txid : !1);
}
function ah(t, e) {
  return t.filter((n) => n.virtualStatus.state !== "pending" && n.virtualStatus.batchTxID === e ? !0 : n.txid === e);
}
function Ar(t) {
  return t.reduce((e, n) => e + n.value, 0);
}
function uh(t, e) {
  return t.length === 0 ? e[0] : t[0];
}
function xu(t, e, n) {
  const r = [];
  let i = [...e];
  for (const s of [...t, ...e]) {
    if (s.virtualStatus.state !== "pending" && n.has(s.virtualStatus.batchTxID || ""))
      continue;
    const c = sh(i, s);
    i = _c(i, c);
    const a = Ar(c);
    if (s.value <= a)
      continue;
    const u = ch(i, s);
    i = _c(i, u);
    const l = Ar(u);
    if (s.value <= l)
      continue;
    const f = {
      roundTxid: s.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    let d = s.virtualStatus.state !== "pending";
    s.virtualStatus.state === "pending" && (f.redeemTxid = s.txid, s.spentBy && (d = !0)), r.push({
      key: f,
      amount: s.value - a - l,
      type: nr.TxReceived,
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
    const a = ah([...t, ...e], s), u = Ar(a), l = Ar(c);
    if (l <= u)
      continue;
    const f = uh(a, c), d = {
      roundTxid: f.virtualStatus.batchTxID || "",
      boardingTxid: "",
      redeemTxid: ""
    };
    f.virtualStatus.state === "pending" && (d.redeemTxid = f.txid), r.push({
      key: d,
      amount: l - u,
      type: nr.TxSent,
      createdAt: f.createdAt.getTime(),
      settled: !0
    });
  }
  return r;
}
function _c(t, e) {
  return t.filter((n) => {
    for (const r of e)
      if (n.txid === r.txid && n.vout === r.vout)
        return !1;
    return !0;
  });
}
var Bo;
(function(t) {
  t.INVALID_URI = "Invalid BIP21 URI", t.INVALID_ADDRESS = "Invalid address";
})(Bo || (Bo = {}));
class Oc {
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
      throw new Error(Bo.INVALID_URI);
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
function fh(t, e) {
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
function lh(t, e) {
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
const dh = (t) => hh[t], hh = {
  bitcoin: On(Sn, "ark"),
  testnet: On(mr, "tark"),
  signet: On(mr, "tark"),
  mutinynet: On(mr, "tark"),
  regtest: On({
    ...mr,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function On(t, e) {
  return {
    ...t,
    hrp: e
  };
}
const ph = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class wh {
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
var vt;
(function(t) {
  t.Finalization = "finalization", t.Finalized = "finalized", t.Failed = "failed", t.SigningStart = "signing_start", t.SigningNoncesGenerated = "signing_nonces_generated";
})(vt || (vt = {}));
class vu {
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
      spendableVtxos: [...i.spendableVtxos || []].map(Tr),
      spentVtxos: [...i.spentVtxos || []].map(Tr)
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
            const l = c.split(`
`);
            for (let f = 0; f < l.length - 1; f++) {
              const d = l[f].trim();
              if (d)
                try {
                  const h = JSON.parse(d);
                  e(h);
                } catch (h) {
                  console.error("Failed to parse event:", h);
                }
            }
            c = l[l.length - 1];
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
        treeNonces: mh(r)
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
        treeSignatures: Eh(r)
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
        let s = "";
        for (; !(e != null && e.aborted); ) {
          const { done: c, value: a } = await i.read();
          if (c)
            break;
          s += o.decode(a, { stream: !0 });
          const u = s.split(`
`);
          for (let l = 0; l < u.length - 1; l++) {
            const f = u[l].trim();
            if (f)
              try {
                const d = JSON.parse(f), h = this.parseSettlementEvent(d.result);
                h && (yield h);
              } catch (d) {
                throw console.error("Failed to parse event:", d), d;
              }
          }
          s = u[u.length - 1];
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
        const o = i.body.getReader(), s = new TextDecoder();
        let c = "";
        for (; !n.aborted; ) {
          const { done: a, value: u } = await o.read();
          if (a)
            break;
          c += s.decode(u, { stream: !0 });
          const l = c.split(`
`);
          for (let f = 0; f < l.length - 1; f++) {
            const d = l[f].trim();
            if (d)
              try {
                const h = JSON.parse(d);
                "result" in h && (yield {
                  newVtxos: (h.result.newVtxos || []).map(Tr),
                  spentVtxos: (h.result.spentVtxos || []).map(Tr)
                });
              } catch (h) {
                throw console.error("Failed to parse address update:", h), h;
              }
          }
          c = l[l.length - 1];
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
    })), new nh(e.levels.map((r) => r.nodes.map((i) => ({
      txid: i.txid,
      tx: i.tx,
      parentTxid: i.parentTxid,
      leaf: !n.has(i.txid)
    }))));
  }
  parseSettlementEvent(e) {
    return e.roundFinalization ? {
      type: vt.Finalization,
      id: e.roundFinalization.id,
      roundTx: e.roundFinalization.roundTx,
      vtxoTree: this.toTxTree(e.roundFinalization.vtxoTree),
      connectors: this.toTxTree(e.roundFinalization.connectors),
      connectorsIndex: this.toConnectorsIndex(e.roundFinalization.connectorsIndex),
      // divide by 1000 to convert to sat/vbyte
      minRelayFeeRate: BigInt(e.roundFinalization.minRelayFeeRate) / BigInt(1e3)
    } : e.roundFinalized ? {
      type: vt.Finalized,
      id: e.roundFinalized.id,
      roundTxid: e.roundFinalized.roundTxid
    } : e.roundFailed ? {
      type: vt.Failed,
      id: e.roundFailed.id,
      reason: e.roundFailed.reason
    } : e.roundSigning ? {
      type: vt.SigningStart,
      id: e.roundSigning.id,
      cosignersPublicKeys: e.roundSigning.cosignersPubkeys,
      unsignedVtxoTree: this.toTxTree(e.roundSigning.unsignedVtxoTree),
      unsignedSettlementTx: e.roundSigning.unsignedRoundTx
    } : e.roundSigningNoncesGenerated ? {
      type: vt.SigningNoncesGenerated,
      id: e.roundSigningNoncesGenerated.id,
      treeNonces: yh(K.decode(e.roundSigningNoncesGenerated.treeNonces))
    } : (console.warn("Unknown event structure:", e), null);
  }
}
function Au(t) {
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
function gh(t, e) {
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
      const l = n.getUint8(r) === 1;
      if (r += 1, l) {
        const f = new Uint8Array(t.buffer, t.byteOffset + r, e);
        a.push(new Uint8Array(f)), r += e;
      } else
        a.push(new Uint8Array());
    }
    o.push(a);
  }
  return o;
}
function yh(t) {
  return gh(t, 66).map((n) => n.map((r) => ({ pubNonce: r })));
}
function mh(t) {
  return K.encode(Au(t.map((e) => e.map((n) => n ? n.pubNonce : new Uint8Array()))));
}
function Eh(t) {
  return K.encode(Au(t.map((e) => e.map((n) => n ? n.encode() : new Uint8Array()))));
}
function Tr(t) {
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
function bh({ connectorInput: t, vtxoInput: e, vtxoAmount: n, connectorAmount: r, feeAmount: i, vtxoPkScript: o, connectorPkScript: s, serverPkScript: c, txLocktime: a }) {
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
    sighashType: Xn.DEFAULT
  });
  const l = BigInt(n) + BigInt(r) - BigInt(i);
  return u.addOutput({
    script: c,
    amount: l
  }), u;
}
class nt {
  constructor(e, n, r, i, o, s) {
    this.hasWitness = e, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = o, this.outputSize = s;
  }
  static create() {
    return new nt(!1, 0, 0, 0, 0, 0);
  }
  addKeySpendInput(e = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (e ? 0 : 1), this.inputSize += nt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += nt.INPUT_SIZE + nt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(e, n, r) {
    const i = 1 + nt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += e + i, this.inputSize += nt.INPUT_SIZE, this.hasWitness = !0, this.inputCount++, this;
  }
  addP2WKHOutput() {
    return this.outputCount++, this.outputSize += nt.OUTPUT_SIZE + nt.P2WKH_OUTPUT_SIZE, this;
  }
  vsize() {
    const e = (s) => s < 253 ? 1 : s < 65535 ? 3 : s < 4294967295 ? 5 : 9, n = e(this.inputCount), r = e(this.outputCount);
    let o = (nt.BASE_TX_SIZE + n + this.inputSize + r + this.outputSize) * nt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (o += nt.WITNESS_HEADER_SIZE + this.inputWitnessSize), Sh(o);
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
const Sh = (t) => {
  const e = BigInt(Math.ceil(t / nt.WITNESS_SCALE_FACTOR));
  return {
    value: e,
    fee: (n) => n * e
  };
}, xh = new Q("invalid settlement transaction"), No = new Q("invalid settlement transaction outputs"), Tu = new Q("empty tree"), vh = new Q("invalid root level"), ks = new Q("invalid number of inputs"), Kn = new Q("wrong settlement txid"), Uo = new Q("invalid amount"), Ah = new Q("no leaves"), Th = new Q("node transaction empty"), Ih = new Q("node txid empty"), kh = new Q("node parent txid empty"), Bh = new Q("node txid different"), Pc = new Q("parent txid input mismatch"), Nh = new Q("leaf node has children"), Hc = new Q("invalid taproot script"), Uh = new Q("invalid internal key");
new Q("invalid control block");
const $h = new Q("invalid root transaction"), Ch = new Q("invalid node transaction"), Zi = 0, Vc = 1;
function Lh(t, e) {
  e.validate();
  const n = e.root();
  if (!n)
    throw Tu;
  const r = ot.fromPSBT(Ut.decode(n.tx));
  if (r.inputsLength !== 1)
    throw ks;
  const i = r.getInput(0), o = ot.fromPSBT(Ut.decode(t));
  if (o.outputsLength <= Vc)
    throw No;
  const s = K.encode(Gt(o.toBytes(!0)).reverse());
  if (!i.txid || K.encode(i.txid) !== s || i.index !== Vc)
    throw Kn;
}
function Rh(t, e, n) {
  e.validate();
  let r;
  try {
    r = ot.fromPSBT(Ut.decode(t));
  } catch {
    throw xh;
  }
  if (r.outputsLength <= Zi)
    throw No;
  const i = r.getOutput(Zi);
  if (!(i != null && i.amount))
    throw No;
  const o = i.amount;
  if (e.numberOfNodes() === 0)
    throw Tu;
  if (e.levels[0].length !== 1)
    throw vh;
  const c = e.levels[0][0];
  let a;
  try {
    a = ot.fromPSBT(Ut.decode(c.tx));
  } catch {
    throw $h;
  }
  if (a.inputsLength !== 1)
    throw ks;
  const u = a.getInput(0);
  if (!u.txid || u.index === void 0)
    throw Kn;
  const l = K.encode(Gt(r.toBytes(!0)).reverse());
  if (K.encode(u.txid) !== l || u.index !== Zi)
    throw Kn;
  let f = 0n;
  for (let d = 0; d < a.outputsLength; d++) {
    const h = a.getOutput(d);
    h != null && h.amount && (f += h.amount);
  }
  if (f >= o)
    throw Uo;
  if (e.leaves().length === 0)
    throw Ah;
  for (const d of e.levels)
    for (const h of d)
      _h(e, h, n);
}
function _h(t, e, n) {
  if (!e.tx)
    throw Th;
  if (!e.txid)
    throw Ih;
  if (!e.parentTxid)
    throw kh;
  let r;
  try {
    r = ot.fromPSBT(Ut.decode(e.tx));
  } catch {
    throw Ch;
  }
  if (K.encode(Gt(r.toBytes(!0)).reverse()) !== e.txid)
    throw Bh;
  if (r.inputsLength !== 1)
    throw ks;
  const o = r.getInput(0);
  if (!o.txid || K.encode(o.txid) !== e.parentTxid)
    throw Pc;
  const s = t.children(e.txid);
  if (e.leaf && s.length >= 1)
    throw Nh;
  for (let c = 0; c < s.length; c++) {
    const a = s[c], u = ot.fromPSBT(Ut.decode(a.tx)), l = r.getOutput(c);
    if (!(l != null && l.script))
      throw Hc;
    const f = l.script.slice(2);
    if (f.length !== 32)
      throw Hc;
    const d = bu(u), { finalKey: h } = ms(d, !0, {
      taprootTweak: n
    });
    if (K.encode(h) !== K.encode(f.slice(2)))
      throw Uh;
    let y = 0n;
    for (let w = 0; w < u.outputsLength; w++) {
      const p = u.getOutput(w);
      p != null && p.amount && (y += p.amount);
    }
    if (!l.amount || y >= l.amount)
      throw Uo;
  }
}
const Oh = 255;
new TextEncoder().encode("condition");
const Ph = new TextEncoder().encode("taptree");
function Hh(t, e, n) {
  var r;
  e.updateInput(t, {
    unknown: [
      ...((r = e.getInput(t)) == null ? void 0 : r.unknown) ?? [],
      [
        {
          type: Oh,
          key: Ph
        },
        Mh(n)
      ]
    ]
  });
}
function Vh(t, e) {
  let n;
  for (const i of t) {
    const o = Su(Is(i.tapLeafScript));
    tr.is(o) && (n = Number(o.params.absoluteTimelock));
  }
  const r = new ot({
    allowUnknown: !0,
    lockTime: n
  });
  for (const [i, o] of t.entries())
    r.addInput({
      txid: o.txid,
      index: o.vout,
      sequence: n ? Ss - 1 : void 0,
      witnessUtxo: {
        script: Un.decode(o.scripts).pkScript,
        amount: BigInt(o.value)
      },
      tapLeafScript: [o.tapLeafScript]
    }), Hh(i, r, o.scripts.map(K.decode));
  for (const i of e)
    r.addOutput({
      amount: i.amount,
      script: pr.decode(i.address).pkScript
    });
  return r;
}
function Mh(t) {
  const e = [];
  e.push(Mc(t.length));
  for (const o of t)
    e.push(new Uint8Array([1])), e.push(new Uint8Array([192])), e.push(Mc(o.length)), e.push(o);
  const n = e.reduce((o, s) => o + s.length, 0), r = new Uint8Array(n);
  let i = 0;
  for (const o of e)
    r.set(o, i), i += o.length;
  return r;
}
function Mc(t) {
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
class Bs {
  constructor(e, n) {
    this.id = e, this.value = n;
  }
  encode() {
    const e = new Uint8Array(12);
    return Dh(e, this.id, 0), Kh(e, this.value, 8), e;
  }
  static decode(e) {
    if (e.length !== 12)
      throw new Error(`invalid data length: expected 12 bytes, got ${e.length}`);
    const n = Fh(e, 0), r = qh(e, 8);
    return new Bs(n, r);
  }
}
class be {
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
    const n = Bs.decode(e.subarray(0, 12)), r = e.subarray(12);
    if (r.length !== 64)
      throw new Error(`invalid signature length: expected 64 bytes, got ${r.length}`);
    return new be(n, r);
  }
  static fromString(e) {
    if (!e.startsWith(be.HRP))
      throw new Error(`invalid human-readable part: expected ${be.HRP} prefix (note '${e}')`);
    const n = e.slice(be.HRP.length);
    if (n.length < 103 || n.length > 104)
      throw new Error(`invalid note length: expected 103 or 104 chars, got ${n.length}`);
    const r = js.decode(n);
    if (r.length === 0)
      throw new Error("failed to decode base58 string");
    return be.decode(new Uint8Array(r));
  }
  toString() {
    return be.HRP + js.encode(this.encode());
  }
}
be.HRP = "arknote";
function Dh(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 8).setBigUint64(0, e, !1);
}
function Fh(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 8).getBigUint64(0, !1);
}
function Kh(t, e, n) {
  new DataView(t.buffer, t.byteOffset + n, 4).setUint32(0, e, !1);
}
function qh(t, e) {
  return new DataView(t.buffer, t.byteOffset + e, 4).getUint32(0, !1);
}
class ve {
  constructor(e, n, r, i, o, s, c, a) {
    this.identity = e, this.network = n, this.onchainProvider = r, this.onchainP2TR = i, this.arkProvider = o, this.arkServerPublicKey = s, this.offchainTapscript = c, this.boardingTapscript = a;
  }
  static async create(e) {
    const n = dh(e.network), r = new wh(e.esploraUrl || ph[e.network]), i = e.identity.xOnlyPublicKey();
    if (!i)
      throw new Error("Invalid configured public key");
    let o;
    e.arkServerUrl && (o = new vu(e.arkServerUrl));
    const s = yu(i, void 0, n);
    if (o) {
      let c = e.arkServerPublicKey, a = e.boardingTimelock;
      if (!c || !a) {
        const h = await o.getInfo();
        c = h.pubkey, a = {
          value: h.unilateralExitDelay * 2n,
          type: h.unilateralExitDelay * 2n < 512n ? "blocks" : "seconds"
        };
      }
      const u = K.decode(c).slice(1), l = new er.Script({
        pubKey: i,
        serverPubKey: u,
        csvTimelock: a
      }), f = new er.Script({
        pubKey: i,
        serverPubKey: u,
        csvTimelock: a
      }), d = l;
      return new ve(e.identity, n, r, s, o, u, d, f);
    }
    return new ve(e.identity, n, r, s);
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
      bip21: Oc.create({
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
      }, e.bip21 = Oc.create({
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
    const e = await this.getCoins(), n = e.filter((u) => u.status.confirmed).reduce((u, l) => u + l.value, 0), r = e.filter((u) => !u.status.confirmed).reduce((u, l) => u + l.value, 0), i = n + r;
    let o = 0, s = 0, c = 0;
    if (this.arkProvider) {
      const u = await this.getVirtualCoins();
      o = u.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), s = u.filter((l) => l.virtualStatus.state === "pending").reduce((l, f) => l + f.value, 0), c = u.filter((l) => l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
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
    const { spendableVtxos: e, spentVtxos: n } = await this.arkProvider.getVirtualCoins(this.offchainAddress.encode()), { boardingTxs: r, roundsToIgnore: i } = await this.getBoardingTxs(), o = xu(e, n, i), s = [...r, ...o];
    return s.sort(
      // place createdAt = 0 (unconfirmed txs) first, then descending
      (c, a) => c.createdAt === 0 ? -1 : a.createdAt === 0 ? 1 : a.createdAt - c.createdAt
    ), s;
  }
  async getBoardingTxs() {
    if (!this.boardingAddress)
      return { boardingTxs: [], roundsToIgnore: /* @__PURE__ */ new Set() };
    const e = this.boardingOnchainAddress, n = await this.onchainProvider.getTransactions(e), r = [], i = /* @__PURE__ */ new Set();
    for (const c of n)
      for (let a = 0; a < c.vout.length; a++) {
        const u = c.vout[a];
        if (u.scriptpubkey_address === e) {
          const f = (await this.onchainProvider.getTxOutspends(c.txid))[a];
          f != null && f.spent && i.add(f.txid), r.push({
            txid: c.txid,
            vout: a,
            value: Number(u.value),
            status: {
              confirmed: c.status.confirmed,
              block_time: c.status.block_time
            },
            virtualStatus: {
              state: f != null && f.spent ? "swept" : "pending",
              batchTxID: f != null && f.spent ? f.txid : void 0
            },
            createdAt: c.status.confirmed ? new Date(c.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const o = [], s = [];
    for (const c of r) {
      const a = {
        key: {
          boardingTxid: c.txid,
          roundTxid: "",
          redeemTxid: ""
        },
        amount: c.value,
        type: nr.TxReceived,
        settled: c.virtualStatus.state === "swept",
        createdAt: c.status.block_time ? new Date(c.status.block_time * 1e3).getTime() : 0
      };
      c.status.block_time ? s.push(a) : o.push(a);
    }
    return {
      boardingTxs: [...o, ...s],
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
    if (e.amount < ve.DUST_AMOUNT)
      throw new Error("Amount is below dust limit");
    return this.arkProvider && this.isOffchainSuitable(e.address) ? this.sendOffchain(e, n) : this.sendOnchain(e);
  }
  isOffchainSuitable(e) {
    try {
      return pr.decode(e), !0;
    } catch {
      return !1;
    }
  }
  async sendOnchain(e) {
    const n = await this.getCoins(), r = e.feeRate || ve.FEE_RATE, i = Math.ceil(174 * r), o = e.amount + i, s = fh(n, o);
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
    if (!this.arkProvider || !this.offchainAddress || !this.offchainTapscript)
      throw new Error("wallet not initialized");
    const r = await this.getVirtualCoins(), i = n ? 0 : Math.ceil(174 * (e.feeRate || ve.FEE_RATE)), o = e.amount + i, s = lh(r, o);
    if (!s || !s.inputs)
      throw new Error("Insufficient funds");
    const c = this.offchainTapscript.forfeit();
    if (!c)
      throw new Error("Selected leaf not found");
    const a = [
      {
        address: e.address,
        amount: BigInt(e.amount)
      }
    ];
    s.changeAmount > 0 && a.push({
      address: this.offchainAddress.encode(),
      amount: BigInt(s.changeAmount)
    });
    let u = Vh(s.inputs.map((f) => ({
      ...f,
      tapLeafScript: c,
      scripts: this.offchainTapscript.encode()
    })), a);
    u = await this.identity.sign(u);
    const l = Ut.encode(u.toPSBT());
    return this.arkProvider.submitVirtualTx(l);
  }
  async settle(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    if (e != null && e.inputs) {
      for (const f of e.inputs)
        if (typeof f == "string")
          try {
            be.fromString(f);
          } catch {
            throw new Error(`Invalid arknote "${f}"`);
          }
    }
    if (!e) {
      if (!this.offchainAddress)
        throw new Error("Offchain address not configured");
      let f = 0;
      const d = await this.getBoardingUtxos();
      f += d.reduce((w, p) => w + p.value, 0);
      const h = await this.getVtxos();
      f += h.reduce((w, p) => w + p.value, 0);
      const y = [...d, ...h];
      if (y.length === 0)
        throw new Error("No inputs found");
      e = {
        inputs: y,
        outputs: [
          {
            address: this.offchainAddress.encode(),
            amount: BigInt(f)
          }
        ]
      };
    }
    const { requestId: r } = await this.arkProvider.registerInputsForNextRound(e.inputs.map((f) => typeof f == "string" ? f : {
      outpoint: f,
      tapscripts: f.scripts
    })), i = e.outputs.some((f) => this.isOffchainSuitable(f.address));
    let o;
    const s = [];
    i && (o = this.identity.signerSession(), s.push(K.encode(o.getPublicKey()))), await this.arkProvider.registerOutputsForNextRound(r, e.outputs, s);
    const c = setInterval(() => {
      var f;
      (f = this.arkProvider) == null || f.ping(r).catch(u);
    }, 1e3);
    let a = !0;
    const u = () => {
      a && (a = !1, clearInterval(c));
    }, l = new AbortController();
    try {
      const f = this.arkProvider.getEventStream(l.signal);
      let d;
      i || (d = vt.SigningNoncesGenerated);
      const h = await this.arkProvider.getInfo(), y = Ie.encode({
        timelock: {
          value: h.batchExpiry,
          type: h.batchExpiry >= 512n ? "seconds" : "blocks"
        },
        pubkeys: [K.decode(h.pubkey).slice(1)]
      }).script, w = Fn(y);
      for await (const p of f) {
        switch (n && n(p), p.type) {
          // the settlement failed
          case vt.Failed:
            if (d === void 0)
              continue;
            throw u(), new Error(p.reason);
          // the server has started the signing process of the vtxo tree transactions
          // the server expects the partial musig2 nonces for each tx
          case vt.SigningStart:
            if (d !== void 0)
              continue;
            if (u(), i) {
              if (!o)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningEvent(p, w, o);
            }
            break;
          // the musig2 nonces of the vtxo tree transactions are generated
          // the server expects now the partial musig2 signatures
          case vt.SigningNoncesGenerated:
            if (d !== vt.SigningStart)
              continue;
            if (u(), i) {
              if (!o)
                throw new Error("Signing session not found");
              await this.handleSettlementSigningNoncesGeneratedEvent(p, o);
            }
            break;
          // the vtxo tree is signed, craft, sign and submit forfeit transactions
          // if any boarding utxos are involved, the settlement tx is also signed
          case vt.Finalization:
            if (d !== vt.SigningNoncesGenerated)
              continue;
            u(), await this.handleSettlementFinalizationEvent(p, e.inputs, h);
            break;
          // the settlement is done, last event to be received
          case vt.Finalized:
            if (d !== vt.Finalization)
              continue;
            return l.abort(), p.roundTxid;
        }
        d = p.type;
      }
    } catch (f) {
      throw l.abort(), f;
    }
    throw new Error("Settlement failed");
  }
  // validates the vtxo tree, creates a signing session and generates the musig2 nonces
  async handleSettlementSigningEvent(e, n, r) {
    const i = e.unsignedVtxoTree;
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    Rh(e.unsignedSettlementTx, i, n);
    const o = Ut.decode(e.unsignedSettlementTx), c = ot.fromPSBT(o).getOutput(0);
    if (!(c != null && c.amount))
      throw new Error("Shared output not found");
    r.init(i, n, c.amount), await this.arkProvider.submitTreeNonces(e.id, K.encode(r.getPublicKey()), r.getNonces());
  }
  async handleSettlementSigningNoncesGeneratedEvent(e, n) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    n.setAggregatedNonces(e.treeNonces);
    const r = n.sign();
    await this.arkProvider.submitTreeSignatures(e.id, K.encode(n.getPublicKey()), r);
  }
  async handleSettlementFinalizationEvent(e, n, r) {
    if (!this.arkProvider)
      throw new Error("Ark provider not configured");
    const i = Qn(this.network).decode(r.forfeitAddress), o = St.encode(i), s = [], c = await this.getVirtualCoins();
    let a = ot.fromPSBT(Ut.decode(e.roundTx)), u = !1, l = !1;
    for (const f of n) {
      if (typeof f == "string")
        continue;
      const d = c.find((A) => A.txid === f.txid && A.vout === f.vout);
      if (!d) {
        u = !0;
        const A = [];
        for (let I = 0; I < a.inputsLength; I++) {
          const k = a.getInput(I);
          if (!k.txid || k.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          K.encode(k.txid) === f.txid && k.index === f.vout && (a.updateInput(I, {
            tapLeafScript: [f.tapLeafScript]
          }), A.push(I));
        }
        a = await this.identity.sign(a, A);
        continue;
      }
      l || (Lh(e.roundTx, e.connectors), l = !0);
      const h = Re.encode(f.tapLeafScript[0]), y = Su(Is(f.tapLeafScript)), w = nt.create().addKeySpendInput().addTapscriptInput(
        y.witnessSize(100),
        // TODO: handle conditional script
        f.tapLeafScript[1].length - 1,
        h.length
      ).addP2WKHOutput().vsize().fee(e.minRelayFeeRate), p = e.connectors.leaves(), g = e.connectorsIndex.get(`${d.txid}:${d.vout}`);
      if (!g)
        throw new Error("Connector outpoint not found");
      let m;
      for (const A of p)
        if (A.txid === g.txid)
          try {
            m = ot.fromPSBT(Ut.decode(A.tx)).getOutput(g.vout);
            break;
          } catch {
            throw new Error("Invalid connector tx");
          }
      if (!m || !m.amount || !m.script)
        throw new Error("Connector output not found");
      let E = bh({
        connectorInput: g,
        connectorAmount: m.amount,
        feeAmount: w,
        serverPkScript: o,
        connectorPkScript: m.script,
        vtxoAmount: BigInt(d.value),
        vtxoInput: f,
        vtxoPkScript: Un.decode(f.scripts).pkScript
      });
      E.updateInput(1, {
        tapLeafScript: [f.tapLeafScript]
      }), E = await this.identity.sign(E, [1]), s.push(Ut.encode(E.toPSBT()));
    }
    await this.arkProvider.submitSignedForfeitTxs(s, u ? Ut.encode(a.toPSBT()) : void 0);
  }
}
ve.DUST_AMOUNT = BigInt(546);
ve.FEE_RATE = 1;
var V;
(function(t) {
  t.walletInitialized = (b) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: b
  });
  function e(b, $) {
    return {
      type: "ERROR",
      success: !1,
      message: $,
      id: b
    };
  }
  t.error = e;
  function n(b, $) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: $,
      id: b
    };
  }
  t.settleEvent = n;
  function r(b, $) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: $,
      id: b
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
  function s(b, $) {
    return {
      type: "ADDRESS",
      success: !0,
      address: $,
      id: b
    };
  }
  t.address = s;
  function c(b) {
    return b.type === "BALANCE" && b.success === !0;
  }
  t.isBalance = c;
  function a(b, $) {
    return {
      type: "BALANCE",
      success: !0,
      balance: $,
      id: b
    };
  }
  t.balance = a;
  function u(b) {
    return b.type === "COINS" && b.success === !0;
  }
  t.isCoins = u;
  function l(b, $) {
    return {
      type: "COINS",
      success: !0,
      coins: $,
      id: b
    };
  }
  t.coins = l;
  function f(b) {
    return b.type === "VTXOS" && b.success === !0;
  }
  t.isVtxos = f;
  function d(b, $) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: $,
      id: b
    };
  }
  t.vtxos = d;
  function h(b) {
    return b.type === "VIRTUAL_COINS" && b.success === !0;
  }
  t.isVirtualCoins = h;
  function y(b, $) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: $,
      id: b
    };
  }
  t.virtualCoins = y;
  function w(b) {
    return b.type === "BOARDING_UTXOS" && b.success === !0;
  }
  t.isBoardingUtxos = w;
  function p(b, $) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: $,
      id: b
    };
  }
  t.boardingUtxos = p;
  function g(b) {
    return b.type === "SEND_BITCOIN_SUCCESS" && b.success === !0;
  }
  t.isSendBitcoinSuccess = g;
  function m(b, $) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: $,
      id: b
    };
  }
  t.sendBitcoinSuccess = m;
  function E(b) {
    return b.type === "TRANSACTION_HISTORY" && b.success === !0;
  }
  t.isTransactionHistory = E;
  function A(b, $) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: $,
      id: b
    };
  }
  t.transactionHistory = A;
  function I(b) {
    return b.type === "WALLET_STATUS" && b.success === !0;
  }
  t.isWalletStatus = I;
  function k(b, $) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: $
      },
      id: b
    };
  }
  t.walletStatus = k;
  function B(b) {
    return b.type === "CLEAR_RESPONSE";
  }
  t.isClearResponse = B;
  function N(b, $) {
    return {
      type: "CLEAR_RESPONSE",
      success: $,
      id: b
    };
  }
  t.clearResponse = N;
})(V || (V = {}));
var Ct;
(function(t) {
  function e(h) {
    return typeof h == "object" && h !== null && "type" in h && "id" in h && typeof h.id == "string";
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
  function l(h) {
    return h.type === "SEND_BITCOIN" && "params" in h && h.params !== null && typeof h.params == "object" && "address" in h.params && typeof h.params.address == "string" && "amount" in h.params && typeof h.params.amount == "number";
  }
  t.isSendBitcoin = l;
  function f(h) {
    return h.type === "GET_TRANSACTION_HISTORY";
  }
  t.isGetTransactionHistory = f;
  function d(h) {
    return h.type === "GET_STATUS";
  }
  t.isGetStatus = d;
})(Ct || (Ct = {}));
const zh = "wallet-db", ce = "vtxos", Gh = 1;
class Wh {
  constructor() {
    this.db = null, this.initDB();
  }
  initDB() {
    return new Promise((e, n) => {
      const r = indexedDB.open(zh, Gh);
      r.onerror = () => {
        n(r.error);
      }, r.onsuccess = () => {
        this.db = r.result, e();
      }, r.onupgradeneeded = (i) => {
        const o = i.target.result;
        o.objectStoreNames.contains(ce) || o.createObjectStore(ce, {
          keyPath: ["txid", "vout"]
        }).createIndex("state", "virtualStatus.state", {
          unique: !1
        });
      };
    });
  }
  async addOrUpdate(e) {
    if (!this.db && (await this.initDB(), !this.db))
      throw new Error("Failed to initialize database");
    return new Promise((n, r) => {
      const o = this.db.transaction(ce, "readwrite").objectStore(ce), s = e.map((c) => new Promise((a, u) => {
        const l = o.put(c);
        l.onsuccess = () => a(), l.onerror = () => u(l.error);
      }));
      Promise.all(s).then(() => n()).catch(r);
    });
  }
  async deleteAll() {
    if (!this.db && (await this.initDB(), !this.db))
      throw new Error("Failed to initialize database");
    return new Promise((e, n) => {
      const o = this.db.transaction(ce, "readwrite").objectStore(ce).clear();
      o.onsuccess = () => e(), o.onerror = () => n(o.error);
    });
  }
  async getSpendableVtxos() {
    if (!this.db && (await this.initDB(), !this.db))
      throw new Error("Failed to initialize database");
    return new Promise((e, n) => {
      const o = this.db.transaction(ce, "readonly").objectStore(ce).index("state"), s = o.getAll("settled"), c = o.getAll("pending");
      Promise.all([
        new Promise((a, u) => {
          s.onsuccess = () => {
            a(s.result);
          }, s.onerror = () => u(s.error);
        }),
        new Promise((a, u) => {
          c.onsuccess = () => {
            a(c.result);
          }, c.onerror = () => u(c.error);
        })
      ]).then(([a, u]) => {
        e([...a, ...u]);
      }).catch(n);
    });
  }
  async getAllVtxos() {
    if (!this.db && (await this.initDB(), !this.db))
      throw new Error("Failed to initialize database");
    return new Promise((e, n) => {
      const o = this.db.transaction(ce, "readonly").objectStore(ce).index("state"), s = o.getAll("settled"), c = o.getAll("pending"), a = o.getAll("swept");
      Promise.all([
        new Promise((u, l) => {
          s.onsuccess = () => {
            u(s.result);
          }, s.onerror = () => l(s.error);
        }),
        new Promise((u, l) => {
          c.onsuccess = () => {
            u(c.result);
          }, c.onerror = () => l(c.error);
        }),
        new Promise((u, l) => {
          a.onsuccess = () => {
            u(a.result);
          }, a.onerror = () => l(a.error);
        })
      ]).then(([u, l, f]) => {
        e({
          spendable: [...u, ...l],
          spent: f
        });
      }).catch(n);
    });
  }
}
class Yh {
  constructor(e = new Wh()) {
    this.vtxoRepository = e;
  }
  async start() {
    self.addEventListener("message", async (e) => {
      await this.handleMessage(e);
    });
  }
  clear() {
    this.vtxoSubscription && this.vtxoSubscription.abort(), this.wallet = void 0, this.arkProvider = void 0, this.vtxoSubscription = void 0;
  }
  async onWalletInitialized() {
    if (!this.wallet || !this.arkProvider)
      return;
    const e = await this.wallet.getVtxos();
    await this.vtxoRepository.addOrUpdate(e);
    const n = await this.wallet.getAddress();
    n.offchain && this.processVtxoSubscription(n.offchain);
  }
  async processVtxoSubscription({ address: e, scripts: n }) {
    try {
      const r = [...n.exit, ...n.forfeit], o = er.Script.decode(r).findLeaf(n.forfeit[0]), s = new AbortController(), c = this.arkProvider.subscribeForAddress(e, s.signal);
      this.vtxoSubscription = s;
      for await (const a of c) {
        const u = [...a.newVtxos, ...a.spentVtxos];
        if (u.length === 0)
          continue;
        const l = u.map((f) => ({
          ...f,
          tapLeafScript: o,
          scripts: r
        }));
        await this.vtxoRepository.addOrUpdate(l);
      }
    } catch (r) {
      console.error("Error processing address updates:", r);
    }
  }
  async handleClear(e) {
    var n;
    this.clear(), Ct.isBase(e.data) && ((n = e.source) == null || n.postMessage(V.clearResponse(e.data.id, !0)));
  }
  async handleInitWallet(e) {
    var r, i, o;
    const n = e.data;
    if (!Ct.isInitWallet(n)) {
      console.error("Invalid INIT_WALLET message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid INIT_WALLET message format"));
      return;
    }
    try {
      this.arkProvider = new vu(n.arkServerUrl), this.wallet = await ve.create({
        network: n.network,
        identity: ti.fromHex(n.privateKey),
        arkServerUrl: n.arkServerUrl,
        arkServerPublicKey: n.arkServerPublicKey
      }), (i = e.source) == null || i.postMessage(V.walletInitialized(n.id)), await this.onWalletInitialized();
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const c = s instanceof Error ? s.message : "Unknown error occurred";
      (o = e.source) == null || o.postMessage(V.error(n.id, c));
    }
  }
  async handleSettle(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.wallet) {
        console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
        return;
      }
      const c = await this.wallet.settle(n.params, (a) => {
        var u;
        (u = e.source) == null || u.postMessage(V.settleEvent(n.id, a));
      });
      (o = e.source) == null || o.postMessage(V.settleSuccess(n.id, c));
    } catch (c) {
      console.error("Error settling:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleSendBitcoin(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.sendBitcoin(n.params, n.zeroFee);
      (o = e.source) == null || o.postMessage(V.sendBitcoinSuccess(n.id, c));
    } catch (c) {
      console.error("Error sending bitcoin:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetAddress(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getAddress();
      (o = e.source) == null || o.postMessage(V.address(n.id, c));
    } catch (c) {
      console.error("Error getting address:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetBalance(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins(), a = c.filter((p) => p.status.confirmed).reduce((p, g) => p + g.value, 0), u = c.filter((p) => !p.status.confirmed).reduce((p, g) => p + g.value, 0), l = a + u, f = await this.vtxoRepository.getSpendableVtxos(), d = f.reduce((p, g) => g.virtualStatus.state === "settled" ? p + g.value : p, 0), h = f.reduce((p, g) => g.virtualStatus.state === "pending" ? p + g.value : p, 0), y = f.reduce((p, g) => g.virtualStatus.state === "swept" ? p + g.value : p, 0), w = d + h + y;
      (o = e.source) == null || o.postMessage(V.balance(n.id, {
        onchain: {
          confirmed: a,
          unconfirmed: u,
          total: l
        },
        offchain: {
          swept: y,
          settled: d,
          pending: h,
          total: w
        },
        total: l + w
      }));
    } catch (c) {
      console.error("Error getting balance:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetCoins(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetCoins(n)) {
      console.error("Invalid GET_COINS message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_COINS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getCoins();
      (o = e.source) == null || o.postMessage(V.coins(n.id, c));
    } catch (c) {
      console.error("Error getting coins:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetVtxos(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.vtxoRepository.getSpendableVtxos();
      (o = e.source) == null || o.postMessage(V.vtxos(n.id, c));
    } catch (c) {
      console.error("Error getting vtxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetBoardingUtxos(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const c = await this.wallet.getBoardingUtxos();
      (o = e.source) == null || o.postMessage(V.boardingUtxos(n.id, c));
    } catch (c) {
      console.error("Error getting boarding utxos:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetTransactionHistory(e) {
    var r, i, o, s;
    const n = e.data;
    if (!Ct.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.wallet) {
      console.error("Wallet not initialized"), (i = e.source) == null || i.postMessage(V.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const { boardingTxs: c, roundsToIgnore: a } = await this.wallet.getBoardingTxs(), { spendable: u, spent: l } = await this.vtxoRepository.getAllVtxos(), f = xu(u, l, a), d = [...c, ...f];
      d.sort(
        // place createdAt = 0 (unconfirmed txs) first, then descending
        (h, y) => h.createdAt === 0 ? -1 : y.createdAt === 0 ? 1 : y.createdAt - h.createdAt
      ), (o = e.source) == null || o.postMessage(V.transactionHistory(n.id, d));
    } catch (c) {
      console.error("Error getting transaction history:", c);
      const a = c instanceof Error ? c.message : "Unknown error occurred";
      (s = e.source) == null || s.postMessage(V.error(n.id, a));
    }
  }
  async handleGetStatus(e) {
    var r, i;
    const n = e.data;
    if (!Ct.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), (r = e.source) == null || r.postMessage(V.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    (i = e.source) == null || i.postMessage(V.walletStatus(n.id, this.wallet !== void 0));
  }
  async handleMessage(e) {
    var r, i;
    const n = e.data;
    if (!Ct.isBase(n)) {
      (r = e.source) == null || r.postMessage(V.error("", "Invalid message format, got: " + JSON.stringify(n)));
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
        (i = e.source) == null || i.postMessage(V.error(n.id, "Unknown message type"));
    }
  }
}
const jh = (t) => {
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
var $o = 9e15, Ke = 1e9, Co = "0123456789abcdef", ri = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058", ii = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789", Lo = {
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
  maxE: $o,
  // 1 to EXP_LIMIT
  // Whether to use cryptographically-secure random number generation, if available.
  crypto: !1
  // true/false
}, Iu, Ae, H = !0, xi = "[DecimalError] ", Fe = xi + "Invalid argument: ", ku = xi + "Precision limit exceeded", Bu = xi + "crypto unavailable", Nu = "[object Decimal]", kt = Math.floor, ft = Math.pow, Zh = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, Xh = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, Qh = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, Uu = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, ne = 1e7, P = 7, Jh = 9007199254740991, tp = ri.length - 1, Ro = ii.length - 1, T = { toStringTag: Nu };
T.absoluteValue = T.abs = function() {
  var t = new this.constructor(this);
  return t.s < 0 && (t.s = 1), O(t);
};
T.ceil = function() {
  return O(new this.constructor(this), this.e + 1, 2);
};
T.clampedTo = T.clamp = function(t, e) {
  var n, r = this, i = r.constructor;
  if (t = new i(t), e = new i(e), !t.s || !e.s) return new i(NaN);
  if (t.gt(e)) throw Error(Fe + e);
  return n = r.cmp(t), n < 0 ? t : r.cmp(e) > 0 ? e : new i(r);
};
T.comparedTo = T.cmp = function(t) {
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
T.cosine = T.cos = function() {
  var t, e, n = this, r = n.constructor;
  return n.d ? n.d[0] ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + P, r.rounding = 1, n = ep(r, _u(r, n)), r.precision = t, r.rounding = e, O(Ae == 2 || Ae == 3 ? n.neg() : n, t, e, !0)) : new r(1) : new r(NaN);
};
T.cubeRoot = T.cbrt = function() {
  var t, e, n, r, i, o, s, c, a, u, l = this, f = l.constructor;
  if (!l.isFinite() || l.isZero()) return new f(l);
  for (H = !1, o = l.s * ft(l.s * l, 1 / 3), !o || Math.abs(o) == 1 / 0 ? (n = xt(l.d), t = l.e, (o = (t - n.length + 1) % 3) && (n += o == 1 || o == -2 ? "0" : "00"), o = ft(n, 1 / 3), t = kt((t + 1) / 3) - (t % 3 == (t < 0 ? -1 : 2)), o == 1 / 0 ? n = "5e" + t : (n = o.toExponential(), n = n.slice(0, n.indexOf("e") + 1) + t), r = new f(n), r.s = l.s) : r = new f(o.toString()), s = (t = f.precision) + 3; ; )
    if (c = r, a = c.times(c).times(c), u = a.plus(l), r = Y(u.plus(l).times(c), u.plus(a), s + 2, 1), xt(c.d).slice(0, s) === (n = xt(r.d)).slice(0, s))
      if (n = n.slice(s - 3, s + 1), n == "9999" || !i && n == "4999") {
        if (!i && (O(c, t + 1, 0), c.times(c).times(c).eq(l))) {
          r = c;
          break;
        }
        s += 4, i = 1;
      } else {
        (!+n || !+n.slice(1) && n.charAt(0) == "5") && (O(r, t + 1, 1), e = !r.times(r).times(r).eq(l));
        break;
      }
  return H = !0, O(r, t, f.rounding, e);
};
T.decimalPlaces = T.dp = function() {
  var t, e = this.d, n = NaN;
  if (e) {
    if (t = e.length - 1, n = (t - kt(this.e / P)) * P, t = e[t], t) for (; t % 10 == 0; t /= 10) n--;
    n < 0 && (n = 0);
  }
  return n;
};
T.dividedBy = T.div = function(t) {
  return Y(this, new this.constructor(t));
};
T.dividedToIntegerBy = T.divToInt = function(t) {
  var e = this, n = e.constructor;
  return O(Y(e, new n(t), 0, 1, 1), n.precision, n.rounding);
};
T.equals = T.eq = function(t) {
  return this.cmp(t) === 0;
};
T.floor = function() {
  return O(new this.constructor(this), this.e + 1, 3);
};
T.greaterThan = T.gt = function(t) {
  return this.cmp(t) > 0;
};
T.greaterThanOrEqualTo = T.gte = function(t) {
  var e = this.cmp(t);
  return e == 1 || e === 0;
};
T.hyperbolicCosine = T.cosh = function() {
  var t, e, n, r, i, o = this, s = o.constructor, c = new s(1);
  if (!o.isFinite()) return new s(o.s ? 1 / 0 : NaN);
  if (o.isZero()) return c;
  n = s.precision, r = s.rounding, s.precision = n + Math.max(o.e, o.sd()) + 4, s.rounding = 1, i = o.d.length, i < 32 ? (t = Math.ceil(i / 3), e = (1 / Ai(4, t)).toString()) : (t = 16, e = "2.3283064365386962890625e-10"), o = Nn(s, 1, o.times(e), new s(1), !0);
  for (var a, u = t, l = new s(8); u--; )
    a = o.times(o), o = c.minus(a.times(l.minus(a.times(l))));
  return O(o, s.precision = n, s.rounding = r, !0);
};
T.hyperbolicSine = T.sinh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  if (!i.isFinite() || i.isZero()) return new o(i);
  if (e = o.precision, n = o.rounding, o.precision = e + Math.max(i.e, i.sd()) + 4, o.rounding = 1, r = i.d.length, r < 3)
    i = Nn(o, 2, i, i, !0);
  else {
    t = 1.4 * Math.sqrt(r), t = t > 16 ? 16 : t | 0, i = i.times(1 / Ai(5, t)), i = Nn(o, 2, i, i, !0);
    for (var s, c = new o(5), a = new o(16), u = new o(20); t--; )
      s = i.times(i), i = i.times(c.plus(s.times(a.times(s).plus(u))));
  }
  return o.precision = e, o.rounding = n, O(i, e, n, !0);
};
T.hyperbolicTangent = T.tanh = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 7, r.rounding = 1, Y(n.sinh(), n.cosh(), r.precision = t, r.rounding = e)) : new r(n.s);
};
T.inverseCosine = T.acos = function() {
  var t = this, e = t.constructor, n = t.abs().cmp(1), r = e.precision, i = e.rounding;
  return n !== -1 ? n === 0 ? t.isNeg() ? ae(e, r, i) : new e(0) : new e(NaN) : t.isZero() ? ae(e, r + 4, i).times(0.5) : (e.precision = r + 6, e.rounding = 1, t = new e(1).minus(t).div(t.plus(1)).sqrt().atan(), e.precision = r, e.rounding = i, t.times(2));
};
T.inverseHyperbolicCosine = T.acosh = function() {
  var t, e, n = this, r = n.constructor;
  return n.lte(1) ? new r(n.eq(1) ? 0 : NaN) : n.isFinite() ? (t = r.precision, e = r.rounding, r.precision = t + Math.max(Math.abs(n.e), n.sd()) + 4, r.rounding = 1, H = !1, n = n.times(n).minus(1).sqrt().plus(n), H = !0, r.precision = t, r.rounding = e, n.ln()) : new r(n);
};
T.inverseHyperbolicSine = T.asinh = function() {
  var t, e, n = this, r = n.constructor;
  return !n.isFinite() || n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 2 * Math.max(Math.abs(n.e), n.sd()) + 6, r.rounding = 1, H = !1, n = n.times(n).plus(1).sqrt().plus(n), H = !0, r.precision = t, r.rounding = e, n.ln());
};
T.inverseHyperbolicTangent = T.atanh = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isFinite() ? i.e >= 0 ? new o(i.abs().eq(1) ? i.s / 0 : i.isZero() ? i : NaN) : (t = o.precision, e = o.rounding, r = i.sd(), Math.max(r, t) < 2 * -i.e - 1 ? O(new o(i), t, e, !0) : (o.precision = n = r - i.e, i = Y(i.plus(1), new o(1).minus(i), n + t, 1), o.precision = t + 4, o.rounding = 1, i = i.ln(), o.precision = t, o.rounding = e, i.times(0.5))) : new o(NaN);
};
T.inverseSine = T.asin = function() {
  var t, e, n, r, i = this, o = i.constructor;
  return i.isZero() ? new o(i) : (e = i.abs().cmp(1), n = o.precision, r = o.rounding, e !== -1 ? e === 0 ? (t = ae(o, n + 4, r).times(0.5), t.s = i.s, t) : new o(NaN) : (o.precision = n + 6, o.rounding = 1, i = i.div(new o(1).minus(i.times(i)).sqrt().plus(1)).atan(), o.precision = n, o.rounding = r, i.times(2)));
};
T.inverseTangent = T.atan = function() {
  var t, e, n, r, i, o, s, c, a, u = this, l = u.constructor, f = l.precision, d = l.rounding;
  if (u.isFinite()) {
    if (u.isZero())
      return new l(u);
    if (u.abs().eq(1) && f + 4 <= Ro)
      return s = ae(l, f + 4, d).times(0.25), s.s = u.s, s;
  } else {
    if (!u.s) return new l(NaN);
    if (f + 4 <= Ro)
      return s = ae(l, f + 4, d).times(0.5), s.s = u.s, s;
  }
  for (l.precision = c = f + 10, l.rounding = 1, n = Math.min(28, c / P + 2 | 0), t = n; t; --t) u = u.div(u.times(u).plus(1).sqrt().plus(1));
  for (H = !1, e = Math.ceil(c / P), r = 1, a = u.times(u), s = new l(u), i = u; t !== -1; )
    if (i = i.times(a), o = s.minus(i.div(r += 2)), i = i.times(a), s = o.plus(i.div(r += 2)), s.d[e] !== void 0) for (t = e; s.d[t] === o.d[t] && t--; ) ;
  return n && (s = s.times(2 << n - 1)), H = !0, O(s, l.precision = f, l.rounding = d, !0);
};
T.isFinite = function() {
  return !!this.d;
};
T.isInteger = T.isInt = function() {
  return !!this.d && kt(this.e / P) > this.d.length - 2;
};
T.isNaN = function() {
  return !this.s;
};
T.isNegative = T.isNeg = function() {
  return this.s < 0;
};
T.isPositive = T.isPos = function() {
  return this.s > 0;
};
T.isZero = function() {
  return !!this.d && this.d[0] === 0;
};
T.lessThan = T.lt = function(t) {
  return this.cmp(t) < 0;
};
T.lessThanOrEqualTo = T.lte = function(t) {
  return this.cmp(t) < 1;
};
T.logarithm = T.log = function(t) {
  var e, n, r, i, o, s, c, a, u = this, l = u.constructor, f = l.precision, d = l.rounding, h = 5;
  if (t == null)
    t = new l(10), e = !0;
  else {
    if (t = new l(t), n = t.d, t.s < 0 || !n || !n[0] || t.eq(1)) return new l(NaN);
    e = t.eq(10);
  }
  if (n = u.d, u.s < 0 || !n || !n[0] || u.eq(1))
    return new l(n && !n[0] ? -1 / 0 : u.s != 1 ? NaN : n ? 0 : 1 / 0);
  if (e)
    if (n.length > 1)
      o = !0;
    else {
      for (i = n[0]; i % 10 === 0; ) i /= 10;
      o = i !== 1;
    }
  if (H = !1, c = f + h, s = _e(u, c), r = e ? oi(l, c + 10) : _e(t, c), a = Y(s, r, c, 1), rr(a.d, i = f, d))
    do
      if (c += 10, s = _e(u, c), r = e ? oi(l, c + 10) : _e(t, c), a = Y(s, r, c, 1), !o) {
        +xt(a.d).slice(i + 1, i + 15) + 1 == 1e14 && (a = O(a, f + 1, 0));
        break;
      }
    while (rr(a.d, i += 10, d));
  return H = !0, O(a, f, d);
};
T.minus = T.sub = function(t) {
  var e, n, r, i, o, s, c, a, u, l, f, d, h = this, y = h.constructor;
  if (t = new y(t), !h.d || !t.d)
    return !h.s || !t.s ? t = new y(NaN) : h.d ? t.s = -t.s : t = new y(t.d || h.s !== t.s ? h : NaN), t;
  if (h.s != t.s)
    return t.s = -t.s, h.plus(t);
  if (u = h.d, d = t.d, c = y.precision, a = y.rounding, !u[0] || !d[0]) {
    if (d[0]) t.s = -t.s;
    else if (u[0]) t = new y(h);
    else return new y(a === 3 ? -0 : 0);
    return H ? O(t, c, a) : t;
  }
  if (n = kt(t.e / P), l = kt(h.e / P), u = u.slice(), o = l - n, o) {
    for (f = o < 0, f ? (e = u, o = -o, s = d.length) : (e = d, n = l, s = u.length), r = Math.max(Math.ceil(c / P), s) + 2, o > r && (o = r, e.length = 1), e.reverse(), r = o; r--; ) e.push(0);
    e.reverse();
  } else {
    for (r = u.length, s = d.length, f = r < s, f && (s = r), r = 0; r < s; r++)
      if (u[r] != d[r]) {
        f = u[r] < d[r];
        break;
      }
    o = 0;
  }
  for (f && (e = u, u = d, d = e, t.s = -t.s), s = u.length, r = d.length - s; r > 0; --r) u[s++] = 0;
  for (r = d.length; r > o; ) {
    if (u[--r] < d[r]) {
      for (i = r; i && u[--i] === 0; ) u[i] = ne - 1;
      --u[i], u[r] += ne;
    }
    u[r] -= d[r];
  }
  for (; u[--s] === 0; ) u.pop();
  for (; u[0] === 0; u.shift()) --n;
  return u[0] ? (t.d = u, t.e = vi(u, n), H ? O(t, c, a) : t) : new y(a === 3 ? -0 : 0);
};
T.modulo = T.mod = function(t) {
  var e, n = this, r = n.constructor;
  return t = new r(t), !n.d || !t.s || t.d && !t.d[0] ? new r(NaN) : !t.d || n.d && !n.d[0] ? O(new r(n), r.precision, r.rounding) : (H = !1, r.modulo == 9 ? (e = Y(n, t.abs(), 0, 3, 1), e.s *= t.s) : e = Y(n, t, 0, r.modulo, 1), e = e.times(t), H = !0, n.minus(e));
};
T.naturalExponential = T.exp = function() {
  return _o(this);
};
T.naturalLogarithm = T.ln = function() {
  return _e(this);
};
T.negated = T.neg = function() {
  var t = new this.constructor(this);
  return t.s = -t.s, O(t);
};
T.plus = T.add = function(t) {
  var e, n, r, i, o, s, c, a, u, l, f = this, d = f.constructor;
  if (t = new d(t), !f.d || !t.d)
    return !f.s || !t.s ? t = new d(NaN) : f.d || (t = new d(t.d || f.s === t.s ? f : NaN)), t;
  if (f.s != t.s)
    return t.s = -t.s, f.minus(t);
  if (u = f.d, l = t.d, c = d.precision, a = d.rounding, !u[0] || !l[0])
    return l[0] || (t = new d(f)), H ? O(t, c, a) : t;
  if (o = kt(f.e / P), r = kt(t.e / P), u = u.slice(), i = o - r, i) {
    for (i < 0 ? (n = u, i = -i, s = l.length) : (n = l, r = o, s = u.length), o = Math.ceil(c / P), s = o > s ? o + 1 : s + 1, i > s && (i = s, n.length = 1), n.reverse(); i--; ) n.push(0);
    n.reverse();
  }
  for (s = u.length, i = l.length, s - i < 0 && (i = s, n = l, l = u, u = n), e = 0; i; )
    e = (u[--i] = u[i] + l[i] + e) / ne | 0, u[i] %= ne;
  for (e && (u.unshift(e), ++r), s = u.length; u[--s] == 0; ) u.pop();
  return t.d = u, t.e = vi(u, r), H ? O(t, c, a) : t;
};
T.precision = T.sd = function(t) {
  var e, n = this;
  if (t !== void 0 && t !== !!t && t !== 1 && t !== 0) throw Error(Fe + t);
  return n.d ? (e = $u(n.d), t && n.e + 1 > e && (e = n.e + 1)) : e = NaN, e;
};
T.round = function() {
  var t = this, e = t.constructor;
  return O(new e(t), t.e + 1, e.rounding);
};
T.sine = T.sin = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + Math.max(n.e, n.sd()) + P, r.rounding = 1, n = rp(r, _u(r, n)), r.precision = t, r.rounding = e, O(Ae > 2 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
T.squareRoot = T.sqrt = function() {
  var t, e, n, r, i, o, s = this, c = s.d, a = s.e, u = s.s, l = s.constructor;
  if (u !== 1 || !c || !c[0])
    return new l(!u || u < 0 && (!c || c[0]) ? NaN : c ? s : 1 / 0);
  for (H = !1, u = Math.sqrt(+s), u == 0 || u == 1 / 0 ? (e = xt(c), (e.length + a) % 2 == 0 && (e += "0"), u = Math.sqrt(e), a = kt((a + 1) / 2) - (a < 0 || a % 2), u == 1 / 0 ? e = "5e" + a : (e = u.toExponential(), e = e.slice(0, e.indexOf("e") + 1) + a), r = new l(e)) : r = new l(u.toString()), n = (a = l.precision) + 3; ; )
    if (o = r, r = o.plus(Y(s, o, n + 2, 1)).times(0.5), xt(o.d).slice(0, n) === (e = xt(r.d)).slice(0, n))
      if (e = e.slice(n - 3, n + 1), e == "9999" || !i && e == "4999") {
        if (!i && (O(o, a + 1, 0), o.times(o).eq(s))) {
          r = o;
          break;
        }
        n += 4, i = 1;
      } else {
        (!+e || !+e.slice(1) && e.charAt(0) == "5") && (O(r, a + 1, 1), t = !r.times(r).eq(s));
        break;
      }
  return H = !0, O(r, a, l.rounding, t);
};
T.tangent = T.tan = function() {
  var t, e, n = this, r = n.constructor;
  return n.isFinite() ? n.isZero() ? new r(n) : (t = r.precision, e = r.rounding, r.precision = t + 10, r.rounding = 1, n = n.sin(), n.s = 1, n = Y(n, new r(1).minus(n.times(n)).sqrt(), t + 10, 0), r.precision = t, r.rounding = e, O(Ae == 2 || Ae == 4 ? n.neg() : n, t, e, !0)) : new r(NaN);
};
T.times = T.mul = function(t) {
  var e, n, r, i, o, s, c, a, u, l = this, f = l.constructor, d = l.d, h = (t = new f(t)).d;
  if (t.s *= l.s, !d || !d[0] || !h || !h[0])
    return new f(!t.s || d && !d[0] && !h || h && !h[0] && !d ? NaN : !d || !h ? t.s / 0 : t.s * 0);
  for (n = kt(l.e / P) + kt(t.e / P), a = d.length, u = h.length, a < u && (o = d, d = h, h = o, s = a, a = u, u = s), o = [], s = a + u, r = s; r--; ) o.push(0);
  for (r = u; --r >= 0; ) {
    for (e = 0, i = a + r; i > r; )
      c = o[i] + h[r] * d[i - r - 1] + e, o[i--] = c % ne | 0, e = c / ne | 0;
    o[i] = (o[i] + e) % ne | 0;
  }
  for (; !o[--s]; ) o.pop();
  return e ? ++n : o.shift(), t.d = o, t.e = vi(o, n), H ? O(t, f.precision, f.rounding) : t;
};
T.toBinary = function(t, e) {
  return Ns(this, 2, t, e);
};
T.toDecimalPlaces = T.toDP = function(t, e) {
  var n = this, r = n.constructor;
  return n = new r(n), t === void 0 ? n : (Pt(t, 0, Ke), e === void 0 ? e = r.rounding : Pt(e, 0, 8), O(n, t + n.e + 1, e));
};
T.toExponential = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = pe(r, !0) : (Pt(t, 0, Ke), e === void 0 ? e = i.rounding : Pt(e, 0, 8), r = O(new i(r), t + 1, e), n = pe(r, !0, t + 1)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
T.toFixed = function(t, e) {
  var n, r, i = this, o = i.constructor;
  return t === void 0 ? n = pe(i) : (Pt(t, 0, Ke), e === void 0 ? e = o.rounding : Pt(e, 0, 8), r = O(new o(i), t + i.e + 1, e), n = pe(r, !1, t + r.e + 1)), i.isNeg() && !i.isZero() ? "-" + n : n;
};
T.toFraction = function(t) {
  var e, n, r, i, o, s, c, a, u, l, f, d, h = this, y = h.d, w = h.constructor;
  if (!y) return new w(h);
  if (u = n = new w(1), r = a = new w(0), e = new w(r), o = e.e = $u(y) - h.e - 1, s = o % P, e.d[0] = ft(10, s < 0 ? P + s : s), t == null)
    t = o > 0 ? e : u;
  else {
    if (c = new w(t), !c.isInt() || c.lt(u)) throw Error(Fe + c);
    t = c.gt(e) ? o > 0 ? e : u : c;
  }
  for (H = !1, c = new w(xt(y)), l = w.precision, w.precision = o = y.length * P * 2; f = Y(c, e, 0, 1, 1), i = n.plus(f.times(r)), i.cmp(t) != 1; )
    n = r, r = i, i = u, u = a.plus(f.times(i)), a = i, i = e, e = c.minus(f.times(i)), c = i;
  return i = Y(t.minus(n), r, 0, 1, 1), a = a.plus(i.times(u)), n = n.plus(i.times(r)), a.s = u.s = h.s, d = Y(u, r, o, 1).minus(h).abs().cmp(Y(a, n, o, 1).minus(h).abs()) < 1 ? [u, r] : [a, n], w.precision = l, H = !0, d;
};
T.toHexadecimal = T.toHex = function(t, e) {
  return Ns(this, 16, t, e);
};
T.toNearest = function(t, e) {
  var n = this, r = n.constructor;
  if (n = new r(n), t == null) {
    if (!n.d) return n;
    t = new r(1), e = r.rounding;
  } else {
    if (t = new r(t), e === void 0 ? e = r.rounding : Pt(e, 0, 8), !n.d) return t.s ? n : t;
    if (!t.d)
      return t.s && (t.s = n.s), t;
  }
  return t.d[0] ? (H = !1, n = Y(n, t, 0, e, 1).times(t), H = !0, O(n)) : (t.s = n.s, n = t), n;
};
T.toNumber = function() {
  return +this;
};
T.toOctal = function(t, e) {
  return Ns(this, 8, t, e);
};
T.toPower = T.pow = function(t) {
  var e, n, r, i, o, s, c = this, a = c.constructor, u = +(t = new a(t));
  if (!c.d || !t.d || !c.d[0] || !t.d[0]) return new a(ft(+c, u));
  if (c = new a(c), c.eq(1)) return c;
  if (r = a.precision, o = a.rounding, t.eq(1)) return O(c, r, o);
  if (e = kt(t.e / P), e >= t.d.length - 1 && (n = u < 0 ? -u : u) <= Jh)
    return i = Cu(a, c, n, r), t.s < 0 ? new a(1).div(i) : O(i, r, o);
  if (s = c.s, s < 0) {
    if (e < t.d.length - 1) return new a(NaN);
    if ((t.d[e] & 1) == 0 && (s = 1), c.e == 0 && c.d[0] == 1 && c.d.length == 1)
      return c.s = s, c;
  }
  return n = ft(+c, u), e = n == 0 || !isFinite(n) ? kt(u * (Math.log("0." + xt(c.d)) / Math.LN10 + c.e + 1)) : new a(n + "").e, e > a.maxE + 1 || e < a.minE - 1 ? new a(e > 0 ? s / 0 : 0) : (H = !1, a.rounding = c.s = 1, n = Math.min(12, (e + "").length), i = _o(t.times(_e(c, r + n)), r), i.d && (i = O(i, r + 5, 1), rr(i.d, r, o) && (e = r + 10, i = O(_o(t.times(_e(c, e + n)), e), e + 5, 1), +xt(i.d).slice(r + 1, r + 15) + 1 == 1e14 && (i = O(i, r + 1, 0)))), i.s = s, H = !0, a.rounding = o, O(i, r, o));
};
T.toPrecision = function(t, e) {
  var n, r = this, i = r.constructor;
  return t === void 0 ? n = pe(r, r.e <= i.toExpNeg || r.e >= i.toExpPos) : (Pt(t, 1, Ke), e === void 0 ? e = i.rounding : Pt(e, 0, 8), r = O(new i(r), t, e), n = pe(r, t <= r.e || r.e <= i.toExpNeg, t)), r.isNeg() && !r.isZero() ? "-" + n : n;
};
T.toSignificantDigits = T.toSD = function(t, e) {
  var n = this, r = n.constructor;
  return t === void 0 ? (t = r.precision, e = r.rounding) : (Pt(t, 1, Ke), e === void 0 ? e = r.rounding : Pt(e, 0, 8)), O(new r(n), t, e);
};
T.toString = function() {
  var t = this, e = t.constructor, n = pe(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() && !t.isZero() ? "-" + n : n;
};
T.truncated = T.trunc = function() {
  return O(new this.constructor(this), this.e + 1, 1);
};
T.valueOf = T.toJSON = function() {
  var t = this, e = t.constructor, n = pe(t, t.e <= e.toExpNeg || t.e >= e.toExpPos);
  return t.isNeg() ? "-" + n : n;
};
function xt(t) {
  var e, n, r, i = t.length - 1, o = "", s = t[0];
  if (i > 0) {
    for (o += s, e = 1; e < i; e++)
      r = t[e] + "", n = P - r.length, n && (o += $e(n)), o += r;
    s = t[e], r = s + "", n = P - r.length, n && (o += $e(n));
  } else if (s === 0)
    return "0";
  for (; s % 10 === 0; ) s /= 10;
  return o + s;
}
function Pt(t, e, n) {
  if (t !== ~~t || t < e || t > n)
    throw Error(Fe + t);
}
function rr(t, e, n, r) {
  var i, o, s, c;
  for (o = t[0]; o >= 10; o /= 10) --e;
  return --e < 0 ? (e += P, i = 0) : (i = Math.ceil((e + 1) / P), e %= P), o = ft(10, P - e), c = t[i] % o | 0, r == null ? e < 3 ? (e == 0 ? c = c / 100 | 0 : e == 1 && (c = c / 10 | 0), s = n < 4 && c == 99999 || n > 3 && c == 49999 || c == 5e4 || c == 0) : s = (n < 4 && c + 1 == o || n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 100 | 0) == ft(10, e - 2) - 1 || (c == o / 2 || c == 0) && (t[i + 1] / o / 100 | 0) == 0 : e < 4 ? (e == 0 ? c = c / 1e3 | 0 : e == 1 ? c = c / 100 | 0 : e == 2 && (c = c / 10 | 0), s = (r || n < 4) && c == 9999 || !r && n > 3 && c == 4999) : s = ((r || n < 4) && c + 1 == o || !r && n > 3 && c + 1 == o / 2) && (t[i + 1] / o / 1e3 | 0) == ft(10, e - 3) - 1, s;
}
function $r(t, e, n) {
  for (var r, i = [0], o, s = 0, c = t.length; s < c; ) {
    for (o = i.length; o--; ) i[o] *= e;
    for (i[0] += Co.indexOf(t.charAt(s++)), r = 0; r < i.length; r++)
      i[r] > n - 1 && (i[r + 1] === void 0 && (i[r + 1] = 0), i[r + 1] += i[r] / n | 0, i[r] %= n);
  }
  return i.reverse();
}
function ep(t, e) {
  var n, r, i;
  if (e.isZero()) return e;
  r = e.d.length, r < 32 ? (n = Math.ceil(r / 3), i = (1 / Ai(4, n)).toString()) : (n = 16, i = "2.3283064365386962890625e-10"), t.precision += n, e = Nn(t, 1, e.times(i), new t(1));
  for (var o = n; o--; ) {
    var s = e.times(e);
    e = s.times(s).minus(s).times(8).plus(1);
  }
  return t.precision -= n, e;
}
var Y = /* @__PURE__ */ function() {
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
    var u, l, f, d, h, y, w, p, g, m, E, A, I, k, B, N, b, $, R, L, F = r.constructor, x = r.s == i.s ? 1 : -1, v = r.d, S = i.d;
    if (!v || !v[0] || !S || !S[0])
      return new F(
        // Return NaN if either NaN, or both Infinity or 0.
        !r.s || !i.s || (v ? S && v[0] == S[0] : !S) ? NaN : (
          // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
          v && v[0] == 0 || !S ? x * 0 : x / 0
        )
      );
    for (a ? (h = 1, l = r.e - i.e) : (a = ne, h = P, l = kt(r.e / h) - kt(i.e / h)), R = S.length, b = v.length, g = new F(x), m = g.d = [], f = 0; S[f] == (v[f] || 0); f++) ;
    if (S[f] > (v[f] || 0) && l--, o == null ? (k = o = F.precision, s = F.rounding) : c ? k = o + (r.e - i.e) + 1 : k = o, k < 0)
      m.push(1), y = !0;
    else {
      if (k = k / h + 2 | 0, f = 0, R == 1) {
        for (d = 0, S = S[0], k++; (f < b || d) && k--; f++)
          B = d * a + (v[f] || 0), m[f] = B / S | 0, d = B % S | 0;
        y = d || f < b;
      } else {
        for (d = a / (S[0] + 1) | 0, d > 1 && (S = t(S, d, a), v = t(v, d, a), R = S.length, b = v.length), N = R, E = v.slice(0, R), A = E.length; A < R; ) E[A++] = 0;
        L = S.slice(), L.unshift(0), $ = S[0], S[1] >= a / 2 && ++$;
        do
          d = 0, u = e(S, E, R, A), u < 0 ? (I = E[0], R != A && (I = I * a + (E[1] || 0)), d = I / $ | 0, d > 1 ? (d >= a && (d = a - 1), w = t(S, d, a), p = w.length, A = E.length, u = e(w, E, p, A), u == 1 && (d--, n(w, R < p ? L : S, p, a))) : (d == 0 && (u = d = 1), w = S.slice()), p = w.length, p < A && w.unshift(0), n(E, w, A, a), u == -1 && (A = E.length, u = e(S, E, R, A), u < 1 && (d++, n(E, R < A ? L : S, A, a))), A = E.length) : u === 0 && (d++, E = [0]), m[f++] = d, u && E[0] ? E[A++] = v[N] || 0 : (E = [v[N]], A = 1);
        while ((N++ < b || E[0] !== void 0) && k--);
        y = E[0] !== void 0;
      }
      m[0] || m.shift();
    }
    if (h == 1)
      g.e = l, Iu = y;
    else {
      for (f = 1, d = m[0]; d >= 10; d /= 10) f++;
      g.e = f + l * h - 1, O(g, c ? o + g.e + 1 : o, s, y);
    }
    return g;
  };
}();
function O(t, e, n, r) {
  var i, o, s, c, a, u, l, f, d, h = t.constructor;
  t: if (e != null) {
    if (f = t.d, !f) return t;
    for (i = 1, c = f[0]; c >= 10; c /= 10) i++;
    if (o = e - i, o < 0)
      o += P, s = e, l = f[d = 0], a = l / ft(10, i - s - 1) % 10 | 0;
    else if (d = Math.ceil((o + 1) / P), c = f.length, d >= c)
      if (r) {
        for (; c++ <= d; ) f.push(0);
        l = a = 0, i = 1, o %= P, s = o - P + 1;
      } else
        break t;
    else {
      for (l = c = f[d], i = 1; c >= 10; c /= 10) i++;
      o %= P, s = o - P + i, a = s < 0 ? 0 : l / ft(10, i - s - 1) % 10 | 0;
    }
    if (r = r || e < 0 || f[d + 1] !== void 0 || (s < 0 ? l : l % ft(10, i - s - 1)), u = n < 4 ? (a || r) && (n == 0 || n == (t.s < 0 ? 3 : 2)) : a > 5 || a == 5 && (n == 4 || r || n == 6 && // Check whether the digit to the left of the rounding digit is odd.
    (o > 0 ? s > 0 ? l / ft(10, i - s) : 0 : f[d - 1]) % 10 & 1 || n == (t.s < 0 ? 8 : 7)), e < 1 || !f[0])
      return f.length = 0, u ? (e -= t.e + 1, f[0] = ft(10, (P - e % P) % P), t.e = -e || 0) : f[0] = t.e = 0, t;
    if (o == 0 ? (f.length = d, c = 1, d--) : (f.length = d + 1, c = ft(10, P - o), f[d] = s > 0 ? (l / ft(10, i - s) % ft(10, s) | 0) * c : 0), u)
      for (; ; )
        if (d == 0) {
          for (o = 1, s = f[0]; s >= 10; s /= 10) o++;
          for (s = f[0] += c, c = 1; s >= 10; s /= 10) c++;
          o != c && (t.e++, f[0] == ne && (f[0] = 1));
          break;
        } else {
          if (f[d] += c, f[d] != ne) break;
          f[d--] = 0, c = 1;
        }
    for (o = f.length; f[--o] === 0; ) f.pop();
  }
  return H && (t.e > h.maxE ? (t.d = null, t.e = NaN) : t.e < h.minE && (t.e = 0, t.d = [0])), t;
}
function pe(t, e, n) {
  if (!t.isFinite()) return Ru(t);
  var r, i = t.e, o = xt(t.d), s = o.length;
  return e ? (n && (r = n - s) > 0 ? o = o.charAt(0) + "." + o.slice(1) + $e(r) : s > 1 && (o = o.charAt(0) + "." + o.slice(1)), o = o + (t.e < 0 ? "e" : "e+") + t.e) : i < 0 ? (o = "0." + $e(-i - 1) + o, n && (r = n - s) > 0 && (o += $e(r))) : i >= s ? (o += $e(i + 1 - s), n && (r = n - i - 1) > 0 && (o = o + "." + $e(r))) : ((r = i + 1) < s && (o = o.slice(0, r) + "." + o.slice(r)), n && (r = n - s) > 0 && (i + 1 === s && (o += "."), o += $e(r))), o;
}
function vi(t, e) {
  var n = t[0];
  for (e *= P; n >= 10; n /= 10) e++;
  return e;
}
function oi(t, e, n) {
  if (e > tp)
    throw H = !0, n && (t.precision = n), Error(ku);
  return O(new t(ri), e, 1, !0);
}
function ae(t, e, n) {
  if (e > Ro) throw Error(ku);
  return O(new t(ii), e, n, !0);
}
function $u(t) {
  var e = t.length - 1, n = e * P + 1;
  if (e = t[e], e) {
    for (; e % 10 == 0; e /= 10) n--;
    for (e = t[0]; e >= 10; e /= 10) n++;
  }
  return n;
}
function $e(t) {
  for (var e = ""; t--; ) e += "0";
  return e;
}
function Cu(t, e, n, r) {
  var i, o = new t(1), s = Math.ceil(r / P + 4);
  for (H = !1; ; ) {
    if (n % 2 && (o = o.times(e), Fc(o.d, s) && (i = !0)), n = kt(n / 2), n === 0) {
      n = o.d.length - 1, i && o.d[n] === 0 && ++o.d[n];
      break;
    }
    e = e.times(e), Fc(e.d, s);
  }
  return H = !0, o;
}
function Dc(t) {
  return t.d[t.d.length - 1] & 1;
}
function Lu(t, e, n) {
  for (var r, i, o = new t(e[0]), s = 0; ++s < e.length; ) {
    if (i = new t(e[s]), !i.s) {
      o = i;
      break;
    }
    r = o.cmp(i), (r === n || r === 0 && o.s === n) && (o = i);
  }
  return o;
}
function _o(t, e) {
  var n, r, i, o, s, c, a, u = 0, l = 0, f = 0, d = t.constructor, h = d.rounding, y = d.precision;
  if (!t.d || !t.d[0] || t.e > 17)
    return new d(t.d ? t.d[0] ? t.s < 0 ? 0 : 1 / 0 : 1 : t.s ? t.s < 0 ? 0 : t : NaN);
  for (e == null ? (H = !1, a = y) : a = e, c = new d(0.03125); t.e > -2; )
    t = t.times(c), f += 5;
  for (r = Math.log(ft(2, f)) / Math.LN10 * 2 + 5 | 0, a += r, n = o = s = new d(1), d.precision = a; ; ) {
    if (o = O(o.times(t), a, 1), n = n.times(++l), c = s.plus(Y(o, n, a, 1)), xt(c.d).slice(0, a) === xt(s.d).slice(0, a)) {
      for (i = f; i--; ) s = O(s.times(s), a, 1);
      if (e == null)
        if (u < 3 && rr(s.d, a - r, h, u))
          d.precision = a += 10, n = o = c = new d(1), l = 0, u++;
        else
          return O(s, d.precision = y, h, H = !0);
      else
        return d.precision = y, s;
    }
    s = c;
  }
}
function _e(t, e) {
  var n, r, i, o, s, c, a, u, l, f, d, h = 1, y = 10, w = t, p = w.d, g = w.constructor, m = g.rounding, E = g.precision;
  if (w.s < 0 || !p || !p[0] || !w.e && p[0] == 1 && p.length == 1)
    return new g(p && !p[0] ? -1 / 0 : w.s != 1 ? NaN : p ? 0 : w);
  if (e == null ? (H = !1, l = E) : l = e, g.precision = l += y, n = xt(p), r = n.charAt(0), Math.abs(o = w.e) < 15e14) {
    for (; r < 7 && r != 1 || r == 1 && n.charAt(1) > 3; )
      w = w.times(t), n = xt(w.d), r = n.charAt(0), h++;
    o = w.e, r > 1 ? (w = new g("0." + n), o++) : w = new g(r + "." + n.slice(1));
  } else
    return u = oi(g, l + 2, E).times(o + ""), w = _e(new g(r + "." + n.slice(1)), l - y).plus(u), g.precision = E, e == null ? O(w, E, m, H = !0) : w;
  for (f = w, a = s = w = Y(w.minus(1), w.plus(1), l, 1), d = O(w.times(w), l, 1), i = 3; ; ) {
    if (s = O(s.times(d), l, 1), u = a.plus(Y(s, new g(i), l, 1)), xt(u.d).slice(0, l) === xt(a.d).slice(0, l))
      if (a = a.times(2), o !== 0 && (a = a.plus(oi(g, l + 2, E).times(o + ""))), a = Y(a, new g(h), l, 1), e == null)
        if (rr(a.d, l - y, m, c))
          g.precision = l += y, u = s = w = Y(f.minus(1), f.plus(1), l, 1), d = O(w.times(w), l, 1), i = c = 1;
        else
          return O(a, g.precision = E, m, H = !0);
      else
        return g.precision = E, a;
    a = u, i += 2;
  }
}
function Ru(t) {
  return String(t.s * t.s / 0);
}
function Cr(t, e) {
  var n, r, i;
  for ((n = e.indexOf(".")) > -1 && (e = e.replace(".", "")), (r = e.search(/e/i)) > 0 ? (n < 0 && (n = r), n += +e.slice(r + 1), e = e.substring(0, r)) : n < 0 && (n = e.length), r = 0; e.charCodeAt(r) === 48; r++) ;
  for (i = e.length; e.charCodeAt(i - 1) === 48; --i) ;
  if (e = e.slice(r, i), e) {
    if (i -= r, t.e = n = n - r - 1, t.d = [], r = (n + 1) % P, n < 0 && (r += P), r < i) {
      for (r && t.d.push(+e.slice(0, r)), i -= P; r < i; ) t.d.push(+e.slice(r, r += P));
      e = e.slice(r), r = P - e.length;
    } else
      r -= i;
    for (; r--; ) e += "0";
    t.d.push(+e), H && (t.e > t.constructor.maxE ? (t.d = null, t.e = NaN) : t.e < t.constructor.minE && (t.e = 0, t.d = [0]));
  } else
    t.e = 0, t.d = [0];
  return t;
}
function np(t, e) {
  var n, r, i, o, s, c, a, u, l;
  if (e.indexOf("_") > -1) {
    if (e = e.replace(/(\d)_(?=\d)/g, "$1"), Uu.test(e)) return Cr(t, e);
  } else if (e === "Infinity" || e === "NaN")
    return +e || (t.s = NaN), t.e = NaN, t.d = null, t;
  if (Xh.test(e))
    n = 16, e = e.toLowerCase();
  else if (Zh.test(e))
    n = 2;
  else if (Qh.test(e))
    n = 8;
  else
    throw Error(Fe + e);
  for (o = e.search(/p/i), o > 0 ? (a = +e.slice(o + 1), e = e.substring(2, o)) : e = e.slice(2), o = e.indexOf("."), s = o >= 0, r = t.constructor, s && (e = e.replace(".", ""), c = e.length, o = c - o, i = Cu(r, new r(n), o, o * 2)), u = $r(e, n, ne), l = u.length - 1, o = l; u[o] === 0; --o) u.pop();
  return o < 0 ? new r(t.s * 0) : (t.e = vi(u, l), t.d = u, H = !1, s && (t = Y(t, i, c * 4)), a && (t = t.times(Math.abs(a) < 54 ? ft(2, a) : Ti.pow(2, a))), H = !0, t);
}
function rp(t, e) {
  var n, r = e.d.length;
  if (r < 3)
    return e.isZero() ? e : Nn(t, 2, e, e);
  n = 1.4 * Math.sqrt(r), n = n > 16 ? 16 : n | 0, e = e.times(1 / Ai(5, n)), e = Nn(t, 2, e, e);
  for (var i, o = new t(5), s = new t(16), c = new t(20); n--; )
    i = e.times(e), e = e.times(o.plus(i.times(s.times(i).minus(c))));
  return e;
}
function Nn(t, e, n, r, i) {
  var o, s, c, a, u = t.precision, l = Math.ceil(u / P);
  for (H = !1, a = n.times(n), c = new t(r); ; ) {
    if (s = Y(c.times(a), new t(e++ * e++), u, 1), c = i ? r.plus(s) : r.minus(s), r = Y(s.times(a), new t(e++ * e++), u, 1), s = c.plus(r), s.d[l] !== void 0) {
      for (o = l; s.d[o] === c.d[o] && o--; ) ;
      if (o == -1) break;
    }
    o = c, c = r, r = s, s = o;
  }
  return H = !0, s.d.length = l + 1, s;
}
function Ai(t, e) {
  for (var n = t; --e; ) n *= t;
  return n;
}
function _u(t, e) {
  var n, r = e.s < 0, i = ae(t, t.precision, 1), o = i.times(0.5);
  if (e = e.abs(), e.lte(o))
    return Ae = r ? 4 : 1, e;
  if (n = e.divToInt(i), n.isZero())
    Ae = r ? 3 : 2;
  else {
    if (e = e.minus(n.times(i)), e.lte(o))
      return Ae = Dc(n) ? r ? 2 : 3 : r ? 4 : 1, e;
    Ae = Dc(n) ? r ? 1 : 4 : r ? 3 : 2;
  }
  return e.minus(i).abs();
}
function Ns(t, e, n, r) {
  var i, o, s, c, a, u, l, f, d, h = t.constructor, y = n !== void 0;
  if (y ? (Pt(n, 1, Ke), r === void 0 ? r = h.rounding : Pt(r, 0, 8)) : (n = h.precision, r = h.rounding), !t.isFinite())
    l = Ru(t);
  else {
    for (l = pe(t), s = l.indexOf("."), y ? (i = 2, e == 16 ? n = n * 4 - 3 : e == 8 && (n = n * 3 - 2)) : i = e, s >= 0 && (l = l.replace(".", ""), d = new h(1), d.e = l.length - s, d.d = $r(pe(d), 10, i), d.e = d.d.length), f = $r(l, 10, i), o = a = f.length; f[--a] == 0; ) f.pop();
    if (!f[0])
      l = y ? "0p+0" : "0";
    else {
      if (s < 0 ? o-- : (t = new h(t), t.d = f, t.e = o, t = Y(t, d, n, r, 0, i), f = t.d, o = t.e, u = Iu), s = f[n], c = i / 2, u = u || f[n + 1] !== void 0, u = r < 4 ? (s !== void 0 || u) && (r === 0 || r === (t.s < 0 ? 3 : 2)) : s > c || s === c && (r === 4 || u || r === 6 && f[n - 1] & 1 || r === (t.s < 0 ? 8 : 7)), f.length = n, u)
        for (; ++f[--n] > i - 1; )
          f[n] = 0, n || (++o, f.unshift(1));
      for (a = f.length; !f[a - 1]; --a) ;
      for (s = 0, l = ""; s < a; s++) l += Co.charAt(f[s]);
      if (y) {
        if (a > 1)
          if (e == 16 || e == 8) {
            for (s = e == 16 ? 4 : 3, --a; a % s; a++) l += "0";
            for (f = $r(l, i, e), a = f.length; !f[a - 1]; --a) ;
            for (s = 1, l = "1."; s < a; s++) l += Co.charAt(f[s]);
          } else
            l = l.charAt(0) + "." + l.slice(1);
        l = l + (o < 0 ? "p" : "p+") + o;
      } else if (o < 0) {
        for (; ++o; ) l = "0" + l;
        l = "0." + l;
      } else if (++o > a) for (o -= a; o--; ) l += "0";
      else o < a && (l = l.slice(0, o) + "." + l.slice(o));
    }
    l = (e == 16 ? "0x" : e == 2 ? "0b" : e == 8 ? "0o" : "") + l;
  }
  return t.s < 0 ? "-" + l : l;
}
function Fc(t, e) {
  if (t.length > e)
    return t.length = e, !0;
}
function ip(t) {
  return new this(t).abs();
}
function op(t) {
  return new this(t).acos();
}
function sp(t) {
  return new this(t).acosh();
}
function cp(t, e) {
  return new this(t).plus(e);
}
function ap(t) {
  return new this(t).asin();
}
function up(t) {
  return new this(t).asinh();
}
function fp(t) {
  return new this(t).atan();
}
function lp(t) {
  return new this(t).atanh();
}
function dp(t, e) {
  t = new this(t), e = new this(e);
  var n, r = this.precision, i = this.rounding, o = r + 4;
  return !t.s || !e.s ? n = new this(NaN) : !t.d && !e.d ? (n = ae(this, o, 1).times(e.s > 0 ? 0.25 : 0.75), n.s = t.s) : !e.d || t.isZero() ? (n = e.s < 0 ? ae(this, r, i) : new this(0), n.s = t.s) : !t.d || e.isZero() ? (n = ae(this, o, 1).times(0.5), n.s = t.s) : e.s < 0 ? (this.precision = o, this.rounding = 1, n = this.atan(Y(t, e, o, 1)), e = ae(this, o, 1), this.precision = r, this.rounding = i, n = t.s < 0 ? n.minus(e) : n.plus(e)) : n = this.atan(Y(t, e, o, 1)), n;
}
function hp(t) {
  return new this(t).cbrt();
}
function pp(t) {
  return O(t = new this(t), t.e + 1, 2);
}
function wp(t, e, n) {
  return new this(t).clamp(e, n);
}
function gp(t) {
  if (!t || typeof t != "object") throw Error(xi + "Object expected");
  var e, n, r, i = t.defaults === !0, o = [
    "precision",
    1,
    Ke,
    "rounding",
    0,
    8,
    "toExpNeg",
    -9e15,
    0,
    "toExpPos",
    0,
    $o,
    "maxE",
    0,
    $o,
    "minE",
    -9e15,
    0,
    "modulo",
    0,
    9
  ];
  for (e = 0; e < o.length; e += 3)
    if (n = o[e], i && (this[n] = Lo[n]), (r = t[n]) !== void 0)
      if (kt(r) === r && r >= o[e + 1] && r <= o[e + 2]) this[n] = r;
      else throw Error(Fe + n + ": " + r);
  if (n = "crypto", i && (this[n] = Lo[n]), (r = t[n]) !== void 0)
    if (r === !0 || r === !1 || r === 0 || r === 1)
      if (r)
        if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
          this[n] = !0;
        else
          throw Error(Bu);
      else
        this[n] = !1;
    else
      throw Error(Fe + n + ": " + r);
  return this;
}
function yp(t) {
  return new this(t).cos();
}
function mp(t) {
  return new this(t).cosh();
}
function Ou(t) {
  var e, n, r;
  function i(o) {
    var s, c, a, u = this;
    if (!(u instanceof i)) return new i(o);
    if (u.constructor = i, Kc(o)) {
      u.s = o.s, H ? !o.d || o.e > i.maxE ? (u.e = NaN, u.d = null) : o.e < i.minE ? (u.e = 0, u.d = [0]) : (u.e = o.e, u.d = o.d.slice()) : (u.e = o.e, u.d = o.d ? o.d.slice() : o.d);
      return;
    }
    if (a = typeof o, a === "number") {
      if (o === 0) {
        u.s = 1 / o < 0 ? -1 : 1, u.e = 0, u.d = [0];
        return;
      }
      if (o < 0 ? (o = -o, u.s = -1) : u.s = 1, o === ~~o && o < 1e7) {
        for (s = 0, c = o; c >= 10; c /= 10) s++;
        H ? s > i.maxE ? (u.e = NaN, u.d = null) : s < i.minE ? (u.e = 0, u.d = [0]) : (u.e = s, u.d = [o]) : (u.e = s, u.d = [o]);
        return;
      }
      if (o * 0 !== 0) {
        o || (u.s = NaN), u.e = NaN, u.d = null;
        return;
      }
      return Cr(u, o.toString());
    }
    if (a === "string")
      return (c = o.charCodeAt(0)) === 45 ? (o = o.slice(1), u.s = -1) : (c === 43 && (o = o.slice(1)), u.s = 1), Uu.test(o) ? Cr(u, o) : np(u, o);
    if (a === "bigint")
      return o < 0 ? (o = -o, u.s = -1) : u.s = 1, Cr(u, o.toString());
    throw Error(Fe + o);
  }
  if (i.prototype = T, i.ROUND_UP = 0, i.ROUND_DOWN = 1, i.ROUND_CEIL = 2, i.ROUND_FLOOR = 3, i.ROUND_HALF_UP = 4, i.ROUND_HALF_DOWN = 5, i.ROUND_HALF_EVEN = 6, i.ROUND_HALF_CEIL = 7, i.ROUND_HALF_FLOOR = 8, i.EUCLID = 9, i.config = i.set = gp, i.clone = Ou, i.isDecimal = Kc, i.abs = ip, i.acos = op, i.acosh = sp, i.add = cp, i.asin = ap, i.asinh = up, i.atan = fp, i.atanh = lp, i.atan2 = dp, i.cbrt = hp, i.ceil = pp, i.clamp = wp, i.cos = yp, i.cosh = mp, i.div = Ep, i.exp = bp, i.floor = Sp, i.hypot = xp, i.ln = vp, i.log = Ap, i.log10 = Ip, i.log2 = Tp, i.max = kp, i.min = Bp, i.mod = Np, i.mul = Up, i.pow = $p, i.random = Cp, i.round = Lp, i.sign = Rp, i.sin = _p, i.sinh = Op, i.sqrt = Pp, i.sub = Hp, i.sum = Vp, i.tan = Mp, i.tanh = Dp, i.trunc = Fp, t === void 0 && (t = {}), t && t.defaults !== !0)
    for (r = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], e = 0; e < r.length; ) t.hasOwnProperty(n = r[e++]) || (t[n] = this[n]);
  return i.config(t), i;
}
function Ep(t, e) {
  return new this(t).div(e);
}
function bp(t) {
  return new this(t).exp();
}
function Sp(t) {
  return O(t = new this(t), t.e + 1, 3);
}
function xp() {
  var t, e, n = new this(0);
  for (H = !1, t = 0; t < arguments.length; )
    if (e = new this(arguments[t++]), e.d)
      n.d && (n = n.plus(e.times(e)));
    else {
      if (e.s)
        return H = !0, new this(1 / 0);
      n = e;
    }
  return H = !0, n.sqrt();
}
function Kc(t) {
  return t instanceof Ti || t && t.toStringTag === Nu || !1;
}
function vp(t) {
  return new this(t).ln();
}
function Ap(t, e) {
  return new this(t).log(e);
}
function Tp(t) {
  return new this(t).log(2);
}
function Ip(t) {
  return new this(t).log(10);
}
function kp() {
  return Lu(this, arguments, -1);
}
function Bp() {
  return Lu(this, arguments, 1);
}
function Np(t, e) {
  return new this(t).mod(e);
}
function Up(t, e) {
  return new this(t).mul(e);
}
function $p(t, e) {
  return new this(t).pow(e);
}
function Cp(t) {
  var e, n, r, i, o = 0, s = new this(1), c = [];
  if (t === void 0 ? t = this.precision : Pt(t, 1, Ke), r = Math.ceil(t / P), this.crypto)
    if (crypto.getRandomValues)
      for (e = crypto.getRandomValues(new Uint32Array(r)); o < r; )
        i = e[o], i >= 429e7 ? e[o] = crypto.getRandomValues(new Uint32Array(1))[0] : c[o++] = i % 1e7;
    else if (crypto.randomBytes) {
      for (e = crypto.randomBytes(r *= 4); o < r; )
        i = e[o] + (e[o + 1] << 8) + (e[o + 2] << 16) + ((e[o + 3] & 127) << 24), i >= 214e7 ? crypto.randomBytes(4).copy(e, o) : (c.push(i % 1e7), o += 4);
      o = r / 4;
    } else
      throw Error(Bu);
  else for (; o < r; ) c[o++] = Math.random() * 1e7 | 0;
  for (r = c[--o], t %= P, r && t && (i = ft(10, P - t), c[o] = (r / i | 0) * i); c[o] === 0; o--) c.pop();
  if (o < 0)
    n = 0, c = [0];
  else {
    for (n = -1; c[0] === 0; n -= P) c.shift();
    for (r = 1, i = c[0]; i >= 10; i /= 10) r++;
    r < P && (n -= P - r);
  }
  return s.e = n, s.d = c, s;
}
function Lp(t) {
  return O(t = new this(t), t.e + 1, this.rounding);
}
function Rp(t) {
  return t = new this(t), t.d ? t.d[0] ? t.s : 0 * t.s : t.s || NaN;
}
function _p(t) {
  return new this(t).sin();
}
function Op(t) {
  return new this(t).sinh();
}
function Pp(t) {
  return new this(t).sqrt();
}
function Hp(t, e) {
  return new this(t).sub(e);
}
function Vp() {
  var t = 0, e = arguments, n = new this(e[t]);
  for (H = !1; n.s && ++t < e.length; ) n = n.plus(e[t]);
  return H = !0, O(n, this.precision, this.rounding);
}
function Mp(t) {
  return new this(t).tan();
}
function Dp(t) {
  return new this(t).tanh();
}
function Fp(t) {
  return O(t = new this(t), t.e + 1, 1);
}
T[Symbol.for("nodejs.util.inspect.custom")] = T.toString;
T[Symbol.toStringTag] = "Decimal";
var Ti = T.constructor = Ou(Lo);
ri = new Ti(ri);
ii = new Ti(ii);
const Kp = (t, e = !1) => {
  const n = typeof t == "string" ? Math.floor(new Date(t).getTime() / 1e3) : t, r = Math.floor(Date.now() / 1e3), i = Math.floor(r - n);
  return i === 0 ? "just now" : i > 0 ? `${qc(i, e)} ago` : i < 0 ? `in ${qc(i, e)}` : "";
}, qc = (t, e = !0) => {
  const n = Math.abs(t);
  return n > 86400 ? `${Math.floor(n / 86400)}${e ? " days" : "d"}` : n > 3600 ? `${Math.floor(n / 3600)}${e ? " hours" : "h"}` : n > 60 ? `${Math.floor(n / 60)}${e ? " minutes" : "m"}` : n > 0 ? `${n}${e ? " seconds" : "s"}` : "";
}, qp = new Yh();
qp.start().catch(console.error);
function zp(t, e) {
  self.registration.showNotification(t, { body: e, icon: "/arkade-icon-220.png" });
}
function Gp(t) {
  const e = `Virtual coins expiring ${Kp(t)}`;
  zp(e, "Open wallet to renew virtual coins");
}
function Wp(t) {
  return t.spendableVtxos ? t.spendableVtxos.reduce((e, n) => {
    const r = parseInt(n.expireAt);
    return r < e || e === 0 ? r : e;
  }, 0) : 0;
}
async function Yp(t, e) {
  try {
    const n = { "Content-Type": "application/json" };
    return await (await fetch(`${e}/v1/vtxos/${t}`, { headers: n })).json();
  } catch {
    return {};
  }
}
async function jp(t, e) {
  const n = await Yp(t, e), r = Wp(n);
  jh(r) && Gp(r);
}
self.addEventListener("message", (t) => {
  let e;
  if (!t.data) return;
  const { data: n, type: r } = t.data;
  r === "SKIP_WAITING" && self.skipWaiting(), r === "START_CHECK" && n && (e = window.setInterval(() => {
    jp(n.arkAddress, n.serverUrl);
  }, 4 * 60 * 60 * 1e3)), r === "STOP_CHECK" && e && clearInterval(e);
});
