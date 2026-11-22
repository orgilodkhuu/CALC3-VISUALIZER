import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Axes from './Axes.jsx'
import { ViewContext } from '../lib/view.js'
import { fmt } from '../lib/formula.js'

/**
 * Reusable 3D stage. Children draw in MATH coordinates (z up) and should map points
 * through useView().P so they respect the z-scale.
 *
 * Props:
 *   bounds   { x: [min,max], y: [min,max], z: [min,max] }  the plot box
 *   zScale   display squash for z (1 = true scale)
 *   view     camera direction [x, y, z] from the box center (math coords), optional
 */
export default function Viewer3D({
  children,
  bounds,
  zScale = 1,
  showGrid = true,
  showTicks = true,
  overlay = null,
  view = null,
}) {
  const controls = useRef()
  const { x, y, z } = bounds
  const size = Math.max(x[1] - x[0], y[1] - y[0], (z[1] - z[0]) * zScale)

  return (
    <div className="viewer">
      <Canvas
        camera={{ position: [10, 10, 10], fov: 40, near: 0.01, far: size * 60 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true
        }}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} />
        <directionalLight position={[-6, -4, 8]} intensity={0.5} />

        <ViewContext.Provider value={{ zScale, bounds }}>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <Suspense fallback={null}>
              <Axes bounds={bounds} zScale={zScale} showGrid={showGrid} showTicks={showTicks} />
            </Suspense>
            <Suspense fallback={null}>{children}</Suspense>
          </group>
        </ViewContext.Provider>

        <FitCamera bounds={bounds} zScale={zScale} controls={controls} view={view} />
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.12}
        />
      </Canvas>

      <div className="viewer-buttons">
        <button onClick={() => controls.current?.reset()} title="Reset the camera">
          Reset view
        </button>
      </div>
      {(overlay || zScale !== 1) && (
        <div className="viewer-overlay">
          {overlay}
          {zScale !== 1 && (
            <div className="zscale-note">z axis compressed to fit</div>
          )}
        </div>
      )}
      <div className="viewer-hint">Drag to rotate · scroll to zoom · right-drag to pan</div>
    </div>
  )
}

// math (x, y, z) -> three (x, z, -y)
const toThree = (p) => [p[0], p[2], -p[1]]

/**
 * Place the camera so the whole plot box fits the viewer, from a textbook angle
 * (x toward the viewer-left, y to the right, z up). Runs when the box changes.
 */
function FitCamera({ bounds, zScale, controls, view }) {
  const { camera, size } = useThree()
  const ready = size.width > 0 && size.height > 0
  useEffect(() => {
    if (!ready) return
    const span = (r) => [Math.min(r[0], 0), Math.max(r[1], 0)] // the axes always reach the origin
    const bx = span(bounds.x)
    const by = span(bounds.y)
    const bz = span(bounds.z).map((v) => v * zScale)
    const c = [(bx[0] + bx[1]) / 2, (by[0] + by[1]) / 2, (bz[0] + bz[1]) / 2]
    const R = 0.5 * Math.hypot(bx[1] - bx[0], by[1] - by[0], bz[1] - bz[0])
    const vFov = (camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height))
    const d = (R / Math.sin(Math.min(vFov, hFov) / 2)) * 1.02
    const dir = view ?? [0.78, 0.47, 0.42]
    const n = Math.hypot(...dir)
    const pos = c.map((v, i) => v + (dir[i] / n) * d)
    camera.position.set(...toThree(pos))
    camera.far = d * 20
    camera.updateProjectionMatrix()
    const ctl = controls.current
    if (ctl) {
      ctl.target.set(...toThree(c))
      ctl.minDistance = d * 0.15
      ctl.maxDistance = d * 5
      ctl.update()
      ctl.saveState() // "Reset view" returns here
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds, zScale, ready])
  return null
}
