# Graphdle

Three independent mathematical drawing games, built with React, TypeScript, Vite and SVG. No account, backend, paid service or external scoring API is needed.

**Play:** https://2319bli.github.io/graphdle/

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

```sh
npm test          # mathematical and persistence regression tests
npm run typecheck # strict TypeScript
npm run lint      # ESLint
npm run build     # typecheck + production assets in dist/
npm run preview   # serve the production build
```

Fonts and all runtime dependencies are bundled locally. Once served, gameplay does not call external services. This is a static web app, not an installable offline PWA.

## The three games

Each standard game contains five seeded, parameterised questions from a single mode, worth 100 points each. Easy, Medium, Hard and Expert alter the mathematical families and constraints. Families are shuffled without repetition within a five-question function or complex session. No answer geometry is revealed before submission.

Function and complex equations use **KaTeX/LaTeX notation** in challenges, result lists and answer reviews: stacked fractions, superscripts, function names, absolute-value bars and piecewise cases. Inverse-function domains and principal ranges are typeset too. Custom functions are converted from their validated expression tree, preserving grouping and precedence. Keep entering ordinary expressions such as `(x+1)/(x^2+3)`; the game displays the formatted equation. Free-form practice prompts remain plain text. KaTeX and its fonts ship with the site, with MathML for accessibility and no external rendering service.

### Function Sketching

47 templates covering lines, quadratics, cubics, reciprocals, exponentials, rational transformations, logarithms, modulus, piecewise curves, removable holes, logarithmic quotients, exponential decay, bounded rational functions, linear/trigonometric sums, implicit and parametric ellipses, x^x, oblique asymptotes, restricted oscillatory functions, rotated hyperbolas, stationary inflections, and rational curves with three branches, plus the complete 24-function trig family:

| Family                | Functions                                   |
| --------------------- | ------------------------------------------- |
| Trigonometric         | sin, cos, tan, sec, csc (cosec), cot        |
| Inverse trigonometric | asin, acos, atan, asec, acsc, acot          |
| Hyperbolic            | sinh, cosh, tanh, sech, csch (cosech), coth |
| Inverse hyperbolic    | asinh, acosh, atanh, asech, acsch, acoth    |

Easy adds cosine to the original introductory pool. Medium includes tangent, sinh, cosh and tanh. Hard adds cot/sec/csc, asin/acos/atan, asinh/acosh/atanh and sech. Expert includes asec/acsc/acot, csch/coth and asech/acsch/acoth. Each difficulty keeps its own pool and draws five distinct families per game.

Generated trig questions vary amplitude and horizontal scale. Circular angles use radians; inverse questions state their real domain and principal output range after scaling. **Graphdle uses acot(x) = π/2 − atan(x), with range (0, π), in both generated and custom questions.** This deliberately differs from math.js's built-in `atan(1/x)` convention. Asec uses acos(1/x) and acsc uses asin(1/x). Real inverse-hyperbolic domains are enforced. Finite endpoints are closed points, not turning points; vertical-tangent endpoints are not marked differentiable. Reference curves are sampled separately on each domain interval so they never join across a pole or excluded interval. Properties concern the entire stated domain, not a single monotone branch.

Reference definitions: [NIST inverse trig](https://dlmf.nist.gov/4.23), [NIST inverse hyperbolic functions](https://dlmf.nist.gov/4.37), and [math.js's alternative acot convention](https://mathjs.org/docs/reference/functions/acot.html).

The tools include freehand curves, straight dotted asymptotes, intercept and turning-point markers, open/closed endpoints, selection/movement, eraser, undo, redo, and clear. Coordinates are mathematical: independent axis scaling, ranges, panning and zooming do not alter the answer. Use B for brush, E for eraser, H for pan, Ctrl/Command Z for undo, and Shift Ctrl/Command Z for redo.

The default rubric is curve 40, intercepts 15, turning points 15, asymptotes 15, properties 15. Categories without required features redistribute their points to the curve; holes/endpoints use 10 of the curve points. Missing features incur no penalty if they do not exist, while invented features do. Two distinct verified properties normally earn full property credit (one when only one is verified for that family). Sharp corners and cusps are recognised directly from the sketch; stars there are optional. Smooth turning points still require purple stars. A correct sharp vertex needs nearby curve geometry on both sides turning in the expected direction, not just an intercept marker or a line passing through it. When a smooth extremum is also an intercept, place both markers.

### Graph Theory

Construct simple undirected graphs from labelled adjacency matrices/lists/edge lists, graphical degree sequences, tree and unicyclic constraints, connected bipartite graphs, connected regular graphs, and complete graphs. Generators construct a valid answer before deriving the challenge.

Add up to 12 vertices, drag to arrange them, rename them, click two vertices or drag between them to create an edge, and remove edges or vertices. Undo and redo apply to graph edits. Marking uses structure, not screen position. Unlabelled challenges accept any graph satisfying the constraints, including non-isomorphic alternatives.

### Complex Graphing

15 template families cover points, circles/disks, lines, perpendicular bisectors, argument rays with excluded origins, half-planes, ellipses, hyperbolas, annuli, quarter-disk sectors, intersections of disks, and the image of a vertical line under complex squaring.

Tools include freehand loci, full lines, rays, circles, points, solid/dashed boundaries, open/closed markers, polygon-region shading and disk shading. Draw the boundary separately from its fill. Click polygon vertices and select **Finish region**; combine polygons for more complex regions. Annuli can be shaded as strips with several polygons. Generated geometry is derived analytically.

## Marking and limitations

- Curves are compared in mathematical coordinates, with bidirectional coverage and precision. The tolerance is 2.5% of the original x/y ranges; marker matching uses 4.5%. Constants are exported from `src/math/grading.ts`.
- **The original question window is always the assessment window.** Changing the view never reduces the part of the answer being assessed. Its dashed frame remains visible when zoomed out. Features outside it are not required.
- Missing branches and incorrect added strokes reduce the geometric score. This is an interpretable numerical approximation, not a formal topological equivalence test. Tiny connections near a singularity may be under-penalised; curve quality and topology can always be inspected in the overlay.
- Region grading uses intersection-over-union on a deterministic 80×80 mathematical grid. Boundary inclusion, excluded points, and shape are scored separately. Very small geometric differences may fall below sampling resolution.
- **Additional Properties is a searchable tag picker.** Search a property name or synonym, select it, and remove it with its × button if needed. Arrow keys and Enter select suggestions; Escape closes the list. Only selected tags are submitted. The catalogue is identical for every question and does not reveal which properties are correct. Period tags explicitly name the **fundamental** period.
- The property evaluator recognises a deliberately bounded vocabulary: symmetry, odd/even, continuity, differentiability, monotonicity, injectivity, periodicity/period, boundedness, positivity/nonnegativity, and inflection at zero. Common synonyms are accepted, including “unbounded above” / “not bounded above” / “has no upper bound” and the corresponding lower-bound phrases; equivalent claims do not count twice; contradictory claims are still checked; known false claims cancel correct claims; unrecognised claims are explicitly **unverified**. It is not a natural-language theorem prover. For example, arbitrary interval-specific monotonicity or general range claims may remain unverified.
- “Continuous” and “differentiable” refer to the stated domain. “Everywhere” is interpreted as all real x. Local extrema include corners such as a modulus vertex, but exclude stationary inflections.
- Expert oscillatory templates intentionally exclude the unresolved neighbourhood of zero. Arbitrarily oscillatory, fractal, or arbitrary implicit equations are not claimed to be reliably auto-graded.
- Graphs are simple and undirected: no weighted edges, directed edges, loops, or multigraphs. Isomorphism enumeration is unnecessary for supported questions: labelled tasks compare adjacency; unlabelled tasks check the actual stated constraints.
- SVG drawing is pointer-based and works with mouse, stylus, touch and trackpads. Toolbar controls have keyboard access and labels; freehand geometry still requires a pointing device. Mobile is usable, but a larger screen gives more drawing precision.

## Custom challenges

- **Functions:** a restricted, validated math.js expression in x, optional finite domain interval, and independent viewing ranges. Supported operators are `+ - * / ^`; functions include all 24 trig functions listed above, `exp`, `log`/`ln`, `sqrt`, and `abs`. Long inverse names such as `arcsin` and `arctanh`, and `cosec`/`cosech`, are also accepted. Examples: `sech(x)`, `arctanh(x/3)`, `acot(x)`, and `tanh(x) + asin(x/3)`. Only real-valued portions are plotted. Supported expressions receive numerical **curve-only** checking. Arbitrary symbolic feature detection is not attempted. Numerical sampling may miss very narrow singularities or oscillations.
- **Networks:** symmetric zero-diagonal 0–1 adjacency matrix, edge list (e.g. `A-B, B-C, D` for isolated D), or a graphical degree sequence. Havel–Hakimi validates and realises degree sequences.
- **Complex:** text parsing supports circles/disks such as `|z-(2+1i)| = 3`, `|z| <= 2`, and real/imaginary coordinate equalities/inequalities such as `Re(z) > 1` or `Im(z) = -2`.
- **Unmarked practice** accepts unsupported function/complex prompts without inventing an answer or automatic marks. Custom sessions never affect standard history or personal bests.

## History and privacy

Completed standard games store dates, mode, difficulty, totals and per-question scores in this browser's local storage. Each mode has independent bests, averages, family-level accuracy, recent-form charts and history clearing. The latest 200 games are retained. Full drawings are available for review during the current session; they are not persisted across page reloads. Browser-storage failures are handled without breaking gameplay. No analytics or account synchronisation is used.

## Architecture

- `src/math/functions.ts` — analytic function generators
- `src/components/MathFormula.tsx` — accessible LaTeX equations and domain/range rendering
- `src/math/latex.ts` — shared notation helpers for generated equations
- `src/math/trigonometry.ts` — full trig-family generators, domains, endpoints and analytic grading features
- `src/math/trigFunctions.ts` — shared real-valued trig definitions and custom-expression aliases
- `src/math/customFunction.ts` — lazy-loaded, restricted math.js custom parser
- `src/math/networks.ts` — graph generators, invariants and custom graph validation
- `src/math/complex.ts` — complex locus generators and supported custom parsing
- `src/math/geometry.ts` — sampling, coordinate transforms and geometric comparison
- `src/math/grading.ts` — deterministic rubric, feature matching and property rules
- `src/math/propertyTags.ts` — shared property vocabulary, tag search and canonical claims
- `src/components/PropertyPicker.tsx` — accessible searchable property tags
- `src/math/turningPoints.ts` — automatic recognition of sharp extrema with freehand tolerance
- `src/components/Plane.tsx` — mathematical drawing canvas and view controls
- `src/components/NetworkCanvas.tsx` — graph editor and prompt renderers
- `src/components/useUndo.ts` — undo/redo history
- `src/App.tsx` — independent session flows, custom challenges, results and statistics
- `src/storage.ts` — resilient browser persistence
- `tests/math.test.ts` — analytic examples, seeded generation, grading, constraints and storage

Each generated question includes a reproducible seed/ID. Pure generators accept explicit seeds for debugging. Drawing scores are deterministic for the same input.

## GitHub Pages

`.github/workflows/pages.yml` installs locked dependencies, runs lint/tests, builds the app, uploads `dist/`, and deploys on pushes to `main`. Pull requests run validation without deploying. Pages uses **GitHub Actions** as its build source. Vite uses `base: './'`, so asset URLs work under `/graphdle/` as well as a custom domain. The app has state-based navigation, avoiding GitHub Pages history-route 404s.

## Sensible next improvements

1. Adaptive sampling and explicit branch-topology penalties for particularly difficult curves.
2. A richer verified property vocabulary, including intervals and exact range statements.
3. Persistent drawing reviews and shareable challenge seeds.
4. More ergonomic constructive region tools (half-plane, annulus and Boolean region operations).
5. An optional keyboard coordinate editor for fully non-pointer construction.
