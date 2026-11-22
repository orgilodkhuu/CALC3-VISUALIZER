// Topic 8. Vector-valued functions F: R^2 -> R^2 (vector fields). Examples from her sheet.

export default {
  problems: [
    {
      id: 'field',
      title: 'Vector field',
      scene: 'field',
      caption: 'At every point (x, y), F gives a vector. Drawn shorter than true length so the arrows fit.',
      examples: [
        { name: 'F = (−y, x)', F: ['-y', 'x'], probe: [1, 3] },
        { name: 'F = (x, y)', F: ['x', 'y'], probe: [2, 1] },
        { name: 'F = (1, 0)', F: ['1', '0'], probe: [1, 1] },
        { name: 'F = (x² − y², 2xy)', F: ['x^2 - y^2', '2*x*y'], probe: [1, 1], x: [-2.5, 2.5], y: [-2.5, 2.5], grid: 0.5 },
      ],
    },
    {
      id: 'gradient',
      title: 'Is it a gradient?',
      scene: 'field',
      check: true,
      caption: 'If F = ∇f, then ∂F₁/∂y = f_xy = f_yx = ∂F₂/∂x. Gradient arrows cross the level curves of f at right angles.',
      examples: [
        { name: '∇(x² + y²) = (2x, 2y)', F: ['2x', '2y'], potential: 'x^2 + y^2', probe: [1, 2] },
        { name: '∇(y − x²) = (−2x, 1)', F: ['-2x', '1'], potential: 'y - x^2', probe: [1, 1] },
        { name: 'F = (−y, x)', F: ['-y', 'x'], probe: [1, 3] },
        { name: 'F = (x² − y², 2xy)', F: ['x^2 - y^2', '2*x*y'], probe: [1, 1], x: [-2.5, 2.5], y: [-2.5, 2.5], grid: 0.5 },
        { name: 'F = (x² + y², 2xy)', F: ['x^2 + y^2', '2*x*y'], potential: 'x^3/3 + x*y^2', probe: [1, 1], x: [-2.5, 2.5], y: [-2.5, 2.5], grid: 0.5 },
      ],
    },
  ],
}
