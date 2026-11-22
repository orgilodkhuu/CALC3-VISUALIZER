# Calc 3 Visualizer

Interactive 3D visuals for Multivariable Calculus, organized by syllabus topic.
Runs in any modern browser from one link: no install, no login.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Deploy (GitHub Pages)

1. Create an empty GitHub repo (e.g. `calc3-visualizer`) and push this folder to `main`.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` rebuilds and publishes to `https://<user>.github.io/<repo>/`.

## Project layout

```
src/
  App.jsx                    top bar, problem tabs, topic drawer; URL is #/<topic>/<problem>
  topics/index.js            MATH 260 topics in syllabus order (numbers match her topic sheets)
  topics/tNN-*.js            one config per topic: 2–4 idea tabs, examples from her sheet
  scenes/FunctionExplorer.jsx  the f: R^2 -> R scene (Topics 2, 3, 4, 7)
  scenes/DirectionTools.jsx  directional derivative and gradient pieces
  components/Viewer3D.jsx    3D stage: math coords (z up), auto camera fit, z-squeeze, reset
  components/Axes.jsx        axes, grid, numbers; Label3D for camera-facing text
  components/Surface.jsx     surface mesh with clipping, domain-edge snapping, jump handling
  components/Overlays3D.jsx  curves, points, slice planes, level curves, tangent plane
  components/Plot2D.jsx      SVG plots: cross sections, contour map
  components/ValueTable.jsx  click-to-reveal table of f(x, y)
  lib/formula.js             safe formula compiler + symbolic partial derivatives (math.js)
  lib/contours.js            marching squares for level curves
public/fonts/                Inter font, bundled so labels work offline
```

## Adding a tab

Tabs are ideas (2–4 per topic), not worksheet problems. Her worksheet functions go in `examples`.
Every field is documented at the top of `src/scenes/FunctionExplorer.jsx`.

```js
{ id: 'cross-sections', title: 'Cross sections',
  caption: 'Slice the surface at a fixed x or a fixed y. Each slice is a curve.',
  views: ['cross'], x: [-2, 2], y: [-2, 2], slices: { x: [-1, 0, 1], y: [-1, 0, 1] },
  examples: [{ name: 'y³ − x²', f: 'y^3 - x^2' }, { name: 'x² + y²', f: 'x^2 + y^2' }] }
```

Keep pages simple: one caption sentence, the main sliders only (extra toggles go under "More"
automatically; list the ones that must be up front in `controls`).

## Adding a topic

Create `src/topics/tNN-name.js` exporting `{ problems: [...] }` and spread it into the topic's
entry in `src/topics/index.js`. Topics that need a new kind of picture (vectors, vector fields,
regions) get a new scene in `src/scenes/`.

## Formula syntax

`^` powers, `*` multiply (`x*y`, not `xy`), `sin cos tan exp ln sqrt abs`, constants `pi`, `e`.
A leading `z =` or `f(x,y) =` is ignored. Bad input shows a message and keeps the last good surface.
