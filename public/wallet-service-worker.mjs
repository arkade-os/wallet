/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function xf(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function hr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >= 0, got ${e}`);
  }
}
function ot(e, t, n = "") {
  const r = xf(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function Xg(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  hr(e.outputLen), hr(e.blockLen);
}
function ca(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function v0(e, t) {
  ot(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Ii(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function mu(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function Je(e, t) {
  return e << 32 - t | e >>> t;
}
function go(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const Qg = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", A0 = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function cc(e) {
  if (ot(e), Qg)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += A0[e[n]];
  return t;
}
const xn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function qd(e) {
  if (e >= xn._0 && e <= xn._9)
    return e - xn._0;
  if (e >= xn.A && e <= xn.F)
    return e - (xn.A - 10);
  if (e >= xn.a && e <= xn.f)
    return e - (xn.a - 10);
}
function ua(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (Qg)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = qd(e.charCodeAt(s)), a = qd(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function Fe(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    ot(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Jg(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function ro(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const k0 = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function I0(e, t, n) {
  return e & t ^ ~e & n;
}
function $0(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let ty = class {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = !1;
  length = 0;
  pos = 0;
  destroyed = !1;
  constructor(t, n, r, i) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = mu(this.buffer);
  }
  update(t) {
    ca(this), ot(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = mu(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    ca(this), v0(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Ii(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = mu(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = s, t.length = i, t.pos = a, i % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const Fn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), C0 = /* @__PURE__ */ Uint32Array.from([
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
]), Wn = /* @__PURE__ */ new Uint32Array(64);
let O0 = class extends ty {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: i, E: s, F: o, G: a, H: c } = this;
    return [t, n, r, i, s, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, i, s, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let f = 0; f < 16; f++, n += 4)
      Wn[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = Wn[f - 15], p = Wn[f - 2], y = Je(h, 7) ^ Je(h, 18) ^ h >>> 3, d = Je(p, 17) ^ Je(p, 19) ^ p >>> 10;
      Wn[f] = d + Wn[f - 7] + y + Wn[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = Je(a, 6) ^ Je(a, 11) ^ Je(a, 25), p = l + h + I0(a, c, u) + C0[f] + Wn[f] | 0, d = (Je(r, 2) ^ Je(r, 13) ^ Je(r, 22)) + $0(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Ii(Wn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Ii(this.buffer);
  }
}, B0 = class extends O0 {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Fn[0] | 0;
  B = Fn[1] | 0;
  C = Fn[2] | 0;
  D = Fn[3] | 0;
  E = Fn[4] | 0;
  F = Fn[5] | 0;
  G = Fn[6] | 0;
  H = Fn[7] | 0;
  constructor() {
    super(32);
  }
};
const zt = /* @__PURE__ */ Jg(
  () => new B0(),
  /* @__PURE__ */ k0(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Sf = /* @__PURE__ */ BigInt(0), dl = /* @__PURE__ */ BigInt(1);
function la(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function ey(e) {
  if (typeof e == "bigint") {
    if (!Do(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    hr(e);
  return e;
}
function yo(e) {
  const t = ey(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function ny(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Sf : BigInt("0x" + e);
}
function Vn(e) {
  return ny(cc(e));
}
function ry(e) {
  return ny(cc(N0(ot(e)).reverse()));
}
function io(e, t) {
  hr(t), e = ey(e);
  const n = ua(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function iy(e, t) {
  return io(e, t).reverse();
}
function Hs(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function N0(e) {
  return Uint8Array.from(e);
}
function P0(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Do = (e) => typeof e == "bigint" && Sf <= e;
function R0(e, t, n) {
  return Do(e) && Do(t) && Do(n) && t <= e && e < n;
}
function sy(e, t, n, r) {
  if (!R0(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function U0(e) {
  let t;
  for (t = 0; e > Sf; e >>= dl, t += 1)
    ;
  return t;
}
const vf = (e) => (dl << BigInt(e)) - dl;
function _0(e, t, n) {
  if (hr(e, "hashLen"), hr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, Fe(c, ...g)), p = (g = i) => {
    u = h(s, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const m = [];
    for (; g < t; ) {
      c = h();
      const v = c.slice();
      m.push(v), g += c.length;
    }
    return Fe(...m);
  };
  return (g, m) => {
    f(), p(g);
    let v;
    for (; !(v = m(y())); )
      p();
    return f(), v;
  };
}
function Af(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, o, a) {
    const c = e[s];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${u}`);
  }
  const i = (s, o) => Object.entries(s).forEach(([a, c]) => r(a, c, o));
  i(t, !1), i(n, !0);
}
function Yd(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Jt = /* @__PURE__ */ BigInt(0), qt = /* @__PURE__ */ BigInt(1), Lr = /* @__PURE__ */ BigInt(2), oy = /* @__PURE__ */ BigInt(3), ay = /* @__PURE__ */ BigInt(4), cy = /* @__PURE__ */ BigInt(5), L0 = /* @__PURE__ */ BigInt(7), uy = /* @__PURE__ */ BigInt(8), D0 = /* @__PURE__ */ BigInt(9), ly = /* @__PURE__ */ BigInt(16);
function Ue(e, t) {
  const n = e % t;
  return n >= Jt ? n : t + n;
}
function Te(e, t, n) {
  let r = e;
  for (; t-- > Jt; )
    r *= r, r %= n;
  return r;
}
function Zd(e, t) {
  if (e === Jt)
    throw new Error("invert: expected non-zero number");
  if (t <= Jt)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Ue(e, t), r = t, i = Jt, s = qt;
  for (; n !== Jt; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== qt)
    throw new Error("invert: does not exist");
  return Ue(i, t);
}
function kf(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function fy(e, t) {
  const n = (e.ORDER + qt) / ay, r = e.pow(t, n);
  return kf(e, r, t), r;
}
function V0(e, t) {
  const n = (e.ORDER - cy) / uy, r = e.mul(t, Lr), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Lr), i), a = e.mul(s, e.sub(o, e.ONE));
  return kf(e, a, t), a;
}
function M0(e) {
  const t = uc(e), n = dy(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + L0) / ly;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return kf(a, g, c), g;
  };
}
function dy(e) {
  if (e < oy)
    throw new Error("sqrt is not defined for small field");
  let t = e - qt, n = 0;
  for (; t % Lr === Jt; )
    t /= Lr, n++;
  let r = Lr;
  const i = uc(e);
  for (; Xd(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return fy;
  let s = i.pow(r, t);
  const o = (t + qt) / Lr;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Xd(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = qt << BigInt(l - y - 1), m = c.pow(f, g);
      l = y, f = c.sqr(m), h = c.mul(h, f), p = c.mul(p, m);
    }
    return p;
  };
}
function H0(e) {
  return e % ay === oy ? fy : e % uy === cy ? V0 : e % ly === D0 ? M0(e) : dy(e);
}
const F0 = [
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
function W0(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = F0.reduce((r, i) => (r[i] = "function", r), t);
  return Af(e, n), e;
}
function K0(e, t, n) {
  if (n < Jt)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === Jt)
    return e.ONE;
  if (n === qt)
    return t;
  let r = e.ONE, i = t;
  for (; n > Jt; )
    n & qt && (r = e.mul(r, i)), i = e.sqr(i), n >>= qt;
  return r;
}
function hy(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function Xd(e, t) {
  const n = (e.ORDER - qt) / Lr, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function z0(e, t) {
  t !== void 0 && hr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let j0 = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = Jt;
  ONE = qt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= Jt)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = z0(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Ue(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return Jt <= t && t < this.ORDER;
  }
  is0(t) {
    return t === Jt;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & qt) === qt;
  }
  neg(t) {
    return Ue(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Ue(t * t, this.ORDER);
  }
  add(t, n) {
    return Ue(t + n, this.ORDER);
  }
  sub(t, n) {
    return Ue(t - n, this.ORDER);
  }
  mul(t, n) {
    return Ue(t * n, this.ORDER);
  }
  pow(t, n) {
    return K0(this, t, n);
  }
  div(t, n) {
    return Ue(t * Zd(n, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, n) {
    return t + n;
  }
  subN(t, n) {
    return t - n;
  }
  mulN(t, n) {
    return t * n;
  }
  inv(t) {
    return Zd(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = H0(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? iy(t, this.BYTES) : io(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    ot(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? ry(t) : Vn(t);
    if (a && (c = Ue(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return hy(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function uc(e, t = {}) {
  return new j0(e, t);
}
function py(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function gy(e) {
  const t = py(e);
  return t + Math.ceil(t / 2);
}
function yy(e, t, n = !1) {
  ot(e);
  const r = e.length, i = py(t), s = gy(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? ry(e) : Vn(e), a = Ue(o, t - qt) + qt;
  return n ? iy(a, i) : io(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const $i = /* @__PURE__ */ BigInt(0), Dr = /* @__PURE__ */ BigInt(1);
function fa(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Qd(e, t) {
  const n = hy(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function wy(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function bu(e, t) {
  wy(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = vf(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Jd(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Dr);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const Eu = /* @__PURE__ */ new WeakMap(), my = /* @__PURE__ */ new WeakMap();
function Tu(e) {
  return my.get(e) || 1;
}
function th(e) {
  if (e !== $i)
    throw new Error("invalid wNAF");
}
let G0 = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, n) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = n;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, n, r = this.ZERO) {
    let i = t;
    for (; n > $i; )
      n & Dr && (r = r.add(i)), i = i.double(), n >>= Dr;
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
  precomputeWindow(t, n) {
    const { windows: r, windowSize: i } = bu(n, this.bits), s = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, s.push(a);
      for (let u = 1; u < i; u++)
        a = a.add(o), s.push(a);
      o = a.double();
    }
    return s;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(t, n, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let i = this.ZERO, s = this.BASE;
    const o = bu(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = Jd(r, a, o);
      r = c, l ? s = s.add(fa(h, n[p])) : i = i.add(fa(f, n[u]));
    }
    return th(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = bu(t, this.bits);
    for (let o = 0; o < s.windows && r !== $i; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Jd(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return th(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Eu.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Eu.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = Tu(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = Tu(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    wy(n, this.bits), my.set(t, n), Eu.delete(t);
  }
  hasCache(t) {
    return Tu(t) !== 1;
  }
};
function q0(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > $i || r > $i; )
    n & Dr && (s = s.add(i)), r & Dr && (o = o.add(i)), i = i.double(), n >>= Dr, r >>= Dr;
  return { p1: s, p2: o };
}
function eh(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return W0(t), t;
  } else
    return uc(e, { isLE: n });
}
function Y0(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > $i))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = eh(t.p, n.Fp, r), s = eh(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function by(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let Ey = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Xg(t), ot(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Ii(i);
  }
  update(t) {
    return ca(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    ca(this), ot(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = i, t.destroyed = s, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const Ty = (e, t, n) => new Ey(e, t).update(n).digest();
Ty.create = (e, t) => new Ey(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const nh = (e, t) => (e + (e >= 0 ? t : -t) / xy) / t;
function Z0(e, t, n) {
  const [[r, i], [s, o]] = t, a = nh(o * e, n), c = nh(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < Nn, h = l < Nn;
  f && (u = -u), h && (l = -l);
  const p = vf(Math.ceil(U0(n) / 2)) + mi;
  if (u < Nn || u >= p || l < Nn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function hl(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function xu(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return la(n.lowS, "lowS"), la(n.prehash, "prehash"), n.format !== void 0 && hl(n.format), n;
}
let X0 = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Zn = {
  // asn.1 DER encoding utils
  Err: X0,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Zn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = yo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? yo(i.length / 2 | 128) : "";
      return yo(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Zn;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const i = t[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const c = i & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Zn;
      if (e < Nn)
        throw new t("integer: negative integers are not allowed");
      let n = yo(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Zn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Vn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Zn, i = ot(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Zn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, Nn = BigInt(0), mi = BigInt(1), xy = BigInt(2), wo = BigInt(3), Q0 = BigInt(4);
function J0(e, t = {}) {
  const n = Y0("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Af(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(s.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = vy(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(M, x, T) {
    const { x: E, y: A } = x.toAffine(), $ = r.toBytes(E);
    if (la(T, "isCompressed"), T) {
      l();
      const B = !r.isOdd(A);
      return Fe(Sy(B), $);
    } else
      return Fe(Uint8Array.of(4), $, r.toBytes(A));
  }
  function h(M) {
    ot(M, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: T } = u, E = M.length, A = M[0], $ = M.subarray(1);
    if (E === x && (A === 2 || A === 3)) {
      const B = r.fromBytes($);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const O = d(B);
      let I;
      try {
        I = r.sqrt(O);
      } catch (q) {
        const K = q instanceof Error ? ": " + q.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + K);
      }
      l();
      const N = r.isOdd(I);
      return (A & 1) === 1 !== N && (I = r.neg(I)), { x: B, y: I };
    } else if (E === T && A === 4) {
      const B = r.BYTES, O = r.fromBytes($.subarray(0, B)), I = r.fromBytes($.subarray(B, B * 2));
      if (!g(O, I))
        throw new Error("bad point: is not on curve");
      return { x: O, y: I };
    } else
      throw new Error(`bad point: got length ${E}, expected compressed=${x} or uncompressed=${T}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(M) {
    const x = r.sqr(M), T = r.mul(x, M);
    return r.add(r.add(T, r.mul(M, s.a)), s.b);
  }
  function g(M, x) {
    const T = r.sqr(x), E = d(M);
    return r.eql(T, E);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, wo), Q0), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, v)))
    throw new Error("bad curve params: a or b");
  function k(M, x, T = !1) {
    if (!r.isValid(x) || T && r.is0(x))
      throw new Error(`bad point coordinate ${M}`);
    return x;
  }
  function C(M) {
    if (!(M instanceof D))
      throw new Error("Weierstrass Point expected");
  }
  function L(M) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Z0(M, c.basises, i.ORDER);
  }
  const G = Yd((M, x) => {
    const { X: T, Y: E, Z: A } = M;
    if (r.eql(A, r.ONE))
      return { x: T, y: E };
    const $ = M.is0();
    x == null && (x = $ ? r.ONE : r.inv(A));
    const B = r.mul(T, x), O = r.mul(E, x), I = r.mul(A, x);
    if ($)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(I, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: O };
  }), b = Yd((M) => {
    if (M.is0()) {
      if (t.allowInfinityPoint && !r.is0(M.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: T } = M.toAffine();
    if (!r.isValid(x) || !r.isValid(T))
      throw new Error("bad point: x or y not field elements");
    if (!g(x, T))
      throw new Error("bad point: equation left != right");
    if (!M.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Y(M, x, T, E, A) {
    return T = new D(r.mul(T.X, M), T.Y, T.Z), x = fa(E, x), T = fa(A, T), x.add(T);
  }
  class D {
    // base / generator point
    static BASE = new D(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new D(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, T, E) {
      this.X = k("x", x), this.Y = k("y", T, !0), this.Z = k("z", E), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: T, y: E } = x || {};
      if (!x || !r.isValid(T) || !r.isValid(E))
        throw new Error("invalid affine point");
      if (x instanceof D)
        throw new Error("projective point not allowed");
      return r.is0(T) && r.is0(E) ? D.ZERO : new D(T, E, r.ONE);
    }
    static fromBytes(x) {
      const T = D.fromAffine(y(ot(x, void 0, "point")));
      return T.assertValidity(), T;
    }
    static fromHex(x) {
      return D.fromBytes(ua(x));
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
    precompute(x = 8, T = !0) {
      return rt.createCache(this, x), T || this.multiply(wo), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x, I = r.eql(r.mul(T, O), r.mul($, A)), N = r.eql(r.mul(E, O), r.mul(B, A));
      return I && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new D(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: T } = s, E = r.mul(T, wo), { X: A, Y: $, Z: B } = this;
      let O = r.ZERO, I = r.ZERO, N = r.ZERO, R = r.mul(A, A), q = r.mul($, $), K = r.mul(B, B), V = r.mul(A, $);
      return V = r.add(V, V), N = r.mul(A, B), N = r.add(N, N), O = r.mul(x, N), I = r.mul(E, K), I = r.add(O, I), O = r.sub(q, I), I = r.add(q, I), I = r.mul(O, I), O = r.mul(V, O), N = r.mul(E, N), K = r.mul(x, K), V = r.sub(R, K), V = r.mul(x, V), V = r.add(V, N), N = r.add(R, R), R = r.add(N, R), R = r.add(R, K), R = r.mul(R, V), I = r.add(I, R), K = r.mul($, B), K = r.add(K, K), R = r.mul(K, V), O = r.sub(O, R), N = r.mul(K, q), N = r.add(N, N), N = r.add(N, N), new D(O, I, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x;
      let I = r.ZERO, N = r.ZERO, R = r.ZERO;
      const q = s.a, K = r.mul(s.b, wo);
      let V = r.mul(T, $), z = r.mul(E, B), X = r.mul(A, O), st = r.add(T, E), j = r.add($, B);
      st = r.mul(st, j), j = r.add(V, z), st = r.sub(st, j), j = r.add(T, A);
      let Q = r.add($, O);
      return j = r.mul(j, Q), Q = r.add(V, X), j = r.sub(j, Q), Q = r.add(E, A), I = r.add(B, O), Q = r.mul(Q, I), I = r.add(z, X), Q = r.sub(Q, I), R = r.mul(q, j), I = r.mul(K, X), R = r.add(I, R), I = r.sub(z, R), R = r.add(z, R), N = r.mul(I, R), z = r.add(V, V), z = r.add(z, V), X = r.mul(q, X), j = r.mul(K, j), z = r.add(z, X), X = r.sub(V, X), X = r.mul(q, X), j = r.add(j, X), V = r.mul(z, j), N = r.add(N, V), V = r.mul(Q, j), I = r.mul(st, I), I = r.sub(I, V), V = r.mul(st, z), R = r.mul(Q, R), R = r.add(R, V), new D(I, N, R);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(D.ZERO);
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
    multiply(x) {
      const { endo: T } = t;
      if (!i.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let E, A;
      const $ = (B) => rt.cached(this, B, (O) => Qd(D, O));
      if (T) {
        const { k1neg: B, k1: O, k2neg: I, k2: N } = L(x), { p: R, f: q } = $(O), { p: K, f: V } = $(N);
        A = q.add(V), E = Y(T.beta, R, K, B, I);
      } else {
        const { p: B, f: O } = $(x);
        E = B, A = O;
      }
      return Qd(D, [E, A])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: T } = t, E = this;
      if (!i.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === Nn || E.is0())
        return D.ZERO;
      if (x === mi)
        return E;
      if (rt.hasCache(this))
        return this.multiply(x);
      if (T) {
        const { k1neg: A, k1: $, k2neg: B, k2: O } = L(x), { p1: I, p2: N } = q0(D, E, $, O);
        return Y(T.beta, I, N, A, B);
      } else
        return rt.unsafe(E, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return G(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === mi ? !0 : x ? x(D, this) : rt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === mi ? this : x ? x(D, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return la(x, "isCompressed"), this.assertValidity(), p(D, this, x);
    }
    toHex(x = !0) {
      return cc(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const S = i.BITS, rt = new G0(D, t.endo ? Math.ceil(S / 2) : S);
  return D.BASE.precompute(8), D;
}
function Sy(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function vy(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function tE(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || ro, i = Object.assign(vy(e.Fp, n), { seed: gy(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== d || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return yy(ot(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!xf(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const m = ot(p, void 0, "key").length;
    return m === d || m === g;
  }
  function l(p, y, d = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(d);
  }
  const f = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = by(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function eE(e, t, n = {}) {
  Xg(t), Af(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || ro, i = n.hmac || ((T, E) => Ty(t, T, E)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = tE(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * xy < s.ORDER;
  function g(T) {
    const E = a >> mi;
    return T > E;
  }
  function m(T, E) {
    if (!o.isValidNot0(E))
      throw new Error(`invalid signature ${T}: out of range 1..Point.Fn.ORDER`);
    return E;
  }
  function v() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function k(T, E) {
    hl(E);
    const A = p.signature, $ = E === "compact" ? A : E === "recovered" ? A + 1 : void 0;
    return ot(T, $);
  }
  class C {
    r;
    s;
    recovery;
    constructor(E, A, $) {
      if (this.r = m("r", E), this.s = m("s", A), $ != null) {
        if (v(), ![0, 1, 2, 3].includes($))
          throw new Error("invalid recovery id");
        this.recovery = $;
      }
      Object.freeze(this);
    }
    static fromBytes(E, A = y.format) {
      k(E, A);
      let $;
      if (A === "der") {
        const { r: N, s: R } = Zn.toSig(ot(E));
        return new C(N, R);
      }
      A === "recovered" && ($ = E[0], A = "compact", E = E.subarray(1));
      const B = p.signature / 2, O = E.subarray(0, B), I = E.subarray(B, B * 2);
      return new C(o.fromBytes(O), o.fromBytes(I), $);
    }
    static fromHex(E, A) {
      return this.fromBytes(ua(E), A);
    }
    assertRecovery() {
      const { recovery: E } = this;
      if (E == null)
        throw new Error("invalid recovery id: must be present");
      return E;
    }
    addRecoveryBit(E) {
      return new C(this.r, this.s, E);
    }
    recoverPublicKey(E) {
      const { r: A, s: $ } = this, B = this.assertRecovery(), O = B === 2 || B === 3 ? A + a : A;
      if (!s.isValid(O))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const I = s.toBytes(O), N = e.fromBytes(Fe(Sy((B & 1) === 0), I)), R = o.inv(O), q = G(ot(E, void 0, "msgHash")), K = o.create(-q * R), V = o.create($ * R), z = e.BASE.multiplyUnsafe(K).add(N.multiplyUnsafe(V));
      if (z.is0())
        throw new Error("invalid recovery: point at infinify");
      return z.assertValidity(), z;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(E = y.format) {
      if (hl(E), E === "der")
        return ua(Zn.hexFromSig(this));
      const { r: A, s: $ } = this, B = o.toBytes(A), O = o.toBytes($);
      return E === "recovered" ? (v(), Fe(Uint8Array.of(this.assertRecovery()), B, O)) : Fe(B, O);
    }
    toHex(E) {
      return cc(this.toBytes(E));
    }
  }
  const L = n.bits2int || function(E) {
    if (E.length > 8192)
      throw new Error("input is too large");
    const A = Vn(E), $ = E.length * 8 - c;
    return $ > 0 ? A >> BigInt($) : A;
  }, G = n.bits2int_modN || function(E) {
    return o.create(L(E));
  }, b = vf(c);
  function Y(T) {
    return sy("num < 2^" + c, T, Nn, b), o.toBytes(T);
  }
  function D(T, E) {
    return ot(T, void 0, "message"), E ? ot(t(T), void 0, "prehashed message") : T;
  }
  function S(T, E, A) {
    const { lowS: $, prehash: B, extraEntropy: O } = xu(A, y);
    T = D(T, B);
    const I = G(T), N = o.fromBytes(E);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const R = [Y(N), Y(I)];
    if (O != null && O !== !1) {
      const z = O === !0 ? r(p.secretKey) : O;
      R.push(ot(z, void 0, "extraEntropy"));
    }
    const q = Fe(...R), K = I;
    function V(z) {
      const X = L(z);
      if (!o.isValidNot0(X))
        return;
      const st = o.inv(X), j = e.BASE.multiply(X).toAffine(), Q = o.create(j.x);
      if (Q === Nn)
        return;
      const Pt = o.create(st * o.create(K + Q * N));
      if (Pt === Nn)
        return;
      let be = (j.x === Q ? 0 : 2) | Number(j.y & mi), Ee = Pt;
      return $ && g(Pt) && (Ee = o.neg(Pt), be ^= 1), new C(Q, Ee, d ? void 0 : be);
    }
    return { seed: q, k2sig: V };
  }
  function rt(T, E, A = {}) {
    const { seed: $, k2sig: B } = S(T, E, A);
    return _0(t.outputLen, o.BYTES, i)($, B).toBytes(A.format);
  }
  function M(T, E, A, $ = {}) {
    const { lowS: B, prehash: O, format: I } = xu($, y);
    if (A = ot(A, void 0, "publicKey"), E = D(E, O), !xf(T)) {
      const N = T instanceof C ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    k(T, I);
    try {
      const N = C.fromBytes(T, I), R = e.fromBytes(A);
      if (B && N.hasHighS())
        return !1;
      const { r: q, s: K } = N, V = G(E), z = o.inv(K), X = o.create(V * z), st = o.create(q * z), j = e.BASE.multiplyUnsafe(X).add(R.multiplyUnsafe(st));
      return j.is0() ? !1 : o.create(j.x) === q;
    } catch {
      return !1;
    }
  }
  function x(T, E, A = {}) {
    const { prehash: $ } = xu(A, y);
    return E = D(E, $), C.fromBytes(T, "recovered").recoverPublicKey(E).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: rt,
    verify: M,
    recoverPublicKey: x,
    Signature: C,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const lc = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, nE = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, rE = /* @__PURE__ */ BigInt(0), pl = /* @__PURE__ */ BigInt(2);
function iE(e) {
  const t = lc.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Te(l, n, t) * l % t, h = Te(f, n, t) * l % t, p = Te(h, pl, t) * u % t, y = Te(p, i, t) * p % t, d = Te(y, s, t) * y % t, g = Te(d, a, t) * d % t, m = Te(g, c, t) * g % t, v = Te(m, a, t) * d % t, k = Te(v, n, t) * l % t, C = Te(k, o, t) * y % t, L = Te(C, r, t) * u % t, G = Te(L, pl, t);
  if (!da.eql(da.sqr(G), e))
    throw new Error("Cannot find square root");
  return G;
}
const da = uc(lc.p, { sqrt: iE }), si = /* @__PURE__ */ J0(lc, {
  Fp: da,
  endo: nE
}), rr = /* @__PURE__ */ eE(si, zt), rh = {};
function ha(e, ...t) {
  let n = rh[e];
  if (n === void 0) {
    const r = zt(P0(e));
    n = Fe(r, r), rh[e] = n;
  }
  return zt(Fe(n, ...t));
}
const If = (e) => e.toBytes(!0).slice(1), $f = (e) => e % pl === rE;
function gl(e) {
  const { Fn: t, BASE: n } = si, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: $f(i.y) ? r : t.neg(r), bytes: If(i) };
}
function Ay(e) {
  const t = da;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  $f(i) || (i = t.neg(i));
  const s = si.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const ms = Vn;
function ky(...e) {
  return si.Fn.create(ms(ha("BIP0340/challenge", ...e)));
}
function ih(e) {
  return gl(e).bytes;
}
function sE(e, t, n = ro(32)) {
  const { Fn: r } = si, i = ot(e, void 0, "message"), { bytes: s, scalar: o } = gl(t), a = ot(n, 32, "auxRand"), c = r.toBytes(o ^ ms(ha("BIP0340/aux", a))), u = ha("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = gl(u), h = ky(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !Iy(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Iy(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = si, o = ot(e, 64, "signature"), a = ot(t, void 0, "message"), c = ot(n, 32, "publicKey");
  try {
    const u = Ay(ms(c)), l = ms(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = ms(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = ky(i.toBytes(l), If(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !$f(d) || y !== l);
  } catch {
    return !1;
  }
}
const Mn = /* @__PURE__ */ (() => {
  const n = (r = ro(48)) => yy(r, lc.n);
  return {
    keygen: by(n, ih),
    getPublicKey: ih,
    sign: sE,
    verify: Iy,
    Point: si,
    utils: {
      randomSecretKey: n,
      taggedHash: ha,
      lift_x: Ay,
      pointToBytes: If
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), oE = /* @__PURE__ */ Uint8Array.from([
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
]), $y = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), aE = $y.map((e) => (9 * e + 5) % 16), Cy = /* @__PURE__ */ (() => {
  const n = [[$y], [aE]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => oE[s]));
  return n;
})(), Oy = Cy[0], By = Cy[1], Ny = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), cE = /* @__PURE__ */ Oy.map((e, t) => e.map((n) => Ny[t][n])), uE = /* @__PURE__ */ By.map((e, t) => e.map((n) => Ny[t][n])), lE = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), fE = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function sh(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const mo = /* @__PURE__ */ new Uint32Array(16);
let dE = class extends ty {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: i, h4: s } = this;
    return [t, n, r, i, s];
  }
  set(t, n, r, i, s) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = s | 0;
  }
  process(t, n) {
    for (let p = 0; p < 16; p++, n += 4)
      mo[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, f = this.h4 | 0, h = f;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, d = lE[p], g = fE[p], m = Oy[p], v = By[p], k = cE[p], C = uE[p];
      for (let L = 0; L < 16; L++) {
        const G = go(r + sh(p, s, a, u) + mo[m[L]] + d, k[L]) + f | 0;
        r = f, f = u, u = go(a, 10) | 0, a = s, s = G;
      }
      for (let L = 0; L < 16; L++) {
        const G = go(i + sh(y, o, c, l) + mo[v[L]] + g, C[L]) + h | 0;
        i = h, h = l, l = go(c, 10) | 0, c = o, o = G;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + f + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Ii(mo);
  }
  destroy() {
    this.destroyed = !0, Ii(this.buffer), this.set(0, 0, 0, 0, 0);
  }
};
const hE = /* @__PURE__ */ Jg(() => new dE());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Ci(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Py(e) {
  if (!Ci(e))
    throw new Error("Uint8Array expected");
}
function Ry(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Cf(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function pr(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function Zi(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function pa(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function ga(e, t) {
  if (!Ry(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function Of(e, t) {
  if (!Ry(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function so(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function fc(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  ga("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (pa(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (pa(i), i.map((s) => {
      pr("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function dc(e = "") {
  return pr("join", e), {
    encode: (t) => (ga("join.decode", t), t.join(e)),
    decode: (t) => (pr("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function pE(e, t = "=") {
  return Zi(e), pr("padding", t), {
    encode(n) {
      for (ga("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      ga("padding.decode", n);
      let r = n.length;
      if (r * e % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === t; r--)
        if ((r - 1) * e % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return n.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function gE(e) {
  return Cf(e), { encode: (t) => t, decode: (t) => e(t) };
}
function oh(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (pa(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (Zi(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = s.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = s[u], f = t * a, h = f + l;
      if (!Number.isSafeInteger(h) || f / t !== a || h - l !== f)
        throw new Error("convertRadix: carry overflow");
      const p = h / n;
      a = h % n;
      const y = Math.floor(p);
      if (s[u] = y, !Number.isSafeInteger(y) || y * n + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        y ? c = !1 : r = u;
      else continue;
    }
    if (i.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    i.push(0);
  return i.reverse();
}
const Uy = (e, t) => t === 0 ? e : Uy(t, e % t), ya = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Uy(e, t)), Vo = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function yl(e, t, n, r) {
  if (pa(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ ya(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ ya(t, n)}`);
  let i = 0, s = 0;
  const o = Vo[t], a = Vo[n] - 1, c = [];
  for (const u of e) {
    if (Zi(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = Vo[s];
    if (l === void 0)
      throw new Error("invalid carry");
    i &= l - 1;
  }
  if (i = i << n - s & a, !r && s >= t)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && c.push(i >>> 0), c;
}
// @__NO_SIDE_EFFECTS__
function yE(e) {
  Zi(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Ci(n))
        throw new Error("radix.encode input should be Uint8Array");
      return oh(Array.from(n), t, e);
    },
    decode: (n) => (Of("radix.decode", n), Uint8Array.from(oh(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Bf(e, t = !1) {
  if (Zi(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ ya(8, e) > 32 || /* @__PURE__ */ ya(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Ci(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return yl(Array.from(n), 8, e, !t);
    },
    decode: (n) => (Of("radix2.decode", n), Uint8Array.from(yl(n, e, 8, t)))
  };
}
function ah(e) {
  return Cf(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function wE(e, t) {
  return Zi(e), Cf(t), {
    encode(n) {
      if (!Ci(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Ci(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const mE = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", bE = (e, t) => {
  pr("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Wt = mE ? {
  encode(e) {
    return Py(e), e.toBase64();
  },
  decode(e) {
    return bE(e);
  }
} : /* @__PURE__ */ so(/* @__PURE__ */ Bf(6), /* @__PURE__ */ fc("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ pE(6), /* @__PURE__ */ dc("")), EE = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ so(/* @__PURE__ */ yE(58), /* @__PURE__ */ fc(e), /* @__PURE__ */ dc("")), wl = /* @__PURE__ */ EE("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), TE = (e) => /* @__PURE__ */ so(wE(4, (t) => e(e(t))), wl), ml = /* @__PURE__ */ so(/* @__PURE__ */ fc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ dc("")), ch = [996825010, 642813549, 513874426, 1027748829, 705979059];
function es(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < ch.length; r++)
    (t >> r & 1) === 1 && (n ^= ch[r]);
  return n;
}
function uh(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = es(i) ^ o >> 5;
  }
  i = es(i);
  for (let s = 0; s < r; s++)
    i = es(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = es(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = es(i);
  return i ^= n, ml.encode(yl([i % Vo[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function _y(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Bf(5), r = n.decode, i = n.encode, s = ah(r);
  function o(f, h, p = 90) {
    pr("bech32.encode prefix", f), Ci(h) && (h = Array.from(h)), Of("bech32.encode", h);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const d = y + 7 + h.length;
    if (p !== !1 && d > p)
      throw new TypeError(`Length ${d} exceeds limit ${p}`);
    const g = f.toLowerCase(), m = uh(g, h, t);
    return `${g}1${ml.encode(h)}${m}`;
  }
  function a(f, h = 90) {
    pr("bech32.decode input", f);
    const p = f.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${f}). Expected (8..${h})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const d = y.lastIndexOf("1");
    if (d === 0 || d === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const g = y.slice(0, d), m = y.slice(d + 1);
    if (m.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const v = ml.decode(m).slice(0, -6), k = uh(g, v, t);
    if (!m.endsWith(k))
      throw new Error(`Invalid checksum in ${f}: expected "${k}"`);
    return { prefix: g, words: v };
  }
  const c = ah(a);
  function u(f) {
    const { prefix: h, words: p } = a(f, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(f, h) {
    return o(f, i(h));
  }
  return {
    encode: o,
    decode: a,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: c,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: i
  };
}
const bl = /* @__PURE__ */ _y("bech32"), ui = /* @__PURE__ */ _y("bech32m"), xE = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, SE = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", vE = {
  encode(e) {
    return Py(e), e.toHex();
  },
  decode(e) {
    return pr("hex", e), Uint8Array.fromHex(e);
  }
}, P = SE ? vE : /* @__PURE__ */ so(/* @__PURE__ */ Bf(4), /* @__PURE__ */ fc("0123456789abcdef"), /* @__PURE__ */ dc(""), /* @__PURE__ */ gE((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), xt = /* @__PURE__ */ Uint8Array.of(), Ly = /* @__PURE__ */ Uint8Array.of(0);
function Oi(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function ke(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function AE(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!ke(i))
      throw new Error("Uint8Array expected");
    t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
const Dy = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function oo(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function yn(e) {
  return Number.isSafeInteger(e);
}
const Nf = {
  equalBytes: Oi,
  isBytes: ke,
  concatBytes: AE
}, Vy = (e) => {
  if (e !== null && typeof e != "string" && !ze(e) && !ke(e) && !yn(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (ze(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Ln.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (ze(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Ln.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, _t = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(_t.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (_t.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${_t.len(t)}`);
  },
  chunkLen: (e, t, n) => {
    if (t < 0)
      throw new Error(`wrong pos=${t}`);
    if (t + n > e)
      throw new Error(`wrong range=${t}/${n} of ${e}`);
  },
  set: (e, t, n, r = !0) => !r && (e[t] & n) !== 0 ? !1 : (e[t] |= n, !0),
  pos: (e, t) => ({
    chunk: Math.floor((e + t) / 32),
    mask: 1 << 32 - (e + t) % 32 - 1
  }),
  indices: (e, t, n = !1) => {
    _t.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = _t, s = i - t % i, o = s ? r >>> s << s : r, a = [];
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (n && (u = ~u), c === e.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < i; l++) {
          const f = 1 << i - l - 1;
          u & f && a.push(c * i + l);
        }
    }
    return a;
  },
  range: (e) => {
    const t = [];
    let n;
    for (const r of e)
      n === void 0 || r !== n.pos + n.length ? t.push(n = { pos: r, length: 1 }) : n.length += 1;
    return t;
  },
  rangeDebug: (e, t, n = !1) => `[${_t.range(_t.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    _t.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = _t, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return _t.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !_t.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, f = u !== void 0 ? u : c / o;
    for (let h = l; h < f; h++)
      if (!_t.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !_t.set(e, u, s << o - c % o, i));
  }
}, Ln = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (e, t, n) => {
    const r = { obj: t };
    e.push(r), n((i, s) => {
      r.field = i, s(), r.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const n of e)
      n.field !== void 0 && t.push(n.field);
    return t.join("/");
  },
  err: (e, t, n) => {
    const r = new Error(`${e}(${Ln.path(t)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (e, t) => {
    const n = t.split("/"), r = e.map((o) => o.obj);
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
let kE = class My {
  pos = 0;
  data;
  opts;
  stack;
  parent;
  parentOffset;
  bitBuf = 0;
  bitPos = 0;
  bs;
  // bitset
  view;
  constructor(t, n = {}, r = [], i = void 0, s = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Dy(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = _t.create(this.data.length), _t.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : _t.setRange(this.bs, this.data.length, t, n, !1);
  }
  markBytes(t) {
    const n = this.pos;
    this.pos += t;
    const r = this.markBytesBS(n, t);
    if (!this.opts.allowMultipleReads && !r)
      throw this.err(`multiple read pos=${this.pos} len=${t}`);
    return r;
  }
  pushObj(t, n) {
    return Ln.pushObj(this.stack, t, n);
  }
  readView(t, n) {
    if (!Number.isFinite(t))
      throw this.err(`readView: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const r = n(this.view, this.pos);
    return this.markBytes(t), r;
  }
  // read bytes by absolute offset
  absBytes(t) {
    if (t > this.data.length)
      throw new Error("Unexpected end of buffer");
    return this.data.subarray(t);
  }
  finish() {
    if (!this.opts.allowUnreadBytes) {
      if (this.bitPos)
        throw this.err(`${this.bitPos} bits left after unpack: ${P.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = _t.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = _t.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${P.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${P.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Ln.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new My(this.absBytes(t), this.opts, this.stack, this, t);
  }
  bytes(t, n = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(t))
      throw this.err(`readBytes: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data.subarray(this.pos, this.pos + t);
    return n || this.markBytes(t), r;
  }
  byte(t = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const n = this.data[this.pos];
    return t || this.markBytes(1), n;
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
  bits(t) {
    if (t > 32)
      throw this.err("BitReader: cannot read more than 32 bits in single call");
    let n = 0;
    for (; t; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const r = Math.min(t, this.bitPos);
      this.bitPos -= r, n = n << r | this.bitBuf >> this.bitPos & 2 ** r - 1, this.bitBuf &= 2 ** this.bitPos - 1, t -= r;
    }
    return n >>> 0;
  }
  find(t, n = this.pos) {
    if (!ke(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Oi(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}, IE = class {
  pos = 0;
  stack;
  // We could have a single buffer here and re-alloc it with
  // x1.5-2 size each time it full, but it will be slower:
  // basic/encode bench: 395ns -> 560ns
  buffers = [];
  ptrs = [];
  bitBuf = 0;
  bitPos = 0;
  viewBuf = new Uint8Array(8);
  view;
  finished = !1;
  constructor(t = []) {
    this.stack = t, this.view = Dy(this.viewBuf);
  }
  pushObj(t, n) {
    return Ln.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!yn(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Ln.err("Reader", this.stack, t);
  }
  bytes(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeBytes: ends with non-empty bit buffer");
    this.buffers.push(t), this.pos += t.length;
  }
  byte(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeByte: ends with non-empty bit buffer");
    this.buffers.push(new Uint8Array([t])), this.pos++;
  }
  finish(t = !0) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("buffer: ends with non-empty bit buffer");
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, o) => s + o, 0), i = new Uint8Array(r);
    for (let s = 0, o = 0; s < n.length; s++) {
      const a = n[s];
      i.set(a, o), o += a.length;
    }
    for (let s = this.pos, o = 0; o < this.ptrs.length; o++) {
      const a = this.ptrs[o];
      i.set(a.ptr.encode(s), a.pos), s += a.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return i;
  }
  bits(t, n) {
    if (n > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (t >= 2 ** n)
      throw this.err(`writeBits: value (${t}) >= 2**bits (${n})`);
    for (; n; ) {
      const r = Math.min(n, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << r | t >> n - r, this.bitPos += r, n -= r, t &= 2 ** n - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
};
const El = (e) => Uint8Array.from(e).reverse();
function $E(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function Hy(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new IE();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new kE(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function ie(e, t) {
  if (!ze(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return Hy({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t(r);
      } catch (s) {
        throw n.err(s);
      }
      e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t(r);
      } catch (i) {
        throw n.err(i);
      }
    }
  });
}
const se = (e) => {
  const t = Hy(e);
  return e.validate ? ie(t, e.validate) : t;
}, hc = (e) => oo(e) && typeof e.decode == "function" && typeof e.encode == "function";
function ze(e) {
  return oo(e) && hc(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || yn(e.size));
}
function CE() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const n of e) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], i = n[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = i;
      }
      return t;
    },
    decode: (e) => {
      if (!oo(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const OE = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!yn(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function BE(e) {
  if (!oo(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!yn(t) || !(t in e))
        throw new Error(`wrong value ${t}`);
      return e[t];
    },
    decode: (t) => {
      if (typeof t != "string")
        throw new Error(`wrong value ${typeof t}`);
      return e[t];
    }
  };
}
function NE(e, t = !1) {
  if (!yn(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), s = i.length - e;
      s < 0 && (i = i.padStart(i.length - s, "0"), s = 0);
      let o = i.length - 1;
      for (; o >= s && i[o] === "0"; o--)
        ;
      let a = i.slice(0, s), c = i.slice(s, o + 1);
      return a || (a = "0"), r < 0n && (a = "-" + a), c ? `${a}.${c}` : a;
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
      const o = r.slice(0, s), a = r.slice(s + 1).replace(/0+$/, ""), c = BigInt(o) * n;
      if (!t && a.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(a.length, e), l = BigInt(a.slice(0, u)) * 10n ** BigInt(e - u), f = c + l;
      return i ? -f : f;
    }
  };
}
function PE(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!hc(t))
      throw new Error(`wrong base coder ${t}`);
  return {
    encode: (t) => {
      for (const n of e) {
        const r = n.encode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/encode: cannot find match in ${t}`);
    },
    decode: (t) => {
      for (const n of e) {
        const r = n.decode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/decode: cannot find match in ${t}`);
    }
  };
}
const Fy = (e) => {
  if (!hc(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, pc = { dict: CE, numberBigint: OE, tsEnum: BE, decimal: NE, match: PE, reverse: Fy }, Pf = (e, t = !1, n = !1, r = !0) => {
  if (!yn(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return se({
    size: r ? e : void 0,
    encodeStream: (o, a) => {
      n && a < 0 && (a = a | s);
      const c = [];
      for (let l = 0; l < e; l++)
        c.push(Number(a & 255n)), a >>= 8n;
      let u = new Uint8Array(c).reverse();
      if (!r) {
        let l = 0;
        for (l = 0; l < u.length && u[l] === 0; l++)
          ;
        u = u.subarray(l);
      }
      o.bytes(t ? u.reverse() : u);
    },
    decodeStream: (o) => {
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : El(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return $E(o, 8n * i, !!n), o;
    }
  });
}, Wy = /* @__PURE__ */ Pf(32, !1), Mo = /* @__PURE__ */ Pf(8, !0), RE = /* @__PURE__ */ Pf(8, !0, !0), UE = (e, t) => se({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), ao = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!yn(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!yn(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return UE(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, lt = /* @__PURE__ */ ao(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), _E = /* @__PURE__ */ ao(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), li = /* @__PURE__ */ ao(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), lh = /* @__PURE__ */ ao(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), or = /* @__PURE__ */ ao(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), Et = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Vy(e), r = ke(e);
  return se({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? El(s) : s), r && i.bytes(e);
    },
    decodeStream: (i) => {
      let s;
      if (r) {
        const o = i.find(e);
        if (!o)
          throw i.err("bytes: cannot find terminator");
        s = i.bytes(o - i.pos), i.bytes(e.length);
      } else
        s = i.bytes(e === null ? i.leftBytes : n.decodeStream(i));
      return t ? El(s) : s;
    },
    validate: (i) => {
      if (!ke(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function LE(e, t) {
  if (!ze(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return gr(Et(e), Fy(t));
}
const Rf = (e, t = !1) => ie(gr(Et(e, t), xE), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), DE = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = gr(Et(e, t.isLE), P);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = gr(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function gr(e, t) {
  if (!ze(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!hc(t))
    throw new Error(`apply: invalid base value ${e}`);
  return se({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t.decode(r);
      } catch (s) {
        throw n.err("" + s);
      }
      return e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t.encode(r);
      } catch (i) {
        throw n.err("" + i);
      }
    }
  });
}
const VE = (e, t = !1) => {
  if (!ke(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return se({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Oi(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function ME(e, t, n) {
  if (!ze(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return se({
    encodeStream: (r, i) => {
      Ln.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Ln.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function Uf(e, t, n = !0) {
  if (!ze(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return se({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || ke(t) && !Oi(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Ky(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!yn(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function Ht(e) {
  if (!oo(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!ze(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return se({
    size: Ky(Object.values(e)),
    encodeStream: (t, n) => {
      t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = {};
      return t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => n[i] = e[i].decodeStream(t));
      }), n;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function HE(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!ze(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return se({
    size: Ky(e),
    encodeStream: (t, n) => {
      if (!Array.isArray(n))
        throw t.err(`tuple: invalid value ${n}`);
      t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = [];
      return t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => n.push(e[i].decodeStream(t)));
      }), n;
    },
    validate: (t) => {
      if (!Array.isArray(t))
        throw new Error(`tuple: invalid value ${t}`);
      if (t.length !== e.length)
        throw new Error(`tuple: wrong length=${t.length}, expected ${e.length}`);
      return t;
    }
  });
}
function ne(e, t) {
  if (!ze(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Vy(typeof e == "string" ? `../${e}` : e);
  return se({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        ke(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), ke(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (Oi(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), ke(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (ke(e))
          for (let o = 0; ; o++) {
            if (Oi(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            s(`${o}`, () => i.push(t.decodeStream(r)));
          }
        else {
          let o;
          s("arrayLen", () => o = n.decodeStream(r));
          for (let a = 0; a < o; a++)
            s(`${a}`, () => i.push(t.decodeStream(r)));
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
const Xi = rr.Point, fh = Xi.Fn, zy = Xi.Fn.ORDER, co = (e) => e % 2n === 0n, yt = Nf.isBytes, er = Nf.concatBytes, $t = Nf.equalBytes, jy = (e) => hE(zt(e)), Kn = (...e) => zt(zt(er(...e))), Tl = Mn.utils.randomSecretKey, _f = Mn.getPublicKey, Gy = rr.getPublicKey, dh = (e) => e.r < zy / 2n;
function FE(e, t, n = !1) {
  let r = rr.Signature.fromBytes(rr.sign(e, t, { prehash: !1 }));
  if (n && !dh(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !dh(r); )
      if (i.set(lt.encode(s++)), r = rr.Signature.fromBytes(rr.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const hh = Mn.sign, Lf = Mn.utils.taggedHash, fe = {
  ecdsa: 0,
  schnorr: 1
};
function Bi(e, t) {
  const n = e.length;
  if (t === fe.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return Xi.fromBytes(e), e;
  } else if (t === fe.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Mn.utils.lift_x(Vn(e)), e;
  } else
    throw new Error("Unknown key type");
}
function qy(e, t) {
  const r = Mn.utils.taggedHash("TapTweak", e, t), i = Vn(r);
  if (i >= zy)
    throw new Error("tweak higher than curve order");
  return i;
}
function WE(e, t = Uint8Array.of()) {
  const n = Mn.utils, r = Vn(e), i = Xi.BASE.multiply(r), s = co(i.y) ? r : fh.neg(r), o = n.pointToBytes(i), a = qy(o, t);
  return io(fh.add(s, a), 32);
}
function xl(e, t) {
  const n = Mn.utils, r = qy(e, t), s = n.lift_x(Vn(e)).add(Xi.BASE.multiply(r)), o = co(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const Df = zt(Xi.BASE.toBytes(!1)), Ni = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, bo = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function wa(e, t) {
  if (!yt(e) || !yt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Yy(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const Rt = {
  OP_0: 0,
  PUSHDATA1: 76,
  PUSHDATA2: 77,
  PUSHDATA4: 78,
  "1NEGATE": 79,
  RESERVED: 80,
  OP_1: 81,
  OP_2: 82,
  OP_3: 83,
  OP_4: 84,
  OP_5: 85,
  OP_6: 86,
  OP_7: 87,
  OP_8: 88,
  OP_9: 89,
  OP_10: 90,
  OP_11: 91,
  OP_12: 92,
  OP_13: 93,
  OP_14: 94,
  OP_15: 95,
  OP_16: 96,
  // Control
  NOP: 97,
  VER: 98,
  IF: 99,
  NOTIF: 100,
  VERIF: 101,
  VERNOTIF: 102,
  ELSE: 103,
  ENDIF: 104,
  VERIFY: 105,
  RETURN: 106,
  // Stack
  TOALTSTACK: 107,
  FROMALTSTACK: 108,
  "2DROP": 109,
  "2DUP": 110,
  "3DUP": 111,
  "2OVER": 112,
  "2ROT": 113,
  "2SWAP": 114,
  IFDUP: 115,
  DEPTH: 116,
  DROP: 117,
  DUP: 118,
  NIP: 119,
  OVER: 120,
  PICK: 121,
  ROLL: 122,
  ROT: 123,
  SWAP: 124,
  TUCK: 125,
  // Splice
  CAT: 126,
  SUBSTR: 127,
  LEFT: 128,
  RIGHT: 129,
  SIZE: 130,
  // Boolean logic
  INVERT: 131,
  AND: 132,
  OR: 133,
  XOR: 134,
  EQUAL: 135,
  EQUALVERIFY: 136,
  RESERVED1: 137,
  RESERVED2: 138,
  // Numbers
  "1ADD": 139,
  "1SUB": 140,
  "2MUL": 141,
  "2DIV": 142,
  NEGATE: 143,
  ABS: 144,
  NOT: 145,
  "0NOTEQUAL": 146,
  ADD: 147,
  SUB: 148,
  MUL: 149,
  DIV: 150,
  MOD: 151,
  LSHIFT: 152,
  RSHIFT: 153,
  BOOLAND: 154,
  BOOLOR: 155,
  NUMEQUAL: 156,
  NUMEQUALVERIFY: 157,
  NUMNOTEQUAL: 158,
  LESSTHAN: 159,
  GREATERTHAN: 160,
  LESSTHANOREQUAL: 161,
  GREATERTHANOREQUAL: 162,
  MIN: 163,
  MAX: 164,
  WITHIN: 165,
  // Crypto
  RIPEMD160: 166,
  SHA1: 167,
  SHA256: 168,
  HASH160: 169,
  HASH256: 170,
  CODESEPARATOR: 171,
  CHECKSIG: 172,
  CHECKSIGVERIFY: 173,
  CHECKMULTISIG: 174,
  CHECKMULTISIGVERIFY: 175,
  // Expansion
  NOP1: 176,
  CHECKLOCKTIMEVERIFY: 177,
  CHECKSEQUENCEVERIFY: 178,
  NOP4: 179,
  NOP5: 180,
  NOP6: 181,
  NOP7: 182,
  NOP8: 183,
  NOP9: 184,
  NOP10: 185,
  // BIP 342
  CHECKSIGADD: 186,
  // Invalid
  INVALID: 255
}, KE = Yy(Rt);
function Vf(e = 6, t = !1) {
  return se({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, s = BigInt(r), o = [];
      for (let a = i ? -s : s; a; a >>= 8n)
        o.push(Number(a & 0xffn));
      o[o.length - 1] >= 128 ? o.push(i ? 128 : 0) : i && (o[o.length - 1] |= 128), n.bytes(new Uint8Array(o));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > e)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${e}`);
      if (r === 0)
        return 0n;
      if (t) {
        const o = n.bytes(r, !0);
        if ((o[o.length - 1] & 127) === 0 && (r <= 1 || (o[o.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, s = 0n;
      for (let o = 0; o < r; ++o)
        i = n.byte(), s |= BigInt(i) << 8n * BigInt(o);
      return i >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function zE(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (yt(e))
    try {
      const r = Vf(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const et = se({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (Rt[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(Rt[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(Rt.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Vf().encode(BigInt(n))), !yt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Rt.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(Rt.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(Rt.PUSHDATA2), e.bytes(lh.encode(r))) : (e.byte(Rt.PUSHDATA4), e.bytes(lt.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (Rt.OP_0 < n && n <= Rt.PUSHDATA4) {
        let r;
        if (n < Rt.PUSHDATA1)
          r = n;
        else if (n === Rt.PUSHDATA1)
          r = or.decodeStream(e);
        else if (n === Rt.PUSHDATA2)
          r = lh.decodeStream(e);
        else if (n === Rt.PUSHDATA4)
          r = lt.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (Rt.OP_1 <= n && n <= Rt.OP_16)
        t.push(n - (Rt.OP_1 - 1));
      else {
        const r = KE[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), ph = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, gc = se({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(ph))
      if (!(i > t || t > s)) {
        e.byte(n);
        for (let o = 0; o < r; o++)
          e.byte(Number(t >> 8n * BigInt(o) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [n, r, i] = ph[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), je = gr(gc, pc.numberBigint), De = Et(gc), Fs = ne(je, De), ma = (e) => ne(gc, e), Zy = Ht({
  txid: Et(32, !0),
  // hash(prev_tx),
  index: lt,
  // output number of previous tx
  finalScriptSig: De,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: lt
  // ?
}), Vr = Ht({ amount: Mo, script: De }), jE = Ht({
  version: li,
  segwitFlag: VE(new Uint8Array([0, 1])),
  inputs: ma(Zy),
  outputs: ma(Vr),
  witnesses: ME("segwitFlag", ne("inputs/length", Fs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: lt
});
function GE(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const bi = ie(jE, GE), ys = Ht({
  version: li,
  inputs: ma(Zy),
  outputs: ma(Vr),
  lockTime: lt
}), Sl = ie(Et(null), (e) => Bi(e, fe.ecdsa)), ba = ie(Et(32), (e) => Bi(e, fe.schnorr)), gh = ie(Et(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), yc = Ht({
  fingerprint: _E,
  path: ne(null, lt)
}), Xy = Ht({
  hashes: ne(je, Et(32)),
  der: yc
}), qE = Et(78), YE = Ht({ pubKey: ba, leafHash: Et(32) }), ZE = Ht({
  version: or,
  // With parity :(
  internalKey: Et(32),
  merklePath: ne(null, Et(32))
}), fn = ie(ZE, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), XE = ne(null, Ht({
  depth: or,
  version: or,
  script: De
})), kt = Et(null), yh = Et(20), ns = Et(32), Mf = {
  unsignedTx: [0, !1, ys, [0], [0], !1],
  xpub: [1, qE, yc, [], [0, 2], !1],
  txVersion: [2, !1, lt, [2], [2], !1],
  fallbackLocktime: [3, !1, lt, [], [2], !1],
  inputCount: [4, !1, je, [2], [2], !1],
  outputCount: [5, !1, je, [2], [2], !1],
  txModifiable: [6, !1, or, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, lt, [], [0, 2], !1],
  proprietary: [252, kt, kt, [], [0, 2], !1]
}, wc = {
  nonWitnessUtxo: [0, !1, bi, [], [0, 2], !1],
  witnessUtxo: [1, !1, Vr, [], [0, 2], !1],
  partialSig: [2, Sl, kt, [], [0, 2], !1],
  sighashType: [3, !1, lt, [], [0, 2], !1],
  redeemScript: [4, !1, kt, [], [0, 2], !1],
  witnessScript: [5, !1, kt, [], [0, 2], !1],
  bip32Derivation: [6, Sl, yc, [], [0, 2], !1],
  finalScriptSig: [7, !1, kt, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Fs, [], [0, 2], !1],
  porCommitment: [9, !1, kt, [], [0, 2], !1],
  ripemd160: [10, yh, kt, [], [0, 2], !1],
  sha256: [11, ns, kt, [], [0, 2], !1],
  hash160: [12, yh, kt, [], [0, 2], !1],
  hash256: [13, ns, kt, [], [0, 2], !1],
  txid: [14, !1, ns, [2], [2], !0],
  index: [15, !1, lt, [2], [2], !0],
  sequence: [16, !1, lt, [], [2], !0],
  requiredTimeLocktime: [17, !1, lt, [], [2], !1],
  requiredHeightLocktime: [18, !1, lt, [], [2], !1],
  tapKeySig: [19, !1, gh, [], [0, 2], !1],
  tapScriptSig: [20, YE, gh, [], [0, 2], !1],
  tapLeafScript: [21, fn, kt, [], [0, 2], !1],
  tapBip32Derivation: [22, ns, Xy, [], [0, 2], !1],
  tapInternalKey: [23, !1, ba, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, ns, [], [0, 2], !1],
  proprietary: [252, kt, kt, [], [0, 2], !1]
}, QE = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], JE = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Ws = {
  redeemScript: [0, !1, kt, [], [0, 2], !1],
  witnessScript: [1, !1, kt, [], [0, 2], !1],
  bip32Derivation: [2, Sl, yc, [], [0, 2], !1],
  amount: [3, !1, RE, [2], [2], !0],
  script: [4, !1, kt, [2], [2], !0],
  tapInternalKey: [5, !1, ba, [], [0, 2], !1],
  tapTree: [6, !1, XE, [], [0, 2], !1],
  tapBip32Derivation: [7, ba, Xy, [], [0, 2], !1],
  proprietary: [252, kt, kt, [], [0, 2], !1]
}, tT = [], wh = ne(Ly, Ht({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: LE(je, Ht({ type: je, key: Et(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Et(je)
}));
function vl(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
Ht({ type: je, key: Et(null) });
function Hf(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return se({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: xt }, value: u.encode(o) });
        else {
          const l = o.map(([f, h]) => [
            c.encode(f),
            u.encode(h)
          ]);
          l.sort((f, h) => wa(f[0], h[0]));
          for (const [f, h] of l)
            i.push({ key: { key: f, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => wa(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      wh.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = wh.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, f, h] = t[o.key.type];
          if (a = l, !f && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${P.encode(c)} value=${P.encode(u)}`);
          if (c = f ? f.decode(c) : void 0, u = h.decode(u), !f) {
            if (i[a])
              throw new Error(`PSBT: Same keys: ${a} (key=${c} value=${u})`);
            i[a] = u, s[a] = !0;
            continue;
          }
        } else
          c = { type: o.key.type, key: o.key.key };
        if (s[a])
          throw new Error(`PSBT: Key type with empty key and no key=${a} val=${u}`);
        i[a] || (i[a] = []), i[a].push([c, u]);
      }
      return i;
    }
  });
}
const Ff = ie(Hf(wc), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Bi(t, fe.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Bi(t, fe.ecdsa);
  if (e.requiredTimeLocktime !== void 0 && e.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${e.requiredTimeLocktime}`);
  if (e.requiredHeightLocktime !== void 0 && (e.requiredHeightLocktime <= 0 || e.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${e.requiredHeightLocktime}`);
  if (e.tapLeafScript)
    for (const [t, n] of e.tapLeafScript) {
      if ((t.version & 254) !== n[n.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (n[n.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return e;
}), Wf = ie(Hf(Ws), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Bi(t, fe.ecdsa);
  return e;
}), Qy = ie(Hf(Mf), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), eT = Ht({
  magic: Uf(Rf(new Uint8Array([255])), "psbt"),
  global: Qy,
  inputs: ne("global/unsignedTx/inputs/length", Ff),
  outputs: ne(null, Wf)
}), nT = Ht({
  magic: Uf(Rf(new Uint8Array([255])), "psbt"),
  global: Qy,
  inputs: ne("global/inputCount", Ff),
  outputs: ne("global/outputCount", Wf)
});
Ht({
  magic: Uf(Rf(new Uint8Array([255])), "psbt"),
  items: ne(null, gr(ne(Ly, HE([DE(je), Et(gc)])), pc.dict()))
});
function Su(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = vl(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = vl(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function mh(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = vl(t[s]);
      if (!o.includes(e)) {
        if (a)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${s} but versions allows inclusion=${o}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function Jy(e) {
  const t = e && e.global && e.global.version || 0;
  Su(t, Mf, e.global);
  for (const o of e.inputs)
    Su(t, wc, o);
  for (const o of e.outputs)
    Su(t, Ws, o);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < i)
    throw new Error("Not outputs inputs");
  const s = e.outputs.slice(i);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return e;
}
function Al(e, t, n, r, i) {
  const s = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], f = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (f)
        throw new Error(`Cannot remove signed field=${o}`);
      delete s[o];
    } else if (u) {
      const h = n && n[o] ? n[o] : [];
      let p = t[a];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(P.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(P.decode(g[1])) : g[1]
          ];
        });
        const y = {}, d = (g, m, v) => {
          if (y[g] === void 0) {
            y[g] = [m, v];
            return;
          }
          const k = P.encode(l.encode(y[g][1])), C = P.encode(l.encode(v));
          if (k !== C)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${k} newVal=${C}`);
        };
        for (const [g, m] of h) {
          const v = P.encode(u.encode(g));
          d(v, g, m);
        }
        for (const [g, m] of p) {
          const v = P.encode(u.encode(g));
          if (m === void 0) {
            if (f)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[v];
          } else
            d(v, g, m);
        }
        s[a] = Object.values(y);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(P.decode(s[o]));
    else if (f && o in t && n && n[o] !== void 0 && !$t(l.encode(t[o]), l.encode(n[o])))
      throw new Error(`Cannot change signed field=${o}`);
  }
  for (const o in s)
    if (!e[o]) {
      if (i && o === "unknown")
        continue;
      delete s[o];
    }
  return s;
}
const bh = ie(eT, Jy), Eh = ie(nT, Jy), rT = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !yt(e[1]) || P.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: et.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, P.decode("4e73")];
  }
};
function fi(e, t) {
  try {
    return Bi(e, t), !0;
  } catch {
    return !1;
  }
}
const iT = {
  encode(e) {
    if (!(e.length !== 2 || !yt(e[0]) || !fi(e[0], fe.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, sT = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !yt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, oT = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !yt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, aT = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !yt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, cT = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !yt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, uT = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = e.slice(1, -2);
    if (r === i.length) {
      for (const s of i)
        if (!yt(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, lT = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !yt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, fT = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < t; r++) {
      const i = e[r];
      if (r & 1) {
        if (i !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!yt(i))
        return;
      n.push(i);
    }
    return { type: "tr_ns", pubkeys: n };
  },
  decode: (e) => {
    if (e.type !== "tr_ns")
      return;
    const t = [];
    for (let n = 0; n < e.pubkeys.length - 1; n++)
      t.push(e.pubkeys[n], "CHECKSIGVERIFY");
    return t.push(e.pubkeys[e.pubkeys.length - 1], "CHECKSIG"), t;
  }
}, dT = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = zE(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!yt(s))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(s);
      }
      return { type: "tr_ms", pubkeys: n, m: r };
    }
  },
  decode: (e) => {
    if (e.type !== "tr_ms")
      return;
    const t = [e.pubkeys[0], "CHECKSIG"];
    for (let n = 1; n < e.pubkeys.length; n++)
      t.push(e.pubkeys[n], "CHECKSIGADD");
    return t.push(e.m, "NUMEQUAL"), t;
  }
}, hT = {
  encode(e) {
    return { type: "unknown", script: et.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? et.decode(e.script) : void 0
}, pT = [
  rT,
  iT,
  sT,
  oT,
  aT,
  cT,
  uT,
  lT,
  fT,
  dT,
  hT
], gT = gr(et, pc.match(pT)), vt = ie(gT, (e) => {
  if (e.type === "pk" && !fi(e.pubkey, fe.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!yt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!yt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!yt(e.pubkey) || !fi(e.pubkey, fe.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!fi(n, fe.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!fi(t, fe.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function Th(e, t) {
  if (!$t(e.hash, zt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = vt.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function tw(e, t, n) {
  if (e) {
    const r = vt.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!$t(r.hash, jy(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = vt.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && Th(r, n);
  }
  if (t) {
    const r = vt.decode(t);
    r.type === "wsh" && n && Th(r, n);
  }
}
function yT(e) {
  const t = {};
  for (const n of e) {
    const r = P.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(P.encode)}`);
    t[r] = !0;
  }
}
function wT(e, t, n = !1, r) {
  const i = vt.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if ($t(o, Df))
        throw new Error("Unspendable taproot key in leaf script");
      if ($t(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function ew(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((o, a) => (a.weight || 1) - (o.weight || 1));
    const r = t.pop(), i = t.pop(), s = (i?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [i?.childs || i, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function kl(e, t = []) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return { ...e, path: t };
  if (e.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${e}`);
  return {
    ...e,
    path: t,
    // Left element has right hash in path and otherwise
    left: kl(e.left, [e.right.hash, ...t]),
    right: kl(e.right, [e.left.hash, ...t])
  };
}
function Il(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...Il(e.left), ...Il(e.right)];
}
function $l(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !$t(e.tapMerkleRoot, xt))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? P.decode(u) : u;
    if (!yt(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return wT(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: bs(l, c)
    };
  }
  if (e.length !== 2 && (e = ew(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = $l(e[0], t, n), s = $l(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return wa(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: Lf("TapBranch", o, a) };
}
const Ks = 192, bs = (e, t = Ks) => Lf("TapLeaf", new Uint8Array([t]), De.encode(e));
function mT(e, t, n = Ni, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? P.decode(e) : e || Df;
  if (!fi(s, fe.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = kl($l(t, s, r));
    const a = o.hash, [c, u] = xl(s, a), l = Il(o).map((f) => ({
      ...f,
      controlBlock: fn.encode({
        version: (f.version || Ks) + u,
        internalKey: s,
        merklePath: f.path
      })
    }));
    return {
      type: "tr",
      script: vt.encode({ type: "tr", pubkey: c }),
      address: yr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((f) => [
        fn.decode(f.controlBlock),
        er(f.script, new Uint8Array([f.version || Ks]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = xl(s, xt)[0];
    return {
      type: "tr",
      script: vt.encode({ type: "tr", pubkey: o }),
      address: yr(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function bT(e, t, n = !1) {
  return n || yT(t), {
    type: "tr_ms",
    script: vt.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const nw = TE(zt);
function rw(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function vu(e, t, n = Ni) {
  rw(e, t);
  const r = e === 0 ? bl : ui;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function xh(e, t) {
  return nw.encode(er(Uint8Array.from(t), e));
}
function yr(e = Ni) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return vu(0, t.hash, e);
      if (n === "wsh")
        return vu(0, t.hash, e);
      if (n === "tr")
        return vu(1, t.pubkey, e);
      if (n === "pkh")
        return xh(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return xh(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = bl.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = ui.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = bl.fromWords(s);
        if (rw(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = nw.decode(t);
      if (n.length !== 21)
        throw new Error("Invalid base58 address");
      if (n[0] === e.pubKeyHash)
        return { type: "pkh", hash: n.slice(1) };
      if (n[0] === e.scriptHash)
        return {
          type: "sh",
          hash: n.slice(1)
        };
      throw new Error(`Invalid address prefix=${n[0]}`);
    }
  };
}
const Eo = new Uint8Array(32), ET = {
  amount: 0xffffffffffffffffn,
  script: xt
}, TT = (e) => Math.ceil(e / 4), xT = 8, ST = 2, Cr = 0, Kf = 4294967295;
pc.decimal(xT);
const Es = (e, t) => e === void 0 ? t : e;
function Ea(e) {
  if (Array.isArray(e))
    return e.map((t) => Ea(t));
  if (yt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Ea(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const at = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, Qr = {
  DEFAULT: at.DEFAULT,
  ALL: at.ALL,
  NONE: at.NONE,
  SINGLE: at.SINGLE,
  DEFAULT_ANYONECANPAY: at.DEFAULT | at.ANYONECANPAY,
  ALL_ANYONECANPAY: at.ALL | at.ANYONECANPAY,
  NONE_ANYONECANPAY: at.NONE | at.ANYONECANPAY,
  SINGLE_ANYONECANPAY: at.SINGLE | at.ANYONECANPAY
}, vT = Yy(Qr);
function AT(e, t, n, r = xt) {
  return $t(n, t) && (e = WE(e, r), t = _f(e)), { privKey: e, pubKey: t };
}
function Or(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function rs(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Es(e.sequence, Kf),
    finalScriptSig: Es(e.finalScriptSig, xt)
  };
}
function Au(e) {
  for (const t in e) {
    const n = t;
    QE.includes(n) || delete e[n];
  }
}
const ku = Ht({ txid: Et(32, !0), index: lt });
function kT(e) {
  if (typeof e != "number" || typeof vT[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function Sh(e) {
  const t = e & 31;
  return {
    isAny: !!(e & at.ANYONECANPAY),
    isNone: t === at.NONE,
    isSingle: t === at.SINGLE
  };
}
function IT(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Es(e.version, ST),
    lockTime: Es(e.lockTime, 0),
    PSBTVersion: Es(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (lt.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${t.PSBTVersion}`);
  for (const n of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const r = t[n];
    if (r !== void 0 && typeof r != "boolean")
      throw new Error(`Transation options wrong type: ${n}=${r} (${typeof r})`);
  }
  if (t.allowUnknownVersion ? typeof t.version == "number" : ![-1, 0, 1, 2, 3].includes(t.version))
    throw new Error(`Unknown version: ${t.version}`);
  if (t.customScripts !== void 0) {
    const n = t.customScripts;
    if (!Array.isArray(n))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${n} (${typeof n})`);
    for (const r of n) {
      if (typeof r.encode != "function" || typeof r.decode != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
      if (r.finalizeTaproot !== void 0 && typeof r.finalizeTaproot != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
    }
  }
  return Object.freeze(t);
}
function vh(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!$t(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = Me.fromRaw(bi.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = P.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function Ho(e) {
  if (e.nonWitnessUtxo) {
    if (e.index === void 0)
      throw new Error("Unknown input index");
    return e.nonWitnessUtxo.outputs[e.index];
  } else {
    if (e.witnessUtxo)
      return e.witnessUtxo;
    throw new Error("Cannot find previous output info");
  }
}
function Ah(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = P.decode(s)), yt(s) && (s = bi.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = P.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Kf), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = Al(wc, a, t, n, i), Ff.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && tw(c && c.script, a.redeemScript, a.witnessScript), a;
}
function kh(e, t = !1) {
  let n = "legacy", r = at.ALL;
  const i = Ho(e), s = vt.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = at.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: i.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = vt.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = vt.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = vt.encode(u), f = {
      type: o,
      txType: n,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return f;
  }
}
let Me = class Fo {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = IT(t);
    n.lockTime !== Cr && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = bi.decode(t), i = new Fo({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      i.addOutput(s);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        i.inputs[s].finalScriptWitness = r.witnesses[s];
    return i;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = bh.decode(t);
    } catch (f) {
      try {
        r = Eh.decode(t);
      } catch {
        throw f;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new Fo({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((f, h) => vh({
      finalScriptSig: xt,
      ...r.global.unsignedTx?.inputs[h],
      ...f
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((f, h) => ({
      ...f,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Cr && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => vh(mh(t, wc, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => mh(t, Ws, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = ys.decode(ys.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(rs).map((s) => ({
        ...s,
        finalScriptSig: xt
      })),
      outputs: this.outputs.map(Or)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Cr && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? bh : Eh).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Cr, n = 0, r = Cr, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Cr ? r : this.global.fallbackLocktime || Cr;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t];
    return n.finalScriptSig && n.finalScriptSig.length || n.finalScriptWitness && n.finalScriptWitness.length ? "finalized" : n.tapKeySig || n.tapScriptSig && n.tapScriptSig.length || n.partialSig && n.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t].sighashType, r = n === void 0 ? at.DEFAULT : n, i = r === at.DEFAULT ? at.ALL : r & 3;
    return { sigInputs: r & at.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === at.ANYONECANPAY ? r.push(s) : t = !1, c === at.ALL)
        n = !1;
      else if (c === at.SINGLE)
        i.push(s);
      else if (c !== at.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
    }
    return { addInput: t, addOutput: n, inputs: r, outputs: i };
  }
  get isFinal() {
    for (let t = 0; t < this.inputs.length; t++)
      if (this.inputStatus(t) !== "finalized")
        return !1;
    return !0;
  }
  // Info utils
  get hasWitnesses() {
    let t = !1;
    for (const n of this.inputs)
      n.finalScriptWitness && n.finalScriptWitness.length && (t = !0);
    return t;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let t = 32;
    const n = this.outputs.map(Or);
    t += 4 * je.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * De.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * je.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * De.encode(r.finalScriptSig || xt).length, this.hasWitnesses && r.finalScriptWitness && (t += Fs.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return TT(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return bi.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(rs).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || xt
      })),
      outputs: this.outputs.map(Or),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return P.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return P.encode(Kn(this.toBytes(!0)));
  }
  get id() {
    return P.encode(Kn(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Ea(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(Ah(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = JE);
    }
    this.inputs[t] = Ah(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Ea(this.outputs[t]);
  }
  getOutputAddress(t, n = Ni) {
    const r = this.getOutput(t);
    if (r.script)
      return yr(n).encode(vt.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = P.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = Al(Ws, o, n, r, this.opts.allowUnknown), Wf.encode(o), o.script && !this.opts.allowUnknownOutputs && vt.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || tw(o.script, o.redeemScript, o.witnessScript), o;
  }
  addOutput(t, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, n, r = !1) {
    this.checkOutputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(t)) && (i = tT);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = Ni) {
    return this.addOutput({ script: vt.encode(yr(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = Ho(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(Or);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = Sh(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Wy.encode(1n);
    n = et.encode(et.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(rs).map((l, f) => ({
      ...l,
      finalScriptSig: f === t ? n : xt
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, f) => ({
      ...l,
      sequence: f === t ? l.sequence : 0
    })));
    let c = this.outputs.map(Or);
    s ? c = [] : o && (c = c.slice(0, t).fill(ET).concat([c[t]]));
    const u = bi.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Kn(u, li.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = Sh(r);
    let c = Eo, u = Eo, l = Eo;
    const f = this.inputs.map(rs), h = this.outputs.map(Or);
    s || (c = Kn(...f.map(ku.encode))), !s && !a && !o && (u = Kn(...f.map((y) => lt.encode(y.sequence)))), !a && !o ? l = Kn(...h.map(Vr.encode)) : a && t < h.length && (l = Kn(Vr.encode(h[t])));
    const p = f[t];
    return Kn(li.encode(this.version), c, u, Et(32, !0).encode(p.txid), lt.encode(p.index), De.encode(n), Mo.encode(i), lt.encode(p.sequence), l, lt.encode(this.lockTime), lt.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      or.encode(0),
      or.encode(r),
      // U8 sigHash
      li.encode(this.version),
      lt.encode(this.lockTime)
    ], l = r === at.DEFAULT ? at.ALL : r & 3, f = r & at.ANYONECANPAY, h = this.inputs.map(rs), p = this.outputs.map(Or);
    f !== at.ANYONECANPAY && u.push(...[
      h.map(ku.encode),
      i.map(Mo.encode),
      n.map(De.encode),
      h.map((d) => lt.encode(d.sequence))
    ].map((d) => zt(er(...d)))), l === at.ALL && u.push(zt(er(...p.map(Vr.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === at.ANYONECANPAY) {
      const d = h[t];
      u.push(ku.encode(d), Mo.encode(i[t]), De.encode(n[t]), lt.encode(d.sequence));
    } else
      u.push(lt.encode(t));
    return y & 1 && u.push(zt(De.encode(c || xt))), l === at.SINGLE && u.push(t < p.length ? zt(Vr.encode(p[t])) : Eo), o && u.push(bs(o, a), or.encode(0), li.encode(s)), Lf("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = kh(s, this.opts.allowLegacyWitnessUtxo);
    if (!yt(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const d of p)
          y = y.deriveChild(d);
        if (!$t(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let f = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (f = !0);
      return f;
    }
    r ? r.forEach(kT) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === at.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = Ho(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(Ho), f = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = _f(t), d = s.tapMerkleRoot || xt;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = AT(t, y, s.tapInternalKey, d), [v] = xl(s.tapInternalKey, d);
        if ($t(v, g)) {
          const k = this.preimageWitnessV1(n, f, a, h), C = er(hh(k, m, i), a !== at.DEFAULT ? new Uint8Array([a]) : xt);
          this.updateInput(n, { tapKeySig: C }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const v = m.subarray(0, -1), k = et.decode(v), C = m[m.length - 1], L = bs(v, C);
          if (k.findIndex((D) => yt(D) && $t(D, y)) === -1)
            continue;
          const b = this.preimageWitnessV1(n, f, a, h, void 0, v, C), Y = er(hh(b, t, i), a !== at.DEFAULT ? new Uint8Array([a]) : xt);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: L }, Y]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = Gy(t);
      let f = !1;
      const h = jy(l);
      for (const d of et.decode(o.lastScript))
        yt(d) && ($t(d, l) || $t(d, h)) && (f = !0);
      if (!f)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let d = o.lastScript;
        o.last.type === "wpkh" && (d = vt.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, d, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = FE(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, er(y, new Uint8Array([a]))]]
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
  sign(t, n, r) {
    let i = 0;
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(t, s, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = kh(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => fn.encode(u[0]).length - fn.encode(l[0]).length);
        for (const [u, l] of c) {
          const f = l.slice(0, -1), h = l[l.length - 1], p = vt.decode(f), y = bs(f, h), d = n.tapScriptSig.filter((m) => $t(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, v = p.pubkeys;
            let k = 0;
            for (const C of v) {
              const L = d.findIndex((G) => $t(G[0].pubKey, C));
              if (k === m || L === -1) {
                g.push(xt);
                continue;
              }
              g.push(d[L][1]), k++;
            }
            if (k !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const v = d.findIndex((k) => $t(k[0].pubKey, m));
              v !== -1 && g.push(d[v][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = et.decode(f);
            if (g = d.map(([{ pubKey: v }, k]) => {
              const C = m.findIndex((L) => yt(L) && $t(L, v));
              if (C === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: k, pos: C };
            }).sort((v, k) => v.pos - k.pos).map((v) => v.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const v of m) {
                if (!v.finalizeTaproot)
                  continue;
                const k = et.decode(f), C = v.encode(k);
                if (C === void 0)
                  continue;
                const L = v.finalizeTaproot(f, C, d);
                if (L) {
                  n.finalScriptWitness = L.concat(fn.encode(u)), n.finalScriptSig = xt, Au(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([f, fn.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = xt, Au(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = xt, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const h = n.partialSig.find((p) => $t(f, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = et.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = et.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = et.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = xt, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = et.decode(i).map((c) => {
      if (c === 0)
        return xt;
      if (yt(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = et.encode([et.encode([0, zt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = et.encode([...et.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), Au(n);
  }
  finalize() {
    for (let t = 0; t < this.inputs.length; t++)
      this.finalizeIdx(t);
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
  combine(t) {
    for (const i of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[i] !== t.opts[i])
        throw new Error(`Transaction/combine: different ${i} this=${this.opts[i]} other=${t.opts[i]}`);
    for (const i of ["inputs", "outputs"])
      if (this[i].length !== t[i].length)
        throw new Error(`Transaction/combine: different ${i} length this=${this[i].length} other=${t[i].length}`);
    const n = this.global.unsignedTx ? ys.encode(this.global.unsignedTx) : xt, r = t.global.unsignedTx ? ys.encode(t.global.unsignedTx) : xt;
    if (!$t(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = Al(Mf, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return Fo.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
}, wr = class extends Me {
  constructor(t) {
    super(Iu(t));
  }
  static fromPSBT(t, n) {
    return Me.fromPSBT(t, Iu(n));
  }
  static fromRaw(t, n) {
    return Me.fromRaw(t, Iu(n));
  }
};
wr.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function Iu(e) {
  return { ...wr.ARK_TX_OPTS, ...e };
}
let zf = class extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
};
const { taggedHash: iw, pointToBytes: To } = Mn.utils, Ye = rr.Point, it = Ye.Fn, wn = rr.lengths.publicKey, Cl = new Uint8Array(wn), Ih = gr(Et(33), {
  decode: (e) => zs(e) ? Cl : e.toBytes(!0),
  encode: (e) => Hs(e, Cl) ? Ye.ZERO : Ye.fromBytes(e)
}), $h = ie(Wy, (e) => (sy("n", e, 1n, it.ORDER), e)), Ei = Ht({ R1: Ih, R2: Ih }), sw = Ht({ k1: $h, k2: $h, publicKey: Et(wn) });
function Ch(e, ...t) {
}
function Ae(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => ot(n, ...t));
}
function Oh(e) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((t, n) => {
    if (typeof t != "boolean")
      throw new Error("expected boolean in xOnly array, got" + t + "(" + n + ")");
  });
}
const Ta = (e, ...t) => it.create(it.fromBytes(iw(e, ...t), !0)), is = (e, t) => co(e.y) ? t : it.neg(t);
function Mr(e) {
  return Ye.BASE.multiply(e);
}
function zs(e) {
  return e.equals(Ye.ZERO);
}
function Ol(e) {
  return Ae(e, wn), e.sort(wa);
}
function ow(e) {
  Ae(e, wn);
  for (let t = 1; t < e.length; t++)
    if (!Hs(e[t], e[0]))
      return e[t];
  return Cl;
}
function aw(e) {
  return Ae(e, wn), iw("KeyAgg list", ...e);
}
function cw(e, t, n) {
  return ot(e, wn), ot(t, wn), Hs(e, t) ? 1n : Ta("KeyAgg coefficient", n, e);
}
function Bl(e, t = [], n = []) {
  if (Ae(e, wn), Ae(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = ow(e), i = aw(e);
  let s = Ye.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = Ye.fromBytes(e[c]);
    } catch {
      throw new zf(c, "pubkey");
    }
    s = s.add(u.multiply(cw(e[c], r, i)));
  }
  let o = it.ONE, a = it.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !co(s.y) ? it.neg(it.ONE) : it.ONE, l = it.fromBytes(t[c]);
    if (s = s.multiply(u).add(Mr(l)), zs(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = it.mul(u, o), a = it.add(l, it.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
const Bh = (e, t, n, r, i, s) => Ta("MuSig/nonce", e, new Uint8Array([t.length]), t, new Uint8Array([n.length]), n, i, io(s.length, 4), s, new Uint8Array([r]));
function $T(e, t, n = new Uint8Array(0), r, i = new Uint8Array(0), s = ro(32)) {
  if (ot(e, wn), Ch(t, 32), ot(n), ![0, 32].includes(n.length))
    throw new Error("wrong aggPublicKey");
  Ch(), ot(i), ot(s, 32);
  const o = Uint8Array.of(0), a = Bh(s, e, n, 0, o, i), c = Bh(s, e, n, 1, o, i);
  return {
    secret: sw.encode({ k1: a, k2: c, publicKey: e }),
    public: Ei.encode({ R1: Mr(a), R2: Mr(c) })
  };
}
function CT(e) {
  Ae(e, 66);
  let t = Ye.ZERO, n = Ye.ZERO;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    try {
      const { R1: s, R2: o } = Ei.decode(i);
      if (zs(s) || zs(o))
        throw new Error("infinity point");
      t = t.add(s), n = n.add(o);
    } catch {
      throw new zf(r, "pubnonce");
    }
  }
  return Ei.encode({ R1: t, R2: n });
}
class OT {
  publicKeys;
  Q;
  gAcc;
  tweakAcc;
  b;
  R;
  e;
  tweaks;
  isXonly;
  L;
  secondKey;
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
  constructor(t, n, r, i = [], s = []) {
    if (Ae(n, 33), Ae(i, 32), Oh(s), ot(r), i.length !== s.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    const { aggPublicKey: o, gAcc: a, tweakAcc: c } = Bl(n, i, s), { R1: u, R2: l } = Ei.decode(t);
    this.publicKeys = n, this.Q = o, this.gAcc = a, this.tweakAcc = c, this.b = Ta("MuSig/noncecoef", t, To(o), r);
    const f = u.add(l.multiply(this.b));
    this.R = zs(f) ? Ye.BASE : f, this.e = Ta("BIP0340/challenge", To(this.R), To(o), r), this.tweaks = i, this.isXonly = s, this.L = aw(n), this.secondKey = ow(n);
  }
  /**
   * Calculates the key aggregation coefficient for a given point.
   * @private
   * @param P The point to calculate the coefficient for.
   * @returns The key aggregation coefficient as a bigint.
   * @throws {Error} If the provided public key is not included in the list of pubkeys.
   */
  getSessionKeyAggCoeff(t) {
    const { publicKeys: n } = this, r = t.toBytes(!0);
    if (!n.some((s) => Hs(s, r)))
      throw new Error("The signer's pubkey must be included in the list of pubkeys");
    return cw(r, this.secondKey, this.L);
  }
  partialSigVerifyInternal(t, n, r) {
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, u = it.fromBytes(t, !0);
    if (!it.isValid(u))
      return !1;
    const { R1: l, R2: f } = Ei.decode(n), h = l.add(f.multiply(o)), p = co(a.y) ? h : h.negate(), y = Ye.fromBytes(r), d = this.getSessionKeyAggCoeff(y), g = it.mul(is(i, 1n), s), m = Mr(u), v = p.add(y.multiply(it.mul(c, it.mul(d, g))));
    return m.equals(v);
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
  sign(t, n, r = !1) {
    if (ot(n, 32), typeof r != "boolean")
      throw new Error("expected boolean");
    const { Q: i, gAcc: s, b: o, R: a, e: c } = this, { k1: u, k2: l, publicKey: f } = sw.decode(t);
    if (t.fill(0, 0, 64), !it.isValid(u))
      throw new Error("wrong k1");
    if (!it.isValid(l))
      throw new Error("wrong k1");
    const h = is(a, u), p = is(a, l), y = it.fromBytes(n);
    if (it.is0(y))
      throw new Error("wrong d_");
    const d = Mr(y), g = d.toBytes(!0);
    if (!Hs(g, f))
      throw new Error("Public key does not match nonceGen argument");
    const m = this.getSessionKeyAggCoeff(d), v = is(i, 1n), k = it.mul(v, it.mul(s, y)), C = it.add(h, it.add(it.mul(o, p), it.mul(c, it.mul(m, k)))), L = it.toBytes(C);
    if (!r) {
      const G = Ei.encode({
        R1: Mr(u),
        R2: Mr(l)
      });
      if (!this.partialSigVerifyInternal(L, G, g))
        throw new Error("Partial signature verification failed");
    }
    return L;
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
  partialSigVerify(t, n, r) {
    const { publicKeys: i, tweaks: s, isXonly: o } = this;
    if (ot(t, 32), Ae(n, 66), Ae(i, wn), Ae(s, 32), Oh(o), hr(r), n.length !== i.length)
      throw new Error("The pubNonces and publicKeys arrays must have the same length");
    if (s.length !== o.length)
      throw new Error("The tweaks and isXonly arrays must have the same length");
    if (r >= n.length)
      throw new Error("index outside of pubKeys/pubNonces");
    return this.partialSigVerifyInternal(t, n[r], i[r]);
  }
  /**
   * Aggregates partial signatures from multiple signers into a single final signature.
   * @param partialSigs An array of partial signatures from each signer (Uint8Array).
   * @param sessionCtx The session context containing all necessary information for signing.
   * @returns The final aggregate signature (Uint8Array).
   * @throws {Error} If the input is invalid, such as wrong array sizes, invalid signature.
   */
  partialSigAgg(t) {
    Ae(t, 32);
    const { Q: n, tweakAcc: r, R: i, e: s } = this;
    let o = 0n;
    for (let c = 0; c < t.length; c++) {
      const u = it.fromBytes(t[c], !0);
      if (!it.isValid(u))
        throw new zf(c, "psig");
      o = it.add(o, u);
    }
    const a = is(n, 1n);
    return o = it.add(o, it.mul(s, it.mul(a, r))), Fe(To(i), it.toBytes(o));
  }
}
function BT(e) {
  const t = $T(e);
  return { secNonce: t.secret, pubNonce: t.public };
}
function NT(e) {
  return CT(e);
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function jf(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Jr(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function pt(e, t, n = "") {
  const r = jf(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function uw(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  Jr(e.outputLen), Jr(e.blockLen);
}
function xa(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function PT(e, t) {
  pt(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Sa(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function $u(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function tn(e, t) {
  return e << 32 - t | e >>> t;
}
const lw = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", RT = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function mc(e) {
  if (pt(e), lw)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += RT[e[n]];
  return t;
}
const Sn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Nh(e) {
  if (e >= Sn._0 && e <= Sn._9)
    return e - Sn._0;
  if (e >= Sn.A && e <= Sn.F)
    return e - (Sn.A - 10);
  if (e >= Sn.a && e <= Sn.f)
    return e - (Sn.a - 10);
}
function va(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (lw)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Nh(e.charCodeAt(s)), a = Nh(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function dn(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    pt(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function UT(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function bc(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const _T = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Gf = /* @__PURE__ */ BigInt(0), Nl = /* @__PURE__ */ BigInt(1);
function Aa(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function fw(e) {
  if (typeof e == "bigint") {
    if (!Wo(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    Jr(e);
  return e;
}
function xo(e) {
  const t = fw(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function dw(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? Gf : BigInt("0x" + e);
}
function Qi(e) {
  return dw(mc(e));
}
function hw(e) {
  return dw(mc(LT(pt(e)).reverse()));
}
function qf(e, t) {
  Jr(t), e = fw(e);
  const n = va(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function pw(e, t) {
  return qf(e, t).reverse();
}
function LT(e) {
  return Uint8Array.from(e);
}
function DT(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Wo = (e) => typeof e == "bigint" && Gf <= e;
function VT(e, t, n) {
  return Wo(e) && Wo(t) && Wo(n) && t <= e && e < n;
}
function MT(e, t, n, r) {
  if (!VT(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function HT(e) {
  let t;
  for (t = 0; e > Gf; e >>= Nl, t += 1)
    ;
  return t;
}
const Yf = (e) => (Nl << BigInt(e)) - Nl;
function FT(e, t, n) {
  if (Jr(e, "hashLen"), Jr(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, dn(c, ...g)), p = (g = i) => {
    u = h(s, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const m = [];
    for (; g < t; ) {
      c = h();
      const v = c.slice();
      m.push(v), g += c.length;
    }
    return dn(...m);
  };
  return (g, m) => {
    f(), p(g);
    let v;
    for (; !(v = m(y())); )
      p();
    return f(), v;
  };
}
function Zf(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, o, a) {
    const c = e[s];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${u}`);
  }
  const i = (s, o) => Object.entries(s).forEach(([a, c]) => r(a, c, o));
  i(t, !1), i(n, !0);
}
function Ph(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) */
const gw = {
  p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
  n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
  Gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
}, { p: ar, n: mr, Gx: WT, Gy: KT, b: yw } = gw, Mt = 32, ti = 64, ka = {
  publicKey: Mt + 1,
  publicKeyUncompressed: ti + 1,
  signature: ti,
  seed: Mt + Mt / 2
}, zT = (...e) => {
  "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(...e);
}, dt = (e = "") => {
  const t = new Error(e);
  throw zT(t, dt), t;
}, jT = (e) => typeof e == "bigint", GT = (e) => typeof e == "string", qT = (e) => e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array", he = (e, t, n = "") => {
  const r = qT(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    dt(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}, br = (e) => new Uint8Array(e), ww = (e, t) => e.toString(16).padStart(t, "0"), mw = (e) => Array.from(he(e)).map((t) => ww(t, 2)).join(""), vn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 }, Rh = (e) => {
  if (e >= vn._0 && e <= vn._9)
    return e - vn._0;
  if (e >= vn.A && e <= vn.F)
    return e - (vn.A - 10);
  if (e >= vn.a && e <= vn.f)
    return e - (vn.a - 10);
}, bw = (e) => {
  const t = "hex invalid";
  if (!GT(e))
    return dt(t);
  const n = e.length, r = n / 2;
  if (n % 2)
    return dt(t);
  const i = br(r);
  for (let s = 0, o = 0; s < r; s++, o += 2) {
    const a = Rh(e.charCodeAt(o)), c = Rh(e.charCodeAt(o + 1));
    if (a === void 0 || c === void 0)
      return dt(t);
    i[s] = a * 16 + c;
  }
  return i;
}, Ew = () => globalThis?.crypto, Uh = () => Ew()?.subtle ?? dt("crypto.subtle must be defined, consider polyfill"), mn = (...e) => {
  const t = br(e.reduce((r, i) => r + he(i).length, 0));
  let n = 0;
  return e.forEach((r) => {
    t.set(r, n), n += r.length;
  }), t;
}, Ec = (e = Mt) => Ew().getRandomValues(br(e)), js = BigInt, ei = (e, t, n, r = "bad number: out of range") => jT(e) && t <= e && e < n ? e : dt(r), Z = (e, t = ar) => {
  const n = e % t;
  return n >= 0n ? n : t + n;
}, Pn = (e) => Z(e, mr), Tw = (e, t) => {
  (e === 0n || t <= 0n) && dt("no inverse n=" + e + " mod=" + t);
  let n = Z(e, t), r = t, i = 0n, s = 1n;
  for (; n !== 0n; ) {
    const o = r / n, a = r % n, c = i - s * o;
    r = n, n = a, i = s, s = c;
  }
  return r === 1n ? Z(i, t) : dt("no inverse");
}, xw = (e) => {
  const t = xc[e];
  return typeof t != "function" && dt("hashes." + e + " not set"), t;
}, Cu = (e) => e instanceof oi ? e : dt("Point expected"), Sw = (e) => Z(Z(e * e) * e + yw), _h = (e) => ei(e, 0n, ar), Ko = (e) => ei(e, 1n, ar), Pl = (e) => ei(e, 1n, mr), Pi = (e) => (e & 1n) === 0n, Tc = (e) => Uint8Array.of(e), YT = (e) => Tc(Pi(e) ? 2 : 3), vw = (e) => {
  const t = Sw(Ko(e));
  let n = 1n;
  for (let r = t, i = (ar + 1n) / 4n; i > 0n; i >>= 1n)
    i & 1n && (n = n * r % ar), r = r * r % ar;
  return Z(n * n) === t ? n : dt("sqrt invalid");
};
let oi = class Pr {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(t, n, r) {
    this.X = _h(t), this.Y = Ko(n), this.Z = _h(r), Object.freeze(this);
  }
  static CURVE() {
    return gw;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(t) {
    const { x: n, y: r } = t;
    return n === 0n && r === 0n ? Rr : new Pr(n, r, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(t) {
    he(t);
    const { publicKey: n, publicKeyUncompressed: r } = ka;
    let i;
    const s = t.length, o = t[0], a = t.subarray(1), c = Ri(a, 0, Mt);
    if (s === n && (o === 2 || o === 3)) {
      let u = vw(c);
      const l = Pi(u);
      Pi(js(o)) !== l && (u = Z(-u)), i = new Pr(c, u, 1n);
    }
    return s === r && o === 4 && (i = new Pr(c, Ri(a, Mt, ti), 1n)), i ? i.assertValidity() : dt("bad point: not on curve");
  }
  static fromHex(t) {
    return Pr.fromBytes(bw(t));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = Cu(t), c = Z(n * a), u = Z(s * i), l = Z(r * a), f = Z(o * i);
    return c === u && l === f;
  }
  is0() {
    return this.equals(Rr);
  }
  /** Flip point over y coordinate. */
  negate() {
    return new Pr(this.X, Z(-this.Y), this.Z);
  }
  /** Point doubling: P+P, complete formula. */
  double() {
    return this.add(this);
  }
  /**
   * Point addition: P+Q, complete, exception-free formula
   * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
   * Cost: `12M + 0S + 3*a + 3*b3 + 23add`.
   */
  // prettier-ignore
  add(t) {
    const { X: n, Y: r, Z: i } = this, { X: s, Y: o, Z: a } = Cu(t), c = 0n, u = yw;
    let l = 0n, f = 0n, h = 0n;
    const p = Z(u * 3n);
    let y = Z(n * s), d = Z(r * o), g = Z(i * a), m = Z(n + r), v = Z(s + o);
    m = Z(m * v), v = Z(y + d), m = Z(m - v), v = Z(n + i);
    let k = Z(s + a);
    return v = Z(v * k), k = Z(y + g), v = Z(v - k), k = Z(r + i), l = Z(o + a), k = Z(k * l), l = Z(d + g), k = Z(k - l), h = Z(c * v), l = Z(p * g), h = Z(l + h), l = Z(d - h), h = Z(d + h), f = Z(l * h), d = Z(y + y), d = Z(d + y), g = Z(c * g), v = Z(p * v), d = Z(d + g), g = Z(y - g), g = Z(c * g), v = Z(v + g), y = Z(d * v), f = Z(f + y), y = Z(k * v), l = Z(m * l), l = Z(l - y), y = Z(m * d), h = Z(k * h), h = Z(h + y), new Pr(l, f, h);
  }
  subtract(t) {
    return this.add(Cu(t).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate side-channel leakage.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(t, n = !0) {
    if (!n && t === 0n)
      return Rr;
    if (Pl(t), t === 1n)
      return this;
    if (this.equals(Er))
      return Tx(t).p;
    let r = Rr, i = Er;
    for (let s = this; t > 0n; s = s.double(), t >>= 1n)
      t & 1n ? r = r.add(s) : n && (i = i.add(s));
    return r;
  }
  multiplyUnsafe(t) {
    return this.multiply(t, !1);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: t, Y: n, Z: r } = this;
    if (this.equals(Rr))
      return { x: 0n, y: 0n };
    if (r === 1n)
      return { x: t, y: n };
    const i = Tw(r, ar);
    return Z(r * i) !== 1n && dt("inverse invalid"), { x: Z(t * i), y: Z(n * i) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x: t, y: n } = this.toAffine();
    return Ko(t), Ko(n), Z(n * n) === Sw(t) ? this : dt("bad point: not on curve");
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(t = !0) {
    const { x: n, y: r } = this.assertValidity().toAffine(), i = me(n);
    return t ? mn(YT(r), i) : mn(Tc(4), i, me(r));
  }
  toHex(t) {
    return mw(this.toBytes(t));
  }
};
const Er = new oi(WT, KT, 1n), Rr = new oi(0n, 1n, 0n);
oi.BASE = Er;
oi.ZERO = Rr;
const ZT = (e, t, n) => Er.multiply(t, !1).add(e.multiply(n, !1)).assertValidity(), kr = (e) => js("0x" + (mw(e) || "0")), Ri = (e, t, n) => kr(e.subarray(t, n)), XT = 2n ** 256n, me = (e) => bw(ww(ei(e, 0n, XT), ti)), Aw = (e) => {
  const t = kr(he(e, Mt, "secret key"));
  return ei(t, 1n, mr, "invalid secret key: outside of range");
}, kw = (e) => e > mr >> 1n, QT = (e) => {
  [0, 1, 2, 3].includes(e) || dt("recovery id must be valid and present");
}, JT = (e) => {
  e != null && !Lh.includes(e) && dt(`Signature format must be one of: ${Lh.join(", ")}`), e === $w && dt('Signature format "der" is not supported: switch to noble-curves');
}, tx = (e, t = Ui) => {
  JT(t);
  const n = ka.signature, r = n + 1;
  let i = `Signature format "${t}" expects Uint8Array with length `;
  t === Ui && e.length !== n && dt(i + n), t === $a && e.length !== r && dt(i + r);
};
class Ia {
  r;
  s;
  recovery;
  constructor(t, n, r) {
    this.r = Pl(t), this.s = Pl(n), r != null && (this.recovery = r), Object.freeze(this);
  }
  static fromBytes(t, n = Ui) {
    tx(t, n);
    let r;
    n === $a && (r = t[0], t = t.subarray(1));
    const i = Ri(t, 0, Mt), s = Ri(t, Mt, ti);
    return new Ia(i, s, r);
  }
  addRecoveryBit(t) {
    return new Ia(this.r, this.s, t);
  }
  hasHighS() {
    return kw(this.s);
  }
  toBytes(t = Ui) {
    const { r: n, s: r, recovery: i } = this, s = mn(me(n), me(r));
    return t === $a ? (QT(i), mn(Uint8Array.of(i), s)) : s;
  }
}
const Iw = (e) => {
  const t = e.length * 8 - 256;
  t > 1024 && dt("msg invalid");
  const n = kr(e);
  return t > 0 ? n >> js(t) : n;
}, ex = (e) => Pn(Iw(he(e))), Ui = "compact", $a = "recovered", $w = "der", Lh = [Ui, $a, $w], Dh = {
  lowS: !0,
  prehash: !0,
  format: Ui,
  extraEntropy: !1
}, Vh = "SHA-256", xc = {
  hmacSha256Async: async (e, t) => {
    const n = Uh(), r = "HMAC", i = await n.importKey("raw", e, { name: r, hash: { name: Vh } }, !1, ["sign"]);
    return br(await n.sign(r, i, t));
  },
  hmacSha256: void 0,
  sha256Async: async (e) => br(await Uh().digest(Vh, e)),
  sha256: void 0
}, nx = (e, t, n) => (he(e, void 0, "message"), t.prehash ? n ? xc.sha256Async(e) : xw("sha256")(e) : e), rx = br(0), ix = Tc(0), sx = Tc(1), ox = 1e3, ax = "drbg: tried max amount of iterations", cx = async (e, t) => {
  let n = br(Mt), r = br(Mt), i = 0;
  const s = () => {
    n.fill(1), r.fill(0);
  }, o = (...l) => xc.hmacSha256Async(r, mn(n, ...l)), a = async (l = rx) => {
    r = await o(ix, l), n = await o(), l.length !== 0 && (r = await o(sx, l), n = await o());
  }, c = async () => (i++ >= ox && dt(ax), n = await o(), n);
  s(), await a(e);
  let u;
  for (; !(u = t(await c())); )
    await a();
  return s(), u;
}, ux = (e, t, n, r) => {
  let { lowS: i, extraEntropy: s } = n;
  const o = me, a = ex(e), c = o(a), u = Aw(t), l = [o(u), c];
  if (s != null && s !== !1) {
    const y = s === !0 ? Ec(Mt) : s;
    l.push(he(y, void 0, "extraEntropy"));
  }
  const f = mn(...l), h = a;
  return r(f, (y) => {
    const d = Iw(y);
    if (!(1n <= d && d < mr))
      return;
    const g = Tw(d, mr), m = Er.multiply(d).toAffine(), v = Pn(m.x);
    if (v === 0n)
      return;
    const k = Pn(g * Pn(h + v * u));
    if (k === 0n)
      return;
    let C = (m.x === v ? 0 : 2) | Number(m.y & 1n), L = k;
    return i && kw(k) && (L = Pn(-k), C ^= 1), new Ia(v, L, C).toBytes(n.format);
  });
}, lx = (e) => {
  const t = {};
  return Object.keys(Dh).forEach((n) => {
    t[n] = e[n] ?? Dh[n];
  }), t;
}, fx = async (e, t, n = {}) => (n = lx(n), e = await nx(e, n, !0), ux(e, t, n, cx)), dx = (e = Ec(ka.seed)) => {
  he(e), (e.length < ka.seed || e.length > 1024) && dt("expected 40-1024b");
  const t = Z(kr(e), mr - 1n);
  return me(t + 1n);
}, hx = (e) => (t) => {
  const n = dx(t);
  return { secretKey: n, publicKey: e(n) };
}, Cw = (e) => Uint8Array.from("BIP0340/" + e, (t) => t.charCodeAt(0)), Ow = "aux", Bw = "nonce", Nw = "challenge", Rl = (e, ...t) => {
  const n = xw("sha256"), r = n(Cw(e));
  return n(mn(r, r, ...t));
}, Ul = async (e, ...t) => {
  const n = xc.sha256Async, r = await n(Cw(e));
  return await n(mn(r, r, ...t));
}, Xf = (e) => {
  const t = Aw(e), n = Er.multiply(t), { x: r, y: i } = n.assertValidity().toAffine(), s = Pi(i) ? t : Pn(-t), o = me(r);
  return { d: s, px: o };
}, Qf = (e) => Pn(kr(e)), Pw = (...e) => Qf(Rl(Nw, ...e)), Rw = async (...e) => Qf(await Ul(Nw, ...e)), Uw = (e) => Xf(e).px, px = hx(Uw), _w = (e, t, n) => {
  const { px: r, d: i } = Xf(t);
  return { m: he(e), px: r, d: i, a: he(n, Mt) };
}, Lw = (e) => {
  const t = Qf(e);
  t === 0n && dt("sign failed: k is zero");
  const { px: n, d: r } = Xf(me(t));
  return { rx: n, k: r };
}, Dw = (e, t, n, r) => mn(t, me(Pn(e + n * r))), Vw = "invalid signature produced", gx = (e, t, n = Ec(Mt)) => {
  const { m: r, px: i, d: s, a: o } = _w(e, t, n), a = Rl(Ow, o), c = me(s ^ kr(a)), u = Rl(Bw, c, i, r), { rx: l, k: f } = Lw(u), h = Pw(l, i, r), p = Dw(f, l, h, s);
  return Hw(p, r, i) || dt(Vw), p;
}, yx = async (e, t, n = Ec(Mt)) => {
  const { m: r, px: i, d: s, a: o } = _w(e, t, n), a = await Ul(Ow, o), c = me(s ^ kr(a)), u = await Ul(Bw, c, i, r), { rx: l, k: f } = Lw(u), h = await Rw(l, i, r), p = Dw(f, l, h, s);
  return await Fw(p, r, i) || dt(Vw), p;
}, wx = (e, t) => e instanceof Promise ? e.then(t) : t(e), Mw = (e, t, n, r) => {
  const i = he(e, ti, "signature"), s = he(t, void 0, "message"), o = he(n, Mt, "publicKey");
  try {
    const a = kr(o), c = vw(a), u = Pi(c) ? c : Z(-c), l = new oi(a, u, 1n).assertValidity(), f = me(l.toAffine().x), h = Ri(i, 0, Mt);
    ei(h, 1n, ar);
    const p = Ri(i, Mt, ti);
    ei(p, 1n, mr);
    const y = mn(me(h), f, s);
    return wx(r(y), (d) => {
      const { x: g, y: m } = ZT(l, p, Pn(-d)).toAffine();
      return !(!Pi(m) || g !== h);
    });
  } catch {
    return !1;
  }
}, Hw = (e, t, n) => Mw(e, t, n, Pw), Fw = async (e, t, n) => Mw(e, t, n, Rw), mx = {
  keygen: px,
  getPublicKey: Uw,
  sign: gx,
  verify: Hw,
  signAsync: yx,
  verifyAsync: Fw
}, Ca = 8, bx = 256, Ww = Math.ceil(bx / Ca) + 1, _l = 2 ** (Ca - 1), Ex = () => {
  const e = [];
  let t = Er, n = t;
  for (let r = 0; r < Ww; r++) {
    n = t, e.push(n);
    for (let i = 1; i < _l; i++)
      n = n.add(t), e.push(n);
    t = n.double();
  }
  return e;
};
let Mh;
const Hh = (e, t) => {
  const n = t.negate();
  return e ? n : t;
}, Tx = (e) => {
  const t = Mh || (Mh = Ex());
  let n = Rr, r = Er;
  const i = 2 ** Ca, s = i, o = js(i - 1), a = js(Ca);
  for (let c = 0; c < Ww; c++) {
    let u = Number(e & o);
    e >>= a, u > _l && (u -= s, e += 1n);
    const l = c * _l, f = l, h = l + Math.abs(u) - 1, p = c % 2 !== 0, y = u < 0;
    u === 0 ? r = r.add(Hh(p, t[f])) : n = n.add(Hh(y, t[h]));
  }
  return e !== 0n && dt("invalid wnaf"), { p: n, f: r };
};
function xx(e, t, n) {
  return e & t ^ ~e & n;
}
function Sx(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
let vx = class {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = !1;
  length = 0;
  pos = 0;
  destroyed = !1;
  constructor(t, n, r, i) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = $u(this.buffer);
  }
  update(t) {
    xa(this), pt(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = $u(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    xa(this), PT(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Sa(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = $u(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = s, t.length = i, t.pos = a, i % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
};
const zn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), Ax = /* @__PURE__ */ Uint32Array.from([
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
]), jn = /* @__PURE__ */ new Uint32Array(64);
let kx = class extends vx {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: i, E: s, F: o, G: a, H: c } = this;
    return [t, n, r, i, s, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, i, s, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let f = 0; f < 16; f++, n += 4)
      jn[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = jn[f - 15], p = jn[f - 2], y = tn(h, 7) ^ tn(h, 18) ^ h >>> 3, d = tn(p, 17) ^ tn(p, 19) ^ p >>> 10;
      jn[f] = d + jn[f - 7] + y + jn[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = tn(a, 6) ^ tn(a, 11) ^ tn(a, 25), p = l + h + xx(a, c, u) + Ax[f] + jn[f] | 0, d = (tn(r, 2) ^ tn(r, 13) ^ tn(r, 22)) + Sx(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Sa(jn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Sa(this.buffer);
  }
}, Ix = class extends kx {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = zn[0] | 0;
  B = zn[1] | 0;
  C = zn[2] | 0;
  D = zn[3] | 0;
  E = zn[4] | 0;
  F = zn[5] | 0;
  G = zn[6] | 0;
  H = zn[7] | 0;
  constructor() {
    super(32);
  }
};
const Ll = /* @__PURE__ */ UT(
  () => new Ix(),
  /* @__PURE__ */ _T(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const te = /* @__PURE__ */ BigInt(0), Yt = /* @__PURE__ */ BigInt(1), Hr = /* @__PURE__ */ BigInt(2), Kw = /* @__PURE__ */ BigInt(3), zw = /* @__PURE__ */ BigInt(4), jw = /* @__PURE__ */ BigInt(5), $x = /* @__PURE__ */ BigInt(7), Gw = /* @__PURE__ */ BigInt(8), Cx = /* @__PURE__ */ BigInt(9), qw = /* @__PURE__ */ BigInt(16);
function _e(e, t) {
  const n = e % t;
  return n >= te ? n : t + n;
}
function xe(e, t, n) {
  let r = e;
  for (; t-- > te; )
    r *= r, r %= n;
  return r;
}
function Fh(e, t) {
  if (e === te)
    throw new Error("invert: expected non-zero number");
  if (t <= te)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = _e(e, t), r = t, i = te, s = Yt;
  for (; n !== te; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Yt)
    throw new Error("invert: does not exist");
  return _e(i, t);
}
function Jf(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function Yw(e, t) {
  const n = (e.ORDER + Yt) / zw, r = e.pow(t, n);
  return Jf(e, r, t), r;
}
function Ox(e, t) {
  const n = (e.ORDER - jw) / Gw, r = e.mul(t, Hr), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Hr), i), a = e.mul(s, e.sub(o, e.ONE));
  return Jf(e, a, t), a;
}
function Bx(e) {
  const t = Sc(e), n = Zw(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + $x) / qw;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return Jf(a, g, c), g;
  };
}
function Zw(e) {
  if (e < Kw)
    throw new Error("sqrt is not defined for small field");
  let t = e - Yt, n = 0;
  for (; t % Hr === te; )
    t /= Hr, n++;
  let r = Hr;
  const i = Sc(e);
  for (; Wh(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return Yw;
  let s = i.pow(r, t);
  const o = (t + Yt) / Hr;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (Wh(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = Yt << BigInt(l - y - 1), m = c.pow(f, g);
      l = y, f = c.sqr(m), h = c.mul(h, f), p = c.mul(p, m);
    }
    return p;
  };
}
function Nx(e) {
  return e % zw === Kw ? Yw : e % Gw === jw ? Ox : e % qw === Cx ? Bx(e) : Zw(e);
}
const Px = [
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
function Rx(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = Px.reduce((r, i) => (r[i] = "function", r), t);
  return Zf(e, n), e;
}
function Ux(e, t, n) {
  if (n < te)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === te)
    return e.ONE;
  if (n === Yt)
    return t;
  let r = e.ONE, i = t;
  for (; n > te; )
    n & Yt && (r = e.mul(r, i)), i = e.sqr(i), n >>= Yt;
  return r;
}
function Xw(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function Wh(e, t) {
  const n = (e.ORDER - Yt) / Hr, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function _x(e, t) {
  t !== void 0 && Jr(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
let Lx = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = te;
  ONE = Yt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= te)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = _x(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return _e(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return te <= t && t < this.ORDER;
  }
  is0(t) {
    return t === te;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Yt) === Yt;
  }
  neg(t) {
    return _e(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return _e(t * t, this.ORDER);
  }
  add(t, n) {
    return _e(t + n, this.ORDER);
  }
  sub(t, n) {
    return _e(t - n, this.ORDER);
  }
  mul(t, n) {
    return _e(t * n, this.ORDER);
  }
  pow(t, n) {
    return Ux(this, t, n);
  }
  div(t, n) {
    return _e(t * Fh(n, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, n) {
    return t + n;
  }
  subN(t, n) {
    return t - n;
  }
  mulN(t, n) {
    return t * n;
  }
  inv(t) {
    return Fh(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = Nx(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? pw(t, this.BYTES) : qf(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    pt(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? hw(t) : Qi(t);
    if (a && (c = _e(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return Xw(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
};
function Sc(e, t = {}) {
  return new Lx(e, t);
}
function Qw(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function Jw(e) {
  const t = Qw(e);
  return t + Math.ceil(t / 2);
}
function tm(e, t, n = !1) {
  pt(e);
  const r = e.length, i = Qw(t), s = Jw(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? hw(e) : Qi(e), a = _e(o, t - Yt) + Yt;
  return n ? pw(a, i) : qf(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _i = /* @__PURE__ */ BigInt(0), Fr = /* @__PURE__ */ BigInt(1);
function Oa(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Kh(e, t) {
  const n = Xw(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function em(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function Ou(e, t) {
  em(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = Yf(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function zh(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += Fr);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const Bu = /* @__PURE__ */ new WeakMap(), nm = /* @__PURE__ */ new WeakMap();
function Nu(e) {
  return nm.get(e) || 1;
}
function jh(e) {
  if (e !== _i)
    throw new Error("invalid wNAF");
}
let Dx = class {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, n) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = n;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, n, r = this.ZERO) {
    let i = t;
    for (; n > _i; )
      n & Fr && (r = r.add(i)), i = i.double(), n >>= Fr;
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
  precomputeWindow(t, n) {
    const { windows: r, windowSize: i } = Ou(n, this.bits), s = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, s.push(a);
      for (let u = 1; u < i; u++)
        a = a.add(o), s.push(a);
      o = a.double();
    }
    return s;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(t, n, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let i = this.ZERO, s = this.BASE;
    const o = Ou(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = zh(r, a, o);
      r = c, l ? s = s.add(Oa(h, n[p])) : i = i.add(Oa(f, n[u]));
    }
    return jh(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = Ou(t, this.bits);
    for (let o = 0; o < s.windows && r !== _i; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = zh(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return jh(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Bu.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Bu.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = Nu(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = Nu(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    em(n, this.bits), nm.set(t, n), Bu.delete(t);
  }
  hasCache(t) {
    return Nu(t) !== 1;
  }
};
function Vx(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > _i || r > _i; )
    n & Fr && (s = s.add(i)), r & Fr && (o = o.add(i)), i = i.double(), n >>= Fr, r >>= Fr;
  return { p1: s, p2: o };
}
function Gh(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return Rx(t), t;
  } else
    return Sc(e, { isLE: n });
}
function Mx(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > _i))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = Gh(t.p, n.Fp, r), s = Gh(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function rm(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
let im = class {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (uw(t), pt(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Sa(i);
  }
  update(t) {
    return xa(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    xa(this), pt(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = i, t.destroyed = s, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
};
const sm = (e, t, n) => new im(e, t).update(n).digest();
sm.create = (e, t) => new im(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const qh = (e, t) => (e + (e >= 0 ? t : -t) / om) / t;
function Hx(e, t, n) {
  const [[r, i], [s, o]] = t, a = qh(o * e, n), c = qh(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < Rn, h = l < Rn;
  f && (u = -u), h && (l = -l);
  const p = Yf(Math.ceil(HT(n) / 2)) + Ti;
  if (u < Rn || u >= p || l < Rn || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function Dl(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Pu(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Aa(n.lowS, "lowS"), Aa(n.prehash, "prehash"), n.format !== void 0 && Dl(n.format), n;
}
let Fx = class extends Error {
  constructor(t = "") {
    super(t);
  }
};
const Xn = {
  // asn.1 DER encoding utils
  Err: Fx,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Xn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = xo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? xo(i.length / 2 | 128) : "";
      return xo(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Xn;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const i = t[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const c = i & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Xn;
      if (e < Rn)
        throw new t("integer: negative integers are not allowed");
      let n = xo(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Xn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Qi(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Xn, i = pt(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Xn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, Rn = BigInt(0), Ti = BigInt(1), om = BigInt(2), So = BigInt(3), Wx = BigInt(4);
function Kx(e, t = {}) {
  const n = Mx("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  Zf(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(s.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = cm(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(M, x, T) {
    const { x: E, y: A } = x.toAffine(), $ = r.toBytes(E);
    if (Aa(T, "isCompressed"), T) {
      l();
      const B = !r.isOdd(A);
      return dn(am(B), $);
    } else
      return dn(Uint8Array.of(4), $, r.toBytes(A));
  }
  function h(M) {
    pt(M, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: T } = u, E = M.length, A = M[0], $ = M.subarray(1);
    if (E === x && (A === 2 || A === 3)) {
      const B = r.fromBytes($);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const O = d(B);
      let I;
      try {
        I = r.sqrt(O);
      } catch (q) {
        const K = q instanceof Error ? ": " + q.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + K);
      }
      l();
      const N = r.isOdd(I);
      return (A & 1) === 1 !== N && (I = r.neg(I)), { x: B, y: I };
    } else if (E === T && A === 4) {
      const B = r.BYTES, O = r.fromBytes($.subarray(0, B)), I = r.fromBytes($.subarray(B, B * 2));
      if (!g(O, I))
        throw new Error("bad point: is not on curve");
      return { x: O, y: I };
    } else
      throw new Error(`bad point: got length ${E}, expected compressed=${x} or uncompressed=${T}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(M) {
    const x = r.sqr(M), T = r.mul(x, M);
    return r.add(r.add(T, r.mul(M, s.a)), s.b);
  }
  function g(M, x) {
    const T = r.sqr(x), E = d(M);
    return r.eql(T, E);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, So), Wx), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, v)))
    throw new Error("bad curve params: a or b");
  function k(M, x, T = !1) {
    if (!r.isValid(x) || T && r.is0(x))
      throw new Error(`bad point coordinate ${M}`);
    return x;
  }
  function C(M) {
    if (!(M instanceof D))
      throw new Error("Weierstrass Point expected");
  }
  function L(M) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return Hx(M, c.basises, i.ORDER);
  }
  const G = Ph((M, x) => {
    const { X: T, Y: E, Z: A } = M;
    if (r.eql(A, r.ONE))
      return { x: T, y: E };
    const $ = M.is0();
    x == null && (x = $ ? r.ONE : r.inv(A));
    const B = r.mul(T, x), O = r.mul(E, x), I = r.mul(A, x);
    if ($)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(I, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: O };
  }), b = Ph((M) => {
    if (M.is0()) {
      if (t.allowInfinityPoint && !r.is0(M.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: T } = M.toAffine();
    if (!r.isValid(x) || !r.isValid(T))
      throw new Error("bad point: x or y not field elements");
    if (!g(x, T))
      throw new Error("bad point: equation left != right");
    if (!M.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Y(M, x, T, E, A) {
    return T = new D(r.mul(T.X, M), T.Y, T.Z), x = Oa(E, x), T = Oa(A, T), x.add(T);
  }
  class D {
    // base / generator point
    static BASE = new D(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new D(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, T, E) {
      this.X = k("x", x), this.Y = k("y", T, !0), this.Z = k("z", E), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: T, y: E } = x || {};
      if (!x || !r.isValid(T) || !r.isValid(E))
        throw new Error("invalid affine point");
      if (x instanceof D)
        throw new Error("projective point not allowed");
      return r.is0(T) && r.is0(E) ? D.ZERO : new D(T, E, r.ONE);
    }
    static fromBytes(x) {
      const T = D.fromAffine(y(pt(x, void 0, "point")));
      return T.assertValidity(), T;
    }
    static fromHex(x) {
      return D.fromBytes(va(x));
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
    precompute(x = 8, T = !0) {
      return rt.createCache(this, x), T || this.multiply(So), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x, I = r.eql(r.mul(T, O), r.mul($, A)), N = r.eql(r.mul(E, O), r.mul(B, A));
      return I && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new D(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: T } = s, E = r.mul(T, So), { X: A, Y: $, Z: B } = this;
      let O = r.ZERO, I = r.ZERO, N = r.ZERO, R = r.mul(A, A), q = r.mul($, $), K = r.mul(B, B), V = r.mul(A, $);
      return V = r.add(V, V), N = r.mul(A, B), N = r.add(N, N), O = r.mul(x, N), I = r.mul(E, K), I = r.add(O, I), O = r.sub(q, I), I = r.add(q, I), I = r.mul(O, I), O = r.mul(V, O), N = r.mul(E, N), K = r.mul(x, K), V = r.sub(R, K), V = r.mul(x, V), V = r.add(V, N), N = r.add(R, R), R = r.add(N, R), R = r.add(R, K), R = r.mul(R, V), I = r.add(I, R), K = r.mul($, B), K = r.add(K, K), R = r.mul(K, V), O = r.sub(O, R), N = r.mul(K, q), N = r.add(N, N), N = r.add(N, N), new D(O, I, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x;
      let I = r.ZERO, N = r.ZERO, R = r.ZERO;
      const q = s.a, K = r.mul(s.b, So);
      let V = r.mul(T, $), z = r.mul(E, B), X = r.mul(A, O), st = r.add(T, E), j = r.add($, B);
      st = r.mul(st, j), j = r.add(V, z), st = r.sub(st, j), j = r.add(T, A);
      let Q = r.add($, O);
      return j = r.mul(j, Q), Q = r.add(V, X), j = r.sub(j, Q), Q = r.add(E, A), I = r.add(B, O), Q = r.mul(Q, I), I = r.add(z, X), Q = r.sub(Q, I), R = r.mul(q, j), I = r.mul(K, X), R = r.add(I, R), I = r.sub(z, R), R = r.add(z, R), N = r.mul(I, R), z = r.add(V, V), z = r.add(z, V), X = r.mul(q, X), j = r.mul(K, j), z = r.add(z, X), X = r.sub(V, X), X = r.mul(q, X), j = r.add(j, X), V = r.mul(z, j), N = r.add(N, V), V = r.mul(Q, j), I = r.mul(st, I), I = r.sub(I, V), V = r.mul(st, z), R = r.mul(Q, R), R = r.add(R, V), new D(I, N, R);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(D.ZERO);
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
    multiply(x) {
      const { endo: T } = t;
      if (!i.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let E, A;
      const $ = (B) => rt.cached(this, B, (O) => Kh(D, O));
      if (T) {
        const { k1neg: B, k1: O, k2neg: I, k2: N } = L(x), { p: R, f: q } = $(O), { p: K, f: V } = $(N);
        A = q.add(V), E = Y(T.beta, R, K, B, I);
      } else {
        const { p: B, f: O } = $(x);
        E = B, A = O;
      }
      return Kh(D, [E, A])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: T } = t, E = this;
      if (!i.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === Rn || E.is0())
        return D.ZERO;
      if (x === Ti)
        return E;
      if (rt.hasCache(this))
        return this.multiply(x);
      if (T) {
        const { k1neg: A, k1: $, k2neg: B, k2: O } = L(x), { p1: I, p2: N } = Vx(D, E, $, O);
        return Y(T.beta, I, N, A, B);
      } else
        return rt.unsafe(E, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return G(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === Ti ? !0 : x ? x(D, this) : rt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === Ti ? this : x ? x(D, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return Aa(x, "isCompressed"), this.assertValidity(), p(D, this, x);
    }
    toHex(x = !0) {
      return mc(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const S = i.BITS, rt = new Dx(D, t.endo ? Math.ceil(S / 2) : S);
  return D.BASE.precompute(8), D;
}
function am(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function cm(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function zx(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || bc, i = Object.assign(cm(e.Fp, n), { seed: Jw(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== d || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return tm(pt(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!jf(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const m = pt(p, void 0, "key").length;
    return m === d || m === g;
  }
  function l(p, y, d = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(d);
  }
  const f = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = rm(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function jx(e, t, n = {}) {
  uw(t), Zf(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || bc, i = n.hmac || ((T, E) => sm(t, T, E)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = zx(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * om < s.ORDER;
  function g(T) {
    const E = a >> Ti;
    return T > E;
  }
  function m(T, E) {
    if (!o.isValidNot0(E))
      throw new Error(`invalid signature ${T}: out of range 1..Point.Fn.ORDER`);
    return E;
  }
  function v() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function k(T, E) {
    Dl(E);
    const A = p.signature, $ = E === "compact" ? A : E === "recovered" ? A + 1 : void 0;
    return pt(T, $);
  }
  class C {
    r;
    s;
    recovery;
    constructor(E, A, $) {
      if (this.r = m("r", E), this.s = m("s", A), $ != null) {
        if (v(), ![0, 1, 2, 3].includes($))
          throw new Error("invalid recovery id");
        this.recovery = $;
      }
      Object.freeze(this);
    }
    static fromBytes(E, A = y.format) {
      k(E, A);
      let $;
      if (A === "der") {
        const { r: N, s: R } = Xn.toSig(pt(E));
        return new C(N, R);
      }
      A === "recovered" && ($ = E[0], A = "compact", E = E.subarray(1));
      const B = p.signature / 2, O = E.subarray(0, B), I = E.subarray(B, B * 2);
      return new C(o.fromBytes(O), o.fromBytes(I), $);
    }
    static fromHex(E, A) {
      return this.fromBytes(va(E), A);
    }
    assertRecovery() {
      const { recovery: E } = this;
      if (E == null)
        throw new Error("invalid recovery id: must be present");
      return E;
    }
    addRecoveryBit(E) {
      return new C(this.r, this.s, E);
    }
    recoverPublicKey(E) {
      const { r: A, s: $ } = this, B = this.assertRecovery(), O = B === 2 || B === 3 ? A + a : A;
      if (!s.isValid(O))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const I = s.toBytes(O), N = e.fromBytes(dn(am((B & 1) === 0), I)), R = o.inv(O), q = G(pt(E, void 0, "msgHash")), K = o.create(-q * R), V = o.create($ * R), z = e.BASE.multiplyUnsafe(K).add(N.multiplyUnsafe(V));
      if (z.is0())
        throw new Error("invalid recovery: point at infinify");
      return z.assertValidity(), z;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(E = y.format) {
      if (Dl(E), E === "der")
        return va(Xn.hexFromSig(this));
      const { r: A, s: $ } = this, B = o.toBytes(A), O = o.toBytes($);
      return E === "recovered" ? (v(), dn(Uint8Array.of(this.assertRecovery()), B, O)) : dn(B, O);
    }
    toHex(E) {
      return mc(this.toBytes(E));
    }
  }
  const L = n.bits2int || function(E) {
    if (E.length > 8192)
      throw new Error("input is too large");
    const A = Qi(E), $ = E.length * 8 - c;
    return $ > 0 ? A >> BigInt($) : A;
  }, G = n.bits2int_modN || function(E) {
    return o.create(L(E));
  }, b = Yf(c);
  function Y(T) {
    return MT("num < 2^" + c, T, Rn, b), o.toBytes(T);
  }
  function D(T, E) {
    return pt(T, void 0, "message"), E ? pt(t(T), void 0, "prehashed message") : T;
  }
  function S(T, E, A) {
    const { lowS: $, prehash: B, extraEntropy: O } = Pu(A, y);
    T = D(T, B);
    const I = G(T), N = o.fromBytes(E);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const R = [Y(N), Y(I)];
    if (O != null && O !== !1) {
      const z = O === !0 ? r(p.secretKey) : O;
      R.push(pt(z, void 0, "extraEntropy"));
    }
    const q = dn(...R), K = I;
    function V(z) {
      const X = L(z);
      if (!o.isValidNot0(X))
        return;
      const st = o.inv(X), j = e.BASE.multiply(X).toAffine(), Q = o.create(j.x);
      if (Q === Rn)
        return;
      const Pt = o.create(st * o.create(K + Q * N));
      if (Pt === Rn)
        return;
      let be = (j.x === Q ? 0 : 2) | Number(j.y & Ti), Ee = Pt;
      return $ && g(Pt) && (Ee = o.neg(Pt), be ^= 1), new C(Q, Ee, d ? void 0 : be);
    }
    return { seed: q, k2sig: V };
  }
  function rt(T, E, A = {}) {
    const { seed: $, k2sig: B } = S(T, E, A);
    return FT(t.outputLen, o.BYTES, i)($, B).toBytes(A.format);
  }
  function M(T, E, A, $ = {}) {
    const { lowS: B, prehash: O, format: I } = Pu($, y);
    if (A = pt(A, void 0, "publicKey"), E = D(E, O), !jf(T)) {
      const N = T instanceof C ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    k(T, I);
    try {
      const N = C.fromBytes(T, I), R = e.fromBytes(A);
      if (B && N.hasHighS())
        return !1;
      const { r: q, s: K } = N, V = G(E), z = o.inv(K), X = o.create(V * z), st = o.create(q * z), j = e.BASE.multiplyUnsafe(X).add(R.multiplyUnsafe(st));
      return j.is0() ? !1 : o.create(j.x) === q;
    } catch {
      return !1;
    }
  }
  function x(T, E, A = {}) {
    const { prehash: $ } = Pu(A, y);
    return E = D(E, $), C.fromBytes(T, "recovered").recoverPublicKey(E).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: rt,
    verify: M,
    recoverPublicKey: x,
    Signature: C,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const vc = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, Gx = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, qx = /* @__PURE__ */ BigInt(0), Vl = /* @__PURE__ */ BigInt(2);
function Yx(e) {
  const t = vc.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = xe(l, n, t) * l % t, h = xe(f, n, t) * l % t, p = xe(h, Vl, t) * u % t, y = xe(p, i, t) * p % t, d = xe(y, s, t) * y % t, g = xe(d, a, t) * d % t, m = xe(g, c, t) * g % t, v = xe(m, a, t) * d % t, k = xe(v, n, t) * l % t, C = xe(k, o, t) * y % t, L = xe(C, r, t) * u % t, G = xe(L, Vl, t);
  if (!Ba.eql(Ba.sqr(G), e))
    throw new Error("Cannot find square root");
  return G;
}
const Ba = Sc(vc.p, { sqrt: Yx }), ai = /* @__PURE__ */ Kx(vc, {
  Fp: Ba,
  endo: Gx
}), Yh = /* @__PURE__ */ jx(ai, Ll), Zh = {};
function Na(e, ...t) {
  let n = Zh[e];
  if (n === void 0) {
    const r = Ll(DT(e));
    n = dn(r, r), Zh[e] = n;
  }
  return Ll(dn(n, ...t));
}
const td = (e) => e.toBytes(!0).slice(1), ed = (e) => e % Vl === qx;
function Ml(e) {
  const { Fn: t, BASE: n } = ai, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: ed(i.y) ? r : t.neg(r), bytes: td(i) };
}
function um(e) {
  const t = Ba;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  ed(i) || (i = t.neg(i));
  const s = ai.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const Ts = Qi;
function lm(...e) {
  return ai.Fn.create(Ts(Na("BIP0340/challenge", ...e)));
}
function Xh(e) {
  return Ml(e).bytes;
}
function Zx(e, t, n = bc(32)) {
  const { Fn: r } = ai, i = pt(e, void 0, "message"), { bytes: s, scalar: o } = Ml(t), a = pt(n, 32, "auxRand"), c = r.toBytes(o ^ Ts(Na("BIP0340/aux", a))), u = Na("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = Ml(u), h = lm(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !fm(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function fm(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = ai, o = pt(e, 64, "signature"), a = pt(t, void 0, "message"), c = pt(n, 32, "publicKey");
  try {
    const u = um(Ts(c)), l = Ts(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = Ts(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = lm(i.toBytes(l), td(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !ed(d) || y !== l);
  } catch {
    return !1;
  }
}
const nd = /* @__PURE__ */ (() => {
  const n = (r = bc(48)) => tm(r, vc.n);
  return {
    keygen: rm(n, Xh),
    getPublicKey: Xh,
    sign: Zx,
    verify: fm,
    Point: ai,
    utils: {
      randomSecretKey: n,
      taggedHash: Na,
      lift_x: um,
      pointToBytes: td
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})();
function rd(e, t, n = {}) {
  e = Ol(e);
  const { aggPublicKey: r } = Bl(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = nd.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = Bl(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
class vo extends Error {
  constructor(t) {
    super(t), this.name = "PartialSignatureError";
  }
}
class id {
  constructor(t, n) {
    if (this.s = t, this.R = n, t.length !== 32)
      throw new vo("Invalid s length");
    if (n.length !== 33)
      throw new vo("Invalid R length");
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
  static decode(t) {
    if (t.length !== 32)
      throw new vo("Invalid partial signature length");
    if (Qi(t) >= oi.CURVE().n)
      throw new vo("s value overflows curve order");
    const r = new Uint8Array(33);
    return new id(t, r);
  }
}
function Xx(e, t, n, r, i, s) {
  let o;
  if (s?.taprootTweak !== void 0) {
    const { preTweakedKey: u } = rd(Ol(r));
    o = nd.utils.taggedHash("TapTweak", u.subarray(1), s.taprootTweak);
  }
  const c = new OT(n, Ol(r), i, o ? [o] : void 0, o ? [!0] : void 0).sign(e, t);
  return id.decode(c);
}
var Ru, Qh;
function Qx() {
  if (Qh) return Ru;
  Qh = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, i = 1 << 22, s = r, o = 1 << n, a = r << n;
  function c(l) {
    return l & t ? {} : l & i ? {
      seconds: (l & r) << n
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: f }) {
    if (l !== void 0 && f !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && f === void 0) return e;
    if (f !== void 0) {
      if (!Number.isFinite(f)) throw new TypeError("Expected Number seconds");
      if (f > a) throw new TypeError("Expected Number seconds <= " + a);
      if (f % o !== 0) throw new TypeError("Expected Number seconds as a multiple of " + o);
      return i | f >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + s);
    return l;
  }
  return Ru = { decode: c, encode: u }, Ru;
}
var Gs = Qx(), pe;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(pe || (pe = {}));
const sd = 222;
function Jx(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function Hl(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const dm = {
  key: pe.VtxoTaprootTree,
  encode: (e) => [
    {
      type: sd,
      key: Ac[pe.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => od(() => ad(e[0], pe.VtxoTaprootTree) ? e[1] : null)
}, tS = {
  key: pe.ConditionWitness,
  encode: (e) => [
    {
      type: sd,
      key: Ac[pe.ConditionWitness]
    },
    Fs.encode(e)
  ],
  decode: (e) => od(() => ad(e[0], pe.ConditionWitness) ? Fs.decode(e[1]) : null)
}, Fl = {
  key: pe.Cosigner,
  encode: (e) => [
    {
      type: sd,
      key: new Uint8Array([
        ...Ac[pe.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => od(() => ad(e[0], pe.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
pe.VtxoTreeExpiry;
const Ac = Object.fromEntries(Object.values(pe).map((e) => [
  e,
  new TextEncoder().encode(e)
])), od = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function ad(e, t) {
  const n = P.encode(Ac[t]);
  return P.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
const Ao = new Error("missing vtxo graph");
class qs {
  constructor(t) {
    this.secretKey = t, this.myNonces = null, this.aggregateNonces = null, this.graph = null, this.scriptRoot = null, this.rootSharedOutputAmount = null;
  }
  static random() {
    const t = Tl();
    return new qs(t);
  }
  async init(t, n, r) {
    this.graph = t, this.scriptRoot = n, this.rootSharedOutputAmount = r;
  }
  async getPublicKey() {
    return Yh.getPublicKey(this.secretKey);
  }
  async getNonces() {
    if (!this.graph)
      throw Ao;
    this.myNonces || (this.myNonces = this.generateNonces());
    const t = /* @__PURE__ */ new Map();
    for (const [n, r] of this.myNonces)
      t.set(n, { pubNonce: r.pubNonce });
    return t;
  }
  async aggregatedNonces(t, n) {
    if (!this.graph)
      throw Ao;
    if (this.aggregateNonces || (this.aggregateNonces = /* @__PURE__ */ new Map()), this.myNonces || await this.getNonces(), this.aggregateNonces.has(t))
      return {
        hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
      };
    const r = this.myNonces.get(t);
    if (!r)
      throw new Error(`missing nonce for txid ${t}`);
    const i = await this.getPublicKey();
    n.set(P.encode(i.subarray(1)), r);
    const s = this.graph.find(t);
    if (!s)
      throw new Error(`missing tx for txid ${t}`);
    const o = Hl(s.root, 0, Fl).map(
      (u) => P.encode(u.key.subarray(1))
      // xonly pubkey
    ), a = [];
    for (const u of o) {
      const l = n.get(u);
      if (!l)
        throw new Error(`missing nonce for cosigner ${u}`);
      a.push(l.pubNonce);
    }
    const c = NT(a);
    return this.aggregateNonces.set(t, { pubNonce: c }), {
      hasAllNonces: this.aggregateNonces.size === this.myNonces?.size
    };
  }
  async sign() {
    if (!this.graph)
      throw Ao;
    if (!this.aggregateNonces)
      throw new Error("nonces not set");
    if (!this.myNonces)
      throw new Error("nonces not generated");
    const t = /* @__PURE__ */ new Map();
    for (const n of this.graph.iterator()) {
      const r = this.signPartial(n);
      t.set(n.txid, r);
    }
    return t;
  }
  generateNonces() {
    if (!this.graph)
      throw Ao;
    const t = /* @__PURE__ */ new Map(), n = Yh.getPublicKey(this.secretKey);
    for (const r of this.graph.iterator()) {
      const i = BT(n);
      t.set(r.txid, i);
    }
    return t;
  }
  signPartial(t) {
    if (!this.graph || !this.scriptRoot || !this.rootSharedOutputAmount)
      throw qs.NOT_INITIALIZED;
    if (!this.myNonces || !this.aggregateNonces)
      throw new Error("session not properly initialized");
    const n = this.myNonces.get(t.txid);
    if (!n)
      throw new Error("missing private nonce");
    const r = this.aggregateNonces.get(t.txid);
    if (!r)
      throw new Error("missing aggregate nonce");
    const i = [], s = [], o = Hl(t.root, 0, Fl).map((u) => u.key), { finalKey: a } = rd(o, !0, {
      taprootTweak: this.scriptRoot
    });
    for (let u = 0; u < t.root.inputsLength; u++) {
      const l = eS(a, this.graph, this.rootSharedOutputAmount, t.root);
      i.push(l.amount), s.push(l.script);
    }
    const c = t.root.preimageWitnessV1(
      0,
      // always first input
      s,
      Qr.DEFAULT,
      i
    );
    return Xx(n.secNonce, this.secretKey, r.pubNonce, o, c, {
      taprootTweak: this.scriptRoot
    });
  }
}
qs.NOT_INITIALIZED = new Error("session not initialized, call init method");
function eS(e, t, n, r) {
  const i = et.encode(["OP_1", e.slice(1)]);
  if (r.id === t.txid)
    return {
      amount: n,
      script: i
    };
  const s = r.getInput(0);
  if (!s.txid)
    throw new Error("missing parent input txid");
  const o = P.encode(s.txid), a = t.find(o);
  if (!a)
    throw new Error("parent  tx not found");
  if (s.index === void 0)
    throw new Error("missing input index");
  const c = a.root.getOutput(s.index);
  if (!c)
    throw new Error("parent output not found");
  if (!c.amount)
    throw new Error("parent output amount not found");
  return {
    amount: c.amount,
    script: i
  };
}
const Jh = Object.values(Qr).filter((e) => typeof e == "number");
class xs {
  constructor(t) {
    this.key = t || Tl();
  }
  static fromPrivateKey(t) {
    return new xs(t);
  }
  static fromHex(t) {
    return new xs(P.decode(t));
  }
  static fromRandomBytes() {
    return new xs(Tl());
  }
  /**
   * Export the private key as a hex string.
   *
   * @returns The private key as a hex string
   */
  toHex() {
    return P.encode(this.key);
  }
  async sign(t, n) {
    const r = t.clone();
    if (!n) {
      try {
        if (!r.sign(this.key, Jh))
          throw new Error("Failed to sign transaction");
      } catch (i) {
        if (!(i instanceof Error && i.message.includes("No inputs signed"))) throw i;
      }
      return r;
    }
    for (const i of n)
      if (!r.signIdx(this.key, i, Jh))
        throw new Error(`Failed to sign input #${i}`);
    return r;
  }
  compressedPublicKey() {
    return Promise.resolve(Gy(this.key, !0));
  }
  xOnlyPublicKey() {
    return Promise.resolve(_f(this.key));
  }
  signerSession() {
    return qs.random();
  }
  async signMessage(t, n = "schnorr") {
    return n === "ecdsa" ? fx(t, this.key, { prehash: !1 }) : mx.signAsync(t, this.key);
  }
  async toReadonly() {
    return new kc(await this.compressedPublicKey());
  }
}
class kc {
  constructor(t) {
    if (this.publicKey = t, t.length !== 33)
      throw new Error("Invalid public key length");
  }
  /**
   * Create a ReadonlySingleKey from a compressed public key.
   *
   * @param publicKey - 33-byte compressed public key (02/03 prefix + 32-byte x coordinate)
   * @returns A new ReadonlySingleKey instance
   * @example
   * ```typescript
   * const pubkey = new Uint8Array(33); // your compressed public key
   * const readonlyKey = ReadonlySingleKey.fromPublicKey(pubkey);
   * ```
   */
  static fromPublicKey(t) {
    return new kc(t);
  }
  xOnlyPublicKey() {
    return Promise.resolve(this.publicKey.slice(1));
  }
  compressedPublicKey() {
    return Promise.resolve(this.publicKey);
  }
}
let Ss = class hm {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = ui.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(ui.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new hm(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = ui.toWords(t);
    return ui.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return et.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return et.encode(["RETURN", this.vtxoTaprootKey]);
  }
};
const Pa = Vf(void 0, !0);
var Bt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(Bt || (Bt = {}));
function pm(e) {
  const t = [
    Ze,
    ge,
    Ys,
    Ra,
    Li
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${P.encode(e)} is not a valid tapscript`);
}
var Ze;
(function(e) {
  let t;
  (function(a) {
    a[a.CHECKSIG = 0] = "CHECKSIG", a[a.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function n(a) {
    if (a.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of a.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (a.type || (a.type = t.CHECKSIG), a.type === t.CHECKSIGADD)
      return {
        type: Bt.Multisig,
        params: a,
        script: bT(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: Bt.Multisig,
      params: a,
      script: et.encode(c)
    };
  }
  e.encode = n;
  function r(a) {
    if (a.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return i(a);
    } catch {
      try {
        return s(a);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function i(a) {
    const c = et.decode(a), u = [];
    let l = !1;
    for (let h = 0; h < c.length; h++) {
      const p = c[h];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), h + 1 >= c.length || c[h + 1] !== "CHECKSIGADD" && c[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === c.length - 1) {
        if (p !== "NUMEQUAL")
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
      type: t.CHECKSIGADD
    });
    if (P.encode(f.script) !== P.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = et.decode(a), u = [];
    for (let f = 0; f < c.length; f++) {
      const h = c[f];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), f + 1 >= c.length)
          throw new Error("Unexpected end of script");
        const p = c[f + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (f === c.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        f++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (P.encode(l.script) !== P.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === Bt.Multisig;
  }
  e.is = o;
})(Ze || (Ze = {}));
var ge;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = Pa.encode(BigInt(Gs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Ze.encode(i), c = new Uint8Array([
      ...et.encode(o),
      ...a.script
    ]);
    return {
      type: Bt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = et.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(et.encode(s.slice(3)));
    let c;
    try {
      c = Ze.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(Pa.decode(o));
    const l = Gs.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: f,
      ...c.params
    });
    if (P.encode(h.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.CSVMultisig,
      params: {
        timelock: f,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Bt.CSVMultisig;
  }
  e.is = r;
})(ge || (ge = {}));
var Ys;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...et.encode(["VERIFY"]),
      ...ge.encode(i).script
    ]);
    return {
      type: Bt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = et.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(et.encode(s.slice(0, o))), c = new Uint8Array(et.encode(s.slice(o + 1)));
    let u;
    try {
      u = ge.decode(c);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Bt.ConditionCSVMultisig;
  }
  e.is = r;
})(Ys || (Ys = {}));
var Ra;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...et.encode(["VERIFY"]),
      ...Ze.encode(i).script
    ]);
    return {
      type: Bt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = et.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(et.encode(s.slice(0, o))), c = new Uint8Array(et.encode(s.slice(o + 1)));
    let u;
    try {
      u = Ze.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Bt.ConditionMultisig;
  }
  e.is = r;
})(Ra || (Ra = {}));
var Li;
(function(e) {
  function t(i) {
    const s = Pa.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = et.encode(o), c = new Uint8Array([
      ...a,
      ...Ze.encode(i).script
    ]);
    return {
      type: Bt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = et.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(et.encode(s.slice(3)));
    let c;
    try {
      c = Ze.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = Pa.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (P.encode(l.script) !== P.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Bt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Bt.CLTVMultisig;
  }
  e.is = r;
})(Li || (Li = {}));
const tp = Ws.tapTree[2];
function vs(e) {
  return e[1].subarray(0, e[1].length - 1);
}
let bn = class gm {
  static decode(t) {
    const r = tp.decode(t).map((i) => i.script);
    return new gm(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = ew(n.map((s) => ({
      script: s,
      leafVersion: Ks
    }))), i = mT(Df, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return tp.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Ks,
      script: n
    })));
  }
  address(t, n) {
    return new Ss(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return et.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return yr(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => P.encode(vs(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = ge.decode(vs(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = Ys.decode(vs(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
};
var Wl;
(function(e) {
  class t extends bn {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: h } = i, p = nS(c), y = Ra.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, d = Ze.encode({
        pubkeys: [s, o, a]
      }).script, g = Li.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = Ys.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, v = ge.encode({
        timelock: f,
        pubkeys: [s, o]
      }).script, k = ge.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        d,
        g,
        m,
        v,
        k
      ]), this.options = i, this.claimScript = P.encode(y), this.refundScript = P.encode(d), this.refundWithoutReceiverScript = P.encode(g), this.unilateralClaimScript = P.encode(m), this.unilateralRefundScript = P.encode(v), this.unilateralRefundWithoutReceiverScript = P.encode(k);
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
  e.Script = t;
  function n(r) {
    const { sender: i, receiver: s, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: f } = r;
    if (!a || a.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!s || s.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (server)");
    if (typeof c != "bigint" || c <= 0n)
      throw new Error("refund locktime must be greater than 0");
    if (!u || typeof u.value != "bigint" || u.value <= 0n)
      throw new Error("unilateral claim delay must greater than 0");
    if (u.type === "seconds" && u.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (u.type === "seconds" && u.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!l || typeof l.value != "bigint" || l.value <= 0n)
      throw new Error("unilateral refund delay must greater than 0");
    if (l.type === "seconds" && l.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (l.type === "seconds" && l.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!f || typeof f.value != "bigint" || f.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (f.type === "seconds" && f.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (f.type === "seconds" && f.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(Wl || (Wl = {}));
function nS(e) {
  return et.encode(["HASH160", e, "EQUAL"]);
}
var qr;
(function(e) {
  class t extends bn {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Ze.encode({
        pubkeys: [i, s]
      }).script, c = ge.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = P.encode(a), this.exitScript = P.encode(c);
    }
    forfeit() {
      return this.findLeaf(this.forfeitScript);
    }
    exit() {
      return this.findLeaf(this.exitScript);
    }
  }
  t.DEFAULT_TIMELOCK = {
    value: 144n,
    type: "blocks"
  }, e.Script = t;
})(qr || (qr = {}));
var On;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(On || (On = {}));
function ir(e) {
  return !e.isSpent;
}
function cd(e) {
  return e.virtualStatus.state === "swept" && ir(e);
}
function ym(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function wm(e, t) {
  return e.value < t;
}
async function* Kl(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    i ? (i(a), i = null) : n.push(a);
  };
  e.addEventListener("message", s), e.addEventListener("error", o);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (n.length > 0)
        throw n.shift();
      const a = await new Promise((c, u) => {
        r = c, i = u;
      }).finally(() => {
        r = null, i = null;
      });
      a && (yield a);
    }
  } finally {
    e.removeEventListener("message", s), e.removeEventListener("error", o);
  }
}
let mm = class extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
};
function rS(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n))
        continue;
      const i = n.code;
      if (!("message" in n))
        continue;
      const s = n.message;
      if (!("name" in n))
        continue;
      const o = n.name;
      let a;
      return "metadata" in n && iS(n.metadata) && (a = n.metadata), new mm(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function iS(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var cr;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    lS(s), dS(o);
    const a = hS(i, s[0].witnessUtxo.script);
    return pS(a, s, o);
  }
  e.create = t;
  function n(i) {
    let s = 0n;
    for (let a = 0; a < i.inputsLength; a++) {
      const c = i.getInput(a);
      if (c.witnessUtxo === void 0)
        throw new Error("intent proof input requires witness utxo");
      s += c.witnessUtxo.amount;
    }
    let o = 0n;
    for (let a = 0; a < i.outputsLength; a++) {
      const c = i.getOutput(a);
      if (c.amount === void 0)
        throw new Error("intent proof output requires amount");
      o += c.amount;
    }
    if (o > s)
      throw new Error(`intent proof output amount is greater than input amount: ${o} > ${s}`);
    return Number(s - o);
  }
  e.fee = n;
  function r(i) {
    switch (i.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: i.onchain_output_indexes,
          valid_at: i.valid_at,
          expire_at: i.expire_at,
          cosigners_public_keys: i.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: i.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: i.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(cr || (cr = {}));
const sS = new Uint8Array([Rt.RETURN]), oS = new Uint8Array(32).fill(0), aS = 4294967295, cS = "ark-intent-proof-message";
function uS(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function lS(e) {
  return e.forEach(uS), !0;
}
function fS(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function dS(e) {
  return e.forEach(fS), !0;
}
function hS(e, t) {
  const n = gS(e), r = new wr({
    version: 0
  });
  return r.addInput({
    txid: oS,
    // zero hash
    index: aS,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: et.encode(["OP_0", n])
  }), r;
}
function pS(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new wr({
    version: 2,
    lockTime: i
  });
  s.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: Qr.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: Qr.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: sS
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function gS(e) {
  return nd.utils.taggedHash(cS, new TextEncoder().encode(e));
}
var Dt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Dt || (Dt = {}));
let bm = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      en(i, `Failed to get server info: ${n.statusText}`);
    }
    const r = await n.json();
    return {
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointTapscript: r.checkpointTapscript ?? "",
      deprecatedSigners: r.deprecatedSigners?.map((i) => ({
        cutoffDate: BigInt(i.cutoffDate ?? 0),
        pubkey: i.pubkey ?? ""
      })) ?? [],
      digest: r.digest ?? "",
      dust: BigInt(r.dust ?? 0),
      fees: {
        intentFee: r.fees?.intentFee ?? {},
        txFeeRate: r?.fees?.txFeeRate ?? ""
      },
      forfeitAddress: r.forfeitAddress ?? "",
      forfeitPubkey: r.forfeitPubkey ?? "",
      network: r.network ?? "",
      scheduledSession: "scheduledSession" in r && r.scheduledSession != null ? {
        duration: BigInt(r.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(r.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(r.scheduledSession.nextEndTime ?? 0),
        period: BigInt(r.scheduledSession.period ?? 0),
        fees: r.scheduledSession.fees ?? {}
      } : void 0,
      serviceStatus: r.serviceStatus ?? {},
      sessionDuration: BigInt(r.sessionDuration ?? 0),
      signerPubkey: r.signerPubkey ?? "",
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      utxoMaxAmount: BigInt(r.utxoMaxAmount ?? -1),
      utxoMinAmount: BigInt(r.utxoMinAmount ?? 0),
      version: r.version ?? "",
      vtxoMaxAmount: BigInt(r.vtxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(r.vtxoMinAmount ?? 0)
    };
  }
  async submitTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/submit`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: n
      })
    });
    if (!i.ok) {
      const o = await i.text();
      en(o, `Failed to submit virtual transaction: ${o}`);
    }
    const s = await i.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      en(s, `Failed to finalize offchain transaction: ${s}`);
    }
  }
  async registerIntent(t) {
    const n = `${this.serverUrl}/v1/batch/registerIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: cr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      en(s, `Failed to register intent: ${s}`);
    }
    return (await r.json()).intentId;
  }
  async deleteIntent(t) {
    const n = `${this.serverUrl}/v1/batch/deleteIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: cr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      en(i, `Failed to delete intent: ${i}`);
    }
  }
  async confirmRegistration(t) {
    const n = `${this.serverUrl}/v1/batch/ack`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: t
      })
    });
    if (!r.ok) {
      const i = await r.text();
      en(i, `Failed to confirm registration: ${i}`);
    }
  }
  async submitTreeNonces(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: yS(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      en(o, `Failed to submit tree nonces: ${o}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: wS(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      en(o, `Failed to submit tree signatures: ${o}`);
    }
  }
  async submitSignedForfeitTxs(t, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      en(s, `Failed to submit forfeit transactions: ${i.statusText}`);
    }
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, i = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const s = new EventSource(r + i), o = () => {
          s.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const a of Kl(s)) {
            if (t?.aborted)
              break;
            try {
              const c = JSON.parse(a.data), u = this.parseSettlementEvent(c);
              u && (yield u);
            } catch (c) {
              throw console.error("Failed to parse event:", c), c;
            }
          }
        } finally {
          t?.removeEventListener("abort", o), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (zl(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", s), s;
      }
  }
  async *getTransactionsStream(t) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const r = new EventSource(n), i = () => {
          r.close();
        };
        t?.addEventListener("abort", i);
        try {
          for await (const s of Kl(r)) {
            if (t?.aborted)
              break;
            try {
              const o = JSON.parse(s.data), a = this.parseTransactionNotification(o);
              a && (yield a);
            } catch (o) {
              throw console.error("Failed to parse transaction notification:", o), o;
            }
          }
        } finally {
          t?.removeEventListener("abort", i), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (zl(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", r), r;
      }
  }
  async getPendingTxs(t) {
    const n = `${this.serverUrl}/v1/tx/pending`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: cr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      en(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: Dt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: Dt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: Dt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: Dt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: Dt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: Dt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: mS(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: Dt.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: n
        }
      };
    }
    return t.treeSignature ? {
      type: Dt.TreeSignature,
      id: t.treeSignature.id,
      topic: t.treeSignature.topic,
      batchIndex: t.treeSignature.batchIndex,
      txid: t.treeSignature.txid,
      signature: t.treeSignature.signature
    } : (t.heartbeat || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(ko),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(ko),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(ko),
        spendableVtxos: t.arkTx.spendableVtxos.map(ko),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
};
function yS(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = P.encode(r.pubNonce);
  return t;
}
function wS(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = P.encode(r.encode());
  return t;
}
function mS(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: P.decode(n) }];
  }));
}
function zl(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function ko(e) {
  return {
    outpoint: {
      txid: e.outpoint.txid,
      vout: e.outpoint.vout
    },
    amount: e.amount,
    script: e.script,
    createdAt: e.createdAt,
    expiresAt: e.expiresAt,
    commitmentTxids: e.commitmentTxids,
    isPreconfirmed: e.isPreconfirmed,
    isSwept: e.isSwept,
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent,
    spentBy: e.spentBy,
    settledBy: e.settledBy,
    arkTxid: e.arkTxid
  };
}
function en(e, t) {
  const n = new Error(e);
  throw rS(n) ?? new Error(t);
}
let zo = class {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = ES(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = bS(c, s), o))
          break;
      if (!o) {
        r.push(s);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const i = Em(r[0], n);
    if (!i)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (i.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${i.nbOfNodes()})`);
    return i;
  }
  nbOfNodes() {
    let t = 1;
    for (const n of this.children.values())
      t += n.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, n = this.root.inputsLength;
    if (n !== 1)
      throw new Error(`unexpected number of inputs: ${n}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [r, i] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      i.validate();
      const s = i.root.getInput(0), o = this.root.id;
      if (!s.txid || P.encode(s.txid) !== o || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let a = 0n;
      for (let u = 0; u < i.root.outputsLength; u++) {
        const l = i.root.getOutput(u);
        l?.amount && (a += l.amount);
      }
      const c = this.root.getOutput(r);
      if (!c?.amount)
        throw new Error(`parent output ${r} has no amount`);
      if (a !== c.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${a} != ${c.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const t = [];
    for (const n of this.children.values())
      t.push(...n.leaves());
    return t;
  }
  get txid() {
    return this.root.id;
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const n of this.children.values()) {
      const r = n.find(t);
      if (r)
        return r;
    }
    return null;
  }
  update(t, n) {
    if (t === this.txid) {
      n(this.root);
      return;
    }
    for (const r of this.children.values())
      try {
        r.update(t, n);
        return;
      } catch {
        continue;
      }
    throw new Error(`tx not found: ${t}`);
  }
  *iterator() {
    for (const t of this.children.values())
      yield* t.iterator();
    yield this;
  }
};
function bS(e, t) {
  return Object.values(e.children).includes(t);
}
function Em(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = Em(o, t);
    c && i.set(a, c);
  }
  return new zo(r, i);
}
function ES(e) {
  return { tx: Me.fromPSBT(Wt.decode(e.tx)), children: e.children };
}
var jl;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], f = [];
    let h, p;
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case Dt.BatchStarted: {
          const d = y, { skip: g } = await i.onBatchStarted(d);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Dt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case Dt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case Dt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : f.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case Dt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const d = P.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: d
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case Dt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = zo.create(l);
          const { skip: d } = await i.onTreeSigningStarted(y, h);
          d || (u = t.TreeSigningStarted);
          continue;
        }
        case Dt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: d } = await i.onTreeNonces(y);
          d && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Dt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = zo.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          f.length > 0 && (p = zo.create(f)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(jl || (jl = {}));
const TS = (e) => xS[e], xS = {
  bitcoin: ss(Ni, "ark"),
  testnet: ss(bo, "tark"),
  signet: ss(bo, "tark"),
  mutinynet: ss(bo, "tark"),
  regtest: ss({
    ...bo,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function ss(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const SS = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
let vS = class {
  constructor(t, n) {
    this.baseUrl = t, this.pollingInterval = n?.pollingInterval ?? 15e3, this.forcePolling = n?.forcePolling ?? !1;
  }
  async getCoins(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!n.ok)
      throw new Error(`Failed to fetch UTXOs: ${n.statusText}`);
    return n.json();
  }
  async getFeeRate() {
    const t = await fetch(`${this.baseUrl}/fee-estimates`);
    if (!t.ok)
      throw new Error(`Failed to fetch fee rate: ${t.statusText}`);
    return (await t.json())[1] ?? void 0;
  }
  async broadcastTransaction(...t) {
    switch (t.length) {
      case 1:
        return this.broadcastTx(t[0]);
      case 2:
        return this.broadcastPackage(t[0], t[1]);
      default:
        throw new Error("Only 1 or 1C1P package can be broadcast");
    }
  }
  async getTxOutspends(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transaction outspends: ${r}`);
    }
    return n.json();
  }
  async getTransactions(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transactions: ${r}`);
    }
    return n.json();
  }
  async getTxStatus(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!n.ok)
      throw new Error(n.statusText);
    if (!(await n.json()).status.confirmed)
      return { confirmed: !1 };
    const i = await fetch(`${this.baseUrl}/tx/${t}/status`);
    if (!i.ok)
      throw new Error(`Failed to get transaction status: ${i.statusText}`);
    const s = await i.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const i = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, f = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((y) => !f.has(l(y)));
          p.length > 0 && (p.forEach((y) => f.add(l(y))), n(p));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let o = null;
    const a = () => {
      o && o.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await s(), a;
    try {
      o = new WebSocket(i), o.addEventListener("open", () => {
        const c = {
          "track-addresses": t
        };
        o.send(JSON.stringify(c));
      }), o.addEventListener("message", (c) => {
        try {
          const u = [], l = JSON.parse(c.data.toString());
          if (!l["multi-address-transactions"])
            return;
          const f = l["multi-address-transactions"];
          for (const h in f)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              f[h][p] && u.push(...f[h][p].filter(kS));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), o.addEventListener("error", async () => {
        await s();
      });
    } catch {
      r && clearInterval(r), await s();
    }
    return a;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!AS(n))
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
  async broadcastPackage(t, n) {
    const r = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, n])
    });
    if (!r.ok) {
      const i = await r.text();
      throw new Error(`Failed to broadcast package: ${i}`);
    }
    return r.json();
  }
  async broadcastTx(t) {
    const n = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to broadcast transaction: ${r}`);
    }
    return n.text();
  }
};
function AS(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const kS = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", IS = 0n, $S = new Uint8Array([81, 2, 78, 115]), ud = {
  script: $S,
  amount: IS
};
P.encode(ud.script);
function CS(e, t, n) {
  const r = new wr({
    version: 3,
    lockTime: n
  });
  let i = 0n;
  for (const s of e) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    i += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: t,
    amount: i
  }), r.addOutput(ud), r;
}
const OS = new Error("invalid settlement transaction outputs"), BS = new Error("empty tree"), NS = new Error("invalid number of inputs"), Uu = new Error("wrong settlement txid"), PS = new Error("invalid amount"), RS = new Error("no leaves"), US = new Error("invalid taproot script"), ep = new Error("invalid round transaction outputs"), _S = new Error("wrong commitment txid"), LS = new Error("missing cosigners public keys"), _u = 0, np = 1;
function DS(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw NS;
  const n = t.root.getInput(0), r = Me.fromPSBT(Wt.decode(e));
  if (r.outputsLength <= np)
    throw OS;
  const i = r.id;
  if (!n.txid || P.encode(n.txid) !== i || n.index !== np)
    throw Uu;
}
function VS(e, t, n) {
  if (t.outputsLength < _u + 1)
    throw ep;
  const r = t.getOutput(_u)?.amount;
  if (!r)
    throw ep;
  if (!e.root)
    throw BS;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || P.encode(i.txid) !== s || i.index !== _u)
    throw _S;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw PS;
  if (e.leaves().length === 0)
    throw RS;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const f = c.root.getOutput(u);
      if (!f?.script)
        throw new Error(`parent output ${u} not found`);
      const h = f.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = Hl(l.root, 0, Fl);
      if (p.length === 0)
        throw LS;
      const y = p.map((g) => g.key), { finalKey: d } = rd(y, !0, {
        taprootTweak: n
      });
      if (!d || P.encode(d.slice(1)) !== P.encode(h))
        throw US;
    }
}
function MS(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (et.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => HS(o, n));
  return {
    arkTx: Tm(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function Tm(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = pm(vs(i.tapLeafScript));
    if (Li.is(s)) {
      if (n !== 0n && rp(n) !== rp(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new wr({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Kf - 1 : void 0,
      witnessUtxo: {
        script: bn.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Jx(r, i, dm, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(ud), r;
}
function HS(e, t) {
  const n = pm(vs(e.tapLeafScript)), r = new bn([
    t.script,
    n.script
  ]), i = Tm([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(P.encode(n.script)), o = {
    txid: i.id,
    vout: 0,
    value: e.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: i,
    input: o
  };
}
const FS = 500000000n;
function rp(e) {
  return e >= FS;
}
function WS(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const KS = 4320 * 60 * 1e3, zS = {
  thresholdMs: KS
  // 3 days
};
let ur = class Ce {
  constructor(t, n, r = Ce.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = zt(this.preimage);
    this.vtxoScript = new bn([qS(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = P.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(Ce.Length);
    return t.set(this.preimage, 0), jS(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = Ce.DefaultHRP) {
    if (t.length !== Ce.Length)
      throw new Error(`invalid data length: expected ${Ce.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, Ce.PreimageLength), i = GS(t, Ce.PreimageLength);
    return new Ce(r, i, n);
  }
  static fromString(t, n = Ce.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = wl.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return Ce.decode(i, n);
  }
  toString() {
    return this.HRP + wl.encode(this.encode());
  }
};
ur.DefaultHRP = "arknote";
ur.PreimageLength = 32;
ur.ValueLength = 4;
ur.Length = ur.PreimageLength + ur.ValueLength;
ur.FakeOutpointIndex = 0;
function jS(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function GS(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function qS(e) {
  return et.encode(["SHA256", e, "EQUAL"]);
}
var Gl;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Gl || (Gl = {}));
var xi;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(xi || (xi = {}));
let xm = class {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isVtxoTreeResponse(o))
      throw new Error("Invalid vtxo tree data received");
    return o.vtxoTree.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!Oe.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!Oe.isCommitmentTx(i))
      throw new Error("Invalid commitment tx data received");
    return i;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isConnectorsResponse(o))
      throw new Error("Invalid commitment tx connectors data received");
    return o.connectors.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isForfeitTxsResponse(o))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return o;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const i = new EventSource(r), s = () => {
          i.close();
        };
        n?.addEventListener("abort", s);
        try {
          for await (const o of Kl(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(Io),
                spentVtxos: (a.event.spentVtxos || []).map(Io),
                sweptVtxos: (a.event.sweptVtxos || []).map(Io),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error("Failed to parse subscription event:", a), a;
            }
          }
        } finally {
          n?.removeEventListener("abort", s), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (zl(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", i), i;
      }
  }
  async getVirtualTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isVirtualTxsResponse(o))
      throw new Error("Invalid virtual txs data received");
    return o;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const o = await s.json();
    if (!Oe.isVtxoChainResponse(o))
      throw new Error("Invalid vtxo chain data received");
    return o;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((o) => {
      r.append("scripts", o);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((o) => {
      r.append("outpoints", `${o.txid}:${o.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxos: ${i.statusText}`);
    const s = await i.json();
    if (!Oe.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(Io),
      page: s.page
    };
  }
  async subscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: n })
    });
    if (!i.ok) {
      const o = await i.text();
      throw new Error(`Failed to subscribe to scripts: ${o}`);
    }
    const s = await i.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: n })
    });
    if (!i.ok) {
      const s = await i.text();
      console.warn(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
};
function Io(e) {
  return {
    txid: e.outpoint.txid,
    vout: e.outpoint.vout,
    value: Number(e.amount),
    status: {
      confirmed: !e.isSwept && !e.isPreconfirmed,
      isLeaf: !e.isPreconfirmed
    },
    virtualStatus: {
      state: e.isSwept ? "swept" : e.isPreconfirmed ? "preconfirmed" : "settled",
      commitmentTxIds: e.commitmentTxids,
      batchExpiry: e.expiresAt ? Number(e.expiresAt) * 1e3 : void 0
    },
    spentBy: e.spentBy ?? "",
    settledBy: e.settledBy,
    arkTxId: e.arkTxid,
    createdAt: new Date(Number(e.createdAt) * 1e3),
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent
  };
}
var Oe;
(function(e) {
  function t(b) {
    return typeof b == "object" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.expiresAt == "string" && typeof b.swept == "boolean";
  }
  function n(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.expiresAt == "string" && Object.values(xi).includes(b.type) && Array.isArray(b.spends) && b.spends.every((Y) => typeof Y == "string");
  }
  function r(b) {
    return typeof b == "object" && typeof b.startedAt == "string" && typeof b.endedAt == "string" && typeof b.totalInputAmount == "string" && typeof b.totalInputVtxos == "number" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.batches == "object" && Object.values(b.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.vout == "number";
  }
  e.isOutpoint = i;
  function s(b) {
    return Array.isArray(b) && b.every(i);
  }
  e.isOutpointArray = s;
  function o(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.children == "object" && Object.values(b.children).every(l) && Object.keys(b.children).every((Y) => Number.isInteger(Number(Y)));
  }
  function a(b) {
    return Array.isArray(b) && b.every(o);
  }
  e.isTxsArray = a;
  function c(b) {
    return typeof b == "object" && typeof b.amount == "string" && typeof b.createdAt == "string" && typeof b.isSettled == "boolean" && typeof b.settledBy == "string" && Object.values(Gl).includes(b.type) && (!b.commitmentTxid && typeof b.virtualTxid == "string" || typeof b.commitmentTxid == "string" && !b.virtualTxid);
  }
  function u(b) {
    return Array.isArray(b) && b.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(b) {
    return typeof b == "string" && b.length === 64;
  }
  function f(b) {
    return Array.isArray(b) && b.every(l);
  }
  e.isTxidArray = f;
  function h(b) {
    return typeof b == "object" && i(b.outpoint) && typeof b.createdAt == "string" && (b.expiresAt === null || typeof b.expiresAt == "string") && typeof b.amount == "string" && typeof b.script == "string" && typeof b.isPreconfirmed == "boolean" && typeof b.isSwept == "boolean" && typeof b.isUnrolled == "boolean" && typeof b.isSpent == "boolean" && (!b.spentBy || typeof b.spentBy == "string") && (!b.settledBy || typeof b.settledBy == "string") && (!b.arkTxid || typeof b.arkTxid == "string") && Array.isArray(b.commitmentTxids) && b.commitmentTxids.every(l);
  }
  function p(b) {
    return typeof b == "object" && typeof b.current == "number" && typeof b.next == "number" && typeof b.total == "number";
  }
  function y(b) {
    return typeof b == "object" && Array.isArray(b.vtxoTree) && b.vtxoTree.every(o) && (!b.page || p(b.page));
  }
  e.isVtxoTreeResponse = y;
  function d(b) {
    return typeof b == "object" && Array.isArray(b.leaves) && b.leaves.every(i) && (!b.page || p(b.page));
  }
  e.isVtxoTreeLeavesResponse = d;
  function g(b) {
    return typeof b == "object" && Array.isArray(b.connectors) && b.connectors.every(o) && (!b.page || p(b.page));
  }
  e.isConnectorsResponse = g;
  function m(b) {
    return typeof b == "object" && Array.isArray(b.txids) && b.txids.every(l) && (!b.page || p(b.page));
  }
  e.isForfeitTxsResponse = m;
  function v(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = v;
  function k(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = k;
  function C(b) {
    return typeof b == "object" && Array.isArray(b.txs) && b.txs.every((Y) => typeof Y == "string") && (!b.page || p(b.page));
  }
  e.isVirtualTxsResponse = C;
  function L(b) {
    return typeof b == "object" && Array.isArray(b.chain) && b.chain.every(n) && (!b.page || p(b.page));
  }
  e.isVtxoChainResponse = L;
  function G(b) {
    return typeof b == "object" && Array.isArray(b.vtxos) && b.vtxos.every(h) && (!b.page || p(b.page));
  }
  e.isVtxosResponse = G;
})(Oe || (Oe = {}));
const YS = 546;
function Un(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function ql(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
let mt = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = Di(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Di(this.message, t), this) : this);
  }
}, J = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = Di(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Di(this.message, t), this) : this);
  }
}, ZS = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = Di(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = Di(this.message, t), this) : this);
  }
};
function Di(e, t) {
  if (t?.pos === void 0) return e;
  const n = t.pos, r = t.input;
  let i = 1, s = 0, o = 0;
  for (; s < n; )
    r[s] === `
` ? (i++, o = 0) : o++, s++;
  let a = n, c = n;
  for (; a > 0 && r[a - 1] !== `
`; ) a--;
  for (; c < r.length && r[c] !== `
`; ) c++;
  const u = r.slice(a, c), l = `${i}`.padStart(4, " "), f = " ".repeat(9 + o);
  return `${e}

> ${l} | ${u}
${f}^`;
}
let Yr = class Yl {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? Ua : new Yl(t);
  }
  static none() {
    return Ua;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new J("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof Yl) return t;
    throw new J("Optional.or must be called with an Optional argument");
  }
  orValue(t) {
    return this.#t === void 0 ? t : this.#t;
  }
  get [Symbol.toStringTag]() {
    return "optional";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.#t === void 0 ? "Optional { none }" : `Optional { value: ${JSON.stringify(this.#t)} }`;
  }
};
const Ua = Object.freeze(new Yr());
let Sm = class {
};
const vm = new Sm();
function XS(e, t) {
  e.constants.set("optional", t ? vm : void 0);
}
function QS(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = e.enableOptionalTypes ? vm : void 0;
  e.registerType("OptionalNamespace", Sm), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (f) => f.hasValue()), t("optional<A>.value(): A", (f) => f.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => Yr.none()), t("OptionalNamespace.of(A): optional<A>", (f, h) => Yr.of(h));
  function r(f, h, p) {
    if (f instanceof Yr) return f;
    throw new J(`${p} must be optional`, h);
  }
  function i(f, h, p) {
    const y = f.eval(h.receiver, p);
    return y instanceof Promise ? y.then((d) => s(d, f, h, p)) : s(y, f, h, p);
  }
  function s(f, h, p, y) {
    const d = r(f, p.receiver, `${p.functionDesc} receiver`);
    return d.hasValue() ? p.onHasValue(d) : p.onEmpty(h, p, y);
  }
  function o(f, h, p, y) {
    const d = f.check(h, p);
    if (d.kind === "optional") return d;
    if (d.kind === "dyn") return f.getType("optional");
    throw new f.Error(`${y} must be optional, got '${d}'`, h);
  }
  function a({ functionDesc: f, evaluate: h, typeCheck: p, onHasValue: y, onEmpty: d }) {
    return ({ args: g, receiver: m }) => ({
      functionDesc: f,
      receiver: m,
      arg: g[0],
      evaluate: h,
      typeCheck: p,
      onHasValue: y,
      onEmpty: d
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, u), d = o(f, h.arg, p, l), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      },
      onHasValue: (f) => f,
      onEmpty(f, h, p) {
        const y = h.arg, d = f.eval(y, p);
        return d instanceof Promise ? d.then((g) => r(g, y, l)) : r(d, y, l);
      }
    })
  ), e.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (f) => f.value(),
      onEmpty(f, h, p) {
        return f.eval(h.arg, p);
      },
      evaluate: i,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, c).valueType, d = f.check(h.arg, p), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      }
    })
  );
}
let Ur = class {
  #t;
  constructor(t) {
    this.verify(BigInt(t));
  }
  get value() {
    return this.#t;
  }
  valueOf() {
    return this.#t;
  }
  verify(t) {
    if (t < 0n || t > 18446744073709551615n) throw new J("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
};
const JS = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
let jo = class Go {
  #t;
  #e;
  constructor(t, n = 0) {
    this.#t = BigInt(t), this.#e = n;
  }
  get seconds() {
    return this.#t;
  }
  get nanos() {
    return this.#e;
  }
  valueOf() {
    return Number(this.#t) * 1e3 + this.#e / 1e6;
  }
  static fromMilliseconds(t) {
    const n = BigInt(Math.trunc(t * 1e6)), r = n / 1000000000n, i = Number(n % 1000000000n);
    return new Go(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new Go(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new Go(
      this.#t - t.seconds + BigInt(Math.floor(n / 1e9)),
      (n + 1e9) % 1e9
    );
  }
  extendTimestamp(t) {
    return new Date(
      t.getTime() + Number(this.#t) * 1e3 + Math.floor(this.#e / 1e6)
    );
  }
  subtractTimestamp(t) {
    return new Date(
      t.getTime() - Number(this.#t) * 1e3 - Math.floor(this.#e / 1e6)
    );
  }
  toString() {
    const t = this.#e ? (this.#e / 1e9).toLocaleString("en-US", { useGrouping: !1, maximumFractionDigits: 9 }).slice(1) : "";
    return `${this.#t}${t}s`;
  }
  getHours() {
    return this.#t / 3600n;
  }
  getMinutes() {
    return this.#t / 60n;
  }
  getSeconds() {
    return this.#t;
  }
  getMilliseconds() {
    return this.#t * 1000n + BigInt(Math.floor(this.#e / 1e6));
  }
  get [Symbol.toStringTag]() {
    return "google.protobuf.Duration";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `google.protobuf.Duration { seconds: ${this.#t}, nanos: ${this.#e} }`;
  }
};
function tv(e) {
  const t = (d, g) => e.registerFunctionOverload(d, g), n = (d) => d;
  t("dyn(dyn): dyn", n);
  for (const d in As) {
    const g = As[d];
    g instanceof ce && t(`type(${g.name}): type`, () => g);
  }
  t("bool(bool): bool", n), t("bool(string): bool", (d) => {
    switch (d) {
      case "1":
      case "t":
      case "true":
      case "TRUE":
      case "True":
        return !0;
      case "0":
      case "f":
      case "false":
      case "FALSE":
      case "False":
        return !1;
      default:
        throw new J(`bool() conversion error: invalid string value "${d}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (d) => BigInt(ip(d))), t("size(bytes): int", (d) => BigInt(d.length)), t("size(list): int", (d) => BigInt(d.length ?? d.size)), t(
    "size(map): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("string.size(): int", (d) => BigInt(ip(d))), t("bytes.size(): int", (d) => BigInt(d.length)), t("list.size(): int", (d) => BigInt(d.length ?? d.size)), t(
    "map.size(): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("bytes(string): bytes", (d) => o.fromString(d)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (d) => Number(d)), t("double(uint): double", (d) => Number(d)), t("double(string): double", (d) => {
    if (!d || d !== d.trim())
      throw new J("double() type error: cannot convert to double");
    switch (d.toLowerCase()) {
      case "inf":
      case "+inf":
      case "infinity":
      case "+infinity":
        return Number.POSITIVE_INFINITY;
      case "-inf":
      case "-infinity":
        return Number.NEGATIVE_INFINITY;
      case "nan":
        return Number.NaN;
      default: {
        const m = Number(d);
        if (!Number.isNaN(m)) return m;
        throw new J("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new J("int() type error: integer overflow");
  }), t("int(string): int", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new J("int() type error: cannot convert to int");
    try {
      const g = BigInt(d);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new J("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new J("int() type error: integer overflow");
  }), t("uint(string): uint", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new J("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(d);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new J("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (d) => `${d}`), t("string(int): string", (d) => `${d}`), t("string(bytes): string", (d) => o.toUtf8(d)), t("string(double): string", (d) => d === 1 / 0 ? "+Inf" : d === -1 / 0 ? "-Inf" : `${d}`), t("string.startsWith(string): bool", (d, g) => d.startsWith(g)), t("string.endsWith(string): bool", (d, g) => d.endsWith(g)), t("string.contains(string): bool", (d, g) => d.includes(g)), t("string.lowerAscii(): string", (d) => d.toLowerCase()), t("string.upperAscii(): string", (d) => d.toUpperCase()), t("string.trim(): string", (d) => d.trim()), t(
    "string.indexOf(string): int",
    (d, g) => BigInt(d.indexOf(g))
  ), t("string.indexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new J("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (d, g) => BigInt(d.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new J("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.lastIndexOf(g, m));
  }), t("string.substring(int): string", (d, g) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new J("string.substring(start, end): start index out of range");
    return d.substring(g);
  }), t("string.substring(int, int): string", (d, g, m) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new J("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > d.length)
      throw new J("string.substring(start, end): end index out of range");
    return d.substring(g, m);
  }), t("string.matches(string): bool", (d, g) => {
    try {
      return new RegExp(g).test(d);
    } catch {
      throw new J(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (d, g) => d.split(g)), t("string.split(string, int): list<string>", (d, g, m) => {
    if (m = Number(m), m === 0) return [];
    const v = d.split(g);
    if (m < 0 || v.length <= m) return v;
    const k = v.slice(0, m - 1);
    return k.push(v.slice(m - 1).join(g)), k;
  }), t("list<string>.join(): string", (d) => {
    for (let g = 0; g < d.length; g++)
      if (typeof d[g] != "string")
        throw new J("string.join(): list must contain only strings");
    return d.join("");
  }), t("list<string>.join(string): string", (d, g) => {
    for (let m = 0; m < d.length; m++)
      if (typeof d[m] != "string")
        throw new J("string.join(separator): list must contain only strings");
    return d.join(g);
  });
  const i = new TextEncoder("utf8"), s = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (d) => Buffer.byteLength(d),
    fromString: (d) => Buffer.from(d, "utf8"),
    toHex: (d) => Buffer.prototype.hexSlice.call(d, 0, d.length),
    toBase64: (d) => Buffer.prototype.base64Slice.call(d, 0, d.length),
    toUtf8: (d) => Buffer.prototype.utf8Slice.call(d, 0, d.length),
    jsonParse: (d) => JSON.parse(d)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (d) => i.encode(d).length,
    fromString: (d) => i.encode(d),
    toHex: Uint8Array.prototype.toHex ? (d) => d.toHex() : (d) => Array.from(d, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (d) => d.toBase64() : (d) => btoa(Array.from(d, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (d) => s.decode(d),
    jsonParse: (d) => JSON.parse(i.decode(d))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (d, g) => {
    if (g < 0 || g >= d.length) throw new J("Bytes index out of range");
    return BigInt(d[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, jo).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function f(d, g) {
    return new Date(d.toLocaleString("en-US", { timeZone: g }));
  }
  function h(d, g) {
    const m = g ? f(d, g) : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), v = new Date(m.getFullYear(), 0, 0);
    return BigInt(Math.floor((m - v) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (d) => {
    if (d.length < 20 || d.length > 30)
      throw new J("timestamp() requires a string in ISO 8601 format");
    const g = new Date(d);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new J("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (d) => {
    if (d = Number(d) * 1e3, d <= 253402300799999 && d >= -621355968e5) return new Date(d);
    throw new J("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (d) => BigInt(d.getUTCDate())), t(`${a}.getDate(string): int`, (d, g) => BigInt(f(d, g).getDate())), t(`${a}.getDayOfMonth(): int`, (d) => BigInt(d.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (d, g) => BigInt(f(d, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (d) => BigInt(d.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (d, g) => BigInt(f(d, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (d) => BigInt(d.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (d, g) => BigInt(f(d, g).getFullYear())), t(`${a}.getHours(): int`, (d) => BigInt(d.getUTCHours())), t(`${a}.getHours(string): int`, (d, g) => BigInt(f(d, g).getHours())), t(`${a}.getMilliseconds(): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (d) => BigInt(d.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (d, g) => BigInt(f(d, g).getMinutes())), t(`${a}.getMonth(): int`, (d) => BigInt(d.getUTCMonth())), t(`${a}.getMonth(string): int`, (d, g) => BigInt(f(d, g).getMonth())), t(`${a}.getSeconds(): int`, (d) => BigInt(d.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (d, g) => BigInt(f(d, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(d) {
    if (!d) throw new J("Invalid duration string: ''");
    const g = d[0] === "-";
    (d[0] === "-" || d[0] === "+") && (d = d.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const C = p.exec(d);
      if (!C) throw new J(`Invalid duration string: ${d}`);
      if (C.index !== 0) throw new J(`Invalid duration string: ${d}`);
      d = d.slice(C[0].length);
      const L = JS[C[2]], [G = "0", b = ""] = C[1].split("."), Y = BigInt(G) * L, D = b ? BigInt(b.slice(0, 13).padEnd(13, "0")) * L / 10000000000000n : 0n;
      if (m += Y + D, d === "") break;
    }
    const v = m >= 1000000000n ? m / 1000000000n : 0n, k = Number(m % 1000000000n);
    return g ? new jo(-v, -k) : new jo(v, k);
  }
  t("duration(string): google.protobuf.Duration", (d) => y(d)), t("google.protobuf.Duration.getHours(): int", (d) => d.getHours()), t("google.protobuf.Duration.getMinutes(): int", (d) => d.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (d) => d.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (d) => d.getMilliseconds()), QS(e);
}
function ip(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
let ce = class {
  #t;
  constructor(t) {
    this.#t = t, Object.freeze(this);
  }
  get name() {
    return this.#t;
  }
  get [Symbol.toStringTag]() {
    return `Type<${this.#t}>`;
  }
  toString() {
    return `Type<${this.#t}>`;
  }
};
const As = {
  string: new ce("string"),
  bool: new ce("bool"),
  int: new ce("int"),
  uint: new ce("uint"),
  double: new ce("double"),
  map: new ce("map"),
  list: new ce("list"),
  bytes: new ce("bytes"),
  null_type: new ce("null"),
  type: new ce("type")
};
let Am = class km {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof km ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
  }
  fork(t = !0) {
    return t && (this.set = this.#n), new this.constructor(this);
  }
  #n() {
    throw new Error("Cannot modify frozen registry");
  }
  set(t, n) {
    return this.#e.set(t, n), this;
  }
  has(t) {
    return this.#e.has(t) || (this.#t ? this.#t.has(t) : !1);
  }
  get(t) {
    return this.#e.get(t) || this.#t?.get(t);
  }
  *#r() {
    this.#t && (yield* this.#t), yield* this.#e;
  }
  [Symbol.iterator]() {
    return this.#r();
  }
  get size() {
    return this.#e.size + (this.#t ? this.#t.size : 0);
  }
}, ev = class extends Am {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? We : n;
  }
};
function An(e, t = Am, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
let Ir = class {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: n, name: r, keyType: i, valueType: s, values: o }) {
    this.kind = t, this.type = n, this.name = r, i && (this.keyType = i), s && (this.valueType = s), o && (this.values = o), this.unwrappedType = t === "dyn" && s ? s.unwrappedType : this, t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#i : t === "dyn" ? this.fieldLazy = this.#o : t === "optional" && (this.fieldLazy = this.#r), Object.freeze(this);
  }
  hasDyn() {
    return this.#e ??= this.kind === "dyn" || this.valueType?.hasDyn() || this.keyType?.hasDyn() || !1;
  }
  hasNoDynTypes() {
    return this.hasDyn() === !1;
  }
  isDynOrBool() {
    return this.type === "bool" || this.kind === "dyn";
  }
  isEmpty() {
    return this.valueType && this.valueType.kind === "param";
  }
  hasPlaceholder() {
    return this.#n ??= this.kind === "param" || this.keyType?.hasPlaceholder() || this.valueType?.hasPlaceholder() || !1;
  }
  unify(t, n) {
    const r = this;
    if (r === n || r.kind === "dyn" || n.kind === "param") return r;
    if (n.kind === "dyn" || r.kind === "param") return n;
    if (r.kind !== n.kind || !(r.hasPlaceholder() || n.hasPlaceholder() || r.hasDyn() || n.hasDyn())) return null;
    const i = r.valueType.unify(t, n.valueType);
    if (!i) return null;
    switch (r.kind) {
      case "optional":
        return t.getOptionalType(i);
      case "list":
        return t.getListType(i);
      case "map":
        const s = r.keyType.unify(t, n.keyType);
        return s ? t.getMapType(s, i) : null;
    }
  }
  templated(t, n) {
    if (!this.hasPlaceholder()) return this;
    switch (this.kind) {
      case "dyn":
        return this.valueType.templated(t, n);
      case "param":
        return n?.get(this.name) || this;
      case "map":
        return t.getMapType(this.keyType.templated(t, n), this.valueType.templated(t, n));
      case "list":
        return t.getListType(this.valueType.templated(t, n));
      case "optional":
        return t.getOptionalType(this.valueType.templated(t, n));
      default:
        return this;
    }
  }
  toString() {
    return this.name;
  }
  #r(t, n, r, i) {
    if (t = t instanceof Yr ? t.orValue() : t, t === void 0) return Ua;
    const s = i.debugType(t);
    try {
      return Yr.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof J) return Ua;
      throw o;
    }
  }
  #i(t, n, r, i) {
    const s = i.objectTypesByConstructor.get(t.constructor);
    if (!s) return;
    if (!s.fields) return Object.hasOwn(t, n) ? t[n] : void 0;
    const o = s.fields[n];
    if (!o) return;
    const a = t[n];
    if (o.kind === "dyn") return a;
    const c = i.debugType(a);
    if (o.matches(c)) return a;
    throw new J(
      `Field '${n}' is not of type '${o}', got '${c}'`,
      r
    );
  }
  #o(t, n, r, i) {
    let s;
    if (t instanceof Map ? s = t.get(n) : s = Object.hasOwn(t, n) ? t[n] : void 0, s === void 0) return;
    if (this.valueType.kind === "dyn") return s;
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new J(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new J(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new J(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new J(`No such key: ${n}`, r);
  }
  matchesBoth(t) {
    return this.matches(t) && t.matches(this);
  }
  matches(t) {
    return this.#t.get(t) ?? this.#t.set(t, this.#c(t)).get(t);
  }
  #c(t) {
    const n = this.unwrappedType, r = t.unwrappedType;
    if (n === r || r.kind === "dyn" || r.kind === "param") return !0;
    switch (n.kind) {
      case "dyn":
      case "param":
        return !0;
      case "list":
        return r.kind === "list" && n.valueType.matches(r.valueType);
      case "map":
        return r.kind === "map" && n.keyType.matches(r.keyType) && n.valueType.matches(r.valueType);
      case "optional":
        return r.kind === "optional" && (!n.valueType || !r.valueType || n.valueType.matches(r.valueType));
      default:
        return n.name === r.name;
    }
  }
};
function nv(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
let rv = class {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(qo);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? nv(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}, os = class {
  #t;
  constructor({ operator: t, leftType: n, rightType: r, handler: i, returnType: s }) {
    this.operator = t, this.leftType = n, this.rightType = r || null, this.handler = i, this.returnType = s, r ? this.signature = `${n} ${t} ${r}: ${s}` : this.signature = `${t}${n}: ${s}`, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
};
function Im(e) {
  return new Ir({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function $n(e) {
  return new Ir({ kind: "primitive", name: e, type: e });
}
function iv(e) {
  return new Ir({ kind: "message", name: e, type: e });
}
function $m(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new Ir({ kind: "dyn", name: t, type: t, valueType: e });
}
function Cm(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new Ir({ kind: "optional", name: t, type: "optional", valueType: e });
}
function Om(e, t) {
  return new Ir({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function sv(e) {
  return new Ir({ kind: "param", name: e, type: e });
}
const We = $m(), qo = $n("ast"), sp = Im(We), op = Om(We, We), Xt = Object.freeze({
  string: $n("string"),
  bool: $n("bool"),
  int: $n("int"),
  uint: $n("uint"),
  double: $n("double"),
  bytes: $n("bytes"),
  dyn: We,
  null: $n("null"),
  type: $n("type"),
  optional: Cm(We),
  list: sp,
  "list<dyn>": sp,
  map: op,
  "map<dyn, dyn>": op
});
let ov = class {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || We, this.declarations.push(t);
  }
  findMatch(t, n = null) {
    for (let r = 0; r < this.declarations.length; r++) {
      const i = this.#t(this.declarations[r], t, n);
      if (i) return i;
    }
    return null;
  }
  #t(t, n, r) {
    if (t.hasPlaceholder()) return this.#e(t, n, r);
    if (!(r && t.receiverType && !r.matches(t.receiverType)))
      return t.matchesArgs(n);
  }
  #e(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    if (r && t.receiverType && !this.registry.matchTypeWithPlaceholders(t.receiverType, r, i))
      return null;
    for (let s = 0; s < n.length; s++)
      if (!this.registry.matchTypeWithPlaceholders(t.argTypes[s], n[s], i))
        return null;
    return {
      handler: t.handler,
      signature: t.signature,
      returnType: t.returnType.templated(this.registry, i)
    };
  }
};
function ap(e) {
  const t = [];
  let n = "", r = 0;
  for (const i of e) {
    if (i === "<") r++;
    else if (i === ">") r--;
    else if (i === "," && r === 0) {
      t.push(n), n = "";
      continue;
    }
    n += i;
  }
  return n && t.push(n), t;
}
const Bm = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [Ur, "uint"],
  [ce, "type"],
  [Yr, "optional"]
];
typeof Buffer < "u" && Bm.push([Buffer, "bytes"]);
let av = class Nm {
  #t = {};
  #e = {};
  #n;
  #r;
  #i;
  #o = /* @__PURE__ */ new Map([
    [!0, /* @__PURE__ */ new Map()],
    [!1, /* @__PURE__ */ new Map()]
  ]);
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #u = /* @__PURE__ */ new Map();
  #p = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = An(t.objectTypes), this.objectTypesByConstructor = An(t.objectTypesByConstructor), this.objectTypeInstances = An(t.objectTypeInstances), this.#i = An(t.functionDeclarations), this.#r = An(t.operatorDeclarations), this.#n = An(
      t.typeDeclarations || Object.entries(Xt),
      void 0,
      !1
    ), this.constants = An(t.constants), this.variables = t.unlistedVariablesAreDyn ? An(t.variables, ev) : An(t.variables), this.variables.size)
      XS(this, this.enableOptionalTypes);
    else {
      for (const n of Bm) this.registerType(n[1], n[0], !0);
      for (const n in As) this.registerConstant(n, "type", As[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof Ir ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new ov(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const i = this.#o.get(t)?.get(n)?.get(r);
    if (i) return i;
    for (const [, s] of this.#i)
      this.#y(!!s.receiverType, s.name, s.argTypes.length).add(s);
    return this.#y(t, n, r);
  }
  getType(t) {
    return this.#s(t, !0);
  }
  getDynType(t) {
    return this.#a.get(t) || this.#a.set(t, this.#s(`dyn<${t.unwrappedType}>`, !0)).get(t);
  }
  getListType(t) {
    return this.#c.get(t) || this.#c.set(t, this.#s(`list<${t}>`, !0)).get(t);
  }
  getMapType(t, n) {
    return this.#u.get(t)?.get(n) || (this.#u.get(t) || this.#u.set(t, /* @__PURE__ */ new Map()).get(t)).set(n, this.#s(`map<${t}, ${n}>`, !0)).get(n);
  }
  getOptionalType(t) {
    return this.#p.get(t) || this.#p.set(t, this.#s(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, n, r) {
    try {
      return this.#s(t, !0);
    } catch (i) {
      throw i.message = `Invalid ${n} '${i.unknownType || t}' in '${r}'`, i;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? qo : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: As[t] || new ce(t),
      type: this.#s(t, !1),
      ctor: typeof n == "function" ? n : n?.ctor,
      fields: this.#S(t, n?.fields)
    };
    if (!r) {
      if (this.objectTypes.has(t)) throw new Error(`Type already registered: ${t}`);
      if (typeof i.ctor != "function")
        throw new Error(`Constructor function missing for type '${t}'`);
    }
    return this.objectTypes.set(t, i), this.objectTypesByConstructor.set(i.ctor, i), r ? this : (this.objectTypeInstances.set(t, i.typeType), this.registerFunctionOverload(`type(${t}): type`, () => i.typeType), this);
  }
  getObjectType(t) {
    return this.objectTypes.get(t);
  }
  /** @returns {TypeDeclaration} */
  #s(t, n = !1) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#l(sv, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l($m, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Im, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = ap(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(Om, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(Cm, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(iv, t, t);
  }
  #l(t, n, ...r) {
    return this.#n.get(n) || this.#n.set(n, t(...r)).get(n);
  }
  findMacro(t, n, r) {
    return this.#t[n]?.get(t)?.get(r) ?? this.#d(
      this.#t,
      n,
      t,
      r,
      this.getFunctionCandidates(n, t, r).declarations.find(
        (i) => i.macro
      ) || !1
    );
  }
  #w(t, n, r) {
    const i = [];
    for (const [, s] of this.#r) {
      if (s.operator !== t) continue;
      if (s.leftType === n && s.rightType === r) return [s];
      const o = this.#E(s, n, r);
      o && i.push(o);
    }
    return i.length === 0 && (t === "==" || t === "!=") && (n.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (o, a) => o === a : (o, a) => o !== a, returnType: this.getType("bool") }] : i;
  }
  findUnaryOverload(t, n) {
    const r = this.#t[t]?.get(n);
    if (r !== void 0) return r;
    let i = !1;
    for (const [, s] of this.#r)
      if (!(s.operator !== t || s.leftType !== n)) {
        i = s;
        break;
      }
    return (this.#t[t] ??= /* @__PURE__ */ new Map()).set(n, i).get(n);
  }
  findBinaryOverload(t, n, r) {
    return this.#t[t]?.get(n)?.get(r) ?? this.#d(
      this.#t,
      t,
      n,
      r,
      this.#m(t, n, r)
    );
  }
  checkBinaryOverload(t, n, r) {
    return this.#e[t]?.get(n)?.get(r) ?? this.#d(
      this.#e,
      t,
      n,
      r,
      this.#b(t, n, r)
    );
  }
  #m(t, n, r) {
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    if (i.length === 1) return i[0];
    throw new Error(`Operator overload '${i[0].signature}' overlaps with '${i[1].signature}'.`);
  }
  #b(t, n, r) {
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    const s = i[0].returnType;
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? Xt.list : Xt.map : Xt.dyn;
  }
  #d(t, n, r, i, s) {
    const o = t[n] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(i, s), s;
  }
  #E(t, n, r) {
    const i = t.hasPlaceholder() ? /* @__PURE__ */ new Map() : null, s = this.matchTypeWithPlaceholders(t.leftType, n, i);
    if (!s) return;
    const o = this.matchTypeWithPlaceholders(t.rightType, r, i);
    if (o)
      return (t.operator === "==" || t.operator === "!=") && !s.matchesBoth(o) ? !1 : t.hasPlaceholder() ? {
        handler: t.handler,
        leftType: s,
        rightType: o,
        returnType: t.returnType.templated(this, i)
      } : t;
  }
  matchTypeWithPlaceholders(t, n, r) {
    if (!t.hasPlaceholder()) return n.matches(t) ? n : null;
    const i = n.kind === "dyn";
    return this.#f(t, n, r, i) && (i || n.matches(t.templated(this, r))) ? n : null;
  }
  #T(t, n, r) {
    const i = r.get(t);
    return i ? i.kind === "dyn" || n.kind === "dyn" ? !0 : i.matchesBoth(n) : r.set(t, n) && !0;
  }
  #f(t, n, r, i = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const s = i || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = s ? Xt.dyn : n;
        return this.#T(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#f(
          t.keyType,
          n.keyType,
          r,
          s
        ) && this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
    }
    return !0;
  }
  #x(t, n, r, i = !1) {
    try {
      const s = typeof n[r] == "string" ? { type: n[r] } : { ...n[r] };
      if (typeof s?.type != "string") throw new Error("unsupported declaration");
      return this.#s(s.type, i);
    } catch (s) {
      throw s.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, s;
    }
  }
  #S(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const i of Object.keys(n)) r[i] = this.#x(t, n, i);
    return r;
  }
  clone(t) {
    return new Nm({
      objectTypes: this.objectTypes,
      objectTypesByConstructor: this.objectTypesByConstructor,
      objectTypeInstances: this.objectTypeInstances,
      typeDeclarations: this.#n,
      operatorDeclarations: this.#r,
      functionDeclarations: this.#i,
      variables: this.variables,
      constants: this.constants,
      unlistedVariablesAreDyn: t.unlistedVariablesAreDyn,
      enableOptionalTypes: t.enableOptionalTypes
    });
  }
  /** @param {string} signature */
  #v(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, i, s, o, a] = r;
    try {
      return new rv({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: ap(o).map((c) => this.getFunctionType(c.trim())),
        handler: n
      });
    } catch (c) {
      throw new Error(`Invalid function declaration: ${t}: ${c.message}`);
    }
  }
  /**
   * @param {FunctionDeclaration} a
   * @param {FunctionDeclaration} b
   */
  #A(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== We && n.receiverType !== We) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === qo || o === qo || i === We || o === We;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #k(t) {
    for (const [, n] of this.#i)
      if (this.#A(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#v(t, r);
    this.#k(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
  }
  registerOperatorOverload(t, n) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, f] = r;
      return this.unaryOverload(u, l, n, f);
    }
    const i = t.match(
      /^([\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\w.<>]+)(?::\s*([\w.<>]+))?$/
    );
    if (!i) throw new Error(`Operator overload invalid: ${t}`);
    const [, s, o, a, c] = i;
    return this.binaryOverload(s, o, a, n, c);
  }
  unaryOverload(t, n, r, i) {
    const s = this.assertType(n, "type", `${t}${n}`), o = this.assertType(
      i || n,
      "return type",
      `${t}${n}: ${i || n}`
    ), a = new os({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= cp(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (cp(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new os({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const f = [
        new os({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, d) {
            return !i(h, p, y, d);
          },
          returnType: u
        })
      ];
      a !== c && f.push(
        new os({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return i(p, h, y, d);
          },
          returnType: u
        }),
        new os({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return !i(p, h, y, d);
          },
          returnType: u
        })
      );
      for (const h of f)
        if (this.#h(h))
          throw new Error(`Operator overload already registered: ${h.signature}`);
      for (const h of f) this.#r.set(h.signature, h);
    }
    this.#r.set(l.signature, l), this.#g();
  }
};
function cp(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function cv(e) {
  return new av(e);
}
let uv = class {
  constructor(t, n) {
    this.variables = t, this.fallbackValues = n;
  }
  getType(t) {
    return this.variables.get(t);
  }
  getValue(t) {
    return this.fallbackValues.get(t);
  }
  fork() {
    return new lv(this);
  }
}, lv = class Zl {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new Zl(this);
  }
  forkWithVariable(t, n) {
    const r = new Zl(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new J("Context must be an object");
    return this.context = t, t ? t instanceof Map ? this.getValue = this.#e : this.getValue = this.#t : this.getValue = this.#n, this;
  }
  setVariableValue(t) {
    return this.variableValue = t, this;
  }
  getValue(t) {
    return this.#n(t);
  }
  #t(t) {
    if (this.variableName === t) return this.variableValue;
    const n = Object.hasOwn(this.context, t) ? this.context[t] : void 0;
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #e(t) {
    if (this.variableName === t) return this.variableValue;
    const n = this.context.get(t);
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #n(t) {
    return this.variableName === t ? this.variableValue : this.parent.getValue(t);
  }
  getType(t) {
    return this.variableName === t ? this.variableType : this.parent.getType(t);
  }
};
function Ic(e, t) {
  if (e.op === "id") return e.args;
  throw new mt(t, e);
}
function uo(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new J(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
let fv = class {
  items;
  results;
  error;
  constructor(t, n, r, i, s) {
    this.ev = t, this.macro = n, this.firstMacroIter = n.first, this.ctx = r.forkWithVariable(n.variableType, n.predicateVar), this.each = i, this.finalizer = s;
  }
  toIterable(t) {
    if (Array.isArray(t)) return t;
    if (t instanceof Set) return [...t];
    if (t instanceof Map) return [...t.keys()];
    if (t && typeof t == "object") return Object.keys(t);
    throw new J(
      `Expression of type '${this.ev.debugType(t)}' cannot be range of a comprehension (must be list, map, or dynamic).`,
      this.macro.receiver
    );
  }
  iterate(t) {
    const n = this.toIterable(t);
    for (let r = 0; r < n.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(n[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      if (s instanceof Promise ? s = s.then((o) => this.each(this, i, o)) : s = this.each(this, i, s), s instanceof Promise) return s.then(() => this.iterateAsync(n, r));
    }
    return this.finalizer(this);
  }
  async iterateAsync(t, n = 0) {
    t instanceof Promise && (t = this.toIterable(await t));
    for (let r = n; r < t.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(t[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      s = this.each(this, i, s instanceof Promise ? await s : s), s instanceof Promise && await s;
    }
    return this.finalizer(this);
  }
};
function ks(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new fv(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function dv(e, t, n) {
  if (uo(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function hv(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function pv(e, t, n) {
  if (uo(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function gv(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function yv(e, t, n) {
  if (uo(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function wv(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function Pm(e) {
  return e.results || [];
}
function mv(e, t, n) {
  if (n === !1) return;
  if (uo(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function bv(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function Ev(e, t, n) {
  if (uo(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function Tv(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function ld(e, t, n) {
  const r = Tv(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function Lu({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = ld(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return a;
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Ic(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function up(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = ks(
    e ? mv : bv,
    Pm
  );
  function i(s, o, a) {
    if (a = ld(s, o, a), o.variableType = a.variableType, e) {
      const c = s.check(o.first, a);
      if (!c.isDynOrBool())
        throw new s.Error(
          `${o.functionDesc} filter predicate must return bool, got '${c}'`,
          o.first
        );
    }
    return s.getType(`list<${s.check(e ? o.second : o.first, a)}>`);
  }
  return ({ args: s, receiver: o }) => ({
    args: s,
    functionDesc: t,
    receiver: o,
    first: s[1],
    second: e ? s[2] : null,
    predicateVar: Ic(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function xv() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = ks(Ev, Pm);
  function r(i, s, o) {
    o = ld(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return i.getType(`list<${s.variableType}>`);
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    args: i,
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Ic(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function Sv() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new J(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function n(r, i, s) {
    let o = i.args[0];
    if (o.op !== ".") throw new r.Error(e, o);
    if (!i.macroHasProps) {
      const a = [];
      for (; (o.op === "." || o.op === ".?") && a.push(o); ) o = o.args[0];
      if (o.op !== "id") throw new r.Error(e, o);
      r.check(o, s), a.push(o), i.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: n };
  };
}
function vv(e) {
  e.registerFunctionOverload("has(ast): bool", Sv()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    Lu({
      description: "all(var, predicate)",
      evaluator: ks(dv, hv)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    Lu({
      description: "exists(var, predicate)",
      evaluator: ks(pv, gv)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    Lu({
      description: "exists_one(var, predicate)",
      evaluator: ks(yv, wv)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", up(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", up(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", xv());
  function t(i, s, o, a) {
    return i.eval(
      s.exp,
      o.forkWithVariable(s.val.checkedType, s.var).setVariableValue(a)
    );
  }
  class n {
  }
  const r = new n();
  e.registerType("CelNamespace", n), e.registerConstant("cel", "CelNamespace", r), e.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: i }) => ({
    var: Ic(i[0], "invalid variable argument"),
    val: i[1],
    exp: i[2],
    typeCheck(s, o, a) {
      const c = a.forkWithVariable(s.check(o.val, a), o.var);
      return s.check(o.exp, c);
    },
    evaluate(s, o, a) {
      const c = s.eval(o.val, a);
      return c instanceof Promise ? c.then((u) => t(s, o, a, u)) : t(s, o, a, c);
    }
  }));
}
function Av(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new J(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, f) => r(u * l, f)), n("int", "+", "int", (u, l, f) => r(u + l, f)), n("int", "-", "int", (u, l, f) => r(u - l, f)), n("int", "/", "int", (u, l, f) => {
    if (l === 0n) throw new J("division by zero", f);
    return u / l;
  }), n("int", "%", "int", (u, l, f) => {
    if (l === 0n) throw new J("modulo by zero", f);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const f = new Uint8Array(u.length + l.length);
    return f.set(u, 0), f.set(l, u.length), f;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => jo.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, f, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (as(u, p, h)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : Object.hasOwn(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, f, h) {
    return o(u, l, f, h);
  }
  n("V", "in", "list<V>", c), n("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    n(u, "==", u, (l, f) => l === f);
  n("bytes", "==", "bytes", (u, l) => {
    let f = u.length;
    if (f !== l.length) return !1;
    for (; f--; ) if (u[f] !== l[f]) return !1;
    return !0;
  }), n("list<V>", "==", "list<V>", (u, l, f, h) => {
    if (Array.isArray(u) && Array.isArray(l)) {
      const d = u.length;
      if (d !== l.length) return !1;
      for (let g = 0; g < d; g++)
        if (!as(u[g], l[g], h)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const d of u) if (!l.has(d)) return !1;
      return !0;
    }
    const p = u instanceof Set ? l : u, y = u instanceof Set ? u : l;
    if (!Array.isArray(p) || p.length !== y?.size) return !1;
    for (let d = 0; d < p.length; d++) if (!y.has(p[d])) return !1;
    return !0;
  }), n("map<K, V>", "==", "map<K, V>", (u, l, f, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [d, g] of u)
        if (!(l.has(d) && as(g, l.get(d), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const d = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(d);
      if (g.size !== m.length) return !1;
      for (const [v, k] of g)
        if (!(v in d && as(k, d[v], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let d = 0; d < p.length; d++) {
      const g = p[d];
      if (!(g in l && as(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new Ur(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new Ur(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new Ur(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new J("division by zero", f);
    return new Ur(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new J("modulo by zero", f);
    return new Ur(u.valueOf() % l.valueOf());
  });
  for (const [u, l] of [
    ["int", "int"],
    ["uint", "uint"],
    ["double", "double"],
    ["string", "string"],
    ["google.protobuf.Timestamp", "google.protobuf.Timestamp"],
    ["google.protobuf.Duration", "google.protobuf.Duration"],
    ["int", "uint"],
    ["int", "double"],
    ["double", "int"],
    ["double", "uint"],
    ["uint", "int"],
    ["uint", "double"]
  ])
    n(u, "<", l, (f, h) => f < h), n(u, "<=", l, (f, h) => f <= h), n(u, ">", l, (f, h) => f > h), n(u, ">=", l, (f, h) => f >= h);
}
function as(e, t, n) {
  if (e === t) return !0;
  switch (typeof e) {
    case "string":
      return !1;
    case "bigint":
      return typeof t == "number" ? e == t : !1;
    case "number":
      return typeof t == "bigint" ? e == t : !1;
    case "boolean":
      return !1;
    case "object":
      if (typeof t != "object" || e === null || t === null) return !1;
      const r = n.objectTypesByConstructor.get(e.constructor)?.type, i = n.objectTypesByConstructor.get(t.constructor)?.type;
      if (!r || r !== i) return !1;
      const s = n.registry.findBinaryOverload("==", r, i);
      return s ? s.handler(e, t, null, n) : !1;
  }
  throw new J(`Cannot compare values of type ${typeof e}`);
}
let Rm = class {
  dynType = Xt.dyn;
  optionalType = Xt.optional;
  stringType = Xt.string;
  intType = Xt.int;
  doubleType = Xt.double;
  boolType = Xt.bool;
  nullType = Xt.null;
  listType = Xt.list;
  mapType = Xt.map;
  constructor(t) {
    this.opts = t.opts, this.objectTypes = t.objectTypes, this.objectTypesByConstructor = t.objectTypesByConstructor, this.registry = t.registry;
  }
  /**
   * Get a TypeDeclaration instance for a type name
   * @param {string} typeName - The type name (e.g., 'string', 'int', 'dyn')
   * @returns {TypeDeclaration} The type declaration instance
   */
  getType(t) {
    return this.registry.getType(t);
  }
  debugType(t) {
    switch (typeof t) {
      case "string":
        return this.stringType;
      case "bigint":
        return this.intType;
      case "number":
        return this.doubleType;
      case "boolean":
        return this.boolType;
      case "object":
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || lp(this, t.constructor?.name || typeof t);
      default:
        lp(this, typeof t);
    }
  }
};
function lp(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function Yo(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function fp(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function dp(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function hp(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function pp(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function _a(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function kv(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function gp(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw kv(e, n, t.args[0]);
}
function yp(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function wp(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => yp(e, t, i)) : yp(e, t, r);
}
function Iv(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function $v(e, t, n) {
  return Yo(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Iv);
}
function mp(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => bp(e, t, n, s)) : bp(e, t, n, i);
}
function bp(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw _a(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw _a(e, n, t.args[0]);
  return !1;
}
function Ep(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Tp(e, t, n, s)) : Tp(e, t, n, i);
}
function Tp(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw _a(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw _a(e, n, t.args[0]);
  return !0;
}
function xp(e, t, n) {
  const r = e.check(t.args[0], n), i = e.check(t.args[1], n);
  if (!r.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(r)}'`,
      t
    );
  if (!i.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(i)}'`,
      t
    );
  return e.boolType;
}
function Sp(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function Cv(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function vp(e, t, n) {
  const [r, i] = t.args, s = i.length, o = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !1,
    r,
    s
  ), a = t.argTypes ??= new Array(s);
  let c = s;
  for (; c--; ) a[c] = e.debugOperandType(n[c], i[c].checkedType);
  const u = o.findMatch(a, null);
  if (u) return u.handler.apply(e, n);
  throw new e.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function Ov(e, t, n, r) {
  const [i, s, o] = t.args, a = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !0,
    i,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = e.debugOperandType(r[c], o[c].checkedType);
  const l = e.debugRuntimeType(n, s.checkedType || e.dynType), f = a.findMatch(u, l);
  if (f) return f.handler.call(e, n, ...r);
  throw new e.Error(
    `found no matching overload for '${l.type}.${i}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function Du(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function Ap(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function Vu(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function Mu(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const La = {
  value: {
    check(e, t) {
      return e.debugType(t.args);
    },
    evaluate(e, t) {
      return t.args;
    }
  },
  id: {
    check(e, t, n) {
      const r = n.getType(t.args);
      if (r !== void 0) return r;
      throw new e.Error(`Unknown variable: ${t.args}`, t);
    },
    evaluate(e, t, n) {
      const r = t.checkedType || n.getType(t.args), i = r && n.getValue(t.args);
      if (i === void 0) throw new e.Error(`Unknown variable: ${t.args}`, t);
      if (r.kind === "dyn") return e.debugType(i) && i;
      const s = e.debugType(i);
      if (r.matches(s)) return i;
      throw new e.Error(`Variable '${t.args}' is not of type '${r}', got '${s}'`, t);
    }
  },
  ".": {
    check: fp,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Mu(e, t, i, t.args[1])) : Mu(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: dp,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Vu(e, t, i, t.args[1])) : Vu(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: fp,
    evaluate(e, t, n) {
      return Yo(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Mu);
    }
  },
  "[?]": {
    check: dp,
    evaluate(e, t, n) {
      return Yo(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), Vu);
    }
  },
  call: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[1], s = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !1,
        r,
        i.length
      ), o = i.map((c) => e.check(c, n)), a = s.findMatch(o);
      if (!a)
        throw new e.Error(
          `found no matching overload for '${r}(${e.formatTypeList(o)})'`,
          t
        );
      return a.returnType;
    },
    evaluate(e, t, n) {
      if (t.macro) return t.macro.evaluate(e, t.macro, n);
      const r = Du(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => vp(e, t, i)) : vp(e, t, r);
    }
  },
  rcall: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[2], s = e.check(t.args[1], n), o = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !0,
        r,
        i.length
      ), a = i.map((u) => e.check(u, n));
      if (s.kind === "dyn" && o.returnType) return o.returnType;
      const c = o.findMatch(a, s);
      if (!c)
        throw new e.Error(
          `found no matching overload for '${s.type}.${r}(${e.formatTypeList(
            a
          )})'`,
          t
        );
      return c.returnType;
    },
    evaluate(e, t, n) {
      return t.macro ? t.macro.evaluate(e, t.macro, n) : Yo(
        e,
        t,
        e.eval(t.args[1], n),
        Du(e, n, t.args[2]),
        Ov
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? hp : pp;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return Du(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? hp : pp;
      let o = e.check(r[0][0], n), a = e.check(r[0][1], n);
      for (let c = 1; c < i; c++) {
        const [u, l] = r[c];
        o = s(e, n, o, u, 1), a = s(e, n, a, l, 2);
      }
      return e.registry.getMapType(o, a);
    },
    evaluate(e, t, n) {
      const r = t.args, i = r.length, s = new Array(i);
      let o;
      for (let a = 0; a < i; a++) {
        const [c, u] = r[a], l = e.eval(c, n), f = e.eval(u, n);
        l instanceof Promise || f instanceof Promise ? (s[a] = Promise.all([l, f]), o ??= !0) : s[a] = [l, f];
      }
      return o ? Promise.all(s).then(Ap) : Ap(s);
    }
  },
  "?:": {
    check(e, t, n) {
      const r = e.check(t.args[0], n);
      if (!r.isDynOrBool())
        throw new e.Error(
          `Ternary condition must be bool, got '${e.formatType(r)}'`,
          t
        );
      const i = e.check(t.args[1], n), s = e.check(t.args[2], n), o = i.unify(e.registry, s);
      if (o) return o;
      throw new e.Error(
        `Ternary branches must have the same type, got '${e.formatType(
          i
        )}' and '${e.formatType(s)}'`,
        t
      );
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => gp(e, t, i, n)) : gp(e, t, r, n);
    }
  },
  "||": {
    check: xp,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => mp(e, t, i, n)) : mp(e, t, r, n);
    }
  },
  "&&": {
    check: xp,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Ep(e, t, i, n)) : Ep(e, t, r, n);
    }
  },
  "!_": { check: Sp, evaluate: wp },
  "-_": { check: Sp, evaluate: wp }
}, Bv = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of Bv) La[e] = { check: Cv, evaluate: $v };
for (const e in La) La[e].name = e;
const Nv = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
let kp = class extends Rm {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? J : ZS;
  }
  /**
   * Check an expression and return its inferred type
   * @param {Array|any} ast - The AST node to check
   * @returns {Object} The inferred type declaration
   * @throws {TypeError} If type checking fails
   */
  check(t, n) {
    return t.checkedType ??= t.check(this, t, n);
  }
  checkAccessOnType(t, n, r, i = !1) {
    if (r.kind === "dyn") return r;
    const s = (t.op === "[]" || t.op === "[?]" ? this.check(t.args[1], n) : this.stringType).type;
    if (r.kind === "list") {
      if (s !== "int" && s !== "dyn")
        throw new this.Error(`List index must be int, got '${s}'`, t);
      return r.valueType;
    }
    if (r.kind === "map") return r.valueType;
    const o = this.objectTypes.get(r.name);
    if (o) {
      if (!(s === "string" || s === "dyn"))
        throw new this.Error(
          `Cannot index type '${r.name}' with type '${s}'`,
          t
        );
      if (o.fields) {
        const a = t.op === "." || t.op === ".?" ? t.args[1] : void 0;
        if (a) {
          const c = o.fields[a];
          if (c) return c;
          if (i) return this.dynType;
          throw new this.Error(`No such key: ${a}`, t);
        }
      }
      return this.dynType;
    }
    throw new this.Error(`Cannot index type '${this.formatType(r)}'`, t);
  }
  formatType(t) {
    return t.hasPlaceholder() ? t.templated(this.registry, Nv).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
};
const H = {
  EOF: 0,
  NUMBER: 1,
  STRING: 2,
  BOOLEAN: 3,
  NULL: 4,
  IDENTIFIER: 5,
  PLUS: 6,
  MINUS: 7,
  MULTIPLY: 8,
  DIVIDE: 9,
  MODULO: 10,
  EQ: 11,
  NE: 12,
  LT: 13,
  LE: 14,
  GT: 15,
  GE: 16,
  AND: 17,
  OR: 18,
  NOT: 19,
  IN: 20,
  LPAREN: 21,
  RPAREN: 22,
  LBRACKET: 23,
  RBRACKET: 24,
  LBRACE: 25,
  RBRACE: 26,
  DOT: 27,
  COMMA: 28,
  COLON: 29,
  QUESTION: 30,
  BYTES: 31
};
let Pv = class Um {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = La[r];
    this.#t = n, this.#e = t, this.op = r, this.check = s.check, this.evaluate = s.evaluate, this.args = i;
  }
  get input() {
    return this.#t;
  }
  get pos() {
    return this.#e;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((n) => n instanceof Um ? n.toOldStructure() : n)];
  }
};
const Zo = {};
for (const e in H) Zo[H[e]] = e;
const Rv = /* @__PURE__ */ new Set([
  "as",
  "break",
  "const",
  "continue",
  "else",
  "for",
  "function",
  "if",
  "import",
  "let",
  "loop",
  "package",
  "namespace",
  "return",
  "var",
  "void",
  "while"
]), _m = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") _m[e.charCodeAt(0)] = 1;
const Ip = {
  "\\": "\\",
  "?": "?",
  '"': '"',
  "'": "'",
  "`": "`",
  a: "\x07",
  b: "\b",
  f: "\f",
  n: `
`,
  r: "\r",
  t: "	",
  v: "\v"
};
let Uv = class {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: H.EOF, value: null, pos: t };
      const i = n[t];
      switch (i) {
        // Whitespaces
        case " ":
        case "	":
        case `
`:
        case "\r":
          this.pos++;
          continue;
        // Operators
        case "=":
          if (n[t + 1] !== "=") break;
          return { type: H.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: H.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: H.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: H.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: H.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: H.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: H.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: H.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: H.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: H.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: H.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: H.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: H.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: H.NOT, pos: this.pos++ };
        case "(":
          return { type: H.LPAREN, pos: this.pos++ };
        case ")":
          return { type: H.RPAREN, pos: this.pos++ };
        case "[":
          return { type: H.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: H.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: H.LBRACE, pos: this.pos++ };
        case "}":
          return { type: H.RBRACE, pos: this.pos++ };
        case ".":
          return { type: H.DOT, pos: this.pos++ };
        case ",":
          return { type: H.COMMA, pos: this.pos++ };
        case ":":
          return { type: H.COLON, pos: this.pos++ };
        case "?":
          return { type: H.QUESTION, pos: this.pos++ };
        case '"':
        case "'":
          return this.readString(i);
        // Check for string prefixes (b, B, r, R followed by quote)
        case "b":
        case "B":
        case "r":
        case "R": {
          const s = n[t + 1];
          return s === '"' || s === "'" ? ++this.pos && this.readString(s, i) : this.readIdentifier();
        }
        default: {
          const s = i.charCodeAt(0);
          if (s <= 57 && s >= 48) return this.readNumber();
          if (this._isIdentifierCharCode(s)) return this.readIdentifier();
        }
      }
      throw new mt(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: H.NUMBER, value: r, pos: t };
    throw new mt(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: H.NUMBER,
          value: new Ur(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: H.NUMBER,
          value: BigInt(s),
          pos: t
        };
      } catch {
      }
    throw new mt(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
      pos: t,
      input: this.input
    });
  }
  _readDigits(t, n, r, i) {
    for (; r < n && (i = t.charCodeAt(r)) && !(i > 57 || i < 48); ) r++;
    return r;
  }
  _readExponent(t, n, r) {
    let i = r < n && t[r];
    if (i === "e" || i === "E") {
      i = ++r < n && t[r], (i === "-" || i === "+") && r++;
      const s = r;
      if (r = this._readDigits(t, n, r), s === r) throw new mt("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && _m[t[i].charCodeAt(0)]; ) i++;
      return this._parseAsBigInt(r, this.pos = i, !0, t[i]);
    }
    if (i = this._readDigits(t, n, i), i + 1 < n) {
      let s = !1, o = t[i] === "." ? this._readDigits(t, n, i + 1) : i + 1;
      if (o !== i + 1 && (s = !0) && (i = o), o = this._readExponent(t, n, i), o !== i && (s = !0) && (i = o), s) return this._parseAsDouble(r, this.pos = i);
    }
    return this._parseAsBigInt(r, this.pos = i, !1, t[i]);
  }
  readString(t, n) {
    const { input: r, pos: i } = this;
    return r[i + 1] === t && r[i + 2] === t ? this.readTripleQuotedString(t, n) : this.readSingleQuotedString(t, n);
  }
  _closeQuotedString(t, n, r) {
    switch (n) {
      case "b":
      case "B": {
        const i = this.processEscapes(t, !0), s = new Uint8Array(i.length);
        for (let o = 0; o < i.length; o++) s[o] = i.charCodeAt(o) & 255;
        return { type: H.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: H.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: H.STRING, value: i, pos: r };
      }
    }
  }
  readSingleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 1;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          const c = r.slice(s + 1, a);
          return this.pos = ++a, this._closeQuotedString(c, n, s);
        case `
`:
        case "\r":
          throw new mt("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new mt("Unterminated string", { pos: s, input: r });
  }
  readTripleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 3;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          if (r[a + 1] === t && r[a + 2] === t) {
            const c = r.slice(s + 3, a);
            return this.pos = a + 3, this._closeQuotedString(c, n, s);
          }
          break;
        case "\\":
          a++;
      }
      a++;
    }
    throw new mt("Unterminated triple-quoted string", { pos: s, input: r });
  }
  processEscapes(t, n) {
    if (!t.includes("\\")) return t;
    let r = "", i = 0;
    for (; i < t.length; ) {
      if (t[i] !== "\\" || i + 1 >= t.length) {
        r += t[i++];
        continue;
      }
      const s = t[i + 1];
      if (Ip[s])
        r += Ip[s], i += 2;
      else if (s === "u") {
        if (n) throw new mt("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new mt(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new mt(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new mt("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new mt(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new mt(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new mt(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new mt(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new mt("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new mt(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new mt(`Invalid escape sequence: \\${s}`);
    }
    return r;
  }
  readIdentifier() {
    const { pos: t, input: n, length: r } = this;
    let i = t;
    for (; i < r && this._isIdentifierCharCode(n[i].charCodeAt(0)); ) i++;
    const s = n.substring(t, this.pos = i);
    switch (s) {
      case "true":
        return { type: H.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: H.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: H.NULL, value: null, pos: t };
      case "in":
        return { type: H.IN, value: "in", pos: t };
      default:
        return { type: H.IDENTIFIER, value: s, pos: t };
    }
  }
}, _v = class {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new mt(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new Pv(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new mt(
      `Expected ${Zo[t]}, got ${Zo[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new Uv(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(H.EOF)) return n;
    throw new mt(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #r(t, n, r, i) {
    const s = this.registry.findMacro(i, !!r, n.length);
    return s && (t.macro = s.handler({ ast: t, args: n, receiver: r, methodName: i, parser: this })), t;
  }
  #i(t) {
    return this.#r(t, t.args[1], null, t.args[0]);
  }
  #o(t) {
    return this.#r(t, t.args[2], t.args[1], t.args[0]);
  }
  // Expression ::= LogicalOr ('?' Expression ':' Expression)?
  parseExpression() {
    this.maxDepthRemaining-- || this.#t("maxDepth");
    const t = this.parseLogicalOr();
    if (!this.match(H.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(H.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(H.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(H.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(H.EQ) || this.match(H.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(H.LT) || this.match(H.LE) || this.match(H.GT) || this.match(H.GE) || this.match(H.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(H.PLUS) || this.match(H.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(H.MULTIPLY) || this.match(H.DIVIDE) || this.match(H.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === H.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === H.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(H.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(H.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume(H.IDENTIFIER);
        if (this.match(H.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(H.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match(H.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(H.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume(H.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case H.NUMBER:
      case H.STRING:
      case H.BYTES:
      case H.BOOLEAN:
      case H.NULL:
        return this.#a();
      case H.IDENTIFIER:
        return this.#c();
      case H.LPAREN:
        return this.#u();
      case H.LBRACKET:
        return this.parseList();
      case H.LBRACE:
        return this.parseMap();
    }
    throw new mt(`Unexpected token: ${Zo[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume(H.IDENTIFIER);
    if (Rv.has(t))
      throw new mt(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(H.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(H.RPAREN), this.#i(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume(H.LPAREN);
    const t = this.parseExpression();
    return this.consume(H.RPAREN), t;
  }
  parseList() {
    const t = this.consume(H.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(H.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match(H.COMMA) && (this.#n(), !this.match(H.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume(H.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume(H.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(H.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match(H.COMMA) && (this.#n(), !this.match(H.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume(H.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(H.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(H.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match(H.COMMA) && (this.#n(), !this.match(H.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
};
const fd = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), Lv = new Set(Object.keys(fd));
function Dv(e, t = fd) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!Lv.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const Vv = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: fd
});
function Hu(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function Mv(e, t = Vv) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: Hu(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: Hu(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: Hu(e, t, "enableOptionalTypes"),
    limits: Dv(e.limits, t.limits)
  }) : t;
}
const $c = cv({ enableOptionalTypes: !1 });
tv($c);
Av($c);
vv($c);
const $p = /* @__PURE__ */ new WeakMap();
let Cc = class Xl {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = Mv(t, n?.opts), this.#t = (n instanceof Xl ? $p.get(n) : $c).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new kp(r), this.#r = new kp(r, !0), this.#e = new Hv(r), this.#i = new _v(this.opts.limits, this.#t), this.#o = new uv(this.#t.variables, this.#t.constants), $p.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new Xl(t, this);
  }
  registerFunction(t, n) {
    return this.#t.registerFunctionOverload(t, n), this;
  }
  registerOperator(t, n) {
    return this.#t.registerOperatorOverload(t, n), this;
  }
  registerType(t, n) {
    return this.#t.registerType(t, n), this;
  }
  registerVariable(t, n) {
    return this.#t.registerVariable(t, n), this;
  }
  registerConstant(t, n, r) {
    return this.#t.registerConstant(t, n, r), this;
  }
  hasVariable(t) {
    return this.#t.variables.has(t);
  }
  check(t) {
    try {
      return this.#a(this.#i.parse(t));
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #a(t) {
    try {
      const n = this.#n.check(t, this.#o.fork());
      return { valid: !0, type: this.#c(n) };
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #c(t) {
    return t.name === "list<dyn>" ? "list" : t.name === "map<dyn, dyn>" ? "map" : t.name;
  }
  parse(t) {
    const n = this.#i.parse(t), r = this.#u.bind(this, n);
    return r.check = this.#a.bind(this, n), r.ast = n, r;
  }
  evaluate(t, n) {
    return this.#u(this.#i.parse(t), n);
  }
  #u(t, n = null) {
    const r = this.#o.fork().withContext(n);
    return t.checkedType || this.#r.check(t, r), this.#e.eval(t, r);
  }
}, Hv = class extends Rm {
  constructor(t) {
    super(t), this.Error = J;
  }
  #t(t, n) {
    const r = t instanceof Array ? t[0] : t.values().next().value;
    return r === void 0 ? n : this.registry.getListType(this.debugRuntimeType(r, n.valueType));
  }
  #e(t) {
    if (t instanceof Map) return t.entries().next().value;
    for (const n in t) return [n, t[n]];
  }
  #n(t, n) {
    const r = this.#e(t);
    return r ? this.registry.getMapType(
      this.debugRuntimeType(r[0], n.keyType),
      this.debugRuntimeType(r[1], n.valueType)
    ) : n;
  }
  debugOperandType(t, n) {
    return n?.hasNoDynTypes() ? n : this.registry.getDynType(this.debugRuntimeType(t, n));
  }
  debugRuntimeType(t, n) {
    if (n?.hasNoDynTypes()) return n;
    const r = this.debugType(t);
    switch (r.kind) {
      case "list":
        return this.#t(t, r);
      case "map":
        return this.#n(t, r);
      default:
        return r;
    }
  }
  tryEval(t, n) {
    try {
      const r = this.eval(t, n);
      return r instanceof Promise ? r.catch((i) => i) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, n) {
    return t.evaluate(this, t, n);
  }
};
new Cc({
  unlistedVariablesAreDyn: !0
});
const dd = "amount", Fv = "expiry", Wv = "birth", Kv = "weight", zv = "inputType", jv = "script", Vi = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, Cp = new Cc().registerVariable(dd, "double").registerVariable(jv, "string").registerFunction(Vi.signature, Vi.implementation), Gv = new Cc().registerVariable(dd, "double").registerVariable(Fv, "double").registerVariable(Wv, "double").registerVariable(Kv, "double").registerVariable(zv, "string").registerFunction(Vi.signature, Vi.implementation), qv = new Cc().registerVariable(dd, "double").registerFunction(Vi.signature, Vi.implementation);
let Be = class Lm {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new Lm(this.value + t.value);
  }
};
Be.ZERO = new Be(0);
let Yv = class {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? $o(t.offchainInput, Gv) : void 0, this.intentOnchainInput = t.onchainInput ? $o(t.onchainInput, qv) : void 0, this.intentOffchainOutput = t.offchainOutput ? $o(t.offchainOutput, Cp) : void 0, this.intentOnchainOutput = t.onchainOutput ? $o(t.onchainOutput, Cp) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return Be.ZERO;
    const n = Zv(t);
    return new Be(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return Be.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new Be(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return Be.ZERO;
    const n = Op(t);
    return new Be(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return Be.ZERO;
    const n = Op(t);
    return new Be(this.intentOnchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given set of inputs and outputs
   * @param offchainInputs - Array of offchain inputs to evaluate
   * @param onchainInputs - Array of onchain inputs to evaluate
   * @param offchainOutputs - Array of offchain outputs to evaluate
   * @param onchainOutputs - Array of onchain outputs to evaluate
   * @returns The total fee amount
   */
  eval(t, n, r, i) {
    let s = Be.ZERO;
    for (const o of t)
      s = s.add(this.evalOffchainInput(o));
    for (const o of n)
      s = s.add(this.evalOnchainInput(o));
    for (const o of r)
      s = s.add(this.evalOffchainOutput(o));
    for (const o of i)
      s = s.add(this.evalOnchainOutput(o));
    return s;
  }
};
function Zv(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function Op(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function $o(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const cs = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function Xv(e, t, n, r) {
  const i = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), s = [];
  let o = [];
  for (const u of i)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && i.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...cs,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: On.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : i.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...cs, arkTxid: u.txid },
      tag: "offchain",
      type: On.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !s.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = i.filter((d) => d.txid === u.arkTxId), h = i.filter((d) => d.arkTxId === u.arkTxId).reduce((d, g) => d + g.value, 0);
        let p = 0, y = 0;
        if (l.length > 0) {
          const d = l.reduce((g, m) => g + m.value, 0);
          p = h - d, y = l[0].createdAt.getTime();
        } else
          p = h, y = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        s.push({
          key: { ...cs, arkTxid: u.arkTxId },
          tag: "offchain",
          type: On.TxSent,
          amount: p,
          settled: !0,
          createdAt: y
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !s.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = i.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((y) => u.settledBy === y)), h = i.filter((p) => p.settledBy === u.settledBy).reduce((p, y) => p + y.value, 0);
        if (l.length > 0) {
          const p = l.reduce((y, d) => y + d.value, 0);
          h > p && s.push({
            key: { ...cs, commitmentTxid: u.settledBy },
            tag: "exit",
            type: On.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          s.push({
            key: { ...cs, commitmentTxid: u.settledBy },
            tag: "exit",
            type: On.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...s, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
const sn = "vtxos", on = "utxos", an = "transactions", Qn = "walletState", Ne = "contracts", Bp = "contractsCollections", Dm = 2;
function Vm(e) {
  if (!e.objectStoreNames.contains(sn)) {
    const t = e.createObjectStore(sn, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    }), t.indexNames.contains("virtualStatus") || t.createIndex("virtualStatus", "virtualStatus", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("isSpent") || t.createIndex("isSpent", "isSpent", {
      unique: !1
    }), t.indexNames.contains("isUnrolled") || t.createIndex("isUnrolled", "isUnrolled", {
      unique: !1
    }), t.indexNames.contains("spentBy") || t.createIndex("spentBy", "spentBy", {
      unique: !1
    }), t.indexNames.contains("settledBy") || t.createIndex("settledBy", "settledBy", {
      unique: !1
    }), t.indexNames.contains("arkTxId") || t.createIndex("arkTxId", "arkTxId", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(on)) {
    const t = e.createObjectStore(on, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(an)) {
    const t = e.createObjectStore(an, {
      keyPath: [
        "address",
        "keyBoardingTxid",
        "keyCommitmentTxid",
        "keyArkTxid"
      ]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("amount") || t.createIndex("amount", "amount", {
      unique: !1
    }), t.indexNames.contains("settled") || t.createIndex("settled", "settled", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("arkTxid") || t.createIndex("arkTxid", "key.arkTxid", {
      unique: !1
    });
  }
  if (e.objectStoreNames.contains(Qn) || e.createObjectStore(Qn, {
    keyPath: "key"
  }), !e.objectStoreNames.contains(Ne)) {
    const t = e.createObjectStore(Ne, {
      keyPath: "script"
    });
    t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("state") || t.createIndex("state", "state", {
      unique: !1
    });
  }
  e.objectStoreNames.contains(Bp) || e.createObjectStore(Bp, {
    keyPath: "key"
  });
}
const Da = ([e, t]) => ({
  cb: P.encode(fn.encode(e)),
  s: P.encode(t)
}), Qv = (e) => ({
  ...e,
  tapTree: P.encode(e.tapTree),
  forfeitTapLeafScript: Da(e.forfeitTapLeafScript),
  intentTapLeafScript: Da(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.encode)
}), Jv = (e) => ({
  ...e,
  tapTree: P.encode(e.tapTree),
  forfeitTapLeafScript: Da(e.forfeitTapLeafScript),
  intentTapLeafScript: Da(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.encode)
}), Va = (e) => {
  const t = fn.decode(P.decode(e.cb)), n = P.decode(e.s);
  return [t, n];
}, t1 = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: P.decode(e.tapTree),
  forfeitTapLeafScript: Va(e.forfeitTapLeafScript),
  intentTapLeafScript: Va(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.decode)
}), e1 = (e) => ({
  ...e,
  tapTree: P.decode(e.tapTree),
  forfeitTapLeafScript: Va(e.forfeitTapLeafScript),
  intentTapLeafScript: Va(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(P.decode)
});
function n1() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const Is = /* @__PURE__ */ new Map(), Wr = /* @__PURE__ */ new Map();
async function Mm(e, t, n) {
  const { globalObject: r } = n1();
  if (!r.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const i = Is.get(e);
  if (i) {
    if (i.version !== t)
      throw new Error(`Database "${e}" already opened with version ${i.version}; requested ${t}`);
    return Wr.set(e, (Wr.get(e) ?? 0) + 1), i.promise;
  }
  const s = new Promise((o, a) => {
    const c = r.indexedDB.open(e, t);
    c.onerror = () => {
      Is.delete(e), Wr.delete(e), a(c.error);
    }, c.onsuccess = () => {
      o(c.result);
    }, c.onupgradeneeded = () => {
      const u = c.result;
      n(u);
    }, c.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return Is.set(e, { version: t, promise: s }), Wr.set(e, 1), s;
}
async function Hm(e) {
  const t = Is.get(e);
  if (!t)
    return !1;
  const n = (Wr.get(e) ?? 1) - 1;
  if (n > 0)
    return Wr.set(e, n), !1;
  Wr.delete(e), Is.delete(e);
  try {
    (await t.promise).close();
  } catch {
  }
  return !0;
}
const Fm = "arkade-service-worker";
let r1 = class {
  constructor(t = Fm) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([Ne], "readwrite"), s = i.objectStore(Ne), o = i.objectStore(Ne), a = s.clear(), c = o.clear();
        let u = 0;
        const l = () => {
          u++, u === 2 && n();
        };
        a.onsuccess = l, c.onsuccess = l, a.onerror = () => r(a.error), c.onerror = () => r(c.error);
      });
    } catch (t) {
      throw console.error("Failed to clear contract data:", t), t;
    }
  }
  async getContracts(t) {
    try {
      const r = (await this.getDB()).transaction([Ne], "readonly").objectStore(Ne);
      if (!t || Object.keys(t).length === 0)
        return new Promise((o, a) => {
          const c = r.getAll();
          c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
        });
      const i = s1(t);
      if (i.has("script")) {
        const o = i.get("script"), a = await Promise.all(o.map((c) => new Promise((u, l) => {
          const f = r.get(c);
          f.onerror = () => l(f.error), f.onsuccess = () => u(f.result);
        })));
        return this.applyContractFilter(a, i);
      }
      if (i.has("state")) {
        const o = await this.getContractsByIndexValues(r, "state", i.get("state"));
        return this.applyContractFilter(o, i);
      }
      if (i.has("type")) {
        const o = await this.getContractsByIndexValues(r, "type", i.get("type"));
        return this.applyContractFilter(o, i);
      }
      const s = await new Promise((o, a) => {
        const c = r.getAll();
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      });
      return this.applyContractFilter(s, i);
    } catch (n) {
      return console.error("Failed to get contracts:", n), [];
    }
  }
  async saveContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([Ne], "readwrite").objectStore(Ne).put(t);
        a.onerror = () => i(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save contract:", n), n;
    }
  }
  async deleteContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([Ne], "readwrite").objectStore(Ne), a = o.get(t);
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = o.delete(t);
          c.onerror = () => i(c.error), c.onsuccess = () => r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to delete contract ${t}:`, n), n;
    }
  }
  getContractsByIndexValues(t, n, r) {
    if (r.length === 0)
      return Promise.resolve([]);
    const i = t.index(n), s = r.map((o) => new Promise((a, c) => {
      const u = i.getAll(o);
      u.onerror = () => c(u.error), u.onsuccess = () => a(u.result ?? []);
    }));
    return Promise.all(s).then((o) => o.flatMap((a) => a));
  }
  applyContractFilter(t, n) {
    return t.filter((r) => !(r === void 0 || n.has("script") && !n.get("script")?.includes(r.script) || n.has("state") && !n.get("state")?.includes(r.state) || n.has("type") && !n.get("type")?.includes(r.type)));
  }
  async getDB() {
    return this.db ? this.db : (this.db = await Mm(this.dbName, Dm, Vm), this.db);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Hm(this.dbName), this.db = null);
  }
};
const i1 = ["script", "state", "type"];
function s1(e) {
  const t = /* @__PURE__ */ new Map();
  return i1.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
let Wm = class {
  constructor(t = Fm) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([
          sn,
          on,
          an,
          Qn
        ], "readwrite"), s = i.objectStore(sn), o = i.objectStore(on), a = i.objectStore(an), c = i.objectStore(Qn), u = [
          s.clear(),
          o.clear(),
          a.clear(),
          c.clear()
        ];
        let l = 0;
        const f = () => {
          l++, l === u.length && n();
        };
        u.forEach((h) => {
          h.onsuccess = f, h.onerror = () => r(h.error);
        });
      });
    } catch (t) {
      throw console.error("Failed to clear wallet data:", t), t;
    }
  }
  async [Symbol.asyncDispose]() {
    this.db && (await Hm(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([sn], "readonly").objectStore(sn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(t1);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get VTXOs for address ${t}:`, n), [];
    }
  }
  async saveVtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([sn], "readwrite"), a = o.objectStore(sn), c = n.map((u) => new Promise((l, f) => {
          const h = Qv(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async deleteVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([sn], "readwrite").objectStore(sn).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear VTXOs for address ${t}:`, n), n;
    }
  }
  async getUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([on], "readonly").objectStore(on).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(e1);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get UTXOs for address ${t}:`, n), [];
    }
  }
  async saveUtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([on], "readwrite"), a = o.objectStore(on), c = n.map((u) => new Promise((l, f) => {
          const h = Jv(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async deleteUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([on], "readwrite").objectStore(on).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear UTXOs for address ${t}:`, n), n;
    }
  }
  async getTransactionHistory(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([an], "readonly").objectStore(an).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result || [];
          r(u.sort((l, f) => l.createdAt - f.createdAt));
        };
      });
    } catch (n) {
      return console.error(`Failed to get transaction history for address ${t}:`, n), [];
    }
  }
  async saveTransactions(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([an], "readwrite"), a = o.objectStore(an);
        n.forEach((c) => {
          const u = {
            address: t,
            ...c,
            keyBoardingTxid: c.key.boardingTxid,
            keyCommitmentTxid: c.key.commitmentTxid,
            keyArkTxid: c.key.arkTxid
          };
          a.put(u);
        }), o.oncomplete = () => i(), o.onerror = () => s(o.error), o.onabort = () => s(new Error("Transaction aborted"));
      });
    } catch (r) {
      throw console.error(`Failed to save transactions for address ${t}:`, r), r;
    }
  }
  async deleteTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([an], "readwrite").objectStore(an).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear transactions for address ${t}:`, n), n;
    }
  }
  async getWalletState() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const o = t.transaction([Qn], "readonly").objectStore(Qn).get("state");
        o.onerror = () => r(o.error), o.onsuccess = () => {
          const a = o.result;
          a && a.data ? n(a.data) : n(null);
        };
      });
    } catch (t) {
      return console.error("Failed to get wallet state:", t), null;
    }
  }
  async saveWalletState(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([Qn], "readwrite").objectStore(Qn), a = {
          key: "state",
          data: t
        }, c = o.put(a);
        c.onerror = () => i(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save wallet state:", n), n;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await Mm(this.dbName, Dm, Vm), this.db);
  }
}, o1 = class {
  constructor(t) {
    this.contracts = /* @__PURE__ */ new Map(), this.isWatching = !1, this.connectionState = "disconnected", this.reconnectAttempts = 0, this.config = {
      failsafePollIntervalMs: 6e4,
      // 1 minute
      reconnectDelayMs: 1e3,
      // 1 second
      maxReconnectDelayMs: 3e4,
      // 30 seconds
      maxReconnectAttempts: 0,
      // unlimited
      ...t
    };
  }
  /**
   * Add a contract to be watched.
   *
   * Active contracts are immediately subscribed. All contracts are polled
   * to discover any existing VTXOs (which may cause them to be watched
   * even if inactive).
   */
  async addContract(t) {
    const n = {
      contract: t,
      lastKnownVtxos: /* @__PURE__ */ new Map()
    };
    this.contracts.set(t.script, n), this.isWatching && (await this.pollContracts([t.script]), await this.tryUpdateSubscription());
  }
  /**
   * Update an existing contract.
   */
  async updateContract(t) {
    const n = this.contracts.get(t.script);
    if (!n)
      throw new Error(`Contract ${t.script} not found`);
    n.contract = t, this.isWatching && await this.tryUpdateSubscription();
  }
  /**
   * Remove a contract from watching.
   */
  async removeContract(t) {
    this.contracts.get(t) && (this.contracts.delete(t), this.isWatching && await this.tryUpdateSubscription());
  }
  /**
   * Get all in-memory contracts.
   */
  getAllContracts() {
    return Array.from(this.contracts.values()).map((t) => t.contract);
  }
  /**
   * Get all active in-memory contracts.
   */
  getActiveContracts() {
    return this.getAllContracts().filter((t) => t.state === "active");
  }
  /**
   * Get scripts that should be watched.
   *
   * Returns scripts for:
   * - All active contracts
   * - All contracts with known VTXOs (regardless of state)
   *
   * This ensures we continue monitoring contracts even after they're
   * deactivated, as long as they have unspent VTXOs.
   */
  getScriptsToWatch() {
    const t = /* @__PURE__ */ new Set();
    for (const [, n] of this.contracts) {
      if (n.contract.state === "active") {
        t.add(n.contract.script);
        continue;
      }
      n.lastKnownVtxos.size > 0 && t.add(n.contract.script);
    }
    return Array.from(t);
  }
  /**
   * Get VTXOs for contracts, grouped by contract script.
   * Uses Repository.
   */
  async getContractVtxos(t) {
    const { contractScripts: n, includeSpent: r } = t, i = this.config.walletRepository, o = Array.from(this.contracts.values()).filter((c) => !(n && !n.includes(c.contract.script))).map(async (c) => {
      const u = await i.getVtxos(c.contract.address);
      if (u.length > 0) {
        const l = u.map((h) => ({
          ...h,
          contractScript: c.contract.script
        })), f = r ? l : l.filter((h) => !h.isSpent);
        return [[c.contract.script, f]];
      }
      return [];
    }), a = await Promise.all(o);
    return new Map(a.flat(1));
  }
  /**
   * Start watching for VTXO events across all active contracts.
   */
  async startWatching(t) {
    if (this.isWatching)
      throw new Error("Already watching");
    return this.eventCallback = t, this.isWatching = !0, this.abortController = new AbortController(), this.reconnectAttempts = 0, await this.connect(), this.startFailsafePolling(), () => this.stopWatching();
  }
  /**
   * Stop watching for events.
   */
  async stopWatching() {
    if (this.isWatching = !1, this.connectionState = "disconnected", this.abortController?.abort(), this.reconnectTimeoutId && (clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = void 0), this.failsafePollIntervalId && (clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = void 0), this.subscriptionId) {
      try {
        await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
      } catch {
      }
      this.subscriptionId = void 0;
    }
    this.eventCallback = void 0;
  }
  /**
   * Check if currently watching.
   */
  isCurrentlyWatching() {
    return this.isWatching;
  }
  /**
   * Get current connection state.
   */
  getConnectionState() {
    return this.connectionState;
  }
  /**
   * Force a poll of all active contracts.
   * Useful for manual refresh or after app resume.
   */
  async forcePoll() {
    this.isWatching && await this.pollAllContracts();
  }
  /**
   * Check for expired contracts, update their state, and emit events.
   */
  checkExpiredContracts() {
    const t = Date.now();
    for (const n of this.contracts.values()) {
      const r = n.contract;
      r.state === "active" && r.expiresAt && r.expiresAt <= t && (r.state = "inactive", this.eventCallback?.({
        type: "contract_expired",
        contractScript: r.script,
        contract: r,
        timestamp: t
      }));
    }
  }
  /**
   * Connect to the subscription.
   */
  async connect() {
    if (this.isWatching) {
      this.connectionState = "connecting";
      try {
        await this.updateSubscription(), await this.pollAllContracts(), this.connectionState = "connected", this.reconnectAttempts = 0, await this.listenLoop();
      } catch (t) {
        console.error("ContractWatcher connection failed:", t), this.connectionState = "disconnected", this.eventCallback?.({
          type: "connection_reset",
          timestamp: Date.now()
        }), this.scheduleReconnect();
      }
    }
  }
  /**
   * Schedule a reconnection attempt.
   */
  scheduleReconnect() {
    if (!this.isWatching)
      return;
    if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`ContractWatcher: Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      return;
    }
    this.connectionState = "reconnecting", this.reconnectAttempts++;
    const t = Math.min(this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1), this.config.maxReconnectDelayMs);
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = void 0, this.connect();
    }, t);
  }
  /**
   * Start the failsafe polling interval.
   */
  startFailsafePolling() {
    this.failsafePollIntervalId && clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = setInterval(() => {
      this.isWatching && this.pollAllContracts().catch((t) => {
        console.error("ContractWatcher failsafe poll failed:", t);
      });
    }, this.config.failsafePollIntervalMs);
  }
  /**
   * Poll all active contracts for current state.
   */
  async pollAllContracts() {
    const t = this.getActiveContracts().map((n) => n.script);
    t.length !== 0 && await this.pollContracts(t);
  }
  /**
   * Poll specific contracts and emit events for changes.
   */
  async pollContracts(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now();
    try {
      const r = await this.getContractVtxos({
        contractScripts: t,
        includeSpent: !1
        // only spendable ones!
      });
      for (const i of t) {
        const s = this.contracts.get(i);
        if (!s)
          continue;
        const o = r.get(i) || [], a = new Set(o.map((l) => `${l.txid}:${l.vout}`)), c = [];
        for (const l of o) {
          const f = `${l.txid}:${l.vout}`;
          s.lastKnownVtxos.has(f) || (c.push(l), s.lastKnownVtxos.set(f, l));
        }
        const u = [];
        for (const [l, f] of s.lastKnownVtxos)
          a.has(l) || (u.push(f), s.lastKnownVtxos.delete(l));
        c.length > 0 && this.emitVtxoEvent(i, c, "vtxo_received", n), u.length > 0 && this.emitVtxoEvent(i, u, "vtxo_spent", n);
      }
    } catch (r) {
      console.error("ContractWatcher poll failed:", r);
    }
  }
  async tryUpdateSubscription() {
    try {
      await this.updateSubscription();
    } catch {
    }
  }
  /**
   * Update the subscription with scripts that should be watched.
   *
   * Watches both active contracts and contracts with VTXOs.
   */
  async updateSubscription() {
    const t = this.getScriptsToWatch();
    if (t.length === 0) {
      if (this.subscriptionId) {
        try {
          await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
        } catch {
        }
        this.subscriptionId = void 0;
      }
      return;
    }
    this.subscriptionId = await this.config.indexerProvider.subscribeForScripts(t, this.subscriptionId);
  }
  /**
   * Main listening loop for subscription events.
   */
  async listenLoop() {
    if (!this.subscriptionId || !this.abortController || !this.isWatching) {
      this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
      return;
    }
    const t = this.config.indexerProvider.getSubscription(this.subscriptionId, this.abortController.signal);
    for await (const n of t) {
      if (!this.isWatching)
        break;
      this.handleSubscriptionUpdate(n);
    }
    this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
  }
  /**
   * Handle a subscription update.
   */
  handleSubscriptionUpdate(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now(), r = t.scripts || [];
    t.newVtxos?.length && this.processSubscriptionVtxos(t.newVtxos, r, "vtxo_received", n), t.spentVtxos?.length && this.processSubscriptionVtxos(t.spentVtxos, r, "vtxo_spent", n);
  }
  /**
   * Process VTXOs from subscription and route to correct contracts.
   * Uses the scripts from the subscription response to determine contract ownership.
   */
  processSubscriptionVtxos(t, n, r, i) {
    if (n.length === 1) {
      const s = n[0];
      if (s) {
        const o = this.contracts.get(s);
        if (o)
          for (const a of t) {
            const c = `${a.txid}:${a.vout}`;
            r === "vtxo_received" ? o.lastKnownVtxos.set(c, a) : r === "vtxo_spent" && o.lastKnownVtxos.delete(c);
          }
        this.emitVtxoEvent(s, t, r, i);
      }
      return;
    }
    for (const s of n) {
      const o = s;
      if (o) {
        const a = this.contracts.get(o);
        if (a)
          for (const c of t) {
            const u = `${c.txid}:${c.vout}`;
            r === "vtxo_received" ? a.lastKnownVtxos.set(u, c) : a.lastKnownVtxos.delete(u);
          }
        this.emitVtxoEvent(o, t, r, i);
      }
    }
  }
  /**
   * Emit a VTXO event for a contract.
   */
  emitVtxoEvent(t, n, r, i) {
    if (!this.eventCallback)
      return;
    const s = this.contracts.get(t);
    switch (this.checkExpiredContracts(), r) {
      case "vtxo_received":
        if (!s)
          return;
        this.eventCallback({
          type: "vtxo_received",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      case "vtxo_spent":
        if (!s)
          return;
        this.eventCallback({
          type: "vtxo_spent",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      case "contract_expired":
        if (!s)
          return;
        this.eventCallback({
          type: "contract_expired",
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      default:
        return;
    }
  }
}, a1 = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
  }
  /**
   * Register a contract handler.
   *
   * @param handler - The handler to register
   * @throws If a handler for this type is already registered
   */
  register(t) {
    if (this.handlers.has(t.type))
      throw new Error(`Contract handler for type '${t.type}' is already registered`);
    this.handlers.set(t.type, t);
  }
  /**
   * Get a handler by type.
   *
   * @param type - The contract type
   * @returns The handler, or undefined if not found
   */
  get(t) {
    return this.handlers.get(t);
  }
  /**
   * Get a handler by type, throwing if not found.
   *
   * @param type - The contract type
   * @returns The handler
   * @throws If no handler is registered for this type
   */
  getOrThrow(t) {
    const n = this.get(t);
    if (!n)
      throw new Error(`No contract handler registered for type '${t}'`);
    return n;
  }
  /**
   * Check if a handler is registered.
   *
   * @param type - The contract type
   */
  has(t) {
    return this.handlers.has(t);
  }
  /**
   * Get all registered types.
   */
  getRegisteredTypes() {
    return Array.from(this.handlers.keys());
  }
  /**
   * Unregister a handler (mainly for testing).
   */
  unregister(t) {
    return this.handlers.delete(t);
  }
  /**
   * Clear all handlers (mainly for testing).
   */
  clear() {
    this.handlers.clear();
  }
};
const $s = new a1();
function Cs(e) {
  return Gs.encode(e.type === "blocks" ? { blocks: Number(e.value) } : { seconds: Number(e.value) });
}
function Os(e) {
  const t = Gs.decode(e);
  if ("blocks" in t && t.blocks !== void 0)
    return { type: "blocks", value: BigInt(t.blocks) };
  if ("seconds" in t && t.seconds !== void 0)
    return { type: "seconds", value: BigInt(t.seconds) };
  throw new Error(`Invalid BIP68 sequence: ${e}`);
}
function Fu(e, t) {
  if (t.role === "sender" || t.role === "receiver")
    return t.role;
  if (t.walletPubKey) {
    if (t.walletPubKey === e.params.sender)
      return "sender";
    if (t.walletPubKey === e.params.receiver)
      return "receiver";
  }
}
function di(e, t) {
  if (t === void 0)
    return !0;
  if (!e.vtxo)
    return !1;
  const n = Os(t);
  if (n.type === "blocks")
    return e.blockHeight === void 0 || e.vtxo.status.block_height === void 0 ? !1 : e.blockHeight - e.vtxo.status.block_height >= Number(n.value);
  if (n.type === "seconds") {
    const r = e.vtxo.status.block_time;
    return r === void 0 ? !1 : e.currentTime / 1e3 - r >= Number(n.value);
  }
  return !1;
}
const c1 = {
  type: "default",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new qr.Script(t);
  },
  serializeParams(e) {
    return {
      pubKey: P.encode(e.pubKey),
      serverPubKey: P.encode(e.serverPubKey),
      csvTimelock: Cs(e.csvTimelock).toString()
    };
  },
  deserializeParams(e) {
    const t = e.csvTimelock ? Os(Number(e.csvTimelock)) : qr.Script.DEFAULT_TIMELOCK;
    return {
      pubKey: P.decode(e.pubKey),
      serverPubKey: P.decode(e.serverPubKey),
      csvTimelock: t
    };
  },
  selectPath(e, t, n) {
    if (n.collaborative)
      return { leaf: e.forfeit() };
    const r = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    return di(n, r) ? {
      leaf: e.exit(),
      sequence: r
    } : null;
  },
  getAllSpendingPaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = { leaf: e.exit() };
    return t.params.csvTimelock && (i.sequence = Number(t.params.csvTimelock)), r.push(i), r;
  },
  getSpendablePaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    if (di(n, i)) {
      const s = { leaf: e.exit() };
      i !== void 0 && (s.sequence = i), r.push(s);
    }
    return r;
  }
}, u1 = {
  type: "vhtlc",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new Wl.Script(t);
  },
  serializeParams(e) {
    return {
      sender: P.encode(e.sender),
      receiver: P.encode(e.receiver),
      server: P.encode(e.server),
      hash: P.encode(e.preimageHash),
      refundLocktime: e.refundLocktime.toString(),
      claimDelay: Cs(e.unilateralClaimDelay).toString(),
      refundDelay: Cs(e.unilateralRefundDelay).toString(),
      refundNoReceiverDelay: Cs(e.unilateralRefundWithoutReceiverDelay).toString()
    };
  },
  deserializeParams(e) {
    return {
      sender: P.decode(e.sender),
      receiver: P.decode(e.receiver),
      server: P.decode(e.server),
      preimageHash: P.decode(e.hash),
      refundLocktime: BigInt(e.refundLocktime),
      unilateralClaimDelay: Os(Number(e.claimDelay)),
      unilateralRefundDelay: Os(Number(e.refundDelay)),
      unilateralRefundWithoutReceiverDelay: Os(Number(e.refundNoReceiverDelay))
    };
  },
  /**
   * Select spending path based on context.
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  selectPath(e, t, n) {
    const r = Fu(t, n), i = t.params?.preimage, s = BigInt(t.params.refundLocktime), o = Math.floor(n.currentTime / 1e3);
    if (!r)
      return null;
    if (n.collaborative)
      return r === "receiver" && i ? {
        leaf: e.claim(),
        extraWitness: [P.decode(i)]
      } : r === "sender" && BigInt(o) >= s ? {
        leaf: e.refundWithoutReceiver()
      } : null;
    if (r === "receiver" && i) {
      const a = Number(t.params.claimDelay);
      return di(n, a) ? {
        leaf: e.unilateralClaim(),
        extraWitness: [P.decode(i)],
        sequence: a
      } : null;
    }
    if (r === "sender") {
      const a = Number(t.params.refundNoReceiverDelay);
      return di(n, a) ? {
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: a
      } : null;
    }
    return null;
  },
  /**
   * Get all possible spending paths (no timelock checks).
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  getAllSpendingPaths(e, t, n) {
    const r = Fu(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage;
    if (n.collaborative)
      r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [P.decode(s)]
      }), r === "sender" && i.push({
        leaf: e.refundWithoutReceiver()
      });
    else {
      if (r === "receiver" && s) {
        const o = Number(t.params.claimDelay);
        i.push({
          leaf: e.unilateralClaim(),
          extraWitness: [P.decode(s)],
          sequence: o
        });
      }
      if (r === "sender") {
        const o = Number(t.params.refundNoReceiverDelay);
        i.push({
          leaf: e.unilateralRefundWithoutReceiver(),
          sequence: o
        });
      }
    }
    return i;
  },
  getSpendablePaths(e, t, n) {
    const r = Fu(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage, o = BigInt(t.params.refundLocktime), a = Math.floor(n.currentTime / 1e3);
    if (n.collaborative)
      return r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [P.decode(s)]
      }), r === "sender" && BigInt(a) >= o && i.push({
        leaf: e.refundWithoutReceiver()
      }), i;
    if (r === "receiver" && s) {
      const c = Number(t.params.claimDelay);
      di(n, c) && i.push({
        leaf: e.unilateralClaim(),
        extraWitness: [P.decode(s)],
        sequence: c
      });
    }
    if (r === "sender") {
      const c = Number(t.params.refundNoReceiverDelay);
      di(n, c) && i.push({
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: c
      });
    }
    return i;
  }
};
$s.register(c1);
$s.register(u1);
let l1 = class Km {
  constructor(t) {
    this.initialized = !1, this.eventCallbacks = /* @__PURE__ */ new Set(), this.config = t, this.watcher = new o1({
      indexerProvider: t.indexerProvider,
      walletRepository: t.walletRepository,
      ...t.watcherConfig
    });
  }
  /**
   * Static factory method for creating a new ContractManager.
   * Initialize the manager by loading persisted contracts and starting to watch.
   *
   * After initialization, the manager automatically watches all active contracts
   * and contracts with VTXOs. Use `onContractEvent()` to register event callbacks.
   *
   * @param config ContractManagerConfig
   */
  static async create(t) {
    const n = new Km(t);
    return await n.initialize(), n;
  }
  async initialize() {
    if (this.initialized)
      return;
    const t = await this.config.contractRepository.getContracts();
    await this.getVtxosForContracts(t);
    const n = Date.now();
    for (const r of t)
      r.state === "active" && r.expiresAt && r.expiresAt <= n && (r.state = "inactive", await this.config.contractRepository.saveContract(r)), await this.watcher.addContract(r);
    this.initialized = !0, this.stopWatcherFn = await this.watcher.startWatching((r) => {
      this.handleContractEvent(r);
    });
  }
  /**
   * Create and register a new contract.
   *
   * @param params - Contract parameters
   * @returns The created contract
   */
  async createContract(t) {
    const n = $s.get(t.type);
    if (!n)
      throw new Error(`No handler registered for contract type '${t.type}'`);
    try {
      const s = n.createScript(t.params), o = P.encode(s.pkScript);
      if (o !== t.script)
        throw new Error(`Script mismatch: provided script does not match script derived from params. Expected ${o}, got ${t.script}`);
    } catch (s) {
      throw s instanceof Error && s.message.includes("mismatch") ? s : new Error(`Invalid params for contract type '${t.type}': ${s instanceof Error ? s.message : String(s)}`);
    }
    const [r] = await this.getContracts({ script: t.script });
    if (r) {
      if (r.type === t.type)
        return r;
      throw new Error(`Contract with script ${t.script} already exists with with type ${r.type}.`);
    }
    const i = {
      ...t,
      createdAt: Date.now(),
      state: t.state || "active"
    };
    return await this.config.contractRepository.saveContract(i), await this.getVtxosForContracts([i]), await this.watcher.addContract(i), i;
  }
  /**
   * Get contracts with optional filters.
   *
   * @param filter - Optional filter criteria
   * @returns Filtered contracts TODO: filter spent/unspent
   *
   * @example
   * ```typescript
   * // Get all VHTLC contracts
   * const vhtlcs = await manager.getContracts({ type: 'vhtlc' });
   *
   * // Get all active contracts
   * const active = await manager.getContracts({ state: 'active' });
   * ```
   */
  async getContracts(t) {
    const n = this.buildContractsDbFilter(t ?? {});
    return await this.config.contractRepository.getContracts(n);
  }
  async getContractsWithVtxos(t) {
    const n = await this.getContracts(t), r = await this.getVtxosForContracts(n);
    return n.map((i) => ({
      contract: i,
      vtxos: r.get(i.script) ?? []
    }));
  }
  buildContractsDbFilter(t) {
    return {
      script: t.script,
      state: t.state,
      type: t.type
    };
  }
  /**
   * Update a contract.
   * Nested fields like `params` and `metadata` are replaced with the provided values.
   * If you need to preserve existing fields, merge them manually.
   *
   * @param script - Contract script
   * @param updates - Fields to update
   */
  async updateContract(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      ...n
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Update a contract's params.
   * This method preserves existing params by merging the provided values.
   *
   * @param script - Contract script
   * @param updates - The new values to merge with existing params
   */
  async updateContractParams(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      params: { ...i.params, ...n }
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Set a contract's state.
   */
  async setContractState(t, n) {
    await this.updateContract(t, { state: n });
  }
  /**
   * Delete a contract.
   *
   * @param script - Contract script
   */
  async deleteContract(t) {
    await this.config.contractRepository.deleteContract(t), await this.watcher.removeContract(t);
  }
  /**
   * Get currently spendable paths for a contract.
   *
   * @param contractScript - The contract script
   * @param options - Options for getting spendable paths
   */
  async getSpendablePaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i, vtxo: s } = t, [o] = await this.getContracts({ script: n });
    if (!o)
      return [];
    const a = $s.get(o.type);
    if (!a)
      return [];
    const c = a.createScript(o.params), u = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i,
      vtxo: s
    };
    return a.getSpendablePaths(c, o, u);
  }
  async getAllSpendingPaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i } = t, [s] = await this.getContracts({ script: n });
    if (!s)
      return [];
    const o = $s.get(s.type);
    if (!o)
      return [];
    const a = o.createScript(s.params), c = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i
    };
    return o.getAllSpendingPaths(a, s, c);
  }
  /**
   * Register a callback for contract events.
   *
   * The manager automatically watches after `initialize()`. This method
   * allows registering callbacks to receive events.
   *
   * @param callback - Event callback
   * @returns Unsubscribe function to remove this callback
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   *
   * // Later: stop receiving events
   * unsubscribe();
   * ```
   */
  onContractEvent(t) {
    return this.eventCallbacks.add(t), () => {
      this.eventCallbacks.delete(t);
    };
  }
  /**
   * Check if currently watching.
   */
  async isWatching() {
    return this.watcher.isCurrentlyWatching();
  }
  /**
   * Emit an event to all registered callbacks.
   */
  emitEvent(t) {
    for (const n of this.eventCallbacks)
      try {
        n(t);
      } catch (r) {
        console.error("Error in contract event callback:", r);
      }
  }
  /**
   * Handle events from the watcher.
   */
  async handleContractEvent(t) {
    switch (t.type) {
      // Every time there is a VTXO event for a contract, refresh all its VTXOs
      case "vtxo_received":
      case "vtxo_spent":
        await this.fetchContractVxosFromIndexer([t.contract], !0);
        break;
      case "connection_reset":
        const n = this.watcher.getActiveContracts();
        await this.fetchContractVxosFromIndexer(n, !1);
        break;
      case "contract_expired":
        await this.config.contractRepository.saveContract(t.contract);
    }
    this.emitEvent(t);
  }
  async getVtxosForContracts(t) {
    return t.length === 0 ? /* @__PURE__ */ new Map() : await this.fetchContractVxosFromIndexer(t, !1, this.config.extendVtxo);
  }
  async fetchContractVxosFromIndexer(t, n, r) {
    const i = await this.fetchContractVtxosBulk(t, n, r), s = /* @__PURE__ */ new Map();
    for (const [o, a] of i) {
      s.set(o, a);
      const c = t.find((u) => u.script === o);
      c && await this.config.walletRepository.saveVtxos(c.address, a);
    }
    return s;
  }
  async fetchContractVtxosBulk(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    return await Promise.all(t.map(async (s) => {
      const o = await this.fetchContractVtxosPaginated(s, n, r);
      i.set(s.script, o);
    })), i;
  }
  async fetchContractVtxosPaginated(t, n, r) {
    const s = [];
    let o = 0, a = !0;
    const c = n ? {} : { spendableOnly: !0 };
    for (; a; ) {
      const { vtxos: u, page: l } = await this.config.indexerProvider.getVtxos({
        scripts: [t.script],
        ...c,
        pageIndex: o,
        pageSize: 100
      });
      for (const f of u) {
        const h = r ? r(f) : f;
        s.push({
          ...h,
          contractScript: t.script
        });
      }
      a = l ? u.length === 100 : !1, o++;
    }
    return s;
  }
  /**
   * Dispose of the ContractManager and release all resources.
   *
   * Stops the watcher, clears callbacks, and marks
   * the manager as uninitialized.
   *
   * Implements the disposable pattern for cleanup.
   */
  dispose() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
  /**
   * Symbol.dispose implementation for using with `using` keyword.
   * @example
   * ```typescript
   * {
   *   using manager = await wallet.getContractManager();
   *   // ... use manager
   * } // automatically disposed
   * ```
   */
  [Symbol.dispose]() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
};
function f1(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
let Xo = class Ql {
  constructor(t, n, r, i, s, o, a, c, u, l, f) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.watcherConfig = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new bm(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new xm(s), a = await r.getInfo(), c = TS(a.network), u = t.esploraUrl || SS[a.network], l = t.onchainProvider || new vS(u);
    if (t.exitTimelock) {
      const { value: k, type: C } = t.exitTimelock;
      if (k < 512n && C !== "blocks" || k >= 512n && C !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const f = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: k, type: C } = t.boardingTimelock;
      if (k < 512n && C !== "blocks" || k >= 512n && C !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = P.decode(a.signerPubkey).slice(1), y = new qr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: f
    }), d = new qr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage?.walletRepository ?? new Wm(), v = t.storage?.contractRepository ?? new r1();
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: g,
      boardingTapscript: d,
      dustAmount: a.dust,
      walletRepository: m,
      contractRepository: v,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Ql.setupWalletConfig(t, n);
    return new Ql(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, t.watcherConfig);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  /**
   * Get the contract script for the wallet's default address.
   * This is the pkScript hex, used to identify the wallet in ContractManager.
   */
  get defaultContractScript() {
    return P.encode(this.offchainTapscript.pkScript);
  }
  async getAddress() {
    return this.arkAddress.encode();
  }
  async getBoardingAddress() {
    return this.boardingTapscript.onchainAddress(this.network);
  }
  async getBalance() {
    const [t, n] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let r = 0, i = 0;
    for (const l of t)
      l.status.confirmed ? r += l.value : i += l.value;
    let s = 0, o = 0, a = 0;
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, f) => l + f.value, 0), a = n.filter((l) => ir(l) && l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
    const c = r + i, u = s + o + a;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: i,
        total: c
      },
      settled: s,
      preconfirmed: o,
      available: s + o,
      recoverable: a,
      total: c + u
    };
  }
  // TODO: use contract manager (and repo) will be offline-first
  async getVtxos(t) {
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => Un(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [P.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(ir);
    if (t.withRecoverable || (s = s.filter((o) => !cd(o) && !ym(o))), t.withUnrolled) {
      const o = i.filter((a) => !ir(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [P.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = (s) => this.indexerProvider.getVtxos({ outpoints: [{ txid: s, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return Xv(t.vtxos, n, r, i);
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), i = await this.onchainProvider.getTransactions(r);
    for (const a of i)
      for (let c = 0; c < a.vout.length; c++) {
        const u = a.vout[c];
        if (u.scriptpubkey_address === r) {
          const f = (await this.onchainProvider.getTxOutspends(a.txid))[c];
          f?.spent && n.add(f.txid), t.push({
            txid: a.txid,
            vout: c,
            value: Number(u.value),
            status: {
              confirmed: a.status.confirmed,
              block_time: a.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: f?.spent ? "spent" : "settled",
              commitmentTxIds: f?.spent ? [f.txid] : void 0
            },
            createdAt: a.status.confirmed ? new Date(a.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: On.TxReceived,
        settled: a.virtualStatus.state === "spent",
        createdAt: a.status.block_time ? new Date(a.status.block_time * 1e3).getTime() : 0
      };
      a.status.block_time ? o.push(c) : s.push(c);
    }
    return {
      boardingTxs: [...s, ...o],
      commitmentsToIgnore: n
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => ql(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: f, status: h } = l, p = a(l), y = Number(l.vout[p].value);
          return { txid: f, vout: p, value: y, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        P.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const f of l)
            (f.newVtxos?.length > 0 || f.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: f.newVtxos.map((h) => Un(this, h)),
              spentVtxos: f.spentVtxos.map((h) => Un(this, h))
            });
        } catch (f) {
          console.error("Subscription error:", f);
        }
      })();
    }
    return () => {
      i?.(), s?.();
    };
  }
  async fetchPendingTxs() {
    const t = [P.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
  // ========================================================================
  // Contract Management
  // ========================================================================
  /**
   * Get the ContractManager for managing contracts including the wallet's default address.
   *
   * The ContractManager handles:
   * - The wallet's default receiving address (as a "default" contract)
   * - External contracts (Boltz swaps, HTLCs, etc.)
   * - Multi-contract watching with resilient connections
   *
   * @example
   * ```typescript
   * const manager = await wallet.getContractManager();
   *
   * // Create a contract for a Boltz swap
   * const contract = await manager.createContract({
   *   label: "Boltz Swap",
   *   type: "vhtlc",
   *   params: { ... },
   *   script: swapScript,
   *   address: swapAddress,
   * });
   *
   * // Start watching for events (includes wallet's default address)
   * const stop = await manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   * ```
   */
  async getContractManager() {
    if (this._contractManager)
      return this._contractManager;
    if (this._contractManagerInitializing)
      return this._contractManagerInitializing;
    this._contractManagerInitializing = this.initializeContractManager();
    try {
      const t = await this._contractManagerInitializing;
      return this._contractManager = t, t;
    } catch (t) {
      throw this._contractManagerInitializing = void 0, t;
    } finally {
      this._contractManagerInitializing = void 0;
    }
  }
  async initializeContractManager() {
    const t = await l1.create({
      indexerProvider: this.indexerProvider,
      contractRepository: this.contractRepository,
      walletRepository: this.walletRepository,
      extendVtxo: (r) => Un(this, r),
      getDefaultAddress: () => this.getAddress(),
      watcherConfig: this.watcherConfig
    }), n = this.offchainTapscript.options.csvTimelock ?? qr.Script.DEFAULT_TIMELOCK;
    return await t.createContract({
      type: "default",
      params: {
        pubKey: P.encode(this.offchainTapscript.options.pubKey),
        serverPubKey: P.encode(this.offchainTapscript.options.serverPubKey),
        csvTimelock: Cs(n).toString()
      },
      script: this.defaultContractScript,
      address: await this.getAddress(),
      state: "active"
    }), t;
  }
}, Ma = class zm extends Xo {
  constructor(t, n, r, i, s, o, a, c, u, l, f, h, p, y, d, g, m) {
    super(t, n, i, o, a, c, u, p, y, d, m), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = f, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...zS,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await Xo.setupWalletConfig(t, n);
    let i;
    try {
      const c = P.decode(r.info.checkpointTapscript);
      i = ge.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = P.decode(r.info.forfeitPubkey).slice(1), o = yr(r.network).decode(r.info.forfeitAddress), a = vt.encode(o);
    return new zm(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.watcherConfig);
  }
  /**
   * Convert this wallet to a readonly wallet.
   *
   * @returns A readonly wallet with the same configuration but readonly identity
   * @example
   * ```typescript
   * const wallet = await Wallet.create({ identity: SingleKey.fromHex('...'), ... });
   * const readonlyWallet = await wallet.toReadonly();
   *
   * // Can query balance and addresses
   * const balance = await readonlyWallet.getBalance();
   * const address = await readonlyWallet.getAddress();
   *
   * // But cannot send transactions (type error)
   * // readonlyWallet.sendBitcoin(...); // TypeScript error
   * ```
   */
  async toReadonly() {
    const t = f1(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new Xo(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository, this.watcherConfig);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!h1(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, m) => g + m, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const d = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(d)
      };
    } else
      r = p1(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = Ss.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const y = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: y,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = MS(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: f, signedCheckpointTxs: h } = await this.arkProvider.submitTx(Wt.encode(l.toPSBT()), u.checkpoints.map((y) => Wt.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const d = Me.fromPSBT(Wt.decode(y)), g = await this.identity.sign(d);
      return Wt.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(f, p);
    try {
      const y = [], d = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [k, C] of r.inputs.entries()) {
        const L = Un(this, C), G = h[k], b = Me.fromPSBT(Wt.decode(G));
        if (y.push({
          ...L,
          virtualStatus: { ...L.virtualStatus, state: "spent" },
          spentBy: b.id,
          arkTxId: f,
          isSpent: !0
        }), L.virtualStatus.commitmentTxIds)
          for (const Y of L.virtualStatus.commitmentTxIds)
            d.add(Y);
        L.virtualStatus.batchExpiry && (g = Math.min(g, L.virtualStatus.batchExpiry));
      }
      const m = Date.now(), v = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const k = {
          txid: f,
          vout: a.length - 1,
          createdAt: new Date(m),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(d),
            batchExpiry: g
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(v, [k]);
      }
      await this.walletRepository.saveVtxos(v, y), await this.walletRepository.saveTransactions(v, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: f
          },
          amount: t.amount,
          type: On.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (y) {
      console.warn("error saving offchain tx to repository", y);
    } finally {
      return f;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const y of t.inputs)
        if (typeof y == "string")
          try {
            ur.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), d = new Yv(y.intentFee);
      let g = 0;
      const v = ge.decode(P.decode(this.boardingTapscript.exitScript)).params.timelock, k = (await this.getBoardingUtxos()).filter((S) => !WS(S, v)), C = [];
      for (const S of k) {
        const rt = d.evalOnchainInput({
          amount: BigInt(S.value)
        });
        rt.value >= S.value || (C.push(S), g += S.value - rt.satoshis);
      }
      const L = await this.getVtxos({ withRecoverable: !0 }), G = [];
      for (const S of L) {
        const rt = d.evalOffchainInput({
          amount: BigInt(S.value),
          type: S.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: S.createdAt,
          expiry: S.virtualStatus.batchExpiry ? new Date(S.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        rt.value >= S.value || (G.push(S), g += S.value - rt.satoshis);
      }
      const b = [...C, ...G];
      if (b.length === 0)
        throw new Error("No inputs found");
      const Y = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, D = d.evalOffchainOutput({
        amount: Y.amount,
        script: P.encode(Ss.decode(Y.address).pkScript)
      });
      if (Y.amount -= BigInt(D.satoshis), Y.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: b,
        outputs: [Y]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, d] of t.outputs.entries()) {
      let g;
      try {
        g = Ss.decode(d.address).pkScript, s = !0;
      } catch {
        const m = yr(this.network).decode(d.address);
        g = vt.encode(m), r.push(y);
      }
      i.push({
        amount: d.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(P.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), f = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, f);
      return await jl.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (d) => Promise.resolve(n(d)) : void 0
      });
    } catch (y) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), y;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = Me.fromPSBT(Wt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const f of n) {
      const h = o.find((k) => k.txid === f.txid && k.vout === f.vout);
      if (!h) {
        for (let k = 0; k < a.inputsLength; k++) {
          const C = a.getInput(k);
          if (!C.txid || C.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (P.encode(C.txid) === f.txid && C.index === f.vout) {
            a.updateInput(k, {
              tapLeafScript: [f.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              k
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (cd(h) || wm(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], y = p.id, d = p.getOutput(0);
      if (!d)
        throw new Error("connector output not found");
      const g = d.amount, m = d.script;
      if (!g || !m)
        throw new Error("invalid connector output");
      u++;
      let v = CS([
        {
          txid: f.txid,
          index: f.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: bn.decode(f.tapTree).pkScript
          },
          sighashType: Qr.DEFAULT,
          tapLeafScript: [f.forfeitTapLeafScript]
        },
        {
          txid: y,
          index: 0,
          witnessUtxo: {
            amount: g,
            script: m
          }
        }
      ], r);
      v = await this.identity.sign(v, [0]), s.push(Wt.encode(v.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? Wt.encode(a.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, n, r) {
    let i;
    return {
      onBatchStarted: async (s) => {
        const o = new TextEncoder().encode(t), a = zt(o), c = P.encode(a);
        let u = !0;
        for (const f of s.intentIdHashes)
          if (f === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = ge.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = bs(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(P.encode(u)))
          return { skip: !0 };
        const l = Me.fromPSBT(Wt.decode(s.unsignedCommitmentTx));
        VS(o, l, i);
        const f = l.getOutput(0);
        if (!f?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, f.amount);
        const h = P.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = P.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && DS(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof mm && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), i = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(i), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, i) {
    const s = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: i
    }, a = cr.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: Wt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = cr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Wt.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = cr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Wt.encode(s.toPSBT()),
      message: r
    };
  }
  /**
   * Finalizes pending transactions by retrieving them from the server and finalizing each one.
   * @param vtxos - Optional list of VTXOs to use instead of retrieving them from the server
   * @returns Array of transaction IDs that were finalized
   */
  async finalizePendingTxs(t) {
    if (!t || t.length === 0) {
      const s = [P.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => Un(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (f) => {
            const h = Me.fromPSBT(Wt.decode(f)), p = await this.identity.sign(h);
            return Wt.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: i };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const i = bn.decode(r.tapTree), s = d1(r.intentTapLeafScript), o = [dm.encode(r.tapTree)];
      r.extraWitness && o.push(tS.encode(r.extraWitness)), n.push({
        txid: P.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: i.pkScript
        },
        sequence: s,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: o
      });
    }
    return n;
  }
};
Ma.MIN_FEE_RATE = 1;
function d1(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = ge.decode(r).params;
      t = Gs.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Li.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function h1(e) {
  try {
    return Ss.decode(e), !0;
  } catch {
    return !1;
  }
}
function p1(e, t) {
  const n = [...e].sort((o, a) => {
    const c = o.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return c !== u ? c - u : a.value - o.value;
  }), r = [];
  let i = 0;
  for (const o of n)
    if (r.push(o), i += o.value, i >= t)
      break;
  if (i === t)
    return { inputs: r, changeAmount: 0n };
  if (i < t)
    throw new Error("Insufficient funds");
  const s = BigInt(i - t);
  return {
    inputs: r,
    changeAmount: s
  };
}
function Wu() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return P.encode(e);
}
var W;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, U) {
    return {
      type: "ERROR",
      success: !1,
      message: U,
      id: w
    };
  }
  e.error = t;
  function n(w, U) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: U,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, U) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: U,
      id: w
    };
  }
  e.settleSuccess = r;
  function i(w) {
    return w.type === "SETTLE_SUCCESS" && w.success;
  }
  e.isSettleSuccess = i;
  function s(w) {
    return w.type === "ADDRESS" && w.success === !0;
  }
  e.isAddress = s;
  function o(w) {
    return w.type === "BOARDING_ADDRESS" && w.success === !0;
  }
  e.isBoardingAddress = o;
  function a(w, U) {
    return {
      type: "ADDRESS",
      success: !0,
      address: U,
      id: w
    };
  }
  e.address = a;
  function c(w, U) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: U,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, U) {
    return {
      type: "BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.balance = l;
  function f(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = f;
  function h(w, U) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, U) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: U,
      id: w
    };
  }
  e.virtualCoins = y;
  function d(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = d;
  function g(w, U) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: U,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function v(w, U) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: U,
      id: w
    };
  }
  e.sendBitcoinSuccess = v;
  function k(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = k;
  function C(w, U) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: U,
      id: w
    };
  }
  e.transactionHistory = C;
  function L(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = L;
  function G(w, U, wu) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: U,
        xOnlyPublicKey: wu
      },
      id: w
    };
  }
  e.walletStatus = G;
  function b(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = b;
  function Y(w, U) {
    return {
      type: "CLEAR_RESPONSE",
      success: U,
      id: w
    };
  }
  e.clearResponse = Y;
  function D(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = D;
  function S(w, U) {
    return {
      type: "WALLET_RELOADED",
      success: U,
      id: w
    };
  }
  e.walletReloaded = S;
  function rt(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = rt;
  function M(w, U) {
    return {
      type: "VTXO_UPDATE",
      id: Wu(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: U,
      newVtxos: w
    };
  }
  e.vtxoUpdate = M;
  function x(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = x;
  function T(w) {
    return {
      type: "UTXO_UPDATE",
      id: Wu(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = T;
  function E(w) {
    return w.type === "CONTRACTS" && w.success === !0;
  }
  e.isContracts = E;
  function A(w, U) {
    return {
      type: "CONTRACTS",
      success: !0,
      contracts: U,
      id: w
    };
  }
  e.contracts = A;
  function $(w) {
    return w.type === "CONTRACTS_WITH_VTXOS" && w.success === !0;
  }
  e.isContractsWithVtxos = $;
  function B(w, U) {
    return {
      type: "CONTRACTS_WITH_VTXOS",
      success: !0,
      contracts: U,
      id: w
    };
  }
  e.contractsWithVtxos = B;
  function O(w) {
    return w.type === "CONTRACT" && w.success === !0;
  }
  e.isContract = O;
  function I(w, U) {
    return {
      type: "CONTRACT",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contract = I;
  function N(w) {
    return w.type === "CONTRACT_CREATED" && w.success === !0;
  }
  e.isContractCreated = N;
  function R(w, U) {
    return {
      type: "CONTRACT_CREATED",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contractCreated = R;
  function q(w) {
    return w.type === "CONTRACT_STATE_UPDATED" && w.success === !0;
  }
  e.isContractStateUpdated = q;
  function K(w) {
    return {
      type: "CONTRACT_STATE_UPDATED",
      success: !0,
      id: w
    };
  }
  e.contractStateUpdated = K;
  function V(w) {
    return w.type === "CONTRACT_UPDATED" && w.success === !0;
  }
  e.isContractUpdated = V;
  function z(w, U) {
    return {
      type: "CONTRACT_UPDATED",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contractUpdated = z;
  function X(w) {
    return w.type === "CONTRACT_DATA_UPDATED" && w.success === !0;
  }
  e.isContractDataUpdated = X;
  function st(w) {
    return {
      type: "CONTRACT_DATA_UPDATED",
      success: !0,
      id: w
    };
  }
  e.contractDataUpdated = st;
  function j(w) {
    return w.type === "CONTRACT_DELETED" && w.success === !0;
  }
  e.isContractDeleted = j;
  function Q(w) {
    return {
      type: "CONTRACT_DELETED",
      success: !0,
      id: w
    };
  }
  e.contractDeleted = Q;
  function Pt(w) {
    return w.type === "CONTRACT_VTXOS" && w.success === !0;
  }
  e.isContractVtxos = Pt;
  function be(w, U) {
    return {
      type: "CONTRACT_VTXOS",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.contractVtxos = be;
  function Ee(w) {
    return w.type === "CONTRACT_VTXOS_FOR_CONTRACT" && w.success === !0;
  }
  e.isContractVtxosForContract = Ee;
  function jc(w, U) {
    return {
      type: "CONTRACT_VTXOS_FOR_CONTRACT",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.contractVtxosForContract = jc;
  function Gc(w) {
    return w.type === "CONTRACT_BALANCE" && w.success === !0;
  }
  e.isContractBalance = Gc;
  function qc(w, U) {
    return {
      type: "CONTRACT_BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.contractBalance = qc;
  function Yc(w) {
    return w.type === "CONTRACT_BALANCES" && w.success === !0;
  }
  e.isContractBalances = Yc;
  function Zc(w, U) {
    return {
      type: "CONTRACT_BALANCES",
      success: !0,
      balances: U,
      id: w
    };
  }
  e.contractBalances = Zc;
  function Xc(w) {
    return w.type === "TOTAL_CONTRACT_BALANCE" && w.success === !0;
  }
  e.isTotalContractBalance = Xc;
  function Qc(w, U) {
    return {
      type: "TOTAL_CONTRACT_BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.totalContractBalance = Qc;
  function Jc(w) {
    return w.type === "SPENDABLE_PATHS" && w.success === !0;
  }
  e.isSpendablePaths = Jc;
  function tu(w, U) {
    return {
      type: "SPENDABLE_PATHS",
      success: !0,
      paths: U,
      id: w
    };
  }
  e.spendablePaths = tu;
  function eu(w) {
    return w.type === "ALL_SPENDING_PATHS" && w.success === !0;
  }
  e.isAllSpendingPaths = eu;
  function nu(w, U) {
    return {
      type: "ALL_SPENDING_PATHS",
      success: !0,
      paths: U,
      id: w
    };
  }
  e.allSpendingPaths = nu;
  function ru(w) {
    return w.type === "CAN_SPEND" && w.success === !0;
  }
  e.isCanSpend = ru;
  function iu(w, U) {
    return {
      type: "CAN_SPEND",
      success: !0,
      canSpend: U,
      id: w
    };
  }
  e.canSpend = iu;
  function su(w) {
    return w.type === "SPENDING_PATH" && w.success === !0;
  }
  e.isSpendingPath = su;
  function ou(w, U) {
    return {
      type: "SPENDING_PATH",
      success: !0,
      path: U,
      id: w
    };
  }
  e.spendingPath = ou;
  function au(w) {
    return w.type === "CONTRACT_WATCHING" && w.success === !0;
  }
  e.isContractWatching = au;
  function cu(w, U) {
    return {
      type: "CONTRACT_WATCHING",
      success: !0,
      isWatching: U,
      id: w
    };
  }
  e.contractWatching = cu;
  function uu(w) {
    return w.type === "CONTRACT_EVENTS_SUBSCRIBED" && w.success === !0;
  }
  e.isContractEventsSubscribed = uu;
  function lu(w) {
    return {
      type: "CONTRACT_EVENTS_SUBSCRIBED",
      success: !0,
      id: w
    };
  }
  e.contractEventsSubscribed = lu;
  function fu(w) {
    return w.type === "CONTRACT_EVENTS_UNSUBSCRIBED" && w.success === !0;
  }
  e.isContractEventsUnsubscribed = fu;
  function du(w) {
    return {
      type: "CONTRACT_EVENTS_UNSUBSCRIBED",
      success: !0,
      id: w
    };
  }
  e.contractEventsUnsubscribed = du;
  function hu(w) {
    return w.type === "CONTRACT_MANAGER_DISPOSED" && w.success === !0;
  }
  e.isContractManagerDisposed = hu;
  function pu(w) {
    return {
      type: "CONTRACT_MANAGER_DISPOSED",
      success: !0,
      id: w
    };
  }
  e.contractManagerDisposed = pu;
  function gu(w) {
    return w.type === "CONTRACT_EVENT" && w.success === !0;
  }
  e.isContractEvent = gu;
  function yu(w) {
    return {
      type: "CONTRACT_EVENT",
      id: Wu(),
      // spontaneous event, not tied to a request
      success: !0,
      event: w
    };
  }
  e.contractEvent = yu;
})(W || (W = {}));
const Ku = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
let Qe = class Gt {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new Gt(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += Gt.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += Gt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += Gt.INPUT_SIZE + Gt.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + Gt.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + i, this.inputSize += Gt.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += Gt.OUTPUT_SIZE + Gt.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += Gt.OUTPUT_SIZE + Gt.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + Ku(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = yr(n).decode(t), i = vt.encode(r);
    return this.addOutputScript(i);
  }
  vsize() {
    const t = Ku(this.inputCount), n = Ku(this.outputCount);
    let i = (Gt.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * Gt.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += Gt.WITNESS_HEADER_SIZE + this.inputWitnessSize), g1(i);
  }
};
Qe.P2PKH_SCRIPT_SIG_SIZE = 108;
Qe.INPUT_SIZE = 41;
Qe.BASE_CONTROL_BLOCK_SIZE = 33;
Qe.OUTPUT_SIZE = 9;
Qe.P2WPKH_OUTPUT_SIZE = 22;
Qe.BASE_TX_SIZE = 10;
Qe.WITNESS_HEADER_SIZE = 2;
Qe.WITNESS_SCALE_FACTOR = 4;
Qe.P2TR_OUTPUT_SIZE = 34;
const g1 = (e) => {
  const t = BigInt(Math.ceil(e / Qe.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var gt;
(function(e) {
  function t(S) {
    return typeof S == "object" && S !== null && "type" in S;
  }
  e.isBase = t;
  function n(S) {
    return S.type === "INIT_WALLET" && "arkServerUrl" in S && typeof S.arkServerUrl == "string" && ("arkServerPublicKey" in S ? S.arkServerPublicKey === void 0 || typeof S.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(S) {
    return S.type === "SETTLE";
  }
  e.isSettle = r;
  function i(S) {
    return S.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(S) {
    return S.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(S) {
    return S.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(S) {
    return S.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(S) {
    return S.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(S) {
    return S.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(S) {
    return S.type === "SEND_BITCOIN" && "params" in S && S.params !== null && typeof S.params == "object" && "address" in S.params && typeof S.params.address == "string" && "amount" in S.params && typeof S.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function f(S) {
    return S.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = f;
  function h(S) {
    return S.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(S) {
    return S.type === "CLEAR";
  }
  e.isClear = p;
  function y(S) {
    return S.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
  function d(S) {
    return S.type === "GET_CONTRACTS";
  }
  e.isGetContracts = d;
  function g(S) {
    return S.type === "GET_CONTRACTS_WITH_VTXOS";
  }
  e.isGetContractsVtxos = g;
  function m(S) {
    return S.type === "CREATE_CONTRACT" && "params" in S && typeof S.params == "object" && S.params !== null && "type" in S.params && "params" in S.params && "script" in S.params && "address" in S.params;
  }
  e.isCreateContract = m;
  function v(S) {
    return S.type === "UPDATE_CONTRACT" && "contractScript" in S && typeof S.contractScript == "string" && "updates" in S && typeof S.updates == "object";
  }
  e.isUpdateContract = v;
  function k(S) {
    return S.type === "UPDATE_CONTRACT_STATE" && "contractScript" in S && typeof S.contractScript == "string" && "state" in S && (S.state === "active" || S.state === "inactive");
  }
  e.isUpdateContractState = k;
  function C(S) {
    return S.type === "DELETE_CONTRACT" && "contractScript" in S && typeof S.contractScript == "string";
  }
  e.isDeleteContract = C;
  function L(S) {
    return S.type === "GET_SPENDABLE_PATHS";
  }
  e.isGetSpendablePaths = L;
  function G(S) {
    return S.type === "GET_ALL_SPENDING_PATHS";
  }
  e.isGetAllSpendingPaths = G;
  function b(S) {
    return S.type === "IS_CONTRACT_MANAGER_WATCHING";
  }
  e.isIsContractWatching = b;
  function Y(S) {
    return S.type === "SUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isSubscribeContractEvents = Y;
  function D(S) {
    return S.type === "UNSUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isUnsubscribeContractEvents = D;
})(gt || (gt = {}));
class jm {
  constructor(t) {
    this.wallet = t;
  }
  get offchainTapscript() {
    return this.wallet.offchainTapscript;
  }
  get boardingTapscript() {
    return this.wallet.boardingTapscript;
  }
  get onchainProvider() {
    return this.wallet.onchainProvider;
  }
  get dustAmount() {
    return this.wallet.dustAmount;
  }
  get identity() {
    return this.wallet.identity;
  }
  notifyIncomingFunds(...t) {
    return this.wallet.notifyIncomingFunds(...t);
  }
  getAddress() {
    return this.wallet.getAddress();
  }
  getBoardingAddress() {
    return this.wallet.getBoardingAddress();
  }
  getTransactionHistory() {
    return this.wallet.getTransactionHistory();
  }
  getContractManager() {
    return this.wallet.getContractManager();
  }
  async handleReload(t) {
    return { pending: await this.wallet.fetchPendingTxs(), finalized: [] };
  }
  async handleSettle(...t) {
  }
  async handleSendBitcoin(...t) {
  }
}
class y1 extends jm {
  constructor(t) {
    super(t), this.wallet = t;
  }
  async handleReload(t) {
    return this.wallet.finalizePendingTxs(t.filter((n) => n.virtualStatus.state !== "swept" && n.virtualStatus.state !== "settled"));
  }
  async handleSettle(...t) {
    return this.wallet.settle(...t);
  }
  async handleSendBitcoin(...t) {
    return this.wallet.sendBitcoin(...t);
  }
}
class w1 {
  constructor(t, n = () => {
  }) {
    this.messageCallback = n, this.walletRepository = t.walletRepository, this.contractRepository = t.contractRepository;
  }
  /**
   * Get spendable vtxos for the current wallet address
   */
  async getSpendableVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter(ir);
  }
  /**
   * Get swept vtxos for the current wallet address
   */
  async getSweptVtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getAddress();
    return (await this.walletRepository.getVtxos(t)).filter((r) => r.virtualStatus.state === "swept");
  }
  /**
   * Get all vtxos categorized by type
   */
  async getAllVtxos() {
    if (!this.handler)
      return { spendable: [], spent: [] };
    const t = await this.handler.getAddress(), n = await this.walletRepository.getVtxos(t);
    return {
      spendable: n.filter(ir),
      spent: n.filter((r) => !ir(r))
    };
  }
  /**
   * Get all boarding utxos from wallet repository
   */
  async getAllBoardingUtxos() {
    if (!this.handler)
      return [];
    const t = await this.handler.getBoardingAddress();
    return await this.walletRepository.getUtxos(t);
  }
  async start(t = !0) {
    self.addEventListener("message", async (n) => {
      await this.handleMessage(n);
    }), t && (self.addEventListener("install", () => {
      self.skipWaiting();
    }), self.addEventListener("activate", () => {
      self.clients.claim();
    }));
  }
  async clear() {
    this.incomingFundsSubscription && this.incomingFundsSubscription(), this.contractEventsSubscription && (this.contractEventsSubscription(), this.contractEventsSubscription = void 0), this.handler = void 0, this.arkProvider = void 0, this.indexerProvider = void 0;
  }
  async reload() {
    await this.onWalletInitialized();
  }
  async onWalletInitialized() {
    if (!this.handler || !this.arkProvider || !this.indexerProvider || !this.handler.offchainTapscript || !this.handler.boardingTapscript)
      return;
    const t = P.encode(this.handler.offchainTapscript.pkScript), r = (await this.indexerProvider.getVtxos({
      scripts: [t]
    })).vtxos.map((c) => Un(this.handler, c));
    try {
      const { pending: c, finalized: u } = await this.handler.handleReload(r);
      console.info(`Recovered ${u.length}/${c.length} pending transactions: ${u.join(", ")}`);
    } catch (c) {
      console.error("Error recovering pending transactions:", c);
    }
    const i = await this.handler.getAddress();
    await this.walletRepository.saveVtxos(i, r);
    const s = await this.handler.getBoardingAddress(), o = await this.handler.onchainProvider.getCoins(s);
    await this.walletRepository.saveUtxos(s, o.map((c) => ql(this.handler, c)));
    const a = await this.handler.getTransactionHistory();
    a && await this.walletRepository.saveTransactions(i, a), this.incomingFundsSubscription && this.incomingFundsSubscription(), this.incomingFundsSubscription = await this.handler.notifyIncomingFunds(async (c) => {
      if (c.type === "vtxo") {
        const u = c.newVtxos.length > 0 ? c.newVtxos.map((f) => Un(this.handler, f)) : [], l = c.spentVtxos.length > 0 ? c.spentVtxos.map((f) => Un(this.handler, f)) : [];
        if ([...u, ...l].length === 0)
          return;
        await this.walletRepository.saveVtxos(i, [
          ...u,
          ...l
        ]), await this.sendMessageToAllClients(W.vtxoUpdate(u, l));
      }
      if (c.type === "utxo") {
        const u = c.coins.map((f) => ql(this.handler, f)), l = await this.handler?.getBoardingAddress();
        await this.walletRepository.deleteUtxos(l), await this.walletRepository.saveUtxos(l, u), await this.sendMessageToAllClients(W.utxoUpdate(u));
      }
    });
  }
  async handleClear(t) {
    await this.clear(), gt.isBase(t.data) && t.source?.postMessage(W.clearResponse(t.data.id, !0));
  }
  async handleInitWallet(t) {
    if (!gt.isInitWallet(t.data)) {
      console.error("Invalid INIT_WALLET message format", t.data), t.source?.postMessage(W.error(t.data.id, "Invalid INIT_WALLET message format"));
      return;
    }
    const n = t.data, { arkServerPublicKey: r, arkServerUrl: i } = n;
    this.arkProvider = new bm(i), this.indexerProvider = new xm(i);
    try {
      if ("privateKey" in n.key && typeof n.key.privateKey == "string") {
        const { key: { privateKey: s } } = n, o = xs.fromHex(s), a = await Ma.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new y1(a);
      } else if ("publicKey" in n.key && typeof n.key.publicKey == "string") {
        const { key: { publicKey: s } } = n, o = kc.fromPublicKey(P.decode(s)), a = await Xo.create({
          identity: o,
          arkServerUrl: i,
          arkServerPublicKey: r,
          storage: {
            walletRepository: this.walletRepository,
            contractRepository: this.contractRepository
          }
        });
        this.handler = new jm(a);
      } else {
        const s = "Missing privateKey or publicKey in key object";
        t.source?.postMessage(W.error(n.id, s)), console.error(s);
        return;
      }
    } catch (s) {
      console.error("Error initializing wallet:", s);
      const o = s instanceof Error ? s.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, o));
      return;
    }
    t.source?.postMessage(W.walletInitialized(n.id)), await this.onWalletInitialized();
  }
  async handleSettle(t) {
    const n = t.data;
    if (!gt.isSettle(n)) {
      console.error("Invalid SETTLE message format", n), t.source?.postMessage(W.error(n.id, "Invalid SETTLE message format"));
      return;
    }
    try {
      if (!this.handler) {
        console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
        return;
      }
      const r = await this.handler.handleSettle(n.params, (i) => {
        t.source?.postMessage(W.settleEvent(n.id, i));
      });
      r ? t.source?.postMessage(W.settleSuccess(n.id, r)) : t.source?.postMessage(W.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error settling:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleSendBitcoin(t) {
    const n = t.data;
    if (!gt.isSendBitcoin(n)) {
      console.error("Invalid SEND_BITCOIN message format", n), t.source?.postMessage(W.error(n.id, "Invalid SEND_BITCOIN message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.handleSendBitcoin(n.params);
      r ? t.source?.postMessage(W.sendBitcoinSuccess(n.id, r)) : t.source?.postMessage(W.error(n.id, "Operation not supported in readonly mode"));
    } catch (r) {
      console.error("Error sending bitcoin:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetAddress(t) {
    const n = t.data;
    if (!gt.isGetAddress(n)) {
      console.error("Invalid GET_ADDRESS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getAddress();
      t.source?.postMessage(W.address(n.id, r));
    } catch (r) {
      console.error("Error getting address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetBoardingAddress(t) {
    const n = t.data;
    if (!gt.isGetBoardingAddress(n)) {
      console.error("Invalid GET_BOARDING_ADDRESS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_BOARDING_ADDRESS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getBoardingAddress();
      t.source?.postMessage(W.boardingAddress(n.id, r));
    } catch (r) {
      console.error("Error getting boarding address:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetBalance(t) {
    const n = t.data;
    if (!gt.isGetBalance(n)) {
      console.error("Invalid GET_BALANCE message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_BALANCE message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const [r, i, s] = await Promise.all([
        this.getAllBoardingUtxos(),
        this.getSpendableVtxos(),
        this.getSweptVtxos()
      ]);
      let o = 0, a = 0;
      for (const p of r)
        p.status.confirmed ? o += p.value : a += p.value;
      let c = 0, u = 0, l = 0;
      for (const p of i)
        p.virtualStatus.state === "settled" ? c += p.value : p.virtualStatus.state === "preconfirmed" && (u += p.value);
      for (const p of s)
        ir(p) && (l += p.value);
      const f = o + a, h = c + u + l;
      t.source?.postMessage(W.balance(n.id, {
        boarding: {
          confirmed: o,
          unconfirmed: a,
          total: f
        },
        settled: c,
        preconfirmed: u,
        available: c + u,
        recoverable: l,
        total: f + h
      }));
    } catch (r) {
      console.error("Error getting balance:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetVtxos(t) {
    const n = t.data;
    if (!gt.isGetVtxos(n)) {
      console.error("Invalid GET_VTXOS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getSpendableVtxos(), i = this.handler.dustAmount, o = n.filter?.withRecoverable ?? !1 ? r : r.filter((a) => !(i != null && wm(a, i) || cd(a) || ym(a)));
      t.source?.postMessage(W.vtxos(n.id, o));
    } catch (r) {
      console.error("Error getting vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetBoardingUtxos(t) {
    const n = t.data;
    if (!gt.isGetBoardingUtxos(n)) {
      console.error("Invalid GET_BOARDING_UTXOS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_BOARDING_UTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.getAllBoardingUtxos();
      t.source?.postMessage(W.boardingUtxos(n.id, r));
    } catch (r) {
      console.error("Error getting boarding utxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetTransactionHistory(t) {
    const n = t.data;
    if (!gt.isGetTransactionHistory(n)) {
      console.error("Invalid GET_TRANSACTION_HISTORY message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_TRANSACTION_HISTORY message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getTransactionHistory();
      t.source?.postMessage(W.transactionHistory(n.id, r));
    } catch (r) {
      console.error("Error getting transaction history:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetStatus(t) {
    const n = t.data;
    if (!gt.isGetStatus(n)) {
      console.error("Invalid GET_STATUS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_STATUS message format"));
      return;
    }
    const r = this.handler ? await this.handler.identity.xOnlyPublicKey() : void 0;
    t.source?.postMessage(W.walletStatus(n.id, this.handler !== void 0, r));
  }
  async handleMessage(t) {
    this.messageCallback(t);
    const n = t.data;
    if (!gt.isBase(n)) {
      console.warn("Invalid message format", JSON.stringify(n));
      return;
    }
    switch (n.type) {
      case "INIT_WALLET": {
        await this.handleInitWallet(t);
        break;
      }
      case "SETTLE": {
        await this.handleSettle(t);
        break;
      }
      case "SEND_BITCOIN": {
        await this.handleSendBitcoin(t);
        break;
      }
      case "GET_ADDRESS": {
        await this.handleGetAddress(t);
        break;
      }
      case "GET_BOARDING_ADDRESS": {
        await this.handleGetBoardingAddress(t);
        break;
      }
      case "GET_BALANCE": {
        await this.handleGetBalance(t);
        break;
      }
      case "GET_VTXOS": {
        await this.handleGetVtxos(t);
        break;
      }
      case "GET_BOARDING_UTXOS": {
        await this.handleGetBoardingUtxos(t);
        break;
      }
      case "GET_TRANSACTION_HISTORY": {
        await this.handleGetTransactionHistory(t);
        break;
      }
      case "GET_STATUS": {
        await this.handleGetStatus(t);
        break;
      }
      case "CLEAR": {
        await this.handleClear(t);
        break;
      }
      case "RELOAD_WALLET": {
        await this.handleReloadWallet(t);
        break;
      }
      // Contract Manager events
      case "CREATE_CONTRACT": {
        await this.handleCreateContract(t);
        break;
      }
      case "GET_CONTRACTS": {
        await this.handleGetContracts(t);
        break;
      }
      case "GET_CONTRACTS_WITH_VTXOS": {
        await this.handleGetContractsWithVtxos(t);
        break;
      }
      case "UPDATE_CONTRACT": {
        await this.handleUpdateContract(t);
        break;
      }
      case "DELETE_CONTRACT": {
        await this.handleDeleteContract(t);
        break;
      }
      case "GET_SPENDABLE_PATHS": {
        await this.handleGetSpendablePaths(t);
        break;
      }
      case "GET_ALL_SPENDING_PATHS": {
        await this.handleGetAllSpendingPaths(t);
        break;
      }
      case "IS_CONTRACT_MANAGER_WATCHING": {
        await this.handleIsContractManagerWatching(t);
        break;
      }
      case "SUBSCRIBE_CONTRACT_EVENTS": {
        await this.handleSubscribeContractEvents(t);
        break;
      }
      case "UNSUBSCRIBE_CONTRACT_EVENTS": {
        await this.handleUnsubscribeContractEvents(t);
        break;
      }
      default:
        t.source?.postMessage(W.error(n.id, "Unknown message type"));
    }
  }
  async sendMessageToAllClients(t) {
    self.clients.matchAll({ includeUncontrolled: !0, type: "window" }).then((n) => {
      n.forEach((r) => {
        r.postMessage(t);
      });
    });
  }
  async handleReloadWallet(t) {
    const n = t.data;
    if (!gt.isReloadWallet(n)) {
      console.error("Invalid RELOAD_WALLET message format", n), t.source?.postMessage(W.error(n.id, "Invalid RELOAD_WALLET message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.walletReloaded(n.id, !1));
      return;
    }
    try {
      await this.onWalletInitialized(), t.source?.postMessage(W.walletReloaded(n.id, !0));
    } catch (r) {
      console.error("Error reloading wallet:", r), t.source?.postMessage(W.walletReloaded(n.id, !1));
    }
  }
  // =====================================================================
  // Contract Manager handlers
  // =====================================================================
  async handleCreateContract(t) {
    const n = t.data;
    if (!gt.isCreateContract(n)) {
      console.error("Invalid CREATE_CONTRACT message format", n), t.source?.postMessage(W.error(n.id, "Invalid CREATE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).createContract(n.params);
      t.source?.postMessage(W.contractCreated(n.id, i));
    } catch (r) {
      console.error("Error creating contract:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetContracts(t) {
    const n = t.data;
    if (!gt.isGetContracts(n)) {
      console.error("Invalid GET_CONTRACTS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_CONTRACTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).getContracts(n.filter);
      t.source?.postMessage(W.contracts(n.id, i));
    } catch (r) {
      console.error("Error getting contracts:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetContractsWithVtxos(t) {
    const n = t.data;
    if (!gt.isGetContractsVtxos(n)) {
      console.error("Invalid GET_CONTRACTS_WITH_VTXOS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_CONTRACTS_WITH_VTXOS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).getContractsWithVtxos(n.filter);
      t.source?.postMessage(W.contractsWithVtxos(n.id, i));
    } catch (r) {
      console.error("Error getting contracts with vtxos:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleUpdateContract(t) {
    const n = t.data;
    if (!gt.isUpdateContract(n)) {
      console.error("Invalid UPDATE_CONTRACT message format", n), t.source?.postMessage(W.error(n.id, "Invalid UPDATE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).updateContract(n.contractScript, n.updates);
      t.source?.postMessage(W.contractUpdated(n.id, i));
    } catch (r) {
      console.error("Error updating contract:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleDeleteContract(t) {
    const n = t.data;
    if (!gt.isDeleteContract(n)) {
      console.error("Invalid DELETE_CONTRACT message format", n), t.source?.postMessage(W.error(n.id, "Invalid DELETE_CONTRACT message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      await (await this.handler.getContractManager()).deleteContract(n.contractScript), t.source?.postMessage(W.contractDeleted(n.id));
    } catch (r) {
      console.error("Error deleting contract:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetSpendablePaths(t) {
    const n = t.data;
    if (!gt.isGetSpendablePaths(n)) {
      console.error("Invalid GET_SPENDABLE_PATHS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_SPENDABLE_PATHS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).getSpendablePaths(n.options);
      t.source?.postMessage(W.spendablePaths(n.id, i));
    } catch (r) {
      console.error("Error getting spendable paths:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleGetAllSpendingPaths(t) {
    const n = t.data;
    if (!gt.isGetAllSpendingPaths(n)) {
      console.error("Invalid GET_ALL_SPENDING_PATHS message format", n), t.source?.postMessage(W.error(n.id, "Invalid GET_ALL_SPENDING_PATHS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).getAllSpendingPaths(n.options);
      t.source?.postMessage(W.allSpendingPaths(n.id, i));
    } catch (r) {
      console.error("Error getting all spending paths:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleIsContractManagerWatching(t) {
    const n = t.data;
    if (!gt.isIsContractWatching(n)) {
      console.error("Invalid IS_CONTRACT_MANAGER_WATCHING message format", n), t.source?.postMessage(W.error(n.id, "Invalid IS_CONTRACT_MANAGER_WATCHING message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const i = await (await this.handler.getContractManager()).isWatching();
      t.source?.postMessage(W.contractWatching(n.id, i));
    } catch (r) {
      console.error("Error checking contract manager state:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleSubscribeContractEvents(t) {
    const n = t.data;
    if (!gt.isSubscribeContractEvents(n)) {
      console.error("Invalid SUBSCRIBE_CONTRACT_EVENTS message format", n), t.source?.postMessage(W.error(n.id, "Invalid SUBSCRIBE_CONTRACT_EVENTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      const r = await this.handler.getContractManager();
      this.contractEventsSubscription && this.contractEventsSubscription(), this.contractEventsSubscription = r.onContractEvent((i) => {
        this.sendMessageToAllClients(W.contractEvent(i));
      }), t.source?.postMessage(W.contractEventsSubscribed(n.id));
    } catch (r) {
      console.error("Error subscribing to contract events:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
  async handleUnsubscribeContractEvents(t) {
    const n = t.data;
    if (!gt.isUnsubscribeContractEvents(n)) {
      console.error("Invalid UNSUBSCRIBE_CONTRACT_EVENTS message format", n), t.source?.postMessage(W.error(n.id, "Invalid UNSUBSCRIBE_CONTRACT_EVENTS message format"));
      return;
    }
    if (!this.handler) {
      console.error("Wallet not initialized"), t.source?.postMessage(W.error(n.id, "Wallet not initialized"));
      return;
    }
    try {
      this.contractEventsSubscription && (this.contractEventsSubscription(), this.contractEventsSubscription = void 0), t.source?.postMessage(W.contractEventsUnsubscribed(n.id));
    } catch (r) {
      console.error("Error unsubscribing from contract events:", r);
      const i = r instanceof Error ? r.message : "Unknown error occurred";
      t.source?.postMessage(W.error(n.id, i));
    }
  }
}
var Np;
(function(e) {
  let t;
  (function(i) {
    i[i.UNROLL = 0] = "UNROLL", i[i.WAIT = 1] = "WAIT", i[i.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(s, o, a, c) {
      this.toUnroll = s, this.bumper = o, this.explorer = a, this.indexer = c;
    }
    static async create(s, o, a, c) {
      const { chain: u } = await c.getVtxoChain(s);
      return new n({ ...s, chain: u }, o, a, c);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const o = this.toUnroll.chain;
      for (let u = o.length - 1; u >= 0; u--) {
        const l = o[u];
        if (!(l.type === xi.COMMITMENT || l.type === xi.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: E1(this.explorer, l.txid)
              };
          } catch {
            s = l;
            break;
          }
      }
      if (!s)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const a = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (a.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const c = wr.fromPSBT(Wt.decode(a.txs[0]));
      if (s.type === xi.TREE) {
        const u = c.getInput(0);
        if (!u)
          throw new Error("Input not found");
        const l = u.tapKeySig;
        if (!l)
          throw new Error("Tap key sig not found");
        c.updateInput(0, {
          finalScriptWitness: [l]
        });
      } else
        c.finalize();
      return {
        type: t.UNROLL,
        tx: c,
        do: b1(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await m1(1e3);
        const o = await this.next();
        await o.do(), yield o, s = o.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(i, s, o) {
    const a = await i.onchainProvider.getChainTip();
    let c = await i.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((m) => s.includes(m.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const f = Qe.create();
    for (const m of c) {
      if (!m.isUnrolled)
        throw new Error(`Vtxo ${m.txid}:${m.vout} is not fully unrolled, use unroll first`);
      const v = await i.onchainProvider.getTxStatus(m.txid);
      if (!v.confirmed)
        throw new Error(`tx ${m.txid} is not confirmed`);
      const k = T1({ height: v.blockHeight, time: v.blockTime }, a, m);
      if (!k)
        throw new Error(`no available exit path found for vtxo ${m.txid}:${m.vout}`);
      const C = bn.decode(m.tapTree).findLeaf(P.encode(k.script));
      if (!C)
        throw new Error(`spending leaf not found for vtxo ${m.txid}:${m.vout}`);
      l += BigInt(m.value), u.push({
        txid: m.txid,
        index: m.vout,
        tapLeafScript: [C],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(m.value),
          script: bn.decode(m.tapTree).pkScript
        },
        sighashType: Qr.DEFAULT
      }), f.addTapscriptInput(64, C[1].length, fn.encode(C[0]).length);
    }
    const h = new wr({ version: 2 });
    for (const m of u)
      h.addInput(m);
    f.addOutputAddress(o, i.network);
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < Ma.MIN_FEE_RATE) && (p = Ma.MIN_FEE_RATE);
    const y = f.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    const d = l - y;
    if (d < BigInt(YS))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, d);
    const g = await i.identity.sign(h);
    return g.finalize(), await i.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(Np || (Np = {}));
function m1(e) {
  return new Promise((t) => setTimeout(t, e));
}
function b1(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function E1(e, t) {
  return () => new Promise((n, r) => {
    const i = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(i), n());
      } catch (s) {
        clearInterval(i), r(s);
      }
    }, 5e3);
  });
}
function T1(e, t, n) {
  const r = bn.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function hd(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function ni(e, t = "") {
  if (!Number.isSafeInteger(e) || e < 0) {
    const n = t && `"${t}" `;
    throw new Error(`${n}expected integer >0, got ${e}`);
  }
}
function ut(e, t, n = "") {
  const r = hd(e), i = e?.length, s = t !== void 0;
  if (!r || s && i !== t) {
    const o = n && `"${n}" `, a = s ? ` of length ${t}` : "", c = r ? `length=${i}` : `type=${typeof e}`;
    throw new Error(o + "expected Uint8Array" + a + ", got " + c);
  }
  return e;
}
function Gm(e) {
  if (typeof e != "function" || typeof e.create != "function")
    throw new Error("Hash must wrapped by utils.createHasher");
  ni(e.outputLen), ni(e.blockLen);
}
function Ha(e, t = !0) {
  if (e.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (t && e.finished)
    throw new Error("Hash#digest() has already been called");
}
function x1(e, t) {
  ut(e, void 0, "digestInto() output");
  const n = t.outputLen;
  if (e.length < n)
    throw new Error('"digestInto() output" expected to be of length >=' + n);
}
function Mi(...e) {
  for (let t = 0; t < e.length; t++)
    e[t].fill(0);
}
function zu(e) {
  return new DataView(e.buffer, e.byteOffset, e.byteLength);
}
function nn(e, t) {
  return e << 32 - t | e >>> t;
}
function Co(e, t) {
  return e << t | e >>> 32 - t >>> 0;
}
const qm = /* @ts-ignore */ typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", S1 = /* @__PURE__ */ Array.from({ length: 256 }, (e, t) => t.toString(16).padStart(2, "0"));
function Oc(e) {
  if (ut(e), qm)
    return e.toHex();
  let t = "";
  for (let n = 0; n < e.length; n++)
    t += S1[e[n]];
  return t;
}
const kn = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function Pp(e) {
  if (e >= kn._0 && e <= kn._9)
    return e - kn._0;
  if (e >= kn.A && e <= kn.F)
    return e - (kn.A - 10);
  if (e >= kn.a && e <= kn.f)
    return e - (kn.a - 10);
}
function Fa(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  if (qm)
    return Uint8Array.fromHex(e);
  const t = e.length, n = t / 2;
  if (t % 2)
    throw new Error("hex string expected, got unpadded hex of length " + t);
  const r = new Uint8Array(n);
  for (let i = 0, s = 0; i < n; i++, s += 2) {
    const o = Pp(e.charCodeAt(s)), a = Pp(e.charCodeAt(s + 1));
    if (o === void 0 || a === void 0) {
      const c = e[s] + e[s + 1];
      throw new Error('hex string expected, got non-hex character "' + c + '" at index ' + s);
    }
    r[i] = o * 16 + a;
  }
  return r;
}
function hn(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    ut(i), t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
function Ym(e, t = {}) {
  const n = (i, s) => e(s).update(i).digest(), r = e(void 0);
  return n.outputLen = r.outputLen, n.blockLen = r.blockLen, n.create = (i) => e(i), Object.assign(n, t), Object.freeze(n);
}
function Bc(e = 32) {
  const t = typeof globalThis == "object" ? globalThis.crypto : null;
  if (typeof t?.getRandomValues != "function")
    throw new Error("crypto.getRandomValues must be defined");
  return t.getRandomValues(new Uint8Array(e));
}
const v1 = (e) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, e])
});
function A1(e, t, n) {
  return e & t ^ ~e & n;
}
function k1(e, t, n) {
  return e & t ^ e & n ^ t & n;
}
class Zm {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = !1;
  length = 0;
  pos = 0;
  destroyed = !1;
  constructor(t, n, r, i) {
    this.blockLen = t, this.outputLen = n, this.padOffset = r, this.isLE = i, this.buffer = new Uint8Array(t), this.view = zu(this.buffer);
  }
  update(t) {
    Ha(this), ut(t);
    const { view: n, buffer: r, blockLen: i } = this, s = t.length;
    for (let o = 0; o < s; ) {
      const a = Math.min(i - this.pos, s - o);
      if (a === i) {
        const c = zu(t);
        for (; i <= s - o; o += i)
          this.process(c, o);
        continue;
      }
      r.set(t.subarray(o, o + a), this.pos), this.pos += a, o += a, this.pos === i && (this.process(n, 0), this.pos = 0);
    }
    return this.length += t.length, this.roundClean(), this;
  }
  digestInto(t) {
    Ha(this), x1(t, this), this.finished = !0;
    const { buffer: n, view: r, blockLen: i, isLE: s } = this;
    let { pos: o } = this;
    n[o++] = 128, Mi(this.buffer.subarray(o)), this.padOffset > i - o && (this.process(r, 0), o = 0);
    for (let f = o; f < i; f++)
      n[f] = 0;
    r.setBigUint64(i - 8, BigInt(this.length * 8), s), this.process(r, 0);
    const a = zu(t), c = this.outputLen;
    if (c % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const u = c / 4, l = this.get();
    if (u > l.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let f = 0; f < u; f++)
      a.setUint32(4 * f, l[f], s);
  }
  digest() {
    const { buffer: t, outputLen: n } = this;
    this.digestInto(t);
    const r = t.slice(0, n);
    return this.destroy(), r;
  }
  _cloneInto(t) {
    t ||= new this.constructor(), t.set(...this.get());
    const { blockLen: n, buffer: r, length: i, finished: s, destroyed: o, pos: a } = this;
    return t.destroyed = o, t.finished = s, t.length = i, t.pos = a, i % n && t.buffer.set(r), t;
  }
  clone() {
    return this._cloneInto();
  }
}
const Gn = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]), I1 = /* @__PURE__ */ Uint32Array.from([
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
]), qn = /* @__PURE__ */ new Uint32Array(64);
class $1 extends Zm {
  constructor(t) {
    super(64, t, 8, !1);
  }
  get() {
    const { A: t, B: n, C: r, D: i, E: s, F: o, G: a, H: c } = this;
    return [t, n, r, i, s, o, a, c];
  }
  // prettier-ignore
  set(t, n, r, i, s, o, a, c) {
    this.A = t | 0, this.B = n | 0, this.C = r | 0, this.D = i | 0, this.E = s | 0, this.F = o | 0, this.G = a | 0, this.H = c | 0;
  }
  process(t, n) {
    for (let f = 0; f < 16; f++, n += 4)
      qn[f] = t.getUint32(n, !1);
    for (let f = 16; f < 64; f++) {
      const h = qn[f - 15], p = qn[f - 2], y = nn(h, 7) ^ nn(h, 18) ^ h >>> 3, d = nn(p, 17) ^ nn(p, 19) ^ p >>> 10;
      qn[f] = d + qn[f - 7] + y + qn[f - 16] | 0;
    }
    let { A: r, B: i, C: s, D: o, E: a, F: c, G: u, H: l } = this;
    for (let f = 0; f < 64; f++) {
      const h = nn(a, 6) ^ nn(a, 11) ^ nn(a, 25), p = l + h + A1(a, c, u) + I1[f] + qn[f] | 0, d = (nn(r, 2) ^ nn(r, 13) ^ nn(r, 22)) + k1(r, i, s) | 0;
      l = u, u = c, c = a, a = o + p | 0, o = s, s = i, i = r, r = p + d | 0;
    }
    r = r + this.A | 0, i = i + this.B | 0, s = s + this.C | 0, o = o + this.D | 0, a = a + this.E | 0, c = c + this.F | 0, u = u + this.G | 0, l = l + this.H | 0, this.set(r, i, s, o, a, c, u, l);
  }
  roundClean() {
    Mi(qn);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0), Mi(this.buffer);
  }
}
class C1 extends $1 {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = Gn[0] | 0;
  B = Gn[1] | 0;
  C = Gn[2] | 0;
  D = Gn[3] | 0;
  E = Gn[4] | 0;
  F = Gn[5] | 0;
  G = Gn[6] | 0;
  H = Gn[7] | 0;
  constructor() {
    super(32);
  }
}
const jt = /* @__PURE__ */ Ym(
  () => new C1(),
  /* @__PURE__ */ v1(1)
);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const pd = /* @__PURE__ */ BigInt(0), Jl = /* @__PURE__ */ BigInt(1);
function Wa(e, t = "") {
  if (typeof e != "boolean") {
    const n = t && `"${t}" `;
    throw new Error(n + "expected boolean, got type=" + typeof e);
  }
  return e;
}
function Xm(e) {
  if (typeof e == "bigint") {
    if (!Qo(e))
      throw new Error("positive bigint expected, got " + e);
  } else
    ni(e);
  return e;
}
function Oo(e) {
  const t = Xm(e).toString(16);
  return t.length & 1 ? "0" + t : t;
}
function Qm(e) {
  if (typeof e != "string")
    throw new Error("hex string expected, got " + typeof e);
  return e === "" ? pd : BigInt("0x" + e);
}
function Hn(e) {
  return Qm(Oc(e));
}
function Jm(e) {
  return Qm(Oc(O1(ut(e)).reverse()));
}
function Nc(e, t) {
  ni(t), e = Xm(e);
  const n = Fa(e.toString(16).padStart(t * 2, "0"));
  if (n.length !== t)
    throw new Error("number too large");
  return n;
}
function tb(e, t) {
  return Nc(e, t).reverse();
}
function gd(e, t) {
  if (e.length !== t.length)
    return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++)
    n |= e[r] ^ t[r];
  return n === 0;
}
function O1(e) {
  return Uint8Array.from(e);
}
function B1(e) {
  return Uint8Array.from(e, (t, n) => {
    const r = t.charCodeAt(0);
    if (t.length !== 1 || r > 127)
      throw new Error(`string contains non-ASCII character "${e[n]}" with code ${r} at position ${n}`);
    return r;
  });
}
const Qo = (e) => typeof e == "bigint" && pd <= e;
function N1(e, t, n) {
  return Qo(e) && Qo(t) && Qo(n) && t <= e && e < n;
}
function eb(e, t, n, r) {
  if (!N1(t, n, r))
    throw new Error("expected valid " + e + ": " + n + " <= n < " + r + ", got " + t);
}
function P1(e) {
  let t;
  for (t = 0; e > pd; e >>= Jl, t += 1)
    ;
  return t;
}
const yd = (e) => (Jl << BigInt(e)) - Jl;
function R1(e, t, n) {
  if (ni(e, "hashLen"), ni(t, "qByteLen"), typeof n != "function")
    throw new Error("hmacFn must be a function");
  const r = (g) => new Uint8Array(g), i = Uint8Array.of(), s = Uint8Array.of(0), o = Uint8Array.of(1), a = 1e3;
  let c = r(e), u = r(e), l = 0;
  const f = () => {
    c.fill(1), u.fill(0), l = 0;
  }, h = (...g) => n(u, hn(c, ...g)), p = (g = i) => {
    u = h(s, g), c = h(), g.length !== 0 && (u = h(o, g), c = h());
  }, y = () => {
    if (l++ >= a)
      throw new Error("drbg: tried max amount of iterations");
    let g = 0;
    const m = [];
    for (; g < t; ) {
      c = h();
      const v = c.slice();
      m.push(v), g += c.length;
    }
    return hn(...m);
  };
  return (g, m) => {
    f(), p(g);
    let v;
    for (; !(v = m(y())); )
      p();
    return f(), v;
  };
}
function wd(e, t = {}, n = {}) {
  if (!e || typeof e != "object")
    throw new Error("expected valid options object");
  function r(s, o, a) {
    const c = e[s];
    if (a && c === void 0)
      return;
    const u = typeof c;
    if (u !== o || c === null)
      throw new Error(`param "${s}" is invalid: expected ${o}, got ${u}`);
  }
  const i = (s, o) => Object.entries(s).forEach(([a, c]) => r(a, c, o));
  i(t, !1), i(n, !0);
}
function Rp(e) {
  const t = /* @__PURE__ */ new WeakMap();
  return (n, ...r) => {
    const i = t.get(n);
    if (i !== void 0)
      return i;
    const s = e(n, ...r);
    return t.set(n, s), s;
  };
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const ee = /* @__PURE__ */ BigInt(0), Zt = /* @__PURE__ */ BigInt(1), Kr = /* @__PURE__ */ BigInt(2), nb = /* @__PURE__ */ BigInt(3), rb = /* @__PURE__ */ BigInt(4), ib = /* @__PURE__ */ BigInt(5), U1 = /* @__PURE__ */ BigInt(7), sb = /* @__PURE__ */ BigInt(8), _1 = /* @__PURE__ */ BigInt(9), ob = /* @__PURE__ */ BigInt(16);
function Le(e, t) {
  const n = e % t;
  return n >= ee ? n : t + n;
}
function Se(e, t, n) {
  let r = e;
  for (; t-- > ee; )
    r *= r, r %= n;
  return r;
}
function Up(e, t) {
  if (e === ee)
    throw new Error("invert: expected non-zero number");
  if (t <= ee)
    throw new Error("invert: expected positive modulus, got " + t);
  let n = Le(e, t), r = t, i = ee, s = Zt;
  for (; n !== ee; ) {
    const a = r / n, c = r % n, u = i - s * a;
    r = n, n = c, i = s, s = u;
  }
  if (r !== Zt)
    throw new Error("invert: does not exist");
  return Le(i, t);
}
function md(e, t, n) {
  if (!e.eql(e.sqr(t), n))
    throw new Error("Cannot find square root");
}
function ab(e, t) {
  const n = (e.ORDER + Zt) / rb, r = e.pow(t, n);
  return md(e, r, t), r;
}
function L1(e, t) {
  const n = (e.ORDER - ib) / sb, r = e.mul(t, Kr), i = e.pow(r, n), s = e.mul(t, i), o = e.mul(e.mul(s, Kr), i), a = e.mul(s, e.sub(o, e.ONE));
  return md(e, a, t), a;
}
function D1(e) {
  const t = Pc(e), n = cb(e), r = n(t, t.neg(t.ONE)), i = n(t, r), s = n(t, t.neg(r)), o = (e + U1) / ob;
  return (a, c) => {
    let u = a.pow(c, o), l = a.mul(u, r);
    const f = a.mul(u, i), h = a.mul(u, s), p = a.eql(a.sqr(l), c), y = a.eql(a.sqr(f), c);
    u = a.cmov(u, l, p), l = a.cmov(h, f, y);
    const d = a.eql(a.sqr(l), c), g = a.cmov(u, l, d);
    return md(a, g, c), g;
  };
}
function cb(e) {
  if (e < nb)
    throw new Error("sqrt is not defined for small field");
  let t = e - Zt, n = 0;
  for (; t % Kr === ee; )
    t /= Kr, n++;
  let r = Kr;
  const i = Pc(e);
  for (; _p(i, r) === 1; )
    if (r++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  if (n === 1)
    return ab;
  let s = i.pow(r, t);
  const o = (t + Zt) / Kr;
  return function(c, u) {
    if (c.is0(u))
      return u;
    if (_p(c, u) !== 1)
      throw new Error("Cannot find square root");
    let l = n, f = c.mul(c.ONE, s), h = c.pow(u, t), p = c.pow(u, o);
    for (; !c.eql(h, c.ONE); ) {
      if (c.is0(h))
        return c.ZERO;
      let y = 1, d = c.sqr(h);
      for (; !c.eql(d, c.ONE); )
        if (y++, d = c.sqr(d), y === l)
          throw new Error("Cannot find square root");
      const g = Zt << BigInt(l - y - 1), m = c.pow(f, g);
      l = y, f = c.sqr(m), h = c.mul(h, f), p = c.mul(p, m);
    }
    return p;
  };
}
function V1(e) {
  return e % rb === nb ? ab : e % sb === ib ? L1 : e % ob === _1 ? D1(e) : cb(e);
}
const M1 = [
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
function H1(e) {
  const t = {
    ORDER: "bigint",
    BYTES: "number",
    BITS: "number"
  }, n = M1.reduce((r, i) => (r[i] = "function", r), t);
  return wd(e, n), e;
}
function F1(e, t, n) {
  if (n < ee)
    throw new Error("invalid exponent, negatives unsupported");
  if (n === ee)
    return e.ONE;
  if (n === Zt)
    return t;
  let r = e.ONE, i = t;
  for (; n > ee; )
    n & Zt && (r = e.mul(r, i)), i = e.sqr(i), n >>= Zt;
  return r;
}
function ub(e, t, n = !1) {
  const r = new Array(t.length).fill(n ? e.ZERO : void 0), i = t.reduce((o, a, c) => e.is0(a) ? o : (r[c] = o, e.mul(o, a)), e.ONE), s = e.inv(i);
  return t.reduceRight((o, a, c) => e.is0(a) ? o : (r[c] = e.mul(o, r[c]), e.mul(o, a)), s), r;
}
function _p(e, t) {
  const n = (e.ORDER - Zt) / Kr, r = e.pow(t, n), i = e.eql(r, e.ONE), s = e.eql(r, e.ZERO), o = e.eql(r, e.neg(e.ONE));
  if (!i && !s && !o)
    throw new Error("invalid Legendre symbol result");
  return i ? 1 : s ? 0 : -1;
}
function W1(e, t) {
  t !== void 0 && ni(t);
  const n = t !== void 0 ? t : e.toString(2).length, r = Math.ceil(n / 8);
  return { nBitLength: n, nByteLength: r };
}
class K1 {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = ee;
  ONE = Zt;
  _lengths;
  _sqrt;
  // cached sqrt
  _mod;
  constructor(t, n = {}) {
    if (t <= ee)
      throw new Error("invalid field: expected ORDER > 0, got " + t);
    let r;
    this.isLE = !1, n != null && typeof n == "object" && (typeof n.BITS == "number" && (r = n.BITS), typeof n.sqrt == "function" && (this.sqrt = n.sqrt), typeof n.isLE == "boolean" && (this.isLE = n.isLE), n.allowedLengths && (this._lengths = n.allowedLengths?.slice()), typeof n.modFromBytes == "boolean" && (this._mod = n.modFromBytes));
    const { nBitLength: i, nByteLength: s } = W1(t, r);
    if (s > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = t, this.BITS = i, this.BYTES = s, this._sqrt = void 0, Object.preventExtensions(this);
  }
  create(t) {
    return Le(t, this.ORDER);
  }
  isValid(t) {
    if (typeof t != "bigint")
      throw new Error("invalid field element: expected bigint, got " + typeof t);
    return ee <= t && t < this.ORDER;
  }
  is0(t) {
    return t === ee;
  }
  // is valid and invertible
  isValidNot0(t) {
    return !this.is0(t) && this.isValid(t);
  }
  isOdd(t) {
    return (t & Zt) === Zt;
  }
  neg(t) {
    return Le(-t, this.ORDER);
  }
  eql(t, n) {
    return t === n;
  }
  sqr(t) {
    return Le(t * t, this.ORDER);
  }
  add(t, n) {
    return Le(t + n, this.ORDER);
  }
  sub(t, n) {
    return Le(t - n, this.ORDER);
  }
  mul(t, n) {
    return Le(t * n, this.ORDER);
  }
  pow(t, n) {
    return F1(this, t, n);
  }
  div(t, n) {
    return Le(t * Up(n, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(t) {
    return t * t;
  }
  addN(t, n) {
    return t + n;
  }
  subN(t, n) {
    return t - n;
  }
  mulN(t, n) {
    return t * n;
  }
  inv(t) {
    return Up(t, this.ORDER);
  }
  sqrt(t) {
    return this._sqrt || (this._sqrt = V1(this.ORDER)), this._sqrt(this, t);
  }
  toBytes(t) {
    return this.isLE ? tb(t, this.BYTES) : Nc(t, this.BYTES);
  }
  fromBytes(t, n = !1) {
    ut(t);
    const { _lengths: r, BYTES: i, isLE: s, ORDER: o, _mod: a } = this;
    if (r) {
      if (!r.includes(t.length) || t.length > i)
        throw new Error("Field.fromBytes: expected " + r + " bytes, got " + t.length);
      const u = new Uint8Array(i);
      u.set(t, s ? 0 : u.length - t.length), t = u;
    }
    if (t.length !== i)
      throw new Error("Field.fromBytes: expected " + i + " bytes, got " + t.length);
    let c = s ? Jm(t) : Hn(t);
    if (a && (c = Le(c, o)), !n && !this.isValid(c))
      throw new Error("invalid field element: outside of range 0..ORDER");
    return c;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(t) {
    return ub(this, t);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(t, n, r) {
    return r ? n : t;
  }
}
function Pc(e, t = {}) {
  return new K1(e, t);
}
function lb(e) {
  if (typeof e != "bigint")
    throw new Error("field order must be bigint");
  const t = e.toString(2).length;
  return Math.ceil(t / 8);
}
function fb(e) {
  const t = lb(e);
  return t + Math.ceil(t / 2);
}
function db(e, t, n = !1) {
  ut(e);
  const r = e.length, i = lb(t), s = fb(t);
  if (r < 16 || r < s || r > 1024)
    throw new Error("expected " + s + "-1024 bytes of input, got " + r);
  const o = n ? Jm(e) : Hn(e), a = Le(o, t - Zt) + Zt;
  return n ? tb(a, i) : Nc(a, i);
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Hi = /* @__PURE__ */ BigInt(0), zr = /* @__PURE__ */ BigInt(1);
function Ka(e, t) {
  const n = t.negate();
  return e ? n : t;
}
function Lp(e, t) {
  const n = ub(e.Fp, t.map((r) => r.Z));
  return t.map((r, i) => e.fromAffine(r.toAffine(n[i])));
}
function hb(e, t) {
  if (!Number.isSafeInteger(e) || e <= 0 || e > t)
    throw new Error("invalid window size, expected [1.." + t + "], got W=" + e);
}
function ju(e, t) {
  hb(e, t);
  const n = Math.ceil(t / e) + 1, r = 2 ** (e - 1), i = 2 ** e, s = yd(e), o = BigInt(e);
  return { windows: n, windowSize: r, mask: s, maxNumber: i, shiftBy: o };
}
function Dp(e, t, n) {
  const { windowSize: r, mask: i, maxNumber: s, shiftBy: o } = n;
  let a = Number(e & i), c = e >> o;
  a > r && (a -= s, c += zr);
  const u = t * r, l = u + Math.abs(a) - 1, f = a === 0, h = a < 0, p = t % 2 !== 0;
  return { nextN: c, offset: l, isZero: f, isNeg: h, isNegF: p, offsetF: u };
}
const Gu = /* @__PURE__ */ new WeakMap(), pb = /* @__PURE__ */ new WeakMap();
function qu(e) {
  return pb.get(e) || 1;
}
function Vp(e) {
  if (e !== Hi)
    throw new Error("invalid wNAF");
}
class z1 {
  BASE;
  ZERO;
  Fn;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(t, n) {
    this.BASE = t.BASE, this.ZERO = t.ZERO, this.Fn = t.Fn, this.bits = n;
  }
  // non-const time multiplication ladder
  _unsafeLadder(t, n, r = this.ZERO) {
    let i = t;
    for (; n > Hi; )
      n & zr && (r = r.add(i)), i = i.double(), n >>= zr;
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
  precomputeWindow(t, n) {
    const { windows: r, windowSize: i } = ju(n, this.bits), s = [];
    let o = t, a = o;
    for (let c = 0; c < r; c++) {
      a = o, s.push(a);
      for (let u = 1; u < i; u++)
        a = a.add(o), s.push(a);
      o = a.double();
    }
    return s;
  }
  /**
   * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
   * More compact implementation:
   * https://github.com/paulmillr/noble-secp256k1/blob/47cb1669b6e506ad66b35fe7d76132ae97465da2/index.ts#L502-L541
   * @returns real and fake (for const-time) points
   */
  wNAF(t, n, r) {
    if (!this.Fn.isValid(r))
      throw new Error("invalid scalar");
    let i = this.ZERO, s = this.BASE;
    const o = ju(t, this.bits);
    for (let a = 0; a < o.windows; a++) {
      const { nextN: c, offset: u, isZero: l, isNeg: f, isNegF: h, offsetF: p } = Dp(r, a, o);
      r = c, l ? s = s.add(Ka(h, n[p])) : i = i.add(Ka(f, n[u]));
    }
    return Vp(r), { p: i, f: s };
  }
  /**
   * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
   * @param acc accumulator point to add result of multiplication
   * @returns point
   */
  wNAFUnsafe(t, n, r, i = this.ZERO) {
    const s = ju(t, this.bits);
    for (let o = 0; o < s.windows && r !== Hi; o++) {
      const { nextN: a, offset: c, isZero: u, isNeg: l } = Dp(r, o, s);
      if (r = a, !u) {
        const f = n[c];
        i = i.add(l ? f.negate() : f);
      }
    }
    return Vp(r), i;
  }
  getPrecomputes(t, n, r) {
    let i = Gu.get(n);
    return i || (i = this.precomputeWindow(n, t), t !== 1 && (typeof r == "function" && (i = r(i)), Gu.set(n, i))), i;
  }
  cached(t, n, r) {
    const i = qu(t);
    return this.wNAF(i, this.getPrecomputes(i, t, r), n);
  }
  unsafe(t, n, r, i) {
    const s = qu(t);
    return s === 1 ? this._unsafeLadder(t, n, i) : this.wNAFUnsafe(s, this.getPrecomputes(s, t, r), n, i);
  }
  // We calculate precomputes for elliptic curve point multiplication
  // using windowed method. This specifies window size and
  // stores precomputed values. Usually only base point would be precomputed.
  createCache(t, n) {
    hb(n, this.bits), pb.set(t, n), Gu.delete(t);
  }
  hasCache(t) {
    return qu(t) !== 1;
  }
}
function j1(e, t, n, r) {
  let i = t, s = e.ZERO, o = e.ZERO;
  for (; n > Hi || r > Hi; )
    n & zr && (s = s.add(i)), r & zr && (o = o.add(i)), i = i.double(), n >>= zr, r >>= zr;
  return { p1: s, p2: o };
}
function Mp(e, t, n) {
  if (t) {
    if (t.ORDER !== e)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    return H1(t), t;
  } else
    return Pc(e, { isLE: n });
}
function G1(e, t, n = {}, r) {
  if (r === void 0 && (r = e === "edwards"), !t || typeof t != "object")
    throw new Error(`expected valid ${e} CURVE object`);
  for (const c of ["p", "n", "h"]) {
    const u = t[c];
    if (!(typeof u == "bigint" && u > Hi))
      throw new Error(`CURVE.${c} must be positive bigint`);
  }
  const i = Mp(t.p, n.Fp, r), s = Mp(t.n, n.Fn, r), a = ["Gx", "Gy", "a", "b"];
  for (const c of a)
    if (!i.isValid(t[c]))
      throw new Error(`CURVE.${c} must be valid field element of CURVE.Fp`);
  return t = Object.freeze(Object.assign({}, t)), { CURVE: t, Fp: i, Fn: s };
}
function gb(e, t) {
  return function(r) {
    const i = e(r);
    return { secretKey: i, publicKey: t(i) };
  };
}
class yb {
  oHash;
  iHash;
  blockLen;
  outputLen;
  finished = !1;
  destroyed = !1;
  constructor(t, n) {
    if (Gm(t), ut(n, void 0, "key"), this.iHash = t.create(), typeof this.iHash.update != "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen, this.outputLen = this.iHash.outputLen;
    const r = this.blockLen, i = new Uint8Array(r);
    i.set(n.length > r ? t.create().update(n).digest() : n);
    for (let s = 0; s < i.length; s++)
      i[s] ^= 54;
    this.iHash.update(i), this.oHash = t.create();
    for (let s = 0; s < i.length; s++)
      i[s] ^= 106;
    this.oHash.update(i), Mi(i);
  }
  update(t) {
    return Ha(this), this.iHash.update(t), this;
  }
  digestInto(t) {
    Ha(this), ut(t, this.outputLen, "output"), this.finished = !0, this.iHash.digestInto(t), this.oHash.update(t), this.oHash.digestInto(t), this.destroy();
  }
  digest() {
    const t = new Uint8Array(this.oHash.outputLen);
    return this.digestInto(t), t;
  }
  _cloneInto(t) {
    t ||= Object.create(Object.getPrototypeOf(this), {});
    const { oHash: n, iHash: r, finished: i, destroyed: s, blockLen: o, outputLen: a } = this;
    return t = t, t.finished = i, t.destroyed = s, t.blockLen = o, t.outputLen = a, t.oHash = n._cloneInto(t.oHash), t.iHash = r._cloneInto(t.iHash), t;
  }
  clone() {
    return this._cloneInto();
  }
  destroy() {
    this.destroyed = !0, this.oHash.destroy(), this.iHash.destroy();
  }
}
const wb = (e, t, n) => new yb(e, t).update(n).digest();
wb.create = (e, t) => new yb(e, t);
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Hp = (e, t) => (e + (e >= 0 ? t : -t) / mb) / t;
function q1(e, t, n) {
  const [[r, i], [s, o]] = t, a = Hp(o * e, n), c = Hp(-i * e, n);
  let u = e - a * r - c * s, l = -a * i - c * o;
  const f = u < _n, h = l < _n;
  f && (u = -u), h && (l = -l);
  const p = yd(Math.ceil(P1(n) / 2)) + Si;
  if (u < _n || u >= p || l < _n || l >= p)
    throw new Error("splitScalar (endomorphism): failed, k=" + e);
  return { k1neg: f, k1: u, k2neg: h, k2: l };
}
function tf(e) {
  if (!["compact", "recovered", "der"].includes(e))
    throw new Error('Signature format must be "compact", "recovered", or "der"');
  return e;
}
function Yu(e, t) {
  const n = {};
  for (let r of Object.keys(t))
    n[r] = e[r] === void 0 ? t[r] : e[r];
  return Wa(n.lowS, "lowS"), Wa(n.prehash, "prehash"), n.format !== void 0 && tf(n.format), n;
}
class Y1 extends Error {
  constructor(t = "") {
    super(t);
  }
}
const Jn = {
  // asn.1 DER encoding utils
  Err: Y1,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (e, t) => {
      const { Err: n } = Jn;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length & 1)
        throw new n("tlv.encode: unpadded data");
      const r = t.length / 2, i = Oo(r);
      if (i.length / 2 & 128)
        throw new n("tlv.encode: long form length too big");
      const s = r > 127 ? Oo(i.length / 2 | 128) : "";
      return Oo(e) + s + i + t;
    },
    // v - value, l - left bytes (unparsed)
    decode(e, t) {
      const { Err: n } = Jn;
      let r = 0;
      if (e < 0 || e > 256)
        throw new n("tlv.encode: wrong tag");
      if (t.length < 2 || t[r++] !== e)
        throw new n("tlv.decode: wrong tlv");
      const i = t[r++], s = !!(i & 128);
      let o = 0;
      if (!s)
        o = i;
      else {
        const c = i & 127;
        if (!c)
          throw new n("tlv.decode(long): indefinite length not supported");
        if (c > 4)
          throw new n("tlv.decode(long): byte length is too big");
        const u = t.subarray(r, r + c);
        if (u.length !== c)
          throw new n("tlv.decode: length bytes not complete");
        if (u[0] === 0)
          throw new n("tlv.decode(long): zero leftmost byte");
        for (const l of u)
          o = o << 8 | l;
        if (r += c, o < 128)
          throw new n("tlv.decode(long): not minimal encoding");
      }
      const a = t.subarray(r, r + o);
      if (a.length !== o)
        throw new n("tlv.decode: wrong value length");
      return { v: a, l: t.subarray(r + o) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(e) {
      const { Err: t } = Jn;
      if (e < _n)
        throw new t("integer: negative integers are not allowed");
      let n = Oo(e);
      if (Number.parseInt(n[0], 16) & 8 && (n = "00" + n), n.length & 1)
        throw new t("unexpected DER parsing assertion: unpadded hex");
      return n;
    },
    decode(e) {
      const { Err: t } = Jn;
      if (e[0] & 128)
        throw new t("invalid signature integer: negative");
      if (e[0] === 0 && !(e[1] & 128))
        throw new t("invalid signature integer: unnecessary leading zero");
      return Hn(e);
    }
  },
  toSig(e) {
    const { Err: t, _int: n, _tlv: r } = Jn, i = ut(e, void 0, "signature"), { v: s, l: o } = r.decode(48, i);
    if (o.length)
      throw new t("invalid signature: left bytes after parsing");
    const { v: a, l: c } = r.decode(2, s), { v: u, l } = r.decode(2, c);
    if (l.length)
      throw new t("invalid signature: left bytes after parsing");
    return { r: n.decode(a), s: n.decode(u) };
  },
  hexFromSig(e) {
    const { _tlv: t, _int: n } = Jn, r = t.encode(2, n.encode(e.r)), i = t.encode(2, n.encode(e.s)), s = r + i;
    return t.encode(48, s);
  }
}, _n = BigInt(0), Si = BigInt(1), mb = BigInt(2), Bo = BigInt(3), Z1 = BigInt(4);
function X1(e, t = {}) {
  const n = G1("weierstrass", e, t), { Fp: r, Fn: i } = n;
  let s = n.CURVE;
  const { h: o, n: a } = s;
  wd(t, {}, {
    allowInfinityPoint: "boolean",
    clearCofactor: "function",
    isTorsionFree: "function",
    fromBytes: "function",
    toBytes: "function",
    endo: "object"
  });
  const { endo: c } = t;
  if (c && (!r.is0(s.a) || typeof c.beta != "bigint" || !Array.isArray(c.basises)))
    throw new Error('invalid endo: expected "beta": bigint and "basises": array');
  const u = Eb(r, i);
  function l() {
    if (!r.isOdd)
      throw new Error("compression is not supported: Field does not have .isOdd()");
  }
  function f(M, x, T) {
    const { x: E, y: A } = x.toAffine(), $ = r.toBytes(E);
    if (Wa(T, "isCompressed"), T) {
      l();
      const B = !r.isOdd(A);
      return hn(bb(B), $);
    } else
      return hn(Uint8Array.of(4), $, r.toBytes(A));
  }
  function h(M) {
    ut(M, void 0, "Point");
    const { publicKey: x, publicKeyUncompressed: T } = u, E = M.length, A = M[0], $ = M.subarray(1);
    if (E === x && (A === 2 || A === 3)) {
      const B = r.fromBytes($);
      if (!r.isValid(B))
        throw new Error("bad point: is not on curve, wrong x");
      const O = d(B);
      let I;
      try {
        I = r.sqrt(O);
      } catch (q) {
        const K = q instanceof Error ? ": " + q.message : "";
        throw new Error("bad point: is not on curve, sqrt error" + K);
      }
      l();
      const N = r.isOdd(I);
      return (A & 1) === 1 !== N && (I = r.neg(I)), { x: B, y: I };
    } else if (E === T && A === 4) {
      const B = r.BYTES, O = r.fromBytes($.subarray(0, B)), I = r.fromBytes($.subarray(B, B * 2));
      if (!g(O, I))
        throw new Error("bad point: is not on curve");
      return { x: O, y: I };
    } else
      throw new Error(`bad point: got length ${E}, expected compressed=${x} or uncompressed=${T}`);
  }
  const p = t.toBytes || f, y = t.fromBytes || h;
  function d(M) {
    const x = r.sqr(M), T = r.mul(x, M);
    return r.add(r.add(T, r.mul(M, s.a)), s.b);
  }
  function g(M, x) {
    const T = r.sqr(x), E = d(M);
    return r.eql(T, E);
  }
  if (!g(s.Gx, s.Gy))
    throw new Error("bad curve params: generator point");
  const m = r.mul(r.pow(s.a, Bo), Z1), v = r.mul(r.sqr(s.b), BigInt(27));
  if (r.is0(r.add(m, v)))
    throw new Error("bad curve params: a or b");
  function k(M, x, T = !1) {
    if (!r.isValid(x) || T && r.is0(x))
      throw new Error(`bad point coordinate ${M}`);
    return x;
  }
  function C(M) {
    if (!(M instanceof D))
      throw new Error("Weierstrass Point expected");
  }
  function L(M) {
    if (!c || !c.basises)
      throw new Error("no endo");
    return q1(M, c.basises, i.ORDER);
  }
  const G = Rp((M, x) => {
    const { X: T, Y: E, Z: A } = M;
    if (r.eql(A, r.ONE))
      return { x: T, y: E };
    const $ = M.is0();
    x == null && (x = $ ? r.ONE : r.inv(A));
    const B = r.mul(T, x), O = r.mul(E, x), I = r.mul(A, x);
    if ($)
      return { x: r.ZERO, y: r.ZERO };
    if (!r.eql(I, r.ONE))
      throw new Error("invZ was invalid");
    return { x: B, y: O };
  }), b = Rp((M) => {
    if (M.is0()) {
      if (t.allowInfinityPoint && !r.is0(M.Y))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y: T } = M.toAffine();
    if (!r.isValid(x) || !r.isValid(T))
      throw new Error("bad point: x or y not field elements");
    if (!g(x, T))
      throw new Error("bad point: equation left != right");
    if (!M.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return !0;
  });
  function Y(M, x, T, E, A) {
    return T = new D(r.mul(T.X, M), T.Y, T.Z), x = Ka(E, x), T = Ka(A, T), x.add(T);
  }
  class D {
    // base / generator point
    static BASE = new D(s.Gx, s.Gy, r.ONE);
    // zero / infinity / identity point
    static ZERO = new D(r.ZERO, r.ONE, r.ZERO);
    // 0, 1, 0
    // math field
    static Fp = r;
    // scalar field
    static Fn = i;
    X;
    Y;
    Z;
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    constructor(x, T, E) {
      this.X = k("x", x), this.Y = k("y", T, !0), this.Z = k("z", E), Object.freeze(this);
    }
    static CURVE() {
      return s;
    }
    /** Does NOT validate if the point is valid. Use `.assertValidity()`. */
    static fromAffine(x) {
      const { x: T, y: E } = x || {};
      if (!x || !r.isValid(T) || !r.isValid(E))
        throw new Error("invalid affine point");
      if (x instanceof D)
        throw new Error("projective point not allowed");
      return r.is0(T) && r.is0(E) ? D.ZERO : new D(T, E, r.ONE);
    }
    static fromBytes(x) {
      const T = D.fromAffine(y(ut(x, void 0, "point")));
      return T.assertValidity(), T;
    }
    static fromHex(x) {
      return D.fromBytes(Fa(x));
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
    precompute(x = 8, T = !0) {
      return rt.createCache(this, x), T || this.multiply(Bo), this;
    }
    // TODO: return `this`
    /** A point on curve is valid if it conforms to equation. */
    assertValidity() {
      b(this);
    }
    hasEvenY() {
      const { y: x } = this.toAffine();
      if (!r.isOdd)
        throw new Error("Field doesn't support isOdd");
      return !r.isOdd(x);
    }
    /** Compare one point to another. */
    equals(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x, I = r.eql(r.mul(T, O), r.mul($, A)), N = r.eql(r.mul(E, O), r.mul(B, A));
      return I && N;
    }
    /** Flips point to one corresponding to (x, -y) in Affine coordinates. */
    negate() {
      return new D(this.X, r.neg(this.Y), this.Z);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: x, b: T } = s, E = r.mul(T, Bo), { X: A, Y: $, Z: B } = this;
      let O = r.ZERO, I = r.ZERO, N = r.ZERO, R = r.mul(A, A), q = r.mul($, $), K = r.mul(B, B), V = r.mul(A, $);
      return V = r.add(V, V), N = r.mul(A, B), N = r.add(N, N), O = r.mul(x, N), I = r.mul(E, K), I = r.add(O, I), O = r.sub(q, I), I = r.add(q, I), I = r.mul(O, I), O = r.mul(V, O), N = r.mul(E, N), K = r.mul(x, K), V = r.sub(R, K), V = r.mul(x, V), V = r.add(V, N), N = r.add(R, R), R = r.add(N, R), R = r.add(R, K), R = r.mul(R, V), I = r.add(I, R), K = r.mul($, B), K = r.add(K, K), R = r.mul(K, V), O = r.sub(O, R), N = r.mul(K, q), N = r.add(N, N), N = r.add(N, N), new D(O, I, N);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(x) {
      C(x);
      const { X: T, Y: E, Z: A } = this, { X: $, Y: B, Z: O } = x;
      let I = r.ZERO, N = r.ZERO, R = r.ZERO;
      const q = s.a, K = r.mul(s.b, Bo);
      let V = r.mul(T, $), z = r.mul(E, B), X = r.mul(A, O), st = r.add(T, E), j = r.add($, B);
      st = r.mul(st, j), j = r.add(V, z), st = r.sub(st, j), j = r.add(T, A);
      let Q = r.add($, O);
      return j = r.mul(j, Q), Q = r.add(V, X), j = r.sub(j, Q), Q = r.add(E, A), I = r.add(B, O), Q = r.mul(Q, I), I = r.add(z, X), Q = r.sub(Q, I), R = r.mul(q, j), I = r.mul(K, X), R = r.add(I, R), I = r.sub(z, R), R = r.add(z, R), N = r.mul(I, R), z = r.add(V, V), z = r.add(z, V), X = r.mul(q, X), j = r.mul(K, j), z = r.add(z, X), X = r.sub(V, X), X = r.mul(q, X), j = r.add(j, X), V = r.mul(z, j), N = r.add(N, V), V = r.mul(Q, j), I = r.mul(st, I), I = r.sub(I, V), V = r.mul(st, z), R = r.mul(Q, R), R = r.add(R, V), new D(I, N, R);
    }
    subtract(x) {
      return this.add(x.negate());
    }
    is0() {
      return this.equals(D.ZERO);
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
    multiply(x) {
      const { endo: T } = t;
      if (!i.isValidNot0(x))
        throw new Error("invalid scalar: out of range");
      let E, A;
      const $ = (B) => rt.cached(this, B, (O) => Lp(D, O));
      if (T) {
        const { k1neg: B, k1: O, k2neg: I, k2: N } = L(x), { p: R, f: q } = $(O), { p: K, f: V } = $(N);
        A = q.add(V), E = Y(T.beta, R, K, B, I);
      } else {
        const { p: B, f: O } = $(x);
        E = B, A = O;
      }
      return Lp(D, [E, A])[0];
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed secret key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(x) {
      const { endo: T } = t, E = this;
      if (!i.isValid(x))
        throw new Error("invalid scalar: out of range");
      if (x === _n || E.is0())
        return D.ZERO;
      if (x === Si)
        return E;
      if (rt.hasCache(this))
        return this.multiply(x);
      if (T) {
        const { k1neg: A, k1: $, k2neg: B, k2: O } = L(x), { p1: I, p2: N } = j1(D, E, $, O);
        return Y(T.beta, I, N, A, B);
      } else
        return rt.unsafe(E, x);
    }
    /**
     * Converts Projective point to affine (x, y) coordinates.
     * @param invertedZ Z^-1 (inverted zero) - optional, precomputation is useful for invertBatch
     */
    toAffine(x) {
      return G(this, x);
    }
    /**
     * Checks whether Point is free of torsion elements (is in prime subgroup).
     * Always torsion-free for cofactor=1 curves.
     */
    isTorsionFree() {
      const { isTorsionFree: x } = t;
      return o === Si ? !0 : x ? x(D, this) : rt.unsafe(this, a).is0();
    }
    clearCofactor() {
      const { clearCofactor: x } = t;
      return o === Si ? this : x ? x(D, this) : this.multiplyUnsafe(o);
    }
    isSmallOrder() {
      return this.multiplyUnsafe(o).is0();
    }
    toBytes(x = !0) {
      return Wa(x, "isCompressed"), this.assertValidity(), p(D, this, x);
    }
    toHex(x = !0) {
      return Oc(this.toBytes(x));
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const S = i.BITS, rt = new z1(D, t.endo ? Math.ceil(S / 2) : S);
  return D.BASE.precompute(8), D;
}
function bb(e) {
  return Uint8Array.of(e ? 2 : 3);
}
function Eb(e, t) {
  return {
    secretKey: t.BYTES,
    publicKey: 1 + e.BYTES,
    publicKeyUncompressed: 1 + 2 * e.BYTES,
    publicKeyHasPrefix: !0,
    signature: 2 * t.BYTES
  };
}
function Q1(e, t = {}) {
  const { Fn: n } = e, r = t.randomBytes || Bc, i = Object.assign(Eb(e.Fp, n), { seed: fb(n.ORDER) });
  function s(p) {
    try {
      const y = n.fromBytes(p);
      return n.isValidNot0(y);
    } catch {
      return !1;
    }
  }
  function o(p, y) {
    const { publicKey: d, publicKeyUncompressed: g } = i;
    try {
      const m = p.length;
      return y === !0 && m !== d || y === !1 && m !== g ? !1 : !!e.fromBytes(p);
    } catch {
      return !1;
    }
  }
  function a(p = r(i.seed)) {
    return db(ut(p, i.seed, "seed"), n.ORDER);
  }
  function c(p, y = !0) {
    return e.BASE.multiply(n.fromBytes(p)).toBytes(y);
  }
  function u(p) {
    const { secretKey: y, publicKey: d, publicKeyUncompressed: g } = i;
    if (!hd(p) || "_lengths" in n && n._lengths || y === d)
      return;
    const m = ut(p, void 0, "key").length;
    return m === d || m === g;
  }
  function l(p, y, d = !0) {
    if (u(p) === !0)
      throw new Error("first arg must be private key");
    if (u(y) === !1)
      throw new Error("second arg must be public key");
    const g = n.fromBytes(p);
    return e.fromBytes(y).multiply(g).toBytes(d);
  }
  const f = {
    isValidSecretKey: s,
    isValidPublicKey: o,
    randomSecretKey: a
  }, h = gb(a, c);
  return Object.freeze({ getPublicKey: c, getSharedSecret: l, keygen: h, Point: e, utils: f, lengths: i });
}
function J1(e, t, n = {}) {
  Gm(t), wd(n, {}, {
    hmac: "function",
    lowS: "boolean",
    randomBytes: "function",
    bits2int: "function",
    bits2int_modN: "function"
  }), n = Object.assign({}, n);
  const r = n.randomBytes || Bc, i = n.hmac || ((T, E) => wb(t, T, E)), { Fp: s, Fn: o } = e, { ORDER: a, BITS: c } = o, { keygen: u, getPublicKey: l, getSharedSecret: f, utils: h, lengths: p } = Q1(e, n), y = {
    prehash: !0,
    lowS: typeof n.lowS == "boolean" ? n.lowS : !0,
    format: "compact",
    extraEntropy: !1
  }, d = a * mb < s.ORDER;
  function g(T) {
    const E = a >> Si;
    return T > E;
  }
  function m(T, E) {
    if (!o.isValidNot0(E))
      throw new Error(`invalid signature ${T}: out of range 1..Point.Fn.ORDER`);
    return E;
  }
  function v() {
    if (d)
      throw new Error('"recovered" sig type is not supported for cofactor >2 curves');
  }
  function k(T, E) {
    tf(E);
    const A = p.signature, $ = E === "compact" ? A : E === "recovered" ? A + 1 : void 0;
    return ut(T, $);
  }
  class C {
    r;
    s;
    recovery;
    constructor(E, A, $) {
      if (this.r = m("r", E), this.s = m("s", A), $ != null) {
        if (v(), ![0, 1, 2, 3].includes($))
          throw new Error("invalid recovery id");
        this.recovery = $;
      }
      Object.freeze(this);
    }
    static fromBytes(E, A = y.format) {
      k(E, A);
      let $;
      if (A === "der") {
        const { r: N, s: R } = Jn.toSig(ut(E));
        return new C(N, R);
      }
      A === "recovered" && ($ = E[0], A = "compact", E = E.subarray(1));
      const B = p.signature / 2, O = E.subarray(0, B), I = E.subarray(B, B * 2);
      return new C(o.fromBytes(O), o.fromBytes(I), $);
    }
    static fromHex(E, A) {
      return this.fromBytes(Fa(E), A);
    }
    assertRecovery() {
      const { recovery: E } = this;
      if (E == null)
        throw new Error("invalid recovery id: must be present");
      return E;
    }
    addRecoveryBit(E) {
      return new C(this.r, this.s, E);
    }
    recoverPublicKey(E) {
      const { r: A, s: $ } = this, B = this.assertRecovery(), O = B === 2 || B === 3 ? A + a : A;
      if (!s.isValid(O))
        throw new Error("invalid recovery id: sig.r+curve.n != R.x");
      const I = s.toBytes(O), N = e.fromBytes(hn(bb((B & 1) === 0), I)), R = o.inv(O), q = G(ut(E, void 0, "msgHash")), K = o.create(-q * R), V = o.create($ * R), z = e.BASE.multiplyUnsafe(K).add(N.multiplyUnsafe(V));
      if (z.is0())
        throw new Error("invalid recovery: point at infinify");
      return z.assertValidity(), z;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return g(this.s);
    }
    toBytes(E = y.format) {
      if (tf(E), E === "der")
        return Fa(Jn.hexFromSig(this));
      const { r: A, s: $ } = this, B = o.toBytes(A), O = o.toBytes($);
      return E === "recovered" ? (v(), hn(Uint8Array.of(this.assertRecovery()), B, O)) : hn(B, O);
    }
    toHex(E) {
      return Oc(this.toBytes(E));
    }
  }
  const L = n.bits2int || function(E) {
    if (E.length > 8192)
      throw new Error("input is too large");
    const A = Hn(E), $ = E.length * 8 - c;
    return $ > 0 ? A >> BigInt($) : A;
  }, G = n.bits2int_modN || function(E) {
    return o.create(L(E));
  }, b = yd(c);
  function Y(T) {
    return eb("num < 2^" + c, T, _n, b), o.toBytes(T);
  }
  function D(T, E) {
    return ut(T, void 0, "message"), E ? ut(t(T), void 0, "prehashed message") : T;
  }
  function S(T, E, A) {
    const { lowS: $, prehash: B, extraEntropy: O } = Yu(A, y);
    T = D(T, B);
    const I = G(T), N = o.fromBytes(E);
    if (!o.isValidNot0(N))
      throw new Error("invalid private key");
    const R = [Y(N), Y(I)];
    if (O != null && O !== !1) {
      const z = O === !0 ? r(p.secretKey) : O;
      R.push(ut(z, void 0, "extraEntropy"));
    }
    const q = hn(...R), K = I;
    function V(z) {
      const X = L(z);
      if (!o.isValidNot0(X))
        return;
      const st = o.inv(X), j = e.BASE.multiply(X).toAffine(), Q = o.create(j.x);
      if (Q === _n)
        return;
      const Pt = o.create(st * o.create(K + Q * N));
      if (Pt === _n)
        return;
      let be = (j.x === Q ? 0 : 2) | Number(j.y & Si), Ee = Pt;
      return $ && g(Pt) && (Ee = o.neg(Pt), be ^= 1), new C(Q, Ee, d ? void 0 : be);
    }
    return { seed: q, k2sig: V };
  }
  function rt(T, E, A = {}) {
    const { seed: $, k2sig: B } = S(T, E, A);
    return R1(t.outputLen, o.BYTES, i)($, B).toBytes(A.format);
  }
  function M(T, E, A, $ = {}) {
    const { lowS: B, prehash: O, format: I } = Yu($, y);
    if (A = ut(A, void 0, "publicKey"), E = D(E, O), !hd(T)) {
      const N = T instanceof C ? ", use sig.toBytes()" : "";
      throw new Error("verify expects Uint8Array signature" + N);
    }
    k(T, I);
    try {
      const N = C.fromBytes(T, I), R = e.fromBytes(A);
      if (B && N.hasHighS())
        return !1;
      const { r: q, s: K } = N, V = G(E), z = o.inv(K), X = o.create(V * z), st = o.create(q * z), j = e.BASE.multiplyUnsafe(X).add(R.multiplyUnsafe(st));
      return j.is0() ? !1 : o.create(j.x) === q;
    } catch {
      return !1;
    }
  }
  function x(T, E, A = {}) {
    const { prehash: $ } = Yu(A, y);
    return E = D(E, $), C.fromBytes(T, "recovered").recoverPublicKey(E).toBytes();
  }
  return Object.freeze({
    keygen: u,
    getPublicKey: l,
    getSharedSecret: f,
    utils: h,
    lengths: p,
    Point: e,
    sign: rt,
    verify: M,
    recoverPublicKey: x,
    Signature: C,
    hash: t
  });
}
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const Rc = {
  p: BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"),
  n: BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
  h: BigInt(1),
  a: BigInt(0),
  b: BigInt(7),
  Gx: BigInt("0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"),
  Gy: BigInt("0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8")
}, tA = {
  beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
  basises: [
    [BigInt("0x3086d221a7d46bcde86c90e49284eb15"), -BigInt("0xe4437ed6010e88286f547fa90abfe4c3")],
    [BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"), BigInt("0x3086d221a7d46bcde86c90e49284eb15")]
  ]
}, eA = /* @__PURE__ */ BigInt(0), ef = /* @__PURE__ */ BigInt(2);
function nA(e) {
  const t = Rc.p, n = BigInt(3), r = BigInt(6), i = BigInt(11), s = BigInt(22), o = BigInt(23), a = BigInt(44), c = BigInt(88), u = e * e * e % t, l = u * u * e % t, f = Se(l, n, t) * l % t, h = Se(f, n, t) * l % t, p = Se(h, ef, t) * u % t, y = Se(p, i, t) * p % t, d = Se(y, s, t) * y % t, g = Se(d, a, t) * d % t, m = Se(g, c, t) * g % t, v = Se(m, a, t) * d % t, k = Se(v, n, t) * l % t, C = Se(k, o, t) * y % t, L = Se(C, r, t) * u % t, G = Se(L, ef, t);
  if (!za.eql(za.sqr(G), e))
    throw new Error("Cannot find square root");
  return G;
}
const za = Pc(Rc.p, { sqrt: nA }), ci = /* @__PURE__ */ X1(Rc, {
  Fp: za,
  endo: tA
}), sr = /* @__PURE__ */ J1(ci, jt), Fp = {};
function ja(e, ...t) {
  let n = Fp[e];
  if (n === void 0) {
    const r = jt(B1(e));
    n = hn(r, r), Fp[e] = n;
  }
  return jt(hn(n, ...t));
}
const bd = (e) => e.toBytes(!0).slice(1), Ed = (e) => e % ef === eA;
function nf(e) {
  const { Fn: t, BASE: n } = ci, r = t.fromBytes(e), i = n.multiply(r);
  return { scalar: Ed(i.y) ? r : t.neg(r), bytes: bd(i) };
}
function Tb(e) {
  const t = za;
  if (!t.isValidNot0(e))
    throw new Error("invalid x: Fail if x ≥ p");
  const n = t.create(e * e), r = t.create(n * e + BigInt(7));
  let i = t.sqrt(r);
  Ed(i) || (i = t.neg(i));
  const s = ci.fromAffine({ x: e, y: i });
  return s.assertValidity(), s;
}
const Bs = Hn;
function xb(...e) {
  return ci.Fn.create(Bs(ja("BIP0340/challenge", ...e)));
}
function Wp(e) {
  return nf(e).bytes;
}
function rA(e, t, n = Bc(32)) {
  const { Fn: r } = ci, i = ut(e, void 0, "message"), { bytes: s, scalar: o } = nf(t), a = ut(n, 32, "auxRand"), c = r.toBytes(o ^ Bs(ja("BIP0340/aux", a))), u = ja("BIP0340/nonce", c, s, i), { bytes: l, scalar: f } = nf(u), h = xb(l, s, i), p = new Uint8Array(64);
  if (p.set(l, 0), p.set(r.toBytes(r.create(f + h * o)), 32), !Sb(p, i, s))
    throw new Error("sign: Invalid signature produced");
  return p;
}
function Sb(e, t, n) {
  const { Fp: r, Fn: i, BASE: s } = ci, o = ut(e, 64, "signature"), a = ut(t, void 0, "message"), c = ut(n, 32, "publicKey");
  try {
    const u = Tb(Bs(c)), l = Bs(o.subarray(0, 32));
    if (!r.isValidNot0(l))
      return !1;
    const f = Bs(o.subarray(32, 64));
    if (!i.isValidNot0(f))
      return !1;
    const h = xb(i.toBytes(l), bd(u), a), p = s.multiplyUnsafe(f).add(u.multiplyUnsafe(i.neg(h))), { x: y, y: d } = p.toAffine();
    return !(p.is0() || !Ed(d) || y !== l);
  } catch {
    return !1;
  }
}
const Tn = /* @__PURE__ */ (() => {
  const n = (r = Bc(48)) => db(r, Rc.n);
  return {
    keygen: gb(n, Wp),
    getPublicKey: Wp,
    sign: rA,
    verify: Sb,
    Point: ci,
    utils: {
      randomSecretKey: n,
      taggedHash: ja,
      lift_x: Tb,
      pointToBytes: bd
    },
    lengths: {
      secretKey: 32,
      publicKey: 32,
      publicKeyHasPrefix: !1,
      signature: 64,
      seed: 48
    }
  };
})(), iA = /* @__PURE__ */ Uint8Array.from([
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
]), vb = Uint8Array.from(new Array(16).fill(0).map((e, t) => t)), sA = vb.map((e) => (9 * e + 5) % 16), Ab = /* @__PURE__ */ (() => {
  const n = [[vb], [sA]];
  for (let r = 0; r < 4; r++)
    for (let i of n)
      i.push(i[r].map((s) => iA[s]));
  return n;
})(), kb = Ab[0], Ib = Ab[1], $b = /* @__PURE__ */ [
  [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
  [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
  [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
  [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
  [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5]
].map((e) => Uint8Array.from(e)), oA = /* @__PURE__ */ kb.map((e, t) => e.map((n) => $b[t][n])), aA = /* @__PURE__ */ Ib.map((e, t) => e.map((n) => $b[t][n])), cA = /* @__PURE__ */ Uint32Array.from([
  0,
  1518500249,
  1859775393,
  2400959708,
  2840853838
]), uA = /* @__PURE__ */ Uint32Array.from([
  1352829926,
  1548603684,
  1836072691,
  2053994217,
  0
]);
function Kp(e, t, n, r) {
  return e === 0 ? t ^ n ^ r : e === 1 ? t & n | ~t & r : e === 2 ? (t | ~n) ^ r : e === 3 ? t & r | n & ~r : t ^ (n | ~r);
}
const No = /* @__PURE__ */ new Uint32Array(16);
class lA extends Zm {
  h0 = 1732584193;
  h1 = -271733879;
  h2 = -1732584194;
  h3 = 271733878;
  h4 = -1009589776;
  constructor() {
    super(64, 20, 8, !0);
  }
  get() {
    const { h0: t, h1: n, h2: r, h3: i, h4: s } = this;
    return [t, n, r, i, s];
  }
  set(t, n, r, i, s) {
    this.h0 = t | 0, this.h1 = n | 0, this.h2 = r | 0, this.h3 = i | 0, this.h4 = s | 0;
  }
  process(t, n) {
    for (let p = 0; p < 16; p++, n += 4)
      No[p] = t.getUint32(n, !0);
    let r = this.h0 | 0, i = r, s = this.h1 | 0, o = s, a = this.h2 | 0, c = a, u = this.h3 | 0, l = u, f = this.h4 | 0, h = f;
    for (let p = 0; p < 5; p++) {
      const y = 4 - p, d = cA[p], g = uA[p], m = kb[p], v = Ib[p], k = oA[p], C = aA[p];
      for (let L = 0; L < 16; L++) {
        const G = Co(r + Kp(p, s, a, u) + No[m[L]] + d, k[L]) + f | 0;
        r = f, f = u, u = Co(a, 10) | 0, a = s, s = G;
      }
      for (let L = 0; L < 16; L++) {
        const G = Co(i + Kp(y, o, c, l) + No[v[L]] + g, C[L]) + h | 0;
        i = h, h = l, l = Co(c, 10) | 0, c = o, o = G;
      }
    }
    this.set(this.h1 + a + l | 0, this.h2 + u + h | 0, this.h3 + f + i | 0, this.h4 + r + o | 0, this.h0 + s + c | 0);
  }
  roundClean() {
    Mi(No);
  }
  destroy() {
    this.destroyed = !0, Mi(this.buffer), this.set(0, 0, 0, 0, 0);
  }
}
const fA = /* @__PURE__ */ Ym(() => new lA());
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function Fi(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function Cb(e) {
  if (!Fi(e))
    throw new Error("Uint8Array expected");
}
function Ob(e, t) {
  return Array.isArray(t) ? t.length === 0 ? !0 : e ? t.every((n) => typeof n == "string") : t.every((n) => Number.isSafeInteger(n)) : !1;
}
function Td(e) {
  if (typeof e != "function")
    throw new Error("function expected");
  return !0;
}
function Tr(e, t) {
  if (typeof t != "string")
    throw new Error(`${e}: string expected`);
  return !0;
}
function Ji(e) {
  if (!Number.isSafeInteger(e))
    throw new Error(`invalid integer: ${e}`);
}
function Ga(e) {
  if (!Array.isArray(e))
    throw new Error("array expected");
}
function qa(e, t) {
  if (!Ob(!0, t))
    throw new Error(`${e}: array of strings expected`);
}
function xd(e, t) {
  if (!Ob(!1, t))
    throw new Error(`${e}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function lo(...e) {
  const t = (s) => s, n = (s, o) => (a) => s(o(a)), r = e.map((s) => s.encode).reduceRight(n, t), i = e.map((s) => s.decode).reduce(n, t);
  return { encode: r, decode: i };
}
// @__NO_SIDE_EFFECTS__
function Uc(e) {
  const t = typeof e == "string" ? e.split("") : e, n = t.length;
  qa("alphabet", t);
  const r = new Map(t.map((i, s) => [i, s]));
  return {
    encode: (i) => (Ga(i), i.map((s) => {
      if (!Number.isSafeInteger(s) || s < 0 || s >= n)
        throw new Error(`alphabet.encode: digit index outside alphabet "${s}". Allowed: ${e}`);
      return t[s];
    })),
    decode: (i) => (Ga(i), i.map((s) => {
      Tr("alphabet.decode", s);
      const o = r.get(s);
      if (o === void 0)
        throw new Error(`Unknown letter: "${s}". Allowed: ${e}`);
      return o;
    }))
  };
}
// @__NO_SIDE_EFFECTS__
function _c(e = "") {
  return Tr("join", e), {
    encode: (t) => (qa("join.decode", t), t.join(e)),
    decode: (t) => (Tr("join.decode", t), t.split(e))
  };
}
// @__NO_SIDE_EFFECTS__
function dA(e, t = "=") {
  return Ji(e), Tr("padding", t), {
    encode(n) {
      for (qa("padding.encode", n); n.length * e % 8; )
        n.push(t);
      return n;
    },
    decode(n) {
      qa("padding.decode", n);
      let r = n.length;
      if (r * e % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; r > 0 && n[r - 1] === t; r--)
        if ((r - 1) * e % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      return n.slice(0, r);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function hA(e) {
  return Td(e), { encode: (t) => t, decode: (t) => e(t) };
}
function zp(e, t, n) {
  if (t < 2)
    throw new Error(`convertRadix: invalid from=${t}, base cannot be less than 2`);
  if (n < 2)
    throw new Error(`convertRadix: invalid to=${n}, base cannot be less than 2`);
  if (Ga(e), !e.length)
    return [];
  let r = 0;
  const i = [], s = Array.from(e, (a) => {
    if (Ji(a), a < 0 || a >= t)
      throw new Error(`invalid integer: ${a}`);
    return a;
  }), o = s.length;
  for (; ; ) {
    let a = 0, c = !0;
    for (let u = r; u < o; u++) {
      const l = s[u], f = t * a, h = f + l;
      if (!Number.isSafeInteger(h) || f / t !== a || h - l !== f)
        throw new Error("convertRadix: carry overflow");
      const p = h / n;
      a = h % n;
      const y = Math.floor(p);
      if (s[u] = y, !Number.isSafeInteger(y) || y * n + a !== h)
        throw new Error("convertRadix: carry overflow");
      if (c)
        y ? c = !1 : r = u;
      else continue;
    }
    if (i.push(a), c)
      break;
  }
  for (let a = 0; a < e.length - 1 && e[a] === 0; a++)
    i.push(0);
  return i.reverse();
}
const Bb = (e, t) => t === 0 ? e : Bb(t, e % t), Ya = /* @__NO_SIDE_EFFECTS__ */ (e, t) => e + (t - Bb(e, t)), Jo = /* @__PURE__ */ (() => {
  let e = [];
  for (let t = 0; t < 40; t++)
    e.push(2 ** t);
  return e;
})();
function rf(e, t, n, r) {
  if (Ga(e), t <= 0 || t > 32)
    throw new Error(`convertRadix2: wrong from=${t}`);
  if (n <= 0 || n > 32)
    throw new Error(`convertRadix2: wrong to=${n}`);
  if (/* @__PURE__ */ Ya(t, n) > 32)
    throw new Error(`convertRadix2: carry overflow from=${t} to=${n} carryBits=${/* @__PURE__ */ Ya(t, n)}`);
  let i = 0, s = 0;
  const o = Jo[t], a = Jo[n] - 1, c = [];
  for (const u of e) {
    if (Ji(u), u >= o)
      throw new Error(`convertRadix2: invalid data word=${u} from=${t}`);
    if (i = i << t | u, s + t > 32)
      throw new Error(`convertRadix2: carry overflow pos=${s} from=${t}`);
    for (s += t; s >= n; s -= n)
      c.push((i >> s - n & a) >>> 0);
    const l = Jo[s];
    if (l === void 0)
      throw new Error("invalid carry");
    i &= l - 1;
  }
  if (i = i << n - s & a, !r && s >= t)
    throw new Error("Excess padding");
  if (!r && i > 0)
    throw new Error(`Non-zero padding: ${i}`);
  return r && s > 0 && c.push(i >>> 0), c;
}
// @__NO_SIDE_EFFECTS__
function pA(e) {
  Ji(e);
  const t = 2 ** 8;
  return {
    encode: (n) => {
      if (!Fi(n))
        throw new Error("radix.encode input should be Uint8Array");
      return zp(Array.from(n), t, e);
    },
    decode: (n) => (xd("radix.decode", n), Uint8Array.from(zp(n, e, t)))
  };
}
// @__NO_SIDE_EFFECTS__
function Sd(e, t = !1) {
  if (Ji(e), e <= 0 || e > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ Ya(8, e) > 32 || /* @__PURE__ */ Ya(e, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (n) => {
      if (!Fi(n))
        throw new Error("radix2.encode input should be Uint8Array");
      return rf(Array.from(n), 8, e, !t);
    },
    decode: (n) => (xd("radix2.decode", n), Uint8Array.from(rf(n, e, 8, t)))
  };
}
function jp(e) {
  return Td(e), function(...t) {
    try {
      return e.apply(null, t);
    } catch {
    }
  };
}
function gA(e, t) {
  return Ji(e), Td(t), {
    encode(n) {
      if (!Fi(n))
        throw new Error("checksum.encode: input should be Uint8Array");
      const r = t(n).slice(0, e), i = new Uint8Array(n.length + e);
      return i.set(n), i.set(r, n.length), i;
    },
    decode(n) {
      if (!Fi(n))
        throw new Error("checksum.decode: input should be Uint8Array");
      const r = n.slice(0, -e), i = n.slice(-e), s = t(r).slice(0, e);
      for (let o = 0; o < e; o++)
        if (s[o] !== i[o])
          throw new Error("Invalid checksum");
      return r;
    }
  };
}
const yA = typeof Uint8Array.from([]).toBase64 == "function" && typeof Uint8Array.fromBase64 == "function", wA = (e, t) => {
  Tr("base64", e);
  const n = /^[A-Za-z0-9=+/]+$/, r = "base64";
  if (e.length > 0 && !n.test(e))
    throw new Error("invalid base64");
  return Uint8Array.fromBase64(e, { alphabet: r, lastChunkHandling: "strict" });
}, Kt = yA ? {
  encode(e) {
    return Cb(e), e.toBase64();
  },
  decode(e) {
    return wA(e);
  }
} : /* @__PURE__ */ lo(/* @__PURE__ */ Sd(6), /* @__PURE__ */ Uc("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ dA(6), /* @__PURE__ */ _c("")), mA = /* @__NO_SIDE_EFFECTS__ */ (e) => /* @__PURE__ */ lo(/* @__PURE__ */ pA(58), /* @__PURE__ */ Uc(e), /* @__PURE__ */ _c("")), sf = /* @__PURE__ */ mA("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"), bA = (e) => /* @__PURE__ */ lo(gA(4, (t) => e(e(t))), sf), of = /* @__PURE__ */ lo(/* @__PURE__ */ Uc("qpzry9x8gf2tvdw0s3jn54khce6mua7l"), /* @__PURE__ */ _c("")), Gp = [996825010, 642813549, 513874426, 1027748829, 705979059];
function us(e) {
  const t = e >> 25;
  let n = (e & 33554431) << 5;
  for (let r = 0; r < Gp.length; r++)
    (t >> r & 1) === 1 && (n ^= Gp[r]);
  return n;
}
function qp(e, t, n = 1) {
  const r = e.length;
  let i = 1;
  for (let s = 0; s < r; s++) {
    const o = e.charCodeAt(s);
    if (o < 33 || o > 126)
      throw new Error(`Invalid prefix (${e})`);
    i = us(i) ^ o >> 5;
  }
  i = us(i);
  for (let s = 0; s < r; s++)
    i = us(i) ^ e.charCodeAt(s) & 31;
  for (let s of t)
    i = us(i) ^ s;
  for (let s = 0; s < 6; s++)
    i = us(i);
  return i ^= n, of.encode(rf([i % Jo[30]], 30, 5, !1));
}
// @__NO_SIDE_EFFECTS__
function Nb(e) {
  const t = e === "bech32" ? 1 : 734539939, n = /* @__PURE__ */ Sd(5), r = n.decode, i = n.encode, s = jp(r);
  function o(f, h, p = 90) {
    Tr("bech32.encode prefix", f), Fi(h) && (h = Array.from(h)), xd("bech32.encode", h);
    const y = f.length;
    if (y === 0)
      throw new TypeError(`Invalid prefix length ${y}`);
    const d = y + 7 + h.length;
    if (p !== !1 && d > p)
      throw new TypeError(`Length ${d} exceeds limit ${p}`);
    const g = f.toLowerCase(), m = qp(g, h, t);
    return `${g}1${of.encode(h)}${m}`;
  }
  function a(f, h = 90) {
    Tr("bech32.decode input", f);
    const p = f.length;
    if (p < 8 || h !== !1 && p > h)
      throw new TypeError(`invalid string length: ${p} (${f}). Expected (8..${h})`);
    const y = f.toLowerCase();
    if (f !== y && f !== f.toUpperCase())
      throw new Error("String must be lowercase or uppercase");
    const d = y.lastIndexOf("1");
    if (d === 0 || d === -1)
      throw new Error('Letter "1" must be present between prefix and data only');
    const g = y.slice(0, d), m = y.slice(d + 1);
    if (m.length < 6)
      throw new Error("Data must be at least 6 characters long");
    const v = of.decode(m).slice(0, -6), k = qp(g, v, t);
    if (!m.endsWith(k))
      throw new Error(`Invalid checksum in ${f}: expected "${k}"`);
    return { prefix: g, words: v };
  }
  const c = jp(a);
  function u(f) {
    const { prefix: h, words: p } = a(f, !1);
    return { prefix: h, words: p, bytes: r(p) };
  }
  function l(f, h) {
    return o(f, i(h));
  }
  return {
    encode: o,
    decode: a,
    encodeFromBytes: l,
    decodeToBytes: u,
    decodeUnsafe: c,
    fromWords: r,
    fromWordsUnsafe: s,
    toWords: i
  };
}
const af = /* @__PURE__ */ Nb("bech32"), hi = /* @__PURE__ */ Nb("bech32m"), EA = {
  encode: (e) => new TextDecoder().decode(e),
  decode: (e) => new TextEncoder().encode(e)
}, TA = typeof Uint8Array.from([]).toHex == "function" && typeof Uint8Array.fromHex == "function", xA = {
  encode(e) {
    return Cb(e), e.toHex();
  },
  decode(e) {
    return Tr("hex", e), Uint8Array.fromHex(e);
  }
}, _ = TA ? xA : /* @__PURE__ */ lo(/* @__PURE__ */ Sd(4), /* @__PURE__ */ Uc("0123456789abcdef"), /* @__PURE__ */ _c(""), /* @__PURE__ */ hA((e) => {
  if (typeof e != "string" || e.length % 2 !== 0)
    throw new TypeError(`hex.decode: expected string, got ${typeof e} with length ${e.length}`);
  return e.toLowerCase();
})), St = /* @__PURE__ */ Uint8Array.of(), Pb = /* @__PURE__ */ Uint8Array.of(0);
function Wi(e, t) {
  if (e.length !== t.length)
    return !1;
  for (let n = 0; n < e.length; n++)
    if (e[n] !== t[n])
      return !1;
  return !0;
}
function Ie(e) {
  return e instanceof Uint8Array || ArrayBuffer.isView(e) && e.constructor.name === "Uint8Array";
}
function SA(...e) {
  let t = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r];
    if (!Ie(i))
      throw new Error("Uint8Array expected");
    t += i.length;
  }
  const n = new Uint8Array(t);
  for (let r = 0, i = 0; r < e.length; r++) {
    const s = e[r];
    n.set(s, i), i += s.length;
  }
  return n;
}
const Rb = (e) => new DataView(e.buffer, e.byteOffset, e.byteLength);
function fo(e) {
  return Object.prototype.toString.call(e) === "[object Object]";
}
function En(e) {
  return Number.isSafeInteger(e);
}
const vd = {
  equalBytes: Wi,
  isBytes: Ie,
  concatBytes: SA
}, Ub = (e) => {
  if (e !== null && typeof e != "string" && !Ge(e) && !Ie(e) && !En(e))
    throw new Error(`lengthCoder: expected null | number | Uint8Array | CoderType, got ${e} (${typeof e})`);
  return {
    encodeStream(t, n) {
      if (e === null)
        return;
      if (Ge(e))
        return e.encodeStream(t, n);
      let r;
      if (typeof e == "number" ? r = e : typeof e == "string" && (r = Dn.resolve(t.stack, e)), typeof r == "bigint" && (r = Number(r)), r === void 0 || r !== n)
        throw t.err(`Wrong length: ${r} len=${e} exp=${n} (${typeof n})`);
    },
    decodeStream(t) {
      let n;
      if (Ge(e) ? n = Number(e.decodeStream(t)) : typeof e == "number" ? n = e : typeof e == "string" && (n = Dn.resolve(t.stack, e)), typeof n == "bigint" && (n = Number(n)), typeof n != "number")
        throw t.err(`Wrong length: ${n}`);
      return n;
    }
  };
}, Lt = {
  BITS: 32,
  FULL_MASK: -1 >>> 0,
  // 1<<32 will overflow
  len: (e) => Math.ceil(e / 32),
  create: (e) => new Uint32Array(Lt.len(e)),
  clean: (e) => e.fill(0),
  debug: (e) => Array.from(e).map((t) => (t >>> 0).toString(2).padStart(32, "0")),
  checkLen: (e, t) => {
    if (Lt.len(t) !== e.length)
      throw new Error(`wrong length=${e.length}. Expected: ${Lt.len(t)}`);
  },
  chunkLen: (e, t, n) => {
    if (t < 0)
      throw new Error(`wrong pos=${t}`);
    if (t + n > e)
      throw new Error(`wrong range=${t}/${n} of ${e}`);
  },
  set: (e, t, n, r = !0) => !r && (e[t] & n) !== 0 ? !1 : (e[t] |= n, !0),
  pos: (e, t) => ({
    chunk: Math.floor((e + t) / 32),
    mask: 1 << 32 - (e + t) % 32 - 1
  }),
  indices: (e, t, n = !1) => {
    Lt.checkLen(e, t);
    const { FULL_MASK: r, BITS: i } = Lt, s = i - t % i, o = s ? r >>> s << s : r, a = [];
    for (let c = 0; c < e.length; c++) {
      let u = e[c];
      if (n && (u = ~u), c === e.length - 1 && (u &= o), u !== 0)
        for (let l = 0; l < i; l++) {
          const f = 1 << i - l - 1;
          u & f && a.push(c * i + l);
        }
    }
    return a;
  },
  range: (e) => {
    const t = [];
    let n;
    for (const r of e)
      n === void 0 || r !== n.pos + n.length ? t.push(n = { pos: r, length: 1 }) : n.length += 1;
    return t;
  },
  rangeDebug: (e, t, n = !1) => `[${Lt.range(Lt.indices(e, t, n)).map((r) => `(${r.pos}/${r.length})`).join(", ")}]`,
  setRange: (e, t, n, r, i = !0) => {
    Lt.chunkLen(t, n, r);
    const { FULL_MASK: s, BITS: o } = Lt, a = n % o ? Math.floor(n / o) : void 0, c = n + r, u = c % o ? Math.floor(c / o) : void 0;
    if (a !== void 0 && a === u)
      return Lt.set(e, a, s >>> o - r << o - r - n, i);
    if (a !== void 0 && !Lt.set(e, a, s >>> n % o, i))
      return !1;
    const l = a !== void 0 ? a + 1 : n / o, f = u !== void 0 ? u : c / o;
    for (let h = l; h < f; h++)
      if (!Lt.set(e, h, s, i))
        return !1;
    return !(u !== void 0 && a !== u && !Lt.set(e, u, s << o - c % o, i));
  }
}, Dn = {
  /**
   * Internal method for handling stack of paths (debug, errors, dynamic fields via path)
   * This is looks ugly (callback), but allows us to force stack cleaning by construction (.pop always after function).
   * Also, this makes impossible:
   * - pushing field when stack is empty
   * - pushing field inside of field (real bug)
   * NOTE: we don't want to do '.pop' on error!
   */
  pushObj: (e, t, n) => {
    const r = { obj: t };
    e.push(r), n((i, s) => {
      r.field = i, s(), r.field = void 0;
    }), e.pop();
  },
  path: (e) => {
    const t = [];
    for (const n of e)
      n.field !== void 0 && t.push(n.field);
    return t.join("/");
  },
  err: (e, t, n) => {
    const r = new Error(`${e}(${Dn.path(t)}): ${typeof n == "string" ? n : n.message}`);
    return n instanceof Error && n.stack && (r.stack = n.stack), r;
  },
  resolve: (e, t) => {
    const n = t.split("/"), r = e.map((o) => o.obj);
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
class Ad {
  pos = 0;
  data;
  opts;
  stack;
  parent;
  parentOffset;
  bitBuf = 0;
  bitPos = 0;
  bs;
  // bitset
  view;
  constructor(t, n = {}, r = [], i = void 0, s = 0) {
    this.data = t, this.opts = n, this.stack = r, this.parent = i, this.parentOffset = s, this.view = Rb(t);
  }
  /** Internal method for pointers. */
  _enablePointers() {
    if (this.parent)
      return this.parent._enablePointers();
    this.bs || (this.bs = Lt.create(this.data.length), Lt.setRange(this.bs, this.data.length, 0, this.pos, this.opts.allowMultipleReads));
  }
  markBytesBS(t, n) {
    return this.parent ? this.parent.markBytesBS(this.parentOffset + t, n) : !n || !this.bs ? !0 : Lt.setRange(this.bs, this.data.length, t, n, !1);
  }
  markBytes(t) {
    const n = this.pos;
    this.pos += t;
    const r = this.markBytesBS(n, t);
    if (!this.opts.allowMultipleReads && !r)
      throw this.err(`multiple read pos=${this.pos} len=${t}`);
    return r;
  }
  pushObj(t, n) {
    return Dn.pushObj(this.stack, t, n);
  }
  readView(t, n) {
    if (!Number.isFinite(t))
      throw this.err(`readView: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readView: Unexpected end of buffer");
    const r = n(this.view, this.pos);
    return this.markBytes(t), r;
  }
  // read bytes by absolute offset
  absBytes(t) {
    if (t > this.data.length)
      throw new Error("Unexpected end of buffer");
    return this.data.subarray(t);
  }
  finish() {
    if (!this.opts.allowUnreadBytes) {
      if (this.bitPos)
        throw this.err(`${this.bitPos} bits left after unpack: ${_.encode(this.data.slice(this.pos))}`);
      if (this.bs && !this.parent) {
        const t = Lt.indices(this.bs, this.data.length, !0);
        if (t.length) {
          const n = Lt.range(t).map(({ pos: r, length: i }) => `(${r}/${i})[${_.encode(this.data.subarray(r, r + i))}]`).join(", ");
          throw this.err(`unread byte ranges: ${n} (total=${this.data.length})`);
        } else
          return;
      }
      if (!this.isEnd())
        throw this.err(`${this.leftBytes} bytes ${this.bitPos} bits left after unpack: ${_.encode(this.data.slice(this.pos))}`);
    }
  }
  // User methods
  err(t) {
    return Dn.err("Reader", this.stack, t);
  }
  offsetReader(t) {
    if (t > this.data.length)
      throw this.err("offsetReader: Unexpected end of buffer");
    return new Ad(this.absBytes(t), this.opts, this.stack, this, t);
  }
  bytes(t, n = !1) {
    if (this.bitPos)
      throw this.err("readBytes: bitPos not empty");
    if (!Number.isFinite(t))
      throw this.err(`readBytes: wrong length=${t}`);
    if (this.pos + t > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const r = this.data.subarray(this.pos, this.pos + t);
    return n || this.markBytes(t), r;
  }
  byte(t = !1) {
    if (this.bitPos)
      throw this.err("readByte: bitPos not empty");
    if (this.pos + 1 > this.data.length)
      throw this.err("readBytes: Unexpected end of buffer");
    const n = this.data[this.pos];
    return t || this.markBytes(1), n;
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
  bits(t) {
    if (t > 32)
      throw this.err("BitReader: cannot read more than 32 bits in single call");
    let n = 0;
    for (; t; ) {
      this.bitPos || (this.bitBuf = this.byte(), this.bitPos = 8);
      const r = Math.min(t, this.bitPos);
      this.bitPos -= r, n = n << r | this.bitBuf >> this.bitPos & 2 ** r - 1, this.bitBuf &= 2 ** this.bitPos - 1, t -= r;
    }
    return n >>> 0;
  }
  find(t, n = this.pos) {
    if (!Ie(t))
      throw this.err(`find: needle is not bytes! ${t}`);
    if (this.bitPos)
      throw this.err("findByte: bitPos not empty");
    if (!t.length)
      throw this.err("find: needle is empty");
    for (let r = n; (r = this.data.indexOf(t[0], r)) !== -1; r++) {
      if (r === -1 || this.data.length - r < t.length)
        return;
      if (Wi(t, this.data.subarray(r, r + t.length)))
        return r;
    }
  }
}
class vA {
  pos = 0;
  stack;
  // We could have a single buffer here and re-alloc it with
  // x1.5-2 size each time it full, but it will be slower:
  // basic/encode bench: 395ns -> 560ns
  buffers = [];
  ptrs = [];
  bitBuf = 0;
  bitPos = 0;
  viewBuf = new Uint8Array(8);
  view;
  finished = !1;
  constructor(t = []) {
    this.stack = t, this.view = Rb(this.viewBuf);
  }
  pushObj(t, n) {
    return Dn.pushObj(this.stack, t, n);
  }
  writeView(t, n) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (!En(t) || t > 8)
      throw new Error(`wrong writeView length=${t}`);
    n(this.view), this.bytes(this.viewBuf.slice(0, t)), this.viewBuf.fill(0);
  }
  // User methods
  err(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    return Dn.err("Reader", this.stack, t);
  }
  bytes(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeBytes: ends with non-empty bit buffer");
    this.buffers.push(t), this.pos += t.length;
  }
  byte(t) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("writeByte: ends with non-empty bit buffer");
    this.buffers.push(new Uint8Array([t])), this.pos++;
  }
  finish(t = !0) {
    if (this.finished)
      throw this.err("buffer: finished");
    if (this.bitPos)
      throw this.err("buffer: ends with non-empty bit buffer");
    const n = this.buffers.concat(this.ptrs.map((s) => s.buffer)), r = n.map((s) => s.length).reduce((s, o) => s + o, 0), i = new Uint8Array(r);
    for (let s = 0, o = 0; s < n.length; s++) {
      const a = n[s];
      i.set(a, o), o += a.length;
    }
    for (let s = this.pos, o = 0; o < this.ptrs.length; o++) {
      const a = this.ptrs[o];
      i.set(a.ptr.encode(s), a.pos), s += a.buffer.length;
    }
    if (t) {
      this.buffers = [];
      for (const s of this.ptrs)
        s.buffer.fill(0);
      this.ptrs = [], this.finished = !0, this.bitBuf = 0;
    }
    return i;
  }
  bits(t, n) {
    if (n > 32)
      throw this.err("writeBits: cannot write more than 32 bits in single call");
    if (t >= 2 ** n)
      throw this.err(`writeBits: value (${t}) >= 2**bits (${n})`);
    for (; n; ) {
      const r = Math.min(n, 8 - this.bitPos);
      this.bitBuf = this.bitBuf << r | t >> n - r, this.bitPos += r, n -= r, t &= 2 ** n - 1, this.bitPos === 8 && (this.bitPos = 0, this.buffers.push(new Uint8Array([this.bitBuf])), this.pos++);
    }
  }
}
const cf = (e) => Uint8Array.from(e).reverse();
function AA(e, t, n) {
  if (n) {
    const r = 2n ** (t - 1n);
    if (e < -r || e >= r)
      throw new Error(`value out of signed bounds. Expected ${-r} <= ${e} < ${r}`);
  } else if (0n > e || e >= 2n ** t)
    throw new Error(`value out of unsigned bounds. Expected 0 <= ${e} < ${2n ** t}`);
}
function _b(e) {
  return {
    // NOTE: we cannot export validate here, since it is likely mistake.
    encodeStream: e.encodeStream,
    decodeStream: e.decodeStream,
    size: e.size,
    encode: (t) => {
      const n = new vA();
      return e.encodeStream(n, t), n.finish();
    },
    decode: (t, n = {}) => {
      const r = new Ad(t, n), i = e.decodeStream(r);
      return r.finish(), i;
    }
  };
}
function oe(e, t) {
  if (!Ge(e))
    throw new Error(`validate: invalid inner value ${e}`);
  if (typeof t != "function")
    throw new Error("validate: fn should be function");
  return _b({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t(r);
      } catch (s) {
        throw n.err(s);
      }
      e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t(r);
      } catch (i) {
        throw n.err(i);
      }
    }
  });
}
const ae = (e) => {
  const t = _b(e);
  return e.validate ? oe(t, e.validate) : t;
}, Lc = (e) => fo(e) && typeof e.decode == "function" && typeof e.encode == "function";
function Ge(e) {
  return fo(e) && Lc(e) && typeof e.encodeStream == "function" && typeof e.decodeStream == "function" && (e.size === void 0 || En(e.size));
}
function kA() {
  return {
    encode: (e) => {
      if (!Array.isArray(e))
        throw new Error("array expected");
      const t = {};
      for (const n of e) {
        if (!Array.isArray(n) || n.length !== 2)
          throw new Error("array of two elements expected");
        const r = n[0], i = n[1];
        if (t[r] !== void 0)
          throw new Error(`key(${r}) appears twice in struct`);
        t[r] = i;
      }
      return t;
    },
    decode: (e) => {
      if (!fo(e))
        throw new Error(`expected plain object, got ${e}`);
      return Object.entries(e);
    }
  };
}
const IA = {
  encode: (e) => {
    if (typeof e != "bigint")
      throw new Error(`expected bigint, got ${typeof e}`);
    if (e > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error(`element bigger than MAX_SAFE_INTEGER=${e}`);
    return Number(e);
  },
  decode: (e) => {
    if (!En(e))
      throw new Error("element is not a safe integer");
    return BigInt(e);
  }
};
function $A(e) {
  if (!fo(e))
    throw new Error("plain object expected");
  return {
    encode: (t) => {
      if (!En(t) || !(t in e))
        throw new Error(`wrong value ${t}`);
      return e[t];
    },
    decode: (t) => {
      if (typeof t != "string")
        throw new Error(`wrong value ${typeof t}`);
      return e[t];
    }
  };
}
function CA(e, t = !1) {
  if (!En(e))
    throw new Error(`decimal/precision: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`decimal/round: expected boolean, got ${typeof t}`);
  const n = 10n ** BigInt(e);
  return {
    encode: (r) => {
      if (typeof r != "bigint")
        throw new Error(`expected bigint, got ${typeof r}`);
      let i = (r < 0n ? -r : r).toString(10), s = i.length - e;
      s < 0 && (i = i.padStart(i.length - s, "0"), s = 0);
      let o = i.length - 1;
      for (; o >= s && i[o] === "0"; o--)
        ;
      let a = i.slice(0, s), c = i.slice(s, o + 1);
      return a || (a = "0"), r < 0n && (a = "-" + a), c ? `${a}.${c}` : a;
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
      const o = r.slice(0, s), a = r.slice(s + 1).replace(/0+$/, ""), c = BigInt(o) * n;
      if (!t && a.length > e)
        throw new Error(`fractional part cannot be represented with this precision (num=${r}, prec=${e})`);
      const u = Math.min(a.length, e), l = BigInt(a.slice(0, u)) * 10n ** BigInt(e - u), f = c + l;
      return i ? -f : f;
    }
  };
}
function OA(e) {
  if (!Array.isArray(e))
    throw new Error(`expected array, got ${typeof e}`);
  for (const t of e)
    if (!Lc(t))
      throw new Error(`wrong base coder ${t}`);
  return {
    encode: (t) => {
      for (const n of e) {
        const r = n.encode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/encode: cannot find match in ${t}`);
    },
    decode: (t) => {
      for (const n of e) {
        const r = n.decode(t);
        if (r !== void 0)
          return r;
      }
      throw new Error(`match/decode: cannot find match in ${t}`);
    }
  };
}
const Lb = (e) => {
  if (!Lc(e))
    throw new Error("BaseCoder expected");
  return { encode: e.decode, decode: e.encode };
}, Dc = { dict: kA, numberBigint: IA, tsEnum: $A, decimal: CA, match: OA, reverse: Lb }, kd = (e, t = !1, n = !1, r = !0) => {
  if (!En(e))
    throw new Error(`bigint/size: wrong value ${e}`);
  if (typeof t != "boolean")
    throw new Error(`bigint/le: expected boolean, got ${typeof t}`);
  if (typeof n != "boolean")
    throw new Error(`bigint/signed: expected boolean, got ${typeof n}`);
  if (typeof r != "boolean")
    throw new Error(`bigint/sized: expected boolean, got ${typeof r}`);
  const i = BigInt(e), s = 2n ** (8n * i - 1n);
  return ae({
    size: r ? e : void 0,
    encodeStream: (o, a) => {
      n && a < 0 && (a = a | s);
      const c = [];
      for (let l = 0; l < e; l++)
        c.push(Number(a & 255n)), a >>= 8n;
      let u = new Uint8Array(c).reverse();
      if (!r) {
        let l = 0;
        for (l = 0; l < u.length && u[l] === 0; l++)
          ;
        u = u.subarray(l);
      }
      o.bytes(t ? u.reverse() : u);
    },
    decodeStream: (o) => {
      const a = o.bytes(r ? e : Math.min(e, o.leftBytes)), c = t ? a : cf(a);
      let u = 0n;
      for (let l = 0; l < c.length; l++)
        u |= BigInt(c[l]) << 8n * BigInt(l);
      return n && u & s && (u = (u ^ s) - s), u;
    },
    validate: (o) => {
      if (typeof o != "bigint")
        throw new Error(`bigint: invalid value: ${o}`);
      return AA(o, 8n * i, !!n), o;
    }
  });
}, Db = /* @__PURE__ */ kd(32, !1), ta = /* @__PURE__ */ kd(8, !0), BA = /* @__PURE__ */ kd(8, !0, !0), NA = (e, t) => ae({
  size: e,
  encodeStream: (n, r) => n.writeView(e, (i) => t.write(i, r)),
  decodeStream: (n) => n.readView(e, t.read),
  validate: (n) => {
    if (typeof n != "number")
      throw new Error(`viewCoder: expected number, got ${typeof n}`);
    return t.validate && t.validate(n), n;
  }
}), ho = (e, t, n) => {
  const r = e * 8, i = 2 ** (r - 1), s = (c) => {
    if (!En(c))
      throw new Error(`sintView: value is not safe integer: ${c}`);
    if (c < -i || c >= i)
      throw new Error(`sintView: value out of bounds. Expected ${-i} <= ${c} < ${i}`);
  }, o = 2 ** r, a = (c) => {
    if (!En(c))
      throw new Error(`uintView: value is not safe integer: ${c}`);
    if (0 > c || c >= o)
      throw new Error(`uintView: value out of bounds. Expected 0 <= ${c} < ${o}`);
  };
  return NA(e, {
    write: n.write,
    read: n.read,
    validate: t ? s : a
  });
}, ft = /* @__PURE__ */ ho(4, !1, {
  read: (e, t) => e.getUint32(t, !0),
  write: (e, t) => e.setUint32(0, t, !0)
}), PA = /* @__PURE__ */ ho(4, !1, {
  read: (e, t) => e.getUint32(t, !1),
  write: (e, t) => e.setUint32(0, t, !1)
}), pi = /* @__PURE__ */ ho(4, !0, {
  read: (e, t) => e.getInt32(t, !0),
  write: (e, t) => e.setInt32(0, t, !0)
}), Yp = /* @__PURE__ */ ho(2, !1, {
  read: (e, t) => e.getUint16(t, !0),
  write: (e, t) => e.setUint16(0, t, !0)
}), lr = /* @__PURE__ */ ho(1, !1, {
  read: (e, t) => e.getUint8(t),
  write: (e, t) => e.setUint8(0, t)
}), Tt = (e, t = !1) => {
  if (typeof t != "boolean")
    throw new Error(`bytes/le: expected boolean, got ${typeof t}`);
  const n = Ub(e), r = Ie(e);
  return ae({
    size: typeof e == "number" ? e : void 0,
    encodeStream: (i, s) => {
      r || n.encodeStream(i, s.length), i.bytes(t ? cf(s) : s), r && i.bytes(e);
    },
    decodeStream: (i) => {
      let s;
      if (r) {
        const o = i.find(e);
        if (!o)
          throw i.err("bytes: cannot find terminator");
        s = i.bytes(o - i.pos), i.bytes(e.length);
      } else
        s = i.bytes(e === null ? i.leftBytes : n.decodeStream(i));
      return t ? cf(s) : s;
    },
    validate: (i) => {
      if (!Ie(i))
        throw new Error(`bytes: invalid value ${i}`);
      return i;
    }
  });
};
function RA(e, t) {
  if (!Ge(t))
    throw new Error(`prefix: invalid inner value ${t}`);
  return xr(Tt(e), Lb(t));
}
const Id = (e, t = !1) => oe(xr(Tt(e, t), EA), (n) => {
  if (typeof n != "string")
    throw new Error(`expected string, got ${typeof n}`);
  return n;
}), UA = (e, t = { isLE: !1, with0x: !1 }) => {
  let n = xr(Tt(e, t.isLE), _);
  const r = t.with0x;
  if (typeof r != "boolean")
    throw new Error(`hex/with0x: expected boolean, got ${typeof r}`);
  return r && (n = xr(n, {
    encode: (i) => `0x${i}`,
    decode: (i) => {
      if (!i.startsWith("0x"))
        throw new Error("hex(with0x=true).encode input should start with 0x");
      return i.slice(2);
    }
  })), n;
};
function xr(e, t) {
  if (!Ge(e))
    throw new Error(`apply: invalid inner value ${e}`);
  if (!Lc(t))
    throw new Error(`apply: invalid base value ${e}`);
  return ae({
    size: e.size,
    encodeStream: (n, r) => {
      let i;
      try {
        i = t.decode(r);
      } catch (s) {
        throw n.err("" + s);
      }
      return e.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = e.decodeStream(n);
      try {
        return t.encode(r);
      } catch (i) {
        throw n.err("" + i);
      }
    }
  });
}
const _A = (e, t = !1) => {
  if (!Ie(e))
    throw new Error(`flag/flagValue: expected Uint8Array, got ${typeof e}`);
  if (typeof t != "boolean")
    throw new Error(`flag/xor: expected boolean, got ${typeof t}`);
  return ae({
    size: e.length,
    encodeStream: (n, r) => {
      !!r !== t && n.bytes(e);
    },
    decodeStream: (n) => {
      let r = n.leftBytes >= e.length;
      return r && (r = Wi(n.bytes(e.length, !0), e), r && n.bytes(e.length)), r !== t;
    },
    validate: (n) => {
      if (n !== void 0 && typeof n != "boolean")
        throw new Error(`flag: expected boolean value or undefined, got ${typeof n}`);
      return n;
    }
  });
};
function LA(e, t, n) {
  if (!Ge(t))
    throw new Error(`flagged: invalid inner value ${t}`);
  return ae({
    encodeStream: (r, i) => {
      Dn.resolve(r.stack, e) && t.encodeStream(r, i);
    },
    decodeStream: (r) => {
      let i = !1;
      if (i = !!Dn.resolve(r.stack, e), i)
        return t.decodeStream(r);
    }
  });
}
function $d(e, t, n = !0) {
  if (!Ge(e))
    throw new Error(`magic: invalid inner value ${e}`);
  if (typeof n != "boolean")
    throw new Error(`magic: expected boolean, got ${typeof n}`);
  return ae({
    size: e.size,
    encodeStream: (r, i) => e.encodeStream(r, t),
    decodeStream: (r) => {
      const i = e.decodeStream(r);
      if (n && typeof i != "object" && i !== t || Ie(t) && !Wi(t, i))
        throw r.err(`magic: invalid value: ${i} !== ${t}`);
    },
    validate: (r) => {
      if (r !== void 0)
        throw new Error(`magic: wrong value=${typeof r}`);
      return r;
    }
  });
}
function Vb(e) {
  let t = 0;
  for (const n of e) {
    if (n.size === void 0)
      return;
    if (!En(n.size))
      throw new Error(`sizeof: wrong element size=${t}`);
    t += n.size;
  }
  return t;
}
function Ft(e) {
  if (!fo(e))
    throw new Error(`struct: expected plain object, got ${e}`);
  for (const t in e)
    if (!Ge(e[t]))
      throw new Error(`struct: field ${t} is not CoderType`);
  return ae({
    size: Vb(Object.values(e)),
    encodeStream: (t, n) => {
      t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = {};
      return t.pushObj(n, (r) => {
        for (const i in e)
          r(i, () => n[i] = e[i].decodeStream(t));
      }), n;
    },
    validate: (t) => {
      if (typeof t != "object" || t === null)
        throw new Error(`struct: invalid value ${t}`);
      return t;
    }
  });
}
function DA(e) {
  if (!Array.isArray(e))
    throw new Error(`Packed.Tuple: got ${typeof e} instead of array`);
  for (let t = 0; t < e.length; t++)
    if (!Ge(e[t]))
      throw new Error(`tuple: field ${t} is not CoderType`);
  return ae({
    size: Vb(e),
    encodeStream: (t, n) => {
      if (!Array.isArray(n))
        throw t.err(`tuple: invalid value ${n}`);
      t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => e[i].encodeStream(t, n[i]));
      });
    },
    decodeStream: (t) => {
      const n = [];
      return t.pushObj(n, (r) => {
        for (let i = 0; i < e.length; i++)
          r(`${i}`, () => n.push(e[i].decodeStream(t)));
      }), n;
    },
    validate: (t) => {
      if (!Array.isArray(t))
        throw new Error(`tuple: invalid value ${t}`);
      if (t.length !== e.length)
        throw new Error(`tuple: wrong length=${t.length}, expected ${e.length}`);
      return t;
    }
  });
}
function re(e, t) {
  if (!Ge(t))
    throw new Error(`array: invalid inner value ${t}`);
  const n = Ub(typeof e == "string" ? `../${e}` : e);
  return ae({
    size: typeof e == "number" && t.size ? e * t.size : void 0,
    encodeStream: (r, i) => {
      const s = r;
      s.pushObj(i, (o) => {
        Ie(e) || n.encodeStream(r, i.length);
        for (let a = 0; a < i.length; a++)
          o(`${a}`, () => {
            const c = i[a], u = r.pos;
            if (t.encodeStream(r, c), Ie(e)) {
              if (e.length > s.pos - u)
                return;
              const l = s.finish(!1).subarray(u, s.pos);
              if (Wi(l.subarray(0, e.length), e))
                throw s.err(`array: inner element encoding same as separator. elm=${c} data=${l}`);
            }
          });
      }), Ie(e) && r.bytes(e);
    },
    decodeStream: (r) => {
      const i = [];
      return r.pushObj(i, (s) => {
        if (e === null)
          for (let o = 0; !r.isEnd() && (s(`${o}`, () => i.push(t.decodeStream(r))), !(t.size && r.leftBytes < t.size)); o++)
            ;
        else if (Ie(e))
          for (let o = 0; ; o++) {
            if (Wi(r.bytes(e.length, !0), e)) {
              r.bytes(e.length);
              break;
            }
            s(`${o}`, () => i.push(t.decodeStream(r)));
          }
        else {
          let o;
          s("arrayLen", () => o = n.decodeStream(r));
          for (let a = 0; a < o; a++)
            s(`${a}`, () => i.push(t.decodeStream(r)));
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
const ts = sr.Point, Zp = ts.Fn, Mb = ts.Fn.ORDER, Cd = (e) => e % 2n === 0n, wt = vd.isBytes, nr = vd.concatBytes, Ct = vd.equalBytes, Hb = (e) => fA(jt(e)), Yn = (...e) => jt(jt(nr(...e))), Fb = Tn.getPublicKey, VA = sr.getPublicKey, Xp = (e) => e.r < Mb / 2n;
function MA(e, t, n = !1) {
  let r = sr.Signature.fromBytes(sr.sign(e, t, { prehash: !1 }));
  if (n && !Xp(r)) {
    const i = new Uint8Array(32);
    let s = 0;
    for (; !Xp(r); )
      if (i.set(ft.encode(s++)), r = sr.Signature.fromBytes(sr.sign(e, t, { prehash: !1, extraEntropy: i })), s > 4294967295)
        throw new Error("lowR counter overflow: report the error");
  }
  return r.toBytes("der");
}
const Qp = Tn.sign, Od = Tn.utils.taggedHash, de = {
  ecdsa: 0,
  schnorr: 1
};
function Ki(e, t) {
  const n = e.length;
  if (t === de.ecdsa) {
    if (n === 32)
      throw new Error("Expected non-Schnorr key");
    return ts.fromBytes(e), e;
  } else if (t === de.schnorr) {
    if (n !== 32)
      throw new Error("Expected 32-byte Schnorr key");
    return Tn.utils.lift_x(Hn(e)), e;
  } else
    throw new Error("Unknown key type");
}
function Wb(e, t) {
  const r = Tn.utils.taggedHash("TapTweak", e, t), i = Hn(r);
  if (i >= Mb)
    throw new Error("tweak higher than curve order");
  return i;
}
function HA(e, t = Uint8Array.of()) {
  const n = Tn.utils, r = Hn(e), i = ts.BASE.multiply(r), s = Cd(i.y) ? r : Zp.neg(r), o = n.pointToBytes(i), a = Wb(o, t);
  return Nc(Zp.add(s, a), 32);
}
function uf(e, t) {
  const n = Tn.utils, r = Wb(e, t), s = n.lift_x(Hn(e)).add(ts.BASE.multiply(r)), o = Cd(s.y) ? 0 : 1;
  return [n.pointToBytes(s), o];
}
const Bd = jt(ts.BASE.toBytes(!1)), zi = {
  bech32: "bc",
  pubKeyHash: 0,
  scriptHash: 5,
  wif: 128
}, Po = {
  bech32: "tb",
  pubKeyHash: 111,
  scriptHash: 196,
  wif: 239
};
function Za(e, t) {
  if (!wt(e) || !wt(t))
    throw new Error(`cmp: wrong type a=${typeof e} b=${typeof t}`);
  const n = Math.min(e.length, t.length);
  for (let r = 0; r < n; r++)
    if (e[r] != t[r])
      return Math.sign(e[r] - t[r]);
  return Math.sign(e.length - t.length);
}
function Kb(e) {
  const t = {};
  for (const n in e) {
    if (t[e[n]] !== void 0)
      throw new Error("duplicate key");
    t[e[n]] = n;
  }
  return t;
}
const Ut = {
  OP_0: 0,
  PUSHDATA1: 76,
  PUSHDATA2: 77,
  PUSHDATA4: 78,
  "1NEGATE": 79,
  RESERVED: 80,
  OP_1: 81,
  OP_2: 82,
  OP_3: 83,
  OP_4: 84,
  OP_5: 85,
  OP_6: 86,
  OP_7: 87,
  OP_8: 88,
  OP_9: 89,
  OP_10: 90,
  OP_11: 91,
  OP_12: 92,
  OP_13: 93,
  OP_14: 94,
  OP_15: 95,
  OP_16: 96,
  // Control
  NOP: 97,
  VER: 98,
  IF: 99,
  NOTIF: 100,
  VERIF: 101,
  VERNOTIF: 102,
  ELSE: 103,
  ENDIF: 104,
  VERIFY: 105,
  RETURN: 106,
  // Stack
  TOALTSTACK: 107,
  FROMALTSTACK: 108,
  "2DROP": 109,
  "2DUP": 110,
  "3DUP": 111,
  "2OVER": 112,
  "2ROT": 113,
  "2SWAP": 114,
  IFDUP: 115,
  DEPTH: 116,
  DROP: 117,
  DUP: 118,
  NIP: 119,
  OVER: 120,
  PICK: 121,
  ROLL: 122,
  ROT: 123,
  SWAP: 124,
  TUCK: 125,
  // Splice
  CAT: 126,
  SUBSTR: 127,
  LEFT: 128,
  RIGHT: 129,
  SIZE: 130,
  // Boolean logic
  INVERT: 131,
  AND: 132,
  OR: 133,
  XOR: 134,
  EQUAL: 135,
  EQUALVERIFY: 136,
  RESERVED1: 137,
  RESERVED2: 138,
  // Numbers
  "1ADD": 139,
  "1SUB": 140,
  "2MUL": 141,
  "2DIV": 142,
  NEGATE: 143,
  ABS: 144,
  NOT: 145,
  "0NOTEQUAL": 146,
  ADD: 147,
  SUB: 148,
  MUL: 149,
  DIV: 150,
  MOD: 151,
  LSHIFT: 152,
  RSHIFT: 153,
  BOOLAND: 154,
  BOOLOR: 155,
  NUMEQUAL: 156,
  NUMEQUALVERIFY: 157,
  NUMNOTEQUAL: 158,
  LESSTHAN: 159,
  GREATERTHAN: 160,
  LESSTHANOREQUAL: 161,
  GREATERTHANOREQUAL: 162,
  MIN: 163,
  MAX: 164,
  WITHIN: 165,
  // Crypto
  RIPEMD160: 166,
  SHA1: 167,
  SHA256: 168,
  HASH160: 169,
  HASH256: 170,
  CODESEPARATOR: 171,
  CHECKSIG: 172,
  CHECKSIGVERIFY: 173,
  CHECKMULTISIG: 174,
  CHECKMULTISIGVERIFY: 175,
  // Expansion
  NOP1: 176,
  CHECKLOCKTIMEVERIFY: 177,
  CHECKSEQUENCEVERIFY: 178,
  NOP4: 179,
  NOP5: 180,
  NOP6: 181,
  NOP7: 182,
  NOP8: 183,
  NOP9: 184,
  NOP10: 185,
  // BIP 342
  CHECKSIGADD: 186,
  // Invalid
  INVALID: 255
}, FA = Kb(Ut);
function Nd(e = 6, t = !1) {
  return ae({
    encodeStream: (n, r) => {
      if (r === 0n)
        return;
      const i = r < 0, s = BigInt(r), o = [];
      for (let a = i ? -s : s; a; a >>= 8n)
        o.push(Number(a & 0xffn));
      o[o.length - 1] >= 128 ? o.push(i ? 128 : 0) : i && (o[o.length - 1] |= 128), n.bytes(new Uint8Array(o));
    },
    decodeStream: (n) => {
      const r = n.leftBytes;
      if (r > e)
        throw new Error(`ScriptNum: number (${r}) bigger than limit=${e}`);
      if (r === 0)
        return 0n;
      if (t) {
        const o = n.bytes(r, !0);
        if ((o[o.length - 1] & 127) === 0 && (r <= 1 || (o[o.length - 2] & 128) === 0))
          throw new Error("Non-minimally encoded ScriptNum");
      }
      let i = 0, s = 0n;
      for (let o = 0; o < r; ++o)
        i = n.byte(), s |= BigInt(i) << 8n * BigInt(o);
      return i >= 128 && (s &= 2n ** BigInt(r * 8) - 1n >> 1n, s = -s), s;
    }
  });
}
function WA(e, t = 4, n = !0) {
  if (typeof e == "number")
    return e;
  if (wt(e))
    try {
      const r = Nd(t, n).decode(e);
      return r > Number.MAX_SAFE_INTEGER ? void 0 : Number(r);
    } catch {
      return;
    }
}
const nt = ae({
  encodeStream: (e, t) => {
    for (let n of t) {
      if (typeof n == "string") {
        if (Ut[n] === void 0)
          throw new Error(`Unknown opcode=${n}`);
        e.byte(Ut[n]);
        continue;
      } else if (typeof n == "number") {
        if (n === 0) {
          e.byte(0);
          continue;
        } else if (1 <= n && n <= 16) {
          e.byte(Ut.OP_1 - 1 + n);
          continue;
        }
      }
      if (typeof n == "number" && (n = Nd().encode(BigInt(n))), !wt(n))
        throw new Error(`Wrong Script OP=${n} (${typeof n})`);
      const r = n.length;
      r < Ut.PUSHDATA1 ? e.byte(r) : r <= 255 ? (e.byte(Ut.PUSHDATA1), e.byte(r)) : r <= 65535 ? (e.byte(Ut.PUSHDATA2), e.bytes(Yp.encode(r))) : (e.byte(Ut.PUSHDATA4), e.bytes(ft.encode(r))), e.bytes(n);
    }
  },
  decodeStream: (e) => {
    const t = [];
    for (; !e.isEnd(); ) {
      const n = e.byte();
      if (Ut.OP_0 < n && n <= Ut.PUSHDATA4) {
        let r;
        if (n < Ut.PUSHDATA1)
          r = n;
        else if (n === Ut.PUSHDATA1)
          r = lr.decodeStream(e);
        else if (n === Ut.PUSHDATA2)
          r = Yp.decodeStream(e);
        else if (n === Ut.PUSHDATA4)
          r = ft.decodeStream(e);
        else
          throw new Error("Should be not possible");
        t.push(e.bytes(r));
      } else if (n === 0)
        t.push(0);
      else if (Ut.OP_1 <= n && n <= Ut.OP_16)
        t.push(n - (Ut.OP_1 - 1));
      else {
        const r = FA[n];
        if (r === void 0)
          throw new Error(`Unknown opcode=${n.toString(16)}`);
        t.push(r);
      }
    }
    return t;
  }
}), Jp = {
  253: [253, 2, 253n, 65535n],
  254: [254, 4, 65536n, 4294967295n],
  255: [255, 8, 4294967296n, 18446744073709551615n]
}, Vc = ae({
  encodeStream: (e, t) => {
    if (typeof t == "number" && (t = BigInt(t)), 0n <= t && t <= 252n)
      return e.byte(Number(t));
    for (const [n, r, i, s] of Object.values(Jp))
      if (!(i > t || t > s)) {
        e.byte(n);
        for (let o = 0; o < r; o++)
          e.byte(Number(t >> 8n * BigInt(o) & 0xffn));
        return;
      }
    throw e.err(`VarInt too big: ${t}`);
  },
  decodeStream: (e) => {
    const t = e.byte();
    if (t <= 252)
      return BigInt(t);
    const [n, r, i] = Jp[t];
    let s = 0n;
    for (let o = 0; o < r; o++)
      s |= BigInt(e.byte()) << 8n * BigInt(o);
    if (s < i)
      throw e.err(`Wrong CompactSize(${8 * r})`);
    return s;
  }
}), qe = xr(Vc, Dc.numberBigint), Ve = Tt(Vc), Zs = re(qe, Ve), Xa = (e) => re(Vc, e), zb = Ft({
  txid: Tt(32, !0),
  // hash(prev_tx),
  index: ft,
  // output number of previous tx
  finalScriptSig: Ve,
  // btc merges input and output script, executes it. If ok = tx passes
  sequence: ft
  // ?
}), jr = Ft({ amount: ta, script: Ve }), KA = Ft({
  version: pi,
  segwitFlag: _A(new Uint8Array([0, 1])),
  inputs: Xa(zb),
  outputs: Xa(jr),
  witnesses: LA("segwitFlag", re("inputs/length", Zs)),
  // < 500000000	Block number at which this transaction is unlocked
  // >= 500000000	UNIX timestamp at which this transaction is unlocked
  // Handled as part of PSBTv2
  lockTime: ft
});
function zA(e) {
  if (e.segwitFlag && e.witnesses && !e.witnesses.length)
    throw new Error("Segwit flag with empty witnesses array");
  return e;
}
const vi = oe(KA, zA), ws = Ft({
  version: pi,
  inputs: Xa(zb),
  outputs: Xa(jr),
  lockTime: ft
}), lf = oe(Tt(null), (e) => Ki(e, de.ecdsa)), Qa = oe(Tt(32), (e) => Ki(e, de.schnorr)), tg = oe(Tt(null), (e) => {
  if (e.length !== 64 && e.length !== 65)
    throw new Error("Schnorr signature should be 64 or 65 bytes long");
  return e;
}), Mc = Ft({
  fingerprint: PA,
  path: re(null, ft)
}), jb = Ft({
  hashes: re(qe, Tt(32)),
  der: Mc
}), jA = Tt(78), GA = Ft({ pubKey: Qa, leafHash: Tt(32) }), qA = Ft({
  version: lr,
  // With parity :(
  internalKey: Tt(32),
  merklePath: re(null, Tt(32))
}), pn = oe(qA, (e) => {
  if (e.merklePath.length > 128)
    throw new Error("TaprootControlBlock: merklePath should be of length 0..128 (inclusive)");
  return e;
}), YA = re(null, Ft({
  depth: lr,
  version: lr,
  script: Ve
})), It = Tt(null), eg = Tt(20), ls = Tt(32), Pd = {
  unsignedTx: [0, !1, ws, [0], [0], !1],
  xpub: [1, jA, Mc, [], [0, 2], !1],
  txVersion: [2, !1, ft, [2], [2], !1],
  fallbackLocktime: [3, !1, ft, [], [2], !1],
  inputCount: [4, !1, qe, [2], [2], !1],
  outputCount: [5, !1, qe, [2], [2], !1],
  txModifiable: [6, !1, lr, [], [2], !1],
  // TODO: bitfield
  version: [251, !1, ft, [], [0, 2], !1],
  proprietary: [252, It, It, [], [0, 2], !1]
}, Hc = {
  nonWitnessUtxo: [0, !1, vi, [], [0, 2], !1],
  witnessUtxo: [1, !1, jr, [], [0, 2], !1],
  partialSig: [2, lf, It, [], [0, 2], !1],
  sighashType: [3, !1, ft, [], [0, 2], !1],
  redeemScript: [4, !1, It, [], [0, 2], !1],
  witnessScript: [5, !1, It, [], [0, 2], !1],
  bip32Derivation: [6, lf, Mc, [], [0, 2], !1],
  finalScriptSig: [7, !1, It, [], [0, 2], !1],
  finalScriptWitness: [8, !1, Zs, [], [0, 2], !1],
  porCommitment: [9, !1, It, [], [0, 2], !1],
  ripemd160: [10, eg, It, [], [0, 2], !1],
  sha256: [11, ls, It, [], [0, 2], !1],
  hash160: [12, eg, It, [], [0, 2], !1],
  hash256: [13, ls, It, [], [0, 2], !1],
  txid: [14, !1, ls, [2], [2], !0],
  index: [15, !1, ft, [2], [2], !0],
  sequence: [16, !1, ft, [], [2], !0],
  requiredTimeLocktime: [17, !1, ft, [], [2], !1],
  requiredHeightLocktime: [18, !1, ft, [], [2], !1],
  tapKeySig: [19, !1, tg, [], [0, 2], !1],
  tapScriptSig: [20, GA, tg, [], [0, 2], !1],
  tapLeafScript: [21, pn, It, [], [0, 2], !1],
  tapBip32Derivation: [22, ls, jb, [], [0, 2], !1],
  tapInternalKey: [23, !1, Qa, [], [0, 2], !1],
  tapMerkleRoot: [24, !1, ls, [], [0, 2], !1],
  proprietary: [252, It, It, [], [0, 2], !1]
}, ZA = [
  "txid",
  "sequence",
  "index",
  "witnessUtxo",
  "nonWitnessUtxo",
  "finalScriptSig",
  "finalScriptWitness",
  "unknown"
], XA = [
  "partialSig",
  "finalScriptSig",
  "finalScriptWitness",
  "tapKeySig",
  "tapScriptSig"
], Xs = {
  redeemScript: [0, !1, It, [], [0, 2], !1],
  witnessScript: [1, !1, It, [], [0, 2], !1],
  bip32Derivation: [2, lf, Mc, [], [0, 2], !1],
  amount: [3, !1, BA, [2], [2], !0],
  script: [4, !1, It, [2], [2], !0],
  tapInternalKey: [5, !1, Qa, [], [0, 2], !1],
  tapTree: [6, !1, YA, [], [0, 2], !1],
  tapBip32Derivation: [7, Qa, jb, [], [0, 2], !1],
  proprietary: [252, It, It, [], [0, 2], !1]
}, QA = [], ng = re(Pb, Ft({
  //  <key> := <keylen> <keytype> <keydata> WHERE keylen = len(keytype)+len(keydata)
  key: RA(qe, Ft({ type: qe, key: Tt(null) })),
  //  <value> := <valuelen> <valuedata>
  value: Tt(qe)
}));
function ff(e) {
  const [t, n, r, i, s, o] = e;
  return { type: t, kc: n, vc: r, reqInc: i, allowInc: s, silentIgnore: o };
}
Ft({ type: qe, key: Tt(null) });
function Rd(e) {
  const t = {};
  for (const n in e) {
    const [r, i, s] = e[n];
    t[r] = [n, i, s];
  }
  return ae({
    encodeStream: (n, r) => {
      let i = [];
      for (const s in e) {
        const o = r[s];
        if (o === void 0)
          continue;
        const [a, c, u] = e[s];
        if (!c)
          i.push({ key: { type: a, key: St }, value: u.encode(o) });
        else {
          const l = o.map(([f, h]) => [
            c.encode(f),
            u.encode(h)
          ]);
          l.sort((f, h) => Za(f[0], h[0]));
          for (const [f, h] of l)
            i.push({ key: { key: f, type: a }, value: h });
        }
      }
      if (r.unknown) {
        r.unknown.sort((s, o) => Za(s[0].key, o[0].key));
        for (const [s, o] of r.unknown)
          i.push({ key: s, value: o });
      }
      ng.encodeStream(n, i);
    },
    decodeStream: (n) => {
      const r = ng.decodeStream(n), i = {}, s = {};
      for (const o of r) {
        let a = "unknown", c = o.key.key, u = o.value;
        if (t[o.key.type]) {
          const [l, f, h] = t[o.key.type];
          if (a = l, !f && c.length)
            throw new Error(`PSBT: Non-empty key for ${a} (key=${_.encode(c)} value=${_.encode(u)}`);
          if (c = f ? f.decode(c) : void 0, u = h.decode(u), !f) {
            if (i[a])
              throw new Error(`PSBT: Same keys: ${a} (key=${c} value=${u})`);
            i[a] = u, s[a] = !0;
            continue;
          }
        } else
          c = { type: o.key.type, key: o.key.key };
        if (s[a])
          throw new Error(`PSBT: Key type with empty key and no key=${a} val=${u}`);
        i[a] || (i[a] = []), i[a].push([c, u]);
      }
      return i;
    }
  });
}
const Ud = oe(Rd(Hc), (e) => {
  if (e.finalScriptWitness && !e.finalScriptWitness.length)
    throw new Error("validateInput: empty finalScriptWitness");
  if (e.partialSig && !e.partialSig.length)
    throw new Error("Empty partialSig");
  if (e.partialSig)
    for (const [t] of e.partialSig)
      Ki(t, de.ecdsa);
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Ki(t, de.ecdsa);
  if (e.requiredTimeLocktime !== void 0 && e.requiredTimeLocktime < 5e8)
    throw new Error(`validateInput: wrong timeLocktime=${e.requiredTimeLocktime}`);
  if (e.requiredHeightLocktime !== void 0 && (e.requiredHeightLocktime <= 0 || e.requiredHeightLocktime >= 5e8))
    throw new Error(`validateInput: wrong heighLocktime=${e.requiredHeightLocktime}`);
  if (e.tapLeafScript)
    for (const [t, n] of e.tapLeafScript) {
      if ((t.version & 254) !== n[n.length - 1])
        throw new Error("validateInput: tapLeafScript version mimatch");
      if (n[n.length - 1] & 1)
        throw new Error("validateInput: tapLeafScript version has parity bit!");
    }
  return e;
}), _d = oe(Rd(Xs), (e) => {
  if (e.bip32Derivation)
    for (const [t] of e.bip32Derivation)
      Ki(t, de.ecdsa);
  return e;
}), Gb = oe(Rd(Pd), (e) => {
  if ((e.version || 0) === 0) {
    if (!e.unsignedTx)
      throw new Error("PSBTv0: missing unsignedTx");
    for (const n of e.unsignedTx.inputs)
      if (n.finalScriptSig && n.finalScriptSig.length)
        throw new Error("PSBTv0: input scriptSig found in unsignedTx");
  }
  return e;
}), JA = Ft({
  magic: $d(Id(new Uint8Array([255])), "psbt"),
  global: Gb,
  inputs: re("global/unsignedTx/inputs/length", Ud),
  outputs: re(null, _d)
}), tk = Ft({
  magic: $d(Id(new Uint8Array([255])), "psbt"),
  global: Gb,
  inputs: re("global/inputCount", Ud),
  outputs: re("global/outputCount", _d)
});
Ft({
  magic: $d(Id(new Uint8Array([255])), "psbt"),
  items: re(null, xr(re(Pb, DA([UA(qe), Tt(Vc)])), Dc.dict()))
});
function Zu(e, t, n) {
  for (const r in n) {
    if (r === "unknown" || !t[r])
      continue;
    const { allowInc: i } = ff(t[r]);
    if (!i.includes(e))
      throw new Error(`PSBTv${e}: field ${r} is not allowed`);
  }
  for (const r in t) {
    const { reqInc: i } = ff(t[r]);
    if (i.includes(e) && n[r] === void 0)
      throw new Error(`PSBTv${e}: missing required field ${r}`);
  }
}
function rg(e, t, n) {
  const r = {};
  for (const i in n) {
    const s = i;
    if (s !== "unknown") {
      if (!t[s])
        continue;
      const { allowInc: o, silentIgnore: a } = ff(t[s]);
      if (!o.includes(e)) {
        if (a)
          continue;
        throw new Error(`Failed to serialize in PSBTv${e}: ${s} but versions allows inclusion=${o}`);
      }
    }
    r[s] = n[s];
  }
  return r;
}
function qb(e) {
  const t = e && e.global && e.global.version || 0;
  Zu(t, Pd, e.global);
  for (const o of e.inputs)
    Zu(t, Hc, o);
  for (const o of e.outputs)
    Zu(t, Xs, o);
  const n = t ? e.global.inputCount : e.global.unsignedTx.inputs.length;
  if (e.inputs.length < n)
    throw new Error("Not enough inputs");
  const r = e.inputs.slice(n);
  if (r.length > 1 || r.length && Object.keys(r[0]).length)
    throw new Error(`Unexpected inputs left in tx=${r}`);
  const i = t ? e.global.outputCount : e.global.unsignedTx.outputs.length;
  if (e.outputs.length < i)
    throw new Error("Not outputs inputs");
  const s = e.outputs.slice(i);
  if (s.length > 1 || s.length && Object.keys(s[0]).length)
    throw new Error(`Unexpected outputs left in tx=${s}`);
  return e;
}
function df(e, t, n, r, i) {
  const s = { ...n, ...t };
  for (const o in e) {
    const a = o, [c, u, l] = e[a], f = r && !r.includes(o);
    if (t[o] === void 0 && o in t) {
      if (f)
        throw new Error(`Cannot remove signed field=${o}`);
      delete s[o];
    } else if (u) {
      const h = n && n[o] ? n[o] : [];
      let p = t[a];
      if (p) {
        if (!Array.isArray(p))
          throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
        p = p.map((g) => {
          if (g.length !== 2)
            throw new Error(`keyMap(${o}): KV pairs should be [k, v][]`);
          return [
            typeof g[0] == "string" ? u.decode(_.decode(g[0])) : g[0],
            typeof g[1] == "string" ? l.decode(_.decode(g[1])) : g[1]
          ];
        });
        const y = {}, d = (g, m, v) => {
          if (y[g] === void 0) {
            y[g] = [m, v];
            return;
          }
          const k = _.encode(l.encode(y[g][1])), C = _.encode(l.encode(v));
          if (k !== C)
            throw new Error(`keyMap(${a}): same key=${g} oldVal=${k} newVal=${C}`);
        };
        for (const [g, m] of h) {
          const v = _.encode(u.encode(g));
          d(v, g, m);
        }
        for (const [g, m] of p) {
          const v = _.encode(u.encode(g));
          if (m === void 0) {
            if (f)
              throw new Error(`Cannot remove signed field=${a}/${g}`);
            delete y[v];
          } else
            d(v, g, m);
        }
        s[a] = Object.values(y);
      }
    } else if (typeof s[o] == "string")
      s[o] = l.decode(_.decode(s[o]));
    else if (f && o in t && n && n[o] !== void 0 && !Ct(l.encode(t[o]), l.encode(n[o])))
      throw new Error(`Cannot change signed field=${o}`);
  }
  for (const o in s)
    if (!e[o]) {
      if (i && o === "unknown")
        continue;
      delete s[o];
    }
  return s;
}
const ig = oe(JA, qb), sg = oe(tk, qb), ek = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !wt(e[1]) || _.encode(e[1]) !== "4e73"))
      return { type: "p2a", script: nt.encode(e) };
  },
  decode: (e) => {
    if (e.type === "p2a")
      return [1, _.decode("4e73")];
  }
};
function gi(e, t) {
  try {
    return Ki(e, t), !0;
  } catch {
    return !1;
  }
}
const nk = {
  encode(e) {
    if (!(e.length !== 2 || !wt(e[0]) || !gi(e[0], de.ecdsa) || e[1] !== "CHECKSIG"))
      return { type: "pk", pubkey: e[0] };
  },
  decode: (e) => e.type === "pk" ? [e.pubkey, "CHECKSIG"] : void 0
}, rk = {
  encode(e) {
    if (!(e.length !== 5 || e[0] !== "DUP" || e[1] !== "HASH160" || !wt(e[2])) && !(e[3] !== "EQUALVERIFY" || e[4] !== "CHECKSIG"))
      return { type: "pkh", hash: e[2] };
  },
  decode: (e) => e.type === "pkh" ? ["DUP", "HASH160", e.hash, "EQUALVERIFY", "CHECKSIG"] : void 0
}, ik = {
  encode(e) {
    if (!(e.length !== 3 || e[0] !== "HASH160" || !wt(e[1]) || e[2] !== "EQUAL"))
      return { type: "sh", hash: e[1] };
  },
  decode: (e) => e.type === "sh" ? ["HASH160", e.hash, "EQUAL"] : void 0
}, sk = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !wt(e[1])) && e[1].length === 32)
      return { type: "wsh", hash: e[1] };
  },
  decode: (e) => e.type === "wsh" ? [0, e.hash] : void 0
}, ok = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 0 || !wt(e[1])) && e[1].length === 20)
      return { type: "wpkh", hash: e[1] };
  },
  decode: (e) => e.type === "wpkh" ? [0, e.hash] : void 0
}, ak = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKMULTISIG")
      return;
    const n = e[0], r = e[t - 1];
    if (typeof n != "number" || typeof r != "number")
      return;
    const i = e.slice(1, -2);
    if (r === i.length) {
      for (const s of i)
        if (!wt(s))
          return;
      return { type: "ms", m: n, pubkeys: i };
    }
  },
  // checkmultisig(n, ..pubkeys, m)
  decode: (e) => e.type === "ms" ? [e.m, ...e.pubkeys, e.pubkeys.length, "CHECKMULTISIG"] : void 0
}, ck = {
  encode(e) {
    if (!(e.length !== 2 || e[0] !== 1 || !wt(e[1])))
      return { type: "tr", pubkey: e[1] };
  },
  decode: (e) => e.type === "tr" ? [1, e.pubkey] : void 0
}, uk = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "CHECKSIG")
      return;
    const n = [];
    for (let r = 0; r < t; r++) {
      const i = e[r];
      if (r & 1) {
        if (i !== "CHECKSIGVERIFY" || r === t - 1)
          return;
        continue;
      }
      if (!wt(i))
        return;
      n.push(i);
    }
    return { type: "tr_ns", pubkeys: n };
  },
  decode: (e) => {
    if (e.type !== "tr_ns")
      return;
    const t = [];
    for (let n = 0; n < e.pubkeys.length - 1; n++)
      t.push(e.pubkeys[n], "CHECKSIGVERIFY");
    return t.push(e.pubkeys[e.pubkeys.length - 1], "CHECKSIG"), t;
  }
}, lk = {
  encode(e) {
    const t = e.length - 1;
    if (e[t] !== "NUMEQUAL" || e[1] !== "CHECKSIG")
      return;
    const n = [], r = WA(e[t - 1]);
    if (typeof r == "number") {
      for (let i = 0; i < t - 1; i++) {
        const s = e[i];
        if (i & 1) {
          if (s !== (i === 1 ? "CHECKSIG" : "CHECKSIGADD"))
            throw new Error("OutScript.encode/tr_ms: wrong element");
          continue;
        }
        if (!wt(s))
          throw new Error("OutScript.encode/tr_ms: wrong key element");
        n.push(s);
      }
      return { type: "tr_ms", pubkeys: n, m: r };
    }
  },
  decode: (e) => {
    if (e.type !== "tr_ms")
      return;
    const t = [e.pubkeys[0], "CHECKSIG"];
    for (let n = 1; n < e.pubkeys.length; n++)
      t.push(e.pubkeys[n], "CHECKSIGADD");
    return t.push(e.m, "NUMEQUAL"), t;
  }
}, fk = {
  encode(e) {
    return { type: "unknown", script: nt.encode(e) };
  },
  decode: (e) => e.type === "unknown" ? nt.decode(e.script) : void 0
}, dk = [
  ek,
  nk,
  rk,
  ik,
  sk,
  ok,
  ak,
  ck,
  uk,
  lk,
  fk
], hk = xr(nt, Dc.match(dk)), At = oe(hk, (e) => {
  if (e.type === "pk" && !gi(e.pubkey, de.ecdsa))
    throw new Error("OutScript/pk: wrong key");
  if ((e.type === "pkh" || e.type === "sh" || e.type === "wpkh") && (!wt(e.hash) || e.hash.length !== 20))
    throw new Error(`OutScript/${e.type}: wrong hash`);
  if (e.type === "wsh" && (!wt(e.hash) || e.hash.length !== 32))
    throw new Error("OutScript/wsh: wrong hash");
  if (e.type === "tr" && (!wt(e.pubkey) || !gi(e.pubkey, de.schnorr)))
    throw new Error("OutScript/tr: wrong taproot public key");
  if ((e.type === "ms" || e.type === "tr_ns" || e.type === "tr_ms") && !Array.isArray(e.pubkeys))
    throw new Error("OutScript/multisig: wrong pubkeys array");
  if (e.type === "ms") {
    const t = e.pubkeys.length;
    for (const n of e.pubkeys)
      if (!gi(n, de.ecdsa))
        throw new Error("OutScript/multisig: wrong pubkey");
    if (e.m <= 0 || t > 16 || e.m > t)
      throw new Error("OutScript/multisig: invalid params");
  }
  if (e.type === "tr_ns" || e.type === "tr_ms") {
    for (const t of e.pubkeys)
      if (!gi(t, de.schnorr))
        throw new Error(`OutScript/${e.type}: wrong pubkey`);
  }
  if (e.type === "tr_ms") {
    const t = e.pubkeys.length;
    if (e.m <= 0 || t > 999 || e.m > t)
      throw new Error("OutScript/tr_ms: invalid params");
  }
  return e;
});
function og(e, t) {
  if (!Ct(e.hash, jt(t)))
    throw new Error("checkScript: wsh wrong witnessScript hash");
  const n = At.decode(t);
  if (n.type === "tr" || n.type === "tr_ns" || n.type === "tr_ms")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2SH`);
  if (n.type === "wpkh" || n.type === "sh")
    throw new Error(`checkScript: P2${n.type} cannot be wrapped in P2WSH`);
}
function Yb(e, t, n) {
  if (e) {
    const r = At.decode(e);
    if (r.type === "tr_ns" || r.type === "tr_ms" || r.type === "ms" || r.type == "pk")
      throw new Error(`checkScript: non-wrapped ${r.type}`);
    if (r.type === "sh" && t) {
      if (!Ct(r.hash, Hb(t)))
        throw new Error("checkScript: sh wrong redeemScript hash");
      const i = At.decode(t);
      if (i.type === "tr" || i.type === "tr_ns" || i.type === "tr_ms")
        throw new Error(`checkScript: P2${i.type} cannot be wrapped in P2SH`);
      if (i.type === "sh")
        throw new Error("checkScript: P2SH cannot be wrapped in P2SH");
    }
    r.type === "wsh" && n && og(r, n);
  }
  if (t) {
    const r = At.decode(t);
    r.type === "wsh" && n && og(r, n);
  }
}
function pk(e) {
  const t = {};
  for (const n of e) {
    const r = _.encode(n);
    if (t[r])
      throw new Error(`Multisig: non-uniq pubkey: ${e.map(_.encode)}`);
    t[r] = !0;
  }
}
function gk(e, t, n = !1, r) {
  const i = At.decode(e);
  if (i.type === "unknown" && n)
    return;
  if (!["tr_ns", "tr_ms"].includes(i.type))
    throw new Error(`P2TR: invalid leaf script=${i.type}`);
  const s = i;
  if (!n && s.pubkeys)
    for (const o of s.pubkeys) {
      if (Ct(o, Bd))
        throw new Error("Unspendable taproot key in leaf script");
      if (Ct(o, t))
        throw new Error("Using P2TR with leaf script with same key as internal key is not supported");
    }
}
function Zb(e) {
  const t = Array.from(e);
  for (; t.length >= 2; ) {
    t.sort((o, a) => (a.weight || 1) - (o.weight || 1));
    const r = t.pop(), i = t.pop(), s = (i?.weight || 1) + (r?.weight || 1);
    t.push({
      weight: s,
      // Unwrap children array
      // TODO: Very hard to remove any here
      childs: [i?.childs || i, r?.childs || r]
    });
  }
  const n = t[0];
  return n?.childs || n;
}
function hf(e, t = []) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return { ...e, path: t };
  if (e.type !== "branch")
    throw new Error(`taprootAddPath: wrong type=${e}`);
  return {
    ...e,
    path: t,
    // Left element has right hash in path and otherwise
    left: hf(e.left, [e.right.hash, ...t]),
    right: hf(e.right, [e.left.hash, ...t])
  };
}
function pf(e) {
  if (!e)
    throw new Error("taprootAddPath: empty tree");
  if (e.type === "leaf")
    return [e];
  if (e.type !== "branch")
    throw new Error(`taprootWalkTree: wrong type=${e}`);
  return [...pf(e.left), ...pf(e.right)];
}
function gf(e, t, n = !1, r) {
  if (!e)
    throw new Error("taprootHashTree: empty tree");
  if (Array.isArray(e) && e.length === 1 && (e = e[0]), !Array.isArray(e)) {
    const { leafVersion: c, script: u } = e;
    if (e.tapLeafScript || e.tapMerkleRoot && !Ct(e.tapMerkleRoot, St))
      throw new Error("P2TR: tapRoot leafScript cannot have tree");
    const l = typeof u == "string" ? _.decode(u) : u;
    if (!wt(l))
      throw new Error(`checkScript: wrong script type=${l}`);
    return gk(l, t, n), {
      type: "leaf",
      version: c,
      script: l,
      hash: Ns(l, c)
    };
  }
  if (e.length !== 2 && (e = Zb(e)), e.length !== 2)
    throw new Error("hashTree: non binary tree!");
  const i = gf(e[0], t, n), s = gf(e[1], t, n);
  let [o, a] = [i.hash, s.hash];
  return Za(a, o) === -1 && ([o, a] = [a, o]), { type: "branch", left: i, right: s, hash: Od("TapBranch", o, a) };
}
const Qs = 192, Ns = (e, t = Qs) => Od("TapLeaf", new Uint8Array([t]), Ve.encode(e));
function yk(e, t, n = zi, r = !1, i) {
  if (!e && !t)
    throw new Error("p2tr: should have pubKey or scriptTree (or both)");
  const s = typeof e == "string" ? _.decode(e) : e || Bd;
  if (!gi(s, de.schnorr))
    throw new Error("p2tr: non-schnorr pubkey");
  if (t) {
    let o = hf(gf(t, s, r));
    const a = o.hash, [c, u] = uf(s, a), l = pf(o).map((f) => ({
      ...f,
      controlBlock: pn.encode({
        version: (f.version || Qs) + u,
        internalKey: s,
        merklePath: f.path
      })
    }));
    return {
      type: "tr",
      script: At.encode({ type: "tr", pubkey: c }),
      address: Sr(n).encode({ type: "tr", pubkey: c }),
      // For tests
      tweakedPubkey: c,
      // PSBT stuff
      tapInternalKey: s,
      leaves: l,
      tapLeafScript: l.map((f) => [
        pn.decode(f.controlBlock),
        nr(f.script, new Uint8Array([f.version || Qs]))
      ]),
      tapMerkleRoot: a
    };
  } else {
    const o = uf(s, St)[0];
    return {
      type: "tr",
      script: At.encode({ type: "tr", pubkey: o }),
      address: Sr(n).encode({ type: "tr", pubkey: o }),
      // For tests
      tweakedPubkey: o,
      // PSBT stuff
      tapInternalKey: s
    };
  }
}
function wk(e, t, n = !1) {
  return n || pk(t), {
    type: "tr_ms",
    script: At.encode({ type: "tr_ms", pubkeys: t, m: e })
  };
}
const Xb = bA(jt);
function Qb(e, t) {
  if (t.length < 2 || t.length > 40)
    throw new Error("Witness: invalid length");
  if (e > 16)
    throw new Error("Witness: invalid version");
  if (e === 0 && !(t.length === 20 || t.length === 32))
    throw new Error("Witness: invalid length for version");
}
function Xu(e, t, n = zi) {
  Qb(e, t);
  const r = e === 0 ? af : hi;
  return r.encode(n.bech32, [e].concat(r.toWords(t)));
}
function ag(e, t) {
  return Xb.encode(nr(Uint8Array.from(t), e));
}
function Sr(e = zi) {
  return {
    encode(t) {
      const { type: n } = t;
      if (n === "wpkh")
        return Xu(0, t.hash, e);
      if (n === "wsh")
        return Xu(0, t.hash, e);
      if (n === "tr")
        return Xu(1, t.pubkey, e);
      if (n === "pkh")
        return ag(t.hash, [e.pubKeyHash]);
      if (n === "sh")
        return ag(t.hash, [e.scriptHash]);
      throw new Error(`Unknown address type=${n}`);
    },
    decode(t) {
      if (t.length < 14 || t.length > 74)
        throw new Error("Invalid address length");
      if (e.bech32 && t.toLowerCase().startsWith(`${e.bech32}1`)) {
        let r;
        try {
          if (r = af.decode(t), r.words[0] !== 0)
            throw new Error(`bech32: wrong version=${r.words[0]}`);
        } catch {
          if (r = hi.decode(t), r.words[0] === 0)
            throw new Error(`bech32m: wrong version=${r.words[0]}`);
        }
        if (r.prefix !== e.bech32)
          throw new Error(`wrong bech32 prefix=${r.prefix}`);
        const [i, ...s] = r.words, o = af.fromWords(s);
        if (Qb(i, o), i === 0 && o.length === 32)
          return { type: "wsh", hash: o };
        if (i === 0 && o.length === 20)
          return { type: "wpkh", hash: o };
        if (i === 1 && o.length === 32)
          return { type: "tr", pubkey: o };
        throw new Error("Unknown witness program");
      }
      const n = Xb.decode(t);
      if (n.length !== 21)
        throw new Error("Invalid base58 address");
      if (n[0] === e.pubKeyHash)
        return { type: "pkh", hash: n.slice(1) };
      if (n[0] === e.scriptHash)
        return {
          type: "sh",
          hash: n.slice(1)
        };
      throw new Error(`Invalid address prefix=${n[0]}`);
    }
  };
}
const Ro = new Uint8Array(32), mk = {
  amount: 0xffffffffffffffffn,
  script: St
}, bk = (e) => Math.ceil(e / 4), Ek = 8, Tk = 2, Br = 0, Ld = 4294967295;
Dc.decimal(Ek);
const Ps = (e, t) => e === void 0 ? t : e;
function Ja(e) {
  if (Array.isArray(e))
    return e.map((t) => Ja(t));
  if (wt(e))
    return Uint8Array.from(e);
  if (["number", "bigint", "boolean", "string", "undefined"].includes(typeof e))
    return e;
  if (e === null)
    return e;
  if (typeof e == "object")
    return Object.fromEntries(Object.entries(e).map(([t, n]) => [t, Ja(n)]));
  throw new Error(`cloneDeep: unknown type=${e} (${typeof e})`);
}
const ct = {
  DEFAULT: 0,
  ALL: 1,
  NONE: 2,
  SINGLE: 3,
  ANYONECANPAY: 128
}, ji = {
  DEFAULT: ct.DEFAULT,
  ALL: ct.ALL,
  NONE: ct.NONE,
  SINGLE: ct.SINGLE,
  DEFAULT_ANYONECANPAY: ct.DEFAULT | ct.ANYONECANPAY,
  ALL_ANYONECANPAY: ct.ALL | ct.ANYONECANPAY,
  NONE_ANYONECANPAY: ct.NONE | ct.ANYONECANPAY,
  SINGLE_ANYONECANPAY: ct.SINGLE | ct.ANYONECANPAY
}, xk = Kb(ji);
function Sk(e, t, n, r = St) {
  return Ct(n, t) && (e = HA(e, r), t = Fb(e)), { privKey: e, pubKey: t };
}
function Nr(e) {
  if (e.script === void 0 || e.amount === void 0)
    throw new Error("Transaction/output: script and amount required");
  return { script: e.script, amount: e.amount };
}
function fs(e) {
  if (e.txid === void 0 || e.index === void 0)
    throw new Error("Transaction/input: txid and index required");
  return {
    txid: e.txid,
    index: e.index,
    sequence: Ps(e.sequence, Ld),
    finalScriptSig: Ps(e.finalScriptSig, St)
  };
}
function Qu(e) {
  for (const t in e) {
    const n = t;
    ZA.includes(n) || delete e[n];
  }
}
const Ju = Ft({ txid: Tt(32, !0), index: ft });
function vk(e) {
  if (typeof e != "number" || typeof xk[e] != "string")
    throw new Error(`Invalid SigHash=${e}`);
  return e;
}
function cg(e) {
  const t = e & 31;
  return {
    isAny: !!(e & ct.ANYONECANPAY),
    isNone: t === ct.NONE,
    isSingle: t === ct.SINGLE
  };
}
function Ak(e) {
  if (e !== void 0 && {}.toString.call(e) !== "[object Object]")
    throw new Error(`Wrong object type for transaction options: ${e}`);
  const t = {
    ...e,
    // Defaults
    version: Ps(e.version, Tk),
    lockTime: Ps(e.lockTime, 0),
    PSBTVersion: Ps(e.PSBTVersion, 0)
  };
  if (typeof t.allowUnknowInput < "u" && (e.allowUnknownInputs = t.allowUnknowInput), typeof t.allowUnknowOutput < "u" && (e.allowUnknownOutputs = t.allowUnknowOutput), typeof t.lockTime != "number")
    throw new Error("Transaction lock time should be number");
  if (ft.encode(t.lockTime), t.PSBTVersion !== 0 && t.PSBTVersion !== 2)
    throw new Error(`Unknown PSBT version ${t.PSBTVersion}`);
  for (const n of [
    "allowUnknownVersion",
    "allowUnknownOutputs",
    "allowUnknownInputs",
    "disableScriptCheck",
    "bip174jsCompat",
    "allowLegacyWitnessUtxo",
    "lowR"
  ]) {
    const r = t[n];
    if (r !== void 0 && typeof r != "boolean")
      throw new Error(`Transation options wrong type: ${n}=${r} (${typeof r})`);
  }
  if (t.allowUnknownVersion ? typeof t.version == "number" : ![-1, 0, 1, 2, 3].includes(t.version))
    throw new Error(`Unknown version: ${t.version}`);
  if (t.customScripts !== void 0) {
    const n = t.customScripts;
    if (!Array.isArray(n))
      throw new Error(`wrong custom scripts type (expected array): customScripts=${n} (${typeof n})`);
    for (const r of n) {
      if (typeof r.encode != "function" || typeof r.decode != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
      if (r.finalizeTaproot !== void 0 && typeof r.finalizeTaproot != "function")
        throw new Error(`wrong script=${r} (${typeof r})`);
    }
  }
  return Object.freeze(t);
}
function ug(e) {
  if (e.nonWitnessUtxo && e.index !== void 0) {
    const t = e.nonWitnessUtxo.outputs.length - 1;
    if (e.index > t)
      throw new Error(`validateInput: index(${e.index}) not in nonWitnessUtxo`);
    const n = e.nonWitnessUtxo.outputs[e.index];
    if (e.witnessUtxo && (!Ct(e.witnessUtxo.script, n.script) || e.witnessUtxo.amount !== n.amount))
      throw new Error("validateInput: witnessUtxo different from nonWitnessUtxo");
    if (e.txid) {
      if (e.nonWitnessUtxo.outputs.length - 1 < e.index)
        throw new Error("nonWitnessUtxo: incorect output index");
      const i = He.fromRaw(vi.encode(e.nonWitnessUtxo), {
        allowUnknownOutputs: !0,
        disableScriptCheck: !0,
        allowUnknownInputs: !0
      }), s = _.encode(e.txid);
      if (i.isFinal && i.id !== s)
        throw new Error(`nonWitnessUtxo: wrong txid, exp=${s} got=${i.id}`);
    }
  }
  return e;
}
function ea(e) {
  if (e.nonWitnessUtxo) {
    if (e.index === void 0)
      throw new Error("Unknown input index");
    return e.nonWitnessUtxo.outputs[e.index];
  } else {
    if (e.witnessUtxo)
      return e.witnessUtxo;
    throw new Error("Cannot find previous output info");
  }
}
function lg(e, t, n, r = !1, i = !1) {
  let { nonWitnessUtxo: s, txid: o } = e;
  typeof s == "string" && (s = _.decode(s)), wt(s) && (s = vi.decode(s)), !("nonWitnessUtxo" in e) && s === void 0 && (s = t?.nonWitnessUtxo), typeof o == "string" && (o = _.decode(o)), o === void 0 && (o = t?.txid);
  let a = { ...t, ...e, nonWitnessUtxo: s, txid: o };
  !("nonWitnessUtxo" in e) && a.nonWitnessUtxo === void 0 && delete a.nonWitnessUtxo, a.sequence === void 0 && (a.sequence = Ld), a.tapMerkleRoot === null && delete a.tapMerkleRoot, a = df(Hc, a, t, n, i), Ud.encode(a);
  let c;
  return a.nonWitnessUtxo && a.index !== void 0 ? c = a.nonWitnessUtxo.outputs[a.index] : a.witnessUtxo && (c = a.witnessUtxo), c && !r && Yb(c && c.script, a.redeemScript, a.witnessScript), a;
}
function fg(e, t = !1) {
  let n = "legacy", r = ct.ALL;
  const i = ea(e), s = At.decode(i.script);
  let o = s.type, a = s;
  const c = [s];
  if (s.type === "tr")
    return r = ct.DEFAULT, {
      txType: "taproot",
      type: "tr",
      last: s,
      lastScript: i.script,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
  {
    if ((s.type === "wpkh" || s.type === "wsh") && (n = "segwit"), s.type === "sh") {
      if (!e.redeemScript)
        throw new Error("inputType: sh without redeemScript");
      let h = At.decode(e.redeemScript);
      (h.type === "wpkh" || h.type === "wsh") && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    if (a.type === "wsh") {
      if (!e.witnessScript)
        throw new Error("inputType: wsh without witnessScript");
      let h = At.decode(e.witnessScript);
      h.type === "wsh" && (n = "segwit"), c.push(h), a = h, o += `-${h.type}`;
    }
    const u = c[c.length - 1];
    if (u.type === "sh" || u.type === "wsh")
      throw new Error("inputType: sh/wsh cannot be terminal type");
    const l = At.encode(u), f = {
      type: o,
      txType: n,
      last: u,
      lastScript: l,
      defaultSighash: r,
      sighash: e.sighashType || r
    };
    if (n === "legacy" && !t && !e.nonWitnessUtxo)
      throw new Error("Transaction/sign: legacy input without nonWitnessUtxo, can result in attack that forces paying higher fees. Pass allowLegacyWitnessUtxo=true, if you sure");
    return f;
  }
}
let He = class na {
  global = {};
  inputs = [];
  // use getInput()
  outputs = [];
  // use getOutput()
  opts;
  constructor(t = {}) {
    const n = this.opts = Ak(t);
    n.lockTime !== Br && (this.global.fallbackLocktime = n.lockTime), this.global.txVersion = n.version;
  }
  // Import
  static fromRaw(t, n = {}) {
    const r = vi.decode(t), i = new na({ ...n, version: r.version, lockTime: r.lockTime });
    for (const s of r.outputs)
      i.addOutput(s);
    if (i.outputs = r.outputs, i.inputs = r.inputs, r.witnesses)
      for (let s = 0; s < r.witnesses.length; s++)
        i.inputs[s].finalScriptWitness = r.witnesses[s];
    return i;
  }
  // PSBT
  static fromPSBT(t, n = {}) {
    let r;
    try {
      r = ig.decode(t);
    } catch (f) {
      try {
        r = sg.decode(t);
      } catch {
        throw f;
      }
    }
    const i = r.global.version || 0;
    if (i !== 0 && i !== 2)
      throw new Error(`Wrong PSBT version=${i}`);
    const s = r.global.unsignedTx, o = i === 0 ? s?.version : r.global.txVersion, a = i === 0 ? s?.lockTime : r.global.fallbackLocktime, c = new na({ ...n, version: o, lockTime: a, PSBTVersion: i }), u = i === 0 ? s?.inputs.length : r.global.inputCount;
    c.inputs = r.inputs.slice(0, u).map((f, h) => ug({
      finalScriptSig: St,
      ...r.global.unsignedTx?.inputs[h],
      ...f
    }));
    const l = i === 0 ? s?.outputs.length : r.global.outputCount;
    return c.outputs = r.outputs.slice(0, l).map((f, h) => ({
      ...f,
      ...r.global.unsignedTx?.outputs[h]
    })), c.global = { ...r.global, txVersion: o }, a !== Br && (c.global.fallbackLocktime = a), c;
  }
  toPSBT(t = this.opts.PSBTVersion) {
    if (t !== 0 && t !== 2)
      throw new Error(`Wrong PSBT version=${t}`);
    const n = this.inputs.map((s) => ug(rg(t, Hc, s)));
    for (const s of n)
      s.partialSig && !s.partialSig.length && delete s.partialSig, s.finalScriptSig && !s.finalScriptSig.length && delete s.finalScriptSig, s.finalScriptWitness && !s.finalScriptWitness.length && delete s.finalScriptWitness;
    const r = this.outputs.map((s) => rg(t, Xs, s)), i = { ...this.global };
    return t === 0 ? (i.unsignedTx = ws.decode(ws.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(fs).map((s) => ({
        ...s,
        finalScriptSig: St
      })),
      outputs: this.outputs.map(Nr)
    })), delete i.fallbackLocktime, delete i.txVersion) : (i.version = t, i.txVersion = this.version, i.inputCount = this.inputs.length, i.outputCount = this.outputs.length, i.fallbackLocktime && i.fallbackLocktime === Br && delete i.fallbackLocktime), this.opts.bip174jsCompat && (n.length || n.push({}), r.length || r.push({})), (t === 0 ? ig : sg).encode({
      global: i,
      inputs: n,
      outputs: r
    });
  }
  // BIP370 lockTime (https://github.com/bitcoin/bips/blob/master/bip-0370.mediawiki#determining-lock-time)
  get lockTime() {
    let t = Br, n = 0, r = Br, i = 0;
    for (const s of this.inputs)
      s.requiredHeightLocktime && (t = Math.max(t, s.requiredHeightLocktime), n++), s.requiredTimeLocktime && (r = Math.max(r, s.requiredTimeLocktime), i++);
    return n && n >= i ? t : r !== Br ? r : this.global.fallbackLocktime || Br;
  }
  get version() {
    if (this.global.txVersion === void 0)
      throw new Error("No global.txVersion");
    return this.global.txVersion;
  }
  inputStatus(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t];
    return n.finalScriptSig && n.finalScriptSig.length || n.finalScriptWitness && n.finalScriptWitness.length ? "finalized" : n.tapKeySig || n.tapScriptSig && n.tapScriptSig.length || n.partialSig && n.partialSig.length ? "signed" : "unsigned";
  }
  // Cannot replace unpackSighash, tests rely on very generic implemenetation with signing inputs outside of range
  // We will lose some vectors -> smaller test coverage of preimages (very important!)
  inputSighash(t) {
    this.checkInputIdx(t);
    const n = this.inputs[t].sighashType, r = n === void 0 ? ct.DEFAULT : n, i = r === ct.DEFAULT ? ct.ALL : r & 3;
    return { sigInputs: r & ct.ANYONECANPAY, sigOutputs: i };
  }
  // Very nice for debug purposes, but slow. If there is too much inputs/outputs to add, will be quadratic.
  // Some cache will be nice, but there chance to have bugs with cache invalidation
  signStatus() {
    let t = !0, n = !0, r = [], i = [];
    for (let s = 0; s < this.inputs.length; s++) {
      if (this.inputStatus(s) === "unsigned")
        continue;
      const { sigInputs: a, sigOutputs: c } = this.inputSighash(s);
      if (a === ct.ANYONECANPAY ? r.push(s) : t = !1, c === ct.ALL)
        n = !1;
      else if (c === ct.SINGLE)
        i.push(s);
      else if (c !== ct.NONE) throw new Error(`Wrong signature hash output type: ${c}`);
    }
    return { addInput: t, addOutput: n, inputs: r, outputs: i };
  }
  get isFinal() {
    for (let t = 0; t < this.inputs.length; t++)
      if (this.inputStatus(t) !== "finalized")
        return !1;
    return !0;
  }
  // Info utils
  get hasWitnesses() {
    let t = !1;
    for (const n of this.inputs)
      n.finalScriptWitness && n.finalScriptWitness.length && (t = !0);
    return t;
  }
  // https://en.bitcoin.it/wiki/Weight_units
  get weight() {
    if (!this.isFinal)
      throw new Error("Transaction is not finalized");
    let t = 32;
    const n = this.outputs.map(Nr);
    t += 4 * qe.encode(this.outputs.length).length;
    for (const r of n)
      t += 32 + 4 * Ve.encode(r.script).length;
    this.hasWitnesses && (t += 2), t += 4 * qe.encode(this.inputs.length).length;
    for (const r of this.inputs)
      t += 160 + 4 * Ve.encode(r.finalScriptSig || St).length, this.hasWitnesses && r.finalScriptWitness && (t += Zs.encode(r.finalScriptWitness).length);
    return t;
  }
  get vsize() {
    return bk(this.weight);
  }
  toBytes(t = !1, n = !1) {
    return vi.encode({
      version: this.version,
      lockTime: this.lockTime,
      inputs: this.inputs.map(fs).map((r) => ({
        ...r,
        finalScriptSig: t && r.finalScriptSig || St
      })),
      outputs: this.outputs.map(Nr),
      witnesses: this.inputs.map((r) => r.finalScriptWitness || []),
      segwitFlag: n && this.hasWitnesses
    });
  }
  get unsignedTx() {
    return this.toBytes(!1, !1);
  }
  get hex() {
    return _.encode(this.toBytes(!0, this.hasWitnesses));
  }
  get hash() {
    return _.encode(Yn(this.toBytes(!0)));
  }
  get id() {
    return _.encode(Yn(this.toBytes(!0)).reverse());
  }
  // Input stuff
  checkInputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.inputs.length)
      throw new Error(`Wrong input index=${t}`);
  }
  getInput(t) {
    return this.checkInputIdx(t), Ja(this.inputs[t]);
  }
  get inputsLength() {
    return this.inputs.length;
  }
  // Modification
  addInput(t, n = !1) {
    if (!n && !this.signStatus().addInput)
      throw new Error("Tx has signed inputs, cannot add new one");
    return this.inputs.push(lg(t, void 0, void 0, this.opts.disableScriptCheck)), this.inputs.length - 1;
  }
  updateInput(t, n, r = !1) {
    this.checkInputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addInput || s.inputs.includes(t)) && (i = XA);
    }
    this.inputs[t] = lg(n, this.inputs[t], i, this.opts.disableScriptCheck, this.opts.allowUnknown);
  }
  // Output stuff
  checkOutputIdx(t) {
    if (!Number.isSafeInteger(t) || 0 > t || t >= this.outputs.length)
      throw new Error(`Wrong output index=${t}`);
  }
  getOutput(t) {
    return this.checkOutputIdx(t), Ja(this.outputs[t]);
  }
  getOutputAddress(t, n = zi) {
    const r = this.getOutput(t);
    if (r.script)
      return Sr(n).encode(At.decode(r.script));
  }
  get outputsLength() {
    return this.outputs.length;
  }
  normalizeOutput(t, n, r) {
    let { amount: i, script: s } = t;
    if (i === void 0 && (i = n?.amount), typeof i != "bigint")
      throw new Error(`Wrong amount type, should be of type bigint in sats, but got ${i} of type ${typeof i}`);
    typeof s == "string" && (s = _.decode(s)), s === void 0 && (s = n?.script);
    let o = { ...n, ...t, amount: i, script: s };
    if (o.amount === void 0 && delete o.amount, o = df(Xs, o, n, r, this.opts.allowUnknown), _d.encode(o), o.script && !this.opts.allowUnknownOutputs && At.decode(o.script).type === "unknown")
      throw new Error("Transaction/output: unknown output script type, there is a chance that input is unspendable. Pass allowUnknownOutputs=true, if you sure");
    return this.opts.disableScriptCheck || Yb(o.script, o.redeemScript, o.witnessScript), o;
  }
  addOutput(t, n = !1) {
    if (!n && !this.signStatus().addOutput)
      throw new Error("Tx has signed outputs, cannot add new one");
    return this.outputs.push(this.normalizeOutput(t)), this.outputs.length - 1;
  }
  updateOutput(t, n, r = !1) {
    this.checkOutputIdx(t);
    let i;
    if (!r) {
      const s = this.signStatus();
      (!s.addOutput || s.outputs.includes(t)) && (i = QA);
    }
    this.outputs[t] = this.normalizeOutput(n, this.outputs[t], i);
  }
  addOutputAddress(t, n, r = zi) {
    return this.addOutput({ script: At.encode(Sr(r).decode(t)), amount: n });
  }
  // Utils
  get fee() {
    let t = 0n;
    for (const r of this.inputs) {
      const i = ea(r);
      if (!i)
        throw new Error("Empty input amount");
      t += i.amount;
    }
    const n = this.outputs.map(Nr);
    for (const r of n)
      t -= r.amount;
    return t;
  }
  // Signing
  // Based on https://github.com/bitcoin/bitcoin/blob/5871b5b5ab57a0caf9b7514eb162c491c83281d5/test/functional/test_framework/script.py#L624
  // There is optimization opportunity to re-use hashes for multiple inputs for witness v0/v1,
  // but we are trying to be less complicated for audit purpose for now.
  preimageLegacy(t, n, r) {
    const { isAny: i, isNone: s, isSingle: o } = cg(r);
    if (t < 0 || !Number.isSafeInteger(t))
      throw new Error(`Invalid input idx=${t}`);
    if (o && t >= this.outputs.length || t >= this.inputs.length)
      return Db.encode(1n);
    n = nt.encode(nt.decode(n).filter((l) => l !== "CODESEPARATOR"));
    let a = this.inputs.map(fs).map((l, f) => ({
      ...l,
      finalScriptSig: f === t ? n : St
    }));
    i ? a = [a[t]] : (s || o) && (a = a.map((l, f) => ({
      ...l,
      sequence: f === t ? l.sequence : 0
    })));
    let c = this.outputs.map(Nr);
    s ? c = [] : o && (c = c.slice(0, t).fill(mk).concat([c[t]]));
    const u = vi.encode({
      lockTime: this.lockTime,
      version: this.version,
      segwitFlag: !1,
      inputs: a,
      outputs: c
    });
    return Yn(u, pi.encode(r));
  }
  preimageWitnessV0(t, n, r, i) {
    const { isAny: s, isNone: o, isSingle: a } = cg(r);
    let c = Ro, u = Ro, l = Ro;
    const f = this.inputs.map(fs), h = this.outputs.map(Nr);
    s || (c = Yn(...f.map(Ju.encode))), !s && !a && !o && (u = Yn(...f.map((y) => ft.encode(y.sequence)))), !a && !o ? l = Yn(...h.map(jr.encode)) : a && t < h.length && (l = Yn(jr.encode(h[t])));
    const p = f[t];
    return Yn(pi.encode(this.version), c, u, Tt(32, !0).encode(p.txid), ft.encode(p.index), Ve.encode(n), ta.encode(i), ft.encode(p.sequence), l, ft.encode(this.lockTime), ft.encode(r));
  }
  preimageWitnessV1(t, n, r, i, s = -1, o, a = 192, c) {
    if (!Array.isArray(i) || this.inputs.length !== i.length)
      throw new Error(`Invalid amounts array=${i}`);
    if (!Array.isArray(n) || this.inputs.length !== n.length)
      throw new Error(`Invalid prevOutScript array=${n}`);
    const u = [
      lr.encode(0),
      lr.encode(r),
      // U8 sigHash
      pi.encode(this.version),
      ft.encode(this.lockTime)
    ], l = r === ct.DEFAULT ? ct.ALL : r & 3, f = r & ct.ANYONECANPAY, h = this.inputs.map(fs), p = this.outputs.map(Nr);
    f !== ct.ANYONECANPAY && u.push(...[
      h.map(Ju.encode),
      i.map(ta.encode),
      n.map(Ve.encode),
      h.map((d) => ft.encode(d.sequence))
    ].map((d) => jt(nr(...d)))), l === ct.ALL && u.push(jt(nr(...p.map(jr.encode))));
    const y = (c ? 1 : 0) | (o ? 2 : 0);
    if (u.push(new Uint8Array([y])), f === ct.ANYONECANPAY) {
      const d = h[t];
      u.push(Ju.encode(d), ta.encode(i[t]), Ve.encode(n[t]), ft.encode(d.sequence));
    } else
      u.push(ft.encode(t));
    return y & 1 && u.push(jt(Ve.encode(c || St))), l === ct.SINGLE && u.push(t < p.length ? jt(jr.encode(p[t])) : Ro), o && u.push(Ns(o, a), lr.encode(0), pi.encode(s)), Od("TapSighash", ...u);
  }
  // Signer can be privateKey OR instance of bip32 HD stuff
  signIdx(t, n, r, i) {
    this.checkInputIdx(n);
    const s = this.inputs[n], o = fg(s, this.opts.allowLegacyWitnessUtxo);
    if (!wt(t)) {
      if (!s.bip32Derivation || !s.bip32Derivation.length)
        throw new Error("bip32Derivation: empty");
      const l = s.bip32Derivation.filter((h) => h[1].fingerprint == t.fingerprint).map(([h, { path: p }]) => {
        let y = t;
        for (const d of p)
          y = y.deriveChild(d);
        if (!Ct(y.publicKey, h))
          throw new Error("bip32Derivation: wrong pubKey");
        if (!y.privateKey)
          throw new Error("bip32Derivation: no privateKey");
        return y;
      });
      if (!l.length)
        throw new Error(`bip32Derivation: no items with fingerprint=${t.fingerprint}`);
      let f = !1;
      for (const h of l)
        this.signIdx(h.privateKey, n) && (f = !0);
      return f;
    }
    r ? r.forEach(vk) : r = [o.defaultSighash];
    const a = o.sighash;
    if (!r.includes(a))
      throw new Error(`Input with not allowed sigHash=${a}. Allowed: ${r.join(", ")}`);
    const { sigOutputs: c } = this.inputSighash(n);
    if (c === ct.SINGLE && n >= this.outputs.length)
      throw new Error(`Input with sighash SINGLE, but there is no output with corresponding index=${n}`);
    const u = ea(s);
    if (o.txType === "taproot") {
      const l = this.inputs.map(ea), f = l.map((g) => g.script), h = l.map((g) => g.amount);
      let p = !1, y = Fb(t), d = s.tapMerkleRoot || St;
      if (s.tapInternalKey) {
        const { pubKey: g, privKey: m } = Sk(t, y, s.tapInternalKey, d), [v] = uf(s.tapInternalKey, d);
        if (Ct(v, g)) {
          const k = this.preimageWitnessV1(n, f, a, h), C = nr(Qp(k, m, i), a !== ct.DEFAULT ? new Uint8Array([a]) : St);
          this.updateInput(n, { tapKeySig: C }, !0), p = !0;
        }
      }
      if (s.tapLeafScript) {
        s.tapScriptSig = s.tapScriptSig || [];
        for (const [g, m] of s.tapLeafScript) {
          const v = m.subarray(0, -1), k = nt.decode(v), C = m[m.length - 1], L = Ns(v, C);
          if (k.findIndex((D) => wt(D) && Ct(D, y)) === -1)
            continue;
          const b = this.preimageWitnessV1(n, f, a, h, void 0, v, C), Y = nr(Qp(b, t, i), a !== ct.DEFAULT ? new Uint8Array([a]) : St);
          this.updateInput(n, { tapScriptSig: [[{ pubKey: y, leafHash: L }, Y]] }, !0), p = !0;
        }
      }
      if (!p)
        throw new Error("No taproot scripts signed");
      return !0;
    } else {
      const l = VA(t);
      let f = !1;
      const h = Hb(l);
      for (const d of nt.decode(o.lastScript))
        wt(d) && (Ct(d, l) || Ct(d, h)) && (f = !0);
      if (!f)
        throw new Error(`Input script doesn't have pubKey: ${o.lastScript}`);
      let p;
      if (o.txType === "legacy")
        p = this.preimageLegacy(n, o.lastScript, a);
      else if (o.txType === "segwit") {
        let d = o.lastScript;
        o.last.type === "wpkh" && (d = At.encode({ type: "pkh", hash: o.last.hash })), p = this.preimageWitnessV0(n, d, a, u.amount);
      } else
        throw new Error(`Transaction/sign: unknown tx type: ${o.txType}`);
      const y = MA(p, t, this.opts.lowR);
      this.updateInput(n, {
        partialSig: [[l, nr(y, new Uint8Array([a]))]]
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
  sign(t, n, r) {
    let i = 0;
    for (let s = 0; s < this.inputs.length; s++)
      try {
        this.signIdx(t, s, n, r) && i++;
      } catch {
      }
    if (!i)
      throw new Error("No inputs signed");
    return i;
  }
  finalizeIdx(t) {
    if (this.checkInputIdx(t), this.fee < 0n)
      throw new Error("Outputs spends more than inputs amount");
    const n = this.inputs[t], r = fg(n, this.opts.allowLegacyWitnessUtxo);
    if (r.txType === "taproot") {
      if (n.tapKeySig)
        n.finalScriptWitness = [n.tapKeySig];
      else if (n.tapLeafScript && n.tapScriptSig) {
        const c = n.tapLeafScript.sort((u, l) => pn.encode(u[0]).length - pn.encode(l[0]).length);
        for (const [u, l] of c) {
          const f = l.slice(0, -1), h = l[l.length - 1], p = At.decode(f), y = Ns(f, h), d = n.tapScriptSig.filter((m) => Ct(m[0].leafHash, y));
          let g = [];
          if (p.type === "tr_ms") {
            const m = p.m, v = p.pubkeys;
            let k = 0;
            for (const C of v) {
              const L = d.findIndex((G) => Ct(G[0].pubKey, C));
              if (k === m || L === -1) {
                g.push(St);
                continue;
              }
              g.push(d[L][1]), k++;
            }
            if (k !== m)
              continue;
          } else if (p.type === "tr_ns") {
            for (const m of p.pubkeys) {
              const v = d.findIndex((k) => Ct(k[0].pubKey, m));
              v !== -1 && g.push(d[v][1]);
            }
            if (g.length !== p.pubkeys.length)
              continue;
          } else if (p.type === "unknown" && this.opts.allowUnknownInputs) {
            const m = nt.decode(f);
            if (g = d.map(([{ pubKey: v }, k]) => {
              const C = m.findIndex((L) => wt(L) && Ct(L, v));
              if (C === -1)
                throw new Error("finalize/taproot: cannot find position of pubkey in script");
              return { signature: k, pos: C };
            }).sort((v, k) => v.pos - k.pos).map((v) => v.signature), !g.length)
              continue;
          } else {
            const m = this.opts.customScripts;
            if (m)
              for (const v of m) {
                if (!v.finalizeTaproot)
                  continue;
                const k = nt.decode(f), C = v.encode(k);
                if (C === void 0)
                  continue;
                const L = v.finalizeTaproot(f, C, d);
                if (L) {
                  n.finalScriptWitness = L.concat(pn.encode(u)), n.finalScriptSig = St, Qu(n);
                  return;
                }
              }
            throw new Error("Finalize: Unknown tapLeafScript");
          }
          n.finalScriptWitness = g.reverse().concat([f, pn.encode(u)]);
          break;
        }
        if (!n.finalScriptWitness)
          throw new Error("finalize/taproot: empty witness");
      } else
        throw new Error("finalize/taproot: unknown input");
      n.finalScriptSig = St, Qu(n);
      return;
    }
    if (!n.partialSig || !n.partialSig.length)
      throw new Error("Not enough partial sign");
    let i = St, s = [];
    if (r.last.type === "ms") {
      const c = r.last.m, u = r.last.pubkeys;
      let l = [];
      for (const f of u) {
        const h = n.partialSig.find((p) => Ct(f, p[0]));
        h && l.push(h[1]);
      }
      if (l = l.slice(0, c), l.length !== c)
        throw new Error(`Multisig: wrong signatures count, m=${c} n=${u.length} signatures=${l.length}`);
      i = nt.encode([0, ...l]);
    } else if (r.last.type === "pk")
      i = nt.encode([n.partialSig[0][1]]);
    else if (r.last.type === "pkh")
      i = nt.encode([n.partialSig[0][1], n.partialSig[0][0]]);
    else if (r.last.type === "wpkh")
      i = St, s = [n.partialSig[0][1], n.partialSig[0][0]];
    else if (r.last.type === "unknown" && !this.opts.allowUnknownInputs)
      throw new Error("Unknown inputs not allowed");
    let o, a;
    if (r.type.includes("wsh-") && (i.length && r.lastScript.length && (s = nt.decode(i).map((c) => {
      if (c === 0)
        return St;
      if (wt(c))
        return c;
      throw new Error(`Wrong witness op=${c}`);
    })), s = s.concat(r.lastScript)), r.txType === "segwit" && (a = s), r.type.startsWith("sh-wsh-") ? o = nt.encode([nt.encode([0, jt(r.lastScript)])]) : r.type.startsWith("sh-") ? o = nt.encode([...nt.decode(i), r.lastScript]) : r.type.startsWith("wsh-") || r.txType !== "segwit" && (o = i), !o && !a)
      throw new Error("Unknown error finalizing input");
    o && (n.finalScriptSig = o), a && (n.finalScriptWitness = a), Qu(n);
  }
  finalize() {
    for (let t = 0; t < this.inputs.length; t++)
      this.finalizeIdx(t);
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
  combine(t) {
    for (const i of ["PSBTVersion", "version", "lockTime"])
      if (this.opts[i] !== t.opts[i])
        throw new Error(`Transaction/combine: different ${i} this=${this.opts[i]} other=${t.opts[i]}`);
    for (const i of ["inputs", "outputs"])
      if (this[i].length !== t[i].length)
        throw new Error(`Transaction/combine: different ${i} length this=${this[i].length} other=${t[i].length}`);
    const n = this.global.unsignedTx ? ws.encode(this.global.unsignedTx) : St, r = t.global.unsignedTx ? ws.encode(t.global.unsignedTx) : St;
    if (!Ct(n, r))
      throw new Error("Transaction/combine: different unsigned tx");
    this.global = df(Pd, this.global, t.global, void 0, this.opts.allowUnknown);
    for (let i = 0; i < this.inputs.length; i++)
      this.updateInput(i, t.inputs[i], !0);
    for (let i = 0; i < this.outputs.length; i++)
      this.updateOutput(i, t.outputs[i], !0);
    return this;
  }
  clone() {
    return na.fromPSBT(this.toPSBT(this.opts.PSBTVersion), this.opts);
  }
};
class vr extends He {
  constructor(t) {
    super(tl(t));
  }
  static fromPSBT(t, n) {
    return He.fromPSBT(t, tl(n));
  }
  static fromRaw(t, n) {
    return He.fromRaw(t, tl(n));
  }
}
vr.ARK_TX_OPTS = {
  allowUnknown: !0,
  allowUnknownOutputs: !0,
  allowUnknownInputs: !0
};
function tl(e) {
  return { ...vr.ARK_TX_OPTS, ...e };
}
class kk extends Error {
  idx;
  // Indice of participant
  constructor(t, n) {
    super(n), this.idx = t;
  }
}
const { taggedHash: Jb } = Tn.utils, ri = sr.Point, ve = ri.Fn, Ar = sr.lengths.publicKey, yf = new Uint8Array(Ar), dg = xr(Tt(33), {
  decode: (e) => t0(e) ? yf : e.toBytes(!0),
  encode: (e) => gd(e, yf) ? ri.ZERO : ri.fromBytes(e)
}), hg = oe(Db, (e) => (eb("n", e, 1n, ve.ORDER), e));
Ft({ R1: dg, R2: dg });
Ft({ k1: hg, k2: hg, publicKey: Tt(Ar) });
function Js(e, ...t) {
  if (!Array.isArray(e))
    throw new Error("expected array");
  e.forEach((n) => ut(n, ...t));
}
const Ik = (e, ...t) => ve.create(ve.fromBytes(Jb(e, ...t), !0));
function $k(e) {
  return ri.BASE.multiply(e);
}
function t0(e) {
  return e.equals(ri.ZERO);
}
function Ck(e) {
  return Js(e, Ar), e.sort(Za);
}
function Ok(e) {
  Js(e, Ar);
  for (let t = 1; t < e.length; t++)
    if (!gd(e[t], e[0]))
      return e[t];
  return yf;
}
function Bk(e) {
  return Js(e, Ar), Jb("KeyAgg list", ...e);
}
function Nk(e, t, n) {
  return ut(e, Ar), ut(t, Ar), gd(e, t) ? 1n : Ik("KeyAgg coefficient", n, e);
}
function pg(e, t = [], n = []) {
  if (Js(e, Ar), Js(t, 32), t.length !== n.length)
    throw new Error("The tweaks and isXonly arrays must have the same length");
  const r = Ok(e), i = Bk(e);
  let s = ri.ZERO;
  for (let c = 0; c < e.length; c++) {
    let u;
    try {
      u = ri.fromBytes(e[c]);
    } catch {
      throw new kk(c, "pubkey");
    }
    s = s.add(u.multiply(Nk(e[c], r, i)));
  }
  let o = ve.ONE, a = ve.ZERO;
  for (let c = 0; c < t.length; c++) {
    const u = n[c] && !Cd(s.y) ? ve.neg(ve.ONE) : ve.ONE, l = ve.fromBytes(t[c]);
    if (s = s.multiply(u).add($k(l)), t0(s))
      throw new Error("The result of tweaking cannot be infinity");
    o = ve.mul(u, o), a = ve.add(l, ve.mul(u, a));
  }
  return { aggPublicKey: s, gAcc: o, tweakAcc: a };
}
function Pk(e, t, n = {}) {
  e = Ck(e);
  const { aggPublicKey: r } = pg(e);
  if (!n.taprootTweak)
    return {
      preTweakedKey: r.toBytes(!0),
      finalKey: r.toBytes(!0)
    };
  const i = Tn.utils.taggedHash("TapTweak", r.toBytes(!0).subarray(1), n.taprootTweak ?? new Uint8Array(0)), { aggPublicKey: s } = pg(e, [i], [!0]);
  return {
    preTweakedKey: r.toBytes(!0),
    finalKey: s.toBytes(!0)
  };
}
var el, gg;
function Rk() {
  if (gg) return el;
  gg = 1;
  const e = 4294967295, t = 1 << 31, n = 9, r = 65535, i = 1 << 22, s = r, o = 1 << n, a = r << n;
  function c(l) {
    return l & t ? {} : l & i ? {
      seconds: (l & r) << n
    } : {
      blocks: l & r
    };
  }
  function u({ blocks: l, seconds: f }) {
    if (l !== void 0 && f !== void 0) throw new TypeError("Cannot encode blocks AND seconds");
    if (l === void 0 && f === void 0) return e;
    if (f !== void 0) {
      if (!Number.isFinite(f)) throw new TypeError("Expected Number seconds");
      if (f > a) throw new TypeError("Expected Number seconds <= " + a);
      if (f % o !== 0) throw new TypeError("Expected Number seconds as a multiple of " + o);
      return i | f >> n;
    }
    if (!Number.isFinite(l)) throw new TypeError("Expected Number blocks");
    if (l > r) throw new TypeError("Expected Number blocks <= " + s);
    return l;
  }
  return el = { decode: c, encode: u }, el;
}
var to = Rk(), ye;
(function(e) {
  e.VtxoTaprootTree = "taptree", e.VtxoTreeExpiry = "expiry", e.Cosigner = "cosigner", e.ConditionWitness = "condition";
})(ye || (ye = {}));
const Dd = 222;
function Uk(e, t, n, r) {
  e.updateInput(t, {
    unknown: [
      ...e.getInput(t)?.unknown ?? [],
      n.encode(r)
    ]
  });
}
function _k(e, t, n) {
  const r = e.getInput(t)?.unknown ?? [], i = [];
  for (const s of r) {
    const o = n.decode(s);
    o && i.push(o);
  }
  return i;
}
const e0 = {
  key: ye.VtxoTaprootTree,
  encode: (e) => [
    {
      type: Dd,
      key: Fc[ye.VtxoTaprootTree]
    },
    e
  ],
  decode: (e) => Vd(() => Md(e[0], ye.VtxoTaprootTree) ? e[1] : null)
}, Lk = {
  key: ye.ConditionWitness,
  encode: (e) => [
    {
      type: Dd,
      key: Fc[ye.ConditionWitness]
    },
    Zs.encode(e)
  ],
  decode: (e) => Vd(() => Md(e[0], ye.ConditionWitness) ? Zs.decode(e[1]) : null)
}, Dk = {
  key: ye.Cosigner,
  encode: (e) => [
    {
      type: Dd,
      key: new Uint8Array([
        ...Fc[ye.Cosigner],
        e.index
      ])
    },
    e.key
  ],
  decode: (e) => Vd(() => Md(e[0], ye.Cosigner) ? {
    index: e[0].key[e[0].key.length - 1],
    key: e[1]
  } : null)
};
ye.VtxoTreeExpiry;
const Fc = Object.fromEntries(Object.values(ye).map((e) => [
  e,
  new TextEncoder().encode(e)
])), Vd = (e) => {
  try {
    return e();
  } catch {
    return null;
  }
};
function Md(e, t) {
  const n = _.encode(Fc[t]);
  return _.encode(new Uint8Array([e.type, ...e.key])).includes(n);
}
Object.values(ji).filter((e) => typeof e == "number");
class Zr {
  constructor(t, n, r, i = 0) {
    if (this.serverPubKey = t, this.vtxoTaprootKey = n, this.hrp = r, this.version = i, t.length !== 32)
      throw new Error("Invalid server public key length, expected 32 bytes, got " + t.length);
    if (n.length !== 32)
      throw new Error("Invalid vtxo taproot public key length, expected 32 bytes, got " + n.length);
  }
  static decode(t) {
    const n = hi.decodeUnsafe(t, 1023);
    if (!n)
      throw new Error("Invalid address");
    const r = new Uint8Array(hi.fromWords(n.words));
    if (r.length !== 65)
      throw new Error("Invalid data length, expected 65 bytes, got " + r.length);
    const i = r[0], s = r.slice(1, 33), o = r.slice(33, 65);
    return new Zr(s, o, n.prefix, i);
  }
  encode() {
    const t = new Uint8Array(65);
    t[0] = this.version, t.set(this.serverPubKey, 1), t.set(this.vtxoTaprootKey, 33);
    const n = hi.toWords(t);
    return hi.encode(this.hrp, n, 1023);
  }
  // pkScript is the script that should be used to send non-dust funds to the address
  get pkScript() {
    return nt.encode(["OP_1", this.vtxoTaprootKey]);
  }
  // subdustPkScript is the script that should be used to send sub-dust funds to the address
  get subdustPkScript() {
    return nt.encode(["RETURN", this.vtxoTaprootKey]);
  }
}
const tc = Nd(void 0, !0);
var Nt;
(function(e) {
  e.Multisig = "multisig", e.CSVMultisig = "csv-multisig", e.ConditionCSVMultisig = "condition-csv-multisig", e.ConditionMultisig = "condition-multisig", e.CLTVMultisig = "cltv-multisig";
})(Nt || (Nt = {}));
function n0(e) {
  const t = [
    Xe,
    we,
    eo,
    ec,
    Gi
  ];
  for (const n of t)
    try {
      return n.decode(e);
    } catch {
      continue;
    }
  throw new Error(`Failed to decode: script ${_.encode(e)} is not a valid tapscript`);
}
var Xe;
(function(e) {
  let t;
  (function(a) {
    a[a.CHECKSIG = 0] = "CHECKSIG", a[a.CHECKSIGADD = 1] = "CHECKSIGADD";
  })(t = e.MultisigType || (e.MultisigType = {}));
  function n(a) {
    if (a.pubkeys.length === 0)
      throw new Error("At least 1 pubkey is required");
    for (const u of a.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    if (a.type || (a.type = t.CHECKSIG), a.type === t.CHECKSIGADD)
      return {
        type: Nt.Multisig,
        params: a,
        script: wk(a.pubkeys.length, a.pubkeys).script
      };
    const c = [];
    for (let u = 0; u < a.pubkeys.length; u++)
      c.push(a.pubkeys[u]), u < a.pubkeys.length - 1 ? c.push("CHECKSIGVERIFY") : c.push("CHECKSIG");
    return {
      type: Nt.Multisig,
      params: a,
      script: nt.encode(c)
    };
  }
  e.encode = n;
  function r(a) {
    if (a.length === 0)
      throw new Error("Failed to decode: script is empty");
    try {
      return i(a);
    } catch {
      try {
        return s(a);
      } catch (u) {
        throw new Error(`Failed to decode script: ${u instanceof Error ? u.message : String(u)}`);
      }
    }
  }
  e.decode = r;
  function i(a) {
    const c = nt.decode(a), u = [];
    let l = !1;
    for (let h = 0; h < c.length; h++) {
      const p = c[h];
      if (typeof p != "string" && typeof p != "number") {
        if (p.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${p.length}`);
        if (u.push(p), h + 1 >= c.length || c[h + 1] !== "CHECKSIGADD" && c[h + 1] !== "CHECKSIG")
          throw new Error("Expected CHECKSIGADD or CHECKSIG after pubkey");
        h++;
        continue;
      }
      if (h === c.length - 1) {
        if (p !== "NUMEQUAL")
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
      type: t.CHECKSIGADD
    });
    if (_.encode(f.script) !== _.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIGADD },
      script: a
    };
  }
  function s(a) {
    const c = nt.decode(a), u = [];
    for (let f = 0; f < c.length; f++) {
      const h = c[f];
      if (typeof h != "string" && typeof h != "number") {
        if (h.length !== 32)
          throw new Error(`Invalid pubkey length: expected 32, got ${h.length}`);
        if (u.push(h), f + 1 >= c.length)
          throw new Error("Unexpected end of script");
        const p = c[f + 1];
        if (p !== "CHECKSIGVERIFY" && p !== "CHECKSIG")
          throw new Error("Expected CHECKSIGVERIFY or CHECKSIG after pubkey");
        if (f === c.length - 2 && p !== "CHECKSIG")
          throw new Error("Last operation must be CHECKSIG");
        f++;
        continue;
      }
    }
    if (u.length === 0)
      throw new Error("Invalid script: must have at least 1 pubkey");
    const l = n({ pubkeys: u, type: t.CHECKSIG });
    if (_.encode(l.script) !== _.encode(a))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.Multisig,
      params: { pubkeys: u, type: t.CHECKSIG },
      script: a
    };
  }
  function o(a) {
    return a.type === Nt.Multisig;
  }
  e.is = o;
})(Xe || (Xe = {}));
var we;
(function(e) {
  function t(i) {
    for (const u of i.pubkeys)
      if (u.length !== 32)
        throw new Error(`Invalid pubkey length: expected 32, got ${u.length}`);
    const s = tc.encode(BigInt(to.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) }))), o = [
      s.length === 1 ? s[0] : s,
      "CHECKSEQUENCEVERIFY",
      "DROP"
    ], a = Xe.encode(i), c = new Uint8Array([
      ...nt.encode(o),
      ...a.script
    ]);
    return {
      type: Nt.CSVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = nt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string")
      throw new Error("Invalid script: expected sequence number");
    if (s[1] !== "CHECKSEQUENCEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKSEQUENCEVERIFY DROP");
    const a = new Uint8Array(nt.encode(s.slice(3)));
    let c;
    try {
      c = Xe.decode(a);
    } catch (p) {
      throw new Error(`Invalid multisig script: ${p instanceof Error ? p.message : String(p)}`);
    }
    let u;
    typeof o == "number" ? u = o : u = Number(tc.decode(o));
    const l = to.decode(u), f = l.blocks !== void 0 ? { type: "blocks", value: BigInt(l.blocks) } : { type: "seconds", value: BigInt(l.seconds) }, h = t({
      timelock: f,
      ...c.params
    });
    if (_.encode(h.script) !== _.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.CSVMultisig,
      params: {
        timelock: f,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Nt.CSVMultisig;
  }
  e.is = r;
})(we || (we = {}));
var eo;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...nt.encode(["VERIFY"]),
      ...we.encode(i).script
    ]);
    return {
      type: Nt.ConditionCSVMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = nt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(nt.encode(s.slice(0, o))), c = new Uint8Array(nt.encode(s.slice(o + 1)));
    let u;
    try {
      u = we.decode(c);
    } catch (f) {
      throw new Error(`Invalid CSV multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (_.encode(l.script) !== _.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.ConditionCSVMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Nt.ConditionCSVMultisig;
  }
  e.is = r;
})(eo || (eo = {}));
var ec;
(function(e) {
  function t(i) {
    const s = new Uint8Array([
      ...i.conditionScript,
      ...nt.encode(["VERIFY"]),
      ...Xe.encode(i).script
    ]);
    return {
      type: Nt.ConditionMultisig,
      params: i,
      script: s
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = nt.decode(i);
    if (s.length < 1)
      throw new Error("Invalid script: too short (expected at least 1)");
    let o = -1;
    for (let f = s.length - 1; f >= 0; f--)
      s[f] === "VERIFY" && (o = f);
    if (o === -1)
      throw new Error("Invalid script: missing VERIFY operation");
    const a = new Uint8Array(nt.encode(s.slice(0, o))), c = new Uint8Array(nt.encode(s.slice(o + 1)));
    let u;
    try {
      u = Xe.decode(c);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const l = t({
      conditionScript: a,
      ...u.params
    });
    if (_.encode(l.script) !== _.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.ConditionMultisig,
      params: {
        conditionScript: a,
        ...u.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Nt.ConditionMultisig;
  }
  e.is = r;
})(ec || (ec = {}));
var Gi;
(function(e) {
  function t(i) {
    const s = tc.encode(i.absoluteTimelock), o = [
      s.length === 1 ? s[0] : s,
      "CHECKLOCKTIMEVERIFY",
      "DROP"
    ], a = nt.encode(o), c = new Uint8Array([
      ...a,
      ...Xe.encode(i).script
    ]);
    return {
      type: Nt.CLTVMultisig,
      params: i,
      script: c
    };
  }
  e.encode = t;
  function n(i) {
    if (i.length === 0)
      throw new Error("Failed to decode: script is empty");
    const s = nt.decode(i);
    if (s.length < 3)
      throw new Error("Invalid script: too short (expected at least 3)");
    const o = s[0];
    if (typeof o == "string" || typeof o == "number")
      throw new Error("Invalid script: expected locktime number");
    if (s[1] !== "CHECKLOCKTIMEVERIFY" || s[2] !== "DROP")
      throw new Error("Invalid script: expected CHECKLOCKTIMEVERIFY DROP");
    const a = new Uint8Array(nt.encode(s.slice(3)));
    let c;
    try {
      c = Xe.decode(a);
    } catch (f) {
      throw new Error(`Invalid multisig script: ${f instanceof Error ? f.message : String(f)}`);
    }
    const u = tc.decode(o), l = t({
      absoluteTimelock: u,
      ...c.params
    });
    if (_.encode(l.script) !== _.encode(i))
      throw new Error("Invalid script format: script reconstruction mismatch");
    return {
      type: Nt.CLTVMultisig,
      params: {
        absoluteTimelock: u,
        ...c.params
      },
      script: i
    };
  }
  e.decode = n;
  function r(i) {
    return i.type === Nt.CLTVMultisig;
  }
  e.is = r;
})(Gi || (Gi = {}));
const yg = Xs.tapTree[2];
function Rs(e) {
  return e[1].subarray(0, e[1].length - 1);
}
class $e {
  static decode(t) {
    const r = yg.decode(t).map((i) => i.script);
    return new $e(r);
  }
  constructor(t) {
    this.scripts = t;
    const n = t.length % 2 !== 0 ? t.slice().reverse() : t, r = Zb(n.map((s) => ({
      script: s,
      leafVersion: Qs
    }))), i = yk(Bd, r, void 0, !0);
    if (!i.tapLeafScript || i.tapLeafScript.length !== t.length)
      throw new Error("invalid scripts");
    this.leaves = i.tapLeafScript, this.tweakedPublicKey = i.tweakedPubkey;
  }
  encode() {
    return yg.encode(this.scripts.map((n) => ({
      depth: 1,
      version: Qs,
      script: n
    })));
  }
  address(t, n) {
    return new Zr(n, this.tweakedPublicKey, t);
  }
  get pkScript() {
    return nt.encode(["OP_1", this.tweakedPublicKey]);
  }
  onchainAddress(t) {
    return Sr(t).encode({
      type: "tr",
      pubkey: this.tweakedPublicKey
    });
  }
  findLeaf(t) {
    const n = this.leaves.find((r) => _.encode(Rs(r)) === t);
    if (!n)
      throw new Error(`leaf '${t}' not found`);
    return n;
  }
  exitPaths() {
    const t = [];
    for (const n of this.leaves)
      try {
        const r = we.decode(Rs(n));
        t.push(r);
        continue;
      } catch {
        try {
          const i = eo.decode(Rs(n));
          t.push(i);
        } catch {
          continue;
        }
      }
    return t;
  }
}
var wf;
(function(e) {
  class t extends $e {
    constructor(i) {
      n(i);
      const { sender: s, receiver: o, server: a, preimageHash: c, refundLocktime: u, unilateralClaimDelay: l, unilateralRefundDelay: f, unilateralRefundWithoutReceiverDelay: h } = i, p = Vk(c), y = ec.encode({
        conditionScript: p,
        pubkeys: [o, a]
      }).script, d = Xe.encode({
        pubkeys: [s, o, a]
      }).script, g = Gi.encode({
        absoluteTimelock: u,
        pubkeys: [s, a]
      }).script, m = eo.encode({
        conditionScript: p,
        timelock: l,
        pubkeys: [o]
      }).script, v = we.encode({
        timelock: f,
        pubkeys: [s, o]
      }).script, k = we.encode({
        timelock: h,
        pubkeys: [s]
      }).script;
      super([
        y,
        d,
        g,
        m,
        v,
        k
      ]), this.options = i, this.claimScript = _.encode(y), this.refundScript = _.encode(d), this.refundWithoutReceiverScript = _.encode(g), this.unilateralClaimScript = _.encode(m), this.unilateralRefundScript = _.encode(v), this.unilateralRefundWithoutReceiverScript = _.encode(k);
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
  e.Script = t;
  function n(r) {
    const { sender: i, receiver: s, server: o, preimageHash: a, refundLocktime: c, unilateralClaimDelay: u, unilateralRefundDelay: l, unilateralRefundWithoutReceiverDelay: f } = r;
    if (!a || a.length !== 20)
      throw new Error("preimage hash must be 20 bytes");
    if (!s || s.length !== 32)
      throw new Error("Invalid public key length (receiver)");
    if (!i || i.length !== 32)
      throw new Error("Invalid public key length (sender)");
    if (!o || o.length !== 32)
      throw new Error("Invalid public key length (server)");
    if (typeof c != "bigint" || c <= 0n)
      throw new Error("refund locktime must be greater than 0");
    if (!u || typeof u.value != "bigint" || u.value <= 0n)
      throw new Error("unilateral claim delay must greater than 0");
    if (u.type === "seconds" && u.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (u.type === "seconds" && u.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!l || typeof l.value != "bigint" || l.value <= 0n)
      throw new Error("unilateral refund delay must greater than 0");
    if (l.type === "seconds" && l.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (l.type === "seconds" && l.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
    if (!f || typeof f.value != "bigint" || f.value <= 0n)
      throw new Error("unilateral refund without receiver delay must greater than 0");
    if (f.type === "seconds" && f.value % 512n !== 0n)
      throw new Error("seconds timelock must be multiple of 512");
    if (f.type === "seconds" && f.value < 512n)
      throw new Error("seconds timelock must be greater or equal to 512");
  }
})(wf || (wf = {}));
function Vk(e) {
  return nt.encode(["HASH160", e, "EQUAL"]);
}
var Xr;
(function(e) {
  class t extends $e {
    constructor(r) {
      const { pubKey: i, serverPubKey: s, csvTimelock: o = t.DEFAULT_TIMELOCK } = r, a = Xe.encode({
        pubkeys: [i, s]
      }).script, c = we.encode({
        timelock: o,
        pubkeys: [i]
      }).script;
      super([a, c]), this.options = r, this.forfeitScript = _.encode(a), this.exitScript = _.encode(c);
    }
    forfeit() {
      return this.findLeaf(this.forfeitScript);
    }
    exit() {
      return this.findLeaf(this.exitScript);
    }
  }
  t.DEFAULT_TIMELOCK = {
    value: 144n,
    type: "blocks"
  }, e.Script = t;
})(Xr || (Xr = {}));
var Bn;
(function(e) {
  e.TxSent = "SENT", e.TxReceived = "RECEIVED";
})(Bn || (Bn = {}));
function ra(e) {
  return !e.isSpent;
}
function r0(e) {
  return e.virtualStatus.state === "swept" && ra(e);
}
function Mk(e) {
  if (e.virtualStatus.state === "swept")
    return !0;
  const t = e.virtualStatus.batchExpiry;
  return !t || new Date(t).getFullYear() < 2025 ? !1 : t <= Date.now();
}
function Hk(e, t) {
  return e.value < t;
}
async function* mf(e) {
  const t = [], n = [];
  let r = null, i = null;
  const s = (a) => {
    r ? (r(a), r = null) : t.push(a);
  }, o = () => {
    const a = new Error("EventSource error");
    i ? (i(a), i = null) : n.push(a);
  };
  e.addEventListener("message", s), e.addEventListener("error", o);
  try {
    for (; ; ) {
      if (t.length > 0) {
        yield t.shift();
        continue;
      }
      if (n.length > 0)
        throw n.shift();
      const a = await new Promise((c, u) => {
        r = c, i = u;
      }).finally(() => {
        r = null, i = null;
      });
      a && (yield a);
    }
  } finally {
    e.removeEventListener("message", s), e.removeEventListener("error", o);
  }
}
class i0 extends Error {
  constructor(t, n, r, i) {
    super(n), this.code = t, this.message = n, this.name = r, this.metadata = i;
  }
}
function Fk(e) {
  try {
    if (!(e instanceof Error))
      return;
    const t = JSON.parse(e.message);
    if (!("details" in t) || !Array.isArray(t.details))
      return;
    for (const n of t.details) {
      if (!("@type" in n) || n["@type"] !== "type.googleapis.com/ark.v1.ErrorDetails" || !("code" in n))
        continue;
      const i = n.code;
      if (!("message" in n))
        continue;
      const s = n.message;
      if (!("name" in n))
        continue;
      const o = n.name;
      let a;
      return "metadata" in n && Wk(n.metadata) && (a = n.metadata), new i0(i, s, o, a);
    }
    return;
  } catch {
    return;
  }
}
function Wk(e) {
  return typeof e == "object" && e !== null && !Array.isArray(e);
}
var fr;
(function(e) {
  function t(i, s, o = []) {
    if (typeof i != "string" && (i = r(i)), s.length == 0)
      throw new Error("intent proof requires at least one input");
    Yk(s), Xk(o);
    const a = Qk(i, s[0].witnessUtxo.script);
    return Jk(a, s, o);
  }
  e.create = t;
  function n(i) {
    let s = 0n;
    for (let a = 0; a < i.inputsLength; a++) {
      const c = i.getInput(a);
      if (c.witnessUtxo === void 0)
        throw new Error("intent proof input requires witness utxo");
      s += c.witnessUtxo.amount;
    }
    let o = 0n;
    for (let a = 0; a < i.outputsLength; a++) {
      const c = i.getOutput(a);
      if (c.amount === void 0)
        throw new Error("intent proof output requires amount");
      o += c.amount;
    }
    if (o > s)
      throw new Error(`intent proof output amount is greater than input amount: ${o} > ${s}`);
    return Number(s - o);
  }
  e.fee = n;
  function r(i) {
    switch (i.type) {
      case "register":
        return JSON.stringify({
          type: "register",
          onchain_output_indexes: i.onchain_output_indexes,
          valid_at: i.valid_at,
          expire_at: i.expire_at,
          cosigners_public_keys: i.cosigners_public_keys
        });
      case "delete":
        return JSON.stringify({
          type: "delete",
          expire_at: i.expire_at
        });
      case "get-pending-tx":
        return JSON.stringify({
          type: "get-pending-tx",
          expire_at: i.expire_at
        });
    }
  }
  e.encodeMessage = r;
})(fr || (fr = {}));
const Kk = new Uint8Array([Ut.RETURN]), zk = new Uint8Array(32).fill(0), jk = 4294967295, Gk = "ark-intent-proof-message";
function qk(e) {
  if (e.index === void 0)
    throw new Error("intent proof input requires index");
  if (e.txid === void 0)
    throw new Error("intent proof input requires txid");
  if (e.witnessUtxo === void 0)
    throw new Error("intent proof input requires witness utxo");
  return !0;
}
function Yk(e) {
  return e.forEach(qk), !0;
}
function Zk(e) {
  if (e.amount === void 0)
    throw new Error("intent proof output requires amount");
  if (e.script === void 0)
    throw new Error("intent proof output requires script");
  return !0;
}
function Xk(e) {
  return e.forEach(Zk), !0;
}
function Qk(e, t) {
  const n = tI(e), r = new vr({
    version: 0
  });
  return r.addInput({
    txid: zk,
    // zero hash
    index: jk,
    sequence: 0
  }), r.addOutput({
    amount: 0n,
    script: t
  }), r.updateInput(0, {
    finalScriptSig: nt.encode(["OP_0", n])
  }), r;
}
function Jk(e, t, n) {
  const r = t[0], i = t.map((o) => o.sequence || 0).reduce((o, a) => Math.max(o, a), 0), s = new vr({
    version: 2,
    lockTime: i
  });
  s.addInput({
    ...r,
    txid: e.id,
    index: 0,
    witnessUtxo: {
      script: r.witnessUtxo.script,
      amount: 0n
    },
    sighashType: ji.ALL
  });
  for (const [o, a] of t.entries())
    s.addInput({
      ...a,
      sighashType: ji.ALL
    }), a.unknown?.length && s.updateInput(o + 1, {
      unknown: a.unknown
    });
  n.length === 0 && (n = [
    {
      amount: 0n,
      script: Kk
    }
  ]);
  for (const o of n)
    s.addOutput({
      amount: o.amount,
      script: o.script
    });
  return s;
}
function tI(e) {
  return Tn.utils.taggedHash(Gk, new TextEncoder().encode(e));
}
var Vt;
(function(e) {
  e.BatchStarted = "batch_started", e.BatchFinalization = "batch_finalization", e.BatchFinalized = "batch_finalized", e.BatchFailed = "batch_failed", e.TreeSigningStarted = "tree_signing_started", e.TreeNonces = "tree_nonces", e.TreeTx = "tree_tx", e.TreeSignature = "tree_signature";
})(Vt || (Vt = {}));
class eI {
  constructor(t) {
    this.serverUrl = t;
  }
  async getInfo() {
    const t = `${this.serverUrl}/v1/info`, n = await fetch(t);
    if (!n.ok) {
      const i = await n.text();
      rn(i, `Failed to get server info: ${n.statusText}`);
    }
    const r = await n.json();
    return {
      boardingExitDelay: BigInt(r.boardingExitDelay ?? 0),
      checkpointTapscript: r.checkpointTapscript ?? "",
      deprecatedSigners: r.deprecatedSigners?.map((i) => ({
        cutoffDate: BigInt(i.cutoffDate ?? 0),
        pubkey: i.pubkey ?? ""
      })) ?? [],
      digest: r.digest ?? "",
      dust: BigInt(r.dust ?? 0),
      fees: {
        intentFee: r.fees?.intentFee ?? {},
        txFeeRate: r?.fees?.txFeeRate ?? ""
      },
      forfeitAddress: r.forfeitAddress ?? "",
      forfeitPubkey: r.forfeitPubkey ?? "",
      network: r.network ?? "",
      scheduledSession: "scheduledSession" in r && r.scheduledSession != null ? {
        duration: BigInt(r.scheduledSession.duration ?? 0),
        nextStartTime: BigInt(r.scheduledSession.nextStartTime ?? 0),
        nextEndTime: BigInt(r.scheduledSession.nextEndTime ?? 0),
        period: BigInt(r.scheduledSession.period ?? 0),
        fees: r.scheduledSession.fees ?? {}
      } : void 0,
      serviceStatus: r.serviceStatus ?? {},
      sessionDuration: BigInt(r.sessionDuration ?? 0),
      signerPubkey: r.signerPubkey ?? "",
      unilateralExitDelay: BigInt(r.unilateralExitDelay ?? 0),
      utxoMaxAmount: BigInt(r.utxoMaxAmount ?? -1),
      utxoMinAmount: BigInt(r.utxoMinAmount ?? 0),
      version: r.version ?? "",
      vtxoMaxAmount: BigInt(r.vtxoMaxAmount ?? -1),
      vtxoMinAmount: BigInt(r.vtxoMinAmount ?? 0)
    };
  }
  async submitTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/submit`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedArkTx: t,
        checkpointTxs: n
      })
    });
    if (!i.ok) {
      const o = await i.text();
      rn(o, `Failed to submit virtual transaction: ${o}`);
    }
    const s = await i.json();
    return {
      arkTxid: s.arkTxid,
      finalArkTx: s.finalArkTx,
      signedCheckpointTxs: s.signedCheckpointTxs
    };
  }
  async finalizeTx(t, n) {
    const r = `${this.serverUrl}/v1/tx/finalize`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        arkTxid: t,
        finalCheckpointTxs: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      rn(s, `Failed to finalize offchain transaction: ${s}`);
    }
  }
  async registerIntent(t) {
    const n = `${this.serverUrl}/v1/batch/registerIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: fr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      rn(s, `Failed to register intent: ${s}`);
    }
    return (await r.json()).intentId;
  }
  async deleteIntent(t) {
    const n = `${this.serverUrl}/v1/batch/deleteIntent`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: fr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const i = await r.text();
      rn(i, `Failed to delete intent: ${i}`);
    }
  }
  async confirmRegistration(t) {
    const n = `${this.serverUrl}/v1/batch/ack`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intentId: t
      })
    });
    if (!r.ok) {
      const i = await r.text();
      rn(i, `Failed to confirm registration: ${i}`);
    }
  }
  async submitTreeNonces(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitNonces`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeNonces: nI(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      rn(o, `Failed to submit tree nonces: ${o}`);
    }
  }
  async submitTreeSignatures(t, n, r) {
    const i = `${this.serverUrl}/v1/batch/tree/submitSignatures`, s = await fetch(i, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batchId: t,
        pubkey: n,
        treeSignatures: rI(r)
      })
    });
    if (!s.ok) {
      const o = await s.text();
      rn(o, `Failed to submit tree signatures: ${o}`);
    }
  }
  async submitSignedForfeitTxs(t, n) {
    const r = `${this.serverUrl}/v1/batch/submitForfeitTxs`, i = await fetch(r, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        signedForfeitTxs: t,
        signedCommitmentTx: n
      })
    });
    if (!i.ok) {
      const s = await i.text();
      rn(s, `Failed to submit forfeit transactions: ${i.statusText}`);
    }
  }
  async *getEventStream(t, n) {
    const r = `${this.serverUrl}/v1/batch/events`, i = n.length > 0 ? `?${n.map((s) => `topics=${encodeURIComponent(s)}`).join("&")}` : "";
    for (; !t?.aborted; )
      try {
        const s = new EventSource(r + i), o = () => {
          s.close();
        };
        t?.addEventListener("abort", o);
        try {
          for await (const a of mf(s)) {
            if (t?.aborted)
              break;
            try {
              const c = JSON.parse(a.data), u = this.parseSettlementEvent(c);
              u && (yield u);
            } catch (c) {
              throw console.error("Failed to parse event:", c), c;
            }
          }
        } finally {
          t?.removeEventListener("abort", o), s.close();
        }
      } catch (s) {
        if (s instanceof Error && s.name === "AbortError")
          break;
        if (bf(s)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Event stream error:", s), s;
      }
  }
  async *getTransactionsStream(t) {
    const n = `${this.serverUrl}/v1/txs`;
    for (; !t?.aborted; )
      try {
        const r = new EventSource(n), i = () => {
          r.close();
        };
        t?.addEventListener("abort", i);
        try {
          for await (const s of mf(r)) {
            if (t?.aborted)
              break;
            try {
              const o = JSON.parse(s.data), a = this.parseTransactionNotification(o);
              a && (yield a);
            } catch (o) {
              throw console.error("Failed to parse transaction notification:", o), o;
            }
          }
        } finally {
          t?.removeEventListener("abort", i), r.close();
        }
      } catch (r) {
        if (r instanceof Error && r.name === "AbortError")
          break;
        if (bf(r)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Transaction stream error:", r), r;
      }
  }
  async getPendingTxs(t) {
    const n = `${this.serverUrl}/v1/tx/pending`, r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: {
          proof: t.proof,
          message: fr.encodeMessage(t.message)
        }
      })
    });
    if (!r.ok) {
      const s = await r.text();
      rn(s, `Failed to get pending transactions: ${s}`);
    }
    return (await r.json()).pendingTxs;
  }
  parseSettlementEvent(t) {
    if (t.batchStarted)
      return {
        type: Vt.BatchStarted,
        id: t.batchStarted.id,
        intentIdHashes: t.batchStarted.intentIdHashes,
        batchExpiry: BigInt(t.batchStarted.batchExpiry)
      };
    if (t.batchFinalization)
      return {
        type: Vt.BatchFinalization,
        id: t.batchFinalization.id,
        commitmentTx: t.batchFinalization.commitmentTx
      };
    if (t.batchFinalized)
      return {
        type: Vt.BatchFinalized,
        id: t.batchFinalized.id,
        commitmentTxid: t.batchFinalized.commitmentTxid
      };
    if (t.batchFailed)
      return {
        type: Vt.BatchFailed,
        id: t.batchFailed.id,
        reason: t.batchFailed.reason
      };
    if (t.treeSigningStarted)
      return {
        type: Vt.TreeSigningStarted,
        id: t.treeSigningStarted.id,
        cosignersPublicKeys: t.treeSigningStarted.cosignersPubkeys,
        unsignedCommitmentTx: t.treeSigningStarted.unsignedCommitmentTx
      };
    if (t.treeNoncesAggregated)
      return null;
    if (t.treeNonces)
      return {
        type: Vt.TreeNonces,
        id: t.treeNonces.id,
        topic: t.treeNonces.topic,
        txid: t.treeNonces.txid,
        nonces: iI(t.treeNonces.nonces)
        // pubkey -> public nonce
      };
    if (t.treeTx) {
      const n = Object.fromEntries(Object.entries(t.treeTx.children).map(([r, i]) => [parseInt(r), i]));
      return {
        type: Vt.TreeTx,
        id: t.treeTx.id,
        topic: t.treeTx.topic,
        batchIndex: t.treeTx.batchIndex,
        chunk: {
          txid: t.treeTx.txid,
          tx: t.treeTx.tx,
          children: n
        }
      };
    }
    return t.treeSignature ? {
      type: Vt.TreeSignature,
      id: t.treeSignature.id,
      topic: t.treeSignature.topic,
      batchIndex: t.treeSignature.batchIndex,
      txid: t.treeSignature.txid,
      signature: t.treeSignature.signature
    } : (t.heartbeat || console.warn("Unknown event type:", t), null);
  }
  parseTransactionNotification(t) {
    return t.commitmentTx ? {
      commitmentTx: {
        txid: t.commitmentTx.txid,
        tx: t.commitmentTx.tx,
        spentVtxos: t.commitmentTx.spentVtxos.map(Uo),
        spendableVtxos: t.commitmentTx.spendableVtxos.map(Uo),
        checkpointTxs: t.commitmentTx.checkpointTxs
      }
    } : t.arkTx ? {
      arkTx: {
        txid: t.arkTx.txid,
        tx: t.arkTx.tx,
        spentVtxos: t.arkTx.spentVtxos.map(Uo),
        spendableVtxos: t.arkTx.spendableVtxos.map(Uo),
        checkpointTxs: t.arkTx.checkpointTxs
      }
    } : (t.heartbeat || console.warn("Unknown transaction notification type:", t), null);
  }
}
function nI(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = _.encode(r.pubNonce);
  return t;
}
function rI(e) {
  const t = {};
  for (const [n, r] of e)
    t[n] = _.encode(r.encode());
  return t;
}
function iI(e) {
  return new Map(Object.entries(e).map(([t, n]) => {
    if (typeof n != "string")
      throw new Error("invalid nonce");
    return [t, { pubNonce: _.decode(n) }];
  }));
}
function bf(e) {
  const t = (n) => n instanceof Error ? n.name === "TypeError" && n.message === "Failed to fetch" || n.name === "HeadersTimeoutError" || n.name === "BodyTimeoutError" || n.code === "UND_ERR_HEADERS_TIMEOUT" || n.code === "UND_ERR_BODY_TIMEOUT" : !1;
  return t(e) || t(e.cause);
}
function Uo(e) {
  return {
    outpoint: {
      txid: e.outpoint.txid,
      vout: e.outpoint.vout
    },
    amount: e.amount,
    script: e.script,
    createdAt: e.createdAt,
    expiresAt: e.expiresAt,
    commitmentTxids: e.commitmentTxids,
    isPreconfirmed: e.isPreconfirmed,
    isSwept: e.isSwept,
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent,
    spentBy: e.spentBy,
    settledBy: e.settledBy,
    arkTxid: e.arkTxid
  };
}
function rn(e, t) {
  const n = new Error(e);
  throw Fk(n) ?? new Error(t);
}
class ia {
  constructor(t, n = /* @__PURE__ */ new Map()) {
    this.root = t, this.children = n;
  }
  static create(t) {
    if (t.length === 0)
      throw new Error("empty chunks");
    const n = /* @__PURE__ */ new Map();
    for (const s of t) {
      const o = oI(s), a = o.tx.id;
      n.set(a, o);
    }
    const r = [];
    for (const [s] of n) {
      let o = !1;
      for (const [a, c] of n)
        if (a !== s && (o = sI(c, s), o))
          break;
      if (!o) {
        r.push(s);
        continue;
      }
    }
    if (r.length === 0)
      throw new Error("no root chunk found");
    if (r.length > 1)
      throw new Error(`multiple root chunks found: ${r.join(", ")}`);
    const i = s0(r[0], n);
    if (!i)
      throw new Error(`chunk not found for root txid: ${r[0]}`);
    if (i.nbOfNodes() !== t.length)
      throw new Error(`number of chunks (${t.length}) is not equal to the number of nodes in the graph (${i.nbOfNodes()})`);
    return i;
  }
  nbOfNodes() {
    let t = 1;
    for (const n of this.children.values())
      t += n.nbOfNodes();
    return t;
  }
  validate() {
    if (!this.root)
      throw new Error("unexpected nil root");
    const t = this.root.outputsLength, n = this.root.inputsLength;
    if (n !== 1)
      throw new Error(`unexpected number of inputs: ${n}, expected 1`);
    if (this.children.size > t - 1)
      throw new Error(`unexpected number of children: ${this.children.size}, expected maximum ${t - 1}`);
    for (const [r, i] of this.children) {
      if (r >= t)
        throw new Error(`output index ${r} is out of bounds (nb of outputs: ${t})`);
      i.validate();
      const s = i.root.getInput(0), o = this.root.id;
      if (!s.txid || _.encode(s.txid) !== o || s.index !== r)
        throw new Error(`input of child ${r} is not the output of the parent`);
      let a = 0n;
      for (let u = 0; u < i.root.outputsLength; u++) {
        const l = i.root.getOutput(u);
        l?.amount && (a += l.amount);
      }
      const c = this.root.getOutput(r);
      if (!c?.amount)
        throw new Error(`parent output ${r} has no amount`);
      if (a !== c.amount)
        throw new Error(`sum of child's outputs is not equal to the output of the parent: ${a} != ${c.amount}`);
    }
  }
  leaves() {
    if (this.children.size === 0)
      return [this.root];
    const t = [];
    for (const n of this.children.values())
      t.push(...n.leaves());
    return t;
  }
  get txid() {
    return this.root.id;
  }
  find(t) {
    if (t === this.txid)
      return this;
    for (const n of this.children.values()) {
      const r = n.find(t);
      if (r)
        return r;
    }
    return null;
  }
  update(t, n) {
    if (t === this.txid) {
      n(this.root);
      return;
    }
    for (const r of this.children.values())
      try {
        r.update(t, n);
        return;
      } catch {
        continue;
      }
    throw new Error(`tx not found: ${t}`);
  }
  *iterator() {
    for (const t of this.children.values())
      yield* t.iterator();
    yield this;
  }
}
function sI(e, t) {
  return Object.values(e.children).includes(t);
}
function s0(e, t) {
  const n = t.get(e);
  if (!n)
    return null;
  const r = n.tx, i = /* @__PURE__ */ new Map();
  for (const [s, o] of Object.entries(n.children)) {
    const a = parseInt(s), c = s0(o, t);
    c && i.set(a, c);
  }
  return new ia(r, i);
}
function oI(e) {
  return { tx: He.fromPSBT(Kt.decode(e.tx)), children: e.children };
}
var Ef;
(function(e) {
  let t;
  (function(r) {
    r.Start = "start", r.BatchStarted = "batch_started", r.TreeSigningStarted = "tree_signing_started", r.TreeNoncesAggregated = "tree_nonces_aggregated", r.BatchFinalization = "batch_finalization";
  })(t || (t = {}));
  async function n(r, i, s = {}) {
    const { abortController: o, skipVtxoTreeSigning: a = !1, eventCallback: c } = s;
    let u = t.Start;
    const l = [], f = [];
    let h, p;
    for await (const y of r) {
      if (o?.signal.aborted)
        throw new Error("canceled");
      switch (c && c(y).catch(() => {
      }), y.type) {
        case Vt.BatchStarted: {
          const d = y, { skip: g } = await i.onBatchStarted(d);
          g || (u = t.BatchStarted, a && (u = t.TreeNoncesAggregated));
          continue;
        }
        case Vt.BatchFinalized: {
          if (u !== t.BatchFinalization)
            continue;
          return i.onBatchFinalized && await i.onBatchFinalized(y), y.commitmentTxid;
        }
        case Vt.BatchFailed: {
          if (i.onBatchFailed) {
            await i.onBatchFailed(y);
            continue;
          }
          throw new Error(y.reason);
        }
        case Vt.TreeTx: {
          if (u !== t.BatchStarted && u !== t.TreeNoncesAggregated)
            continue;
          y.batchIndex === 0 ? l.push(y.chunk) : f.push(y.chunk), i.onTreeTxEvent && await i.onTreeTxEvent(y);
          continue;
        }
        case Vt.TreeSignature: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h)
            throw new Error("vtxo tree not initialized");
          const d = _.decode(y.signature);
          h.update(y.txid, (g) => {
            g.updateInput(0, {
              tapKeySig: d
            });
          }), i.onTreeSignatureEvent && await i.onTreeSignatureEvent(y);
          continue;
        }
        case Vt.TreeSigningStarted: {
          if (u !== t.BatchStarted)
            continue;
          h = ia.create(l);
          const { skip: d } = await i.onTreeSigningStarted(y, h);
          d || (u = t.TreeSigningStarted);
          continue;
        }
        case Vt.TreeNonces: {
          if (u !== t.TreeSigningStarted)
            continue;
          const { fullySigned: d } = await i.onTreeNonces(y);
          d && (u = t.TreeNoncesAggregated);
          continue;
        }
        case Vt.BatchFinalization: {
          if (u !== t.TreeNoncesAggregated)
            continue;
          if (!h && l.length > 0 && (h = ia.create(l)), !h && !a)
            throw new Error("vtxo tree not initialized");
          f.length > 0 && (p = ia.create(f)), await i.onBatchFinalization(y, h, p), u = t.BatchFinalization;
          continue;
        }
        default:
          continue;
      }
    }
    throw new Error("event stream closed");
  }
  e.join = n;
})(Ef || (Ef = {}));
const aI = (e) => cI[e], cI = {
  bitcoin: ds(zi, "ark"),
  testnet: ds(Po, "tark"),
  signet: ds(Po, "tark"),
  mutinynet: ds(Po, "tark"),
  regtest: ds({
    ...Po,
    bech32: "bcrt",
    pubKeyHash: 111,
    scriptHash: 196
  }, "tark")
};
function ds(e, t) {
  return {
    ...e,
    hrp: t
  };
}
const uI = {
  bitcoin: "https://mempool.space/api",
  testnet: "https://mempool.space/testnet/api",
  signet: "https://mempool.space/signet/api",
  mutinynet: "https://mutinynet.com/api",
  regtest: "http://localhost:3000"
};
class lI {
  constructor(t, n) {
    this.baseUrl = t, this.pollingInterval = n?.pollingInterval ?? 15e3, this.forcePolling = n?.forcePolling ?? !1;
  }
  async getCoins(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/utxo`);
    if (!n.ok)
      throw new Error(`Failed to fetch UTXOs: ${n.statusText}`);
    return n.json();
  }
  async getFeeRate() {
    const t = await fetch(`${this.baseUrl}/fee-estimates`);
    if (!t.ok)
      throw new Error(`Failed to fetch fee rate: ${t.statusText}`);
    return (await t.json())[1] ?? void 0;
  }
  async broadcastTransaction(...t) {
    switch (t.length) {
      case 1:
        return this.broadcastTx(t[0]);
      case 2:
        return this.broadcastPackage(t[0], t[1]);
      default:
        throw new Error("Only 1 or 1C1P package can be broadcast");
    }
  }
  async getTxOutspends(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}/outspends`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transaction outspends: ${r}`);
    }
    return n.json();
  }
  async getTransactions(t) {
    const n = await fetch(`${this.baseUrl}/address/${t}/txs`);
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to get transactions: ${r}`);
    }
    return n.json();
  }
  async getTxStatus(t) {
    const n = await fetch(`${this.baseUrl}/tx/${t}`);
    if (!n.ok)
      throw new Error(n.statusText);
    if (!(await n.json()).status.confirmed)
      return { confirmed: !1 };
    const i = await fetch(`${this.baseUrl}/tx/${t}/status`);
    if (!i.ok)
      throw new Error(`Failed to get transaction status: ${i.statusText}`);
    const s = await i.json();
    return s.confirmed ? {
      confirmed: s.confirmed,
      blockTime: s.block_time,
      blockHeight: s.block_height
    } : { confirmed: !1 };
  }
  async watchAddresses(t, n) {
    let r = null;
    const i = this.baseUrl.replace(/^http(s)?:/, "ws$1:") + "/v1/ws", s = async () => {
      const c = async () => (await Promise.all(t.map((p) => this.getTransactions(p)))).flat(), u = await c(), l = (h) => `${h.txid}_${h.status.block_time}`, f = new Set(u.map(l));
      r = setInterval(async () => {
        try {
          const p = (await c()).filter((y) => !f.has(l(y)));
          p.length > 0 && (p.forEach((y) => f.add(l(y))), n(p));
        } catch (h) {
          console.error("Error in polling mechanism:", h);
        }
      }, this.pollingInterval);
    };
    let o = null;
    const a = () => {
      o && o.close(), r && clearInterval(r);
    };
    if (this.forcePolling)
      return await s(), a;
    try {
      o = new WebSocket(i), o.addEventListener("open", () => {
        const c = {
          "track-addresses": t
        };
        o.send(JSON.stringify(c));
      }), o.addEventListener("message", (c) => {
        try {
          const u = [], l = JSON.parse(c.data.toString());
          if (!l["multi-address-transactions"])
            return;
          const f = l["multi-address-transactions"];
          for (const h in f)
            for (const p of [
              "mempool",
              "confirmed",
              "removed"
            ])
              f[h][p] && u.push(...f[h][p].filter(dI));
          u.length > 0 && n(u);
        } catch (u) {
          console.error("Failed to process WebSocket message:", u);
        }
      }), o.addEventListener("error", async () => {
        await s();
      });
    } catch {
      r && clearInterval(r), await s();
    }
    return a;
  }
  async getChainTip() {
    const t = await fetch(`${this.baseUrl}/blocks/tip`);
    if (!t.ok)
      throw new Error(`Failed to get chain tip: ${t.statusText}`);
    const n = await t.json();
    if (!fI(n))
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
  async broadcastPackage(t, n) {
    const r = await fetch(`${this.baseUrl}/txs/package`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify([t, n])
    });
    if (!r.ok) {
      const i = await r.text();
      throw new Error(`Failed to broadcast package: ${i}`);
    }
    return r.json();
  }
  async broadcastTx(t) {
    const n = await fetch(`${this.baseUrl}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: t
    });
    if (!n.ok) {
      const r = await n.text();
      throw new Error(`Failed to broadcast transaction: ${r}`);
    }
    return n.text();
  }
}
function fI(e) {
  return Array.isArray(e) && e.every((t) => t && typeof t == "object" && typeof t.id == "string" && t.id.length > 0 && typeof t.height == "number" && t.height >= 0 && typeof t.mediantime == "number" && t.mediantime > 0);
}
const dI = (e) => typeof e.txid == "string" && Array.isArray(e.vout) && e.vout.every((t) => typeof t.scriptpubkey_address == "string" && typeof t.value == "number") && typeof e.status == "object" && typeof e.status.confirmed == "boolean", hI = 0n, pI = new Uint8Array([81, 2, 78, 115]), Hd = {
  script: pI,
  amount: hI
};
_.encode(Hd.script);
function gI(e, t, n) {
  const r = new vr({
    version: 3,
    lockTime: n
  });
  let i = 0n;
  for (const s of e) {
    if (!s.witnessUtxo)
      throw new Error("input needs witness utxo");
    i += s.witnessUtxo.amount, r.addInput(s);
  }
  return r.addOutput({
    script: t,
    amount: i
  }), r.addOutput(Hd), r;
}
const yI = new Error("invalid settlement transaction outputs"), wI = new Error("empty tree"), mI = new Error("invalid number of inputs"), nl = new Error("wrong settlement txid"), bI = new Error("invalid amount"), EI = new Error("no leaves"), TI = new Error("invalid taproot script"), wg = new Error("invalid round transaction outputs"), xI = new Error("wrong commitment txid"), SI = new Error("missing cosigners public keys"), rl = 0, mg = 1;
function vI(e, t) {
  if (t.validate(), t.root.inputsLength !== 1)
    throw mI;
  const n = t.root.getInput(0), r = He.fromPSBT(Kt.decode(e));
  if (r.outputsLength <= mg)
    throw yI;
  const i = r.id;
  if (!n.txid || _.encode(n.txid) !== i || n.index !== mg)
    throw nl;
}
function AI(e, t, n) {
  if (t.outputsLength < rl + 1)
    throw wg;
  const r = t.getOutput(rl)?.amount;
  if (!r)
    throw wg;
  if (!e.root)
    throw wI;
  const i = e.root.getInput(0), s = t.id;
  if (!i.txid || _.encode(i.txid) !== s || i.index !== rl)
    throw xI;
  let o = 0n;
  for (let c = 0; c < e.root.outputsLength; c++) {
    const u = e.root.getOutput(c);
    u?.amount && (o += u.amount);
  }
  if (o !== r)
    throw bI;
  if (e.leaves().length === 0)
    throw EI;
  e.validate();
  for (const c of e.iterator())
    for (const [u, l] of c.children) {
      const f = c.root.getOutput(u);
      if (!f?.script)
        throw new Error(`parent output ${u} not found`);
      const h = f.script.slice(2);
      if (h.length !== 32)
        throw new Error(`parent output ${u} has invalid script`);
      const p = _k(l.root, 0, Dk);
      if (p.length === 0)
        throw SI;
      const y = p.map((g) => g.key), { finalKey: d } = Pk(y, !0, {
        taprootTweak: n
      });
      if (!d || _.encode(d.slice(1)) !== _.encode(h))
        throw TI;
    }
}
function kI(e, t, n) {
  let r = !1;
  for (const [o, a] of t.entries()) {
    if (!a.script)
      throw new Error(`missing output script ${o}`);
    if (nt.decode(a.script)[0] === "RETURN") {
      if (r)
        throw new Error("multiple OP_RETURN outputs");
      r = !0;
    }
  }
  const i = e.map((o) => II(o, n));
  return {
    arkTx: o0(i.map((o) => o.input), t),
    checkpoints: i.map((o) => o.tx)
  };
}
function o0(e, t) {
  let n = 0n;
  for (const i of e) {
    const s = n0(Rs(i.tapLeafScript));
    if (Gi.is(s)) {
      if (n !== 0n && bg(n) !== bg(s.params.absoluteTimelock))
        throw new Error("cannot mix seconds and blocks locktime");
      s.params.absoluteTimelock > n && (n = s.params.absoluteTimelock);
    }
  }
  const r = new vr({
    version: 3,
    lockTime: Number(n)
  });
  for (const [i, s] of e.entries())
    r.addInput({
      txid: s.txid,
      index: s.vout,
      sequence: n ? Ld - 1 : void 0,
      witnessUtxo: {
        script: $e.decode(s.tapTree).pkScript,
        amount: BigInt(s.value)
      },
      tapLeafScript: [s.tapLeafScript]
    }), Uk(r, i, e0, s.tapTree);
  for (const i of t)
    r.addOutput(i);
  return r.addOutput(Hd), r;
}
function II(e, t) {
  const n = n0(Rs(e.tapLeafScript)), r = new $e([
    t.script,
    n.script
  ]), i = o0([e], [
    {
      amount: BigInt(e.value),
      script: r.pkScript
    }
  ]), s = r.findLeaf(_.encode(n.script)), o = {
    txid: i.id,
    vout: 0,
    value: e.value,
    tapLeafScript: s,
    tapTree: r.encode()
  };
  return {
    tx: i,
    input: o
  };
}
const $I = 500000000n;
function bg(e) {
  return e >= $I;
}
function CI(e, t) {
  if (!e.status.block_time)
    return !1;
  if (t.value === 0n)
    return !0;
  if (t.type === "blocks")
    return !1;
  const n = BigInt(Math.floor(Date.now() / 1e3));
  return BigInt(Math.floor(e.status.block_time)) + t.value <= n;
}
const OI = 4320 * 60 * 1e3, BI = {
  thresholdMs: OI
  // 3 days
};
class Ot {
  constructor(t, n, r = Ot.DefaultHRP) {
    this.preimage = t, this.value = n, this.HRP = r, this.vout = 0;
    const i = jt(this.preimage);
    this.vtxoScript = new $e([RI(i)]);
    const s = this.vtxoScript.leaves[0];
    this.txid = _.encode(new Uint8Array(i).reverse()), this.tapTree = this.vtxoScript.encode(), this.forfeitTapLeafScript = s, this.intentTapLeafScript = s, this.value = n, this.status = { confirmed: !0 }, this.extraWitness = [this.preimage];
  }
  encode() {
    const t = new Uint8Array(Ot.Length);
    return t.set(this.preimage, 0), NI(t, this.value, this.preimage.length), t;
  }
  static decode(t, n = Ot.DefaultHRP) {
    if (t.length !== Ot.Length)
      throw new Error(`invalid data length: expected ${Ot.Length} bytes, got ${t.length}`);
    const r = t.subarray(0, Ot.PreimageLength), i = PI(t, Ot.PreimageLength);
    return new Ot(r, i, n);
  }
  static fromString(t, n = Ot.DefaultHRP) {
    if (t = t.trim(), !t.startsWith(n))
      throw new Error(`invalid human-readable part: expected ${n} prefix (note '${t}')`);
    const r = t.slice(n.length), i = sf.decode(r);
    if (i.length === 0)
      throw new Error("failed to decode base58 string");
    return Ot.decode(i, n);
  }
  toString() {
    return this.HRP + sf.encode(this.encode());
  }
}
Ot.DefaultHRP = "arknote";
Ot.PreimageLength = 32;
Ot.ValueLength = 4;
Ot.Length = Ot.PreimageLength + Ot.ValueLength;
Ot.FakeOutpointIndex = 0;
function NI(e, t, n) {
  new DataView(e.buffer, e.byteOffset + n, 4).setUint32(0, t, !1);
}
function PI(e, t) {
  return new DataView(e.buffer, e.byteOffset + t, 4).getUint32(0, !1);
}
function RI(e) {
  return nt.encode(["SHA256", e, "EQUAL"]);
}
var Tf;
(function(e) {
  e[e.INDEXER_TX_TYPE_UNSPECIFIED = 0] = "INDEXER_TX_TYPE_UNSPECIFIED", e[e.INDEXER_TX_TYPE_RECEIVED = 1] = "INDEXER_TX_TYPE_RECEIVED", e[e.INDEXER_TX_TYPE_SENT = 2] = "INDEXER_TX_TYPE_SENT";
})(Tf || (Tf = {}));
var Ai;
(function(e) {
  e.UNSPECIFIED = "INDEXER_CHAINED_TX_TYPE_UNSPECIFIED", e.COMMITMENT = "INDEXER_CHAINED_TX_TYPE_COMMITMENT", e.ARK = "INDEXER_CHAINED_TX_TYPE_ARK", e.TREE = "INDEXER_CHAINED_TX_TYPE_TREE", e.CHECKPOINT = "INDEXER_CHAINED_TX_TYPE_CHECKPOINT";
})(Ai || (Ai = {}));
class UI {
  constructor(t) {
    this.serverUrl = t;
  }
  async getVtxoTree(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isVtxoTreeResponse(o))
      throw new Error("Invalid vtxo tree data received");
    return o.vtxoTree.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getVtxoTreeLeaves(t, n) {
    let r = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/tree/leaves`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo tree leaves: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isVtxoTreeLeavesResponse(o))
      throw new Error("Invalid vtxos tree leaves data received");
    return o;
  }
  async getBatchSweepTransactions(t) {
    const n = `${this.serverUrl}/v1/indexer/batch/${t.txid}/${t.vout}/sweepTxs`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch batch sweep transactions: ${r.statusText}`);
    const i = await r.json();
    if (!Pe.isBatchSweepTransactionsResponse(i))
      throw new Error("Invalid batch sweep transactions data received");
    return i;
  }
  async getCommitmentTx(t) {
    const n = `${this.serverUrl}/v1/indexer/commitmentTx/${t}`, r = await fetch(n);
    if (!r.ok)
      throw new Error(`Failed to fetch commitment tx: ${r.statusText}`);
    const i = await r.json();
    if (!Pe.isCommitmentTx(i))
      throw new Error("Invalid commitment tx data received");
    return i;
  }
  async getCommitmentTxConnectors(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/connectors`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx connectors: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isConnectorsResponse(o))
      throw new Error("Invalid commitment tx connectors data received");
    return o.connectors.forEach((a) => {
      a.children = Object.fromEntries(Object.entries(a.children).map(([c, u]) => [
        Number(c),
        u
      ]));
    }), o;
  }
  async getCommitmentTxForfeitTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/commitmentTx/${t}/forfeitTxs`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch commitment tx forfeitTxs: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isForfeitTxsResponse(o))
      throw new Error("Invalid commitment tx forfeitTxs data received");
    return o;
  }
  async *getSubscription(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscription/${t}`;
    for (; !n?.aborted; )
      try {
        const i = new EventSource(r), s = () => {
          i.close();
        };
        n?.addEventListener("abort", s);
        try {
          for await (const o of mf(i)) {
            if (n?.aborted)
              break;
            try {
              const a = JSON.parse(o.data);
              a.event && (yield {
                txid: a.event.txid,
                scripts: a.event.scripts || [],
                newVtxos: (a.event.newVtxos || []).map(_o),
                spentVtxos: (a.event.spentVtxos || []).map(_o),
                sweptVtxos: (a.event.sweptVtxos || []).map(_o),
                tx: a.event.tx,
                checkpointTxs: a.event.checkpointTxs
              });
            } catch (a) {
              throw console.error("Failed to parse subscription event:", a), a;
            }
          }
        } finally {
          n?.removeEventListener("abort", s), i.close();
        }
      } catch (i) {
        if (i instanceof Error && i.name === "AbortError")
          break;
        if (bf(i)) {
          console.debug("Timeout error ignored");
          continue;
        }
        throw console.error("Subscription error:", i), i;
      }
  }
  async getVirtualTxs(t, n) {
    let r = `${this.serverUrl}/v1/indexer/virtualTx/${t.join(",")}`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch virtual txs: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isVirtualTxsResponse(o))
      throw new Error("Invalid virtual txs data received");
    return o;
  }
  async getVtxoChain(t, n) {
    let r = `${this.serverUrl}/v1/indexer/vtxo/${t.txid}/${t.vout}/chain`;
    const i = new URLSearchParams();
    n && (n.pageIndex !== void 0 && i.append("page.index", n.pageIndex.toString()), n.pageSize !== void 0 && i.append("page.size", n.pageSize.toString())), i.toString() && (r += "?" + i.toString());
    const s = await fetch(r);
    if (!s.ok)
      throw new Error(`Failed to fetch vtxo chain: ${s.statusText}`);
    const o = await s.json();
    if (!Pe.isVtxoChainResponse(o))
      throw new Error("Invalid vtxo chain data received");
    return o;
  }
  async getVtxos(t) {
    if (t?.scripts && t?.outpoints)
      throw new Error("scripts and outpoints are mutually exclusive options");
    if (!t?.scripts && !t?.outpoints)
      throw new Error("Either scripts or outpoints must be provided");
    let n = `${this.serverUrl}/v1/indexer/vtxos`;
    const r = new URLSearchParams();
    t?.scripts && t.scripts.length > 0 && t.scripts.forEach((o) => {
      r.append("scripts", o);
    }), t?.outpoints && t.outpoints.length > 0 && t.outpoints.forEach((o) => {
      r.append("outpoints", `${o.txid}:${o.vout}`);
    }), t && (t.spendableOnly !== void 0 && r.append("spendableOnly", t.spendableOnly.toString()), t.spentOnly !== void 0 && r.append("spentOnly", t.spentOnly.toString()), t.recoverableOnly !== void 0 && r.append("recoverableOnly", t.recoverableOnly.toString()), t.pageIndex !== void 0 && r.append("page.index", t.pageIndex.toString()), t.pageSize !== void 0 && r.append("page.size", t.pageSize.toString())), r.toString() && (n += "?" + r.toString());
    const i = await fetch(n);
    if (!i.ok)
      throw new Error(`Failed to fetch vtxos: ${i.statusText}`);
    const s = await i.json();
    if (!Pe.isVtxosResponse(s))
      throw new Error("Invalid vtxos data received");
    return {
      vtxos: s.vtxos.map(_o),
      page: s.page
    };
  }
  async subscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/subscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ scripts: t, subscriptionId: n })
    });
    if (!i.ok) {
      const o = await i.text();
      throw new Error(`Failed to subscribe to scripts: ${o}`);
    }
    const s = await i.json();
    if (!s.subscriptionId)
      throw new Error("Subscription ID not found");
    return s.subscriptionId;
  }
  async unsubscribeForScripts(t, n) {
    const r = `${this.serverUrl}/v1/indexer/script/unsubscribe`, i = await fetch(r, {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ subscriptionId: t, scripts: n })
    });
    if (!i.ok) {
      const s = await i.text();
      console.warn(`Failed to unsubscribe to scripts: ${s}`);
    }
  }
}
function _o(e) {
  return {
    txid: e.outpoint.txid,
    vout: e.outpoint.vout,
    value: Number(e.amount),
    status: {
      confirmed: !e.isSwept && !e.isPreconfirmed,
      isLeaf: !e.isPreconfirmed
    },
    virtualStatus: {
      state: e.isSwept ? "swept" : e.isPreconfirmed ? "preconfirmed" : "settled",
      commitmentTxIds: e.commitmentTxids,
      batchExpiry: e.expiresAt ? Number(e.expiresAt) * 1e3 : void 0
    },
    spentBy: e.spentBy ?? "",
    settledBy: e.settledBy,
    arkTxId: e.arkTxid,
    createdAt: new Date(Number(e.createdAt) * 1e3),
    isUnrolled: e.isUnrolled,
    isSpent: e.isSpent
  };
}
var Pe;
(function(e) {
  function t(b) {
    return typeof b == "object" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.expiresAt == "string" && typeof b.swept == "boolean";
  }
  function n(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.expiresAt == "string" && Object.values(Ai).includes(b.type) && Array.isArray(b.spends) && b.spends.every((Y) => typeof Y == "string");
  }
  function r(b) {
    return typeof b == "object" && typeof b.startedAt == "string" && typeof b.endedAt == "string" && typeof b.totalInputAmount == "string" && typeof b.totalInputVtxos == "number" && typeof b.totalOutputAmount == "string" && typeof b.totalOutputVtxos == "number" && typeof b.batches == "object" && Object.values(b.batches).every(t);
  }
  e.isCommitmentTx = r;
  function i(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.vout == "number";
  }
  e.isOutpoint = i;
  function s(b) {
    return Array.isArray(b) && b.every(i);
  }
  e.isOutpointArray = s;
  function o(b) {
    return typeof b == "object" && typeof b.txid == "string" && typeof b.children == "object" && Object.values(b.children).every(l) && Object.keys(b.children).every((Y) => Number.isInteger(Number(Y)));
  }
  function a(b) {
    return Array.isArray(b) && b.every(o);
  }
  e.isTxsArray = a;
  function c(b) {
    return typeof b == "object" && typeof b.amount == "string" && typeof b.createdAt == "string" && typeof b.isSettled == "boolean" && typeof b.settledBy == "string" && Object.values(Tf).includes(b.type) && (!b.commitmentTxid && typeof b.virtualTxid == "string" || typeof b.commitmentTxid == "string" && !b.virtualTxid);
  }
  function u(b) {
    return Array.isArray(b) && b.every(c);
  }
  e.isTxHistoryRecordArray = u;
  function l(b) {
    return typeof b == "string" && b.length === 64;
  }
  function f(b) {
    return Array.isArray(b) && b.every(l);
  }
  e.isTxidArray = f;
  function h(b) {
    return typeof b == "object" && i(b.outpoint) && typeof b.createdAt == "string" && (b.expiresAt === null || typeof b.expiresAt == "string") && typeof b.amount == "string" && typeof b.script == "string" && typeof b.isPreconfirmed == "boolean" && typeof b.isSwept == "boolean" && typeof b.isUnrolled == "boolean" && typeof b.isSpent == "boolean" && (!b.spentBy || typeof b.spentBy == "string") && (!b.settledBy || typeof b.settledBy == "string") && (!b.arkTxid || typeof b.arkTxid == "string") && Array.isArray(b.commitmentTxids) && b.commitmentTxids.every(l);
  }
  function p(b) {
    return typeof b == "object" && typeof b.current == "number" && typeof b.next == "number" && typeof b.total == "number";
  }
  function y(b) {
    return typeof b == "object" && Array.isArray(b.vtxoTree) && b.vtxoTree.every(o) && (!b.page || p(b.page));
  }
  e.isVtxoTreeResponse = y;
  function d(b) {
    return typeof b == "object" && Array.isArray(b.leaves) && b.leaves.every(i) && (!b.page || p(b.page));
  }
  e.isVtxoTreeLeavesResponse = d;
  function g(b) {
    return typeof b == "object" && Array.isArray(b.connectors) && b.connectors.every(o) && (!b.page || p(b.page));
  }
  e.isConnectorsResponse = g;
  function m(b) {
    return typeof b == "object" && Array.isArray(b.txids) && b.txids.every(l) && (!b.page || p(b.page));
  }
  e.isForfeitTxsResponse = m;
  function v(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isSweptCommitmentTxResponse = v;
  function k(b) {
    return typeof b == "object" && Array.isArray(b.sweptBy) && b.sweptBy.every(l);
  }
  e.isBatchSweepTransactionsResponse = k;
  function C(b) {
    return typeof b == "object" && Array.isArray(b.txs) && b.txs.every((Y) => typeof Y == "string") && (!b.page || p(b.page));
  }
  e.isVirtualTxsResponse = C;
  function L(b) {
    return typeof b == "object" && Array.isArray(b.chain) && b.chain.every(n) && (!b.page || p(b.page));
  }
  e.isVtxoChainResponse = L;
  function G(b) {
    return typeof b == "object" && Array.isArray(b.vtxos) && b.vtxos.every(h) && (!b.page || p(b.page));
  }
  e.isVtxosResponse = G;
})(Pe || (Pe = {}));
const _I = 546;
function yi(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.offchainTapscript.forfeit(),
    intentTapLeafScript: e.offchainTapscript.forfeit(),
    tapTree: e.offchainTapscript.encode()
  };
}
function LI(e, t) {
  return {
    ...t,
    forfeitTapLeafScript: e.boardingTapscript.forfeit(),
    intentTapLeafScript: e.boardingTapscript.forfeit(),
    tapTree: e.boardingTapscript.encode()
  };
}
class bt extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "ParseError", this.#t = n, n?.input && (this.message = qi(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = qi(this.message, t), this) : this);
  }
}
class tt extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "EvaluationError", this.#t = n, n?.input && (this.message = qi(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = qi(this.message, t), this) : this);
  }
}
let DI = class extends Error {
  #t;
  constructor(t, n, r) {
    super(t, { cause: r }), this.name = "TypeError", this.#t = n, n?.input && (this.message = qi(this.message, n));
  }
  get node() {
    return this.#t;
  }
  withAst(t) {
    return this.#t ? this : (this.#t = t, t?.input ? (this.message = qi(this.message, t), this) : this);
  }
};
function qi(e, t) {
  if (t?.pos === void 0) return e;
  const n = t.pos, r = t.input;
  let i = 1, s = 0, o = 0;
  for (; s < n; )
    r[s] === `
` ? (i++, o = 0) : o++, s++;
  let a = n, c = n;
  for (; a > 0 && r[a - 1] !== `
`; ) a--;
  for (; c < r.length && r[c] !== `
`; ) c++;
  const u = r.slice(a, c), l = `${i}`.padStart(4, " "), f = " ".repeat(9 + o);
  return `${e}

> ${l} | ${u}
${f}^`;
}
class gn {
  #t;
  constructor(t) {
    this.#t = t;
  }
  static of(t) {
    return t === void 0 ? nc : new gn(t);
  }
  static none() {
    return nc;
  }
  hasValue() {
    return this.#t !== void 0;
  }
  value() {
    if (this.#t === void 0) throw new tt("Optional value is not present");
    return this.#t;
  }
  or(t) {
    if (this.#t !== void 0) return this;
    if (t instanceof gn) return t;
    throw new tt("Optional.or must be called with an Optional argument");
  }
  orValue(t) {
    return this.#t === void 0 ? t : this.#t;
  }
  get [Symbol.toStringTag]() {
    return "optional";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.#t === void 0 ? "Optional { none }" : `Optional { value: ${JSON.stringify(this.#t)} }`;
  }
}
const nc = Object.freeze(new gn());
class a0 {
}
const c0 = new a0();
function VI(e, t) {
  e.constants.set("optional", t ? c0 : void 0);
}
function MI(e) {
  const t = (f, h) => e.registerFunctionOverload(f, h), n = e.enableOptionalTypes ? c0 : void 0;
  e.registerType("OptionalNamespace", a0), e.registerConstant("optional", "OptionalNamespace", n), t("optional.hasValue(): bool", (f) => f.hasValue()), t("optional<A>.value(): A", (f) => f.value()), e.registerFunctionOverload("OptionalNamespace.none(): optional<T>", () => gn.none()), t("OptionalNamespace.of(A): optional<A>", (f, h) => gn.of(h));
  function r(f, h, p) {
    if (f instanceof gn) return f;
    throw new tt(`${p} must be optional`, h);
  }
  function i(f, h, p) {
    const y = f.eval(h.receiver, p);
    return y instanceof Promise ? y.then((d) => s(d, f, h, p)) : s(y, f, h, p);
  }
  function s(f, h, p, y) {
    const d = r(f, p.receiver, `${p.functionDesc} receiver`);
    return d.hasValue() ? p.onHasValue(d) : p.onEmpty(h, p, y);
  }
  function o(f, h, p, y) {
    const d = f.check(h, p);
    if (d.kind === "optional") return d;
    if (d.kind === "dyn") return f.getType("optional");
    throw new f.Error(`${y} must be optional, got '${d}'`, h);
  }
  function a({ functionDesc: f, evaluate: h, typeCheck: p, onHasValue: y, onEmpty: d }) {
    return ({ args: g, receiver: m }) => ({
      functionDesc: f,
      receiver: m,
      arg: g[0],
      evaluate: h,
      typeCheck: p,
      onHasValue: y,
      onEmpty: d
    });
  }
  const c = "optional.orValue() receiver", u = "optional.or(optional) receiver", l = "optional.or(optional) argument";
  e.registerFunctionOverload(
    "optional.or(ast): optional<dyn>",
    a({
      functionDesc: "optional.or(optional)",
      evaluate: i,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, u), d = o(f, h.arg, p, l), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      },
      onHasValue: (f) => f,
      onEmpty(f, h, p) {
        const y = h.arg, d = f.eval(y, p);
        return d instanceof Promise ? d.then((g) => r(g, y, l)) : r(d, y, l);
      }
    })
  ), e.registerFunctionOverload(
    "optional.orValue(ast): dyn",
    a({
      functionDesc: "optional.orValue(value)",
      onHasValue: (f) => f.value(),
      onEmpty(f, h, p) {
        return f.eval(h.arg, p);
      },
      evaluate: i,
      typeCheck(f, h, p) {
        const y = o(f, h.receiver, p, c).valueType, d = f.check(h.arg, p), g = y.unify(f.registry, d);
        if (g) return g;
        throw new f.Error(
          `${h.functionDesc} argument must be compatible type, got '${y}' and '${d}'`,
          h.arg
        );
      }
    })
  );
}
class _r {
  #t;
  constructor(t) {
    this.verify(BigInt(t));
  }
  get value() {
    return this.#t;
  }
  valueOf() {
    return this.#t;
  }
  verify(t) {
    if (t < 0n || t > 18446744073709551615n) throw new tt("Unsigned integer overflow");
    this.#t = t;
  }
  get [Symbol.toStringTag]() {
    return `value = ${this.#t}`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `UnsignedInteger { value: ${this.#t} }`;
  }
}
const HI = {
  h: 3600000000000n,
  m: 60000000000n,
  s: 1000000000n,
  ms: 1000000n,
  us: 1000n,
  µs: 1000n,
  ns: 1n
};
class dr {
  #t;
  #e;
  constructor(t, n = 0) {
    this.#t = BigInt(t), this.#e = n;
  }
  get seconds() {
    return this.#t;
  }
  get nanos() {
    return this.#e;
  }
  valueOf() {
    return Number(this.#t) * 1e3 + this.#e / 1e6;
  }
  static fromMilliseconds(t) {
    const n = BigInt(Math.trunc(t * 1e6)), r = n / 1000000000n, i = Number(n % 1000000000n);
    return new dr(r, i);
  }
  addDuration(t) {
    const n = this.#e + t.nanos;
    return new dr(
      this.#t + t.seconds + BigInt(Math.floor(n / 1e9)),
      n % 1e9
    );
  }
  subtractDuration(t) {
    const n = this.#e - t.nanos;
    return new dr(
      this.#t - t.seconds + BigInt(Math.floor(n / 1e9)),
      (n + 1e9) % 1e9
    );
  }
  extendTimestamp(t) {
    return new Date(
      t.getTime() + Number(this.#t) * 1e3 + Math.floor(this.#e / 1e6)
    );
  }
  subtractTimestamp(t) {
    return new Date(
      t.getTime() - Number(this.#t) * 1e3 - Math.floor(this.#e / 1e6)
    );
  }
  toString() {
    const t = this.#e ? (this.#e / 1e9).toLocaleString("en-US", { useGrouping: !1, maximumFractionDigits: 9 }).slice(1) : "";
    return `${this.#t}${t}s`;
  }
  getHours() {
    return this.#t / 3600n;
  }
  getMinutes() {
    return this.#t / 60n;
  }
  getSeconds() {
    return this.#t;
  }
  getMilliseconds() {
    return this.#t * 1000n + BigInt(Math.floor(this.#e / 1e6));
  }
  get [Symbol.toStringTag]() {
    return "google.protobuf.Duration";
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `google.protobuf.Duration { seconds: ${this.#t}, nanos: ${this.#e} }`;
  }
}
function FI(e) {
  const t = (d, g) => e.registerFunctionOverload(d, g), n = (d) => d;
  t("dyn(dyn): dyn", n);
  for (const d in Us) {
    const g = Us[d];
    g instanceof ue && t(`type(${g.name}): type`, () => g);
  }
  t("bool(bool): bool", n), t("bool(string): bool", (d) => {
    switch (d) {
      case "1":
      case "t":
      case "true":
      case "TRUE":
      case "True":
        return !0;
      case "0":
      case "f":
      case "false":
      case "FALSE":
      case "False":
        return !1;
      default:
        throw new tt(`bool() conversion error: invalid string value "${d}"`);
    }
  });
  const r = Object.keys;
  t("size(string): int", (d) => BigInt(Eg(d))), t("size(bytes): int", (d) => BigInt(d.length)), t("size(list): int", (d) => BigInt(d.length ?? d.size)), t(
    "size(map): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("string.size(): int", (d) => BigInt(Eg(d))), t("bytes.size(): int", (d) => BigInt(d.length)), t("list.size(): int", (d) => BigInt(d.length ?? d.size)), t(
    "map.size(): int",
    (d) => BigInt(d instanceof Map ? d.size : r(d).length)
  ), t("bytes(string): bytes", (d) => o.fromString(d)), t("bytes(bytes): bytes", n), t("double(double): double", n), t("double(int): double", (d) => Number(d)), t("double(uint): double", (d) => Number(d)), t("double(string): double", (d) => {
    if (!d || d !== d.trim())
      throw new tt("double() type error: cannot convert to double");
    switch (d.toLowerCase()) {
      case "inf":
      case "+inf":
      case "infinity":
      case "+infinity":
        return Number.POSITIVE_INFINITY;
      case "-inf":
      case "-infinity":
        return Number.NEGATIVE_INFINITY;
      case "nan":
        return Number.NaN;
      default: {
        const m = Number(d);
        if (!Number.isNaN(m)) return m;
        throw new tt("double() type error: cannot convert to double");
      }
    }
  }), t("int(int): int", n), t("int(double): int", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new tt("int() type error: integer overflow");
  }), t("int(string): int", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new tt("int() type error: cannot convert to int");
    try {
      const g = BigInt(d);
      if (g <= 9223372036854775807n && g >= -9223372036854775808n) return g;
    } catch {
    }
    throw new tt("int() type error: cannot convert to int");
  }), t("uint(uint): uint", n), t("uint(double): uint", (d) => {
    if (Number.isFinite(d)) return BigInt(Math.trunc(d));
    throw new tt("int() type error: integer overflow");
  }), t("uint(string): uint", (d) => {
    if (d !== d.trim() || d.length > 20 || d.includes("0x"))
      throw new tt("uint() type error: cannot convert to uint");
    try {
      const g = BigInt(d);
      if (g <= 18446744073709551615n && g >= 0n) return g;
    } catch {
    }
    throw new tt("uint() type error: cannot convert to uint");
  }), t("string(string): string", n), t("string(bool): string", (d) => `${d}`), t("string(int): string", (d) => `${d}`), t("string(bytes): string", (d) => o.toUtf8(d)), t("string(double): string", (d) => d === 1 / 0 ? "+Inf" : d === -1 / 0 ? "-Inf" : `${d}`), t("string.startsWith(string): bool", (d, g) => d.startsWith(g)), t("string.endsWith(string): bool", (d, g) => d.endsWith(g)), t("string.contains(string): bool", (d, g) => d.includes(g)), t("string.lowerAscii(): string", (d) => d.toLowerCase()), t("string.upperAscii(): string", (d) => d.toUpperCase()), t("string.trim(): string", (d) => d.trim()), t(
    "string.indexOf(string): int",
    (d, g) => BigInt(d.indexOf(g))
  ), t("string.indexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new tt("string.indexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.indexOf(g, m));
  }), t(
    "string.lastIndexOf(string): int",
    (d, g) => BigInt(d.lastIndexOf(g))
  ), t("string.lastIndexOf(string, int): int", (d, g, m) => {
    if (g === "") return m;
    if (m = Number(m), m < 0 || m >= d.length)
      throw new tt("string.lastIndexOf(search, fromIndex): fromIndex out of range");
    return BigInt(d.lastIndexOf(g, m));
  }), t("string.substring(int): string", (d, g) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new tt("string.substring(start, end): start index out of range");
    return d.substring(g);
  }), t("string.substring(int, int): string", (d, g, m) => {
    if (g = Number(g), g < 0 || g > d.length)
      throw new tt("string.substring(start, end): start index out of range");
    if (m = Number(m), m < g || m > d.length)
      throw new tt("string.substring(start, end): end index out of range");
    return d.substring(g, m);
  }), t("string.matches(string): bool", (d, g) => {
    try {
      return new RegExp(g).test(d);
    } catch {
      throw new tt(`Invalid regular expression: ${g}`);
    }
  }), t("string.split(string): list<string>", (d, g) => d.split(g)), t("string.split(string, int): list<string>", (d, g, m) => {
    if (m = Number(m), m === 0) return [];
    const v = d.split(g);
    if (m < 0 || v.length <= m) return v;
    const k = v.slice(0, m - 1);
    return k.push(v.slice(m - 1).join(g)), k;
  }), t("list<string>.join(): string", (d) => {
    for (let g = 0; g < d.length; g++)
      if (typeof d[g] != "string")
        throw new tt("string.join(): list must contain only strings");
    return d.join("");
  }), t("list<string>.join(string): string", (d, g) => {
    for (let m = 0; m < d.length; m++)
      if (typeof d[m] != "string")
        throw new tt("string.join(separator): list must contain only strings");
    return d.join(g);
  });
  const i = new TextEncoder("utf8"), s = new TextDecoder("utf8"), o = typeof Buffer < "u" ? {
    byteLength: (d) => Buffer.byteLength(d),
    fromString: (d) => Buffer.from(d, "utf8"),
    toHex: (d) => Buffer.prototype.hexSlice.call(d, 0, d.length),
    toBase64: (d) => Buffer.prototype.base64Slice.call(d, 0, d.length),
    toUtf8: (d) => Buffer.prototype.utf8Slice.call(d, 0, d.length),
    jsonParse: (d) => JSON.parse(d)
  } : {
    textEncoder: new TextEncoder("utf8"),
    byteLength: (d) => i.encode(d).length,
    fromString: (d) => i.encode(d),
    toHex: Uint8Array.prototype.toHex ? (d) => d.toHex() : (d) => Array.from(d, (g) => g.toString(16).padStart(2, "0")).join(""),
    toBase64: Uint8Array.prototype.toBase64 ? (d) => d.toBase64() : (d) => btoa(Array.from(d, (g) => String.fromCodePoint(g)).join("")),
    toUtf8: (d) => s.decode(d),
    jsonParse: (d) => JSON.parse(i.decode(d))
  };
  t("bytes.json(): map", o.jsonParse), t("bytes.hex(): string", o.toHex), t("bytes.string(): string", o.toUtf8), t("bytes.base64(): string", o.toBase64), t("bytes.at(int): int", (d, g) => {
    if (g < 0 || g >= d.length) throw new tt("Bytes index out of range");
    return BigInt(d[g]);
  });
  const a = "google.protobuf.Timestamp", c = "google.protobuf.Duration", u = e.registerType(a, Date).getObjectType(a).typeType, l = e.registerType(c, dr).getObjectType(c).typeType;
  e.registerConstant("google", "map<string, map<string, type>>", {
    protobuf: { Duration: l, Timestamp: u }
  });
  function f(d, g) {
    return new Date(d.toLocaleString("en-US", { timeZone: g }));
  }
  function h(d, g) {
    const m = g ? f(d, g) : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), v = new Date(m.getFullYear(), 0, 0);
    return BigInt(Math.floor((m - v) / 864e5) - 1);
  }
  t(`timestamp(string): ${a}`, (d) => {
    if (d.length < 20 || d.length > 30)
      throw new tt("timestamp() requires a string in ISO 8601 format");
    const g = new Date(d);
    if (g <= 253402300799999 && g >= -621355968e5) return g;
    throw new tt("timestamp() requires a string in ISO 8601 format");
  }), t(`timestamp(int): ${a}`, (d) => {
    if (d = Number(d) * 1e3, d <= 253402300799999 && d >= -621355968e5) return new Date(d);
    throw new tt("timestamp() requires a valid integer unix timestamp");
  }), t(`${a}.getDate(): int`, (d) => BigInt(d.getUTCDate())), t(`${a}.getDate(string): int`, (d, g) => BigInt(f(d, g).getDate())), t(`${a}.getDayOfMonth(): int`, (d) => BigInt(d.getUTCDate() - 1)), t(
    `${a}.getDayOfMonth(string): int`,
    (d, g) => BigInt(f(d, g).getDate() - 1)
  ), t(`${a}.getDayOfWeek(): int`, (d) => BigInt(d.getUTCDay())), t(`${a}.getDayOfWeek(string): int`, (d, g) => BigInt(f(d, g).getDay())), t(`${a}.getDayOfYear(): int`, h), t(`${a}.getDayOfYear(string): int`, h), t(`${a}.getFullYear(): int`, (d) => BigInt(d.getUTCFullYear())), t(`${a}.getFullYear(string): int`, (d, g) => BigInt(f(d, g).getFullYear())), t(`${a}.getHours(): int`, (d) => BigInt(d.getUTCHours())), t(`${a}.getHours(string): int`, (d, g) => BigInt(f(d, g).getHours())), t(`${a}.getMilliseconds(): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMilliseconds(string): int`, (d) => BigInt(d.getUTCMilliseconds())), t(`${a}.getMinutes(): int`, (d) => BigInt(d.getUTCMinutes())), t(`${a}.getMinutes(string): int`, (d, g) => BigInt(f(d, g).getMinutes())), t(`${a}.getMonth(): int`, (d) => BigInt(d.getUTCMonth())), t(`${a}.getMonth(string): int`, (d, g) => BigInt(f(d, g).getMonth())), t(`${a}.getSeconds(): int`, (d) => BigInt(d.getUTCSeconds())), t(`${a}.getSeconds(string): int`, (d, g) => BigInt(f(d, g).getSeconds()));
  const p = /(\d*\.?\d*)(ns|us|µs|ms|s|m|h)/;
  function y(d) {
    if (!d) throw new tt("Invalid duration string: ''");
    const g = d[0] === "-";
    (d[0] === "-" || d[0] === "+") && (d = d.slice(1));
    let m = BigInt(0);
    for (; ; ) {
      const C = p.exec(d);
      if (!C) throw new tt(`Invalid duration string: ${d}`);
      if (C.index !== 0) throw new tt(`Invalid duration string: ${d}`);
      d = d.slice(C[0].length);
      const L = HI[C[2]], [G = "0", b = ""] = C[1].split("."), Y = BigInt(G) * L, D = b ? BigInt(b.slice(0, 13).padEnd(13, "0")) * L / 10000000000000n : 0n;
      if (m += Y + D, d === "") break;
    }
    const v = m >= 1000000000n ? m / 1000000000n : 0n, k = Number(m % 1000000000n);
    return g ? new dr(-v, -k) : new dr(v, k);
  }
  t("duration(string): google.protobuf.Duration", (d) => y(d)), t("google.protobuf.Duration.getHours(): int", (d) => d.getHours()), t("google.protobuf.Duration.getMinutes(): int", (d) => d.getMinutes()), t("google.protobuf.Duration.getSeconds(): int", (d) => d.getSeconds()), t("google.protobuf.Duration.getMilliseconds(): int", (d) => d.getMilliseconds()), MI(e);
}
function Eg(e) {
  let t = 0;
  for (const n of e) t++;
  return t;
}
class ue {
  #t;
  constructor(t) {
    this.#t = t, Object.freeze(this);
  }
  get name() {
    return this.#t;
  }
  get [Symbol.toStringTag]() {
    return `Type<${this.#t}>`;
  }
  toString() {
    return `Type<${this.#t}>`;
  }
}
const Us = {
  string: new ue("string"),
  bool: new ue("bool"),
  int: new ue("int"),
  uint: new ue("uint"),
  double: new ue("double"),
  map: new ue("map"),
  list: new ue("list"),
  bytes: new ue("bytes"),
  null_type: new ue("null"),
  type: new ue("type")
};
class Wc {
  #t = null;
  #e = null;
  constructor(t) {
    t instanceof Wc ? (this.#t = t, this.#e = /* @__PURE__ */ new Map()) : this.#e = new Map(t);
  }
  fork(t = !0) {
    return t && (this.set = this.#n), new this.constructor(this);
  }
  #n() {
    throw new Error("Cannot modify frozen registry");
  }
  set(t, n) {
    return this.#e.set(t, n), this;
  }
  has(t) {
    return this.#e.has(t) || (this.#t ? this.#t.has(t) : !1);
  }
  get(t) {
    return this.#e.get(t) || this.#t?.get(t);
  }
  *#r() {
    this.#t && (yield* this.#t), yield* this.#e;
  }
  [Symbol.iterator]() {
    return this.#r();
  }
  get size() {
    return this.#e.size + (this.#t ? this.#t.size : 0);
  }
}
class WI extends Wc {
  constructor(t = null, n = null) {
    super(t, n);
  }
  get(t) {
    const n = super.get(t);
    return n === void 0 ? Ke : n;
  }
}
function In(e, t = Wc, n = !0) {
  return e instanceof t ? e.fork(n) : new t(e);
}
class $r {
  #t = /* @__PURE__ */ new WeakMap();
  #e = null;
  #n = null;
  constructor({ kind: t, type: n, name: r, keyType: i, valueType: s, values: o }) {
    this.kind = t, this.type = n, this.name = r, i && (this.keyType = i), s && (this.valueType = s), o && (this.values = o), this.unwrappedType = t === "dyn" && s ? s.unwrappedType : this, t === "list" ? this.fieldLazy = this.#a : t === "map" ? this.fieldLazy = this.#o : t === "message" ? this.fieldLazy = this.#i : t === "dyn" ? this.fieldLazy = this.#o : t === "optional" && (this.fieldLazy = this.#r), Object.freeze(this);
  }
  hasDyn() {
    return this.#e ??= this.kind === "dyn" || this.valueType?.hasDyn() || this.keyType?.hasDyn() || !1;
  }
  hasNoDynTypes() {
    return this.hasDyn() === !1;
  }
  isDynOrBool() {
    return this.type === "bool" || this.kind === "dyn";
  }
  isEmpty() {
    return this.valueType && this.valueType.kind === "param";
  }
  hasPlaceholder() {
    return this.#n ??= this.kind === "param" || this.keyType?.hasPlaceholder() || this.valueType?.hasPlaceholder() || !1;
  }
  unify(t, n) {
    const r = this;
    if (r === n || r.kind === "dyn" || n.kind === "param") return r;
    if (n.kind === "dyn" || r.kind === "param") return n;
    if (r.kind !== n.kind || !(r.hasPlaceholder() || n.hasPlaceholder() || r.hasDyn() || n.hasDyn())) return null;
    const i = r.valueType.unify(t, n.valueType);
    if (!i) return null;
    switch (r.kind) {
      case "optional":
        return t.getOptionalType(i);
      case "list":
        return t.getListType(i);
      case "map":
        const s = r.keyType.unify(t, n.keyType);
        return s ? t.getMapType(s, i) : null;
    }
  }
  templated(t, n) {
    if (!this.hasPlaceholder()) return this;
    switch (this.kind) {
      case "dyn":
        return this.valueType.templated(t, n);
      case "param":
        return n?.get(this.name) || this;
      case "map":
        return t.getMapType(this.keyType.templated(t, n), this.valueType.templated(t, n));
      case "list":
        return t.getListType(this.valueType.templated(t, n));
      case "optional":
        return t.getOptionalType(this.valueType.templated(t, n));
      default:
        return this;
    }
  }
  toString() {
    return this.name;
  }
  #r(t, n, r, i) {
    if (t = t instanceof gn ? t.orValue() : t, t === void 0) return nc;
    const s = i.debugType(t);
    try {
      return gn.of(s.fieldLazy(t, n, r, i));
    } catch (o) {
      if (o instanceof tt) return nc;
      throw o;
    }
  }
  #i(t, n, r, i) {
    const s = i.objectTypesByConstructor.get(t.constructor);
    if (!s) return;
    if (!s.fields) return Object.hasOwn(t, n) ? t[n] : void 0;
    const o = s.fields[n];
    if (!o) return;
    const a = t[n];
    if (o.kind === "dyn") return a;
    const c = i.debugType(a);
    if (o.matches(c)) return a;
    throw new tt(
      `Field '${n}' is not of type '${o}', got '${c}'`,
      r
    );
  }
  #o(t, n, r, i) {
    let s;
    if (t instanceof Map ? s = t.get(n) : s = Object.hasOwn(t, n) ? t[n] : void 0, s === void 0) return;
    if (this.valueType.kind === "dyn") return s;
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new tt(
      `Field '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  #a(t, n, r, i) {
    if (!(typeof n == "number" || typeof n == "bigint")) return;
    const s = t[n];
    if (s === void 0)
      throw new tt(
        `No such key: index out of bounds, index ${n} ${n < 0 ? "< 0" : `>= size ${t.length}`}`,
        r
      );
    const o = i.debugType(s);
    if (this.valueType.matches(o)) return s;
    throw new tt(
      `List item with index '${n}' is not of type '${this.valueType}', got '${o}'`,
      r
    );
  }
  fieldLazy() {
  }
  field(t, n, r, i) {
    const s = this.fieldLazy(t, n, r, i);
    if (s !== void 0) return s;
    throw new tt(`No such key: ${n}`, r);
  }
  matchesBoth(t) {
    return this.matches(t) && t.matches(this);
  }
  matches(t) {
    return this.#t.get(t) ?? this.#t.set(t, this.#c(t)).get(t);
  }
  #c(t) {
    const n = this.unwrappedType, r = t.unwrappedType;
    if (n === r || r.kind === "dyn" || r.kind === "param") return !0;
    switch (n.kind) {
      case "dyn":
      case "param":
        return !0;
      case "list":
        return r.kind === "list" && n.valueType.matches(r.valueType);
      case "map":
        return r.kind === "map" && n.keyType.matches(r.keyType) && n.valueType.matches(r.valueType);
      case "optional":
        return r.kind === "optional" && (!n.valueType || !r.valueType || n.valueType.matches(r.valueType));
      default:
        return n.name === r.name;
    }
  }
}
function KI(e, t) {
  const n = `Macro '${e}' must `;
  return function(i) {
    const s = t(i);
    if (!s || typeof s != "object") throw new Error(`${n} must return an object.`);
    if (!s?.typeCheck) throw new Error(`${n} have a .typeCheck(checker, macro, ctx) method.`);
    if (!s?.evaluate) throw new Error(`${n} have a .evaluate(evaluator, macro, ctx) method.`);
    return s;
  };
}
class zI {
  #t;
  constructor({ name: t, receiverType: n, argTypes: r, returnType: i, handler: s }) {
    this.name = t, this.receiverType = n || null, this.argTypes = r, this.returnType = i, this.macro = r.includes(sa);
    const o = n ? `${n}.` : "";
    this.signature = `${o}${t}(${r.join(", ")}): ${i}`, this.handler = this.macro ? KI(this.signature, s) : s, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.returnType.hasPlaceholder() || this.receiverType?.hasPlaceholder() || this.argTypes.some((t) => t.hasPlaceholder()) || !1;
  }
  matchesArgs(t) {
    return t.length === this.argTypes.length && this.argTypes.every((n, r) => n.matches(t[r])) ? this : null;
  }
}
class hs {
  #t;
  constructor({ operator: t, leftType: n, rightType: r, handler: i, returnType: s }) {
    this.operator = t, this.leftType = n, this.rightType = r || null, this.handler = i, this.returnType = s, r ? this.signature = `${n} ${t} ${r}: ${s}` : this.signature = `${t}${n}: ${s}`, Object.freeze(this);
  }
  hasPlaceholder() {
    return this.#t ??= this.leftType.hasPlaceholder() || this.rightType?.hasPlaceholder() || !1;
  }
  equals(t) {
    return this.operator === t.operator && this.leftType === t.leftType && this.rightType === t.rightType;
  }
}
function u0(e) {
  return new $r({
    kind: "list",
    name: `list<${e}>`,
    type: "list",
    valueType: e
  });
}
function Cn(e) {
  return new $r({ kind: "primitive", name: e, type: e });
}
function jI(e) {
  return new $r({ kind: "message", name: e, type: e });
}
function l0(e) {
  const t = e ? `dyn<${e}>` : "dyn";
  return new $r({ kind: "dyn", name: t, type: t, valueType: e });
}
function f0(e) {
  const t = e ? `optional<${e}>` : "optional";
  return new $r({ kind: "optional", name: t, type: "optional", valueType: e });
}
function d0(e, t) {
  return new $r({
    kind: "map",
    name: `map<${e}, ${t}>`,
    type: "map",
    keyType: e,
    valueType: t
  });
}
function GI(e) {
  return new $r({ kind: "param", name: e, type: e });
}
const Ke = l0(), sa = Cn("ast"), Tg = u0(Ke), xg = d0(Ke, Ke), Qt = Object.freeze({
  string: Cn("string"),
  bool: Cn("bool"),
  int: Cn("int"),
  uint: Cn("uint"),
  double: Cn("double"),
  bytes: Cn("bytes"),
  dyn: Ke,
  null: Cn("null"),
  type: Cn("type"),
  optional: f0(Ke),
  list: Tg,
  "list<dyn>": Tg,
  map: xg,
  "map<dyn, dyn>": xg
});
class qI {
  returnType = null;
  /** @type {Array<FunctionDeclaration>} */
  declarations = [];
  constructor(t) {
    this.registry = t;
  }
  add(t) {
    this.returnType = (this.returnType ? this.returnType.unify(this.registry, t.returnType) : t.returnType) || Ke, this.declarations.push(t);
  }
  findMatch(t, n = null) {
    for (let r = 0; r < this.declarations.length; r++) {
      const i = this.#t(this.declarations[r], t, n);
      if (i) return i;
    }
    return null;
  }
  #t(t, n, r) {
    if (t.hasPlaceholder()) return this.#e(t, n, r);
    if (!(r && t.receiverType && !r.matches(t.receiverType)))
      return t.matchesArgs(n);
  }
  #e(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    if (r && t.receiverType && !this.registry.matchTypeWithPlaceholders(t.receiverType, r, i))
      return null;
    for (let s = 0; s < n.length; s++)
      if (!this.registry.matchTypeWithPlaceholders(t.argTypes[s], n[s], i))
        return null;
    return {
      handler: t.handler,
      signature: t.signature,
      returnType: t.returnType.templated(this.registry, i)
    };
  }
}
function Sg(e) {
  const t = [];
  let n = "", r = 0;
  for (const i of e) {
    if (i === "<") r++;
    else if (i === ">") r--;
    else if (i === "," && r === 0) {
      t.push(n), n = "";
      continue;
    }
    n += i;
  }
  return n && t.push(n), t;
}
const h0 = [
  [void 0, "map"],
  [Object, "map"],
  [Map, "map"],
  [Array, "list"],
  [Uint8Array, "bytes"],
  [_r, "uint"],
  [ue, "type"],
  [gn, "optional"]
];
typeof Buffer < "u" && h0.push([Buffer, "bytes"]);
class Fd {
  #t = {};
  #e = {};
  #n;
  #r;
  #i;
  #o = /* @__PURE__ */ new Map([
    [!0, /* @__PURE__ */ new Map()],
    [!1, /* @__PURE__ */ new Map()]
  ]);
  #a = /* @__PURE__ */ new Map();
  #c = /* @__PURE__ */ new Map();
  #u = /* @__PURE__ */ new Map();
  #p = /* @__PURE__ */ new Map();
  constructor(t = {}) {
    if (this.enableOptionalTypes = t.enableOptionalTypes ?? !1, this.objectTypes = In(t.objectTypes), this.objectTypesByConstructor = In(t.objectTypesByConstructor), this.objectTypeInstances = In(t.objectTypeInstances), this.#i = In(t.functionDeclarations), this.#r = In(t.operatorDeclarations), this.#n = In(
      t.typeDeclarations || Object.entries(Qt),
      void 0,
      !1
    ), this.constants = In(t.constants), this.variables = t.unlistedVariablesAreDyn ? In(t.variables, WI) : In(t.variables), this.variables.size)
      VI(this, this.enableOptionalTypes);
    else {
      for (const n of h0) this.registerType(n[1], n[0], !0);
      for (const n in Us) this.registerConstant(n, "type", Us[n]);
    }
  }
  #g() {
    this.#t = {}, this.#e = {};
  }
  registerVariable(t, n) {
    if (this.variables.has(t)) throw new Error(`Variable already registered: ${t}`);
    return this.variables.set(t, n instanceof $r ? n : this.getType(n)), this;
  }
  registerConstant(t, n, r) {
    return this.registerVariable(t, n), this.constants.set(t, r), this;
  }
  #y(t, n, r) {
    let i = this.#o.get(t);
    return i = i.get(n) || i.set(n, /* @__PURE__ */ new Map()).get(n), i.get(r) || i.set(r, new qI(this)).get(r);
  }
  getFunctionCandidates(t, n, r) {
    const i = this.#o.get(t)?.get(n)?.get(r);
    if (i) return i;
    for (const [, s] of this.#i)
      this.#y(!!s.receiverType, s.name, s.argTypes.length).add(s);
    return this.#y(t, n, r);
  }
  getType(t) {
    return this.#s(t, !0);
  }
  getDynType(t) {
    return this.#a.get(t) || this.#a.set(t, this.#s(`dyn<${t.unwrappedType}>`, !0)).get(t);
  }
  getListType(t) {
    return this.#c.get(t) || this.#c.set(t, this.#s(`list<${t}>`, !0)).get(t);
  }
  getMapType(t, n) {
    return this.#u.get(t)?.get(n) || (this.#u.get(t) || this.#u.set(t, /* @__PURE__ */ new Map()).get(t)).set(n, this.#s(`map<${t}, ${n}>`, !0)).get(n);
  }
  getOptionalType(t) {
    return this.#p.get(t) || this.#p.set(t, this.#s(`optional<${t}>`, !0)).get(t);
  }
  assertType(t, n, r) {
    try {
      return this.#s(t, !0);
    } catch (i) {
      throw i.message = `Invalid ${n} '${i.unknownType || t}' in '${r}'`, i;
    }
  }
  getFunctionType(t) {
    return t === "ast" ? sa : this.#s(t, !0);
  }
  registerType(t, n, r) {
    if (typeof t != "string" || t.length < 2)
      throw new Error(`Invalid type name: ${t}`);
    const i = {
      name: t,
      typeType: Us[t] || new ue(t),
      type: this.#s(t, !1),
      ctor: typeof n == "function" ? n : n?.ctor,
      fields: this.#S(t, n?.fields)
    };
    if (!r) {
      if (this.objectTypes.has(t)) throw new Error(`Type already registered: ${t}`);
      if (typeof i.ctor != "function")
        throw new Error(`Constructor function missing for type '${t}'`);
    }
    return this.objectTypes.set(t, i), this.objectTypesByConstructor.set(i.ctor, i), r ? this : (this.objectTypeInstances.set(t, i.typeType), this.registerFunctionOverload(`type(${t}): type`, () => i.typeType), this);
  }
  getObjectType(t) {
    return this.objectTypes.get(t);
  }
  /** @returns {TypeDeclaration} */
  #s(t, n = !1) {
    let r = this.#n.get(t);
    if (r) return r;
    if (r = t.match(/^[A-Z]$/), r) return this.#l(GI, t, t);
    if (r = t.match(/^dyn<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(l0, `dyn<${i}>`, i);
    }
    if (r = t.match(/^list<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(u0, `list<${i}>`, i);
    }
    if (r = t.match(/^map<(.+)>$/), r) {
      const i = Sg(r[1]);
      if (i.length !== 2) throw new Error(`Invalid map type: ${t}`);
      const s = this.#s(i[0].trim(), n), o = this.#s(i[1].trim(), n);
      return this.#l(d0, `map<${s}, ${o}>`, s, o);
    }
    if (r = t.match(/^optional<(.+)>$/), r) {
      const i = this.#s(r[1].trim(), n);
      return this.#l(f0, `optional<${i}>`, i);
    }
    if (n) {
      const i = new Error(`Unknown type: ${t}`);
      throw i.unknownType = t, i;
    }
    return this.#l(jI, t, t);
  }
  #l(t, n, ...r) {
    return this.#n.get(n) || this.#n.set(n, t(...r)).get(n);
  }
  findMacro(t, n, r) {
    return this.#t[n]?.get(t)?.get(r) ?? this.#d(
      this.#t,
      n,
      t,
      r,
      this.getFunctionCandidates(n, t, r).declarations.find(
        (i) => i.macro
      ) || !1
    );
  }
  #w(t, n, r) {
    const i = [];
    for (const [, s] of this.#r) {
      if (s.operator !== t) continue;
      if (s.leftType === n && s.rightType === r) return [s];
      const o = this.#E(s, n, r);
      o && i.push(o);
    }
    return i.length === 0 && (t === "==" || t === "!=") && (n.kind === "dyn" || r.kind === "dyn") ? [{ handler: t === "==" ? (o, a) => o === a : (o, a) => o !== a, returnType: this.getType("bool") }] : i;
  }
  findUnaryOverload(t, n) {
    const r = this.#t[t]?.get(n);
    if (r !== void 0) return r;
    let i = !1;
    for (const [, s] of this.#r)
      if (!(s.operator !== t || s.leftType !== n)) {
        i = s;
        break;
      }
    return (this.#t[t] ??= /* @__PURE__ */ new Map()).set(n, i).get(n);
  }
  findBinaryOverload(t, n, r) {
    return this.#t[t]?.get(n)?.get(r) ?? this.#d(
      this.#t,
      t,
      n,
      r,
      this.#m(t, n, r)
    );
  }
  checkBinaryOverload(t, n, r) {
    return this.#e[t]?.get(n)?.get(r) ?? this.#d(
      this.#e,
      t,
      n,
      r,
      this.#b(t, n, r)
    );
  }
  #m(t, n, r) {
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    if (i.length === 1) return i[0];
    throw new Error(`Operator overload '${i[0].signature}' overlaps with '${i[1].signature}'.`);
  }
  #b(t, n, r) {
    const i = this.#w(t, n, r);
    if (i.length === 0) return !1;
    const s = i[0].returnType;
    return i.every((o) => o.returnType === s) ? s : (s.kind === "list" || s.kind === "map") && i.every((o) => o.returnType.kind === s.kind) ? s.kind === "list" ? Qt.list : Qt.map : Qt.dyn;
  }
  #d(t, n, r, i, s) {
    const o = t[n] ??= /* @__PURE__ */ new Map();
    return (o.get(r) || o.set(r, /* @__PURE__ */ new Map()).get(r)).set(i, s), s;
  }
  #E(t, n, r) {
    const i = t.hasPlaceholder() ? /* @__PURE__ */ new Map() : null, s = this.matchTypeWithPlaceholders(t.leftType, n, i);
    if (!s) return;
    const o = this.matchTypeWithPlaceholders(t.rightType, r, i);
    if (o)
      return (t.operator === "==" || t.operator === "!=") && !s.matchesBoth(o) ? !1 : t.hasPlaceholder() ? {
        handler: t.handler,
        leftType: s,
        rightType: o,
        returnType: t.returnType.templated(this, i)
      } : t;
  }
  matchTypeWithPlaceholders(t, n, r) {
    if (!t.hasPlaceholder()) return n.matches(t) ? n : null;
    const i = n.kind === "dyn";
    return this.#f(t, n, r, i) && (i || n.matches(t.templated(this, r))) ? n : null;
  }
  #T(t, n, r) {
    const i = r.get(t);
    return i ? i.kind === "dyn" || n.kind === "dyn" ? !0 : i.matchesBoth(n) : r.set(t, n) && !0;
  }
  #f(t, n, r, i = !1) {
    if (!t.hasPlaceholder()) return !0;
    if (!n) return !1;
    const s = i || n.kind === "dyn";
    switch (n = n.unwrappedType, t.kind) {
      case "param": {
        const o = s ? Qt.dyn : n;
        return this.#T(t.name, o, r);
      }
      case "list":
        return n.name === "dyn" && (n = t), n.kind !== "list" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "map":
        return n.name === "dyn" && (n = t), n.kind !== "map" ? !1 : this.#f(
          t.keyType,
          n.keyType,
          r,
          s
        ) && this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
      case "optional":
        return n.name === "dyn" && (n = t), n.kind !== "optional" ? !1 : this.#f(
          t.valueType,
          n.valueType,
          r,
          s
        );
    }
    return !0;
  }
  #x(t, n, r, i = !1) {
    try {
      const s = typeof n[r] == "string" ? { type: n[r] } : { ...n[r] };
      if (typeof s?.type != "string") throw new Error("unsupported declaration");
      return this.#s(s.type, i);
    } catch (s) {
      throw s.message = `Field '${r}' in type '${t}' has unsupported declaration: ${JSON.stringify(n[r])}`, s;
    }
  }
  #S(t, n) {
    if (!n) return;
    const r = /* @__PURE__ */ Object.create(null);
    for (const i of Object.keys(n)) r[i] = this.#x(t, n, i);
    return r;
  }
  clone(t) {
    return new Fd({
      objectTypes: this.objectTypes,
      objectTypesByConstructor: this.objectTypesByConstructor,
      objectTypeInstances: this.objectTypeInstances,
      typeDeclarations: this.#n,
      operatorDeclarations: this.#r,
      functionDeclarations: this.#i,
      variables: this.variables,
      constants: this.constants,
      unlistedVariablesAreDyn: t.unlistedVariablesAreDyn,
      enableOptionalTypes: t.enableOptionalTypes
    });
  }
  /** @param {string} signature */
  #v(t, n) {
    const r = t.match(/^(?:([a-zA-Z0-9.<>]+)\.)?(\w+)\((.*?)\):\s*(.+)$/);
    if (!r) throw new Error(`Invalid signature: ${t}`);
    const [, i, s, o, a] = r;
    try {
      return new zI({
        name: s,
        receiverType: i ? this.getType(i) : null,
        returnType: this.getType(a.trim()),
        argTypes: Sg(o).map((c) => this.getFunctionType(c.trim())),
        handler: n
      });
    } catch (c) {
      throw new Error(`Invalid function declaration: ${t}: ${c.message}`);
    }
  }
  /**
   * @param {FunctionDeclaration} a
   * @param {FunctionDeclaration} b
   */
  #A(t, n) {
    return t.name !== n.name || t.argTypes.length !== n.argTypes.length || (t.receiverType || n.receiverType) && (!t.receiverType || !n.receiverType) ? !1 : !(t.receiverType !== n.receiverType && t.receiverType !== Ke && n.receiverType !== Ke) && (n.macro || t.macro || n.argTypes.every((i, s) => {
      const o = t.argTypes[s];
      return i === o || i === sa || o === sa || i === Ke || o === Ke;
    }));
  }
  /** @param {FunctionDeclaration} newDec */
  #k(t) {
    for (const [, n] of this.#i)
      if (this.#A(n, t))
        throw new Error(
          `Function signature '${t.signature}' overlaps with existing overload '${n.signature}'.`
        );
  }
  registerFunctionOverload(t, n) {
    const r = typeof n == "function" ? n : n?.handler, i = this.#v(t, r);
    this.#k(i), this.#i.set(i.signature, i), this.#o.get(!0).clear(), this.#o.get(!1).clear();
  }
  registerOperatorOverload(t, n) {
    const r = t.match(/^([-!])([\w.<>]+)(?::\s*([\w.<>]+))?$/);
    if (r) {
      const [, u, l, f] = r;
      return this.unaryOverload(u, l, n, f);
    }
    const i = t.match(
      /^([\w.<>]+) ([-+*%/]|==|!=|<|<=|>|>=|in) ([\w.<>]+)(?::\s*([\w.<>]+))?$/
    );
    if (!i) throw new Error(`Operator overload invalid: ${t}`);
    const [, s, o, a, c] = i;
    return this.binaryOverload(s, o, a, n, c);
  }
  unaryOverload(t, n, r, i) {
    const s = this.assertType(n, "type", `${t}${n}`), o = this.assertType(
      i || n,
      "return type",
      `${t}${n}: ${i || n}`
    ), a = new hs({ operator: `${t}_`, leftType: s, returnType: o, handler: r });
    if (this.#h(a))
      throw new Error(`Operator overload already registered: ${t}${n}`);
    this.#r.set(a.signature, a), this.#g();
  }
  #h(t) {
    for (const [, n] of this.#r) if (t.equals(n)) return !0;
    return !1;
  }
  binaryOverload(t, n, r, i, s) {
    s ??= vg(n) ? "bool" : t;
    const o = `${t} ${n} ${r}: ${s}`, a = this.assertType(t, "left type", o), c = this.assertType(r, "right type", o), u = this.assertType(s, "return type", o);
    if (vg(n) && u.type !== "bool")
      throw new Error(`Comparison operator '${n}' must return 'bool', got '${u.type}'`);
    const l = new hs({ operator: n, leftType: a, rightType: c, returnType: u, handler: i });
    if (l.hasPlaceholder() && !(c.hasPlaceholder() && a.hasPlaceholder()))
      throw new Error(
        `Operator overload with placeholders must use them in both left and right types: ${o}`
      );
    if (this.#h(l))
      throw new Error(`Operator overload already registered: ${l.signature}`);
    if (n === "==") {
      const f = [
        new hs({
          operator: "!=",
          leftType: a,
          rightType: c,
          handler(h, p, y, d) {
            return !i(h, p, y, d);
          },
          returnType: u
        })
      ];
      a !== c && f.push(
        new hs({
          operator: "==",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return i(p, h, y, d);
          },
          returnType: u
        }),
        new hs({
          operator: "!=",
          leftType: c,
          rightType: a,
          handler(h, p, y, d) {
            return !i(p, h, y, d);
          },
          returnType: u
        })
      );
      for (const h of f)
        if (this.#h(h))
          throw new Error(`Operator overload already registered: ${h.signature}`);
      for (const h of f) this.#r.set(h.signature, h);
    }
    this.#r.set(l.signature, l), this.#g();
  }
}
function vg(e) {
  return e === "<" || e === "<=" || e === ">" || e === ">=" || e === "==" || e === "!=" || e === "in";
}
function YI(e) {
  return new Fd(e);
}
class ZI {
  constructor(t, n) {
    this.variables = t, this.fallbackValues = n;
  }
  getType(t) {
    return this.variables.get(t);
  }
  getValue(t) {
    return this.fallbackValues.get(t);
  }
  fork() {
    return new rc(this);
  }
}
class rc {
  parent;
  context;
  variableName;
  variableType;
  variableValue;
  constructor(t) {
    this.parent = t;
  }
  fork() {
    return new rc(this);
  }
  forkWithVariable(t, n) {
    const r = new rc(this);
    return r.variableType = t, r.variableName = n, r;
  }
  withContext(t) {
    if (typeof t != "object") throw new tt("Context must be an object");
    return this.context = t, t ? t instanceof Map ? this.getValue = this.#e : this.getValue = this.#t : this.getValue = this.#n, this;
  }
  setVariableValue(t) {
    return this.variableValue = t, this;
  }
  getValue(t) {
    return this.#n(t);
  }
  #t(t) {
    if (this.variableName === t) return this.variableValue;
    const n = Object.hasOwn(this.context, t) ? this.context[t] : void 0;
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #e(t) {
    if (this.variableName === t) return this.variableValue;
    const n = this.context.get(t);
    return n !== void 0 ? n : this.parent.getValue(t);
  }
  #n(t) {
    return this.variableName === t ? this.variableValue : this.parent.getValue(t);
  }
  getType(t) {
    return this.variableName === t ? this.variableType : this.parent.getType(t);
  }
}
function Kc(e, t) {
  if (e.op === "id") return e.args;
  throw new bt(t, e);
}
function po(e, t) {
  if (typeof t == "boolean") return !1;
  if (t instanceof Error)
    return e.error ??= t, /predicate must return bool|Unknown variable/.test(t.message);
  const n = e.ev.debugRuntimeType(t, e.firstMacroIter.checkedType);
  return e.error = new tt(
    `${e.macro.functionDesc} predicate must return bool, got '${n}'`,
    e.firstMacroIter
  ), !0;
}
class XI {
  items;
  results;
  error;
  constructor(t, n, r, i, s) {
    this.ev = t, this.macro = n, this.firstMacroIter = n.first, this.ctx = r.forkWithVariable(n.variableType, n.predicateVar), this.each = i, this.finalizer = s;
  }
  toIterable(t) {
    if (Array.isArray(t)) return t;
    if (t instanceof Set) return [...t];
    if (t instanceof Map) return [...t.keys()];
    if (t && typeof t == "object") return Object.keys(t);
    throw new tt(
      `Expression of type '${this.ev.debugType(t)}' cannot be range of a comprehension (must be list, map, or dynamic).`,
      this.macro.receiver
    );
  }
  iterate(t) {
    const n = this.toIterable(t);
    for (let r = 0; r < n.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(n[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      if (s instanceof Promise ? s = s.then((o) => this.each(this, i, o)) : s = this.each(this, i, s), s instanceof Promise) return s.then(() => this.iterateAsync(n, r));
    }
    return this.finalizer(this);
  }
  async iterateAsync(t, n = 0) {
    t instanceof Promise && (t = this.toIterable(await t));
    for (let r = n; r < t.length && this.return === void 0; ) {
      const i = this.ctx.setVariableValue(t[r++]);
      let s = this.ev.tryEval(this.firstMacroIter, i);
      s = this.each(this, i, s instanceof Promise ? await s : s), s instanceof Promise && await s;
    }
    return this.finalizer(this);
  }
}
function _s(e, t) {
  return function(n, r, i) {
    const s = n.eval(r.receiver, i), o = new XI(n, r, i, e, t);
    return s instanceof Promise ? o.iterateAsync(s) : o.iterate(s);
  };
}
function QI(e, t, n) {
  if (po(e, n)) throw e.error;
  n === !1 && (e.return = !1);
}
function JI(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !0;
}
function t$(e, t, n) {
  if (po(e, n)) throw e.error;
  n === !0 && (e.return = !0);
}
function e$(e) {
  if (e.return !== void 0) return e.return;
  if (e.error) throw e.error;
  return !1;
}
function n$(e, t, n) {
  if (po(e, n) || n instanceof Error) throw e.error;
  n && (e.found ? e.return = !1 : e.found = !0);
}
function r$(e) {
  return e.return !== void 0 ? e.return : e.found === !0;
}
function p0(e) {
  return e.results || [];
}
function i$(e, t, n) {
  if (n === !1) return;
  if (po(e, n) || n instanceof Error) throw e.error;
  const r = e.ev.eval(e.macro.second, t);
  return r instanceof Promise ? r.then((i) => (e.results ??= []).push(i)) : (e.results ??= []).push(r);
}
function s$(e, t, n) {
  if (n instanceof Error) throw e.error;
  return (e.results ??= []).push(n);
}
function o$(e, t, n) {
  if (po(e, n) || n instanceof Error) throw e.error;
  n && (e.results ??= []).push(t.variableValue);
}
function a$(e, t, n) {
  if (t.kind === "dyn") return t;
  if (t.kind === "list") return t.valueType;
  if (t.kind === "map") return t.keyType;
  throw new e.Error(
    `Expression of type '${t}' cannot be range of a comprehension (must be list, map, or dynamic).`,
    n.receiver
  );
}
function Wd(e, t, n) {
  const r = a$(e, e.check(t.receiver, n), t);
  return n.forkWithVariable(r, t.predicateVar);
}
function il({ description: e, evaluator: t }) {
  const n = `${e} invalid predicate iteration variable`;
  if (!t) throw new Error(`No evaluator provided for quantifier macro: ${e}`);
  function r(i, s, o) {
    o = Wd(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return a;
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Kc(i[0], n),
    evaluate: t,
    typeCheck: r
  });
}
function Ag(e) {
  const t = e ? "map(var, filter, transform)" : "map(var, transform)", n = `${t} invalid predicate iteration variable`, r = _s(
    e ? i$ : s$,
    p0
  );
  function i(s, o, a) {
    if (a = Wd(s, o, a), o.variableType = a.variableType, e) {
      const c = s.check(o.first, a);
      if (!c.isDynOrBool())
        throw new s.Error(
          `${o.functionDesc} filter predicate must return bool, got '${c}'`,
          o.first
        );
    }
    return s.getType(`list<${s.check(e ? o.second : o.first, a)}>`);
  }
  return ({ args: s, receiver: o }) => ({
    args: s,
    functionDesc: t,
    receiver: o,
    first: s[1],
    second: e ? s[2] : null,
    predicateVar: Kc(s[0], n),
    evaluate: r,
    typeCheck: i
  });
}
function c$() {
  const e = "filter(var, predicate)", t = `${e} invalid predicate iteration variable`, n = _s(o$, p0);
  function r(i, s, o) {
    o = Wd(i, s, o), s.variableType = o.variableType;
    const a = i.check(s.first, o);
    if (a.isDynOrBool()) return i.getType(`list<${s.variableType}>`);
    throw new i.Error(
      `${s.functionDesc} predicate must return bool, got '${a}'`,
      s.first
    );
  }
  return ({ args: i, receiver: s }) => ({
    args: i,
    functionDesc: e,
    receiver: s,
    first: i[1],
    predicateVar: Kc(i[0], t),
    evaluate: n,
    typeCheck: r
  });
}
function u$() {
  const e = "has() invalid argument";
  function t(r, i, s) {
    const o = i.macroHasProps;
    let a = o.length, c = r.eval(o[--a], s), u;
    for (; a--; ) {
      const l = o[a];
      if (l.op === ".?" && (u ??= !0), c = r.debugType(c).fieldLazy(c, l.args[1], l, r), c === void 0) {
        if (!(!u && a && l.op === ".")) break;
        throw new tt(`No such key: ${l.args[1]}`, l);
      }
    }
    return c !== void 0;
  }
  function n(r, i, s) {
    let o = i.args[0];
    if (o.op !== ".") throw new r.Error(e, o);
    if (!i.macroHasProps) {
      const a = [];
      for (; (o.op === "." || o.op === ".?") && a.push(o); ) o = o.args[0];
      if (o.op !== "id") throw new r.Error(e, o);
      r.check(o, s), a.push(o), i.macroHasProps = a;
    }
    return r.getType("bool");
  }
  return function({ args: r }) {
    return { args: r, evaluate: t, typeCheck: n };
  };
}
function l$(e) {
  e.registerFunctionOverload("has(ast): bool", u$()), e.registerFunctionOverload(
    "list.all(ast, ast): bool",
    il({
      description: "all(var, predicate)",
      evaluator: _s(QI, JI)
    })
  ), e.registerFunctionOverload(
    "list.exists(ast, ast): bool",
    il({
      description: "exists(var, predicate)",
      evaluator: _s(t$, e$)
    })
  ), e.registerFunctionOverload(
    "list.exists_one(ast, ast): bool",
    il({
      description: "exists_one(var, predicate)",
      evaluator: _s(n$, r$)
    })
  ), e.registerFunctionOverload("list.map(ast, ast): list<dyn>", Ag(!1)), e.registerFunctionOverload("list.map(ast, ast, ast): list<dyn>", Ag(!0)), e.registerFunctionOverload("list.filter(ast, ast): list<dyn>", c$());
  function t(i, s, o, a) {
    return i.eval(
      s.exp,
      o.forkWithVariable(s.val.checkedType, s.var).setVariableValue(a)
    );
  }
  class n {
  }
  const r = new n();
  e.registerType("CelNamespace", n), e.registerConstant("cel", "CelNamespace", r), e.registerFunctionOverload("CelNamespace.bind(ast, dyn, ast): dyn", ({ args: i }) => ({
    var: Kc(i[0], "invalid variable argument"),
    val: i[1],
    exp: i[2],
    typeCheck(s, o, a) {
      const c = a.forkWithVariable(s.check(o.val, a), o.var);
      return s.check(o.exp, c);
    },
    evaluate(s, o, a) {
      const c = s.eval(o.val, a);
      return c instanceof Promise ? c.then((u) => t(s, o, a, u)) : t(s, o, a, c);
    }
  }));
}
function f$(e) {
  const t = e.unaryOverload.bind(e), n = e.binaryOverload.bind(e);
  function r(u, l) {
    if (u <= 9223372036854775807n && u >= -9223372036854775808n) return u;
    throw new tt(`integer overflow: ${u}`, l);
  }
  t("!", "bool", (u) => !u), t("-", "int", (u) => -u), n("dyn<int>", "==", "double", (u, l) => u == l), n("dyn<int>", "==", "uint", (u, l) => u == l.valueOf()), n("int", "*", "int", (u, l, f) => r(u * l, f)), n("int", "+", "int", (u, l, f) => r(u + l, f)), n("int", "-", "int", (u, l, f) => r(u - l, f)), n("int", "/", "int", (u, l, f) => {
    if (l === 0n) throw new tt("division by zero", f);
    return u / l;
  }), n("int", "%", "int", (u, l, f) => {
    if (l === 0n) throw new tt("modulo by zero", f);
    return u % l;
  }), t("-", "double", (u) => -u), n("dyn<double>", "==", "int", (u, l) => u == l), n("dyn<double>", "==", "uint", (u, l) => u == l.valueOf()), n("double", "*", "double", (u, l) => u * l), n("double", "+", "double", (u, l) => u + l), n("double", "-", "double", (u, l) => u - l), n("double", "/", "double", (u, l) => u / l), n("string", "+", "string", (u, l) => u + l), n("list<V>", "+", "list<V>", (u, l) => [...u, ...l]), n("bytes", "+", "bytes", (u, l) => {
    const f = new Uint8Array(u.length + l.length);
    return f.set(u, 0), f.set(l, u.length), f;
  });
  const i = "google.protobuf.Duration";
  n(i, "+", i, (u, l) => u.addDuration(l)), n(i, "-", i, (u, l) => u.subtractDuration(l)), n(i, "==", i, (u, l) => u.seconds === l.seconds && u.nanos === l.nanos);
  const s = "google.protobuf.Timestamp";
  n(s, "==", s, (u, l) => u.getTime() === l.getTime()), n(s, "-", s, (u, l) => dr.fromMilliseconds(u.getTime() - l.getTime()), i), n(s, "-", i, (u, l) => l.subtractTimestamp(u)), n(s, "+", i, (u, l) => l.extendTimestamp(u)), n(i, "+", s, (u, l) => u.extendTimestamp(l));
  function o(u, l, f, h) {
    if (l instanceof Set && l.has(u)) return !0;
    for (const p of l) if (ps(u, p, h)) return !0;
    return !1;
  }
  function a(u, l) {
    return l instanceof Map ? l.get(u) !== void 0 : Object.hasOwn(l, u) ? l[u] !== void 0 : !1;
  }
  function c(u, l, f, h) {
    return o(u, l, f, h);
  }
  n("V", "in", "list<V>", c), n("K", "in", "map<K, V>", a);
  for (const u of ["type", "null", "bool", "string", "int", "double"])
    n(u, "==", u, (l, f) => l === f);
  n("bytes", "==", "bytes", (u, l) => {
    let f = u.length;
    if (f !== l.length) return !1;
    for (; f--; ) if (u[f] !== l[f]) return !1;
    return !0;
  }), n("list<V>", "==", "list<V>", (u, l, f, h) => {
    if (Array.isArray(u) && Array.isArray(l)) {
      const d = u.length;
      if (d !== l.length) return !1;
      for (let g = 0; g < d; g++)
        if (!ps(u[g], l[g], h)) return !1;
      return !0;
    }
    if (u instanceof Set && l instanceof Set) {
      if (u.size !== l.size) return !1;
      for (const d of u) if (!l.has(d)) return !1;
      return !0;
    }
    const p = u instanceof Set ? l : u, y = u instanceof Set ? u : l;
    if (!Array.isArray(p) || p.length !== y?.size) return !1;
    for (let d = 0; d < p.length; d++) if (!y.has(p[d])) return !1;
    return !0;
  }), n("map<K, V>", "==", "map<K, V>", (u, l, f, h) => {
    if (u instanceof Map && l instanceof Map) {
      if (u.size !== l.size) return !1;
      for (const [d, g] of u)
        if (!(l.has(d) && ps(g, l.get(d), h))) return !1;
      return !0;
    }
    if (u instanceof Map || l instanceof Map) {
      const d = u instanceof Map ? l : u, g = u instanceof Map ? u : l, m = Object.keys(d);
      if (g.size !== m.length) return !1;
      for (const [v, k] of g)
        if (!(v in d && ps(k, d[v], h))) return !1;
      return !0;
    }
    const p = Object.keys(u), y = Object.keys(l);
    if (p.length !== y.length) return !1;
    for (let d = 0; d < p.length; d++) {
      const g = p[d];
      if (!(g in l && ps(u[g], l[g], h))) return !1;
    }
    return !0;
  }), n("uint", "==", "uint", (u, l) => u.valueOf() === l.valueOf()), n("dyn<uint>", "==", "double", (u, l) => u.valueOf() == l), n("dyn<uint>", "==", "int", (u, l) => u.valueOf() == l), n("uint", "+", "uint", (u, l) => new _r(u.valueOf() + l.valueOf())), n("uint", "-", "uint", (u, l) => new _r(u.valueOf() - l.valueOf())), n("uint", "*", "uint", (u, l) => new _r(u.valueOf() * l.valueOf())), n("uint", "/", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new tt("division by zero", f);
    return new _r(u.valueOf() / l.valueOf());
  }), n("uint", "%", "uint", (u, l, f) => {
    if (l.valueOf() === 0n) throw new tt("modulo by zero", f);
    return new _r(u.valueOf() % l.valueOf());
  });
  for (const [u, l] of [
    ["int", "int"],
    ["uint", "uint"],
    ["double", "double"],
    ["string", "string"],
    ["google.protobuf.Timestamp", "google.protobuf.Timestamp"],
    ["google.protobuf.Duration", "google.protobuf.Duration"],
    ["int", "uint"],
    ["int", "double"],
    ["double", "int"],
    ["double", "uint"],
    ["uint", "int"],
    ["uint", "double"]
  ])
    n(u, "<", l, (f, h) => f < h), n(u, "<=", l, (f, h) => f <= h), n(u, ">", l, (f, h) => f > h), n(u, ">=", l, (f, h) => f >= h);
}
function ps(e, t, n) {
  if (e === t) return !0;
  switch (typeof e) {
    case "string":
      return !1;
    case "bigint":
      return typeof t == "number" ? e == t : !1;
    case "number":
      return typeof t == "bigint" ? e == t : !1;
    case "boolean":
      return !1;
    case "object":
      if (typeof t != "object" || e === null || t === null) return !1;
      const r = n.objectTypesByConstructor.get(e.constructor)?.type, i = n.objectTypesByConstructor.get(t.constructor)?.type;
      if (!r || r !== i) return !1;
      const s = n.registry.findBinaryOverload("==", r, i);
      return s ? s.handler(e, t, null, n) : !1;
  }
  throw new tt(`Cannot compare values of type ${typeof e}`);
}
class g0 {
  dynType = Qt.dyn;
  optionalType = Qt.optional;
  stringType = Qt.string;
  intType = Qt.int;
  doubleType = Qt.double;
  boolType = Qt.bool;
  nullType = Qt.null;
  listType = Qt.list;
  mapType = Qt.map;
  constructor(t) {
    this.opts = t.opts, this.objectTypes = t.objectTypes, this.objectTypesByConstructor = t.objectTypesByConstructor, this.registry = t.registry;
  }
  /**
   * Get a TypeDeclaration instance for a type name
   * @param {string} typeName - The type name (e.g., 'string', 'int', 'dyn')
   * @returns {TypeDeclaration} The type declaration instance
   */
  getType(t) {
    return this.registry.getType(t);
  }
  debugType(t) {
    switch (typeof t) {
      case "string":
        return this.stringType;
      case "bigint":
        return this.intType;
      case "number":
        return this.doubleType;
      case "boolean":
        return this.boolType;
      case "object":
        return t === null ? this.nullType : this.objectTypesByConstructor.get(t.constructor)?.type || kg(this, t.constructor?.name || typeof t);
      default:
        kg(this, typeof t);
    }
  }
}
function kg(e, t) {
  throw new e.Error(`Unsupported type: ${t}`);
}
function oa(e, t, n, r, i) {
  return n instanceof Promise || r instanceof Promise ? Promise.all([n, r]).then((s) => i(e, t, s[0], s[1])) : i(e, t, n, r);
}
function Ig(e, t, n) {
  const r = e.check(t.args[0], n);
  return t.op === "[]" && e.check(t.args[1], n), r.kind !== "optional" ? e.checkAccessOnType(t, n, r) : e.registry.getOptionalType(e.checkAccessOnType(t, n, r.valueType, !0));
}
function $g(e, t, n) {
  const r = e.check(t.args[0], n);
  t.op === "[?]" && e.check(t.args[1], n);
  const i = r.kind === "optional" ? r.valueType : r;
  return e.registry.getOptionalType(e.checkAccessOnType(t, n, i, !0));
}
function Cg(e, t, n, r, i) {
  const s = e.check(r, t);
  if (s === n || n.isEmpty()) return s;
  if (s.isEmpty()) return n;
  let o;
  throw i === 0 ? o = "List elements must have the same type," : i === 1 ? o = "Map key uses wrong type," : i === 2 && (o = "Map value uses wrong type,"), new e.Error(
    `${o} expected type '${e.formatType(n)}' but found '${e.formatType(s)}'`,
    r
  );
}
function Og(e, t, n, r) {
  return n.unify(e.registry, e.check(r, t)) || e.dynType;
}
function ic(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Logical operator requires bool operands, got '${r}'`, n);
}
function d$(e, t, n) {
  const r = e.debugRuntimeType(t, n.checkedType);
  return new e.Error(`Ternary condition must be bool, got '${r}'`, n);
}
function Bg(e, t, n, r) {
  if (n === !0) return e.eval(t.args[1], r);
  if (n === !1) return e.eval(t.args[2], r);
  throw d$(e, n, t.args[0]);
}
function Ng(e, t, n) {
  const r = e.debugRuntimeType(n, t.args[0].checkedType), i = e.registry.findUnaryOverload(t.op, r);
  if (i) return i.handler(n);
  throw new e.Error(`no such overload: ${t.op[0]}${r}`, t);
}
function Pg(e, t, n) {
  const r = e.eval(t.args[0], n);
  return r instanceof Promise ? r.then((i) => Ng(e, t, i)) : Ng(e, t, r);
}
function h$(e, t, n, r) {
  const i = e.debugOperandType(n, t.args[0].checkedType), s = e.debugOperandType(r, t.args[1].checkedType), o = e.registry.findBinaryOverload(t.op, i, s);
  if (o) return o.handler(n, r, t, e);
  throw new e.Error(`no such overload: ${i} ${t.op} ${s}`, t);
}
function p$(e, t, n) {
  return oa(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), h$);
}
function Rg(e, t, n, r) {
  if (n === !0) return !0;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Ug(e, t, n, s)) : Ug(e, t, n, i);
}
function Ug(e, t, n, r) {
  if (r === !0) return !0;
  if (r !== !1) throw ic(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !1) throw ic(e, n, t.args[0]);
  return !1;
}
function _g(e, t, n, r) {
  if (n === !1) return !1;
  const i = e.eval(t.args[1], r);
  return i instanceof Promise ? i.then((s) => Lg(e, t, n, s)) : Lg(e, t, n, i);
}
function Lg(e, t, n, r) {
  if (r === !1) return !1;
  if (r !== !0) throw ic(e, r, t.args[1]);
  if (n instanceof Error) throw n;
  if (n !== !0) throw ic(e, n, t.args[0]);
  return !0;
}
function Dg(e, t, n) {
  const r = e.check(t.args[0], n), i = e.check(t.args[1], n);
  if (!r.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(r)}'`,
      t
    );
  if (!i.isDynOrBool())
    throw new e.Error(
      `Logical operator requires bool operands, got '${e.formatType(i)}'`,
      t
    );
  return e.boolType;
}
function Vg(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n);
  if (i.kind === "dyn") return r === "!_" ? e.boolType : i;
  const s = e.registry.findUnaryOverload(r, i);
  if (s) return s.returnType;
  throw new e.Error(`no such overload: ${r[0]}${e.formatType(i)}`, t);
}
function g$(e, t, n) {
  const r = t.op, i = e.check(t.args[0], n), s = e.check(t.args[1], n), o = e.registry.checkBinaryOverload(r, i, s);
  if (o) return o;
  throw new e.Error(
    `no such overload: ${e.formatType(i)} ${r} ${e.formatType(s)}`,
    t
  );
}
function Mg(e, t, n) {
  const [r, i] = t.args, s = i.length, o = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !1,
    r,
    s
  ), a = t.argTypes ??= new Array(s);
  let c = s;
  for (; c--; ) a[c] = e.debugOperandType(n[c], i[c].checkedType);
  const u = o.findMatch(a, null);
  if (u) return u.handler.apply(e, n);
  throw new e.Error(
    `found no matching overload for '${r}(${a.map((l) => l.unwrappedType).join(", ")})'`,
    t
  );
}
function y$(e, t, n, r) {
  const [i, s, o] = t.args, a = t.functionCandidates ??= e.registry.getFunctionCandidates(
    !0,
    i,
    o.length
  );
  let c = r.length;
  const u = t.argTypes ??= new Array(c);
  for (; c--; ) u[c] = e.debugOperandType(r[c], o[c].checkedType);
  const l = e.debugRuntimeType(n, s.checkedType || e.dynType), f = a.findMatch(u, l);
  if (f) return f.handler.call(e, n, ...r);
  throw new e.Error(
    `found no matching overload for '${l.type}.${i}(${u.map((h) => h.unwrappedType).join(", ")})'`,
    t
  );
}
function sl(e, t, n, r = n.length) {
  let i;
  const s = new Array(r);
  for (; r--; ) (s[r] = e.eval(n[r], t)) instanceof Promise && (i ??= !0);
  return i ? Promise.all(s) : s;
}
function Hg(e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const [r, i] = e[n];
    r === "__proto__" || r === "constructor" || r === "prototype" || (t[r] = i);
  }
  return t;
}
function ol(e, t, n, r) {
  return e.optionalType.field(n, r, t, e);
}
function al(e, t, n, r) {
  return e.debugType(n).field(n, r, t, e);
}
const sc = {
  value: {
    check(e, t) {
      return e.debugType(t.args);
    },
    evaluate(e, t) {
      return t.args;
    }
  },
  id: {
    check(e, t, n) {
      const r = n.getType(t.args);
      if (r !== void 0) return r;
      throw new e.Error(`Unknown variable: ${t.args}`, t);
    },
    evaluate(e, t, n) {
      const r = t.checkedType || n.getType(t.args), i = r && n.getValue(t.args);
      if (i === void 0) throw new e.Error(`Unknown variable: ${t.args}`, t);
      if (r.kind === "dyn") return e.debugType(i) && i;
      const s = e.debugType(i);
      if (r.matches(s)) return i;
      throw new e.Error(`Variable '${t.args}' is not of type '${r}', got '${s}'`, t);
    }
  },
  ".": {
    check: Ig,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => al(e, t, i, t.args[1])) : al(e, t, r, t.args[1]);
    }
  },
  ".?": {
    check: $g,
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => ol(e, t, i, t.args[1])) : ol(e, t, r, t.args[1]);
    }
  },
  "[]": {
    check: Ig,
    evaluate(e, t, n) {
      return oa(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), al);
    }
  },
  "[?]": {
    check: $g,
    evaluate(e, t, n) {
      return oa(e, t, e.eval(t.args[0], n), e.eval(t.args[1], n), ol);
    }
  },
  call: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[1], s = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !1,
        r,
        i.length
      ), o = i.map((c) => e.check(c, n)), a = s.findMatch(o);
      if (!a)
        throw new e.Error(
          `found no matching overload for '${r}(${e.formatTypeList(o)})'`,
          t
        );
      return a.returnType;
    },
    evaluate(e, t, n) {
      if (t.macro) return t.macro.evaluate(e, t.macro, n);
      const r = sl(e, n, t.args[1]);
      return r instanceof Promise ? r.then((i) => Mg(e, t, i)) : Mg(e, t, r);
    }
  },
  rcall: {
    check(e, t, n) {
      if (t.macro) return t.macro.typeCheck(e, t.macro, n);
      const r = t.args[0], i = t.args[2], s = e.check(t.args[1], n), o = t.functionCandidates ??= e.registry.getFunctionCandidates(
        !0,
        r,
        i.length
      ), a = i.map((u) => e.check(u, n));
      if (s.kind === "dyn" && o.returnType) return o.returnType;
      const c = o.findMatch(a, s);
      if (!c)
        throw new e.Error(
          `found no matching overload for '${s.type}.${r}(${e.formatTypeList(
            a
          )})'`,
          t
        );
      return c.returnType;
    },
    evaluate(e, t, n) {
      return t.macro ? t.macro.evaluate(e, t.macro, n) : oa(
        e,
        t,
        e.eval(t.args[1], n),
        sl(e, n, t.args[2]),
        y$
      );
    }
  },
  list: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("list<T>");
      let s = e.check(r[0], n);
      const o = e.opts.homogeneousAggregateLiterals ? Cg : Og;
      for (let a = 1; a < i; a++) s = o(e, n, s, r[a], 0);
      return e.registry.getListType(s);
    },
    evaluate(e, t, n) {
      return sl(e, n, t.args);
    }
  },
  map: {
    check(e, t, n) {
      const r = t.args, i = r.length;
      if (i === 0) return e.getType("map<K, V>");
      const s = e.opts.homogeneousAggregateLiterals ? Cg : Og;
      let o = e.check(r[0][0], n), a = e.check(r[0][1], n);
      for (let c = 1; c < i; c++) {
        const [u, l] = r[c];
        o = s(e, n, o, u, 1), a = s(e, n, a, l, 2);
      }
      return e.registry.getMapType(o, a);
    },
    evaluate(e, t, n) {
      const r = t.args, i = r.length, s = new Array(i);
      let o;
      for (let a = 0; a < i; a++) {
        const [c, u] = r[a], l = e.eval(c, n), f = e.eval(u, n);
        l instanceof Promise || f instanceof Promise ? (s[a] = Promise.all([l, f]), o ??= !0) : s[a] = [l, f];
      }
      return o ? Promise.all(s).then(Hg) : Hg(s);
    }
  },
  "?:": {
    check(e, t, n) {
      const r = e.check(t.args[0], n);
      if (!r.isDynOrBool())
        throw new e.Error(
          `Ternary condition must be bool, got '${e.formatType(r)}'`,
          t
        );
      const i = e.check(t.args[1], n), s = e.check(t.args[2], n), o = i.unify(e.registry, s);
      if (o) return o;
      throw new e.Error(
        `Ternary branches must have the same type, got '${e.formatType(
          i
        )}' and '${e.formatType(s)}'`,
        t
      );
    },
    evaluate(e, t, n) {
      const r = e.eval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Bg(e, t, i, n)) : Bg(e, t, r, n);
    }
  },
  "||": {
    check: Dg,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => Rg(e, t, i, n)) : Rg(e, t, r, n);
    }
  },
  "&&": {
    check: Dg,
    evaluate(e, t, n) {
      const r = e.tryEval(t.args[0], n);
      return r instanceof Promise ? r.then((i) => _g(e, t, i, n)) : _g(e, t, r, n);
    }
  },
  "!_": { check: Vg, evaluate: Pg },
  "-_": { check: Vg, evaluate: Pg }
}, w$ = ["!=", "==", "in", "+", "-", "*", "/", "%", "<", "<=", ">", ">="];
for (const e of w$) sc[e] = { check: g$, evaluate: p$ };
for (const e in sc) sc[e].name = e;
const m$ = (/* @__PURE__ */ new Map()).set("A", "dyn").set("T", "dyn").set("K", "dyn").set("V", "dyn");
class Fg extends g0 {
  constructor(t, n) {
    super(t), this.isEvaluating = n, this.Error = n ? tt : DI;
  }
  /**
   * Check an expression and return its inferred type
   * @param {Array|any} ast - The AST node to check
   * @returns {Object} The inferred type declaration
   * @throws {TypeError} If type checking fails
   */
  check(t, n) {
    return t.checkedType ??= t.check(this, t, n);
  }
  checkAccessOnType(t, n, r, i = !1) {
    if (r.kind === "dyn") return r;
    const s = (t.op === "[]" || t.op === "[?]" ? this.check(t.args[1], n) : this.stringType).type;
    if (r.kind === "list") {
      if (s !== "int" && s !== "dyn")
        throw new this.Error(`List index must be int, got '${s}'`, t);
      return r.valueType;
    }
    if (r.kind === "map") return r.valueType;
    const o = this.objectTypes.get(r.name);
    if (o) {
      if (!(s === "string" || s === "dyn"))
        throw new this.Error(
          `Cannot index type '${r.name}' with type '${s}'`,
          t
        );
      if (o.fields) {
        const a = t.op === "." || t.op === ".?" ? t.args[1] : void 0;
        if (a) {
          const c = o.fields[a];
          if (c) return c;
          if (i) return this.dynType;
          throw new this.Error(`No such key: ${a}`, t);
        }
      }
      return this.dynType;
    }
    throw new this.Error(`Cannot index type '${this.formatType(r)}'`, t);
  }
  formatType(t) {
    return t.hasPlaceholder() ? t.templated(this.registry, m$).name : t.name;
  }
  formatTypeList(t) {
    return t.map((n) => this.formatType(n)).join(", ");
  }
}
const F = {
  EOF: 0,
  NUMBER: 1,
  STRING: 2,
  BOOLEAN: 3,
  NULL: 4,
  IDENTIFIER: 5,
  PLUS: 6,
  MINUS: 7,
  MULTIPLY: 8,
  DIVIDE: 9,
  MODULO: 10,
  EQ: 11,
  NE: 12,
  LT: 13,
  LE: 14,
  GT: 15,
  GE: 16,
  AND: 17,
  OR: 18,
  NOT: 19,
  IN: 20,
  LPAREN: 21,
  RPAREN: 22,
  LBRACKET: 23,
  RBRACKET: 24,
  LBRACE: 25,
  RBRACE: 26,
  DOT: 27,
  COMMA: 28,
  COLON: 29,
  QUESTION: 30,
  BYTES: 31
};
class Kd {
  #t;
  #e;
  constructor(t, n, r, i) {
    const s = sc[r];
    this.#t = n, this.#e = t, this.op = r, this.check = s.check, this.evaluate = s.evaluate, this.args = i;
  }
  get input() {
    return this.#t;
  }
  get pos() {
    return this.#e;
  }
  toOldStructure() {
    const t = Array.isArray(this.args) ? this.args : [this.args];
    return [this.op, ...t.map((n) => n instanceof Kd ? n.toOldStructure() : n)];
  }
}
const aa = {};
for (const e in F) aa[F[e]] = e;
const b$ = /* @__PURE__ */ new Set([
  "as",
  "break",
  "const",
  "continue",
  "else",
  "for",
  "function",
  "if",
  "import",
  "let",
  "loop",
  "package",
  "namespace",
  "return",
  "var",
  "void",
  "while"
]), y0 = new Uint8Array(128);
for (const e of "0123456789abcdefABCDEF") y0[e.charCodeAt(0)] = 1;
const Wg = {
  "\\": "\\",
  "?": "?",
  '"': '"',
  "'": "'",
  "`": "`",
  a: "\x07",
  b: "\b",
  f: "\f",
  n: `
`,
  r: "\r",
  t: "	",
  v: "\v"
};
class E$ {
  constructor(t) {
    this.input = t, this.pos = 0, this.length = t.length;
  }
  // Read next token
  nextToken() {
    for (; ; ) {
      const { pos: t, input: n, length: r } = this;
      if (t >= r) return { type: F.EOF, value: null, pos: t };
      const i = n[t];
      switch (i) {
        // Whitespaces
        case " ":
        case "	":
        case `
`:
        case "\r":
          this.pos++;
          continue;
        // Operators
        case "=":
          if (n[t + 1] !== "=") break;
          return { type: F.EQ, value: "==", pos: (this.pos += 2) - 2 };
        case "&":
          if (n[t + 1] !== "&") break;
          return { type: F.AND, value: "&&", pos: (this.pos += 2) - 2 };
        case "|":
          if (n[t + 1] !== "|") break;
          return { type: F.OR, value: "||", pos: (this.pos += 2) - 2 };
        case "+":
          return { type: F.PLUS, value: "+", pos: this.pos++ };
        case "-":
          return { type: F.MINUS, value: "-", pos: this.pos++ };
        case "*":
          return { type: F.MULTIPLY, value: "*", pos: this.pos++ };
        case "/":
          if (n[t + 1] === "/") {
            for (; this.pos < r && this.input[this.pos] !== `
`; ) this.pos++;
            continue;
          }
          return { type: F.DIVIDE, value: "/", pos: this.pos++ };
        case "%":
          return { type: F.MODULO, value: "%", pos: this.pos++ };
        case "<":
          return n[t + 1] === "=" ? { type: F.LE, value: "<=", pos: (this.pos += 2) - 2 } : { type: F.LT, value: "<", pos: this.pos++ };
        case ">":
          return n[t + 1] === "=" ? { type: F.GE, value: ">=", pos: (this.pos += 2) - 2 } : { type: F.GT, value: ">", pos: this.pos++ };
        case "!":
          return n[t + 1] === "=" ? { type: F.NE, value: "!=", pos: (this.pos += 2) - 2 } : { type: F.NOT, pos: this.pos++ };
        case "(":
          return { type: F.LPAREN, pos: this.pos++ };
        case ")":
          return { type: F.RPAREN, pos: this.pos++ };
        case "[":
          return { type: F.LBRACKET, pos: this.pos++ };
        case "]":
          return { type: F.RBRACKET, pos: this.pos++ };
        case "{":
          return { type: F.LBRACE, pos: this.pos++ };
        case "}":
          return { type: F.RBRACE, pos: this.pos++ };
        case ".":
          return { type: F.DOT, pos: this.pos++ };
        case ",":
          return { type: F.COMMA, pos: this.pos++ };
        case ":":
          return { type: F.COLON, pos: this.pos++ };
        case "?":
          return { type: F.QUESTION, pos: this.pos++ };
        case '"':
        case "'":
          return this.readString(i);
        // Check for string prefixes (b, B, r, R followed by quote)
        case "b":
        case "B":
        case "r":
        case "R": {
          const s = n[t + 1];
          return s === '"' || s === "'" ? ++this.pos && this.readString(s, i) : this.readIdentifier();
        }
        default: {
          const s = i.charCodeAt(0);
          if (s <= 57 && s >= 48) return this.readNumber();
          if (this._isIdentifierCharCode(s)) return this.readIdentifier();
        }
      }
      throw new bt(`Unexpected character: ${i}`, { pos: t, input: n });
    }
  }
  // Characters: 0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_
  _isIdentifierCharCode(t) {
    return t < 48 || t > 122 ? !1 : t >= 97 || t >= 65 && t <= 90 || t <= 57 || t === 95;
  }
  _parseAsDouble(t, n) {
    const r = Number(this.input.substring(t, n));
    if (Number.isFinite(r)) return { type: F.NUMBER, value: r, pos: t };
    throw new bt(`Invalid number: ${r}`, { pos: t, input: this.input });
  }
  _parseAsBigInt(t, n, r, i) {
    const s = this.input.substring(t, n);
    if (i === "u" || i === "U") {
      this.pos++;
      try {
        return {
          type: F.NUMBER,
          value: new _r(s),
          pos: t
        };
      } catch {
      }
    } else
      try {
        return {
          type: F.NUMBER,
          value: BigInt(s),
          pos: t
        };
      } catch {
      }
    throw new bt(r ? `Invalid hex integer: ${s}` : `Invalid integer: ${s}`, {
      pos: t,
      input: this.input
    });
  }
  _readDigits(t, n, r, i) {
    for (; r < n && (i = t.charCodeAt(r)) && !(i > 57 || i < 48); ) r++;
    return r;
  }
  _readExponent(t, n, r) {
    let i = r < n && t[r];
    if (i === "e" || i === "E") {
      i = ++r < n && t[r], (i === "-" || i === "+") && r++;
      const s = r;
      if (r = this._readDigits(t, n, r), s === r) throw new bt("Invalid exponent", { pos: r, input: t });
    }
    return r;
  }
  readNumber() {
    const { input: t, length: n, pos: r } = this;
    let i = r;
    if (t[i] === "0" && (t[i + 1] === "x" || t[i + 1] === "X")) {
      for (i += 2; i < n && y0[t[i].charCodeAt(0)]; ) i++;
      return this._parseAsBigInt(r, this.pos = i, !0, t[i]);
    }
    if (i = this._readDigits(t, n, i), i + 1 < n) {
      let s = !1, o = t[i] === "." ? this._readDigits(t, n, i + 1) : i + 1;
      if (o !== i + 1 && (s = !0) && (i = o), o = this._readExponent(t, n, i), o !== i && (s = !0) && (i = o), s) return this._parseAsDouble(r, this.pos = i);
    }
    return this._parseAsBigInt(r, this.pos = i, !1, t[i]);
  }
  readString(t, n) {
    const { input: r, pos: i } = this;
    return r[i + 1] === t && r[i + 2] === t ? this.readTripleQuotedString(t, n) : this.readSingleQuotedString(t, n);
  }
  _closeQuotedString(t, n, r) {
    switch (n) {
      case "b":
      case "B": {
        const i = this.processEscapes(t, !0), s = new Uint8Array(i.length);
        for (let o = 0; o < i.length; o++) s[o] = i.charCodeAt(o) & 255;
        return { type: F.BYTES, value: s, pos: r - 1 };
      }
      case "r":
      case "R":
        return { type: F.STRING, value: t, pos: r - 1 };
      default: {
        const i = this.processEscapes(t, !1);
        return { type: F.STRING, value: i, pos: r };
      }
    }
  }
  readSingleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 1;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          const c = r.slice(s + 1, a);
          return this.pos = ++a, this._closeQuotedString(c, n, s);
        case `
`:
        case "\r":
          throw new bt("Newlines not allowed in single-quoted strings", { pos: s, input: r });
        case "\\":
          a++;
      }
      a++;
    }
    throw new bt("Unterminated string", { pos: s, input: r });
  }
  readTripleQuotedString(t, n) {
    const { input: r, length: i, pos: s } = this;
    let o, a = this.pos + 3;
    for (; a < i && (o = r[a]); ) {
      switch (o) {
        case t:
          if (r[a + 1] === t && r[a + 2] === t) {
            const c = r.slice(s + 3, a);
            return this.pos = a + 3, this._closeQuotedString(c, n, s);
          }
          break;
        case "\\":
          a++;
      }
      a++;
    }
    throw new bt("Unterminated triple-quoted string", { pos: s, input: r });
  }
  processEscapes(t, n) {
    if (!t.includes("\\")) return t;
    let r = "", i = 0;
    for (; i < t.length; ) {
      if (t[i] !== "\\" || i + 1 >= t.length) {
        r += t[i++];
        continue;
      }
      const s = t[i + 1];
      if (Wg[s])
        r += Wg[s], i += 2;
      else if (s === "u") {
        if (n) throw new bt("\\u not allowed in bytes literals");
        const o = t.substring(i + 2, i += 6);
        if (!/^[0-9a-fA-F]{4}$/.test(o)) throw new bt(`Invalid Unicode escape: \\u${o}`);
        const a = Number.parseInt(o, 16);
        if (a >= 55296 && a <= 57343) throw new bt(`Invalid Unicode surrogate: \\u${o}`);
        r += String.fromCharCode(a);
      } else if (s === "U") {
        if (n) throw new bt("\\U not allowed in bytes literals");
        const o = t.substring(i + 2, i += 10);
        if (!/^[0-9a-fA-F]{8}$/.test(o)) throw new bt(`Invalid Unicode escape: \\U${o}`);
        const a = Number.parseInt(o, 16);
        if (a > 1114111) throw new bt(`Invalid Unicode escape: \\U${o}`);
        if (a >= 55296 && a <= 57343) throw new bt(`Invalid Unicode surrogate: \\U${o}`);
        r += String.fromCodePoint(a);
      } else if (s === "x" || s === "X") {
        const o = t.substring(i + 2, i += 4);
        if (!/^[0-9a-fA-F]{2}$/.test(o)) throw new bt(`Invalid hex escape: \\${s}${o}`);
        r += String.fromCharCode(Number.parseInt(o, 16));
      } else if (s >= "0" && s <= "7") {
        const o = t.substring(i + 1, i += 4);
        if (!/^[0-7]{3}$/.test(o)) throw new bt("Octal escape must be 3 digits");
        const a = Number.parseInt(o, 8);
        if (a > 255) throw new bt(`Octal escape out of range: \\${o}`);
        r += String.fromCharCode(a);
      } else
        throw new bt(`Invalid escape sequence: \\${s}`);
    }
    return r;
  }
  readIdentifier() {
    const { pos: t, input: n, length: r } = this;
    let i = t;
    for (; i < r && this._isIdentifierCharCode(n[i].charCodeAt(0)); ) i++;
    const s = n.substring(t, this.pos = i);
    switch (s) {
      case "true":
        return { type: F.BOOLEAN, value: !0, pos: t };
      case "false":
        return { type: F.BOOLEAN, value: !1, pos: t };
      case "null":
        return { type: F.NULL, value: null, pos: t };
      case "in":
        return { type: F.IN, value: "in", pos: t };
      default:
        return { type: F.IDENTIFIER, value: s, pos: t };
    }
  }
}
class T$ {
  constructor(t, n) {
    this.limits = t, this.registry = n;
  }
  #t(t, n = this.currentToken) {
    throw new bt(`Exceeded ${t} (${this.limits[t]})`, {
      pos: n.pos,
      input: this.input
    });
  }
  #e(t, n, r) {
    const i = new Kd(t, this.input, n, r);
    return this.astNodesRemaining-- || this.#t("maxAstNodes", i), i;
  }
  #n() {
    const t = this.currentToken;
    return this.type = (this.currentToken = this.lexer.nextToken()).type, t;
  }
  consume(t) {
    if (this.type === t) return this.#n();
    throw new bt(
      `Expected ${aa[t]}, got ${aa[this.type]}`,
      { pos: this.currentToken.pos, input: this.input }
    );
  }
  match(t) {
    return this.type === t;
  }
  // Parse entry point
  parse(t) {
    this.input = t, this.lexer = new E$(t), this.#n(), this.maxDepthRemaining = this.limits.maxDepth, this.astNodesRemaining = this.limits.maxAstNodes;
    const n = this.parseExpression();
    if (this.match(F.EOF)) return n;
    throw new bt(`Unexpected character: '${this.input[this.lexer.pos - 1]}'`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #r(t, n, r, i) {
    const s = this.registry.findMacro(i, !!r, n.length);
    return s && (t.macro = s.handler({ ast: t, args: n, receiver: r, methodName: i, parser: this })), t;
  }
  #i(t) {
    return this.#r(t, t.args[1], null, t.args[0]);
  }
  #o(t) {
    return this.#r(t, t.args[2], t.args[1], t.args[0]);
  }
  // Expression ::= LogicalOr ('?' Expression ':' Expression)?
  parseExpression() {
    this.maxDepthRemaining-- || this.#t("maxDepth");
    const t = this.parseLogicalOr();
    if (!this.match(F.QUESTION)) return ++this.maxDepthRemaining && t;
    const n = this.#n(), r = this.parseExpression();
    this.consume(F.COLON);
    const i = this.parseExpression();
    return this.maxDepthRemaining++, this.#e(n.pos, "?:", [t, r, i]);
  }
  // LogicalOr ::= LogicalAnd ('||' LogicalAnd)*
  parseLogicalOr() {
    let t = this.parseLogicalAnd();
    for (; this.match(F.OR); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseLogicalAnd()]);
    }
    return t;
  }
  // LogicalAnd ::= Equality ('&&' Equality)*
  parseLogicalAnd() {
    let t = this.parseEquality();
    for (; this.match(F.AND); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseEquality()]);
    }
    return t;
  }
  // Equality ::= Relational (('==' | '!=') Relational)*
  parseEquality() {
    let t = this.parseRelational();
    for (; this.match(F.EQ) || this.match(F.NE); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseRelational()]);
    }
    return t;
  }
  // Relational ::= Additive (('<' | '<=' | '>' | '>=' | 'in') Additive)*
  parseRelational() {
    let t = this.parseAdditive();
    for (; this.match(F.LT) || this.match(F.LE) || this.match(F.GT) || this.match(F.GE) || this.match(F.IN); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseAdditive()]);
    }
    return t;
  }
  // Additive ::= Multiplicative (('+' | '-') Multiplicative)*
  parseAdditive() {
    let t = this.parseMultiplicative();
    for (; this.match(F.PLUS) || this.match(F.MINUS); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseMultiplicative()]);
    }
    return t;
  }
  // Multiplicative ::= Unary (('*' | '/' | '%') Unary)*
  parseMultiplicative() {
    let t = this.parseUnary();
    for (; this.match(F.MULTIPLY) || this.match(F.DIVIDE) || this.match(F.MODULO); ) {
      const n = this.#n();
      t = this.#e(n.pos, n.value, [t, this.parseUnary()]);
    }
    return t;
  }
  // Unary ::= ('!' | '-')* Postfix
  parseUnary() {
    return this.type === F.NOT ? this.#e(this.#n().pos, "!_", [this.parseUnary()]) : this.type === F.MINUS ? this.#e(this.#n().pos, "-_", [this.parseUnary()]) : this.parsePostfix();
  }
  // Postfix ::= Primary (('.' IDENTIFIER ('(' ArgumentList ')')? | '[' Expression ']'))*
  parsePostfix() {
    let t = this.parsePrimary();
    const n = this.maxDepthRemaining;
    for (; ; ) {
      if (this.match(F.DOT)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(F.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.consume(F.IDENTIFIER);
        if (this.match(F.LPAREN) && this.#n()) {
          const o = this.parseArgumentList();
          this.consume(F.RPAREN), t = this.#o(
            this.#e(s.pos, "rcall", [s.value, t, o])
          );
        } else
          t = this.#e(s.pos, i ? ".?" : ".", [t, s.value]);
        continue;
      }
      if (this.match(F.LBRACKET)) {
        const r = this.#n();
        this.maxDepthRemaining-- || this.#t("maxDepth", r);
        const i = this.match(F.QUESTION) && this.registry.enableOptionalTypes && !!this.#n(), s = this.parseExpression();
        this.consume(F.RBRACKET), t = this.#e(r.pos, i ? "[?]" : "[]", [t, s]);
        continue;
      }
      break;
    }
    return this.maxDepthRemaining = n, t;
  }
  // Primary ::= NUMBER | STRING | BOOLEAN | NULL | IDENTIFIER | '(' Expression ')' | Array | Object
  parsePrimary() {
    switch (this.type) {
      case F.NUMBER:
      case F.STRING:
      case F.BYTES:
      case F.BOOLEAN:
      case F.NULL:
        return this.#a();
      case F.IDENTIFIER:
        return this.#c();
      case F.LPAREN:
        return this.#u();
      case F.LBRACKET:
        return this.parseList();
      case F.LBRACE:
        return this.parseMap();
    }
    throw new bt(`Unexpected token: ${aa[this.type]}`, {
      pos: this.currentToken.pos,
      input: this.input
    });
  }
  #a() {
    const t = this.#n();
    return this.#e(t.pos, "value", t.value);
  }
  #c() {
    const { value: t, pos: n } = this.consume(F.IDENTIFIER);
    if (b$.has(t))
      throw new bt(`Reserved identifier: ${t}`, {
        pos: n,
        input: this.input
      });
    if (!this.match(F.LPAREN)) return this.#e(n, "id", t);
    this.#n();
    const r = this.parseArgumentList();
    return this.consume(F.RPAREN), this.#i(this.#e(n, "call", [t, r]));
  }
  #u() {
    this.consume(F.LPAREN);
    const t = this.parseExpression();
    return this.consume(F.RPAREN), t;
  }
  parseList() {
    const t = this.consume(F.LBRACKET), n = [];
    let r = this.limits.maxListElements;
    if (!this.match(F.RBRACKET))
      for (n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1)); this.match(F.COMMA) && (this.#n(), !this.match(F.RBRACKET)); )
        n.push(this.parseExpression()), r-- || this.#t("maxListElements", n.at(-1));
    return this.consume(F.RBRACKET), this.#e(t.pos, "list", n);
  }
  parseMap() {
    const t = this.consume(F.LBRACE), n = [];
    let r = this.limits.maxMapEntries;
    if (!this.match(F.RBRACE))
      for (n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]); this.match(F.COMMA) && (this.#n(), !this.match(F.RBRACE)); )
        n.push(this.parseProperty()), r-- || this.#t("maxMapEntries", n.at(-1)[0]);
    return this.consume(F.RBRACE), this.#e(t.pos, "map", n);
  }
  parseProperty() {
    return [this.parseExpression(), (this.consume(F.COLON), this.parseExpression())];
  }
  parseArgumentList() {
    const t = [];
    let n = this.limits.maxCallArguments;
    if (!this.match(F.RPAREN))
      for (t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1)); this.match(F.COMMA) && (this.#n(), !this.match(F.RPAREN)); )
        t.push(this.parseExpression()), n-- || this.#t("maxCallArguments", t.at(-1));
    return t;
  }
}
const zd = Object.freeze({
  maxAstNodes: 1e5,
  maxDepth: 250,
  maxListElements: 1e3,
  maxMapEntries: 1e3,
  maxCallArguments: 32
}), x$ = new Set(Object.keys(zd));
function S$(e, t = zd) {
  const n = e ? Object.keys(e) : void 0;
  if (!n?.length) return t;
  const r = { ...t };
  for (const i of n) {
    if (!x$.has(i)) throw new TypeError(`Unknown limits option: ${i}`);
    const s = e[i];
    typeof s == "number" && (r[i] = s);
  }
  return Object.freeze(r);
}
const v$ = Object.freeze({
  unlistedVariablesAreDyn: !1,
  homogeneousAggregateLiterals: !0,
  enableOptionalTypes: !1,
  limits: zd
});
function cl(e, t, n) {
  const r = e?.[n] ?? t?.[n];
  if (typeof r != "boolean") throw new TypeError(`Invalid option: ${n}`);
  return r;
}
function A$(e, t = v$) {
  return e ? Object.freeze({
    unlistedVariablesAreDyn: cl(e, t, "unlistedVariablesAreDyn"),
    homogeneousAggregateLiterals: cl(e, t, "homogeneousAggregateLiterals"),
    enableOptionalTypes: cl(e, t, "enableOptionalTypes"),
    limits: S$(e.limits, t.limits)
  }) : t;
}
const zc = YI({ enableOptionalTypes: !1 });
FI(zc);
f$(zc);
l$(zc);
const Kg = /* @__PURE__ */ new WeakMap();
class ii {
  #t;
  #e;
  #n;
  #r;
  #i;
  #o;
  constructor(t, n) {
    this.opts = A$(t, n?.opts), this.#t = (n instanceof ii ? Kg.get(n) : zc).clone(this.opts);
    const r = {
      objectTypes: this.#t.objectTypes,
      objectTypesByConstructor: this.#t.objectTypesByConstructor,
      registry: this.#t,
      opts: this.opts
    };
    this.#n = new Fg(r), this.#r = new Fg(r, !0), this.#e = new k$(r), this.#i = new T$(this.opts.limits, this.#t), this.#o = new ZI(this.#t.variables, this.#t.constants), Kg.set(this, this.#t), Object.freeze(this);
  }
  clone(t) {
    return new ii(t, this);
  }
  registerFunction(t, n) {
    return this.#t.registerFunctionOverload(t, n), this;
  }
  registerOperator(t, n) {
    return this.#t.registerOperatorOverload(t, n), this;
  }
  registerType(t, n) {
    return this.#t.registerType(t, n), this;
  }
  registerVariable(t, n) {
    return this.#t.registerVariable(t, n), this;
  }
  registerConstant(t, n, r) {
    return this.#t.registerConstant(t, n, r), this;
  }
  hasVariable(t) {
    return this.#t.variables.has(t);
  }
  check(t) {
    try {
      return this.#a(this.#i.parse(t));
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #a(t) {
    try {
      const n = this.#n.check(t, this.#o.fork());
      return { valid: !0, type: this.#c(n) };
    } catch (n) {
      return { valid: !1, error: n };
    }
  }
  #c(t) {
    return t.name === "list<dyn>" ? "list" : t.name === "map<dyn, dyn>" ? "map" : t.name;
  }
  parse(t) {
    const n = this.#i.parse(t), r = this.#u.bind(this, n);
    return r.check = this.#a.bind(this, n), r.ast = n, r;
  }
  evaluate(t, n) {
    return this.#u(this.#i.parse(t), n);
  }
  #u(t, n = null) {
    const r = this.#o.fork().withContext(n);
    return t.checkedType || this.#r.check(t, r), this.#e.eval(t, r);
  }
}
class k$ extends g0 {
  constructor(t) {
    super(t), this.Error = tt;
  }
  #t(t, n) {
    const r = t instanceof Array ? t[0] : t.values().next().value;
    return r === void 0 ? n : this.registry.getListType(this.debugRuntimeType(r, n.valueType));
  }
  #e(t) {
    if (t instanceof Map) return t.entries().next().value;
    for (const n in t) return [n, t[n]];
  }
  #n(t, n) {
    const r = this.#e(t);
    return r ? this.registry.getMapType(
      this.debugRuntimeType(r[0], n.keyType),
      this.debugRuntimeType(r[1], n.valueType)
    ) : n;
  }
  debugOperandType(t, n) {
    return n?.hasNoDynTypes() ? n : this.registry.getDynType(this.debugRuntimeType(t, n));
  }
  debugRuntimeType(t, n) {
    if (n?.hasNoDynTypes()) return n;
    const r = this.debugType(t);
    switch (r.kind) {
      case "list":
        return this.#t(t, r);
      case "map":
        return this.#n(t, r);
      default:
        return r;
    }
  }
  tryEval(t, n) {
    try {
      const r = this.eval(t, n);
      return r instanceof Promise ? r.catch((i) => i) : r;
    } catch (r) {
      return r;
    }
  }
  eval(t, n) {
    return t.evaluate(this, t, n);
  }
}
new ii({
  unlistedVariablesAreDyn: !0
});
const jd = "amount", I$ = "expiry", $$ = "birth", C$ = "weight", O$ = "inputType", B$ = "script", Yi = {
  signature: "now(): double",
  implementation: () => Math.floor(Date.now() / 1e3)
}, zg = new ii().registerVariable(jd, "double").registerVariable(B$, "string").registerFunction(Yi.signature, Yi.implementation), N$ = new ii().registerVariable(jd, "double").registerVariable(I$, "double").registerVariable($$, "double").registerVariable(C$, "double").registerVariable(O$, "string").registerFunction(Yi.signature, Yi.implementation), P$ = new ii().registerVariable(jd, "double").registerFunction(Yi.signature, Yi.implementation);
class le {
  constructor(t) {
    this.value = t;
  }
  get satoshis() {
    return this.value ? Math.ceil(this.value) : 0;
  }
  add(t) {
    return new le(this.value + t.value);
  }
}
le.ZERO = new le(0);
class R$ {
  /**
   * Creates a new Estimator with the given config
   * @param config - Configuration containing CEL programs for fee calculation
   */
  constructor(t) {
    this.config = t, this.intentOffchainInput = t.offchainInput ? Lo(t.offchainInput, N$) : void 0, this.intentOnchainInput = t.onchainInput ? Lo(t.onchainInput, P$) : void 0, this.intentOffchainOutput = t.offchainOutput ? Lo(t.offchainOutput, zg) : void 0, this.intentOnchainOutput = t.onchainOutput ? Lo(t.onchainOutput, zg) : void 0;
  }
  /**
   * Evaluates the fee for a given vtxo input
   * @param input - The offchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOffchainInput(t) {
    if (!this.intentOffchainInput)
      return le.ZERO;
    const n = U$(t);
    return new le(this.intentOffchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given boarding input
   * @param input - The onchain input to evaluate
   * @returns The fee amount for this input
   */
  evalOnchainInput(t) {
    if (!this.intentOnchainInput)
      return le.ZERO;
    const n = {
      amount: Number(t.amount)
    };
    return new le(this.intentOnchainInput.program(n));
  }
  /**
   * Evaluates the fee for a given vtxo output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOffchainOutput(t) {
    if (!this.intentOffchainOutput)
      return le.ZERO;
    const n = jg(t);
    return new le(this.intentOffchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given collaborative exit output
   * @param output - The output to evaluate
   * @returns The fee amount for this output
   */
  evalOnchainOutput(t) {
    if (!this.intentOnchainOutput)
      return le.ZERO;
    const n = jg(t);
    return new le(this.intentOnchainOutput.program(n));
  }
  /**
   * Evaluates the fee for a given set of inputs and outputs
   * @param offchainInputs - Array of offchain inputs to evaluate
   * @param onchainInputs - Array of onchain inputs to evaluate
   * @param offchainOutputs - Array of offchain outputs to evaluate
   * @param onchainOutputs - Array of onchain outputs to evaluate
   * @returns The total fee amount
   */
  eval(t, n, r, i) {
    let s = le.ZERO;
    for (const o of t)
      s = s.add(this.evalOffchainInput(o));
    for (const o of n)
      s = s.add(this.evalOnchainInput(o));
    for (const o of r)
      s = s.add(this.evalOffchainOutput(o));
    for (const o of i)
      s = s.add(this.evalOnchainOutput(o));
    return s;
  }
}
function U$(e) {
  const t = {
    amount: Number(e.amount),
    inputType: e.type,
    weight: e.weight
  };
  return e.expiry && (t.expiry = Math.floor(e.expiry.getTime() / 1e3)), e.birth && (t.birth = Math.floor(e.birth.getTime() / 1e3)), t;
}
function jg(e) {
  return {
    amount: Number(e.amount),
    script: e.script
  };
}
function Lo(e, t) {
  const n = t.parse(e), r = n.check();
  if (!r.valid)
    throw new Error(`type check failed: ${r.error?.message ?? "unknown error"}`);
  if (r.type !== "double")
    throw new Error(`expected return type double, got ${r.type}`);
  return { program: n, text: e };
}
const gs = {
  commitmentTxid: "",
  boardingTxid: "",
  arkTxid: ""
};
async function _$(e, t, n, r) {
  const i = [...e].sort((u, l) => u.createdAt.getTime() - l.createdAt.getTime()), s = [];
  let o = [];
  for (const u of i)
    if (u.status.isLeaf ? !n.has(u.virtualStatus.commitmentTxIds[0]) && i.filter((l) => l.settledBy === u.virtualStatus.commitmentTxIds[0]).length === 0 && o.push({
      key: {
        ...gs,
        commitmentTxid: u.virtualStatus.commitmentTxIds[0]
      },
      tag: "batch",
      type: Bn.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }) : i.filter((l) => l.arkTxId === u.txid).length === 0 && o.push({
      key: { ...gs, arkTxid: u.txid },
      tag: "offchain",
      type: Bn.TxReceived,
      amount: u.value,
      settled: u.status.isLeaf || u.isSpent,
      createdAt: u.createdAt.getTime()
    }), u.isSpent) {
      if (u.arkTxId && !s.some((l) => l.key.arkTxid === u.arkTxId)) {
        const l = i.filter((d) => d.txid === u.arkTxId), h = i.filter((d) => d.arkTxId === u.arkTxId).reduce((d, g) => d + g.value, 0);
        let p = 0, y = 0;
        if (l.length > 0) {
          const d = l.reduce((g, m) => g + m.value, 0);
          p = h - d, y = l[0].createdAt.getTime();
        } else
          p = h, y = r ? await r(u.arkTxId) : u.createdAt.getTime() + 1;
        s.push({
          key: { ...gs, arkTxid: u.arkTxId },
          tag: "offchain",
          type: Bn.TxSent,
          amount: p,
          settled: !0,
          createdAt: y
        });
      }
      if (u.settledBy && !n.has(u.settledBy) && !s.some((l) => l.key.commitmentTxid === u.settledBy)) {
        const l = i.filter((p) => p.status.isLeaf && p.virtualStatus.commitmentTxIds?.every((y) => u.settledBy === y)), h = i.filter((p) => p.settledBy === u.settledBy).reduce((p, y) => p + y.value, 0);
        if (l.length > 0) {
          const p = l.reduce((y, d) => y + d.value, 0);
          h > p && s.push({
            key: { ...gs, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Bn.TxSent,
            amount: h - p,
            settled: !0,
            createdAt: l[0].createdAt.getTime()
          });
        } else
          s.push({
            key: { ...gs, commitmentTxid: u.settledBy },
            tag: "exit",
            type: Bn.TxSent,
            amount: h,
            settled: !0,
            // TODO: fetch commitment tx with /v1/indexer/commitmentTx/<commitmentTxid> to know when the tx was made
            createdAt: u.createdAt.getTime() + 1
          });
      }
    }
  return [...t.map((u) => ({ ...u, tag: "boarding" })), ...s, ...o].sort((u, l) => l.createdAt - u.createdAt);
}
const cn = "vtxos", un = "utxos", ln = "transactions", tr = "walletState", Re = "contracts", Gg = "contractsCollections", w0 = 2;
function m0(e) {
  if (!e.objectStoreNames.contains(cn)) {
    const t = e.createObjectStore(cn, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    }), t.indexNames.contains("virtualStatus") || t.createIndex("virtualStatus", "virtualStatus", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("isSpent") || t.createIndex("isSpent", "isSpent", {
      unique: !1
    }), t.indexNames.contains("isUnrolled") || t.createIndex("isUnrolled", "isUnrolled", {
      unique: !1
    }), t.indexNames.contains("spentBy") || t.createIndex("spentBy", "spentBy", {
      unique: !1
    }), t.indexNames.contains("settledBy") || t.createIndex("settledBy", "settledBy", {
      unique: !1
    }), t.indexNames.contains("arkTxId") || t.createIndex("arkTxId", "arkTxId", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(un)) {
    const t = e.createObjectStore(un, {
      keyPath: ["address", "txid", "vout"]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("txid") || t.createIndex("txid", "txid", { unique: !1 }), t.indexNames.contains("value") || t.createIndex("value", "value", { unique: !1 }), t.indexNames.contains("status") || t.createIndex("status", "status", {
      unique: !1
    });
  }
  if (!e.objectStoreNames.contains(ln)) {
    const t = e.createObjectStore(ln, {
      keyPath: [
        "address",
        "keyBoardingTxid",
        "keyCommitmentTxid",
        "keyArkTxid"
      ]
    });
    t.indexNames.contains("address") || t.createIndex("address", "address", {
      unique: !1
    }), t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("amount") || t.createIndex("amount", "amount", {
      unique: !1
    }), t.indexNames.contains("settled") || t.createIndex("settled", "settled", {
      unique: !1
    }), t.indexNames.contains("createdAt") || t.createIndex("createdAt", "createdAt", {
      unique: !1
    }), t.indexNames.contains("arkTxid") || t.createIndex("arkTxid", "key.arkTxid", {
      unique: !1
    });
  }
  if (e.objectStoreNames.contains(tr) || e.createObjectStore(tr, {
    keyPath: "key"
  }), !e.objectStoreNames.contains(Re)) {
    const t = e.createObjectStore(Re, {
      keyPath: "script"
    });
    t.indexNames.contains("type") || t.createIndex("type", "type", {
      unique: !1
    }), t.indexNames.contains("state") || t.createIndex("state", "state", {
      unique: !1
    });
  }
  e.objectStoreNames.contains(Gg) || e.createObjectStore(Gg, {
    keyPath: "key"
  });
}
const oc = ([e, t]) => ({
  cb: _.encode(pn.encode(e)),
  s: _.encode(t)
}), L$ = (e) => ({
  ...e,
  tapTree: _.encode(e.tapTree),
  forfeitTapLeafScript: oc(e.forfeitTapLeafScript),
  intentTapLeafScript: oc(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(_.encode)
}), D$ = (e) => ({
  ...e,
  tapTree: _.encode(e.tapTree),
  forfeitTapLeafScript: oc(e.forfeitTapLeafScript),
  intentTapLeafScript: oc(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(_.encode)
}), ac = (e) => {
  const t = pn.decode(_.decode(e.cb)), n = _.decode(e.s);
  return [t, n];
}, V$ = (e) => ({
  ...e,
  createdAt: new Date(e.createdAt),
  tapTree: _.decode(e.tapTree),
  forfeitTapLeafScript: ac(e.forfeitTapLeafScript),
  intentTapLeafScript: ac(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(_.decode)
}), M$ = (e) => ({
  ...e,
  tapTree: _.decode(e.tapTree),
  forfeitTapLeafScript: ac(e.forfeitTapLeafScript),
  intentTapLeafScript: ac(e.intentTapLeafScript),
  extraWitness: e.extraWitness?.map(_.decode)
});
function H$() {
  if (typeof globalThis < "u")
    return typeof globalThis.self == "object" && globalThis.self !== null ? { globalObject: globalThis.self } : typeof globalThis.window == "object" && globalThis.window !== null ? { globalObject: globalThis.window } : { globalObject: globalThis };
  throw new Error("Global object not found");
}
const Ls = /* @__PURE__ */ new Map(), Gr = /* @__PURE__ */ new Map();
async function b0(e, t, n) {
  const { globalObject: r } = H$();
  if (!r.indexedDB)
    throw new Error("IndexedDB is not available in this environment");
  const i = Ls.get(e);
  if (i) {
    if (i.version !== t)
      throw new Error(`Database "${e}" already opened with version ${i.version}; requested ${t}`);
    return Gr.set(e, (Gr.get(e) ?? 0) + 1), i.promise;
  }
  const s = new Promise((o, a) => {
    const c = r.indexedDB.open(e, t);
    c.onerror = () => {
      Ls.delete(e), Gr.delete(e), a(c.error);
    }, c.onsuccess = () => {
      o(c.result);
    }, c.onupgradeneeded = () => {
      const u = c.result;
      n(u);
    }, c.onblocked = () => {
      console.warn("Database upgrade blocked - close other tabs/connections");
    };
  });
  return Ls.set(e, { version: t, promise: s }), Gr.set(e, 1), s;
}
async function E0(e) {
  const t = Ls.get(e);
  if (!t)
    return !1;
  const n = (Gr.get(e) ?? 1) - 1;
  if (n > 0)
    return Gr.set(e, n), !1;
  Gr.delete(e), Ls.delete(e);
  try {
    (await t.promise).close();
  } catch {
  }
  return !0;
}
const T0 = "arkade-service-worker";
class x0 {
  constructor(t = T0) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([Re], "readwrite"), s = i.objectStore(Re), o = i.objectStore(Re), a = s.clear(), c = o.clear();
        let u = 0;
        const l = () => {
          u++, u === 2 && n();
        };
        a.onsuccess = l, c.onsuccess = l, a.onerror = () => r(a.error), c.onerror = () => r(c.error);
      });
    } catch (t) {
      throw console.error("Failed to clear contract data:", t), t;
    }
  }
  async getContracts(t) {
    try {
      const r = (await this.getDB()).transaction([Re], "readonly").objectStore(Re);
      if (!t || Object.keys(t).length === 0)
        return new Promise((o, a) => {
          const c = r.getAll();
          c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
        });
      const i = W$(t);
      if (i.has("script")) {
        const o = i.get("script"), a = await Promise.all(o.map((c) => new Promise((u, l) => {
          const f = r.get(c);
          f.onerror = () => l(f.error), f.onsuccess = () => u(f.result);
        })));
        return this.applyContractFilter(a, i);
      }
      if (i.has("state")) {
        const o = await this.getContractsByIndexValues(r, "state", i.get("state"));
        return this.applyContractFilter(o, i);
      }
      if (i.has("type")) {
        const o = await this.getContractsByIndexValues(r, "type", i.get("type"));
        return this.applyContractFilter(o, i);
      }
      const s = await new Promise((o, a) => {
        const c = r.getAll();
        c.onerror = () => a(c.error), c.onsuccess = () => o(c.result ?? []);
      });
      return this.applyContractFilter(s, i);
    } catch (n) {
      return console.error("Failed to get contracts:", n), [];
    }
  }
  async saveContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const a = n.transaction([Re], "readwrite").objectStore(Re).put(t);
        a.onerror = () => i(a.error), a.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save contract:", n), n;
    }
  }
  async deleteContract(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([Re], "readwrite").objectStore(Re), a = o.get(t);
        a.onerror = () => i(a.error), a.onsuccess = () => {
          const c = o.delete(t);
          c.onerror = () => i(c.error), c.onsuccess = () => r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to delete contract ${t}:`, n), n;
    }
  }
  getContractsByIndexValues(t, n, r) {
    if (r.length === 0)
      return Promise.resolve([]);
    const i = t.index(n), s = r.map((o) => new Promise((a, c) => {
      const u = i.getAll(o);
      u.onerror = () => c(u.error), u.onsuccess = () => a(u.result ?? []);
    }));
    return Promise.all(s).then((o) => o.flatMap((a) => a));
  }
  applyContractFilter(t, n) {
    return t.filter((r) => !(r === void 0 || n.has("script") && !n.get("script")?.includes(r.script) || n.has("state") && !n.get("state")?.includes(r.state) || n.has("type") && !n.get("type")?.includes(r.type)));
  }
  async getDB() {
    return this.db ? this.db : (this.db = await b0(this.dbName, w0, m0), this.db);
  }
  async [Symbol.asyncDispose]() {
    this.db && (await E0(this.dbName), this.db = null);
  }
}
const F$ = ["script", "state", "type"];
function W$(e) {
  const t = /* @__PURE__ */ new Map();
  return F$.forEach((n) => {
    e?.[n] && (Array.isArray(e[n]) ? t.set(n, e[n]) : t.set(n, [e[n]]));
  }), t;
}
class K$ {
  constructor(t = T0) {
    this.dbName = t, this.db = null;
  }
  async clear() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const i = t.transaction([
          cn,
          un,
          ln,
          tr
        ], "readwrite"), s = i.objectStore(cn), o = i.objectStore(un), a = i.objectStore(ln), c = i.objectStore(tr), u = [
          s.clear(),
          o.clear(),
          a.clear(),
          c.clear()
        ];
        let l = 0;
        const f = () => {
          l++, l === u.length && n();
        };
        u.forEach((h) => {
          h.onsuccess = f, h.onerror = () => r(h.error);
        });
      });
    } catch (t) {
      throw console.error("Failed to clear wallet data:", t), t;
    }
  }
  async [Symbol.asyncDispose]() {
    this.db && (await E0(this.dbName), this.db = null);
  }
  async getVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([cn], "readonly").objectStore(cn).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(V$);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get VTXOs for address ${t}:`, n), [];
    }
  }
  async saveVtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([cn], "readwrite"), a = o.objectStore(cn), c = n.map((u) => new Promise((l, f) => {
          const h = L$(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save VTXOs for address ${t}:`, r), r;
    }
  }
  async deleteVtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([cn], "readwrite").objectStore(cn).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear VTXOs for address ${t}:`, n), n;
    }
  }
  async getUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([un], "readonly").objectStore(un).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const l = (c.result || []).map(M$);
          r(l);
        };
      });
    } catch (n) {
      return console.error(`Failed to get UTXOs for address ${t}:`, n), [];
    }
  }
  async saveUtxos(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([un], "readwrite"), a = o.objectStore(un), c = n.map((u) => new Promise((l, f) => {
          const h = D$(u), p = {
            address: t,
            ...h
          }, y = a.put(p);
          y.onerror = () => f(y.error), y.onsuccess = () => l();
        }));
        Promise.all(c).then(() => i()).catch(s), o.onerror = () => s(o.error);
      });
    } catch (r) {
      throw console.error(`Failed to save UTXOs for address ${t}:`, r), r;
    }
  }
  async deleteUtxos(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([un], "readwrite").objectStore(un).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear UTXOs for address ${t}:`, n), n;
    }
  }
  async getTransactionHistory(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([ln], "readonly").objectStore(ln).index("address").getAll(t);
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result || [];
          r(u.sort((l, f) => l.createdAt - f.createdAt));
        };
      });
    } catch (n) {
      return console.error(`Failed to get transaction history for address ${t}:`, n), [];
    }
  }
  async saveTransactions(t, n) {
    try {
      const r = await this.getDB();
      return new Promise((i, s) => {
        const o = r.transaction([ln], "readwrite"), a = o.objectStore(ln);
        n.forEach((c) => {
          const u = {
            address: t,
            ...c,
            keyBoardingTxid: c.key.boardingTxid,
            keyCommitmentTxid: c.key.commitmentTxid,
            keyArkTxid: c.key.arkTxid
          };
          a.put(u);
        }), o.oncomplete = () => i(), o.onerror = () => s(o.error), o.onabort = () => s(new Error("Transaction aborted"));
      });
    } catch (r) {
      throw console.error(`Failed to save transactions for address ${t}:`, r), r;
    }
  }
  async deleteTransactions(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const c = n.transaction([ln], "readwrite").objectStore(ln).index("address").openCursor(IDBKeyRange.only(t));
        c.onerror = () => i(c.error), c.onsuccess = () => {
          const u = c.result;
          u ? (u.delete(), u.continue()) : r();
        };
      });
    } catch (n) {
      throw console.error(`Failed to clear transactions for address ${t}:`, n), n;
    }
  }
  async getWalletState() {
    try {
      const t = await this.getDB();
      return new Promise((n, r) => {
        const o = t.transaction([tr], "readonly").objectStore(tr).get("state");
        o.onerror = () => r(o.error), o.onsuccess = () => {
          const a = o.result;
          a && a.data ? n(a.data) : n(null);
        };
      });
    } catch (t) {
      return console.error("Failed to get wallet state:", t), null;
    }
  }
  async saveWalletState(t) {
    try {
      const n = await this.getDB();
      return new Promise((r, i) => {
        const o = n.transaction([tr], "readwrite").objectStore(tr), a = {
          key: "state",
          data: t
        }, c = o.put(a);
        c.onerror = () => i(c.error), c.onsuccess = () => r();
      });
    } catch (n) {
      throw console.error("Failed to save wallet state:", n), n;
    }
  }
  async getDB() {
    return this.db ? this.db : (this.db = await b0(this.dbName, w0, m0), this.db);
  }
}
class z$ {
  constructor(t) {
    this.contracts = /* @__PURE__ */ new Map(), this.isWatching = !1, this.connectionState = "disconnected", this.reconnectAttempts = 0, this.config = {
      failsafePollIntervalMs: 6e4,
      // 1 minute
      reconnectDelayMs: 1e3,
      // 1 second
      maxReconnectDelayMs: 3e4,
      // 30 seconds
      maxReconnectAttempts: 0,
      // unlimited
      ...t
    };
  }
  /**
   * Add a contract to be watched.
   *
   * Active contracts are immediately subscribed. All contracts are polled
   * to discover any existing VTXOs (which may cause them to be watched
   * even if inactive).
   */
  async addContract(t) {
    const n = {
      contract: t,
      lastKnownVtxos: /* @__PURE__ */ new Map()
    };
    this.contracts.set(t.script, n), this.isWatching && (await this.pollContracts([t.script]), await this.tryUpdateSubscription());
  }
  /**
   * Update an existing contract.
   */
  async updateContract(t) {
    const n = this.contracts.get(t.script);
    if (!n)
      throw new Error(`Contract ${t.script} not found`);
    n.contract = t, this.isWatching && await this.tryUpdateSubscription();
  }
  /**
   * Remove a contract from watching.
   */
  async removeContract(t) {
    this.contracts.get(t) && (this.contracts.delete(t), this.isWatching && await this.tryUpdateSubscription());
  }
  /**
   * Get all in-memory contracts.
   */
  getAllContracts() {
    return Array.from(this.contracts.values()).map((t) => t.contract);
  }
  /**
   * Get all active in-memory contracts.
   */
  getActiveContracts() {
    return this.getAllContracts().filter((t) => t.state === "active");
  }
  /**
   * Get scripts that should be watched.
   *
   * Returns scripts for:
   * - All active contracts
   * - All contracts with known VTXOs (regardless of state)
   *
   * This ensures we continue monitoring contracts even after they're
   * deactivated, as long as they have unspent VTXOs.
   */
  getScriptsToWatch() {
    const t = /* @__PURE__ */ new Set();
    for (const [, n] of this.contracts) {
      if (n.contract.state === "active") {
        t.add(n.contract.script);
        continue;
      }
      n.lastKnownVtxos.size > 0 && t.add(n.contract.script);
    }
    return Array.from(t);
  }
  /**
   * Get VTXOs for contracts, grouped by contract script.
   * Uses Repository.
   */
  async getContractVtxos(t) {
    const { contractScripts: n, includeSpent: r } = t, i = this.config.walletRepository, o = Array.from(this.contracts.values()).filter((c) => !(n && !n.includes(c.contract.script))).map(async (c) => {
      const u = await i.getVtxos(c.contract.address);
      if (u.length > 0) {
        const l = u.map((h) => ({
          ...h,
          contractScript: c.contract.script
        })), f = r ? l : l.filter((h) => !h.isSpent);
        return [[c.contract.script, f]];
      }
      return [];
    }), a = await Promise.all(o);
    return new Map(a.flat(1));
  }
  /**
   * Start watching for VTXO events across all active contracts.
   */
  async startWatching(t) {
    if (this.isWatching)
      throw new Error("Already watching");
    return this.eventCallback = t, this.isWatching = !0, this.abortController = new AbortController(), this.reconnectAttempts = 0, await this.connect(), this.startFailsafePolling(), () => this.stopWatching();
  }
  /**
   * Stop watching for events.
   */
  async stopWatching() {
    if (this.isWatching = !1, this.connectionState = "disconnected", this.abortController?.abort(), this.reconnectTimeoutId && (clearTimeout(this.reconnectTimeoutId), this.reconnectTimeoutId = void 0), this.failsafePollIntervalId && (clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = void 0), this.subscriptionId) {
      try {
        await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
      } catch {
      }
      this.subscriptionId = void 0;
    }
    this.eventCallback = void 0;
  }
  /**
   * Check if currently watching.
   */
  isCurrentlyWatching() {
    return this.isWatching;
  }
  /**
   * Get current connection state.
   */
  getConnectionState() {
    return this.connectionState;
  }
  /**
   * Force a poll of all active contracts.
   * Useful for manual refresh or after app resume.
   */
  async forcePoll() {
    this.isWatching && await this.pollAllContracts();
  }
  /**
   * Check for expired contracts, update their state, and emit events.
   */
  checkExpiredContracts() {
    const t = Date.now();
    for (const n of this.contracts.values()) {
      const r = n.contract;
      r.state === "active" && r.expiresAt && r.expiresAt <= t && (r.state = "inactive", this.eventCallback?.({
        type: "contract_expired",
        contractScript: r.script,
        contract: r,
        timestamp: t
      }));
    }
  }
  /**
   * Connect to the subscription.
   */
  async connect() {
    if (this.isWatching) {
      this.connectionState = "connecting";
      try {
        await this.updateSubscription(), await this.pollAllContracts(), this.connectionState = "connected", this.reconnectAttempts = 0, await this.listenLoop();
      } catch (t) {
        console.error("ContractWatcher connection failed:", t), this.connectionState = "disconnected", this.eventCallback?.({
          type: "connection_reset",
          timestamp: Date.now()
        }), this.scheduleReconnect();
      }
    }
  }
  /**
   * Schedule a reconnection attempt.
   */
  scheduleReconnect() {
    if (!this.isWatching)
      return;
    if (this.config.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`ContractWatcher: Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      return;
    }
    this.connectionState = "reconnecting", this.reconnectAttempts++;
    const t = Math.min(this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1), this.config.maxReconnectDelayMs);
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = void 0, this.connect();
    }, t);
  }
  /**
   * Start the failsafe polling interval.
   */
  startFailsafePolling() {
    this.failsafePollIntervalId && clearInterval(this.failsafePollIntervalId), this.failsafePollIntervalId = setInterval(() => {
      this.isWatching && this.pollAllContracts().catch((t) => {
        console.error("ContractWatcher failsafe poll failed:", t);
      });
    }, this.config.failsafePollIntervalMs);
  }
  /**
   * Poll all active contracts for current state.
   */
  async pollAllContracts() {
    const t = this.getActiveContracts().map((n) => n.script);
    t.length !== 0 && await this.pollContracts(t);
  }
  /**
   * Poll specific contracts and emit events for changes.
   */
  async pollContracts(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now();
    try {
      const r = await this.getContractVtxos({
        contractScripts: t,
        includeSpent: !1
        // only spendable ones!
      });
      for (const i of t) {
        const s = this.contracts.get(i);
        if (!s)
          continue;
        const o = r.get(i) || [], a = new Set(o.map((l) => `${l.txid}:${l.vout}`)), c = [];
        for (const l of o) {
          const f = `${l.txid}:${l.vout}`;
          s.lastKnownVtxos.has(f) || (c.push(l), s.lastKnownVtxos.set(f, l));
        }
        const u = [];
        for (const [l, f] of s.lastKnownVtxos)
          a.has(l) || (u.push(f), s.lastKnownVtxos.delete(l));
        c.length > 0 && this.emitVtxoEvent(i, c, "vtxo_received", n), u.length > 0 && this.emitVtxoEvent(i, u, "vtxo_spent", n);
      }
    } catch (r) {
      console.error("ContractWatcher poll failed:", r);
    }
  }
  async tryUpdateSubscription() {
    try {
      await this.updateSubscription();
    } catch {
    }
  }
  /**
   * Update the subscription with scripts that should be watched.
   *
   * Watches both active contracts and contracts with VTXOs.
   */
  async updateSubscription() {
    const t = this.getScriptsToWatch();
    if (t.length === 0) {
      if (this.subscriptionId) {
        try {
          await this.config.indexerProvider.unsubscribeForScripts(this.subscriptionId);
        } catch {
        }
        this.subscriptionId = void 0;
      }
      return;
    }
    this.subscriptionId = await this.config.indexerProvider.subscribeForScripts(t, this.subscriptionId);
  }
  /**
   * Main listening loop for subscription events.
   */
  async listenLoop() {
    if (!this.subscriptionId || !this.abortController || !this.isWatching) {
      this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
      return;
    }
    const t = this.config.indexerProvider.getSubscription(this.subscriptionId, this.abortController.signal);
    for await (const n of t) {
      if (!this.isWatching)
        break;
      this.handleSubscriptionUpdate(n);
    }
    this.isWatching && (this.connectionState = "disconnected", this.scheduleReconnect());
  }
  /**
   * Handle a subscription update.
   */
  handleSubscriptionUpdate(t) {
    if (!this.eventCallback)
      return;
    const n = Date.now(), r = t.scripts || [];
    t.newVtxos?.length && this.processSubscriptionVtxos(t.newVtxos, r, "vtxo_received", n), t.spentVtxos?.length && this.processSubscriptionVtxos(t.spentVtxos, r, "vtxo_spent", n);
  }
  /**
   * Process VTXOs from subscription and route to correct contracts.
   * Uses the scripts from the subscription response to determine contract ownership.
   */
  processSubscriptionVtxos(t, n, r, i) {
    if (n.length === 1) {
      const s = n[0];
      if (s) {
        const o = this.contracts.get(s);
        if (o)
          for (const a of t) {
            const c = `${a.txid}:${a.vout}`;
            r === "vtxo_received" ? o.lastKnownVtxos.set(c, a) : r === "vtxo_spent" && o.lastKnownVtxos.delete(c);
          }
        this.emitVtxoEvent(s, t, r, i);
      }
      return;
    }
    for (const s of n) {
      const o = s;
      if (o) {
        const a = this.contracts.get(o);
        if (a)
          for (const c of t) {
            const u = `${c.txid}:${c.vout}`;
            r === "vtxo_received" ? a.lastKnownVtxos.set(u, c) : a.lastKnownVtxos.delete(u);
          }
        this.emitVtxoEvent(o, t, r, i);
      }
    }
  }
  /**
   * Emit a VTXO event for a contract.
   */
  emitVtxoEvent(t, n, r, i) {
    if (!this.eventCallback)
      return;
    const s = this.contracts.get(t);
    switch (this.checkExpiredContracts(), r) {
      case "vtxo_received":
        if (!s)
          return;
        this.eventCallback({
          type: "vtxo_received",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      case "vtxo_spent":
        if (!s)
          return;
        this.eventCallback({
          type: "vtxo_spent",
          vtxos: n.map((o) => ({
            ...o,
            contractScript: t,
            // These fields may not be available from basic VirtualCoin
            forfeitTapLeafScript: void 0,
            intentTapLeafScript: void 0,
            tapTree: void 0
          })),
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      case "contract_expired":
        if (!s)
          return;
        this.eventCallback({
          type: "contract_expired",
          contractScript: t,
          contract: s.contract,
          timestamp: i
        });
        return;
      default:
        return;
    }
  }
}
class j$ {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
  }
  /**
   * Register a contract handler.
   *
   * @param handler - The handler to register
   * @throws If a handler for this type is already registered
   */
  register(t) {
    if (this.handlers.has(t.type))
      throw new Error(`Contract handler for type '${t.type}' is already registered`);
    this.handlers.set(t.type, t);
  }
  /**
   * Get a handler by type.
   *
   * @param type - The contract type
   * @returns The handler, or undefined if not found
   */
  get(t) {
    return this.handlers.get(t);
  }
  /**
   * Get a handler by type, throwing if not found.
   *
   * @param type - The contract type
   * @returns The handler
   * @throws If no handler is registered for this type
   */
  getOrThrow(t) {
    const n = this.get(t);
    if (!n)
      throw new Error(`No contract handler registered for type '${t}'`);
    return n;
  }
  /**
   * Check if a handler is registered.
   *
   * @param type - The contract type
   */
  has(t) {
    return this.handlers.has(t);
  }
  /**
   * Get all registered types.
   */
  getRegisteredTypes() {
    return Array.from(this.handlers.keys());
  }
  /**
   * Unregister a handler (mainly for testing).
   */
  unregister(t) {
    return this.handlers.delete(t);
  }
  /**
   * Clear all handlers (mainly for testing).
   */
  clear() {
    this.handlers.clear();
  }
}
const Ds = new j$();
function Vs(e) {
  return to.encode(e.type === "blocks" ? { blocks: Number(e.value) } : { seconds: Number(e.value) });
}
function Ms(e) {
  const t = to.decode(e);
  if ("blocks" in t && t.blocks !== void 0)
    return { type: "blocks", value: BigInt(t.blocks) };
  if ("seconds" in t && t.seconds !== void 0)
    return { type: "seconds", value: BigInt(t.seconds) };
  throw new Error(`Invalid BIP68 sequence: ${e}`);
}
function ul(e, t) {
  if (t.role === "sender" || t.role === "receiver")
    return t.role;
  if (t.walletPubKey) {
    if (t.walletPubKey === e.params.sender)
      return "sender";
    if (t.walletPubKey === e.params.receiver)
      return "receiver";
  }
}
function wi(e, t) {
  if (t === void 0)
    return !0;
  if (!e.vtxo)
    return !1;
  const n = Ms(t);
  if (n.type === "blocks")
    return e.blockHeight === void 0 || e.vtxo.status.block_height === void 0 ? !1 : e.blockHeight - e.vtxo.status.block_height >= Number(n.value);
  if (n.type === "seconds") {
    const r = e.vtxo.status.block_time;
    return r === void 0 ? !1 : e.currentTime / 1e3 - r >= Number(n.value);
  }
  return !1;
}
const G$ = {
  type: "default",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new Xr.Script(t);
  },
  serializeParams(e) {
    return {
      pubKey: _.encode(e.pubKey),
      serverPubKey: _.encode(e.serverPubKey),
      csvTimelock: Vs(e.csvTimelock).toString()
    };
  },
  deserializeParams(e) {
    const t = e.csvTimelock ? Ms(Number(e.csvTimelock)) : Xr.Script.DEFAULT_TIMELOCK;
    return {
      pubKey: _.decode(e.pubKey),
      serverPubKey: _.decode(e.serverPubKey),
      csvTimelock: t
    };
  },
  selectPath(e, t, n) {
    if (n.collaborative)
      return { leaf: e.forfeit() };
    const r = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    return wi(n, r) ? {
      leaf: e.exit(),
      sequence: r
    } : null;
  },
  getAllSpendingPaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = { leaf: e.exit() };
    return t.params.csvTimelock && (i.sequence = Number(t.params.csvTimelock)), r.push(i), r;
  },
  getSpendablePaths(e, t, n) {
    const r = [];
    n.collaborative && r.push({ leaf: e.forfeit() });
    const i = t.params.csvTimelock ? Number(t.params.csvTimelock) : void 0;
    if (wi(n, i)) {
      const s = { leaf: e.exit() };
      i !== void 0 && (s.sequence = i), r.push(s);
    }
    return r;
  }
}, q$ = {
  type: "vhtlc",
  createScript(e) {
    const t = this.deserializeParams(e);
    return new wf.Script(t);
  },
  serializeParams(e) {
    return {
      sender: _.encode(e.sender),
      receiver: _.encode(e.receiver),
      server: _.encode(e.server),
      hash: _.encode(e.preimageHash),
      refundLocktime: e.refundLocktime.toString(),
      claimDelay: Vs(e.unilateralClaimDelay).toString(),
      refundDelay: Vs(e.unilateralRefundDelay).toString(),
      refundNoReceiverDelay: Vs(e.unilateralRefundWithoutReceiverDelay).toString()
    };
  },
  deserializeParams(e) {
    return {
      sender: _.decode(e.sender),
      receiver: _.decode(e.receiver),
      server: _.decode(e.server),
      preimageHash: _.decode(e.hash),
      refundLocktime: BigInt(e.refundLocktime),
      unilateralClaimDelay: Ms(Number(e.claimDelay)),
      unilateralRefundDelay: Ms(Number(e.refundDelay)),
      unilateralRefundWithoutReceiverDelay: Ms(Number(e.refundNoReceiverDelay))
    };
  },
  /**
   * Select spending path based on context.
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  selectPath(e, t, n) {
    const r = ul(t, n), i = t.params?.preimage, s = BigInt(t.params.refundLocktime), o = Math.floor(n.currentTime / 1e3);
    if (!r)
      return null;
    if (n.collaborative)
      return r === "receiver" && i ? {
        leaf: e.claim(),
        extraWitness: [_.decode(i)]
      } : r === "sender" && BigInt(o) >= s ? {
        leaf: e.refundWithoutReceiver()
      } : null;
    if (r === "receiver" && i) {
      const a = Number(t.params.claimDelay);
      return wi(n, a) ? {
        leaf: e.unilateralClaim(),
        extraWitness: [_.decode(i)],
        sequence: a
      } : null;
    }
    if (r === "sender") {
      const a = Number(t.params.refundNoReceiverDelay);
      return wi(n, a) ? {
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: a
      } : null;
    }
    return null;
  },
  /**
   * Get all possible spending paths (no timelock checks).
   *
   * Role is determined from `context.role` or by matching `context.walletPubKey`
   * against sender/receiver in contract params.
   */
  getAllSpendingPaths(e, t, n) {
    const r = ul(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage;
    if (n.collaborative)
      r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [_.decode(s)]
      }), r === "sender" && i.push({
        leaf: e.refundWithoutReceiver()
      });
    else {
      if (r === "receiver" && s) {
        const o = Number(t.params.claimDelay);
        i.push({
          leaf: e.unilateralClaim(),
          extraWitness: [_.decode(s)],
          sequence: o
        });
      }
      if (r === "sender") {
        const o = Number(t.params.refundNoReceiverDelay);
        i.push({
          leaf: e.unilateralRefundWithoutReceiver(),
          sequence: o
        });
      }
    }
    return i;
  },
  getSpendablePaths(e, t, n) {
    const r = ul(t, n), i = [];
    if (!r)
      return i;
    const s = t.params?.preimage, o = BigInt(t.params.refundLocktime), a = Math.floor(n.currentTime / 1e3);
    if (n.collaborative)
      return r === "receiver" && s && i.push({
        leaf: e.claim(),
        extraWitness: [_.decode(s)]
      }), r === "sender" && BigInt(a) >= o && i.push({
        leaf: e.refundWithoutReceiver()
      }), i;
    if (r === "receiver" && s) {
      const c = Number(t.params.claimDelay);
      wi(n, c) && i.push({
        leaf: e.unilateralClaim(),
        extraWitness: [_.decode(s)],
        sequence: c
      });
    }
    if (r === "sender") {
      const c = Number(t.params.refundNoReceiverDelay);
      wi(n, c) && i.push({
        leaf: e.unilateralRefundWithoutReceiver(),
        sequence: c
      });
    }
    return i;
  }
};
Ds.register(G$);
Ds.register(q$);
class Gd {
  constructor(t) {
    this.initialized = !1, this.eventCallbacks = /* @__PURE__ */ new Set(), this.config = t, this.watcher = new z$({
      indexerProvider: t.indexerProvider,
      walletRepository: t.walletRepository,
      ...t.watcherConfig
    });
  }
  /**
   * Static factory method for creating a new ContractManager.
   * Initialize the manager by loading persisted contracts and starting to watch.
   *
   * After initialization, the manager automatically watches all active contracts
   * and contracts with VTXOs. Use `onContractEvent()` to register event callbacks.
   *
   * @param config ContractManagerConfig
   */
  static async create(t) {
    const n = new Gd(t);
    return await n.initialize(), n;
  }
  async initialize() {
    if (this.initialized)
      return;
    const t = await this.config.contractRepository.getContracts();
    await this.getVtxosForContracts(t);
    const n = Date.now();
    for (const r of t)
      r.state === "active" && r.expiresAt && r.expiresAt <= n && (r.state = "inactive", await this.config.contractRepository.saveContract(r)), await this.watcher.addContract(r);
    this.initialized = !0, this.stopWatcherFn = await this.watcher.startWatching((r) => {
      this.handleContractEvent(r);
    });
  }
  /**
   * Create and register a new contract.
   *
   * @param params - Contract parameters
   * @returns The created contract
   */
  async createContract(t) {
    const n = Ds.get(t.type);
    if (!n)
      throw new Error(`No handler registered for contract type '${t.type}'`);
    try {
      const s = n.createScript(t.params), o = _.encode(s.pkScript);
      if (o !== t.script)
        throw new Error(`Script mismatch: provided script does not match script derived from params. Expected ${o}, got ${t.script}`);
    } catch (s) {
      throw s instanceof Error && s.message.includes("mismatch") ? s : new Error(`Invalid params for contract type '${t.type}': ${s instanceof Error ? s.message : String(s)}`);
    }
    const [r] = await this.getContracts({ script: t.script });
    if (r) {
      if (r.type === t.type)
        return r;
      throw new Error(`Contract with script ${t.script} already exists with with type ${r.type}.`);
    }
    const i = {
      ...t,
      createdAt: Date.now(),
      state: t.state || "active"
    };
    return await this.config.contractRepository.saveContract(i), await this.getVtxosForContracts([i]), await this.watcher.addContract(i), i;
  }
  /**
   * Get contracts with optional filters.
   *
   * @param filter - Optional filter criteria
   * @returns Filtered contracts TODO: filter spent/unspent
   *
   * @example
   * ```typescript
   * // Get all VHTLC contracts
   * const vhtlcs = await manager.getContracts({ type: 'vhtlc' });
   *
   * // Get all active contracts
   * const active = await manager.getContracts({ state: 'active' });
   * ```
   */
  async getContracts(t) {
    const n = this.buildContractsDbFilter(t ?? {});
    return await this.config.contractRepository.getContracts(n);
  }
  async getContractsWithVtxos(t) {
    const n = await this.getContracts(t), r = await this.getVtxosForContracts(n);
    return n.map((i) => ({
      contract: i,
      vtxos: r.get(i.script) ?? []
    }));
  }
  buildContractsDbFilter(t) {
    return {
      script: t.script,
      state: t.state,
      type: t.type
    };
  }
  /**
   * Update a contract.
   * Nested fields like `params` and `metadata` are replaced with the provided values.
   * If you need to preserve existing fields, merge them manually.
   *
   * @param script - Contract script
   * @param updates - Fields to update
   */
  async updateContract(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      ...n
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Update a contract's params.
   * This method preserves existing params by merging the provided values.
   *
   * @param script - Contract script
   * @param updates - The new values to merge with existing params
   */
  async updateContractParams(t, n) {
    const i = (await this.config.contractRepository.getContracts({
      script: t
    }))[0];
    if (!i)
      throw new Error(`Contract ${t} not found`);
    const s = {
      ...i,
      params: { ...i.params, ...n }
    };
    return await this.config.contractRepository.saveContract(s), await this.watcher.updateContract(s), s;
  }
  /**
   * Set a contract's state.
   */
  async setContractState(t, n) {
    await this.updateContract(t, { state: n });
  }
  /**
   * Delete a contract.
   *
   * @param script - Contract script
   */
  async deleteContract(t) {
    await this.config.contractRepository.deleteContract(t), await this.watcher.removeContract(t);
  }
  /**
   * Get currently spendable paths for a contract.
   *
   * @param contractScript - The contract script
   * @param options - Options for getting spendable paths
   */
  async getSpendablePaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i, vtxo: s } = t, [o] = await this.getContracts({ script: n });
    if (!o)
      return [];
    const a = Ds.get(o.type);
    if (!a)
      return [];
    const c = a.createScript(o.params), u = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i,
      vtxo: s
    };
    return a.getSpendablePaths(c, o, u);
  }
  async getAllSpendingPaths(t) {
    const { contractScript: n, collaborative: r = !0, walletPubKey: i } = t, [s] = await this.getContracts({ script: n });
    if (!s)
      return [];
    const o = Ds.get(s.type);
    if (!o)
      return [];
    const a = o.createScript(s.params), c = {
      collaborative: r,
      currentTime: Date.now(),
      walletPubKey: i
    };
    return o.getAllSpendingPaths(a, s, c);
  }
  /**
   * Register a callback for contract events.
   *
   * The manager automatically watches after `initialize()`. This method
   * allows registering callbacks to receive events.
   *
   * @param callback - Event callback
   * @returns Unsubscribe function to remove this callback
   *
   * @example
   * ```typescript
   * const unsubscribe = manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   *
   * // Later: stop receiving events
   * unsubscribe();
   * ```
   */
  onContractEvent(t) {
    return this.eventCallbacks.add(t), () => {
      this.eventCallbacks.delete(t);
    };
  }
  /**
   * Check if currently watching.
   */
  async isWatching() {
    return this.watcher.isCurrentlyWatching();
  }
  /**
   * Emit an event to all registered callbacks.
   */
  emitEvent(t) {
    for (const n of this.eventCallbacks)
      try {
        n(t);
      } catch (r) {
        console.error("Error in contract event callback:", r);
      }
  }
  /**
   * Handle events from the watcher.
   */
  async handleContractEvent(t) {
    switch (t.type) {
      // Every time there is a VTXO event for a contract, refresh all its VTXOs
      case "vtxo_received":
      case "vtxo_spent":
        await this.fetchContractVxosFromIndexer([t.contract], !0);
        break;
      case "connection_reset":
        const n = this.watcher.getActiveContracts();
        await this.fetchContractVxosFromIndexer(n, !1);
        break;
      case "contract_expired":
        await this.config.contractRepository.saveContract(t.contract);
    }
    this.emitEvent(t);
  }
  async getVtxosForContracts(t) {
    return t.length === 0 ? /* @__PURE__ */ new Map() : await this.fetchContractVxosFromIndexer(t, !1, this.config.extendVtxo);
  }
  async fetchContractVxosFromIndexer(t, n, r) {
    const i = await this.fetchContractVtxosBulk(t, n, r), s = /* @__PURE__ */ new Map();
    for (const [o, a] of i) {
      s.set(o, a);
      const c = t.find((u) => u.script === o);
      c && await this.config.walletRepository.saveVtxos(c.address, a);
    }
    return s;
  }
  async fetchContractVtxosBulk(t, n, r) {
    const i = /* @__PURE__ */ new Map();
    return await Promise.all(t.map(async (s) => {
      const o = await this.fetchContractVtxosPaginated(s, n, r);
      i.set(s.script, o);
    })), i;
  }
  async fetchContractVtxosPaginated(t, n, r) {
    const s = [];
    let o = 0, a = !0;
    const c = n ? {} : { spendableOnly: !0 };
    for (; a; ) {
      const { vtxos: u, page: l } = await this.config.indexerProvider.getVtxos({
        scripts: [t.script],
        ...c,
        pageIndex: o,
        pageSize: 100
      });
      for (const f of u) {
        const h = r ? r(f) : f;
        s.push({
          ...h,
          contractScript: t.script
        });
      }
      a = l ? u.length === 100 : !1, o++;
    }
    return s;
  }
  /**
   * Dispose of the ContractManager and release all resources.
   *
   * Stops the watcher, clears callbacks, and marks
   * the manager as uninitialized.
   *
   * Implements the disposable pattern for cleanup.
   */
  dispose() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
  /**
   * Symbol.dispose implementation for using with `using` keyword.
   * @example
   * ```typescript
   * {
   *   using manager = await wallet.getContractManager();
   *   // ... use manager
   * } // automatically disposed
   * ```
   */
  [Symbol.dispose]() {
    this.stopWatcherFn?.(), this.stopWatcherFn = void 0, this.eventCallbacks.clear(), this.initialized = !1;
  }
}
function Y$(e) {
  return typeof e == "object" && e !== null && "toReadonly" in e && typeof e.toReadonly == "function";
}
class ki {
  constructor(t, n, r, i, s, o, a, c, u, l, f) {
    this.identity = t, this.network = n, this.onchainProvider = r, this.indexerProvider = i, this.arkServerPublicKey = s, this.offchainTapscript = o, this.boardingTapscript = a, this.dustAmount = c, this.walletRepository = u, this.contractRepository = l, this.watcherConfig = f;
  }
  /**
   * Protected helper to set up shared wallet configuration.
   * Extracts common logic used by both ReadonlyWallet.create() and Wallet.create().
   */
  static async setupWalletConfig(t, n) {
    const r = t.arkProvider || (() => {
      if (!t.arkServerUrl)
        throw new Error("Either arkProvider or arkServerUrl must be provided");
      return new eI(t.arkServerUrl);
    })(), i = t.arkServerUrl || r.serverUrl;
    if (!i)
      throw new Error("Could not determine arkServerUrl from provider");
    const s = t.indexerUrl || i, o = t.indexerProvider || new UI(s), a = await r.getInfo(), c = aI(a.network), u = t.esploraUrl || uI[a.network], l = t.onchainProvider || new lI(u);
    if (t.exitTimelock) {
      const { value: k, type: C } = t.exitTimelock;
      if (k < 512n && C !== "blocks" || k >= 512n && C !== "seconds")
        throw new Error("invalid exitTimelock");
    }
    const f = t.exitTimelock ?? {
      value: a.unilateralExitDelay,
      type: a.unilateralExitDelay < 512n ? "blocks" : "seconds"
    };
    if (t.boardingTimelock) {
      const { value: k, type: C } = t.boardingTimelock;
      if (k < 512n && C !== "blocks" || k >= 512n && C !== "seconds")
        throw new Error("invalid boardingTimelock");
    }
    const h = t.boardingTimelock ?? {
      value: a.boardingExitDelay,
      type: a.boardingExitDelay < 512n ? "blocks" : "seconds"
    }, p = _.decode(a.signerPubkey).slice(1), y = new Xr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: f
    }), d = new Xr.Script({
      pubKey: n,
      serverPubKey: p,
      csvTimelock: h
    }), g = y, m = t.storage?.walletRepository ?? new K$(), v = t.storage?.contractRepository ?? new x0();
    return {
      arkProvider: r,
      indexerProvider: o,
      onchainProvider: l,
      network: c,
      networkName: a.network,
      serverPubKey: p,
      offchainTapscript: g,
      boardingTapscript: d,
      dustAmount: a.dust,
      walletRepository: m,
      contractRepository: v,
      info: a
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await ki.setupWalletConfig(t, n);
    return new ki(t.identity, r.network, r.onchainProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, r.dustAmount, r.walletRepository, r.contractRepository, t.watcherConfig);
  }
  get arkAddress() {
    return this.offchainTapscript.address(this.network.hrp, this.arkServerPublicKey);
  }
  /**
   * Get the contract script for the wallet's default address.
   * This is the pkScript hex, used to identify the wallet in ContractManager.
   */
  get defaultContractScript() {
    return _.encode(this.offchainTapscript.pkScript);
  }
  async getAddress() {
    return this.arkAddress.encode();
  }
  async getBoardingAddress() {
    return this.boardingTapscript.onchainAddress(this.network);
  }
  async getBalance() {
    const [t, n] = await Promise.all([
      this.getBoardingUtxos(),
      this.getVtxos()
    ]);
    let r = 0, i = 0;
    for (const l of t)
      l.status.confirmed ? r += l.value : i += l.value;
    let s = 0, o = 0, a = 0;
    s = n.filter((l) => l.virtualStatus.state === "settled").reduce((l, f) => l + f.value, 0), o = n.filter((l) => l.virtualStatus.state === "preconfirmed").reduce((l, f) => l + f.value, 0), a = n.filter((l) => ra(l) && l.virtualStatus.state === "swept").reduce((l, f) => l + f.value, 0);
    const c = r + i, u = s + o + a;
    return {
      boarding: {
        confirmed: r,
        unconfirmed: i,
        total: c
      },
      settled: s,
      preconfirmed: o,
      available: s + o,
      recoverable: a,
      total: c + u
    };
  }
  // TODO: use contract manager (and repo) will be offline-first
  async getVtxos(t) {
    const n = await this.getAddress(), i = (await this.getVirtualCoins(t)).map((s) => yi(this, s));
    return await this.walletRepository.saveVtxos(n, i), i;
  }
  async getVirtualCoins(t = { withRecoverable: !0, withUnrolled: !1 }) {
    const n = [_.encode(this.offchainTapscript.pkScript)], i = (await this.indexerProvider.getVtxos({ scripts: n })).vtxos;
    let s = i.filter(ra);
    if (t.withRecoverable || (s = s.filter((o) => !r0(o) && !Mk(o))), t.withUnrolled) {
      const o = i.filter((a) => !ra(a));
      s.push(...o.filter((a) => a.isUnrolled));
    }
    return s;
  }
  async getTransactionHistory() {
    const t = await this.indexerProvider.getVtxos({
      scripts: [_.encode(this.offchainTapscript.pkScript)]
    }), { boardingTxs: n, commitmentsToIgnore: r } = await this.getBoardingTxs(), i = (s) => this.indexerProvider.getVtxos({ outpoints: [{ txid: s, vout: 0 }] }).then((o) => o.vtxos[0]?.createdAt.getTime() || 0);
    return _$(t.vtxos, n, r, i);
  }
  async getBoardingTxs() {
    const t = [], n = /* @__PURE__ */ new Set(), r = await this.getBoardingAddress(), i = await this.onchainProvider.getTransactions(r);
    for (const a of i)
      for (let c = 0; c < a.vout.length; c++) {
        const u = a.vout[c];
        if (u.scriptpubkey_address === r) {
          const f = (await this.onchainProvider.getTxOutspends(a.txid))[c];
          f?.spent && n.add(f.txid), t.push({
            txid: a.txid,
            vout: c,
            value: Number(u.value),
            status: {
              confirmed: a.status.confirmed,
              block_time: a.status.block_time
            },
            isUnrolled: !0,
            virtualStatus: {
              state: f?.spent ? "spent" : "settled",
              commitmentTxIds: f?.spent ? [f.txid] : void 0
            },
            createdAt: a.status.confirmed ? new Date(a.status.block_time * 1e3) : /* @__PURE__ */ new Date(0)
          });
        }
      }
    const s = [], o = [];
    for (const a of t) {
      const c = {
        key: {
          boardingTxid: a.txid,
          commitmentTxid: "",
          arkTxid: ""
        },
        amount: a.value,
        type: Bn.TxReceived,
        settled: a.virtualStatus.state === "spent",
        createdAt: a.status.block_time ? new Date(a.status.block_time * 1e3).getTime() : 0
      };
      a.status.block_time ? o.push(c) : s.push(c);
    }
    return {
      boardingTxs: [...s, ...o],
      commitmentsToIgnore: n
    };
  }
  async getBoardingUtxos() {
    const t = await this.getBoardingAddress(), r = (await this.onchainProvider.getCoins(t)).map((i) => LI(this, i));
    return await this.walletRepository.saveUtxos(t, r), r;
  }
  async notifyIncomingFunds(t) {
    const n = await this.getAddress(), r = await this.getBoardingAddress();
    let i, s;
    if (this.onchainProvider && r) {
      const a = (c) => c.vout.findIndex((u) => u.scriptpubkey_address === r);
      i = await this.onchainProvider.watchAddresses([r], (c) => {
        const u = c.filter((l) => a(l) !== -1).map((l) => {
          const { txid: f, status: h } = l, p = a(l), y = Number(l.vout[p].value);
          return { txid: f, vout: p, value: y, status: h };
        });
        t({
          type: "utxo",
          coins: u
        });
      });
    }
    if (this.indexerProvider && n) {
      const a = this.offchainTapscript, c = await this.indexerProvider.subscribeForScripts([
        _.encode(a.pkScript)
      ]), u = new AbortController(), l = this.indexerProvider.getSubscription(c, u.signal);
      s = async () => {
        u.abort(), await this.indexerProvider?.unsubscribeForScripts(c);
      }, (async () => {
        try {
          for await (const f of l)
            (f.newVtxos?.length > 0 || f.spentVtxos?.length > 0) && t({
              type: "vtxo",
              newVtxos: f.newVtxos.map((h) => yi(this, h)),
              spentVtxos: f.spentVtxos.map((h) => yi(this, h))
            });
        } catch (f) {
          console.error("Subscription error:", f);
        }
      })();
    }
    return () => {
      i?.(), s?.();
    };
  }
  async fetchPendingTxs() {
    const t = [_.encode(this.offchainTapscript.pkScript)];
    let { vtxos: n } = await this.indexerProvider.getVtxos({
      scripts: t
    });
    return n.filter((r) => r.virtualStatus.state !== "swept" && r.virtualStatus.state !== "settled" && r.arkTxId !== void 0).map((r) => r.arkTxId);
  }
  // ========================================================================
  // Contract Management
  // ========================================================================
  /**
   * Get the ContractManager for managing contracts including the wallet's default address.
   *
   * The ContractManager handles:
   * - The wallet's default receiving address (as a "default" contract)
   * - External contracts (Boltz swaps, HTLCs, etc.)
   * - Multi-contract watching with resilient connections
   *
   * @example
   * ```typescript
   * const manager = await wallet.getContractManager();
   *
   * // Create a contract for a Boltz swap
   * const contract = await manager.createContract({
   *   label: "Boltz Swap",
   *   type: "vhtlc",
   *   params: { ... },
   *   script: swapScript,
   *   address: swapAddress,
   * });
   *
   * // Start watching for events (includes wallet's default address)
   * const stop = await manager.onContractEvent((event) => {
   *   console.log(`${event.type} on ${event.contractScript}`);
   * });
   * ```
   */
  async getContractManager() {
    if (this._contractManager)
      return this._contractManager;
    if (this._contractManagerInitializing)
      return this._contractManagerInitializing;
    this._contractManagerInitializing = this.initializeContractManager();
    try {
      const t = await this._contractManagerInitializing;
      return this._contractManager = t, t;
    } catch (t) {
      throw this._contractManagerInitializing = void 0, t;
    } finally {
      this._contractManagerInitializing = void 0;
    }
  }
  async initializeContractManager() {
    const t = await Gd.create({
      indexerProvider: this.indexerProvider,
      contractRepository: this.contractRepository,
      walletRepository: this.walletRepository,
      extendVtxo: (r) => yi(this, r),
      getDefaultAddress: () => this.getAddress(),
      watcherConfig: this.watcherConfig
    }), n = this.offchainTapscript.options.csvTimelock ?? Xr.Script.DEFAULT_TIMELOCK;
    return await t.createContract({
      type: "default",
      params: {
        pubKey: _.encode(this.offchainTapscript.options.pubKey),
        serverPubKey: _.encode(this.offchainTapscript.options.serverPubKey),
        csvTimelock: Vs(n).toString()
      },
      script: this.defaultContractScript,
      address: await this.getAddress(),
      state: "active"
    }), t;
  }
}
class no extends ki {
  constructor(t, n, r, i, s, o, a, c, u, l, f, h, p, y, d, g, m) {
    super(t, n, i, o, a, c, u, p, y, d, m), this.networkName = r, this.arkProvider = s, this.serverUnrollScript = l, this.forfeitOutputScript = f, this.forfeitPubkey = h, this.identity = t, this.renewalConfig = {
      enabled: g?.enabled ?? !1,
      ...BI,
      ...g
    };
  }
  static async create(t) {
    const n = await t.identity.xOnlyPublicKey();
    if (!n)
      throw new Error("Invalid configured public key");
    const r = await ki.setupWalletConfig(t, n);
    let i;
    try {
      const c = _.decode(r.info.checkpointTapscript);
      i = we.decode(c);
    } catch {
      throw new Error("Invalid checkpointTapscript from server");
    }
    const s = _.decode(r.info.forfeitPubkey).slice(1), o = Sr(r.network).decode(r.info.forfeitAddress), a = At.encode(o);
    return new no(t.identity, r.network, r.networkName, r.onchainProvider, r.arkProvider, r.indexerProvider, r.serverPubKey, r.offchainTapscript, r.boardingTapscript, i, a, s, r.dustAmount, r.walletRepository, r.contractRepository, t.renewalConfig, t.watcherConfig);
  }
  /**
   * Convert this wallet to a readonly wallet.
   *
   * @returns A readonly wallet with the same configuration but readonly identity
   * @example
   * ```typescript
   * const wallet = await Wallet.create({ identity: SingleKey.fromHex('...'), ... });
   * const readonlyWallet = await wallet.toReadonly();
   *
   * // Can query balance and addresses
   * const balance = await readonlyWallet.getBalance();
   * const address = await readonlyWallet.getAddress();
   *
   * // But cannot send transactions (type error)
   * // readonlyWallet.sendBitcoin(...); // TypeScript error
   * ```
   */
  async toReadonly() {
    const t = Y$(this.identity) ? await this.identity.toReadonly() : this.identity;
    return new ki(t, this.network, this.onchainProvider, this.indexerProvider, this.arkServerPublicKey, this.offchainTapscript, this.boardingTapscript, this.dustAmount, this.walletRepository, this.contractRepository, this.watcherConfig);
  }
  async sendBitcoin(t) {
    if (t.amount <= 0)
      throw new Error("Amount must be positive");
    if (!X$(t.address))
      throw new Error("Invalid Ark address " + t.address);
    const n = await this.getVirtualCoins({
      withRecoverable: !1
    });
    let r;
    if (t.selectedVtxos) {
      const y = t.selectedVtxos.map((g) => g.value).reduce((g, m) => g + m, 0);
      if (y < t.amount)
        throw new Error("Selected VTXOs do not cover specified amount");
      const d = y - t.amount;
      r = {
        inputs: t.selectedVtxos,
        changeAmount: BigInt(d)
      };
    } else
      r = Q$(n, t.amount);
    const i = this.offchainTapscript.forfeit();
    if (!i)
      throw new Error("Selected leaf not found");
    const s = Zr.decode(t.address), a = [
      {
        script: BigInt(t.amount) < this.dustAmount ? s.subdustPkScript : s.pkScript,
        amount: BigInt(t.amount)
      }
    ];
    if (r.changeAmount > 0n) {
      const y = r.changeAmount < this.dustAmount ? this.arkAddress.subdustPkScript : this.arkAddress.pkScript;
      a.push({
        script: y,
        amount: BigInt(r.changeAmount)
      });
    }
    const c = this.offchainTapscript.encode(), u = kI(r.inputs.map((y) => ({
      ...y,
      tapLeafScript: i,
      tapTree: c
    })), a, this.serverUnrollScript), l = await this.identity.sign(u.arkTx), { arkTxid: f, signedCheckpointTxs: h } = await this.arkProvider.submitTx(Kt.encode(l.toPSBT()), u.checkpoints.map((y) => Kt.encode(y.toPSBT()))), p = await Promise.all(h.map(async (y) => {
      const d = He.fromPSBT(Kt.decode(y)), g = await this.identity.sign(d);
      return Kt.encode(g.toPSBT());
    }));
    await this.arkProvider.finalizeTx(f, p);
    try {
      const y = [], d = /* @__PURE__ */ new Set();
      let g = Number.MAX_SAFE_INTEGER;
      for (const [k, C] of r.inputs.entries()) {
        const L = yi(this, C), G = h[k], b = He.fromPSBT(Kt.decode(G));
        if (y.push({
          ...L,
          virtualStatus: { ...L.virtualStatus, state: "spent" },
          spentBy: b.id,
          arkTxId: f,
          isSpent: !0
        }), L.virtualStatus.commitmentTxIds)
          for (const Y of L.virtualStatus.commitmentTxIds)
            d.add(Y);
        L.virtualStatus.batchExpiry && (g = Math.min(g, L.virtualStatus.batchExpiry));
      }
      const m = Date.now(), v = this.arkAddress.encode();
      if (r.changeAmount > 0n && g !== Number.MAX_SAFE_INTEGER) {
        const k = {
          txid: f,
          vout: a.length - 1,
          createdAt: new Date(m),
          forfeitTapLeafScript: this.offchainTapscript.forfeit(),
          intentTapLeafScript: this.offchainTapscript.forfeit(),
          isUnrolled: !1,
          isSpent: !1,
          tapTree: this.offchainTapscript.encode(),
          value: Number(r.changeAmount),
          virtualStatus: {
            state: "preconfirmed",
            commitmentTxIds: Array.from(d),
            batchExpiry: g
          },
          status: {
            confirmed: !1
          }
        };
        await this.walletRepository.saveVtxos(v, [k]);
      }
      await this.walletRepository.saveVtxos(v, y), await this.walletRepository.saveTransactions(v, [
        {
          key: {
            boardingTxid: "",
            commitmentTxid: "",
            arkTxid: f
          },
          amount: t.amount,
          type: Bn.TxSent,
          settled: !1,
          createdAt: Date.now()
        }
      ]);
    } catch (y) {
      console.warn("error saving offchain tx to repository", y);
    } finally {
      return f;
    }
  }
  async settle(t, n) {
    if (t?.inputs) {
      for (const y of t.inputs)
        if (typeof y == "string")
          try {
            Ot.fromString(y);
          } catch {
            throw new Error(`Invalid arknote "${y}"`);
          }
    }
    if (!t) {
      const { fees: y } = await this.arkProvider.getInfo(), d = new R$(y.intentFee);
      let g = 0;
      const v = we.decode(_.decode(this.boardingTapscript.exitScript)).params.timelock, k = (await this.getBoardingUtxos()).filter((S) => !CI(S, v)), C = [];
      for (const S of k) {
        const rt = d.evalOnchainInput({
          amount: BigInt(S.value)
        });
        rt.value >= S.value || (C.push(S), g += S.value - rt.satoshis);
      }
      const L = await this.getVtxos({ withRecoverable: !0 }), G = [];
      for (const S of L) {
        const rt = d.evalOffchainInput({
          amount: BigInt(S.value),
          type: S.virtualStatus.state === "swept" ? "recoverable" : "vtxo",
          weight: 0,
          birth: S.createdAt,
          expiry: S.virtualStatus.batchExpiry ? new Date(S.virtualStatus.batchExpiry * 1e3) : /* @__PURE__ */ new Date()
        });
        rt.value >= S.value || (G.push(S), g += S.value - rt.satoshis);
      }
      const b = [...C, ...G];
      if (b.length === 0)
        throw new Error("No inputs found");
      const Y = {
        address: await this.getAddress(),
        amount: BigInt(g)
      }, D = d.evalOffchainOutput({
        amount: Y.amount,
        script: _.encode(Zr.decode(Y.address).pkScript)
      });
      if (Y.amount -= BigInt(D.satoshis), Y.amount <= this.dustAmount)
        throw new Error("Output amount is below dust limit");
      t = {
        inputs: b,
        outputs: [Y]
      };
    }
    const r = [], i = [];
    let s = !1;
    for (const [y, d] of t.outputs.entries()) {
      let g;
      try {
        g = Zr.decode(d.address).pkScript, s = !0;
      } catch {
        const m = Sr(this.network).decode(d.address);
        g = At.encode(m), r.push(y);
      }
      i.push({
        amount: d.amount,
        script: g
      });
    }
    let o;
    const a = [];
    s && (o = this.identity.signerSession(), a.push(_.encode(await o.getPublicKey())));
    const [c, u] = await Promise.all([
      this.makeRegisterIntentSignature(t.inputs, i, r, a),
      this.makeDeleteIntentSignature(t.inputs)
    ]), l = await this.safeRegisterIntent(c), f = [
      ...a,
      ...t.inputs.map((y) => `${y.txid}:${y.vout}`)
    ], h = this.createBatchHandler(l, t.inputs, o), p = new AbortController();
    try {
      const y = this.arkProvider.getEventStream(p.signal, f);
      return await Ef.join(y, h, {
        abortController: p,
        skipVtxoTreeSigning: !s,
        eventCallback: n ? (d) => Promise.resolve(n(d)) : void 0
      });
    } catch (y) {
      throw await this.arkProvider.deleteIntent(u).catch(() => {
      }), y;
    } finally {
      p.abort();
    }
  }
  async handleSettlementFinalizationEvent(t, n, r, i) {
    const s = [], o = await this.getVirtualCoins();
    let a = He.fromPSBT(Kt.decode(t.commitmentTx)), c = !1, u = 0;
    const l = i?.leaves() || [];
    for (const f of n) {
      const h = o.find((k) => k.txid === f.txid && k.vout === f.vout);
      if (!h) {
        for (let k = 0; k < a.inputsLength; k++) {
          const C = a.getInput(k);
          if (!C.txid || C.index === void 0)
            throw new Error("The server returned incomplete data. No settlement input found in the PSBT");
          if (_.encode(C.txid) === f.txid && C.index === f.vout) {
            a.updateInput(k, {
              tapLeafScript: [f.forfeitTapLeafScript]
            }), a = await this.identity.sign(a, [
              k
            ]), c = !0;
            break;
          }
        }
        continue;
      }
      if (r0(h) || Hk(h, this.dustAmount))
        continue;
      if (l.length === 0)
        throw new Error("connectors not received");
      if (u >= l.length)
        throw new Error("not enough connectors received");
      const p = l[u], y = p.id, d = p.getOutput(0);
      if (!d)
        throw new Error("connector output not found");
      const g = d.amount, m = d.script;
      if (!g || !m)
        throw new Error("invalid connector output");
      u++;
      let v = gI([
        {
          txid: f.txid,
          index: f.vout,
          witnessUtxo: {
            amount: BigInt(h.value),
            script: $e.decode(f.tapTree).pkScript
          },
          sighashType: ji.DEFAULT,
          tapLeafScript: [f.forfeitTapLeafScript]
        },
        {
          txid: y,
          index: 0,
          witnessUtxo: {
            amount: g,
            script: m
          }
        }
      ], r);
      v = await this.identity.sign(v, [0]), s.push(Kt.encode(v.toPSBT()));
    }
    (s.length > 0 || c) && await this.arkProvider.submitSignedForfeitTxs(s, c ? Kt.encode(a.toPSBT()) : void 0);
  }
  /**
   * @implements Batch.Handler interface.
   * @param intentId - The intent ID.
   * @param inputs - The inputs of the intent.
   * @param session - The musig2 signing session, if not provided, the signing will be skipped.
   */
  createBatchHandler(t, n, r) {
    let i;
    return {
      onBatchStarted: async (s) => {
        const o = new TextEncoder().encode(t), a = jt(o), c = _.encode(a);
        let u = !0;
        for (const f of s.intentIdHashes)
          if (f === c) {
            if (!this.arkProvider)
              throw new Error("Ark provider not configured");
            await this.arkProvider.confirmRegistration(t), u = !1;
          }
        if (u)
          return { skip: u };
        const l = we.encode({
          timelock: {
            value: s.batchExpiry,
            type: s.batchExpiry >= 512n ? "seconds" : "blocks"
          },
          pubkeys: [this.forfeitPubkey]
        }).script;
        return i = Ns(l), { skip: !1 };
      },
      onTreeSigningStarted: async (s, o) => {
        if (!r)
          return { skip: !0 };
        if (!i)
          throw new Error("Sweep tap tree root not set");
        const a = s.cosignersPublicKeys.map((y) => y.slice(2)), u = (await r.getPublicKey()).subarray(1);
        if (!a.includes(_.encode(u)))
          return { skip: !0 };
        const l = He.fromPSBT(Kt.decode(s.unsignedCommitmentTx));
        AI(o, l, i);
        const f = l.getOutput(0);
        if (!f?.amount)
          throw new Error("Shared output not found");
        await r.init(o, i, f.amount);
        const h = _.encode(await r.getPublicKey()), p = await r.getNonces();
        return await this.arkProvider.submitTreeNonces(s.id, h, p), { skip: !1 };
      },
      onTreeNonces: async (s) => {
        if (!r)
          return { fullySigned: !0 };
        const { hasAllNonces: o } = await r.aggregatedNonces(s.txid, s.nonces);
        if (!o)
          return { fullySigned: !1 };
        const a = await r.sign(), c = _.encode(await r.getPublicKey());
        return await this.arkProvider.submitTreeSignatures(s.id, c, a), { fullySigned: !0 };
      },
      onBatchFinalization: async (s, o, a) => {
        if (!this.forfeitOutputScript)
          throw new Error("Forfeit output script not set");
        a && vI(s.commitmentTx, a), await this.handleSettlementFinalizationEvent(s, n, this.forfeitOutputScript, a);
      }
    };
  }
  async safeRegisterIntent(t) {
    try {
      return await this.arkProvider.registerIntent(t);
    } catch (n) {
      if (n instanceof i0 && n.code === 0 && n.message.includes("duplicated input")) {
        const r = await this.getVtxos({
          withRecoverable: !0
        }), i = await this.makeDeleteIntentSignature(r);
        return await this.arkProvider.deleteIntent(i), this.arkProvider.registerIntent(t);
      }
      throw n;
    }
  }
  async makeRegisterIntentSignature(t, n, r, i) {
    const s = this.prepareIntentProofInputs(t), o = {
      type: "register",
      onchain_output_indexes: r,
      valid_at: 0,
      expire_at: 0,
      cosigners_public_keys: i
    }, a = fr.create(o, s, n), c = await this.identity.sign(a);
    return {
      proof: Kt.encode(c.toPSBT()),
      message: o
    };
  }
  async makeDeleteIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "delete",
      expire_at: 0
    }, i = fr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Kt.encode(s.toPSBT()),
      message: r
    };
  }
  async makeGetPendingTxIntentSignature(t) {
    const n = this.prepareIntentProofInputs(t), r = {
      type: "get-pending-tx",
      expire_at: 0
    }, i = fr.create(r, n, []), s = await this.identity.sign(i);
    return {
      proof: Kt.encode(s.toPSBT()),
      message: r
    };
  }
  /**
   * Finalizes pending transactions by retrieving them from the server and finalizing each one.
   * @param vtxos - Optional list of VTXOs to use instead of retrieving them from the server
   * @returns Array of transaction IDs that were finalized
   */
  async finalizePendingTxs(t) {
    if (!t || t.length === 0) {
      const s = [_.encode(this.offchainTapscript.pkScript)];
      let { vtxos: o } = await this.indexerProvider.getVtxos({
        scripts: s
      });
      if (o = o.filter((a) => a.virtualStatus.state !== "swept" && a.virtualStatus.state !== "settled"), o.length === 0)
        return { finalized: [], pending: [] };
      t = o.map((a) => yi(this, a));
    }
    const r = [], i = [];
    for (let s = 0; s < t.length; s += 20) {
      const o = t.slice(s, s + 20), a = await this.makeGetPendingTxIntentSignature(o), c = await this.arkProvider.getPendingTxs(a);
      for (const u of c) {
        i.push(u.arkTxid);
        try {
          const l = await Promise.all(u.signedCheckpointTxs.map(async (f) => {
            const h = He.fromPSBT(Kt.decode(f)), p = await this.identity.sign(h);
            return Kt.encode(p.toPSBT());
          }));
          await this.arkProvider.finalizeTx(u.arkTxid, l), r.push(u.arkTxid);
        } catch (l) {
          console.error(`Failed to finalize transaction ${u.arkTxid}:`, l);
        }
      }
    }
    return { finalized: r, pending: i };
  }
  prepareIntentProofInputs(t) {
    const n = [];
    for (const r of t) {
      const i = $e.decode(r.tapTree), s = Z$(r.intentTapLeafScript), o = [e0.encode(r.tapTree)];
      r.extraWitness && o.push(Lk.encode(r.extraWitness)), n.push({
        txid: _.decode(r.txid),
        index: r.vout,
        witnessUtxo: {
          amount: BigInt(r.value),
          script: i.pkScript
        },
        sequence: s,
        tapLeafScript: [r.intentTapLeafScript],
        unknown: o
      });
    }
    return n;
  }
}
no.MIN_FEE_RATE = 1;
function Z$(e) {
  let t;
  try {
    const n = e[1], r = n.subarray(0, n.length - 1);
    try {
      const i = we.decode(r).params;
      t = to.encode(i.timelock.type === "blocks" ? { blocks: Number(i.timelock.value) } : { seconds: Number(i.timelock.value) });
    } catch {
      const i = Gi.decode(r).params;
      t = Number(i.absoluteTimelock);
    }
  } catch {
  }
  return t;
}
function X$(e) {
  try {
    return Zr.decode(e), !0;
  } catch {
    return !1;
  }
}
function Q$(e, t) {
  const n = [...e].sort((o, a) => {
    const c = o.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER, u = a.virtualStatus.batchExpiry || Number.MAX_SAFE_INTEGER;
    return c !== u ? c - u : a.value - o.value;
  }), r = [];
  let i = 0;
  for (const o of n)
    if (r.push(o), i += o.value, i >= t)
      break;
  if (i === t)
    return { inputs: r, changeAmount: 0n };
  if (i < t)
    throw new Error("Insufficient funds");
  const s = BigInt(i - t);
  return {
    inputs: r,
    changeAmount: s
  };
}
function ll() {
  const e = crypto.getRandomValues(new Uint8Array(16));
  return _.encode(e);
}
var qg;
(function(e) {
  e.walletInitialized = (w) => ({
    type: "WALLET_INITIALIZED",
    success: !0,
    id: w
  });
  function t(w, U) {
    return {
      type: "ERROR",
      success: !1,
      message: U,
      id: w
    };
  }
  e.error = t;
  function n(w, U) {
    return {
      type: "SETTLE_EVENT",
      success: !0,
      event: U,
      id: w
    };
  }
  e.settleEvent = n;
  function r(w, U) {
    return {
      type: "SETTLE_SUCCESS",
      success: !0,
      txid: U,
      id: w
    };
  }
  e.settleSuccess = r;
  function i(w) {
    return w.type === "SETTLE_SUCCESS" && w.success;
  }
  e.isSettleSuccess = i;
  function s(w) {
    return w.type === "ADDRESS" && w.success === !0;
  }
  e.isAddress = s;
  function o(w) {
    return w.type === "BOARDING_ADDRESS" && w.success === !0;
  }
  e.isBoardingAddress = o;
  function a(w, U) {
    return {
      type: "ADDRESS",
      success: !0,
      address: U,
      id: w
    };
  }
  e.address = a;
  function c(w, U) {
    return {
      type: "BOARDING_ADDRESS",
      success: !0,
      address: U,
      id: w
    };
  }
  e.boardingAddress = c;
  function u(w) {
    return w.type === "BALANCE" && w.success === !0;
  }
  e.isBalance = u;
  function l(w, U) {
    return {
      type: "BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.balance = l;
  function f(w) {
    return w.type === "VTXOS" && w.success === !0;
  }
  e.isVtxos = f;
  function h(w, U) {
    return {
      type: "VTXOS",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.vtxos = h;
  function p(w) {
    return w.type === "VIRTUAL_COINS" && w.success === !0;
  }
  e.isVirtualCoins = p;
  function y(w, U) {
    return {
      type: "VIRTUAL_COINS",
      success: !0,
      virtualCoins: U,
      id: w
    };
  }
  e.virtualCoins = y;
  function d(w) {
    return w.type === "BOARDING_UTXOS" && w.success === !0;
  }
  e.isBoardingUtxos = d;
  function g(w, U) {
    return {
      type: "BOARDING_UTXOS",
      success: !0,
      boardingUtxos: U,
      id: w
    };
  }
  e.boardingUtxos = g;
  function m(w) {
    return w.type === "SEND_BITCOIN_SUCCESS" && w.success === !0;
  }
  e.isSendBitcoinSuccess = m;
  function v(w, U) {
    return {
      type: "SEND_BITCOIN_SUCCESS",
      success: !0,
      txid: U,
      id: w
    };
  }
  e.sendBitcoinSuccess = v;
  function k(w) {
    return w.type === "TRANSACTION_HISTORY" && w.success === !0;
  }
  e.isTransactionHistory = k;
  function C(w, U) {
    return {
      type: "TRANSACTION_HISTORY",
      success: !0,
      transactions: U,
      id: w
    };
  }
  e.transactionHistory = C;
  function L(w) {
    return w.type === "WALLET_STATUS" && w.success === !0;
  }
  e.isWalletStatus = L;
  function G(w, U, wu) {
    return {
      type: "WALLET_STATUS",
      success: !0,
      status: {
        walletInitialized: U,
        xOnlyPublicKey: wu
      },
      id: w
    };
  }
  e.walletStatus = G;
  function b(w) {
    return w.type === "CLEAR_RESPONSE";
  }
  e.isClearResponse = b;
  function Y(w, U) {
    return {
      type: "CLEAR_RESPONSE",
      success: U,
      id: w
    };
  }
  e.clearResponse = Y;
  function D(w) {
    return w.type === "WALLET_RELOADED";
  }
  e.isWalletReloaded = D;
  function S(w, U) {
    return {
      type: "WALLET_RELOADED",
      success: U,
      id: w
    };
  }
  e.walletReloaded = S;
  function rt(w) {
    return w.type === "VTXO_UPDATE";
  }
  e.isVtxoUpdate = rt;
  function M(w, U) {
    return {
      type: "VTXO_UPDATE",
      id: ll(),
      // spontaneous update, not tied to a request
      success: !0,
      spentVtxos: U,
      newVtxos: w
    };
  }
  e.vtxoUpdate = M;
  function x(w) {
    return w.type === "UTXO_UPDATE";
  }
  e.isUtxoUpdate = x;
  function T(w) {
    return {
      type: "UTXO_UPDATE",
      id: ll(),
      // spontaneous update, not tied to a request
      success: !0,
      coins: w
    };
  }
  e.utxoUpdate = T;
  function E(w) {
    return w.type === "CONTRACTS" && w.success === !0;
  }
  e.isContracts = E;
  function A(w, U) {
    return {
      type: "CONTRACTS",
      success: !0,
      contracts: U,
      id: w
    };
  }
  e.contracts = A;
  function $(w) {
    return w.type === "CONTRACTS_WITH_VTXOS" && w.success === !0;
  }
  e.isContractsWithVtxos = $;
  function B(w, U) {
    return {
      type: "CONTRACTS_WITH_VTXOS",
      success: !0,
      contracts: U,
      id: w
    };
  }
  e.contractsWithVtxos = B;
  function O(w) {
    return w.type === "CONTRACT" && w.success === !0;
  }
  e.isContract = O;
  function I(w, U) {
    return {
      type: "CONTRACT",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contract = I;
  function N(w) {
    return w.type === "CONTRACT_CREATED" && w.success === !0;
  }
  e.isContractCreated = N;
  function R(w, U) {
    return {
      type: "CONTRACT_CREATED",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contractCreated = R;
  function q(w) {
    return w.type === "CONTRACT_STATE_UPDATED" && w.success === !0;
  }
  e.isContractStateUpdated = q;
  function K(w) {
    return {
      type: "CONTRACT_STATE_UPDATED",
      success: !0,
      id: w
    };
  }
  e.contractStateUpdated = K;
  function V(w) {
    return w.type === "CONTRACT_UPDATED" && w.success === !0;
  }
  e.isContractUpdated = V;
  function z(w, U) {
    return {
      type: "CONTRACT_UPDATED",
      success: !0,
      contract: U,
      id: w
    };
  }
  e.contractUpdated = z;
  function X(w) {
    return w.type === "CONTRACT_DATA_UPDATED" && w.success === !0;
  }
  e.isContractDataUpdated = X;
  function st(w) {
    return {
      type: "CONTRACT_DATA_UPDATED",
      success: !0,
      id: w
    };
  }
  e.contractDataUpdated = st;
  function j(w) {
    return w.type === "CONTRACT_DELETED" && w.success === !0;
  }
  e.isContractDeleted = j;
  function Q(w) {
    return {
      type: "CONTRACT_DELETED",
      success: !0,
      id: w
    };
  }
  e.contractDeleted = Q;
  function Pt(w) {
    return w.type === "CONTRACT_VTXOS" && w.success === !0;
  }
  e.isContractVtxos = Pt;
  function be(w, U) {
    return {
      type: "CONTRACT_VTXOS",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.contractVtxos = be;
  function Ee(w) {
    return w.type === "CONTRACT_VTXOS_FOR_CONTRACT" && w.success === !0;
  }
  e.isContractVtxosForContract = Ee;
  function jc(w, U) {
    return {
      type: "CONTRACT_VTXOS_FOR_CONTRACT",
      success: !0,
      vtxos: U,
      id: w
    };
  }
  e.contractVtxosForContract = jc;
  function Gc(w) {
    return w.type === "CONTRACT_BALANCE" && w.success === !0;
  }
  e.isContractBalance = Gc;
  function qc(w, U) {
    return {
      type: "CONTRACT_BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.contractBalance = qc;
  function Yc(w) {
    return w.type === "CONTRACT_BALANCES" && w.success === !0;
  }
  e.isContractBalances = Yc;
  function Zc(w, U) {
    return {
      type: "CONTRACT_BALANCES",
      success: !0,
      balances: U,
      id: w
    };
  }
  e.contractBalances = Zc;
  function Xc(w) {
    return w.type === "TOTAL_CONTRACT_BALANCE" && w.success === !0;
  }
  e.isTotalContractBalance = Xc;
  function Qc(w, U) {
    return {
      type: "TOTAL_CONTRACT_BALANCE",
      success: !0,
      balance: U,
      id: w
    };
  }
  e.totalContractBalance = Qc;
  function Jc(w) {
    return w.type === "SPENDABLE_PATHS" && w.success === !0;
  }
  e.isSpendablePaths = Jc;
  function tu(w, U) {
    return {
      type: "SPENDABLE_PATHS",
      success: !0,
      paths: U,
      id: w
    };
  }
  e.spendablePaths = tu;
  function eu(w) {
    return w.type === "ALL_SPENDING_PATHS" && w.success === !0;
  }
  e.isAllSpendingPaths = eu;
  function nu(w, U) {
    return {
      type: "ALL_SPENDING_PATHS",
      success: !0,
      paths: U,
      id: w
    };
  }
  e.allSpendingPaths = nu;
  function ru(w) {
    return w.type === "CAN_SPEND" && w.success === !0;
  }
  e.isCanSpend = ru;
  function iu(w, U) {
    return {
      type: "CAN_SPEND",
      success: !0,
      canSpend: U,
      id: w
    };
  }
  e.canSpend = iu;
  function su(w) {
    return w.type === "SPENDING_PATH" && w.success === !0;
  }
  e.isSpendingPath = su;
  function ou(w, U) {
    return {
      type: "SPENDING_PATH",
      success: !0,
      path: U,
      id: w
    };
  }
  e.spendingPath = ou;
  function au(w) {
    return w.type === "CONTRACT_WATCHING" && w.success === !0;
  }
  e.isContractWatching = au;
  function cu(w, U) {
    return {
      type: "CONTRACT_WATCHING",
      success: !0,
      isWatching: U,
      id: w
    };
  }
  e.contractWatching = cu;
  function uu(w) {
    return w.type === "CONTRACT_EVENTS_SUBSCRIBED" && w.success === !0;
  }
  e.isContractEventsSubscribed = uu;
  function lu(w) {
    return {
      type: "CONTRACT_EVENTS_SUBSCRIBED",
      success: !0,
      id: w
    };
  }
  e.contractEventsSubscribed = lu;
  function fu(w) {
    return w.type === "CONTRACT_EVENTS_UNSUBSCRIBED" && w.success === !0;
  }
  e.isContractEventsUnsubscribed = fu;
  function du(w) {
    return {
      type: "CONTRACT_EVENTS_UNSUBSCRIBED",
      success: !0,
      id: w
    };
  }
  e.contractEventsUnsubscribed = du;
  function hu(w) {
    return w.type === "CONTRACT_MANAGER_DISPOSED" && w.success === !0;
  }
  e.isContractManagerDisposed = hu;
  function pu(w) {
    return {
      type: "CONTRACT_MANAGER_DISPOSED",
      success: !0,
      id: w
    };
  }
  e.contractManagerDisposed = pu;
  function gu(w) {
    return w.type === "CONTRACT_EVENT" && w.success === !0;
  }
  e.isContractEvent = gu;
  function yu(w) {
    return {
      type: "CONTRACT_EVENT",
      id: ll(),
      // spontaneous event, not tied to a request
      success: !0,
      event: w
    };
  }
  e.contractEvent = yu;
})(qg || (qg = {}));
const fl = (e) => e < 253 ? 1 : e <= 65535 ? 3 : e <= 4294967295 ? 5 : 9;
class ht {
  constructor(t, n, r, i, s, o) {
    this.hasWitness = t, this.inputCount = n, this.outputCount = r, this.inputSize = i, this.inputWitnessSize = s, this.outputSize = o;
  }
  static create() {
    return new ht(!1, 0, 0, 0, 0, 0);
  }
  addP2AInput() {
    return this.inputCount++, this.inputSize += ht.INPUT_SIZE, this;
  }
  addKeySpendInput(t = !0) {
    return this.inputCount++, this.inputWitnessSize += 65 + (t ? 0 : 1), this.inputSize += ht.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2PKHInput() {
    return this.inputCount++, this.inputWitnessSize++, this.inputSize += ht.INPUT_SIZE + ht.P2PKH_SCRIPT_SIG_SIZE, this;
  }
  addTapscriptInput(t, n, r) {
    const i = 1 + ht.BASE_CONTROL_BLOCK_SIZE + 1 + n + 1 + r;
    return this.inputCount++, this.inputWitnessSize += t + 1 + i, this.inputSize += ht.INPUT_SIZE, this.hasWitness = !0, this;
  }
  addP2WPKHOutput() {
    return this.outputCount++, this.outputSize += ht.OUTPUT_SIZE + ht.P2WPKH_OUTPUT_SIZE, this;
  }
  addP2TROutput() {
    return this.outputCount++, this.outputSize += ht.OUTPUT_SIZE + ht.P2TR_OUTPUT_SIZE, this;
  }
  /**
   * Adds an output given a raw script.
   * Cost = 8 bytes (amount) + varint(scriptLen) + scriptLen
   */
  addOutputScript(t) {
    return this.outputCount++, this.outputSize += 8 + fl(t.length) + t.length, this;
  }
  /**
   * Adds an output by decoding the address to get the exact script size.
   */
  addOutputAddress(t, n) {
    const r = Sr(n).decode(t), i = At.encode(r);
    return this.addOutputScript(i);
  }
  vsize() {
    const t = fl(this.inputCount), n = fl(this.outputCount);
    let i = (ht.BASE_TX_SIZE + t + this.inputSize + n + this.outputSize) * ht.WITNESS_SCALE_FACTOR;
    return this.hasWitness && (i += ht.WITNESS_HEADER_SIZE + this.inputWitnessSize), J$(i);
  }
}
ht.P2PKH_SCRIPT_SIG_SIZE = 108;
ht.INPUT_SIZE = 41;
ht.BASE_CONTROL_BLOCK_SIZE = 33;
ht.OUTPUT_SIZE = 9;
ht.P2WPKH_OUTPUT_SIZE = 22;
ht.BASE_TX_SIZE = 10;
ht.WITNESS_HEADER_SIZE = 2;
ht.WITNESS_SCALE_FACTOR = 4;
ht.P2TR_OUTPUT_SIZE = 34;
const J$ = (e) => {
  const t = BigInt(Math.ceil(e / ht.WITNESS_SCALE_FACTOR));
  return {
    value: t,
    fee: (n) => n * t
  };
};
var Yg;
(function(e) {
  function t(S) {
    return typeof S == "object" && S !== null && "type" in S;
  }
  e.isBase = t;
  function n(S) {
    return S.type === "INIT_WALLET" && "arkServerUrl" in S && typeof S.arkServerUrl == "string" && ("arkServerPublicKey" in S ? S.arkServerPublicKey === void 0 || typeof S.arkServerPublicKey == "string" : !0);
  }
  e.isInitWallet = n;
  function r(S) {
    return S.type === "SETTLE";
  }
  e.isSettle = r;
  function i(S) {
    return S.type === "GET_ADDRESS";
  }
  e.isGetAddress = i;
  function s(S) {
    return S.type === "GET_BOARDING_ADDRESS";
  }
  e.isGetBoardingAddress = s;
  function o(S) {
    return S.type === "GET_BALANCE";
  }
  e.isGetBalance = o;
  function a(S) {
    return S.type === "GET_VTXOS";
  }
  e.isGetVtxos = a;
  function c(S) {
    return S.type === "GET_VIRTUAL_COINS";
  }
  e.isGetVirtualCoins = c;
  function u(S) {
    return S.type === "GET_BOARDING_UTXOS";
  }
  e.isGetBoardingUtxos = u;
  function l(S) {
    return S.type === "SEND_BITCOIN" && "params" in S && S.params !== null && typeof S.params == "object" && "address" in S.params && typeof S.params.address == "string" && "amount" in S.params && typeof S.params.amount == "number";
  }
  e.isSendBitcoin = l;
  function f(S) {
    return S.type === "GET_TRANSACTION_HISTORY";
  }
  e.isGetTransactionHistory = f;
  function h(S) {
    return S.type === "GET_STATUS";
  }
  e.isGetStatus = h;
  function p(S) {
    return S.type === "CLEAR";
  }
  e.isClear = p;
  function y(S) {
    return S.type === "RELOAD_WALLET";
  }
  e.isReloadWallet = y;
  function d(S) {
    return S.type === "GET_CONTRACTS";
  }
  e.isGetContracts = d;
  function g(S) {
    return S.type === "GET_CONTRACTS_WITH_VTXOS";
  }
  e.isGetContractsVtxos = g;
  function m(S) {
    return S.type === "CREATE_CONTRACT" && "params" in S && typeof S.params == "object" && S.params !== null && "type" in S.params && "params" in S.params && "script" in S.params && "address" in S.params;
  }
  e.isCreateContract = m;
  function v(S) {
    return S.type === "UPDATE_CONTRACT" && "contractScript" in S && typeof S.contractScript == "string" && "updates" in S && typeof S.updates == "object";
  }
  e.isUpdateContract = v;
  function k(S) {
    return S.type === "UPDATE_CONTRACT_STATE" && "contractScript" in S && typeof S.contractScript == "string" && "state" in S && (S.state === "active" || S.state === "inactive");
  }
  e.isUpdateContractState = k;
  function C(S) {
    return S.type === "DELETE_CONTRACT" && "contractScript" in S && typeof S.contractScript == "string";
  }
  e.isDeleteContract = C;
  function L(S) {
    return S.type === "GET_SPENDABLE_PATHS";
  }
  e.isGetSpendablePaths = L;
  function G(S) {
    return S.type === "GET_ALL_SPENDING_PATHS";
  }
  e.isGetAllSpendingPaths = G;
  function b(S) {
    return S.type === "IS_CONTRACT_MANAGER_WATCHING";
  }
  e.isIsContractWatching = b;
  function Y(S) {
    return S.type === "SUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isSubscribeContractEvents = Y;
  function D(S) {
    return S.type === "UNSUBSCRIBE_CONTRACT_EVENTS";
  }
  e.isUnsubscribeContractEvents = D;
})(Yg || (Yg = {}));
var Zg;
(function(e) {
  let t;
  (function(i) {
    i[i.UNROLL = 0] = "UNROLL", i[i.WAIT = 1] = "WAIT", i[i.DONE = 2] = "DONE";
  })(t = e.StepType || (e.StepType = {}));
  class n {
    constructor(s, o, a, c) {
      this.toUnroll = s, this.bumper = o, this.explorer = a, this.indexer = c;
    }
    static async create(s, o, a, c) {
      const { chain: u } = await c.getVtxoChain(s);
      return new n({ ...s, chain: u }, o, a, c);
    }
    /**
     * Get the next step to be executed
     * @returns The next step to be executed + the function to execute it
     */
    async next() {
      let s;
      const o = this.toUnroll.chain;
      for (let u = o.length - 1; u >= 0; u--) {
        const l = o[u];
        if (!(l.type === Ai.COMMITMENT || l.type === Ai.UNSPECIFIED))
          try {
            if (!(await this.explorer.getTxStatus(l.txid)).confirmed)
              return {
                type: t.WAIT,
                txid: l.txid,
                do: nC(this.explorer, l.txid)
              };
          } catch {
            s = l;
            break;
          }
      }
      if (!s)
        return {
          type: t.DONE,
          vtxoTxid: this.toUnroll.txid,
          do: () => Promise.resolve()
        };
      const a = await this.indexer.getVirtualTxs([
        s.txid
      ]);
      if (a.txs.length === 0)
        throw new Error(`Tx ${s.txid} not found`);
      const c = vr.fromPSBT(Kt.decode(a.txs[0]));
      if (s.type === Ai.TREE) {
        const u = c.getInput(0);
        if (!u)
          throw new Error("Input not found");
        const l = u.tapKeySig;
        if (!l)
          throw new Error("Tap key sig not found");
        c.updateInput(0, {
          finalScriptWitness: [l]
        });
      } else
        c.finalize();
      return {
        type: t.UNROLL,
        tx: c,
        do: eC(this.bumper, this.explorer, c)
      };
    }
    /**
     * Iterate over the steps to be executed and execute them
     * @returns An async iterator over the executed steps
     */
    async *[Symbol.asyncIterator]() {
      let s;
      do {
        s !== void 0 && await tC(1e3);
        const o = await this.next();
        await o.do(), yield o, s = o.type;
      } while (s !== t.DONE);
    }
  }
  e.Session = n;
  async function r(i, s, o) {
    const a = await i.onchainProvider.getChainTip();
    let c = await i.getVtxos({ withUnrolled: !0 });
    if (c = c.filter((m) => s.includes(m.txid)), c.length === 0)
      throw new Error("No vtxos to complete unroll");
    const u = [];
    let l = 0n;
    const f = ht.create();
    for (const m of c) {
      if (!m.isUnrolled)
        throw new Error(`Vtxo ${m.txid}:${m.vout} is not fully unrolled, use unroll first`);
      const v = await i.onchainProvider.getTxStatus(m.txid);
      if (!v.confirmed)
        throw new Error(`tx ${m.txid} is not confirmed`);
      const k = rC({ height: v.blockHeight, time: v.blockTime }, a, m);
      if (!k)
        throw new Error(`no available exit path found for vtxo ${m.txid}:${m.vout}`);
      const C = $e.decode(m.tapTree).findLeaf(_.encode(k.script));
      if (!C)
        throw new Error(`spending leaf not found for vtxo ${m.txid}:${m.vout}`);
      l += BigInt(m.value), u.push({
        txid: m.txid,
        index: m.vout,
        tapLeafScript: [C],
        sequence: 4294967294,
        witnessUtxo: {
          amount: BigInt(m.value),
          script: $e.decode(m.tapTree).pkScript
        },
        sighashType: ji.DEFAULT
      }), f.addTapscriptInput(64, C[1].length, pn.encode(C[0]).length);
    }
    const h = new vr({ version: 2 });
    for (const m of u)
      h.addInput(m);
    f.addOutputAddress(o, i.network);
    let p = await i.onchainProvider.getFeeRate();
    (!p || p < no.MIN_FEE_RATE) && (p = no.MIN_FEE_RATE);
    const y = f.vsize().fee(BigInt(p));
    if (y > l)
      throw new Error("fee amount is greater than the total amount");
    const d = l - y;
    if (d < BigInt(_I))
      throw new Error("send amount is less than dust amount");
    h.addOutputAddress(o, d);
    const g = await i.identity.sign(h);
    return g.finalize(), await i.onchainProvider.broadcastTransaction(g.hex), g.id;
  }
  e.completeUnroll = r;
})(Zg || (Zg = {}));
function tC(e) {
  return new Promise((t) => setTimeout(t, e));
}
function eC(e, t, n) {
  return async () => {
    const [r, i] = await e.bumpP2A(n);
    await t.broadcastTransaction(r, i);
  };
}
function nC(e, t) {
  return () => new Promise((n, r) => {
    const i = setInterval(async () => {
      try {
        (await e.getTxStatus(t)).confirmed && (clearInterval(i), n());
      } catch (s) {
        clearInterval(i), r(s);
      }
    }, 5e3);
  });
}
function rC(e, t, n) {
  const r = $e.decode(n.tapTree).exitPaths();
  for (const i of r)
    if (i.params.timelock.type === "blocks") {
      if (t.height >= e.height + Number(i.params.timelock.value))
        return i;
    } else if (t.time >= e.time + Number(i.params.timelock.value))
      return i;
}
const iC = new w1({
  walletRepository: new Wm(),
  contractRepository: new x0()
});
iC.start().catch(console.error);
const S0 = "arkade-cache-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(S0)), self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((t) => Promise.all(
      t.map((n) => {
        if (n !== S0)
          return caches.delete(n);
      })
    ))
  ), self.clients.matchAll({
    includeUncontrolled: !0,
    type: "window"
  }).then((t) => {
    t.forEach((n) => {
      n.postMessage({ type: "RELOAD_PAGE" });
    });
  }), self.clients.claim();
});
