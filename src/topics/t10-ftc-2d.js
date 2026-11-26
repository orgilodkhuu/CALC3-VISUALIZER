// Topic 10. The Fundamental Theorem of Calculus in 2D: ∫_C ∇f · dr = f(Q) − f(P). Examples from her sheet.

const PI = Math.PI

export default {
  problems: [
    {
      id: 'ftc',
      title: 'Any path from P to Q',
      scene: 'line',
      mode: 'ftc',
      caption: 'For a gradient field F = ∇f, every path from P to Q gives the same answer: f(Q) − f(P). Green: level curves of f.',
      examples: [
        {
          name: '#2: f = x + y³, from (2, 0) to (0, 2)',
          F: ['1', '3y^2'],
          potential: 'x + y^3',
          x: [-1.5, 3.5],
          y: [-1, 3],
          grid: 0.5,
          paths: [
            { name: 'Line from P to Q (2b)', type: 'param', x: '2 - 2t', y: '2t', t: [0, 1] },
            { name: 'Her curve (t² − t, t + 1) (2e)', type: 'param', x: 't^2 - t', y: 't + 1', t: [-1, 1] },
            { name: 'Quarter circle (2f)', type: 'param', x: '2cos(t)', y: '2sin(t)', t: [0, PI / 2] },
            { name: 'Bend it yourself (drag)', type: 'spline', pts: [[2, 0], [1.75, 1.75], [0, 2]] },
          ],
        },
        {
          name: '#6: F = (y² − 1/x², 3y² + 2xy), (1, 3) to (5, 0)',
          F: ['y^2 - x^(-2)', '3y^2 + 2x*y'],
          potential: 'x*y^2 + 1/x + y^3',
          x: [0, 6],
          y: [-1, 4],
          grid: 0.5,
          paths: [
            { name: 'Line from P to Q', type: 'param', x: '1 + 4t', y: '3 - 3t', t: [0, 1] },
            { name: 'Bend it yourself (drag)', type: 'spline', pts: [[1, 3], [4.5, 3], [5, 0]] },
          ],
        },
        {
          name: '#3: F = (2x + y, x + 2y)',
          F: ['2x + y', 'x + 2y'],
          potential: 'x^2 + x*y + y^2',
          x: [-4, 4],
          y: [-4, 4],
          paths: [
            { name: 'Line from P to Q', type: 'line', from: [-3, 3], to: [3, -2] },
            { name: 'Bend it yourself (drag)', type: 'spline', pts: [[-3, 3], [2, 2], [3, -2]] },
          ],
        },
      ],
    },
    {
      id: 'compare',
      title: 'Does the path matter?',
      scene: 'line',
      mode: 'compare',
      caption: 'Two paths from P to Q. If you can bend B so the answers differ, F is path dependent and not a gradient field.',
      x: [-4.5, 4.5],
      y: [-4.5, 4.5],
      P: [-3, 3],
      Q: [3, -2],
      M: [2, 2],
      examples: [
        { name: '#3: F = (2x + y, x + 2y)', F: ['2x + y', 'x + 2y'] },
        { name: '#3: F = (y, −x)', F: ['y', '-x'] },
        { name: '#3: F = (2, 1)', F: ['2', '1'] },
        { name: '#3: F = (2x + y, x − 2y)', F: ['2x + y', 'x - 2y'] },
        { name: '#3: F = (x + y, 0)', F: ['x + y', '0'] },
        { name: '#3: F = (5 + y, 0)', F: ['5 + y', '0'] },
        { name: '#5: F = (x + y, y), (1, 3) to (5, 0)', F: ['x + y', 'y'], P: [1, 3], Q: [5, 0], M: [4.5, 3], x: [-1, 6], y: [-1.5, 4.5] },
      ],
    },
  ],
}
