import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useView } from '../lib/view.js'
import { contourSegments } from '../lib/contours.js'
import { useClipPlanes } from './Surface.jsx'
import { Label3D } from './Axes.jsx'

/**
 * Polyline in math coords. Points outside zr (or undefined) break the line into pieces,
 * so curves stop cleanly at the top/bottom of the plot box.
 */
export function Curve3D({ points, color = '#e4572e', width = 4, zr = null, dashed = false }) {
  const { P } = useView()
  const runs = useMemo(() => {
    const out = []
    let cur = []
    for (const [x, y, z] of points) {
      const ok = Number.isFinite(z) && (!zr || (z >= zr[0] && z <= zr[1]))
      if (ok) cur.push(P(x, y, z))
      else if (cur.length) {
        out.push(cur)
        cur = []
      }
    }
    if (cur.length) out.push(cur)
    return out.filter((r) => r.length > 1)
  }, [points, zr, P])
  return runs.map((r, i) => (
    <Line key={i} points={r} color={color} lineWidth={width} dashed={dashed} dashSize={0.2} gapSize={0.12} />
  ))
}

/** Sample the surface along y = b (curve in x) or x = a (curve in y). */
export function sliceCurve(fn, axis, value, range, n = 200) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = range[0] + ((range[1] - range[0]) * i) / n
    pts.push(axis === 'x' ? [value, t, fn(value, t)] : [t, value, fn(t, value)])
  }
  return pts
}

export function Point3D({ p, color = '#111', r = 0.12, label = null }) {
  const { P, bounds } = useView()
  const size = Math.max(bounds.x[1] - bounds.x[0], bounds.y[1] - bounds.y[0]) / 6
  const pos = P(...p)
  if (!pos.every(Number.isFinite)) return null
  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[r * size, 20, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {label && (
        <Label3D position={[pos[0], pos[1], pos[2] + 0.45 * size]} size={0.28 * size} color={color}>
          {label}
        </Label3D>
      )}
    </group>
  )
}

/** Translucent vertical plane x = value (axis 'x') or y = value (axis 'y') spanning the box. */
export function SlicePlane({ axis, value, xr, yr, zr, color = '#e4572e', opacity = 0.14 }) {
  const { zScale } = useView()
  const geom = useMemo(() => {
    const z0 = zr[0] * zScale
    const z1 = zr[1] * zScale
    const v =
      axis === 'x'
        ? [value, yr[0], z0, value, yr[1], z0, value, yr[1], z1, value, yr[0], z1]
        : [xr[0], value, z0, xr[1], value, z0, xr[1], value, z1, xr[0], value, z1]
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
    g.setIndex([0, 1, 2, 0, 2, 3])
    return g
  }, [axis, value, xr, yr, zr, zScale])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/** Level curves f = c drawn at height c on the surface, and/or flat on the xy-plane. */
export function LevelCurves3D({ fn, xr, yr, zr, levels, colors, onSurface = true, onFloor = true }) {
  const { zScale } = useView()
  const planes = useClipPlanes(zr)
  const geoms = useMemo(() => {
    const segs = contourSegments(fn, xr, yr, levels, 120)
    return segs.map((s, k) => {
      const make = (zFn) => {
        const arr = []
        for (let i = 0; i < s.length; i += 2) arr.push(s[i], s[i + 1], zFn(levels[k]))
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
        return g
      }
      return {
        surface: make((c) => c * zScale),
        floor: make(() => 0.001),
      }
    })
  }, [fn, xr, yr, levels, zScale])
  useEffect(
    () => () =>
      geoms.forEach((g) => {
        g.surface.dispose()
        g.floor.dispose()
      }),
    [geoms],
  )
  return geoms.map((g, k) => (
    <group key={k}>
      {onSurface && levels[k] >= zr[0] && levels[k] <= zr[1] && (
        <lineSegments geometry={g.surface}>
          <lineBasicMaterial color={colors[k]} clippingPlanes={planes} />
        </lineSegments>
      )}
      {onFloor && (
        <lineSegments geometry={g.floor}>
          <lineBasicMaterial color={colors[k]} />
        </lineSegments>
      )}
    </group>
  ))
}

/** A flat patch z = f0 + m(x - a) + n(y - b) around (a, b): the tangent plane. */
export function TangentPlane({ a, b, f0, m, n, half, zr, color = '#7b3fe4' }) {
  const { zScale } = useView()
  const planes = useClipPlanes(zr)
  const geom = useMemo(() => {
    const N = 10
    const pos = []
    const idx = []
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const x = a - half + (2 * half * i) / N
        const y = b - half + (2 * half * j) / N
        pos.push(x, y, (f0 + m * (x - a) + n * (y - b)) * zScale)
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * (N + 1) + i
        idx.push(k, k + 1, k + N + 2, k, k + N + 2, k + N + 1)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    return g
  }, [a, b, f0, m, n, half, zScale])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <group>
      <mesh geometry={geom}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          clippingPlanes={planes}
        />
      </mesh>
      <mesh geometry={geom}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} clippingPlanes={planes} />
      </mesh>
    </group>
  )
}

/** Arrow from `from` to `to` (math coords): shaft line + cone head. */
export function Arrow3D({ from, to, color = '#7b3fe4', width = 5, head = null }) {
  const { P, bounds } = useView()
  const a = P(...from)
  const b = P(...to)
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const len = Math.hypot(...d)
  const size = Math.max(bounds.x[1] - bounds.x[0], bounds.y[1] - bounds.y[0])
  const hl = Math.min(head ?? size * 0.05, len * 0.45) // head length
  const quat = useMemo(() => {
    const q = new THREE.Quaternion()
    if (len > 1e-9) q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d).normalize())
    return q
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d[0], d[1], d[2]])
  if (!(len > 1e-9) || ![...a, ...b].every(Number.isFinite)) return null
  const u = d.map((v) => v / len)
  const base = b.map((v, i) => v - u[i] * hl)
  return (
    <group>
      <Line points={[a, base]} color={color} lineWidth={width} />
      <mesh position={b.map((v, i) => v - (u[i] * hl) / 2)} quaternion={quat}>
        <coneGeometry args={[hl * 0.38, hl, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

/** Parameter range [t0, t1] where (a, b) + t·u stays inside the box xr × yr. */
export function lineInBox(a, b, u, xr, yr) {
  let t0 = -Infinity
  let t1 = Infinity
  const clip = (p, d, lo, hi) => {
    if (Math.abs(d) < 1e-12) return
    const s0 = (lo - p) / d
    const s1 = (hi - p) / d
    t0 = Math.max(t0, Math.min(s0, s1))
    t1 = Math.min(t1, Math.max(s0, s1))
  }
  clip(a, u[0], xr[0], xr[1])
  clip(b, u[1], yr[0], yr[1])
  return [t0, t1]
}

/** Translucent vertical plane through (a, b) along unit direction u, spanning the box. */
export function DirectionPlane({ a, b, u, xr, yr, zr, color = '#e4572e', opacity = 0.12 }) {
  const { zScale } = useView()
  const geom = useMemo(() => {
    const [t0, t1] = lineInBox(a, b, u, xr, yr)
    const p0 = [a + u[0] * t0, b + u[1] * t0]
    const p1 = [a + u[0] * t1, b + u[1] * t1]
    const z0 = zr[0] * zScale
    const z1 = zr[1] * zScale
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([...p0, z0, ...p1, z0, ...p1, z1, ...p0, z1], 3),
    )
    g.setIndex([0, 1, 2, 0, 2, 3])
    return g
  }, [a, b, u, xr, yr, zr, zScale])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}
