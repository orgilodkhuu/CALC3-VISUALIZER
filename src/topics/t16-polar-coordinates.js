// Topic 16. Polar coordinates (r, θ) and dA = r dr dθ. Examples from the worksheet.

export default {
  problems: [
    {
      id: 'coords',
      title: 'Polar coordinates (r, θ)',
      scene: 'region',
      mode: 'coords',
      caption: 'r is the distance from the origin; θ is the angle from the positive x-axis, in radians. x = r cos θ, y = r sin θ.',
      examples: [
        { name: '#1a: (x, y) = (6, 8)', point: [6, 8] },
        { name: '#1a: (x, y) = (−5, 5)', point: [-5, 5] },
        { name: '#1a: (r, θ) = (5, 3π/2)', polarPoint: [5, (3 * Math.PI) / 2] },
        { name: '#1a: (r, θ) = (10, π/6)', polarPoint: [10, Math.PI / 6] },
      ],
    },
    {
      id: 'wedges',
      title: 'Why dA = r dr dθ',
      scene: 'region',
      mode: 'wedges',
      caption: 'Polar pieces are wedges, nearly rectangles with sides Δr and rΔθ. So ΔA ≈ r Δr Δθ, not Δr Δθ: wedges farther out are bigger.',
      pieces: 6,
      examples: [
        { name: '#6: 10 − x² − y² on the left half of a circle of radius 10', f: '10 - x^2 - y^2', bounds: { order: 'drdt', outer: ['pi/2', '3pi/2'], inner: ['0', '10'] } },
        { name: '#4a: r² on ∫₀⁴ ∫_π^(2π) r³ dθ dr', f: 'r^2', bounds: { order: 'dtdr', outer: [0, 4], inner: ['pi', '2pi'] } },
        { name: '#4a: sin θ on ∫₀^π ∫₀¹ r sin θ dr dθ', f: 'sin(theta)', bounds: { order: 'drdt', outer: [0, 'pi'], inner: ['0', '1'] } },
        { name: '#4a: f = 1 (area) between y = 5√2 and r = 10', f: '1', bounds: { order: 'drdt', outer: ['pi/4', '3pi/4'], inner: ['5sqrt(2)/sin(theta)', '10'] } },
      ],
    },
    {
      id: 'polar-regions',
      title: 'Regions from polar bounds',
      scene: 'region',
      mode: 'region',
      caption: 'Polar bounds describe round regions. The slice is a ray (fixed θ) or an arc (fixed r), from the inner lower limit to the inner upper limit.',
      examples: [
        { name: '#4a: ∫₀⁴ ∫_π^(2π) r³ dθ dr', f: 'r^2', bounds: { order: 'dtdr', outer: [0, 4], inner: ['pi', '2pi'] } },
        { name: '#4a: ∫₀^π ∫₀¹ r sin θ dr dθ', f: 'sin(theta)', bounds: { order: 'drdt', outer: [0, 'pi'], inner: ['0', '1'] } },
        { name: '#4a: ∫₅¹⁰ ∫_(π/3)^(2π/3) r e^(rθ) dθ dr', f: 'exp(r*theta)', bounds: { order: 'dtdr', outer: [5, 10], inner: ['pi/3', '2pi/3'] } },
        { name: '#4a: ∫_(π/4)^(3π/4) ∫_(5√2/sin θ)^10 r dr dθ', f: '1', bounds: { order: 'drdt', outer: ['pi/4', '3pi/4'], inner: ['5sqrt(2)/sin(theta)', '10'] } },
        { name: '#5: the region in polar (0 ≤ θ ≤ π/4, r ≤ 5)', f: '1', bounds: { order: 'drdt', outer: [0, 'pi/4'], inner: ['0', '5'] } },
        { name: '#6: left half of a circle of radius 10', f: '10 - x^2 - y^2', bounds: { order: 'drdt', outer: ['pi/2', '3pi/2'], inner: ['0', '10'] } },
      ],
    },
  ],
}
