import { useMemo, useState } from 'react'
import * as THREE from 'three'
import Viewer3D from '../components/Viewer3D.jsx'
import { Arrow3D, Curve3D, Point3D } from '../components/Overlays3D.jsx'
import { Label3D } from '../components/Axes.jsx'
import { Slider, Toggle, ExamplePicker, CustomBox, TripleInput, NumBox } from '../components/Controls.jsx'
import { useField3, useGrid3, FieldArrows3D, PaddleWheel3D, DyePuff3D } from '../components/Field3.jsx'
import Tex from '../components/Tex.jsx'
import RichText from '../components/RichText.jsx'
import { compileFormula, fmt } from '../lib/formula.js'
import { add, sub, scale, dot, norm, makePath3, samplePath3, lineIntegral3, boxFluxes, fromAngles, toAngles } from '../lib/vec3.js'

/**
 * Vector fields F: R³ → R³ (Topics 12, 17, 21). Config fields (examples override any):
 *   mode: 'field'  arrows on a 3D grid; a probe point (sliders) with F there
 *         'paths'  two paths A and B from P to Q; ∫_A vs ∫_B; curl F = 0 check; f(Q) − f(P) if `potential`
 *         'curl'   paddle wheel at a point with an axle you aim (two angle sliders): it spins at
 *                  (curl F · u)/2, fastest along curl F (the worksheet definition)
 *         'div'    small box with its lower-left-back corner at a point: outward flux through the 6 faces
 *                  ÷ volume → div F as the box shrinks (worksheet #3)
 *   F: ['0', '-z', 'y'], box: [-L, L] (grid range), grid (points per side), scale (arrow length factor),
 *   paths: [specA, specB] (lib/vec3.js), potential, point, axis, size, caption.
 * "Your own…": F (and the point, or the end points P and Q for 'paths'), kept in the tab's store.
 */
export default function Field3Scene({ problem, examples, exampleIndex = 0, onExample, onCustom }) {
  const cfg = problem
  const mode = cfg.mode ?? 'field'
  const own = !!cfg.isCustom
  const field = useField3(cfg.F, own ? onCustom : null)
  const F = field.ok ? field.F : null

  const ownLabel = 'Your own F…'
  const extraCustom =
    mode === 'paths' ? (
      <>
        <TripleInput label="Start P" value={cfg.P ?? [0, 0, 0]} onChange={(v) => onCustom({ P: v })} />
        <TripleInput label="End Q" value={cfg.Q ?? [1, 1, 1]} onChange={(v) => onCustom({ Q: v })} />
        <div className="help">Path A: straight line. Path B: x first, then y, then z.</div>
      </>
    ) : mode === 'curl' || mode === 'div' ? (
      <TripleInput label={mode === 'div' ? 'Corner (a, b, c)' : 'Point (a, b, c)'} value={cfg.point ?? [0, 0, 0]} onChange={(v) => onCustom({ point: v })} />
    ) : (
      <div className="control">
        <span className="control-row">Grid box: −L to L</span>
        <div className="two-nums">
          <NumBox label="L" value={(cfg.box ?? [-3, 3])[1]} onChange={(v) => v > 0 && onCustom({ box: [-v, v] })} />
        </div>
      </div>
    )

  const panelTop = (
    <>
      {cfg.caption && (
        <p className="caption">
          <RichText>{cfg.caption}</RichText>
        </p>
      )}
      <ExamplePicker examples={examples} exampleIndex={exampleIndex} onExample={onExample} ownLabel={ownLabel} />
      {own && (
        <CustomBox>
          {field.inputs}
          {extraCustom}
        </CustomBox>
      )}
      <div className="current-f">
        <Tex>{field.tex ?? ''}</Tex>
      </div>
    </>
  )

  const props = { cfg, F, field, panelTop }
  if (mode === 'paths') return <PathsMode {...props} />
  if (mode === 'curl') return <CurlMode {...props} />
  if (mode === 'div') return <DivMode {...props} />
  return <FieldMode {...props} />
}

const cube = (box) => ({ x: box, y: box, z: box })
const vtex = (a, d = 2) => `\\left(${a.map((c) => fmt(c, d)).join(',\\, ')}\\right)`

/* ------------------------------------------------------------------ field */

function FieldMode({ cfg, F, panelTop }) {
  const box = cfg.box ?? [-3, 3]
  const n = cfg.grid ?? 5
  const grid = useGrid3(F, box, n)
  const [kUser, setK] = useState(null)
  const k = kUser ?? cfg.scale ?? grid.auto
  const [probe, setProbe] = useState(cfg.probe ?? [1, 1, 1])
  const [showProbe, setShowProbe] = useState(true)
  const v = F ? F(...probe) : [NaN, NaN, NaN]
  const bounds = useMemo(() => cube(box), [box[0], box[1]]) // eslint-disable-line react-hooks/exhaustive-deps

  const overlay = showProbe && (
    <div className="boxes-readout">
      <div className="result big-result" style={{ color: '#e4572e' }}>
        <Tex>{`\\vec F${vtex(probe, 2)} = ${vtex(v)}`}</Tex>
      </div>
      <div className="help">Arrows drawn at {fmt(k, 3)} × their true length</div>
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          <FieldArrows3D items={grid.pts} k={k} headMax={grid.step * 0.18} />
          {showProbe && v.every(Number.isFinite) && <Arrow3D from={probe} to={add(probe, scale(v, k))} color="#e4572e" width={6} />}
          {showProbe && <Point3D p={probe} color="#e4572e" r={0.08} />}
        </Viewer3D>
      </div>
      <aside className="panel">
        {panelTop}
        <div className="toggles">
          <Toggle label="Probe point" checked={showProbe} onChange={setShowProbe} />
        </div>
        {showProbe &&
          ['x', 'y', 'z'].map((ax, i) => (
            <Slider key={ax} label={`Probe ${ax}`} value={probe[i]} min={box[0]} max={box[1]} step={0.25} onChange={(val) => setProbe(probe.map((c, j) => (j === i ? val : c)))} format={(x) => fmt(x, 2)} />
          ))}
        <details className="more">
          <summary>More</summary>
          <Slider label="Arrow length (× true length)" value={k} min={0.02} max={1} step={0.01} onChange={setK} format={(x) => fmt(x, 2)} />
        </details>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ paths */

/** Two paths: given in the config, or for "Your own": A = line P→Q, B = x, then y, then z. */
function pathSpecs(cfg) {
  if (!cfg.isCustom && cfg.paths) return cfg.paths
  const P = cfg.P ?? cfg.paths?.[0]?.from ?? [0, 0, 0]
  const Q = cfg.Q ?? cfg.paths?.[0]?.to ?? [1, 1, 1]
  return [
    { name: 'A: straight line', type: 'line', from: P, to: Q },
    { name: 'B: x, then y, then z', type: 'poly', pts: [P, [Q[0], P[1], P[2]], [Q[0], Q[1], P[2]], Q] },
  ]
}

function PathsMode({ cfg, F, field, panelTop }) {
  const specs = pathSpecs(cfg)
  const key = JSON.stringify(specs)
  const paths = useMemo(() => specs.map(makePath3), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const ok = paths.every((p) => !p.error)
  const pts = useMemo(() => (ok ? paths.map((p) => samplePath3(p, 300)) : []), [paths, ok])
  const vals = useMemo(() => (ok && F ? paths.map((p) => lineIntegral3(F, p)) : [NaN, NaN]), [paths, ok, F])
  const P = ok ? paths[0].r(paths[0].t0) : [0, 0, 0]
  const Q = ok ? paths[0].r(paths[0].t1) : [1, 1, 1]
  const pot = useMemo(() => (cfg.potential && !cfg.isCustom ? compileFormula(cfg.potential, ['x', 'y', 'z']) : null), [cfg.potential, cfg.isCustom])
  const diff = pot?.ok ? pot.fn(...Q) - pot.fn(...P) : NaN
  const same = Math.abs(vals[0] - vals[1]) < 1e-4 * (1 + Math.abs(vals[0]))
  // curl F = 0 at a few points ⇒ gradient field (worksheet #5, #6: f_xy = f_yx etc.)
  const curlZero = field.ok && [[0.3, 0.7, -0.4], [1.2, -0.5, 0.9], [-1.1, 2.1, 0.6], [2.3, 1.7, -1.9]].every((p) => field.curl.fn(...p).every((c) => Math.abs(c) < 1e-9))

  // Box around both paths.
  const all = pts.flat()
  const lo = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]), 0))
  const hi = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k]), 0))
  const span = Math.max(...hi.map((h, k) => h - lo[k]), 2)
  const bounds = useMemo(
    () => ({ x: [lo[0] - span * 0.1, hi[0] + span * 0.1], y: [lo[1] - span * 0.1, hi[1] + span * 0.1], z: [lo[2] - span * 0.1, hi[2] + span * 0.1] }),
    [lo.join(), hi.join(), span], // eslint-disable-line react-hooks/exhaustive-deps
  )
  // Faint field arrows over that box.
  const [showField, setShowField] = useState(true)
  const items = useMemo(() => {
    if (!F) return []
    const out = []
    const n = 5
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const p = [bounds.x[0] + ((bounds.x[1] - bounds.x[0]) * i) / (n - 1), bounds.y[0] + ((bounds.y[1] - bounds.y[0]) * j) / (n - 1), bounds.z[0] + ((bounds.z[1] - bounds.z[0]) * k) / (n - 1)]
          const v = F(...p)
          if (v.every(Number.isFinite)) out.push([p, v])
        }
    return out
  }, [F, bounds])
  const step = Math.min(bounds.x[1] - bounds.x[0], bounds.y[1] - bounds.y[0], bounds.z[1] - bounds.z[0]) / 4
  const maxLen = Math.max(...items.map(([, v]) => norm(v)), 1e-9)
  const k = (0.9 * step) / maxLen
  const colors = ['#1f4e8c', '#8e44ad']
  // The worksheet names its paths (e.g. C and D); otherwise A and B.
  const letter = (sp, i) => sp.name?.match(/^([A-Z]):/)?.[1] ?? (i ? 'B' : 'A')
  const label = (sp) => sp.name?.replace(/^[A-Z]: /, '') ?? ''

  const overlay = (
    <div className="boxes-readout">
      {specs.map((sp, i) => (
        <div key={i} className="result big-result" style={{ color: colors[i] }}>
          <Tex>{`\\int_{${letter(sp, i)}} \\vec F\\cdot d\\vec r = ${fmt(vals[i])}`}</Tex>
        </div>
      ))}
      <div className={same ? 'check-yes' : 'check-no'}>{same ? 'Same value on both paths.' : 'Different values: F is path dependent.'}</div>
      {Number.isFinite(diff) && (
        <div className="result" style={{ color: '#2a9d3c' }}>
          <Tex>{`f(Q) - f(P) = ${fmt(diff)}`}</Tex>
        </div>
      )}
      {field.ok && (
        <div className={curlZero ? 'check-yes' : 'check-no'}>
          {curlZero ? 'curl F = 0 everywhere, so F = ∇f: path independent.' : 'curl F ≠ 0, so F is not a gradient field.'}
        </div>
      )}
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          {showField && <FieldArrows3D items={items} k={k} opacity={0.45} headMax={step * 0.15} />}
          {pts.map((p, i) => (
            <Curve3D key={i} points={p} color={colors[i]} width={5} />
          ))}
          {ok &&
            paths.map((p, i) => {
              const t = p.t0 + (p.t1 - p.t0) * 0.55
              const a = p.r(t)
              const b = p.r(t + (p.t1 - p.t0) * 0.02)
              const d = sub(b, a)
              const L = norm(d) || 1
              return <Arrow3D key={`d${i}`} from={a} to={add(a, scale(d, (span * 0.06) / L))} color={colors[i]} width={5} head={span * 0.05} />
            })}
          <Point3D p={P} label="P" />
          <Point3D p={Q} label="Q" />
        </Viewer3D>
      </div>
      <aside className="panel">
        {panelTop}
        {specs.map((sp, i) => (
          <div key={i} className="help" style={{ color: colors[i], fontWeight: 600 }}>
            {letter(sp, i)}: {label(sp)}
          </div>
        ))}
        {pot?.ok && (
          <div className="current-f">
            <Tex>{`f = ${pot.tex}`}</Tex>
          </div>
        )}
        <div className="toggles">
          <Toggle label="Field arrows" checked={showField} onChange={setShowField} />
        </div>
        <details className="more">
          <summary>More</summary>
          {field.ok && (
            <div className="current-f">
              <Tex>{`\\text{curl}\\,\\vec F = \\left(${field.curl.tex.join(',\\; ')}\\right)`}</Tex>
            </div>
          )}
        </details>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ curl */

function CurlMode({ cfg, F, field, panelTop }) {
  const p = cfg.point ?? [0, 0, 0]
  const c = field.ok ? field.curl.fn(...p) : [0, 0, 0]
  const nc = norm(c)
  const [ang, setAng] = useState(() => toAngles(cfg.axis ?? [0, 0, 1]))
  const u = fromAngles(ang[0], ang[1])
  const around = dot(c, u)
  const [showCurl, setShowCurl] = useState(true)
  const L = cfg.size ?? 2
  const box = [-L, L].map((d) => d)
  const bounds = useMemo(() => ({ x: [p[0] - L, p[0] + L], y: [p[1] - L, p[1] + L], z: [p[2] - L, p[2] + L] }), [p[0], p[1], p[2], L]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => {
    if (!F) return []
    const out = []
    const n = 5
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const q = [p[0] + box[0] + (2 * L * i) / (n - 1), p[1] + box[0] + (2 * L * j) / (n - 1), p[2] + box[0] + (2 * L * k) / (n - 1)]
          const v = F(...q)
          if (v.every(Number.isFinite)) out.push([q, v])
        }
    return out
  }, [F, p[0], p[1], p[2], L]) // eslint-disable-line react-hooks/exhaustive-deps
  const maxLen = Math.max(...items.map(([, v]) => norm(v)), 1e-9)
  const k = (0.9 * (L / 2)) / maxLen
  const cShown = nc > 0 ? scale(c, (L * 0.8) / nc) : c
  const deg = (r) => fmt((r * 180) / Math.PI, 0)
  const aim = () => nc > 0 && setAng(toAngles(c))

  const overlay = (
    <div className="boxes-readout">
      <div className="result" style={{ color: '#8e44ad' }}>
        <Tex>{`\\text{curl}\\,\\vec F${vtex(p, 2)} = ${vtex(c)}`}</Tex>
      </div>
      <div className="result big-result">
        <Tex>{`\\text{2D curl around } \\vec u = \\text{curl}\\,\\vec F\\cdot\\vec u = ${fmt(around, 3)}`}</Tex>
      </div>
      <div className="help">
        Largest possible: ‖curl F‖ = {fmt(nc, 3)}, when u points along curl F. The wheel spins at (curl F · u)/2.
      </div>
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          <FieldArrows3D items={items} k={k} opacity={0.5} headMax={L * 0.07} />
          <PaddleWheel3D p={p} u={u} omega={around / 2} radius={L * 0.35} />
          <Arrow3D from={p} to={add(p, scale(u, L * 0.75))} color="#222" width={4} />
          <Label3D position={add(p, scale(u, L * 0.85))} size={L * 0.09} color="#222" bold>
            u
          </Label3D>
          {showCurl && nc > 1e-9 && <Arrow3D from={p} to={add(p, cShown)} color="#8e44ad" width={6} />}
          {showCurl && nc > 1e-9 && (
            <Label3D position={add(p, scale(cShown, 1.12))} size={L * 0.09} color="#8e44ad" bold>
              curl F
            </Label3D>
          )}
        </Viewer3D>
      </div>
      <aside className="panel">
        {panelTop}
        <div className="current-f">
          <Tex>{`\\vec u = ${vtex(u, 2)}`}</Tex>
        </div>
        <Slider label="Axle: turn around (azimuth)" value={ang[0]} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => setAng([v, ang[1]])} format={(v) => `${deg(v)}°`} />
        <Slider label="Axle: tilt up (elevation)" value={ang[1]} min={-Math.PI / 2} max={Math.PI / 2} step={0.01} onChange={(v) => setAng([ang[0], v])} format={(v) => `${deg(v)}°`} />
        <button className="chip play" onClick={aim} disabled={!(nc > 0)}>
          Point the axle along curl F
        </button>
        <div className="toggles">
          <Toggle label="Show curl F" checked={showCurl} onChange={setShowCurl} />
        </div>
        <details className="more">
          <summary>More</summary>
          {field.ok && (
            <div className="current-f">
              <Tex>{`\\text{curl}\\,\\vec F = \\left(${field.curl.tex.join(',\\; ')}\\right)`}</Tex>
            </div>
          )}
          <div className="help">curl F = (∂F₃/∂y − ∂F₂/∂z, ∂F₁/∂z − ∂F₃/∂x, ∂F₂/∂x − ∂F₁/∂y)</div>
        </details>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------ div */

function BoxFaces({ c, s, faces }) {
  const geo = useMemo(() => new THREE.BoxGeometry(s, s, s), [s])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  return (
    <group>
      <mesh geometry={geo} position={c.map((v) => v + s / 2)}>
        <meshBasicMaterial color="#9fb3c8" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} position={c.map((v) => v + s / 2)}>
        <lineBasicMaterial color="#1f4e8c" />
      </lineSegments>
      {faces.map((f) => {
        const color = f.flux > 1e-12 ? '#2a9d3c' : f.flux < -1e-12 ? '#d62839' : '#8a96a3'
        const rot = f.axis === 0 ? [0, Math.PI / 2, 0] : f.axis === 1 ? [Math.PI / 2, 0, 0] : [0, 0, 0]
        return (
          <mesh key={f.name} position={f.center} rotation={rot}>
            <planeGeometry args={[s * 0.96, s * 0.96]} />
            <meshBasicMaterial color={color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function DivMode({ cfg, F, field, panelTop }) {
  const c = cfg.point ?? [0, 0, 0]
  const [s, setS] = useState(cfg.size ?? 1)
  const [flow, setFlow] = useState(false)
  const faces = useMemo(() => (F ? boxFluxes(F, c, s) : []), [F, c[0], c[1], c[2], s]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = faces.reduce((t, f) => t + f.flux, 0)
  const V = s * s * s
  const divHere = field.ok ? field.div.fn(...c) : NaN
  const L = Math.max(2, (cfg.size ?? 1) * 1.6)
  const mid = c.map((v) => v + (cfg.size ?? 1) / 2)
  const bounds = useMemo(() => ({ x: [mid[0] - L, mid[0] + L], y: [mid[1] - L, mid[1] + L], z: [mid[2] - L, mid[2] + L] }), [mid[0], mid[1], mid[2], L]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => {
    if (!F) return []
    const out = []
    const n = 5
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const q = [mid[0] - L + (2 * L * i) / (n - 1), mid[1] - L + (2 * L * j) / (n - 1), mid[2] - L + (2 * L * k) / (n - 1)]
          const v = F(...q)
          if (v.every(Number.isFinite)) out.push([q, v])
        }
    return out
  }, [F, mid[0], mid[1], mid[2], L]) // eslint-disable-line react-hooks/exhaustive-deps
  const maxLen = Math.max(...items.map(([, v]) => norm(v)), 1e-9)
  const k = (0.9 * (L / 2)) / maxLen
  // F at each face center (same scale as the field), so you can see it pass in or out.
  const faceArrows = faces.map((f) => [f.center, F(...f.center)]).filter(([, v]) => v.every(Number.isFinite))
  const sig = (v) => (Number.isFinite(v) && Math.abs(v) < 1 ? String(Number(v.toPrecision(3))) : fmt(v, 3))

  const overlay = (
    <div className="boxes-readout">
      <div className="result">
        <Tex>{`\\oiint_S \\vec F\\cdot d\\vec A = ${sig(total)}, \\quad \\Delta V = ${sig(V)}`}</Tex>
      </div>
      <div className="result big-result">
        <Tex>{`\\frac{\\oiint_S \\vec F\\cdot d\\vec A}{\\Delta V} = ${fmt(total / V, 3)}`}</Tex>
      </div>
      <div className="result" style={{ color: '#e4572e' }}>
        <Tex>{`\\text{div}\\,\\vec F${vtex(c, 2)} = ${fmt(divHere, 3)}`}</Tex>
      </div>
      <div className="help">Green faces: F flows out. Red: F flows in. Shrink the box: the ratio approaches div F.</div>
    </div>
  )

  return (
    <div className="explorer">
      <div className="stage">
        <Viewer3D bounds={bounds} overlay={overlay}>
          <FieldArrows3D items={items} k={k} opacity={0.35} headMax={L * 0.06} />
          <BoxFaces c={c} s={s} faces={faces} />
          {flow && F && <DyePuff3D F={F} c={c} s={s} />}
          <FieldArrows3D items={faceArrows} k={k} color="#e4572e" opacity={1} headMax={L * 0.1} />
          <Point3D p={c} color="#e4572e" r={0.06} label="(a, b, c)" />
        </Viewer3D>
      </div>
      <aside className="panel">
        {panelTop}
        <Slider label="Box side (Δx = Δy = Δz)" value={s} min={0.01} max={2} step={0.01} onChange={setS} format={(v) => fmt(v, 2)} />
        <button className={`chip play${flow ? ' on' : ''}`} onClick={() => setFlow((f) => !f)}>
          {flow ? '■ Stop the flow' : '▶ Show the flow'}
        </button>
        {flow && <div className="help flow-help">A puff of dye starts in the box and F carries it. It spreads out where div F &gt; 0, squeezes together where div F &lt; 0, and keeps its size where div F = 0.</div>}
        <details className="more">
          <summary>More</summary>
          {field.ok && (
            <div className="current-f">
              <Tex>{`\\text{div}\\,\\vec F = \\frac{\\partial F_1}{\\partial x} + \\frac{\\partial F_2}{\\partial y} + \\frac{\\partial F_3}{\\partial z} = ${field.div.tex}`}</Tex>
            </div>
          )}
          <table className="piece-table">
            <thead>
              <tr>
                <th>face</th>
                <th>flux out</th>
              </tr>
            </thead>
            <tbody>
              {faces.map((f) => (
                <tr key={f.name}>
                  <td>{f.name}</td>
                  <td>{sig(f.flux)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </aside>
    </div>
  )
}
