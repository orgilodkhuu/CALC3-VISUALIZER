// Topic 7. The gradient. f_u = ∇f · u for a unit vector u (worksheet conclusion).

export default {
  problems: [
    {
      id: 'gradient',
      title: 'Gradient and direction',
      caption: '∇f points the steepest way uphill. The slope in direction u is ∇f · u: largest along ∇f, zero across it.',
      views: ['gradient', 'contour'],
      examples: [
        { name: 'Hill at (4, 4)', f: '20 - (x - 6)^2/4 - (y - 7)^2/2', x: [0, 10], y: [0, 10], point: [4, 4], theta: 0 },
        { name: 'x² − y² at (3, 1)', f: 'x^2 - y^2', x: [-4, 4], y: [-4, 4], point: [3, 1], theta: (Math.atan2(4, 2) * 180) / Math.PI },
        { name: 'x² + y² at (1, 2)', f: 'x^2 + y^2', x: [-1, 3], y: [-1, 4], point: [1, 2], theta: 45 },
        { name: 'xy² + ln(3x − y) at (1, 2)', f: 'x*y^2 + ln(3x - y)', x: [-1, 3], y: [-1, 4], point: [1, 2], theta: 45 },
      ],
    },
    {
      id: 'field',
      title: 'Gradient field',
      caption: 'The gradient at every point: it crosses the level curves at right angles and is longest where they are closest together.',
      views: ['gradient', 'contour'],
      gradField: true,
      showU: false,
      examples: [
        { name: 'Hills and valleys', f: '10 + 6*sin(x/3)*cos(y/4) + y/2', x: [0, 20], y: [0, 20], point: [10, 8] },
        { name: 'x² + y²', f: 'x^2 + y^2', x: [-3, 3], y: [-3, 3], point: [1, 1] },
        { name: 'x² − y²', f: 'x^2 - y^2', x: [-3, 3], y: [-3, 3], point: [1, 1] },
        { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)', x: [-4, 4], y: [-4, 4], point: [1, 1] },
      ],
    },
  ],
}
