import t02 from './t02-functions-r2-r.js'
import t03 from './t03-partial-derivatives.js'
import t04 from './t04-directional-derivatives.js'
import t05 from './t05-vectors.js'
import t06 from './t06-dot-product.js'
import t07 from './t07-gradient.js'
import t08 from './t08-vector-fields.js'

/**
 * MATH 260 topics in syllabus order (numbers match her topic sheets).
 * A topic with `problems` gets a page; the rest show "coming soon".
 * See t02 for the problem config format.
 */
export const TOPICS = [
  { n: 1, title: 'Calculus Review' },
  { n: 2, title: 'Functions f: ℝ² → ℝ', ...t02 },
  { n: 3, title: 'Partial Derivatives', ...t03 },
  { n: 4, title: 'Directional Derivatives', ...t04 },
  { n: 5, title: 'Vectors', ...t05 },
  { n: 6, title: 'Dot Products', ...t06 },
  { n: 7, title: 'The Gradient', ...t07 },
  { n: 8, title: 'Functions F: ℝ² → ℝ² (vector fields)', ...t08 },
  { n: 9, title: 'Line Integrals' },
  { n: 10, title: 'The 2D FTC' },
  { n: 11, title: 'Functions f: ℝ³ → ℝ' },
  { n: 12, title: 'Functions F: ℝ³ → ℝ³' },
  { n: 13, title: 'The 2D Curl' },
  { n: 14, title: 'Double Integrals' },
  { n: 15, title: "Green's Theorem" },
  { n: 16, title: 'Polar Coordinates' },
  { n: 17, title: 'The 3D Curl' },
  { n: 18, title: 'The Cross Product' },
  { n: 19, title: 'Surface Integrals' },
  { n: 20, title: "Stokes' Theorem" },
  { n: 21, title: 'Divergence' },
  { n: 22, title: 'Triple Integrals' },
  { n: 23, title: 'The Divergence Theorem' },
  { n: 24, title: 'Cylindrical & Spherical Coordinates' },
  { n: 25, title: 'Continuity & Differentiability' },
  { n: 26, title: 'Optimization, Lagrange Multipliers' },
  { n: 27, title: 'Change of Coordinates, The Jacobian' },
]
