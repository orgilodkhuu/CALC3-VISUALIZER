import Surfaces from './Surfaces.jsx'

/**
 * Module list shown in the sidebar, in syllabus order.
 * To add a module: build a component in this folder and set `component`.
 * Modules without a component show a "coming soon" page.
 */
export const MODULES = [
  { id: 'surfaces', title: '3D space & surfaces', component: Surfaces },
  { id: 'vectors', title: 'Vectors: dot & cross product' },
  { id: 'lines-planes', title: 'Lines & planes' },
  { id: 'partials', title: 'Partial derivatives' },
  { id: 'tangent-planes', title: 'Tangent planes & level curves' },
  { id: 'gradient', title: 'Gradient & directional derivatives' },
  { id: 'optimization', title: 'Optimization & Lagrange multipliers' },
  { id: 'integrals', title: 'Double & triple integrals' },
  { id: 'coordinates', title: 'Polar, cylindrical, spherical' },
  { id: 'vector-fields', title: 'Vector fields & line integrals' },
  { id: 'theorems', title: "Green's, Stokes', divergence" },
]
