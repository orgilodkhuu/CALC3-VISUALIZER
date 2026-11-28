// Topic 17. The 3D curl: the axis around which the 2D curl is greatest. Examples from the worksheet.

export default {
  problems: [
    {
      id: 'axis',
      title: 'Curl: the best axis',
      scene: 'field3',
      mode: 'curl',
      caption: 'Aim the paddle wheel’s axle u. It spins at (curl F · u)/2, fastest when u points along curl F. The length of curl F is that fastest 2D curl.',
      examples: [
        { name: '#4: F = (xyz, x − z, x + y) at (1, 1, 0), axle (4, 3, 0)', F: ['x*y*z', 'x - z', 'x + y'], point: [1, 1, 0], axis: [4, 3, 0] },
        { name: '#1: F = (0, −z, y) at (0, 0, 0)', F: ['0', '-z', 'y'], point: [0, 0, 0], axis: [1, 1, 1] },
        { name: 'F = (−y, x, 0) at (0, 0, 0)', F: ['-y', 'x', '0'], point: [0, 0, 0], axis: [1, 1, 1] },
        { name: 'F = (z, 0, −x) at (0, 0, 0)', F: ['z', '0', '-x'], point: [0, 0, 0], axis: [1, 1, 1] },
        { name: '#7: F = ∇(x² − yz) at (1, 1, 1)', F: ['2x', '-z', '-y'], point: [1, 1, 1], axis: [0, 0, 1] },
      ],
    },
  ],
}
