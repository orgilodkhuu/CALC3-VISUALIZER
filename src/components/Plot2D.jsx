import { useId, useMemo } from 'react'
import { ticks } from '../lib/view.js'
import { contourSegments, labelSpot } from '../lib/contours.js'
import { fmt } from '../lib/formula.js'

const M = { l: 44, r: 14, t: 12, b: 34 } // margins in SVG units

/**
 * Minimal SVG plot with axes, grid and numbers. children(s) draws inside, where
 * s.x(v) / s.y(v) map data to SVG coords. `equal` keeps 1:1 aspect (for xy contour maps).
 */
export function Plot2D({ xr, yr, xLabel = 'x', yLabel = 'y', equal = false, width = 420, children, title }) {
  const clip = useId().replace(/:/g, '')
  const innerW = width - M.l - M.r
  const innerH = equal ? (innerW * (yr[1] - yr[0])) / (xr[1] - xr[0]) : innerW * 0.62
  const height = innerH + M.t + M.b
  const s = {
    x: (v) => M.l + ((v - xr[0]) / (xr[1] - xr[0])) * innerW,
    y: (v) => M.t + (1 - (v - yr[0]) / (yr[1] - yr[0])) * innerH,
    xr,
    yr,
    clip: `url(#${clip})`,
  }
  const xt = ticks(xr[0], xr[1])
  const yt = ticks(yr[0], yr[1])
  const x0 = Math.min(Math.max(0, xr[0]), xr[1])
  const y0 = Math.min(Math.max(0, yr[0]), yr[1])
  return (
    <figure className="plot2d">
      {title && <figcaption>{title}</figcaption>}
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <clipPath id={clip}>
            <rect x={M.l} y={M.t} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <rect x={M.l} y={M.t} width={innerW} height={innerH} fill="#fff" stroke="#c9d0d7" />
        {xt.map((v) => (
          <line key={`gx${v}`} x1={s.x(v)} x2={s.x(v)} y1={M.t} y2={M.t + innerH} stroke="#eceff2" />
        ))}
        {yt.map((v) => (
          <line key={`gy${v}`} y1={s.y(v)} y2={s.y(v)} x1={M.l} x2={M.l + innerW} stroke="#eceff2" />
        ))}
        <line x1={s.x(x0)} x2={s.x(x0)} y1={M.t} y2={M.t + innerH} stroke="#59636e" strokeWidth="1.3" />
        <line y1={s.y(y0)} y2={s.y(y0)} x1={M.l} x2={M.l + innerW} stroke="#59636e" strokeWidth="1.3" />
        {xt.map((v) => (
          <text key={`tx${v}`} x={s.x(v)} y={M.t + innerH + 16} className="tick" textAnchor="middle">
            {v}
          </text>
        ))}
        {yt.map((v) => (
          <text key={`ty${v}`} x={M.l - 6} y={s.y(v) + 5} className="tick" textAnchor="end">
            {v}
          </text>
        ))}
        <text x={M.l + innerW} y={height - 3} className="axis-name" textAnchor="end">
          {xLabel}
        </text>
        <text x={6} y={M.t + 12} className="axis-name">
          {yLabel}
        </text>
        <g clipPath={s.clip}>{children?.(s)}</g>
      </svg>
    </figure>
  )
}

/** SVG path through [x, y] points; breaks at undefined values and big jumps. */
export function pathD(pts, s) {
  let d = ''
  let pen = false
  const span = s.yr[1] - s.yr[0]
  let prev = null
  for (const [x, y] of pts) {
    if (!Number.isFinite(y) || Math.abs(y - (s.yr[0] + s.yr[1]) / 2) > span * 20) {
      pen = false
      prev = null
      continue
    }
    if (prev !== null && Math.abs(y - prev) > span * 2) pen = false
    d += `${pen ? 'L' : 'M'}${s.x(x).toFixed(1)},${s.y(y).toFixed(1)}`
    pen = true
    prev = y
  }
  return d
}

export const SLICE_COLORS = ['#e4572e', '#1f6fd1', '#2a9d3c', '#8e44ad', '#d68910', '#138d90']

/**
 * Cross sections: z against one input while the other is held fixed.
 * axis 'x' → curves z = f(c, y) for each c in values (plotted against y); axis 'y' → z = f(x, c).
 */
export function CrossSectionPlot({ fn, axis, values, range, zr, colors = SLICE_COLORS, children, title }) {
  const other = axis === 'x' ? 'y' : 'x'
  const curves = useMemo(
    () =>
      values.map((c) => {
        const pts = []
        for (let i = 0; i <= 240; i++) {
          const t = range[0] + ((range[1] - range[0]) * i) / 240
          pts.push([t, axis === 'x' ? fn(c, t) : fn(t, c)])
        }
        return pts
      }),
    [fn, axis, values, range],
  )
  return (
    <Plot2D
      xr={range}
      yr={zr}
      xLabel={other}
      yLabel="z"
      title={title ?? `Cross sections ${axis} = constant`}
    >
      {(s) => (
        <>
          {curves.map((pts, i) => (
            <path key={i} d={pathD(pts, s)} fill="none" stroke={colors[i % colors.length]} strokeWidth="3" />
          ))}
          {children?.(s)}
          <g className="legend">
            {values.map((c, i) => (
              <text
                key={c}
                x={s.x(range[1]) - 6}
                y={s.y(zr[1]) + 18 + i * 18}
                textAnchor="end"
                fill={colors[i % colors.length]}
              >
                {axis} = {fmt(c)}
              </text>
            ))}
          </g>
        </>
      )}
    </Plot2D>
  )
}

/** Contour map: level curves f = c on the xy-plane, each labeled with its height. */
export function ContourPlot({ fn, xr, yr, levels, colors, children, title = 'Contour plot (level curves)' }) {
  const segs = useMemo(() => contourSegments(fn, xr, yr, levels, 160), [fn, xr, yr, levels])
  return (
    <Plot2D xr={xr} yr={yr} xLabel="x" yLabel="y" equal title={title}>
      {(s) => (
        <>
          {segs.map((sg, k) => {
            let d = ''
            for (let i = 0; i < sg.length; i += 4) {
              d += `M${s.x(sg[i]).toFixed(1)},${s.y(sg[i + 1]).toFixed(1)}L${s.x(sg[i + 2]).toFixed(1)},${s.y(sg[i + 3]).toFixed(1)}`
            }
            return <path key={k} d={d} stroke={colors[k]} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          })}
          {segs.map((sg, k) => {
            const p = labelSpot(sg, xr, yr, k)
            if (!p) return null
            return (
              <text
                key={`l${k}`}
                x={s.x(p[0])}
                y={s.y(p[1]) + 5}
                textAnchor="middle"
                className="contour-label"
                fill={colors[k]}
              >
                {fmt(levels[k], 2)}
              </text>
            )
          })}
          {children?.(s)}
        </>
      )}
    </Plot2D>
  )
}
