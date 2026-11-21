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
  App.jsx                 sidebar + routing (#module-id in the URL)
  modules/index.js        module list in syllabus order  <- reorder/rename here
  modules/Surfaces.jsx    Module 1: z = f(x, y)
  components/Viewer3D.jsx reusable 3D stage (math coords, z up, orbit controls, reset)
  components/Axes.jsx     axes, grid, tick numbers, Label3D for any module
  components/Surface.jsx  surface mesh from a function, with clipping and edge handling
  components/Controls.jsx Slider, Toggle, FormulaInput (math.js + KaTeX preview)
  lib/formula.js          safe formula compiler: returns an error message, never throws
public/fonts/             Inter font, bundled so labels work offline
```

## Adding a module

1. Create `src/modules/MyTopic.jsx`. Put a `<Viewer3D>` on the left and an `<aside className="panel">` on the right (copy `Surfaces.jsx`).
2. Inside `<Viewer3D>`, everything is in **math coordinates** (x, y, z with z up).
3. Add `component: MyTopic` to its entry in `src/modules/index.js`.

## Formula syntax

`^` powers, `*` multiply (`x*y`, not `xy`), `sin cos tan exp log sqrt abs`, constants `pi`, `e`.
A leading `z =` or `f(x,y) =` is ignored. Bad input shows a message and keeps the last good surface.
