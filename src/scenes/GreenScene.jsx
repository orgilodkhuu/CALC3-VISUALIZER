import { useMemo, useState } from 'react'
import Plane2D from '../components/Plane2D.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, NumBox } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { COLORS, useField, useFieldGrid, FieldArrows, PathLine, PathDirection, CurlShading, signColor } from '../components/FieldLayer.jsx'
import { fmt } from '../lib/formula.js'
import { makePath, samplePath, lineIntegral, boundarySpec, doubleIntegral, regionToPoly } from '../lib/paths.js'

/**
 * Green's theorem (Topic 15). Config fields (examples override any):
 *   mode: 'cells'  rectangle R cut into n × n small squares; each small counter-clockwise loop is drawn.
 *                  Inside edges are walked both ways and cancel, so Σ ∮ small loops = ∮ around R.
 *         'green'  both sides: ∮_C F·dr around the boundary and ∬_R curl F dA (shading = curl)
 *   F, x, y, grid, region ({ type: 'rect', x, y } | { type: 'poly', pts (counter-clockwise) } |
 *   { type: 'circle', c, r }), cells (n), caption.
 */
export default function GreenScene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  const mode = cfg.mode ?? 'green'
  // "Your own": F plus a rectangle R; the view is the rectangle with a margin of 1.
  const region = useMemo(() => (cfg.isCustom ? toRect(cfg.region) : cfg.region), [cfg.isCustom, cfg.region])
  const xr = cfg.isCustom ? [region.x[0] - 1, region.x[1] + 1] : cfg.x ?? [-3.5, 3.5]
  const yr = cfg.isCustom ? [region.y[0] - 1, region.y[1] + 1] : cfg.y ?? [-3.5, 3.5]
  const field = useField(cfg.F, onCustom)
  const grid = useFieldGrid(field.F, xr, yr, cfg.grid ?? 1)
  const [scale, setScale] = useState(null)
  const k = scale ?? grid.auto
  const [n, setN] = useState(cfg.cells ?? 3)
  const [shade, setShade] = useState(true)
  const [arrows, setArrows] = useState(true)

  const boundary = useMemo(() => makePath(boundarySpec(region)), [region])
  const bPts = useMemo(() => samplePath(boundary, 400), [boundary])
  const lineVal = useMemo(() => (field.F ? lineIntegral(field.F, boundary) : NaN), [field.F, boundary])
  const areaVal = useMemo(() => (field.curl ? doubleIntegral(field.curl.fn, region) : NaN), [field.curl, region])

  // Small cells (rectangle regions only), each with its own counter-clockwise circulation.
  const cells = useMemo(() => {
    if (mode !== 'cells' || region.type !== 'rect' || !field.F) return []
    const [x0, x1] = region.x
    const [y0, y1] = region.y
    const dx = (x1 - x0) / n
    const dy = (y1 - y0) / n
    const out = []
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const a = x0 + i * dx
        const b = y0 + j * dy
        const loop = makePath({ type: 'poly', closed: true, pts: [[a, b], [a + dx, b], [a + dx, b + dy], [a, b + dy]] })
        out.push({ a, b, dx, dy, circ: lineIntegral(field.F, loop, 400) })
      }
    }
    return out
  }, [mode, region, n, field.F])
  const cellSum = cells.reduce((t, c) => t + c.circ, 0)

  const R = regionToPoly(region)
  const regionD = (s) =>
    R.type === 'circle'
      ? `M${s.x(R.c[0] - R.r)},${s.y(R.c[1])}a${R.r * s.unit},${R.r * s.unit} 0 1,0 ${2 * R.r * s.unit},0a${R.r * s.unit},${R.r * s.unit} 0 1,0 ${-2 * R.r * s.unit},0Z`
      : R.pts.map((p, i) => `${i ? 'L' : 'M'}${s.x(p[0])},${s.y(p[1])}`).join('') + 'Z'

  return (
    <div className="explorer">
      <div className="stage">
        <div className="plane-stage">
          <Plane2D xr={xr} yr={yr}>
            {(s) => (
              <>
                <defs>
                  <clipPath id="green-region">
                    <path d={regionD(s)} />
                  </clipPath>
                </defs>
                <path d={regionD(s)} fill="#eef2f7" />
                {shade && <CurlShading s={s} curl={field.curl} xr={xr} yr={yr} cell={0.1} clip="green-region" />}
                {arrows && <FieldArrows s={s} grid={grid} k={k} opacity={0.55} />}
                {cells.map((c, i) => (
                  <CellLoop key={i} s={s} c={c} />
                ))}
                <PathLine s={s} pts={bPts} color={COLORS.path} width={5} />
                <PathDirection s={s} path={boundary} count={R.type === 'circle' ? 4 : R.pts.length} size={18} />
              </>
            )}
          </Plane2D>
          <div className="plane-readout">
            {mode === 'cells' && (
              <div className="result">
                <Tex>{`\\text{Sum of the ${n * n} small loops} = ${fmt(cellSum)}`}</Tex>
              </div>
            )}
            <div className="result big-result" style={{ color: COLORS.path }}>
              <Tex>{`\\oint_C \\vec F\\cdot d\\vec r = ${fmt(lineVal)}`}</Tex>
            </div>
            <div className="result big-result" style={{ color: '#b23b17' }}>
              <Tex>{`\\iint_R \\text{curl}\\,\\vec F\\, dA = ${fmt(areaVal)}`}</Tex>
            </div>
            {mode === 'cells' && (
              <div className="legend">
                <span style={{ color: COLORS.plus }}>■ small loop &gt; 0</span>
                <span style={{ color: COLORS.minus }}>■ &lt; 0</span>
              </div>
            )}
          </div>
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
            {field.inputs}
            <RectInputs region={region} onCustom={onCustom} />
          </CustomBox>
        )}
        <div className="current-f">
          <Tex>{field.tex}</Tex>
        </div>
        {field.curl && (
          <div className="current-f">
            <Tex>{`\\text{curl}\\,\\vec F = ${field.curl.tex}`}</Tex>
          </div>
        )}
        {cfg.regionText && !cfg.isCustom && <div className="help region-text">{cfg.regionText}</div>}
        {mode === 'cells' && <Slider label="Small squares per side" value={n} min={1} max={8} step={1} onChange={setN} />}
        <div className="toggles">
          <Toggle label="Shade by curl (red +, blue −)" checked={shade} onChange={setShade} />
          <Toggle label="Field arrows" checked={arrows} onChange={setArrows} />
        </div>

        <details className="more">
          <summary>More</summary>
          <Slider label="Arrow length (× true length)" value={k} min={0.01} max={1} step={0.01} onChange={setScale} format={(x) => fmt(x, 2)} />
        </details>
      </aside>
    </div>
  )
}

/** A small counter-clockwise loop drawn just inside its cell, with an arrowhead on each side. */
function CellLoop({ s, c }) {
  const inset = 0.14
  const x0 = s.x(c.a + c.dx * inset)
  const x1 = s.x(c.a + c.dx * (1 - inset))
  const y0 = s.y(c.b + c.dy * inset)
  const y1 = s.y(c.b + c.dy * (1 - inset))
  const color = signColor(c.circ, 1e-6)
  const h = Math.max(5, Math.min(10, (x1 - x0) * 0.18))
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  // Counter-clockwise on screen (y down): bottom edge → right, right edge ↑, top edge ←, left edge ↓.
  const heads = [
    `${mx + h},${y0} ${mx - h * 0.4},${y0 - h * 0.7} ${mx - h * 0.4},${y0 + h * 0.7}`,
    `${x1},${my - h} ${x1 - h * 0.7},${my + h * 0.4} ${x1 + h * 0.7},${my + h * 0.4}`,
    `${mx - h},${y1} ${mx + h * 0.4},${y1 - h * 0.7} ${mx + h * 0.4},${y1 + h * 0.7}`,
    `${x0},${my + h} ${x0 - h * 0.7},${my - h * 0.4} ${x0 + h * 0.7},${my - h * 0.4}`,
  ]
  return (
    <g>
      <rect x={s.x(c.a)} y={s.y(c.b + c.dy)} width={c.dx * s.unit} height={c.dy * s.unit} fill="none" stroke="#9aa6b2" strokeWidth="1" />
      <rect x={x0} y={y1} width={x1 - x0} height={y0 - y1} fill="none" stroke={color} strokeWidth="2.5" rx="3" />
      {heads.map((pts, i) => (
        <polygon key={i} points={pts} fill={color} />
      ))}
    </g>
  )
}

/** Any region → its bounding rectangle (for "Your own", which uses rectangles). */
function toRect(region) {
  if (!region) return { type: 'rect', x: [-1, 1], y: [-1, 1] }
  if (region.type === 'rect') return region
  if (region.type === 'circle') return { type: 'rect', x: [region.c[0] - region.r, region.c[0] + region.r], y: [region.c[1] - region.r, region.c[1] + region.r] }
  const xs = region.pts.map((p) => p[0])
  const ys = region.pts.map((p) => p[1])
  return { type: 'rect', x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] }
}

function RectInputs({ region, onCustom }) {
  const set = (x, y) => x[0] < x[1] && y[0] < y[1] && onCustom({ region: { type: 'rect', x, y } })
  const { x, y } = region
  return (
    <div className="control">
      <span className="control-row">Region R: a rectangle</span>
      <div className="two-nums">
        <NumBox label="x from" value={x[0]} onChange={(v) => set([v, x[1]], y)} width={56} />
        <NumBox label="to" value={x[1]} onChange={(v) => set([x[0], v], y)} width={56} />
      </div>
      <div className="two-nums">
        <NumBox label="y from" value={y[0]} onChange={(v) => set(x, [v, y[1]])} width={56} />
        <NumBox label="to" value={y[1]} onChange={(v) => set(x, [y[0], v])} width={56} />
      </div>
    </div>
  )
}
