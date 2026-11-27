import { compileFormula } from './formula.js'

/**
 * Regions R written as iterated-integral bounds, the way the worksheets write them (Topics 14, 16).
 *   rectangular: { order: 'dydx', outer: [a, b], inner: ['x', '4 - x'] }   ∫_a^b ∫_{lo(x)}^{hi(x)} … dy dx
 *                { order: 'dxdy', outer: [c, d], inner: ['y', '2y'] }      ∫_c^d ∫_{lo(y)}^{hi(y)} … dx dy
 *   polar:       { order: 'drdt', outer: [θa, θb], inner: ['0', '1'] }     ∫_θa^θb ∫_{lo(θ)}^{hi(θ)} … r dr dθ
 *                { order: 'dtdr', outer: [ra, rb], inner: ['pi/3', '2pi/3'] }  ∫ ∫ … r dθ dr
 * Outer limits may be numbers or strings like 'pi/4'. Inner limits are formulas in the outer variable
 * (x, y, r, or theta; θ is accepted too).
 * Integrands f may use x, y, r and theta together.
 */

const ORDERS = {
  dydx: { polar: false, outer: 'x', inner: 'y' },
  dxdy: { polar: false, outer: 'y', inner: 'x' },
  drdt: { polar: true, outer: 'theta', inner: 'r' },
  dtdr: { polar: true, outer: 'r', inner: 'theta' },
}
export const ORDER_LABELS = { dydx: 'dy dx', dxdy: 'dx dy', drdt: 'dr dθ', dtdr: 'dθ dr' }

const greek = (s) => String(s).replace(/θ/g, 'theta')
export const num = (v) => {
  if (typeof v === 'number') return v
  const r = compileFormula(greek(v), [])
  return r.ok ? r.fn() : NaN
}

/** Compile bounds → { ok, polar, order, outerVar, innerVar, a, b, lo(o), hi(o), loTex, hiTex } or { ok: false, error }. */
export function compileBounds(B) {
  const o = ORDERS[B?.order]
  if (!o) return { ok: false, error: 'Unknown order of integration' }
  const a = num(B.outer[0])
  const b = num(B.outer[1])
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a < b)) return { ok: false, error: 'Outer limits must be numbers with from < to' }
  const L = compileFormula(greek(B.inner[0]), [o.outer])
  const H = compileFormula(greek(B.inner[1]), [o.outer])
  if (!L.ok || !H.ok) return { ok: false, error: (L.ok ? H : L).error }
  return { ok: true, ...o, order: B.order, a, b, lo: L.fn, hi: H.fn, loTex: L.tex, hiTex: H.tex }
}

/** f(x, y, r, theta) → a function of (x, y) and of polar (r, θ). */
export function compileIntegrand(text) {
  const c = compileFormula(greek(text), ['x', 'y', 'r', 'theta'])
  if (!c.ok) return c
  return {
    ...c,
    xy: (x, y) => c.fn(x, y, Math.hypot(x, y), Math.atan2(y, x)),
    polar: (r, t) => c.fn(r * Math.cos(t), r * Math.sin(t), r, t),
  }
}

// Gauss–Legendre, 8 points.
const GX = [-0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498, 0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363]
const GW = [0.1012285362903763, 0.2223810344533745, 0.313706645877887, 0.362683783378362, 0.362683783378362, 0.313706645877887, 0.2223810344533745, 0.1012285362903763]
function gauss(f, a, b, panels) {
  let s = 0
  const h = (b - a) / panels
  for (let p = 0; p < panels; p++) {
    const c = a + (p + 0.5) * h
    for (let i = 0; i < 8; i++) s += GW[i] * f(c + (GX[i] * h) / 2)
  }
  return (s * h) / 2
}

/** The point (x, y) for (outer, inner) values. */
export function toXY(cb, o, i) {
  switch (cb.order) {
    case 'dydx':
      return [o, i]
    case 'dxdy':
      return [i, o]
    case 'drdt':
      return [i * Math.cos(o), i * Math.sin(o)]
    default:
      return [o * Math.cos(i), o * Math.sin(i)] // dtdr
  }
}

/** The iterated integral exactly as written (∬ f dA; polar includes the r). */
export function iterated(cb, F) {
  return gauss(
    (o) => {
      const lo = cb.lo(o)
      const hi = cb.hi(o)
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0
      return gauss(
        (i) => {
          const [x, y] = toXY(cb, o, i)
          const r = cb.order === 'drdt' ? i : cb.order === 'dtdr' ? o : 1
          return F.xy(x, y) * r
        },
        lo,
        hi,
        6,
      )
    },
    cb.a,
    cb.b,
    48,
  )
}

/** Boundary of R as a closed list of (x, y) points. */
export function boundary(cb, n = 160) {
  const pts = []
  for (let k = 0; k <= n; k++) {
    const o = cb.a + ((cb.b - cb.a) * k) / n
    pts.push(toXY(cb, o, cb.lo(o)))
  }
  // Edge at the outer limit b (an arc in dθ dr), walked from lo(b) to hi(b).
  const edge = (o, from, to) => {
    for (let k = 1; k < 40; k++) pts.push(toXY(cb, o, from + ((to - from) * k) / 40))
  }
  edge(cb.b, cb.lo(cb.b), cb.hi(cb.b))
  for (let k = n; k >= 0; k--) {
    const o = cb.a + ((cb.b - cb.a) * k) / n
    pts.push(toXY(cb, o, cb.hi(o)))
  }
  edge(cb.a, cb.hi(cb.a), cb.lo(cb.a))
  pts.push(pts[0])
  return pts.filter((p) => p.every(Number.isFinite))
}

export function bbox(pts) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] }
}

/** Is the point with outer value o and inner value i inside R? */
const insideOI = (cb, o, i) => {
  if (o < cb.a - 1e-12 || o > cb.b + 1e-12) return false
  const lo = cb.lo(o)
  const hi = cb.hi(o)
  return i >= Math.min(lo, hi) - 1e-12 && i <= Math.max(lo, hi) + 1e-12
}

/** Is (x, y) inside R? (Polar: θ is matched to the bounds' window, mod 2π.) */
export function inside(cb, x, y) {
  switch (cb.order) {
    case 'dydx':
      return insideOI(cb, x, y)
    case 'dxdy':
      return insideOI(cb, y, x)
    default: {
      const r = Math.hypot(x, y)
      let t = Math.atan2(y, x)
      const ref = cb.order === 'drdt' ? cb.a : Math.min(cb.lo(r), cb.hi(r))
      while (t < ref - 1e-9) t += 2 * Math.PI
      while (t > ref + 2 * Math.PI - 1e-9) t -= 2 * Math.PI
      return cb.order === 'drdt' ? insideOI(cb, t, r) : insideOI(cb, r, t)
    }
  }
}

/**
 * Rectangular boxes over the bounding box of R (n × n), kept when the box center is in R.
 * Height from the chosen point: 'center' | 'low' (lower-left corner) | 'high' (upper-right corner).
 */
export function boxSum(cb, F, n, at = 'center', box = null) {
  const bb = box ?? bbox(boundary(cb))
  const dx = (bb.x[1] - bb.x[0]) / n
  const dy = (bb.y[1] - bb.y[0]) / n
  const k = at === 'low' ? 0 : at === 'high' ? 1 : 0.5
  const boxes = []
  let sum = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x0 = bb.x[0] + i * dx
      const y0 = bb.y[0] + j * dy
      if (!inside(cb, x0 + dx / 2, y0 + dy / 2)) continue
      const h = F.xy(x0 + k * dx, y0 + k * dy)
      if (!Number.isFinite(h)) continue
      sum += h * dx * dy
      boxes.push({ x0, y0, dx, dy, h })
    }
  }
  return { sum, boxes, dx, dy, bb }
}

/**
 * Polar wedges: n × n in (r, θ) over the ranges of R, kept when the wedge center is in R.
 * Each wedge: r0, r1, t0, t1, rm (middle r), tm, value f(rm, tm), and f · rm Δr Δθ.
 */
export function wedgeSum(cb, F, n) {
  let rR
  let tR
  if (cb.order === 'drdt') {
    tR = [cb.a, cb.b]
    let lo = Infinity
    let hi = -Infinity
    for (let k = 0; k <= 200; k++) {
      const o = cb.a + ((cb.b - cb.a) * k) / 200
      const l = cb.lo(o)
      const h = cb.hi(o)
      if (Number.isFinite(l)) lo = Math.min(lo, l, h)
      if (Number.isFinite(h)) hi = Math.max(hi, l, h)
    }
    rR = [Math.max(0, lo), hi]
  } else {
    rR = [Math.max(0, cb.a), cb.b]
    let lo = Infinity
    let hi = -Infinity
    for (let k = 0; k <= 200; k++) {
      const o = cb.a + ((cb.b - cb.a) * k) / 200
      lo = Math.min(lo, cb.lo(o), cb.hi(o))
      hi = Math.max(hi, cb.lo(o), cb.hi(o))
    }
    tR = [lo, hi]
  }
  const dr = (rR[1] - rR[0]) / n
  const dt = (tR[1] - tR[0]) / n
  const wedges = []
  let sum = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const r0 = rR[0] + i * dr
      const t0 = tR[0] + j * dt
      const rm = r0 + dr / 2
      const tm = t0 + dt / 2
      const ok = cb.order === 'drdt' ? insideOI(cb, tm, rm) : insideOI(cb, rm, tm)
      if (!ok) continue
      const v = F.polar(rm, tm)
      if (!Number.isFinite(v)) continue
      sum += v * rm * dr * dt
      wedges.push({ r0, r1: r0 + dr, t0, t1: t0 + dt, rm, tm, v })
    }
  }
  return { sum, wedges, dr, dt, rR, tR }
}

/** TeX for the iterated integral as written. */
export function boundsTex(B, cb, fTex) {
  const t = (v) => (typeof v === 'number' ? texNum(v) : String(v).replace(/theta|θ/g, '\\theta').replace(/pi/g, '\\pi').replace(/\*/g, ''))
  const d = { dydx: 'dy\\,dx', dxdy: 'dx\\,dy', drdt: 'dr\\,d\\theta', dtdr: 'd\\theta\\,dr' }[cb.order]
  const r = cb.polar ? '\\, r' : ''
  const body = cb.polar ? `\\left(${fTex}\\right)${r}` : fTex
  return `\\int_{${t(B.outer[0])}}^{${t(B.outer[1])}} \\int_{${cb.loTex}}^{${cb.hiTex}} ${body} \\; ${d}`
}

export function texNum(v) {
  const m = v / Math.PI
  if (Math.abs(v) > 1e-9 && Math.abs(m * 12 - Math.round(m * 12)) < 1e-9 && Math.abs(v - Math.round(v)) > 1e-9) {
    // multiples of π/12
    let p = Math.round(m * 12)
    let q = 12
    const g = (a, b) => (b ? g(b, a % b) : a)
    const d = g(Math.abs(p), q)
    p /= d
    q /= d
    const top = `${p < 0 ? '-' : ''}${Math.abs(p) === 1 ? '' : Math.abs(p)}\\pi`
    return q === 1 ? top : `\\tfrac{${top}}{${q}}`
  }
  return String(Number(v.toFixed(4)))
}

/** θ as a friendly multiple of π when it is one, else radians (for readouts). */
export function angleTex(t) {
  const s = texNum(t)
  return s.includes('\\pi') ? s : `${Number(t.toFixed(3))}`
}
