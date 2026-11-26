// Topic 5. Vectors in the plane. Examples come from the topic worksheet.

export default {
  problems: [
    {
      id: 'operations',
      title: 'Scaling and adding',
      scene: 'vectors',
      mode: 'ops',
      caption: 'A vector is an arrow: a direction and a length, which can start anywhere.',
      examples: [
        { name: 'v + w: v = (−2, 5), w = (3, 4)', v: [-2, 5], w: [3, 4], op: 'sum', x: [-4, 6], y: [-1, 10] },
        { name: 'w − v: v = (−2, 5), w = (3, 4)', v: [-2, 5], w: [3, 4], op: 'diff', x: [-4, 7], y: [-2, 7] },
        { name: 'c · v: v = (−2, 5)', v: [-2, 5], op: 'scale', c: 3, x: [-8, 7], y: [-7, 16] },
      ],
    },
    {
      id: 'length',
      title: 'Length and unit vectors',
      scene: 'vectors',
      mode: 'length',
      caption: 'The length ‖v‖ comes from the right triangle with sides v₁ and v₂. Divide by it to get length 1.',
      x: [-6, 6],
      y: [-6, 6],
      examples: [
        { name: 'v = (4, −3)', v: [4, -3] },
        { name: 'v = (1, 2)', v: [1, 2] },
      ],
    },
  ],
}
