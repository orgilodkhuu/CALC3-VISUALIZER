// Viridis-like colormap: t in [0,1] -> [r,g,b] in [0,1]. Readable on projectors and colorblind-safe.
const STOPS = [
  [0.267, 0.005, 0.329],
  [0.229, 0.322, 0.546],
  [0.128, 0.567, 0.551],
  [0.369, 0.789, 0.383],
  [0.993, 0.906, 0.144],
]

export function viridis(t) {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(x))
  const f = x - i
  const a = STOPS[i]
  const b = STOPS[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}
