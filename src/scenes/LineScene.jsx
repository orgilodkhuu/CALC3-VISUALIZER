import { useMemo, useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { FormulaInput, Slider, Toggle } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { COLORS, useField, useFieldGrid, FieldArrows, PathLine, PathDirection, signColor } from '../components/FieldLayer.jsx'
import { compileFormula, fmt } from '../lib/formula.js'
import { makePath, samplePath, riemann, lineIntegral } from '../lib/paths.js'
import { contourSegments, autoLevels } from '../lib/contours.js'
import { autoZRange } from '../lib/view.js'

/**
 * Paths through a vector field (Topics 9 and 10). Config fields (examples override any):
 *   mode: 'sum'     her Riemann sum Σ F(r_i)·Δr_i on a path, n pieces, vs the exact ∫_C F·dr
 *         'param'   a point moving along r(t) (no field): t slider, r(t), dr/dt
 *         'ftc'     F = ∇f with level curves; ∫_C ∇f·dr next to f(Q) − f(P) for any path
 *         'compare' path A (straight) and path B (bendable) from P to Q: same integral or not?
 *   F: ['-y', 'x'], x, y (visible range), grid (arrow spacing),
 *   paths: [pathSpec, ...] (see lib/paths.js; a 'spline' path gets drag handles), pieces (n),
 *   potential: 'x + y^3' (ftc), P, Q, M (compare: start, end, bend point), caption.
 */
export default function LineScene({ problem, examples, exampleIndex = 0, onExample }) {
  const cfg = problem
  const mode = cfg.mode ?? 'sum'
  const xr = cfg.x ?? [-3.5, 3.5]
  const yr = cfg.y ?? [-3.5, 3.5]
  const step = cfg.grid ?? 1

  const field = useField(cfg.F ?? ['0', '0'])
  const grid = useFieldGrid(mode === 'param' ? null : field.F, xr, yr, step)
  const [scale, setScale] = useState(null)
  const k = scale ?? grid.auto

  // ---- Paths: the example's list, plus "your own r(t)" typed under More.
  const specs = cfg.paths ?? []
  const [pathIdx, setPathIdx] = useState(0)
  const [drag, setDrag] = useState(() => specs.map((sp) => (sp.type === 'spline' ? sp.pts : null)))
  const [own, setOwn] = useState({ x: 't', y: 't^2', t0: -2, t1: 2 })
  const spec =
    pathIdx === 'own'
      ? { type: 'param', x: own.x, y: own.y, t: [own.t0, own.t1] }
      : specs[pathIdx]?.type === 'spline'
        ? { ...specs[pathIdx], pts: drag[pathIdx] }
        : specs[pathIdx]
  const path = useMemo(() => makePath(spec), [JSON.stringify(spec)]) // eslint-disable-line react-hooks/exhaustive-deps
  const pathOk = path && !path.error
  const pts = useMemo(() => (pathOk ? samplePath(path, 400) : []), [path, pathOk])
  const setDragPt = (j, p) =>
    setDrag((d) => d.map((arr, i) => (i === pathIdx ? arr.map((q, jj) => (jj === j ? p : q)) : arr)))

  // Mode state lives here so the stage and the panel share it.
  const [n, setN] = useState(cfg.pieces ?? 6)
  const [showF, setShowF] = useState(true)
  const [table, setTable] = useState(false)
  const [u, setU] = useState(cfg.u ?? 0.35)
  const [showLevels, setShowLevels] = useState(true)
  const st = { n, showF, table, u, showLevels }
  const R = useMemo(
    () => (mode === 'sum' && pathOk && field.F ? riemann(field.F, path, n) : null),
    [mode, path, pathOk, field.F, n],
  )

  return (
    <div className="explorer">
      {mode === 'sum' && <SumMode {...{ st, R, field, grid, k, xr, yr, path, pathOk, pts, spec, setDragPt }} />}
      {mode === 'param' && <ParamMode {...{ st, xr, yr, path, pathOk, pts }} />}
      {mode === 'ftc' && <FtcMode {...{ st, cfg, field, grid, k, xr, yr, path, pathOk, pts, spec, setDragPt }} />}
      {mode === 'compare' && <CompareMode {...{ cfg, field, grid, k, xr, yr }} />}

      <aside className="panel">
        {cfg.caption && (
          <p className="caption">
            <RichText>{cfg.caption}</RichText>
          </p>
        )}
        {examples && examples.length > 1 && (
          <label className="control">
            <span className="control-row">Example</span>
            <select value={exampleIndex} onChange={(e) => onExample(Number(e.target.value))}>
              {examples.map((ex, i) => (
                <option key={i} value={i}>
                  {ex.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {mode !== 'param' && (
          <div className="current-f">
            <Tex>{field.tex}</Tex>
          </div>
        )}
        {mode !== 'compare' && specs.length > 1 && (
          <label className="control">
            <span className="control-row">Path C</span>
            <select value={pathIdx} onChange={(e) => setPathIdx(e.target.value === 'own' ? 'own' : Number(e.target.value))}>
              {specs.map((sp, i) => (
                <option key={i} value={i}>
                  {sp.name ?? `Path ${i + 1}`}
                </option>
              ))}
              {pathIdx === 'own' && <option value="own">Your own r(t)</option>}
            </select>
          </label>
        )}
        {pathOk && path.tex && mode !== 'compare' && (
          <div className="current-f path-f">
            <Tex>{path.tex}</Tex>
            <Tex>{`${texNum(path.t0)} \\le t \\le ${texNum(path.t1)}`}</Tex>
          </div>
        )}

        {mode === 'sum' && (
          <>
            <Slider label="Pieces n" value={n} min={1} max={40} step={1} onChange={setN} />
            <div className="toggles">
              <Toggle label="F at each point rᵢ" checked={showF} onChange={setShowF} />
              <Toggle label="Table of rᵢ and Δrᵢ" checked={table} onChange={setTable} />
            </div>
            {table && R && <PieceTable R={R} />}
          </>
        )}
        {mode === 'param' && pathOk && (
          <Slider
            label="Move along the path: t"
            value={u}
            min={0}
            max={1}
            step={0.005}
            onChange={setU}
            format={(v) => fmt(path.t0 + v * (path.t1 - path.t0), 2)}
          />
        )}
        {mode === 'ftc' && cfg.potential && !field.custom && (
          <div className="toggles">
            <Toggle label="Level curves of f" checked={showLevels} onChange={setShowLevels} />
          </div>
        )}

        <details className="more">
          <summary>More</summary>
          {mode !== 'param' && (
            <Slider label="Arrow length (× true length)" value={k} min={0.01} max={1} step={0.01} onChange={setScale} format={(x) => fmt(x, 2)} />
          )}
          {mode !== 'compare' && (
            <>
              <FormulaInput
                label="Type your own path: x(t)"
                prefix="x(t) = "
                vars={['t']}
                value={own.x}
                onChange={(v) => {
                  setOwn((o) => ({ ...o, x: v }))
                  setPathIdx('own')
                }}
                onCompiled={() => {}}
              />
              <FormulaInput
                label="y(t)"
                prefix="y(t) = "
                vars={['t']}
                value={own.y}
                onChange={(v) => {
                  setOwn((o) => ({ ...o, y: v }))
                  setPathIdx('own')
                }}
                onCompiled={() => {}}
              />
              <div className="control-row two-nums">
                <NumBox label="t from" value={own.t0} onChange={(v) => (setOwn((o) => ({ ...o, t0: v })), setPathIdx('own'))} />
                <NumBox label="to" value={own.t1} onChange={(v) => (setOwn((o) => ({ ...o, t1: v })), setPathIdx('own'))} />
              </div>
            </>
          )}
          {mode !== 'param' && field.inputs}
        </details>
      </aside>
    </div>
  )
}

const texNum = (v) => {
  const m = v / Math.PI
  if (Math.abs(v) > 1e-9 && Math.abs(m * 4 - Math.round(m * 4)) < 1e-9) {
    const q = Math.round(m * 4) // quarters of π
    const g = q % 4 === 0 ? 4 : q % 2 === 0 ? 2 : 1
    const num = q / g
    const den = 4 / g
    const top = num === 1 ? '\\pi' : num === -1 ? '-\\pi' : `${num}\\pi`
    return den === 1 ? top : `${num < 0 ? '-' : ''}\\tfrac{${Math.abs(num) === 1 ? '' : Math.abs(num)}\\pi}{${den}}`
  }
  return fmt(v, 3)
}

function NumBox({ label, value, onChange }) {
  const [text, setText] = useState(String(value))
  return (
    <label className="numbox">
      <span>{label}</span>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const r = compileFormula(e.target.value, [])
          if (r.ok && Number.isFinite(r.fn())) onChange(r.fn())
        }}
        spellCheck={false}
      />
    </label>
  )
}

/* ------------------------------------------------------------------ sum (Topic 9) */

function SumMode({ st, R, field, grid, k, xr, yr, path, pathOk, pts, spec, setDragPt }) {
  const { n, showF } = st
  const exact = useMemo(() => (pathOk && field.F ? lineIntegral(field.F, path) : NaN), [path, pathOk, field.F])
  const last = pathOk ? path.r(path.t1) : null

  return (
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>
            {(s) => (
              <>
                <FieldArrows s={s} grid={grid} k={k} opacity={0.45} />
                {pathOk && <PathLine s={s} pts={pts} color={COLORS.path} width={3} opacity={0.35} />}
                {R?.pieces.map((p, i) => (
                  <Arrow key={`d${i}`} s={s} from={p.a} to={p.b} color={signColor(p.dot)} width={6} head={16} />
                ))}
                {showF &&
                  R?.pieces.map((p, i) =>
                    p.F.every(Number.isFinite) ? (
                      <Arrow key={`f${i}`} s={s} from={p.a} to={[p.a[0] + p.F[0] * k, p.a[1] + p.F[1] * k]} color={COLORS.F} width={3.5} head={12} />
                    ) : null,
                  )}
                {R?.pieces.map((p, i) => (
                  <circle key={`p${i}`} cx={s.x(p.a[0])} cy={s.y(p.a[1])} r={5} fill="#222" />
                ))}
                {last && <circle cx={s.x(last[0])} cy={s.y(last[1])} r={5} fill="#222" />}
                {spec?.type === 'spline' && !spec.fixed &&
                  spec.pts.map((q, j) => <Handle key={j} s={s} p={q} onChange={(v) => setDragPt(j, v)} color={COLORS.path} snap={0.25} />)}
              </>
            )}
          </Plane2D>
          <div className="plane-readout">
            {R && (
              <div className="result big-result">
                <Tex>{`\\sum_{i=1}^{${n}} \\vec F(\\vec r_i)\\cdot\\Delta\\vec r_i = ${fmt(R.sum)}`}</Tex>
              </div>
            )}
            {Number.isFinite(exact) && (
              <div className="result">
                <Tex>{`\\int_C \\vec F\\cdot d\\vec r = ${fmt(exact)}`}</Tex>
              </div>
            )}
            {path?.error && <div className="error-msg">{path.error}</div>}
            <div className="legend">
              <span style={{ color: COLORS.plus }}>■ Δr adds (F · Δr &gt; 0)</span>
              <span style={{ color: COLORS.minus }}>■ subtracts (&lt; 0)</span>
              {showF && <span style={{ color: COLORS.F }}>■ F(rᵢ)</span>}
            </div>
          </div>
          {spec?.type === 'spline' && !spec.fixed && <div className="viewer-hint">Drag the blue points to change the path</div>}
        </div>
      </div>
  )
}

function PieceTable({ R }) {
  const rows = R.pieces.slice(0, 20)
  const pt = (p) => `(${fmt(p[0], 2)}, ${fmt(p[1], 2)})`
  return (
    <table className="piece-table">
      <thead>
        <tr>
          <th>i</th>
          <th>tᵢ</th>
          <th>rᵢ</th>
          <th>Δrᵢ</th>
          <th>F·Δr</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{fmt(p.t, 2)}</td>
            <td>{pt(p.a)}</td>
            <td>{pt(p.dr)}</td>
            <td style={{ color: signColor(p.dot) }}>{fmt(p.dot, 2)}</td>
          </tr>
        ))}
        {R.pieces.length > rows.length && (
          <tr>
            <td colSpan={5}>… {R.pieces.length - rows.length} more</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ param (Topic 9, sheet 4) */

function ParamMode({ st, xr, yr, path, pathOk, pts }) {
  const { u } = st // fraction of the way along [t0, t1]
  if (!pathOk) {
    return (
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>{() => null}</Plane2D>
          <div className="plane-readout">{path?.error && <div className="error-msg">{path.error}</div>}</div>
        </div>
      </div>
    )
  }
  const t = path.t0 + u * (path.t1 - path.t0)
  const p = path.r(t)
  const e = 1e-5 * (path.t1 - path.t0 || 1)
  const a = path.r(t - e)
  const b = path.r(t + e)
  const v = [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e)]
  // Long velocity arrows hide the path: shorten to a friendly fraction (1, ½, ¼, ⅒, …) and say so.
  const speed = Math.hypot(v[0], v[1])
  const vk = [1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01].find((c) => speed * c <= 1.6) ?? 0.01
  const traced = pts.slice(0, Math.round(u * (pts.length - 1)) + 1)
  const start = path.r(path.t0)
  const end = path.r(path.t1)
  return (
    <div className="stage">
      <div className="plane-stage">
        <Plane2D xr={xr} yr={yr}>
          {(s) => (
            <>
              <PathLine s={s} pts={pts} color={COLORS.path} width={3} dashed opacity={0.45} />
              <PathLine s={s} pts={traced} color={COLORS.path} width={6} />
              <PathDirection s={s} path={path} count={2} />
              <text x={s.x(start[0]) + 10} y={s.y(start[1]) + 22} className="vec-label small" fill="#222">
                start
              </text>
              <text x={s.x(end[0]) + 10} y={s.y(end[1]) - 12} className="vec-label small" fill="#222">
                end
              </text>
              <Arrow s={s} from={[0, 0]} to={p} color="#8a96a3" width={3} head={12} dashed />
              <Arrow s={s} from={p} to={[p[0] + v[0] * vk, p[1] + v[1] * vk]} color={COLORS.F} width={5} head={15} />
              <circle cx={s.x(p[0])} cy={s.y(p[1])} r={8} fill="#fff" stroke={COLORS.path} strokeWidth={3} />
            </>
          )}
        </Plane2D>
        <div className="plane-readout">
          <div className="result big-result">
            <Tex>{`t = ${fmt(t, 2)}:\\quad \\vec r(t) = (${fmt(p[0], 2)},\\, ${fmt(p[1], 2)})`}</Tex>
          </div>
          <div className="result" style={{ color: COLORS.F }}>
            <Tex>{`\\frac{d\\vec r}{dt} = (${fmt(v[0], 2)},\\, ${fmt(v[1], 2)})`}</Tex>
          </div>
          <div className="help">
            Orange: the direction of motion, dr/dt{vk < 1 ? ` (drawn at ${vk} × its length)` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
/* ------------------------------------------------------------------ ftc (Topic 10) */

function useLevels(potential, custom, xr, yr) {
  const pot = useMemo(() => (potential && !custom ? compileFormula(potential) : null), [potential, custom])
  const levels = useMemo(() => {
    if (!pot?.ok) return null
    const zr = autoZRange(pot.fn, xr, yr)
    const lv = autoLevels(zr, 8)
    return { lv, segs: contourSegments(pot.fn, xr, yr, lv, 160) }
  }, [pot, xr, yr])
  return { pot: pot?.ok ? pot : null, levels }
}

function Levels({ s, levels }) {
  return levels.segs.map((sg, i) => {
    let d = ''
    for (let j = 0; j < sg.length; j += 4) {
      d += `M${s.x(sg[j]).toFixed(1)},${s.y(sg[j + 1]).toFixed(1)}L${s.x(sg[j + 2]).toFixed(1)},${s.y(sg[j + 3]).toFixed(1)}`
    }
    return <path key={i} d={d} stroke={COLORS.level} strokeWidth="2" fill="none" opacity="0.6" />
  })
}

function PQ({ s, P, Q }) {
  return (
    <>
      <text x={s.x(P[0]) - 14} y={s.y(P[1]) - 14} className="vec-label" fill="#222" textAnchor="end">
        P
      </text>
      <text x={s.x(Q[0]) + 14} y={s.y(Q[1]) - 14} className="vec-label" fill="#222">
        Q
      </text>
    </>
  )
}

function FtcMode({ st, cfg, field, grid, k, xr, yr, path, pathOk, pts, spec, setDragPt }) {
  const { showLevels } = st
  const { pot, levels } = useLevels(cfg.potential, field.custom, xr, yr)
  const value = useMemo(() => (pathOk && field.F ? lineIntegral(field.F, path) : NaN), [path, pathOk, field.F])
  const P = pathOk ? path.r(path.t0) : null
  const Q = pathOk ? path.r(path.t1) : null
  const fP = pot && P ? pot.fn(...P) : NaN
  const fQ = pot && Q ? pot.fn(...Q) : NaN
  const pt = (p) => `${fmt(p[0], 2)},\\, ${fmt(p[1], 2)}`

  return (
    <div className="stage">
      <div className="plane-stage">
        <Plane2D xr={xr} yr={yr}>
          {(s) => (
            <>
              {showLevels && levels && <Levels s={s} levels={levels} />}
              <FieldArrows s={s} grid={grid} k={k} opacity={0.55} />
              {pathOk && <PathLine s={s} pts={pts} />}
              {pathOk && <PathDirection s={s} path={path} />}
              {P && <PQ s={s} P={P} Q={Q} />}
              {P && !(spec?.type === 'spline' && !spec.fixed) && (
                <>
                  <circle cx={s.x(P[0])} cy={s.y(P[1])} r={7} fill="#222" />
                  <circle cx={s.x(Q[0])} cy={s.y(Q[1])} r={7} fill="#222" />
                </>
              )}
              {spec?.type === 'spline' && !spec.fixed &&
                spec.pts.map((q, j) => <Handle key={j} s={s} p={q} onChange={(v) => setDragPt(j, v)} color={COLORS.path} snap={0.25} />)}
            </>
          )}
        </Plane2D>
        <div className="plane-readout">
          {Number.isFinite(value) && (
            <div className="result big-result">
              <Tex>{`\\int_C \\nabla f\\cdot d\\vec r = ${fmt(value)}`}</Tex>
            </div>
          )}
          {pot && P && (
            <div className="result" style={{ color: COLORS.level }}>
              <Tex>{`f(Q) - f(P) = f(${pt(Q)}) - f(${pt(P)}) = ${fmt(fQ - fP)}`}</Tex>
            </div>
          )}
          {pot && (
            <div className="help">
              <Tex>{`f(x,y) = ${pot.tex}`}</Tex>
            </div>
          )}
          {path?.error && <div className="error-msg">{path.error}</div>}
        </div>
        {spec?.type === 'spline' && !spec.fixed && <div className="viewer-hint">Drag P, Q and the middle point</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ compare (Topic 10, sheet 3) */

function CompareMode({ cfg, field, grid, k, xr, yr }) {
  const [P, setP] = useState(cfg.P ?? [-3, 3])
  const [Q, setQ] = useState(cfg.Q ?? [3, -3])
  const [M, setM] = useState(cfg.M ?? [2, 2])
  const A = useMemo(() => makePath({ type: 'line', from: P, to: Q }), [P, Q])
  const B = useMemo(() => makePath({ type: 'spline', pts: [P, M, Q] }), [P, M, Q])
  const iA = useMemo(() => (field.F ? lineIntegral(field.F, A) : NaN), [field.F, A])
  const iB = useMemo(() => (field.F ? lineIntegral(field.F, B) : NaN), [field.F, B])
  const same = Math.abs(iA - iB) < 1e-4 * (1 + Math.abs(iA))
  const c = field.curl
  const exact = c && [[0.3, 0.7], [-1.2, 0.4], [2.1, -1.7], [0.9, 2.3]].every(([x, y]) => Math.abs(c.fn(x, y)) < 1e-9)

  return (
    <div className="stage">
      <div className="plane-stage">
        <Plane2D xr={xr} yr={yr}>
          {(s) => (
            <>
              <FieldArrows s={s} grid={grid} k={k} opacity={0.55} />
              <PathLine s={s} pts={samplePath(A, 2)} color={COLORS.path} />
              <PathDirection s={s} path={A} count={2} />
              <PathLine s={s} pts={samplePath(B, 300)} color={COLORS.pathB} />
              <PathDirection s={s} path={B} color={COLORS.pathB} count={2} />
              <PQ s={s} P={P} Q={Q} />
              <Handle s={s} p={P} onChange={setP} color="#222" />
              <Handle s={s} p={Q} onChange={setQ} color="#222" />
              <Handle s={s} p={M} onChange={setM} color={COLORS.pathB} snap={0.25} />
            </>
          )}
        </Plane2D>
        <div className="plane-readout bottom">
          <div className="result big-result" style={{ color: COLORS.path }}>
            <Tex>{`\\int_A \\vec F\\cdot d\\vec r = ${fmt(iA)}`}</Tex>
          </div>
          <div className="result big-result" style={{ color: COLORS.pathB }}>
            <Tex>{`\\int_B \\vec F\\cdot d\\vec r = ${fmt(iB)}`}</Tex>
          </div>
          <div className={same ? 'check-yes' : 'check-no'}>
            {same ? 'Same value for both paths.' : 'Different: the path matters, so F is not a gradient field.'}
          </div>
          {c && (
            <div className="check">
              <Tex>{`\\frac{\\partial F_1}{\\partial y} = ${c.d1y.tex}, \\qquad \\frac{\\partial F_2}{\\partial x} = ${c.d2x.tex}`}</Tex>
              <div className={exact ? 'check-yes' : 'check-no'}>
                {exact ? 'Equal, so F = ∇f: path independent.' : 'Not equal, so F is not a gradient: path dependent.'}
              </div>
            </div>
          )}
        </div>
        <div className="viewer-hint">Drag P, Q, or the purple point to bend path B</div>
      </div>
    </div>
  )
}
