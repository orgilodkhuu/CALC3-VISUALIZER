import { compileFormula } from './formula.js'

/**
 * Paths C in the plane, all turned into one shape: { r(t) -> [x, y], t0, t1, closed }.
 * Specs (used in topic configs):
 *   { type: 'param', x: 't + 2', y: 't^3 + 4', t: [-2, 2] }       worksheet r(t) = (x(t), y(t))
 *   { type: 'line', from: [1, 2], to: [5, 1] }                      r(t) = from + t(to − from), 0 ≤ t ≤ 1
 *   { type: 'circle', c: [0, 0], r: 3, a: [0, 2π] }                 (cx + r cos t, cy + r sin t)
 *   { type: 'poly', pts: [[0,1],[6,1],[0,3]], closed: true }        straight pieces, one t-unit each
 *   { type: 'spline', pts: [P, M, ..., Q] }                         smooth curve through the points (draggable)
 * Every spec may carry a `name` (shown in the Path list) and `tex` (the worksheet formula for r(t)).
 */
export function makePath(spec) {
  if (!spec) return null
  switch (spec.type) {
    case 'param': {
      const X = compileFormula(spec.x, ['t'])
      const Y = compileFormula(spec.y, ['t'])
      if (!X.ok || !Y.ok) return { error: (X.ok ? Y : X).error }
      return {
        r: (t) => [X.fn(t), Y.fn(t)],
        t0: spec.t[0],
        t1: spec.t[1],
        tex: `\\vec r(t) = \\left(${X.tex},\\; ${Y.tex}\\right)`,
      }
    }
    case 'line': {
      const [a, b] = [spec.from, spec.to]
      return { r: (t) => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])], t0: 0, t1: 1 }
    }
    case 'circle': {
      const [cx, cy] = spec.c ?? [0, 0]
      const R = spec.r
      const [a0, a1] = spec.a ?? [0, 2 * Math.PI]
      const closed = Math.abs(a1 - a0 - 2 * Math.PI) < 1e-9
      return { r: (t) => [cx + R * Math.cos(t), cy + R * Math.sin(t)], t0: a0, t1: a1, closed }
    }
    case 'poly': {
      const pts = spec.closed ? [...spec.pts, spec.pts[0]] : spec.pts
      const n = pts.length - 1
      return {
        r: (t) => {
          const i = Math.min(n - 1, Math.max(0, Math.floor(t)))
          const u = t - i
          return [pts[i][0] + u * (pts[i + 1][0] - pts[i][0]), pts[i][1] + u * (pts[i + 1][1] - pts[i][1])]
        },
        t0: 0,
        t1: n,
        closed: !!spec.closed,
        corners: pts,
      }
    }
    case 'spline': {
      // Centripetal-free Catmull–Rom through the points, one t-unit per piece; ends mirrored.
      const p = spec.pts
      const n = p.length - 1
      if (n === 1) return makePath({ type: 'line', from: p[0], to: p[1] })
      const at = (i) =>
        i < 0 ? [2 * p[0][0] - p[1][0], 2 * p[0][1] - p[1][1]] : i > n ? [2 * p[n][0] - p[n - 1][0], 2 * p[n][1] - p[n - 1][1]] : p[i]
      return {
        r: (t) => {
          const i = Math.min(n - 1, Math.max(0, Math.floor(t)))
          const u = t - i
          const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
          const u2 = u * u
          const u3 = u2 * u
          const f = (k) =>
            0.5 * (2 * b[k] + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3)
          return [f(0), f(1)]
        },
        t0: 0,
        t1: n,
      }
    }
    default:
      return null
  }
}

/** Points along the path for drawing. */
export function samplePath(path, n = 300) {
  const out = []
  for (let i = 0; i <= n; i++) out.push(path.r(path.t0 + ((path.t1 - path.t0) * i) / n))
  return out
}

/**
 * The worksheet's Riemann sum with n pieces: Σ F(r_i) · Δr_i, r_i = r(t_i) at equal steps in t, Δr_i = r_{i+1} − r_i.
 * Returns the pieces too (for drawing and the worksheet table).
 */
export function riemann(F, path, n) {
  const pieces = []
  let sum = 0
  const dt = (path.t1 - path.t0) / n
  for (let i = 0; i < n; i++) {
    const t = path.t0 + i * dt
    const a = path.r(t)
    const b = path.r(t + dt)
    const dr = [b[0] - a[0], b[1] - a[1]]
    const Fa = F(a[0], a[1])
    const dot = Fa[0] * dr[0] + Fa[1] * dr[1]
    sum += dot
    pieces.push({ t, a, b, dr, F: Fa, dot })
  }
  return { sum, pieces, dt }
}

/**
 * The line integral ∫_C F · dr, to about 6 digits: midpoint rule on many small pieces
 * (error shrinks like 1/N², and it works for every path type, dragged ones included).
 */
export function lineIntegral(F, path, N = 4000) {
  let s = 0
  const dt = (path.t1 - path.t0) / N
  let a = path.r(path.t0)
  for (let i = 0; i < N; i++) {
    const t = path.t0 + i * dt
    const b = path.r(t + dt)
    const m = path.r(t + dt / 2)
    const Fm = F(m[0], m[1])
    s += Fm[0] * (b[0] - a[0]) + Fm[1] * (b[1] - a[1])
    a = b
  }
  return s
}

/** Signed area (positive = counter-clockwise) of a closed path, by the shoelace formula on samples. */
export function enclosedArea(path, N = 2000) {
  const p = samplePath(path, N)
  let A = 0
  for (let i = 0; i < p.length - 1; i++) A += p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1]
  return A / 2
}

// Gauss–Legendre, 8 points on [-1, 1].
const GX = [-0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498, 0.1834346424956498, 0.5255324099163290, 0.7966664774136267, 0.9602898564975363]
const GW = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620, 0.3626837833783620, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763]

function gauss(f, a, b, panels = 16) {
  let s = 0
  const h = (b - a) / panels
  for (let p = 0; p < panels; p++) {
    const c = a + (p + 0.5) * h
    for (let i = 0; i < 8; i++) s += GW[i] * f(c + (GX[i] * h) / 2)
  }
  return (s * h) / 2
}

/**
 * Regions R for Green's theorem: { type: 'poly', pts } (counter-clockwise) or { type: 'circle', c, r }.
 * Rectangles: { type: 'rect', x: [a, b], y: [c, d] } (turned into a poly).
 */
export function regionToPoly(region) {
  if (region.type === 'rect') {
    const [a, b] = region.x
    const [c, d] = region.y
    return { type: 'poly', pts: [[a, c], [b, c], [b, d], [a, d]] }
  }
  return region
}

/** Boundary of a region, counter-clockwise, as a path spec. */
export function boundarySpec(region) {
  const R = regionToPoly(region)
  if (R.type === 'circle') return { type: 'circle', c: R.c, r: R.r }
  return { type: 'poly', pts: R.pts, closed: true }
}

/** ∬_R g dA by Gaussian quadrature (polygons: vertical slices; circles: polar). */
export function doubleIntegral(g, region) {
  const R = regionToPoly(region)
  if (R.type === 'circle') {
    const [cx, cy] = R.c
    return gauss(
      (th) => gauss((rho) => g(cx + rho * Math.cos(th), cy + rho * Math.sin(th)) * rho, 0, R.r, 4),
      0,
      2 * Math.PI,
      16,
    )
  }
  // Polygon: split x at every vertex so each slice is a set of straight-edged y-intervals.
  const pts = R.pts
  const xs = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b)
  const yIntervals = (x) => {
    const ys = []
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[(i + 1) % pts.length]
      if ((x1 <= x && x < x2) || (x2 <= x && x < x1)) ys.push(y1 + ((x - x1) * (y2 - y1)) / (x2 - x1))
    }
    return ys.sort((a, b) => a - b)
  }
  let total = 0
  for (let k = 0; k < xs.length - 1; k++) {
    total += gauss(
      (x) => {
        const ys = yIntervals(x)
        let s = 0
        for (let j = 0; j + 1 < ys.length; j += 2) s += gauss((y) => g(x, y), ys[j], ys[j + 1], 2)
        return s
      },
      xs[k],
      xs[k + 1],
      4,
    )
  }
  return total
}

/** Is (x, y) inside the region? */
export function insideRegion(region, x, y) {
  const R = regionToPoly(region)
  if (R.type === 'circle') return (x - R.c[0]) ** 2 + (y - R.c[1]) ** 2 <= R.r ** 2
  let inside = false
  const p = R.pts
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (p[i][1] > y !== p[j][1] > y && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside
  }
  return inside
}
