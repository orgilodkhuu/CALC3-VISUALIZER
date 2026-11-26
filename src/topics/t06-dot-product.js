// Topic 6. The dot product. Worksheet definition: v · w = ‖v_w‖ ‖w‖, the length of v in the
// direction of w times the length of w (negative when v points against w).

export default {
  problems: [
    {
      id: 'dot',
      title: 'Dot product',
      scene: 'vectors',
      mode: 'dot',
      caption: 'v · w = (how far v reaches along w) × ‖w‖. Negative when v points against w.',
      examples: [
        { name: 'v = (2, −1), w = (3, 4)', v: [2, -1], w: [3, 4], x: [-3, 5], y: [-3, 5] },
        { name: 'v = (3, 5), w = (−8, 15)', v: [3, 5], w: [-8, 15], x: [-9, 6], y: [-2, 16] },
        { name: 'Same direction', v: [3, 3], w: [4, 1], x: [-3, 5], y: [-3, 5] },
        { name: 'Perpendicular', v: [2, 1], w: [-1, 2], x: [-4, 4], y: [-3, 4] },
        { name: 'Opposite directions', v: [-3, 2], w: [4, 1], x: [-5, 5], y: [-3, 4] },
      ],
    },
  ],
}
