import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viewer3D from '../components/Viewer3D.jsx'
import { Arrow3D, Curve3D, Point3D } from '../components/Overlays3D.jsx'
import { Label3D } from '../components/Axes.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, TripleInput } from '../components/Controls.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { fmt } from '../lib/formula.js'
import { add, sub, scale, dot, cross, norm } from '../lib/vec3.js'

/**
 * 3D vectors (Topic 18). Config fields (examples override any):
 *   mode: 'cross'  v and w set by component sliders; the parallelogram they span, v × w (perpendicular,
 *                  right-hand rule, length = area); v · w and the angle too
 *         'plane'  plane through three points P, Q, R: n = PQ × PR and the equation n · (r − P) = 0
 *   v, w (cross), points: [P, Q, R] (plane), max (slider range), caption.
 * "Your own…": the vectors (cross) or the three points (plane), kept in the tab's store.
 */
export default function Vec3Scene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  return (cfg.mode ?? 'cross') === 'plane' ? (
    <PlaneMode {...{ cfg, examples, exampleIndex, onExample, onCustom }} />
  ) : (
    <CrossMode {...{ cfg, examples, exampleIndex, onExample, onCustom }} />
  )
}

const C = { v: '#e4572e', w: '#0f8b8d', vw: '#8e44ad', area: '#f2b134' }
const vtex = (a, d = 2) => `\\left(${a.map((c) => fmt(c, d)).join(',\\, ')}\\right)`

function Panel({ cfg, examples, exampleIndex, onExample, ownLabel, custom, children }) {
  return (
    <aside className="panel">
      {cfg.caption && (
        <p className="caption">
          <RichText>{cfg.caption}</RichText>
        </p>
      )}
      <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel={ownLabel} />
      {cfg.isCustom && custom && <CustomBox>{custom}</CustomBox>}
      {children}
    </aside>
  )
}

/** Two triangles filling the parallelogram 0, a, a + b, b (from origin o). */
function Parallelogram({ o = [0, 0, 0], a, b, color, opacity = 0.35 }) {
  const geo = useMemo(() => {
    const p0 = o
    const p1 = add(o, a)
    const p2 = add(add(o, a), b)
    const p3 = add(o, b)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3))
    g.computeVertexNormals()
    return g
  }, [o, a, b])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/** Curved arrow from direction a toward direction b near the origin: the right-hand rule's "fingers". */
function TurnArrow({ a, b, color }) {
  const na = norm(a)
  const nb = norm(b)
  if (!(na > 1e-9 && nb > 1e-9)) return null
  const ua = scale(a, 1 / na)
  const ub = scale(b, 1 / nb)
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub))))
  if (ang < 0.05 || ang > Math.PI - 0.05) return null
  // orthonormal frame in the plane of a and b
  const e2raw = sub(ub, scale(ua, dot(ua, ub)))
  const e2 = scale(e2raw, 1 / norm(e2raw))
  const R = Math.min(na, nb) * 0.35
  const pts = []
  for (let i = 0; i <= 30; i++) {
    const t = (ang * 0.85 * i) / 30
    pts.push(add(scale(ua, R * Math.cos(t)), scale(e2, R * Math.sin(t))))
  }
  const tip = add(scale(ua, R * Math.cos(ang * 0.95)), scale(e2, R * Math.sin(ang * 0.95)))
  return (
    <group>
      <Curve3D points={pts} color={color} width={3} />
      <Arrow3D from={pts[pts.length - 1]} to={tip} color={color} width={3} head={R * 0.45} />
    </group>
  )
}

/* ------------------------------------------------------------------ cross */

function CrossMode({ cfg, examples, exampleIndex, onExample, onCustom }) {
  const own = !!cfg.isCustom
  const [vl, setVl] = useState(cfg.v ?? [1, 2, 3])
  const [wl, setWl] = useState(cfg.w ?? [4, 5, 6])
  const v = own ? cfg.v ?? [1, 2, 3] : vl
  const w = own ? cfg.w ?? [4, 5, 6] : wl
  const setV = own ? (x) => onCustom({ v: x }) : setVl
  const setW = own ? (x) => onCustom({ w: x }) : setWl
  const [showArea, setShowArea] = useState(true)
  const [showWV, setShowWV] = useState(false)

  const vw = cross(v, w)
  const area = norm(vw)
  const d = dot(v, w)
  const nv = norm(v)
  const nw = norm(w)
  const theta = nv > 0 && nw > 0 ? Math.acos(Math.max(-1, Math.min(1, d / (nv * nw)))) : NaN
  const M = cfg.max ?? 6
  // v × w can be much longer than v and w: draw it shorter by a friendly factor and say so.
  const big = Math.max(nv, nw, 1)
  const k = [1, 0.5, 0.25, 0.2, 0.1, 0.05].find((c) => area * c <= 1.6 * big) ?? 0.05
  const L = Math.max(M, 2)
  const bounds = useMemo(() => ({ x: [-L, L], y: [-L, L], z: [-L, L] }), [L])
  const tipLabel = (p, text, color) => <Label3D position={add(p, scale(p, 0.08 / Math.max(norm(p), 1e-9)))} size={L * 0.07} color={color} bold>{text}</Label3D>
  const vwShown = scale(vw, k)

  const overlay = (
    <div className="boxes-readout">
      <div className="result big-result" style={{ color: C.vw }}>
        <Tex>{`\\vec v \\times \\vec w = ${vtex(vw)}`}</Tex>
      </div>
      <div className="result">
        <Tex>{`\\|\\vec v \\times \\vec w\\| = ${fmt(area, 3)} = \\text{area of the parallelogram}`}</Tex>
      </div>
      <div className="result">
        <Tex>{`\\vec v \\cdot \\vec w = ${fmt(d, 3)}, \\quad \\theta = ${Number.isFinite(theta) ? fmt(theta, 3) + '\\text{ rad } (' + fmt((theta * 180) / Math.PI, 1) + '^\\circ)' : '\\text{—}'}`}</Tex>
      </div>
      {k < 1 && <div className="help">v × w drawn at {k} × its length</div>}
    </div>
  )

  const sliders = (label, a, set, color) => (
    <div className="vec-sliders">
      <div className="vec-sliders-title" style={{ color }}>
        <Tex>{`${label} = ${vtex(a, 1)}`}</Tex>
      </div>
      {['x', 'y', 'z'].map((ax, i) => (
        <Slider key={ax} label={ax} value={a[i]} min={-M} max={M} step={0.5} onChange={(val) => set(a.map((c, j) => (j === i ? val : c)))} format={(x) => fmt(x, 2)} />
      ))}
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          {showArea && area > 1e-9 && <Parallelogram a={v} b={w} color={C.area} />}
          <Arrow3D from={[0, 0, 0]} to={v} color={C.v} width={6} />
          <Arrow3D from={[0, 0, 0]} to={w} color={C.w} width={6} />
          {area > 1e-9 && <Arrow3D from={[0, 0, 0]} to={vwShown} color={C.vw} width={6} />}
          {showWV && area > 1e-9 && <Arrow3D from={[0, 0, 0]} to={scale(vwShown, -1)} color="#a77fc0" width={4} />}
          <TurnArrow a={v} b={w} color="#333" />
          {nv > 0 && tipLabel(v, 'v', C.v)}
          {nw > 0 && tipLabel(w, 'w', C.w)}
          {area > 1e-9 && tipLabel(vwShown, 'v × w', C.vw)}
          {showWV && area > 1e-9 && tipLabel(scale(vwShown, -1), 'w × v', '#a77fc0')}
        </Viewer3D>
      </div>
      <Panel {...{ cfg, examples, exampleIndex, onExample }} ownLabel="Your own vectors…" custom={null}>
        {sliders('\\vec v', v, setV, C.v)}
        {sliders('\\vec w', w, setW, C.w)}
        <div className="toggles">
          <Toggle label="Parallelogram (its area = ‖v × w‖)" checked={showArea} onChange={setShowArea} />
          <Toggle label="Also w × v" checked={showWV} onChange={setShowWV} />
        </div>
        <details className="more">
          <summary>More</summary>
          <div className="current-f">
            <Tex>{`\\vec v \\times \\vec w = \\begin{vmatrix} \\vec i & \\vec j & \\vec k \\\\ ${v.map((c) => fmt(c, 2)).join(' & ')} \\\\ ${w.map((c) => fmt(c, 2)).join(' & ')} \\end{vmatrix}`}</Tex>
          </div>
          <div className="help">The curved black arrow turns from v toward w: curl the fingers of your right hand that way and your thumb points along v × w.</div>
        </details>
      </Panel>
    </div>
  )
}

/* ------------------------------------------------------------------ plane */

function PlaneMode({ cfg, examples, exampleIndex, onExample, onCustom }) {
  const own = !!cfg.isCustom
  const pts = own ? cfg.points ?? [[1, 3, 0], [3, 4, -3], [3, 6, 2]] : cfg.points ?? [[1, 3, 0], [3, 4, -3], [3, 6, 2]]
  const [P, Q, R] = pts
  const setPt = (i, val) => onCustom({ points: pts.map((p, j) => (j === i ? val : p)) })
  const PQ = sub(Q, P)
  const PR = sub(R, P)
  const n = cross(PQ, PR)
  const nn = norm(n)
  const dval = dot(n, P)
  const [showPlane, setShowPlane] = useState(true)

  // View box around the points.
  const lo = [0, 1, 2].map((k) => Math.min(P[k], Q[k], R[k], 0))
  const hi = [0, 1, 2].map((k) => Math.max(P[k], Q[k], R[k], 0))
  const span = Math.max(...hi.map((h, k) => h - lo[k]), 4)
  const mid = lo.map((l, k) => (l + hi[k]) / 2)
  const half = span * 0.65
  const bounds = useMemo(() => ({ x: [mid[0] - half, mid[0] + half], y: [mid[1] - half, mid[1] + half], z: [mid[2] - half, mid[2] + half] }), [mid[0], mid[1], mid[2], half]) // eslint-disable-line react-hooks/exhaustive-deps
  const nShown = nn > 0 ? scale(n, (span * 0.45) / nn) : n
  const ctr = scale(add(add(P, Q), R), 1 / 3)
  // Plane patch: a square around the centroid spanned by unit vectors in the plane.
  const e1 = norm(PQ) > 0 ? scale(PQ, 1 / norm(PQ)) : [1, 0, 0]
  const e2raw = nn > 0 ? cross(scale(n, 1 / nn), e1) : [0, 1, 0]
  const e2 = scale(e2raw, 1 / (norm(e2raw) || 1))
  const s = span * 0.55
  const corner = add(ctr, add(scale(e1, -s), scale(e2, -s)))
  const g = (x) => fmt(x, 3)
  const eq = nn > 0 ? `${g(n[0])}x ${n[1] < 0 ? '-' : '+'} ${g(Math.abs(n[1]))}y ${n[2] < 0 ? '-' : '+'} ${g(Math.abs(n[2]))}z = ${g(dval)}` : '\\text{the points are on one line: no single plane}'

  const overlay = (
    <div className="boxes-readout">
      <div className="result">
        <Tex>{`\\vec{PQ} = ${vtex(PQ)},\\quad \\vec{PR} = ${vtex(PR)}`}</Tex>
      </div>
      <div className="result" style={{ color: C.vw }}>
        <Tex>{`\\vec n = \\vec{PQ} \\times \\vec{PR} = ${vtex(n)}`}</Tex>
      </div>
      <div className="result big-result">
        <Tex>{eq}</Tex>
      </div>
      <div className="help">n · (x − p, y − q, z − r) = 0 for every point (x, y, z) of the plane</div>
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          {showPlane && nn > 0 && <Parallelogram o={corner} a={scale(e1, 2 * s)} b={scale(e2, 2 * s)} color="#7aa6d8" opacity={0.28} />}
          <Arrow3D from={P} to={Q} color={C.v} width={5} />
          <Arrow3D from={P} to={R} color={C.w} width={5} />
          {nn > 0 && <Arrow3D from={P} to={add(P, nShown)} color={C.vw} width={6} />}
          {nn > 0 && <Label3D position={add(P, scale(nShown, 1.08))} size={span * 0.05} color={C.vw} bold>n</Label3D>}
          <Point3D p={P} label="P" />
          <Point3D p={Q} label="Q" color={C.v} />
          <Point3D p={R} label="R" color={C.w} />
        </Viewer3D>
      </div>
      <Panel
        {...{ cfg, examples, exampleIndex, onExample }}
        ownLabel="Your own points…"
        custom={
          <>
            <TripleInput label="P" value={P} onChange={(v) => setPt(0, v)} />
            <TripleInput label="Q" value={Q} onChange={(v) => setPt(1, v)} />
            <TripleInput label="R" value={R} onChange={(v) => setPt(2, v)} />
          </>
        }
      >
        <div className="current-f">
          <Tex>{`P = ${vtex(P, 2)},\\; Q = ${vtex(Q, 2)},\\; R = ${vtex(R, 2)}`}</Tex>
        </div>
        <div className="toggles">
          <Toggle label="Plane" checked={showPlane} onChange={setShowPlane} />
        </div>
      </Panel>
    </div>
  )
}
