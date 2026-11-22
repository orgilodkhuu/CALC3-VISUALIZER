import { Plot2D, pathD } from './Plot2D.jsx'
import { fmt } from '../lib/formula.js'

/**
 * One cross section z = g(t), with the tangent line at t = at (slope `slope`) and a
 * rise/run triangle from at to at + h. Used for partial derivatives (t = x or y) and
 * for directional derivatives (t = distance along v).
 *
 *   secant     also draw the straight line from (at, g(at)) to (at + h, g(at + h))
 *   runLabel   label under the triangle (default "Δ" + varName)
 *   riseLabel  label beside the triangle (default "Δz")
 *   slopeText  caption in the corner (default "slope at x = a: m")
 *   ghost      { g, slope, label } a second, dashed cross section for comparison
 */
export default function SlicePlot({
  title,
  color,
  g,
  at,
  slope,
  h,
  range,
  zr,
  varName,
  ghost,
  secant = false,
  runLabel,
  riseLabel = 'Δz',
  slopeText,
}) {
  const pts = sampleLine(g, range)
  const z0 = g(at)
  const z1 = g(at + h)
  const L = (range[1] - range[0]) * 0.3
  return (
    <Plot2D xr={range} yr={zr} xLabel={varName} yLabel="z" title={title}>
      {(s) => (
        <>
          {ghost && (
            <>
              <path d={pathD(sampleLine(ghost.g, range), s)} fill="none" stroke="#999" strokeWidth="2.5" strokeDasharray="6 4" />
              {Number.isFinite(ghost.slope) && (
                <line
                  x1={s.x(at - L)}
                  y1={s.y(ghost.g(at) - ghost.slope * L)}
                  x2={s.x(at + L)}
                  y2={s.y(ghost.g(at) + ghost.slope * L)}
                  stroke="#777"
                  strokeWidth="2"
                />
              )}
              <text x={s.x(range[0]) + 6} y={s.y(zr[0]) - 8} className="legend-text" fill="#666">
                dashed: {ghost.label}, slope {fmt(ghost.slope)}
              </text>
            </>
          )}
          <path d={pathD(pts, s)} fill="none" stroke={color} strokeWidth="3" />
          {Number.isFinite(slope) && (
            <line
              x1={s.x(at - L)}
              y1={s.y(z0 - slope * L)}
              x2={s.x(at + L)}
              y2={s.y(z0 + slope * L)}
              stroke="#222"
              strokeWidth="2"
            />
          )}
          {secant && Number.isFinite(z1) && (
            <>
              <line x1={s.x(at)} y1={s.y(z0)} x2={s.x(at + h)} y2={s.y(z1)} stroke="#e4572e" strokeWidth="2.5" strokeDasharray="7 4" />
              <circle cx={s.x(at + h)} cy={s.y(z1)} r="5" fill="#e4572e" />
            </>
          )}
          {Number.isFinite(z1) && (
            <g className="triangle">
              <path
                d={`M${s.x(at)},${s.y(z0)}L${s.x(at + h)},${s.y(z0)}L${s.x(at + h)},${s.y(z1)}`}
                fill="none"
                stroke="#7b3fe4"
                strokeWidth="2.5"
              />
              <text x={(s.x(at) + s.x(at + h)) / 2} y={s.y(z0) + (z1 >= z0 ? 18 : -8)} textAnchor="middle" fill="#7b3fe4" className="legend-text">
                {runLabel ?? `Δ${varName}`}
              </text>
              <text x={s.x(at + h) + 5} y={(s.y(z0) + s.y(z1)) / 2 + 4} fill="#7b3fe4" className="legend-text">
                {riseLabel}
              </text>
            </g>
          )}
          <circle cx={s.x(at)} cy={s.y(z0)} r="5" fill="#111" />
          <text x={s.x(range[0]) + 6} y={s.y(zr[1]) + 18} className="legend-text" fill="#222">
            {slopeText ?? `slope at ${varName} = ${fmt(at, 2)}: ${fmt(slope)}`}
          </text>
        </>
      )}
    </Plot2D>
  )
}

export function sampleLine(g, range, n = 200) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = range[0] + ((range[1] - range[0]) * i) / n
    out.push([t, g(t)])
  }
  return out
}
