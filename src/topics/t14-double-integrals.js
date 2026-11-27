// Topic 14. Double integrals ∬_R f dA. Examples from the worksheet (problem numbers in the names).

export default {
  problems: [
    {
      id: 'boxes',
      title: 'Boxes under the surface',
      scene: 'boxes',
      at: 'low',
      caption: 'Cut R into pieces Δx × Δy. Each box has height f at one point of its piece. Adding the boxes estimates the volume ∬ f dA; more pieces get closer.',
      examples: [
        { name: '#8: ∫₁² ∫₀¹ xy dx dy', f: 'x*y', bounds: { order: 'dxdy', outer: [1, 2], inner: ['0', '1'] } },
        { name: '#8: ∫₁² ∫₀ʸ (x + y) dx dy', f: 'x + y', bounds: { order: 'dxdy', outer: [1, 2], inner: ['0', 'y'] } },
        { name: '#8: ∫₁² ∫ₓ^(x²) (y/x + 1) dy dx', f: 'y/x + 1', bounds: { order: 'dydx', outer: [1, 2], inner: ['x', 'x^2'] } },
        {
          name: '#8: f = 1 on the triangle (1, 1), (3, 5), (5, 1)',
          f: '1',
          bounds: { order: 'dxdy', outer: [1, 5], inner: ['1 + (y - 1)/2', '5 - (y - 1)/2'] },
        },
        { name: '#6: ∫₁¹⁰ ∫₋₁¹ (3x + 1) dx dy', f: '3x + 1', bounds: { order: 'dxdy', outer: [1, 10], inner: ['-1', '1'] } },
      ],
    },
    {
      id: 'regions',
      title: 'Regions from the bounds',
      scene: 'region',
      mode: 'region',
      caption: 'The outer limits are fixed numbers. The inner limits can depend on the outer variable. Move the slice to see where the inner variable starts and stops.',
      examples: [
        { name: '#6: ∫₁¹⁰ ∫₋₁¹ (3x + 1) dx dy', f: '3x + 1', bounds: { order: 'dxdy', outer: [1, 10], inner: ['-1', '1'] } },
        { name: '#6: ∫₂⁶ ∫_(4−x)^x (x² + y²) dy dx', f: 'x^2 + y^2', bounds: { order: 'dydx', outer: [2, 6], inner: ['4 - x', 'x'] } },
        { name: '#6: ∫₀⁵ ∫_y^(2y) x⁴ dx dy', f: 'x^4', bounds: { order: 'dxdy', outer: [0, 5], inner: ['y', '2y'] } },
        { name: '#6: ∫₂⁶ ∫₋ᵧʸ 1 dx dy', f: '1', bounds: { order: 'dxdy', outer: [2, 6], inner: ['-y', 'y'] } },
        { name: '#8: ∫₁² ∫ₓ^(x²) (y/x + 1) dy dx', f: 'y/x + 1', bounds: { order: 'dydx', outer: [1, 2], inner: ['x', 'x^2'] } },
      ],
    },
  ],
}
