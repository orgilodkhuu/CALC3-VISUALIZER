// Topic 12. Vector fields F: R³ → R³, line integrals in 3D, the 3D FTC. Examples from the worksheet.

export default {
  problems: [
    {
      id: 'field',
      title: 'Vector field in 3D',
      scene: 'field3',
      mode: 'field',
      caption: 'At each point (x, y, z), F(x, y, z) is drawn as an arrow. Turn the view to see the field from different sides.',
      examples: [
        { name: '#1: F = (0, −z, y), arrows scaled by 1/4', F: ['0', '-z', 'y'], scale: 0.25, probe: [1, 1, 2] },
        { name: '#6: F = (0, z + 3, 0)', F: ['0', 'z + 3', '0'] },
        { name: '#6: F = (x, y, z)', F: ['x', 'y', 'z'] },
        { name: '#6: F = (−y, x, 0)', F: ['-y', 'x', '0'] },
        { name: '#6: F = (0, 0, z − 3)', F: ['0', '0', 'z - 3'] },
      ],
    },
    {
      id: 'paths',
      title: 'Line integrals in 3D',
      scene: 'field3',
      mode: 'paths',
      caption: 'Two paths from P to Q. If the integrals differ, F is path dependent. If curl F = 0 everywhere, F = ∇f and every path gives f(Q) − f(P).',
      examples: [
        {
          name: '#2: F = (0, −z, y), paths C and D',
          F: ['0', '-z', 'y'],
          paths: [
            { name: 'C: straight line', type: 'line', from: [1, 2, 10], to: [3, 5, 7] },
            { name: 'D: one direction at a time', type: 'poly', pts: [[1, 2, 10], [3, 2, 10], [3, 5, 10], [3, 5, 7]] },
          ],
        },
        {
          name: '#2b: F = (x + z, yz, x² + y²), paths C and D',
          F: ['x + z', 'y*z', 'x^2 + y^2'],
          paths: [
            { name: 'C: straight line', type: 'line', from: [1, 2, 10], to: [3, 5, 7] },
            { name: 'D: one direction at a time', type: 'poly', pts: [[1, 2, 10], [3, 2, 10], [3, 5, 10], [3, 5, 7]] },
          ],
        },
        {
          name: '#4b: F = ∇(xy² + yz) on r(t) = (1, t, t²)',
          F: ['y^2', '2x*y + z', 'y'],
          potential: 'x*y^2 + y*z',
          paths: [
            { name: 'r(t) = (1, t, t²), −1 ≤ t ≤ 1', type: 'param', x: '1', y: 't', z: 't^2', t: [-1, 1] },
            { name: 'straight line', type: 'line', from: [1, -1, 1], to: [1, 1, 1] },
          ],
        },
        {
          name: '#3: helix (3 cos t, 3 sin t, t), 0 ≤ t ≤ 4π',
          F: ['2x*z + 2y*z', '2x*z + y^2', '2x*y + x^2'],
          potential: 'x^2*z + 2x*y*z + y^3/3',
          paths: [
            { name: 'helix (3 cos t, 3 sin t, t)', type: 'param', x: '3cos(t)', y: '3sin(t)', z: 't', t: [0, 4 * Math.PI] },
            { name: 'straight line', type: 'line', from: [3, 0, 0], to: [3, 0, 4 * Math.PI] },
          ],
        },
        {
          name: '#5b: F = (1 + 4yz, 2y + 4xz, 3z² + 4xy)',
          F: ['1 + 4y*z', '2y + 4x*z', '3z^2 + 4x*y'],
          potential: 'x + y^2 + z^3 + 4x*y*z',
          P: [0, 0, 0],
          Q: [1, 2, 1],
          paths: [
            { name: 'straight line', type: 'line', from: [0, 0, 0], to: [1, 2, 1] },
            { name: 'x, then y, then z', type: 'poly', pts: [[0, 0, 0], [1, 0, 0], [1, 2, 0], [1, 2, 1]] },
          ],
        },
        {
          name: '#5b: F = (yz, xz, x + y + z)',
          F: ['y*z', 'x*z', 'x + y + z'],
          paths: [
            { name: 'straight line', type: 'line', from: [0, 0, 0], to: [1, 2, 1] },
            { name: 'x, then y, then z', type: 'poly', pts: [[0, 0, 0], [1, 0, 0], [1, 2, 0], [1, 2, 1]] },
          ],
        },
        {
          name: '#6: F = (−y, x, 0)',
          F: ['-y', 'x', '0'],
          paths: [
            { name: 'straight line', type: 'line', from: [-2, -2, -1], to: [2, 2, 2] },
            { name: 'x, then y, then z', type: 'poly', pts: [[-2, -2, -1], [2, -2, -1], [2, 2, -1], [2, 2, 2]] },
          ],
        },
        {
          name: '#6: F = (x, y, z)',
          F: ['x', 'y', 'z'],
          potential: '(x^2 + y^2 + z^2)/2',
          paths: [
            { name: 'straight line', type: 'line', from: [-2, -2, -1], to: [2, 2, 2] },
            { name: 'x, then y, then z', type: 'poly', pts: [[-2, -2, -1], [2, -2, -1], [2, 2, -1], [2, 2, 2]] },
          ],
        },
      ],
    },
  ],
}
