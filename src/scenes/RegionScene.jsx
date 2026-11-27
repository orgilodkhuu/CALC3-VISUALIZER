import { useMemo, useRef, useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, FormulaInput, NumBox, PairInput } from '../components/Controls.jsx'
import BoundsInputs from '../components/BoundsInputs.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { COLORS, curlFill } from '../components/FieldLayer.jsx'
import { fmt } from '../lib/formula.js'
import { compileBounds, compileIntegrand, iterated, boundary, bbox, toXY, wedgeSum, boundsTex, angleTex } from '../lib/integrals.js'

/**
 * Flat (2D) views of regions and polar coordinates (Topics 14, 16). Config fields (examples override any):
 *   mode: 'region'  R drawn from iterated-integral bounds (rectangular or polar); a slice at one value of
 *                   the outer variable shows where the inner variable starts and stops
 *         'coords'  polar coordinates of a draggable point: (x, y) ↔ (r, θ)
 *         'wedges'  polar region cut into wedges Δr × rΔθ; Σ f r Δr Δθ vs ∬; one wedge measured
 *   bounds (lib/integrals.js), f, pieces (wedges per side), point [x, y] or polar [r, θ] (coords), x, y, caption.
 * "Your own…": f and the bounds (region, wedges) or the point (coords).
 */
export default function RegionScene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  const mode = cfg.mode ?? 'region'
  if (mode === 'coords') return <CoordsMode {...{ cfg, examples, exampleIndex, onExample, onCustom }} />
  return <BoundsMode {...{ cfg, mode, examples, exampleIndex, onExample, onCustom }} />
}

function Panel({ cfg, examples, exampleIndex, onExample, ownLabel, custom, children }) {
  return (
    <aside className="panel">
      {cfg.caption && (
        <p className="caption">
          <RichText>{cfg.caption}</RichText>
        </p>
      )}
      <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel={ownLabel} />
      {cfg.isCustom && <CustomBox>{custom}</CustomBox>}
      {children}
    </aside>
  )
}

/** Plain-text version of a bound for labels on the picture: 4 - x → 4 − x, theta → θ, pi → π. */
const pretty = (s) =>
  String(s)
    .replace(/theta/g, 'θ')
    .replace(/sqrt\(([^()]*)\)/g, '√($1)')
    .replace(/pi/g, 'π')
    .replace(/(\d)\s*\*?\s*π/g, '$1π')
    .replace(/\*/g, '·')
    .replace(/\s*-\s*/g, ' − ')
    .replace(/^ − /, '−')

/** View window around R: its bounding box with a margin; polar regions also keep the origin in view. */
function viewOf(edge, polar) {
  const bb = bbox(edge)
  if (polar) {
    bb.x = [Math.min(0, bb.x[0]), Math.max(0, bb.x[1])]
    bb.y = [Math.min(0, bb.y[0]), Math.max(0, bb.y[1])]
  }
  const pad = Math.max(1, 0.15 * Math.max(bb.x[1] - bb.x[0], bb.y[1] - bb.y[0]))
  return { x: [bb.x[0] - pad, bb.x[1] + pad], y: [bb.y[0] - pad, bb.y[1] + pad] }
}

/**
 * Which corner the readout box should sit in: the one whose box (about 48% × 34% of the view)
 * covers the least of R's bounding box.
 */
function readoutCorner(view, edge) {
  const bb = bbox(edge)
  const W = (view.x[1] - view.x[0]) * 0.48
  const H = (view.y[1] - view.y[0]) * 0.34
  const ov = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
  const options = [
    ['', view.x[0], view.y[1] - H],
    ['right', view.x[1] - W, view.y[1] - H],
    ['bottom', view.x[0], view.y[0]],
    ['bottom right', view.x[1] - W, view.y[0]],
  ]
  let best = options[0]
  let bestA = Infinity
  for (const o of options) {
    const A = ov(o[1], o[1] + W, bb.x[0], bb.x[1]) * ov(o[2], o[2] + H, bb.y[0], bb.y[1])
    if (A < bestA - 1e-9) (best = o), (bestA = A)
  }
  return best[0]
}

const polyD = (s, pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${s.x(p[0]).toFixed(1)},${s.y(p[1]).toFixed(1)}`).join('') + 'Z'

/* ------------------------------------------------------------------ region + wedges */

function BoundsMode({ cfg, mode, examples, exampleIndex, onExample, onCustom }) {
  const own = !!cfg.isCustom
  const lastF = useRef(null)
  const fNow = useMemo(() => compileIntegrand(cfg.f ?? '1'), [cfg.f])
  if (fNow.ok) lastF.current = fNow
  const F = lastF.current
  const last = useRef(null)
  const cbNow = useMemo(() => compileBounds(cfg.bounds), [JSON.stringify(cfg.bounds)]) // eslint-disable-line react-hooks/exhaustive-deps
  if (cbNow.ok) last.current = { cb: cbNow, B: cfg.bounds }
  const cb = last.current?.cb
  const B = last.current?.B

  const edge = useMemo(() => (cb ? boundary(cb) : []), [cb])
  const view = useMemo(() => (edge.length ? viewOf(edge, cb.polar) : { x: [-5, 5], y: [-5, 5] }), [edge, cb])
  const exact = useMemo(() => (cb && F ? iterated(cb, F) : NaN), [cb, F])

  const [u, setU] = useState(0.5) // slice position as a fraction of [a, b]
  const [n, setN] = useState(cfg.pieces ?? 6)
  const [shade, setShade] = useState(true)
  const W = useMemo(() => (mode === 'wedges' && cb && F ? wedgeSum(cb, F, n) : null), [mode, cb, F, n])
  const vmax = useMemo(() => (W ? Math.max(...W.wedges.map((w) => Math.abs(w.v)), 0) : 0), [W])
  const [pick, setPick] = useState(null)

  const custom = (
    <>
      <FormulaInput label="f" prefix="f = " vars={['x', 'y', 'r', 'theta']} value={cfg.f ?? '1'} onChange={(v) => onCustom({ f: v })} onCompiled={() => {}} />
      <BoundsInputs bounds={cfg.bounds} polar={['drdt', 'dtdr'].includes(cfg.bounds.order)} onChange={(b) => onCustom({ bounds: b })} />
      {!cbNow.ok && <div className="error-msg">{cbNow.error}</div>}
    </>
  )
  const ownLabel = mode === 'wedges' ? 'Your own f and region…' : 'Your own region…'

  if (!cb) {
    return (
      <div className="explorer">
        <div className="stage" />
        <Panel {...{ cfg, examples, exampleIndex, onExample, ownLabel, custom }} />
      </div>
    )
  }

  const ovar = { dydx: 'x', dxdy: 'y', drdt: '\\theta', dtdr: 'r' }[cb.order]
  const ivar = { dydx: 'y', dxdy: 'x', drdt: 'r', dtdr: '\\theta' }[cb.order]
  const s0 = cb.a + u * (cb.b - cb.a)
  const lo = cb.lo(s0)
  const hi = cb.hi(s0)
  const slice = []
  for (let k = 0; k <= 60; k++) slice.push(toXY(cb, s0, lo + ((hi - lo) * k) / 60))
  const sval = (v) => (cb.order === 'drdt' ? angleTex(v) : fmt(v, 2))
  const ival = (v) => (cb.order === 'dtdr' ? angleTex(v) : fmt(v, 2))

  // Wedges: the one under the handle is measured.
  const hp = pick ?? (W?.wedges.length ? toXY({ order: 'dtdr' }, W.wedges[Math.floor(W.wedges.length / 2)].rm, W.wedges[Math.floor(W.wedges.length / 2)].tm) : [0, 0])
  const sel = W?.wedges.find((w) => {
    const r = Math.hypot(hp[0], hp[1])
    let t = Math.atan2(hp[1], hp[0])
    while (t < w.t0) t += 2 * Math.PI
    while (t >= w.t0 + 2 * Math.PI) t -= 2 * Math.PI
    return r >= w.r0 && r <= w.r1 && t <= w.t1
  })

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={view.x} yr={view.y}>
            {(s) => (
              <>
                {mode === 'region' && <OuterGuides s={s} cb={cb} B={B} view={view} />}
                <path d={polyD(s, edge)} fill={mode === 'region' ? 'rgba(31,78,140,0.16)' : '#f3f5f8'} stroke={COLORS.path} strokeWidth={3} />
                {W &&
                  W.wedges.map((w, i) => (
                    <path
                      key={i}
                      d={polyD(s, wedgePts(w))}
                      fill={shade ? curlFill(w.v, vmax) : 'rgba(31,78,140,0.10)'}
                      stroke="#5b6b7c"
                      strokeWidth={1}
                    />
                  ))}
                {sel && <SelectedWedge s={s} w={sel} />}
                {mode === 'region' && (
                  <>
                    <path d={polyD(s, slice).slice(0, -1)} stroke={COLORS.F} strokeWidth={6} fill="none" strokeLinecap="round" />
                    <circle cx={s.x(slice[0][0])} cy={s.y(slice[0][1])} r={7} fill={COLORS.F} />
                    <circle cx={s.x(slice[60][0])} cy={s.y(slice[60][1])} r={7} fill={COLORS.F} />
                    <text x={s.x(slice[0][0]) + 10} y={s.y(slice[0][1]) + 24} className="vec-label small" fill={COLORS.F}>
                      {`${ivar.replace('\\theta', 'θ')} = ${pretty(B.inner[0])}`}
                    </text>
                    <text x={s.x(slice[60][0]) + 10} y={s.y(slice[60][1]) - 12} className="vec-label small" fill={COLORS.F}>
                      {`${ivar.replace('\\theta', 'θ')} = ${pretty(B.inner[1])}`}
                    </text>
                  </>
                )}
                {mode === 'wedges' && <Handle s={s} p={hp} onChange={setPick} color={COLORS.F} snap={0.05} />}
              </>
            )}
          </Plane2D>
          <div className={`plane-readout ${readoutCorner(view, edge)}`}>
            {mode === 'region' ? (
              <>
                <div className="result">
                  <Tex>{boundsTex(B, cb, F?.tex ?? '1')}</Tex>
                </div>
                <div className="result" style={{ color: COLORS.F }}>
                  <Tex>{`\\text{At } ${ovar} = ${sval(s0)}:\\; ${ivar} \\text{ goes from } ${ival(lo)} \\text{ to } ${ival(hi)}`}</Tex>
                </div>
                {Number.isFinite(exact) && (
                  <div className="help">
                    <Tex>{`\\text{Value: } ${fmt(exact)}`}</Tex>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="result big-result">
                  <Tex>{`\\sum f(r_i, \\theta_j)\\, r_i\\, \\Delta r\\, \\Delta\\theta = ${fmt(W?.sum ?? NaN)}`}</Tex>
                </div>
                <div className="result" style={{ color: COLORS.path }}>
                  <Tex>{`\\iint_R f\\, dA = ${fmt(exact)}`}</Tex>
                </div>
                {sel && <WedgeNumbers w={sel} dr={W.dr} dt={W.dt} />}
              </>
            )}
          </div>
          {mode === 'wedges' && <div className="viewer-hint">Drag the orange point to measure a wedge</div>}
        </div>
      </div>

      <Panel {...{ cfg, examples, exampleIndex, onExample, ownLabel, custom }}>
        {mode === 'wedges' && (
          <div className="current-f bounds-f">
            <Tex>{boundsTex(B, cb, F?.tex ?? '1')}</Tex>
          </div>
        )}
        {mode === 'region' && (
          <Slider
            label={`Slice at ${ovar.replace('\\theta', 'θ')} =`}
            value={u}
            min={0}
            max={1}
            step={0.005}
            onChange={setU}
            format={() => (cb.order === 'drdt' ? `${fmt(s0, 2)} rad` : fmt(s0, 2))}
          />
        )}
        {mode === 'wedges' && (
          <>
            <Slider label="Pieces in r and in θ" value={n} min={1} max={24} step={1} onChange={setN} />
            <div className="toggles">
              <Toggle label="Shade by f (red +, blue −)" checked={shade} onChange={setShade} />
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

/** Dashed lines (or rays, or circles) at the outer limits, labeled. */
function OuterGuides({ s, cb, B, view }) {
  const lab = { dydx: 'x', dxdy: 'y', drdt: 'θ', dtdr: 'r' }[cb.order]
  const style = { stroke: '#5b6b7c', strokeWidth: 2, strokeDasharray: '8 6', fill: 'none' }
  return [0, 1].map((k) => {
    const v = k ? cb.b : cb.a
    const txt = `${lab} = ${pretty(B.outer[k])}`
    if (cb.order === 'dydx')
      return (
        <g key={k}>
          <line x1={s.x(v)} x2={s.x(v)} y1={s.y(view.y[0])} y2={s.y(view.y[1])} {...style} />
          <text x={s.x(v) + 6} y={s.y(view.y[1]) + 20} className="vec-label small" fill="#5b6b7c">
            {txt}
          </text>
        </g>
      )
    if (cb.order === 'dxdy')
      return (
        <g key={k}>
          <line y1={s.y(v)} y2={s.y(v)} x1={s.x(view.x[0])} x2={s.x(view.x[1])} {...style} />
          <text x={s.x(view.x[0]) + 6} y={s.y(v) - 6} className="vec-label small" fill="#5b6b7c">
            {txt}
          </text>
        </g>
      )
    if (cb.order === 'drdt') {
      const R = Math.hypot(view.x[1] - view.x[0], view.y[1] - view.y[0])
      const e = [R * Math.cos(v), R * Math.sin(v)]
      const t = [0.8 * (view.x[1] - view.x[0]) * 0.5 * Math.cos(v), 0.8 * (view.y[1] - view.y[0]) * 0.5 * Math.sin(v)]
      return (
        <g key={k}>
          <line x1={s.x(0)} y1={s.y(0)} x2={s.x(e[0])} y2={s.y(e[1])} {...style} />
          <text x={s.x(t[0]) + 6} y={s.y(t[1]) - 6} className="vec-label small" fill="#5b6b7c">
            {txt}
          </text>
        </g>
      )
    }
    return (
      <g key={k}>
        <circle cx={s.x(0)} cy={s.y(0)} r={Math.abs(v) * s.unit} {...style} />
        <text x={s.x(v * 0.71) + 4} y={s.y(v * 0.71) - 4} className="vec-label small" fill="#5b6b7c">
          {txt}
        </text>
      </g>
    )
  })
}

function wedgePts(w, k = 10) {
  const pts = []
  for (let i = 0; i <= k; i++) {
    const t = w.t0 + ((w.t1 - w.t0) * i) / k
    pts.push([w.r0 * Math.cos(t), w.r0 * Math.sin(t)])
  }
  for (let i = k; i >= 0; i--) {
    const t = w.t0 + ((w.t1 - w.t0) * i) / k
    pts.push([w.r1 * Math.cos(t), w.r1 * Math.sin(t)])
  }
  return pts
}

/** The measured wedge: thick outline, Δr on its radial side, rΔθ on its middle arc. */
function SelectedWedge({ s, w }) {
  const mid = []
  for (let i = 0; i <= 20; i++) {
    const t = w.t0 + ((w.t1 - w.t0) * i) / 20
    mid.push([w.rm * Math.cos(t), w.rm * Math.sin(t)])
  }
  const side = [w.r1 * Math.cos(w.t0), w.r1 * Math.sin(w.t0)]
  const side0 = [w.r0 * Math.cos(w.t0), w.r0 * Math.sin(w.t0)]
  const sm = [(side[0] + side0[0]) / 2, (side[1] + side0[1]) / 2]
  const am = [w.rm * Math.cos(w.tm), w.rm * Math.sin(w.tm)]
  const out = [Math.cos(w.tm), Math.sin(w.tm)]
  return (
    <g pointerEvents="none">
      <path d={polyD(s, wedgePts(w, 20))} fill="rgba(228,87,46,0.25)" stroke={COLORS.F} strokeWidth={4} />
      <path d={polyD(s, mid).slice(0, -1)} stroke={COLORS.pathB} strokeWidth={3} fill="none" strokeDasharray="6 4" />
      <line x1={s.x(side0[0])} y1={s.y(side0[1])} x2={s.x(side[0])} y2={s.y(side[1])} stroke={COLORS.path} strokeWidth={5} />
      <text x={s.x(sm[0]) + 8 * Math.sin(w.t0)} y={s.y(sm[1]) + 22 * Math.cos(w.t0)} className="vec-label" fill={COLORS.path} textAnchor="middle">
        Δr
      </text>
      <text x={s.x(am[0]) + out[0] * 40} y={s.y(am[1]) - out[1] * 40 + 8} className="vec-label" fill={COLORS.pathB} textAnchor="middle">
        rΔθ
      </text>
    </g>
  )
}

function WedgeNumbers({ w, dr, dt }) {
  const area = ((w.r1 * w.r1 - w.r0 * w.r0) * dt) / 2
  const sig = (v) => (Math.abs(v) < 1 ? String(Number(v.toPrecision(3))) : fmt(v, 3))
  return (
    <div className="wedge-numbers">
      <div className="help">Orange wedge (r = {fmt(w.rm, 2)} at its middle):</div>
      <div className="result">
        <Tex>{`\\text{area} = ${sig(area)}`}</Tex>
      </div>
      <div className="result" style={{ color: '#2a9d3c' }}>
        <Tex>{`\\Delta r \\cdot r\\Delta\\theta = ${sig(dr)} \\cdot ${sig(w.rm * dt)} = ${sig(dr * w.rm * dt)}`}</Tex>
      </div>
      <div className="result" style={{ color: '#d62839' }}>
        <Tex>{`\\Delta r \\cdot \\Delta\\theta = ${sig(dr)} \\cdot ${sig(dt)} = ${sig(dr * dt)} \\;\\text{(off by a factor of } r)`}</Tex>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ coords (Topic 16, #1) */

function CoordsMode({ cfg, examples, exampleIndex, onExample, onCustom }) {
  const own = !!cfg.isCustom
  const start0 = cfg.point ?? (cfg.polarPoint ? [cfg.polarPoint[0] * Math.cos(cfg.polarPoint[1]), cfg.polarPoint[0] * Math.sin(cfg.polarPoint[1])] : [6, 8])
  const start = start0.map((v) => (Math.abs(v) < 1e-9 ? 0 : v)) // cos(3π/2) is −1.8e-16, not 0
  const [pl, setPl] = useState(start)
  const p = own ? cfg.point ?? start : pl
  const setP = own ? (v) => onCustom({ point: v }) : setPl
  const [grid, setGrid] = useState(true)
  const xr = cfg.x ?? [-11, 11]
  const yr = cfg.y ?? [-11, 11]
  const r = Math.hypot(p[0], p[1])
  let t = Math.atan2(p[1], p[0])
  if (t < 0) t += 2 * Math.PI
  const deg = (t * 180) / Math.PI
  const arcR = Math.min(2, r * 0.4) || 1
  const arc = []
  for (let i = 0; i <= 40; i++) arc.push([arcR * Math.cos((t * i) / 40), arcR * Math.sin((t * i) / 40)])
  const am = [arcR * 1.35 * Math.cos(t / 2), arcR * 1.35 * Math.sin(t / 2)]
  const maxR = Math.ceil(Math.hypot(Math.max(...xr.map(Math.abs)), Math.max(...yr.map(Math.abs))))
  const step = maxR > 12 ? 5 : 2

  const custom = (
    <>
      <PairInput label="(x, y)" value={p} onChange={setP} />
      <div className="control">
        <span className="control-row">(r, θ), θ in radians</span>
        <div className="two-nums">
          <NumBox label="r" value={r} onChange={(v) => setP([v * Math.cos(t), v * Math.sin(t)])} />
          <NumBox label="θ" value={t} onChange={(v) => setP([r * Math.cos(v), r * Math.sin(v)])} />
        </div>
      </div>
    </>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>
            {(s) => (
              <>
                {grid && (
                  <g stroke="#b9c4d0" strokeWidth={1.2} fill="none">
                    {Array.from({ length: Math.floor(maxR / step) }, (_, i) => (
                      <circle key={i} cx={s.x(0)} cy={s.y(0)} r={(i + 1) * step * s.unit} />
                    ))}
                    {Array.from({ length: 12 }, (_, i) => {
                      const a = (i * Math.PI) / 6
                      return <line key={`r${i}`} x1={s.x(0)} y1={s.y(0)} x2={s.x(maxR * Math.cos(a))} y2={s.y(maxR * Math.sin(a))} />
                    })}
                  </g>
                )}
                <line x1={s.x(p[0])} y1={s.y(p[1])} x2={s.x(p[0])} y2={s.y(0)} stroke="#d62728" strokeWidth={2.5} strokeDasharray="6 5" />
                <line x1={s.x(0)} y1={s.y(p[1])} x2={s.x(p[0])} y2={s.y(p[1])} stroke="#2ca02c" strokeWidth={2.5} strokeDasharray="6 5" />
                <path d={polyD(s, arc).slice(0, -1)} stroke={COLORS.F} strokeWidth={4} fill="none" />
                <text x={s.x(am[0])} y={s.y(am[1]) + 6} className="vec-label" fill={COLORS.F} textAnchor="middle">
                  θ
                </text>
                <Arrow s={s} from={[0, 0]} to={p} color={COLORS.path} width={5} label="r" labelSide={-1} />
                <Handle s={s} p={p} onChange={setP} color={COLORS.path} snap={0.5} />
              </>
            )}
          </Plane2D>
          <div className="plane-readout">
            <div className="result big-result">
              <Tex>{`(x, y) = (${fmt(p[0], 2)},\\, ${fmt(p[1], 2)})`}</Tex>
            </div>
            <div className="result big-result" style={{ color: COLORS.path }}>
              <Tex>{`(r, \\theta) = \\left(${fmt(r, 3)},\\, ${angleTex(t)}\\right)`}</Tex>
            </div>
            <div className="help">
              θ = {fmt(t, 3)} radians ({fmt(deg, 1)}°)
            </div>
            <div className="result">
              <Tex>{`r = \\sqrt{x^2 + y^2},\\quad \\tan\\theta = \\tfrac{y}{x},\\quad x = r\\cos\\theta,\\quad y = r\\sin\\theta`}</Tex>
            </div>
          </div>
          <div className="viewer-hint">Drag the point</div>
        </div>
      </div>
      <Panel {...{ cfg, examples, exampleIndex, onExample, custom }} ownLabel="Your own point…">
        <div className="toggles">
          <Toggle label="Polar grid (circles and rays)" checked={grid} onChange={setGrid} />
        </div>
      </Panel>
    </div>
  )
}
