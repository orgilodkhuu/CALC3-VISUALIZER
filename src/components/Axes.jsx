import { useMemo } from 'react'
import { Billboard, Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import { ticks, tickStep } from '../lib/view.js'

export const AXIS_COLORS = { x: '#d62728', y: '#2ca02c', z: '#1f5fd6' }

// Fonts ship with the app (public/fonts) so it works offline in a classroom.
const FONT = `${import.meta.env.BASE_URL}fonts/inter-latin-400-normal.woff`
const FONT_BOLD = `${import.meta.env.BASE_URL}fonts/inter-latin-700-normal.woff`

/**
 * Camera-facing text, hidden behind surfaces (depth-tested). Position is in SCENE coords
 * (already z-scaled); use useView().P to convert from math coords.
 */
export function Label3D({ position, children, size = 0.3, color = '#2b333b', bold = false }) {
  return (
    <Billboard position={position}>
      <Text
        font={bold ? FONT_BOLD : FONT}
        fontSize={size}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={size * 0.12}
        outlineColor="#ffffff"
      >
        {String(children)}
      </Text>
    </Billboard>
  )
}

/** Axes through the origin, spanning the plot box (and always including 0). */
export default function Axes({ bounds, zScale = 1, showGrid = true, showTicks = true }) {
  const span = (r) => [Math.min(r[0], 0), Math.max(r[1], 0)]
  const ax = { x: span(bounds.x), y: span(bounds.y), z: span(bounds.z) }
  // Scale arrows and text to the whole drawn box (including the origin), like the camera fit.
  const diag = Math.hypot(ax.x[1] - ax.x[0], ax.y[1] - ax.y[0], (ax.z[1] - ax.z[0]) * zScale)
  const s = diag / 10
  const sc = (name, v) => (name === 'z' ? v * zScale : v)
  const at = (name, v, off = [0, 0, 0]) => {
    const p = [off[0], off[1], off[2]]
    p[{ x: 0, y: 1, z: 2 }[name]] += sc(name, v)
    return p
  }

  const grid = useMemo(() => {
    const pts = []
    const xs = ticks(bounds.x[0], bounds.x[1])
    const ys = ticks(bounds.y[0], bounds.y[1])
    for (const x of xs) pts.push(x, bounds.y[0], 0, x, bounds.y[1], 0)
    for (const y of ys) pts.push(bounds.x[0], y, 0, bounds.x[1], y, 0)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [bounds.x, bounds.y])

  const coneRot = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] }
  const tickOff = { x: [0, -0.9, 0], y: [-0.9, 0, 0], z: [-0.7, 0.7, 0] }

  return (
    <group>
      {showGrid && (
        <lineSegments geometry={grid}>
          <lineBasicMaterial color="#c9d0d7" />
        </lineSegments>
      )}
      {['x', 'y', 'z'].map((name) => {
        const [lo, hi] = ax[name]
        const end = at(name, hi)
        end[{ x: 0, y: 1, z: 2 }[name]] += 0.5 * s
        const color = AXIS_COLORS[name]
        // Fewer numbers on axes that are short on screen, so they don't pile up.
        const shown = (hi - lo) * (name === 'z' ? zScale : 1)
        const count = Math.max(2, Math.min(8, Math.round((12 * shown) / diag)))
        const step = ticks(lo, hi, tickStep(hi - lo, count))
        return (
          <group key={name}>
            <Line points={[at(name, lo), end]} color={color} lineWidth={3} />
            <mesh position={end} rotation={coneRot[name]}>
              <coneGeometry args={[0.13 * s, 0.4 * s, 20]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Label3D
              position={(() => {
                const p = [...end]
                p[{ x: 0, y: 1, z: 2 }[name]] += 0.6 * s
                return p
              })()}
              color={color}
              size={0.55 * s}
              bold
            >
              {name}
            </Label3D>
            {showTicks &&
              step
                .filter((v) => v !== 0)
                .map((v) => (
                  <Label3D
                    key={v}
                    position={at(name, v, tickOff[name].map((o) => o * 0.35 * s))}
                    size={0.27 * s}
                  >
                    {v}
                  </Label3D>
                ))}
          </group>
        )
      })}
    </group>
  )
}
