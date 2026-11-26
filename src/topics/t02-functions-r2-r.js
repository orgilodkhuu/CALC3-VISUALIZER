// Topic 2. Functions f: R^2 -> R.
// Tabs are ideas, not worksheet problems. Examples come from the topic worksheet.
//
// Tab fields (full list in src/scenes/FunctionExplorer.jsx):
//   id        URL slug            title    tab label
//   caption   one short sentence  views    extra 2D views next to the 3D plot
//   examples  [{ name, f, ...any field }]  first one is the default

export default {
  problems: [
    {
      id: 'cross-sections',
      title: 'Cross sections',
      caption: 'Slice the surface at a fixed x or a fixed y. Each slice is a curve.',
      views: ['cross'],
      x: [-2, 2],
      y: [-2, 2],
      slices: { x: [-1, 0, 1], y: [-1, 0, 1] },
      examples: [
        { name: 'y³ − x²', f: 'y^3 - x^2' },
        { name: 'x² + y²', f: 'x^2 + y^2' },
        { name: 'x² − y²', f: 'x^2 - y^2' },
        { name: '10 − x² − y²', f: '10 - x^2 - y^2' },
        { name: '√(x² + y²)', f: 'sqrt(x^2 + y^2)' },
        { name: 'x³ − y²', f: 'x^3 - y^2' },
        { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)', x: [-3, 3], y: [-3, 3] },
      ],
    },
    {
      id: 'contour-plot',
      title: 'Contour plot',
      caption: 'A level curve is every point (x, y) where f has the same height.',
      views: ['contour'],
      x: [-3, 3],
      y: [-3, 3],
      examples: [
        { name: 'x² − y²', f: 'x^2 - y^2', levels: [-4, -2, -1, 0, 1, 2, 4] },
        { name: '10 + 2x − y', f: '10 + 2x - y', x: [-10, 10], y: [-10, 10], levels: [-5, 0, 5, 10, 15], view: [0.3, 0.8, 0.55] },
        { name: 'x² + y²', f: 'x^2 + y^2' },
        { name: 'x·y', f: 'x*y', x: [-2, 2], y: [-2, 2], levels: [-3, -2, -1, -0.5, 0.5, 1, 2, 3] },
        { name: 'One peak, one pit', f: '4x*e^(-(x^2 + y^2))', x: [-2.5, 2.5], y: [-2.5, 2.5], levels: [-1.5, -1, -0.5, -0.1, 0.1, 0.5, 1, 1.5] },
        { name: '1 / (x² + y² + 1)', f: '1/(x^2 + y^2 + 1)' },
        { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)' },
      ],
    },
    {
      id: 'linear',
      title: 'Linear functions',
      caption: 'A linear function z = b + mx + ny is a plane: every cross section is a straight line.',
      views: ['cross', 'table'],
      hidden: ['table'],
      x: [-3, 3],
      y: [-3, 3],
      point: [1, 1],
      table: { xs: [0, 1, 2, 3], ys: [0, 1, 2, 3] },
      view: [0.35, 0.6, 0.9], // from above, so planes are never seen edge-on
      examples: [
        { name: '10 + 2x − y', f: '10 + 2x - y' },
        { name: '1 + x/2 − 3y', f: '1 + x/2 - 3y' },
        { name: '2x + 10', f: '2x + 10' },
        { name: '10', f: '10' },
      ],
    },
  ],
}
