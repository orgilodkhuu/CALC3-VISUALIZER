import { Billboard, Line, Text } from '@react-three/drei'

const AXIS_COLORS = { x: '#d62728', y: '#2ca02c', z: '#1f5fd6' }
const DIR = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }

// Fonts ship with the app (public/fonts) so it works offline in a classroom.
const FONT = `${import.meta.env.BASE_URL}fonts/inter-latin-400-normal.woff`
const FONT_BOLD = `${import.meta.env.BASE_URL}fonts/inter-latin-700-normal.woff`

function tickStep(r) {
  if (r <= 6) return 1
  if (r <= 12) return 2
  return 5
}

/**
 * Text that always faces the camera and is hidden behind surfaces (depth-tested).
 * Usable by any module for labeling points, vectors, etc. Coordinates are math coords.
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

/** One axis: line through the origin, arrowhead at the + end, letter label. */
function Axis({ name, r, s }) {
  const dir = DIR[name]
  const color = AXIS_COLORS[name]
  const end = dir.map((d) => d * (r + 0.5 * s))
  const start = dir.map((d) => d * -r)
  // Cone geometry points along local +y; rotate it onto the axis.
  const coneRot = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] }[name]
  return (
    <group>
      <Line points={[start, end]} color={color} lineWidth={3} />
      <mesh position={end} rotation={coneRot}>
        <coneGeometry args={[0.13 * s, 0.4 * s, 20]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Label3D position={dir.map((d) => d * (r + 1.1 * s))} color={color} size={0.55 * s} bold>
        {name}
      </Label3D>
    </group>
  )
}

function Ticks({ name, r, s }) {
  const dir = DIR[name]
  // Nudge numbers off the axis line so they stay readable.
  const off = { x: [0, -0.3, 0], y: [-0.3, 0, 0], z: [-0.3, 0.3, 0] }[name].map((v) => v * s)
  const step = tickStep(r)
  const out = []
  for (let v = -Math.floor(r / step) * step; v <= r + 1e-9; v += step) {
    if (v === 0) continue
    out.push(
      <group key={v}>
        <Line
          points={[dir.map((d) => d * v), dir.map((d, i) => d * v + off[i] * 0.35)]}
          color="#39424c"
          lineWidth={1.5}
        />
        <Label3D position={dir.map((d, i) => d * v + off[i])} size={0.26 * s}>
          {v}
        </Label3D>
      </group>,
    )
  }
  return out
}

export default function Axes({ range, showGrid = true, showTicks = true }) {
  const maxR = Math.max(range.x, range.y, range.z)
  const s = Math.max(0.7, maxR / 5) // label/arrow scale so they stay readable when zoomed out
  const gridSize = 2 * Math.ceil(Math.max(range.x, range.y))
  return (
    <group>
      {showGrid && (
        // gridHelper lies in its local XZ plane; rotate it into the math xy-plane.
        <gridHelper
          args={[gridSize, gridSize, '#9aa3ad', '#d9dee3']}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
      <Axis name="x" r={range.x} s={s} />
      <Axis name="y" r={range.y} s={s} />
      <Axis name="z" r={range.z} s={s} />
      {showTicks && (
        <>
          <Ticks name="x" r={range.x} s={s} />
          <Ticks name="y" r={range.y} s={s} />
          <Ticks name="z" r={range.z} s={s} />
        </>
      )}
    </group>
  )
}
