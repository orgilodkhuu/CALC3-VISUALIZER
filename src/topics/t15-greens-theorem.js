// Topic 15. Green's theorem: ∬_R curl F dA = ∮_C F · dr (C = boundary of R, counter-clockwise).

export default {
  problems: [
    {
      id: 'cells',
      title: 'Small loops add up',
      scene: 'green',
      mode: 'cells',
      caption: 'Each small square gets its own counter-clockwise loop. Inside edges are walked both ways and cancel, so only the outside edge is left.',
      examples: [
        {
          name: '#5b: F = (x² + y², xy), square of side 2',
          F: ['x^2 + y^2', 'x*y'],
          region: { type: 'rect', x: [-1, 1], y: [-1, 1] },
          x: [-2, 2],
          y: [-2, 2],
          grid: 0.5,
        },
        { name: 'F = (−y, x), 3 × 2 rectangle', F: ['-y', 'x'], region: { type: 'rect', x: [0, 3], y: [0, 2] }, x: [-1, 4], y: [-1, 3], grid: 0.5 },
        { name: 'F = (x² + y², y), rectangle', F: ['x^2 + y^2', 'y'], region: { type: 'rect', x: [0, 4], y: [1, 3] }, x: [-1, 5], y: [0, 4], grid: 0.5 },
      ],
    },
    {
      id: 'green',
      title: 'Both sides of the theorem',
      scene: 'green',
      mode: 'green',
      caption: 'Add up the curl over the region R, or go once around its edge C: Green’s theorem says you get the same number.',
      examples: [
        {
          name: '#4: F = (x² + y², y), triangle',
          F: ['x^2 + y^2', 'y'],
          region: { type: 'poly', pts: [[0, 1], [6, 1], [0, 3]] },
          regionText: 'C: (0, 1) → (6, 1) → (0, 3) → back to (0, 1)',
          x: [-1, 7],
          y: [0, 4],
          grid: 0.5,
        },
        {
          name: '#5b: F = (x² + y², xy), square of side 2',
          F: ['x^2 + y^2', 'x*y'],
          region: { type: 'rect', x: [-1, 1], y: [-1, 1] },
          regionText: 'C: the square of side 2 centered at (0, 0)',
          x: [-2, 2],
          y: [-2, 2],
          grid: 0.5,
        },
        {
          name: '#5c: F = (sin x + y, 4x − cos y), circle',
          F: ['sin(x) + y', '4x - cos(y)'],
          region: { type: 'circle', c: [0, 0], r: 2 },
          regionText: 'C: the circle of radius 2 centered at (0, 0)',
          x: [-3, 3],
          y: [-3, 3],
          grid: 0.5,
        },
        {
          name: 'F = (−y, x), circle',
          F: ['-y', 'x'],
          region: { type: 'circle', c: [0, 0], r: 2 },
          regionText: 'C: the circle of radius 2 centered at (0, 0)',
          x: [-3, 3],
          y: [-3, 3],
          grid: 0.5,
        },
      ],
    },
  ],
}
