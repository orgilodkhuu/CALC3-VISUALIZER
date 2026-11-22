// Topic 3. Partial derivatives. Tabs are ideas; examples come from her topic sheet.

export default {
  problems: [
    {
      id: 'slopes',
      title: 'Slopes fₓ and f_y',
      caption:
        '$f_x$ is the slope of the red slice ($y$ held fixed). $f_y$ is the slope of the green slice ($x$ held fixed).',
      views: ['partials'],
      x: [-3, 3],
      y: [-3, 3],
      point: [1, 1],
      examples: [
        { name: 'x² + y²', f: 'x^2 + y^2' },
        { name: 'x²y³ − x', f: 'x^2*y^3 - x', x: [-1, 2], y: [-1, 1.6], z: [-3, 4], h: 0.25 },
        { name: 'ln(2x − y)', f: 'ln(2x - y)', x: [-1, 3], y: [-1, 3], h: 0.25 },
        { name: 'x² − y²', f: 'x^2 - y^2' },
        { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)' },
      ],
    },
    {
      id: 'tangent-plane',
      title: 'Tangent plane',
      caption: 'Zoom in on a smooth surface and it looks flat. That flat piece is the tangent plane.',
      views: ['partials'],
      tangentPlane: true,
      controls: ['tangentPlane', 'walk'],
      examples: [
        { name: 'x² + 2y at (1, 3)', f: 'x^2 + 2y', x: [-2, 3], y: [0, 5], z: [0, 14], point: [1, 3] },
        {
          name: 'fₓ(4,4) = 6, f_y(4,4) = 1: walk ½ in x, 2 in y',
          f: '0.75x^2 + y - 12',
          x: [1, 7],
          y: [1, 7],
          z: [-6, 16],
          point: [4, 4],
          walk: [0.5, 2],
        },
        { name: 'x² + y² at (1, 1)', f: 'x^2 + y^2', x: [-3, 3], y: [-3, 3], point: [1, 1] },
      ],
    },
  ],
}
