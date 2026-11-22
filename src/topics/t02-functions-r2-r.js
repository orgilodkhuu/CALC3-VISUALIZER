// Topic 2. Functions that take two inputs and produce one output, f: R^2 -> R.
// Problem ids match the numbering on her topic sheet. Field reference: src/scenes/FunctionExplorer.jsx
//
// Example problem:
//   {
//     id: '3a',                       // tab label, matches the sheet
//     title: 'Cross sections',        // short name under the id
//     prompt: 'Text shown to the class; $math$ is rendered with KaTeX.',
//     f: 'y^3 - x^2',
//     x: [-2, 2], y: [-2, 2],
//     views: ['cross'],               // extra 2D views next to the 3D plot
//     hidden: ['surface'],            // start hidden; reveal in class
//     slices: { x: [-1, 0, 1], y: [-1, 0, 1] },
//   }

const SHEET_7 = [
  { name: 'f = 10', f: '10' },
  { name: 'f = 2x + 10', f: '2x + 10' },
  { name: 'f = 2x − y', f: '2x - y' },
  { name: 'f = y² − 10', f: 'y^2 - 10' },
  { name: 'f = x² + y²', f: 'x^2 + y^2' },
  { name: 'f = 10 − x² − y²', f: '10 - x^2 - y^2' },
  { name: 'f = √(x² + y²)', f: 'sqrt(x^2 + y^2)' },
  { name: 'f = x² − y²', f: 'x^2 - y^2' },
  { name: 'f = x³ − y²', f: 'x^3 - y^2' },
  { name: 'f = 1/(x² + y²)', f: '1/(x^2 + y^2)' },
  { name: 'f = 1/(x² + y² + 1)', f: '1/(x^2 + y^2 + 1)' },
  { name: 'f = cos(x) + sin(y)', f: 'cos(x) + sin(y)' },
  { name: 'f = e^(xy)', f: 'e^(x*y)' },
]

export default {
  problems: [
    {
      id: '1a',
      title: 'Table → surface',
      prompt:
        'Fill in the table for the linear function $f(x,y) = 10 + 2x - y$. Each table entry is a point on the surface. How can you tell a linear function from its table?',
      f: '10 + 2x - y',
      x: [0, 3],
      y: [0, 3],
      views: ['table'],
      table: { xs: [0, 1, 2, 3], ys: [0, 1, 2, 3] },
      view: [0.3, 0.8, 0.55], // default angle sees this plane edge-on
    },
    {
      id: '1b',
      title: 'Table → surface',
      prompt: 'Fill in the table for $g(x,y) = x^2 - y^2$.',
      f: 'x^2 - y^2',
      x: [-2, 2],
      y: [-2, 2],
      views: ['table'],
      table: { xs: [-2, -1, 0, 1, 2], ys: [-2, -1, 0, 1, 2] },
    },
    {
      id: '1d',
      title: 'Describe a plane',
      prompt:
        'Describe the surface $f(x,y) = 1 + \\tfrac12 x - 3y$ in words. Move the slices: every cross section is a line. What are their slopes?',
      f: '1 + x/2 - 3y',
      x: [-3, 3],
      y: [-3, 3],
      views: ['cross'],
      hidden: ['surface'],
      point: [1, 1],
    },
    {
      id: '3a',
      title: 'Cross sections',
      prompt:
        'Draw the cross sections of $f(x,y) = y^3 - x^2$ at $x = -1, 0, 1$ and $y = -1, 0, 1$. Then reveal the surface: which 3D graph fits?',
      f: 'y^3 - x^2',
      x: [-2, 2],
      y: [-2, 2],
      views: ['cross'],
      hidden: ['surface', 'cross'],
      slices: { x: [-1, 0, 1], y: [-1, 0, 1] },
    },
    {
      id: '4a',
      title: 'Contour plot',
      prompt: 'Draw a contour plot with level curves at $z = -5, 0, 5, 10, 15$ for $f(x,y) = 10 + 2x - y$.',
      f: '10 + 2x - y',
      x: [-10, 10],
      y: [-10, 10],
      views: ['contour'],
      hidden: ['contour'],
      levels: [-5, 0, 5, 10, 15],
      view: [0.3, 0.8, 0.55],
    },
    {
      id: '4b',
      title: 'Contour plot',
      prompt: 'Draw a contour plot with level curves at $z = -1, 0, 1$ for $g(x,y) = x^2 - y^2$.',
      f: 'x^2 - y^2',
      x: [-3, 3],
      y: [-3, 3],
      views: ['contour'],
      hidden: ['contour'],
      levels: [-1, 0, 1],
    },
    {
      id: '5a',
      title: 'Label the contours',
      prompt:
        'Label the contour lines in each quadrant in a way that might describe the surface. (This saddle, $f = xy$, matches the picture on the sheet.)',
      f: 'x*y',
      x: [-2, 2],
      y: [-2, 2],
      views: ['contour'],
      hidden: ['contour'],
      levels: [-3, -2, -1, -0.5, 0.5, 1, 2, 3],
    },
    {
      id: '5b',
      title: 'Surface → contours',
      prompt:
        'Sketch a possible contour plot for the pictured function. (A function shaped like the picture: one peak and one pit.)',
      f: '4x*e^(-(x^2 + y^2))',
      x: [-2.5, 2.5],
      y: [-2.5, 2.5],
      views: ['contour'],
      hidden: ['contour'],
      levels: [-1.5, -1, -0.5, -0.1, 0.1, 0.5, 1, 1.5],
    },
    {
      id: '7',
      title: 'Picture these',
      prompt:
        'Try to picture each surface first, then check it here with cross sections, a contour plot, and the 3D surface.',
      f: '10',
      x: [-3, 3],
      y: [-3, 3],
      views: ['cross', 'contour'],
      hidden: ['surface', 'cross', 'contour'],
      presets: SHEET_7,
      point: [1, 1],
    },
    {
      id: 'Ch',
      title: 'Challenge',
      prompt:
        'Find a linear function through $(1,2,3)$, $(4,5,6)$ and $(7,8,9)$. Can you find more than one? Drag $m$: every plane $f = (1+m) + mx + (1-m)y$ contains all three points, because they lie on one line.',
      f: '(1 + m) + m*x + (1 - m)*y',
      editable: false,
      x: [0, 9],
      y: [0, 9],
      z: [0, 12],
      zScale: 1,
      params: [{ name: 'm', label: 'Slope in x: m', min: -2, max: 3, step: 0.05, value: 0.5 }],
      markers: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      markerLine: true,
    },
  ],
}
