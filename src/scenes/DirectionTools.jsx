import { Arrow3D, Curve3D, DirectionPlane, Point3D, lineInBox } from '../components/Overlays3D.jsx'
import { Plot2D, pathD } from '../components/Plot2D.jsx'
import SlicePlot from '../components/SlicePlot.jsx'
import Tex from '../components/Tex.jsx'
import { fmt } from '../lib/formula.js'

// Shared colors so the same object looks the same in every view.
export const C = {
  v: '#e4572e', // direction vector v / u
  grad: '#7b3fe4', // gradient
  tangent: '#222',
}

const norm = (v) => Math.hypot(v[0], v[1])

/* ------------------------------------------------------------------ */
/* Topic 4: directional derivative in direction v (any length)          */
/* Her definition: rate = Δoutput / Δinput, with Δinput = ‖v‖.          */
/* ------------------------------------------------------------------ */

export function directional(f, a, b, fx, fy, v) {
  const len = norm(v)
  const f0 = f(a, b)
  const f1 = f(a + v[0], b + v[1])
  const riseSecant = f1 - f0
  const riseTangent = fx * v[0] + fy * v[1]
  return {
    len,
    f0,
    f1,
    riseSecant,
    riseTangent,
    estimate: len ? riseSecant / len : NaN,
    exact: len ? riseTangent / len : NaN,
  }
}

/** 3D: arrow v on the xy-plane, vertical slice along v, secant and tangent-plane lines. */
export function DirectionOverlay3D({ f, a, b, fx, fy, v, u, xr, yr, zr, secant = true }) {
  const d = directional(f, a, b, fx, fy, v)
  const [t0, t1] = lineInBox(a, b, u, xr, yr)
  const curve = []
  for (let i = 0; i <= 200; i++) {
    const t = t0 + ((t1 - t0) * i) / 200
    curve.push([a + u[0] * t, b + u[1] * t, f(a + u[0] * t, b + u[1] * t)])
  }
  const end = [a + v[0], b + v[1]]
  return (
    <>
      <DirectionPlane a={a} b={b} u={u} xr={xr} yr={yr} zr={zr} color={C.v} />
      <Curve3D points={curve} color={C.v} zr={zr} width={4} />
      {/* v drawn in the input plane (z = 0), like on her contour plots */}
      <Arrow3D from={[a, b, 0]} to={[end[0], end[1], 0]} color={C.v} />
      <Curve3D points={[[a, b, 0], [a, b, d.f0]]} color="#888" width={1.5} dashed />
      {/* tangent-plane line: same run, rise fx·v1 + fy·v2 */}
      <Curve3D points={[[a, b, d.f0], [end[0], end[1], d.f0 + d.riseTangent]]} color={C.tangent} width={5} />
      {secant && Number.isFinite(d.f1) && (
        <>
          <Curve3D points={[[a, b, d.f0], [end[0], end[1], d.f1]]} color={C.v} width={3} dashed />
          <Curve3D points={[[end[0], end[1], 0], [end[0], end[1], d.f1]]} color="#888" width={1.5} dashed />
          <Point3D p={[end[0], end[1], d.f1]} color={C.v} r={0.07} label={`(${fmt(end[0])}, ${fmt(end[1])}, ${fmt(d.f1)})`} />
        </>
      )}
      <Point3D p={[end[0], end[1], d.f0 + d.riseTangent]} color={C.tangent} r={0.06} />
    </>
  )
}

/** 2D: the surface along v (z against distance s), with the secant and tangent line; readout. */
export function DirectionPanels({ f, calc, a, b, fx, fy, v, u, xr, yr, zr, math, secant = true }) {
  const d = directional(f, a, b, fx, fy, v)
  const [t0, t1] = lineInBox(a, b, u, xr, yr)
  const vtex = `(${fmt(v[0])},\\,${fmt(v[1])})`
  const sq = (c) => (c < 0 ? `(${fmt(c)})^2` : `${fmt(c)}^2`)
  const end = `(${fmt(a + v[0])},\\, ${fmt(b + v[1])})`
  return (
    <>
      <div className="readout">
        <div className="key-numbers">
          <span>
            Slope in direction <Tex>{`\\vec v = ${vtex}`}</Tex>: <b className="big">{fmt(d.exact)}</b>
          </span>
        </div>
        {secant && (
          <div className="secant-row">
            {Number.isFinite(d.f1) ? (
              <>
                Secant estimate (to <Tex>{end}</Tex>): <b>{fmt(d.estimate)}</b>
              </>
            ) : (
              <>
                No secant estimate: <Tex>{`f${end}`}</Tex> is undefined.
              </>
            )}
          </div>
        )}
        {math && (
          <div className="math-block">
            <div>
              <Tex>{`\\Delta\\text{input} = \\|\\vec v\\| = \\sqrt{${sq(v[0])} + ${sq(v[1])}} = ${fmt(d.len)}`}</Tex>
            </div>
            {Number.isFinite(d.f1) && (
              <div>
                <Tex>{`\\frac{\\Delta\\text{output}}{\\Delta\\text{input}} = \\frac{f${end} - f(${fmt(a, 2)}, ${fmt(b, 2)})}{${fmt(d.len)}} = \\frac{${fmt(d.riseSecant)}}{${fmt(d.len)}} \\approx ${fmt(d.estimate)}`}</Tex>
              </div>
            )}
            <div>
              <Tex>{`f_{${vtex}}(a,b) = \\frac{f_x v_1 + f_y v_2}{\\|\\vec v\\|} = \\frac{(${fmt(fx)})(${fmt(v[0])}) + (${fmt(fy)})(${fmt(v[1])})}{${fmt(d.len)}} = ${fmt(d.exact)}`}</Tex>
            </div>
            {calc.fx && calc.fy && (
              <div className="formula-row">
                <Tex>{`f_x = ${calc.fx.tex}, \\quad f_y = ${calc.fy.tex}`}</Tex>
              </div>
            )}
          </div>
        )}
      </div>
      <SlicePlot
        title="The surface along v"
        color={C.v}
        g={(s) => f(a + u[0] * s, b + u[1] * s)}
        at={0}
        slope={d.exact}
        h={d.len}
        range={[t0, t1]}
        zr={zr}
        varName="s"
        secant
        runLabel="Δinput = ‖v‖"
        riseLabel="Δoutput"
        slopeText=""
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Topic 7: gradient and f_u = ∇f · u for a unit vector u               */
/* ------------------------------------------------------------------ */

/** 3D: gradient arrow and u arrow at the point, in the xy-plane, plus the surface along u. */
export function GradientOverlay3D({ f, a, b, fx, fy, u, xr, yr, zr, k, showU = true }) {
  const [t0, t1] = lineInBox(a, b, u, xr, yr)
  const curve = []
  for (let i = 0; i <= 200; i++) {
    const t = t0 + ((t1 - t0) * i) / 200
    curve.push([a + u[0] * t, b + u[1] * t, f(a + u[0] * t, b + u[1] * t)])
  }
  const f0 = f(a, b)
  return (
    <>
      <Arrow3D from={[a, b, 0]} to={[a + fx * k, b + fy * k, 0]} color={C.grad} width={6} />
      {showU && (
        <>
          <Arrow3D from={[a, b, 0]} to={[a + u[0], b + u[1], 0]} color={C.v} width={4} />
          <DirectionPlane a={a} b={b} u={u} xr={xr} yr={yr} zr={zr} color={C.v} opacity={0.08} />
          <Curve3D points={curve} color={C.v} zr={zr} width={4} />
        </>
      )}
      <Curve3D points={[[a, b, 0], [a, b, f0]]} color="#888" width={1.5} dashed />
      <Point3D p={[a, b, f0]} color="#111" r={0.08} />
    </>
  )
}

/** SVG arrow in plot coords (already mapped). */
export function SvgArrow({ x1, y1, x2, y2, color, width = 2.5, head = 10 }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (!(len > 0.5)) return null
  const ux = dx / len
  const uy = dy / len
  const h = Math.min(head, len * 0.5)
  const bx = x2 - ux * h
  const by = y2 - uy * h
  const w = h * 0.45
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`} fill={color} />
    </g>
  )
}

/** Gradient-field arrows on a grid (all scaled by the same factor k). */
export function gradientField(gx, gy, xr, yr, n = 9) {
  const pts = []
  let max = 0
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = xr[0] + ((i + 0.5) * (xr[1] - xr[0])) / n
      const y = yr[0] + ((j + 0.5) * (yr[1] - yr[0])) / n
      const g = [gx(x, y), gy(x, y)]
      if (!g.every(Number.isFinite)) continue
      max = Math.max(max, norm(g))
      pts.push([x, y, g])
    }
  }
  const cell = Math.min(xr[1] - xr[0], yr[1] - yr[0]) / n
  return { pts, k: max > 0 ? (0.9 * cell) / max : 1 }
}

/** Contour-plot overlay: field arrows, the gradient at the point, and u. */
export function ContourVectors({ s, a, b, fx, fy, u, k, field, showU }) {
  return (
    <>
      {field &&
        field.pts.map(([x, y, g], i) => (
          <SvgArrow
            key={i}
            x1={s.x(x)}
            y1={s.y(y)}
            x2={s.x(x + g[0] * field.k)}
            y2={s.y(y + g[1] * field.k)}
            color="#9b84c9"
            width={1.8}
            head={7}
          />
        ))}
      {showU && <SvgArrow x1={s.x(a)} y1={s.y(b)} x2={s.x(a + u[0])} y2={s.y(b + u[1])} color={C.v} width={3} />}
      <SvgArrow x1={s.x(a)} y1={s.y(b)} x2={s.x(a + fx * k)} y2={s.y(b + fy * k)} color={C.grad} width={4} head={13} />
      <circle cx={s.x(a)} cy={s.y(b)} r="5" fill="#111" />
    </>
  )
}

/** f_u(θ) = ∇f·u for every direction: max ‖∇f‖ along ∇f, zero across it, min opposite. */
export function AnglePlot({ fx, fy, theta }) {
  const g = norm([fx, fy])
  const top = Math.max(1e-6, g) * 1.25
  const pts = []
  for (let d = 0; d <= 360; d += 2) {
    const r = (d * Math.PI) / 180
    pts.push([d, fx * Math.cos(r) + fy * Math.sin(r)])
  }
  const gDeg = ((Math.atan2(fy, fx) * 180) / Math.PI + 360) % 360
  const marks = [
    { d: gDeg, v: g, label: `max ‖∇f‖ = ${fmt(g)}`, color: C.grad },
    { d: (gDeg + 180) % 360, v: -g, label: `min −‖∇f‖`, color: C.grad },
    { d: (gDeg + 90) % 360, v: 0, label: '0', color: '#555' },
    { d: (gDeg + 270) % 360, v: 0, label: '0', color: '#555' },
  ]
  const r = (theta * Math.PI) / 180
  const cur = fx * Math.cos(r) + fy * Math.sin(r)
  return (
    <Plot2D xr={[0, 360]} yr={[-top, top]} xLabel="θ°" yLabel="fᵤ" title="Slope in every direction (θ = angle of u)">
      {(s) => (
        <>
          <path d={pathD(pts, s)} fill="none" stroke={C.grad} strokeWidth="3" />
          {g > 1e-9 &&
            marks.map((m, i) => (
              <g key={i}>
                <circle cx={s.x(m.d)} cy={s.y(m.v)} r="4.5" fill={m.color} />
                <text
                  x={s.x(m.d)}
                  y={s.y(m.v) + (m.v > 0 ? -10 : m.v < 0 ? 22 : -10)}
                  textAnchor={m.d > 300 ? 'end' : m.d < 60 ? 'start' : 'middle'}
                  className="legend-text"
                  fill={m.color}
                >
                  {m.label}
                </text>
              </g>
            ))}
          <line x1={s.x(theta)} x2={s.x(theta)} y1={s.y(-top)} y2={s.y(top)} stroke={C.v} strokeWidth="2" strokeDasharray="5 4" />
          <circle cx={s.x(theta)} cy={s.y(cur)} r="6" fill={C.v} />
        </>
      )}
    </Plot2D>
  )
}

/** Gradient readout: ∇f and f_u by default; the full dot product behind "Show the math". */
export function GradientReadout({ calc, a, b, fx, fy, u, theta, math, k, showU = true }) {
  const g = norm([fx, fy])
  const fu = fx * u[0] + fy * u[1]
  const angleToGrad = g > 1e-9 ? (Math.acos(Math.max(-1, Math.min(1, fu / g))) * 180) / Math.PI : NaN
  return (
    <div className="readout">
      <div className="key-numbers" style={{ color: C.grad }}>
        <Tex>{`\\nabla f(${fmt(a, 2)},\\, ${fmt(b, 2)}) = (${fmt(fx)},\\, ${fmt(fy)})`}</Tex>
        <span>
          length <b>{fmt(g)}</b>
        </span>
      </div>
      {showU && (
        <div className="key-numbers" style={{ color: C.v }}>
          <span>
            Slope in direction <Tex>{'\\vec u'}</Tex>: <b className="big">{fmt(fu)}</b>
          </span>
        </div>
      )}
      {math && (
        <div className="math-block">
          <div>
            <Tex>{`\\vec u = (\\cos ${Math.round(theta)}^\\circ, \\sin ${Math.round(theta)}^\\circ) = (${fmt(u[0])},\\, ${fmt(u[1])})`}</Tex>
          </div>
          <div>
            <Tex>{`f_{\\vec u} = \\nabla f \\cdot \\vec u = (${fmt(fx)})(${fmt(u[0])}) + (${fmt(fy)})(${fmt(u[1])}) = ${fmt(fu)}`}</Tex>
          </div>
          {calc.fx && calc.fy && (
            <div className="formula-row">
              <Tex>{`\\nabla f(x,y) = \\left(${calc.fx.tex},\\; ${calc.fy.tex}\\right)`}</Tex>
            </div>
          )}
          <div className="help">Angle between u and ∇f: {Number.isFinite(angleToGrad) ? `${Math.round(angleToGrad)}°` : '—'}</div>
        </div>
      )}
      {Math.abs(k - 1) > 1e-6 && <div className="help">∇f arrows drawn at {fmt(k, 2)}× true length.</div>}
    </div>
  )
}
