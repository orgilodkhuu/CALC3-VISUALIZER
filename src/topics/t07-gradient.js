// Topic 7. The gradient. Problem ids match her topic sheet.
// f_u = ∇f · u for a unit vector u; for any v, f_v = ∇f · v / ‖v‖ (her conclusion).
// Problem 5 uses a data table without a formula, so it is not here.

export default {
  problems: [
    {
      id: '1a',
      title: 'x² − y² at (3,1)',
      prompt:
        'For $f(x,y) = x^2 - y^2$ compute $f(3,1)$, $f_x(3,1)$, $f_y(3,1)$, and $f_{\\vec v}(3,1)$ for $\\vec v = (2,4)$. Here $\\vec u$ points the same way as $\\vec v$. What pattern combines $f_x$, $f_y$ and $\\vec v$?',
      f: 'x^2 - y^2',
      x: [-4, 4],
      y: [-4, 4],
      views: ['gradient', 'contour'],
      hidden: ['gradient'],
      point: [3, 1],
      theta: (Math.atan2(4, 2) * 180) / Math.PI,
    },
    {
      id: '2–3',
      title: 'Largest, zero, negative',
      prompt:
        'Turn $\\vec u$ all the way around. In which direction is $f_{\\vec u}(4,4) = \\nabla f(4,4) \\cdot \\vec u$ largest, and how large is it? Most negative? Zero? Finish the sentences: the direction of $\\nabla f$ tells us…; the length $\\|\\nabla f\\|$ tells us…',
      f: '20 - (x - 6)^2/4 - (y - 7)^2/2',
      x: [0, 10],
      y: [0, 10],
      views: ['gradient', 'contour'],
      point: [4, 4],
      theta: 0,
    },
    {
      id: '4',
      title: 'Gradient on a contour plot',
      prompt:
        'Draw the gradient vector at several points on the contour plot. Where is it longest? Shortest? (This function is a stand-in with hills and valleys like the one on the sheet.) Move the point, then turn on the gradient field to check.',
      f: '10 + 6*sin(x/3)*cos(y/4) + y/2',
      x: [0, 20],
      y: [0, 20],
      views: ['gradient', 'contour'],
      point: [10, 8],
      theta: 45,
    },
    {
      id: '6',
      title: 'Compute ∇f at (1,2)',
      prompt:
        'Compute the gradient vector for each function, then use it to describe the surface at $(1,2)$: which way is uphill, and how steep is it?',
      f: 'x^2 + y^2',
      x: [-1, 3],
      y: [-1, 4],
      views: ['gradient', 'contour'],
      point: [1, 2],
      theta: 45,
      presets: [
        { name: 'x² + y²', f: 'x^2 + y^2' },
        { name: 'x² − y²', f: 'x^2 - y^2' },
        { name: 'xy² + ln(3x − y)', f: 'x*y^2 + ln(3x - y)' },
      ],
    },
  ],
}
