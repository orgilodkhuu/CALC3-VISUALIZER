// Topic 3. Partial derivatives. Problem ids match her topic sheet.
// Problems 1–4 on the sheet use given tables/graphs without formulas, so they are not here yet.

const EXAMPLES = [
  { name: 'x²y³ − x  (Q6)', f: 'x^2*y^3 - x' },
  { name: 'ln(2x − y)  (Q7)', f: 'ln(2x - y)' },
  { name: 'x² + 2y  (Q8)', f: 'x^2 + 2y' },
  { name: 'x² + y²', f: 'x^2 + y^2' },
  { name: 'x² − y²', f: 'x^2 - y^2' },
  { name: 'y³ − x²', f: 'y^3 - x^2' },
  { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)' },
  { name: 'e^(xy)', f: 'e^(x*y)' },
]

export default {
  problems: [
    {
      id: 'Idea',
      title: 'fₓ and f_y',
      prompt:
        '$f_x$ is the slope when you move in the $x$ direction with $y$ held fixed: the slope of the red cross section. $f_y$ is the slope of the green one. Move the point and watch both slopes.',
      f: 'x^2 + y^2',
      x: [-3, 3],
      y: [-3, 3],
      views: ['partials', 'contour'],
      point: [1, 1],
      presets: EXAMPLES,
    },
    {
      id: '6',
      title: 'x²y³ − x',
      prompt:
        'Given $f(x,y) = x^2y^3 - x$, compute $f_x, f_y, f_{xx}, f_{xy}, f_{yy}, f_{yx}$ and evaluate at $(1,1)$. What does this tell you about the surface at $(1,1)$? What do you notice about $f_{xy}$ and $f_{yx}$?',
      f: 'x^2*y^3 - x',
      x: [-1, 2],
      y: [-1, 1.6],
      z: [-3, 4],
      views: ['partials'],
      hidden: ['partials'],
      point: [1, 1],
      h: 0.25,
    },
    {
      id: '7',
      title: 'ln(2x − y)',
      prompt:
        'Given $f(x,y) = \\ln(2x - y)$, compute the partial derivatives and evaluate at $(1,1)$. The surface only exists where $2x - y > 0$.',
      f: 'ln(2x - y)',
      x: [-1, 3],
      y: [-1, 3],
      views: ['partials'],
      hidden: ['partials'],
      point: [1, 1],
      h: 0.25,
    },
    {
      id: '8',
      title: 'Tangent plane',
      prompt: 'Find the equation of the tangent plane to $f(x,y) = x^2 + 2y$ at $(1,3)$.',
      f: 'x^2 + 2y',
      x: [-2, 3],
      y: [0, 5],
      z: [0, 14],
      views: ['partials'],
      hidden: ['partials'],
      point: [1, 3],
      tangentPlane: true,
    },
    {
      id: '9',
      title: 'Walk on the surface',
      prompt:
        'You stand above $(4,4)$ where $f_x(4,4) = 6$ and $f_y(4,4) = 1$. How much do you expect your height to change if you walk $\\tfrac12$ unit in $x$, then 2 units in $y$? (Example surface with these slopes: $f = 0.75x^2 + y - 12$.)',
      f: '0.75x^2 + y - 12',
      editable: false,
      x: [1, 7],
      y: [1, 7],
      z: [-6, 16],
      views: ['partials'],
      point: [4, 4],
      tangentPlane: true,
      walk: [0.5, 2],
    },
  ],
}
