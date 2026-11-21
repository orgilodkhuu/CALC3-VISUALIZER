import { useState } from 'react'
import Viewer3D from '../components/Viewer3D.jsx'
import Surface from '../components/Surface.jsx'
import { FormulaInput, Slider, Toggle } from '../components/Controls.jsx'

const PRESETS = [
  { name: 'Paraboloid', f: 'x^2 + y^2' },
  { name: 'Saddle', f: 'x^2 - y^2' },
  { name: 'Cone', f: 'sqrt(x^2 + y^2)' },
  { name: 'Plane', f: '2 - x/2 - y/3' },
  { name: 'Ripple', f: 'sin(sqrt(x^2 + y^2) * 2)' },
  { name: 'Egg crate', f: 'sin(x) * cos(y)' },
  { name: 'Gaussian bump', f: '4 * exp(-(x^2 + y^2) / 2)' },
  { name: 'Monkey saddle', f: '(x^3 - 3*x*y^2) / 4' },
  { name: 'Hemisphere', f: 'sqrt(9 - x^2 - y^2)' },
]

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : '—')

export default function Surfaces() {
  const [formula, setFormula] = useState(PRESETS[0].f)
  const [compiled, setCompiled] = useState(null)
  const [domain, setDomain] = useState(3)
  const [zClip, setZClip] = useState(6)
  const [resolution, setResolution] = useState(100)
  const [meshLines, setMeshLines] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showTicks, setShowTicks] = useState(true)
  const [hover, setHover] = useState(null)

  const axisR = Math.max(domain, 3)
  const range = { x: axisR, y: axisR, z: Math.max(3, Math.min(zClip, 8)) }
  // Start the camera far enough out to see the whole box, from a textbook-like angle.
  const d = 3 * Math.max(range.x, range.z)
  const cam = [0.78 * d, 0.45 * d, 0.45 * d]

  return (
    <div className="module">
      <Viewer3D
        range={range}
        showGrid={showGrid}
        showTicks={showTicks}
        camera={cam}
        overlay={
          hover && (
            <span>
              (x, y, z) = ({fmt(hover[0])}, {fmt(hover[1])}, {fmt(hover[2])})
            </span>
          )
        }
      >
        {compiled && (
          <Surface
            fn={compiled.fn}
            xr={domain}
            yr={domain}
            zClip={zClip}
            resolution={resolution}
            meshLines={meshLines}
            onHover={setHover}
          />
        )}
      </Viewer3D>

      <aside className="panel">
        <h2>Surfaces z = f(x, y)</h2>
        <p className="lede">
          Every point (x, y) in the plane gets a height z = f(x, y). Together those heights form a
          surface.
        </p>

        <label className="control">
          <span className="control-row">Examples</span>
          <select
            value={PRESETS.some((p) => p.f === formula) ? formula : ''}
            onChange={(e) => e.target.value && setFormula(e.target.value)}
          >
            <option value="">(custom)</option>
            {PRESETS.map((p) => (
              <option key={p.name} value={p.f}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <FormulaInput value={formula} onChange={setFormula} onCompiled={setCompiled} />

        <Slider
          label="Domain: −a ≤ x, y ≤ a"
          value={domain}
          min={1}
          max={8}
          step={0.5}
          onChange={setDomain}
          format={(v) => `a = ${v}`}
        />
        <Slider
          label="Cut the surface at z = ±"
          value={zClip}
          min={1}
          max={20}
          step={0.5}
          onChange={setZClip}
        />
        <Slider
          label="Quality (lower if it's slow)"
          value={resolution}
          min={20}
          max={200}
          step={10}
          onChange={setResolution}
          format={(v) => `${v}×${v}`}
        />

        <div className="toggles">
          <Toggle label="Mesh lines" checked={meshLines} onChange={setMeshLines} />
          <Toggle label="xy-grid" checked={showGrid} onChange={setShowGrid} />
          <Toggle label="Axis numbers" checked={showTicks} onChange={setShowTicks} />
        </div>
      </aside>
    </div>
  )
}
