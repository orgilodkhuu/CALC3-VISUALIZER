import { useEffect, useMemo, useRef, useState } from 'react'
import { Arrow } from './Plane2D.jsx'
import { FormulaInput, useCompiled } from './Controls.jsx'
import { curl2D } from '../lib/formula.js'

/**
 * Shared pieces for scenes that draw a vector field F: R² → R² with paths on top
 * (Topics 9, 10, 13, 15). FieldScene (Topic 8) predates these and keeps its own copy.
 */

export const COLORS = {
  field: '#5b6b7c', // field arrows
  F: '#e4572e', // F at a point (orange, as in Topic 8)
  path: '#1f4e8c', // the path C
  plus: '#2a9d3c', // F · Δr > 0
  minus: '#d62839', // F · Δr < 0
  zero: '#8a96a3',
  pathB: '#8e44ad', // second path (Topic 10)
  level: '#2a9d3c', // level curves of f
}

/** Sign color for a piece's F · Δr. */
export const signColor = (v, tol = 1e-9) => (v > tol ? COLORS.plus : v < -tol ? COLORS.minus : COLORS.zero)

/**
 * F from a config's F: ['-y', 'x']. Returns { F(x, y) -> [F1, F2] | null, tex, curl, inputs },
 * where `inputs` are the "Your own F" formula boxes (they write to the tab's store via onCustom).
 * The last formula that compiled stays on screen while someone is mid-typing.
 */
export function useField(cfgF, onCustom) {
  const c1 = useCompiled(cfgF[0])
  const c2 = useCompiled(cfgF[1])
  const ok = c1?.ok && c2?.ok
  const F = useMemo(() => (ok ? (x, y) => [c1.fn(x, y), c2.fn(x, y)] : null), [ok, c1, c2])
  const curl = useMemo(() => (ok ? curl2D(c1.node, c2.node) : null), [ok, c1, c2])
  const tex = `\\vec F(x,y) = \\left(${c1?.tex ?? '?'},\\; ${c2?.tex ?? '?'}\\right)`
  const inputs = onCustom ? (
    <>
      <FormulaInput label="F₁(x, y)" prefix="F_1 = " value={cfgF[0]} onChange={(v) => onCustom({ F: [v, cfgF[1]] })} onCompiled={() => {}} />
      <FormulaInput label="F₂(x, y)" help={false} prefix="F_2 = " value={cfgF[1]} onChange={(v) => onCustom({ F: [cfgF[0], v] })} onCompiled={() => {}} />
    </>
  ) : null
  return { F, tex, curl, inputs }
}

/** Grid points with their vectors, plus the automatic arrow scale (longest arrow ≈ 90% of spacing). */
export function useFieldGrid(F, xr, yr, step) {
  return useMemo(() => {
    if (!F) return { pts: [], auto: 1 }
    const pts = []
    let max = 0
    for (let x = Math.ceil(xr[0] / step) * step; x <= xr[1] + 1e-9; x += step) {
      for (let y = Math.ceil(yr[0] / step) * step; y <= yr[1] + 1e-9; y += step) {
        const v = F(x, y)
        if (!v.every(Number.isFinite)) continue
        max = Math.max(max, Math.hypot(v[0], v[1]))
        pts.push([x, y, v])
      }
    }
    const auto = max > 0 ? (0.9 * step) / max : 1
    return { pts, auto: Number(auto.toPrecision(2)) }
  }, [F, xr, yr, step])
}

export function FieldArrows({ s, grid, k, opacity = 1 }) {
  return (
    <g opacity={opacity}>
      {grid.pts.map(([x, y, v], i) => (
        <Arrow key={i} s={s} from={[x, y]} to={[x + v[0] * k, y + v[1] * k]} color={COLORS.field} width={2.2} head={9} />
      ))}
    </g>
  )
}

/** A polyline through data points. */
export function PathLine({ s, pts, color = COLORS.path, width = 5, dashed = false, opacity = 1 }) {
  let d = ''
  let pen = false
  for (const p of pts) {
    if (!p.every(Number.isFinite)) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${s.x(p[0]).toFixed(1)},${s.y(p[1]).toFixed(1)}`
    pen = true
  }
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={width}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '10 8' : undefined}
      opacity={opacity}
    />
  )
}

/** Arrowheads along a path showing its direction (count of them, evenly spaced in t). */
export function PathDirection({ s, path, color = COLORS.path, count = 3, size = 14 }) {
  const out = []
  for (let i = 0; i < count; i++) {
    const t = path.t0 + ((path.t1 - path.t0) * (i + 0.5)) / count
    const e = (path.t1 - path.t0) * 1e-3
    const a = path.r(t - e)
    const b = path.r(t + e)
    const px = s.x(b[0]) - s.x(a[0])
    const py = s.y(b[1]) - s.y(a[1])
    const L = Math.hypot(px, py)
    if (!(L > 0)) continue
    const ux = px / L
    const uy = py / L
    const m = path.r(t)
    const cx = s.x(m[0]) + ux * size * 0.5
    const cy = s.y(m[1]) + uy * size * 0.5
    const bx = cx - ux * size
    const by = cy - uy * size
    const hw = size * 0.55
    out.push(<polygon key={i} points={`${cx},${cy} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`} fill={color} />)
  }
  return <g>{out}</g>
}

/**
 * Paddle wheel at p that spins at ω = curl / 2 rad/s (the worksheet: curl is twice the angular velocity).
 * Counter-clockwise for positive curl. Spin is capped so it stays watchable.
 */
export function PaddleWheel({ s, p, curl, radius = 0.45 }) {
  const [angle, setAngle] = useState(0)
  const w = useRef(0)
  w.current = Number.isFinite(curl) ? Math.max(-4, Math.min(4, curl / 2)) : 0
  useEffect(() => {
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (w.current) setAngle((a) => (a + w.current * dt) % (2 * Math.PI))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const R = radius
  const blades = [0, 1, 2, 3].map((i) => {
    const a = angle + (i * Math.PI) / 2
    return [p[0] + R * Math.cos(a), p[1] + R * Math.sin(a)]
  })
  return (
    <g pointerEvents="none">
      <circle cx={s.x(p[0])} cy={s.y(p[1])} r={R * s.unit} fill="rgba(255,255,255,0.55)" stroke="#333" strokeWidth="1.5" strokeDasharray="4 4" />
      {blades.map((b, i) => (
        <line key={i} x1={s.x(p[0])} y1={s.y(p[1])} x2={s.x(b[0])} y2={s.y(b[1])} stroke={i === 0 ? COLORS.F : '#333'} strokeWidth="5" strokeLinecap="round" />
      ))}
      <circle cx={s.x(p[0])} cy={s.y(p[1])} r={5} fill="#333" />
    </g>
  )
}

/** Diverging color for a curl value v in [-max, max]: red = positive (counter-clockwise), blue = negative. */
export function curlFill(v, max) {
  if (!Number.isFinite(v) || !(max > 0)) return 'transparent'
  const a = Math.min(1, Math.abs(v) / max) * 0.5
  return v > 0 ? `rgba(228,87,46,${a.toFixed(3)})` : `rgba(43,108,196,${a.toFixed(3)})`
}

/**
 * The plane shaded by curl F (cells of `cell` data units), clipped to an optional clipPath id.
 * Returns the max |curl| used for the color scale too (via onMax), so legends can show it.
 */
export function CurlShading({ s, curl, xr, yr, cell = 0.125, clip, max: fixedMax }) {
  const cells = useMemo(() => {
    if (!curl) return { list: [], max: 0 }
    const list = []
    let max = 0
    for (let x = xr[0]; x < xr[1] - 1e-9; x += cell) {
      for (let y = yr[0]; y < yr[1] - 1e-9; y += cell) {
        const v = curl.fn(x + cell / 2, y + cell / 2)
        if (Number.isFinite(v)) max = Math.max(max, Math.abs(v))
        list.push([x, y, v])
      }
    }
    return { list, max }
  }, [curl, xr, yr, cell])
  const max = fixedMax ?? cells.max
  // Whole-pixel edges so neighboring tiles meet exactly (overlaps would double the transparency).
  const R = Math.round
  return (
    <g clipPath={clip ? `url(#${clip})` : undefined} shapeRendering="crispEdges">
      {cells.list.map(([x, y, v], i) => {
        const x0 = R(s.x(x))
        const y0 = R(s.y(y + cell))
        return <rect key={i} x={x0} y={y0} width={R(s.x(x + cell)) - x0} height={R(s.y(y)) - y0} fill={curlFill(v, max)} />
      })}
    </g>
  )
}
