import { compileFormula } from './formula.js'
import * as math from 'mathjs'

/** 3D vectors and vector fields F: R³ → R³ (Topics 12, 17, 18, 21). */

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a) => Math.hypot(a[0], a[1], a[2])

const VARS = ['x', 'y', 'z']

/** Simplified TeX of a math.js node; −(2·y) reads better as −2·y. */
function tex(node) {
  const s = math.simplify(node)
  return s.toTex({ parenthesis: 'auto', implicit: 'hide' }).replace(/\\mathrm\{ln\}/g, '\\ln')
}

/**
 * Compile F = [F1, F2, F3] (strings in x, y, z). Returns
 * { ok, F(x, y, z) -> [..], tex, curl: { fn, tex: [3] }, div: { fn, tex }, partials (3 × 3 { fn, tex }) }
 * or { ok: false, error }.
 */
export function compileField3(strs) {
  const c = strs.map((s) => compileFormula(s, VARS))
  const bad = c.find((r) => !r.ok)
  if (bad) return { ok: false, error: bad.error }
  try {
    // d[i][j] = ∂F_{i+1}/∂(x, y, z)_j
    const d = c.map((r) => VARS.map((v) => math.simplify(math.derivative(r.node, v))))
    const fn = (node) => {
      const code = node.compile()
      return (x, y, z) => {
        const v = code.evaluate({ x, y, z })
        return typeof v === 'number' ? v : NaN
      }
    }
    const D = d.map((row) => row.map((n) => ({ fn: fn(n), tex: tex(n) })))
    const sub = (a, b) => new math.OperatorNode('-', 'subtract', [a, b])
    const curlNodes = [sub(d[2][1], d[1][2]), sub(d[0][2], d[2][0]), sub(d[1][0], d[0][1])]
    const divNode = new math.OperatorNode('+', 'add', [new math.OperatorNode('+', 'add', [d[0][0], d[1][1]]), d[2][2]])
    const curlFns = curlNodes.map(fn)
    const divFn = fn(divNode)
    return {
      ok: true,
      F: (x, y, z) => [c[0].fn(x, y, z), c[1].fn(x, y, z), c[2].fn(x, y, z)],
      tex: `\\vec F = \\left(${c[0].tex},\\; ${c[1].tex},\\; ${c[2].tex}\\right)`,
      parts: c.map((r) => r.tex),
      partials: D,
      curl: { fn: (x, y, z) => curlFns.map((f) => f(x, y, z)), tex: curlNodes.map(tex) },
      div: { fn: divFn, tex: tex(divNode) },
    }
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) }
  }
}

/**
 * 3D paths: { type: 'param', x, y, z (in t), t: [a, b] } | { type: 'line', from, to } |
 * { type: 'poly', pts: [[x,y,z], ...] } (straight pieces, one t-unit each). Optional name.
 * Returns { r(t), t0, t1, tex? } or { error }.
 */
export function makePath3(spec) {
  if (spec.type === 'line') return makePath3({ type: 'poly', pts: [spec.from, spec.to] })
  if (spec.type === 'poly') {
    const p = spec.pts
    const n = p.length - 1
    return {
      r: (t) => {
        const i = Math.min(n - 1, Math.max(0, Math.floor(t)))
        const u = t - i
        return [0, 1, 2].map((k) => p[i][k] + u * (p[i + 1][k] - p[i][k]))
      },
      t0: 0,
      t1: n,
      corners: p,
    }
  }
  const C = ['x', 'y', 'z'].map((k) => compileFormula(spec[k], ['t']))
  const bad = C.find((r) => !r.ok)
  if (bad) return { error: bad.error }
  return {
    r: (t) => C.map((r) => r.fn(t)),
    t0: spec.t[0],
    t1: spec.t[1],
    tex: `\\vec r(t) = \\left(${C.map((r) => r.tex).join(',\\; ')}\\right)`,
  }
}

export function samplePath3(path, n = 300) {
  const out = []
  for (let i = 0; i <= n; i++) out.push(path.r(path.t0 + ((path.t1 - path.t0) * i) / n))
  return out
}

/** ∫_C F · dr by the midpoint rule on many small pieces. */
export function lineIntegral3(F, path, N = 4000) {
  let s = 0
  const dt = (path.t1 - path.t0) / N
  let a = path.r(path.t0)
  for (let i = 0; i < N; i++) {
    const t = path.t0 + i * dt
    const b = path.r(t + dt)
    const m = path.r(t + dt / 2)
    s += dot(F(...m), sub(b, a))
    a = b
  }
  return s
}

/** The worksheet's sum Σ F(r_i) · Δr_i with n pieces (r_i = r(t_i), left end). */
export function riemann3(F, path, n) {
  const pieces = []
  let sum = 0
  const dt = (path.t1 - path.t0) / n
  for (let i = 0; i < n; i++) {
    const a = path.r(path.t0 + i * dt)
    const b = path.r(path.t0 + (i + 1) * dt)
    const v = dot(F(...a), sub(b, a))
    sum += v
    pieces.push({ a, b, dot: v })
  }
  return { sum, pieces }
}

const GX = [-0.7745966692414834, 0, 0.7745966692414834]
const GW = [0.5555555555555556, 0.8888888888888888, 0.5555555555555556]

/**
 * Outward flux through each face of the box with lower-left-back corner c and sides s (worksheet #3),
 * by 3×3×(panels²) Gauss points per face. Returns [{ name, normal, center, flux }] (6 faces).
 */
export function boxFluxes(F, c, s, panels = 3) {
  const faces = [
    { name: 'right', axis: 0, side: 1 },
    { name: 'left', axis: 0, side: 0 },
    { name: 'back', axis: 1, side: 1 },
    { name: 'front', axis: 1, side: 0 },
    { name: 'top', axis: 2, side: 1 },
    { name: 'bottom', axis: 2, side: 0 },
  ]
  const h = s / panels
  return faces.map((f) => {
    const [u, v] = [0, 1, 2].filter((k) => k !== f.axis)
    const normal = [0, 0, 0]
    normal[f.axis] = f.side ? 1 : -1
    let flux = 0
    for (let pu = 0; pu < panels; pu++)
      for (let pv = 0; pv < panels; pv++)
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            const p = [...c]
            p[f.axis] = c[f.axis] + f.side * s
            p[u] = c[u] + (pu + 0.5 + GX[i] / 2) * h
            p[v] = c[v] + (pv + 0.5 + GX[j] / 2) * h
            flux += (GW[i] * GW[j] * h * h * dot(F(...p), normal)) / 4
          }
    const center = c.map((ck, k) => ck + (k === f.axis ? f.side * s : s / 2))
    return { ...f, normal, center, flux }
  })
}

/** Unit vector from azimuth φ (from +x toward +y) and elevation ψ (up from the xy-plane). */
export const fromAngles = (phi, psi) => [Math.cos(psi) * Math.cos(phi), Math.cos(psi) * Math.sin(phi), Math.sin(psi)]
export const toAngles = (u) => {
  const n = norm(u) || 1
  return [Math.atan2(u[1], u[0]), Math.asin(Math.max(-1, Math.min(1, u[2] / n)))]
}
