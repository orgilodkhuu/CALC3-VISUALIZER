import { useEffect, useRef, useState } from 'react'
import { ticks } from '../lib/view.js'

/**
 * Big 2D coordinate plane that fills its container with a 1:1 scale (a unit is a unit in x and y).
 * The visible range always contains xr × yr; the longer side is widened to fit the screen.
 * children(s) draws in data coords via s.x(v), s.y(v); s.toData(px, py) converts back.
 */
export default function Plane2D({ xr, yr, children, onBackgroundPointer }) {
  const box = useRef(null)
  const svg = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = 36
  const { w, h } = size
  let s = null
  if (w > 0 && h > 0) {
    const sx = xr[1] - xr[0]
    const sy = yr[1] - yr[0]
    const unit = Math.min((w - 2 * pad) / sx, (h - 2 * pad) / sy) // px per data unit
    const cx = (xr[0] + xr[1]) / 2
    const cy = (yr[0] + yr[1]) / 2
    const vx = [cx - (w / 2) / unit, cx + (w / 2) / unit] // visible range (wider than xr if room)
    const vy = [cy - (h / 2) / unit, cy + (h / 2) / unit]
    s = {
      unit,
      vx,
      vy,
      x: (v) => w / 2 + (v - cx) * unit,
      y: (v) => h / 2 - (v - cy) * unit,
      toData: (px, py) => [cx + (px - w / 2) / unit, cy - (py - h / 2) / unit],
      svg,
    }
  }

  const step = s ? (s.unit >= 28 ? 1 : s.unit >= 12 ? 2 : 5) : 1
  const gx = s ? ticks(Math.ceil(s.vx[0]), Math.floor(s.vx[1]), step) : []
  const gy = s ? ticks(Math.ceil(s.vy[0]), Math.floor(s.vy[1]), step) : []
  const labelEvery = s && s.unit < 40 ? 2 : 1

  return (
    <div className="plane2d" ref={box}>
      {s && (
        <svg
          ref={svg}
          width={w}
          height={h}
          onPointerDown={(e) => {
            if (!onBackgroundPointer) return
            const r = svg.current.getBoundingClientRect()
            onBackgroundPointer(s.toData(e.clientX - r.left, e.clientY - r.top))
          }}
        >
          {gx.map((v) => (
            <line key={`gx${v}`} x1={s.x(v)} x2={s.x(v)} y1={0} y2={h} stroke={v === 0 ? '#59636e' : '#e3e7ec'} strokeWidth={v === 0 ? 1.6 : 1} />
          ))}
          {gy.map((v) => (
            <line key={`gy${v}`} y1={s.y(v)} y2={s.y(v)} x1={0} x2={w} stroke={v === 0 ? '#59636e' : '#e3e7ec'} strokeWidth={v === 0 ? 1.6 : 1} />
          ))}
          {gx
            .filter((v) => v !== 0 && (v / step) % labelEvery === 0)
            .map((v) => (
              <text key={`tx${v}`} x={s.x(v)} y={s.y(0) + 18} textAnchor="middle" className="plane-tick">
                {v}
              </text>
            ))}
          {gy
            .filter((v) => v !== 0 && (v / step) % labelEvery === 0)
            .map((v) => (
              <text key={`ty${v}`} x={s.x(0) - 8} y={s.y(v) + 5} textAnchor="end" className="plane-tick">
                {v}
              </text>
            ))}
          <text x={w - 12} y={s.y(0) - 10} textAnchor="end" className="plane-axis">
            x
          </text>
          <text x={s.x(0) + 12} y={18} className="plane-axis">
            y
          </text>
          {children?.(s)}
        </svg>
      )}
    </div>
  )
}

/** Arrow from (x1, y1) to (x2, y2) in data coords, with an optional label near its middle. */
export function Arrow({ s, from, to, color, width = 4, label, labelSide = 1, dashed = false, head = 16, opacity = 1 }) {
  const x1 = s.x(from[0])
  const y1 = s.y(from[1])
  const x2 = s.x(to[0])
  const y2 = s.y(to[1])
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (!(len > 0.5)) return null
  const ux = dx / len
  const uy = dy / len
  const hl = Math.min(head, len * 0.5)
  const bx = x2 - ux * hl
  const by = y2 - uy * hl
  const hw = hl * 0.42
  // Label beside the middle of the arrow, on its left (labelSide = 1) or right (-1).
  const mx = (x1 + x2) / 2 - uy * 20 * labelSide
  const my = (y1 + y2) / 2 + ux * 20 * labelSide
  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? '8 6' : undefined}
      />
      <polygon points={`${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}`} fill={color} />
      {label && (
        <text x={mx} y={my + 6} textAnchor="middle" className="vec-label" fill={color}>
          {label}
        </text>
      )}
    </g>
  )
}

/**
 * Draggable point (usually an arrow tip). Snaps to `snap` (data units) so values stay
 * friendly, e.g. (3, 4) rather than (2.97, 4.03). Big invisible hit area for touch/projector.
 */
export function Handle({ s, p, onChange, color = '#111', snap = 0.5, label }) {
  const start = (e) => {
    e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev) => {
      const r = s.svg.current.getBoundingClientRect()
      const [x, y] = s.toData(ev.clientX - r.left, ev.clientY - r.top)
      const q = (v) => Math.round(v / snap) * snap
      onChange([q(x), q(y)])
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  return (
    <g className="handle" onPointerDown={start}>
      <circle cx={s.x(p[0])} cy={s.y(p[1])} r={22} fill="transparent" />
      <circle cx={s.x(p[0])} cy={s.y(p[1])} r={8} fill="#fff" stroke={color} strokeWidth={3} />
      {label && (
        <text x={s.x(p[0]) + 12} y={s.y(p[1]) - 12} className="vec-label small" fill={color}>
          {label}
        </text>
      )}
    </g>
  )
}
