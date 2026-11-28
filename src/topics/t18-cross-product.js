// Topic 18. The cross product v × w. Examples from the worksheet (problem numbers in the names).

export default {
  problems: [
    {
      id: 'cross',
      title: 'Cross product v × w',
      scene: 'vec3',
      mode: 'cross',
      caption: 'v × w is perpendicular to both v and w, follows the right-hand rule, and its length is the area of the parallelogram they span.',
      examples: [
        { name: '#3a: (1, 2, 3) × (4, 5, 6)', v: [1, 2, 3], w: [4, 5, 6] },
        { name: '#3b: (4, 5, 6) × (1, 2, 3)', v: [4, 5, 6], w: [1, 2, 3] },
        { name: '#2a: i × j', v: [1, 0, 0], w: [0, 1, 0], max: 3 },
        { name: '#2a: i × i', v: [1, 0, 0], w: [1, 0, 0], max: 3 },
        { name: '#2a: 3i × 2k', v: [3, 0, 0], w: [0, 0, 2], max: 4 },
        { name: '#2a: k × 5i', v: [0, 0, 1], w: [5, 0, 0], max: 6 },
        { name: '#4: ‖v‖ = 3, ‖w‖ = 5, θ = π/3', v: [3, 0, 0], w: [2.5, 4.33, 0] },
      ],
    },
    {
      id: 'plane',
      title: 'Plane through three points',
      scene: 'vec3',
      mode: 'plane',
      caption: 'PQ × PR is perpendicular to the plane, so it is a normal vector n. Every point (x, y, z) of the plane has n · (x − p, y − q, z − r) = 0.',
      examples: [
        { name: '#5b: (1, 3, 0), (3, 4, −3), (3, 6, 2)', points: [[1, 3, 0], [3, 4, -3], [3, 6, 2]] },
        { name: 'The points (1, 0, 0), (0, 1, 0), (0, 0, 1)', points: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
      ],
    },
  ],
}
