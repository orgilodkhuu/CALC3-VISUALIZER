/**
 * Marching squares. Returns, for each level, a flat array of segments
 * [x1, y1, x2, y2, x1, y1, ...] where f(x, y) = level.
 */
export function contourSegments(fn, xr, yr, levels, n = 120) {
  const V = n + 1
  const xs = new Float64Array(V)
  const ys = new Float64Array(V)
  for (let i = 0; i < V; i++) {
    xs[i] = xr[0] + ((xr[1] - xr[0]) * i) / n
    ys[i] = yr[0] + ((yr[1] - yr[0]) * i) / n
  }
  const z = new Float64Array(V * V)
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) z[j * V + i] = fn(xs[i], ys[j])

  return levels.map((L) => {
    const out = []
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        // corners: a(i,j) b(i+1,j) c(i+1,j+1) d(i,j+1)
        const za = z[j * V + i], zb = z[j * V + i + 1], zc = z[(j + 1) * V + i + 1], zd = z[(j + 1) * V + i]
        if (!(Number.isFinite(za) && Number.isFinite(zb) && Number.isFinite(zc) && Number.isFinite(zd))) continue
        const pts = []
        const edge = (z1, z2, x1, y1, x2, y2) => {
          if ((z1 < L) === (z2 < L)) return
          const t = (L - z1) / (z2 - z1)
          pts.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
        }
        const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1]
        edge(za, zb, x0, y0, x1, y0)
        edge(zb, zc, x1, y0, x1, y1)
        edge(zc, zd, x1, y1, x0, y1)
        edge(zd, za, x0, y1, x0, y0)
        // Skip cells that straddle a jump (like 1/x near 0) instead of drawing a fake line.
        const span = Math.max(za, zb, zc, zd) - Math.min(za, zb, zc, zd)
        if (span > 1e6) continue
        if (pts.length === 4) out.push(...pts)
        else if (pts.length === 8) {
          // Saddle cell: pick pairing by the center value.
          const zm = (za + zb + zc + zd) / 4
          if ((zm < L) === (za < L)) out.push(pts[0], pts[1], pts[6], pts[7], pts[2], pts[3], pts[4], pts[5])
          else out.push(pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7])
        }
      }
    }
    return out
  })
}

/** A point on the level set to put its number label: the segment closest to a target spot. */
export function labelSpot(segs, xr, yr, k = 0) {
  if (segs.length < 4) return null
  // Spread labels around the box so they don't pile up: aim at a point that depends on k.
  const ang = 0.7 + k * 1.3
  const tx = (xr[0] + xr[1]) / 2 + Math.cos(ang) * (xr[1] - xr[0]) * 0.3
  const ty = (yr[0] + yr[1]) / 2 + Math.sin(ang) * (yr[1] - yr[0]) * 0.3
  let best = null
  let bd = Infinity
  for (let s = 0; s < segs.length; s += 4) {
    const mx = (segs[s] + segs[s + 2]) / 2
    const my = (segs[s + 1] + segs[s + 3]) / 2
    const d = (mx - tx) ** 2 + (my - ty) ** 2
    if (d < bd) {
      bd = d
      best = [mx, my]
    }
  }
  return best
}

/** Evenly spaced "nice" levels across a z-range. */
export function autoLevels(zr, count = 9) {
  const raw = (zr[1] - zr[0]) / count
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  const step = (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
  const out = []
  for (let v = Math.ceil(zr[0] / step) * step; v <= zr[1] + 1e-9; v += step) out.push(Number(v.toPrecision(10)))
  return out
}
