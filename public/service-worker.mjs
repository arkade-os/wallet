const Pe = (e) => {
  if (!e) return !1;
  const n = Math.floor((/* @__PURE__ */ new Date()).getTime() / 1e3), i = 60 * 60 * 24;
  return n + i > e;
};
/*!
 *  decimal.js v10.5.0
 *  An arbitrary-precision Decimal type for JavaScript.
 *  https://github.com/MikeMcl/decimal.js
 *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
 *  MIT Licence
 */
var ue = 9e15, H = 1e9, fe = "0123456789abcdef", z = "2.3025850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053089653777326288461633662222876982198867465436674744042432743651550489343149393914796194044002221051017141748003688084012647080685567743216228355220114804663715659121373450747856947683463616792101806445070648000277502684916746550586856935673420670581136429224554405758925724208241314695689016758940256776311356919292033376587141660230105703089634572075440370847469940168269282808481184289314848524948644871927809676271275775397027668605952496716674183485704422507197965004714951050492214776567636938662976979522110718264549734772662425709429322582798502585509785265383207606726317164309505995087807523710333101197857547331541421808427543863591778117054309827482385045648019095610299291824318237525357709750539565187697510374970888692180205189339507238539205144634197265287286965110862571492198849978748873771345686209167058", x = "3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679821480865132823066470938446095505822317253594081284811174502841027019385211055596446229489549303819644288109756659334461284756482337867831652712019091456485669234603486104543266482133936072602491412737245870066063155881748815209209628292540917153643678925903600113305305488204665213841469519415116094330572703657595919530921861173819326117931051185480744623799627495673518857527248912279381830119491298336733624406566430860213949463952247371907021798609437027705392171762931767523846748184676694051320005681271452635608277857713427577896091736371787214684409012249534301465495853710507922796892589235420199561121290219608640344181598136297747713099605187072113499999983729780499510597317328160963185950244594553469083026425223082533446850352619311881710100031378387528865875332083814206171776691473035982534904287554687311595628638823537875937519577818577805321712268066130019278766111959092164201989380952572010654858632789", ce = {
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
  maxE: ue,
  // 1 to EXP_LIMIT
  // Whether to use cryptographically-secure random number generation, if available.
  crypto: !1
  // true/false
}, me, b, m = !0, ee = "[DecimalError] ", B = ee + "Invalid argument: ", Ne = ee + "Precision limit exceeded", ve = ee + "crypto unavailable", Ee = "[object Decimal]", P = Math.floor, S = Math.pow, Te = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, Le = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, De = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, Me = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, F = 1e7, w = 7, Oe = 9007199254740991, Fe = z.length - 1, le = x.length - 1, d = { toStringTag: Ee };
d.absoluteValue = d.abs = function() {
  var e = new this.constructor(this);
  return e.s < 0 && (e.s = 1), p(e);
};
d.ceil = function() {
  return p(new this.constructor(this), this.e + 1, 2);
};
d.clampedTo = d.clamp = function(e, n) {
  var i, r = this, t = r.constructor;
  if (e = new t(e), n = new t(n), !e.s || !n.s) return new t(NaN);
  if (e.gt(n)) throw Error(B + n);
  return i = r.cmp(e), i < 0 ? e : r.cmp(n) > 0 ? n : new t(r);
};
d.comparedTo = d.cmp = function(e) {
  var n, i, r, t, s = this, o = s.d, u = (e = new s.constructor(e)).d, c = s.s, f = e.s;
  if (!o || !u)
    return !c || !f ? NaN : c !== f ? c : o === u ? 0 : !o ^ c < 0 ? 1 : -1;
  if (!o[0] || !u[0]) return o[0] ? c : u[0] ? -f : 0;
  if (c !== f) return c;
  if (s.e !== e.e) return s.e > e.e ^ c < 0 ? 1 : -1;
  for (r = o.length, t = u.length, n = 0, i = r < t ? r : t; n < i; ++n)
    if (o[n] !== u[n]) return o[n] > u[n] ^ c < 0 ? 1 : -1;
  return r === t ? 0 : r > t ^ c < 0 ? 1 : -1;
};
d.cosine = d.cos = function() {
  var e, n, i = this, r = i.constructor;
  return i.d ? i.d[0] ? (e = r.precision, n = r.rounding, r.precision = e + Math.max(i.e, i.sd()) + w, r.rounding = 1, i = _e(r, Ae(r, i)), r.precision = e, r.rounding = n, p(b == 2 || b == 3 ? i.neg() : i, e, n, !0)) : new r(1) : new r(NaN);
};
d.cubeRoot = d.cbrt = function() {
  var e, n, i, r, t, s, o, u, c, f, l = this, a = l.constructor;
  if (!l.isFinite() || l.isZero()) return new a(l);
  for (m = !1, s = l.s * S(l.s * l, 1 / 3), !s || Math.abs(s) == 1 / 0 ? (i = q(l.d), e = l.e, (s = (e - i.length + 1) % 3) && (i += s == 1 || s == -2 ? "0" : "00"), s = S(i, 1 / 3), e = P((e + 1) / 3) - (e % 3 == (e < 0 ? -1 : 2)), s == 1 / 0 ? i = "5e" + e : (i = s.toExponential(), i = i.slice(0, i.indexOf("e") + 1) + e), r = new a(i), r.s = l.s) : r = new a(s.toString()), o = (e = a.precision) + 3; ; )
    if (u = r, c = u.times(u).times(u), f = c.plus(l), r = M(f.plus(l).times(u), f.plus(c), o + 2, 1), q(u.d).slice(0, o) === (i = q(r.d)).slice(0, o))
      if (i = i.slice(o - 3, o + 1), i == "9999" || !t && i == "4999") {
        if (!t && (p(u, e + 1, 0), u.times(u).times(u).eq(l))) {
          r = u;
          break;
        }
        o += 4, t = 1;
      } else {
        (!+i || !+i.slice(1) && i.charAt(0) == "5") && (p(r, e + 1, 1), n = !r.times(r).times(r).eq(l));
        break;
      }
  return m = !0, p(r, e, a.rounding, n);
};
d.decimalPlaces = d.dp = function() {
  var e, n = this.d, i = NaN;
  if (n) {
    if (e = n.length - 1, i = (e - P(this.e / w)) * w, e = n[e], e) for (; e % 10 == 0; e /= 10) i--;
    i < 0 && (i = 0);
  }
  return i;
};
d.dividedBy = d.div = function(e) {
  return M(this, new this.constructor(e));
};
d.dividedToIntegerBy = d.divToInt = function(e) {
  var n = this, i = n.constructor;
  return p(M(n, new i(e), 0, 1, 1), i.precision, i.rounding);
};
d.equals = d.eq = function(e) {
  return this.cmp(e) === 0;
};
d.floor = function() {
  return p(new this.constructor(this), this.e + 1, 3);
};
d.greaterThan = d.gt = function(e) {
  return this.cmp(e) > 0;
};
d.greaterThanOrEqualTo = d.gte = function(e) {
  var n = this.cmp(e);
  return n == 1 || n === 0;
};
d.hyperbolicCosine = d.cosh = function() {
  var e, n, i, r, t, s = this, o = s.constructor, u = new o(1);
  if (!s.isFinite()) return new o(s.s ? 1 / 0 : NaN);
  if (s.isZero()) return u;
  i = o.precision, r = o.rounding, o.precision = i + Math.max(s.e, s.sd()) + 4, o.rounding = 1, t = s.d.length, t < 32 ? (e = Math.ceil(t / 3), n = (1 / ie(4, e)).toString()) : (e = 16, n = "2.3283064365386962890625e-10"), s = V(o, 1, s.times(n), new o(1), !0);
  for (var c, f = e, l = new o(8); f--; )
    c = s.times(s), s = u.minus(c.times(l.minus(c.times(l))));
  return p(s, o.precision = i, o.rounding = r, !0);
};
d.hyperbolicSine = d.sinh = function() {
  var e, n, i, r, t = this, s = t.constructor;
  if (!t.isFinite() || t.isZero()) return new s(t);
  if (n = s.precision, i = s.rounding, s.precision = n + Math.max(t.e, t.sd()) + 4, s.rounding = 1, r = t.d.length, r < 3)
    t = V(s, 2, t, t, !0);
  else {
    e = 1.4 * Math.sqrt(r), e = e > 16 ? 16 : e | 0, t = t.times(1 / ie(5, e)), t = V(s, 2, t, t, !0);
    for (var o, u = new s(5), c = new s(16), f = new s(20); e--; )
      o = t.times(t), t = t.times(u.plus(o.times(c.times(o).plus(f))));
  }
  return s.precision = n, s.rounding = i, p(t, n, i, !0);
};
d.hyperbolicTangent = d.tanh = function() {
  var e, n, i = this, r = i.constructor;
  return i.isFinite() ? i.isZero() ? new r(i) : (e = r.precision, n = r.rounding, r.precision = e + 7, r.rounding = 1, M(i.sinh(), i.cosh(), r.precision = e, r.rounding = n)) : new r(i.s);
};
d.inverseCosine = d.acos = function() {
  var e = this, n = e.constructor, i = e.abs().cmp(1), r = n.precision, t = n.rounding;
  return i !== -1 ? i === 0 ? e.isNeg() ? _(n, r, t) : new n(0) : new n(NaN) : e.isZero() ? _(n, r + 4, t).times(0.5) : (n.precision = r + 6, n.rounding = 1, e = new n(1).minus(e).div(e.plus(1)).sqrt().atan(), n.precision = r, n.rounding = t, e.times(2));
};
d.inverseHyperbolicCosine = d.acosh = function() {
  var e, n, i = this, r = i.constructor;
  return i.lte(1) ? new r(i.eq(1) ? 0 : NaN) : i.isFinite() ? (e = r.precision, n = r.rounding, r.precision = e + Math.max(Math.abs(i.e), i.sd()) + 4, r.rounding = 1, m = !1, i = i.times(i).minus(1).sqrt().plus(i), m = !0, r.precision = e, r.rounding = n, i.ln()) : new r(i);
};
d.inverseHyperbolicSine = d.asinh = function() {
  var e, n, i = this, r = i.constructor;
  return !i.isFinite() || i.isZero() ? new r(i) : (e = r.precision, n = r.rounding, r.precision = e + 2 * Math.max(Math.abs(i.e), i.sd()) + 6, r.rounding = 1, m = !1, i = i.times(i).plus(1).sqrt().plus(i), m = !0, r.precision = e, r.rounding = n, i.ln());
};
d.inverseHyperbolicTangent = d.atanh = function() {
  var e, n, i, r, t = this, s = t.constructor;
  return t.isFinite() ? t.e >= 0 ? new s(t.abs().eq(1) ? t.s / 0 : t.isZero() ? t : NaN) : (e = s.precision, n = s.rounding, r = t.sd(), Math.max(r, e) < 2 * -t.e - 1 ? p(new s(t), e, n, !0) : (s.precision = i = r - t.e, t = M(t.plus(1), new s(1).minus(t), i + e, 1), s.precision = e + 4, s.rounding = 1, t = t.ln(), s.precision = e, s.rounding = n, t.times(0.5))) : new s(NaN);
};
d.inverseSine = d.asin = function() {
  var e, n, i, r, t = this, s = t.constructor;
  return t.isZero() ? new s(t) : (n = t.abs().cmp(1), i = s.precision, r = s.rounding, n !== -1 ? n === 0 ? (e = _(s, i + 4, r).times(0.5), e.s = t.s, e) : new s(NaN) : (s.precision = i + 6, s.rounding = 1, t = t.div(new s(1).minus(t.times(t)).sqrt().plus(1)).atan(), s.precision = i, s.rounding = r, t.times(2)));
};
d.inverseTangent = d.atan = function() {
  var e, n, i, r, t, s, o, u, c, f = this, l = f.constructor, a = l.precision, h = l.rounding;
  if (f.isFinite()) {
    if (f.isZero())
      return new l(f);
    if (f.abs().eq(1) && a + 4 <= le)
      return o = _(l, a + 4, h).times(0.25), o.s = f.s, o;
  } else {
    if (!f.s) return new l(NaN);
    if (a + 4 <= le)
      return o = _(l, a + 4, h).times(0.5), o.s = f.s, o;
  }
  for (l.precision = u = a + 10, l.rounding = 1, i = Math.min(28, u / w + 2 | 0), e = i; e; --e) f = f.div(f.times(f).plus(1).sqrt().plus(1));
  for (m = !1, n = Math.ceil(u / w), r = 1, c = f.times(f), o = new l(f), t = f; e !== -1; )
    if (t = t.times(c), s = o.minus(t.div(r += 2)), t = t.times(c), o = s.plus(t.div(r += 2)), o.d[n] !== void 0) for (e = n; o.d[e] === s.d[e] && e--; ) ;
  return i && (o = o.times(2 << i - 1)), m = !0, p(o, l.precision = a, l.rounding = h, !0);
};
d.isFinite = function() {
  return !!this.d;
};
d.isInteger = d.isInt = function() {
  return !!this.d && P(this.e / w) > this.d.length - 2;
};
d.isNaN = function() {
  return !this.s;
};
d.isNegative = d.isNeg = function() {
  return this.s < 0;
};
d.isPositive = d.isPos = function() {
  return this.s > 0;
};
d.isZero = function() {
  return !!this.d && this.d[0] === 0;
};
d.lessThan = d.lt = function(e) {
  return this.cmp(e) < 0;
};
d.lessThanOrEqualTo = d.lte = function(e) {
  return this.cmp(e) < 1;
};
d.logarithm = d.log = function(e) {
  var n, i, r, t, s, o, u, c, f = this, l = f.constructor, a = l.precision, h = l.rounding, g = 5;
  if (e == null)
    e = new l(10), n = !0;
  else {
    if (e = new l(e), i = e.d, e.s < 0 || !i || !i[0] || e.eq(1)) return new l(NaN);
    n = e.eq(10);
  }
  if (i = f.d, f.s < 0 || !i || !i[0] || f.eq(1))
    return new l(i && !i[0] ? -1 / 0 : f.s != 1 ? NaN : i ? 0 : 1 / 0);
  if (n)
    if (i.length > 1)
      s = !0;
    else {
      for (t = i[0]; t % 10 === 0; ) t /= 10;
      s = t !== 1;
    }
  if (m = !1, u = a + g, o = $(f, u), r = n ? y(l, u + 10) : $(e, u), c = M(o, r, u, 1), G(c.d, t = a, h))
    do
      if (u += 10, o = $(f, u), r = n ? y(l, u + 10) : $(e, u), c = M(o, r, u, 1), !s) {
        +q(c.d).slice(t + 1, t + 15) + 1 == 1e14 && (c = p(c, a + 1, 0));
        break;
      }
    while (G(c.d, t += 10, h));
  return m = !0, p(c, a, h);
};
d.minus = d.sub = function(e) {
  var n, i, r, t, s, o, u, c, f, l, a, h, g = this, v = g.constructor;
  if (e = new v(e), !g.d || !e.d)
    return !g.s || !e.s ? e = new v(NaN) : g.d ? e.s = -e.s : e = new v(e.d || g.s !== e.s ? g : NaN), e;
  if (g.s != e.s)
    return e.s = -e.s, g.plus(e);
  if (f = g.d, h = e.d, u = v.precision, c = v.rounding, !f[0] || !h[0]) {
    if (h[0]) e.s = -e.s;
    else if (f[0]) e = new v(g);
    else return new v(c === 3 ? -0 : 0);
    return m ? p(e, u, c) : e;
  }
  if (i = P(e.e / w), l = P(g.e / w), f = f.slice(), s = l - i, s) {
    for (a = s < 0, a ? (n = f, s = -s, o = h.length) : (n = h, i = l, o = f.length), r = Math.max(Math.ceil(u / w), o) + 2, s > r && (s = r, n.length = 1), n.reverse(), r = s; r--; ) n.push(0);
    n.reverse();
  } else {
    for (r = f.length, o = h.length, a = r < o, a && (o = r), r = 0; r < o; r++)
      if (f[r] != h[r]) {
        a = f[r] < h[r];
        break;
      }
    s = 0;
  }
  for (a && (n = f, f = h, h = n, e.s = -e.s), o = f.length, r = h.length - o; r > 0; --r) f[o++] = 0;
  for (r = h.length; r > s; ) {
    if (f[--r] < h[r]) {
      for (t = r; t && f[--t] === 0; ) f[t] = F - 1;
      --f[t], f[r] += F;
    }
    f[r] -= h[r];
  }
  for (; f[--o] === 0; ) f.pop();
  for (; f[0] === 0; f.shift()) --i;
  return f[0] ? (e.d = f, e.e = ne(f, i), m ? p(e, u, c) : e) : new v(c === 3 ? -0 : 0);
};
d.modulo = d.mod = function(e) {
  var n, i = this, r = i.constructor;
  return e = new r(e), !i.d || !e.s || e.d && !e.d[0] ? new r(NaN) : !e.d || i.d && !i.d[0] ? p(new r(i), r.precision, r.rounding) : (m = !1, r.modulo == 9 ? (n = M(i, e.abs(), 0, 3, 1), n.s *= e.s) : n = M(i, e, 0, r.modulo, 1), n = n.times(e), m = !0, i.minus(n));
};
d.naturalExponential = d.exp = function() {
  return ae(this);
};
d.naturalLogarithm = d.ln = function() {
  return $(this);
};
d.negated = d.neg = function() {
  var e = new this.constructor(this);
  return e.s = -e.s, p(e);
};
d.plus = d.add = function(e) {
  var n, i, r, t, s, o, u, c, f, l, a = this, h = a.constructor;
  if (e = new h(e), !a.d || !e.d)
    return !a.s || !e.s ? e = new h(NaN) : a.d || (e = new h(e.d || a.s === e.s ? a : NaN)), e;
  if (a.s != e.s)
    return e.s = -e.s, a.minus(e);
  if (f = a.d, l = e.d, u = h.precision, c = h.rounding, !f[0] || !l[0])
    return l[0] || (e = new h(a)), m ? p(e, u, c) : e;
  if (s = P(a.e / w), r = P(e.e / w), f = f.slice(), t = s - r, t) {
    for (t < 0 ? (i = f, t = -t, o = l.length) : (i = l, r = s, o = f.length), s = Math.ceil(u / w), o = s > o ? s + 1 : o + 1, t > o && (t = o, i.length = 1), i.reverse(); t--; ) i.push(0);
    i.reverse();
  }
  for (o = f.length, t = l.length, o - t < 0 && (t = o, i = l, l = f, f = i), n = 0; t; )
    n = (f[--t] = f[t] + l[t] + n) / F | 0, f[t] %= F;
  for (n && (f.unshift(n), ++r), o = f.length; f[--o] == 0; ) f.pop();
  return e.d = f, e.e = ne(f, r), m ? p(e, u, c) : e;
};
d.precision = d.sd = function(e) {
  var n, i = this;
  if (e !== void 0 && e !== !!e && e !== 1 && e !== 0) throw Error(B + e);
  return i.d ? (n = ke(i.d), e && i.e + 1 > n && (n = i.e + 1)) : n = NaN, n;
};
d.round = function() {
  var e = this, n = e.constructor;
  return p(new n(e), e.e + 1, n.rounding);
};
d.sine = d.sin = function() {
  var e, n, i = this, r = i.constructor;
  return i.isFinite() ? i.isZero() ? new r(i) : (e = r.precision, n = r.rounding, r.precision = e + Math.max(i.e, i.sd()) + w, r.rounding = 1, i = Ze(r, Ae(r, i)), r.precision = e, r.rounding = n, p(b > 2 ? i.neg() : i, e, n, !0)) : new r(NaN);
};
d.squareRoot = d.sqrt = function() {
  var e, n, i, r, t, s, o = this, u = o.d, c = o.e, f = o.s, l = o.constructor;
  if (f !== 1 || !u || !u[0])
    return new l(!f || f < 0 && (!u || u[0]) ? NaN : u ? o : 1 / 0);
  for (m = !1, f = Math.sqrt(+o), f == 0 || f == 1 / 0 ? (n = q(u), (n.length + c) % 2 == 0 && (n += "0"), f = Math.sqrt(n), c = P((c + 1) / 2) - (c < 0 || c % 2), f == 1 / 0 ? n = "5e" + c : (n = f.toExponential(), n = n.slice(0, n.indexOf("e") + 1) + c), r = new l(n)) : r = new l(f.toString()), i = (c = l.precision) + 3; ; )
    if (s = r, r = s.plus(M(o, s, i + 2, 1)).times(0.5), q(s.d).slice(0, i) === (n = q(r.d)).slice(0, i))
      if (n = n.slice(i - 3, i + 1), n == "9999" || !t && n == "4999") {
        if (!t && (p(s, c + 1, 0), s.times(s).eq(o))) {
          r = s;
          break;
        }
        i += 4, t = 1;
      } else {
        (!+n || !+n.slice(1) && n.charAt(0) == "5") && (p(r, c + 1, 1), e = !r.times(r).eq(o));
        break;
      }
  return m = !0, p(r, c, l.rounding, e);
};
d.tangent = d.tan = function() {
  var e, n, i = this, r = i.constructor;
  return i.isFinite() ? i.isZero() ? new r(i) : (e = r.precision, n = r.rounding, r.precision = e + 10, r.rounding = 1, i = i.sin(), i.s = 1, i = M(i, new r(1).minus(i.times(i)).sqrt(), e + 10, 0), r.precision = e, r.rounding = n, p(b == 2 || b == 4 ? i.neg() : i, e, n, !0)) : new r(NaN);
};
d.times = d.mul = function(e) {
  var n, i, r, t, s, o, u, c, f, l = this, a = l.constructor, h = l.d, g = (e = new a(e)).d;
  if (e.s *= l.s, !h || !h[0] || !g || !g[0])
    return new a(!e.s || h && !h[0] && !g || g && !g[0] && !h ? NaN : !h || !g ? e.s / 0 : e.s * 0);
  for (i = P(l.e / w) + P(e.e / w), c = h.length, f = g.length, c < f && (s = h, h = g, g = s, o = c, c = f, f = o), s = [], o = c + f, r = o; r--; ) s.push(0);
  for (r = f; --r >= 0; ) {
    for (n = 0, t = c + r; t > r; )
      u = s[t] + g[r] * h[t - r - 1] + n, s[t--] = u % F | 0, n = u / F | 0;
    s[t] = (s[t] + n) % F | 0;
  }
  for (; !s[--o]; ) s.pop();
  return n ? ++i : s.shift(), e.d = s, e.e = ne(s, i), m ? p(e, a.precision, a.rounding) : e;
};
d.toBinary = function(e, n) {
  return he(this, 2, e, n);
};
d.toDecimalPlaces = d.toDP = function(e, n) {
  var i = this, r = i.constructor;
  return i = new r(i), e === void 0 ? i : (L(e, 0, H), n === void 0 ? n = r.rounding : L(n, 0, 8), p(i, e + i.e + 1, n));
};
d.toExponential = function(e, n) {
  var i, r = this, t = r.constructor;
  return e === void 0 ? i = R(r, !0) : (L(e, 0, H), n === void 0 ? n = t.rounding : L(n, 0, 8), r = p(new t(r), e + 1, n), i = R(r, !0, e + 1)), r.isNeg() && !r.isZero() ? "-" + i : i;
};
d.toFixed = function(e, n) {
  var i, r, t = this, s = t.constructor;
  return e === void 0 ? i = R(t) : (L(e, 0, H), n === void 0 ? n = s.rounding : L(n, 0, 8), r = p(new s(t), e + t.e + 1, n), i = R(r, !1, e + r.e + 1)), t.isNeg() && !t.isZero() ? "-" + i : i;
};
d.toFraction = function(e) {
  var n, i, r, t, s, o, u, c, f, l, a, h, g = this, v = g.d, N = g.constructor;
  if (!v) return new N(g);
  if (f = i = new N(1), r = c = new N(0), n = new N(r), s = n.e = ke(v) - g.e - 1, o = s % w, n.d[0] = S(10, o < 0 ? w + o : o), e == null)
    e = s > 0 ? n : f;
  else {
    if (u = new N(e), !u.isInt() || u.lt(f)) throw Error(B + u);
    e = u.gt(n) ? s > 0 ? n : f : u;
  }
  for (m = !1, u = new N(q(v)), l = N.precision, N.precision = s = v.length * w * 2; a = M(u, n, 0, 1, 1), t = i.plus(a.times(r)), t.cmp(e) != 1; )
    i = r, r = t, t = f, f = c.plus(a.times(t)), c = t, t = n, n = u.minus(a.times(t)), u = t;
  return t = M(e.minus(i), r, 0, 1, 1), c = c.plus(t.times(f)), i = i.plus(t.times(r)), c.s = f.s = g.s, h = M(f, r, s, 1).minus(g).abs().cmp(M(c, i, s, 1).minus(g).abs()) < 1 ? [f, r] : [c, i], N.precision = l, m = !0, h;
};
d.toHexadecimal = d.toHex = function(e, n) {
  return he(this, 16, e, n);
};
d.toNearest = function(e, n) {
  var i = this, r = i.constructor;
  if (i = new r(i), e == null) {
    if (!i.d) return i;
    e = new r(1), n = r.rounding;
  } else {
    if (e = new r(e), n === void 0 ? n = r.rounding : L(n, 0, 8), !i.d) return e.s ? i : e;
    if (!e.d)
      return e.s && (e.s = i.s), e;
  }
  return e.d[0] ? (m = !1, i = M(i, e, 0, n, 1).times(e), m = !0, p(i)) : (e.s = i.s, i = e), i;
};
d.toNumber = function() {
  return +this;
};
d.toOctal = function(e, n) {
  return he(this, 8, e, n);
};
d.toPower = d.pow = function(e) {
  var n, i, r, t, s, o, u = this, c = u.constructor, f = +(e = new c(e));
  if (!u.d || !e.d || !u.d[0] || !e.d[0]) return new c(S(+u, f));
  if (u = new c(u), u.eq(1)) return u;
  if (r = c.precision, s = c.rounding, e.eq(1)) return p(u, r, s);
  if (n = P(e.e / w), n >= e.d.length - 1 && (i = f < 0 ? -f : f) <= Oe)
    return t = Ce(c, u, i, r), e.s < 0 ? new c(1).div(t) : p(t, r, s);
  if (o = u.s, o < 0) {
    if (n < e.d.length - 1) return new c(NaN);
    if ((e.d[n] & 1) == 0 && (o = 1), u.e == 0 && u.d[0] == 1 && u.d.length == 1)
      return u.s = o, u;
  }
  return i = S(+u, f), n = i == 0 || !isFinite(i) ? P(f * (Math.log("0." + q(u.d)) / Math.LN10 + u.e + 1)) : new c(i + "").e, n > c.maxE + 1 || n < c.minE - 1 ? new c(n > 0 ? o / 0 : 0) : (m = !1, c.rounding = u.s = 1, i = Math.min(12, (n + "").length), t = ae(e.times($(u, r + i)), r), t.d && (t = p(t, r + 5, 1), G(t.d, r, s) && (n = r + 10, t = p(ae(e.times($(u, n + i)), n), n + 5, 1), +q(t.d).slice(r + 1, r + 15) + 1 == 1e14 && (t = p(t, r + 1, 0)))), t.s = o, m = !0, c.rounding = s, p(t, r, s));
};
d.toPrecision = function(e, n) {
  var i, r = this, t = r.constructor;
  return e === void 0 ? i = R(r, r.e <= t.toExpNeg || r.e >= t.toExpPos) : (L(e, 1, H), n === void 0 ? n = t.rounding : L(n, 0, 8), r = p(new t(r), e, n), i = R(r, e <= r.e || r.e <= t.toExpNeg, e)), r.isNeg() && !r.isZero() ? "-" + i : i;
};
d.toSignificantDigits = d.toSD = function(e, n) {
  var i = this, r = i.constructor;
  return e === void 0 ? (e = r.precision, n = r.rounding) : (L(e, 1, H), n === void 0 ? n = r.rounding : L(n, 0, 8)), p(new r(i), e, n);
};
d.toString = function() {
  var e = this, n = e.constructor, i = R(e, e.e <= n.toExpNeg || e.e >= n.toExpPos);
  return e.isNeg() && !e.isZero() ? "-" + i : i;
};
d.truncated = d.trunc = function() {
  return p(new this.constructor(this), this.e + 1, 1);
};
d.valueOf = d.toJSON = function() {
  var e = this, n = e.constructor, i = R(e, e.e <= n.toExpNeg || e.e >= n.toExpPos);
  return e.isNeg() ? "-" + i : i;
};
function q(e) {
  var n, i, r, t = e.length - 1, s = "", o = e[0];
  if (t > 0) {
    for (s += o, n = 1; n < t; n++)
      r = e[n] + "", i = w - r.length, i && (s += U(i)), s += r;
    o = e[n], r = o + "", i = w - r.length, i && (s += U(i));
  } else if (o === 0)
    return "0";
  for (; o % 10 === 0; ) o /= 10;
  return s + o;
}
function L(e, n, i) {
  if (e !== ~~e || e < n || e > i)
    throw Error(B + e);
}
function G(e, n, i, r) {
  var t, s, o, u;
  for (s = e[0]; s >= 10; s /= 10) --n;
  return --n < 0 ? (n += w, t = 0) : (t = Math.ceil((n + 1) / w), n %= w), s = S(10, w - n), u = e[t] % s | 0, r == null ? n < 3 ? (n == 0 ? u = u / 100 | 0 : n == 1 && (u = u / 10 | 0), o = i < 4 && u == 99999 || i > 3 && u == 49999 || u == 5e4 || u == 0) : o = (i < 4 && u + 1 == s || i > 3 && u + 1 == s / 2) && (e[t + 1] / s / 100 | 0) == S(10, n - 2) - 1 || (u == s / 2 || u == 0) && (e[t + 1] / s / 100 | 0) == 0 : n < 4 ? (n == 0 ? u = u / 1e3 | 0 : n == 1 ? u = u / 100 | 0 : n == 2 && (u = u / 10 | 0), o = (r || i < 4) && u == 9999 || !r && i > 3 && u == 4999) : o = ((r || i < 4) && u + 1 == s || !r && i > 3 && u + 1 == s / 2) && (e[t + 1] / s / 1e3 | 0) == S(10, n - 3) - 1, o;
}
function Q(e, n, i) {
  for (var r, t = [0], s, o = 0, u = e.length; o < u; ) {
    for (s = t.length; s--; ) t[s] *= n;
    for (t[0] += fe.indexOf(e.charAt(o++)), r = 0; r < t.length; r++)
      t[r] > i - 1 && (t[r + 1] === void 0 && (t[r + 1] = 0), t[r + 1] += t[r] / i | 0, t[r] %= i);
  }
  return t.reverse();
}
function _e(e, n) {
  var i, r, t;
  if (n.isZero()) return n;
  r = n.d.length, r < 32 ? (i = Math.ceil(r / 3), t = (1 / ie(4, i)).toString()) : (i = 16, t = "2.3283064365386962890625e-10"), e.precision += i, n = V(e, 1, n.times(t), new e(1));
  for (var s = i; s--; ) {
    var o = n.times(n);
    n = o.times(o).minus(o).times(8).plus(1);
  }
  return e.precision -= i, n;
}
var M = /* @__PURE__ */ function() {
  function e(r, t, s) {
    var o, u = 0, c = r.length;
    for (r = r.slice(); c--; )
      o = r[c] * t + u, r[c] = o % s | 0, u = o / s | 0;
    return u && r.unshift(u), r;
  }
  function n(r, t, s, o) {
    var u, c;
    if (s != o)
      c = s > o ? 1 : -1;
    else
      for (u = c = 0; u < s; u++)
        if (r[u] != t[u]) {
          c = r[u] > t[u] ? 1 : -1;
          break;
        }
    return c;
  }
  function i(r, t, s, o) {
    for (var u = 0; s--; )
      r[s] -= u, u = r[s] < t[s] ? 1 : 0, r[s] = u * o + r[s] - t[s];
    for (; !r[0] && r.length > 1; ) r.shift();
  }
  return function(r, t, s, o, u, c) {
    var f, l, a, h, g, v, N, T, C, D, E, A, K, Z, te, X, W, se, O, j, J = r.constructor, oe = r.s == t.s ? 1 : -1, I = r.d, k = t.d;
    if (!I || !I[0] || !k || !k[0])
      return new J(
        // Return NaN if either NaN, or both Infinity or 0.
        !r.s || !t.s || (I ? k && I[0] == k[0] : !k) ? NaN : (
          // Return ±0 if x is 0 or y is ±Infinity, or return ±Infinity as y is 0.
          I && I[0] == 0 || !k ? oe * 0 : oe / 0
        )
      );
    for (c ? (g = 1, l = r.e - t.e) : (c = F, g = w, l = P(r.e / g) - P(t.e / g)), O = k.length, W = I.length, C = new J(oe), D = C.d = [], a = 0; k[a] == (I[a] || 0); a++) ;
    if (k[a] > (I[a] || 0) && l--, s == null ? (Z = s = J.precision, o = J.rounding) : u ? Z = s + (r.e - t.e) + 1 : Z = s, Z < 0)
      D.push(1), v = !0;
    else {
      if (Z = Z / g + 2 | 0, a = 0, O == 1) {
        for (h = 0, k = k[0], Z++; (a < W || h) && Z--; a++)
          te = h * c + (I[a] || 0), D[a] = te / k | 0, h = te % k | 0;
        v = h || a < W;
      } else {
        for (h = c / (k[0] + 1) | 0, h > 1 && (k = e(k, h, c), I = e(I, h, c), O = k.length, W = I.length), X = O, E = I.slice(0, O), A = E.length; A < O; ) E[A++] = 0;
        j = k.slice(), j.unshift(0), se = k[0], k[1] >= c / 2 && ++se;
        do
          h = 0, f = n(k, E, O, A), f < 0 ? (K = E[0], O != A && (K = K * c + (E[1] || 0)), h = K / se | 0, h > 1 ? (h >= c && (h = c - 1), N = e(k, h, c), T = N.length, A = E.length, f = n(N, E, T, A), f == 1 && (h--, i(N, O < T ? j : k, T, c))) : (h == 0 && (f = h = 1), N = k.slice()), T = N.length, T < A && N.unshift(0), i(E, N, A, c), f == -1 && (A = E.length, f = n(k, E, O, A), f < 1 && (h++, i(E, O < A ? j : k, A, c))), A = E.length) : f === 0 && (h++, E = [0]), D[a++] = h, f && E[0] ? E[A++] = I[X] || 0 : (E = [I[X]], A = 1);
        while ((X++ < W || E[0] !== void 0) && Z--);
        v = E[0] !== void 0;
      }
      D[0] || D.shift();
    }
    if (g == 1)
      C.e = l, me = v;
    else {
      for (a = 1, h = D[0]; h >= 10; h /= 10) a++;
      C.e = a + l * g - 1, p(C, u ? s + C.e + 1 : s, o, v);
    }
    return C;
  };
}();
function p(e, n, i, r) {
  var t, s, o, u, c, f, l, a, h, g = e.constructor;
  e: if (n != null) {
    if (a = e.d, !a) return e;
    for (t = 1, u = a[0]; u >= 10; u /= 10) t++;
    if (s = n - t, s < 0)
      s += w, o = n, l = a[h = 0], c = l / S(10, t - o - 1) % 10 | 0;
    else if (h = Math.ceil((s + 1) / w), u = a.length, h >= u)
      if (r) {
        for (; u++ <= h; ) a.push(0);
        l = c = 0, t = 1, s %= w, o = s - w + 1;
      } else
        break e;
    else {
      for (l = u = a[h], t = 1; u >= 10; u /= 10) t++;
      s %= w, o = s - w + t, c = o < 0 ? 0 : l / S(10, t - o - 1) % 10 | 0;
    }
    if (r = r || n < 0 || a[h + 1] !== void 0 || (o < 0 ? l : l % S(10, t - o - 1)), f = i < 4 ? (c || r) && (i == 0 || i == (e.s < 0 ? 3 : 2)) : c > 5 || c == 5 && (i == 4 || r || i == 6 && // Check whether the digit to the left of the rounding digit is odd.
    (s > 0 ? o > 0 ? l / S(10, t - o) : 0 : a[h - 1]) % 10 & 1 || i == (e.s < 0 ? 8 : 7)), n < 1 || !a[0])
      return a.length = 0, f ? (n -= e.e + 1, a[0] = S(10, (w - n % w) % w), e.e = -n || 0) : a[0] = e.e = 0, e;
    if (s == 0 ? (a.length = h, u = 1, h--) : (a.length = h + 1, u = S(10, w - s), a[h] = o > 0 ? (l / S(10, t - o) % S(10, o) | 0) * u : 0), f)
      for (; ; )
        if (h == 0) {
          for (s = 1, o = a[0]; o >= 10; o /= 10) s++;
          for (o = a[0] += u, u = 1; o >= 10; o /= 10) u++;
          s != u && (e.e++, a[0] == F && (a[0] = 1));
          break;
        } else {
          if (a[h] += u, a[h] != F) break;
          a[h--] = 0, u = 1;
        }
    for (s = a.length; a[--s] === 0; ) a.pop();
  }
  return m && (e.e > g.maxE ? (e.d = null, e.e = NaN) : e.e < g.minE && (e.e = 0, e.d = [0])), e;
}
function R(e, n, i) {
  if (!e.isFinite()) return qe(e);
  var r, t = e.e, s = q(e.d), o = s.length;
  return n ? (i && (r = i - o) > 0 ? s = s.charAt(0) + "." + s.slice(1) + U(r) : o > 1 && (s = s.charAt(0) + "." + s.slice(1)), s = s + (e.e < 0 ? "e" : "e+") + e.e) : t < 0 ? (s = "0." + U(-t - 1) + s, i && (r = i - o) > 0 && (s += U(r))) : t >= o ? (s += U(t + 1 - o), i && (r = i - t - 1) > 0 && (s = s + "." + U(r))) : ((r = t + 1) < o && (s = s.slice(0, r) + "." + s.slice(r)), i && (r = i - o) > 0 && (t + 1 === o && (s += "."), s += U(r))), s;
}
function ne(e, n) {
  var i = e[0];
  for (n *= w; i >= 10; i /= 10) n++;
  return n;
}
function y(e, n, i) {
  if (n > Fe)
    throw m = !0, i && (e.precision = i), Error(Ne);
  return p(new e(z), n, 1, !0);
}
function _(e, n, i) {
  if (n > le) throw Error(Ne);
  return p(new e(x), n, i, !0);
}
function ke(e) {
  var n = e.length - 1, i = n * w + 1;
  if (n = e[n], n) {
    for (; n % 10 == 0; n /= 10) i--;
    for (n = e[0]; n >= 10; n /= 10) i++;
  }
  return i;
}
function U(e) {
  for (var n = ""; e--; ) n += "0";
  return n;
}
function Ce(e, n, i, r) {
  var t, s = new e(1), o = Math.ceil(r / w + 4);
  for (m = !1; ; ) {
    if (i % 2 && (s = s.times(n), pe(s.d, o) && (t = !0)), i = P(i / 2), i === 0) {
      i = s.d.length - 1, t && s.d[i] === 0 && ++s.d[i];
      break;
    }
    n = n.times(n), pe(n.d, o);
  }
  return m = !0, s;
}
function de(e) {
  return e.d[e.d.length - 1] & 1;
}
function Se(e, n, i) {
  for (var r, t, s = new e(n[0]), o = 0; ++o < n.length; ) {
    if (t = new e(n[o]), !t.s) {
      s = t;
      break;
    }
    r = s.cmp(t), (r === i || r === 0 && s.s === i) && (s = t);
  }
  return s;
}
function ae(e, n) {
  var i, r, t, s, o, u, c, f = 0, l = 0, a = 0, h = e.constructor, g = h.rounding, v = h.precision;
  if (!e.d || !e.d[0] || e.e > 17)
    return new h(e.d ? e.d[0] ? e.s < 0 ? 0 : 1 / 0 : 1 : e.s ? e.s < 0 ? 0 : e : NaN);
  for (n == null ? (m = !1, c = v) : c = n, u = new h(0.03125); e.e > -2; )
    e = e.times(u), a += 5;
  for (r = Math.log(S(2, a)) / Math.LN10 * 2 + 5 | 0, c += r, i = s = o = new h(1), h.precision = c; ; ) {
    if (s = p(s.times(e), c, 1), i = i.times(++l), u = o.plus(M(s, i, c, 1)), q(u.d).slice(0, c) === q(o.d).slice(0, c)) {
      for (t = a; t--; ) o = p(o.times(o), c, 1);
      if (n == null)
        if (f < 3 && G(o.d, c - r, g, f))
          h.precision = c += 10, i = s = u = new h(1), l = 0, f++;
        else
          return p(o, h.precision = v, g, m = !0);
      else
        return h.precision = v, o;
    }
    o = u;
  }
}
function $(e, n) {
  var i, r, t, s, o, u, c, f, l, a, h, g = 1, v = 10, N = e, T = N.d, C = N.constructor, D = C.rounding, E = C.precision;
  if (N.s < 0 || !T || !T[0] || !N.e && T[0] == 1 && T.length == 1)
    return new C(T && !T[0] ? -1 / 0 : N.s != 1 ? NaN : T ? 0 : N);
  if (n == null ? (m = !1, l = E) : l = n, C.precision = l += v, i = q(T), r = i.charAt(0), Math.abs(s = N.e) < 15e14) {
    for (; r < 7 && r != 1 || r == 1 && i.charAt(1) > 3; )
      N = N.times(e), i = q(N.d), r = i.charAt(0), g++;
    s = N.e, r > 1 ? (N = new C("0." + i), s++) : N = new C(r + "." + i.slice(1));
  } else
    return f = y(C, l + 2, E).times(s + ""), N = $(new C(r + "." + i.slice(1)), l - v).plus(f), C.precision = E, n == null ? p(N, E, D, m = !0) : N;
  for (a = N, c = o = N = M(N.minus(1), N.plus(1), l, 1), h = p(N.times(N), l, 1), t = 3; ; ) {
    if (o = p(o.times(h), l, 1), f = c.plus(M(o, new C(t), l, 1)), q(f.d).slice(0, l) === q(c.d).slice(0, l))
      if (c = c.times(2), s !== 0 && (c = c.plus(y(C, l + 2, E).times(s + ""))), c = M(c, new C(g), l, 1), n == null)
        if (G(c.d, l - v, D, u))
          C.precision = l += v, f = o = N = M(a.minus(1), a.plus(1), l, 1), h = p(N.times(N), l, 1), t = u = 1;
        else
          return p(c, C.precision = E, D, m = !0);
      else
        return C.precision = E, c;
    c = f, t += 2;
  }
}
function qe(e) {
  return String(e.s * e.s / 0);
}
function Y(e, n) {
  var i, r, t;
  for ((i = n.indexOf(".")) > -1 && (n = n.replace(".", "")), (r = n.search(/e/i)) > 0 ? (i < 0 && (i = r), i += +n.slice(r + 1), n = n.substring(0, r)) : i < 0 && (i = n.length), r = 0; n.charCodeAt(r) === 48; r++) ;
  for (t = n.length; n.charCodeAt(t - 1) === 48; --t) ;
  if (n = n.slice(r, t), n) {
    if (t -= r, e.e = i = i - r - 1, e.d = [], r = (i + 1) % w, i < 0 && (r += w), r < t) {
      for (r && e.d.push(+n.slice(0, r)), t -= w; r < t; ) e.d.push(+n.slice(r, r += w));
      n = n.slice(r), r = w - n.length;
    } else
      r -= t;
    for (; r--; ) n += "0";
    e.d.push(+n), m && (e.e > e.constructor.maxE ? (e.d = null, e.e = NaN) : e.e < e.constructor.minE && (e.e = 0, e.d = [0]));
  } else
    e.e = 0, e.d = [0];
  return e;
}
function Re(e, n) {
  var i, r, t, s, o, u, c, f, l;
  if (n.indexOf("_") > -1) {
    if (n = n.replace(/(\d)_(?=\d)/g, "$1"), Me.test(n)) return Y(e, n);
  } else if (n === "Infinity" || n === "NaN")
    return +n || (e.s = NaN), e.e = NaN, e.d = null, e;
  if (Le.test(n))
    i = 16, n = n.toLowerCase();
  else if (Te.test(n))
    i = 2;
  else if (De.test(n))
    i = 8;
  else
    throw Error(B + n);
  for (s = n.search(/p/i), s > 0 ? (c = +n.slice(s + 1), n = n.substring(2, s)) : n = n.slice(2), s = n.indexOf("."), o = s >= 0, r = e.constructor, o && (n = n.replace(".", ""), u = n.length, s = u - s, t = Ce(r, new r(i), s, s * 2)), f = Q(n, i, F), l = f.length - 1, s = l; f[s] === 0; --s) f.pop();
  return s < 0 ? new r(e.s * 0) : (e.e = ne(f, l), e.d = f, m = !1, o && (e = M(e, t, u * 4)), c && (e = e.times(Math.abs(c) < 54 ? S(2, c) : re.pow(2, c))), m = !0, e);
}
function Ze(e, n) {
  var i, r = n.d.length;
  if (r < 3)
    return n.isZero() ? n : V(e, 2, n, n);
  i = 1.4 * Math.sqrt(r), i = i > 16 ? 16 : i | 0, n = n.times(1 / ie(5, i)), n = V(e, 2, n, n);
  for (var t, s = new e(5), o = new e(16), u = new e(20); i--; )
    t = n.times(n), n = n.times(s.plus(t.times(o.times(t).minus(u))));
  return n;
}
function V(e, n, i, r, t) {
  var s, o, u, c, f = e.precision, l = Math.ceil(f / w);
  for (m = !1, c = i.times(i), u = new e(r); ; ) {
    if (o = M(u.times(c), new e(n++ * n++), f, 1), u = t ? r.plus(o) : r.minus(o), r = M(o.times(c), new e(n++ * n++), f, 1), o = u.plus(r), o.d[l] !== void 0) {
      for (s = l; o.d[s] === u.d[s] && s--; ) ;
      if (s == -1) break;
    }
    s = u, u = r, r = o, o = s;
  }
  return m = !0, o.d.length = l + 1, o;
}
function ie(e, n) {
  for (var i = e; --n; ) i *= e;
  return i;
}
function Ae(e, n) {
  var i, r = n.s < 0, t = _(e, e.precision, 1), s = t.times(0.5);
  if (n = n.abs(), n.lte(s))
    return b = r ? 4 : 1, n;
  if (i = n.divToInt(t), i.isZero())
    b = r ? 3 : 2;
  else {
    if (n = n.minus(i.times(t)), n.lte(s))
      return b = de(i) ? r ? 2 : 3 : r ? 4 : 1, n;
    b = de(i) ? r ? 1 : 4 : r ? 3 : 2;
  }
  return n.minus(t).abs();
}
function he(e, n, i, r) {
  var t, s, o, u, c, f, l, a, h, g = e.constructor, v = i !== void 0;
  if (v ? (L(i, 1, H), r === void 0 ? r = g.rounding : L(r, 0, 8)) : (i = g.precision, r = g.rounding), !e.isFinite())
    l = qe(e);
  else {
    for (l = R(e), o = l.indexOf("."), v ? (t = 2, n == 16 ? i = i * 4 - 3 : n == 8 && (i = i * 3 - 2)) : t = n, o >= 0 && (l = l.replace(".", ""), h = new g(1), h.e = l.length - o, h.d = Q(R(h), 10, t), h.e = h.d.length), a = Q(l, 10, t), s = c = a.length; a[--c] == 0; ) a.pop();
    if (!a[0])
      l = v ? "0p+0" : "0";
    else {
      if (o < 0 ? s-- : (e = new g(e), e.d = a, e.e = s, e = M(e, h, i, r, 0, t), a = e.d, s = e.e, f = me), o = a[i], u = t / 2, f = f || a[i + 1] !== void 0, f = r < 4 ? (o !== void 0 || f) && (r === 0 || r === (e.s < 0 ? 3 : 2)) : o > u || o === u && (r === 4 || f || r === 6 && a[i - 1] & 1 || r === (e.s < 0 ? 8 : 7)), a.length = i, f)
        for (; ++a[--i] > t - 1; )
          a[i] = 0, i || (++s, a.unshift(1));
      for (c = a.length; !a[c - 1]; --c) ;
      for (o = 0, l = ""; o < c; o++) l += fe.charAt(a[o]);
      if (v) {
        if (c > 1)
          if (n == 16 || n == 8) {
            for (o = n == 16 ? 4 : 3, --c; c % o; c++) l += "0";
            for (a = Q(l, t, n), c = a.length; !a[c - 1]; --c) ;
            for (o = 1, l = "1."; o < c; o++) l += fe.charAt(a[o]);
          } else
            l = l.charAt(0) + "." + l.slice(1);
        l = l + (s < 0 ? "p" : "p+") + s;
      } else if (s < 0) {
        for (; ++s; ) l = "0" + l;
        l = "0." + l;
      } else if (++s > c) for (s -= c; s--; ) l += "0";
      else s < c && (l = l.slice(0, s) + "." + l.slice(s));
    }
    l = (n == 16 ? "0x" : n == 2 ? "0b" : n == 8 ? "0o" : "") + l;
  }
  return e.s < 0 ? "-" + l : l;
}
function pe(e, n) {
  if (e.length > n)
    return e.length = n, !0;
}
function be(e) {
  return new this(e).abs();
}
function Ue(e) {
  return new this(e).acos();
}
function $e(e) {
  return new this(e).acosh();
}
function Be(e, n) {
  return new this(e).plus(n);
}
function He(e) {
  return new this(e).asin();
}
function Ve(e) {
  return new this(e).asinh();
}
function We(e) {
  return new this(e).atan();
}
function Ge(e) {
  return new this(e).atanh();
}
function Ke(e, n) {
  e = new this(e), n = new this(n);
  var i, r = this.precision, t = this.rounding, s = r + 4;
  return !e.s || !n.s ? i = new this(NaN) : !e.d && !n.d ? (i = _(this, s, 1).times(n.s > 0 ? 0.25 : 0.75), i.s = e.s) : !n.d || e.isZero() ? (i = n.s < 0 ? _(this, r, t) : new this(0), i.s = e.s) : !e.d || n.isZero() ? (i = _(this, s, 1).times(0.5), i.s = e.s) : n.s < 0 ? (this.precision = s, this.rounding = 1, i = this.atan(M(e, n, s, 1)), n = _(this, s, 1), this.precision = r, this.rounding = t, i = e.s < 0 ? i.minus(n) : i.plus(n)) : i = this.atan(M(e, n, s, 1)), i;
}
function Xe(e) {
  return new this(e).cbrt();
}
function je(e) {
  return p(e = new this(e), e.e + 1, 2);
}
function Je(e, n, i) {
  return new this(e).clamp(n, i);
}
function Qe(e) {
  if (!e || typeof e != "object") throw Error(ee + "Object expected");
  var n, i, r, t = e.defaults === !0, s = [
    "precision",
    1,
    H,
    "rounding",
    0,
    8,
    "toExpNeg",
    -9e15,
    0,
    "toExpPos",
    0,
    ue,
    "maxE",
    0,
    ue,
    "minE",
    -9e15,
    0,
    "modulo",
    0,
    9
  ];
  for (n = 0; n < s.length; n += 3)
    if (i = s[n], t && (this[i] = ce[i]), (r = e[i]) !== void 0)
      if (P(r) === r && r >= s[n + 1] && r <= s[n + 2]) this[i] = r;
      else throw Error(B + i + ": " + r);
  if (i = "crypto", t && (this[i] = ce[i]), (r = e[i]) !== void 0)
    if (r === !0 || r === !1 || r === 0 || r === 1)
      if (r)
        if (typeof crypto < "u" && crypto && (crypto.getRandomValues || crypto.randomBytes))
          this[i] = !0;
        else
          throw Error(ve);
      else
        this[i] = !1;
    else
      throw Error(B + i + ": " + r);
  return this;
}
function Ye(e) {
  return new this(e).cos();
}
function ze(e) {
  return new this(e).cosh();
}
function Ie(e) {
  var n, i, r;
  function t(s) {
    var o, u, c, f = this;
    if (!(f instanceof t)) return new t(s);
    if (f.constructor = t, ge(s)) {
      f.s = s.s, m ? !s.d || s.e > t.maxE ? (f.e = NaN, f.d = null) : s.e < t.minE ? (f.e = 0, f.d = [0]) : (f.e = s.e, f.d = s.d.slice()) : (f.e = s.e, f.d = s.d ? s.d.slice() : s.d);
      return;
    }
    if (c = typeof s, c === "number") {
      if (s === 0) {
        f.s = 1 / s < 0 ? -1 : 1, f.e = 0, f.d = [0];
        return;
      }
      if (s < 0 ? (s = -s, f.s = -1) : f.s = 1, s === ~~s && s < 1e7) {
        for (o = 0, u = s; u >= 10; u /= 10) o++;
        m ? o > t.maxE ? (f.e = NaN, f.d = null) : o < t.minE ? (f.e = 0, f.d = [0]) : (f.e = o, f.d = [s]) : (f.e = o, f.d = [s]);
        return;
      }
      if (s * 0 !== 0) {
        s || (f.s = NaN), f.e = NaN, f.d = null;
        return;
      }
      return Y(f, s.toString());
    }
    if (c === "string")
      return (u = s.charCodeAt(0)) === 45 ? (s = s.slice(1), f.s = -1) : (u === 43 && (s = s.slice(1)), f.s = 1), Me.test(s) ? Y(f, s) : Re(f, s);
    if (c === "bigint")
      return s < 0 ? (s = -s, f.s = -1) : f.s = 1, Y(f, s.toString());
    throw Error(B + s);
  }
  if (t.prototype = d, t.ROUND_UP = 0, t.ROUND_DOWN = 1, t.ROUND_CEIL = 2, t.ROUND_FLOOR = 3, t.ROUND_HALF_UP = 4, t.ROUND_HALF_DOWN = 5, t.ROUND_HALF_EVEN = 6, t.ROUND_HALF_CEIL = 7, t.ROUND_HALF_FLOOR = 8, t.EUCLID = 9, t.config = t.set = Qe, t.clone = Ie, t.isDecimal = ge, t.abs = be, t.acos = Ue, t.acosh = $e, t.add = Be, t.asin = He, t.asinh = Ve, t.atan = We, t.atanh = Ge, t.atan2 = Ke, t.cbrt = Xe, t.ceil = je, t.clamp = Je, t.cos = Ye, t.cosh = ze, t.div = xe, t.exp = ye, t.floor = en, t.hypot = nn, t.ln = rn, t.log = tn, t.log10 = on, t.log2 = sn, t.max = un, t.min = fn, t.mod = cn, t.mul = ln, t.pow = an, t.random = hn, t.round = dn, t.sign = pn, t.sin = gn, t.sinh = wn, t.sqrt = mn, t.sub = Nn, t.sum = vn, t.tan = En, t.tanh = Mn, t.trunc = kn, e === void 0 && (e = {}), e && e.defaults !== !0)
    for (r = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"], n = 0; n < r.length; ) e.hasOwnProperty(i = r[n++]) || (e[i] = this[i]);
  return t.config(e), t;
}
function xe(e, n) {
  return new this(e).div(n);
}
function ye(e) {
  return new this(e).exp();
}
function en(e) {
  return p(e = new this(e), e.e + 1, 3);
}
function nn() {
  var e, n, i = new this(0);
  for (m = !1, e = 0; e < arguments.length; )
    if (n = new this(arguments[e++]), n.d)
      i.d && (i = i.plus(n.times(n)));
    else {
      if (n.s)
        return m = !0, new this(1 / 0);
      i = n;
    }
  return m = !0, i.sqrt();
}
function ge(e) {
  return e instanceof re || e && e.toStringTag === Ee || !1;
}
function rn(e) {
  return new this(e).ln();
}
function tn(e, n) {
  return new this(e).log(n);
}
function sn(e) {
  return new this(e).log(2);
}
function on(e) {
  return new this(e).log(10);
}
function un() {
  return Se(this, arguments, -1);
}
function fn() {
  return Se(this, arguments, 1);
}
function cn(e, n) {
  return new this(e).mod(n);
}
function ln(e, n) {
  return new this(e).mul(n);
}
function an(e, n) {
  return new this(e).pow(n);
}
function hn(e) {
  var n, i, r, t, s = 0, o = new this(1), u = [];
  if (e === void 0 ? e = this.precision : L(e, 1, H), r = Math.ceil(e / w), this.crypto)
    if (crypto.getRandomValues)
      for (n = crypto.getRandomValues(new Uint32Array(r)); s < r; )
        t = n[s], t >= 429e7 ? n[s] = crypto.getRandomValues(new Uint32Array(1))[0] : u[s++] = t % 1e7;
    else if (crypto.randomBytes) {
      for (n = crypto.randomBytes(r *= 4); s < r; )
        t = n[s] + (n[s + 1] << 8) + (n[s + 2] << 16) + ((n[s + 3] & 127) << 24), t >= 214e7 ? crypto.randomBytes(4).copy(n, s) : (u.push(t % 1e7), s += 4);
      s = r / 4;
    } else
      throw Error(ve);
  else for (; s < r; ) u[s++] = Math.random() * 1e7 | 0;
  for (r = u[--s], e %= w, r && e && (t = S(10, w - e), u[s] = (r / t | 0) * t); u[s] === 0; s--) u.pop();
  if (s < 0)
    i = 0, u = [0];
  else {
    for (i = -1; u[0] === 0; i -= w) u.shift();
    for (r = 1, t = u[0]; t >= 10; t /= 10) r++;
    r < w && (i -= w - r);
  }
  return o.e = i, o.d = u, o;
}
function dn(e) {
  return p(e = new this(e), e.e + 1, this.rounding);
}
function pn(e) {
  return e = new this(e), e.d ? e.d[0] ? e.s : 0 * e.s : e.s || NaN;
}
function gn(e) {
  return new this(e).sin();
}
function wn(e) {
  return new this(e).sinh();
}
function mn(e) {
  return new this(e).sqrt();
}
function Nn(e, n) {
  return new this(e).sub(n);
}
function vn() {
  var e = 0, n = arguments, i = new this(n[e]);
  for (m = !1; i.s && ++e < n.length; ) i = i.plus(n[e]);
  return m = !0, p(i, this.precision, this.rounding);
}
function En(e) {
  return new this(e).tan();
}
function Mn(e) {
  return new this(e).tanh();
}
function kn(e) {
  return p(e = new this(e), e.e + 1, 1);
}
d[Symbol.for("nodejs.util.inspect.custom")] = d.toString;
d[Symbol.toStringTag] = "Decimal";
var re = d.constructor = Ie(ce);
z = new re(z);
x = new re(x);
const Cn = (e, n = !1) => {
  const i = typeof e == "string" ? Math.floor(new Date(e).getTime() / 1e3) : e, r = Math.floor(Date.now() / 1e3), t = Math.floor(r - i);
  return t === 0 ? "just now" : t > 0 ? `${we(t, n)} ago` : t < 0 ? `in ${we(t, n)}` : "";
}, we = (e, n = !0) => {
  const i = Math.abs(e);
  return i > 86400 ? `${Math.floor(i / 86400)}${n ? " days" : "d"}` : i > 3600 ? `${Math.floor(i / 3600)}${n ? " hours" : "h"}` : i > 60 ? `${Math.floor(i / 60)}${n ? " minutes" : "m"}` : i > 0 ? `${i}${n ? " seconds" : "s"}` : "";
};
function Sn(e, n) {
  self.registration.showNotification(e, { body: n, icon: "/arkade-icon-220.png" });
}
function qn(e) {
  const n = `Virtual coins expiring ${Cn(e)}`;
  Sn(n, "Open wallet to renew virtual coins");
}
function An(e) {
  return e.spendableVtxos ? e.spendableVtxos.reduce((n, i) => {
    const r = parseInt(i.expireAt);
    return r < n || n === 0 ? r : n;
  }, 0) : 0;
}
async function In(e, n) {
  try {
    const i = { "Content-Type": "application/json" };
    return await (await fetch(`${n}/v1/vtxos/${e}`, { headers: i })).json();
  } catch {
    return {};
  }
}
async function Pn(e, n) {
  const i = await In(e, n), r = An(i);
  Pe(r) && qn(r);
}
self.addEventListener("message", (e) => {
  let n;
  if (!e.data) return;
  const { data: i, type: r } = e.data;
  r === "SKIP_WAITING" && self.skipWaiting(), r === "START_CHECK" && i && (n = window.setInterval(() => {
    Pn(i.arkAddress, i.serverUrl);
  }, 4 * 60 * 60 * 1e3)), r === "STOP_CHECK" && n && clearInterval(n);
});
