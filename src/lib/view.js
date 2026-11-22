import { createContext, useContext } from 'react'

/**
 * Shared view settings for everything inside <Viewer3D>.
 * zScale squashes the z axis when a function's heights are much larger than its domain
 * (e.g. 10 + 2x - y). Axis numbers always show TRUE z values; an on-screen note says so.
 *
 * Use P(x, y, z) to turn math coords into scene coords (z-up, scaled).
 */
export const ViewContext = createContext({ zScale: 1, bounds: null })

export function useView() {
  const v = useContext(ViewContext)
  return { ...v, P: (x, y, z) => [x, y, z * v.zScale] }
}

/** Sample f on a grid and pick a z-window that ignores spikes (2nd–98th percentile). */
export function autoZRange(fn, xr, yr, n = 60) {
  const vals = []
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const v = fn(xr[0] + ((xr[1] - xr[0]) * i) / n, yr[0] + ((yr[1] - yr[0]) * j) / n)
      if (Number.isFinite(v)) vals.push(v)
    }
  }
  if (!vals.length) return [-1, 1]
  vals.sort((a, b) => a - b)
  // Use the true min/max unless a few spikes (like 1/(x^2+y^2) near 0) dwarf everything else.
  const p2 = vals[Math.floor(vals.length * 0.02)]
  const p98 = vals[Math.ceil(vals.length * 0.98) - 1]
  const body = Math.max(p98 - p2, 1e-9)
  let lo = p2 - vals[0] > 2 * body ? p2 : vals[0]
  let hi = vals[vals.length - 1] - p98 > 2 * body ? p98 : vals[vals.length - 1]
  if (hi - lo < 1e-6) {
    lo -= 1
    hi += 1
  }
  const pad = 0.08 * (hi - lo)
  return [niceFloor(lo - pad), niceCeil(hi + pad)]
}

function niceStep(span) {
  const p = Math.pow(10, Math.floor(Math.log10(span)))
  const m = span / p
  return (m < 2 ? 0.2 : m < 5 ? 0.5 : 1) * p
}
const niceFloor = (v) => {
  const s = niceStep(Math.abs(v) || 1)
  return Math.floor(v / s) * s
}
const niceCeil = (v) => {
  const s = niceStep(Math.abs(v) || 1)
  return Math.ceil(v / s) * s
}

/** z display scale so the plot box is roughly cube-shaped; never exaggerates flat surfaces. */
export function autoZScale(xr, yr, zr) {
  const xy = Math.max(xr[1] - xr[0], yr[1] - yr[0])
  const z = zr[1] - zr[0]
  if (z <= xy * 1.2) return 1
  return Math.max(0.05, (xy * 1.2) / z)
}

/** Tick step for an axis span, aiming for about `count` ticks. */
export function tickStep(span, count = 8) {
  const raw = span / count
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}

export function ticks(lo, hi, step = tickStep(hi - lo)) {
  const out = []
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-6 ? 0 : Number(v.toPrecision(10)))
  }
  return out
}
