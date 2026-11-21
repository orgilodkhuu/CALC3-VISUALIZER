import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Axes from './Axes.jsx'

/**
 * Reusable 3D stage used by every module.
 *
 * Children are placed in MATH coordinates (x, y, z) with z pointing up.
 * Internally we rotate one group so Three.js (y-up) shows z-up like a textbook.
 *
 * Props:
 *   range      { x, y, z } half-lengths of the axes (default 5)
 *   showGrid   draw the xy-plane grid
 *   showTicks  draw numbers on the axes
 *   camera     starting camera position in math coords
 */
export default function Viewer3D({
  children,
  range = { x: 5, y: 5, z: 5 },
  showGrid = true,
  showTicks = true,
  camera = [9, 5.5, 6],
  overlay = null,
}) {
  const controls = useRef()
  // math (x, y, z) -> three (x, z, -y)
  const camPos = [camera[0], camera[2], -camera[1]]
  const dist = Math.hypot(...camera)

  return (
    <div className="viewer">
      <Canvas
        camera={{ position: camPos, fov: 45, near: 0.1, far: 500 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true
        }}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} />
        <directionalLight position={[-6, -4, 8]} intensity={0.5} />

        <group rotation={[-Math.PI / 2, 0, 0]}>
          <Suspense fallback={null}>
            <Axes range={range} showGrid={showGrid} showTicks={showTicks} />
          </Suspense>
          {children}
        </group>

        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.12}
          minDistance={dist * 0.25}
          maxDistance={dist * 4}
        />
      </Canvas>

      <div className="viewer-buttons">
        <button onClick={() => controls.current?.reset()} title="Reset the camera">
          Reset view
        </button>
      </div>
      {overlay && <div className="viewer-overlay">{overlay}</div>}
      <div className="viewer-hint">Drag to rotate · scroll to zoom · right-drag to pan</div>
    </div>
  )
}

/** Convert a Three.js world point (from a pointer event) back to math coords. */
export function toMath(p) {
  return [p.x, -p.z, p.y]
}
