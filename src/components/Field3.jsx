import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { FormulaInput } from './Controls.jsx'
import { compileField3, norm } from '../lib/vec3.js'

/** Shared pieces for 3D vector fields (Topics 12, 17, 21). */

/**
 * F: R³ → R³ from a config's F: ['0', '-z', 'y']; keeps the last version that compiled while
 * someone is mid-typing. `inputs` are the "Your own F" boxes (written to the tab's store via onCustom).
 */
export function useField3(cfgF, onCustom) {
  const last = useRef(null)
  const now = useMemo(() => compileField3(cfgF), [cfgF[0], cfgF[1], cfgF[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  if (now.ok) last.current = now
  const f = last.current ?? now
  const set = (i, v) => onCustom({ F: cfgF.map((s, j) => (j === i ? v : s)) })
  const inputs = onCustom ? (
    <>
      {['F₁', 'F₂', 'F₃'].map((lab, i) => (
        <FormulaInput
          key={i}
          label={`${lab}(x, y, z)`}
          prefix={`F_${i + 1} = `}
          vars={['x', 'y', 'z']}
          value={cfgF[i]}
          onChange={(v) => set(i, v)}
          onCompiled={() => {}}
          help={i === 0}
        />
      ))}
    </>
  ) : null
  return { ...f, inputs }
}

/** Grid points of a box, n per side, and the automatic arrow scale (longest ≈ 0.9 × spacing). */
export function useGrid3(F, box, n) {
  return useMemo(() => {
    if (!F) return { pts: [], auto: 1, step: 1 }
    const pts = []
    let max = 0
    const step = (box[1] - box[0]) / (n - 1)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const p = [box[0] + i * step, box[0] + j * step, box[0] + k * step]
          const v = F(...p)
          if (!v.every(Number.isFinite)) continue
          max = Math.max(max, norm(v))
          pts.push([p, v])
        }
    const auto = max > 0 ? (0.9 * step) / max : 1
    return { pts, auto: Number(auto.toPrecision(2)), step }
  }, [F, box[0], box[1], n]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Many arrows at once: one line set for the shafts, one instanced cone mesh for the heads. */
export function FieldArrows3D({ items, k, color = '#5b6b7c', opacity = 0.9, headMax = 0.3 }) {
  // items: [[from, vector], ...]; drawn from → from + k·vector
  const mesh = useRef()
  const cone = useMemo(() => new THREE.ConeGeometry(1, 1, 12), [])
  const { shafts, heads } = useMemo(() => {
    const pos = []
    const heads = []
    for (const [a, v] of items) {
      const d = [v[0] * k, v[1] * k, v[2] * k]
      const L = norm(d)
      if (!(L > 1e-6)) continue
      const hl = Math.min(headMax, L * 0.35)
      const u = d.map((c) => c / L)
      const base = a.map((c, i) => c + d[i] - u[i] * hl)
      pos.push(...a, ...base)
      heads.push({ base, u, hl })
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return { shafts: g, heads }
  }, [items, k, headMax])
  useEffect(() => () => shafts.dispose(), [shafts])
  useEffect(() => () => cone.dispose(), [cone])
  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const M = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    heads.forEach((h, i) => {
      q.setFromUnitVectors(up, new THREE.Vector3(...h.u))
      M.compose(new THREE.Vector3(...h.base.map((c, j) => c + (h.u[j] * h.hl) / 2)), q, new THREE.Vector3(h.hl * 0.3, h.hl, h.hl * 0.3))
      m.setMatrixAt(i, M)
    })
    m.count = heads.length
    m.instanceMatrix.needsUpdate = true
  }, [heads])
  return (
    <group>
      <lineSegments geometry={shafts}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>
      <instancedMesh key={heads.length} ref={mesh} args={[cone, null, Math.max(1, heads.length)]}>
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </instancedMesh>
    </group>
  )
}

/**
 * Paddle wheel at p whose axle points along unit vector u; it spins at ω = (curl F · u) / 2
 * (counter-clockwise looking down the axle from its tip, right-hand rule). Spin is capped to stay watchable.
 */
export function PaddleWheel3D({ p, u, omega, radius = 0.8 }) {
  const spin = useRef()
  const w = useRef(0)
  w.current = Number.isFinite(omega) ? Math.max(-4, Math.min(4, omega)) : 0
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...u).normalize()), [u[0], u[1], u[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += w.current * Math.min(dt, 0.1)
  })
  const R = radius
  return (
    <group position={p} quaternion={q}>
      <Line points={[[0, 0, -R * 0.9], [0, 0, R * 0.9]]} color="#333" lineWidth={4} />
      <group ref={spin}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2
          return (
            <mesh key={i} position={[(R / 2) * Math.cos(a), (R / 2) * Math.sin(a), 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[R, R * 0.06, R * 0.5]} />
              <meshStandardMaterial color={i === 0 ? '#e4572e' : '#59636e'} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
