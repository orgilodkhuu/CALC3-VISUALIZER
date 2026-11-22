import { useMemo, useState } from 'react'
import Viewer3D from '../components/Viewer3D.jsx'
import Surface from '../components/Surface.jsx'
import { Curve3D, LevelCurves3D, Point3D, SlicePlane, TangentPlane, sliceCurve } from '../components/Overlays3D.jsx'
import { ContourPlot, CrossSectionPlot, SLICE_COLORS } from '../components/Plot2D.jsx'
import SlicePlot from '../components/SlicePlot.jsx'
import {
  AnglePlot,
  ContourVectors,
  DirectionOverlay3D,
  DirectionPanels,
  GradientOverlay3D,
  GradientReadout,
  SvgArrow,
  C,
  gradientField,
} from './DirectionTools.jsx'
import ValueTable from '../components/ValueTable.jsx'
import { FormulaInput, Slider, Toggle } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { compileFormula, partial, fmt } from '../lib/formula.js'
import { autoZRange, autoZScale } from '../lib/view.js'
import { autoLevels } from '../lib/contours.js'
import { viridis } from '../lib/colormap.js'
import { AXIS_COLORS } from '../components/Axes.jsx'

/**
 * One scene for every f: R^2 -> R problem. A problem config (see src/topics/) decides
 * which views appear, what starts hidden, and which slices/levels/points to show.
 *
 * Config fields (all optional except f):
 *   f            formula, e.g. 'y^3 - x^2' (may use params like m)
 *   x, y, z      [min, max] plot box (z defaults to an automatic range)
 *   zScale       number, or omit for automatic squeeze of tall surfaces
 *   view         camera direction [x, y, z], e.g. to avoid seeing a plane edge-on
 *   views        any of 'cross', 'contour', 'table', 'partials', 'direction', 'gradient'
 *   hidden       views that start hidden for "predict, then reveal" (incl. 'surface')
 *   slices       { x: [..], y: [..] } fixed cross-section families
 *   levels       contour heights
 *   table        { xs: [..], ys: [..] }
 *   point        [a, b] movable point (partials, slices through a point)
 *   h            forward-difference step for partial-derivative estimates
 *   tangentPlane true to show the tangent plane at the point
 *   walk         [dx, dy] linear-approximation walk from the point
 *   v            direction vector [v1, v2] for 'direction' (any length; rate uses ‖v‖)
 *   vPresets     [[v1, v2], ...] quick buttons for v
 *   theta        starting angle (degrees) of the unit vector u for 'gradient'
 *   gradField    true to start with the whole gradient field on the contour plot
 *   params       [{ name, min, max, step, value, label }] extra sliders used in f
 *   markers      [[x, y, z], ...] labeled points
 *   presets      [{ name, f }] example dropdown
 *   editable     false to lock the formula
 */
export default function FunctionExplorer({ problem }) {
  const P = problem
  const views = P.views ?? []
  const has = (v) => views.includes(v)
  const params = P.params ?? []

  const [formula, setFormula] = useState(P.f)
  const [compiled, setCompiled] = useState(() => compileFormula(P.f, ['x', 'y', ...params.map((p) => p.name)]))
  const [pv, setPv] = useState(() => Object.fromEntries(params.map((p) => [p.name, p.value])))
  const [shown, setShown] = useState(() => {
    const s = { surface: true, cross: true, contour: true, table: true, partials: true, direction: true, gradient: true }
    for (const h of P.hidden ?? []) s[h] = false
    return s
  })
  const [pt, setPt] = useState(P.point ?? [0, 0])
  const [h, setH] = useState(P.h ?? 0.5)
  const [walk, setWalk] = useState(P.walk ?? [0.5, 0.5])
  const [v, setV] = useState(P.v ?? [3, 4])
  const [theta, setTheta] = useState(P.theta ?? 30)
  const [opts, setOpts] = useState({
    meshLines: true,
    slicePlanes: !P.slices, // many fixed slices + planes get too busy
    levels3d: has('contour'),
    tangentLines: true,
    tangentPlane: !!P.tangentPlane,
    walk: !!P.walk,
    fxyGhost: false,
    formulas: false,
    secant: true,
    gradField: !!P.gradField,
    showU: true,
    trueScale: P.zScale === 1,
    resolution: 90,
  })
  const [hover, setHover] = useState(null)
  const [tableHover, setTableHover] = useState(null)
  const set = (k) => (v) => setOpts((o) => ({ ...o, [k]: v }))

  // Stable references so heavy geometry isn't rebuilt on every hover.
  const xr = useMemo(() => P.x ?? [-3, 3], [P.x])
  const yr = useMemo(() => P.y ?? [-3, 3], [P.y])
  const paramKey = params.map((p) => pv[p.name]).join(',')

  // f(x, y) with current parameter values plugged in; partials computed symbolically.
  const calc = useMemo(() => {
    if (!compiled?.ok) return null
    const extra = params.map((p) => pv[p.name])
    const bind = (g) => (x, y) => g(x, y, ...extra)
    const vars = ['x', 'y', ...params.map((p) => p.name)]
    const d = (order) => {
      const r = partial(compiled.node, order, vars)
      return r ? { fn: bind(r.fn), tex: r.tex } : null
    }
    return {
      f: bind(compiled.fn),
      tex: compiled.tex,
      fx: d(['x']),
      fy: d(['y']),
      fxx: d(['x', 'x']),
      fxy: d(['x', 'y']),
      fyx: d(['y', 'x']),
      fyy: d(['y', 'y']),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled, paramKey])

  const zr = useMemo(() => P.z ?? (calc ? autoZRange(calc.f, xr, yr) : [-1, 1]), [calc, P.z, xr, yr])
  const zScale = opts.trueScale ? 1 : (P.zScale ?? autoZScale(xr, yr, zr))
  const bounds = useMemo(() => ({ x: xr, y: yr, z: zr }), [xr, yr, zr])

  const levels = useMemo(() => P.levels ?? autoLevels(zr), [P.levels, zr])
  const levelColors = useMemo(
    () =>
      levels.map((c) => {
        const [r, g, b] = viridis((c - zr[0]) / (zr[1] - zr[0]))
        const k = 0.8 // darken for contrast on white
        return `rgb(${(r * k * 255) | 0},${(g * k * 255) | 0},${(b * k * 255) | 0})`
      }),
    [levels, zr],
  )

  const f = calc?.f
  const [a, b] = pt
  const fab = f ? f(a, b) : NaN
  const val = (d) => (d ? d.fn(a, b) : NaN)
  const fx = val(calc?.fx)
  const fy = val(calc?.fy)

  // Directions: v (Topic 4, any length) and unit u at angle theta (Topic 7).
  const vLen = Math.hypot(v[0], v[1])
  const uV = useMemo(() => (vLen > 0 ? [v[0] / vLen, v[1] / vLen] : [1, 0]), [v, vLen])
  const uT = useMemo(() => [Math.cos((theta * Math.PI) / 180), Math.sin((theta * Math.PI) / 180)], [theta])
  // Gradient arrows in the xy-plane: true length when that is readable, otherwise scaled
  // (k ≠ 1, stated in the readout). With the field on, everything shares the field's scale.
  const span = Math.min(xr[1] - xr[0], yr[1] - yr[0])
  const gLen = Math.hypot(fx, fy)
  const field = useMemo(
    () => (has('gradient') && opts.gradField && calc?.fx && calc?.fy ? gradientField(calc.fx.fn, calc.fy.fn, xr, yr) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calc, xr, yr, opts.gradField],
  )
  const kGrad = field
    ? field.k
    : gLen > 0.35 * span
      ? (0.35 * span) / gLen
      : gLen > 0 && gLen < 0.12 * span
        ? (0.12 * span) / gLen
        : 1

  // Cross-section families: fixed lists from the config, or the slices through the point.
  const xSlices = P.slices?.x ?? (has('partials') ? [] : [a])
  const ySlices = P.slices?.y ?? (has('partials') ? [] : [b])

  const markers = P.markers ?? []
  const show2D = ['cross', 'contour', 'table', 'partials', 'direction', 'gradient'].some((k) => has(k) && shown[k])
  const usesPoint = has('partials') || has('direction') || has('gradient')
  const hoverText = hover && `(x, y, z) = (${fmt(hover[0], 2)}, ${fmt(hover[1], 2)}, ${fmt(hover[2], 2)})`

  return (
    <div className="explorer">
      <div className={`stage ${show2D ? 'with-2d' : ''}`}>
        <Viewer3D bounds={bounds} zScale={zScale} overlay={hoverText} view={P.view}>
          {f && shown.surface && (
            <Surface
              fn={f}
              xr={xr}
              yr={yr}
              zr={zr}
              resolution={opts.resolution}
              meshLines={opts.meshLines}
              opacity={has('partials') && opts.tangentPlane ? 0.85 : 1}
              onHover={setHover}
            />
          )}

          {/* Cross sections drawn on the surface */}
          {f && has('cross') && shown.cross && (
            <>
              {xSlices.map((c, i) => (
                <group key={`xs${c}`}>
                  <Curve3D points={sliceCurve(f, 'x', c, yr)} color={SLICE_COLORS[i % 6]} zr={zr} />
                  {opts.slicePlanes && (
                    <SlicePlane axis="x" value={c} xr={xr} yr={yr} zr={zr} color={SLICE_COLORS[i % 6]} />
                  )}
                </group>
              ))}
              {ySlices.map((c, i) => (
                <group key={`ys${c}`}>
                  <Curve3D
                    points={sliceCurve(f, 'y', c, xr)}
                    color={SLICE_COLORS[(i + xSlices.length) % 6]}
                    zr={zr}
                  />
                  {opts.slicePlanes && (
                    <SlicePlane
                      axis="y"
                      value={c}
                      xr={xr}
                      yr={yr}
                      zr={zr}
                      color={SLICE_COLORS[(i + xSlices.length) % 6]}
                    />
                  )}
                </group>
              ))}
            </>
          )}

          {f && has('contour') && shown.contour && opts.levels3d && (
            <LevelCurves3D fn={f} xr={xr} yr={yr} zr={zr} levels={levels} colors={levelColors} />
          )}

          {f &&
            has('table') &&
            P.table.xs.flatMap((x) =>
              P.table.ys.map((y) => {
                const hot = tableHover && tableHover[0] === x && tableHover[1] === y
                return (
                  <Point3D
                    key={`${x},${y}`}
                    p={[x, y, f(x, y)]}
                    r={hot ? 0.11 : 0.06}
                    color={hot ? '#e4572e' : '#222'}
                    label={hot ? `(${fmt(x)}, ${fmt(y)}, ${fmt(f(x, y))})` : null}
                  />
                )
              }),
            )}

          {f && has('partials') && shown.partials && (
            <>
              <Curve3D points={sliceCurve(f, 'y', b, xr)} color={AXIS_COLORS.x} zr={zr} width={4} />
              <Curve3D points={sliceCurve(f, 'x', a, yr)} color={AXIS_COLORS.y} zr={zr} width={4} />
              {opts.slicePlanes && (
                <>
                  <SlicePlane axis="y" value={b} xr={xr} yr={yr} zr={zr} color={AXIS_COLORS.x} opacity={0.08} />
                  <SlicePlane axis="x" value={a} xr={xr} yr={yr} zr={zr} color={AXIS_COLORS.y} opacity={0.08} />
                </>
              )}
              {opts.tangentLines && Number.isFinite(fx) && Number.isFinite(fy) && (
                <TangentLines3D a={a} b={b} f0={fab} fx={fx} fy={fy} len={(xr[1] - xr[0]) * 0.22} />
              )}
              {opts.tangentPlane && Number.isFinite(fx) && Number.isFinite(fy) && (
                <TangentPlane a={a} b={b} f0={fab} m={fx} n={fy} half={(xr[1] - xr[0]) * 0.22} zr={zr} />
              )}
              {opts.walk && Number.isFinite(fx) && (
                <Walk3D f={f} a={a} b={b} f0={fab} fx={fx} fy={fy} dx={walk[0]} dy={walk[1]} />
              )}
              <Point3D p={[a, b, fab]} color="#111" r={0.09} label={`(${fmt(a)}, ${fmt(b)}, ${fmt(fab)})`} />
            </>
          )}

          {f && has('direction') && shown.direction && Number.isFinite(fx) && Number.isFinite(fy) && (
            <>
              <DirectionOverlay3D f={f} a={a} b={b} fx={fx} fy={fy} v={v} u={uV} xr={xr} yr={yr} zr={zr} secant={opts.secant} />
              {opts.tangentPlane && (
                <TangentPlane a={a} b={b} f0={fab} m={fx} n={fy} half={(xr[1] - xr[0]) * 0.22} zr={zr} />
              )}
              <Point3D p={[a, b, fab]} color="#111" r={0.09} label={`(${fmt(a)}, ${fmt(b)}, ${fmt(fab)})`} />
            </>
          )}

          {f && has('gradient') && shown.gradient && Number.isFinite(fx) && Number.isFinite(fy) && (
            <GradientOverlay3D f={f} a={a} b={b} fx={fx} fy={fy} u={uT} xr={xr} yr={yr} zr={zr} k={kGrad} showU={opts.showU} />
          )}

          {markers.map((m, i) => (
            <Point3D key={i} p={m} color="#e4572e" r={0.09} label={`(${m.join(', ')})`} />
          ))}
          {P.markerLine && markers.length >= 2 && (
            <Curve3D
              points={(() => {
                const [p, q] = [markers[0], markers[markers.length - 1]]
                const d = q.map((v, i) => v - p[i])
                return [-0.4, 1.4].map((t) => p.map((v, i) => v + d[i] * t))
              })()}
              color="#e4572e"
              width={3}
              dashed
            />
          )}
        </Viewer3D>

        {show2D && f && (
          <div className="panels2d">
            {has('partials') && shown.partials && (
              <PartialsPanels
                calc={calc}
                a={a}
                b={b}
                h={h}
                xr={xr}
                yr={yr}
                zr={zr}
                showFormulas={opts.formulas}
                fxyGhost={opts.fxyGhost}
                showPlane={opts.tangentPlane}
              />
            )}
            {has('direction') && shown.direction && Number.isFinite(fx) && (
              <DirectionPanels f={f} calc={calc} a={a} b={b} fx={fx} fy={fy} v={v} u={uV} xr={xr} yr={yr} zr={zr} showFormulas={opts.formulas} />
            )}
            {has('gradient') && shown.gradient && Number.isFinite(fx) && (
              <>
                <GradientReadout calc={calc} a={a} b={b} fx={fx} fy={fy} u={uT} theta={theta} showFormulas={opts.formulas} k={kGrad} />
                <AnglePlot fx={fx} fy={fy} theta={theta} />
              </>
            )}
            {has('cross') && shown.cross && xSlices.length > 0 && (
              <CrossSectionPlot fn={f} axis="x" values={xSlices} range={yr} zr={zr} />
            )}
            {has('cross') && shown.cross && ySlices.length > 0 && (
              <CrossSectionPlot
                fn={f}
                axis="y"
                values={ySlices}
                range={xr}
                zr={zr}
                colors={SLICE_COLORS.slice(xSlices.length % 6).concat(SLICE_COLORS)}
              />
            )}
            {has('contour') && shown.contour && (
              <ContourPlot fn={f} xr={xr} yr={yr} levels={levels} colors={levelColors}>
                {(s) => {
                  if (has('gradient') && shown.gradient && Number.isFinite(fx)) {
                    return <ContourVectors s={s} a={a} b={b} fx={fx} fy={fy} u={uT} k={kGrad} field={field} showU={opts.showU} />
                  }
                  return (
                    <>
                      {has('direction') && shown.direction && (
                        <SvgArrow x1={s.x(a)} y1={s.y(b)} x2={s.x(a + v[0])} y2={s.y(b + v[1])} color={C.v} width={3.5} />
                      )}
                      {(usesPoint || P.point) && <circle cx={s.x(a)} cy={s.y(b)} r="5" fill="#111" />}
                    </>
                  )
                }}
              </ContourPlot>
            )}
            {has('table') && shown.table && (
              <ValueTable fn={f} xs={P.table.xs} ys={P.table.ys} onHover={setTableHover} />
            )}
          </div>
        )}
      </div>

      <aside className="panel">
        {P.prompt && (
          <div className="prompt">
            <RichText>{P.prompt}</RichText>
          </div>
        )}

        {P.presets && (
          <label className="control">
            <span className="control-row">Functions</span>
            <select
              value={P.presets.some((p) => p.f === formula) ? formula : ''}
              onChange={(e) => e.target.value && setFormula(e.target.value)}
            >
              <option value="">(custom)</option>
              {P.presets.map((p) => (
                <option key={p.name} value={p.f}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {P.editable === false ? (
          <div className="control formula-fixed">
            <Tex>{`f(x,y) = ${compiled?.tex ?? ''}`}</Tex>
          </div>
        ) : (
          <FormulaInput
            label="f(x, y) ="
            prefix="f(x,y) = "
            value={formula}
            onChange={setFormula}
            onCompiled={setCompiled}
            vars={['x', 'y', ...params.map((p) => p.name)]}
          />
        )}

        {params.map((p) => (
          <Slider
            key={p.name}
            label={p.label ?? p.name}
            value={pv[p.name]}
            min={p.min}
            max={p.max}
            step={p.step ?? 0.1}
            onChange={(v) => setPv((o) => ({ ...o, [p.name]: v }))}
          />
        ))}

        <div className="reveal-group">
          <span className="control-row">Show</span>
          <RevealButton label="3D surface" on={shown.surface} onClick={() => setShown((s) => ({ ...s, surface: !s.surface }))} />
          {['cross', 'contour', 'table', 'partials', 'direction', 'gradient']
            .filter(has)
            .map((k) => (
              <RevealButton
                key={k}
                label={
                  {
                    cross: 'Cross sections',
                    contour: 'Contour plot',
                    table: 'Table',
                    partials: 'Partial derivatives',
                    direction: 'Directional derivative',
                    gradient: 'Gradient',
                  }[k]
                }
                on={shown[k]}
                onClick={() => setShown((s) => ({ ...s, [k]: !s[k] }))}
              />
            ))}
        </div>

        {(usesPoint || (has('cross') && !P.slices)) && (
          <>
            <Slider label="Point: x = a" value={a} min={xr[0]} max={xr[1]} step={0.05} onChange={(v) => setPt([v, b])} format={(v) => fmt(v, 2)} />
            <Slider label="Point: y = b" value={b} min={yr[0]} max={yr[1]} step={0.05} onChange={(v) => setPt([a, v])} format={(v) => fmt(v, 2)} />
          </>
        )}

        {has('partials') && (
          <>
            <Slider label="Step for estimates: Δx = Δy" value={h} min={0.05} max={Math.max(1, (xr[1] - xr[0]) / 4)} step={0.05} onChange={setH} format={(v) => fmt(v, 2)} />
            <div className="toggles">
              <Toggle label="Tangent lines" checked={opts.tangentLines} onChange={set('tangentLines')} />
              <Toggle label="Tangent plane" checked={opts.tangentPlane} onChange={set('tangentPlane')} />
              <Toggle label="Show how fₓ changes with y (fₓᵧ)" checked={opts.fxyGhost} onChange={set('fxyGhost')} />
              <Toggle label="Show derivative formulas" checked={opts.formulas} onChange={set('formulas')} />
              <Toggle label="Walk on the tangent plane" checked={opts.walk} onChange={set('walk')} />
            </div>
            {opts.walk && (
              <>
                <Slider label="Walk Δx" value={walk[0]} min={-3} max={3} step={0.1} onChange={(v) => setWalk([v, walk[1]])} format={(v) => fmt(v, 2)} />
                <Slider label="Walk Δy" value={walk[1]} min={-3} max={3} step={0.1} onChange={(v) => setWalk([walk[0], v])} format={(v) => fmt(v, 2)} />
                <WalkReadout f={f} a={a} b={b} fx={fx} fy={fy} dx={walk[0]} dy={walk[1]} />
              </>
            )}
          </>
        )}

        {has('direction') && (
          <>
            <Slider label="Direction: v₁" value={v[0]} min={-6} max={6} step={0.25} onChange={(x) => setV([x, v[1]])} format={(x) => fmt(x, 2)} />
            <Slider label="Direction: v₂" value={v[1]} min={-6} max={6} step={0.25} onChange={(y) => setV([v[0], y])} format={(y) => fmt(y, 2)} />
            {P.vPresets && (
              <div className="chip-row">
                {P.vPresets.map((pv) => (
                  <button key={pv.join(',')} className={`chip ${pv[0] === v[0] && pv[1] === v[1] ? 'on' : ''}`} onClick={() => setV(pv)}>
                    v = ({pv.map((c) => fmt(c, 2)).join(', ')})
                  </button>
                ))}
              </div>
            )}
            <div className="toggles">
              <Toggle label="Secant to the far point" checked={opts.secant} onChange={set('secant')} />
              <Toggle label="Tangent plane" checked={opts.tangentPlane} onChange={set('tangentPlane')} />
              <Toggle label="Show fₓ and f_y formulas" checked={opts.formulas} onChange={set('formulas')} />
            </div>
          </>
        )}

        {has('gradient') && (
          <>
            <Slider label="Direction of u: angle θ" value={theta} min={0} max={359} step={1} onChange={setTheta} format={(t) => `${Math.round(t)}°`} />
            <div className="chip-row">
              <button
                className="chip"
                onClick={() => setTheta(Math.round(((Math.atan2(fy, fx) * 180) / Math.PI + 360) % 360))}
                disabled={!(Math.hypot(fx, fy) > 0)}
              >
                Point u along ∇f
              </button>
            </div>
            <div className="toggles">
              <Toggle label="Show u" checked={opts.showU} onChange={set('showU')} />
              <Toggle label="Gradient field (on the contour plot)" checked={opts.gradField} onChange={set('gradField')} />
              <Toggle label="Show ∇f formula" checked={opts.formulas} onChange={set('formulas')} />
            </div>
          </>
        )}

        <details className="display-opts">
          <summary>Display options</summary>
          <div className="toggles">
            <Toggle label="Mesh lines" checked={opts.meshLines} onChange={set('meshLines')} />
            {(has('cross') || has('partials')) && (
              <Toggle label="Slice planes" checked={opts.slicePlanes} onChange={set('slicePlanes')} />
            )}
            {has('contour') && <Toggle label="Level curves in 3D" checked={opts.levels3d} onChange={set('levels3d')} />}
            <Toggle label="True z scale (no squeeze)" checked={opts.trueScale} onChange={set('trueScale')} />
          </div>
          <Slider
            label="Quality (lower if slow)"
            value={opts.resolution}
            min={20}
            max={200}
            step={10}
            onChange={set('resolution')}
            format={(v) => `${v}×${v}`}
          />
        </details>
      </aside>
    </div>
  )
}

function RevealButton({ label, on, onClick }) {
  return (
    <button className={`reveal ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      {on ? '● ' : '○ '}
      {label}
    </button>
  )
}

function TangentLines3D({ a, b, f0, fx, fy, len }) {
  return (
    <>
      <Curve3D points={[[a - len, b, f0 - fx * len], [a + len, b, f0 + fx * len]]} color="#8b0000" width={5} />
      <Curve3D points={[[a, b - len, f0 - fy * len], [a, b + len, f0 + fy * len]]} color="#0b5d1e" width={5} />
    </>
  )
}

/** Walk Δx in x, then Δy in y, along the tangent plane; dashed drop shows the real surface. */
function Walk3D({ f, a, b, f0, fx, fy, dx, dy }) {
  const p1 = [a + dx, b, f0 + fx * dx]
  const p2 = [a + dx, b + dy, f0 + fx * dx + fy * dy]
  const real = f(a + dx, b + dy)
  return (
    <>
      <Curve3D points={[[a, b, f0], p1]} color="#d62728" width={6} />
      <Curve3D points={[p1, p2]} color="#2ca02c" width={6} />
      <Point3D p={p2} color="#7b3fe4" r={0.08} />
      {Number.isFinite(real) && (
        <>
          <Curve3D points={[p2, [p2[0], p2[1], real]]} color="#555" width={2} dashed />
          <Point3D p={[p2[0], p2[1], real]} color="#e4572e" r={0.07} />
        </>
      )}
    </>
  )
}

function WalkReadout({ f, a, b, fx, fy, dx, dy }) {
  const pred = fx * dx + fy * dy
  const real = f(a + dx, b + dy) - f(a, b)
  return (
    <div className="readout">
      <div>
        Predicted: <Tex>{`\\Delta z \\approx f_x\\,\\Delta x + f_y\\,\\Delta y = ${fmt(fx)}(${fmt(dx)}) + ${fmt(fy)}(${fmt(dy)}) = ${fmt(pred)}`}</Tex>
      </div>
      <div>
        Actual: <Tex>{`f(a+\\Delta x,\\, b+\\Delta y) - f(a,b) = ${fmt(real)}`}</Tex>
      </div>
    </div>
  )
}

const SIGN = (v) => (!Number.isFinite(v) ? '?' : Math.abs(v) < 1e-9 ? '0' : v > 0 ? '+' : '−')

/** 2D cross sections through the point with tangent line + forward-difference triangle, and the readout. */
function PartialsPanels({ calc, a, b, h, xr, yr, zr, showFormulas, fxyGhost, showPlane }) {
  const f = calc.f
  const f0 = f(a, b)
  const rows = [
    ['f', 'f', { fn: f, tex: calc.tex }],
    ['f_x', 'fx', calc.fx],
    ['f_y', 'fy', calc.fy],
    ['f_{xx}', 'fxx', calc.fxx],
    ['f_{yy}', 'fyy', calc.fyy],
    ['f_{xy}', 'fxy', calc.fxy],
    ['f_{yx}', 'fyx', calc.fyx],
  ]
  const fx = calc.fx?.fn(a, b)
  const fy = calc.fy?.fn(a, b)
  const estX = (f(a + h, b) - f0) / h
  const estY = (f(a, b + h) - f0) / h

  return (
    <>
      <div className="readout partials-table">
        <div className="readout-head">
          At <Tex>{`(a,b) = (${fmt(a, 2)},\\, ${fmt(b, 2)})`}</Tex>
        </div>
        <div className="estimates">
          <Tex>{`f_x \\approx \\frac{\\Delta z}{\\Delta x} = ${fmt(estX)}`}</Tex>
          <Tex>{`f_y \\approx \\frac{\\Delta z}{\\Delta y} = ${fmt(estY)}`}</Tex>
        </div>
        {showPlane && Number.isFinite(fx) && Number.isFinite(fy) && (
          <div className="plane-eq">
            Tangent plane:{' '}
            <Tex>{`z = ${fmt(f0)} + ${fmt(fx)}(x - ${fmt(a, 2)}) + ${fmt(fy)}(y - ${fmt(b, 2)})`.replace(/\+ -/g, '- ').replace(/- -/g, '+ ')}</Tex>
          </div>
        )}
        <table>
          <tbody>
            {rows.map(([tex, key, d]) => {
              const v = d ? d.fn(a, b) : NaN
              return (
                <tr key={key}>
                  <td>
                    <Tex>{tex}</Tex>
                  </td>
                  {showFormulas && (
                    <td className="formula-cell">
                      <Tex>{d ? `= ${d.tex}` : ''}</Tex>
                    </td>
                  )}
                  <td className="num">{fmt(v)}</td>
                  <td>
                    <span className={`sign sign-${SIGN(v) === '+' ? 'pos' : SIGN(v) === '−' ? 'neg' : 'zero'}`}>{SIGN(v)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SlicePlot
        title={`Cross section y = ${fmt(b, 2)} (move in x)`}
        color={AXIS_COLORS.x}
        g={(t) => f(t, b)}
        at={a}
        slope={fx}
        h={h}
        range={xr}
        zr={zr}
        varName="x"
        ghost={fxyGhost ? { g: (t) => f(t, b + h), slope: calc.fx?.fn(a, b + h), label: `y = ${fmt(b + h, 2)}` } : null}
      />
      <SlicePlot
        title={`Cross section x = ${fmt(a, 2)} (move in y)`}
        color={AXIS_COLORS.y}
        g={(t) => f(a, t)}
        at={b}
        slope={fy}
        h={h}
        range={yr}
        zr={zr}
        varName="y"
      />
    </>
  )
}
