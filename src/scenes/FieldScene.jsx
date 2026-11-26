import { useMemo, useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { FormulaInput, Slider, Toggle, ExamplePicker, CustomBox, RangeInputs, useCompiled } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { compileFormula, partial, fmt } from '../lib/formula.js'
import { contourSegments, autoLevels } from '../lib/contours.js'
import { autoZRange } from '../lib/view.js'

const CF = '#5b6b7c' // field arrows
const CP = '#e4572e' // probe arrow
const CL = '#2a9d3c' // level curves of the potential f

/**
 * Vector field F(x, y) = (F1, F2) drawn as arrows at grid points (Topic 8).
 * Config: F: ['-y', 'x'], x, y (visible range), grid (spacing, default 1), probe [x, y],
 *         check (true = show the ∂F1/∂y vs ∂F2/∂x test), potential (formula f with ∇f = F, optional),
 *         caption. Examples override any of these.
 */
export default function FieldScene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  const c1 = useCompiled(cfg.F[0])
  const c2 = useCompiled(cfg.F[1])
  const [probe, setProbe] = useState(cfg.probe ?? [1, 1])
  const [scale, setScale] = useState(null) // null = automatic
  const [showLevels, setShowLevels] = useState(!!cfg.potential)
  const xr = cfg.x ?? [-3.5, 3.5]
  const yr = cfg.y ?? [-3.5, 3.5]
  const step = cfg.grid ?? 1

  const f1 = c1?.ok ? c1.fn : null
  const f2 = c2?.ok ? c2.fn : null

  // Grid points and their vectors; automatic scale makes the longest arrow ~90% of the spacing.
  const field = useMemo(() => {
    if (!f1 || !f2) return { pts: [], auto: 1 }
    const pts = []
    let max = 0
    for (let x = Math.ceil(xr[0] / step) * step; x <= xr[1] + 1e-9; x += step) {
      for (let y = Math.ceil(yr[0] / step) * step; y <= yr[1] + 1e-9; y += step) {
        const F = [f1(x, y), f2(x, y)]
        if (!F.every(Number.isFinite)) continue
        max = Math.max(max, Math.hypot(F[0], F[1]))
        pts.push([x, y, F])
      }
    }
    const auto = max > 0 ? (0.9 * step) / max : 1
    return { pts, auto: Number(auto.toPrecision(2)) }
  }, [f1, f2, xr, yr, step])
  const k = scale ?? field.auto

  // The gradient test: if F = ∇f then ∂F1/∂y = f_xy = f_yx = ∂F2/∂x.
  const check = useMemo(() => {
    if (!c1?.ok || !c2?.ok) return null
    const d1 = partial(c1.node, ['y'])
    const d2 = partial(c2.node, ['x'])
    if (!d1 || !d2) return null
    let same = true
    for (const [x, y] of [[0.3, 0.7], [-1.2, 0.4], [2.1, -1.7], [0.9, 2.3]]) {
      const a = d1.fn(x, y)
      const b = d2.fn(x, y)
      if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-7 * (1 + Math.abs(a))) same = false
    }
    return { d1, d2, same }
  }, [c1, c2])

  // The potential f only belongs to the worksheet example's F, not to a typed-in one.
  const custom = !!cfg.isCustom
  const pot = useMemo(() => (cfg.potential && !custom ? compileFormula(cfg.potential) : null), [cfg.potential, custom])
  const levels = useMemo(() => {
    if (!pot?.ok) return null
    const zr = autoZRange(pot.fn, xr, yr)
    const lv = autoLevels(zr, 6)
    return { lv, segs: contourSegments(pot.fn, xr, yr, lv, 140) }
  }, [pot, xr, yr])

  const Fp = f1 && f2 ? [f1(...probe), f2(...probe)] : [NaN, NaN]

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>
            {(s) => (
              <>
                {showLevels &&
                  levels?.segs.map((sg, i) => {
                    let d = ''
                    for (let j = 0; j < sg.length; j += 4) {
                      d += `M${s.x(sg[j]).toFixed(1)},${s.y(sg[j + 1]).toFixed(1)}L${s.x(sg[j + 2]).toFixed(1)},${s.y(sg[j + 3]).toFixed(1)}`
                    }
                    return <path key={i} d={d} stroke={CL} strokeWidth="2" fill="none" opacity="0.75" />
                  })}
                {field.pts.map(([x, y, F], i) => (
                  <Arrow key={i} s={s} from={[x, y]} to={[x + F[0] * k, y + F[1] * k]} color={CF} width={2.2} head={9} />
                ))}
                {Fp.every(Number.isFinite) && (
                  <Arrow s={s} from={probe} to={[probe[0] + Fp[0] * k, probe[1] + Fp[1] * k]} color={CP} width={5} head={15} />
                )}
                <Handle s={s} p={probe} onChange={setProbe} color={CP} />
              </>
            )}
          </Plane2D>
          <div className="plane-readout">
            <div className="result" style={{ color: CP }}>
              <Tex>{`\\vec F(${fmt(probe[0], 2)},\\, ${fmt(probe[1], 2)}) = (${fmt(Fp[0])},\\, ${fmt(Fp[1])})`}</Tex>
            </div>
            <div className="help">Arrows drawn at {fmt(k, 2)}× their true length</div>
            {cfg.check && check && (
              <div className="check">
                <div>
                  <Tex>{`\\frac{\\partial F_1}{\\partial y} = ${check.d1.tex}, \\qquad \\frac{\\partial F_2}{\\partial x} = ${check.d2.tex}`}</Tex>
                </div>
                <div className={check.same ? 'check-yes' : 'check-no'}>
                  {check.same
                    ? 'Equal, so F can be a gradient ∇f.'
                    : 'Not equal, so F is not the gradient of any f.'}
                </div>
              </div>
            )}
          </div>
          <div className="viewer-hint">Drag the orange point</div>
        </div>
      </div>

      <aside className="panel">
        {cfg.caption && (
          <p className="caption">
            <RichText>{cfg.caption}</RichText>
          </p>
        )}
        <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel="Your own F…" />
        {cfg.isCustom && (
          <CustomBox>
            <FormulaInput label="F₁(x, y)" prefix="F_1 = " value={cfg.F[0]} onChange={(v) => onCustom({ F: [v, cfg.F[1]] })} onCompiled={() => {}} />
            <FormulaInput label="F₂(x, y)" help={false} prefix="F_2 = " value={cfg.F[1]} onChange={(v) => onCustom({ F: [cfg.F[0], v] })} onCompiled={() => {}} />
            <RangeInputs x={xr} y={yr} onChange={onCustom} />
          </CustomBox>
        )}
        <div className="current-f">
          <Tex>{`\\vec F(x,y) = \\left(${c1?.tex ?? '?'},\\; ${c2?.tex ?? '?'}\\right)`}</Tex>
        </div>

        <Slider
          label="Arrow length (× true length)"
          value={k}
          min={0.01}
          max={1}
          step={0.01}
          onChange={setScale}
          format={(x) => fmt(x, 2)}
        />
        {levels && (
          <div className="toggles">
            <Toggle label="Level curves of f (where ∇f = F)" checked={showLevels} onChange={setShowLevels} />
          </div>
        )}

        <details className="more">
          <summary>More</summary>
        </details>
      </aside>
    </div>
  )
}
