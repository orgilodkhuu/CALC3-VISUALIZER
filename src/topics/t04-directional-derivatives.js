// Topic 4. Directional derivatives. Problem ids match her topic sheet.
// Her definition: f_(v1,v2)(a,b) is the slope on the tangent plane from (a,b) toward
// (a+v1, b+v2), i.e. Δoutput / Δinput with Δinput = ‖v‖ (so v can have any length).
// Problems 3, 4, 5 use a table, a contour plot and a picture without formulas, so they are not here.

export default {
  problems: [
    {
      id: 'Idea',
      title: 'Slope in any direction',
      prompt:
        'Walking from the point in direction $\\vec v$, the surface rises or falls. The directional derivative is the slope of the tangent-plane line in that direction: $\\frac{\\Delta\\text{output}}{\\Delta\\text{input}}$ with $\\Delta\\text{input} = \\|\\vec v\\|$. Turn $\\vec v$ and watch the slope change.',
      f: '10 - x^2/2 - y^2',
      x: [-3, 3],
      y: [-3, 3],
      views: ['direction', 'contour'],
      point: [1, 1],
      v: [2, 1],
      presets: [
        { name: '10 − x²/2 − y²', f: '10 - x^2/2 - y^2' },
        { name: 'x² − y²', f: 'x^2 - y^2' },
        { name: 'cos(x) + sin(y)', f: 'cos(x) + sin(y)' },
        { name: 'x·y', f: 'x*y' },
      ],
    },
    {
      id: '1b',
      title: 'Secant vs tangent',
      prompt:
        'For $f(x,y) = 100 - (x-6)^2 - (y-8)^2$ with its tangent plane at $(5,1)$: find $\\frac{\\Delta\\text{output}}{\\Delta\\text{input}}$ for the line from $(5,1,50)$ to $(8,5,87)$, and for the line on the tangent plane. Use $f(8,5) = 87$ to approximate $f_{(3,4)}(5,1)$, then find it exactly.',
      f: '100 - (x - 6)^2 - (y - 8)^2',
      x: [0, 12],
      y: [0, 14],
      z: [0, 105],
      views: ['direction'],
      point: [5, 1],
      v: [3, 4],
      tangentPlane: true,
    },
    {
      id: '2',
      title: 'On a plane',
      prompt:
        'On the plane $L(x,y) = 5x + 2y + 20$: how much does the height change if $x$ increases by 3 and $y$ by 4? How much has the input changed? Use $\\frac{\\Delta\\text{output}}{\\Delta\\text{input}}$ to find the rate of change in direction $(3,4)$. (On a plane, the secant and tangent lines are the same line.)',
      f: '5x + 2y + 20',
      editable: false,
      x: [-2, 6],
      y: [-2, 6],
      views: ['direction'],
      point: [1, 1],
      v: [3, 4],
      view: [0.2, 0.35, 1], // mostly from above; the default angle sees this plane edge-on
    },
    {
      id: '6',
      title: 'xy² + ln(x) + 6y',
      prompt:
        'Given $f(x,y) = xy^2 + \\ln(x) + 6y$: compute $f_x(1,2)$ and $f_y(1,2)$. From $(1,2)$, how much should the output change if $x$ increases by 3 and $y$ by 4? Find $f_{(3,4)}(1,2)$. Then predict $f_{(3/5,\\,4/5)}(1,2)$ and $f_{(-3,-4)}(1,2)$ and check them with the buttons.',
      f: 'x*y^2 + ln(x) + 6y',
      x: [0, 4.5],
      y: [0, 6.5],
      z: [0, 200],
      views: ['direction'],
      point: [1, 2],
      v: [3, 4],
      vPresets: [
        [3, 4],
        [0.6, 0.8],
        [-3, -4],
      ],
    },
  ],
}
