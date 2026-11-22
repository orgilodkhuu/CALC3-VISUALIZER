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
  topics/t02-*.js, t03-*.js  one config per topic: its problems, taken from her sheet
  scenes/FunctionExplorer.jsx  the f: R^2 -> R scene every Topic 2/3 problem uses
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

## Adding a problem

Add an entry to the topic's `problems` list (see the comment at the top of
`src/topics/t02-functions-r2-r.js`; every field is documented in `FunctionExplorer.jsx`):

```js
{ id: '3a', title: 'Cross sections', prompt: 'Text with $math$',
  f: 'y^3 - x^2', x: [-2, 2], y: [-2, 2],
  views: ['cross'], hidden: ['surface'], slices: { x: [-1, 0, 1], y: [-1, 0, 1] } }
```

## Adding a topic

Create `src/topics/tNN-name.js` exporting `{ problems: [...] }` and spread it into the topic's
entry in `src/topics/index.js`. Topics that need a new kind of picture (vectors, vector fields,
regions) get a new scene in `src/scenes/`.

## Formula syntax

`^` powers, `*` multiply (`x*y`, not `xy`), `sin cos tan exp ln sqrt abs`, constants `pi`, `e`.
A leading `z =` or `f(x,y) =` is ignored. Bad input shows a message and keeps the last good surface.
