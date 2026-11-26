// Topic 13. The 2D curl: curl F(a, b) = lim ∮_C F · dr / ΔA = ∂F₂/∂x − ∂F₁/∂y. Examples from the worksheet.

export default {
  problems: [
    {
      id: 'loop',
      title: 'Circulation ÷ area',
      scene: 'curl',
      mode: 'loop',
      caption: 'Definition from the worksheet: go around a small loop C counter-clockwise, add up F · dr, divide by the area. Shrink the loop to get curl F(a, b).',
      examples: [
        { name: '#3a: F = (−y, x), circle at (0, 0)', F: ['-y', 'x'], point: [0, 0], shape: 'circle', size: 1 },
        { name: '#3b: F = (−y, x), square at (0, 0)', F: ['-y', 'x'], point: [0, 0], shape: 'square', size: 1 },
        { name: '#5a: F = (x, y)', F: ['x', 'y'], point: [1, 1], shape: 'circle', size: 1 },
        { name: '#5c: F = (y ln(xy), x/y)', F: ['y*ln(x*y)', 'x/y'], point: [2, 2], shape: 'square', size: 0.5, x: [0, 4.5], y: [0, 4.5], grid: 0.5 },
        { name: 'Shear F = (y, 0)', F: ['y', '0'], point: [0, 1], shape: 'square', size: 1 },
      ],
    },
    {
      id: 'map',
      title: 'Curl at every point',
      scene: 'curl',
      mode: 'map',
      caption: 'curl F = ∂F₂/∂x − ∂F₁/∂y. Red: counter-clockwise spin, blue: clockwise. Drag the paddle wheel.',
      examples: [
        { name: '#5b: F = (−y, x)', F: ['-y', 'x'], point: [1, 1] },
        { name: '#5a: F = (x, y)', F: ['x', 'y'], point: [1, 1] },
        { name: '#5c: F = (y ln(xy), x/y)', F: ['y*ln(x*y)', 'x/y'], point: [1, 1], x: [0, 4.5], y: [0, 4.5], grid: 0.5 },
        { name: 'Shear F = (y, 0)', F: ['y', '0'], point: [0, 1] },
        { name: 'F = (x² − y², 2xy)', F: ['x^2 - y^2', '2*x*y'], point: [1, 1], x: [-2.5, 2.5], y: [-2.5, 2.5], grid: 0.5 },
      ],
    },
  ],
}
