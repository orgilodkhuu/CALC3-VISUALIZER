// Topic 4. Directional derivatives. Worksheet definition: f_(v1,v2)(a,b) is the slope on the
// tangent plane from (a,b) toward (a+v1, b+v2): Δoutput / Δinput with Δinput = ‖v‖.

export default {
  problems: [
    {
      id: 'direction',
      title: 'Directional derivative',
      caption: 'Walk from the point in direction v. The slope you climb is Δoutput / Δinput, with Δinput = ‖v‖.',
      views: ['direction'],
      controls: ['secant'],
      examples: [
        {
          name: 'Hill: 100 − (x − 6)² − (y − 8)²',
          f: '100 - (x - 6)^2 - (y - 8)^2',
          x: [0, 12],
          y: [0, 14],
          z: [0, 105],
          point: [5, 1],
          v: [3, 4],
          tangentPlane: true,
        },
        {
          name: 'Plane: 5x + 2y + 20',
          f: '5x + 2y + 20',
          x: [-2, 6],
          y: [-2, 6],
          point: [1, 1],
          v: [3, 4],
          view: [0.2, 0.35, 1], // from above; the default angle sees this plane edge-on
        },
        { name: 'xy² + ln(x) + 6y', f: 'x*y^2 + ln(x) + 6y', x: [0, 4.5], y: [0, 6.5], z: [0, 200], point: [1, 2], v: [3, 4] },
        { name: '10 − x²/2 − y²', f: '10 - x^2/2 - y^2', x: [-3, 3], y: [-3, 3], point: [1, 1], v: [2, 1] },
      ],
    },
  ],
}
