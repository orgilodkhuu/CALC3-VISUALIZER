import { useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, PairInput } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { fmt } from '../lib/formula.js'

// Same colors everywhere: v blue, w orange, results purple.
const CV = '#1f6fd1'
const CW = '#e4572e'
const CR = '#7b3fe4'
const GRAY = '#8a939c'

const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const mul = (c, a) => [c * a[0], c * a[1]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const len = (a) => Math.hypot(a[0], a[1])
const P = (a) => `(${fmt(a[0], 2)}, ${fmt(a[1], 2)})`
const T = (a) => `(${fmt(a[0], 2)},\\, ${fmt(a[1], 2)})`

/**
 * 2D vectors you drag by their tips. One scene, three modes (config `mode`):
 *   'ops'     c·v, v + w, w − v       (Topic 5)
 *   'length'  ‖v‖ and unit vectors     (Topic 5)
 *   'dot'     dot product as component × length (Topic 6, worksheet definition)
 * Config: x, y (visible range), v, w, op ('scale' | 'sum' | 'diff'), c, caption.
 */
export default function VectorsScene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  // "Your own": v and w live in the tab's store, so typed or dragged values are kept.
  const [vl, setVl] = useState(cfg.v ?? [3, 2])
  const [wl, setWl] = useState(cfg.w ?? [1, 3])
  const own = !!cfg.isCustom
  const v = own ? cfg.v ?? [3, 2] : vl
  const w = own ? cfg.w ?? [1, 3] : wl
  const setV = own ? (x) => onCustom({ v: x }) : setVl
  const setW = own ? (x) => onCustom({ w: x }) : setWl
  const [op, setOp] = useState(cfg.op ?? 'sum')
  const [c, setC] = useState(cfg.c ?? 2)
  const [L, setL] = useState(1)
  const [math, setMath] = useState(false)
  const xr = cfg.x ?? [-6, 6]
  const yr = cfg.y ?? [-6, 6]
  const mode = cfg.mode ?? 'ops'

  let readout = null
  let draw = null

  if (mode === 'ops') {
    const r = op === 'scale' ? mul(c, v) : op === 'sum' ? add(v, w) : sub(w, v)
    draw = (s) => (
      <>
        {op === 'sum' && (
          <>
            {/* tip-to-tail: w starting at the tip of v (and v at the tip of w) */}
            <Arrow s={s} from={v} to={add(v, w)} color={CW} width={3} dashed opacity={0.75} />
            <Arrow s={s} from={w} to={add(v, w)} color={CV} width={3} dashed opacity={0.75} />
          </>
        )}
        {op === 'diff' && <Arrow s={s} from={[0, 0]} to={r} color={CR} width={3} dashed opacity={0.55} />}
        {op !== 'scale' && <Arrow s={s} from={[0, 0]} to={w} color={CW} label="w" />}
        <Arrow s={s} from={[0, 0]} to={v} color={CV} label="v" labelSide={-1} />
        {op === 'scale' && <Arrow s={s} from={[0, 0]} to={r} color={CR} width={6} label={`${fmt(c, 2)}v`} opacity={0.85} />}
        {op === 'sum' && <Arrow s={s} from={[0, 0]} to={r} color={CR} width={6} label="v + w" />}
        {op === 'diff' && <Arrow s={s} from={v} to={w} color={CR} width={6} label="w − v" />}
        <Handle s={s} p={v} onChange={setV} color={CV} />
        {op !== 'scale' && <Handle s={s} p={w} onChange={setW} color={CW} />}
      </>
    )
    readout = (
      <>
        <div style={{ color: CV }}>
          <Tex>{`\\vec v = ${T(v)}`}</Tex>
        </div>
        {op !== 'scale' && (
          <div style={{ color: CW }}>
            <Tex>{`\\vec w = ${T(w)}`}</Tex>
          </div>
        )}
        <div className="result" style={{ color: CR }}>
          {op === 'scale' && <Tex>{`${fmt(c, 2)}\\vec v = ${fmt(c, 2)}${T(v)} = ${T(r)}`}</Tex>}
          {op === 'sum' && <Tex>{`\\vec v + \\vec w = ${T(r)}`}</Tex>}
          {op === 'diff' && <Tex>{`\\vec w - \\vec v = ${T(r)}`}</Tex>}
        </div>
      </>
    )
  }

  if (mode === 'length') {
    const n = len(v)
    const u = n > 0 ? mul(1 / n, v) : [0, 0]
    draw = (s) => (
      <>
        <circle cx={s.x(0)} cy={s.y(0)} r={s.unit} fill="none" stroke={GRAY} strokeWidth="2" strokeDasharray="6 5" />
        {/* the right triangle: v1 along x, then v2 along y */}
        <line x1={s.x(0)} y1={s.y(0)} x2={s.x(v[0])} y2={s.y(0)} stroke="#d62728" strokeWidth="4" />
        <line x1={s.x(v[0])} y1={s.y(0)} x2={s.x(v[0])} y2={s.y(v[1])} stroke="#2a9d3c" strokeWidth="4" />
        <text x={s.x(v[0] / 2)} y={s.y(0) + (v[1] >= 0 ? 26 : -12)} textAnchor="middle" className="vec-label small" fill="#d62728">
          {fmt(v[0], 2)}
        </text>
        <text x={s.x(v[0]) + (v[0] >= 0 ? 10 : -10)} y={s.y(v[1] / 2) + 6} textAnchor={v[0] >= 0 ? 'start' : 'end'} className="vec-label small" fill="#2a9d3c">
          {fmt(v[1], 2)}
        </text>
        <Arrow s={s} from={[0, 0]} to={v} color={CV} label="v" labelSide={v[0] * v[1] >= 0 ? 1 : -1} />
        {n > 0 && <Arrow s={s} from={[0, 0]} to={mul(L, u)} color={CR} width={6} head={14} />}
        <Handle s={s} p={v} onChange={setV} color={CV} />
      </>
    )
    readout = (
      <>
        <div style={{ color: CV }}>
          <Tex>{`\\|\\vec v\\| = \\sqrt{${sq(v[0])} + ${sq(v[1])}} = ${fmt(n)}`}</Tex>
        </div>
        <div className="result" style={{ color: CR }}>
          {L === 1 ? (
            <Tex>{`\\text{unit vector } \\frac{\\vec v}{\\|\\vec v\\|} = ${T(u)}`}</Tex>
          ) : (
            <Tex>{`${fmt(L, 2)}\\,\\frac{\\vec v}{\\|\\vec v\\|} = ${T(mul(L, u))}`}</Tex>
          )}
        </div>
      </>
    )
  }

  if (mode === 'dot') {
    const d = dot(v, w)
    const nw = len(w)
    const nv = len(v)
    const comp = nw > 0 ? d / nw : NaN // signed length of v along w
    const proj = nw > 0 ? mul(d / (nw * nw), w) : [0, 0]
    const theta = nv > 0 && nw > 0 ? (Math.acos(Math.max(-1, Math.min(1, d / (nv * nw)))) * 180) / Math.PI : NaN
    draw = (s) => {
      // the line through w, extended across the screen
      const far = nw > 0 ? mul(40 / nw, w) : [0, 0]
      const a1 = Math.atan2(v[1], v[0])
      const a2 = Math.atan2(w[1], w[0])
      let da = a2 - a1
      while (da > Math.PI) da -= 2 * Math.PI
      while (da < -Math.PI) da += 2 * Math.PI
      const R = 1.1 * s.unit
      const arc = `M${s.x(0) + R * Math.cos(a1)},${s.y(0) - R * Math.sin(a1)} A${R},${R} 0 0 ${da > 0 ? 0 : 1} ${s.x(0) + R * Math.cos(a2)},${s.y(0) - R * Math.sin(a2)}`
      const mid = a1 + da / 2
      return (
        <>
          <line x1={s.x(-far[0])} y1={s.y(-far[1])} x2={s.x(far[0])} y2={s.y(far[1])} stroke="#c9ced4" strokeWidth="2" strokeDasharray="4 6" />
          {Number.isFinite(theta) && (
            <>
              <path d={arc} fill="none" stroke={GRAY} strokeWidth="2" />
              <text x={s.x(0) + (R + 18) * Math.cos(mid)} y={s.y(0) - (R + 18) * Math.sin(mid) + 6} textAnchor="middle" className="vec-label small" fill="#555">
                θ = {Math.round(theta)}°
              </text>
            </>
          )}
          {/* drop from the tip of v straight onto the line of w */}
          <line x1={s.x(v[0])} y1={s.y(v[1])} x2={s.x(proj[0])} y2={s.y(proj[1])} stroke={GRAY} strokeWidth="2.5" strokeDasharray="7 5" />
          <Arrow s={s} from={[0, 0]} to={w} color={CW} label="w" />
          <Arrow s={s} from={[0, 0]} to={v} color={CV} label="v" labelSide={-1} />
          <Arrow s={s} from={[0, 0]} to={proj} color={CR} width={7} head={14} label={d >= 0 ? 'v_w' : 'v_−w'} labelSide={-1} />
          <Handle s={s} p={v} onChange={setV} color={CV} />
          <Handle s={s} p={w} onChange={setW} color={CW} />
        </>
      )
    }
    const sign = Math.abs(d) < 1e-9 ? 'zero' : d > 0 ? 'pos' : 'neg'
    readout = (
      <>
        <div className="result big-result">
          <Tex>{`\\vec v \\cdot \\vec w = ${fmt(d)}`}</Tex>{' '}
          <span className={`sign sign-${sign}`}>{sign === 'pos' ? '+' : sign === 'neg' ? '−' : '0'}</span>
        </div>
        <div style={{ color: CR }}>
          <Tex>
            {d >= 0
              ? `= \\|\\vec v_{\\vec w}\\|\\,\\|\\vec w\\| = (${fmt(Math.abs(comp))})(${fmt(nw)})`
              : `= -\\|\\vec v_{-\\vec w}\\|\\,\\|\\vec w\\| = -(${fmt(Math.abs(comp))})(${fmt(nw)})`}
          </Tex>
        </div>
        {math && (
          <div className="math-block">
            <div>
              <Tex>{`= v_1w_1 + v_2w_2 = (${fmt(v[0])})(${fmt(w[0])}) + (${fmt(v[1])})(${fmt(w[1])})`}</Tex>
            </div>
            <div>
              <Tex>{`= \\|\\vec v\\|\\,\\|\\vec w\\|\\cos\\theta = (${fmt(nv)})(${fmt(nw)})\\cos ${Math.round(theta)}^\\circ`}</Tex>
            </div>
            <div>
              <Tex>{`\\vec v_{\\vec w} = ${T(proj)}, \\quad \\vec v_{\\perp \\vec w} = ${T(sub(v, proj))}`}</Tex>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>{(s) => draw(s)}</Plane2D>
          <div className="plane-readout">{readout}</div>
          <div className="viewer-hint">Drag the arrow tips</div>
        </div>
      </div>
      <aside className="panel">
        {cfg.caption && (
          <p className="caption">
            <RichText>{cfg.caption}</RichText>
          </p>
        )}
        <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel="Your own vectors…" />
        {own && (
          <CustomBox>
            <PairInput label="v" value={v} onChange={setV} />
            {mode !== 'length' && <PairInput label="w" value={w} onChange={setW} />}
          </CustomBox>
        )}

        {mode === 'ops' && (
          <>
            <div className="chip-row show-row">
              {[
                ['scale', 'c · v'],
                ['sum', 'v + w'],
                ['diff', 'w − v'],
              ].map(([k, label]) => (
                <button key={k} className={`chip ${op === k ? 'on' : ''}`} onClick={() => setOp(k)}>
                  {label}
                </button>
              ))}
            </div>
            {op === 'scale' && <Slider label="Scalar c" value={c} min={-3} max={3} step={0.25} onChange={setC} format={(x) => fmt(x, 2)} />}
          </>
        )}
        {mode === 'length' && (
          <Slider label="Stretch the unit vector to length" value={L} min={0} max={6} step={0.5} onChange={setL} format={(x) => fmt(x, 2)} />
        )}

        <div className="coords">
          <span style={{ color: CV }}>v = {P(v)}</span>
          {mode !== 'length' && !(mode === 'ops' && op === 'scale') && <span style={{ color: CW }}>w = {P(w)}</span>}
        </div>

        {mode === 'dot' && (
          <details className="more">
            <summary>More</summary>
            <div className="toggles">
              <Toggle label="Show the math (other formulas for v · w)" checked={math} onChange={setMath} />
            </div>
          </details>
        )}
      </aside>
    </div>
  )
}

const sq = (c) => (c < 0 ? `(${fmt(c)})^2` : `${fmt(c)}^2`)
