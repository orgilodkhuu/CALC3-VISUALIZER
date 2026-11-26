import { useMemo, useState } from 'react'
import Plane2D, { Arrow, Handle } from '../components/Plane2D.jsx'
import { Slider, Toggle } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { COLORS, useField, useFieldGrid, FieldArrows, PathDirection, PaddleWheel, CurlShading, signColor } from '../components/FieldLayer.jsx'
import { fmt } from '../lib/formula.js'

// Small loops give small numbers: keep 3 significant digits (0.0025, not 0.003).
const sig = (v) => (Number.isFinite(v) && Math.abs(v) < 1 ? String(Number(v.toPrecision(3))) : fmt(v))
import { makePath, riemann, lineIntegral } from '../lib/paths.js'

/**
 * The 2D curl (Topic 13). Config fields (examples override any):
 *   mode: 'loop'  her definition: ∮_C F·dr ÷ ΔA around a small loop at (a, b); shrink it to get curl F(a, b)
 *         'map'   curl F = ∂F₂/∂x − ∂F₁/∂y everywhere (shading) with a paddle wheel you can drag
 *   F, x, y, grid, point [a, b], shape 'circle' (centered at the point) | 'square' (lower-left corner
 *   at the point, as on her sheet), size (radius R or side S), caption.
 */
export default function CurlScene({ problem, examples, exampleIndex = 0, onExample }) {
  const cfg = problem
  const mode = cfg.mode ?? 'loop'
  const xr = cfg.x ?? [-3.5, 3.5]
  const yr = cfg.y ?? [-3.5, 3.5]
  const field = useField(cfg.F)
  const grid = useFieldGrid(field.F, xr, yr, cfg.grid ?? 1)
  const [scale, setScale] = useState(null)
  const k = scale ?? grid.auto

  const [pt, setPt] = useState(cfg.point ?? [0, 0])
  const [shape, setShape] = useState(cfg.shape ?? 'circle')
  const [size, setSize] = useState(cfg.size ?? 1)
  const [wheel, setWheel] = useState(true)
  const [shade, setShade] = useState(true)

  const loop = useMemo(() => {
    if (mode !== 'loop') return null
    const [a, b] = pt
    return shape === 'circle'
      ? makePath({ type: 'circle', c: pt, r: size })
      : makePath({ type: 'poly', closed: true, pts: [[a, b], [a + size, b], [a + size, b + size], [a, b + size]] })
  }, [mode, pt, shape, size])
  const area = shape === 'circle' ? Math.PI * size * size : size * size
  const circ = useMemo(() => (loop && field.F ? lineIntegral(field.F, loop) : NaN), [loop, field.F])
  const pieces = useMemo(() => (loop && field.F ? riemann(field.F, loop, 32).pieces : []), [loop, field.F])
  const curlHere = field.curl ? field.curl.fn(...pt) : NaN
  const spin = (v) => (Math.abs(v) < 1e-9 ? 'no spin' : v > 0 ? 'spins counter-clockwise' : 'spins clockwise')

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>
            {(s) => (
              <>
                {mode === 'map' && shade && <CurlShading s={s} curl={field.curl} xr={xr} yr={yr} />}
                <FieldArrows s={s} grid={grid} k={k} opacity={mode === 'loop' ? 0.5 : 0.8} />
                {mode === 'loop' &&
                  pieces.map((p, i) => <Arrow key={i} s={s} from={p.a} to={p.b} color={signColor(p.dot)} width={6} head={0} />)}
                {mode === 'loop' && loop && (
                  <PathDirection s={s} path={loop} color="#222" count={4} size={Math.min(16, size * s.unit * 0.5)} />
                )}
                {wheel && <PaddleWheel s={s} p={pt} curl={curlHere} radius={0.4} />}
                <Handle s={s} p={pt} onChange={setPt} color={COLORS.F} label="(a, b)" />
              </>
            )}
          </Plane2D>
          <div className="plane-readout">
            {mode === 'loop' ? (
              <>
                <div className="result">
                  <Tex>{`\\oint_C \\vec F\\cdot d\\vec r = ${sig(circ)}, \\qquad \\Delta A = ${sig(area)}`}</Tex>
                </div>
                <div className="result big-result">
                  <Tex>{`\\frac{\\oint_C \\vec F\\cdot d\\vec r}{\\Delta A} = ${fmt(circ / area)}`}</Tex>
                </div>
                <div className="result" style={{ color: COLORS.F }}>
                  <Tex>{`\\text{curl}\\,\\vec F(${fmt(pt[0], 2)},\\, ${fmt(pt[1], 2)}) = ${fmt(curlHere)}`}</Tex>
                </div>
                <div className="help">Shrink the loop: the ratio approaches the curl.</div>
              </>
            ) : (
              <>
                {field.curl && (
                  <div className="result">
                    <Tex>{`\\text{curl}\\,\\vec F = \\frac{\\partial F_2}{\\partial x} - \\frac{\\partial F_1}{\\partial y} = ${field.curl.tex}`}</Tex>
                  </div>
                )}
                <div className="result big-result" style={{ color: COLORS.F }}>
                  <Tex>{`\\text{curl}\\,\\vec F(${fmt(pt[0], 2)},\\, ${fmt(pt[1], 2)}) = ${fmt(curlHere)}`}</Tex>
                </div>
                <div className="help">The paddle wheel {spin(curlHere)}.</div>
                {shade && (
                  <div className="legend">
                    <span style={{ color: '#c4431f' }}>■ curl &gt; 0 (counter-clockwise)</span>
                    <span style={{ color: '#2b6cc4' }}>■ curl &lt; 0 (clockwise)</span>
                  </div>
                )}
              </>
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
        <div className="current-f">
          <Tex>{field.tex}</Tex>
        </div>

        {mode === 'loop' && (
          <>
            <label className="control">
              <span className="control-row">Loop C</span>
              <select value={shape} onChange={(e) => setShape(e.target.value)}>
                <option value="circle">Circle of radius R, centered at (a, b)</option>
                <option value="square">Square of side S, corner at (a, b)</option>
              </select>
            </label>
            <Slider
              label={shape === 'circle' ? 'Radius R' : 'Side S'}
              value={size}
              min={0.05}
              max={2}
              step={0.05}
              onChange={setSize}
              format={(v) => fmt(v, 2)}
            />
          </>
        )}
        <div className="toggles">
          <Toggle label="Paddle wheel (spins at curl ÷ 2)" checked={wheel} onChange={setWheel} />
          {mode === 'map' && <Toggle label="Shade by curl" checked={shade} onChange={setShade} />}
        </div>

        <details className="more">
          <summary>More</summary>
          {mode === 'loop' && field.curl && (
            <div className="current-f">
              <Tex>{`\\text{curl}\\,\\vec F = ${field.curl.tex}`}</Tex>
            </div>
          )}
          <Slider label="Arrow length (× true length)" value={k} min={0.01} max={1} step={0.01} onChange={setScale} format={(x) => fmt(x, 2)} />
          {field.inputs}
        </details>
      </aside>
    </div>
  )
}
