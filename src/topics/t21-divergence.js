// Topic 21. Divergence: flux out of a small region ÷ its volume (or area). Examples from the worksheet.

export default {
  problems: [
    {
      id: 'box',
      title: 'Flux out of a small box',
      scene: 'field3',
      mode: 'div',
      caption: 'Definition from the worksheet: add up F · ΔA over the 6 faces of a small box (outward), divide by its volume. Shrink the box to get div F.',
      examples: [
        { name: '#4a: F = (xyz, x + 2y + 3z, xy²z³) at (1, 2, 3)', F: ['x*y*z', 'x + 2y + 3z', 'x*y^2*z^3'], point: [1, 2, 3], size: 0.5 },
        { name: 'Spreading out: F = (x, y, z)', F: ['x', 'y', 'z'], point: [0, 0, 0], size: 1 },
        { name: 'Flowing in: F = (−x, −y, −z)', F: ['-x', '-y', '-z'], point: [0, 0, 0], size: 1 },
        { name: 'Same everywhere: F = (0, 0, 1)', F: ['0', '0', '1'], point: [0, 0, 0], size: 1 },
        { name: 'F = (x², 0, 0)', F: ['x^2', '0', '0'], point: [1, 0, 0], size: 1 },
      ],
    },
    {
      id: 'div2d',
      title: 'Divergence in 2D',
      scene: 'curl',
      mode: 'loop',
      quantity: 'div',
      caption: 'In 2D: flux out of a small loop (F · n, n pointing outward) divided by the area. Shrink the loop to get div F = ∂F₁/∂x + ∂F₂/∂y.',
      examples: [
        { name: '#5a: F = (xy², x + 2y) at (2, 1)', F: ['x*y^2', 'x + 2y'], point: [2, 1], shape: 'square', size: 0.5, x: [-0.5, 4.5], y: [-1.5, 3.5], grid: 0.5 },
        { name: 'Spreading out: F = (x, y)', F: ['x', 'y'], point: [1, 1], shape: 'circle', size: 1 },
        { name: 'Flowing in: F = (−x, −y)', F: ['-x', '-y'], point: [1, 1], shape: 'circle', size: 1 },
        { name: 'Swirl: F = (−y, x)', F: ['-y', 'x'], point: [1, 1], shape: 'circle', size: 1 },
      ],
    },
  ],
}
