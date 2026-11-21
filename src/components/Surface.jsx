import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { viridis } from '../lib/colormap.js'

/**
 * Plots z = f(x, y) over [-xr, xr] x [-yr, yr], cut off at z = ±zClip.
 * Must be rendered inside <Viewer3D> (math coordinates).
 *
 * Props:
 *   fn          (x, y) => z   (NaN/Infinity leave a gap instead of crashing)
 *   xr, yr      half-widths of the domain
 *   zClip       the surface is cut at z = zClip and z = -zClip
 *   resolution  grid cells per side (the "quality" slider)
 *   meshLines   draw x = const / y = const lines on the surface
 *   opacity     1 = solid
 *   onHover     ([x, y, z] | null) => void
 */
export default function Surface({
  fn,
  xr = 3,
  yr = 3,
  zClip = 5,
  resolution = 100,
  meshLines = true,
  opacity = 1,
  onHover,
}) {
  const { geometry, lines } = useMemo(
    () => buildSurface(fn, xr, yr, zClip, resolution),
    [fn, xr, yr, zClip, resolution],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      lines.dispose()
    },
    [geometry, lines],
  )

  // Clipping planes are in Three.js world coords, where math z is world y.
  const planes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), zClip),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), zClip),
    ],
    [zClip],
  )

  const hover = (e) => {
    if (!onHover) return
    e.stopPropagation()
    const p = e.point
    onHover([p.x, -p.z, p.y])
  }

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerMove={hover}
        onPointerOut={() => onHover?.(null)}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.55}
          metalness={0.05}
          clippingPlanes={planes}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity >= 1}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {meshLines && (
        <lineSegments geometry={lines}>
          <lineBasicMaterial color="#1b1b1b" transparent opacity={0.35} clippingPlanes={planes} />
        </lineSegments>
      )}
    </group>
  )
}

function buildSurface(fn, xr, yr, zClip, n) {
  const N = Math.max(4, Math.round(n))
  const V = N + 1
  const pos = new Float32Array(V * V * 3)
  const col = new Float32Array(V * V * 3)
  const ok = new Uint8Array(V * V)
  const big = zClip * 50 // keep wild values bounded so clipping stays numerically sane

  for (let j = 0; j < V; j++) {
    const y = -yr + (2 * yr * j) / N
    for (let i = 0; i < V; i++) {
      const x = -xr + (2 * xr * i) / N
      const k = j * V + i
      let z = fn ? fn(x, y) : NaN
      if (Number.isFinite(z)) {
        ok[k] = 1
        z = Math.max(-big, Math.min(big, z))
      } else {
        z = 0
      }
      pos[3 * k] = x
      pos[3 * k + 1] = y
      pos[3 * k + 2] = z
      const [r, g, b] = viridis((z + zClip) / (2 * zClip))
      col[3 * k] = r
      col[3 * k + 1] = g
      col[3 * k + 2] = b
    }
  }

  // Smooth edges where the surface stops inside the domain (e.g. sqrt(9 - x^2 - y^2)):
  // move each undefined vertex that touches a defined one onto the boundary, found by bisection.
  if (fn) {
    const snapped = []
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < V; i++) {
        const k = j * V + i
        if (ok[k]) continue
        let best = null
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di, nj = j + dj
          if (ni < 0 || nj < 0 || ni >= V || nj >= V || !ok[nj * V + ni]) continue
          const n = nj * V + ni
          // Bisect between the defined neighbour (t=0) and this vertex (t=1).
          const ax = pos[3 * n], ay = pos[3 * n + 1], bx = pos[3 * k], by = pos[3 * k + 1]
          let lo = 0, hi = 1, z = pos[3 * n + 2]
          for (let it = 0; it < 18; it++) {
            const t = (lo + hi) / 2
            const v = fn(ax + (bx - ax) * t, ay + (by - ay) * t)
            if (Number.isFinite(v)) { lo = t; z = v } else hi = t
          }
          if (!best || lo > best.t) best = { t: lo, x: ax + (bx - ax) * lo, y: ay + (by - ay) * lo, z }
        }
        if (best) snapped.push([k, best])
      }
    }
    for (const [k, b] of snapped) {
      const z = Math.max(-big, Math.min(big, b.z))
      pos[3 * k] = b.x
      pos[3 * k + 1] = b.y
      pos[3 * k + 2] = z
      ok[k] = 1
      const [r, g, bb] = viridis((z + zClip) / (2 * zClip))
      col[3 * k] = r
      col[3 * k + 1] = g
      col[3 * k + 2] = bb
    }
  }

  // Skip triangles with a missing vertex, and triangles that jump across the whole
  // visible window in one cell (a discontinuity like 1/x, not a real wall).
  const maxJump = 2 * zClip
  const zOf = (k) => pos[3 * k + 2]
  const goodTri = (a, b, c) => {
    if (!(ok[a] && ok[b] && ok[c])) return false
    const za = zOf(a), zb = zOf(b), zc = zOf(c)
    return Math.max(za, zb, zc) - Math.min(za, zb, zc) <= maxJump
  }

  const idx = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * V + i
      const b = a + 1
      const c = a + V
      const d = c + 1
      const n = ok[a] + ok[b] + ok[c] + ok[d]
      if (n === 4) {
        if (goodTri(a, b, d)) idx.push(a, b, d)
        if (goodTri(a, d, c)) idx.push(a, d, c)
      } else if (n === 3) {
        // Boundary cell: keep the one triangle made of its three defined corners.
        const ring = [a, b, d, c].filter((v) => ok[v])
        if (goodTri(ring[0], ring[1], ring[2])) idx.push(ring[0], ring[1], ring[2])
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()

  // Mesh lines: about 20 lines in each direction, like graph-paper on the surface.
  const every = Math.max(1, Math.round(N / 20))
  const seg = []
  const push = (a, b) => {
    if (!ok[a] || !ok[b] || Math.abs(zOf(a) - zOf(b)) > maxJump) return
    seg.push(pos[3 * a], pos[3 * a + 1], pos[3 * a + 2], pos[3 * b], pos[3 * b + 1], pos[3 * b + 2])
  }
  for (let j = 0; j <= N; j += every) for (let i = 0; i < N; i++) push(j * V + i, j * V + i + 1)
  for (let i = 0; i <= N; i += every) for (let j = 0; j < N; j++) push(j * V + i, (j + 1) * V + i)
  const lines = new THREE.BufferGeometry()
  lines.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))

  return { geometry, lines }
}
