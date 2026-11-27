import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Viewer3D from '../components/Viewer3D.jsx'
import Surface from '../components/Surface.jsx'
import { Curve3D } from '../components/Overlays3D.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, FormulaInput } from '../components/Controls.jsx'
import BoundsInputs from '../components/BoundsInputs.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { fmt } from '../lib/formula.js'
import { compileBounds, compileIntegrand, iterated, boundary, bbox, boxSum, boundsTex, inside } from '../lib/integrals.js'
import { autoZScale, useView } from '../lib/view.js'

/**
 * Double integrals as volume (Topic 14): boxes of height f(xᵢ, yⱼ) on Δx × Δy pieces of R,
 * under the surface z = f(x, y). Σ f ΔxΔy next to ∬_R f dA.
 * Config fields (examples override any): f, bounds (lib/integrals.js; rectangular orders),
 * pieces (per side), at ('center' | 'low' | 'high'), caption.
 * "Your own…": f and the bounds.
 */
export default function BoxesScene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  const own = !!cfg.isCustom
  const [n, setN] = useState(cfg.pieces ?? 4)
  const [at, setAt] = useState(cfg.at ?? 'center')
  const [showSurface, setShowSurface] = useState(true)

  // Keep the last f that compiled, so the picture stays while someone is mid-typing.
  const lastF = useRef(null)
  const fNow = useMemo(() => compileIntegrand(cfg.f), [cfg.f])
  if (fNow.ok) lastF.current = fNow
  const F = lastF.current
  const lastCb = useRef(null)
  const cbNow = useMemo(() => compileBounds(cfg.bounds), [JSON.stringify(cfg.bounds)]) // eslint-disable-line react-hooks/exhaustive-deps
  if (cbNow.ok) lastCb.current = { cb: cbNow, B: cfg.bounds }
  const cb = lastCb.current?.cb
  const goodB = lastCb.current?.B

  const edge = useMemo(() => (cb ? boundary(cb) : []), [cb])
  const bb = useMemo(() => (edge.length ? bbox(edge) : { x: [0, 1], y: [0, 1] }), [edge])
  const S = useMemo(() => (cb && F ? boxSum(cb, F, n, at, bb) : null), [cb, F, n, at, bb])
  const exact = useMemo(() => (cb && F ? iterated(cb, F) : NaN), [cb, F])

  const zr = useMemo(() => {
    let lo = 0
    let hi = 0
    if (F) {
      for (let i = 0; i <= 40; i++)
        for (let j = 0; j <= 40; j++) {
          const v = F.xy(bb.x[0] + ((bb.x[1] - bb.x[0]) * i) / 40, bb.y[0] + ((bb.y[1] - bb.y[0]) * j) / 40)
          if (Number.isFinite(v)) (lo = Math.min(lo, v)), (hi = Math.max(hi, v))
        }
    }
    if (hi - lo < 1e-9) hi = lo + 1
    const m = (hi - lo) * 0.05
    return [lo - (lo < 0 ? m : 0), hi + m]
  }, [F, bb])
  const zScale = autoZScale(bb.x, bb.y, zr)
  const bounds = useMemo(() => ({ x: bb.x, y: bb.y, z: zr }), [bb, zr])
  const floor = useMemo(() => edge.map(([x, y]) => [x, y, 0]), [edge])
  // The surface only over R (undefined outside), so the picture is the volume over R.
  const surfFn = useMemo(() => (F && cb ? (x, y) => (inside(cb, x, y) ? F.xy(x, y) : NaN) : null), [F, cb])

  const nBoxes = S?.boxes.length ?? 0
  const overlay = (
    <div className="boxes-readout">
      {S && (
        <div className="result big-result">
          <Tex>{`\\sum f(x_i, y_j)\\,\\Delta x\\,\\Delta y = ${fmt(S.sum)}`}</Tex>
        </div>
      )}
      <div className="help">
        {nBoxes} boxes, each {fmt(S?.dx ?? 0, 3)} × {fmt(S?.dy ?? 0, 3)}
      </div>
      {Number.isFinite(exact) && (
        <div className="result" style={{ color: '#1f4e8c' }}>
          <Tex>{`\\iint_R f\\, dA = ${fmt(exact)}`}</Tex>
        </div>
      )}
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} zScale={zScale} overlay={overlay} view={cfg.view}>
          {S && <Columns boxes={S.boxes} />}
          {surfFn && showSurface && <Surface fn={surfFn} xr={bb.x} yr={bb.y} zr={zr} resolution={70} meshLines={false} opacity={0.45} />}
          {floor.length > 1 && <Curve3D points={floor} color="#1f4e8c" width={4} />}
        </Viewer3D>
      </div>

      <aside className="panel">
        {cfg.caption && (
          <p className="caption">
            <RichText>{cfg.caption}</RichText>
          </p>
        )}
        <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel="Your own f and region…" />
        {own && (
          <CustomBox>
            <FormulaInput label="f(x, y)" prefix="f(x,y) = " value={cfg.f} onChange={(v) => onCustom({ f: v })} onCompiled={() => {}} />
            <BoundsInputs bounds={cfg.bounds} onChange={(b) => onCustom({ bounds: b })} />
            {!cbNow.ok && <div className="error-msg">{cbNow.error}</div>}
          </CustomBox>
        )}
        {cb && F && (
          <div className="current-f bounds-f">
            <Tex>{boundsTex(goodB, cb, F.tex)}</Tex>
          </div>
        )}
        <Slider label="Pieces per side" value={n} min={1} max={30} step={1} onChange={setN} />
        <label className="control">
          <span className="control-row">Height of each box from</span>
          <select value={at} onChange={(e) => setAt(e.target.value)}>
            <option value="center">the center of the piece</option>
            <option value="low">the lower-left corner</option>
            <option value="high">the upper-right corner</option>
          </select>
        </label>
        <div className="toggles">
          <Toggle label="Surface z = f(x, y)" checked={showSurface} onChange={setShowSurface} />
        </div>
      </aside>
    </div>
  )
}

/** All boxes as one instanced mesh (orange above the floor, blue below), plus their edges. */
function Columns({ boxes }) {
  const { zScale } = useView()
  const mesh = useRef()
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const edges = useMemo(() => {
    const pos = []
    for (const b of boxes) {
      const x0 = b.x0
      const x1 = b.x0 + b.dx
      const y0 = b.y0
      const y1 = b.y0 + b.dy
      const z0 = 0
      const z1 = b.h * zScale
      const c = [
        [x0, y0], [x1, y0], [x1, y1], [x0, y1],
      ]
      for (let k = 0; k < 4; k++) {
        const [ax, ay] = c[k]
        const [bx, by] = c[(k + 1) % 4]
        pos.push(ax, ay, z1, bx, by, z1, ax, ay, z0, bx, by, z0, ax, ay, z0, ax, ay, z1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return g
  }, [boxes, zScale])
  useEffect(() => () => edges.dispose(), [edges])
  useEffect(() => () => geo.dispose(), [geo])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const M = new THREE.Matrix4()
    const up = new THREE.Color('#f28e2b')
    const down = new THREE.Color('#4e79a7')
    boxes.forEach((b, i) => {
      const h = Math.abs(b.h * zScale) || 1e-4
      M.makeScale(b.dx, b.dy, h)
      M.setPosition(b.x0 + b.dx / 2, b.y0 + b.dy / 2, (b.h * zScale) / 2)
      m.setMatrixAt(i, M)
      m.setColorAt(i, b.h >= 0 ? up : down)
    })
    m.count = boxes.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [boxes, zScale])

  return (
    <group>
      <instancedMesh key={boxes.length} ref={mesh} args={[geo, null, Math.max(1, boxes.length)]}>
        {/* Pushed slightly back so a flat surface at the same height draws cleanly on top (no flicker). */}
        <meshStandardMaterial roughness={0.6} metalness={0.05} polygonOffset polygonOffsetFactor={3} polygonOffsetUnits={3} />
      </instancedMesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#5a3a12" transparent opacity={0.55} />
      </lineSegments>
    </group>
  )
}
