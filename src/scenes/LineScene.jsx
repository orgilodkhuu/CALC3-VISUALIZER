import { useEffect, useMemo, useRef, useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { FormulaInput, Slider, Toggle, ExamplePicker, CustomBox, RangeInputs, NumBox, PairInput, useCompiled } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { COLORS, useField, useFieldGrid, FieldArrows, PathLine, PathDirection, signColor } from '../components/FieldLayer.jsx'
import { fmt, gradientStrings } from '../lib/formula.js'
import { makePath, samplePath, riemann, lineIntegral } from '../lib/paths.js'
import { contourSegments, autoLevels } from '../lib/contours.js'
import { autoZRange } from '../lib/view.js'

/**
 * Paths through a vector field (Topics 9 and 10). Config fields (examples override any):
 *   mode: 'position' position vectors r_i, r_{i+1} and Δr = r_{i+1} − r_i (drag the tips; no field)
 *         'param'    a point moving along r(t) (no field): t slider, position vector r(t), dr/dt
 *         'sum'      the worksheet's Riemann sum Σ F(r_i)·Δr_i on a path, n pieces, vs the exact ∫_C F·dr
 *         'ftc'      F = ∇f: every path from P to Q drawn at once; walk along them together and watch
 *                    ∫ so far = f(here) − f(P) on each, all ending at f(Q) − f(P)
 *         'compare'  path A (straight) and path B (bendable) from P to Q: same integral or not?
 *   F: ['-y', 'x'], x, y (visible range), grid (arrow spacing),
 *   paths: [pathSpec, ...] (see lib/paths.js; 'spline' paths get drag handles unless fixed: true;
 *          `short` is the name used in small tables), pieces (n),
 *   potential: 'x + y^3' (ftc: f, and F = ∇f), P, Q, M (compare), r1, r2 (position), caption.
 * "Your own…" (cfg.isCustom): F (or f in ftc, or r(t) in param, or the two points in position)
 * plus the view window, typed right under the Example list and kept in the tab's store.
 * In 'sum', the Path list always ends with "Your own r(t)" (kept in tabState.ownPath).
 */
export default function LineScene({ problem, examples, exampleIndex = 0, onExample, onCustom, tabState = {}, setTabState }) {
  const cfg = problem
  const mode = cfg.mode ?? 'sum'
  const own = !!cfg.isCustom
  const xr = cfg.x ?? [-3.5, 3.5]
  const yr = cfg.y ?? [-3.5, 3.5]
  const step = cfg.grid ?? 1

  // In the FTC tab F comes from f (F = ∇f), so "your own" means typing f.
  const lastGrad = useRef(null)
  const grad = mode === 'ftc' && own ? gradientStrings(cfg.potential) : null
  if (grad) lastGrad.current = grad
  const Fstr = mode === 'ftc' && own ? lastGrad.current ?? ['0', '0'] : cfg.F ?? ['0', '0']
  const hasField = mode !== 'param' && mode !== 'position'
  const field = useField(Fstr, own && mode !== 'ftc' ? onCustom : null)
  const grid = useFieldGrid(hasField ? field.F : null, xr, yr, step)
  const [scale, setScale] = useState(null)
  const k = scale ?? grid.auto

  // ---- Paths (sum mode): the example's list, plus "Your own r(t)".
  const specs = cfg.paths ?? []
  const [pathIdx, setPathIdx] = useState(0)
  const [drag, setDrag] = useState(() => specs.map((sp) => (sp.type === 'spline' ? sp.pts : null)))
  const ownPath = tabState.ownPath ?? { type: 'param', x: 't', y: 't^2 / 2', t: [-2, 2] }
  const spec =
    mode === 'sum' && pathIdx === 'own'
      ? ownPath
      : specs[pathIdx]?.type === 'spline'
        ? { ...specs[pathIdx], pts: drag[pathIdx] }
        : specs[pathIdx]
  const path = useMemo(() => makePath(spec), [JSON.stringify(spec)]) // eslint-disable-line react-hooks/exhaustive-deps
  const pathOk = path && !path.error
  const pts = useMemo(() => (pathOk ? samplePath(path, 400) : []), [path, pathOk])
  const setDragPt = (i, j, p) => setDrag((d) => d.map((arr, ii) => (ii === i ? arr.map((q, jj) => (jj === j ? p : q)) : arr)))

  // Mode state lives here so the stage and the panel share it.
  const [n, setN] = useState(cfg.pieces ?? 6)
  const [showF, setShowF] = useState(true)
  const [table, setTable] = useState(false)
  const [u, setU] = useState(cfg.u ?? 0.35)
  const [showLevels, setShowLevels] = useState(true)
  const [walk, setWalk] = useState(0.5)
  const [playing, setPlaying] = useState(false)
  const st = { n, showF, table, u, showLevels, walk }
  const R = useMemo(
    () => (mode === 'sum' && pathOk && field.F ? riemann(field.F, path, n) : null),
    [mode, path, pathOk, field.F, n],
  )

  // FTC: every path at once, with the running integral along each.
  const ftc = useFtc(mode === 'ftc', cfg, specs, drag, field.F, own)

  // Play: walk from 0 to 1 in about 4 seconds.
  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      let done = false
      setWalk((w) => {
        const nw = Math.min(1, w + dt / 4)
        if (nw >= 1) done = true
        return nw
      })
      if (done) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const pathInputs = (sp, set) => (
    <>
      <FormulaInput label="x(t)" prefix="x(t) = " vars={['t']} value={sp.x} onChange={(v) => set({ ...sp, x: v })} onCompiled={() => {}} />
      <FormulaInput label="y(t)" help={false} prefix="y(t) = " vars={['t']} value={sp.y} onChange={(v) => set({ ...sp, y: v })} onCompiled={() => {}} />
      <div className="two-nums">
        <NumBox label="t from" value={sp.t[0]} onChange={(v) => set({ ...sp, t: [v, sp.t[1]] })} />
        <NumBox label="to" value={sp.t[1]} onChange={(v) => set({ ...sp, t: [sp.t[0], v] })} />
      </div>
    </>
  )
  const seedParam = (sp) => (sp?.type === 'param' ? sp : { type: 'param', x: 't', y: 't^2 / 2', t: [-2, 2] })

  return (
    <div className="explorer">
      {mode === 'position' && <PositionMode {...{ cfg, xr, yr, own, onCustom }} />}
      {mode === 'param' && <ParamMode {...{ st, xr, yr, path, pathOk, pts }} />}
      {mode === 'sum' && <SumMode {...{ st, R, field, grid, k, xr, yr, path, pathOk, pts, spec, setDragPt: (j, p) => setDragPt(pathIdx, j, p) }} />}
      {mode === 'ftc' && <FtcMode {...{ st, ftc, field, grid, k, xr, yr, setDragPt }} />}
      {mode === 'compare' && <CompareMode {...{ cfg, field, grid, k, xr, yr }} />}

      <aside className="panel">
        {cfg.caption && (
          <p className="caption">
            <RichText>{cfg.caption}</RichText>
          </p>
        )}
        <ExamplePicker
          examples={examples}
          exampleIndex={exampleIndex}
          onExample={onExample}
          ownLabel={mode === 'ftc' ? 'Your own f…' : mode === 'param' ? 'Your own r(t)…' : mode === 'position' ? 'Your own points…' : 'Your own F…'}
        />
        {own && (
          <CustomBox>
            {mode === 'ftc' && (
              <FormulaInput label="f(x, y), and F = ∇f" prefix="f(x,y) = " value={cfg.potential ?? ''} onChange={(v) => onCustom({ potential: v })} onCompiled={() => {}} />
            )}
            {(mode === 'sum' || mode === 'compare') && field.inputs}
            {mode === 'param' && pathInputs(seedParam(cfg.paths?.[0]), (sp) => onCustom({ paths: [sp] }))}
            {mode === 'position' && (
              <>
                <PairInput label="rᵢ" value={cfg.r1 ?? [5, 2]} onChange={(v) => onCustom({ r1: v })} />
                <PairInput label="rᵢ₊₁" value={cfg.r2 ?? [1, 4]} onChange={(v) => onCustom({ r2: v })} />
              </>
            )}
            <RangeInputs x={xr} y={yr} onChange={onCustom} />
          </CustomBox>
        )}
        {hasField && (
          <div className="current-f">
            <Tex>{field.tex}</Tex>
          </div>
        )}
        {mode === 'sum' && (
          <label className="control">
            <span className="control-row">Path C</span>
            <select value={pathIdx} onChange={(e) => setPathIdx(e.target.value === 'own' ? 'own' : Number(e.target.value))}>
              {specs.map((sp, i) => (
                <option key={i} value={i}>
                  {sp.name ?? 'Path from the example'}
                </option>
              ))}
              <option value="own">Your own r(t)…</option>
            </select>
          </label>
        )}
        {mode === 'sum' && pathIdx === 'own' && <CustomBox>{pathInputs(ownPath, (sp) => setTabState({ ownPath: sp }))}</CustomBox>}
        {(mode === 'sum' || mode === 'param') && pathOk && path.tex && (
          <div className="current-f path-f">
            <Tex>{path.tex}</Tex>
            <Tex>{`${texNum(path.t0)} \\le t \\le ${texNum(path.t1)}`}</Tex>
          </div>
        )}
        {(mode === 'sum' || mode === 'param') && path?.error && <div className="error-msg">{path.error}</div>}

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
        {mode === 'ftc' && (
          <>
            <div className="walk-row">
              <Slider label="Walk along all paths together" value={walk} min={0} max={1} step={0.005} onChange={(v) => (setPlaying(false), setWalk(v))} format={(v) => `${Math.round(v * 100)}%`} />
              <button
                className="chip play"
                onClick={() => {
                  if (walk >= 1) setWalk(0)
                  setPlaying((p) => !p)
                }}
              >
                {playing ? '❚❚ Pause' : '▶ Play'}
              </button>
            </div>
            <RunningPlot ftc={ftc} s={walk} />
            {ftc.pot && (
              <div className="toggles">
                <Toggle label="Level curves of f" checked={showLevels} onChange={setShowLevels} />
              </div>
            )}
          </>
        )}

        {hasField && (
          <details className="more">
            <summary>More</summary>
            <Slider label="Arrow length (× true length)" value={k} min={0.01} max={1} step={0.01} onChange={setScale} format={(x) => fmt(x, 2)} />
          </details>
        )}
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

/* ------------------------------------------------------------------ position (Topic 9, sheet 1a) */

function PositionMode({ cfg, xr, yr, own, onCustom }) {
  const [a, setA] = useState(cfg.r1 ?? [5, 2])
  const [b, setB] = useState(cfg.r2 ?? [1, 4])
  const r1 = own ? cfg.r1 ?? [5, 2] : a
  const r2 = own ? cfg.r2 ?? [1, 4] : b
  const set1 = own ? (v) => onCustom({ r1: v }) : setA
  const set2 = own ? (v) => onCustom({ r2: v }) : setB
  const d = [r2[0] - r1[0], r2[1] - r1[1]]
  const T = (p) => `(${fmt(p[0], 2)},\\, ${fmt(p[1], 2)})`
  return (
    <div className="stage">
      <div className="plane-stage">
        <Plane2D xr={xr} yr={yr}>
          {(s) => (
            <>
              <Arrow s={s} from={[0, 0]} to={r1} color={COLORS.path} width={5} label="rᵢ" labelSide={-1} />
              <Arrow s={s} from={[0, 0]} to={r2} color={COLORS.pathB} width={5} label="rᵢ₊₁" />
              <Arrow s={s} from={r1} to={r2} color={COLORS.F} width={6} label="Δrᵢ" />
              <circle cx={s.x(0)} cy={s.y(0)} r={5} fill="#222" />
              <Handle s={s} p={r1} onChange={set1} color={COLORS.path} />
              <Handle s={s} p={r2} onChange={set2} color={COLORS.pathB} />
            </>
          )}
        </Plane2D>
        <div className="plane-readout">
          <div className="result" style={{ color: COLORS.path }}>
            <Tex>{`\\vec r_i = ${T(r1)}`}</Tex>
          </div>
          <div className="result" style={{ color: COLORS.pathB }}>
            <Tex>{`\\vec r_{i+1} = ${T(r2)}`}</Tex>
          </div>
          <div className="result big-result" style={{ color: COLORS.F }}>
            <Tex>{`\\Delta\\vec r_i = \\vec r_{i+1} - \\vec r_i = (${fmt(r2[0], 2)} - ${paren(r1[0])},\\, ${fmt(r2[1], 2)} - ${paren(r1[1])}) = ${T(d)}`}</Tex>
          </div>
          <div className="help">A point (x, y) and its position vector r = (x, y) are the same numbers.</div>
        </div>
        <div className="viewer-hint">Drag the tips of rᵢ and rᵢ₊₁</div>
      </div>
    </div>
  )
}
const paren = (v) => (v < 0 ? `(${fmt(v, 2)})` : fmt(v, 2))

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
              <Arrow s={s} from={[0, 0]} to={p} color="#6b7682" width={3.5} head={14} label="r(t)" labelSide={-1} />
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
            Gray: the position vector r(t). Orange: the direction of motion, dr/dt{vk < 1 ? ` (drawn at ${vk} × its length)` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
/* ------------------------------------------------------------------ ftc (Topic 10) */

function useLevels(_text, _custom, xr, yr, pot) {
  const levels = useMemo(() => {
    if (!pot?.ok) return null
    const zr = autoZRange(pot.fn, xr, yr)
    const lv = autoLevels(zr, 8)
    return { lv, segs: contourSegments(pot.fn, xr, yr, lv, 160) }
  }, [pot, xr[0], xr[1], yr[0], yr[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return { levels }
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

const FTC_COLORS = ['#1f4e8c', '#0f8b8d', '#b5651d', '#c2185b']

/**
 * Every path of the FTC example at once, each with its running integral: cum[j] = ∫ along the
 * first j/K of the path (by t). The FTC says cum = f(here) − f(P) at every moment.
 */
function useFtc(active, cfg, specs, drag, F, own) {
  const potText = cfg.potential ?? ''
  const pot = useCompiled(potText || '0')
  const potOk = potText && pot.ok ? pot : null
  return useMemo(() => {
    const K = 120
    if (!active || !F) return { paths: [], pot: potOk, K }
    const SUB = 20
    const paths = specs
      .map((sp, i) => {
        const spec = sp.type === 'spline' ? { ...sp, pts: drag[i] } : sp
        const p = makePath(spec)
        if (!p || p.error) return null
        const cum = [0]
        let acc = 0
        const dt = (p.t1 - p.t0) / (K * SUB)
        let a = p.r(p.t0)
        for (let j = 0; j < K * SUB; j++) {
          const t = p.t0 + j * dt
          const b = p.r(t + dt)
          const m = p.r(t + dt / 2)
          const Fm = F(m[0], m[1])
          acc += Fm[0] * (b[0] - a[0]) + Fm[1] * (b[1] - a[1])
          a = b
          if ((j + 1) % SUB === 0) cum.push(acc)
        }
        return {
          i,
          spec,
          path: p,
          pts: samplePath(p, 300),
          cum,
          color: sp.type === 'spline' && !sp.fixed ? COLORS.pathB : FTC_COLORS[i % FTC_COLORS.length],
          name: sp.short ?? sp.name ?? `Path ${i + 1}`,
          drag: sp.type === 'spline' && !sp.fixed,
        }
      })
      .filter(Boolean)
    const first = paths[0]?.path
    return { paths, pot: potOk, K, P: first?.r(first.t0), Q: first?.r(first.t1), own }
  }, [active, F, specs, drag, potOk, own])
}

/** Running integral at fraction s (linear between the K checkpoints). */
const cumAt = (cum, K, s) => {
  const x = Math.max(0, Math.min(1, s)) * K
  const j = Math.min(K - 1, Math.floor(x))
  return cum[j] + (cum[j + 1] - cum[j]) * (x - j)
}

function FtcMode({ st, ftc, grid, k, xr, yr, setDragPt }) {
  const { showLevels, walk } = st
  const { levels } = useLevels(ftc.pot ? ftc.potText ?? null : null, false, xr, yr, ftc.pot)
  const { P, Q, pot } = ftc
  const f = pot?.fn
  const target = f && P && Q ? f(...Q) - f(...P) : NaN
  const pt = (p) => `${fmt(p[0], 2)},\\, ${fmt(p[1], 2)}`

  return (
    <div className="stage">
      <div className="plane-stage">
        <Plane2D xr={xr} yr={yr}>
          {(s) => (
            <>
              {showLevels && levels && <Levels s={s} levels={levels} />}
              <FieldArrows s={s} grid={grid} k={k} opacity={0.4} />
              {ftc.paths.map((p) => (
                <g key={p.i}>
                  <PathLine s={s} pts={p.pts} color={p.color} width={4} />
                  <PathDirection s={s} path={p.path} color={p.color} count={2} size={12} />
                </g>
              ))}
              {P && (
                <>
                  <circle cx={s.x(P[0])} cy={s.y(P[1])} r={7} fill="#222" />
                  <circle cx={s.x(Q[0])} cy={s.y(Q[1])} r={7} fill="#222" />
                  <PQ s={s} P={P} Q={Q} />
                </>
              )}
              {ftc.paths.map((p) => {
                const h = p.path.r(p.path.t0 + walk * (p.path.t1 - p.path.t0))
                return <circle key={`d${p.i}`} cx={s.x(h[0])} cy={s.y(h[1])} r={10} fill={p.color} stroke="#fff" strokeWidth={3} />
              })}
              {ftc.paths
                .filter((p) => p.drag)
                .flatMap((p) =>
                  p.spec.pts
                    .slice(1, -1)
                    .map((q, jj) => <Handle key={`h${p.i}-${jj}`} s={s} p={q} onChange={(v) => setDragPt(p.i, jj + 1, v)} color={p.color} snap={0.25} />),
                )}
            </>
          )}
        </Plane2D>
        <div className="plane-readout bottom">
          <table className="ftc-table">
            <thead>
              <tr>
                <th></th>
                <th>
                  <Tex>{`\\int \\nabla f\\cdot d\\vec r \\text{ so far}`}</Tex>
                </th>
                {f && (
                  <th>
                    <Tex>{`f(\\text{here}) - f(P)`}</Tex>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ftc.paths.map((p) => {
                const h = p.path.r(p.path.t0 + walk * (p.path.t1 - p.path.t0))
                return (
                  <tr key={p.i} style={{ color: p.color }}>
                    <td className="ftc-name">● {p.name}</td>
                    <td>{fmt(cumAt(p.cum, ftc.K, walk), 2)}</td>
                    {f && <td>{fmt(f(...h) - f(...P), 2)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {f && P && (
            <div className="result big-result" style={{ color: COLORS.level }}>
              <Tex>{`f(Q) - f(P) = f(${pt(Q)}) - f(${pt(P)}) = ${fmt(target)}`}</Tex>
            </div>
          )}
          {pot && (
            <div className="help">
              <Tex>{`f(x,y) = ${pot.tex}`}</Tex>
            </div>
          )}
        </div>
        {ftc.paths.some((p) => p.drag) && <div className="viewer-hint">Drag the purple point to bend your path</div>}
      </div>
    </div>
  )
}

/** ∫ so far vs how far along, one line per path; all end on the dashed line f(Q) − f(P). */
function RunningPlot({ ftc, s }) {
  const W = 270
  const H = 170
  const pad = { l: 40, r: 10, t: 12, b: 28 }
  if (!ftc.paths.length) return null
  const f = ftc.pot?.fn
  const target = f && ftc.P ? f(...ftc.Q) - f(...ftc.P) : NaN
  let lo = 0
  let hi = 0
  for (const p of ftc.paths) for (const v of p.cum) if (Number.isFinite(v)) (lo = Math.min(lo, v)), (hi = Math.max(hi, v))
  if (Number.isFinite(target)) (lo = Math.min(lo, target)), (hi = Math.max(hi, target))
  if (hi - lo < 1e-9) (hi += 1), (lo -= 1)
  const m = (hi - lo) * 0.08
  lo -= m
  hi += m
  const X = (u) => pad.l + u * (W - pad.l - pad.r)
  const Y = (v) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b)
  return (
    <figure className="running-plot">
      <svg width={W} height={H}>
        <line x1={X(0)} x2={X(1)} y1={Y(0)} y2={Y(0)} stroke="#c3cad2" />
        <line x1={X(0)} x2={X(0)} y1={pad.t} y2={H - pad.b} stroke="#59636e" />
        <text x={pad.l - 6} y={Y(0) + 4} textAnchor="end" className="rp-tick">0</text>
        {Number.isFinite(target) && (
          <>
            <line x1={X(0)} x2={X(1)} y1={Y(target)} y2={Y(target)} stroke={COLORS.level} strokeWidth="2" strokeDasharray="6 5" />
            <text x={pad.l - 6} y={Y(target) + 4} textAnchor="end" className="rp-tick" fill={COLORS.level}>
              {fmt(target, 2)}
            </text>
          </>
        )}
        <line x1={X(s)} x2={X(s)} y1={pad.t} y2={H - pad.b} stroke="#8a96a3" strokeDasharray="3 3" />
        {ftc.paths.map((p) => (
          <g key={p.i}>
            <polyline
              points={p.cum.map((v, j) => `${X(j / ftc.K).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
            />
            <circle cx={X(s)} cy={Y(cumAt(p.cum, ftc.K, s))} r="4.5" fill={p.color} />
          </g>
        ))}
        <text x={X(0)} y={H - 8} className="rp-tick">start</text>
        <text x={X(1)} y={H - 8} textAnchor="end" className="rp-tick">end</text>
      </svg>
      <figcaption>
        ∫ so far, walking from P to Q. {Number.isFinite(target) ? 'Every path ends on the dashed line, f(Q) − f(P).' : ''}
      </figcaption>
    </figure>
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
