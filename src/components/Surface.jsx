import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { viridis } from '../lib/colormap.js'
import { useView } from '../lib/view.js'

/**
 * Plots z = f(x, y) over the box x in xr, y in yr, cut off at z in zr.
 * Must be inside <Viewer3D>.
 *
 * Props: fn, xr, yr, zr, resolution, meshLines, opacity, onHover([x,y,z] | null)
 */
export default function Surface({
  fn,
  xr,
  yr,
  zr,
  resolution = 100,
  meshLines = true,
  opacity = 1,
  onHover,
}) {
  const { zScale } = useView()
  const { geometry, lines } = useMemo(
    () => buildSurface(fn, xr, yr, zr, resolution, zScale),
    [fn, xr, yr, zr, resolution, zScale],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      lines.dispose()
    },
    [geometry, lines],
  )

  const planes = useClipPlanes(zr)

  const hover = (e) => {
    if (!onHover) return
    e.stopPropagation()
    const p = e.point
    onHover([p.x, -p.z, p.y / zScale])
  }

  return (
    <group>
      <mesh geometry={geometry} onPointerMove={hover} onPointerOut={() => onHover?.(null)}>
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
          <lineBasicMaterial color="#1b1b1b" transparent opacity={0.3} clippingPlanes={planes} />
        </lineSegments>
      )}
    </group>
  )
}

/** Clipping planes that keep zr[0] <= z <= zr[1] (in Three.js world coords, math z = world y). */
export function useClipPlanes(zr) {
  const { zScale } = useView()
  return useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(0, -1, 0), zr[1] * zScale + 1e-4),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -zr[0] * zScale + 1e-4),
    ],
    [zr, zScale],
  )
}

function buildSurface(fn, xr, yr, zr, n, zScale) {
  const N = Math.max(4, Math.round(n))
  const V = N + 1
  const pos = new Float32Array(V * V * 3)
  const col = new Float32Array(V * V * 3)
  const ok = new Uint8Array(V * V)
  const zSpan = zr[1] - zr[0]
  const zLo = zr[0] - zSpan * 20
  const zHi = zr[1] + zSpan * 20 // keep wild values bounded so clipping stays numerically sane
  const color = (k, z) => {
    const [r, g, b] = viridis((z - zr[0]) / zSpan)
    col[3 * k] = r
    col[3 * k + 1] = g
    col[3 * k + 2] = b
  }

  for (let j = 0; j < V; j++) {
    const y = yr[0] + ((yr[1] - yr[0]) * j) / N
    for (let i = 0; i < V; i++) {
      const x = xr[0] + ((xr[1] - xr[0]) * i) / N
      const k = j * V + i
      let z = fn ? fn(x, y) : NaN
      if (Number.isFinite(z)) {
        ok[k] = 1
        z = Math.max(zLo, Math.min(zHi, z))
      } else {
        z = 0
      }
      pos[3 * k] = x
      pos[3 * k + 1] = y
      pos[3 * k + 2] = z
      color(k, z)
    }
  }

  // Where the surface stops inside the box (e.g. sqrt(9 - x^2 - y^2), ln(2x - y)), move each
  // undefined vertex next to a defined one onto the boundary, found by bisection.
  if (fn) {
    const snapped = []
    for (let j = 0; j < V; j++) {
      for (let i = 0; i < V; i++) {
        const k = j * V + i
        if (ok[k]) continue
        let best = null
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di
          const nj = j + dj
          if (ni < 0 || nj < 0 || ni >= V || nj >= V || !ok[nj * V + ni]) continue
          const m = nj * V + ni
          const ax = pos[3 * m], ay = pos[3 * m + 1], bx = pos[3 * k], by = pos[3 * k + 1]
          let lo = 0
          let hi = 1
          let z = pos[3 * m + 2]
          for (let it = 0; it < 18; it++) {
            const t = (lo + hi) / 2
            const v = fn(ax + (bx - ax) * t, ay + (by - ay) * t)
            if (Number.isFinite(v)) {
              lo = t
              z = v
            } else hi = t
          }
          if (!best || lo > best.t) best = { t: lo, x: ax + (bx - ax) * lo, y: ay + (by - ay) * lo, z }
        }
        if (best) snapped.push([k, best])
      }
    }
    for (const [k, b] of snapped) {
      const z = Math.max(zLo, Math.min(zHi, b.z))
      pos[3 * k] = b.x
      pos[3 * k + 1] = b.y
      pos[3 * k + 2] = z
      ok[k] = 1
      color(k, z)
    }
  }

  // Skip triangles with a missing vertex, and triangles that jump across the whole visible
  // window in one cell (a discontinuity like 1/x, not a real wall).
  const maxJump = 2 * zSpan
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
      const cnt = ok[a] + ok[b] + ok[c] + ok[d]
      if (cnt === 4) {
        if (goodTri(a, b, d)) idx.push(a, b, d)
        if (goodTri(a, d, c)) idx.push(a, d, c)
      } else if (cnt === 3) {
        // Boundary cell: keep the triangle made of its three defined corners.
        const ring = [a, b, d, c].filter((v) => ok[v])
        if (goodTri(ring[0], ring[1], ring[2])) idx.push(ring[0], ring[1], ring[2])
      }
    }
  }

  // Mesh lines: about 20 in each direction, like graph paper on the surface.
  const every = Math.max(1, Math.round(N / 20))
  const seg = []
  const push = (a, b) => {
    if (!ok[a] || !ok[b] || Math.abs(zOf(a) - zOf(b)) > maxJump) return
    seg.push(pos[3 * a], pos[3 * a + 1], pos[3 * a + 2] * zScale)
    seg.push(pos[3 * b], pos[3 * b + 1], pos[3 * b + 2] * zScale)
  }
  for (let j = 0; j <= N; j += every) for (let i = 0; i < N; i++) push(j * V + i, j * V + i + 1)
  for (let i = 0; i <= N; i += every) for (let j = 0; j < N; j++) push(j * V + i, (j + 1) * V + i)

  // Apply the display z-scale last (all checks above use true z).
  for (let k = 0; k < V * V; k++) pos[3 * k + 2] *= zScale

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geometry.setIndex(idx)
  geometry.computeVertexNormals()

  const lines = new THREE.BufferGeometry()
  lines.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3))

  return { geometry, lines }
}
